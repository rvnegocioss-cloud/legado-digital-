# Modelos Travados — nunca reescrever, sempre consultar se der erro

> Este arquivo existe só pra isso: se algo quebrar numa mudança futura, volta aqui, confere o que era o original, e restaura. Nunca editar o código descrito aqui sem pedido explícito do Rafael.

---

## Modelo 1 — Página do memorial (`/homenagem/[slug]`)

**Arquivo:** `app/homenagem/[slug]/page.tsx`

**Status:** modelo base fixo. Qualquer variação de layout nova (ex: versão "tipo Facebook") é rota separada — nunca substitui nem modifica esse arquivo.

**Ponto de restauração no git:**
```bash
git checkout homenagem-modelo-base-2026-07-24 -- "app/homenagem/[slug]/page.tsx" components/public/AcenderVela.tsx app/globals.css
```
(ou `git checkout homenagem-modelo-base-2026-07-24` pra ver o repo inteiro nesse estado, depois `git checkout main` pra voltar)

**Referência visual:** `docs/pagina-atual-referencia-2026-07-24.png` (print de tela real, tirado direto do site publicado)

**O que esse modelo tem (confirmado funcionando 2026-07-24):**
- Container responsivo 520px (mobile) / 1100px (desktop), classe `.mem-container`
- Hero em coluna no mobile, foto+texto lado a lado no desktop, classe `.mem-hero`
- Seções na ordem: Hero → Faixa de presença viva → Biografia → Vídeo (se tiver) → Timeline → Galeria → Mural de memórias → Como Chegar (se tiver) → Condolências → Acender uma vela → Rodapé
- Fonte: Georgia/Times New Roman serif em tudo — **não trocar pra Playfair Display nem nenhuma outra**, decisão confirmada do Rafael 2026-07-23

---

## Modelo 2 — Vela (`AcenderVela.tsx`)

**Arquivo:** `components/public/AcenderVela.tsx` + trecho `.vela-*`/`@keyframes vela-*` de `app/globals.css`

**Status:** estrutura e posição travadas. Deu muito trabalho alinhar (várias rodadas de ajuste 2026-07-24). Se uma página nova for criada, essa seção entra **idêntica**, componente reaproveitado sem alteração nenhuma.

**Técnica da chama:** gota simples via `border-radius: 50% 50% 50% 0` + `transform: translateX(-50%) rotate(-45deg)`, `transform-origin: bottom center`. Substituiu uma técnica antiga mais complexa (skew+scale composto) que ficava cortando/desproporcional.

**Valores exatos que funcionam (vela principal, 22×30px, sobre corpo de vela 14×60px):**
```
bottom: calc(100% + 14px)
left: calc(50% + 8px)
```
O corpo da vela **precisa** de `position: relative` — sem isso, os filhos absolutos (pavio/glow/chama) se posicionam relativos ao container de fora errado (bug real já corrigido).

**Comportamento (não mudar sem pedido):**
- Vela principal fica apagada por padrão, acende só no clique
- Ao clicar: chama acende, **voa** (`getBoundingClientRect`) até o próximo slot vago da parede de 45 velas votivas, acende lá, principal apaga de novo
- **Sem limite de cliques** — cada clique conta de verdade (RPC `acender_vela`), pode acender quantas vezes quiser
- Quando os 45 slots da parede enchem, ela **apaga toda e recomeça do zero** no próximo clique (loop contínuo)
- Botão sempre mostra "ACENDER UMA VELA" (não troca de texto depois de clicar)

**Pendente, ainda não construído (ver `docs/RASCUNHO_IDEIAS.md`):** cenário/fundo ornamentado atrás do painel (afresco, flores, candelabro de época) — quando for feito, só mexe no que está AO REDOR do painel, nunca na vela principal/pavio/chama descritos acima.

---

**Última atualização:** 2026-07-24
