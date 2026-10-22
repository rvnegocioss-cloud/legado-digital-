-- A família escolhe se a foto da lápide aparece no card do mapa público (padrão: oculta).
-- Aplicada via MCP em 2026-10-22 (apply_migration lapides_foto_face_publica).
-- Mudança na função obter_mapa_publico_cemiterio: 'foto_lapide' = case when l.foto_face_publica then l.foto_face_url else null end
-- e group by inclui l.foto_face_publica. Resto idêntico a 20260923_mapa_publico_informacoes.sql (reverter = reaplicar aquele arquivo).
alter table lapides add column if not exists foto_face_publica boolean not null default false;
comment on column lapides.foto_face_publica is 'A família escolhe se a foto da lápide aparece no card do mapa público. Padrão: oculta.';
