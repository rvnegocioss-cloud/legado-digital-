# Rascunho de Ideias e Perguntas Em Aberto

Arquivo separado do CLAUDE.md. Aqui fica **tudo que foi sugerido (por mim ou pelo Rafael) e ainda não teve resposta/decisão**. Regra registrada 2026-07-14: se o Rafael não respondeu, é porque não viu — não pode sumir. Quando uma ideia daqui for decidida, concluída ou corrigida, ela sai daqui e vai pro CLAUDE.md como registro definitivo.

## Aguardando decisão do Rafael

- **Reusar o ícone da logo (arco+chama+planta+livro) em outras integrações de página (2026-07-17, Rafael)** — ele gostou de como o desenho ficou depois da reconstrução vetorial da logo, quer usar só o ícone (sem o texto) em pontos específicos do site futuramente. Já separado e pronto: `assets/Logo Legado Digital - Validado/icone-arco-chama-planta.png` (alta resolução, fundo transparente, sem texto). Rafael ainda vai decidir onde/como usar — não construir nada até ele apontar os lugares.

- **Cada vela acesa flutua no fundo da página pública, com o nome de quem acendeu (2026-07-17, Rafael)** — "vai ser demais isso". Ideia: quando alguém acende a vela no memorial, o nome da pessoa vai pra uma vela flutuante no fundo/background da página pública (visual ambiente). Não desenvolver agora — registrado pra retomar depois. Precisa pensar: nome fica salvo em algum lugar (hoje `acender_vela` só incrementa contador, não guarda quem acendeu), moderação de nome ofensivo, performance do efeito flutuante (lembrar da regra zero-JS-contínuo/sem RAF solto da página do memorial). **4 imagens de referência visual analisadas (2026-07-17)** — direção de design registrada em `Desktop\Cérebro Claude - Legado Digital\velas\analise-referencias-vela-flutuante.md`: paleta já bate com o tema atual, glow radial suave, várias velas nítidas na frente/desfocadas atrás, movimento de subida lenta em vez de tremeliques.
- **Templates/cores do memorial pra família escolher** — hoje só existe 1 template fixo (navy+dourado), sem coluna de tema no banco. Decisão pendente: construir a feature de verdade (múltiplos templates selecionáveis) ou só mockup visual pra vender a ideia na página do parceiro?
- **"Livro de Assinaturas" vs "Homenagens" — parcialmente esclarecido (2026-07-24, análise da imagem "pagina publica qr code.jpg" do deck do Pedro, finalmente aberta).** São 2 seções visualmente separadas na página: "Homenagens" (3 cards, nome+tempo+avatar+texto+❤ contagem, igual ao nosso Mural/Condolências de hoje) e "Livro de Assinaturas" (3 cards, nome+parentesco+tempo+mensagem+**assinatura em cursiva no final**, ex: "Maria Aparecida (Esposa)... assinado *Maria Aparecida*" em fonte manuscrita). Os dois têm mensagem de texto nos dois — a diferença real no mockup é de **apresentação** (tributo casual vs. registro formal com assinatura), não de estrutura de dado. Ainda não decidido se viram 2 tabelas/conceitos separados no banco ou só um novo componente visual (o "Livro" animado, ver ideia abaixo) puxando o mesmo dado de `condolencias`/`mural_memorias`.
- **Globo 3D (achado do Awwwards, "Susie & Jay")** — vira parte da aba "Localização" da página do memorial (substituindo o mapa simples do cemitério por globo com lugares da vida + sepultamento), ou fica separado como aba nova? **Adiado explicitamente (2026-07-15, Rafael): "deixa o globo para depois", foco agora é a página de homenagem.**
- **Botão "Começar Agora" da landing → vídeo/tour (2026-07-14, Rafael):** em vez de levar direto pra alguma tela, o botão levaria pra um vídeo sentimental/tour do Legado Digital — Rafael ainda vai criar esse vídeo, não existe ainda. Em aberto: esse vídeo vira uma página própria de apresentação (a mesma que seria mostrada pra família depois?) ou só um player/modal na própria landing? Nada decidido, não construir sem o vídeo existir e sem Rafael confirmar o formato.

