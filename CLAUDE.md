# Legado Digital — Briefing do Projeto

## Regra — Tudo tem que ser escalável (2026-07-15)
**Todo planejamento/construção precisa ser expansivo desde o início** — se der certo, o uso vai escalar rápido, o sistema precisa estar preparado. Não é só sobre integração externa (regra antiga já cobria isso), é sobre qualquer decisão técnica: schema de banco, upload de arquivo, geração de identificador (slug), etc. Gambiarra que funciona só em escala pequena não é aceitável mesmo que "resolva por agora". Motivo concreto (2026-07-15): achado nessa sessão que upload de foto/vídeo/galeria nunca limpa o arquivo antigo do Supabase Storage (todo upload novo cria objeto novo com timestamp, o antigo fica órfão pra sempre) — funciona hoje com poucos memoriais, mas acumula custo de armazenamento sem limite conforme o uso cresce. Corrigido no mesmo dia que descoberto.

## Regra — Qual modelo usar pra cada tarefa (2026-07-15, atualizado com pesquisa oficial)
A ferramenta de subagente (Agent tool) aceita 4 modelos: `sonnet`, `opus`, `haiku`, `fable`. Primeira versão dessa regra tinha uma suposição errada sobre o Fable 5 (achava que era "força em texto/narrativa") — **corrigido depois de pesquisar a doc oficial** (`platform.claude.com/docs/en/about-claude/models/choosing-a-model`), matriz de seleção real da Anthropic:

- **Claude Sonnet 5** — "frontier intelligence at scale, built for coding/agents/enterprise": geração de código, análise de dado, criação de conteúdo, entendimento visual, uso agentic de ferramenta. É o modelo padrão dessa sessão (quem executa: código, edição de arquivo, build, commit) — não precisa spawnar subagente pra isso.
- **Claude Opus 4.8** — "complex agentic coding and enterprise work": agente autônomo de várias horas, refatoração grande, engenharia de sistema complexa, pesquisa avançada, workflow pesado de visão, computer use. **Validado 2x** nessa sessão como planejador (`subagent_type: "Plan"`, `model: "opus"`): plano do redesign da página do memorial, e diagnóstico do bug real da chama da vela (colisão `transform`×`@keyframes`).
- **Claude Haiku 4.5** — "near-frontier performance, lightning-fast, extended thinking, mais econômico": aplicação em tempo real, processamento de alto volume, deployment sensível a custo que ainda precisa de raciocínio forte, **e a doc cita literalmente "sub-agent tasks"** — candidato natural pra tarefa mecânica/repetitiva quando a gente já sabe o que precisa ser feito. Ainda não usado nesse projeto.
- **Claude Fable 5 — CORRIGIDO (não é "narrativa"):** doc oficial descreve como **"Anthropic's most capable widely released model, delivering next-generation intelligence for long-running agents"** — o mais capaz disponível amplamente, focado em agentes de longa duração, não em texto criativo. Suporta 1M tokens de contexto, até 128k tokens de saída, "adaptive thinking" sempre ligado. **Preço bem mais alto** que os outros ($10/milhão tokens de entrada, $50/milhão de saída) — por isso não é o padrão pra tudo, é pra quando a tarefa realmente precisa do teto de capacidade. Ainda não testado nesse projeto, mas a suposição antiga (testar só em copywriting) **não tem base real** — pode fazer sentido testar em planejamento também, já que é descrito como mais capaz que os outros modelos.
- **Claude Mythos 5** — existe, mas só disponível via "Project Glasswing" (programa restrito da Anthropic), não é opção de uso normal.
- **Parâmetro "effort"** (Opus 4.8/4.7 e modelos recentes) — troca inteligência por latência/custo **dentro do mesmo modelo**, geralmente melhor alavanca que trocar de modelo inteiro. Opus 4.8 já vem em `high` por padrão; `xhigh` é recomendado pra código/trabalho agentic de alta autonomia.

Regra geral: nunca inventar arquitetura complexa sozinho sem consultar um modelo mais forte primeiro (permanente, validada com Opus). Fable 5 é candidato real a testar como planejador também, dado o que a doc oficial diz — sem uso real ainda nesse projeto pra confirmar na prática.

## Regra Obrigatória — Atualização do CLAUDE.md
**Após cada tarefa concluída, o Claude Code DEVE atualizar este arquivo:**
- Marcar itens concluídos com [x]
- Adicionar o que foi feito na seção "O que está pronto"
- Atualizar "Fase Atual" com próximos passos
- Registrar decisões técnicas importantes tomadas
- Esta regra não pode ser ignorada — é parte do fluxo de trabalho

**Um commit só, um deploy só:** CLAUDE.md e `/admin/mapa` atualizam no MESMO commit/push da modificação de código, nunca em commit separado depois. Gasta tempo e token à toa fazer 2 deploys pra mesma tarefa.

## Regra — Backup no "Cérebro Claude" (pasta LOCAL, corrigido 2026-07-15)
Toda vez que o Rafael mandar PDF/documento/material relevante, ou uma técnica der certo de verdade (padrão validado, tipo a integração 3D do jazigo), registrar uma cópia em **`C:\Users\vivav\Desktop\Cerebro Claude - Legado Digital\`** (pasta local, arquivos HTML simples) — não esperar ele pedir de novo cada vez.

**Histórico da decisão:** primeira tentativa (mesmo dia) foi criar pasta no Google Drive e subir PDF via `create_file` com conteúdo em base64 — **descoberto na hora que isso não escala**: um PDF de ~100KB vira ~137 mil caracteres em base64, que tokeniza pessimamente (~130 mil tokens só pra ler de volta, quase estourando o contexto da conversa). Corrigido primeiro pra Google Docs via `textContent` (texto puro, sem base64) — mais barato, mas Rafael preferiu simplificar de vez: **pasta local na área de trabalho, sem Drive nenhum**. 3 documentos já existem lá: `resumo-projeto.html`, `relatorio-mcps-skills.html`, `padroes-tecnicos.html`.

## Regra — Pesquisar antes de inventar (2026-07-15)
Ver também `docs/TEMPLATE_PROMPT_CRIATIVO.md` — formato de brief criativo estruturado (persona, paleta com hex, tipografia, beats de storytelling, palavras-chave) pra usar toda vez que for pedir peça visual grande pra um modelo mais forte.

**Antes de construir algo com barra de qualidade visual/técnica alta (efeito, animação, componente de UI que precisa parecer profissional), pesquisar referência real primeiro (Firecrawl, CodePen, Awwwards, etc.) — nunca inventar do zero por conta própria e torcer pra ficar bom.** Motivo: a primeira versão da vela (`components/public/AcenderVela.tsx`, 2026-07-15) foi inventada sem pesquisa — um blob genérico com filtro de distorção que ficou ruim de verdade ("ta uma porcaria", segundo o Rafael). Só funcionou depois de pesquisar um CodePen respeitado (`antoniandre/pen/aRPJoM`) e seguir a técnica real dele (transform composto pra forma de chama, não border-radius simples). "Não sabe, pesquise" — não é opcional, é padrão de trabalho.

**Build passou → commit + push direto, sem perguntar.** Não fica esperando confirmação a cada vez — o usuário já autorizou isso como regra permanente (2026-07-10). Só para e avisa se o build falhar.

## Regra — Nunca pedir slug/endereço técnico em tela pública
Em qualquer fluxo de acesso pra visitante/família (login, busca), **nunca** peça o slug/endereço do memorial digitado à mão (ex: "maria-da-silva"). Não é prático, ninguém guarda isso de cabeça. Sempre buscar pelo **nome do homenageado** (like/ilike em `homenagens_busca_publica`), mostrar resultados com foto+nome, pessoa escolhe o certo. O slug fica por trás, resolvido pela busca — nunca é campo de formulário voltado pro público. Corrigido em `/familia/login` (2026-07-10, era o "Endereço do memorial" na aba de código).

## Regra — Relatório de Skills e MCPs
Toda vez que uma skill (gstack, frontend-design, ui-ux-pro-max, etc.) ou MCP (Supabase, Vercel, etc.) for usada, registrar em `docs/USO_SKILLS_MCPS.md`: o que foi usado, motivo, o que produziu. Log separado do CLAUDE.md — serve pra aprendizado e rastreabilidade do que a IA usou e por quê.

## Regra — Clareza de rótulos na UI
Rótulo de menu/botão precisa deixar óbvia a ação (ex: "Memoriais (Cadastrar/Editar)", não só "Memoriais"). Motivo: usuário achou que cadastro de memorial não existia no Portal do Parceiro — só o rótulo do menu não deixava isso claro, a função já existia.

## Regra — Retorno pra página anterior
Toda página de detalhe/edição (acessada clicando em algo de uma lista, ex: `/admin/memoriais/[id]`, `/admin/parceiros/[id]`, `/familia/[slug]`) precisa ter um link visível de volta no topo (ex: "← Voltar pra Memoriais", "← Sair"). Não deixar a pessoa só no botão "voltar" do navegador. Registrado 2026-07-10 depois de aplicar em `/familia/[slug]` (não tinha nenhum retorno — família ficava presa na tela sem saída visível).

**Estendida 2026-07-14:** toda página de login (`/admin/login`, `/parceiro/login`, `/familia/login`) também precisa de "← Voltar pro site" linkando pra landing (`/`) — nenhuma das 3 tinha, corrigido.

## Regra — Logo real em toda página
`public/logo-legado-digital.png` (arco dourado + planta, fundo transparente, baixada do Drive) é a logo oficial — usar via `next/image` em toda tela de acesso/identificação do produto (login de Central/Parceiro/Família, topo da sidebar da Central, Navbar/footer da landing), nunca texto "Legado Digital" solto como substituto. Padrão profissional: mesma logo, mesmo lugar (topo, centralizada ou alinhada à esquerda conforme o layout), em todo canto do produto. Aplicada em 2026-07-14: sidebar da Central, header mobile, 3 logins, Navbar da landing, footer da landing.

**Tamanho/qualidade (2026-07-14):** "isso é a marca, tem que ficar impecável sempre" — nunca deixar a logo pequena/discreta demais. **Mas também não pode transbordar a barra** — tentativa de `h-28 lg:h-36` (maior que o próprio container `h-24 lg:h-28`) estourou o layout da Navbar, revertido no mesmo dia. Tamanho certo: logo sempre menor que a altura do container que a envolve, com folga visível (padding), nunca igual ou maior. Tamanhos atuais: sidebar da Central `h-14`, telas de login `h-20`/`h-24` (centralizadas), footer da landing `h-16`, **Navbar da landing:** container `h-20 lg:h-24`, logo `h-16 lg:h-20` (cabe com folga, não transborda). Arquivo fonte é 803×389px — segura esses tamanhos sem borrar; se precisar de exibição ainda maior no futuro, fazer upscale de verdade antes (Real-ESRGAN, grátis, open source — tentativa nessa sessão não completou por Space do Hugging Face não responder, retomar depois se precisar).

## Regra — Layout de ficha na Central: não empilhar tudo em coluna única
Ficha de detalhe (`/admin/memoriais/[id]` e afins) usa grid responsivo (`grid-cols-1 lg:grid-cols-3`), não uma pilha de cards um embaixo do outro. Conteúdo principal (dados/formulário) ocupa 2/3 da largura; informação de consulta rápida (ex: QR Code) fica ao lado, na coluna de 1/3, visível sem rolar a página. Em mobile reflui pra coluna única normalmente. Motivo: usuário reclamou que tudo ficava "uma coisa embaixo da outra" mesmo em tela larga — o problema não era mobile-first, era nunca ter sido montado um breakpoint de desktop. Registrado 2026-07-10.

## Regra — Prompt do LegadoBot atualizado junto com o sistema (2026-07-14)
`docs/LEGADOBOT_PROMPT.md` é o system prompt do futuro chatbot de atendimento (LegadoBot). Fase 1: só conhecimento interno (Central + Portal do Parceiro) — família e público entram depois. Toda vez que uma funcionalidade muda/é criada na Central ou no Portal do Parceiro, esse arquivo precisa ser atualizado junto (mesma disciplina do CLAUDE.md — não esperar acumular).

## Regra — Não perder ideias em aberto (2026-07-14)
Se o Rafael não respondeu uma pergunta/sugestão, é porque não viu — não pode sumir da conversa. Toda ideia/pergunta minha ou dele que ainda não teve decisão vai pro **`docs/RASCUNHO_IDEIAS.md`** (arquivo separado, é rascunho). Só quando uma ideia de lá for decidida/concluída/corrigida ela sai do rascunho e vira registro definitivo aqui no CLAUDE.md. Nunca decidir/construir uma ideia do rascunho sem confirmação do Rafael primeiro.

## Regra — Integração Central ↔ Portal do Parceiro ↔ Página Pública
Toda feature nova precisa ser refletida nos lados relevantes: se o parceiro pode editar algo sobre o próprio parceiro (ex: logo/descrição da página pública), a Central também precisa poder ver/editar isso — nunca implementar só de um lado. Se algo aparece na página pública, os dois portais internos (Central e Parceiro) devem ter visibilidade do dado por trás.

## O que é
Plataforma B2B2C para criação, gestão e acesso a memoriais digitais vinculados a QR Codes, lápides, jazigos, gavetas, caixas ossuárias, cemitérios, crematórios, funerárias, planos funerários, prefeituras e concessionárias cemiteriais.

Famílias preservam histórias, fotos, vídeos, mensagens e registros de pessoas falecidas, com configurações de privacidade e governança definidas pelos próprios familiares.

## Modelo de Negócio
B2B2C — parceiros privados e públicos como canais de venda, ativação e operação.

## Stack Técnica
- Frontend/Backend: Next.js 16 + TypeScript (App Router)
- Banco: Supabase (PostgreSQL)
- ORM: Prisma
- Estilo: Tailwind CSS v4 + shadcn/ui
- Deploy: Vercel
- Autenticação: Supabase Auth (email/senha no MVP)
- Storage: Supabase Storage (fotos, vídeos, documentos)

## Os 6 Ambientes do MVP
1. **Website institucional** — captação de parceiros B2B
2. **Admin Legado Digital** — equipe interna opera tudo
3. **Portal do parceiro B2B** — cemitérios, funerárias, prefeituras
4. **Portal da família** — familiares gerenciam o memorial
5. **Página do memorial** — visitantes acessam via QR Code, URL ou busca
6. **Busca pública** — busca de memoriais com filtros e privacidade

## Parceiros B2B Atendidos
- Empresas privadas: cemitérios, crematórios, funerárias, planos funerários
- Empresas públicas: prefeituras, cemitérios municipais, autarquias, concessionárias
- Parceiros comerciais: associações, entidades religiosas, canais de venda regionais

## Estrutura Cemiterial (hierarquia obrigatória)
```
País → Estado → Cidade
  → Cemitério / Crematório (lat/lng recomendado)
    → Setor / Quadra / Ala / Bloco (lat/lng opcional)
      → Jazigo / Túmulo / Lápide (lat/lng opcional)
        → Gaveta (herda lat/lng do jazigo)
          → Pessoa falecida → Memorial
        → Caixa ossuária (herda lat/lng do jazigo)
          → Pessoa exumada → Memorial
