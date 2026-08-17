-- Trava por ponto de referência. Sem isso o pino desliza sozinho a cada
-- clique/arrasto acidental em cima dele -- o mesmo motivo de quadras, filas
-- e ruas_cemiterio já terem geometria_revisada. Mesmo nome de coluna de
-- propósito, pra a régua ser a mesma no mapa inteiro.
alter table pontos_referencia_cemiterio
  add column if not exists geometria_revisada boolean not null default false;
