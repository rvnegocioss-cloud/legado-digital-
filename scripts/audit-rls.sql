-- ============================================================================
-- Auditoria de RLS (Row Level Security) — Legado Digital
-- Detecta buracos de segurança, políticas abertas, colunas sensíveis expostas
-- ============================================================================

-- Queries estruturadas para auditoria RLS

-- 1. Lista todas tabelas + status RLS
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN 'HABILITADO'
    ELSE 'DESABILITADO ⚠️'
  END AS rls_status,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'auth', 'graphql_public', 'pgsodium', 'net', 'extensions')
ORDER BY schemaname, tablename;

-- 2. Crítico: Tabelas de negócio SEM RLS (buraco de segurança)
-- AS CRITICAL_MISSING_RLS
SELECT
  schemaname,
  tablename,
  'CRÍTICO' AS severity,
  'Tabela sem RLS habilitado' AS issue
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity
  AND tablename NOT IN (
    -- Tabelas que NÃO precisam de RLS (informações públicas por design)
    'spatial_ref_sys',  -- Sistema PostGIS
    'geography_columns',
    'geometry_columns'
  )
ORDER BY tablename;

-- 3. Detalhes de todas policies existentes
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual AS condition_using,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Detectar políticas muito abertas (USING true)
-- AS WARNING_OPEN_POLICIES
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual AS condition,
  'AVISO' AS severity,
  'Política aceita tudo (USING true)' AS issue
FROM pg_policies
WHERE schemaname = 'public'
  AND qual = 'true'
  AND cmd IN ('SELECT', 'ALL')
ORDER BY tablename, policyname;

-- 5. Colunas sensíveis (email, senha, chave, token, CPF, CPF/CNPJ)
-- Estrutura: lista colunas sensíveis e verifica se estão em tabela com RLS
SELECT
  t.schemaname,
  t.tablename,
  a.attname AS column_name,
  CASE
    WHEN t.rowsecurity THEN 'SIM (RLS ✓)'
    ELSE 'NÃO (⚠️ RISCO)'
  END AS table_has_rls,
  CASE
    WHEN a.attname ~* '(senha|password|hash|token|key|secret)' THEN 'Sensitiva (Senha/Token)'
    WHEN a.attname ~* '(email|mail)' THEN 'PII (Email)'
    WHEN a.attname ~* '(cpf|cnpj|documento)' THEN 'PII (CPF/CNPJ)'
    WHEN a.attname ~* '(telefone|phone|celular)' THEN 'PII (Telefone)'
    WHEN a.attname ~* '(endereco|address|rua|avenida)' THEN 'PII (Endereço)'
    ELSE 'Verificar'
  END AS sensitivity_level
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE t.schemaname = 'public'
  AND NOT a.attisdropped
  AND a.attnum > 0
  AND (
    a.attname ~* '(senha|password|hash|token|key|secret|email|mail|cpf|cnpj|documento|telefone|phone|celular|endereco|address|rua|avenida)'
  )
ORDER BY t.tablename, a.attname;

-- 6. Checklist de tabelas críticas esperadas com RLS
-- AS EXPECTED_CRITICAL_TABLES
SELECT
  'usuarios' AS table_name,
  'Email, senha hash, dados de autenticação' AS sensitive_content
UNION ALL
SELECT 'homenagens_seguranca', 'Senha da família (hash), senha de acesso (hash)'
UNION ALL
SELECT 'configuracoes_sistema', 'API keys, tokens'
UNION ALL
SELECT 'emails_enviados', 'Log de e-mails (pode conter tokens)'
UNION ALL
SELECT 'parceiros_b2b', 'Dados do parceiro (CNPJ, telefone — não público)'
UNION ALL
SELECT 'usuarios_perfis', 'Vinculação usuário-papel'
UNION ALL
SELECT 'homenagens', 'Dados de memorial (alguns privados por mode de acesso)'
ORDER BY table_name;

-- 7. RLS Policy Summary por tabela (humanizado)
-- AS POLICY_SUMMARY
SELECT
  t.tablename,
  COUNT(p.policyname) AS total_policies,
  STRING_AGG(
    CONCAT(
      p.policyname,
      ' (',
      p.cmd,
      ', role: ?)'
    ),
    ' | '
  ) AS policies_list,
  CASE
    WHEN t.rowsecurity THEN 'Habilitado'
    ELSE 'Desabilitado'
  END AS rls_status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY total_policies DESC NULLS LAST, t.tablename;

-- 8. Função helper — verifica se coluna específica está exposta a role
-- USE CASE: SELECT check_column_exposure('usuarios', 'email', 'anon')
SELECT
  schemaname,
  tablename,
  attname AS column_name,
  'Check via RLS policy' AS method
FROM (
  SELECT DISTINCT
    n.nspname AS schemaname,
    c.relname AS tablename,
    a.attname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid
  WHERE n.nspname = 'public'
    AND (a.attname IN ('email', 'senha_familia_hash', 'api_key'))
) sub
ORDER BY schemaname, tablename, column_name;
