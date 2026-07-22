# RLS Audit — Auditoria de Segurança Row Level Security

**Objetivo:** Detectar buracos de segurança no RLS do Supabase antes de deploy em produção.

## O que é RLS?

**Row Level Security (RLS)** é o mecanismo de segurança do PostgreSQL que impede leitura/escrita não autorizada de dados. Sem RLS:
- Usuário pode ler qualquer linha da tabela
- Usuário pode editar/deletar qualquer dado
- Dados sensíveis (email, CPF, senha) ficam expostos

## O que esta auditoria detecta?

### 🔴 CRÍTICO — Bloqueia deploy
- **Tabelas sem RLS:** Tabelas que deveriam ter RLS mas não têm
- **Colunas sensíveis expostas:** Email/CPF/senha em tabela sem RLS
- **Exemplo:** `usuarios` tabela sem nenhuma policy → qualquer pessoa acessa todos os e-mails

### 🟡 AVISO — Revisar antes de deploy
- **Políticas muito abertas:** Policy com `USING true` (aceita qualquer um)
- **Exemplo:** `SELECT policy_public USING true` → até anon consegue ler tudo

### 🟢 OK — Tudo certo
- Tabelas críticas têm RLS habilitado
- Colunas sensíveis protegidas por policies
- Nenhuma política aberta sem motivo

## Como rodar

### Pré-requisitos

1. **PostgreSQL/psql instalado** (ferramentas de linha de comando):
   ```bash
   # Windows (via chocolatey):
   choco install postgresql

   # Ou download: https://www.postgresql.org/download/windows/
   ```

2. **SUPABASE_DB_PASSWORD no `.env.local`:**
   ```bash
   # Copie sua senha do Supabase:
   # 1. https://supabase.com/dashboard
   # 2. Seu projeto → Settings → Database → Connection String
   # 3. Procure `password=XXXXXX` na string
   SUPABASE_DB_PASSWORD=sua_senha_aqui
   ```

### Execução

```bash
# Rodar auditoria (fail se CRÍTICO — padrão)
node scripts/audit-rls.js

# Também fail se houver AVISO
node scripts/audit-rls.js --fail-on-warning

# Ou ignorar warnings e só fail se CRÍTICO (padrão)
node scripts/audit-rls.js --fail-on-critical
```

### Output

Dois relatórios são salvos em `Desktop\Cerebro Claude - Legado Digital\audits\`:

1. **`rls-audit-TIMESTAMP.json`** — Machine-readable, estruturado
2. **`rls-audit-TIMESTAMP.md`** — Legível, com descrição de cada problema

**Log no vault:** `Projects/Legado Digital/RLS-Audit.md` registra cada execução

## Checklist de RLS por tabela

Tabelas críticas que **devem** ter RLS habilitado:

| Tabela | Sensível | RLS Obrigatório |
|--------|----------|-----------------|
| `usuarios` | Email, senha_hash | ✅ SIM |
| `homenagens_seguranca` | senha_familia_hash, senha_acesso_hash | ✅ SIM |
| `configuracoes_sistema` | api_keys, tokens | ✅ SIM |
| `emails_enviados` | Log com tokens | ✅ SIM |
| `parceiros_b2b` | CNPJ, telefone (não público) | ✅ SIM |
| `usuarios_perfis` | Papel/permissão | ✅ SIM |
| `homenagens` | Alguns privados por modo | ✅ SIM |
| `parceiros_contatos` | E-mail, telefone | ✅ SIM |

Tabelas que NÃO precisam de RLS:
- `paises`, `estados`, `cidades` — Dados públicos de localização
- `cemiterios` — Público (logo, descrição)
- `homenagens_busca_publica` — View pública propositalmente

## Exemplos de policies corretas

### ✅ Correta: Apenas dono ve seus dados
```sql
CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT
  USING (auth.uid() = id);
```

### ✅ Correta: Staff ve tudo, outros veem só o público
```sql
CREATE POLICY "homenagens_public_search" ON homenagens
  FOR SELECT
  USING (
    is_legado_staff() OR  -- staff ve tudo
    (busca_habilitada AND categoria = 'public')  -- público ve só o marcado
  );
```

### ❌ Errada: Aceita qualquer um
```sql
CREATE POLICY "open_policy_bad" ON homenagens
  FOR SELECT
  USING (true);  -- ⚠️ PIOR QUE NÃO TER RLS
```

### ❌ Errada: Sem nenhuma política
```sql
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- Sem nenhuma CREATE POLICY = ninguém consegue ler nada
-- (melhor que aberta, mas precisa de policies de verdade)
```

## Correção rápida

Se a auditoria falhar, siga a ordem:

1. **Identifique o problema** (CRÍTICO vs AVISO)
2. **Leia o relatório** em `Desktop\Cerebro Claude - Legado Digital\audits\`
3. **Consulte o Supabase MCP** ou SQL direto para adicionar a policy

### Exemplo: Habilitar RLS em tabela

```sql
-- 1. Habilita RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 2. Cria policy pra cada role
CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "usuarios_staff_all" ON usuarios
  FOR ALL
  USING (is_legado_staff());
```

### Exemplo: Corrigir política aberta

```sql
-- Antes: ❌ Muito aberta
CREATE POLICY "bad_policy" ON homenagens
  FOR SELECT
  USING (true);

-- Depois: ✅ Restrita
CREATE POLICY "good_policy" ON homenagens
  FOR SELECT
  USING (
    is_legado_staff() OR
    (modo_privacidade = 'publico')
  );

-- Deletar a antiga
DROP POLICY "bad_policy" ON homenagens;
```

## Integração no CI

Para bloquear deploy se RLS falhar:

```yaml
# .github/workflows/deploy.yml
- name: Audit RLS
  run: node scripts/audit-rls.js --fail-on-critical
```

Deploy **não vai** pro ar se a auditoria falhar.

## Troubleshooting

### ❌ "SUPABASE_DB_PASSWORD não configurado"
```bash
# Adicionar ao .env.local
SUPABASE_DB_PASSWORD=sua_senha_postgres
```

### ❌ "psql não encontrado"
```bash
# Windows: instalar PostgreSQL
choco install postgresql

# Ou fazer download: https://www.postgresql.org/download/windows/
# Marcar "Command Line Tools" na instalação
```

### ❌ "Conexão recusada"
- Verificar firewall/proxy bloqueando `.supabase.co`
- Testar em outro Wi-Fi (se possível)
- Pingar host: `ping yegvazxycfrbhblyzvhg.supabase.co`

### ❌ "Timeout na query"
- Tabelas muito grandes podem levar tempo
- Aumentar timeout no script (default: 120s via execAsync)

## FAQ

**P: RLS vai deixar mais lento?**
R: Imperceptível — 1-5% overhead, vale muito mais a segurança.

**P: Posso desabilitar RLS?**
R: Não. É obrigatório em produção (Supabase free/pro força RLS).

**P: E se eu quiser uma tabela totalmente pública?**
R: Crie policy `FOR SELECT USING (true)` explicitamente — a auditoria vai avisar (AVISO) pra revisar de propósito.

**P: Quem pode editar policies?**
R: Só admin/staff (via Supabase Console ou `SUPABASE_SERVICE_ROLE_KEY`).

---

**Última atualização:** 2026-07-22  
**Status:** Implementação inicial — testado com psql local
