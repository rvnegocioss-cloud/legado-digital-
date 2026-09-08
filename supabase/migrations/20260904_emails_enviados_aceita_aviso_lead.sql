-- Amplia o CHECK de tipo (nao remove nenhum valor existente, so acrescenta
-- 'aviso_lead') pro aviso de lead novo entrar no mesmo feed que ja alimenta
-- /admin/emails e o sino do header.
alter table public.emails_enviados drop constraint if exists emails_enviados_tipo_check;
alter table public.emails_enviados add constraint emails_enviados_tipo_check
  check (tipo = any (array[
    'senha_familia'::text,
    'confirmacao_placa'::text,
    'envio_fornecedor'::text,
    'convite_parceiro'::text,
    'codigo_acesso_memorial'::text,
    'aviso_lead'::text
  ]));
