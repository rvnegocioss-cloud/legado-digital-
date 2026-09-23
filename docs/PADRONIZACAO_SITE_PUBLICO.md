# Padronização do site público — auditoria e plano por etapas

> Levantado em 2026-09-23 a pedido do Rafael ("tem muitas diferenças, isso não pode").
> **Nada aplicado ainda.** Cada etapa só sai do papel depois que ele aprovar.

---

## 1. O diagnóstico: existem 3 sistemas de estilo convivendo

O site não tem *um* padrão — tem três, e eles nunca foram unificados:

| Sistema | Onde vive | Quem usa | Fonte | Largura |
|---|---|---|---|---|
| **A — `publicTheme`** | `lib/publicTheme.ts` (objetos de estilo *inline*) | busca, cemitérios (×3), parceiro, privacidade, termos, memorial | **Georgia** (serifa de sistema) | 720 / 960px |
| **B — casca compartilhada** | `components/public/site-chrome.css` | o menu e o rodapé de todas as páginas | herda do body | **1180px** |
| **C — landing nova** | `app/landing.css` (classes CSS com tokens) | só a home (`app/page.tsx`) | **Inter + Playfair Display** | **1240px** |

**Consequência prática:** a pessoa sai da home e entra na busca — a fonte muda de Inter para Georgia, a página encolhe de 1240 para 960, e o menu (que é 1180) não alinha com nenhum dos dois. É exatamente o "destoa" que você apontou.

### As divergências concretas

1. **Fonte** — `lib/publicTheme.ts:27` força `Georgia, 'Times New Roman', serif` em 9 páginas. A landing usa Inter/Playfair. São duas identidades tipográficas diferentes no mesmo site.
2. **Largura do conteúdo** — três valores sem critério: `960` (páginas), `1180` (menu/rodapé), `1240` (landing). O conteúdo nunca alinha com o menu acima dele.
3. **Título de página** — `publicTheme.titulo` é `36px` fixo; a landing usa `clamp(26px, 3vw, 38px)` (fluido). Em tela pequena o título das páginas antigas estoura; o da landing não.
4. **Fundo** — páginas antigas usam gradiente (`#0f2436 → #0B1D2A`); a landing usa cor sólida com faixas alternadas. Emenda visível ao trocar de página.
5. **Botões** — a landing tem `.btn` / `.btn.o` com medida definida (11px 20px, raio 8). As outras páginas montam botão à mão, caso a caso, cada um com um tamanho.
6. **Privacidade e Termos estão órfãs** — `app/politica-de-privacidade/page.tsx` e `app/termos-de-uso/page.tsx` **não usam `SiteNav` nem `SiteFooter`**. Têm um `<Link>` de voltar escrito à mão e nenhum rodapé. Viola as regras 11 e 12 do CLAUDE.md.
7. **Estilo inline vence CSS** — `publicTheme` são objetos `style={{}}` aplicados direto no elemento. Isso tem a maior precedência do CSS: nenhuma folha de estilo consegue sobrescrever sem `!important`. Por isso "arrumar no CSS" nunca pega nessas páginas.

---

## 2. O barramento correto (arquitetura de navegação)

Pesquisado, não inventado. Duas referências que sustentam o desenho:

