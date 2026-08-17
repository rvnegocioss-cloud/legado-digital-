# Mapeamento de Cemitério — Ortomosaico + Endereçamento de Túmulo

> Anexo técnico vivo. **Atualizar toda vez que essa tecnologia mudar** (nova função, novo bug corrigido, nova quadra mapeada, novo cemitério) — regra do Rafael, 2026-08-05. Detalhe do "como/por quê" fica aqui; o `CLAUDE.md` só linka pra cá.

## O que é / por que existe

Cemitério mapeado por drone (ortomosaico real, foto vista de cima). **Achado confirmado tecnicamente**: foto de drone é nadir (reto de cima) — não dá pra ler nome gravado na face vertical da lápide, por mais nítida que a imagem seja. Verificado abrindo os 6 arquivos brutos do voo (2 GeoPackage, 2 KMZ, 2 zip): todos são só raster de cima, nenhum tem malha 3D nem foto oblíqua. Isso é limitação física da captura, não do formato de arquivo — só mudaria se o drone voasse com câmera inclinada (não reto pra baixo), que é um tipo de voo diferente do de mapeamento.

**Solução**: sistema de endereçamento próprio, independente de nome — geometria em vez de leitura de texto. Cada túmulo ganha um código único (`Q01-R05-T012` = Quadra 1, Rua 5, Túmulo 12) com coordenada real, gerado a partir de pouquíssimo clique humano (contorno da quadra + início/fim de cada fileira) em vez de marcar túmulo por túmulo um a um. Nome vem depois, separado (vistoria de campo com foto de perto, ou a família informa ao cadastrar o memorial) — não trava o endereçamento.

## Arquitetura

**Banco (Supabase, migrations `20260805_quadras_filas_numeracao.sql` + `20260805_rpcs_numeracao_lapides.sql`):**
- `quadras` (id, cemiterio_id, numero, nome, poligono jsonb GeoJSON Polygon, centro_lat/lng, distancia_entrada_m, situacao, numeracao_origem)
- `filas` (id, quadra_id, cemiterio_id, numero, eixo jsonb GeoJSON LineString, comprimento_m, quantidade_prevista, distancia_entrada_m)
- `lapides` ganhou `quadra_id`, `fila_id`, `numero`, `codigo`, `codigo_anterior`, `coordenada_precisao` ('exata'|'interpolada'), `situacao` ('nao_confirmada'|'confirmada'|'vaga'|'removida'), `foto_face_url` (gancho pra fase de nomes, ainda não usado)
- `cemiterios` ganhou `entrada_latitude`/`entrada_longitude` (marcado manualmente pela Central) + `rotulo_quadra`/`rotulo_fila`/`rotulo_tumulo` (texto configurável por cemitério, ex: "Rua" vs "Fileira")
- RPCs staff-only (`is_legado_staff()`): `gerar_lapides_fila` (motor — dado o eixo de uma fila e uma quantidade N, interpola N túmulos igualmente espaçados numa transação só), `propor_numeracao_quadras`/`aplicar_numeracao_quadras` + versão de filas (numera por distância até a entrada, com trava: recodificar túmulo já vinculado a memorial exige confirmação explícita), `obter_geojson_cemiterio` (devolve quadras+filas+túmulos numa chamada só, evita o teto de 1000 linhas do PostgREST que um select paginado bateria com milhares de túmulos), `recalcular_distancias_entrada`, helpers puros (`distancia_metros`, `montar_codigo_tumulo`, `ponto_na_polilinha`, `comprimento_polilinha`).

**UI de Central** (`/admin/cemiterios/[id]/mapa`, `components/admin/MapaCemiterio.tsx`): botão "Marcar entrada do cemitério" (clique na imagem); desenho de quadra (polígono) e fila (linha, 2+ pontos) via primitiva própria `useDesenhoNoMapa` (`components/admin/mapa/useDesenhoNoMapa.ts` — ponto/linha/polígono, sem lib externa tipo mapbox-gl-draw); diálogo "Gerar túmulos" com preview ao vivo + aviso de espaçamento estranho; numeração de quadra/fila proposta por distância da entrada, com confirmação; painel lateral em árvore Quadra→Rua com pendências (quadra sem rua, rua sem túmulo).

**Pipeline Python de reconhecimento por visão** (`scripts/ortomosaico/mapear-cemiterio.py` + `lib_malha.py`) — usado pelo agente de IA (Claude) pra identificar quadra/fileira sozinho, sem staff clicar em nada além de revisar. Subcomandos:
- `mapa` — reconhecimento global (textura + componentes conexos), gera imagem com candidatos de quadra rotulados (A, B, C...) + `candidatos.json`
- `recorte` — extrai recorte retificado (rotacionado, régua em metros na margem) via `WarpedVRT` com Affine explícita — mesma técnica já testada em `converter-ortomosaico.py`. Dois níveis: Tier A (~5cm/px, 70x70m, reconhecimento) e Tier B (nativo ~2,2cm/px, ~20x20m, calibração/conferência)
- `quadra` — dado o polígono da quadra (marcado pelo agente sobre um recorte), detecta ângulo+espaçamento da malha via **FFT 2D + voto por sub-janela** (não é 1D — colapsar em 1 dimensão perde informação demais numa quadra heterogênea, já tentado e descartado), propõe o "pente" de fileiras
- `filas` — aplica a revisão do agente (remove/ajusta linha, digita contagem visual por fileira), cruza contagem matemática (`N = round(comprimento/pitch) + 1`) com a visual — diverge mais que 1, vira pendência, nunca força número
- `gravar` — gera o SQL/JSON pro agente aplicar via Supabase MCP (o script nunca fala direto com o banco)
- `verificar` — desenha o que **está gravado no banco** (não o que foi decidido) por cima da imagem original, pra pegar erro de conversão/sinal antes de confiar

`lib_malha.py` trabalha inteiro em metros no CRS métrico nativo do raster (EPSG:31982 no José Lázaro) — conversão pra WGS84 (lng/lat) só no último passo, antes de gravar.

## Bugs reais achados e corrigidos (2026-08-05, testados no dado real, não no papel)

1. **`pico_autocorr` grudava na borda da busca** — `argmax` numa autocorrelação monotônica decrescente sempre devolve o primeiro índice, e o código tratava isso como pico de verdade. Corrigido: `find_peaks` com prominência, devolve `(0, 0.0)` honesto quando não há pico — falha visível é melhor que número inventado.
2. **Detecção de ângulo 1D era ruído puro** — deslocar a janela de busca em 3m trocava o ângulo detectado de -1,5° pra +23,5° no mesmo lugar real. Substituído por FFT 2D + votação entre sub-janelas de 30m dentro do polígono (função `achar_malha`), que sobrevive à heterogeneidade da quadra.
3. **Sinal do ângulo invertido** — `atan2(fy, fx)` no espectro 2D tratava o eixo-linha do array (que aumenta pra SUL, convenção de imagem) como se fosse um y-pra-cima matemático padrão. Confirmado empiricamente comparando dois recortes retificados (+15° vs -15°: um deixava as fileiras retas, o outro piorava) contra o valor cru calculado. Fix: negar `fy` antes do `atan2`.
4. **Fileira e corredor trocados na geração do "pente"** — `_gerar_pente` gerava linhas horizontais espaçadas verticalmente quando a fileira real de túmulo é vertical (perpendicular ao corredor entre colunas). Corrigido invertendo qual eixo (`eu`/`ev`) é "ao longo" vs "entre fileiras".

Todos os 4 corrigidos direto no código genérico (não hardcoded pro José Lázaro) — valem pra qualquer cemitério mapeado depois.

## Status atual