```

**Regra importante:** Um jazigo pode ter várias gavetas. Cada gaveta pode conter uma pessoa. Um jazigo também pode conter caixas ossuárias com restos mortais de pessoas exumadas.

## Papéis de Usuário
| Papel | Função |
|---|---|
| Admin Legado Digital | Gestão total da plataforma |
| Operador Legado Digital | Cadastro e edição operacional |
| Parceiro B2B | Acompanha memoriais, solicita ativações, acessa QR Codes |
| Familiar responsável | Aceita termos, administra memorial, define privacidade |
| Familiar administrador | Ajuda na gestão conforme permissões |
| Visitante identificado | Acessa quando memorial exige login |
| Visitante público | Visualiza conteúdos permitidos |

## Modos de Privacidade do Memorial
- Público por QR Code
- Público por URL
- Público por busca
- Privado por e-mail
- Privado por cadastro
- Oculto

## Entidades Principais do Banco
- usuarios, perfis, permissoes
- parceiros_b2b, contratos, pagina_publica_parceiro
- planos, aquisicoes, utilizacao, fechamento_mensal
- paises, estados, cidades
- cemiterios, crematórios, setores, quadras
- jazigos, gavetas, caixas_ossarias
- pessoas, memoriais, responsaveis_familiares, administradores_familiares
- fotos, videos, documentos, historias, mensagens, comentarios, livro_visitas
- qr_codes, configuracoes_privacidade, termos_aceite, notificacoes

## Fluxo Operacional do MVP
1. Parceiro B2B apresenta e vende o serviço
2. Parceiro ou equipe Legado Digital registra solicitação inicial
3. Familiar responsável aceita termos e fornece dados mínimos
4. Equipe ou familiar complementa dados, conteúdo e localização
5. Memorial criado em modo rascunho
6. Família revisa, aprova privacidade e autoriza publicação
7. QR Code e URL gerados e vinculados à estrutura física
8. Memorial publicado conforme regra de acesso definida
9. Interações futuras geram notificações aos responsáveis
10. Utilização registrada para fechamento mensal e futura integração ERP

## Roadmap — Fases
| Fase | Entrega |
|---|---|
| **Fase 1** | Fundação: banco, auth, admin básico, website inicial |
| **Fase 2** | Portal parceiro, busca, página pública do parceiro |
| **Fase 3** | Portal família, conteúdo, privacidade, publicação |
| **Fase 4** | Planos, aquisições, utilização, fechamento mensal |
| **Fase 5** | Geolocalização avançada, mapeamento cemiterial |

## Mapa Visual das Páginas
Organograma dos 6 ambientes + fluxo de dados dos memoriais (parceiro_id): mantido como Artifact, atualizar a cada mudança estrutural relevante (não só quando pedido).

## Fase Atual
**FASE 1 — Fundação** (concluindo) → entrando na **FASE 2 — Portal parceiro**

Prioridades imediatas:
- [x] Schema do banco (perfis, usuarios, permissoes)
- [x] Central do Legado Digital (admin)
- [x] Supabase Auth integrado na tela de login
- [x] Contas dos sócios criadas (Rafael, Pedro, Ricardo)
- [x] RLS corrigido com políticas de leitura
- [x] Layout admin protegido por papel admin_legado_digital
- [x] CRUD de Parceiros (com página de detalhe por parceiro)
- [x] Módulo de Cemitérios (cadastro + mapa Leaflet pra localização)
- [x] parceiro_id vinculando memoriais a parceiros
- [x] Mapa de páginas embutido na Central (`/admin/mapa`)
- [x] Portal do Parceiro B2B (login, layout protegido, CRUD de memoriais próprio)
- [x] Dashboard do Portal do Parceiro + acesso direto pela Central
- [x] Corrigir rota pública `/homenagem/[slug]` (testado com memorial real e slug inexistente)
- [x] CRUD completo de Memoriais na Central (hoje só leitura)
- [x] Upload de foto principal do homenageado nos formulários (Central e Portal do Parceiro) — antes só vídeo/galeria/timeline tinham upload
- [x] Busca pública `/busca` — busca memorial por nome, sem grade aberta (só resultado da busca)
- [x] Sub-landing pública do parceiro `/parceiros/[slug]` — logo, descrição, busca interna escopada ao parceiro (grade aberta com todos os memoriais foi removida — vazava privacidade)
- [x] Senha de acesso por memorial (tabela `homenagens_seguranca`, hash scrypt, nunca exposta ao anon — `homenagens_busca_publica` só expõe `tem_senha` boolean). Campo de senha nos formulários (Central e Parceiro) via `/api/memorial-senha`; verificação pública via `/api/memorial-acesso`. Resultado de busca com senha exige senha antes de liberar o link do memorial
- [x] Atalho "Página Pública" no menu da Central, do lado do "Mapa"
- [x] Botão "Buscar um Memorial" na landing, linkando pra `/busca`
- [x] Edição de logo/descrição da página pública do parceiro — na Central (`/admin/parceiros/[id]`) E no Portal do Parceiro (`/parceiro`), os dois lados
- [x] Campo de sugestões dos sócios em `/admin/mapa` (tabela `mapa_sugestoes`, RLS staff-only)
- [x] Timeline reorganizada em blocos de evento (Ano/Título/Descrição + mover ↑↓ + remover), trocando o textarea confuso `ano | título | descrição`
- [x] Senha de edição por memorial (`homenagens_seguranca.senha_familia_hash`, separada da senha de acesso) — campo no formulário Central e Parceiro
- [x] **Portal da Família** (`/familia/login` + `/familia/[slug]`) — família busca pelo nome do homenageado + senha simples gerada automaticamente (1 e-mail por memorial, sem conta, sessão via cookie assinado HMAC de 12h), edita os mesmos campos do admin/parceiro (foto, vídeo, galeria, timeline, bio, frase). Central e Parceiro continuam vendo tudo (mesma tabela `homenagens`). Simplificado 2026-07-10 (ver seção própria)
- [x] QR Code — implementado. PNG gerado no servidor com lib `qrcode` (`lib/qrcode.ts`), sem API externa. `POST /api/memorial-qrcode` (staff ou dono do parceiro) monta a URL com `req.nextUrl.origin` + `/homenagem/[slug]` (sem hardcode de domínio), gera o PNG e salva em `memoriais/qrcodes/{slug}.png` no Storage, grava `homenagens.qr_code_url`. Auto-gera: ao criar memorial na Central (`/admin/memoriais`) e ao salvar no Portal do Parceiro (`/parceiro/memoriais`); na ficha (`/admin/memoriais/[id]`) gera sozinho se abrir e não tiver QR ainda (cobre memoriais antigos). Botão "Baixar QR Code" + "Gerar/Atualizar QR Code" manual nos dois portais. `lib/gerarQrCode.ts` centraliza a chamada client-side (evita repetir em 3 arquivos).
  - Pipeline "gerado memorial = gerado QR = encaminhado e-mail": toda vez que o QR é (re)gerado, `/api/memorial-qrcode` confere `configuracoes_sistema.email_fornecedor_placas` e, se tiver e-mail cadastrado, manda automaticamente pro fornecedor de placas via **Resend** (`lib/enviarEmailQrCode.ts`) — corpo do e-mail com nome do homenageado, ID do memorial, link da página, e o PNG anexado com nome de arquivo = slug (pra não trocar placa errada). Campo do e-mail é editável em `/admin/mapa` (tabela `configuracoes_sistema`, chave `email_fornecedor_placas`, RLS staff-only) — hoje é 1 fornecedor só, dá pra trocar o e-mail ali sem mexer em código.
  - **Regra registrada (2026-07-10):** toda integração com serviço externo (pagamento, banco, e-mail, etc) tem que ser escalável mesmo que o plano gratuito não baste depois — pagar por um serviço bom é aceitável, gambiarra pra economizar não.
  - **Pendente de configuração (atualizado 2026-07-10):** Resend instalado via **Vercel Marketplace** direto (já injeta `RESEND_API_KEY` na Vercel) — falta só adicionar a mesma key no `.env.local` pra funcionar local também. Domínio próprio ainda não existe (sócios vão decidir) — sem ele, Resend só manda pro e-mail do dono da conta, não pro destinatário real (família/fornecedor). Assim que tiver domínio: comprar (Vercel Domains, Registro.br ou Namecheap), verificar no painel Resend (registros SPF/DKIM), e trocar o `from` hardcoded (`onboarding@resend.dev`) nos 3 arquivos de e-mail (`lib/enviarEmailQrCode.ts`, `enviarEmailSenhaFamilia.ts`, `enviarEmailConfirmacaoPlaca.ts`).
  - **Visibilidade no dashboard (2026-07-10):** memoriais com QR Code (thumbnail + "Baixar QR Code") aparecem direto no dashboard da Central (`/admin`) e do Portal do Parceiro (`/parceiro`), não só na ficha de cada memorial — usuário achou a versão só na ficha pouco visível. Campo "E-mail do fornecedor de placas" também está no dashboard da Central (além do `/admin/mapa`).
  - **Mensagem da placa (2026-07-10):** campo `homenagens.mensagem_placa` (texto livre, definido pela família) no formulário Central e Parceiro, dentro do card de QR Code. Vai junto no corpo do e-mail pro fornecedor sempre que o QR é (re)gerado — QR Code e texto da placa chegam juntos pro fornecedor confeccionar tudo de uma vez, sem risco de vir separado.
  - **Confirmação da família antes do fornecedor (2026-07-10):** salvar a mensagem da placa (`POST /api/admin/salvar-mensagem-placa`) zera `homenagens_seguranca.mensagem_placa_confirmada` e manda e-mail (`lib/enviarEmailConfirmacaoPlaca.ts`) pro `familia_email` cadastrado, com link de 1 clique (token aleatório em `emails_enviados.token`, sem precisar de login) pra `/confirmar-placa/[token]`. **Enquanto não confirmado, o e-mail pro fornecedor NÃO sai** — `lib/dispararEmailFornecedor.ts` (usado tanto no `/api/memorial-qrcode` quanto na página de confirmação) checa isso antes de enviar. Editar a mensagem depois de confirmada reseta a confirmação — força reconfirmar. Sem mensagem cadastrada, o fluxo antigo continua (QR vai direto pro fornecedor).
  - **Central de E-mails (2026-07-10):** tabela `emails_enviados` loga todo e-mail disparado (senha da família, confirmação de placa, envio ao fornecedor) — destinatário, assunto, status (`enviado`/`confirmado`/`erro`), com mensagem de erro quando falha. Painel em `/admin/emails` (staff vê tudo) e `/parceiro/emails` (RLS restringe aos memoriais do próprio parceiro) — parceiro confirma que a família já aprovou a placa sem precisar abrir e-mail nenhum.
- [x] Manual do sistema (`/admin/manual`) — o que tem em cada página + integração, linkado do `/admin/mapa` (link no topo + "Tutorial →" em cada nó do organograma e módulo). Mantido atualizado junto com o mapa, mesma disciplina.
- [x] **Hero 3D da landing redesenhado (2026-07-12)** — trocado o torus knot genérico (estética tech/crypto sem relação com o tema) por "brasas subindo" (`components/Hero3D.tsx`): 800 partículas em `THREE.Points` com shader GLSL próprio (vertex faz o ciclo de subida + oscilação lateral, fragment faz o glow radial), `AdditiveBlending` sem precisar de `@react-three/postprocessing` (dependência nova evitada), cor dourada `#C9A46A` igual ao resto da identidade, esfera central pulsante (`GlowCore`) simbolizando a chama/memória. Respeita `prefers-reduced-motion` (cai pra gradiente estático, sem Canvas). Sem RAF descontrolado tipo o bug do `FundoParallax` antigo — `useFrame` do react-three-fiber já é gerenciado pelo próprio Canvas.
- [x] **Relatório de mapeamento por drone pro Pedro (2026-07-12)** — página real em `/admin/mapa/drone` (antes só existia como Artifact fora do app): hardware (DJI Mini 4 Pro/Air 3/Mavic 3 Enterprise/D-RTK 2), apps de voo, GCP, software de fotogrametria, fluxo de 5 passos, limites do que a IA pode/não pode fazer, custo/esforço. Acessível de dois lugares: card "Ideias em avaliação" no `/admin/mapa` E botão **"Instalação Drone"** direto em `/admin/cemiterios`, do lado do "+ Novo Cemitério" (pedido explícito — usuário queria visível ali, não só no mapa).
- [x] **Atribuição das ideias de drone/mapeamento unificada (2026-07-12)** — as duas ideias (drone e navegação tipo Waze até o túmulo) eram creditadas separadamente (uma ao Pedro, outra ao Rafael); na verdade são uma ideia só, do Pedro. Corrigido no `/admin/mapa` e neste arquivo.
- [x] **Ajustes de UI (2026-07-12)** — nav da Central (`app/admin/layout.tsx`) quebrava/cortava texto em tela menor: adicionado `overflow-x-auto` + `whitespace-nowrap shrink-0` nos links. Organograma do `/admin/mapa` não deixava óbvio que dava pra arrastar pros lados pra ver todos os 6 ambientes: adicionada dica visual "← arraste pro lado pra ver todos os ambientes →" acima do organograma.
- [x] **Limpeza de conteúdo estranho no repositório (2026-07-12)** — pastas/arquivos sem relação com Legado Digital (`mcp-finance-dossie/`, `system_prompts_leaks/`, docs soltos como `GRAPHIFY_GUIA_COMPLETO.md`, `HOMENAGEM_V2_HANDOFF.md`, etc.) estavam vazando pro escopo do TypeScript do Next.js e quebrando o build (`Cannot find module 'axios'` vindo de um adapter de trading dentro de `mcp-finance-dossie`, nada a ver com o projeto). Movidos (não apagados) pra `Desktop\Utilitários\Removido-Legado-Digital\`.
- [x] **3D da landing — só o ícone, funcionou (2026-07-14)** — 1ª tentativa com a logo inteira (arco+planta+texto) ficou ilegível (TripoSR reconstrói profundidade de foto, não texto vetorial fino). Corrigido: `sharp` (instalado temporariamente) recorta só o ícone (arco+chama+planta+livro, sem nenhum texto) de `logo-legado-digital.png`, aparado (`trim()`) e upscalado 4x com reamostragem Lanczos3 (183×238 → 732×952) antes de gerar o 3D — forma sólida sem texto reconstrói muito melhor. Novo `.glb` em `public/3d/logo-icone.glb` (2MB, mc_resolution 320, o máximo do slider). Animação trocada de rotação pra **zoom pulsando** (`scale` oscilando com `Math.sin`, não `rotation.y`) a pedido do Rafael. Fonte do recorte fica em `public/logo-icone-somente.png`.
  - ~~3D da landing refinado (2026-07-13)~~ — trocado de "brasas + esfera pulsando" (achado genérico demais, "rabisco na tela") pra constelação de pontos dourados conectados por linhas — depois upgrade real: linhas grossas via `Line` do `drei` (`LineBasicMaterial.linewidth` é sempre 1px no WebGL, limitação conhecida do three.js — por isso ficava fino/rabiscado), bloom de verdade via `@react-three/postprocessing` (`EffectComposer` + `Bloom`, glow com blur real, não alpha falso de shader), e parallax sutil reagindo à posição do mouse.
- [x] **Bug da busca pública corrigido (2026-07-13)** — `BuscaMemorial.tsx` chamava `supabase.rpc('buscar_homenagens_publicas', ...)` e só desestruturava `data`, ignorando `error`. Se a chamada falhasse por qualquer motivo, caía silencioso em "nenhum memorial encontrado" sem avisar erro real. Confirmado via Supabase MCP que a função e as permissões de `anon` no banco estavam corretas — o bug era só o client engolindo erro. Corrigido: erro agora aparece pra quem busca, não fica invisível.
- [x] **Página pública do parceiro (`/parceiros/[slug]`) redesenhada (2026-07-13)** — antes só tinha logo + descrição + busca solta ("fraca, faltando elementos"). Virou página de marketing de verdade: busca de memorial subiu pra dentro do hero (topo, como pedido), seção "O que é o Legado Digital" (bloco assimétrico texto + lista de recursos com ícone, não 3 cards iguais), seção "Como funciona" em 3 passos numerados. Usa a skill `redesign-skill` como guia de auditoria visual. Já linkada dos dois lados (`/admin/parceiros/[id]` e `/parceiro`), integração preexistente, não precisou de link novo.
- [ ] Busca embutida direto na landing (hoje é botão que leva pra `/busca`, não campo de texto na própria home)
- [ ] Modos de privacidade completos (`configuracoes_privacidade` — hoje só existe "público" e "com senha", faltam "privado por e-mail/cadastro" e "oculto" da lista de modos do MVP)
- [ ] Website institucional finalizado
- [ ] **Política de Privacidade e Termos de Uso** (Rafael, 2026-07-14 — "não pode esquecer isso") — não existe nenhuma dessas páginas ainda no projeto. LGPD já é premissa técnica registrada acima, mas falta a página de verdade + link no rodapé de toda tela pública (landing, busca, página do parceiro, memorial).
- [x] **LegadoBot Fase 1 — Central + Portal do Parceiro (2026-07-14, teste)** — ver seção própria "Chatbot IA na landing" mais abaixo pro detalhe completo.

## Feedback do Pedro (sócio) — 2026-07-14, prioridade sobre o resto do backlog
Registrado na íntegra em `mapa_sugestoes` (tabela do banco, campo de sugestões do `/admin/mapa`). Decisão do Rafael: resto do projeto espera, corrigir isso primeiro, nesta ordem:

1. [x] **Menu lateral vertical na Central** — sidebar fixa à esquerda (`app/admin/layout.tsx`), topo virou barra fina só com sino de alerta + avatar/e-mail do usuário (dropdown com "Sair"). Cor da Central inteira trocada de zinc/blue genérico do Tailwind pra **navy + dourado oficial** (`#0B1D2A`/`#C9A46A`, confirmado no mockup real que o Pedro mandou no Drive, pasta "Legado Digital" — `dashboard adm legado.jpg`) — feito via remapeamento da paleta `zinc-*`/`blue-*` inteira em `app/globals.css` (`@theme inline`), não editando cada página uma por uma. Isso recolore de graça Central, Portal do Parceiro, Portal da Família e telas de senha (recuperar/redefinir), que também usavam as mesmas classes Tailwind. Logo real integrada em 2026-07-14: baixada da pasta "logo vários tamanhos" no Drive (`Google_Drive__download_file_content`, base64 decodado via `node`), salva em `public/logo-legado-digital.png` (fundo transparente, arco dourado com planta + "LEGADO DIGITAL / PRESERVANDO HISTÓRIAS"), usada via `next/image` no lugar do texto no `app/admin/layout.tsx` (topo da sidebar e header mobile).

