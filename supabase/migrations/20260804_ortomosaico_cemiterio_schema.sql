-- Suporte a ortomosaico de drone por cemiterio. Coluna nula = usa satelite
-- generico (fallback automatico, nenhum cemiterio existente quebra).

alter table cemiterios
  add column if not exists ortomosaico_url text,
  add column if not exists ortomosaico_minzoom integer not null default 14,
  add column if not exists ortomosaico_maxzoom integer not null default 22,
  add column if not exists ortomosaico_bounds double precision[],
  add column if not exists ortomosaico_capturado_em date,
  add column if not exists ortomosaico_atualizado_em timestamptz;

-- lapides: de onde veio a coordenada -- hoje nao da pra saber se e GPS de
-- celular (impreciso) ou clique preciso no ortomosaico.
alter table lapides
  add column if not exists coordenada_origem text
    check (coordenada_origem in ('ortomosaico','gps_celular','mapa_satelite','importacao','desconhecida')),
  add column if not exists coordenada_atualizada_em timestamptz,
  add column if not exists coordenada_atualizada_por uuid references usuarios(id);

create index if not exists idx_lapides_cemiterio_coord
  on lapides (cemiterio_id) where latitude is not null;

-- RPC da pagina publica precisa devolver os campos novos de ortomosaico.
-- Muda o tipo de retorno -- CREATE OR REPLACE nao basta, precisa dropar.
drop function if exists public.obter_localizacao_memorial(text);

create function public.obter_localizacao_memorial(p_slug text)
returns table (
  cemiterio_nome text, cemiterio_lat double precision, cemiterio_lng double precision,
  lapide_lat double precision, lapide_lng double precision,
  quadra text, lote text, identificacao text,
  orto_url text, orto_minzoom integer, orto_maxzoom integer, orto_bounds double precision[]
)
language sql security definer set search_path to 'public' as $$
  select c.nome, c.latitude, c.longitude, l.latitude, l.longitude, l.quadra, l.lote, l.identificacao,
         c.ortomosaico_url, c.ortomosaico_minzoom, c.ortomosaico_maxzoom, c.ortomosaico_bounds
  from homenagens h
  join lapides l on l.id = h.lapide_id
  join cemiterios c on c.id = l.cemiterio_id
  where h.slug = p_slug limit 1;
$$;

-- Dropar/recriar a funcao restaura o GRANT implicito pra PUBLIC -- desfaz
-- o hardening da migration 20260731_endurece_grants_funcoes_avisos_scanner.sql
-- se nao reaplicar aqui (achado ja documentado nesta sessao).
revoke execute on function public.obter_localizacao_memorial(text) from public, anon, authenticated;

-- Bucket de Storage dedicado a mapas (memoriais so aceita image/video).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mapas','mapas', true, 104857600, array['application/octet-stream','image/webp'])
on conflict (id) do nothing;

-- Cemiterio real onde o drone (Rafael Rassi) voou, em frente ao Forum
-- Adolpho Fidelis dos Santos, Tupaciguara/MG. Coordenada vem do proprio
-- ortomosaico (centro real do voo).
update cemiterios set
  ortomosaico_url = 'https://yegvazxycfrbhblyzvhg.supabase.co/storage/v1/object/public/mapas/cemiterios/fadafe6a-0a3f-4ade-a60f-5e8579ddc75d/ortomosaico-v1.pmtiles',
  ortomosaico_bounds = array[-48.715802, -18.584043, -48.711540, -18.577457],
  ortomosaico_minzoom = 14,
  ortomosaico_maxzoom = 22,
  ortomosaico_capturado_em = '2026-08-04',
  ortomosaico_atualizado_em = now()
where id = 'fadafe6a-0a3f-4ade-a60f-5e8579ddc75d';
