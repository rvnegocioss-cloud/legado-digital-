-- Tipo da rua: principal (asfalto, passa carro) ou secundaria (entre tumulos, a pe).
-- Coluna nova, aditiva: ruas existentes viram 'principal'. Rollback:
--   alter table ruas_cemiterio drop column tipo;
alter table ruas_cemiterio
  add column if not exists tipo text not null default 'principal'
  check (tipo in ('principal', 'secundaria'));
