-- Auditoria de seguranca 2026-07-29 (F-1, estrutural).
--
-- parceiros_publicos: view simples (8 colunas nao sensiveis) sobre parceiros_b2b,
-- sem security_invoker ate agora -> rodava com privilegio do dono (postgres,
-- BYPASSRLS). A escrita ja foi revogada na migration anterior; aqui fecha
-- tambem a leitura pra depender da RLS de verdade, nao so da lista de colunas
-- do SELECT da view (defesa em profundidade: se um dia alguem alterar a view
-- pra incluir coluna sensivel tipo email/cnpj/status_pagamento, a RLS ainda
-- barra por linha).
alter table public.parceiros_b2b enable row level security;

drop policy if exists "parceiros_b2b_publico_ativo" on public.parceiros_b2b;
create policy "parceiros_b2b_publico_ativo"
  on public.parceiros_b2b
  for select
  to anon, authenticated
  using (ativo = true and slug is not null);

alter view public.parceiros_publicos set (security_invoker = on);

-- homenagens_busca_publica: NAO flipar security_invoker aqui, de proposito.
-- A view computa `(s.senha_acesso_hash is not null) as tem_senha` a partir de
-- homenagens_seguranca. Com security_invoker=on, quem executa a query (anon)
-- precisaria de GRANT SELECT na coluna senha_acesso_hash pra so avaliar esse
-- "is not null" (Postgres exige privilegio de coluna pra referencia-la em
-- qualquer expressao, mesmo sem expor o valor cru na saida) - isso abriria
-- select direto do hash em homenagens_seguranca, contra o principio ja
-- documentado no projeto de "hash nunca trafega pro client". Mantida como
-- view sem security_invoker (equivalente a security definer), intencional:
-- so expoe booleanos derivados, nunca a coluna de hash. Fechada pra escrita
-- na migration anterior; leitura publica continua restrita as colunas que a
-- propria view ja define (nunca inclui hash).
