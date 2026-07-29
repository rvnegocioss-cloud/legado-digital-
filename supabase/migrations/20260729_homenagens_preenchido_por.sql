alter table homenagens add column if not exists preenchido_por text
  check (preenchido_por in ('funeraria','familia'));
comment on column homenagens.preenchido_por is 'Quem vai preencher o conteudo do memorial (fotos/bio/timeline) - escolhido no cadastro pelo parceiro. Null = registro antigo/nao decidido.';