**José Lázaro (Tupaciguara/MG)**: `Quadra 1` (bloco "F" do reconhecimento global) no banco, mas **maioria das fileiras geradas automaticamente foram apagadas** depois do bug grave abaixo ser confirmado (Filas 1-9, depois Fila 10, depois a fileira de teste que tinha ficado certa também — a pedido direto do Rafael, motivo não detalhado). Sobra hoje: **Fila 11** (revisada/travada na mão pelo Rafael, correta) + fileiras que o Rafael for desenhando manualmente agora (ex: "Fileira 13" em andamento). As 186 túmulos do texto antigo abaixo **não refletem mais o estado real do banco** — ver bug grave.

Reconhecimento global (`mapa`) achou **12 candidatos** no total (`A` a `L`) — descontando pomar/telhado/área de expansão vazia, restam ~7-8 quadras reais ainda não mapeadas.

**Entrada do cemitério**: ainda não marcada pelo Rafael (pendente, ele faz pela Central).

**Lápide de teste antiga** (`Q-03 L-15`, memorial fictício "José Antônio da Silva") confirmada a ~58m da quadra piloto — não colide, não precisa fundir.

## Modo edição manual (pronto, 2026-08-05)

Motivo: pontos gerados por interpolação matemática não caem 100% em cima do túmulo real (a IA não é detector de objeto treinado, erra alguns metros/posição em fileira irregular). Rafael enxerga no mapa onde o ponto não bate — precisa poder corrigir na hora, sem depender de reprocessar tudo.

**Schema**: `quadras.geometria_revisada boolean default false` (migration `20260805_quadra_geometria_revisada.sql`) — trava por quadra, diferente de `lapides.situacao='confirmada'` (que é por-túmulo, vem da vistoria de campo, etapa separada). `obter_geojson_cemiterio` passou a devolver `geometria_revisada` nas properties de cada quadra.

**Fluxo** (`components/admin/MapaCemiterio.tsx`): dentro de cada quadra expandida na árvore lateral, botão **"Editar túmulos no mapa"** (some se a quadra já tiver `geometria_revisada=true`, vira "🔒 Travada — destravar"). Ao entrar no modo:
- Os túmulos daquela quadra saem da camada GeoJSON de milhares de pontos (`geojsonPinos` filtra por `idsEdicao`) e viram `Marker` individual grande (26px), numerado, **arrastável** (`draggable` + `onDragEnd` salva direto no banco: `latitude`/`longitude`/`coordenada_origem='ortomosaico'`/`coordenada_precisao='exata'`)
- Clique numa bolinha abre popup com código + botão "Apagar túmulo" (bloqueado se `tem_memorial`, mesma trava de sempre)
- Botão "Adicionar túmulo" liga um modo de clique: clica em qualquer ponto do mapa → acha a fila mais próxima daquela quadra (distância ponto-segmento até o eixo de cada fila) → cria o túmulo vinculado a ela, número = `max(existentes na fila) + 1`, código gerado no mesmo padrão (`Q01-R05-T012`)
- Botão "🔒 Travar quadra" grava `geometria_revisada=true` e sai do modo — impede edição acidental depois. "Destravar" reabre.

**Decisão consciente, não implementada**: apagar túmulo não renumera os que ficaram depois dele (deixa buraco na sequência, ex: sumiu o T005) — renumerar em cascata durante uma sessão de arrastar é risco de mexer em código já usado por memorial vinculado em outra fila sem querer; buraco na numeração é informação (curioso, não quebrado), fica pra revisão futura se incomodar na prática.

**Identificação visual de fileira por cor** (mesmo dia, pedido do Rafael) — bandeira colorida + rótulo "R{numero}" no início de cada fila no mapa, e bolinha da mesma cor ao lado de "Rua N" no painel lateral (`corDaFila`, paleta de 12 cores cíclica por `numero`). Só aparece pras filas da(s) quadra(s) expandida(s) na árvore ou em edição (`quadrasComBandeiraDeFila`) — evita poluir o mapa com bandeira de toda fila do cemitério de uma vez.

**Correção do popup grudado** — a mudança de ontem (`closeOnClick={false}`) resolveu o insert-no-meio mas travava a tela (popup nunca fechava sozinho, ficava lento gerar pino). Fix certo: separar dois estados -- `tumuloSelecionadoEdicao` (só controla se o popup do túmulo tá visível, fecha normal ao clicar no mapa) e `referenciaInsercao` (persiste independente do popup, é o que "Adicionar túmulo" usa pra saber onde inserir). Clicar numa bolinha seta os dois; o popup fecha sozinho de novo, a referência continua guardada até trocar de bolinha, sair do modo adicionar, ou sair da edição.

**Inserir túmulo no meio da sequência** (mesmo dia, pedido do Rafael) — "Adicionar túmulo" sempre acrescentava no fim da fila (número = máximo existente + 1), inútil pra quando falta um no MEIO de uma fileira já gerada (ex: voltar no começo pra corrigir um que passou batido). Agora: clica na bolinha do túmulo anterior ao que falta (seleciona, sem apagar) → liga "Adicionar túmulo" → clica no mapa → insere como `referencia.numero + 1`, empurrando +1 todos os que vinham depois dele na mesma fila (renumerando `numero`/`codigo`/`identificacao`/`lote` de cada um, do maior pro menor pra não colidir com a constraint de único). Bloqueado se algum dos empurrados já tem memorial vinculado (não desloca código já usado por família) ou se a fila tá travada. Sem bolinha selecionada, cai no comportamento antigo (acrescenta no fim da fila mais próxima do clique).

**Arrastar borda da quadra** (mesmo dia, pedido do Rafael) — modo edição também mostra os cantos do contorno da quadra como losango ciano (`#22d3ee`, formato diferente + cor diferente do túmulo dourado, pra não confundir). Arrasta e salva direto em `quadras.poligono` (mesma técnica dos túmulos, sem redesenhar do zero — decisão dele: "não quero do zero, só ajuste"). Índice 0 e o último ponto do anel GeoJSON são o mesmo vértice (polígono fechado) — arrastar um sincroniza o outro automaticamente, senão o contorno abriria uma fresta.

**Trava por fileira** (pedido do Rafael, mesmo dia) — travar só a quadra inteira no final era arriscado ("perigoso perder trabalho" se algo desse errado no meio). Agora trava granular: `filas.geometria_revisada` (mesmo padrão de `quadras.geometria_revisada`). Fluxo real: revisa/arrasta a fila 1, clica "🔒 Travar" nela, passa pra fila 2, repete até a quadra inteira — só trava a quadra inteira (`geometria_revisada` de `quadras`) depois de todas as filas fechadas, se quiser. Trava de fila bloqueia de verdade (não só visual): `arrastarTumulo`/`apagarTumulo` recusam se a fila do túmulo tá travada, `adicionarTumulo` só considera fila **não travada** ao achar "a mais próxima", pino fica com `draggable=false` + opacidade menor + cursor `not-allowed`. Botão "Regerar túmulos" some quando a fila já tá travada (evita apagar+recriar tudo por engano em cima do que já foi ajustado na mão).

## Bug grave — fileira gerada caindo em cima do caminho, não do túmulo real (2026-08-05/06)

Achado visual do Rafael ("sua marcacao esta errada muito mesmo... vc ta pegando dois tumulos ocomo se fosse um") depois de gerar Filas 1-9 com pitch "calibrado" de 2,32m. Chamado Opus pra diagnóstico profundo (`subagent_type:"Plan"`, model `opus`, regra do projeto). Causa raiz, 3 problemas empilhados em `lib_malha.py`/`mapear-cemiterio.py`:

1. **Teto de busca de espaçamento baixo demais** — `achar_malha` buscava pitch só entre 0,7m e 6,0m; o pitch real da quadra é ~7,30m (perpendicular às fileiras), **fora da janela de busca inteira**. Corrigido: `faixa_pitch=(0.9, 12.0)`.
2. **Remoção de harmônico apaga o fundamental verdadeiro** — `_agrupar_remover_harmonicos` (heurística pra descartar picos múltiplos do espectro FFT) tem bug que pode remover o pico correto em vez do harmônico espúrio. **Ainda não corrigido no código genérico.**
3. **Fase nunca é calculada** — FFT (autocorrelação ou 2D) só descobre o *espaçamento* do padrão, nunca **onde ele começa**. `_gerar_pente` usava `v = v_min + pitch_perp / 2` — um valor que só depende de onde o polígono foi clicado, zero correlação com a imagem real. Era a causa principal do desalinhamento. **Ainda não corrigido no código genérico** (`mapear-cemiterio.py` não tem `--ancora`/`--ancora2` ainda).

Tentativa de autocorreção por textura (escolher a fase que maximiza contraste de textura ao longo do perfil perpendicular) foi testada pelo Opus e **descartada** — em ~2,2cm/px o caminho entre fileiras às vezes pontua melhor que a fileira de túmulo de verdade, gerando o mesmo erro por outro caminho.

**Único caminho validado até agora**: âncora manual — 2 pontos reais verificados a olho (ex: centro do túmulo 1 e do túmulo N de uma fileira certa) definem pitch e fase exatos por cálculo direto, sem depender de detecção nenhuma. Testado uma vez (fileira de teste com 44 pontos, todos batendo com a imagem real, QA visual conferido) via script Python avulso — **não foi integrado como comando reutilizável no `mapear-cemiterio.py` ainda**, e essa fileira de teste foi apagada depois a pedido do Rafael junto com o resto.

## Rua → Fileira (rename, 2026-08-05)

Rafael: "isso nao e rua e uma fileira muda o nome". Renomeado em toda a UI (`MapaCemiterio.tsx`) via troca segura por palavra-inteira (preservando maiúscula/minúscula) — variável/coluna de banco (`filas`) não mudou, só texto visível e rótulo da bandeira (`R{numero}` → `F{numero}`, um rótulo tinha ficado pra trás no primeiro commit do rename, corrigido depois que o Rafael reportou "erro" na bandeira de fileira nova).

## Apagar fileira inteira

Botão "Apagar" na fileira, dentro do painel de edição — bloqueado se qualquer túmulo dela já tiver memorial vinculado (mesma trava de sempre), senão apaga túmulos + a fileira numa tacada (`apagarFileira`, `MapaCemiterio.tsx`). Usado pra descartar as fileiras 1-10 (e a 12 de teste) depois do bug grave acima — regenerar por cima não bastava porque tanto o eixo quanto a fase estavam errados, não dava pra só deslocar.

## Arrastar ponta da fileira (2026-08-06)

Rafael, testando o "Gerar túmulos" numa fileira nova (Fileira 3): "a distancia entre os tumulos nao e a mesma entao do inicio da fileira ate o final nao encaixa". A interpolação uniforme em si estava certa — o problema é que o comprimento real do `eixo` (linha desenhada à mão) quase nunca bate exatamente com a distância real entre o primeiro e o último túmulo, e esse erro pequeno vira desvio progressivo ponto a ponto até o fim da fileira.

Fix (parte 1): enquanto o diálogo "Gerar túmulos" está aberto, as duas pontas do `eixo` da fileira (`filas.eixo`, LineString) viram `Marker` arrastável (quadrado laranja, `arrastarPontaFileira` grava direto em `filas.eixo` a cada solta) — dá pra encaixar cada ponta exatamente no centro do primeiro/último túmulo real antes de gerar. O comprimento e o aviso de espaçamento mostrados no diálogo (`comprimentoAoVivo`, via `comprimentoPolilinha`) agora recalculam a cada arrasto em vez de ficar travado no valor de quando o diálogo abriu.

Rafael testou e não bastou — fileira real raramente é perfeitamente reta/uniforme, então só corrigir as 2 pontas ainda deixa os túmulos do meio desencaixados ("quero arrastar as pre marcaçoes dos tumulos que vao ser gerados pra se encaixarem direito"). **Fix (parte 2)**: cada ponto pré-marcado do preview (antes só um `Layer` GeoJSON não-interativo) virou `Marker` arrastável individual — bolinha verde, fica amarela quando ajustada na mão (`ajustesPreview`, estado `Record<índice, [lng,lat]>`). Geração deixou de usar a RPC de interpolação automática (`gerar_lapides_fila`, que só sabe pitch uniforme a partir do eixo) e passou a chamar `gerar_lapides_fila_manual` (nova RPC) — recebe o array de pontos já na posição final, grava `numero`/`codigo` na ordem 1..N da fileira e marca `coordenada_precisao='exata'` só nos pontos que o Rafael de fato tocou, `'interpolada'` no resto.

Ainda não bastou — gerar a fileira inteira numa tacada só obriga acertar dezenas de pontos ao mesmo tempo antes de poder salvar qualquer coisa. **Fix (parte 3, geração em lotes continuados)**: `gerar_lapides_fila_manual` mudou de "bloqueia se já existe túmulo na fila" pra "soma no final" quando `p_substituir=false` (padrão) — `numero` do lote novo começa do maior `numero` já salvo + 1, em vez de exigir a fila vazia. Fluxo real: digita a quantidade do lote (ex: 10), ajusta as bolinhas, clica "Gerar" — fica salvo no banco de verdade — clica "Gerar mais" de novo pra continuar de onde parou. O espaçamento do lote novo não vem mais do comprimento total do eixo dividido pela quantidade: é a **distância real medida** entre os túmulos já salvos da fila (`gerarPontosContinuacao`, `lib/enderecoTumulo.ts` — média das distâncias consecutivas quando tem 2+ confirmados). Sem histórico ainda (fila vazia ou só 1 túmulo), o primeiro lote usa um chute que o staff corrige arrastando — só o 1º lote depende do chute, os seguintes já usam medida real.

**Bug real do chute, achado na hora pelo Rafael** ("gera os 5 espalhados... estica os tumulos ate o final dela"): a primeira versão calculava `pitch = resto_do_eixo / quantidade` — pra um eixo de 30m com lote de 5, virava 6m entre cada um, espalhando o lote pela fileira inteira em vez de nascer grudado no início. Corrigido: chute deixou de depender do comprimento restante e virou constante fixa (`PITCH_PADRAO_M = 1.6`, `lib/enderecoTumulo.ts`) baseada na faixa real já medida no José Lázaro (~1,5-1,66m ao longo da fileira) — lote novo nasce grudado logo após o último confirmado (ou a ponta da fileira), só precisa abrir/ajustar, nunca puxar de volta um espalhamento artificial.

**Fix (parte 4, "Preencher resto")** — mesmo com lote continuado, repetir "gera 5, ajusta, salva" até o fim de uma fileira de 30-40 túmulos ainda era repetitivo demais ("nao e produtivo... tinha que ter um jeito eu medir os primeiros 5 e baseado nisso ser feito o resto"). `medirContinuacao()` (novo, separado de `gerarPontosContinuacao`) calcula pitch + distância restante independente de quantidade digitada — permite mostrar "restam ~N túmulos" e um botão **"Preencher resto (~N)"** assim que a fileira tem 2+ túmulos confirmados (pitch real medido, não mais o chute de 1,6m). Um clique preenche o campo de quantidade com a estimativa pra cobrir o resto inteiro da fileira nesse espaçamento; "Gerar" fecha tudo de uma vez (as bolinhas continuam arrastáveis uma a uma se algum ponto não bater antes de confirmar). Fluxo completo agora: gera um lote pequeno (3-5) pra calibrar → ajusta na mão → "Gerar" (salva) → "Preencher resto" → confere/ajusta o que sobrar → "Gerar" de novo, fim da fileira em 2 rodadas em vez de 6-8.

