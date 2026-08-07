-- Cemiterio pode ser operado por VARIOS parceiros ao mesmo tempo (ex: cemiterio
-- municipal com varias funerarias atuando nele) -- achado real do Rafael,
-- 2026-08-07. Ate agora cemiterios.parceiro_id era 1:1 (unico parceiro), nunca
-- usado de verdade (0 cemiterios com parceiro_id preenchido hoje -- confirmado
-- antes de escrever essa migration). Por isso: aditivo, sem risco de dado.
--
-- cemiterios.parceiro_id NAO e removida/alterada -- vira, na pratica, "parceiro
-- operador principal" (papel='principal' cobre a mesma semantica aqui). As 4
-- policies antigas que dependem dela continuam intactas; as novas SAO
-- ADICIONADAS ao lado (policies permissivas do mesmo comando se unem por OR no
-- Postgres) -- nenhum "drop policy" nesta migration.

create table if not exists cemiterios_parceiros (
  cemiterio_id uuid not null references cemiterios(id) on delete cascade,
  parceiro_id uuid not null references parceiros_b2b(id) on delete cascade,
  papel text not null default 'operador' check (papel in ('principal', 'operador')),
  ativo boolean not null default true,
  autorizado_em timestamptz not null default now(),
  autorizado_por uuid references usuarios(id),
  primary key (cemiterio_id, parceiro_id)
);

create index if not exists idx_cemiterios_parceiros_parceiro on cemiterios_parceiros (parceiro_id) where ativo;

alter table cemiterios_parceiros enable row level security;

-- Staff administra tudo. Parceiro so ve as PROPRIAS linhas -- sem isso a
-- funeraria A conseguiria enumerar quais outras funerarias operam no mesmo
-- cemiterio (vazamento comercial, viola a hierarquia de seguranca do projeto).
create policy cemiterios_parceiros_staff_all on cemiterios_parceiros for all
  using (is_legado_staff()) with check (is_legado_staff());
create policy cemiterios_parceiros_select_own on cemiterios_parceiros for select
  using (is_own_parceiro(parceiro_id));

-- Helper unico pra "esse parceiro pode ver esse cemiterio" -- cobre tanto o
-- parceiro_id antigo (legado, ainda pode ser preenchido) quanto a tabela nova.
create or replace function public.pode_ver_cemiterio(p_cemiterio_id uuid)
returns boolean
language sql stable security definer set search_path to 'public' as $$
  select is_legado_staff()
    or exists (
      select 1 from cemiterios c
      where c.id = p_cemiterio_id and is_own_parceiro(c.parceiro_id)
    )
    or exists (
      select 1 from cemiterios_parceiros cp
      where cp.cemiterio_id = p_cemiterio_id and cp.ativo and is_own_parceiro(cp.parceiro_id)
    );
$$;
revoke execute on function public.pode_ver_cemiterio(uuid) from public, anon;
grant execute on function public.pode_ver_cemiterio(uuid) to authenticated;