- **Página do memorial vira "tipo Facebook" — vários parentes com acesso próprio (2026-07-22, Rafael confirmou opção B).** Contexto: Pedro já tinha pedido (17/07) a parte de condolências mais parecida com rede social — pesquisa de 12 ideias já feita em `docs/PESQUISA_EXPERIENCIA_FAMILIA.md`. Hoje perguntei pro Rafael se ele queria (A) só mais bonito/cheio de elemento, sem mudar quem acessa, ou (B) vários parentes cada um logando separado e postando, tipo rede social de verdade. **Ele confirmou B.** Isso reverte a simplificação consciente de 2026-07-10 (1 e-mail de família, sem conta, sem múltiplos contribuidores) — já registrado como decisão consciente no CLAUDE.md, precisa reabrir essa decisão com clareza antes de construir (e talvez confirmar com o Pedro também, que talvez não soubesse da simplificação original). Nada construído ainda.
  - **Pergunta em aberto, aguardando resposta do Rafael:** ele mencionou "técnicas de gerar vídeo e integrar com as páginas" — perguntei se ele quer (1) vídeo que a IA cria/monta sozinha (tipo vídeo-tributo automático a partir das fotos, via Adobe Firefly/Canva AI/InVideo AI — mesma ideia já registrada mais acima na seção "Vídeo gerado por IA como fundo da landing" do CLAUDE.md) ou (2) só um lugar bonito pra mostrar até 4 vídeos que a família já tem e sobe (galeria de vídeo, sem geração por IA). Rafael disse "aguarde" antes de responder — retomar quando ele voltar.

- **Especificação real de mídia por memorial confirmada (2026-07-22, Rafael, depois de pesquisa de preço real Supabase Pro/Vercel Pro):** 10 fotos (8MB cada = 80MB) + 4 vídeos (100MB cada = 400MB) = 480MB usado, quota de 500MB por memorial. Custo projetado: $39,70/mês em 1.000 memoriais até $3.930,40/mês em 100.000 memoriais (armazenamento + banda estimada). Relatório completo publicado como Artifact e como página real `/admin/mapa/custos` (linkada do `/admin/mapa`), pra Pedro e Ricardo verem. **Ainda não implementado no código** — precisa: (1) migration pra `videos_galeria` (hoje só existe `video_url` singular, 1 vídeo só), (2) atualizar os 3 uploads (`admin/upload`, `familia-upload`, `parceiro/upload`) pra 8MB foto / 100MB vídeo / até 10 fotos / até 4 vídeos, (3) UI nova de galeria de vídeo na página pública e nos 3 formulários de edição. Rafael pediu "calma, não mexe ainda" no banco — aguardando ele dar sinal verde.

