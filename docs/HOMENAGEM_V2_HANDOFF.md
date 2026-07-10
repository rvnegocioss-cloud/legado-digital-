# Página de Homenagem v2 — Handoff de Melhorias

> **Documento de especificação para implementação por outro modelo de IA.**
> Não implementado. Lê junto com o `CLAUDE.md` (seções "Página do Memorial" e "Bugs conhecidos") antes de escrever qualquer código.

## Contexto obrigatório — por que a página é 100% servidor hoje

A versão anterior da página (`HomenagemTemplate.tsx` + `FundoParallax.tsx`, ainda no repo mas **não usados**) travava o navegador do visitante ("This page couldn't load"). Causas raiz, confirmadas e documentadas no CLAUDE.md:

1. `requestAnimationFrame` **infinito** reescrevendo `transform` a cada frame numa camada `preserve-3d` + `will-change` + listener de giroscópio — vazava memória do compositor até o navegador matar a aba.
2. `@import` de fonte do Google direto no `<style>` — rede que não alcança `fonts.googleapis.com` travava o carregamento inteiro.

Por isso `app/homenagem/[slug]/page.tsx` hoje é Server Component puro, HTML/CSS inline, zero JS client. **Essa base não pode regredir.** Toda melhoria abaixo entra como "ilha client" isolada por cima dela.

## Regras invioláveis (qualquer PR que quebrar uma delas é rejeitado)

1. **A rota continua Server Component.** Ilhas client entram via `next/dynamic` com `ssr: false` — se a ilha falhar, o conteúdo (que já veio do servidor) continua legível.
2. **Nenhum loop de animação infinito.** Com React Three Fiber, usar `frameLoop="demand"` e invalidar só quando algo muda. Animação CSS só em `opacity`/`transform`, disparada por interação ou entrada no viewport — nunca contínua e permanente.
3. **Nenhum fetch de terceiro em runtime** (fontes, CDN de scripts, tiles). Fonte via `next/font` (self-hosted no build) ou fonte de sistema. Assets todos no Supabase Storage ou `/public`.
4. **`prefers-reduced-motion: reduce` desliga toda animação.** Checar via `useReducedMotion` (framer-motion) ou media query CSS.
5. **Ilhas 3D só montam quando visíveis** (IntersectionObserver) e **desmontam limpo** (cancelar RAF, dispose de geometrias/texturas/renderer no unmount).
6. **Mobile primeiro.** Testar em device throttled (Chrome DevTools CPU 4x slowdown). Se der jank, a feature sai — a página é acessada majoritariamente por QR code em celular, no cemitério, com rede ruim.
7. Convenções do CLAUDE.md: labels em todo campo de formulário, sem emoji na UI, ícones `lucide-react` `strokeWidth={1.5}`.

## Dependências já instaladas (NÃO instalar de novo — checar `package.json`)

| Pacote | Versão | Uso proposto |
|---|---|---|
| `three` | 0.184 | Cena 3D da vela |
| `@react-three/fiber` | ^9.5 | React renderer pro three (compatível React 19) |
| `@react-three/drei` | ^10.7 | Helpers (Float, Environment, useGLTF) |
| `framer-motion` | ^11 | Scroll reveal, micro-interações, `useReducedMotion` |
| `lucide-react` | ^1.22 | Ícones |
| `sonner` | ^2 | Toast de confirmação (condolência enviada) |

## Melhorias propostas, em ordem de implementação

### 1. Formulário de condolências (ilha client pequena) — PRIMEIRO
- `components/homenagem/FormCondolencia.tsx`, `'use client'`, montado abaixo da lista server-rendered.
- Campos (com label): Nome, Relação (opcional), Mensagem. Insert direto na tabela `condolencias` (`homenagem_id` vem por prop). RLS de INSERT público já existe.
- Estado de sucesso via `sonner`. Sem revalidação complexa: `router.refresh()` após insert.
- Rate limit simples: desabilitar botão 30s após envio (anti-spam mínimo; captcha fica pra depois).

