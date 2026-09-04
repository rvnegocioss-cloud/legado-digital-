-- Achado no get_advisors logo depois da migration anterior: is_admin_legado()
-- ficou executavel por anon mesmo com "revoke all from public" (mesma pegadinha
-- de sempre — revogar de PUBLIC nem sempre cobre um GRANT direto/implicito pra
-- anon nessa versao do Supabase). Sem risco real (a funcao so olha auth.uid(),
-- que e null pra anon, sempre retorna false) mas fecha o WARN mesmo assim.
revoke execute on function public.is_admin_legado() from anon;
