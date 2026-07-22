#!/usr/bin/env node
/**
 * Backup automático Supabase — Legado Digital
 * Executa export SQL completo antes de qualquer ação destrutiva
 * Plano free = sem PITR, backup manual é segurança obrigatória
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');

const execAsync = promisify(exec);

const SUPABASE_PROJECT = 'yegvazxycfrbhblyzvhg';
const SUPABASE_URL = 'https://yegvazxycfrbhblyzvhg.supabase.co';
const BACKUP_DIR = path.join(
  process.env.USERPROFILE,
  'Desktop',
  'Cerebro Claude - Legado Digital',
  'backups'
);

// Timestamp pra arquivo
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupFile = path.join(BACKUP_DIR, `legado-digital-${timestamp}.sql`);
const backupMetaFile = path.join(BACKUP_DIR, `legado-digital-${timestamp}.meta.json`);

async function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✓ Pasta de backup criada: ${BACKUP_DIR}`);
  }
}

/**
 * Calcula SHA-256 hash do arquivo para detectar corrupção
 */
function calculateFileSHA256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function backupViaPgDump() {
  try {
    // Tenta usar pg_dump se PostgreSQL tiver instalado
    const connStr = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || '[PASSWORD]'}@${SUPABASE_PROJECT}.supabase.co:5432/postgres`;

    console.log('🔄 Tentando pg_dump...');
    const { stdout, stderr } = await execAsync(
      `pg_dump "${connStr}" --no-password --verbose > "${backupFile}"`,
      { maxBuffer: 100 * 1024 * 1024 } // 100MB buffer
    );

    if (fs.existsSync(backupFile)) {
      const fileSize = fs.statSync(backupFile).size;
      const MIN_BACKUP_SIZE = 1000000; // 1 MB mínimo

      if (fileSize > MIN_BACKUP_SIZE) {
        console.log(`✓ pg_dump sucesso: ${backupFile} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
        return true;
      } else {
        console.error(`❌ pg_dump gerou arquivo muito pequeno: ${fileSize} bytes (esperado > 1MB)`);
        fs.unlinkSync(backupFile); // Remove arquivo inválido
        return false;
      }
    }
  } catch (e) {
    console.log('⚠️ pg_dump falhou ou PostgreSQL não instalado. Tentando método alternativo...');
  }
  return false;
}

async function backupViaApi() {
  // Fallback: exportar via Supabase REST API com validação real
  console.log('🔄 Exportando via Supabase REST API (fallback)...');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ Faltam env vars: SUPABASE_URL ou SUPABASE_ANON_KEY');
    return false;
  }

  const tables = [
    'usuarios', 'perfis', 'permissoes', 'usuarios_perfis', 'parceiros_b2b',
    'parceiros_usuarios', 'cemiterios', 'lapides', 'gavetas', 'homenagens',
    'homenagens_seguranca', 'condolencias', 'emails_enviados',
    'configuracoes_sistema', 'mapa_sugestoes', 'parceiros_contatos'
  ];

  let totalSize = 0;
  const backupContent = [];
  backupContent.push(`-- Backup Supabase via REST API (fallback)\n-- ${now.toISOString()}\n-- Método: partial export\n\n`);

  for (const table of tables) {
    try {
      const response = await execAsync(
        `curl -s -H "apikey: ${process.env.SUPABASE_ANON_KEY}" \
        "${process.env.SUPABASE_URL}/rest/v1/${table}?select=*" | jq -r 'to_entries | map(.value) | @json' 2>/dev/null || echo "{}"`
      );

      if (response.stdout && response.stdout.trim() !== '{}') {
        backupContent.push(`-- Table: ${table}\n${response.stdout}\n`);
        totalSize += response.stdout.length;
      }
    } catch (e) {
      console.warn(`⚠️ Falha ao exportar ${table}: ${e.message}`);
    }
  }

  const backupText = backupContent.join('');
  fs.writeFileSync(backupFile, backupText);

  const fileSize = fs.statSync(backupFile).size;
  const MIN_BACKUP_SIZE = 1000000; // 1 MB mínimo

  if (fileSize > MIN_BACKUP_SIZE) {
    console.log(`✓ Backup via API concluído: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
    return true;
  } else {
    console.error(`❌ Backup via API gerou arquivo muito pequeno: ${fileSize} bytes (esperado > 1MB)`);
    fs.unlinkSync(backupFile);
    return false;
  }
}

async function saveMetadata() {
  const fileSize = fs.statSync(backupFile).size;
  const sha256Hash = calculateFileSHA256(backupFile);

  const metadata = {
    timestamp: now.toISOString(),
    supabase_project: SUPABASE_PROJECT,
    supabase_url: SUPABASE_URL,
    backup_file: backupFile,
    backup_size_bytes: fileSize,
    backup_size_mb: (fileSize / 1024 / 1024).toFixed(2),
    sha256_hash: sha256Hash,
    plan: 'free',
    warning: 'Free plan sem PITR — este backup é crítico',
    integrity_check: 'Use `sha256sum <arquivo>` para verificar integridade (comparar com sha256_hash)',
    restore_command: `# Restaurar (requer psql): psql -h ${SUPABASE_PROJECT}.supabase.co -U postgres -d postgres < ${backupFile}`,
    reason: process.argv[2] || 'pre-deployment',
    vault_log: 'Projects/Legado Digital/Backups.md',
    // 2ª cópia em Drive (preenchida após upload bem-sucedido)
    drive_sql_url: null,
    drive_sql_file_id: null,
    drive_meta_url: null,
    drive_meta_file_id: null
  };

  fs.writeFileSync(backupMetaFile, JSON.stringify(metadata, null, 2));
  console.log(`✓ Metadados salvos com hash SHA-256: ${backupMetaFile}`);

  return metadata;
}

