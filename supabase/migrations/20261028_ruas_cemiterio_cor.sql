-- Cor escolhida pelo usuario para a rua (hex, ex.: #8a1c1c). Nula = padrao do tipo.
-- Coluna nova, aditiva. Rollback: alter table ruas_cemiterio drop column cor;
alter table ruas_cemiterio
  add column if not exists cor text
  check (cor is null or cor ~ '^#[0-9a-fA-F]{6}$');
