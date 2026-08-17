# Protocolo de validação de túmulo por GPS de campo

> Como confirmar que o ponto marcado no ortomosaico é mesmo o túmulo certo.
> Escrito depois da primeira validação real (Cemitério São Pedro, 2026-08-17).
> Vale pra qualquer cemitério com ortomosaico cadastrado.

## Por que isso existe

O drone fotografa reto de cima. Nadir não mostra a face vertical da lápide, então
**nenhuma foto aérea revela o nome gravado na pedra** — não é limitação de
resolução, é ângulo. O ortomosaico dá a posição exata do túmulo (2,2 cm/px), mas
nunca diz de quem é.

Quem diz de quem é: o registro do cemitério, a contagem na fileira, a foto tirada
de perto e o GPS de quem esteve lá. Este protocolo é o cruzamento dessas fontes.

## A regra que não pode ser esquecida

**GPS de celular erra 3 a 5 metros. Túmulos vizinhos ficam a ~1,3 metro.**

Ou seja: o GPS **sozinho nunca prova qual é a sepultura**. Ele confirma a região
da quadra e a fileira, não o túmulo. Quem trata GPS como prova única vai vincular
memorial no túmulo errado mais cedo ou mais tarde.

## As 4 fontes

| Fonte | O que garante | Quem produz |
|---|---|---|
| Registro oficial do cemitério | Quadra e sepultura (ex: Quadra 36, Sepultura 11) | Prefeitura / administração |
| Contagem na fileira do ortomosaico | qual é o 11º contando do começo da fileira | Central, no mapa |
| Foto do túmulo de perto | é essa pedra, esse nome | pessoa em campo |
| GPS do celular | está nessa região da quadra | pessoa em campo |

**Túmulo validado = as 4 batendo.** Três batendo e uma destoando: para e investiga,
não vincula.

## Passo a passo — pessoa em campo

1. Ficar **em pé em cima do túmulo**, celular na mão, céu aberto (longe de parede,
   muro alto, árvore — cada um desses joga o sinal pra longe)
2. **Esperar uns 30 segundos parado.** O erro do GPS é maior nos primeiros
   segundos e vai fechando sozinho
3. Abrir o Google Maps e **segurar o dedo** no ponto exato até cair o pino vermelho
4. Tocar no pino → **Compartilhar** → copiar o link
5. Mandar **o link + uma foto da lápide de perto**, legível

### O erro que estraga a medição

Tem que ser o **pino**, nunca um print da tela. O link do Google Maps carrega dois
pontos diferentes:

- `@-18.9137585,-48.2966805,21z` → onde a **câmera** estava
- `!3d-18.9136976!4d-48.2967242` → onde o **pino** está

São lugares diferentes, quase sempre alguns metros separados. O sistema lê o pino
primeiro e avisa na tela quando o link só traz o centro da câmera.

## Passo a passo — Central

`/admin/cemiterios/<cemitério>/mapa` → painel **"Conferir com GPS de campo"**

1. Colar o link (ou os números soltos, ou grau/minuto/segundo — lê os 5 formatos)
2. **"Ler coordenada"** → pino laranja cai no mapa, a tela voa até ele
3. O painel responde na hora: **túmulo mais perto + desvio em metros**
   - até 3 m → verde, "Bate com Q36-R01-T011"
   - acima disso → amarelo, "Mais perto de..."
4. Decidir:
   - **Guardar como referência deste túmulo** → arquiva a medição, **não** mexe na
     coordenada do ortomosaico (é o caminho normal)
   - **Mover túmulo pra cá** → só quando a conferência em campo provar que o ponto
     do mapa está no túmulo errado. Ortomosaico é 2,2 cm/px, GPS é metros — mover
     por causa de desvio pequeno **piora** a precisão
5. Subir a **foto do túmulo** pelo pino (botão direito ou popup) — isso marca o
   túmulo como conferido em campo (pino verde) e é o que sustenta a validação

## Onde fica guardado

Colunas de `lapides`:

| Coluna | O que é |
|---|---|
| `latitude` / `longitude` | coordenada **oficial**, do ortomosaico. Nunca sobrescrita automaticamente |
| `gps_referencia_latitude` / `_longitude` | medição de campo, só referência |
| `gps_referencia_em` / `_nota` | quando e de onde veio (formato do link, quem mediu) |
| `foto_face_url` | foto de perto — dispara `situacao='confirmada'` |

Guardar as duas coordenadas separadas permite medir depois se o ortomosaico de um
cemitério tem **desvio sistemático** (vários túmulos puxando pro mesmo lado, o que
se corrige de uma vez na grade inteira) ou se é só ruído de GPS (aleatório, não se
corrige).

## Primeira validação real — São Pedro, 2026-08-17

Ponto medido pelo Pedro Saraiva contra o marcado no ortomosaico:

| Túmulo | Distância do ponto medido |
|---|---|
| **Q36-R01-T011 — Carlos Saraiva** | **0,62 m** |
| Q36-R01-T012 | 1,35 m |
| Q36-R01-T010 | 2,25 m |

As 4 fontes bateram: registro da prefeitura (Quadra 36, Sepultura 11) + 11º na
fileira do ortomosaico + foto de campo + GPS a 62 cm. Memorial do Carlos Saraiva
(avô do Pedro) vinculado a esse túmulo.

Repare que o vizinho está a 1,35 m — **dentro do erro do aparelho**. Sem as outras
3 fontes, essa medição não decidiria nada.