/**
 * Faz upload do .sql e .meta.json pra Google Drive
 * Pasta "Legado Digital Backups" — cria se não existir
 * Não bloqueia se falhar — apenas aviso
 */
async function uploadToDrive(metadata) {
  try {
    // Verifica se temos credenciais de Drive
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credentials) {
      console.log('\n⚠️ GOOGLE_SERVICE_ACCOUNT_JSON não configurado — pulando upload Drive');
      console.log('   (1ª cópia local criada com sucesso)');
      return metadata;
    }

    console.log('\n🔄 Preparando upload para Google Drive (2ª cópia)...');

    // Tenta usar googleapis (instalado?)
    let google;
    try {
      google = require('googleapis').google;
    } catch {
      console.log('⚠️ googleapis não instalado — pulando upload Drive');
      console.log('   Instale: npm install googleapis');
      return metadata;
    }

    const credentialsObj = JSON.parse(credentials);
    const auth = new google.auth.GoogleAuth({
      credentials: credentialsObj,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Procura pasta "Legado Digital Backups" — cria se não existir
    let folderId;
    try {
      const folderQuery = await drive.files.list({
        q: "name='Legado Digital Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        spaces: 'drive',
        pageSize: 1,
        fields: 'files(id, name)',
      });

      if (folderQuery.data.files && folderQuery.data.files.length > 0) {
        folderId = folderQuery.data.files[0].id;
        console.log(`✓ Pasta encontrada: Legado Digital Backups`);
      } else {
        // Cria pasta
        const folderRes = await drive.files.create({
          requestBody: {
            name: 'Legado Digital Backups',
            mimeType: 'application/vnd.google-apps.folder',
          },
          fields: 'id',
        });
        folderId = folderRes.data.id;
        console.log(`✓ Pasta criada: Legado Digital Backups`);
      }
    } catch (folderError) {
      console.warn(`⚠️ Erro ao procurar/criar pasta Drive: ${folderError.message}`);
      console.warn('   Backup local foi criado com sucesso');
      return metadata;
    }

    // Upload do .sql
    console.log(`   Uploading ${path.basename(backupFile)}...`);
    const sqlRes = await drive.files.create({
      requestBody: {
        name: path.basename(backupFile),
        parents: [folderId],
      },
      media: {
        mimeType: 'application/sql',
        body: fs.createReadStream(backupFile),
      },
      fields: 'id, webViewLink',
    });

    const sqlFileId = sqlRes.data.id;
    const sqlWebViewLink = sqlRes.data.webViewLink;
    console.log(`✓ SQL uploaded: ${path.basename(backupFile)}`);

    // Upload do .meta.json
    console.log(`   Uploading ${path.basename(backupMetaFile)}...`);
    const metaRes = await drive.files.create({
      requestBody: {
        name: path.basename(backupMetaFile),
        parents: [folderId],
      },
      media: {
        mimeType: 'application/json',
        body: fs.createReadStream(backupMetaFile),
      },
      fields: 'id, webViewLink',
    });

    const metaFileId = metaRes.data.id;
    const metaWebViewLink = metaRes.data.webViewLink;
    console.log(`✓ Metadata uploaded: ${path.basename(backupMetaFile)}`);

    // Atualiza .meta.json local com URLs do Drive
    metadata.drive_sql_url = sqlWebViewLink;
    metadata.drive_sql_file_id = sqlFileId;
    metadata.drive_meta_url = metaWebViewLink;
    metadata.drive_meta_file_id = metaFileId;

    fs.writeFileSync(backupMetaFile, JSON.stringify(metadata, null, 2));
    console.log(`✓ Metadados atualizados com URLs do Drive`);
    console.log(`  SQL: ${sqlWebViewLink}`);
    console.log(`  Meta: ${metaWebViewLink}`);

    return metadata;
  } catch (error) {
    // Não bloqueia — só aviso
    console.warn(`\n⚠️ Upload para Drive falhou: ${error.message}`);
    console.warn('   Backup local foi criado com sucesso — Drive é a 2ª cópia');
    return metadata;
  }
}

async function logToVault(metadata) {
  // Log no vault via append (simples)
  const vaultPath = path.join(
    process.env.USERPROFILE,
    'Documents',
    'claude vault',
    'claude vault',
    'Projects',
    'Legado Digital',
    'Backups.md'
  );

  if (fs.existsSync(vaultPath)) {
    const entry = `
### ${metadata.timestamp}
- **Arquivo:** ${path.basename(backupFile)}
- **Tamanho:** ${metadata.backup_size_mb}MB
- **SHA-256:** \`${metadata.sha256_hash}\`
- **Motivo:** ${metadata.reason}
- **Plano:** ${metadata.plan} (⚠️ sem PITR)
- **Integridade:** Verificar com \`sha256sum ${path.basename(backupFile)}\`
`;

    fs.appendFileSync(vaultPath, entry + '\n');
    console.log(`✓ Registrado no vault: Backups.md (com SHA-256)`);
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando backup Legado Digital...');
    console.log(`   Projeto: ${SUPABASE_PROJECT}`);
    console.log(`   Destino: ${BACKUP_DIR}`);
    console.log(`   Motivo: ${process.argv[2] || 'pre-deployment'}\n`);

    await ensureBackupDir();

    // Tenta pg_dump primeiro, fallback pra API
    const success = await backupViaPgDump() || await backupViaApi();

    if (success) {
      let metadata = await saveMetadata();
      await logToVault(metadata);

      // Tenta fazer upload para Google Drive (2ª cópia, não bloqueia se falhar)
      metadata = await uploadToDrive(metadata);

      console.log(`\n✅ Backup concluído com sucesso!`);
      console.log(`   1ª cópia (Local): ${path.basename(backupFile)}`);
      if (metadata.drive_sql_url) {
        console.log(`   2ª cópia (Drive): ${path.basename(backupFile)}`);
      }
      console.log(`   Tamanho: ${metadata.backup_size_mb}MB`);
      console.log(`   SHA-256: ${metadata.sha256_hash}`);
      console.log(`   Registrado no vault: Projects/Legado Digital/Backups.md`);

      console.log(`\n📋 VALIDAÇÃO DE INTEGRIDADE (detectar corrupção):`);
      console.log(`   Hash salvo em: ${path.basename(backupMetaFile)}`);
      console.log(`   Verifique após restaurar (Linux/Mac):`);
      console.log(`   sha256sum -c "${path.basename(backupMetaFile)}"`);
      console.log(`   Ou (Windows cmd):`);
      console.log(`   certUtil -hashfile "${path.basename(backupFile)}" SHA256`);
      console.log(`   Comparar com o hash acima.`);

      console.log(`\n🔒 BACKUP REDUNDANTE (regra 3-2-1):`);
      console.log(`   ✓ 1ª cópia: Desktop/Cerebro Claude - Legado Digital/backups/`);
      if (metadata.drive_sql_url) {
        console.log(`   ✓ 2ª cópia: Google Drive/Legado Digital Backups/`);
      } else {
        console.log(`   ⚠️ 2ª cópia: Configure GOOGLE_SERVICE_ACCOUNT_JSON pra ativar Drive`);
      }
      console.log(`   → Você pode adicionar uma 3ª cópia manualmente (USB, NAS, etc.)`);

      console.log(`\n⚠️ NUNCA APAGUE este arquivo. É sua segurança contra perda de dados.`);

      process.exit(0);
    } else {
      console.error('❌ Backup falhou');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error.message);
    process.exit(1);
  }
}

main();
