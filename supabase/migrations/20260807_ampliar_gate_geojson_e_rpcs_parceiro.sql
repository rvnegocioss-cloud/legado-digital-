-- Amplia o gate de obter_geojson_cemiterio pra usar pode_ver_cemiterio()
-- (staff OU parceiro_id antigo OU autorizado via cemiterios_parceiros) em vez
-- de checar so o parceiro_id legado direto -- sem isso a tabela nova
-- (cemiterios_parceiros) nao teria efeito nenhum no mapa.
--
-- create or replace function NAO preserva GRANT -- reaplicar revoke/grant
-- depois e obrigatorio (pegadinha ja documentada nesta sessao varias vezes:
-- acender_vela, incrementar_visualizacao, gerar_lapides_fila_manual...).

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
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;
revoke execute on function public.obter_geojson_cemiterio(uuid) from public, anon, authenticated;
grant execute on function public.obter_geojson_cemiterio(uuid) to authenticated;

-- Policies adicionais (parceiro le cemiterio/quadra/fila/lapide via
-- cemiterios_parceiros) -- ACRESCENTADAS ao lado das 4 policies antigas que
-- dependem de cemiterios.parceiro_id, nunca substituindo (policies
-- permissivas do mesmo comando se unem por OR no Postgres, entao isso so
-- amplia quem enxerga, nunca restringe o que ja funcionava).

create policy cemiterios_parceiro_select_junction on cemiterios for select
  using (pode_ver_cemiterio(id));

create policy quadras_parceiro_select_junction on quadras for select
  using (pode_ver_cemiterio(cemiterio_id));

create policy filas_parceiro_select_junction on filas for select
  using (pode_ver_cemiterio(cemiterio_id));

create policy lapides_parceiro_select_junction on lapides for select
  using (pode_ver_cemiterio(cemiterio_id));

-- RPC: agrupa memoriais do cemiterio por parceiro dono (staff-only) -- pro
-- painel "quem opera aqui" abaixo do mapa na Central. Nao precisa trazer
-- linha de memorial nenhuma pro cliente so pra contar -- GROUP BY roda no
-- Postgres, cliente so busca a lista de um parceiro especifico se expandir.
create or replace function public.obter_parceiros_do_cemiterio(p_cemiterio_id uuid)
returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare
  v_resultado jsonb;
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'parceiro_id', grupo.parceiro_id,
      'parceiro_nome', grupo.parceiro_nome,
      'total_memoriais', grupo.total_memoriais,
      'total_tumulos', grupo.total_tumulos,
      'total_fora_de_fileira', grupo.total_fora_de_fileira
    )
  ), '[]'::jsonb) into v_resultado
  from (
    select
      p.id as parceiro_id,
      p.nome_fantasia as parceiro_nome,
      count(h.id) as total_memoriais,
      count(distinct l.id) as total_tumulos,
      count(distinct l.id) filter (where l.fila_id is null) as total_fora_de_fileira
    from homenagens h
    join lapides l on l.id = h.lapide_id
    left join parceiros_b2b p on p.id = h.parceiro_id
    where l.cemiterio_id = p_cemiterio_id
    group by p.id, p.nome_fantasia
  ) grupo;

  return v_resultado;
end;
$$;
revoke execute on function public.obter_parceiros_do_cemiterio(uuid) from public, anon, authenticated;
grant execute on function public.obter_parceiros_do_cemiterio(uuid) to authenticated;

-- RPC: memoriais de UM parceiro especifico no cemiterio (carrega so ao
-- expandir aquele grupo no painel, staff-only).
create or replace function public.obter_memoriais_parceiro_cemiterio(p_cemiterio_id uuid, p_parceiro_id uuid)
returns table(homenagem_id uuid, nome_completo text, lapide_id uuid, codigo text, fila_id uuid, foto_url text)
language plpgsql security definer set search_path to 'public' as $$
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;

  return query
    select h.id, h.nome_completo, l.id, l.codigo, l.fila_id, h.foto_url
    from homenagens h
    join lapides l on l.id = h.lapide_id
    where l.cemiterio_id = p_cemiterio_id
      and (
        (p_parceiro_id is null and h.parceiro_id is null)
        or h.parceiro_id = p_parceiro_id
      )
    order by h.nome_completo
    limit 200;
end;
$$;
revoke execute on function public.obter_memoriais_parceiro_cemiterio(uuid, uuid) from public, anon, authenticated;
grant execute on function public.obter_memoriais_parceiro_cemiterio(uuid, uuid) to authenticated;

-- RPC: vincula uma lapide "fora de fileira" a uma fila/numero -- monta codigo
-- pelo mesmo padrao das outras RPCs, guarda o codigo antigo, staff-only.
create or replace function public.vincular_lapide_a_fila(p_lapide_id uuid, p_fila_id uuid, p_numero int)
returns lapides
language plpgsql security definer set search_path to 'public' as $$
declare
  v_fila filas%rowtype;
  v_quadra quadras%rowtype;
  v_lapide lapides%rowtype;
begin
  if not is_legado_staff() then raise exception 'sem permissao'; end if;

  select * into v_lapide from lapides where id = p_lapide_id;
  if not found then raise exception 'lapide nao encontrada'; end if;

  select * into v_fila from filas where id = p_fila_id;
  if not found then raise exception 'fila nao encontrada'; end if;
  if v_fila.cemiterio_id != v_lapide.cemiterio_id then
    raise exception 'fila e lapide sao de cemiterios diferentes';
  end if;

  select * into v_quadra from quadras where id = v_fila.quadra_id;

  if exists (select 1 from lapides where fila_id = p_fila_id and numero = p_numero and id != p_lapide_id) then
    raise exception 'ja existe tumulo numero % nessa fileira', p_numero;
  end if;

  update lapides set
    quadra_id = v_fila.quadra_id,
    fila_id = p_fila_id,
    numero = p_numero,
    codigo_anterior = coalesce(v_lapide.codigo, v_lapide.identificacao),
    codigo = montar_codigo_tumulo(v_quadra.numero, v_fila.numero, p_numero),
    identificacao = montar_codigo_tumulo(v_quadra.numero, v_fila.numero, p_numero),
    quadra = v_quadra.numero::text,
    lote = p_numero::text
  where id = p_lapide_id
  returning * into v_lapide;

  update filas set quantidade_prevista = greatest(coalesce(quantidade_prevista, 0), p_numero) where id = p_fila_id;

  return v_lapide;
end;
$$;
revoke execute on function public.vincular_lapide_a_fila(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.vincular_lapide_a_fila(uuid, uuid, int) to authenticated;