- **Painel de velas votivas com fundo/parede mais bonita (2026-07-24, Rafael)** — depois de alinhar a chama certinho (`components/public/AcenderVela.tsx`, regra 20 do CLAUDE.md — nunca reescrever essa parte), Rafael quer deixar o painel onde ficam as 45 velinhas mais bonito, com um fundo tipo "parede" atrás. Sem construir agora — quando for feito, é ajuste só visual em volta do painel, sem tocar na vela principal/pavio/chama que já estão calibrados.
- **E-mail e WhatsApp recebidos direto na Central de Comunicações, e área própria pras funerárias (2026-07-24, Rafael; plano de arquitetura pronto 2026-07-29, Opus)** — hoje a Central de Comunicações só mostra e-mail que O SISTEMA manda. Rafael quer o inverso também: quando alguém MANDA e-mail ou WhatsApp pro `contato@legadodigital.net`, aparecer como chat dentro da Central, e cada funerária ter área equivalente no Portal do Parceiro. Ligado ao LegadoBot respondendo esse chat sozinho (ver CLAUDE.md, "Chatbot IA — status"). **Decisões do plano:** receber e-mail via polling do Gmail API (não webhook/Pub-Sub, complexidade não compensa no volume atual); WhatsApp só via Meta Business Cloud API oficial (não-oficial tem risco real de banimento do número, canal sensível demais pra correr esse risco). Tabelas novas: `conversas`/`mensagens`, RLS no mesmo padrão de `is_own_parceiro`/`is_legado_staff`. Esforço estimado: 6-8 sessões, 4 fases. **Bloqueado em**: Rafael precisa criar conta Google Cloud (OAuth) + Meta Business Manager verificado + número de telefone dedicado antes de qualquer código.
- **Livro de assinaturas animado, 3D de verdade (2026-07-24, reforçado 2026-07-30, Rafael: "igual as velas")** — pessoa digita o nome, página do livro vira sozinha, nome aparece "escrito" por pena/caneta (animação de caligrafia, não texto surgindo de uma vez). Rafael pediu explicitamente pra ter o mesmo nível de trabalho/qualidade técnica da parede de velas (`AcenderVela.tsx`) — não é só CSS 2D simples, é peça 3D de verdade. Peça visual nova, substituindo/complementando o formulário simples de condolências. Prompt pro Claude Design pronto em `docs/PROMPT_CLAUDE_DESIGN_LIVRO_E_PAINEL.md` — **falta o Rafael gerar o mockup lá** (regra 6 do projeto: nunca inventar peça de alta barra visual sem referência real) antes de eu construir/integrar.
- **Painel de velas com cenário ornamentado (2026-07-24, Rafael)** — fundo estilo afresco/capela (referência Michelangelo, sereno, nada exagerado), mural de flores, suportes de vela trabalhados/de época. **Não mexe na vela principal/pavio/chama** (regra 20 do CLAUDE.md) — só o cenário ao redor do painel. Mesmo prompt do livro de assinaturas.
- **Segunda página do memorial, layout "tipo Facebook"/mosaico, pra comparar lado a lado (2026-07-24, Rafael)** — a página atual (`/homenagem/[slug]`) vira **modelo base fixo, nunca reescrito** (regra 21 do CLAUDE.md). Ideia: criar uma rota nova separada (ex: `/homenagem-v2/[slug]`), reaproveitando os mesmos componentes (galeria, mural, vela — sem tocar na vela) só com layout diferente (coluna principal + barra lateral, mosaico), pra Rafael e os sócios verem os dois lado a lado e decidirem depois qual fica. **Falta:** referência visual real (print de perfil do Facebook ou mockup novo no Claude Design) antes de construir — regra do projeto de nunca inventar visual sem referência.

- **Criação de memorial precisa de governança — hoje qualquer parceiro com acesso cria memorial livremente, sem revisão (2026-07-27, Rafael)** — testando o Portal do Parceiro, Rafael criou um memorial de teste ("dirce") direto em `/parceiro/memoriais` e achou errado: "não pode sair fazendo memorial em qualquer lugar... isso seria na parte da Central". Hoje o fluxo é 100% self-service — qualquer conta com papel Parceiro B2B e vínculo em `parceiros_usuarios` clica "+ Novo Memorial" e o registro já existe no banco na hora (rascunho, mas gravado), sem nenhuma revisão da Central antes. Rafael quer organizar isso mas não disse ainda o formato exato — em aberto: (a) memorial criado pelo parceiro nasce num estado "pendente aprovação" e só fica visível/publicável depois que a Central revisar? (b) só a Central pode criar o registro inicial, parceiro só edita depois? (c) outra régua (ex: exigir vínculo com lápide/jazigo real antes de liberar o cadastro)? Não construir nada até ele decidir o modelo — é mudança no fluxo operacional central do produto (`homenagens`), afeta Central + Portal do Parceiro + convenção de "2 registros fictícios" já usada em toda área nova.

## Confirmado, falta só executar

- **Cadastro da família por CPF (2026-07-16) — Fase 1 construída, falta produção.** Ideia do Pedro (extensão do que ele já pediu sobre CNPJ do parceiro), confirmada pelo Rafael. Planejado com Opus (decisões: nunca persistir CPF, só o nome; não mexer no CNPJ do parceiro; token de teste primeiro, produção depois). Construído: seção "Cadastro da família" na ficha do memorial (`/admin/memoriais/[id]`), campo CPF + botão "Consultar CPF" preenche Nome do responsável, rota `app/api/admin/consultar-cpf/route.ts` (staff-only, provedor `cpfcnpj.com.br`, token de teste — dado fictício, sem custo). **Falta pra virar produção real:** (1) tabela de preços dos pacotes ainda não lida (`IDs dos Pacotes e Preços` na doc deles) — pacote fixado em `1` ("CPF A") só como exemplo, precisa confirmar; (2) token de produção (Rafael gera no painel `cpfcnpj.com.br/admin`); (3) token de produção é amarrado a IP de origem fixo, e a Vercel (serverless) tem IP de egress dinâmico — bloqueio técnico real a resolver antes de funcionar em produção, ainda sem solução decidida (add-on de IP fixo, proxy de saída, ou trocar de provedor).
- **CNPJ do parceiro via cpfcnpj.com.br** — decisão do plano foi NÃO trocar (BrasilAPI já funciona, é grátis, CNPJ é dado público). Só reconsiderar se surgir um motivo concreto novo.