**Medida ao vivo tipo trena ao desenhar a fileira** (mesmo pedido, "nao tem como colocar em metros la quando faz a fileira... como se fosse uma trena") — a barra de desenho da fileira (clique no início + clique no fim) agora mostra o comprimento acumulado em metros a cada ponto clicado, direto na `BarraDesenho`, sem precisar concluir o desenho pra saber o tamanho.

## Fix de layout — mapa saía da tela (2026-08-06)

Achado real do Rafael: painel lateral crescia bem mais alto que o mapa (fixo em 560px), então a página inteira rolava — e o card "Gerar túmulos", o mais usado no fluxo de mapeamento, ficava lá embaixo depois de toda a árvore de quadras. Abrir esse card rolava o mapa pra fora da tela, obrigando alternar rolagem pra cima/baixo o tempo todo pra ver o mapa e editar ao mesmo tempo.

Corrigido: coluna do mapa (`lg:col-span-8`) ganhou `lg:sticky lg:top-4 lg:self-start` — fica fixa na tela enquanto o painel lateral (`lg:col-span-4`) rola por baixo dela, dentro do `<main overflow-y-auto>` do layout da Central (que já é o scroll container real, não a janela). Mapa também cresceu de 560px fixo pra `calc(100vh - 140px)` (regra 13 do CLAUDE.md, tela larga aproveitada). O card "Gerar túmulos" (`dialogoFila`) saiu do meio do painel (depois da árvore de quadras) e foi pro topo, logo abaixo da mensagem de status — aparece na hora ao clicar "Gerar túmulos"/"Gerar mais", sem precisar rolar pra achar. Diálogo mostra quantos já estão confirmados e quantos metros/túmulos restam até o fim da fileira, pra saber a quantidade certa do último lote (ex: "restam 3"). `p_substituir=true` continua existindo (apaga tudo e recomeça do zero), só não é mais o padrão. Botão mudou de rótulo: "Regerar" virou "Gerar mais".

## Bug grave 2 — "Gerar mais" sobrepondo túmulos já organizados (2026-08-07, diagnóstico com Opus)

Rafael reportou dois sintomas juntos: o espaçamento do lote novo não replicava o real medido nos anteriores, e os pontos novos nasciam em cima dos que ele já tinha arrastado/organizado. Chamado Opus (`subagent_type:"Plan"`, model `opus`) pra investigar com dado real — reproduziu e provou matematicamente a partir dos pontos que o Rafael de fato gerou.

**Causa raiz confirmada** (não teoria — reconstruída com os timestamps reais do banco): o "último túmulo confirmado" usado pra continuar a fileira vinha do state global `lapides`, atualizado só por `carregar()`. As 4 mutações do modo de edição (`arrastarTumulo`/`adicionarTumulo`/`inserirTumuloDepoisDe`/`apagarTumulo`) escrevem no banco e num state local separado (`lapidesEdicao`), **sem nunca chamar `carregar()`**. Resultado: ao clicar "Gerar mais" depois de arrastar pontos no modo de edição, o cálculo de distância/posição de partida usava as coordenadas de **antes** do arrasto. No caso real: o lote novo nasceu 7,4m atrás da frente real da fileira, direto em cima de 3 túmulos que o Rafael já tinha organizado na mão.

**Fix**:
- Diálogo "Gerar túmulos" busca os túmulos da fileira **direto do banco** ao abrir (não mais do state global, que pode estar desatualizado) — com guarda pra não calcular nada enquanto o fetch não volta.
- `lib/geo.ts` ganhou `projetarLocal`/`deMetrosLocal` — cálculo de direção/distância passa a rodar num plano local em metros, não mais em graus crus (1° de longitude ≠ 1° de latitude em metros; só funcionava por coincidência quando o deslocamento era colinear ao eixo).
- `lib/enderecoTumulo.ts`: o "último confirmado" deixou de ser o de maior `numero` (frágil — inserção no meio ou arrasto fora de ordem quebra essa suposição) e passou a ser achado por **projeção espacial real** (o mais avançado na direção da fileira, independente de `numero`). Direção usa a tendência real entre 1º e último confirmado, caindo pro eixo desenhado só com pouco histórico ou se a tendência apontar pro lado errado (proteção contra eixo desenhado ao contrário). Espaçamento passou de média pra **mediana** dos vãos (resistente a 1 vão ruim), descartando vãos < 0,3m (ponto duplicado/arrasto em cima).
- **Rede de segurança nova** (`acharSobreposicoes`): qualquer ponto do lote em cima de um túmulo já confirmado pinta vermelho no mapa, trava o botão "Gerar" e avisa — pega qualquer recorrência futura do mesmo tipo de bug, não só esse caso específico.

**Dado sujo já gravado**: 4 túmulos da Fileira 1 (Q01-R01) ficaram sobrepostos por esse bug antes da correção. Não foram corrigidos automaticamente (nenhum tinha memorial vinculado) — precisam ser apagados e regerados pelo próprio painel de edição.

**Deixado de propósito, não implementado ainda** (mapeado pelo Opus, menor prioridade que o fix acima): validação de sobreposição também no RPC `gerar_lapides_fila_manual` (hoje só client-side — qualquer outro caminho de escrita futuro não fica protegido); unificar `lapides`/`lapidesEdicao` numa fonte única de verdade (Camada 0 do plano do Opus — eliminaria essa classe de bug de vez, mas é refatoração maior, adiada); ajuste de direção por PCA nos últimos N pontos em vez da reta 1º→último (mais robusto pra fileira bem curva, ganho pequeno pro caso real de hoje).

## Bug 3 — rate limit 429 navegando entre páginas do admin (2026-08-07)

Rafael reportou erro ao voltar de Gavetas 3D pro Mapa: `"Limite de 30 requisições por minuto excedido"`. Causa em `proxy.ts`: `getRateLimitType()` caía no default `'api'` (30/min) pra QUALQUER rota que não batesse com login/upload — inclusive navegação de PÁGINA normal dentro de `/admin/*`, não só chamada de API. Cada clique (mais o prefetch automático de link que o Next.js já faz sozinho) contava no mesmo orçamento das rotas sensíveis (força bruta, upload, escrita pública) — não era o vetor de abuso que esse rate limit foi desenhado pra barrar (auditoria 2026-07-24). Fix: navegação de página ganhou balde próprio (`'pagina'`, 180/min), separado do balde de API (30/min, mantido). Login/upload sem mudança.

## Bug 4 — drift dentro do próprio lote ainda não salvo (2026-08-07, diagnóstico com Opus)

Depois do fix do bug grave 2, Rafael reportou uma variante mais sutil: dentro do MESMO lote ainda aberto no diálogo (antes de clicar "Gerar"), arrastar o túmulo #1 e #2 pro lugar real revela o espaçamento real daquele trecho — mas os #3/#4/#5 (ainda não tocados) continuavam usando o cálculo inicial (chute ou pitch antigo), cada vez mais errados.