## Deck de referência do Pedro (Drive, pasta "Legado Digital") — integrar tudo, não só a logo
Rafael cobrou explicitamente 2026-07-14: não é só pegar a logo, é integrar o que está desenhado em cada página do deck. Índice do deck (`legado indice.jpg`): 1. Dashboard Administrativo (pág 2), 2. Gestão de Memorial (pág 8), 3. Página Memorial Pública (pág 14), 4. Aplicações Prioritárias — Digitais e Institucionais (pág 20), 5. Aplicações Prioritárias — Presença Física e Comunicação (pág 28). O que já foi visto/conferido de cada:

- **Dashboard Administrativo** (`dashboard adm legado.jpg`, visto em detalhe): 5 cards de métrica (Memoriais Ativos, Homenagens Recentes, Assinaturas no Livro, QR Codes Emitidos, Acessos da Semana, cada um com variação vs período anterior) + filtro de período; card "Memorial em Destaque" (foto+timeline+familiares); "Comentários Recentes"; "Resumo de Moderação" (pendentes/aprovados/rejeitados/denúncias); donut de QR Codes (Ativos/Pausados/Expirados/Inativos) + lista "QR Codes Recentes"; contador "Livro de Assinaturas" + "Últimas Assinaturas"; mapa interativo "Localização no Cemitério" (quadra/lote/sepultura, botão Ver Rotas); barra "Ações Rápidas" (Novo Memorial, Registrar Homenagem, Adicionar Assinatura, Gerar QR Code, Gerenciar Usuários, Relatórios). **Hoje só temos**: total de visitas, novos memoriais (7 dias), top cemitérios/parceiros por visita — muito mais simples que o mockup.
- **Gestão de Memorial** (`gestao de memorial .jpg`, visto via OCR/texto): navegação lateral por seções dentro do memorial (Dados do Memorial, Familiares, QR Code, Fotos e Vídeos, Linha do Tempo, Galeria, Livro de Assinaturas, Localização do Sepultamento, Moderação, Configurações/Privacidade) — layout de abas, não uma página só rolando. **Hoje**: `/admin/memoriais/[id]` é uma página única com todos os cards empilhados, sem navegação em abas.
- **Página Memorial Pública, Aplicações Digitais/Institucionais, Presença Física** (`pagina publica qr code.jpg`, `digitais e institucionais .jpg`, `aplicacoes prioritarias fisicas.jpg`, `layout pagina legado digital .jpg`) — **ainda não abertas/analisadas nessa sessão**, só a logo e o dashboard foram vistos de verdade até agora.

