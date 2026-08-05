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

**José Lázaro (Tupaciguara/MG)**: 1 quadra piloto completa no banco — `Quadra 1` (bloco "F" do reconhecimento global), **10 filas, 186 túmulos**, cada um com código único e coordenada, `situacao='nao_confirmada'` (esperando vistoria de campo). Confirmado com query real + imagem de conferência (pontos lidos de volta do banco batendo com a foto original).

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

## Próximos passos

- [x] Modo edição manual (drag/adicionar/apagar/travar)
- [ ] Mapear as ~7-8 quadras reais restantes do José Lázaro
- [ ] Rafael marcar a entrada real (portão) pela Central
- [ ] Numerar quadras/ruas a partir da entrada (depois que todas estiverem mapeadas)
- [ ] Vistoria de campo (`/admin/cemiterios/[id]/vistoria`, mobile — ainda não construída) — staff confirma túmulo por túmulo andando no cemitério, foto de perto da face de cada um (`foto_face_url`)
- [ ] Fase de nomes — vincular `homenagens.lapide_id` ao código do túmulo certo (self-service pela família ao cadastrar memorial, ou transcrição da foto de campo)
- [ ] Perguntar pro Rafael Rassi se o drone dele voa com câmera inclinada (não só reto pra baixo) — só isso resolveria ver nome gravado, altitude sozinha não resolve (ângulo é o que importa, não distância)
