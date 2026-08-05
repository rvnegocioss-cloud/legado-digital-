-- Sistema de enderecamento de tumulo independente de nome gravado --
-- Quadra -> Fila -> Tumulo, ancorado na geometria do ortomosaico (regra 2:
-- escala desde o inicio, cemiterio pode ter milhares de tumulos).
--
-- Aditivo: nao remove/altera coluna existente. quadra/lote/identificacao
-- de lapides continuam existindo e sao preenchidas como espelho do codigo
-- novo (ver migration C) -- telas que ja leem essas colunas continuam
-- funcionando sem alteracao nenhuma.

alter table cemiterios
  add column if not exists rotulo_quadra text not null default 'Quadra',
  add column if not exists rotulo_fila   text not null default 'Rua',
  add column if not exists rotulo_tumulo text not null default 'Túmulo';

create table if not exists quadras (
  id uuid primary key default gen_random_uuid(),
  cemiterio_id uuid not null references cemiterios(id) on delete cascade,
  numero int not null,
  nome text,
  poligono jsonb,
  centro_latitude double precision,
  centro_longitude double precision,
  distancia_entrada_m double precision,
  situacao text not null default 'ativa'
    check (situacao in ('ativa','expansao','desativada')),
  numeracao_origem text not null default 'auto_distancia'
    check (numeracao_origem in ('auto_distancia','manual')),
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (cemiterio_id, numero)
);

create table if not exists filas (
  id uuid primary key default gen_random_uuid(),
  quadra_id uuid not null references quadras(id) on delete cascade,
  cemiterio_id uuid not null references cemiterios(id) on delete cascade,
  numero int not null,
  eixo jsonb,
  comprimento_m double precision,
  espacamento_m double precision,
  quantidade_prevista int,
  distancia_entrada_m double precision,
  situacao text not null default 'ativa'
    check (situacao in ('ativa','expansao','desativada')),
  numeracao_origem text not null default 'auto_distancia'
    check (numeracao_origem in ('auto_distancia','manual')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (quadra_id, numero)
);

alter table lapides
  add column if not exists quadra_id uuid references quadras(id),
  add column if not exists fila_id   uuid references filas(id),
  add column if not exists numero int,
  add column if not exists codigo text,
  add column if not exists codigo_anterior text,
  add column if not exists coordenada_precisao text
    check (coordenada_precisao in ('exata','interpolada')),
  add column if not exists situacao text not null default 'nao_confirmada'
    check (situacao in ('nao_confirmada','confirmada','vaga','removida')),
  add column if not exists confirmada_em timestamptz,
  add column if not exists confirmada_por uuid references usuarios(id),
  add column if not exists foto_face_url text;

create unique index if not exists uniq_lapide_codigo on lapides (cemiterio_id, codigo) where codigo is not null;
create unique index if not exists uniq_lapide_fila_numero on lapides (fila_id, numero) where fila_id is not null;
create index if not exists idx_lapides_fila on lapides (fila_id, numero);
create index if not exists idx_lapides_quadra on lapides (quadra_id);
create index if not exists idx_lapides_cemiterio_situacao on lapides (cemiterio_id, situacao);
create index if not exists idx_quadras_cemiterio on quadras (cemiterio_id);
create index if not exists idx_filas_quadra on filas (quadra_id);
create index if not exists idx_filas_cemiterio on filas (cemiterio_id);

alter table quadras enable row level security;
alter table filas enable row level security;

create policy quadras_staff_all on quadras for all
  using (is_legado_staff()) with check (is_legado_staff());
create policy quadras_parceiro_select on quadras for select
  using (exists (select 1 from cemiterios c where c.id = quadras.cemiterio_id and is_own_parceiro(c.parceiro_id)));

create policy filas_staff_all on filas for all
  using (is_legado_staff()) with check (is_legado_staff());
create policy filas_parceiro_select on filas for select
  using (exists (select 1 from cemiterios c where c.id = filas.cemiterio_id and is_own_parceiro(c.parceiro_id)));
