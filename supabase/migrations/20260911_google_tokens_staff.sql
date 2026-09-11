-- Guarda o acesso Google (Gmail/Calendar/Drive) de cada membro da equipe,
-- separado por pessoa -- ninguem ve o token de ninguem, nem outro admin
-- (pedido explicito do Rafael, 2026-09-11: "nao quero ver a caixa do meu socio").
--
-- usuario_id = auth.uid() sempre (confirmado: public.usuarios.id == auth.users.id
-- neste projeto), entao a policy de "só a própria linha" funciona direto com
-- auth.uid(), sem junção nenhuma.
create table if not exists public.google_tokens (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  provider_token text not null,
  provider_refresh_token text,
  escopos text not null default '',
  atualizado_em timestamptz not null default now()
);

alter table public.google_tokens enable row level security;

drop policy if exists "google_tokens_dono" on public.google_tokens;
create policy "google_tokens_dono" on public.google_tokens
  for all
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

-- Nunca liberado pra anon/authenticated fora da policy acima -- so o dono, e
-- o service role (API routes do servidor), que ignora RLS por padrao.
revoke all on public.google_tokens from anon;
