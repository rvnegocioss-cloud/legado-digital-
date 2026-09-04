-- Achado real (auditoria 2026-09-04): Operador Legado Digital conseguia promover
-- qualquer usuario a Admin (ou se auto-promover), porque is_legado_staff() e true
-- pros dois papeis e a policy de escrita em usuarios_perfis usava so essa checagem.
-- Corrige: escrita (insert/update/delete) em usuarios_perfis passa a exigir Admin.
-- Leitura continua liberada pra qualquer staff (precisa pra listar /admin/usuarios).

create or replace function public.is_admin_legado()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.usuarios_perfis up
    join public.perfis p on p.id = up.perfil_id
    where up.usuario_id = auth.uid()
      and p.nome = 'Admin Legado Digital'
  );
$function$;

-- recriar funcao restaura grant implicito pra PUBLIC (mesma pegadinha de sempre)
revoke all on function public.is_admin_legado() from public;
grant execute on function public.is_admin_legado() to authenticated;

drop policy if exists usuarios_perfis_staff_all on public.usuarios_perfis;

create policy usuarios_perfis_staff_select on public.usuarios_perfis
  for select using (is_legado_staff());

create policy usuarios_perfis_admin_insert on public.usuarios_perfis
  for insert with check (is_admin_legado());

create policy usuarios_perfis_admin_update on public.usuarios_perfis
  for update using (is_admin_legado()) with check (is_admin_legado());

create policy usuarios_perfis_admin_delete on public.usuarios_perfis
  for delete using (is_admin_legado());

-- Achado real: admin_dashboard_metricas executavel por anon/PUBLIC (defesa em
-- profundidade fraca numa RPC so-pra-Central; RLS das tabelas de baixo ja bloqueia
-- anon, mas nao devia nem ter a permissao de chamar).
revoke execute on function public.admin_dashboard_metricas() from public, anon;
