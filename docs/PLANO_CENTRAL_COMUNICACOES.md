# Plano — Central de Comunicações em abas

Data: 2026-10-23. Wireframes: `opendesign/mockups/central-comunicacoes/index.html` (4 opções). Nada de código do app foi alterado.

## 1. Diagnóstico

- `/admin/emails` empilha 7 blocos numa rolagem só: Pendências, Leads de parceiro, Leads de família, Parceiros e contatos, E-mail do fornecedor, Histórico (agrupado por parceiro, retrátil).
- "Pendências dos memoriais" (`PendenciasMemoriais.tsx`) é o pior: lista de 12 linhas "falta X, Y, Z", sem filtro, sem ação além de abrir a ficha, corta em 12 ("e mais N...") e só aparece se houver pendência.
- Erro de e-mail só se vê no histórico dentro de retrátil fechado (e no sino). Não há botão de reenviar.
- Nada se repete igual entre as telas: o sino do header (`emails_enviados` + `leads`, "visto até" no localStorage) e o Portal do Parceiro (`/parceiro/emails`: contatos das famílias + histórico) têm cada um a sua versão.
- Falta: caixa do contato@ (Google), WhatsApp recebido, contagem por área, e uma noção de "o que exige ação hoje".

Fontes de dado hoje: `emails_enviados` (tipos em `lib/emailLog.ts`: senha_familia, confirmacao_placa, envio_fornecedor, convite_parceiro, codigo_acesso_memorial, aviso_lead), `leads`, `homenagens` (campos faltantes calculados no navegador), `parceiros_b2b`, `configuracoes_sistema` (e-mail do fornecedor).

## 2. Abas propostas (ordem = prioridade de ação)

1. **Visão geral** — 4 números (e-mails com erro, memoriais com dado faltando, leads novos, não lidos do contato@) + "fila de hoje" com os 5 itens mais urgentes. Abre aqui.
2. **Pendências dos memoriais** — ver item 3.
3. **E-mails enviados** — histórico com filtro por status (erro / enviado / confirmado), busca, motivo do erro à vista, botão Reenviar. Erros primeiro.
4. **Contatos e leads** — leads de parceiro e de família (status, WhatsApp, e-mail) + parceiros e contatos das famílias (já existe).
5. **Caixa contato@** — leitura via conta de serviço do Google. Etapa futura; a aba nasce marcada "em breve" ou fica oculta até existir.
6. **Fornecedor de placas** — e-mail configurado + último envio e status (hoje só o campo).

Lógica de prioridade: erro (algo quebrou) > lead novo (dinheiro esperando) > pendência antiga (>14 dias) > consulta. Badge vermelho = precisa agir hoje; dourado = acumulado; sem badge = consulta.

## 3. Pendências reformuladas

- Duas visões: **por memorial** (uma linha, chips do que falta) e **por dado faltante** (grupos: contato da família, data de falecimento, foto, história).
- Filtros: dado faltante, quem preenche (família / equipe), parceiro, origem (cemitério / parceiro / central), idade. Memorial "Ilustre" não cobra data nem contato (regra atual mantida).
- Ações em 1 clique por linha: **Abrir ficha** (já na aba certa), **Lembrar família** (reenvia aviso; só se há e-mail), **Reenviar acesso** (senha da família; reaproveita `cadastrar-email-familia`).
- Sem corte em 12: paginação/rolagem interna. Badge da aba = total.
- Cálculo de "falta" passa para uma função única em `lib/` usada pela aba, pelo Dashboard e pelo sino (hoje só existe dentro do componente).

## 4. Integração com o sistema

- **Sino**: continua igual; cada item passa a abrir a aba certa (`?aba=erros`, `?aba=leads`). Contador soma erros + leads novos + (futuro) não lidos.
- **Dashboard**: ganha link "N pendências" → aba Pendências.
- **Ficha do memorial**: link "Ver comunicações deste memorial" abre E-mails enviados já filtrado pelo memorial.
- **Portal do Parceiro** (`/parceiro/emails`): mesma estrutura de abas reduzida (Contatos das famílias, E-mails, Pendências só dos memoriais dele). Regra 22: nada da Central vaza (leads, fornecedor, contato@ ficam só na Central).
- **LegadoBot** (regra 14): `LEGADOBOT_PROMPT.md` atualizado no mesmo commit com os nomes novos das abas.
- **Não muda**: tabelas e tipos de e-mail, rate limit, fluxo de QR/fornecedor, regras de privacidade, sino (só destino dos cliques), textos e rótulos já usados (só reorganizar, não renomear campos).
- Layout: regra 13 (card grande em linha cheia, curtos em grid), painel de edição à esquerda, nunca caixa vazia (aba sem item mostra frase curta, não moldura), lucide `strokeWidth={1.5}`, sem emoji, label acima do campo.

## 5. Etapas (cada uma testável)

1. Casca de abas na `/admin/emails` com as telas atuais movidas sem alterar (teste: cada bloco existe na aba certa, nada sumiu).
2. Visão geral + badges (teste: números batem com `select count` de erros, leads `lido=false`, pendências).
3. Pendências reformuladas: função única de "falta", filtros, duas visões (teste: mesma lista de memoriais de antes).
4. Histórico de e-mails: filtro por status + Reenviar (teste em chave de teste: reenviar um erro gera nova linha).
5. Fornecedor: último envio e status.
6. Sino e Dashboard apontam para as abas; Portal do Parceiro com versão reduzida; LegadoBot.
7. (Depois) Caixa contato@ via Google e WhatsApp oficial — dependem de contas externas.

## 6. Riscos

- Ações "Lembrar família"/"Reenviar acesso" disparam e-mail real: exigem as travas já existentes (nome real, e-mail válido) e confirmação antes de enviar.
- Reenviar acesso gera senha nova e derruba a anterior da família; avisar na tela.
- Cálculo de pendência no navegador com `limit(200)` não escala; mover para RPC ou rota quando passar de 200 memoriais.
- Caixa contato@ lê e-mail de terceiros: só com escopo mínimo e acesso restrito à Central (regra 22).
- Muita aba cansa; manter 6 e esconder a Caixa até existir.

## Recomendação

**Opção 1 (abas horizontais por assunto)**, trazendo da Opção 4 o quadro por dado faltante como segunda visão dentro de Pendências. É o padrão que a Central já usa, não exige reaprender nada, e é a de menor risco e custo de construção. A Opção 3 só vale se a Central crescer com WhatsApp e Google; a 2 e a 4 mudam demais o modelo mental.
