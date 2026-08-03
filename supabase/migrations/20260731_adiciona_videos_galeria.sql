-- Suporte a multiplos videos por memorial -- mesma logica de galeria_fotos
-- (video_url continua sendo o video "capa", pode ser YouTube; videos_galeria
-- sao extras, so upload direto). Pedido do Rafael 2026-07-31, estava pausado.

alter table public.homenagens
  add column if not exists videos_galeria text[];

alter table public.homenagens
  add constraint videos_galeria_max_4 check (videos_galeria is null or array_length(videos_galeria, 1) <= 4);

-- View publica precisa da coluna nova pra pagina do memorial mostrar --
-- coluna nova so pode ir no final da lista (create or replace view nao
-- deixa mudar posicao/nome de coluna existente).
create or replace view public.homenagens_publica as
select id, nome_completo, data_nascimento, data_falecimento, cidade,
       frase_preferida, biografia, foto_url, video_url, galeria_fotos,
       timeline, velas_acesas, slug, vinculos, videos_galeria
from public.homenagens
where slug is not null;

-- create or replace view derruba security_invoker (achado real desta
-- sessao) -- reaplicar sempre depois de qualquer create-or-replace nessa view.
alter view public.homenagens_publica set (security_invoker = on);

grant select (videos_galeria) on public.homenagens to anon;
