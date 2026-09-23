-- Informações públicas do cemitério (2026-09-23, pedido do Rafael).
--
-- A página pública do cemitério passa a mostrar endereço completo, horário e
-- contatos ao lado do botão "Caminho até o cemitério", mais um bloco "Sobre o
-- cemitério" (o bloco institucional do wireframe do Pedro). Até aqui a tabela
-- só tinha `endereco`.
--
-- Só ACRESCENTA colunas, todas nulas por padrão: nenhum cemitério existente
-- muda, e cemitério sem informação simplesmente não mostra o bloco. Nada é
-- alterado nem removido.
--
--   bairro                    bairro do cemitério (o endereço já guarda rua e número)
--   horario_visitacao         texto livre ("Todos os dias, das 7h às 17h30")
--   descricao_publica         texto institucional curto
--   site_url                  site oficial, se houver
--   servicos                  lista curta de serviços ("Salas velatórias", ...)
--   contatos                  jsonb [{ "rotulo": "...", "tipo": "telefone|whatsapp", "valor": "..." }]
--                             -- uma lista com rótulo, e não uma coluna `whatsapp`,
--                             porque o número de WhatsApp que existe pode ser o da
--                             PREFEITURA e não o do cemitério, e a página precisa
--                             dizer isso em vez de fingir que é o do cemitério.
--   informacoes_fonte         de onde veio a informação (link/nome), pra conferir depois
--   informacoes_atualizadas_em  quando foi conferida

alter table public.cemiterios
  add column if not exists bairro text,
  add column if not exists horario_visitacao text,
  add column if not exists descricao_publica text,
  add column if not exists site_url text,
  add column if not exists servicos text[],
  add column if not exists contatos jsonb not null default '[]'::jsonb,
  add column if not exists informacoes_fonte text,
  add column if not exists informacoes_atualizadas_em date;

alter table public.cemiterios
  drop constraint if exists cemiterios_contatos_e_lista;
alter table public.cemiterios
  add constraint cemiterios_contatos_e_lista check (jsonb_typeof(contatos) = 'array');
