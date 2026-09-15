-- Gaveta ganha campo pra pessoa enterrada que ainda não tem memorial digital
-- (pedido do Rafael, 2026-09-15, refactor do Jazigo Família). Card do mapa
-- passa a listar quem tem memorial (clicável) e quem só tem nome (texto).
-- Aditivo: coluna nova, nenhuma existente é tocada (regra 1).
-- (aplicado via MCP -- este arquivo é o registro)
alter table gavetas add column if not exists nome_sem_memorial text;

comment on column gavetas.nome_sem_memorial is
  'Pessoa enterrada na gaveta que ainda não tem memorial digital. Fica vazio quando homenagem_id é preenchido (a pessoa "virou" memorial).';
