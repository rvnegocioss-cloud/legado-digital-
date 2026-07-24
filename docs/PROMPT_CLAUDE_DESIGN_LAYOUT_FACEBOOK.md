# Prompt pro Claude Design — Página do Memorial, variante "tipo Facebook"

> Cola isso no claude.ai/design. Gera um mockup NOVO, separado do que já existe — não é pra substituir a página atual, é uma segunda opção pra comparar lado a lado.

---

**Persona:** Família enlutada visitando o memorial digital de um ente querido pelo celular ou computador. Em desktop, quer sentir que está "visitando um perfil" cheio de vida — não uma página solitária e vazia. Tom: acolhedor, editorial, nunca frio ou corporativo.

**Objetivo do mockup:** Redesenhar o LAYOUT (não o conteúdo) da página pública de um memorial digital pra ter cara de perfil de rede social em telas grandes — coluna principal de conteúdo + barra lateral fixa com informação de apoio — sem virar bagunça visual nem perder a leitura calma de um memorial. Em celular, tudo empilha em coluna única (isso já funciona bem hoje, não mudar).

**Paleta oficial (hex, não inventar cor nova):**
- Fundo profundo: `#0B1D2A`
- Fundo secundário/cards: `#12293B` (ou `rgba(255,255,255,0.03-0.05)` sobre o fundo profundo)
- Dourado (destaque, títulos, ícones, bordas): `#C9A46A`
- Texto principal: tom claro quase branco, ~`#EAE3D6`
- Texto secundário/fraco: cinza-azulado, ~`#7a8a96`
- Bordas sutis: `rgba(201,164,106,0.15-0.25)` (dourado bem transparente)

**Tipografia:** Serif clássica (Georgia ou equivalente) em todo o texto — títulos e corpo. **Não usar Playfair Display nem nenhuma fonte nova** — decisão do projeto é manter a fonte atual, essa variante testa só o LAYOUT, não a tipografia.

**Seções que já existem e precisam aparecer (conteúdo real, não inventar novo campo):**
1. Hero — foto/monograma redondo com anel dourado, nome, datas, cidade, frase preferida
2. Faixa "presença viva" — 3 números: velas acesas / homenagens / memórias guardadas
3. Biografia + card lateral "Em poucas palavras"
4. Linha do tempo ("Uma Vida") — espinha vertical com marcos
5. Galeria de fotos — grid mosaico assimétrico
6. Mural de memórias — cards com nome/parentesco/texto/coração
7. Condolências — lista + formulário
8. **Acender uma vela** — ⚠️ **não redesenhar essa seção.** Ela já existe pronta e calibrada (parede de velinhas + vela principal com chama animada). No mockup, só reserva o espaço/posição dela no layout (pode usar um placeholder simples tipo "[seção de vela aqui]") — a implementação real vai plugar o componente já existente sem mudar nada nele.

**A diferença que eu quero ver no mockup (o pedido real):**
- **Desktop (telas largas):** layout vira 2 colunas — coluna principal (largura maior, ~65-70%) com biografia/timeline/galeria/mural/condolências rolando; **barra lateral fixa à direita** (~30-35%, acompanha o scroll) com: faixa de presença viva, card "em poucas palavras", preview pequeno da galeria (tipo 4-6 fotos em grid compacto), e um espaço reservado pra vela.
- **Mobile:** tudo empilha em coluna única, na ordem que já existe hoje — sem sidebar, sem mudança nenhuma aqui (isso já está funcionando bem, não mexer).
- Objetivo: em tela grande, a página não fica com espaço vazio dos dois lados — a barra lateral usa esse espaço com conteúdo útil, dando a sensação de "perfil" (tipo Facebook/LinkedIn), sem copiar o visual literal de rede social (sem feed azul, sem ícone de like/polegar, sem menu de rede social).

**Palavras-chave de direção:** editorial, perfil, acolhedor, denso mas arejado, sidebar fixa, mosaico, presença, memória viva — nunca: corporativo, frio, genérico, feed de rede social literal.

**Formato de export:** "Bundled Page" (o mesmo formato que já usei antes com você) — HTML autossuficiente que eu consigo abrir e portar pro código real.
