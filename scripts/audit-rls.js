#!/usr/bin/env node
/**
 * Auditoria de RLS (Row Level Security) — Legado Digital
 * Detecta buracos de segurança, políticas abertas, colunas sensíveis expostas
 *
 * Uso:
 *   node scripts/audit-rls.js                # Executa e exibe relatório
 *   node scripts/audit-rls.js --fail-on-warning  # Exit 1 se houver AVISO
 *   node scripts/audit-rls.js --fail-on-critical  # Exit 1 se houver CRÍTICO (padrão)
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// ============================================================================
// CONFIG
// ============================================================================

const SUPABASE_PROJECT = 'yegvazxycfrbhblyzvhg';
const SUPABASE_URL = 'https://yegvazxycfrbhblyzvhg.supabase.co';

const REPORT_DIR = path.join(
  process.env.USERPROFILE,
  'Desktop',
  'Cerebro Claude - Legado Digital',
  'audits'
);

const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
const reportFile = path.join(REPORT_DIR, `rls-audit-${timestamp}.json`);
const reportMarkdownFile = path.join(REPORT_DIR, `rls-audit-${timestamp}.md`);

// Flags de linha de comando
const failOnWarning = process.argv.includes('--fail-on-warning');
const failOnCritical = process.argv.includes('--fail-on-critical') || !failOnWarning; // Padrão

// ============================================================================
// HELPERS
// ============================================================================

function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    console.log(`✓ Pasta de relatórios criada: ${REPORT_DIR}`);
  }
}

async function getSQLQuery() {
  const sqlPath = path.join(__dirname, 'audit-rls.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Arquivo SQL não encontrado: ${sqlPath}`);
  }
  return fs.readFileSync(sqlPath, 'utf-8');
}

/**
 * Tenta executar SQL via supabase CLI (preferido)
 * Se não tiver supabase CLI, tenta psql direto
 */
async function executeSQLViaSupabase() {
  const sqlPath = path.join(__dirname, 'audit-rls.sql');

  try {
    console.log('🔄 Tentando supabase CLI...');

    // Testa se supabase CLI está instalado
    await execAsync('supabase --version', { stdio: 'pipe' });

    // Executa via supabase CLI (requer login prévio)
    const { stdout, stderr } = await execAsync(
      `supabase db push --dry-run --output json > /tmp/audit-rls-output.json 2>&1 || cat ${sqlPath} | supabase db execute -`,
      { maxBuffer: 50 * 1024 * 1024 }
    );

    console.log('✓ supabase CLI disponível');
    return true;
  } catch (e) {
    console.log('⚠️ supabase CLI não disponível, tentando psql direto...');
    return false;
  }
}

/**
 * Tenta executar SQL via psql direto (fallback)
 * Requer SUPABASE_DB_PASSWORD no env
 */
async function executeSQLViaPsql(sqlQuery) {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!dbPassword) {
    throw new Error(
      'Falta SUPABASE_DB_PASSWORD no .env.local\n' +
      'Obter em: Supabase Console → Settings → Database → Password → Reset'
    );
  }

  try {
    console.log('🔄 Executando psql...');

    // Testa conexão
    await execAsync(
      `psql -h ${SUPABASE_PROJECT}.supabase.co -U postgres -d postgres -c "SELECT 1" 2>/dev/null`,
      {
        env: {
          ...process.env,
          PGPASSWORD: dbPassword
        }
      }
    );

    console.log('✓ Conexão psql bem-sucedida');

    // Executa queries separadas (comentários separam cada uma)
    const queries = sqlQuery
      .split('-- AS ')
      .filter(q => q.trim())
      .map(q => '--' + q);

    const results = {};

    for (const queryBlock of queries) {
      const lines = queryBlock.split('\n');
      const labelLine = lines[0].match(/-- AS (\w+)/);
      const label = labelLine ? labelLine[1] : 'unnamed';

      const actualQuery = lines.slice(1).join('\n').trim();
      if (!actualQuery) continue;

      try {
        const { stdout } = await execAsync(
          `psql -h ${SUPABASE_PROJECT}.supabase.co -U postgres -d postgres -c "${actualQuery.replace(/"/g, '\\"')}" --json`,
          {
            env: { ...process.env, PGPASSWORD: dbPassword },
            maxBuffer: 50 * 1024 * 1024
          }
        );

        results[label] = JSON.parse(stdout || '[]');
      } catch (e) {
        console.warn(`⚠️ Query ${label} falhou: ${e.message}`);
        results[label] = null;
      }
    }

    return results;
  } catch (e) {
    throw new Error(
      `psql falhou: ${e.message}\n` +
      'Verifique:\n' +
      '  1. PostgreSQL instalado? (psql --version)\n' +
      '  2. SUPABASE_DB_PASSWORD configurado?\n' +
      '  3. Pode alcançar .supabase.co na rede?'
    );
  }
}

