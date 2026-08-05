-- Trava de "quadra revisada" -- staff confirma no modo edicao manual (pinos
-- arrastaveis) que a geometria daquela quadra esta certa, evita mexer sem
-- querer depois. Nao e a mesma coisa que lapides.situacao='confirmada'
-- (essa e por-tumulo, vem da vistoria de campo -- diferente etapa).
alter table quadras add column if not exists geometria_revisada boolean not null default false;
