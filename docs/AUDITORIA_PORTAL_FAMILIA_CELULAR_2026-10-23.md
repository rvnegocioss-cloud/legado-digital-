# Auditoria: Portal da Família no celular (2026-10-23)

Nada foi alterado em app/, components/, lib/ ou banco. Só leitura de código + renderização real.

## Como foi testado
- Chrome (Playwright) carregando a página de PRODUÇÃO `/familia/<slug-de-teste>` (código local = origin/main, sem diferença). TODAS as chamadas `/api/*` foram interceptadas no navegador de teste e respondidas com dados fictícios (Maria Lígia da Cunha Machado, 3 eventos de linha do tempo, galeria vazia, jazigo com 2 gavetas, 2 parentes). Qualquer escrita (POST/DELETE) foi respondida com erro de teste: nada chegou ao servidor ou ao banco. Sessão/cookie não foi necessário porque a validação é feita só na API (interceptada).
- Viewports: 360x640, 390x844 (touch, user agent iPhone), 768x1024, 1440x900. Screenshots em `Desktop\LEGADO DIGITAL - Geral\memoriais publicos\portal-familia-celular\` (6 abas x 4 tamanhos, mais dica aberta, upload recusado e simulação de teclado).
- Foto: `setInputFiles` com imagem de teste; o código sobe o arquivo NA HORA da escolha (não existe tela de pré-visualização antes), então a chamada de preparação foi recusada pelo mock e nada foi enviado.

## Notas
- Responsivo: **7/10**. Sem overflow horizontal em nenhuma aba/tamanho (única exceção: 1 px na aba Privacidade a 360, scrollW 361). Grid colapsa em 1 coluna, nada cortado fora da tela. Perde ponto por campos espremidos e abas em 2 linhas.
- Fácil de preencher no celular: **4/10**. Campos com fonte pequena (zoom no iPhone), alvos de toque pequenos, botões de remover foto invisíveis em toque, ajuda por toque quebrada, salvar longe.

## Problemas (prioridade)

### Alta
1. **Remover foto/vídeo da galeria é invisível no celular.** `app/familia/[slug]/page.tsx:1075` e `:1245`: botão "×" com `opacity-0 group-hover:opacity-100` e 20x20 px. Em toque não existe hover, então a família não consegue remover (e se tocar no lugar certo, é alvo minúsculo). Correção: sempre visível, mínimo 44x44 (área de toque), fundo contrastante.
2. **Fonte dos campos < 16 px: o iPhone dá zoom ao focar.** Medido: 17 campos na aba Memoriais, 4 na Árvore, 1 na Privacidade, todos 14 px (`text-sm`). Linhas: page.tsx:865, 879, 891, 901, 916, 925, 935; `ArvoreDaFamilia.tsx:175, 188, 210, 223, 240, 257`; `JazigoDaFamilia.tsx:144, 164`; `TimelineEditor.tsx:64, 77, 119`; `VinculosEditor.tsx:60`. Correção: `text-base` (16 px) em telas < md (ex.: `text-base md:text-sm`), ou regra global `input,select,textarea{font-size:16px}` em mobile.
3. **Linha do tempo: o campo "Título do evento" fica com ~30 px de largura a 360 e 390 px** (só aparece "Na", "Ca", "Ap"). `components/admin/TimelineEditor.tsx:53-106`: ano (w-20) + título (flex-1) + botões subir/descer/remover na mesma linha. Correção: em mobile empilhar (ano e botões numa linha, título em linha própria, largura total).
4. **Ajuda por toque (Modo ajuda) não abre.** `components/familia/ModoAjuda.tsx:66-84`: o toque dispara `onMouseEnter` (abre) e logo depois o `onClick` (alterna, fecha); no teste de toque o balão ficou fechado (tooltip não apareceu). Além disso o botão "?" tem 15x15 px. Correção: remover os handlers de mouse em dispositivos de toque (ou só `onClick` + fechar ao tocar fora) e área de toque de 44 px.

### Média
5. **Datas como texto livre e inconsistentes.** `page.tsx:886-902`: `type="text"` com placeholder `DD/MM/AAAA`, mas o dado vem do banco em ISO (`1938-03-12`, visto na tela). Sem `inputMode`, sem máscara, sem validação; a família pode digitar qualquer coisa. Correção: `type="date"` (teclado/seletor nativo) ou texto com `inputMode="numeric"` + máscara e conversão.
6. **Botão "Salvar alterações" longe e não fixo.** `page.tsx:979-985`: a 360 px fica a ~1750 px de 2350 de altura da aba Memoriais (precisa rolar 3 telas depois de editar o topo). O auto-save mitiga, mas o rótulo diz "Salvar". Correção: barra inferior fixa com estado ("Salvo às 10:32") ou botão fixo; cuidar de `env(safe-area-inset-bottom)`. Teclado: no teste (viewport -300 px) o campo focado fica visível, mas o botão não aparece junto.
7. **Upload sem pré-visualização nem progresso.** `page.tsx:1038-1045, 1052-1058, 1083-1090, 1253-1260` e `subirArquivoFamilia` (linhas 69-99): sobe na hora da escolha, só mostra o texto "Enviando foto..." (sem barra, sem % mesmo para vídeos de até 100 MB em 4G). Arquivos múltiplos sobem um por vez (sequencial) sem indicar "2 de 4". Correção: miniatura + barra de progresso (XHR/`uploadToSignedUrl` não expõe progresso; usar `XMLHttpRequest` na URL assinada) + contador.
8. **Inputs de arquivo nativos pequenos (28 px de altura, `file:text-xs`).** Mesmas linhas do item 7. Sem `capture` (iOS/Android já oferecem câmera com `accept="image/*"`, mas não há botão claro "Tirar foto"). Correção: botão grande (44 px+) "Escolher da galeria" e "Tirar foto".
9. **Alvos de toque < 44 px em geral.** Medido a 360 px: 50 elementos na aba Memoriais, ~13-20 nas demais. Principais: abas (altura ~38 px, `page.tsx:756`), "Voltar pro site", "Sair", "Ver página →", "Modo ajuda", sugestões de vínculo (`VinculosEditor`), mover/remover evento da linha do tempo (`TimelineEditor.tsx:86,95,103`, 24x24), bolinhas de tema/cor (32x32, `page.tsx:1152, 1222`), lixeira da árvore (`ArvoreDaFamilia.tsx:153`), "remover" assinatura (`page.tsx:1311`, texto de 12 px), checkboxes 16 px (`PrivacidadeFamilia.tsx:94-102`, `FotoLapideFamilia.tsx:71`), chave de laterais 44x24.
10. **Abas quebram em 2 linhas e não rolam** (`page.tsx:743-765`, `flex-wrap`): "Memoriais · Fotos e vídeos · Jazigo" em cima, o resto embaixo; a aba ativa muda de linha de lugar ao clicar. Correção: uma linha com rolagem horizontal (`overflow-x-auto`, sem quebrar) ou menu inferior.

### Baixa
11. Frase preferida e Cidade lado a lado a 360 px (`page.tsx:909-928`): frase cortada ("Quem ama nunc"). Empilhar em < sm. Idem "Ano de falecimento" na árvore (placeholder cortado).
12. 1 px de overflow horizontal na aba Privacidade a 360 px.
13. Cabeçalho ocupa ~230 px antes do conteúdo (logo, voltar, modo ajuda, sair, título, abas): no 360x640 o primeiro campo só aparece depois de rolar.
14. Textos auxiliares de 10-11 px (`text-[10px]`, `text-[11px]`: jazigo, árvore, gavetas) e `text-zinc-500` sobre fundo escuro: contraste/legibilidade baixos.
15. Cada aba mantém as outras montadas com `hidden` (`page.tsx:803-1291`): sem problema de layout, mas a página carrega tudo de uma vez (peso/memória em aparelho fraco).
16. Árvore na portal é só lista + formulário (o desenho da árvore está na página pública); jazigo/gavetas usam grid de 2 colunas e funcionam bem a 360 px (nomes longos quebram em 3 linhas).

## O que está bom
Labels sempre acima dos campos; limites visíveis nos rótulos (galeria 0/4, máx 10 MB/50 MB/100 MB); upload em 2 etapas com URL assinada (arquivo não passa pelo Next); mensagem de erro de upload legível (visto no teste); `inputMode="numeric"` nos anos da árvore; auto-save com rascunho local; botões principais com largura total na árvore.

## Não deu para testar
- Teclado virtual real (só simulado reduzindo a altura da janela; iOS Safari real não foi usado, só emulação Chrome com user agent iPhone).
- Upload real até o fim, progresso real, galeria/foto com itens (galeria vazia no mock) e vídeo grande.
- Sessão/login reais e comportamento do cookie no celular.
- Telefone/e-mail/autocomplete: a tela da família não tem campos de e-mail/telefone (só a tela de login, não auditada em render).
