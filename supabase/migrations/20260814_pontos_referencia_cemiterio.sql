-- Pontos de referência do cemitério (Capela, Administração, Sanitários,
-- Velório, portão secundário...) -- âncoras visuais que o mapa impresso da
-- prefeitura usa. Servem pra casar a numeração oficial de quadra com a
-- geometria real do ortomosaico. Staff marca clicando no mapa e ajusta
-- arrastando; parceiro só lê (mesmo gate de cemiterio, regra 22).
--
-- Motivo real (São Pedro, 2026-08-14): o mapa impresso da prefeitura é
-- esquemático (quadra desenhada como caixinha de tamanho igual), então dá a
-- ORDEM certa das quadras mas nunca o tamanho/posição real. Sem âncora
-- física no ortomosaico não dá pra conferir onde cada quadra começa.
create table if not exists pontos_referencia_cemiterio (
  id uuid primary key default gen_random_uuid(),
  cemiterio_id uuid not null references cemiterios(id) on delete cascade,
  nome text not null,
  latitude double precision not null,
  longitude double precision not null,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pontos_ref_cemiterio on pontos_referencia_cemiterio(cemiterio_id);

alter table pontos_referencia_cemiterio enable row level security;

create policy pontos_ref_staff_all on pontos_referencia_cemiterio
  for all to authenticated
  using (is_legado_staff())
  with check (is_legado_staff());

create policy pontos_ref_parceiro_select on pontos_referencia_cemiterio
  for select to authenticated
  using (pode_ver_cemiterio(cemiterio_id));

create trigger pontos_ref_set_updated_at
  before update on pontos_referencia_cemiterio
  for each row execute function set_updated_at();