**Não é tarefa de 1 sessão só** — é redesenho real de Dashboard + Gestão de Memorial pra bater com o mockup, mais abrir e conferir as 3 imagens que faltam. Registrado aqui pra não perder, retomar em etapas (dashboard primeiro, depois gestão de memorial em abas, depois abrir as 3 imagens restantes).
2. [x] **Central de Comunicações** (renomeia "Central de E-mails" — `/admin/emails`) — página agora tem 2 seções: lista de parceiros (nome, e-mail, WhatsApp = campo `telefone`, texto de "última atividade" calculado via `last_sign_in_at` do Supabase Auth, nova rota `GET /api/admin/parceiros-atividade` staff-only) com os memoriais de cada um expandindo por clique (nome + `familia_email` de contato oficial); embaixo, o histórico de e-mails automáticos que já existia antes. `/parceiro/emails` não mudou ainda (mesma tela de antes, só pro parceiro ver os próprios).
3. [~] **Parceiros B2B — cadastro por CNPJ** — feito: botão "Consultar Receita" no formulário (`/admin/parceiros`) chama `GET /api/admin/consultar-cnpj` (proxy server-side pra `brasilapi.com.br/api/cnpj/v1/{cnpj}`, gratuito, sem chave), preenche razão social/nome fantasia/e-mail/telefone/cidade/UF — usuário confere/edita antes de salvar, nada é sobrescrito sem passar pela tela. **Ainda falta:** cadastro de contatos da empresa com perfil (Responsável Legal, Financeiro, Comercial, Técnico, outros — 1 usuário pode ter mais de 1 perfil), contato virando usuário do sistema com visão restrita só aos dados do próprio parceiro — isso é tabela nova (`parceiros_contatos`), não construído ainda.
4. [x] **Cemitério — entidade lápide** — tabela nova `lapides` (`identificacao`, `quadra`, `lote`, `observacoes`, `cemiterio_id` FK), RLS staff-only igual `cemiterios` (fonte de verdade conferida antes de escrever a policy). Botão "Lápides" na lista de `/admin/cemiterios` abre `/admin/cemiterios/[id]/lapides` (listar/cadastrar/remover). `homenagens` ganhou coluna `lapide_id` (FK, nullable) — formulário de edição do memorial (`/admin/memoriais/[id]`) ganhou 2 selects (cemitério → lápide, filtra pelo cemitério escolhido) pra vincular. Só na Central por enquanto, não levado pro Portal do Parceiro ainda.
   - **Gaveta — entidade própria + visualização 3D real (2026-07-15)**: tabela nova `gavetas` (`lapide_id` FK, `codigo` tipo "G1", `linha`/`coluna` de posição, `homenagem_id` FK nullable, `observacoes`), RLS staff-only (`gavetas_staff_all`, mesmo padrão de `lapides`). Cadastro em `/admin/cemiterios/[id]/lapides/[lapideId]/gavetas` (criar/vincular memorial existente/remover). Visualização em `/admin/cemiterios/[id]/lapides/[lapideId]/gavetas-3d` — modelo 3D de verdade em React Three Fiber (`components/admin/JazigoGavetas3D.tsx`, já tinha `@react-three/fiber`/`drei`/`three` instalados no projeto), lendo as gavetas reais do banco: corte do jazigo com grama/terra/concreto, cada gaveta é uma prateleira clicável (dourada se ocupada, cinza se vaga) que abre painel lateral com nome do homenageado + link "Ver memorial" ou "Gaveta vaga". Parametrizado por número de linhas/colunas real dos dados, não fixo. Botões "Gavetas" e "Gavetas 3D" na lista de `/admin/cemiterios/[id]/lapides`.
   - Referência visual veio de imagens reais de mercado que o Rafael baixou (concorrentes tipo Cemitério Cantareira, Parque dos Girassóis — corte "Subterrâneo" com G1-G6, configuração "3+1"), confirmadas por ele antes de ir pra implementação de verdade. Protótipo standalone (`jazigo-modelo-3d.html`, Three.js puro via CDN) foi mostrado primeiro pro Rafael aprovar visual antes de integrar no banco — só depois virou feature real.
   - **Dado de teste (convenção do projeto, 2026-07-15):** nenhuma lápide existia em nenhum cemitério ainda (nem antes das gavetas) — sem isso não tinha como testar a tela nova. Criado 1 lápide "Jazigo Família Teste" no "Cemitério São Pedro" com 6 gavetas (G1-G6, 2 vinculadas a memoriais reais existentes, 4 vagas), seguindo a "Convenção de Teste" já registrada nesse arquivo.
5. [~] **Memorial — privacidade em 3 toggles** — feito: `homenagens_seguranca` ganhou `busca_habilitada`/`link_habilitado`/`qrcode_habilitado` (boolean, default `true` nos 3 — "todos ligados", família desativa o que quiser). `buscar_homenagens_publicas` passa a filtrar por `busca_habilitada`; `/homenagem/[slug]` bloqueia acesso direto se `link_habilitado` E `qrcode_habilitado` estiverem os 2 desligados (link e QR são a mesma URL por baixo, não dá pra distinguir de fato qual dos 2 foi usado — por isso os 2 juntos controlam o mesmo bloqueio). Nova rota `POST /api/memorial-privacidade` (staff ou dono do parceiro) grava os 3. UI só em `/admin/memoriais/[id]` por enquanto, falta levar pro `/parceiro/memoriais`.
   **Não fiz (decisão consciente):** "perfil de acesso da família pode/não pode alterar dados" e "aba com usuários que têm acesso" — isso reintroduziria a complexidade de múltiplos responsáveis por memorial que foi **removida de propósito em 2026-07-10** (`responsaveis_familiares` ficou sempre vazia, modelo simplificado pra 1 e-mail sem conta). Pedro pode não saber que essa simplificação já foi decidida — vale confirmar com ele antes de reverter.
