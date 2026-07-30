-- Achado na auditoria sistematica 2026-07-30 (B6): mural de memorias tem
-- moderacao (DELETE por staff/dono do parceiro), condolencias (Livro de
-- Assinaturas) nao tem nenhuma - apesar do rodape da pagina publica
-- prometer moderacao pras duas. Mesmo padrao do mural, replicado aqui.
create policy "condolencias_staff_all"
  on public.condolencias
  for all
  to authenticated
  using (is_legado_staff());

create policy "condolencias_parceiro_delete"
  on public.condolencias
  for delete
  to authenticated
  using (
    exists (
      select 1 from homenagens h
      where h.id = condolencias.homenagem_id
        and h.parceiro_id is not null
        and is_own_parceiro(h.parceiro_id)
    )
  );
