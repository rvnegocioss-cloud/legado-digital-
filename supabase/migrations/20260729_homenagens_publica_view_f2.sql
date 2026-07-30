-- Auditoria de seguranca 2026-07-29 (F-2): a leitura publica de homenagens
-- dependia so de GRANT por coluna pra anon (24 das 30 colunas, sem
-- familia_email/familia_nome_responsavel/familia_telefone/mensagem_placa/
-- preenchido_por/updated_at) - funcionava, mas era fragil: GRANT por coluna
-- nao se estende sozinho a colunas novas, e um `GRANT SELECT ON homenagens
-- TO anon` generico no futuro reexporia tudo de uma vez, sem erro nem aviso.
--
-- View com lista de coluna explicita, so com o que a pagina publica do
-- memorial (app/homenagem/[slug]/page.tsx) de fato usa. security_invoker=on
-- (RLS de verdade, nao bypass) - por isso o GRANT por coluna abaixo continua
-- necessario (view invoker exige privilegio nas colunas da tabela-base pra
-- quem executa a query, mesmo so acessando via view).
create or replace view public.homenagens_publica as
select id, nome_completo, data_nascimento, data_falecimento, cidade,
       frase_preferida, biografia, foto_url, video_url, galeria_fotos,
       timeline, velas_acesas, slug
from public.homenagens
where slug is not null;

alter view public.homenagens_publica set (security_invoker = on);

revoke select on public.homenagens from anon;
grant select (id, nome_completo, data_nascimento, data_falecimento, cidade,
       frase_preferida, biografia, foto_url, video_url, galeria_fotos,
       timeline, velas_acesas, slug)
  on public.homenagens to anon;

grant select on public.homenagens_publica to anon;

-- app/homenagem/[slug]/page.tsx atualizado no mesmo commit pra ler de
-- homenagens_publica em vez de homenagens direto (unico consumidor anon
-- da tabela - todo o resto do projeto le via Central/Parceiro/Familia
-- autenticados, com RLS propria, ou via service role em API route).
