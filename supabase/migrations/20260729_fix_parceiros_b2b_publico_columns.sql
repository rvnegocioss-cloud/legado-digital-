-- Correcao da migration anterior (20260729_security_invoker_parceiros_publicos):
-- a policy nova dava select de QUALQUER coluna (grant generico que o Supabase
-- ja tinha, so nunca tinha efeito por falta de policy) pra anon E authenticated
-- em qualquer parceiro ativo - isso expunha email/cnpj/telefone/observacoes/
-- status_pagamento/plano_contratado, que nunca foram publicos.

-- 1) A leitura publica so vale pra anon - authenticated ja tem
--    parceiros_b2b_own_select (proprio parceiro) e parceiros_b2b_staff_select
--    (staff, tudo); nao precisa nem deve ganhar acesso a OUTROS parceiros so
--    por estarem ativos.
drop policy if exists "parceiros_b2b_publico_ativo" on public.parceiros_b2b;
create policy "parceiros_b2b_publico_ativo"
  on public.parceiros_b2b
  for select
  to anon
  using (ativo = true and slug is not null);

-- 2) anon so pode enxergar as colunas que a view parceiros_publicos ja
--    expunha antes (nunca as sensiveis) - revoga tudo e regrant so essas.
revoke select on public.parceiros_b2b from anon;
grant select (id, nome_fantasia, razao_social, slug, logo_url, descricao_publica, tipo_parceiro, cidade, estado)
  on public.parceiros_b2b to anon;

-- 3) anon nunca deveria conseguir escrever em parceiros_b2b - grants antigos
--    do Supabase ainda estavam la (INSERT/UPDATE/DELETE), sem policy que os
--    autorizasse hoje, mas e o mesmo padrao fragil que causou o F-1 nas views
--    (grant presente + policy ausente = 1 policy futura mal escrita vira
--    buraco). Fecha por completo.
revoke insert, update, delete, truncate on public.parceiros_b2b from anon;

-- ativo precisa de grant tambem: nao aparece no SELECT da view, mas o WHERE
-- dela usa ativo=true - com security_invoker=on isso conta como referencia
-- de coluna e exige privilegio, mesmo sem sair no resultado. Nao e sensivel.
grant select (ativo) on public.parceiros_b2b to anon;