6. [x] **Usuários** — achado e corrigido: a tabela `usuarios` só tinha 1 RLS policy (`usuarios_select_own`, `auth.uid() = id`) — cada staff só enxergava a própria linha, nunca teve policy `is_legado_staff()` tipo todas as outras tabelas do projeto. Os 3 sócios sempre estiveram lá (confirmado via SQL direto), não era problema de dado. Adicionada `usuarios_staff_select_all` (`is_legado_staff()`). Sem mudança de código — fix só de banco.
7. [x] **Dashboard** — `homenagens` ganhou coluna `visualizacoes` (contador de verdade, não existia nenhum antes). `/homenagem/[slug]` chama `incrementar_visualizacao(slug)` (função `security definer`, anon pode incrementar sem ter permissão de update direta na tabela) toda vez que a página carrega. Dashboard mostra: total de visitas acumulado, novos memoriais (7 dias), top 5 cemitérios por visita (soma via `lapide_id` → `lapides.cemiterio_id`) e top 5 parceiros por visita (soma via `homenagens.parceiro_id`) — tudo agregado em JS a partir de 4 queries simples, sem view/RPC nova pra isso.
8. [x] **Landing page no padrão do projeto** — CSS vars em `app/globals.css` (`--background`, `--primary`, `--secondary`, `--accent`, `--card-bg`, `--border`, `.glass`) trocadas pro navy `#0B1D2A` + dourado `#C9A46A` oficial. Cores hardcoded direto no `app/page.tsx` (`#e2b714`, `#c9a84c`, `#1a1a2e`, `#0a0a12`) trocadas em massa pra paleta oficial. Fonte: landing ganhou `fontFamily: "Georgia, 'Times New Roman', serif"` no wrapper raiz, igual todo o resto do produto (Inter/Playfair Display via `next/font/google` continuam carregadas no `layout.tsx` só como fallback, não removidas — não usadas na landing agora). **Não fiz:** landing ainda tem bastante emoji como ícone (🪦📱🔒 etc.) — bate contra a convenção "sem emoji, usar lucide-react" já registrada nesse arquivo, mas trocar cada um por ícone certo é tarefa própria, maior que só cor/fonte/template — registrado aqui como pendência separada.

Plano: executar 1 (menu) primeiro, depois seguir a lista em ordem. Usar `npx skills find` (vercel-labs/skills, CLI instalada 2026-07-14) pra procurar skill pronta pra cada etapa antes de construir do zero.

**Status 2026-07-14 (fim do dia):** itens 1, 2, 4, 6, 7 completos; item 3 parcial (falta contatos com perfil); item 5 parcial (privacidade feita, acesso multi-usuário da família não — decisão consciente, ver nota no item). Falta só o item 8 (landing page no padrão) da lista de regras registradas nesse dia.

## Portal do Parceiro B2B — como funciona
Cada funerária/parceiro tem acesso próprio, fora da Central, vendo só os próprios memoriais.

### Estrutura implementada
1. Papel **"Parceiro B2B"** semeado em `perfis`
2. Tabela `parceiros_usuarios` (usuario_id, parceiro_id) — permite mais de 1 pessoa por funerária
3. RLS em `homenagens`: `homenagens_parceiro_own` restringe parceiro ao próprio `parceiro_id` via função `is_own_parceiro()`; `homenagens_staff_all` mantém acesso total pra Admin/Operador
4. `/parceiro/login` + `/parceiro/layout.tsx` — protegido, papel Parceiro B2B
5. `/parceiro` — dashboard (total de memoriais, plano contratado, status de pagamento)
6. `/parceiro/memoriais` — CRUD (criar/editar) restrito ao próprio parceiro, com link "Ver página" pra `/homenagem/[slug]` de cada um (gera slug automático ao criar)
7. Botão **"Convidar contato"** em `/admin/parceiros/[id]` → chama `POST /api/admin/convidar-parceiro` (server-side, usa a service role key, nunca exposta ao client) — cria/atualiza o usuário com senha temporária `123456` e já vincula ao papel e ao parceiro
8. Botão "Acesso Parceiros" na navbar da landing → `/parceiro/login`
9. **Acesso direto da Central**: botão "Acessar Plataforma do Parceiro" na ficha (`/admin/parceiros/[id]`) leva a equipe interna direto pro Portal do Parceiro daquele parceiro (`/parceiro?parceiro_id=X`), sem precisar logar de novo — mostra aviso "Visualizando como: X — modo Central"

### Ainda falta
- Módulo financeiro completo (`contratos`, `planos`, `aquisicoes`, `fechamento_mensal`) — Fase 4; por ora só `plano_contratado`/`status_pagamento` simples em `parceiros_b2b`
- `SUPABASE_SERVICE_ROLE_KEY` ainda não foi adicionada nas variáveis de ambiente do **Vercel** (só existe no `.env.local`) — "Convidar contato" só funciona em produção depois disso

## Busca pública e privacidade por senha — como funciona
`/busca` e `/parceiros/[slug]` usam o mesmo componente client (`components/public/BuscaMemorial.tsx`): campo de busca por nome, sem grade aberta listando memoriais (isso vazava privacidade — corrigido). Resultado sem senha mostra o link direto; resultado com senha pede senha antes de liberar.

Busca **sem sensibilidade a acento** (2026-07-10): função Postgres `buscar_homenagens_publicas(termo, p_parceiro_id)` usa a extensão `unaccent` (`unaccent(nome_completo) ilike unaccent('%'||termo||'%')`) — buscar "jose" acha "José", "antonio" acha "Antônio". Chamada via `supabase.rpc()` nos 3 lugares que buscam por nome (`BuscaMemorial.tsx`, `/familia/login`). Antes disso, `ilike` puro não achava nome acentuado quando digitado sem acento — bug real, ninguém digita acento buscando no celular.

**Arquitetura de segurança:** a senha nunca é guardada na tabela `homenagens` (que tem RLS de leitura pública `true` — qualquer coluna ali é visível ao anon). Fica em `homenagens_seguranca` (hash scrypt, salt = id do memorial), sem nenhuma policy de leitura pública — só staff ou o próprio parceiro dono do memorial (via RLS), nunca o anon. A view `homenagens_busca_publica` expõe só um booleano `tem_senha`, nunca o hash. Verificação da senha e escrita/troca de senha passam por API routes server-side (`/api/memorial-acesso` público, `/api/memorial-senha` autenticado) usando a service role key — o hash nunca trafega pro client.

**A senha de acesso bloqueia os DOIS caminhos (2026-07-10):** antes só bloqueava aparecer na busca — quem tinha o link direto ou o QR Code entrava sem senha nenhuma (buraco real, achado nessa sessão). Corrigido: `/homenagem/[slug]` agora também checa `tem_senha` (via `homenagens_busca_publica`) e, se tiver, exige a senha antes de renderizar a página — ilha client `GateSenhaAcesso.tsx` faz a verificação, sucesso grava cookie assinado HMAC de 30 dias (`mem_acesso_{slug}`, `lib/acessoMemorialSessao.ts`) pra não pedir de novo.

Definir/trocar/remover senha: campo "Senha de acesso" no formulário de edição (Central `/admin/memoriais/[id]` e Portal do Parceiro `/parceiro/memoriais`) — deixar em branco = memorial público (busca E link/QR direto).

## Portal da Família — como funciona
**Simplificado (2026-07-10)** — modelo antigo de responsável+código pra até 3 parentes foi removido (complexidade desnecessária, tabela `responsaveis_familiares` sempre esteve vazia). Agora é **1 e-mail de contato por memorial, sem conta**:

1. Central ou Parceiro cadastra o e-mail da família na ficha do memorial (campo "E-mail da família") → `POST /api/admin/cadastrar-email-familia`
2. Sistema gera sozinho uma senha simples (8 caracteres hex), hasheia em `homenagens_seguranca.senha_familia_hash`, grava o e-mail em `homenagens.familia_email`, e manda a senha por e-mail (Resend, `lib/enviarEmailSenhaFamilia.ts`) — registrado na Central de E-mails
3. Família busca o memorial pelo nome do homenageado em `/familia/login` (nunca por slug/endereço — regra de sempre) e entra com essa senha via `POST /api/familia-login`, cookie assinado HMAC de 12h (`familia_{id}`, `lib/familiaSessao.ts`)
4. Dentro de `/familia/[slug]`, edita os mesmos campos de sempre (foto, vídeo, galeria, timeline, bio, frase) — grava direto em `homenagens`, Central e Parceiro enxergam tudo

Sem Resend configurado, a API ainda retorna a senha gerada na resposta pro staff/parceiro repassar manualmente (fallback visível na tela).

**Ainda falta:** "esqueci a senha" da família — hoje só reemitindo (botão "Gerar nova senha" na Central/Parceiro).

## Página do Memorial (`/homenagem/[slug]`) — como funciona
Pública, sem login. Reescrita do zero (2026-07-07) como **componente 100% servidor** — zero JS client na rota, sem risco de travar o navegador (ver Bugs conhecidos).

### O que já exibe (lendo direto do Postgres)
- Hero: foto, nome, datas, cidade, frase preferida
- Biografia
- Vídeo incorporado (`video_url`, converte link do YouTube)
- Galeria de fotos (`galeria_fotos`)
- Linha do tempo (`timeline` jsonb)
- Condolências — lidas de verdade da tabela `condolencias` via `homenagem_id` (não é mais hack reaproveitando `homenagens`)

### Gap conhecido (resolvido)
As seções só aparecem se o memorial **tiver o dado preenchido**. Antes nenhum formulário de edição tinha campo pra foto/vídeo/galeria/timeline — agora os dois formulários (`/admin/memoriais/[id]` e `/parceiro/memoriais`) têm todos esses campos, incluindo upload direto pro Storage.

