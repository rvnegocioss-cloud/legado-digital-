-- Escrita pública de condolencias/mural_memorias/reagir_memoria/acender_vela
-- ia direto do navegador pro Supabase REST/RPC, sem passar pelo rate limit
-- do proxy.ts (que só cobre /api/*). Agora tudo passa por Route Handlers
-- próprios (/api/memorial-condolencia, /api/memorial-mural,
-- /api/memorial-mural-reagir, /api/memorial-vela) usando service role —
-- por isso o INSERT/EXECUTE público direto sai daqui.

drop policy if exists "Inserir condolência" on public.condolencias;
drop policy if exists "mural_memorias_insert_public" on public.mural_memorias;

revoke execute on function public.reagir_memoria(uuid) from anon, authenticated;
revoke execute on function public.acender_vela(text) from anon, authenticated;

-- acender_vela tinha EXECUTE concedido a PUBLIC (grant implícito de quando a
-- função foi criada), então revogar só de anon/authenticated não bastava —
-- PUBLIC ainda liberava. reagir_memoria já não tinha esse grant a mais.
revoke execute on function public.acender_vela(text) from public;
