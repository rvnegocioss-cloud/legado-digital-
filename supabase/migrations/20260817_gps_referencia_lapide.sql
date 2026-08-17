-- Coordenada de referencia tirada em campo (GPS de celular, link do Google
-- Maps) pra CONFERIR o ponto marcado no ortomosaico. Nunca substitui a
-- coordenada oficial (latitude/longitude) automaticamente -- staff decide se
-- move o tumulo ou nao. Guardada pra dar pra auditar depois quanto o GPS
-- desviou do ortomosaico em cada cemiterio.
alter table lapides
  add column if not exists gps_referencia_latitude double precision,
  add column if not exists gps_referencia_longitude double precision,
  add column if not exists gps_referencia_em timestamptz,
  add column if not exists gps_referencia_nota text;

comment on column lapides.gps_referencia_latitude is 'Latitude conferida em campo (GPS/celular). So referencia -- a coordenada valida continua sendo lapides.latitude.';
comment on column lapides.gps_referencia_nota is 'De onde veio a coordenada de referencia (quem mediu, formato do link, observacao).';
