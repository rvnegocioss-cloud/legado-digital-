-- Fase 2 do plano de modos de privacidade completos (oculto / cadastro /
-- email por allowlist+OTP). O scaffold de schema (modo_gate + as 3 tabelas
-- memorial_visitantes/homenagens_emails_autorizados/memorial_email_codigos)
-- ja existia desde 2026-07-17 mas nunca foi usado em codigo nenhum -- essa
-- migration completa o schema, o codigo/UI vem nas fases seguintes.

-- 2.1 alarga o CHECK (so adiciona 'oculto'; nenhuma linha existente e rejeitada)
alter table public.homenagens_seguranca drop constraint homenagens_seguranca_modo_gate_check;
alter table public.homenagens_seguranca add constraint homenagens_seguranca_modo_gate_check
  check (modo_gate in ('aberto','senha','cadastro','email','oculto'));

-- 2.2 versao do portao -- revoga cookie na hora quando a privacidade muda
alter table public.homenagens_seguranca
  add column if not exists gate_versao integer not null default 1;

-- 2.3 backfill defensivo (idempotente -- hoje 0 linhas, nenhum memorial usa senha)
update public.homenagens_seguranca set modo_gate='senha'
  where senha_acesso_hash is not null and modo_gate='aberto';

-- 2.4 indices (regra 2 -- escalavel desde o inicio)
create index if not exists idx_memorial_visitantes_homenagem on public.memorial_visitantes (homenagem_id, criado_em desc);
create index if not exists idx_memorial_email_codigos_lookup on public.memorial_email_codigos (homenagem_id, email, criado_em desc);
create index if not exists idx_memorial_email_codigos_expira on public.memorial_email_codigos (expira_em);

-- 2.5 revoga GRANT em branco (achado ao vivo: as 3 tabelas tinham acesso
-- total liberado pra anon/authenticated -- RLS ja bloqueava na pratica,
-- isso fecha por completo, least privilege real)
revoke all on public.memorial_visitantes, public.homenagens_emails_autorizados, public.memorial_email_codigos from anon, authenticated, public;
grant select, insert, update, delete on public.homenagens_emails_autorizados to authenticated;
grant select on public.memorial_visitantes to authenticated;
-- memorial_email_codigos fica so service_role (nem select pra authenticated)

-- 2.6 CHECK de sanidade nas tabelas novas (mesmo padrao ja usado em condolencias/mural)
alter table public.memorial_visitantes
  add constraint memorial_visitantes_nome_len check (char_length(nome) between 2 and 120),
  add constraint memorial_visitantes_email_len check (char_length(email) between 5 and 180);

-- 2.7 novo tipo de e-mail no log
alter table public.emails_enviados drop constraint emails_enviados_tipo_check;
alter table public.emails_enviados add constraint emails_enviados_tipo_check
  check (tipo in ('senha_familia','confirmacao_placa','envio_fornecedor','convite_parceiro','codigo_acesso_memorial'));

-- 2.8 busca nunca devolve oculto
create or replace function public.buscar_homenagens_publicas(termo text, p_parceiro_id uuid default null)
returns setof public.homenagens_busca_publica language sql stable set search_path to 'public' as $$
  select *
  from homenagens_busca_publica
  where unaccent(nome_completo) ilike unaccent('%' || termo || '%')
    and (p_parceiro_id is null or parceiro_id = p_parceiro_id)
    and busca_habilitada = true
    and modo_gate <> 'oculto'
  order by nome_completo
  limit 30
$$;

-- 2.9 view ganha gate_versao (modo_gate ja existia desde o scaffold de 2026-07-17)
create or replace view public.homenagens_busca_publica as
  select h.id, h.nome_completo, h.data_nascimento, h.data_falecimento, h.cidade,
         h.foto_url, h.slug, h.parceiro_id,
         (s.senha_acesso_hash is not null) as tem_senha,
         coalesce(s.busca_habilitada, true)   as busca_habilitada,
         coalesce(s.link_habilitado, true)    as link_habilitado,
         coalesce(s.qrcode_habilitado, true)  as qrcode_habilitado,
         coalesce(s.modo_gate, 'aberto')      as modo_gate,
         coalesce(s.gate_versao, 1)           as gate_versao
  from homenagens h left join homenagens_seguranca s on s.homenagem_id = h.id
  where h.slug is not null;

grant select on public.homenagens_busca_publica to anon, authenticated;