- **Route Groups do Next.js App Router** — pastas entre parênteses `(marketing)`, `(app)` agrupam rotas que compartilham a mesma casca **sem mudar a URL**. É o padrão para separar "site público" de "área logada" no mesmo domínio ([Feature-Sliced Design](https://feature-sliced.design/blog/nextjs-app-router-guide), [Next.js App Router: The Patterns That Actually Matter in 2026](https://dev.to/teguh_coding/nextjs-app-router-the-patterns-that-actually-matter-in-2026-146)).
- **Design tokens como fonte única da verdade** — os valores visuais (cor, fonte, espaçamento) ficam definidos **num lugar só**, como variáveis CSS, e todo componente referencia o token, nunca o valor cru. Trocar o token muda o site inteiro de uma vez ([CSS-Tricks](https://css-tricks.com/what-are-design-tokens/), [Penpot — guia de tokens e CSS variables](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)).

### Desenho proposto

```
TOKENS (fonte única da verdade)
  app/tokens.css ......... cor, fonte, espaçamento, raio, largura
        │                  (hoje espalhado em 3 arquivos)
        ▼
CASCA (uma só, para todo o site aberto)
  app/(site)/layout.tsx .. SiteNav + migalha + SiteFooter
        │                  nenhuma página monta o próprio topo
        ▼
PÁGINAS (só conteúdo, zero estilo de casca)
  /                        home
  /busca                   buscar memorial
  /cemiterios              cemitérios
  /cemiterios/[cidade]/[cemiterio]
  /jazigo/[slug]           (a criar)
  /memorial/[slug]         (hoje /homenagem/[slug])
  /politica-de-privacidade · /termos-de-uso

CASCA PRÓPRIA (área logada, não herda a do site)
  app/(admin)  ·  app/(parceiro)  ·  app/(familia)
```

**A regra que fecha o barramento:** nenhuma página pública declara topo, rodapé, fonte, cor de fundo ou largura. Isso é da casca. A página só entrega conteúdo. Hoje cada página declara tudo isso por conta própria — é essa a origem de toda a diferença.

---

## 3. As etapas

Ordem pensada pra cada etapa ser verificável sozinha e nunca quebrar o que já está no ar.

### Etapa 1 — Criar a fonte única da verdade
**Arquivo novo:** `app/tokens.css`
Levar pra lá os valores que hoje estão em `lib/publicTheme.ts`, `app/landing.css` e `site-chrome.css`, como variáveis CSS: cor, fonte, escala de título, largura do container, raio, sombra.
*Não muda nada visualmente ainda — só passa a existir o lugar certo.*

### Etapa 2 — Decidir a fonte e a largura oficiais
Duas decisões suas, que travam todo o resto:
- **Fonte:** Inter + Playfair (o padrão da landing nova) **ou** Georgia (o das páginas antigas)?
- **Largura:** 1240px (landing) para tudo, alinhando menu e conteúdo?
*Minha recomendação: Inter + Playfair e 1240px — é o padrão que você aprovou no protótipo, e é o que já está no ar na home.*

### Etapa 3 — Alinhar a casca compartilhada
**Arquivo:** `components/public/site-chrome.css`
Trocar o `1180px` do menu e do rodapé pela largura oficial da Etapa 2, e passar a ler os tokens em vez dos valores fixos. Menu, conteúdo e rodapé passam a alinhar na mesma coluna.

### Etapa 4 — Aposentar o `publicTheme`, página por página
**Arquivo:** `lib/publicTheme.ts` → vira casca fina sobre os tokens
Ordem sugerida, da mais simples para a mais complexa, uma por vez com conferência no meio:
1. `app/politica-de-privacidade/page.tsx` — **e colocar `SiteNav`/`SiteFooter`**, que não tem
2. `app/termos-de-uso/page.tsx` — idem
3. `app/busca/page.tsx`
4. `app/cemiterios/page.tsx`
5. `app/cemiterios/[cidade]/page.tsx`
6. `app/cemiterios/[cidade]/[cemiterio]/page.tsx`
7. `app/parceiros/[slug]/page.tsx`

### Etapa 5 — Criar a casca de verdade (route group)
**Arquivo novo:** `app/(site)/layout.tsx`
Mover as páginas públicas pra dentro do grupo. O `SiteNav`/`SiteFooter` sai de dentro de cada página e passa a ser montado uma vez só pela casca. **A URL não muda** — `(site)` some do endereço.
*Etapa mais delicada: mexe em caminho de arquivo. Fica por último de propósito.*

### Etapa 6 — Página do memorial
**Arquivo:** `app/homenagem/[slug]/page.tsx` + `app/globals.css`
É a maior e a mais sensível (regras 17, 20 e 21 do CLAUDE.md protegem mapa, vela e o modelo da página). Tratar como tarefa isolada, depois que todo o resto estiver padronizado.

---

## 4. O que **não** entra nesta padronização

- `app/fio-da-vida/page.tsx` — a landing antiga, preservada de propósito. Fica como está.
- `app/homenagem/[slug]/classico/page.tsx` — página congelada, nunca tocada (regra 21).
- Central, Portal do Parceiro e Portal da Família — têm casca própria por decisão de arquitetura, não devem parecer com o site público.

---

## 5. Decisões que dependem de você antes de começar

1. **Fonte oficial** — Inter + Playfair, ou Georgia?
2. **Largura oficial** — 1240px?
3. **Faço a Etapa 1 e 2 agora** (que não mudam nada visível), ou prefere decidir 1 e 2 primeiro e só então eu mexo?
