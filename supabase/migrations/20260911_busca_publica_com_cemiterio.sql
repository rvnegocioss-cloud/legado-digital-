-- Nome do cemiterio na busca publica -- pedido do Rafael: memorial homonimo
-- (mais de uma pessoa com nome parecido) precisa de algo alem de cidade pra
-- a familia nao clicar no memorial errado. Ordem das colunas preservada,
-- cemiterio_nome entra so no fim (create or replace view nao reordena).
create or replace view public.homenagens_busca_publica as
select
  h.id,
  h.nome_completo,
  h.data_nascimento,
  h.data_falecimento,
  h.cidade,
  h.foto_url,
  h.slug,
  h.parceiro_id,
  s.senha_acesso_hash is not null as tem_senha,
  coalesce(s.busca_habilitada, true) as busca_habilitada,
  coalesce(s.link_habilitado, true) as link_habilitado,
  coalesce(s.qrcode_habilitado, true) as qrcode_habilitado,
  coalesce(s.modo_gate, 'aberto'::text) as modo_gate,
  coalesce(s.gate_versao, 1) as gate_versao,
  c.nome as cemiterio_nome
from homenagens h
  left join homenagens_seguranca s on s.homenagem_id = h.id
  left join lapides l on l.id = h.lapide_id
  left join cemiterios c on c.id = l.cemiterio_id
where h.slug is not null;
