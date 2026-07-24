# Página do Memorial — redesign visual pra bater com mockup do Claude Design

## Contexto
Rafael gerou um mockup no Claude Design (export "Bundled Page", protótipo `DCLogic`) da página `/homenagem/[slug]` e quer o visual real **idêntico** ao mockup — já tentou 2x antes e não ficou igual. Análise do mockup (decompactado e mapeado seção a seção) mostrou algo importante: **a maior parte da funcionalidade do mockup já existe em produção de verdade** (galeria mosaico A/B + lightbox, mural de memórias com reação de coração via RPC, timeline em espinha, faixa de presença viva, acender vela com parede de 45 velas votivas + chama voando — esse último é praticamente 1:1 idêntico ao mockup, foi construído em 2026-07-23 seguindo a mesma referência visual). Ou seja, isso não é "construir do zero" — é fechar o gap visual que sobrou, que é principalmente **tipografia e largura/layout do container**.

## O que NÃO muda
- Nenhuma query Supabase, RPC, RLS, rate limit.
- Nenhum contrato de props dos componentes client (`AcenderVela`, `GaleriaFotos`, `MuralMemorias`, `FormularioCondolencia`, `GateSenhaAcesso`, `SeletorTema`).
- `lib/publicTheme.ts` (`CORES`) e `lib/temasMemorial.ts` (variáveis CSS do seletor de tema) — paleta já é a mesma do mockup (`#0B1D2A`/`#C9A46A`).
- **Fonte — decisão do Rafael (2026-07-23):** mantém a fonte atual do projeto (Georgia/Times New Roman serif), não troca pra Playfair Display/Source Sans 3 do mockup. Escopo dessa tarefa é só layout/largura/responsividade.

## Gap real identificado (comparação página atual vs mockup)

| Aspecto | Hoje (`app/homenagem/[slug]/page.tsx`) | Mockup |
|---|---|---|
| Largura do conteúdo | Fixa em 720px sempre (mobile e desktop) | 520px mobile / 1100px desktop |
| Hero (foto+texto) | Sempre coluna centralizada | Linha lado a lado no desktop, coluna no mobile |
| Anel da foto | Fixo 188px | 160px mobile / 220px desktop |
| Breakpoint mobile | 640px (só na Galeria) | 768px (mockup inteiro) |
| Fonte | Georgia/Times New Roman (mantém — decisão do Rafael) | Playfair Display + Source Sans 3 (não aplicado) |

Componentes que **já batem** com o mockup, sem nenhuma mudança: `FaixaPresencaViva`, `ResumoPoucasPalavras`, `GaleriaFotos` (mosaico A/B + lightbox), `MuralMemorias` (corações via RPC), `AcenderVela` (parede de 45 velas + chama voando).

## Mudanças por arquivo

1. **`app/homenagem/[slug]/page.tsx`** (mudança principal, só layout — fonte não muda):
   - Largura do hero/main: trocar `maxWidth: 720` fixo por classe CSS nova (`.mem-container`) com `max-width: 520px` mobile / `1100px` desktop via media query em `globals.css` (mesmo padrão já usado em `.mem-bio-grid`)
   - Hero: nova classe `.mem-hero` — `flex-direction: column` mobile, `row` desktop (≥768px) via media query, texto centralizado mobile / alinhado à esquerda desktop
   - Anel da foto: `.mem-hero-ring` com `width`/`height` via `clamp(160px, 20vw, 220px)` (sem JS, sem listener de resize novo)

2. **`components/public/FaixaPresencaViva.tsx`** — tamanho do número via `clamp(26px, 4vw, 34px)` (mockup: 26px mobile / 34px desktop), fonte mantém Georgia

3. **`components/public/GaleriaFotos.tsx`** — breakpoint mobile de 640px → 768px (consistência com o resto da página); `gridAutoRows` mobile 90→78, desktop 110→100 (valores exatos do mockup). Resto (mosaico A/B, lightbox) fica igual, já bate.

4. **`app/globals.css`** — novas classes `.mem-container` (largura responsiva) e `.mem-hero` (row/column responsivo), seguindo o padrão que já existe pra `.mem-bio-grid`/`.mem-timeline-espinha`.

**Sem mudança nenhuma:** `ResumoPoucasPalavras.tsx`, `MuralMemorias.tsx`, `AcenderVela.tsx` — já batem com o mockup e a fonte não muda.

## Testing
- `npm run build` + `npm run lint` + `npm run typecheck` verdes antes de qualquer commit (regra permanente do projeto).
- **Verificação visual não será feita rodando `npm run dev`** — regra registrada: nunca subir servidor local sem pedir (travou a máquina do Rafael antes). Depois do push, Rafael confere no ambiente dele ou eu peço permissão explícita antes de subir servidor local uma única vez pra tirar screenshot.
- Se o Playwright MCP estiver disponível na hora de implementar, posso usar pra tirar screenshot da produção/preview da Vercel (não precisa de servidor local) e comparar lado a lado com o mockup.

## Fora de escopo (não mexe nessa tarefa)
- Seletor de tema (mockup não tem, mantém como está)
- Vídeo real na vela principal (mockup não tem vídeo, produção já não usa vídeo na vela principal desde a correção do bug visual em 2026-07-23 — ver histórico no vault)
- Qualquer mudança de dado/schema
