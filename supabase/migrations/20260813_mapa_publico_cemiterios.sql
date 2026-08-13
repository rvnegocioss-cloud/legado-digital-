-- Mapa Público de Cemitérios (diretório cidade -> cemitério -> mapa,
-- acessível sem login). 100% aditivo -- nenhuma coluna alterada/removida
-- (regra 1). Planejado com Opus, 2026-08-13.

-- slugificar(): immutable, sem depender da extensao unaccent (que é
-- stable, ver dívida documentada no CLAUDE.md sobre unaccent no schema
-- public) -- troca acento por ascii via translate() antes de normalizar.
create or replace function public.slugificar(p_texto text)
returns text
language sql immutable as $$
  select trim(both '-' from
    regexp_replace(
      lower(
        translate(
          trim(p_texto),
          'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
        )
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- cemiterios.slug -- URL legível e estável (/cemiterios/cidade/slug).
-- Backfill com desempate numérico pra evitar colisão entre 2 cemitérios
-- com nome parecido.
alter table cemiterios add column if not exists slug text;

with numerados as (
  select id, nome,
    row_number() over (partition by slugificar(nome) order by created_at) as rn
  from cemiterios
  where slug is null
)
update cemiterios c
set slug = case when n.rn = 1 then slugificar(n.nome) else slugificar(n.nome) || '-' || n.rn end
from numerados n
where c.id = n.id;

alter table cemiterios alter column slug set not null;
create unique index if not exists cemiterios_slug_key on cemiterios(slug);

-- cemiterios.publico -- chave de governança: cemitério só entra no
-- diretório público quando a Central liga explicitamente. Sem isso, todo
-- cemitério cadastrado por parceiro viraria página pública no ato.
alter table cemiterios add column if not exists publico boolean not null default false;

-- Convenção "nunca tela vazia ao revisar" -- os 3 cemitérios reais de hoje
-- entram ligados (José Lázaro já tem ortomosaico e memorial real; os 2 de
-- Uberlândia exercitam o caso "sem ortomosaico, mapa normal").
update cemiterios set publico = true where publico = false;

-- RPC 1: cidades com pelo menos 1 cemitério público/ativo.
create or replace function public.listar_cidades_publicas()
returns table(cidade text, estado text, cidade_slug text, total_cemiterios bigint)
language sql stable security definer set search_path to 'public' as $$
  select
    trim(c.cidade) as cidade,
    upper(trim(c.estado)) as estado,
    slugificar(trim(c.cidade)) || '-' || lower(trim(c.estado)) as cidade_slug,
    count(*) as total_cemiterios
  from cemiterios c
  where c.ativo and c.publico and c.cidade is not null and c.estado is not null
  group by trim(c.cidade), trim(c.estado)
  order by total_cemiterios desc, cidade;
$$;
revoke execute on function public.listar_cidades_publicas() from public, authenticated;
grant execute on function public.listar_cidades_publicas() to anon;

-- RPC 2: cemitérios de uma cidade (resolvida pelo mesmo slug da RPC 1).
create or replace function public.listar_cemiterios_publicos(p_cidade_slug text)
returns table(slug text, nome text, endereco text, cidade text, estado text, latitude double precision, longitude double precision, tem_ortomosaico boolean)
language sql stable security definer set search_path to 'public' as $$
  select c.slug, trim(c.nome), c.endereco, trim(c.cidade), upper(trim(c.estado)),
    c.latitude, c.longitude, c.ortomosaico_url is not null
  from cemiterios c
  where c.ativo and c.publico
    and slugificar(trim(c.cidade)) || '-' || lower(trim(c.estado)) = p_cidade_slug
  order by c.nome;
$$;
revoke execute on function public.listar_cemiterios_publicos(text) from public, authenticated;
grant execute on function public.listar_cemiterios_publicos(text) to anon;

-- RPC 3: mapa de um cemitério -- dados do cemitério + pinos de memorial.
-- Filtro de pino é o núcleo da segurança dessa feature inteira:
--   - homenagens_seguranca é LEFT JOIN (achado real: 4 dos 5 memoriais
--     hoje não têm linha lá -- INNER JOIN devolveria mapa vazio sem erro).
--   - modo_gate <> 'oculto', busca_habilitada e link_habilitado (coalesce
--     true, mesmo default das colunas) -- mapa é canal de DESCOBERTA
--     (mesma natureza de busca_habilitada) e o clique navega pelo canal
--     "link", então precisa dos dois, não só link_habilitado sozinho.
--   - slug real (nunca rascunho-%, nunca vazio/'Novo memorial') -- história
--     real de rascunho órfão vazando (auditoria 2026-07-30).
-- Nome/foto só saem quando modo_gate = 'aberto' -- nos outros modos o pino
-- existe (mostra "tem memorial aqui") mas identidade fica null; quem quer
-- ver precisa abrir /homenagem/[slug], que resolve o próprio gate.
create or replace function public.obter_mapa_publico_cemiterio(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_cemiterio record;
  v_resultado jsonb;
begin
  select id, nome, cidade, estado, latitude, longitude,
    coalesce(entrada_latitude, latitude) as entrada_lat,
    coalesce(entrada_longitude, longitude) as entrada_lng,
    ortomosaico_url, ortomosaico_minzoom, ortomosaico_maxzoom, ortomosaico_bounds
  into v_cemiterio
  from cemiterios
  where slug = p_slug and ativo and publico;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'cemiterio', jsonb_build_object(
      'nome', trim(v_cemiterio.nome),
      'cidade', trim(v_cemiterio.cidade),
      'estado', upper(trim(v_cemiterio.estado)),
      'latitude', v_cemiterio.entrada_lat,
      'longitude', v_cemiterio.entrada_lng,
      'ortomosaico_url', v_cemiterio.ortomosaico_url,
      'ortomosaico_minzoom', v_cemiterio.ortomosaico_minzoom,
      'ortomosaico_maxzoom', v_cemiterio.ortomosaico_maxzoom,
      'ortomosaico_bounds', v_cemiterio.ortomosaico_bounds
    ),
    'memoriais', (
      select jsonb_build_object('type', 'FeatureCollection', 'features', coalesce(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'geometry', jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(l.longitude, l.latitude)),
          'properties', jsonb_build_object(
            'slug', h.slug,
            'protegido', coalesce(s.modo_gate, 'aberto') <> 'aberto',
            'nome', case when coalesce(s.modo_gate, 'aberto') = 'aberto' then h.nome_completo else null end,
            'foto_url', case when coalesce(s.modo_gate, 'aberto') = 'aberto' then h.foto_url else null end
          )
        )
      ), '[]'::jsonb))
      from homenagens h
      join lapides l on l.id = h.lapide_id and l.cemiterio_id = v_cemiterio.id
      left join homenagens_seguranca s on s.homenagem_id = h.id
      where l.latitude is not null and l.longitude is not null
        and h.slug is not null and h.slug not like 'rascunho-%'
        and h.nome_completo is not null and h.nome_completo <> '' and h.nome_completo <> 'Novo memorial'
        and coalesce(s.modo_gate, 'aberto') <> 'oculto'
        and coalesce(s.busca_habilitada, true)
        and coalesce(s.link_habilitado, true)
      limit 5000
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;
revoke execute on function public.obter_mapa_publico_cemiterio(text) from public, authenticated;
grant execute on function public.obter_mapa_publico_cemiterio(text) to anon;
