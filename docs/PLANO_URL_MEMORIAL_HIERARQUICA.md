# Plano APROVADO (Rafael, 22/10/2026) — endereço do memorial (barramento)

## Formato final
```
/homenagem/{cidade}/{cemiterio}/{tumulo}/{memorial}
/homenagem/uberlandia/saopedro/t1234/carlos-saraiva
```
- `cidade`: nome da cidade em slug, sem UF (pedido do Pedro). Se duas cidades com o mesmo nome entrarem no sistema, a segunda recebe sufixo de UF. Isso tem que ser garantido no banco (unique).
- `cemiterio`: slug curto (ex.: `saopedro`), único por cidade. Coluna nova, e o `slug` atual não é tocado.
- `tumulo`: **ID permanente nosso** (`t` + número), gerado pelo sistema ao cadastrar o túmulo. Nunca muda (renumerar quadra ou corrigir o mapa não altera) e é único no cemitério. Funciona em qualquer cemitério, com ou sem numeração da Prefeitura.
- `memorial`: `homenagens.slug` atual.

## Número oficial da Prefeitura
Quando existir, é guardado no túmulo e aparece **dentro da página do memorial** (informação). **Não entra no endereço.**

## Por que mudar (motivo do Pedro)
Com o endereço só pelo nome, nomes repetidos viram `jose-da-silva-2`, `-3`… Com cidade, cemitério e túmulo, cada memorial fica único e confiável.

## Regras obrigatórias (sem falha)
1. Um endereço oficial por memorial (canonical e 308).
2. O endereço curto `/homenagem/{slug}` nunca morre: redireciona para o oficial, preservando a query `?qr=`.
3. O QR Code das placas continua com o endereço curto, para sempre.
4. Se algum pedaço do endereço estiver errado ou desatualizado, a pessoa vai para o oficial (nunca 404). O sistema resolve só pelo slug do memorial.
5. Memorial com senha, cadastro, e-mail ou oculto **não ganha endereço longo** (não revela a localização).
6. Memorial sem túmulo fica no endereço curto.
7. A página do memorial não é reescrita (regra 21). A tradução fica no `proxy.ts`.
8. Uma função única `lib/urlMemorial.ts` monta todo link do site.

## Etapas (uma por vez, testada e mostrada ao Rafael antes da próxima)
1. Banco, com backup antes: `cemiterios.slug_curto` (único por cidade), `lapides.id_publico` (sequência permanente, preenchida nos túmulos existentes), `lapides.numero_oficial` (texto, opcional), slug de cidade único. Mais GRANT na mesma migration.
2. `lib/urlMemorial.ts`, tradução e redirecionamento no `proxy.ts`, canonical. Testar: Grande Otelo, Carlos Saraiva, um memorial com senha, um sem túmulo e um QR antigo.
3. Trocar todos os links do site (menos a geração do QR Code).
4. Número oficial na página do memorial, campo na Central, trilha do topo, sitemap e WhatsApp.
5. CLAUDE.md e LegadoBot (regra 14).

Status: **aprovado, nada executado ainda.** Uma tentativa anterior de execução foi parada antes de mudar qualquer arquivo.
