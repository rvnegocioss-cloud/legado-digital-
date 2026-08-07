-- Ruas (caminhos internos de passagem) do cemiterio -- CONCEITO DIFERENTE de
-- `filas`. Fileira = onde os tumulos estao enfileirados (dentro de uma quadra);
-- rua = por onde a pessoa ANDA (passa ENTRE quadras, por isso vive no nivel do
-- cemiterio, sem quadra_id). Pedido do Rafael 2026-08-07: hoje a rota da pagina
-- publica e uma linha reta da portaria ate o tumulo, atravessando quadra/muro.
--
-- Aditivo puro: nenhuma coluna ou tabela existente e alterada/removida.
-- Cemiterio sem nenhuma rua mapeada continua com a linha reta de hoje
-- (fallback automatico) -- nenhum memorial existente muda de comportamento.
-- Planejado com o Opus, 2026-08-07.

create table if not exists ruas_cemiterio (
  id uuid primary key default gen_random_uuid(),
  cemiterio_id uuid not null references cemiterios(id) on delete cascade,
  numero int not null check (numero between 1 and 999),
  nome text,
  eixo jsonb,
  comprimento_m double precision,
  situacao text not null default 'ativa'
    check (situacao in ('ativa','desativada')),
  geometria_revisada boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cemiterio_id, numero),
  -- Rua e sempre uma polilinha de 2+ vertices. Sem isso, uma rua de 1 ponto
  -- entraria na rede e viraria no isolado silencioso.
  constraint ruas_cemiterio_eixo_linestring check (
    eixo is null or (
      eixo ->> 'type' = 'LineString'
      and jsonb_typeof(eixo -> 'coordinates') = 'array'
      and jsonb_array_length(eixo -> 'coordinates') >= 2
    )
  )
);

create index if not exists idx_ruas_cemiterio on ruas_cemiterio (cemiterio_id);

alter table ruas_cemiterio enable row level security;

-- Mesmo padrao de quadras/filas, mas ja no gate unico novo (pode_ver_cemiterio
-- cobre staff + parceiro_id legado + cemiterios_parceiros de uma vez) -- por
-- isso 1 policy de select em vez das 2 acumuladas em quadras/filas.
create policy ruas_cemiterio_staff_all on ruas_cemiterio for all
  using (is_legado_staff()) with check (is_legado_staff());
create policy ruas_cemiterio_parceiro_select on ruas_cemiterio for select
  using (pode_ver_cemiterio(cemiterio_id));

-- ---------------------------------------------------------------------------
-- GeoJSON do mapa da Central/Parceiro passa a trazer as ruas junto.
-- Tipo de retorno (jsonb) nao muda -> create or replace basta.
-- MAS create or replace NAO preserva GRANT -> revoke/grant reaplicados
-- obrigatoriamente (pegadinha ja documentada varias vezes neste repo).
-- Blocos quadras/filas/lapides copiados LITERALMENTE do corpo atual (conferido
-- via pg_get_functiondef antes de escrever esta migration).
-- ---------------------------------------------------------------------------
create or replace function public.obter_geojson_cemiterio(p_cemiterio_id uuid)
returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_resultado jsonb;
begin
  if not pode_ver_cemiterio(p_cemiterio_id) then
    raise exception 'sem permissao';
  end if;

  select jsonb_build_object(
    'quadras', (
      select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature', 'geometry', q.poligono,
          'properties', jsonb_build_object('id', q.id, 'numero', q.numero, 'nome', q.nome, 'situacao', q.situacao, 'geometria_revisada', q.geometria_revisada)
        )
      ), '[]'::jsonb))
      from quadras q where q.cemiterio_id = p_cemiterio_id and q.poligono is not null
    ),
    'filas', (
      select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature', 'geometry', f.eixo,
          'properties', jsonb_build_object('id', f.id, 'quadra_id', f.quadra_id, 'numero', f.numero, 'quantidade_prevista', f.quantidade_prevista, 'geometria_revisada', f.geometria_revisada)
        )
      ), '[]'::jsonb))
      from filas f where f.cemiterio_id = p_cemiterio_id and f.eixo is not null
    ),
    'lapides', (
      select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'geometry', jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(l.longitude, l.latitude)),
          'properties', jsonb_build_object(
            'id', l.id, 'codigo', l.codigo, 'numero', l.numero, 'situacao', l.situacao,
            'coordenada_origem', l.coordenada_origem, 'coordenada_precisao', l.coordenada_precisao,
            'tem_memorial', exists(select 1 from homenagens h where h.lapide_id = l.id)
          )
        )
      ), '[]'::jsonb))
      from lapides l where l.cemiterio_id = p_cemiterio_id and l.latitude is not null
    ),
    'ruas', (
      select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature', 'geometry', r.eixo,
          'properties', jsonb_build_object(
            'id', r.id, 'numero', r.numero, 'nome', r.nome,
            'situacao', r.situacao, 'geometria_revisada', r.geometria_revisada,
            'comprimento_m', r.comprimento_m
          )
        ) order by r.numero
      ), '[]'::jsonb))
      from ruas_cemiterio r
      where r.cemiterio_id = p_cemiterio_id and r.eixo is not null
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;
revoke execute on function public.obter_geojson_cemiterio(uuid) from public, anon, authenticated;
grant  execute on function public.obter_geojson_cemiterio(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Rede de ruas do cemiterio DAQUELE memorial, por slug.
-- Recebe p_slug (nao cemiterio_id) de proposito: obter_localizacao_memorial
-- nao devolve cemiterio_id, entao com p_slug esta RPC roda EM PARALELO com ela
-- no mesmo Promise.all da pagina publica -- zero ida de rede extra em serie, e
-- zero necessidade de mexer na RPC publica que ja existe.
-- Devolve so a geometria crua; quem calcula a rota e lib/rotaCemiterio.ts.
-- Consumida com service role (mesma politica de obter_localizacao_memorial).
-- ---------------------------------------------------------------------------
create or replace function public.obter_rede_ruas_memorial(p_slug text)
returns jsonb
language sql security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id, 'numero', r.numero, 'nome', r.nome,
      'coordenadas', r.eixo -> 'coordinates'
    ) order by r.numero
  ), '[]'::jsonb)
  from homenagens h
  join lapides l on l.id = h.lapide_id
  join ruas_cemiterio r on r.cemiterio_id = l.cemiterio_id
  where h.slug = p_slug
    and r.eixo is not null
    and r.situacao = 'ativa';
$$;
revoke execute on function public.obter_rede_ruas_memorial(text) from public, anon, authenticated;