### 2. Vela 3D interativa (React Three Fiber) — o "wow" seguro
- `components/homenagem/Vela3D.tsx` com `next/dynamic` + `ssr: false` + IntersectionObserver (só monta quando o hero está visível).
- `<Canvas frameloop="demand" dpr={[1, 1.5]} gl={{ powerPreference: 'low-power', antialias: false }}>`.
- Vela: geometria simples (cilindro + chama com shader ou sprite animado por `useFrame` **condicionado** — só roda enquanto `acesa === true` e a aba está visível via `document.visibilityState`).
- Clique acende/apaga. Estado persiste em `localStorage` (não no banco — velas são do visitante).
- Fallback obrigatório: se WebGL indisponível (`!window.WebGLRenderingContext`) ou `prefers-reduced-motion`, renderizar a versão estática atual (crossfade de imagens já existente em `FundoParallax.tsx` — a versão estática, que é segura).
- **Kill switch**: `try/catch` + ErrorBoundary em volta do Canvas; erro → fallback estático, nunca tela branca.

### 3. Scroll reveal com framer-motion (substitui o CSS `fade-up` antigo)
- `whileInView={{ opacity: 1, y: 0 }}` + `viewport={{ once: true }}` — anima UMA vez ao entrar no viewport e para (nada contínuo).
- Envolver cada `<section>` num wrapper client fino (`components/homenagem/RevealSection.tsx`) que recebe `children` server-rendered — o conteúdo continua vindo do servidor.

### 4. Galeria com lightbox
- Grid atual continua server. Clique abre lightbox client (dialog nativo `<dialog>` ou shadcn Dialog já no projeto).
- Imagens via `next/image` com `sizes` correto (as URLs do Supabase Storage suportam transformação de imagem — usar `width=` na URL pra thumbnails leves).

### 5. Timeline com UI decente (form + página)
- Form: trocar textarea `ano | título | descrição` por lista de blocos com botão "+ adicionar evento" (estado local, salva como o mesmo jsonb atual — schema não muda).
- Página: linha vertical dourada com marcadores (CSS puro, já parcialmente feito) + reveal do item 3 acima.

### 6. Player de música (biblioteca curada — ver decisão de direitos autorais no CLAUDE.md)
- Pré-requisito: subir ~10 faixas instrumentais royalty-free pro bucket `memoriais/biblioteca-musicas/` e criar tabela `musicas_biblioteca` (id, titulo, url, duracao).
- Form: `<select>` da biblioteca → salva `musica_url`.
- Página: botão discreto "Ouvir música" (ilha client) — `<audio>` nativo, **nunca autoplay** (bloqueado pelos navegadores e invasivo num memorial), pausa ao sair da aba.

### 7. Compartilhar
- Ilha mínima: `navigator.share` com fallback `clipboard.writeText` + toast. Já existia no template antigo (`compartilhar()` em `HomenagemTemplate.tsx`) — copiar a lógica, não o componente.

### 8. Temas (noturno/pedra/claro)
- Os 3 temas já estão definidos como objetos em `HomenagemTemplate.tsx` (const `temas`) — reaproveitar os valores.
- Implementar com CSS custom properties no wrapper da página + toggle client que troca `data-theme`. Persistir em `localStorage`. Zero re-render de árvore (só CSS).

### O que NÃO fazer (tentador, mas repete o desastre)
- Parallax de fundo com giroscópio/mouse contínuo (foi a causa raiz do crash).
- `will-change` permanente em camada grande.
- Partículas/fumaça full-screen contínuas (compositor de celular fraco não aguenta).
- Fonte via `@import`/`<link>` de CDN externo.
- Autoplay de áudio ou vídeo.
- Qualquer `useFrame`/RAF que rode incondicionalmente.

## Critérios de aceite (testar antes de dar como pronto)
1. Lighthouse mobile ≥ 85 performance na página com todos os recursos ativos.
2. Chrome DevTools, CPU 4x slowdown, 5 minutos com a aba aberta e interagindo: memória do renderer estável (sem crescimento contínuo no Task Manager do Chrome).
3. Com JS desabilitado: todo o conteúdo (hero, bio, timeline, galeria, condolências) continua legível.
4. `prefers-reduced-motion`: nenhuma animação roda.
5. WebGL bloqueado (chrome://flags ou Firefox `webgl.disabled`): página renderiza com fallback estático, sem erro no console.
6. Build `npm run build` limpo + teste manual em produção antes de marcar concluído (regra do CLAUDE.md: docs só atualizam depois do deploy confirmado pelo Rafael).
