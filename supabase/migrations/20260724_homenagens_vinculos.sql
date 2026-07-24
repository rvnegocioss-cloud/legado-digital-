-- Badges de vínculo (Esposo, Pai, Avô, Amigo...) perto do nome no hero da página do memorial.
-- Coluna nova, nullable, não mexe em nenhum dado existente.
ALTER TABLE homenagens
  ADD COLUMN IF NOT EXISTS vinculos text[] DEFAULT NULL;

COMMENT ON COLUMN homenagens.vinculos IS 'Badges de vínculo/papel exibidos perto do nome (ex: Esposo, Pai, Avô, Amigo) — array de texto livre, definido pela família.';