**Fix** (`lib/enderecoTumulo.ts`, função nova `gerarPontosLoteAncorado`): combina os túmulos confirmados do banco com os pontos do preview já arrastados — ambos viram "âncoras". Pontos ENTRE duas âncoras interpolam linear (o staff já deu as duas pontas daquele trecho); pontos DEPOIS da última âncora extrapolam usando o passo real medido entre as 2 âncoras mais próximas (não o pitch global — mediria errado se as âncoras não forem consecutivas, ex: arrastou só #1 e #4, o vão entre eles é 3 passos, não 1). Sem nenhum arrasto, devolve bit-a-bit o mesmo resultado de antes (contrato coberto por teste do próprio código).

`medirContinuacao` ganhou opção de janela (`janelaVaos`, mede só os últimos N vãos, não a fileira inteira — usa 6 no componente) e corrigiu um bug latente: a direção empírica usava os extremos do ARRAY (ordem de chegada), não os extremos ESPACIAIS — inofensivo até então, mas podia ativar com âncoras fora de ordem.

No componente: `ajustesPreview` virou dependência do cálculo (antes só sobrescrevia o próprio índice, sem afetar os outros pontos do lote); o efeito que zerava os ajustes ao mudar a quantidade digitada agora só apara os índices que ficaram de fora — antes apagava a calibração bem na hora que "Preencher resto" mudava a quantidade, destruindo o trabalho que acabou de ser feito. Clicar numa bolinha amarela (já ajustada) desfaz o arrasto (volta a ser calculada).

## Feature — Duplicar fileira (2026-08-07, planejada com Opus)

Pedido do Rafael: fileiras dentro de uma quadra costumam ser paralelas e regulares — duplicar uma já pronta (eixo + túmulos calibrados) pra virar a próxima, ou uma numerada a dedo ("achei uma fileira lá na frente"), poupa desenhar+gerar+ajustar tudo de novo do zero.

**Geometria do offset** (`medirPassoEntreFileiras`, `lib/enderecoTumulo.ts`): distância perpendicular real entre a fileira de origem e as outras já desenhadas na mesma quadra — mediana dos vãos (mesmo princípio do pitch entre túmulos, não confia numa amostra só), descartando vãos < 0,5m. Sentido (pra que lado o número cresce) vem do sinal predominante do deslocamento entre fileiras de número consecutivo. Sem 2+ fileiras pra medir, usa chute padrão (~7m, a distância real medida no José Lázaro foi 7,30m) — sempre **editável na UI com a procedência escrita** ("7,30m — mediana entre 3 fileiras" vs "chute padrão"), nunca silencioso.

**Trust model** (regra do projeto: geometria nova nasce não-confirmada): fileira nova SEMPRE `geometria_revisada=false`, mesmo copiando de uma origem travada (a cópia é hipótese de paralelismo, não verificação — fileira real de cemitério nem sempre é perfeitamente paralela/regular); túmulos copiados SEMPRE `coordenada_precisao='interpolada'` e `situacao='nao_confirmada'`, mesmo que fossem `'exata'`/`'confirmada'` na origem — exatidão foi verificada NAQUELE lugar, não neste.

**RPC nova `duplicar_fila`** (`supabase/migrations/20260807_duplicar_fila.sql`, staff-only, transação atômica): cliente manda a geometria FINAL já transladada (eixo + pontos), mesmo padrão WYSIWYG de `gerar_lapides_fila_manual` — servidor só grava, não recalcula por conta própria. Recusa se a quadra está travada, se o número destino já tem geometria/túmulos (nunca sobrescreve), ou se passa de 500 pontos. Preenche fileira destino vazia (número já usado mas sem eixo/túmulo) sem duplicar registro.

**UI**: botão "Duplicar" na lista de fileiras (ao lado de "Apagar"/"Travar") abre painel no topo do painel lateral (mesma posição prioritária do "Gerar túmulos") — número destino (validado ao vivo contra colisão), distância medida/editável, "⇄ Inverter lado", checkbox "copiar também os túmulos", preview tracejado azul no mapa antes de confirmar. Túmulos da fileira de origem buscados **frescos do banco** ao abrir (mesma lição do bug grave 2 — state global pode estar desatualizado depois de arrasto no modo de edição).

**Arrastar a duplicação inteira** (mesmo dia, pedido do Rafael logo em seguida) — em vez de só digitar distância/inverter lado, uma alça azul (círculo, ✛) nasce no meio do preview tracejado, arrastável: mover ela translada o eixo + todos os túmulos copiados juntos, como bloco rígido, pra qualquer lugar do mapa. `offsetManualDuplicacao` (deslocamento em metros no plano local) assume prioridade sobre o cálculo de distância perpendicular medida/digitada quando definido; botão "Resetar posição" volta pro cálculo automático. Resolve bem o caso "achei uma fileira lá na frente, não é adjacente nem precisamente paralela" sem precisar de transformação com rotação.

**Escopo simplificado conscientemente** (documentado, não é gambiarra silenciosa): a translação é só deslocamento uniforme (sem rotação/escala) — a alça move o conjunto inteiro mas não gira nem estica. Cobre bem o caso comum (fileiras paralelas, mesmo não-adjacentes). Depois de criada, ajuste fino ponto-a-ponto usa as ferramentas que já existem (arrastar ponta da fileira, editar túmulos no mapa).

## Ruas internas + rota real até o túmulo (2026-08-07, planejado com Opus)

Pedido do Rafael: hoje a rota da página pública ("Como Chegar") é uma linha reta direto da coordenada geral do cemitério até o túmulo, ignorando os caminhos internos de verdade (asfalto/calçada) — pode cortar por cima de quadra. **"Rua" aqui é um conceito novo, não confundir com o rename antigo** (item "Rua → Fileira" acima, onde "rua" era o nome errado que o Rafael deu à fileira) — a rua desta feature é o caminho por onde a pessoa anda, existe no nível do cemitério (sem `quadra_id`, porque passa ENTRE quadras), desenhada com o mesmo sistema de linha da fileira.

**Banco** (`supabase/migrations/20260807_ruas_cemiterio_e_rota.sql`): tabela `ruas_cemiterio` (numero, nome, eixo LineString, comprimento_m, situacao, geometria_revisada) com RLS staff-all + parceiro-select (via `pode_ver_cemiterio`); `obter_geojson_cemiterio` ganhou a chave `ruas`; RPC nova `obter_rede_ruas_memorial(p_slug)` (só service_role, mesmo padrão de `obter_localizacao_memorial`) devolve as ruas ativas do cemitério daquele memorial.

**Algoritmo de rota** (`lib/rotaCemiterio.ts`, puro TS sem lib externa): as ruas são desenhadas independentes, sem marcar cruzamento na mão — `construirRede()` faz *noding* automático (índice espacial em grade + interseção por produto vetorial + detecção de encosto em T por projeção ponto-segmento com tolerância) pra montar o grafo sozinho. `dijkstra()` (heap binário próprio) acha o caminho mais curto; portaria e túmulo se ligam à rede por "última milha" (projeção no segmento mais próximo). `calcularRota()` **nunca lança erro** — sem rede, rede longe demais da portaria/túmulo, ou sem caminho conectado, cai sozinho na linha reta de sempre com um `motivo` explicando por quê (garantia: nenhum memorial existente quebra). `diagnosticarRede()` acha ruas desconectadas da portaria (pra avisar o staff antes de confiar na rota). Testado com script unitário temporário (T-junction, rede desconectada, todos os fallbacks) antes de integrar.

**UI em Central** (`components/admin/MapaCemiterio.tsx` + `PainelRuas.tsx`, novo painel): desenha igual à fileira (clica os pontos, conclui) mas **quadrado roxo** no vértice em vez do laranja/ciano já usados (evita confundir visualmente) — diferenciado da fileira pelo mesmo fluxo de desenho (`modo:'linha'`) checando se tem quadra ativa (fileira sempre tem, rua nunca tem). Renomear/travar/destravar/apagar rua, editar vértice arrastando no mapa (só se não travada), painel de diagnóstico (rede conectada / lista de rua(s) desconectada(s)), botão "Testar rota" que calcula na hora até qualquer túmulo clicado e mostra a distância real vs linha reta.

**Página pública** (`app/homenagem/[slug]/page.tsx` + `components/public/GuiaTumulo.tsx`, regra 17 respeitada — só a linha da rota mudou, resto do componente intocado, diff conferido): 4ª chamada em paralelo no `Promise.all` busca `obter_rede_ruas_memorial`, `calcularRota()` roda no servidor, `rotaCoordenadas` vira prop opcional de `GuiaTumulo` — com rede alcançando os 2 pontos, o mapa desenha o caminho real (curva pelas ruas); sem isso, continua exatamente a linha reta de sempre.

**Não é usado ainda de verdade** — nenhum cemitério (incluindo José Lázaro) tem rua desenhada no banco ainda. A feature entra sozinha em modo fallback (linha reta) até o Rafael desenhar as ruas reais pela Central.

## Segundo cemitério real: São Pedro (Uberlândia/MG, 2026-08-13)

Primeiro cemitério a usar `converter-ortomosaico.py --src-xyz` (modo novo, ver seção abaixo) em vez de GeoPackage. Achados reais, planejados com Opus antes de mexer:

- **Cemitério estava cadastrado 373km fora do lugar** (`latitude`/`longitude` caindo em Goiás em vez de Uberlândia) — provavelmente clique num mapa de zoom baixo na hora do cadastro. Já estava `publico=true`, então `/cemiterios/uberlandia-mg/cemiterio-sao-pedro` mostrava satélite vazio de área rural errada. Corrigido direto no banco pra `-18.914388, -48.296257` (coordenada tirada dos próprios arquivos do drone, não chute).
- **O arquivo "óbvio" que chegou era o ruim**: uma pasta com `tile-X-Y.tif` soltos parecia ser o ortomosaico, mas cada um é um nível intermediário decimado (25,8 cm/px, 16× pior que o real) ou uma máscara técnica sem cor nenhuma. O material bom (`Sao Pedro map.zip`, 2,8GB) é uma pirâmide de tiles já renderizada em EPSG:3857 (esquema Google/XYZ padrão), zoom 15-24, nativa em **1,6 cm/px** — 2× mais nítida que o José Lázaro (que roda em produção a 3,5cm/px na tela, `maxzoom=22`). Verificado por registro geométrico (correlação cruzada contra o mosaico com coordenada oficial) e por comparação de gradiente entre z23/z24 (z24 não acrescenta detalhe real, teto fica em z23).
- **Origem dos arquivos**: projeto completo do **Agisoft Metashape** (software de fotogrametria, `São Pedro.files/`), processado por Rafael Rassi 11/ago/2026. Confirma que o formato de entrega mudou — pra próximos cemitérios, pedir a pirâmide de tiles renderizada (formato do `Sao Pedro map.zip`) em vez de GeoPackage cru, é mais direto de processar (sem rewarp/reamostragem) e mais fácil de conferir antes de subir.
- **Escala muito maior**: São Pedro é urbano antigo, densidade alta — estimativa de **10-15 mil túmulos** (José Lázaro tem 104 hoje). Não é limite técnico (sistema foi feito pra escalar), é só volume de trabalho de clique — recomendado mapear 1 quadra primeiro, medir o tempo real, antes de comprometer o resto.
- **Modo automático (`mapear-cemiterio.py`) não deve ser usado no São Pedro** — os 2 bugs conhecidos e não corrigidos (harmônicos, fase) pioram com fileiras coladas/apertadas como as desse cemitério. Usar o fluxo manual da Central (o mesmo validado no José Lázaro).
- **3D**: existe um `tiled_model` do Metashape na pasta (9 níveis de LOD, textura 1,6cm) — muito melhor que o `.glb` de teste anterior, que era export do modelo "resumido" errado (1,3M triângulos numa textura só, 5,3cm — dá pra confirmar contando os triângulos do glb batendo com o `faceCount` do manifesto do modelo simples). Pedido certo pro Rafael Rassi da próxima vez: exportar o **Tiled Model** (não o Model) em formato **Cesium 3D Tiles** — não precisa reprocessar o voo. Mostrar isso no site ainda exigiria um visualizador novo (MapLibre não lê 3D Tiles nativo) — trilho separado, não decidido ainda.
- Achado de limpeza (não crítico): existe 1 `lapides` órfã ("Jazigo Família Teste", sem coordenada/quadra/fila) no São Pedro — mesma fábrica de túmulo órfão já documentada em 2026-08-07, limpar antes de mapear pra valer.

### Modo `--src-xyz` no `converter-ortomosaico.py` (novo, 2026-08-13)

Quando o processador do voo já entrega uma pirâmide de tiles pronta em EPSG:3857 (esquema XYZ/slippy-map, tipo Google Maps — é o que exporta de Agisoft Metashape, DJI Terra, WebODM etc via "Export Tiled" ou similar), o script consegue copiar direto pro MBTiles/PMTiles **sem rewarp nem reamostragem** — o `WarpedVRT`+merge 2×2 do modo `--src` (GeoPackage) reamostra duas vezes; aqui os tiles já vêm renderizados no zoom nativo. `--src-xyz <arquivo.zip>` no lugar de `--src <arquivo.gpkg>`; bounds/centro são derivados direto do range de tiles presentes no zoom mais fino usado (fórmula padrão slippy-map, sem depender de nenhum manifesto externo). Uso real: `--src-xyz "mapa.zip" --minzoom 15 --maxzoom 23 --quality 48 --quality-overview 55`.

## Numeração oficial da prefeitura vs. numeração própria (São Pedro, 2026-08-14)

Achado de campo: o São Pedro **já tem numeração oficial de quadra** — mapa impresso entregue pela Prefeitura de Uberlândia na portaria (quadras 01-81 em grade de 10 linhas × 8 colunas, mais as perimetrais 82/83/84/85), e **letreiro de ferro em cada esquina de quadra** apontando pras vizinhas ("Quadra 36 / 82 →"). Ou seja: o número da quadra não é escolha nossa, tem que bater com o que o cemitério usa (`quadras.nome`, rename livre, já existia).

**Orientação do mapa impresso, validada com dado real** (não é suposição):

| Mapa impresso | Real |
|---|---|
| Capela (topo) | Oeste |
| Av. Paes Leme (base) | Leste |
| Quadra 82 (direita) | Norte |
| Quadra 84 (esquerda) | Sul |

Duas confirmações independentes: (1) coordenada GPS tirada em cima da Quadra 36 caiu a 17% da borda norte e 41% do oeste — bate com "coluna 8 de 8, linha 5 de 10"; (2) os 4 letreiros fotografados dão a fileira 5 inteira na ordem **60 → 32 → 34 → 36 → [Quadra 82]**, idêntica à linha 5 do impresso.

**Limite conhecido:** o impresso é esquemático — quadra desenhada como caixinha de tamanho igual. Dá a ORDEM certa, nunca o tamanho/posição real. Por isso não dá pra derivar a geometria escalando o desenho; precisa de âncora física.

### Pontos de referência (`pontos_referencia_cemiterio`, 2026-08-14)

Tabela nova pra marcar as âncoras físicas do impresso (Capela, Administração, Sanitários, Velório, portão secundário) direto no ortomosaico: staff clica no mapa, pino roxo aparece, **arrasta pra ajustar** (salva ao soltar). RLS staff-all / parceiro-select via `pode_ver_cemiterio` (regra 22). Com Capela + Administração marcadas, a grade inteira do impresso fica conferível contra a geometria real, em vez de depender só do GPS de um túmulo.

### Cadastro de memorial direto no túmulo (botão direito, 2026-08-14)

Fluxo de campo: staff está no cemitério, acha o túmulo, quer cadastrar na hora. **Botão direito no pino** abre menu com "Cadastrar memorial aqui" (ou "Abrir memorial de X" se já tiver), foto do túmulo, mover pino, apagar. **Botão direito num ponto vazio** marca um túmulo avulso ali (uma bolinha só, sem quadra/fileira — a fileira dele pode nem ter sido desenhada ainda).

São **duas ações**, tanto no menu do botão direito quanto no popup do clique esquerdo (onde antes só aparecia o texto morto "Sem memorial vinculado"):

- **Criar memorial aqui** — formulário mínimo, nasce vinculado ao túmulo, e depois aparece na lista de Memoriais como qualquer outro (mesma tabela `homenagens`, não é registro separado).
- **Vincular memorial existente** — busca por nome direto no banco (`ilike`, debounce de 300ms, limite 15 — não carrega a tabela inteira em memória, é a que mais cresce). Se o memorial escolhido já estiver em outro túmulo, avisa que vai **mover**, não duplicar (`homenagens.lapide_id` é um só).

O cadastro exige **só o nome completo** — é o mínimo pra o memorial existir. Nasce com slug definitivo (nunca `rascunho-`, que a limpeza automática de 2h apagaria), vinculado ao túmulo, e abre a ficha completa em seguida. Escolhe também quem preenche o resto (`preenchido_por`: família ou funerária), que já existia.

Coluna nova `homenagens.origem_cadastro` (`central`/`parceiro`/`mapa_cemiterio`/`familia`, nullable — memorial antigo fica null): sem ela não dá pra distinguir um memorial vazio que está esperando alguém de um que nasceu assim de propósito, em campo.

**Alerta no Dashboard da Central**: card no topo listando os memoriais com dado faltando (data de falecimento, foto, história, contato da família), com link pra ficha, marca de "aguardando a família" quando `preenchido_por = familia`, e de "cadastrado no cemitério" quando veio do mapa.

### Renumerar quadra (`renumerar_quadra`, 2026-08-14)

Nosso `quadras.numero` nasce da ordem em que a quadra é desenhada (1, 2, 3...), que **não** é o número real do cemitério. Botão "# Renumerar quadra" em Central chama a RPC, que faz 3 coisas numa transação só:

1. Troca `quadras.numero`. Se o número novo já estiver ocupado por outra quadra do mesmo cemitério, **troca as duas de lugar** (via número negativo temporário — `UNIQUE(cemiterio_id, numero)` existe e faria a operação falhar). É o caso normal ao corrigir a numeração inteira pro padrão oficial.
2. **Regera o código de todo túmulo das quadras afetadas** (`Q02-R01-T005` → `Q36-R01-T005`), guardando o anterior em `codigo_anterior`. Sem isso o código ficaria mentindo. Lápide avulsa (sem fileira/número) não tem código derivado e fica intocada.
3. Se algum túmulo afetado já tem memorial vinculado, **exige confirmação explícita** (`p_confirmar_recodificacao`, mesmo padrão de `gerar_lapides_fila`) — a UI mostra quantos e pergunta antes.

`quadras.nome` (rename livre) continua existindo em paralelo, pra nome próprio ("Alameda dos Ipês") em vez de número.

### Foto = túmulo conferido em campo (2026-08-14)

`lapides.situacao` tinha o estado `'confirmada'` desde 05/08 e a tela de Lápides já pintava contorno sólido pra ele — mas **nada no sistema nunca setava esse valor**: os 132 túmulos do banco estavam todos `nao_confirmada`, e a regra visual nunca disparava. Achado real quando o Rafael subiu uma foto e o quadradinho não mudou.

Regra adotada: **subir a foto do túmulo confirma o túmulo** (`situacao='confirmada'` + `confirmada_em` + `confirmada_por`, colunas que também já existiam sem uso). É a leitura honesta — foto de perto só existe se alguém esteve lá fisicamente; captura de drone nunca produz isso.

Efeito nos dois lados:
- **Mapa**: pino fica **verde** (`CORES_ORIGEM.conferido`, vence a cor de origem da coordenada — saber que foi conferido importa mais que saber de onde veio o ponto).
- **Lápides**: quadradinho ganha contorno sólido + bolinha verde no canto; contador por fileira mostra "N de M conferido(s) em campo"; popup do túmulo mostra a foto e traduz o código (`Q36-R05-T011` → "Quadra 36 · Fileira 5 · Túmulo 11", que o código sozinho não comunica).
- Legenda explicando os 4 estados do quadradinho, e o passo a passo de como conferir, escritos na própria tela (nos dois lugares) — sem isso ninguém descobre a regra sozinho.

### Trava dos pontos de referência (2026-08-14)

`pontos_referencia_cemiterio.geometria_revisada` — mesmo nome de coluna de quadras/filas/ruas de propósito, pra régua ser a mesma no mapa inteiro. Sem a trava o pino desliza sozinho num arrasto acidental depois de já estar posicionado certo.

### Foto da face do túmulo (`lapides.foto_face_url`, ligada 2026-08-14)

Coluna existia desde 05/08 como gancho, nunca usada. Agora: no popup do pino em Central, staff sobe a foto tirada de perto (bucket `memoriais`, pasta `tumulos/<cemiterio>/<lapide>/`), e **o hover do pino passa a mostrar a foto + identificação mesmo sem memorial vinculado** — antes o card só aparecia com memorial. É o que resolve o problema de fundo do projeto: captura nadir de drone nunca mostra a face vertical da lápide, então a única forma de saber de quem é o túmulo é a foto de campo.

## Mapa Público de Cemitérios (2026-08-13)

Segundo consumidor da camada de ortomosaico (o primeiro é `GuiaTumulo.tsx`), agora sem login: `/cemiterios` (lista cidade) → `/cemiterios/[cidade]` (lista cemitério) → `/cemiterios/[cidade]/[cemiterio]` (mapa). Componente novo `components/public/MapaPublicoCemiterio.tsx` — não reaproveita `MapaCemiterio.tsx` (grande demais, cheio de escrita, arriscado expor ao público), reaproveita só `lib/ortomosaico.ts` + `lib/estiloSatelite.ts` (novo, extrai a técnica de camada empilhada satélite+ortomosaico de `GuiaTumulo.tsx`, que fica intocado). Pino de túmulo com memorial é `symbol` layer (ícone de cruz via `addImage`, nunca `<Marker>` por túmulo — mesma decisão de escala de sempre), hover mostra popup com nome/foto (só se o memorial tem `modo_gate='aberto'`). `cemiterios` ganhou `slug` + `publico` (governança: só a Central decide quem entra no diretório). Detalhe completo de decisão de privacidade/RPCs no `CLAUDE.md`, seção Fase Atual.

## Próximos passos

- [x] Modo edição manual (drag/adicionar/apagar/travar)
- [x] Apagar fileira inteira
- [x] Rua → Fileira (rename)
- [x] Arrastar pontas da fileira no diálogo "Gerar túmulos" (corrige drift de comprimento travado)
- [x] Arrastar cada pré-marcação de túmulo individualmente antes de gerar (`gerar_lapides_fila_manual`)
- [x] Geração em lotes continuados (gera 10, salva, gera mais 10 na distância real medida, até fechar a fileira)
- [x] Botão "Preencher resto" (calibra com lote pequeno, preenche o resto da fileira de uma vez)
- [x] Medida ao vivo (trena) ao desenhar a fileira
- [x] Mapa sticky + card "Gerar túmulos" movido pro topo do painel (mapa não sai mais da tela)
- [x] Painel de edição à esquerda, mesma altura do mapa, rolagem própria (não sticky) -- mapa nunca sai da tela
- [x] Mapa não perde mais posição (pan/zoom) ao salvar qualquer coisa
- [x] "Gerar mais" não sobrepõe mais túmulos já organizados (busca fresca do banco + frente por projeção espacial + rede de segurança anti-sobreposição)
- [x] Rate limit de navegação de página separado do de API (mapa <-> gavetas 3D não estoura mais 429)
- [x] Pontos não arrastados do lote se reprojetam ao vivo pela distância real já fixada (não só entre lotes, dentro do mesmo lote também)
- [x] Duplicar fileira (copia eixo+túmulos deslocado pro lado, mediana da distância entre fileiras vizinhas)
- [ ] Validação de sobreposição também no RPC (hoje só client-side)
- [ ] Unificar `lapides`/`lapidesEdicao` numa fonte única de verdade (Camada 0 do plano do Opus)
- [x] Arrastar a fileira duplicada inteira (eixo + túmulos) antes de confirmar
- [x] Ruas internas (caminho real) + rota calculada pela rede em vez de linha reta (Central + página pública)
- [ ] Rafael desenhar as ruas reais do José Lázaro pela Central (feature está no ar mas sem dado real ainda, roda em fallback linha reta)
- [ ] Duplicar fileira com rotação/escala (fileira alvo não perfeitamente paralela em ângulo) -- hoje só translação uniforme
- [ ] Corrigir `_agrupar_remover_harmonicos` (bug #2 acima) no código genérico
- [ ] Implementar `--ancora`/`--ancora2` (âncora manual de 2 pontos) como comando real em `mapear-cemiterio.py`, não só script avulso de teste
- [ ] Regenerar as fileiras 1-10 da Quadra 1 (apagadas) com o método correto assim que o âncora estiver integrado
- [ ] Mapear as ~7-8 quadras reais restantes do José Lázaro
- [ ] Rafael marcar a entrada real (portão) pela Central
- [ ] Numerar quadras/ruas a partir da entrada (depois que todas estiverem mapeadas)
- [ ] Vistoria de campo (`/admin/cemiterios/[id]/vistoria`, mobile — ainda não construída) — staff confirma túmulo por túmulo andando no cemitério, foto de perto da face de cada um (`foto_face_url`)
- [ ] Fase de nomes — vincular `homenagens.lapide_id` ao código do túmulo certo (self-service pela família ao cadastrar memorial, ou transcrição da foto de campo)
- [x] 1º vínculo real de memorial no São Pedro (Carlos Saraiva, `Q36-R01-T011`, 2026-08-17) — ver seção no fim deste arquivo
- [ ] Perguntar pro Rafael Rassi se o drone dele voa com câmera inclinada (não só reto pra baixo) — só isso resolveria ver nome gravado, altitude sozinha não resolve (ângulo é o que importa, não distância)
- [x] Processar ortomosaico do São Pedro e subir (2026-08-13) — `--src-xyz` novo, `Sao Pedro map.zip`, z15-23, coordenada do cemitério corrigida (estava 373km errada)
- [ ] Rafael conferir visualmente o mapa do São Pedro (`/admin/cemiterios/<id>/mapa`) antes de confiar
- [ ] Rafael marcar a entrada real do São Pedro (portão de 1930, visível na foto)
- [ ] Mapear São Pedro pelo fluxo manual (não usar o automático — fileiras coladas pioram os bugs conhecidos) — começar por 1 quadra, medir tempo real antes de comprometer o resto (~10-15 mil túmulos estimados)
- [ ] Limpar `lapides` órfã "Jazigo Família Teste" do São Pedro antes de mapear pra valer
- [ ] Pedir pro Rafael Rassi exportar o Tiled Model do Metashape (não o Model simples) em Cesium 3D Tiles, pro teste de 3D — material já processado, só falta o export certo

## 1º memorial real do São Pedro (2026-08-17)

Dado oficial de sepultamento (repassado pelo Rafael, veio do arquivo do cemitério):

```
Nome: CARLOS SARAIVA
Filiação: GUMERCINDO SARAIVA KAPPEL
Nascimento: 06/06/1922 · Falecimento: 10/04/1995
Sepultamento: 11/04/1995 · Cemitério SAO PEDRO · Quadra 36 · Sepultura 11
```

Bateu exatamente com o túmulo que o Pedro fotografou em campo: `Q36-R01-T011`
(id `7e4aaf81-da65-4a5a-8210-b4ca1bb2fed9`, -18.9137011, -48.2967196) — o único
da Quadra 36 com `foto_face_url` preenchida. Memorial criado (`carlos-saraiva`,
`origem_cadastro='mapa_cemiterio'`, `preenchido_por='familia'`), já vinculado.

**Fecha o ciclo inteiro pela primeira vez:** numeração oficial da prefeitura →
quadra desenhada no ortomosaico → túmulo interpolado na fileira → foto de campo
conferindo o túmulo → memorial real vinculado → aparece no mapa público.

### Achado: foto antiga não confirmava o túmulo

A foto desse túmulo foi subida ANTES do deploy da regra "foto = conferido"
(commit `b3014f7`), então ele continuava `situacao='nao_confirmada'` mesmo com
foto. Backfill aplicado uma vez:

```sql
update lapides set situacao='confirmada', confirmada_em=coalesce(confirmada_em, now())
where foto_face_url is not null and situacao <> 'confirmada';
```

1 linha afetada. Qualquer foto subida daqui pra frente já confirma sozinha.

### Nome do memorial visível no painel de quadra

Antes, saber quem estava em qual túmulo exigia passar o mouse chip a chip (o
vínculo só existia como cor dourada + tooltip). Painel de Quadras do mapa
(`MapaCemiterio.tsx`) e página de Lápides passaram a listar, embaixo de cada
fileira, `Túmulo N — Nome do memorial` com link direto pra ficha. Só os túmulos
que têm memorial entram na lista — fileira de 200 túmulos vazios não vira parede
de texto.


## Conferência por GPS de campo (2026-08-17)

Painel "Conferir com GPS de campo" no mapa do cemitério (Central). Staff cola o
link/coordenada que alguém mandou de dentro do cemitério; cai um pino laranja e o
painel diz qual túmulo está mais perto e a quantos metros.

`lib/parseCoordenada.ts` lê, nesta ordem de prioridade:

1. `!3d<lat>!4d<lng>` — o **pino real** do link do Google Maps
2. `?q=`/`&query=`/`&destination=` — coordenada do link do app
3. `@lat,lng,zoom` — **centro da tela**, não o pino (avisa na UI que é menos preciso)
4. Grau/minuto/segundo (`18°54'49.3"S 48°17'48.2"W`)
5. Dois números soltos

A ordem importa: num mesmo link do Google, `@` e `!3d/!4d` são pontos diferentes
— o `@` é onde a câmera estava, o `!3d/!4d` é o pino. Pegar o errado introduz
alguns metros de erro silencioso.

Colunas novas em `lapides`: `gps_referencia_latitude`, `gps_referencia_longitude`,
`gps_referencia_em`, `gps_referencia_nota`. Guardam a medição de campo **sem**
mexer em `latitude`/`longitude` (que continuam vindo do ortomosaico). Existe botão
"Mover túmulo pra cá", mas com aviso: ortomosaico é 2,2 cm/px, GPS de celular erra
3-5 m — mover só se a conferência em campo provar que o ponto do mapa está errado.

### Primeira validação real

Ponto medido pelo Pedro no São Pedro contra o marcado no ortomosaico:

| Túmulo | Distância do ponto do Pedro |
|---|---|
| **Q36-R01-T011 (Carlos Saraiva)** | **0,62 m** |
| Q36-R01-T012 | 1,35 m |
| Q36-R01-T010 | 2,25 m |

Bateu — mas o GPS **sozinho** não provaria nada: o vizinho está a 1,35 m e o erro
do aparelho é maior que isso. A certeza vem do cruzamento de 4 fontes
independentes: registro oficial da prefeitura (Quadra 36, Sepultura 11), contagem
na fileira do ortomosaico, foto do túmulo tirada em campo e o GPS.
