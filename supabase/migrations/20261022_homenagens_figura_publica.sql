-- Memorial de figura pública real, criado pela equipe, sem vínculo com família ou parceiro.
-- Só marca (cor diferente na Central); não muda privacidade nem a página pública.
-- Coluna nova em tabela existente: sem GRANT novo. Não entra em homenagens_publica.
alter table homenagens add column if not exists figura_publica boolean not null default false;
comment on column homenagens.figura_publica is 'Memorial de figura pública real, criado pela equipe, sem vínculo com família ou parceiro. Só marca; não muda privacidade.';
update homenagens set figura_publica = true where slug = 'joao-naves-de-avila';
