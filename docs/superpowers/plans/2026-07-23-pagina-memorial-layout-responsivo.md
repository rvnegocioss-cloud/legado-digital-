# Página do Memorial — Layout Responsivo (bater com mockup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o layout da página `/homenagem/[slug]` largo e responsivo igual ao mockup do Claude Design (foto+texto lado a lado no desktop, container mais largo), sem tocar em fonte, dado, RPC ou RLS.

**Architecture:** Mudança é 100% visual/CSS. Componentes client (`AcenderVela`, `GaleriaFotos`, `MuralMemorias`, `FormularioCondolencia`) mantêm props e lógica idênticas — só marcação/estilo. Segue o padrão já existente no projeto: classe CSS em `globals.css` sobrescrevendo `inline style` com `!important` dentro de `@media`, igual ao `.mem-bio-grid` já implementado.

**Tech Stack:** Next.js 16 App Router (Server Component), inline `React.CSSProperties` + classes CSS pontuais em `app/globals.css`. Sem framework de teste no projeto (`package.json` não tem jest/vitest) — verificação é `npm run lint` + `npm run typecheck` a cada task, `npm run build` completo na task final antes do push.

## Global Constraints
- Fonte da página **não muda** (mantém `Georgia, 'Times New Roman', serif` em tudo) — decisão explícita do Rafael, 2026-07-23.
- Nenhuma query Supabase, RPC, RLS, prop de componente client muda.
- Breakpoint mobile/desktop novo: `768px` (`min-width: 768px` = desktop), consistente com o mockup.
- Nunca rodar `npm run dev` sem pedir permissão explícita antes (travou a máquina do Rafael numa sessão anterior) — verificação é só `lint`/`typecheck`/`build`, sem servidor local.
- Commit por task (local, sem push). Push só na task final, depois do `npm run build` completo passar.

---

### Task 1: Classes CSS novas em `globals.css`

**Files:**
- Modify: `app/globals.css` (adicionar bloco novo depois da seção `/* ===== Página do Memorial (app/homenagem/[slug]) ===== */`, antes do bloco `.mem-bio::first-letter`)

**Interfaces:**
- Produces: classes `.mem-container`, `.mem-hero`, `.mem-hero-texto`, `.mem-hero-ring` — consumidas nas Tasks 2, 3, 5.

- [ ] **Step 1: Adicionar o bloco de CSS**

Abrir `app/globals.css`, localizar a linha `/* ===== Página do Memorial (app/homenagem/[slug]) ===== */` (linha 87) e inserir logo depois dela, antes do comentário `/* Biografia + card lateral...`:

```css
/* Largura do container — 520px mobile / 1100px desktop (bate com o mockup) */
.mem-container {
  max-width: 520px;
}
@media (min-width: 768px) {
  .mem-container {
    max-width: 1100px;
  }
}

/* Hero: foto empilhada com texto no mobile (default), lado a lado no desktop */
.mem-hero-texto {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mem-hero-ring {
  width: clamp(160px, 20vw, 220px);
  height: clamp(160px, 20vw, 220px);
}
@media (min-width: 768px) {
  .mem-hero {
    flex-direction: row !important;
    text-align: left !important;
    gap: 64px;
    padding: 96px 48px 72px !important;
  }
  .mem-hero-texto {
    align-items: flex-start !important;
  }
  .mem-hero-ring {
    flex-shrink: 0;
  }
}
```

- [ ] **Step 2: Verificar que não quebrou nada**

Run: `npm run lint`
Expected: sem erro novo (CSS puro, lint não afeta, mas roda pra garantir que o arquivo continua válido pro build)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "Style: classes CSS responsivas pro hero e container da pagina do memorial"
```

---

### Task 2: Restructurar o hero em `page.tsx` (foto + texto lado a lado no desktop)

**Files:**
- Modify: `app/homenagem/[slug]/page.tsx:171-218` (JSX do `<header>`)
- Modify: `app/homenagem/[slug]/page.tsx` (objeto `estilos`, chaves `hero`, `fotoGlowWrap`, `fotoRing`, `monograma`)

**Interfaces:**
- Consumes: classes `.mem-hero`, `.mem-hero-texto`, `.mem-hero-ring`, `.mem-container` (Task 1)
- Produces: `<header>` sem o bloco `<AcenderVela>` embutido (removido nesta task, adicionado de volta como seção própria na Task 4)

- [ ] **Step 1: Editar o objeto `estilos` — remover `maxWidth: 720` do hero, ajustar foto**

Trocar:

```tsx
  hero: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "64px 20px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  fotoGlowWrap: { position: "relative", width: 188, height: 188, display: "flex", alignItems: "center", justifyContent: "center" },
  fotoGlow: {
    position: "absolute",
    inset: -30,
    background: CORES.glowHero,
  },
  fotoRing: {
    position: "relative",
    width: 188,
    height: 188,
    borderRadius: "50%",
    padding: 2,
    background: v(VAR_DOURADO, CORES.dourado),
  },
