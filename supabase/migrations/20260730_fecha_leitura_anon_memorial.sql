-- A pagina publica (/homenagem/[slug]) ja foi corrigida no codigo pra ler
-- com service role em vez da chave anon, mas o banco ainda aceitava
-- leitura direta via REST com a chave publica, ignorando senha e os
-- toggles de busca/link/QR. Fecha essa segunda camada.

-- security_invoker tinha sido setado em 2026-07-29 mas foi derrubado
-- silenciosamente por um "create or replace view" posterior (create or
-- replace nao preserva reloptions) -- reaplicando.
alter view public.homenagens_publica set (security_invoker = on);

drop policy if exists "public read homenagens" on public.homenagens;
revoke select on public.homenagens from anon;
revoke select on public.homenagens_publica from anon;

drop policy if exists "Leitura pública" on public.condolencias;
drop policy if exists "mural_memorias_select_public" on public.mural_memorias;
revoke select on public.condolencias from anon;
revoke select on public.mural_memorias from anon;

-- homenagens_busca_publica MANTEM grant pra anon: e a fonte da busca via
-- RPC buscar_homenagens_publicas, so expoe colunas de vitrine + booleanos
-- (tem_senha, busca/link/qrcode_habilitada), sem biografia/hash/dado
-- sensivel -- ver CLAUDE.md secao "Busca publica e privacidade por senha".
