-- Ambiente decorativo das laterais da pagina do memorial, escolhido pela
-- familia no proprio portal. Aditivo: colunas novas com default, nenhum
-- memorial existente muda de comportamento sem alguem escolher.
alter table public.homenagens
  add column if not exists ambiente_lateral text not null default 'pontos',
  add column if not exists cor_lateral text not null default 'preto';

alter table public.homenagens drop constraint if exists homenagens_ambiente_lateral_check;
alter table public.homenagens add constraint homenagens_ambiente_lateral_check
  check (ambiente_lateral in ('pontos', 'petalas', 'ambos', 'nenhum'));

alter table public.homenagens drop constraint if exists homenagens_cor_lateral_check;
alter table public.homenagens add constraint homenagens_cor_lateral_check
  check (cor_lateral in ('preto', 'vinho', 'marrom'));

-- A ordem abaixo repete EXATAMENTE a ordem atual das colunas da view: replace
-- de view nao deixa reordenar/renomear coluna existente, so acrescentar no fim.
create or replace view public.homenagens_publica as
select
  id, nome_completo, data_nascimento, data_falecimento, cidade,
  frase_preferida, biografia, foto_url, video_url, galeria_fotos, timeline,
  velas_acesas, slug, vinculos, videos_galeria, tema,
  ambiente_lateral, cor_lateral
from public.homenagens;

-- security_invoker cai a cada replace da view (pegadinha ja documentada no
-- projeto) -- reaplicar sempre logo em seguida.
alter view public.homenagens_publica set (security_invoker = on);
