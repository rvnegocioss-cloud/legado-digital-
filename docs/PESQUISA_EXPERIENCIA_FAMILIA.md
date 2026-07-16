# Pesquisa — Inovação na Experiência da Família (Página do Memorial)

Duas pesquisas paralelas (subagentes Opus, 2026-07-15) sobre como inovar a experiência da família no memorial, sem violar a regra de zero-JS-contínuo. Nada construído ainda — aguardando o Rafael priorizar. Ver também `docs/RASCUNHO_IDEIAS.md`.

## Achado técnico central (destrava quase tudo)

**CSS scroll-driven animations** (`animation-timeline: view()` / `scroll()`) rodam na thread do compositor, **sem nenhum JavaScript** — o oposto do bug antigo do RAF que vazou memória. Suporte real em 2026: Chromium 115+, Safari 18+, ~90% cobertura, fallback trivial (sem JS, conteúdo aparece normal), respeita `prefers-reduced-motion` nativamente. Isso permite scrollytelling de verdade (fade/slide de cada seção ao entrar na tela) mantendo a página 100% Server Component. Fontes: [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [Chrome for Developers](https://developer.chrome.com/blog/scroll-triggered-animations), [Josh W. Comeau](https://www.joshwcomeau.com/animation/scroll-driven-animations/).

## Referências visitadas (design visual)

- **Murial** (`web.murial.life`) — capítulos reordenáveis pela família, retrato em line-art/silhueta como acento.
- **Keeper Memorials** (`mykeeper.com`) — QR físico → memorial digital (mesmo modelo do projeto), muito espaço em branco, foto como herói.
- **SCMP — "A visual journey through Ozzy Osbourne"** — scrollytelling biográfico premiado, cronológico, atmosfera muda por época.
- **Evaheld** (`evaheld.com`) — "family memory rooms": organização por tema (pessoas/lugares/tradições/marcos), prompts guiados, contribuição assíncrona multi-geração, curadoria.
- **Chptr** — memorial como algo cumulativo/vivo, não congelado no dia do enterro.
- **Kirsty Mitchell "Wonderland"** — uma foto tratada com peso emociona mais que grid uniforme.
- **StoryWorth / Remento / Storii / HereAfter AI** — coleta por prompt semanal (email, voz, telefone), nunca "escreva a biografia" de uma vez. Remento: QR toca a voz real gravada. Storii: funciona por ligação telefônica, sem app, pro parente idoso que não usa tecnologia.
- **MyHeritage / Tinybeans / ForeverMissed / TributeWell / Kudoboard** — colaboração multi-geração por convite, dono controla permissão, memorial cresce com contribuições ao longo do tempo.

## 12 ideias concretas (consolidado das 2 pesquisas)

1. **Sala de memórias por tema** — prompts guiados ("conte uma memória da cozinha dela") organizados por eixo (pessoa/lugar/tradição/marco), não por tipo de arquivo.
2. **Contribuição multi-geração com curadoria** — vários parentes acrescentam no próprio tempo, um familiar-curador aprova antes de publicar.
3. **Linha do tempo em scrollytelling** — cada evento com fade/slide ao entrar na tela via `animation-timeline: view()`, zero JS.
4. **Foto-âncora full-bleed com zoom lento** (Ken Burns em `@keyframes` CSS) — uma foto tratada pesa mais que grid uniforme.
5. **Mural de recado por voz** — mensagem falada da família (`<audio>` nativo, ilha client pontual, sem loop).
6. **Memorial "vivo"** — no aniversário/data de falecimento, e-mail convida a família a voltar e acender vela ("Há 3 anos, hoje").
7. **Capítulos reordenáveis pela família** — ela decide a ordem das seções, não fixo.
8. **Silhueta/line-art como fallback de foto**, em vez de monograma.
9. **Capítulos por prompt semanal** (StoryWorth/Remento) — pergunta por e-mail toda semana, resposta curta vira capítulo. Resolve "tela em branco".
10. **QR/seção que toca a voz real do falecido** — diferencial forte, mesmo QR já existente, player `<audio>` nativo.
11. **Fila colaborativa de "próximos capítulos"** — família sugere/vota em quais histórias contar a seguir, só no portal autenticado.
12. **Privacidade em 2 camadas dentro da família** — memória pública (visitante do QR vê) vs memória só-família (login), mapeia no modelo público/senha que já existe.

## Gap estrutural identificado (o mais importante pra decidir)

O modelo atual (1 e-mail de família, sem conta, sem múltiplos contribuidores) foi **simplificado de propósito em 2026-07-10** — decisão consciente registrada no CLAUDE.md. Mas os líderes de mercado convergem todos no padrão **dono + contribuidores convidados + moderação + 2 camadas de privacidade**. Reintroduzir isso é o oposto da simplificação já decidida — precisa de confirmação explícita do Rafael antes de qualquer construção (e possivelmente confirmar com o Pedro, que talvez não saiba da simplificação original).

## Priorização sugerida (não decidida, só sugestão)

Baixo risco técnico primeiro: ideias 1, 2, 6, 9, 12 (produto/schema, zero animação) → depois 3 e 4 (visual, CSS puro) → depois 5 e 10 (única categoria que precisa ilha client de verdade, áudio) → 7, 8, 11 são refinamentos incrementais.
