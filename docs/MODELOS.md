# Modelos Travados — nunca reescrever, sempre consultar se der erro

> Este arquivo existe só pra isso: se algo quebrar numa mudança futura, volta aqui, confere o que era o original, e restaura. Nunca editar o código descrito aqui sem pedido explícito do Rafael.

---

## Modelo 1 — Página do memorial (`/homenagem/[slug]`)

**Virada 2026-08-27:** a página que era a variante `/perfil` (livro de assinaturas, régua lateral, castiçal) foi promovida pelo Rafael a página oficial ("essa aí vai ser a principal... essa será a nova página oficial do memorial"). O design antigo não foi apagado — vive intocado em `/homenagem/[slug]/classico`.

**Arquivo (oficial, desde 2026-08-27):** `app/homenagem/[slug]/page.tsx` + `app/homenagem/[slug]/perfil.css`

**Status:** modelo base fixo — a partir de agora, é ESTE arquivo que não pode ser reescrito sem pedido explícito. Qualquer variação nova de layout é rota separada, nunca substitui nem modifica ele.

**Ponto de restauração no git (design atual, se quebrar algo):**
```bash
git checkout 7cc5663 -- "app/homenagem/[slug]/page.tsx" "app/homenagem/[slug]/perfil.css"
```

**O que este modelo tem (confirmado funcionando 2026-08-27):**
- Topo copiado literal da página clássica (mesmo nav, mesmo hero centralizado, mesmos valores de estilo — objeto `estiloTopo` dentro do arquivo)
- Corpo em coluna de leitura + lateral fixa no desktop (`.perfil-corpo`, `.perfil-lateral`), régua da vida (`RailVida.tsx`) mostrando os anos vividos com um ponto por marco da timeline
- Biografia em estilo editorial (capitular, citações, parágrafos com `**negrito**` interpretado por `lib/textoRico.ts` — o texto no banco não muda, só a exibição)
- Livro de Assinaturas (`components/public/LivroAssinaturas.tsx`) no lugar da lista simples de cartões: livro aberto com caneta tinteiro escrevendo o nome, nome acende em dourado, fita marcadora com o símbolo, página vira. Reaproveitado também no Portal da Família com `moderar` (clica no nome, remove qualquer assinatura)
- Fonte: Georgia/Times New Roman serif em tudo — **não trocar pra Playfair Display nem nenhuma outra**, decisão confirmada do Rafael 2026-07-23, mantida na virada
- Reaproveita sem alteração: `AcenderVela.tsx` (regra 20), `GuiaTumulo.tsx`/Como Chegar (regra 17), `GaleriaFotos.tsx`, `MuralMemorias.tsx`, `SeletorTema.tsx`, `BotaoCompartilhar.tsx`

---

## Modelo 1b — Página clássica preservada (`/homenagem/[slug]/classico`)

**Arquivo:** `app/homenagem/[slug]/classico/page.tsx`

**Status:** o modelo que era oficial até 2026-08-27. Preservado intocado — nunca apagar, nunca reescrever. Existe só como referência/comparação e caminho de volta se a virada precisar ser desfeita.

**Ponto de restauração no git (era o modelo base completo, com AcenderVela e globals.css da época):**
```bash
git checkout homenagem-modelo-base-2026-07-24 -- "app/homenagem/[slug]/page.tsx" components/public/AcenderVela.tsx app/globals.css
```
Ou pra restaurar exatamente o estado do repo inteiro antes da virada:
```bash
git checkout pagina-classica-antes-da-virada-2026-08-27
```
(depois `git checkout main` pra voltar)

**Referência visual:** `docs/pagina-atual-referencia-2026-07-24.png` (print de tela real, tirado direto do site publicado, da época em que este era o modelo oficial)

