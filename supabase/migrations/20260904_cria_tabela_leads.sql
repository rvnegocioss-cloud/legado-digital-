-- Leads capturados nas telas publicas de acesso (/parceiro/login e /familia/login).
-- Aditivo: tabela nova, nenhuma existente e tocada.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('parceiro', 'familia')),
  nome text not null,
  empresa text,
  email text not null,
  telefone text,
  cidade text,
  homenageado text,
  mensagem text,
  status text not null default 'novo' check (status in ('novo', 'em_contato', 'convertido', 'descartado')),
  lido boolean not null default false,
  origem text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_tipo on public.leads (tipo, created_at desc);

alter table public.leads enable row level security;

-- So staff enxerga/edita. Insert publico NAO tem policy de proposito: a rota
-- /api/lead grava com service role, atras de rate limit -- mesmo padrao das
-- escritas publicas fechadas em 2026-07-30 (condolencias/mural/vela).
drop policy if exists leads_staff_all on public.leads;
create policy leads_staff_all on public.leads
  for all to authenticated
  using (is_legado_staff())
  with check (is_legado_staff());

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- Destinatarios do aviso de lead novo: configuravel na Central, sem hardcode
-- (mesmo padrao de configuracoes_sistema.email_fornecedor_placas).
insert into public.configuracoes_sistema (chave, valor)
values ('emails_leads', 'contato@legadodigital.net,ricardo.alves@legadodigital.net,rafael.abrao@legadodigital.net')
on conflict (chave) do nothing;