### Visual — redesign "luxo moderno" (2026-07-15)
Identidade navy `#0B1D2A` + dourado `#C9A46A` mantida, tipografia serif. Plano desenhado por um subagente Opus (via Agent tool, `subagent_type: "Plan"`, `model: "opus"` — Opus só planejou, execução foi feita normal por essa sessão) e executado na íntegra:
- Tokens de apoio novos em `lib/publicTheme.ts` (`CORES.fundoProfundo/douradoClaro/douradoEscuro/douradoBordaForte/superficieCard/glowHero`) + helpers `anosDestaque()` (ano grande tipo "1950 — 2024", com guarda contra data que não parseia) e `dataPtBr()` (data completa formatada, usada nas condolências).
- Hero: anel fino dourado (era `conic-gradient` grosso de 4 cores), glow radial estático atrás da foto (CSS puro, sem JS), monograma (iniciais) no lugar do "Sem foto" quando não há imagem, nome com `clamp()` responsivo, cidade com ícone `<MapPin>` do lucide no lugar do emoji 📍, frase citada centralizada com hairline (antes desalinhada com borda-esquerda dentro de um hero centralizado).
- Cada seção ganha cabeçalho `<h2>` + hairline dourada fina (era `<div>` sem hierarquia semântica).
- Biografia: drop-cap editorial (`::first-letter` via classe `.mem-bio` em `globals.css` — inline style não faz `::first-letter`).
- Vídeo: moldura de mídia com hairline (era card com padding), `<iframe>` com `loading="lazy"`, `<video>` com `preload="metadata"` + `poster`.
- Linha do tempo: espinha vertical com nós (bolinha dourada por evento) e fade nas pontas (`mask-image` em `globals.css`, classe `.mem-timeline-espinha`), ano em destaque grande serif dourado.
- Galeria: grid com `aspectRatio` fixo (era altura fixa em px), `loading="lazy"` + `decoding="async"`, hover leve (`.mem-galeria-item` — `transition` CSS, não é loop de animação). Lightbox (abrir foto grande) ficou de fora — fase 2, registrado como pendência.
- Condolências: agora mostra a data (`created_at` já existia no banco mas não era renderizado), acento dourado à esquerda no card.
- Rodapé: logo real (`next/image`) no lugar do texto "Legado Digital" solto — cumpre a regra "Logo real em toda página".
- **Decisão consciente:** não foi adicionado link "Privacidade"/"Termos" no rodapé (sugestão do plano) porque essas páginas ainda não existem — geraria link morto (404). Fica pendente até essas páginas serem criadas (ver backlog).
- **Constraint mantida à risca:** zero JavaScript client contínuo na página (continua Server Component). Onde teve interatividade nova (a vela, ver abaixo), virou ilha `'use client'` isolada, sem `requestAnimationFrame` — animação é só `@keyframes` CSS (compositor da GPU, não trava a aba, navegador pausa sozinho fora de foco), com fallback `prefers-reduced-motion`.

### Acender vela — implementado (2026-07-15)
`components/public/AcenderVela.tsx`, ilha client isolada no hero da página do memorial. Pedido explícito do Rafael: "detalhe tem que ser real... elementos que vão surpreender... não quero nada amador."
- **Primeira versão (mesmo dia) ficou ruim** — blob genérico com filtro SVG de turbulência (`feTurbulence`/`feDisplacementMap`), Rafael reprovou ("ta uma porcaria"). Pesquisado via Firecrawl um CodePen respeitado (`antoniandre/pen/aRPJoM`, "CSS candle with flame and light animation") e reconstruído seguindo a técnica real dele: a forma de chama/gota vem de um **transform composto** (`skewX(50deg) rotate(45deg) scale(0.6,7) rotate(15deg) skewX(-50deg)`) aplicado a um `<div>` com `border-radius: 0 1em 1em 1em` e gradiente radial quente (branco→amarelo→laranja→transparente) — não é border-radius simples nem filtro de distorção. Removido o filtro SVG de turbulência (causava borda quebrada/serrilhada numa forma de contorno duro — provável causa real do "porcaria").
- **Estrutura:** pavio (linha escura) → brasa (pontinho laranja, visível quando apagada) → chama (só quando acesa, wrapper `.vela-chama-intensidade` anima escala/opacidade de "respiração", `.vela-chama` interno anima o "dance" de forma via `@keyframes vela-flame-dance`) → `drop-shadow` quente + glow ambiente ao redor (`.vela-glow-ambiente`, blur). Zero JS contínuo — só `@keyframes` no compositor da GPU.
- **Persistência:** coluna `homenagens.velas_acesas` (integer, default 0) + função `acender_vela(p_slug)` (`security definer`, mesmo padrão de `incrementar_visualizacao`, retorna o novo total pro client não precisar de uma segunda query). Chamada direto do client via `supabase.rpc()` (mesmo padrão já usado em `BuscaMemorial.tsx`).
- **Anti-spam simples:** flag em `localStorage` (`vela_{slug}`) — só conta a primeira vez que aquele navegador acende. Apagar/reacender depois disso só alterna o visual, não soma de novo no contador (contador é cumulativo de "quantas pessoas já acenderam alguma vez", nunca desce — decisão de produto: um contador de carinho não devia parecer "diminuir").
- Respeita `prefers-reduced-motion` (desliga o tremelique, chama fica estática).

### Ainda não incluído (planejado, não construído)
- Formulário de nova condolência (será ilha client isolada, pequena)
- Troca de tema, compartilhar, música de fundo (ilhas client futuras, uma por vez, sem RAF) — vela já foi a primeira das 4 ideias registradas em 2026-07-14 a sair do papel
- Lightbox da galeria (abrir foto em tela cheia) — fase 2 do redesign, grid já entrega o ganho visual sozinho por ora
- Links de Privacidade/Termos no rodapé — aguardando essas páginas existirem
- Localização (cemitério/jazigo) — sem dado real ainda, schema de jazigo/gaveta não existe (Fase 5). Globo 3D (ideia do Awwwards) explicitamente adiado pelo Rafael em 2026-07-15 — foco foi pra vela primeiro.
- QR Code — ver decisão registrada em "Fase Atual".

### Decisão — Música de fundo (direitos autorais)
**Família NÃO pode fazer upload de música livre.** Risco jurídico real: tocar música protegida publicamente é "comunicação ao público" pela Lei 9.610/98 (Lei de Direitos Autorais) — pode gerar notificação de remoção, cobrança do ECAD (arrecadação de execução pública no Brasil) ou processo de gravadora/artista.

**Solução**: biblioteca curada de ~10-15 faixas **instrumentais royalty-free** (piano/cordas, tom sóbrio, licença de uso comercial explícita), hospedadas no nosso próprio Storage. Família escolhe de uma lista, não faz upload livre. Zero risco jurídico. Ainda não construído — falta: escolher/licenciar as faixas, subir pro bucket, criar o seletor no formulário.

### Pendente de verificação — limite de fotos/armazenamento
Quantidade de fotos/vídeo por memorial ainda **não foi definida com número real** — depende do plano contratado no Supabase (armazenamento e banda). Não inventar número sem checar o plano atual primeiro.

## Convenção de Teste
**Toda área de cadastro nova vem com 2 registros fictícios** já cadastrados, pra nunca ficar vendo tela vazia ao revisar. (Ex: 2 funerárias, 2 memoriais.)

## Convenção de Formulários
- **Todo campo de cadastro tem `<label>` descritivo acima**, nunca só placeholder (placeholder some ao digitar, usuário perde a referência do que é o campo)
- **Sem emoji como ícone de UI** — plataforma é séria (memorial de pessoa falecida), usar ícones de `lucide-react` (já instalado), sempre `strokeWidth={1.5}`, cor neutra (`text-zinc-400`)
- Limites de upload/quantidade (ex: 4 fotos por memorial) sempre visíveis no label do campo (`Galeria de fotos (2/4)`)

### Ordem de construção
1. [x] Auth integrado
2. [x] CRUD de Parceiros
3. [x] Módulo de Cemitérios
4. [x] Portal do Parceiro B2B
5. [x] CRUD de Memoriais (Central)
6. [ ] Módulo Financeiro completo
7. [ ] Módulo de Usuários

## Sócios — Emails
- Rafael (admin): rvnegocioss@gmail.com
- Pedro (admin): pedro.saraiva@estouonline.com.br
- Ricardo (admin): ricrodalves@gmail.com

## O que está pronto
- Landing page com design premium (Hero 3D, animações, seções)
- Conexão Supabase configurada no .env.local
- SUPABASE_SERVICE_ROLE_KEY adicionada no .env.local
- **Central do Legado Digital** em app/admin/
  - Login via Supabase Auth (email/senha)
  - Layout protegido com verificação de papel admin_legado_digital/operador_legado_digital
  - Dashboard com cards de estatísticas
  - **Parceiros**: CRUD completo (criar/editar/ativar-desativar) + página de detalhe `/admin/parceiros/[id]` (dados, plano/pagamento, memoriais do parceiro). Tipos: funerária, plano funerário, prefeitura, autarquia, concessionária, associação, entidade religiosa, canal comercial (cemitério/crematório **não** são parceiros comerciais — ver Cemitérios)
  - **Cemitérios**: cadastro em `/admin/cemiterios` com mapa Leaflet + OpenStreetMap (clique pra marcar lat/lng), sem chave de API
  - **Memoriais**: CRUD completo em `/admin/memoriais` (criar/editar) + ficha `/admin/memoriais/[id]` (dados, edição, botão "Acessar página do memorial" linkando pra `/homenagem/[slug]`, mostra qual parceiro cadastrou ou se foi direto)
  - **Mapa**: `/admin/mapa` — organograma dos 6 ambientes + fluxo de dados dos memoriais, pra sócios acompanharem a construção
  - Usuários: página existe, ainda sem gestão real
- **Portal do Parceiro B2B** em app/parceiro/ — login, layout protegido, CRUD de memoriais restrito ao próprio parceiro (ver seção própria acima), dashboard com edição da própria página pública (logo/descrição)
- **Busca pública** `/busca` e **sub-landing do parceiro** `/parceiros/[slug]` — ver `lib/publicTheme.ts` (tema navy/dourado compartilhado com a página do memorial)
- **Portal da Família** `/familia/login` + `/familia/[slug]` — 1 e-mail de contato por memorial, senha simples gerada e enviada automaticamente, cookie assinado, edita o memorial (ver seção própria acima)
- **Central de E-mails** `/admin/emails` + `/parceiro/emails` — log de senha da família, confirmação de placa, envio ao fornecedor
- **Manual do sistema** `/admin/manual` — o que tem em cada página + integração, linkado do mapa
- Schema: usuarios, perfis, permissoes, usuarios_perfis, perfis_permissoes, parceiros_b2b, cemiterios, parceiros_usuarios, mapa_sugestoes, homenagens_seguranca, emails_enviados, configuracoes_sistema
- `parceiros_b2b.slug`/`logo_url`/`descricao_publica` — dados da sub-landing pública; view `parceiros_publicos` expõe só os campos seguros pro anon (nunca CNPJ/telefone/email)
- `homenagens.parceiro_id` — vincula memorial ao parceiro que cadastrou (null = venda direta Legado Digital)
- Funções helper: `is_legado_staff()` (RLS de parceiros_b2b/cemiterios/homenagens pra equipe interna), `is_own_parceiro(uuid)` (RLS de homenagens/parceiros_b2b pro próprio parceiro)
- 2 funerárias fictícias cadastradas pra testes: Funerária Memória Eterna (SP), Funerária Paz Perpétua (RJ)
- 4 memoriais fictícios: 2 via Memória Eterna, 2 diretos (Legado Digital)
- Contas dos 3 sócios criadas via Admin API (script `scripts/seed-socios.mjs`)
- QR Code de cada memorial (`lib/qrcode.ts`, `app/api/memorial-qrcode/route.ts`) — gerado automaticamente ao criar/salvar memorial, botão de download na Central e no Portal do Parceiro
- Next.js 16 + TypeScript + Tailwind funcionando
- Build passando sem erros
- Repositório GitHub: rvnegocioss-cloud/legado-digital-