## A verificar depois (Rafael pediu, sem ação agora)

- **Inovação na experiência da família na página do memorial (2026-07-15, pesquisa paralela feita a pedido do Rafael)** — 2 pesquisas Opus em paralelo, relatório completo em `docs/PESQUISA_EXPERIENCIA_FAMILIA.md`, 12 ideias concretas com referência real (StoryWorth, Remento, Evaheld, Murial, etc). **Gap estrutural achado:** todo líder de mercado usa dono+contribuidores convidados+moderação+2 camadas de privacidade — o projeto simplificou pra 1 e-mail sem conta de propósito em 2026-07-10. Reintroduzir isso é decisão grande, precisa confirmação explícita (e talvez confirmar com o Pedro). Nada construído ainda.

## Registrado, sem construir ainda (não esquecer)

- **Dashboard — elementos do mockup do Pedro que faltam:** card "Memorial em Destaque", "Comentários Recentes", "Resumo de Moderação" (pendentes/aprovados/rejeitados/denúncias), donut de QR Codes (Ativos/Pausados/Expirados/Inativos), barra "Ações Rápidas" (Novo Memorial/Registrar Homenagem/Adicionar Assinatura/Gerar QR Code/Gerenciar Usuários/Relatórios), mapa interativo de localização no cemitério dentro do próprio dashboard.
- **3 imagens do deck do Pedro nunca abertas:** Página Memorial Pública, Aplicações Digitais/Institucionais, Presença Física e Comunicação — só Dashboard e Gestão de Memorial foram vistos até agora.
- **Claude Design** (Anthropic Labs, lançado abril/2026) — ferramenta real confirmada, deixa exportar direto pro Claude Code. Ainda não usada nem registrada como opção de workflow.
- **21st.dev Magic MCP** — pesquisado, nunca instalado (só o Firecrawl foi, com a chave que o Rafael passou).
- **Pesquisar tutoriais do YouTube sobre integração de vídeo, transições 3D, frameworks e outras técnicas pro projeto (2026-07-15, Rafael pediu explicitamente pra não esquecer).** Fazer scrape/pesquisa de tutoriais reais quando for a vez de mexer em vídeo/3D de novo — ainda não pesquisado.
- **Cemitério inteiro em 3D (2026-07-15, Rafael):** igual ao modelo do jazigo, mas pro cemitério inteiro. Pesquisado: **Google Earth Studio NÃO serve** (é só renderizador de vídeo cinematográfico offline, sem API de embed interativo). A API certa é a **"Photorealistic 3D Tiles" do Google Maps Platform** (`developers.google.com/maps/documentation/tile/3d-tiles`) — mesma fonte de dados 3D do Google Earth, acessível via chave de API, feita pra embutir e navegar em tempo real num visualizador 3D (three.js/Cesium/etc). É paga (Google Maps Platform, cobrança por uso). Nada decidido ainda — falta avaliar custo real e se a resolução do mesh cobre cemitérios específicos (qualidade varia por região, nem todo lugar tem captura de alta resolução).

## Cartão de Sepultamento (2026-08-17, proposta pros sócios — não decidido)

Entregar a localização do túmulo **no dia do sepultamento**, não semanas depois quando o memorial
fica pronto. Nome, cemitério, quadra, fileira, túmulo e o caminho a pé — um link que a funerária
manda pra família no mesmo dia e ela repassa pro grupo inteiro. Não exige biografia, foto antiga
nem nada que dependa de tempo da família.

**Não é produto novo nem preço novo:** a funerária já paga R$ 80-150 por ativação na tabela do
Ricardo (deck "Estratégia de Precificação", 13 slides, recebido 2026-08-17). O Cartão vira a entrega
dessa ativação — em vez de um link vazio esperando alguém preencher.

