-- Memorial novo nasce OFFLINE (oculto): so aparece ao publico depois que alguem
-- autoriza e liga a chave "Memorial online / offline" (regra do Rafael, 2026-10-23).
-- Cobre todos os pontos de criacao (Central, Parceiro, mapa do cemiterio) num lugar so.
create or replace function public.homenagens_nasce_offline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.homenagens_seguranca
    (homenagem_id, modo_gate, busca_habilitada, link_habilitado, qrcode_habilitado, updated_at)
  values (new.id, 'oculto', false, false, false, now())
  on conflict (homenagem_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.homenagens_nasce_offline() from public, anon, authenticated;

drop trigger if exists homenagens_nasce_offline_trg on public.homenagens;
create trigger homenagens_nasce_offline_trg
  after insert on public.homenagens
  for each row execute function public.homenagens_nasce_offline();
