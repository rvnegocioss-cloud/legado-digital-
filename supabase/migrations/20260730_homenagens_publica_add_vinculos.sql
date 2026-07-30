-- Badges de vinculo/papel (Esposo/Pai/Avo) perto do nome na pagina publica -
-- coluna ja existia (migracao 2026-07-24), so faltava a UI de edicao e o
-- campo na view/grant de leitura publica.
create or replace view public.homenagens_publica as
select id, nome_completo, data_nascimento, data_falecimento, cidade,
       frase_preferida, biografia, foto_url, video_url, galeria_fotos,
       timeline, velas_acesas, slug, vinculos
from public.homenagens
where slug is not null;

grant select (vinculos) on public.homenagens to anon;
