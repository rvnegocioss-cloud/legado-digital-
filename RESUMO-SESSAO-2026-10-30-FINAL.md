# Resumo final 27–30/10/2026 — Legado Digital (leia isto na sessão nova)

## Regras do Rafa (valem sempre)
- Respostas curtas, sem termo técnico; ele manda calar, calar. Nunca mandar ele fazer coisa técnica; eu faço (banco incluído, com backup antes de apagar).
- "Tudo padrão": nome de cemitério "Cemitério <Nome>" (regra no CLAUDE.md).
- Foto/vídeo SEMPRE com enquadramento correto, responsivo ao formato (regra 25 do CLAUDE.md). Conferir visualmente.
- Protótipo real antes de mexer no mapa; só dizer "pronto" depois de testar.

## No ar (último commit de código: 4f6ba87)
- Mapa das ruas na Central: tipo (principal/dos túmulos), + Nova rua (lápis/pontos), curva por bolinha, cor escolhida, ocultar e travar por grupo, card ao clicar na rua (Editar/Duplicar/Mover/Travar/Apagar), edição mais leve. Portal do Parceiro com "← Voltar pra Central".
- Bom Pastor: ortomosaico no ar, nome corrigido. Landing destaca o São Pedro.
- São Pedro: Q1 (em cima da Q49) apagada; 5 túmulos Q01-R01-T001..T005 ficaram soltos (sem quadra).
- Memorial: quadro grande do topo se ajusta ao formato da foto/vídeo (GaleriaTopo, aspect-ratio 3/4 a 16/9); vídeo, foto grande, miniaturas, mosaico, mural, árvore, Portal da Família e Central trocados de cover para contain (avatares redondos continuam cover foco no rosto).

## NÃO provado (só tsc/lint/build, nunca visto no navegador)
- Tudo do mapa das ruas e todo o enquadramento do memorial. Primeira tarefa: o Rafa abrir um memorial (ex.: /homenagem/uberlandia/saopedro/t167/odelmo-leao-carneiro-sobrinho) com foto em pé e conferir. O mosaico da galeria tem blocos de formato fixo: foto em pé aparece menor com faixa preta (pode precisar ajuste).

## Pendências
1. Conferir visualmente o enquadramento (foto em pé, deitada, quadrada, vídeo) e ajustar o mosaico.
2. Marcar o portão do Bom Pastor na Central (tarefa do Rafa); rota pública "Como Chegar" ainda não usa o tipo da rua.
3. 5 túmulos soltos da antiga Q1: apagar ou reaproveitar (decisão do Rafa).
4. PC do Rafa: programa de voz Fish Speech usava 17 GB de RAM (deixa o navegador lento).
5. Higiene: `.gitignore` agora ignora `*.bak-*`; backups locais ficam no PC.

## Arquivos de referência
CLAUDE.md (regras 24 e 25, convenções), docs/LEGADOBOT_PROMPT.md, resumos anteriores RESUMO-SESSAO-2026-10-27-ORTO-BOMPASTOR.md e RESUMO-SESSAO-2026-10-29-1424.md.
