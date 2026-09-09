-- Banner de capa do topo do memorial, escolhido pela familia num catalogo
-- fechado (lib/bannersMemorial.ts). Aditivo e nulo por padrao: memorial que
-- ninguem escolher continua exatamente como e hoje, sem capa.
--
-- Guarda o ID do banner, nunca a URL: se um dia o arquivo trocar de nome, de
-- formato ou de resolucao, muda so o catalogo -- nenhuma linha do banco
-- vira link morto.
alter table public.homenagens
  add column if not exists banner_capa text;

-- Ordem abaixo repete EXATAMENTE a ordem atual das colunas da view: replace de
-- view nao deixa reordenar/renomear coluna existente, so acrescentar no fim.
create or replace view public.homenagens_publica as
select
  id, nome_completo, data_nascimento, data_falecimento, cidade,
  frase_preferida, biografia, foto_url, video_url, galeria_fotos, timeline,
  velas_acesas, slug, vinculos, videos_galeria, tema,
  ambiente_lateral, cor_lateral, banner_capa
from public.homenagens;

-- security_invoker cai a cada replace da view (pegadinha ja documentada no
-- projeto) -- reaplicar sempre logo em seguida.
alter view public.homenagens_publica set (security_invoker = on);
