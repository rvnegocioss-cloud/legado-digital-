-- Achado 2026-07-30 (Rafael, ao vivo): ficha do Parceiro nunca teve campo de
-- Cemiterio/Lapide porque cemiterios/lapides eram 100% staff-only no RLS -
-- parceiro nao conseguia nem LER as proprias, mesmo cemiterios ja tendo
-- parceiro_id. Sem lapide_id vinculado, a secao "Como Chegar" da pagina
-- publica nunca aparece pros memoriais criados pelo Parceiro.
create policy "cemiterios_parceiro_select"
  on public.cemiterios
  for select
  to authenticated
  using (is_own_parceiro(parceiro_id));

create policy "lapides_parceiro_select"
  on public.lapides
  for select
  to authenticated
  using (
    exists (
      select 1 from public.cemiterios c
      where c.id = lapides.cemiterio_id
        and is_own_parceiro(c.parceiro_id)
    )
  );
