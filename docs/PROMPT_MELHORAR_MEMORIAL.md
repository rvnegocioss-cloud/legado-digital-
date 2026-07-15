E C# Melhorar a Página do Memorial — Recap + Prompt Pronto

Gerado 2026-07-14. Objetivo: te dar o recap completo (pendências/sugestões/etapas em sequência) e um prompt pronto pra colar num modelo mais inteligente (Claude Opus, Claude Design, GPT, etc) pedindo melhoria da página do memorial.

---

## 1. Pendências (coisa decidida, só falta construir)

Em sequência de prioridade, olhando só o que toca a página do memorial (`/homenagem/[slug]`):

1. **Refino visual "luxo moderno"** — hoje é CSS inline básico, navy `#0B1D2A` + dourado `#C9A46A`, serif. Precisa virar visual de verdade, mantendo zero JS client desnecessário (é 100% server component de propósito, ver item 6).
2. **Formulário de nova condolência** — visitante ainda não consegue deixar condolência pela própria página do memorial (só existe leitura). Vira ilha client isolada e pequena.
3. **Acender/apagar vela, troca de tema, compartilhar** — 3 ilhas client separadas, uma de cada vez, sem `requestAnimationFrame` contínuo (motivo: bug real já corrigido nessa sessão, ver item 6).
4. **Biblioteca de música instrumental royalty-free** — decisão jurídica já tomada (família NÃO pode subir música própria, risco de direito autoral/ECAD). Falta: escolher/licenciar ~10-15 faixas, subir pro Storage, montar seletor no formulário.
5. **Localização (cemitério/jazigo/gaveta na página pública)** — sem esquema de jazigo/gaveta ainda no banco (Fase 5), não dá pra construir antes disso existir.
6. **Zero JS client desnecessário é regra, não sugestão** — página foi reescrita do zero em 2026-07-07 depois de um bug real: `FundoParallax.tsx` (fundo 3D das velas) rodava RAF infinito + giroscópio e vazava memória do compositor até o navegador matar a aba. Qualquer melhoria visual/interativa daqui pra frente NÃO pode reintroduzir esse padrão.

## 2. Sugestões / decisões em aberto (não construir sem eu confirmar)

- **Templates/cores selecionáveis pela família** — hoje só existe 1 visual fixo. Decisão pendente: feature de verdade ou só mockup de venda.
- **"Livro de Assinaturas" vs "Homenagens"** — mockup do Pedro mostra 2 contadores separados; hoje só existe 1 conceito (`condolencias`) no banco. Afeta se a página do memorial mostra 1 ou 2 seções distintas.
- **Globo 3D (achado no Awwwards, site "Susie & Jay")** — vira aba "Localização" (lugares da vida + sepultamento) ou fica separado?
- **Modelo de negócio direto vs só parceiro** — reunião com sócios em 2026-07-15, decide se vai ter fluxo de venda direta pra família (hoje só via funerária/cemitério/prefeitura). Pode afetar tom/copy da página pública.

## 3. Referência de design ainda não aberta (relevante direto pra essa tarefa)

Do deck do Pedro (Drive, pasta "Legado Digital"), 2 das 3 imagens nunca analisadas cobrem exatamente a página do memorial:
- `pagina publica qr code.jpg` — "Página Memorial Pública" (item 3 do índice do deck, pág. 14)
- `aplicacoes prioritarias fisicas.jpg` / `layout pagina legado digital .jpg` — presença física/comunicação (pág. 28)

Essas imagens têm o layout que o Pedro (sócio, referência de design do projeto) já desenhou pra essa página exata. **Antes de pedir pra um modelo externo redesenhar do zero, vale abrir e conferir essas 2 imagens** — senão corre o risco de reinventar algo que já foi especificado.

---

## 4. Prompt pronto pra colar em outro modelo (Claude Opus / Claude Design / GPT)

Copia o bloco abaixo inteiro:

```
Contexto do projeto: Legado Digital é uma plataforma B2B2C de memoriais digitais
vinculados a QR Code, pra funerárias/cemitérios/prefeituras (parceiros) oferecerem
às famílias que atendem. Stack: Next.js 16 (App Router) + TypeScript + Supabase
(Postgres/Auth/Storage) + Tailwind v4 + Vercel.

Tarefa: melhorar visualmente a "Página do Memorial" pública (rota
app/homenagem/[slug]/page.tsx), que é a página que qualquer visitante acessa via
QR Code físico numa lápide, URL direta ou busca por nome.

Estado atual:
- É um Server Component 100% puro — zero JavaScript client-side na rota. Isso é
  DELIBERADO: uma versão anterior tinha um fundo 3D animado com
  requestAnimationFrame contínuo + giroscópio que vazava memória do navegador até
  a aba travar/crashar em celulares mais fracos. Qualquer melhoria não pode
  reintroduzir animação contínua nem loop de RAF descontrolado.
- Identidade visual: navy #0B1D2A + dourado #C9A46A, tipografia serif
  (Georgia/Times New Roman, sem fonte externa via @import por CSS — outra causa
  de bug anterior: @import de fonte do Google travava a página em rede que não
  alcançava fonts.googleapis.com).
- Seções que já existem e puxam dado real do Postgres: hero (foto, nome, datas,
  cidade, frase), biografia, vídeo incorporado (aceita link do YouTube), galeria
  de fotos, linha do tempo (formato jsonb, blocos de ano/título/descrição),
  condolências (lidas de uma tabela própria `condolencias`).
- Cada seção só aparece se o memorial tiver aquele dado preenchido (não força
  layout vazio).
- Tom do produto: sério, sóbrio — é memorial de pessoa falecida. Sem emoji como
  ícone de UI (usa lucide-react, strokeWidth 1.5, cor neutra). Sem elemento
  "SaaS genérico"/agressivo.

O que ainda NÃO existe na página (não sugerir como se já existisse, mas pode
desenhar o espaço/UX pra quando existir):
- Formulário de nova condolência (visitante só lê hoje, não escreve ainda).
- Acender vela / trocar tema / compartilhar — nada disso existe ainda.
- Seletor de música de fundo — decisão jurídica já tomada: família NUNCA sobe
  música própria (risco de direito autoral/ECAD no Brasil), vai ser uma
  biblioteca curada de faixas instrumentais royalty-free ainda não licenciadas.
- Localização física (cemitério/jazigo no mapa) — schema de jazigo/gaveta ainda
  não existe no banco, não desenhar como se os dados já estivessem disponíveis.

O que peço: [ESCREVA AQUI O QUE VOCÊ QUER — ex: "sugestões de layout/composição
visual pra cada seção", "paleta de apoio além do navy/dourado", "como organizar
hero + linha do tempo + galeria de forma mais luxuosa sem JS pesado", etc.]

Restrição não-negociável: qualquer sugestão de interatividade tem que ser
implementável como ilha client pequena e isolada (React Server Components +
uma "ilha" client por funcionalidade), nunca um bundle client grande pra página
inteira. Performance em celular fraco é prioridade sobre efeito visual.
```

Preenche o `[ESCREVA AQUI O QUE VOCÊ QUER]` com o pedido específico antes de mandar (ex: "layout completo", "só a seção hero", "paleta e tipografia", etc) — sem isso o modelo vai responder genérico demais.
