# Uso de Skills e MCPs — Log

Registro de toda vez que uma skill ou MCP é usada no projeto, motivo e resultado. Ver regra em `CLAUDE.md`.

## 2026-07-13

- **Supabase MCP** (`execute_sql`) — diagnosticar bug "busca não acha nomes". Rodei `select * from buscar_homenagens_publicas('maria', null)` e checagem de `has_function_privilege`/`has_table_privilege` pro `anon` direto no banco de produção. Resultado: função e permissões corretas — confirmou que o bug estava no client (`BuscaMemorial.tsx` ignorava o `error` do `.rpc()`), não no Postgres.
- **redesign-skill** — redesenhar `/parceiros/[slug]` (estava "fraca, faltando elementos"). Auditoria de padrões genéricos (evitar 3 cards iguais, símbolos clichê, fontes/hierarquia fraca) aplicada na reestruturação da página: busca subiu pro hero, seção de conceito virou bloco assimétrico texto+lista de recursos, "Como funciona" virou numeração serif em vez de ícones em círculo.
