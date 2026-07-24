# Página do Memorial — redesign visual pra bater com mockup do Claude Design

## Contexto
Rafael gerou um mockup no Claude Design (export "Bundled Page", protótipo `DCLogic`) da página `/homenagem/[slug]` e quer o visual real **idêntico** ao mockup — já tentou 2x antes e não ficou igual. Análise do mockup (decompactado e mapeado seção a seção) mostrou algo importante: **a maior parte da funcionalidade do mockup já existe em produção de verdade** (galeria mosaico A/B + lightbox, mural de memórias com reação de coração via RPC, timeline em espinha, faixa de presença viva, acender vela com parede de 45 velas votivas + chama voando — esse último é praticamente 1:1 idêntico ao mockup, foi construído em 2026-07-23 seguindo a mesma referência visual). Ou seja, isso não é "construir do zero" — é fechar o gap visual que sobrou, que é principalmente **tipografia e largura/layout do container**.

## O que NÃO muda
- Nenhuma query Supabase, RPC, RLS, rate limit.
- Nenhum contrato de props dos componentes client (`AcenderVela`, `GaleriaFotos`, `MuralMemorias`, `FormularioCondolencia`, `GateSenhaAcesso`, `SeletorTema`).
- `lib/publicTheme.ts` (`CORES`) e `lib/temasMemorial.ts` (variáveis CSS do seletor de tema) — paleta já é a mesma do mockup (`#0B1D2A`/`#C9A46A`).

## Gap real identificado (comparação página atual vs mockup)

| Aspecto | Hoje (`app/homenagem/[slug]/page.tsx`) | Mockup |
|---|---|---|
| Fonte títulos/nome | `"Georgia, serif"` hardcoded | Playfair Display |
| Fonte corpo | Herda o mesmo Georgia da página inteira | Source Sans 3 |
| Largura do conteúdo | Fixa em 720px sempre (mobile e desktop) | 520px mobile / 1100px desktop |
| Hero (foto+texto) | Sempre coluna centralizada | Linha lado a lado no desktop, coluna no mobile |
| Anel da foto | Fixo 188px | 160px mobile / 220px desktop |
| Breakpoint mobile | 640px (só na Galeria) | 768px (mockup inteiro) |

`Playfair Display` **já está carregado** em `app/layout.tsx` via `next/font/google` (`variable: "--font-serif"`) — só não é usado na página do memorial ainda. `Source Sans 3` **não está carregado**, precisa ser adicionado.

Componentes que **já batem** com o mockup (sem mudança funcional, só troca de fonte onde usam Georgia hardcoded): `FaixaPresencaViva`, `ResumoPoucasPalavras`, `GaleriaFotos`, `MuralMemorias`, `AcenderVela`.

## Mudanças por arquivo

1. **`app/layout.tsx`** — adicionar `Source_Sans_3` do `next/font/google` como variável `--font-body`, ao lado do `Playfair_Display` (`--font-serif`) já existente. Aplicado no `className` do `<html>`, disponível em toda a árvore sem prop-drilling.

2. **`app/homenagem/[slug]/page.tsx`** (maior mudança):
   - `estilos.page.fontFamily` → `var(--font-body)` (era Georgia hardcoded)
   - Todo lugar com `"Georgia, serif"` hardcoded (`monograma`, `nome`, `anos`, `frase`, `timelineAno`) → `var(--font-serif)`
   - `estilos.label` (título de seção, `SecaoTitulo`) → `var(--font-serif)`
   - Largura do hero/main: trocar `maxWidth: 720` fixo por classe CSS nova (`.mem-container`) com `max-width: 520px` mobile / `1100px` desktop via media query em `globals.css` (mesmo padrão já usado em `.mem-bio-grid`)
   - Hero: nova classe `.mem-hero` — `flex-direction: column` mobile, `row` desktop (≥768px) via media query, texto centralizado mobile / alinhado à esquerda desktop
   - Anel da foto: `.mem-hero-ring` com `width`/`height` via `clamp(160px, 20vw, 220px)` (sem JS, sem listener de resize novo)

3. **`components/public/FaixaPresencaViva.tsx`** — `fontFamily: 'Georgia, serif'` → `var(--font-serif)`; tamanho do número via `clamp(26px, 4vw, 34px)` (mockup: 26px mobile / 34px desktop)

4. **`components/public/ResumoPoucasPalavras.tsx`** — `fontFamily: 'Georgia, serif'` → `var(--font-serif)` no heading "Em poucas palavras"

5. **`components/public/GaleriaFotos.tsx`** — breakpoint mobile de 640px → 768px (consistência com o resto da página); `gridAutoRows` mobile 90→78, desktop 110→100 (valores exatos do mockup). Resto (mosaico A/B, lightbox) fica igual, já bate.

6. **`components/public/MuralMemorias.tsx`** e **`components/public/AcenderVela.tsx`** — sem mudança estrutural (já batem com o mockup); só aplicar `var(--font-body)` em texto de corpo onde hoje não define fonte explícita (herda do `<body>`, que passa a ser Source Sans 3 globalmente pela mudança no layout — pode não precisar de edição nenhuma nesses 2 arquivos).

7. **`app/globals.css`** — novas classes `.mem-container` (largura responsiva) e `.mem-hero` (row/column responsivo), seguindo o padrão que já existe pra `.mem-bio-grid`/`.mem-timeline-espinha`.

## Testing
- `npm run build` + `npm run lint` + `npm run typecheck` verdes antes de qualquer commit (regra permanente do projeto).
- **Verificação visual não será feita rodando `npm run dev`** — regra registrada: nunca subir servidor local sem pedir (travou a máquina do Rafael antes). Depois do push, Rafael confere no ambiente dele ou eu peço permissão explícita antes de subir servidor local uma única vez pra tirar screenshot.
- Se o Playwright MCP estiver disponível na hora de implementar, posso usar pra tirar screenshot da produção/preview da Vercel (não precisa de servidor local) e comparar lado a lado com o mockup.

## Fora de escopo (não mexe nessa tarefa)
- Seletor de tema (mockup não tem, mantém como está)
- Vídeo real na vela principal (mockup não tem vídeo, produção já não usa vídeo na vela principal desde a correção do bug visual em 2026-07-23 — ver histórico no vault)
- Qualquer mudança de dado/schema
