-- Página do parceiro com capa e contato (2026-10-09, pedido do Rafael).
--
-- Só ACRESCENTA colunas, todas nulas por padrão: nenhum parceiro existente
-- muda. A página pública (/parceiros/[slug]) e a apresentação guiada
-- (/apresentacao/[slug]) leem estas colunas no servidor, com service role e
-- lista de colunas explícita -- por isso a view parceiros_publicos e os grants
-- de anon NÃO foram tocados (email/telefone/cnpj internos continuam fora do
-- alcance público). A escrita passa por /api/parceiro-pagina (staff ou o
-- próprio parceiro), nunca por update direto do navegador.
--
-- telefone_publico é separado de `telefone` de propósito: `telefone` é o
-- contato interno/comercial do cadastro; o público é o que a funerária
-- escolhe divulgar pra família.

alter table public.parceiros_b2b
  add column if not exists capa_url text,
  add column if not exists whatsapp_publico text,
  add column if not exists telefone_publico text,
  add column if not exists endereco_publico text;

comment on column public.parceiros_b2b.capa_url is 'Foto de capa da página pública do parceiro (mín. 1600x533, validado em /api/parceiro-pagina/imagem).';
comment on column public.parceiros_b2b.whatsapp_publico is 'WhatsApp divulgado na página pública do parceiro.';
comment on column public.parceiros_b2b.telefone_publico is 'Telefone divulgado na página pública (o campo telefone é o contato interno).';
comment on column public.parceiros_b2b.endereco_publico is 'Endereço divulgado na página pública do parceiro.';