## Bugs conhecidos
- (resolvido, 2026-07-16) **Consulta de CNPJ (`/api/admin/consultar-cnpj`) retornava 502 pra qualquer CNPJ em produção.** Rafael testou com CNPJ real (Prefeitura de Uberlândia) e os campos não preenchiam. Causa raiz: BrasilAPI responde `403 Forbidden` quando a requisição vem sem header `User-Agent` — a Vercel não manda um por padrão, e a proteção deles bloqueia. Corrigido adicionando `User-Agent`/`Accept` na chamada (`app/api/admin/consultar-cnpj/route.ts`), confirmado com dado real (`razao_social: "MUNICIPIO DE UBERLANDIA"`). Log de diagnóstico (`console.error` com status real da BrasilAPI em caso de falha) mantido na rota pra facilitar debug futuro.
- (resolvido) Busca pública (`/busca`, `/parceiros/[slug]`, `/familia/login`) não achava nome com acento quando a pessoa digitava sem acento (ex: buscar "jose" não achava "José", "antonio" não achava "Antônio") — `ilike` do Postgres é sensível a acento, e ninguém digita acento buscando no celular. Corrigido com função `buscar_homenagens_publicas(termo, p_parceiro_id)` (extensão `unaccent`, compara `unaccent(nome_completo) ilike unaccent(termo)`), chamada via `supabase.rpc()` nos 3 lugares que buscavam por nome. Registrado 2026-07-10.
- (resolvido) `/homenagem` não tinha rota dinâmica `[slug]` — corrigido, agora em `app/homenagem/[slug]/page.tsx`, testado com memorial real e slug inexistente
- (resolvido) Links "Ver página"/"Acessar página do memorial" abriam com `target="_blank"` — no navegador mobile isso gerava a tela nativa "This page couldn't load" quando a aba nova era descartada em segundo plano. Removido `target="_blank"`, agora abre na mesma aba.
- (resolvido) `HomenagemTemplate.tsx` tinha `@import url(fonts.googleapis.com/...)` direto no `<style>` — fonte buscada em tempo real do Google no navegador do visitante. Em rede que não alcança `fonts.googleapis.com` (firewall, operadora, bloqueador), travava o carregamento da página inteira ("This page couldn't load"). Corrigido: removido o `@import`, `.fd`/`.cursive` usam fonte de sistema (Georgia/Times New Roman), sem dependência de rede externa.
- (resolvido) **Causa real do "This page couldn't load"**: `FundoParallax.tsx` (fundo 3D das velas no hero do memorial) rodava um `requestAnimationFrame` infinito reescrevendo `transform` a cada frame numa camada `preserve-3d` + `will-change` + giroscópio/`DeviceOrientation`. Em GPUs/navegadores mais fracos vazava memória do compositor até o navegador matar a aba (tela nativa de crash do Edge/Chrome). A página aparecia e depois "sumia". Veio pro ar quando os deploys da sessão rebuildaram o parallax. Corrigido: `FundoParallax` agora é **estático** (crossfade das imagens + overlay), sem loop de animação nem compute contínuo.
- (resolvido, 2026-07-15) **Sem como remover foto/vídeo já carregado, e arquivo antigo ficava órfão no Storage pra sempre.** Rafael reportou: formulário de memorial (Central e Parceiro) não tinha botão de remover foto principal nem vídeo (só a galeria tinha "×", e mesmo esse só limpava estado local até salvar). Além disso, `subirArquivo()` gera nome de arquivo com `Date.now()` — trocar a mídia nunca apagava o arquivo antigo do bucket `memoriais`, acumulando custo de armazenamento sem limite (achado direto da nova regra "tudo tem que ser escalável"). Corrigido nos dois formulários: botão "Remover foto"/"Remover vídeo" (limpa estado local, mesmo padrão já usado na galeria), e no momento de `salvar()` uma função `removerArquivoStorage()` compara o valor original (carregado do banco) com o atual e apaga do Storage qualquer foto/vídeo/item de galeria que foi trocado ou removido nessa edição.
- (resolvido, 2026-07-15) **Slug do memorial mudava sozinho ao editar no Portal do Parceiro.** `app/parceiro/memoriais/page.tsx` recalculava `gerarSlug(nome)` toda vez que `salvar()` era chamado — inclusive editando um memorial já publicado, trocando a URL pública silenciosamente e quebrando link/QR Code já compartilhado. No admin (`app/admin/memoriais/[id]/page.tsx`) isso nunca acontecia (slug só é gerado na criação, ficha de edição nunca reenvia `slug`). Corrigido: parceiro agora só gera slug novo se o slug atual ainda for o placeholder de rascunho (`rascunho-xxxxxxxx`) — depois da primeira vez, o slug fica fixo, igual ao admin.
- (resolvido, 2026-07-15) **Rascunho de memorial do parceiro podia ficar "fantasma" com slug de rascunho pra sempre.** Ao clicar "+ Novo Memorial", o Portal do Parceiro já insere um registro no banco com `slug = "rascunho-xxxxxxxx"` (necessário pra permitir upload de mídia antes de salvar). Se o usuário preenchesse o nome mas fechasse o modal (X, ESC, clique fora) **sem clicar em "Salvar"**, o registro não era descartado (só descartava se o nome estivesse vazio) — ficava pra sempre com slug de rascunho em vez de um slug de verdade baseado no nome. Corrigido: agora o rascunho é descartado ao fechar sem ter clicado em "Salvar", independente de ter nome preenchido ou não (novo estado `foiSalvo`).
- (resolvido, 2026-07-15) **Slug/link do memorial não aparecia dentro do modal de edição do Portal do Parceiro** — só na linha da tabela, fora do modal. Diferente do admin, que mostra "Acessar página do memorial" logo no topo da ficha. Corrigido: link "Ver página do memorial →" adicionado no cabeçalho do modal do parceiro (só quando o slug já é definitivo, não no rascunho).

## Chatbot IA na landing — planejado (ÚLTIMO passo, só depois de tudo mais pronto)
**Atualização 2026-07-14:** uma versão mínima institucional já foi construída antes do resto do backlog, a pedido direto do Rafael — ver "LegadoBot Público — landing page" mais abaixo. O plano completo abaixo (atendimento full, escalonamento pra humano, 3 públicos) continua por último.
"Bem-vindo ao Legado Digital, como posso te ajudar?" — bolha de chat na landing, atende 3 públicos diferentes: **família** (como editar memorial, privacidade), **funerária/parceiro** (como virar parceiro, comissão, portal), **cemitério/prefeitura** (concessão, autarquia). Bot pergunta ou infere quem é o visitante e responde com FAQ correspondente.

Opções de arquitetura analisadas (2026-07-10), nada decidido/implementado ainda:
- **API de LLM direto (Anthropic/OpenAI) + rota própria:** IA roda na nuvem do provedor, nosso `/api/chat` só manda a pergunta + system prompt com info da empresa e repassa a resposta. Vercel AI SDK (`ai` no npm) é nativo pra Next.js, facilita streaming/estado do chat. Paga por uso — escalável, bate a regra de integração externa registrada acima.
- **Plataforma pronta (Intercom Fin, Crisp AI, Chatbase, Tidio):** IA e widget 100% hospedados no terceiro, só cola `<script>`. Sobe os FAQs, eles treinam sozinhos, já vem com handoff pra humano e dashboard. Assinatura mensal, mais caro em escala, zero engenharia nossa.
- **Híbrido:** rota própria (opção 1) usando componentes prontos de UI de chat — meio-termo entre controle e velocidade de montagem.

Fazer por último, depois que o resto do MVP estiver rodando de verdade.

**Escopo ampliado (2026-07-14, Rafael):** além da landing, IA também dentro da Central — tira dúvida sobre o sistema pra equipe/staff e **monitora a Central de Comunicações**, avisando por notificação/pop-up quando algo precisa de atenção (ex: parceiro sem contato há muito tempo, e-mail com erro, mensagem de placa não confirmada). Rafael já tem uma API que funciona pra isso, ainda não passada/registrada. **Prioridade só depois que as etapas do feedback do Pedro (seção acima) estiverem prontas.**

**Mais detalhes registrados no mesmo dia:**
- Pesquisar prompts/system prompts prontos do **Fable 5** (ou outro modelo) e repos de **comportamento de atendimento** (customer support agent patterns) antes de desenhar a arquitetura — não inventar do zero.
- Conectada também à **segurança do site** (não só suporte).
- **Acesso ao banco de dados** — pode consultar dados dos memoriais em caso de emergência, inclusive **apagar foto/conteúdo**. Rafael já sabe que isso precisa de **limitador/guardrail** (não é acesso irrestrito livre) — ponto de atenção grande antes de implementar, é a parte mais sensível de toda a ideia.
- Vira o "atendente" da própria **Central de Comunicações**: responde mensagem, faz primeiro atendimento de parceiro e de família.
- Também primeiro atendimento na **landing page** — atende o visitante e escala pra um admin humano: se veio pela landing geral, chama admin da Central; se veio pela página do parceiro (`/parceiros/[slug]`), chama o parceiro também. Objetivo explícito: não perder lead/cliente por falta de resposta rápida.
- **Entrada por voz (microfone)** — Rafael quer microfone na IA da Central pra falar com ela. Já tem um projeto próprio começado no PC (apelidado "Jarvis") que pode ser adaptado em vez de construir do zero — checar esse projeto antes de pesquisar solução nova.
- Ainda é só ideia sendo despejada — Rafael quer organizar tudo isso numa conversa dedicada antes de qualquer linha de código.

### LegadoBot Fase 1 — implementado (2026-07-14, só teste/sócios)
Primeira versão real construída, escopo restrito a **Central + Portal do Parceiro** (família e público ainda não têm acesso, conforme faseamento pedido). Peças:

