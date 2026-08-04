-- Cemiterios: coordenada real da entrada/portao, distinta do centro
-- generico (latitude/longitude, hoje so o meio do voo de drone ou
-- geocodificacao de endereco). Nula = fallback pro centro generico,
-- nenhum cemiterio existente quebra.
alter table cemiterios
  add column if not exists entrada_latitude double precision,
  add column if not exists entrada_longitude double precision,
  add column if not exists entrada_atualizada_em timestamptz,
  add column if not exists entrada_atualizada_por uuid references usuarios(id);

-- RPC publica passa a devolver a entrada (com fallback pro centro) em vez
-- do centro generico puro -- CREATE OR REPLACE nao basta pra mudar corpo
-- com coalesce novo em coluna existente, mas o tipo de retorno e o mesmo
-- desta vez entao CREATE OR REPLACE funciona.
create or replace function public.obter_localizacao_memorial(p_slug text)
returns table (
  cemiterio_nome text, cemiterio_lat double precision, cemiterio_lng double precision,
  lapide_lat double precision, lapide_lng double precision,
  quadra text, lote text, identificacao text,
  orto_url text, orto_minzoom integer, orto_maxzoom integer, orto_bounds double precision[]
)
language sql security definer set search_path to 'public' as $$
  select c.nome,
         coalesce(c.entrada_latitude, c.latitude), coalesce(c.entrada_longitude, c.longitude),
         l.latitude, l.longitude, l.quadra, l.lote, l.identificacao,
         c.ortomosaico_url, c.ortomosaico_minzoom, c.ortomosaico_maxzoom, c.ortomosaico_bounds
  from homenagens h
  join lapides l on l.id = h.lapide_id
  join cemiterios c on c.id = l.cemiterio_id
  where h.slug = p_slug limit 1;
$$;

-- create or replace preserva GRANT/revoke ja existente (so o drop+create
-- restaura GRANT implicito pra PUBLIC, achado ja documentado nesta sessao)
-- mas reaplico mesmo assim por seguranca, idempotente.
revoke execute on function public.obter_localizacao_memorial(text) from public, anon, authenticated;