**O que este modelo tem:**
- Container responsivo 520px (mobile) / 1100px (desktop), classe `.mem-container`
- Hero em coluna no mobile, foto+texto lado a lado no desktop, classe `.mem-hero`
- Seções na ordem: Hero → Faixa de presença viva → Biografia → Vídeo (se tiver) → Timeline → Galeria → Mural de memórias → Como Chegar (se tiver) → Condolências → Acender uma vela → Rodapé
- **Achado 2026-08-27, nunca corrigido aqui:** o seletor de tema (3 bolinhas) não funciona nesta página — o container redeclara as variáveis CSS do tema inline nele mesmo, o que tapa o que o `SeletorTema.tsx` escreve na raiz do documento. Confirmado em produção (clique não muda o fundo). Corrigido só na página oficial nova (Modelo 1) — não corrigido aqui de propósito, por ser página preservada/congelada.

---

## Modelo 2 — Vela (`AcenderVela.tsx`)

**Virada 2026-08-26/27:** migração do protótipo aprovado pelo Rafael (`Desktop\Cerebro Claude - Legado Digital\prototipo-parede-velas\`). A vela principal deixou de ser CSS puro e virou castiçal de bronze em canvas; a parede de 45 quadrados CSS virou mural de 35 velas votivas em canvas com fundo fotográfico. **Componente compartilhado** — usado tanto pela página oficial nova quanto pela clássica preservada, então a mudança aparece nas duas.

**Arquivos:** `components/public/AcenderVela.tsx` (orquestra clique/estado/RPC) + `components/public/MuralVelasVotivas.tsx` (parede) + `components/public/VelaPrincipalCastical.tsx` (vela principal) + `components/public/ChamaVoadora.tsx` (chama em trânsito) + `lib/muralVelas.ts` + `lib/velaPrincipalCastical.ts` + `lib/chamaAlfa.ts` (geometria e sprite compartilhadas) + trecho `.vela-voo`/`.mural-velas-votivas`/`@keyframes vela-*` de `app/globals.css`.

**Status:** estrutura e posição travadas de novo, agora nesta versão. Se uma página nova for criada, essa seção entra **idêntica**, componente reaproveitado sem alteração nenhuma.

**Ponto de restauração no git (versão CSS antiga, pré-migração):**
```bash
git checkout homenagem-modelo-base-2026-07-24 -- components/public/AcenderVela.tsx app/globals.css
```

**Comportamento (não mudar sem pedido):**
- Vela principal (castiçal de bronze com cera escorrendo, desenhado em canvas) fica apagada por padrão, acende com rampa suave de 220ms só no clique
- Ao clicar: chama nasce no pavio (`VelaPrincipalCastical.obterPosicaoDoPavio`, exposto via `useImperativeHandle`), **voa** até o próximo slot vago da parede (posição calculada por `MuralVelasVotivas.obterPosicaoDoSlot`, mesma geometria pura de `lib/muralVelas.ts` usada pro desenho — as duas contas não podem divergir), acende a vela lá com pulso de luz, principal apaga de novo
- A chama em trânsito (`ChamaVoadora.tsx`) usa a mesma sprite real da parede e do castiçal — não o teardrop CSS antigo — pra não trocar de formato no ar. Posição ainda animada por transição CSS (`.vela-voo`), só o desenho interno mudou
- **35 velas na parede (5 fileiras × 7 colunas), não 45** — ordem de acendimento embaralhada pela parede com seed fixa `20260825` (`lib/muralVelas.ts`), não enche da esquerda pra direita como barra de progresso
- **Sem limite de cliques** — cada clique conta de verdade (RPC `acender_vela`), pode acender quantas vezes quiser. **Não existe anti-spam via `localStorage`** — a menção antiga nesta linha estava errada, corrigida 2026-08-26 depois de ler o código de verdade
- Quando os 35 slots da parede enchem, ela **apaga toda e recomeça do zero** no próximo clique (loop contínuo, mesmo padrão de antes)
- Botão sempre mostra "ACENDER UMA VELA" (não troca de texto depois de clicar)

---

**Última atualização:** 2026-08-27
