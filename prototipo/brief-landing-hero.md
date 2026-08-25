# Brief — Hero da landing institucional (site público, `legadodigital.net`)

PEÇA: hero (seção de abertura) da landing institucional que já está no ar hoje.
**Só o hero muda — nada mais da página.**

## O que NÃO pode sumir (já existe na landing hoje, `app/page.tsx`)
- Headline: "Toda Família Tem Uma História"
- Subtítulo: "Um espaço permanente para preservar a história de quem se foi. Sua
  funerária oferece memoriais digitais com QR Code às famílias que atende."
- Botão "Começar Agora"
- Busca de memorial embutida (campo "Buscar um memorial pelo nome…")
- Faixa de stats (4 Níveis de Acesso / 100% Online / 100% Privacidade Total)
- **Abaixo do hero**: 7 cards de Benefícios (com ícone), seção "Como Funciona"
  (4 passos), FAQ (5 perguntas), CTA final, rodapé com 3 colunas de links —
  nenhum desses muda.

## O que muda: só o visual de fundo do hero
Direção já aprovada pelo dono do projeto nesta sessão: foto realista de uma
família (mãe, pai, 2 filhos, vistos de costas) subindo uma escada de pedra ao
ar livre, **luz de dia quente/dourada** — nunca escuro, noturno ou fúnebre
(regra de marca: celebração de vida). A família caminha em direção a um
portal/arco no **formato exato do arco gótico duplo da nossa logo**
(`brand/logo-legado-digital.svg`, `brand/logo-icone-somente.png` — arco duplo
+ livro aberto + planta crescendo + chama de luz no topo).

Foto de referência já aprovada (enquadramento correto, "a distância está
certa"): `assets/landing/hero-familia-daylight.jpg`, anexada neste projeto.

## Efeitos/elementos pedidos (além da foto estática)
O dono do projeto pediu explicitamente **efeitos/elementos animados** no
conceito, não só uma imagem parada — ex: leve parallax da foto no scroll,
brilho pulsando suave dentro do arco, ou o arco da logo se desenhando/
revelando conforme a página carrega ou rola. Deixe a peça pronta pra levar
isso pro código depois (Claude Code + GSAP), não precisa animar dentro do
próprio Claude Design.

## Marca (já sincronizada em `tokens/colors.css` e `brand/`)
- Navy profundo: `#0B1D2A`
- Dourado champagne: `#C9A46A` (claro `#dfc08a`, escuro `#a8834a`)
- Cinza pedra: `#58616B` · Branco quente: `#F5F2EB`
- **Tipografia real do site: Georgia (serif), em toda a página** — o
  `tokens/colors.css` deste projeto lista Playfair Display/Inter de uma
  direção antiga que foi revertida; a decisão final e atual é Georgia.
- Logo: `brand/logo-legado-digital.svg` (arco+livro+planta+chama) — o portal
  do hero tem que usar esse formato exato, não um arco genérico.

## CTA
Nenhum CTA novo — os já existentes ("Começar Agora" e a busca) continuam.
