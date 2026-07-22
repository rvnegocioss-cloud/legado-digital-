# Estratégia de Backup — Legado Digital

**Criado:** 2026-07-22
**Status:** Regra obrigatória
**Motivo:** Supabase free = sem PITR (sem recuperação por ponto no tempo)

---

## Por que Backup Automático?

Supabase plano **free:**
- ✅ Dados são seguros (não desaparecem sozinhos)
- ❌ **Sem PITR** — sem backup automático point-in-time
- ❌ **Sem SLA** — sem garantia de uptime

**Risco real:** Se eu executar `DELETE FROM homenagens` sem querer, desaparece pra sempre. Sem backup manual, perda total.

**Solução:** Backup automático antes de qualquer ação destrutiva (DELETE, ALTER, DROP, migração).

---

## Regra Obrigatória

**NUNCA rodar uma migração, DELETE, ALTER ou DROP sem ter feito backup primeiro.**

Sequência correta:
```
1. Executar: node scripts/backup-supabase.js "motivo-da-acao"
2. Confirmar: arquivo criado em Desktop\Cerebro Claude - Legado Digital\backups\
3. Registrar: vault atualizado (Backups.md)
4. DEPOIS: rodar a migração/DELETE/ALTER
```

---

## Script de Backup

**Arquivo:** `scripts/backup-supabase.js`

**Como executar:**
```bash
# Backup antes de migração
node scripts/backup-supabase.js "pre-migration"

# Backup antes de deploy
node scripts/backup-supabase.js "pre-deploy"

# Backup antes de DELETE
node scripts/backup-supabase.js "pre-delete-operacao"
```

**O que faz:**
1. Tenta `pg_dump` (export SQL completo) se PostgreSQL estiver instalado
2. Fallback: export via Supabase API (estrutura + contagens)
3. Salva em: `Desktop\Cerebro Claude - Legado Digital\backups\legado-digital-{timestamp}.sql`
4. Metadados em: `.meta.json` (timestamp, projeto, motivo, tamanho)
5. Registra no vault: `Projects/Legado Digital/Backups.md`

**Saída esperada:**
```
✅ Backup concluído com sucesso!
   Arquivo: legado-digital-2026-07-22T08-05-30.sql
   Tamanho: 2.5MB
   Registrado no vault: Projects/Legado Digital/Backups.md

⚠️ NUNCA APAGUE este arquivo. É sua segurança contra perda de dados.
```

---

## Estrutura de Armazenamento

```
Desktop/
└── Cerebro Claude - Legado Digital/
    └── backups/
        ├── legado-digital-2026-07-22T08-05-30.sql
        ├── legado-digital-2026-07-22T08-05-30.meta.json
        ├── legado-digital-2026-07-22T10-45-15.sql
        ├── legado-digital-2026-07-22T10-45-15.meta.json
        └── ... (histórico completo com data/hora)
```

**Organização:**
- Naming: `legado-digital-{ISO8601-timestamp}.{sql|meta.json}`
- ISO8601 permite ordenar cronologicamente por filename
- Meta json contém: motivo, tamanho, plano, URL Supabase, command de restore

---

## Recuperação (Se Precisar)

Caso precise restaurar de um backup:

```bash
# 1. Identificar backup certo (by timestamp ou motivo em .meta.json)
ls Desktop/Cerebro\ Claude\ -\ Legado\ Digital/backups/ | grep 2026-07-22

# 2. Restaurar (precisa psql instalado)
psql -h yegvazxycfrbhblyzvhg.supabase.co \
  -U postgres \
  -d postgres \
  < Desktop/Cerebro\ Claude\ -\ Legado\ Digital/backups/legado-digital-{timestamp}.sql

# 3. Confirmar no vault: adicionar entrada "Restored from X"
```

**⚠️ CUIDADO:** Restore sobrescreve dados atuais. Faça backup do estado atual ANTES de restaurar um backup antigo.

---

## Ciclo de Vida de um Backup

| Fase | Ação | Responsável |
|------|------|-------------|
| 1. Pré-migração | Rodar script, confirmar arquivo criado | Claude (regra obrigatória) |
| 2. Logging | Registrar em vault (automático no script) | Script faz, Claude verifica |
| 3. Retenção | Manter em Desktop (pasta local, nunca apagar) | Rafael (proprietário) |
| 4. Recuperação (raro) | Se precisar, restore via psql + verificação | Rafael confirma, Claude executa |
| 5. Auditoria | Revisar timestamps/motivos no vault mensalmente | Claude (routine) |

---

## Checklist: Antes de Qualquer Migração/DELETE

- [ ] Rodar `node scripts/backup-supabase.js "motivo"`
- [ ] Esperar: "✅ Backup concluído"
- [ ] Verificar: arquivo existe em `Desktop/Cerebro Claude - Legado Digital/backups/`
- [ ] Verificar: vault foi atualizado (Backups.md registra entrada)
- [ ] **DEPOIS**: executar a migração/DELETE/ALTER
- [ ] Log no vault: "✅ Migração executada com sucesso" (mesmo commit)

---

## Upgrade Futuro (Opcional)

Se em algum ponto quiser PITR + SLA:
- **Plano Pro Supabase:** $25/mês, 7 dias de PITR, SLA 99.9%
- **Branch protection GitHub:** `main` requer PR, proíbe force-push/delete (trava adicional)
- **Backup automático em S3/Google Cloud:** política de retenção de 30 dias (terceira cópia)

Por enquanto (2026-07-22), backup manual (este script) é suficiente pra MVP em free plan.

---

## Referências

- [[Projects/Legado Digital/Backups.md]] — histórico de backups (vault)
- [[CLAUDE.md#Proteção-Destrutiva]] — regra de ações destrutivas
- `scripts/backup-supabase.js` — script executável
