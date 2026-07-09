# Log de uso de Skills e MCPs

> Registro paralelo, atualizado toda vez que uma skill ou MCP é usada nesse projeto. Objetivo: aprendizado e rastreabilidade — não é memória de IA, é histórico do projeto.

Formato por entrada: data, o que foi usado, motivo, o que foi produzido.

---

### 2026-07-09 — Skill `frontend-design`
**Motivo:** direção de design pras páginas públicas novas (`/busca`, `/parceiros/[slug]`).
**Produziu:** paleta/tipografia reaproveitadas da página do memorial (navy `#0B1D2A`, dourado `#C9A46A`, Georgia), elemento assinatura "placa" (foto em anel + nome + linha fina + metadado), evitando defaults genéricos de IA.

### 2026-07-09 — MCP `Supabase` (mcp__claude_ai_Supabase)
**Motivo:** aplicar migração de banco (colunas `slug`/`logo_url`/`descricao_publica` em `parceiros_b2b`, view pública `parceiros_publicos`, tabela `mapa_sugestoes`).
**Produziu:** schema atualizado direto no projeto Supabase (`yegvazxycfrbhblyzvhg`), sem passar por arquivo `.sql` manual.

### 2026-07-09 — Skill `ui-ux-pro-max`
**Motivo:** reorganizar campo de timeline (hoje um textarea confuso `ano | título | descrição`) em blocos de evento de verdade, nos formulários internos (`/admin/memoriais/[id]`, `/parceiro/memoriais`).
**Produziu:** checklist de UX aplicado (labels acessíveis com `htmlFor`, sem drag-and-drop desnecessário — botões mover ↑/↓ mais simples, limite de eventos visível igual ao padrão de limite de fotos já usado no projeto).

---

## Skills instaladas (disponíveis, nem toda tarefa usa)
- `frontend-design` (Anthropic) — direção de design pra UI nova/distintiva
- `ui-ux-pro-max`, `ui-styling`, `design-system`, `design`, `brand`, `banner-design`, `slides` (nextlevelbuilder) — banco de padrões de UI/UX, paletas, tipografia, componentes
- `gstack` (Garry Tan) — suite de 23 skills pra estruturar fluxo de trabalho (CEO review, eng review, QA, ship) — avaliado no início da sessão e descartado pra tarefas pequenas/internas (overhead desproporcional)

## MCPs usadas nesse projeto
- **Supabase** — todas as operações de banco (migração, schema, RLS, dados)
- **Vercel** — deploy (ainda não usado nessa sessão — deploy pendente de confirmação do usuário)
