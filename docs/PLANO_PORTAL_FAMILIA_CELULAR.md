# Plano cirúrgico — Portal da Família no celular (sem refatorar, máx. 5 etapas)
Data: 2026-10-23. Feito pelo Opus a partir de docs/AUDITORIA_PORTAL_FAMILIA_CELULAR_2026-10-23.md (notas: responsivo 7/10, preenchimento 4/10). Prints da auditoria: Desktop\LEGADO DIGITAL - Geral\memoriais publicos\portal-familia-celular\ (depois: sufixo -depois). Executor: Sonnet, uma etapa por vez, menor diff possível. Nada executado ainda.

## Princípios
Uma regra CSS global PRESA ao portal (classe `portal-familia` no contêiner raiz, page.tsx:686) dentro de `@media (max-width:767px)` anexada ao final de app/globals.css. Sem hover como única via; foco visível; sem emoji; lucide strokeWidth 1.5; label acima do campo e limite no rótulo continuam. NÃO mudar: rótulos/textos, funções, regra 22 (upload em 2 etapas, validação na API), auto-save, trava de edição simultânea (2026-08-18), conflito por campo, rascunho local, ordem/estrutura das abas e campos, layout desktop (painel à esquerda), Central/admin. TimelineEditor fica em components/admin e a Central usa: ajustar só por CSS escopado.

## ETAPA 1 (sem wireframe) — CSS global escopado: fonte, alvos, abas
page.tsx:686 -> `<div className="portal-familia min-h-screen bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8">`. Anexar a app/globals.css:
```
@media (max-width:767px){
 .portal-familia input:not([type=checkbox]):not([type=radio]):not([type=file]),
 .portal-familia select,.portal-familia textarea{font-size:16px!important}
 .portal-familia button,.portal-familia a,.portal-familia select,
 .portal-familia input:not([type=checkbox]):not([type=radio]){min-height:44px}
 .portal-familia input[type=checkbox],.portal-familia input[type=radio]{width:22px;height:22px}
 .portal-familia label:has(>input[type=checkbox]){min-height:44px;display:flex;align-items:center}
 .portal-familia nav{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none}
 .portal-familia nav>*{flex-shrink:0;white-space:nowrap}
 .portal-familia input[type=file]::file-selector-button{min-height:44px;font-size:15px}
}
```
Se min-height quebrar os botões de tema/cor (page.tsx:1152 e 1222) adicionar `min-width:44px` por `[aria-label]`. Sobra de 1 px na aba Privacidade a 360 px: `.portal-familia{overflow-x:clip}`.
Aceite (390 px): nenhum input/select/textarea com font-size < 16 px; todo button/a/input visível >= 44 px de altura; abas em 1 linha rolando; scrollWidth == clientWidth nos 4 tamanhos; a 1440 px nada muda (comparar prints). Risco baixo; reverter = apagar bloco e classe.

## ETAPA 2 (sem wireframe) — × de remover visível e ajuda por toque
- page.tsx:1075 e :1245: `w-5 h-5 ... opacity-0 group-hover:opacity-100` -> `w-11 h-11 -top-1 -right-1 ... opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100`; mesmo onClick; aria-label "Remover foto"/"Remover vídeo".
- ModoAjuda.tsx:73-74: abrir no hover só com mouse de verdade: `onMouseEnter={() => matchMedia('(hover:hover)').matches && setAberta(true)}` (mesmo guard no onMouseLeave). Linha 79: o "?" de 15 px ganha área de toque com `relative after:absolute after:-inset-[14px] after:content-['']`.
Aceite: a 390 px com toque, tocar no "?" abre o balão e tocar de novo fecha; × sempre visível e 44x44 (galeria mock com 1 foto). Risco baixo.

## ETAPA 3 (sem wireframe) — datas, grid
- page.tsx:886-902 (2 datas): manter type="text", acrescentar `inputMode="numeric" maxLength={10}`; exibir ISO como DD/MM/AAAA (`iso.split('-').reverse().join('/')`); máscara no onChange (só dígitos, barras automáticas); converter DD/MM/AAAA -> ISO só no payload de gravação (auto-save e salvar); data incompleta não grava e mostra "Data incompleta".
- Câmera: NÃO forçar `capture` (tiraria a galeria); "Tirar foto" fica fora (exige botão novo = layout).
- page.tsx:909-928: Frase/Cidade com `grid-cols-1 sm:grid-cols-2`.
Aceite: ISO 1938-03-12 aparece 12/03/1938; digitar 12031938 vira 12/03/1938 e o payload leva "1938-03-12"; teclado numérico abre; rascunho local e conflito por campo funcionam (rascunho antigo em ISO precisa ser aceito). Risco médio (mexe no dado gravado).

## ETAPA 4 (PRECISA de wireframe aprovado pelo Rafael, regra 24) — Salvar fixo e linha do tempo empilhada
- Salvar (page.tsx:979-985): no celular `sticky bottom-0` com `pb-[env(safe-area-inset-bottom)]`, fundo zinc-950, junto da linha de estado do auto-save (texto não muda); desktop `md:static`.
- Linha do tempo: CSS no mesmo @media: `.portal-familia .timeline-item>div{flex-wrap:wrap}` e `.portal-familia .timeline-item .flex-1{flex-basis:100%;order:3}`; única edição no componente: `className="timeline-item"` no wrapper da linha 53 de components/admin/TimelineEditor.tsx (sem efeito na Central).
Aceite: em 360x640 o Salvar fica visível sem rolar em qualquer aba com formulário; "Título do evento" >= 280 px a 360 px; Central igual (print antes/depois). Risco médio (teclado/rodapé).

## ETAPA 5 (sem wireframe; opcional) — progresso no upload
lib/uploadFamilia.ts: trocar o PUT na URL assinada por XMLHttpRequest com `upload.onprogress` e `onProgress?(pct)` opcional (assinatura compatível; fluxo de 2 etapas e regra 22 intactos). page.tsx: no texto "Enviando foto..." acrescentar "45%" e "2 de 4". Prévia em miniatura fica fora. Aceite: com PUT lento mockado o % sobe; erro mostra a mesma mensagem. Risco médio.

## Ordem: 1, 2, 3, 4 (após wireframe), 5.
## Como testar (toda etapa)
Playwright da auditoria: `/api/*` interceptado, escritas recusadas, user agent iPhone com touch; 360x640, 390x844, 768x1024, 1440x900; medir font-size computado, getBoundingClientRect >= 44 px, scrollWidth e posição do Salvar; prints com sufixo `-depois` em portal-familia-celular; `npm run build`.
## Fica fora
"Tirar foto"/"Escolher da galeria", prévia antes de enviar, compactar cabeçalho, contraste dos textos 10-11 px, desmontar abas ocultas, menu inferior, qualquer mudança na Central.
## CLAUDE.md e LegadoBot (regras 4 e 14), no commit de cada etapa
Seção "Portal da Família — como funciona": 1 linha por etapa (1 regra .portal-familia; 3 datas DD/MM/AAAA gravadas em ISO; 4 Salvar fixo; 5 progresso). LegadoBot atualizado nas etapas 3, 4 e 5.
## Checklist que o Rafael confere no celular
1 tocar em campo não dá zoom; 2 abas numa linha, deslizando; 3 × de remover visível e fácil; 4 "?" abre a dica; 5 data 12/03/1938 com teclado numérico; 6 "Salvar alterações" sempre à vista (após etapa 4); 7 título do evento na largura toda; 8 nada sai para o lado; 9 desktop e Central iguais; 10 envio de vídeo mostra percentual.
