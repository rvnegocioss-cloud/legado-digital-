-- Nome do jazigo (pedido do Rafael, 2026-09-15): o card do mapa passa a abrir
-- com "Jazigo Família Saraiva" no topo em vez do código técnico Q36-R01-T011.
-- Texto livre em vez de só o sobrenome: nem todo jazigo é de família (existe
-- capela, perpétuo numerado, jazigo institucional) -- forçar "Família X" na UI
-- geraria rótulo errado nesses casos. Vazio cai no código técnico de sempre.
-- Aditivo: coluna nova, nenhuma existente é tocada (regra 1).
-- (aplicado via MCP -- este arquivo é o registro)
alter table lapides add column if not exists nome text;

comment on column lapides.nome is
  'Nome do jazigo mostrado como titulo no card do mapa e na pagina do jazigo (ex: "Jazigo Familia Saraiva"). Texto livre -- nem todo jazigo e de familia. Vazio cai no codigo tecnico do jazigo.';
