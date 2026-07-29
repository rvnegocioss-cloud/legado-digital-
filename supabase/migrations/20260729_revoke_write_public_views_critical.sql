-- Auditoria de seguranca 2026-07-29 (F-1, critico): as views parceiros_publicos e
-- homenagens_busca_publica nao tem security_invoker, entao rodam com privilegio do
-- dono (postgres, BYPASSRLS) e sao auto-updatable. anon/authenticated tinham grant
-- de INSERT/UPDATE/DELETE nelas, ou seja, qualquer requisicao com a anon key
-- conseguia UPDATE/DELETE direto em parceiros_b2b (via parceiros_publicos) por
-- fora da RLS. Mitigacao imediata: tira a escrita, mantem so leitura.
revoke insert, update, delete, truncate on public.parceiros_publicos from anon, authenticated;
revoke insert, update, delete, truncate on public.homenagens_busca_publica from anon, authenticated;