**Custo real do mapeamento (número do Rafael, 2026-08-17):** ortomosaico do cemitério inteiro custou
**R$ 800** em Tupaciguara e **R$ 500** em Uberlândia. Contra venda de R$ 5-15/jazigo (faixa B2G do
deck), dá R$ 0,04/jazigo no São Pedro — margem de 99% sobre o voo. Libera voar ANTES de vender:
chegar na prefeitura com o mapa dela pronto na tela vira custo de prospecção, não risco.

**O que a funerária se compromete a fazer** (cláusula de contrato, decidido pelo Rafael): tirar a
**foto da lápide** e **marcar a localização no GPS** — os mesmos 2 passos que o Pedro fez no São
Pedro, com o celular dele, sem treinamento. O cemitério já chega mapeado, o funcionário não desenha
nada.

**Endereçamento é automatizável e já foi automatizado em parte** (posição do Rafael, confirmada pelo
histórico): 186 túmulos em 10 ruas reconhecidos por visão computacional no José Lázaro, script
genérico (`scripts/ortomosaico/mapear-cemiterio.py`). Falta rodar de ponta a ponta num cemitério
grande — o São Pedro tem fileiras mais coladas, caso onde o algoritmo erra mais.

**Relatório completo pros sócios:** https://claude.ai/code/artifact/7421c40a-daec-40e1-8c25-2d6039520dca

**Pendências de decisão dos sócios:**
- Contradição real: a ata de 16/07 diz que NÃO é venda direta pra família; o deck do Ricardo tem um
  segmento B2C Direct inteiro (e-commerce + tráfego pago). Estratégias que competem entre si.
- Preço fechado por voo pras próximas cidades (os 2 primeiros foram negociados caso a caso, e o menor
  saiu mais caro).
- Quantos sepultamentos/mês o São Pedro faz — denominador de toda a conta.

**Nada construído.** As telas do fluxo (cadastro rápido de sepultamento, página enxuta de localização,
botão de enviar pra família) não existem — só o mapa, o endereçamento e a conferência por GPS, que já
estão no ar.

## Decks de apresentação do Ricardo (2026-09-02, aguardando decisão)

Ricardo mandou 2 PDFs prontos, provavelmente gerados por IA (tipo Gamma) — mesma ideia do "book
digital" de vendas já cogitada em 26/08 (nunca aprovada). Guardando aqui pra não perder, análise feita
na hora:

- **"Apresentação Financeira Legado Digital"** (13 slides) — modelo de preço sugerido (Memorial
  Básico R$250 taxa única, Premium R$490, Membro PAF Corp +R$3,50/mês), margem 320% no up-sell,
  projeção de MRR em 36 meses, receita incremental por porte de funerária.
- **"Apresentação Comercial Legado Digital"** (13 slides) — pitch pra funerária: cenário do setor,
  solução (placa QR + espaço online), experiência da família, 3 modelos de parceria (inclusão no PAF /
  venda direta up-sell / cortesia premium), jornada de implantação em 4 passos, "4 níveis de acesso".

**Aproveitável:** estrutura narrativa e os 3 modelos de parceria (batem com o modelo B2B2C já
confirmado em ata — funerária paga, não a família).

**Cuidado antes de usar pra vender de verdade:**
- Todo número financeiro é inventado (320% margem, 100% satisfação, churn -18%, os preços) — nenhum
  vem do banco real nem foi decidido pelos sócios (preço/modelo segue pendência aberta, Fase 4).
- Imagens são banco de imagem genérico, não print do sistema real — a própria última página do PDF
  financeiro entrega a fonte (qlik.com, boldbi.com, dashboards de outro produto qualquer); o comercial
  usa foto de honoryou.com/gabb.com pro cemitério e a família no celular.
- "4 níveis de acesso" — sistema real tem 5 modos (aberto/senha/identificação/lista de e-mail/oculto).
- "Envio do acesso via WhatsApp" — sistema real manda por e-mail (SMTP Google Workspace), não
  WhatsApp.

**Pendência:** decidir se vira a base do book digital de vendas de verdade — troca números fictícios
por preço decidido (ou tira os números até decidir) e print real do sistema no lugar do stock.
