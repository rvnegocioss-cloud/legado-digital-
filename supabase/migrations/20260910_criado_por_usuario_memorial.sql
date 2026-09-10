-- Quem da equipe/parceiro cadastrou o memorial, vinculado por login -- nunca
-- um campo de texto (nome digitado erra, esquece ou mente). Nulo por padrao:
-- memorial de antes dessa mudanca nao tem como descobrir isso retroativamente.
--
-- ON DELETE SET NULL: desativar/apagar um usuario no futuro nao pode apagar
-- memorial nenhum -- so perde a atribuicao.
alter table public.homenagens
  add column if not exists criado_por_usuario_id uuid references public.usuarios(id) on delete set null;

-- Unico caso conhecido de verdade hoje: Carlos Saraiva foi cadastrado pelo
-- Pedro (confirmado pelo Rafael, 2026-09-10) -- nao da pra descobrir isso
-- pelos dados, entao e atribuicao manual, uma vez so.
update public.homenagens
set criado_por_usuario_id = (select id from public.usuarios where email = 'pedro.saraiva@estouonline.com.br')
where slug = 'carlos-saraiva';