- `app/api/legadobot/chat/route.ts` — rota POST, autentica via bearer token (mesmo padrão staff-ou-dono-do-parceiro das outras rotas do projeto), monta o system prompt a partir de `docs/LEGADOBOT_PROMPT.md` + contexto da sessão (nome, e-mail, papel, `parceiro_id` se for parceiro), chama o LLM e devolve `{ resposta, acao }`.
- `components/LegadoBotWidget.tsx` — botão flutuante + painel de chat (cores navy/dourado do padrão, ícones `lucide-react`), montado em `app/admin/layout.tsx` e `app/parceiro/layout.tsx`.
- **Backend do LLM: Groq** (`https://api.groq.com/openai/v1`, gratuito, compatível com a API da OpenAI), modelo `llama-3.3-70b-versatile`. Chave em `.env.local` (`LEGADOBOT_LLM_BASE_URL`, `LEGADOBOT_LLM_API_KEY`, `LEGADOBOT_LLM_MODEL`). Roda na nuvem — funciona em produção (Vercel), diferente da tentativa inicial.
  - **Trocado de `freellmapi` pra Groq (2026-07-14, mesmo dia):** primeira versão usava `freellmapi` (repo próprio do Rafael) rodando local em `http://localhost:3001` — só funcionava na própria máquina do Rafael com `npm run dev` + freellmapi ligados, porque a chamada é feita pelo servidor (não pelo navegador de quem usa). Resultado: nenhum sócio remoto conseguia usar o bot no site publicado. Rafael apontou o problema ("meus sócios não conseguem usar o bot"), decidiu trocar pra API de nuvem gratuita já disponível (chave Groq já existente em `Desktop\APIs\APIS DAS IAS.txt`) em vez de manter dependência do PC local — resolve pra qualquer um, sem precisar de túnel (ngrok/Cloudflare) nem PC ligado.
  - **Limite da conta gratuita Groq (conferido via header real da API):** 12.000 tokens/minuto, 1.000 requisições. Proteções aplicadas no código: histórico enviado ao modelo cortado pras últimas 10 mensagens, `max_tokens: 400` por resposta, prompt instrui resposta curta (3-4 frases). Antes de ir pra família/público (Fase 2/3), reavaliar limite conforme volume real ou trocar por plano pago.
- **Escopo por papel:** staff da Central tem acesso total; Parceiro B2B só recebe contexto do próprio `parceiro_id`, nunca de outro parceiro nem dado interno da Central — reforçado tanto no prompt (`docs/LEGADOBOT_PROMPT.md`) quanto no código da rota (o filtro não depende só de instrução de texto pro modelo).
- **Navegação automática (pedido do Rafael, 2026-07-14):** se o usuário pergunta "aonde eu vejo X", o bot pode responder E navegar sozinho — inclui uma diretiva `AÇÃO: /caminho` na última linha da resposta (lista fechada de rotas conhecidas, documentada em `docs/LEGADOBOT_PROMPT.md`), a rota do servidor extrai essa linha antes de devolver o texto, e o widget faz `router.push()` automaticamente. Parceiro só pode ser navegado dentro de `/parceiro*`, nunca pra rota da Central.
- **Não incluído ainda:** microfone/voz (projeto "Jarvis" citado pelo Rafael, não conectado), acesso de leitura/escrita direta no banco com guardrail (ideia registrada, não construída — é a parte mais sensível), escalonamento pra admin humano.

### LegadoBot Público — landing page (2026-07-14, versão mínima)
Antecipado do faseamento original (era "Fazer por último") a pedido do Rafael — versão bem mais simples que o LegadoBot interno, só institucional:

- `docs/LEGADOBOT_PROMPT_PUBLICO.md` — prompt separado do interno, sem nenhum acesso a dado do banco/sessão. Só explica o que é o projeto, como funciona em linhas gerais, nunca inventa preço/contato/funcionalidade que não existe (landing não tem canal de contato real publicado ainda — bot é honesto sobre isso em vez de inventar).
- `app/api/legadobot-publico/chat/route.ts` — rota sem autenticação (visitante anônimo), mesma Groq/env vars do bot interno. Proteções mais rígidas por ser endpoint público: histórico cortado pras últimas 6 mensagens, cada mensagem truncada em 500 caracteres, `max_tokens: 250`.
- `components/LegadoBotPublicoWidget.tsx` — botão flutuante só na landing (`app/page.tsx`), saudação "Posso ajudar? Sou o assistente do Legado Digital...". Navegação automática limitada a só 2 rotas públicas: `/busca` e `/parceiro/login`.
- É um bot separado do LegadoBot interno (`components/LegadoBotWidget.tsx` continua só em `/admin` e `/parceiro`) — não compartilham prompt nem rota, propósito e escopo de segurança são bem diferentes (um é institucional/anônimo, outro é suporte autenticado com acesso a dado real).

## Ideias em avaliação (backlog não decidido, só registrado)
- **Música gerada com IA (Suno):** opção do familiar gerar uma música sobre a vida do homenageado direto no memorial. Avaliar pro próximo deploy. Registrado 2026-07-10.
- **Drones + mapeamento do cemitério + navegação tipo Waze até o túmulo (ideia do Pedro):** voo de drone gera ortomosaico (imagem aérea georreferenciada) do cemitério, base pra marcar cada túmulo com precisão de centímetros sem depender de GPS de celular — família busca por nome/código cadastrado no túmulo e o celular guia até lá. Relatório técnico completo em `/admin/mapa/drone` (também acessível via botão "Instalação Drone" em `/admin/cemiterios`). Análise de opções (Fase 5, schema de jazigo/gaveta ainda não existe):
  - *Captura da coordenada de cada túmulo:* (1) GPS de celular no campo — grátis, mas erro típico de 3-10m não distingue túmulos a ~1m um do outro; (2) GPS/GNSS profissional RTK — precisão sub-metro, mas exige equipamento e operador treinado; (3) ortomosaico de drone + marcação manual de cada túmulo na imagem — precisão de centímetros, mesmo padrão de clique-no-mapa já usado em `/admin/cemiterios`.
  - *Guiar o visitante até o túmulo:* (1) link direto pro Google Maps/Waze com a coordenada — zero código nosso, mas rota pela rua conhecida do Google, não pelos carreadores internos; (2) bússola própria no navegador (`navigator.geolocation.watchPosition` + seta/distância sobre o mapa do cemitério) — simples, não depende de rota externa nem de mapear carreadores; (3) rota turn-by-turn dentro do cemitério (grafo de carreadores + algoritmo tipo A*) — escopo grande, tipo mapa indoor (IndoorAtlas/Mappedin).
  - Nada decidido ainda — só a análise registrada.
- **Vídeo gerado por IA como fundo da landing (2026-07-14):** depois de remover o Canvas 3D (achado "cheio de traço"), avaliar trocar por vídeo real de fundo (autoplay/muted/loop). Pesquisado: HeyGen **não serve** (foco é avatar falando, não cena ambiente). Opções reais com gerador de cena por prompt, grátis: Adobe Firefly, Canva AI Video Generator, InVideo AI — nenhum conectado como MCP hoje, precisa gerar manualmente e passar o arquivo. Pro lado técnico de exibir no Next.js: `muxinc/next-video` (recomendado pelo próprio Next.js, mas tem custo de hospedagem) ou `imagekit-samples/nextjs-video-autoplay` (exemplo grátis, resolve o bug clássico de autoplay não funcionar no iOS Safari). Avaliar só depois que as correções do Pedro (sócio) estiverem prontas.

## O que NÃO está no MVP
- Faturamento e cobrança interna
- Pagamento online
- App mobile nativo
- Integração com cartórios
- IA para biografias automáticas
- Mapa cemiterial avançado
- Marketplace de produtos físicos

## Premissas Técnicas
- MVP enxuto mas não descartável
- Base preparada para escala e geolocalização
- LGPD desde o início (consentimento, privacidade, trilha de alteração)
- ERP externo para faturamento — Legado Digital só registra fechamento mensal
- IA deve propor arquitetura antes de escrever código
- Explicar em linguagem simples ao usuário o que está sendo feito e por quê

## Convenções de Código
- Componentes em PascalCase
- TypeScript strict sempre
- Variáveis e funções em camelCase
- Pastas em kebab-case
- Sempre usar Supabase MCP para operações no banco
- Sempre usar Vercel MCP para deploy

## Skills instaladas
Log de uso fica em `docs/USO_SKILLS_MCPS.md` (ver regra no topo do arquivo).

- **gstack** (Garry Tan) — `D:\gstack`, 23 slash commands pra estruturar fluxo como equipe (CEO, Designer, Eng Manager, QA, Release). `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/review`, `/qa`, `/ship`. Overhead desproporcional pra tarefa pequena/interna — avaliar antes de invocar, não é obrigatório.
- **frontend-design** (Anthropic) — direção de design pra UI pública nova/distintiva (usado nas páginas `/busca` e `/parceiros/[slug]`)
- **ui-ux-pro-max, ui-styling, design-system, design, brand, banner-design, slides** (nextlevelbuilder) — banco de padrões de UI/UX, paletas, tipografia, componentes; `ui-ux-pro-max` tem script Python (`scripts/search.py --domain <x>`) searchável

## MCPs Disponíveis
**Lista conferida de verdade via `claude mcp list` em 2026-07-13** — a versão antiga deste bloco citava `filesystem`, `n8n` e `github` como MCPs, mas nenhum dos 3 nunca esteve configurado (arquivo é lido/escrito com ferramenta nativa, git é CLI direto). Corrigido:

Conectadas:
- supabase: operações no banco
- vercel: deploy
- memory: memória persistente entre sessões
- sequential-thinking: raciocínio em etapas
- playwright: automação de navegador
- Google Calendar, Gmail, Google Drive
- SlidesGPT, Three.js 3D Viewer, HyperFrames (HeyGen)

Precisam de autenticação (pendente): Notion, Canva, Windsor.ai
Com falha de conexão: Context7

Skills (não são MCP, ficam em `~/.claude/skills/`, ver seção "Skills instaladas" abaixo)

## Comandos Úteis
```bash
npm run dev      # inicia servidor local
npm run build    # build de produção
npm run lint     # verifica erros
```

## Credenciais (apenas referência — nunca commitar)
- Supabase Project Ref: yegvazxycfrbhblyzvhg
- Deploy: Vercel (projeto legado-digital-)

---

## Session Start Protocol ⚡

**MANDATORY** at start of each session:

```bash
# Load essential docs (~800 tokens - 2 min read)
✓ .claude/COMMON_MISTAKES.md      # ⚠️ CRITICAL - Read FIRST
✓ .claude/QUICK_START.md          # Essential commands
✓ .claude/ARCHITECTURE_MAP.md     # File locations
```

**At task completion:**
- Create completion doc in `.claude/completions/YYYY-MM-DD-task-name.md`
- Move session file to `.claude/sessions/archive/` (if created)

**⚠️ NEVER auto-load:**
- Files in `.claude/completions/` (0 token cost)
- Files in `.claude/sessions/` (0 token cost)
- Files in `docs/archive/` (0 token cost)

---

**Last Updated**: 2026-07-09
**Optimized with**: [Claude Token Optimizer](https://github.com/nadimtuhin/claude-token-optimizer)
