-- Troca de tema persistente -- ate agora o SeletorTema.tsx era so demo,
-- nunca salvava. Pedido do Rafael 2026-07-31.

alter table public.homenagens
  add column if not exists tema text not null default 'navy'
    check (tema in ('navy','verde','grafite'));

-- Coluna nova sempre no final (create or replace view nao deixa reordenar
-- coluna existente) -- mesmo padrao de videos_galeria nesta sessao.
create or replace view public.homenagens_publica as
select id, nome_completo, data_nascimento, data_falecimento, cidade,
       frase_preferida, biografia, foto_url, video_url, galeria_fotos,
       timeline, velas_acesas, slug, vinculos, videos_galeria, tema
from public.homenagens
where slug is not null;

alter view public.homenagens_publica set (security_invoker = on);
grant select (tema) on public.homenagens to anon;