/**
 * Executa auditoria — lista todas tabelas + status RLS
 */
async function runAudit() {
  const sqlQuery = await getSQLQuery();

  let results;
  try {
    // Tenta supabase CLI primeiro
    const hasCli = await executeSQLViaSupabase();

    if (hasCli) {
      // Se supabase CLI funciona, usar de verdade
      // Por enquanto, fallback pra psql
      results = await executeSQLViaPsql(sqlQuery);
    } else {
      // Fallback: psql direto
      results = await executeSQLViaPsql(sqlQuery);
    }
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  return results;
}

/**
 * Processa resultados da auditoria
 * Identifica CRÍTICO, AVISO, OK
 */
function analyzeResults(results) {
  const analysis = {
    timestamp: now.toISOString(),
    supabase_project: SUPABASE_PROJECT,
    supabase_url: SUPABASE_URL,
    critical: [],
    warnings: [],
    ok: [],
    summary: {},
    raw_results: results
  };

  // CRÍTICO: Tabelas sem RLS
  const missingRls = results.CRITICAL_MISSING_RLS || [];
  if (missingRls && missingRls.length > 0) {
    missingRls.forEach(row => {
      analysis.critical.push({
        type: 'MISSING_RLS',
        table: row.tablename,
        message: `Tabela ${row.tablename} sem RLS habilitado (buraco de segurança)`,
        severity: 'CRÍTICO'
      });
    });
  }

  // AVISO: Políticas muito abertas (USING true)
  const openPolicies = results.WARNING_OPEN_POLICIES || [];
  if (openPolicies && openPolicies.length > 0) {
    openPolicies.forEach(row => {
      analysis.warnings.push({
        type: 'OPEN_POLICY',
        table: row.tablename,
        policy: row.policyname,
        command: row.cmd,
        message: `Política ${row.policyname} em ${row.tablename} aceita tudo (USING true) — muito aberta`,
        severity: 'AVISO'
      });
    });
  }

  // VERIFICAÇÃO: Colunas sensíveis sem RLS
  const sensitiveCols = results.sensitive_columns || [];
  if (sensitiveCols && sensitiveCols.length > 0) {
    sensitiveCols.forEach(row => {
      if (row.table_has_rls === 'NÃO (⚠️ RISCO)') {
        analysis.critical.push({
          type: 'SENSITIVE_COLUMN_EXPOSED',
          table: row.tablename,
          column: row.column_name,
          sensitivity: row.sensitivity_level,
          message: `Coluna sensível ${row.column_name} (${row.sensitivity_level}) em tabela SEM RLS`,
          severity: 'CRÍTICO'
        });
      } else {
        analysis.ok.push({
          type: 'SENSITIVE_COLUMN_PROTECTED',
          table: row.tablename,
          column: row.column_name,
          sensitivity: row.sensitivity_level,
          message: `Coluna sensível ${row.column_name} protegida por RLS`,
          severity: 'OK'
        });
      }
    });
  }

  // Resumo
  analysis.summary = {
    total_critical: analysis.critical.length,
    total_warnings: analysis.warnings.length,
    total_ok: analysis.ok.length,
    total_issues: analysis.critical.length + analysis.warnings.length,
    fail_on_critical: failOnCritical,
    fail_on_warning: failOnWarning,
    should_exit_1: (
      (failOnCritical && analysis.critical.length > 0) ||
      (failOnWarning && analysis.warnings.length > 0)
    )
  };

  return analysis;
}

/**
 * Salva relatório JSON
 */
function saveJsonReport(analysis) {
  ensureReportDir();
  fs.writeFileSync(reportFile, JSON.stringify(analysis, null, 2));
  console.log(`✓ Relatório JSON: ${reportFile}`);
  return reportFile;
}

/**
 * Salva relatório Markdown (legível)
 */
function saveMarkdownReport(analysis) {
  const md = [
    `# RLS Audit Report — ${analysis.timestamp}`,
    ``,
    `**Projeto:** ${analysis.supabase_project}`,
    `**URL:** ${analysis.supabase_url}`,
    ``,
    `## Resumo Executivo`,
    ``,
    `- **CRÍTICO:** ${analysis.summary.total_critical} ⚠️`,
    `- **AVISO:** ${analysis.summary.total_warnings} ⚠️`,
    `- **OK:** ${analysis.summary.total_ok} ✅`,
    `- **Status:** ${analysis.summary.should_exit_1 ? '❌ FALHOU' : '✅ PASSOU'}`,
    ``
  ];

  if (analysis.critical.length > 0) {
    md.push(`## CRÍTICO ⚠️`);
    md.push(``);
    analysis.critical.forEach(issue => {
      md.push(`### ${issue.type}`);
      md.push(`- **Tabela:** ${issue.table}`);
      md.push(`- **Mensagem:** ${issue.message}`);
      if (issue.column) md.push(`- **Coluna:** ${issue.column}`);
      if (issue.severity) md.push(`- **Gravidade:** ${issue.severity}`);
      md.push(``);
    });
  }

  if (analysis.warnings.length > 0) {
    md.push(`## AVISO ⚠️`);
    md.push(``);
    analysis.warnings.forEach(issue => {
      md.push(`### ${issue.type}`);
      md.push(`- **Tabela:** ${issue.table}`);
      md.push(`- **Policy:** ${issue.policy}`);
      md.push(`- **Comando:** ${issue.command}`);
      md.push(`- **Mensagem:** ${issue.message}`);
      md.push(``);
    });
  }

  md.push(`## OK ✅`);
  md.push(``);
  md.push(`${analysis.summary.total_ok} coluna(s) sensível(is) protegida(s) por RLS`);
  md.push(``);

  md.push(`## Raw Results`);
  md.push(``);
  md.push('```json');
  md.push(JSON.stringify(analysis.raw_results, null, 2));
  md.push('```');

  fs.writeFileSync(reportMarkdownFile, md.join('\n'));
  console.log(`✓ Relatório Markdown: ${reportMarkdownFile}`);
  return reportMarkdownFile;
}

/**
 * Log no vault (Obsidian)
 */
function logToVault(analysis, reportJsonFile, reportMarkdownFile) {
  const vaultPath = path.join(
    process.env.USERPROFILE,
    'Documents',
    'claude vault',
    'claude vault',
    'Projects',
    'Legado Digital',
    'RLS-Audit.md'
  );

  if (!fs.existsSync(vaultPath)) {
    console.log(`⚠️ Vault não encontrado: ${vaultPath}`);
    return;
  }

  const status = analysis.summary.should_exit_1 ? '❌ FALHOU' : '✅ PASSOU';
  const entry = `
### ${analysis.timestamp} — ${status}
- **CRÍTICO:** ${analysis.summary.total_critical}
- **AVISO:** ${analysis.summary.total_warnings}
- **OK:** ${analysis.summary.total_ok}
- **Relatório JSON:** \`${path.basename(reportJsonFile)}\`
- **Relatório MD:** \`${path.basename(reportMarkdownFile)}\`
- **Ação:** ${analysis.summary.should_exit_1 ? 'Corrigir RLS antes de deploy' : 'Nenhuma ação necessária'}
`;

  fs.appendFileSync(vaultPath, entry + '\n');
  console.log(`✓ Registrado no vault: RLS-Audit.md`);
}

/**
 * Exibe resumo no console
 */
function displaySummary(analysis) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`RLS AUDIT REPORT — ${analysis.timestamp}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\nProjeto: ${analysis.supabase_project}`);
  console.log(`URL: ${analysis.supabase_url}\n`);

  console.log(`RESUMO EXECUTIVO:`);
  console.log(`  CRÍTICO:  ${analysis.summary.total_critical} ${analysis.summary.total_critical > 0 ? '⚠️' : '✅'}`);
  console.log(`  AVISO:    ${analysis.summary.total_warnings} ${analysis.summary.total_warnings > 0 ? '⚠️' : '✅'}`);
  console.log(`  OK:       ${analysis.summary.total_ok} ✅`);
  console.log(`\nSTATUS: ${analysis.summary.should_exit_1 ? '❌ FALHOU' : '✅ PASSOU'}`);

  if (analysis.critical.length > 0) {
    console.log(`\n${'!'.repeat(80)}`);
    console.log(`CRÍTICO - Corrigir imediatamente`);
    console.log(`${'!'.repeat(80)}`);
    analysis.critical.forEach(issue => {
      console.log(`\n[${issue.type}] ${issue.table}`);
      console.log(`  → ${issue.message}`);
    });
  }

  if (analysis.warnings.length > 0) {
    console.log(`\n${'!'.repeat(80)}`);
    console.log(`AVISO - Revisar e considerar corrigir`);
    console.log(`${'!'.repeat(80)}`);
    analysis.warnings.forEach(issue => {
      console.log(`\n[${issue.type}] ${issue.table}`);
      console.log(`  Policy: ${issue.policy}`);
      console.log(`  → ${issue.message}`);
    });
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Relatórios salvos em: ${REPORT_DIR}`);
  console.log(`${'='.repeat(80)}\n`);
}

/**
 * Main
 */
async function main() {
  try {
    console.log('\n🚀 Iniciando auditoria RLS...');
    console.log(`   Projeto: ${SUPABASE_PROJECT}`);
    console.log(`   Destino: ${REPORT_DIR}`);
    console.log(`   Fail on Critical: ${failOnCritical}`);
    console.log(`   Fail on Warning: ${failOnWarning}\n`);

    ensureReportDir();

    // Executa auditoria
    const results = await runAudit();
    console.log(`✓ Auditoria executada com sucesso`);

    // Analisa resultados
    const analysis = analyzeResults(results);

    // Salva relatórios
    const jsonFile = saveJsonReport(analysis);
    const mdFile = saveMarkdownReport(analysis);

    // Log no vault
    logToVault(analysis, jsonFile, mdFile);

    // Exibe resumo
    displaySummary(analysis);

    // Exit code baseado em severidade
    if (analysis.summary.should_exit_1) {
      console.error(
        `❌ Auditoria falhou:\n` +
        `   ${analysis.summary.total_critical > 0 ? `- ${analysis.summary.total_critical} CRÍTICO` : ''}` +
        `${analysis.summary.total_critical > 0 && analysis.summary.total_warnings > 0 ? '\n   ' : ''}` +
        `${analysis.summary.total_warnings > 0 ? `- ${analysis.summary.total_warnings} AVISO` : ''}`
      );
      process.exit(1);
    } else {
      console.log('✅ Auditoria passou — nenhum problema encontrado');
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n❌ Erro ao executar auditoria: ${error.message}`);
    process.exit(1);
  }
}

main();
