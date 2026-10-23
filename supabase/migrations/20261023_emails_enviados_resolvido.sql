-- Marcar erro de e-mail como resolvido (Central de Comunicações). Só acrescenta colunas nulas;
-- nada existente muda. Sem GRANT novo: a tabela já tem os grants, e a escrita passa por rota
-- de servidor (staff) com service role.
alter table public.emails_enviados add column if not exists resolvido_em timestamptz;
alter table public.emails_enviados add column if not exists resolvido_por uuid;
