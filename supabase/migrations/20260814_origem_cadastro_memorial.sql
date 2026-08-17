-- Como o memorial entrou no sistema. Sem isso não dá pra saber se um
-- memorial "vazio" está esperando alguém ou se nasceu assim de propósito:
-- cadastro feito em campo, direto no túmulo pelo mapa do cemitério, nasce
-- só com o nome (é o mínimo pra existir) e o resto vem depois -- diferente
-- de um cadastro pela Central/Parceiro, onde a ficha inteira está à mão.
--
-- Aditivo e null-safe: memorial antigo fica null e é tratado como
-- 'central' na leitura, nenhuma tela existente quebra.
alter table homenagens
  add column if not exists origem_cadastro text
  check (origem_cadastro in ('central', 'parceiro', 'mapa_cemiterio', 'familia'));

comment on column homenagens.origem_cadastro is
  'Onde o memorial foi criado. mapa_cemiterio = botao direito no tumulo, em campo, so com o nome completo.';
