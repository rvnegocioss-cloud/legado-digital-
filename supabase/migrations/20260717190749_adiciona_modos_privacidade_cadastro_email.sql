-- RECUPERADA RETROATIVAMENTE em 2026-07-31: essa migration foi aplicada
-- via MCP em 2026-07-17 mas nunca foi salva na pasta local, então o schema
-- real do banco ficou 13 dias à frente do que o repo mostrava. Achado
-- durante o planejamento (Opus) dos modos de privacidade completos —
-- ninguém tinha visto o scaffold (modo_gate + memorial_visitantes +
-- homenagens_emails_autorizados + memorial_email_codigos) porque não
-- aparecia em `git log` nem em `ls supabase/migrations/`. Texto abaixo é
-- exatamente o que rodou (recuperado de
-- supabase_migrations.schema_migrations.statements), sem edição.

-- Eixo B: modo de portão da página do memorial (aberto | senha | cadastro | email)
alter table homenagens_seguranca
  add column if not exists modo_gate text not null default 'aberto'
    check (modo_gate in ('aberto','senha','cadastro','email'));

update homenagens_seguranca
  set modo_gate = 'senha'
  where senha_acesso_hash is not null and modo_gate = 'aberto';

-- Privado por cadastro: quem se identificou (nome+email, sem verificação) pra ver o memorial
create table if not exists memorial_visitantes (
  id uuid primary key default gen_random_uuid(),
  homenagem_id uuid not null references homenagens(id) on delete cascade,
  nome text not null,
  email text not null,
  criado_em timestamptz not null default now()
);

alter table memorial_visitantes enable row level security;

create policy memorial_visitantes_staff_all on memorial_visitantes
  for all
  using (
    is_legado_staff() or exists (
      select 1 from homenagens h
      where h.id = memorial_visitantes.homenagem_id
        and h.parceiro_id is not null
        and is_own_parceiro(h.parceiro_id)
    )
  )
  with check (
    is_legado_staff() or exists (
      select 1 from homenagens h
      where h.id = memorial_visitantes.homenagem_id
        and h.parceiro_id is not null
        and is_own_parceiro(h.parceiro_id)
    )
  );

-- Privado por e-mail: allowlist de quem a família autorizou a ver
create table if not exists homenagens_emails_autorizados (
  id uuid primary key default gen_random_uuid(),
  homenagem_id uuid not null references homenagens(id) on delete cascade,
  email text not null,
  criado_em timestamptz not null default now(),
  unique (homenagem_id, email)
);

alter table homenagens_emails_autorizados enable row level security;

create policy homenagens_emails_autorizados_staff_all on homenagens_emails_autorizados
  for all
  using (
    is_legado_staff() or exists (
      select 1 from homenagens h
      where h.id = homenagens_emails_autorizados.homenagem_id
        and h.parceiro_id is not null
        and is_own_parceiro(h.parceiro_id)
    )
  )
  with check (
    is_legado_staff() or exists (
      select 1 from homenagens h
      where h.id = homenagens_emails_autorizados.homenagem_id
        and h.parceiro_id is not null
        and is_own_parceiro(h.parceiro_id)
    )
  );

-- Código de verificação (OTP) temporário pro modo "privado por e-mail" — sem policy
-- pública nenhuma, nem staff: só as rotas de API (service role) mexem aqui.
create table if not exists memorial_email_codigos (
  id uuid primary key default gen_random_uuid(),
  homenagem_id uuid not null references homenagens(id) on delete cascade,
  email text not null,
  codigo_hash text not null,
  expira_em timestamptz not null,
  usado boolean not null default false,
  tentativas int not null default 0,
  criado_em timestamptz not null default now()
);

alter table memorial_email_codigos enable row level security;

-- Expor modo_gate (não é segredo) na view de busca pública
create or replace view homenagens_busca_publica as
 SELECT h.id,
    h.nome_completo,
    h.data_nascimento,
    h.data_falecimento,
    h.cidade,
    h.foto_url,
    h.slug,
    h.parceiro_id,
    s.senha_acesso_hash IS NOT NULL AS tem_senha,
    COALESCE(s.busca_habilitada, true) AS busca_habilitada,
    COALESCE(s.link_habilitado, true) AS link_habilitado,
    COALESCE(s.qrcode_habilitado, true) AS qrcode_habilitado,
    COALESCE(s.modo_gate, 'aberto') AS modo_gate
   FROM homenagens h
     LEFT JOIN homenagens_seguranca s ON s.homenagem_id = h.id
  WHERE h.slug IS NOT NULL;
