# Setup — RLS Audit Script

## Primeira Execução

### 1. Obtenha a senha do Supabase

A senha do banco de dados está em:

1. https://supabase.com/dashboard
2. Selecione o projeto `legado-digital-`
3. **Settings** → **Database**
4. Copie a string de conexão, procure por `password=XXXXX`
   - Ou clique no ícone de "eye" em "Database password" para revelar
   - Se já foi resetada: clique **Reset password**

### 2. Adicione ao `.env.local`

```bash
# .env.local (adicione essa linha)
SUPABASE_DB_PASSWORD=sua_senha_postgres_aqui
```

### 3. Teste psql (opcional)

```bash
# Windows PowerShell
psql -h yegvazxycfrbhblyzvhg.supabase.co -U postgres -d postgres -c "SELECT 1"
```

Se pedir senha, paste a mesma do `.env.local`.

### 4. Rode a auditoria

```bash
cd c:\Users\rafa\legado-digital-
node scripts/audit-rls.js
```

## Output Esperado

```
🚀 Iniciando auditoria RLS...
   Projeto: yegvazxycfrbhblyzvhg
   Destino: C:\Users\rafa\Desktop\Cerebro Claude - Legado Digital\audits
   Fail on Critical: true
   Fail on Warning: false

✓ Pasta de relatórios criada: ...
✓ Conexão psql bem-sucedida
✓ Auditoria executada com sucesso
✓ Relatório JSON: ...
✓ Relatório Markdown: ...
✓ Registrado no vault: RLS-Audit.md

RLS AUDIT REPORT — ...
================================================================================

Projeto: yegvazxycfrbhblyzvhg
URL: https://yegvazxycfrbhblyzvhg.supabase.co

RESUMO EXECUTIVO:
  CRÍTICO:  0 ✅
  AVISO:    0 ✅
  OK:       8 ✅

STATUS: ✅ PASSOU
```

## Integração em CI (GitHub Actions)

Adicione ao `.github/workflows/deploy.yml` (próximo passo):

```yaml
- name: Audit RLS Security
  run: |
    node scripts/audit-rls.js --fail-on-critical
```

Deploy não sai se RLS falhar.

## Troubleshooting

### `psql command not found`

```bash
# Instalar PostgreSQL (Windows):
choco install postgresql

# Ou download: https://www.postgresql.org/download/windows/
# Marcar "Command Line Tools" durante instalação
```

### `ENOENT: no such file or directory, scandir 'C:\...\audits'`

Pasta de audits foi criada automaticamente pelo script.

### Timeout na conexão

- Verificar firewall/proxy bloqueando `yegvazxycfrbhblyzvhg.supabase.co`
- Testar Wi-Fi diferente
- Pode ser que a senha está expirada (resetar no console Supabase)

---

**Próximos passos:**
- [ ] Adicionar `SUPABASE_DB_PASSWORD` ao `.env.local`
- [ ] Rodar `node scripts/audit-rls.js` localmente
- [ ] Revisar relatório em `Desktop/Cerebro Claude - Legado Digital/audits/`
- [ ] Integrar no CI quando pronto