```

Por:

```tsx
  hero: {
    margin: "0 auto",
    padding: "64px 20px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  fotoGlowWrap: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center" },
  fotoGlow: {
    position: "absolute",
    inset: -30,
    background: CORES.glowHero,
  },
  fotoRing: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    padding: 2,
    background: v(VAR_DOURADO, CORES.dourado),
  },
```

- [ ] **Step 2: Ajustar `monograma` pra escalar com o anel**

Trocar:

```tsx
  monograma: { fontSize: 44, color: v(VAR_DOURADO, CORES.dourado), fontFamily: "Georgia, serif" },
```

Por:

```tsx
  monograma: { fontSize: "clamp(40px, 6vw, 56px)", color: v(VAR_DOURADO, CORES.dourado), fontFamily: "Georgia, serif" },
```

- [ ] **Step 3: Reescrever o JSX do `<header>`**

Trocar (linhas 171-218, do `<header>` até o fechamento, **removendo** o bloco do `AcenderVela` que fica dentro dele):

```tsx
      <header style={estilos.hero}>
        <div style={estilos.fotoGlowWrap}>
          <div style={estilos.fotoGlow} />
          <div style={estilos.fotoRing}>
            <div style={estilos.fotoInner}>
              {m.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.foto_url} alt={m.nome_completo} style={estilos.foto} />
              ) : (
                <span style={estilos.monograma}>
                  {m.nome_completo
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={estilos.eyebrowLinha}>
          <span style={estilos.hairlineCurta} />
          <span style={estilos.eyebrow}>Em Memória</span>
          <span style={estilos.hairlineCurta} />
        </div>

        <h1 style={estilos.nome}>{m.nome_completo}</h1>
        {anos && <div style={estilos.anos}>{anos}</div>}
        {m.cidade && (
          <div style={estilos.cidade}>
            <MapPin size={14} strokeWidth={1.5} />
            <span>{m.cidade}</span>
          </div>
        )}

        {m.frase_preferida && (
          <div style={estilos.fraseWrap}>
            <span style={estilos.hairlineCurta} />
            <blockquote style={estilos.frase}>&ldquo;{m.frase_preferida}&rdquo;</blockquote>
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <AcenderVela slug={slug} velasIniciais={m.velas_acesas ?? 0} />
        </div>
      </header>
```

Por:

```tsx
      <header className="mem-hero mem-container" style={estilos.hero}>
        <div className="mem-hero-ring" style={estilos.fotoGlowWrap}>
          <div style={estilos.fotoGlow} />
          <div style={estilos.fotoRing}>
            <div style={estilos.fotoInner}>
              {m.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.foto_url} alt={m.nome_completo} style={estilos.foto} />
              ) : (
                <span style={estilos.monograma}>
                  {m.nome_completo
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mem-hero-texto">
          <div style={estilos.eyebrowLinha}>
            <span style={estilos.hairlineCurta} />
            <span style={estilos.eyebrow}>Em Memória</span>
            <span style={estilos.hairlineCurta} />
          </div>

          <h1 style={estilos.nome}>{m.nome_completo}</h1>
          {anos && <div style={estilos.anos}>{anos}</div>}
          {m.cidade && (
            <div style={estilos.cidade}>
              <MapPin size={14} strokeWidth={1.5} />
              <span>{m.cidade}</span>
            </div>
          )}

          {m.frase_preferida && (
            <div style={estilos.fraseWrap}>
              <span style={estilos.hairlineCurta} />
              <blockquote style={estilos.frase}>&ldquo;{m.frase_preferida}&rdquo;</blockquote>
            </div>
          )}
        </div>
      </header>
```

Nota: o bloco `<AcenderVela>` foi removido daqui de propósito — volta como seção própria na Task 4, na mesma posição do mockup (perto do rodapé, não dentro do hero).

- [ ] **Step 4: Verificar tipo e lint**

Run: `npm run lint && npm run typecheck`
Expected: sem erro (nesse ponto `AcenderVela` está importado mas não usado ainda — isso VAI dar erro de lint `no-unused-vars`, é esperado até a Task 4. Se o lint falhar só por isso, confirmar que a única mensagem é `'AcenderVela' is defined but never used` antes de seguir — não é bug, é intencional até a próxima task.)

- [ ] **Step 5: Commit**

```bash
git add "app/homenagem/[slug]/page.tsx"
git commit -m "Style: hero da pagina do memorial vira row no desktop, coluna no mobile"
```

---

### Task 3: Aplicar `.mem-container` no `main` e `footer`

**Files:**
- Modify: `app/homenagem/[slug]/page.tsx` (objeto `estilos`, chaves `main` e `footer`; JSX das tags `<main>` e `<footer>`)

**Interfaces:**
- Consumes: classe `.mem-container` (Task 1)

- [ ] **Step 1: Editar o objeto `estilos`**

Trocar:

```tsx
  main: { maxWidth: 720, margin: "0 auto", padding: "12px 20px 56px" },
```

Por:

```tsx
  main: { margin: "0 auto", padding: "12px 20px 56px" },
```

Trocar:

```tsx
  footer: {
    borderTop: `1px solid ${CORES.douradoBorda}`,
    maxWidth: 720,
    margin: "0 auto",
    padding: "28px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
```

Por:

```tsx
  footer: {
    borderTop: `1px solid ${CORES.douradoBorda}`,
    margin: "0 auto",
    padding: "28px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
```

- [ ] **Step 2: Editar o JSX**

Trocar `<main style={estilos.main}>` por `<main className="mem-container" style={estilos.main}>`.

Trocar `<footer style={estilos.footer}>` por `<footer className="mem-container" style={estilos.footer}>`.

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run typecheck`
Expected: mesmo aviso de `AcenderVela` não usado (ainda pendente da Task 4), sem outro erro novo.

- [ ] **Step 4: Commit**

```bash
git add "app/homenagem/[slug]/page.tsx"
git commit -m "Style: main e footer da pagina do memorial usam largura responsiva"
```

---

### Task 4: Mover "Acender uma vela" pra seção própria (posição do mockup)

**Files:**
- Modify: `app/homenagem/[slug]/page.tsx` (JSX dentro de `<main>`, entre a seção de Condolências e o fechamento de `</main>`)

**Interfaces:**
- Consumes: `AcenderVela` (já importado no topo do arquivo, prop `slug: string`, `velasIniciais: number` — sem mudança de assinatura), `SecaoTitulo` (componente local do mesmo arquivo, prop `texto: string`)

- [ ] **Step 1: Adicionar a seção nova depois de Condolências, antes de `</main>`**

Localizar o fim da seção de Condolências:

```tsx
          <FormularioCondolencia memorialId={m.id} />
        </section>
      </main>
```

Trocar por:

```tsx
          <FormularioCondolencia memorialId={m.id} />
        </section>

        <section style={{ marginTop: 56, textAlign: "center" }}>
          <SecaoTitulo texto="Acender uma vela" />
          <p style={{ color: CORES.textoFraco, fontSize: 14, marginTop: 10, marginBottom: 24 }}>
            Em memória de {m.nome_completo}
          </p>
          <AcenderVela slug={slug} velasIniciais={m.velas_acesas ?? 0} />
        </section>
      </main>
```

- [ ] **Step 2: Verificar que o aviso de `AcenderVela` não usado sumiu**

Run: `npm run lint && npm run typecheck`
Expected: PASS, sem nenhum erro/aviso.

- [ ] **Step 3: Commit**

```bash
git add "app/homenagem/[slug]/page.tsx"
git commit -m "Style: secao Acender uma vela move pro fim da pagina, igual ao mockup"
```

---

### Task 5: `FaixaPresencaViva.tsx` — largura e tamanho de fonte responsivos

**Files:**
- Modify: `components/public/FaixaPresencaViva.tsx`

**Interfaces:**
- Consumes: classe `.mem-container` (Task 1)
- Props do componente não mudam (`velas: number`, `homenagens: number`, `memorias: number`)

- [ ] **Step 1: Trocar a largura fixa pela classe responsiva**

Trocar:

```tsx
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 20,
          textAlign: 'center',
        }}
      >
```

Por:

```tsx
      <div
        className="mem-container"
        style={{
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          gap: 20,
          textAlign: 'center',
        }}
      >
```

- [ ] **Step 2: Tamanho do número responsivo (26px mobile / 34px desktop, valores do mockup)**

Trocar:

```tsx
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: CORES.dourado }}>{item.valor}</div>
```

Por:

```tsx
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(26px, 4vw, 34px)', color: CORES.dourado }}>{item.valor}</div>
```

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/public/FaixaPresencaViva.tsx
git commit -m "Style: faixa de presenca viva com largura e fonte responsivas"
```

---

### Task 6: `GaleriaFotos.tsx` — breakpoint e altura das linhas do mosaico

**Files:**
- Modify: `components/public/GaleriaFotos.tsx:26-27` (breakpoint) e `:76` (altura das linhas)

**Interfaces:**
- Nenhuma mudança de props (`fotos: string[]`) nem de comportamento (mosaico A/B, lightbox continuam iguais)

- [ ] **Step 1: Alinhar o breakpoint mobile com o resto da página (768px)**

Trocar:

```tsx
      setColunas(window.innerWidth < 640 ? 2 : 4)
```

Por:

```tsx
      setColunas(window.innerWidth < 768 ? 2 : 4)
```

- [ ] **Step 2: Ajustar altura das linhas do grid pros valores exatos do mockup**

Trocar:

```tsx
          gridAutoRows: colunas === 2 ? 90 : 110,
```

Por:

```tsx
          gridAutoRows: colunas === 2 ? 78 : 100,
```

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/public/GaleriaFotos.tsx
git commit -m "Style: galeria ajusta breakpoint e altura de linha pro valor do mockup"
```

---

### Task 7: Verificação final e push

**Files:** nenhum (só verificação)

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: build termina sem erro (mesmo comando que roda no CI — `ci/build`)

- [ ] **Step 2: Lint e typecheck completos (garantia final)**

Run: `npm run lint && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Confirmar os 6 commits estão prontos e dar push**

```bash
git log --oneline -6
git push
```

Expected: `git push` sem erro, `main` no GitHub com os 6 commits novos.

- [ ] **Step 4: Atualizar `CLAUDE.md` (regra 4 — mesmo commit da feature)**

Marcar em `CLAUDE.md`, seção "Fase Atual", a linha:
```
- [ ] **Nova página do memorial** (mockup gerado no Claude Design, mapeado 2026-07-23) — visual mais editorial/minimalista sobre o que já é real (banco/RPC). Ver seção "Página do Memorial" abaixo.
```
Trocar `[ ]` por `[x]`, e no final da linha adicionar: `— **implementado 2026-07-23**: layout responsivo (container 520/1100px, hero lado a lado no desktop, seção de vela na posição do mockup). Fonte mantida (Georgia), não trocada pro Playfair/Source Sans do mockup por decisão do Rafael.`

Commit:
```bash
git add CLAUDE.md
git commit -m "Docs: marca layout responsivo da pagina do memorial como feito"
git push
```

---

## Self-Review

**Cobertura do spec:** largura responsiva (Task 1+3+5) ✅, hero lado a lado (Task 2) ✅, breakpoint 768px consistente (Task 1, 6) ✅, fonte mantida sem mudança (nenhuma task toca `fontFamily`) ✅. Item não-antecipado no spec original, mas necessário pra fidelidade real ("tudo as velas tudo igual" — confirmado pelo Rafael): posição da seção de vela igual ao mockup (Task 4) — adicionado porque, ao ler o JSX atual, a vela estava embutida dentro do hero, e no mockup é seção própria perto do rodapé; mover é mudança mecânica de baixo risco, dentro do escopo "layout".

**Placeholder scan:** nenhum "TBD"/"depois eu vejo" — todo step tem código completo.

**Consistência de tipo:** `AcenderVela` mantém `{ slug: string; velasIniciais: number }` em todo o plano (Task 2 remove, Task 4 recoloca com a mesma assinatura). `SecaoTitulo` mantém `{ texto: string }`, já existe no arquivo, não precisa criar de novo.
