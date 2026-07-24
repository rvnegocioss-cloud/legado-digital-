# Legado Digital — Briefing do Projeto

> Histórico detalhado (bug corrigido, decisão tomada, mudança dia-a-dia) arquivado no vault: `Projects/Legado Digital - Historico Detalhado.md`. Este arquivo mantém só regra permanente + estado atual + arquitetura de referência — carregado toda sessão, precisa ficar enxuto.

## Regras Permanentes (nunca ignorar)

1. **Proteção contra ação destrutiva** — nunca `DROP TABLE`/`DELETE` sem filtro/`TRUNCATE`/migração que altera ou remove coluna existente/`git push --force`/`git reset --hard`/deletar branch/`rm -rf` sem mostrar a ação exata primeiro e ter confirmação explícita do Rafael. Backup automático obrigatório (`scripts/backup-supabase.js`, salva em `Desktop\Cerebro Claude - Legado Digital\backups\`) antes de qualquer ação destrutiva. Supabase do projeto é plano free, sem PITR — motivo a mais pra nunca arriscar sem backup.
2. **Tudo escalável desde o início** — schema de banco, upload de arquivo, geração de identificador, rate limit: nunca gambiarra que só funciona em escala pequena, mesmo que "resolva por agora".
3. **Modelo por tarefa** (Agent tool) — Sonnet 5: execução (código/edição/build/commit), padrão dessa sessão, não precisa spawnar subagente pra isso. Opus 4.8: planejamento complexo/arquitetura, `subagent_type:"Plan"` + `model:"opus"` antes de decisão grande — nunca inventar arquitetura complexa sozinho. Haiku 4.5: tarefa mecânica/repetitiva de subagente. Fable 5: teto de capacidade quando a tarefa realmente precisa (caro, 1M contexto), ainda não testado no projeto.
4. **CLAUDE.md atualizado no mesmo commit** da feature, nunca depois. Marcar `[x]`, atualizar Fase Atual/O que está pronto. Changelog detalhado (o "como/por que" de cada mudança) vai pro vault (Dev Logs/), não empilha aqui — aqui fica só a linha resumida.
5. **Backup de material relevante** (PDF/doc/técnica validada) em `Desktop\Cerebro Claude - Legado Digital\` (HTML simples, sem base64/Drive).
6. **Pesquisar referência real antes de construir UI/efeito com barra de qualidade alta** (CodePen/Awwwards/doc oficial) — nunca inventar do zero e torcer pra ficar bom.
7. **Build passou → commit + push direto, sem perguntar.** Só para e avisa se o build falhar.
8. **Nunca pedir slug/endereço técnico em tela pública** — busca sempre por nome do homenageado, slug resolvido por trás.
9. **Log de skill/MCP usado** em `docs/USO_SKILLS_MCPS.md` (o quê, motivo, o que produziu).
10. **Rótulo de UI deixa ação óbvia** (ex: "Memoriais (Cadastrar/Editar)", não só "Memoriais").
11. **Toda página de detalhe/edição/login tem link de volta visível** no topo (nunca só o botão voltar do navegador).
12. **Logo real (`public/logo-legado-digital.svg`) em toda tela de acesso/identificação**, via `next/image`, nunca texto solto. Sempre menor que o container que envolve, com folga — nunca transborda.
13. **Layout de ficha na Central** — card grande (form/tabela/lista que cresce) ocupa linha cheia ou split 2/3+1/3 com painel de referência curto ao lado (caso "um grande + um de consulta rápida"); cards curtos nunca ficam sozinhos numa coluna larga, vão lado a lado num grid parelho (`lg:grid-cols-2 xl:grid-cols-3`). Central é ferramenta de trabalho densa (tela larga aproveitada), diferente do lado público (mobile-first).
14. **`docs/LEGADOBOT_PROMPT.md` atualizado junto** com qualquer mudança na Central/Portal do Parceiro. Gatilho: quando o Rafael disser explicitamente "aprovado"/"tá aprovado" sobre uma correção/feature — não é automático a cada commit, só quando ele confirma.
15. **Ideia/pergunta sem resposta do Rafael** vai pro `docs/RASCUNHO_IDEIAS.md` — nunca decide/constrói de lá sem confirmação dele primeiro.
16. **Toda feature nova refletida nos lados relevantes** (Central ↔ Portal do Parceiro ↔ Página Pública) — nunca implementar só de um lado.
17. **Nunca remover/mexer na seção "Como Chegar"** (`GuiaTumulo`/`GuiaTumuloCarregador`, mapa/rota até o cemitério e o túmulo na página do memorial) sem pedido explícito do Rafael. Regra registrada 2026-07-23.
18. **Não desobedecer instrução explícita do Rafael** — quando ele pede uma ação direta (commitar, subir, corrigir algo específico), executar sem ficar re-explicando/re-verificando em loop nem adicionando passo extra não pedido. Dúvida real de segurança (regra 1) ainda vale, mas fora isso a obediência é direta. Regra registrada 2026-07-24.
19. **Quando faltar dado pra uma seção aparecer** (ex: memorial de teste sem galeria/timeline), gerar/cadastrar o dado direto (fictício quando for teste, real quando fizer sentido) — não só reportar que falta, resolver. Regra registrada 2026-07-24.

## Convenções
- Toda área de cadastro nova vem com 2 registros fictícios já cadastrados (nunca tela vazia ao revisar).
- Todo campo de formulário tem `<label>` descritivo acima, nunca só placeholder.
- Sem emoji como ícone de UI — usar `lucide-react`, sempre `strokeWidth={1.5}`, cor neutra.
- Limite de upload/quantidade sempre visível no label do campo (ex: `Galeria de fotos (2/4)`).

## O que é
Plataforma B2B2C para criação, gestão e acesso a memoriais digitais vinculados a QR Codes, lápides, jazigos, gavetas, caixas ossuárias, cemitérios, crematórios, funerárias, planos funerários, prefeituras e concessionárias cemiteriais. Famílias preservam histórias, fotos, vídeos, mensagens e registros de pessoas falecidas, com privacidade/governança definida pelos próprios familiares.

## Modelo de Negócio
B2B2C — parceiros privados e públicos como canais de venda, ativação e operação. **Confirmado em ata de reunião de sócios (16/07/2026, `docs/ATA_REUNIAO_SOCIOS.md`): não é venda direta pra família.** Funerárias oferecem o Legado Digital como benefício adicional; monetização via taxa anual integrada aos planos já existentes da funerária.

## Stack Técnica
- Frontend/Backend: Next.js 16 + TypeScript (App Router)
- Banco: Supabase (PostgreSQL) · ORM: Prisma
- Estilo: Tailwind CSS v4 + shadcn/ui
- Deploy: Vercel · Auth: Supabase Auth (email/senha no MVP) · Storage: Supabase Storage

## Os 6 Ambientes do MVP
1. **Website institucional** — captação de parceiros B2B
2. **Admin Legado Digital** (Central) — equipe interna opera tudo
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
Um jazigo pode ter várias gavetas. Cada gaveta pode conter uma pessoa. Um jazigo também pode conter caixas ossuárias de pessoas exumadas.

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
Público por QR Code · Público por URL · Público por busca · Privado por e-mail · Privado por cadastro · Oculto
(hoje implementado: só "público" e "com senha" — ver Fase Atual)

## Entidades Principais do Banco
usuarios, perfis, permissoes · parceiros_b2b, contratos, pagina_publica_parceiro · planos, aquisicoes, utilizacao, fechamento_mensal · paises, estados, cidades · cemiterios, crematórios, setores, quadras, lapides, gavetas · caixas_ossarias · pessoas, homenagens (memoriais), responsaveis_familiares · fotos, videos, documentos, historias, condolencias, mural_memorias · qr_codes, homenagens_seguranca, termos_aceite, notificacoes

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
| **Fase 1** ✅ | Fundação: banco, auth, admin básico, website inicial |
| **Fase 2** (em andamento) | Portal parceiro, busca, página pública do parceiro |
| **Fase 3** | Portal família, conteúdo, privacidade, publicação |
| **Fase 4** | Planos, aquisições, utilização, fechamento mensal |
| **Fase 5** | Geolocalização avançada, mapeamento cemiterial |

## Mapa Visual das Páginas
Organograma dos 6 ambientes + fluxo de dados dos memoriais (`parceiro_id`): mantido como Artifact em `/admin/mapa`, atualizar a cada mudança estrutural relevante.

## Fase Atual
**FASE 1 concluída → FASE 2 em andamento (Portal parceiro)**

Tudo do checklist de Fase 1/2 abaixo está **feito** (schema, auth, CRUDs de Parceiros/Cemitérios/Memoriais, Portal do Parceiro, Portal da Família, busca pública, senha de acesso/edição, timeline, QR Code automático + e-mail pro fornecedor, Central de Comunicações, lápide/gaveta + visualização 3D, rate limit middleware, política de privacidade/termos, landing no padrão visual, LegadoBot Fase 1 teste) — detalhe item-a-item de cada um no vault (`Projects/Legado Digital - Historico Detalhado.md`).

**Pendente (backlog ativo):**
- [ ] Busca embutida direto na landing (hoje é botão que leva pra `/busca`)
- [ ] Modos de privacidade completos (falta "privado por e-mail/cadastro" e "oculto")
- [ ] Website institucional finalizado
- [ ] Contatos da empresa (`parceiros_contatos`) ligados ao fluxo de convite existente
- [ ] Privacidade em 3 toggles levada pro `/parceiro/memoriais` (hoje só `/admin/memoriais/[id]`)
- [ ] "Esqueci a senha" da família (hoje só reemissão manual pela Central/Parceiro)
- [ ] Suporte a múltiplos vídeos por memorial (`videos_galeria`) — pausado a pedido do Rafael
- [ ] Troca de tema persistente (hoje é só demo/preview, não salva no banco — precisa campo `tema` em `homenagens`)
- [ ] **Rate-limit de escrita pública** (condolências/mural/vela/visualização) não passa pelo `middleware.ts` — client chama Supabase REST/RPC direto do navegador. Achado na auditoria Opus 2026-07-23, recomendado mover pra Route Handlers Next.js.
- [ ] Deck do Pedro: 3 imagens do material de referência ainda não abertas/analisadas (Página Memorial Pública, Aplicações Digitais/Institucionais, Presença Física)
- [ ] Redesenho de Dashboard + Gestão de Memorial em abas pra bater com o mockup do Pedro (escopo grande, não é tarefa de 1 sessão)
- [ ] Razão social/CNPJ da própria Legado Digital (empresa em formalização) — placeholder nos Termos/Privacidade até sair
- [ ] Módulo financeiro completo (`contratos`, `planos`, `aquisicoes`, `fechamento_mensal`) — Fase 4
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ainda não está nas env vars do Vercel (só `.env.local`) — "Convidar contato" só funciona em produção depois disso
- [ ] Domínio pro Resend: `legadodigital.net` já registrado (Hostinger) — falta decidir rota de ativação do Google Workspace (painel Hostinger vs direto + DNS manual)
- [x] **Layout responsivo da página do memorial** (mockup Claude Design, 2026-07-23) — container 520/1100px, hero lado a lado no desktop, seção "Acender uma vela" na posição do mockup (fim da página). Fonte mantida (Georgia) — decisão do Rafael, não trocou pro Playfair/Source Sans do mockup. Spec: `docs/superpowers/specs/2026-07-23-pagina-memorial-redesign-mockup.md`, plano: `docs/superpowers/plans/2026-07-23-pagina-memorial-layout-responsivo.md`.

## Portal do Parceiro B2B — como funciona
Cada funerária/parceiro tem acesso próprio, fora da Central, vendo só os próprios memoriais.
1. Papel **"Parceiro B2B"** semeado em `perfis`; tabela `parceiros_usuarios` (usuario_id, parceiro_id) permite mais de 1 pessoa por funerária
2. RLS em `homenagens`: `homenagens_parceiro_own` restringe ao próprio `parceiro_id` via `is_own_parceiro()`; `homenagens_staff_all` mantém acesso total pra Admin/Operador
3. `/parceiro/login` + `/parceiro/layout.tsx` — protegido, papel Parceiro B2B
4. `/parceiro` — dashboard (total de memoriais, plano contratado, status de pagamento)
5. `/parceiro/memoriais` — CRUD restrito ao próprio parceiro, link "Ver página" pra `/homenagem/[slug]`
6. Botão "Convidar contato" em `/admin/parceiros/[id]` → `POST /api/admin/convidar-parceiro` (service role, server-side) — cria usuário com senha temporária `123456`, vincula papel+parceiro
7. **Acesso direto da Central**: botão "Acessar Plataforma do Parceiro" na ficha leva a equipe interna pro Portal do Parceiro daquele parceiro (`/parceiro?parceiro_id=X`) sem logar de novo — aviso "Visualizando como: X — modo Central"

## Busca pública e privacidade por senha — como funciona
`/busca` e `/parceiros/[slug]` usam `components/public/BuscaMemorial.tsx`: busca por nome, sem grade aberta (vazava privacidade). Resultado sem senha mostra link direto; com senha, pede senha antes.

Busca **sem sensibilidade a acento** via `buscar_homenagens_publicas(termo, p_parceiro_id)` (extensão `unaccent`), chamada via `supabase.rpc()`.

**Arquitetura de segurança:** senha nunca fica em `homenagens` (RLS de leitura pública `true`). Fica em `homenagens_seguranca` (hash scrypt, salt = id do memorial), sem policy de leitura pública. View `homenagens_busca_publica` expõe só booleano `tem_senha`. Verificação/escrita passam por API routes server-side (`/api/memorial-acesso` público, `/api/memorial-senha` autenticado) com service role key — hash nunca trafega pro client.

**A senha bloqueia os DOIS caminhos:** busca E link/QR direto (`/homenagem/[slug]` checa `tem_senha`, ilha client `GateSenhaAcesso.tsx`, cookie assinado HMAC de 30 dias `mem_acesso_{slug}`).

Definir/trocar/remover senha: campo "Senha de acesso" no formulário (Central `/admin/memoriais/[id]` e Portal do Parceiro `/parceiro/memoriais`) — em branco = memorial público.

## Portal da Família — como funciona
**1 e-mail de contato por memorial, sem conta** (modelo simplificado — antigo responsável+código pra até 3 parentes foi removido):
1. Central/Parceiro cadastra e-mail da família na ficha → `POST /api/admin/cadastrar-email-familia`
2. Sistema gera senha simples (8 caracteres hex), hasheia em `homenagens_seguranca.senha_familia_hash`, manda por e-mail (Resend)
3. Família busca pelo nome do homenageado em `/familia/login` (nunca por slug) + senha via `POST /api/familia-login`, cookie HMAC de 12h
4. Dentro de `/familia/[slug]`, edita os mesmos campos do admin/parceiro (foto, vídeo, galeria, timeline, bio, frase) — grava direto em `homenagens`

Sem Resend configurado, a API retorna a senha na resposta pro staff/parceiro repassar manualmente.

**Ainda falta:** "esqueci a senha" da família (hoje só reemissão manual).

**Cadastro do responsável por CPF (modo teste apenas)** — campo CPF + "Consultar CPF" (`POST /api/admin/consultar-cpf`, provedor `cpfcnpj.com.br`, token de teste) preenche Nome automaticamente; CPF nunca é persistido. **Não é produção ainda** — falta token de produção e resolver IP fixo exigido pelo provedor vs IP de egress dinâmico da Vercel (bloqueio técnico sem solução ainda). Plano com decisões em `docs/RASCUNHO_IDEIAS.md`.

## Página do Memorial (`/homenagem/[slug]`) — como funciona
Pública, sem login, **componente 100% servidor** (zero JS client contínuo na rota — interatividade nova sempre vira ilha `'use client'` isolada, sem `requestAnimationFrame`).

**Seções (lendo direto do Postgres):**
- Hero: foto/monograma, nome, datas, cidade (ícone `<MapPin>`), frase preferida, anel dourado fino + glow radial
- Faixa de presença viva (`FaixaPresencaViva.tsx`) — velas/homenagens/memórias
- Biografia com drop-cap + card lateral "Em poucas palavras" (`ResumoPoucasPalavras.tsx`, derivado de dado real)
- Timeline em espinha vertical com nós dourados
- Galeria (`GaleriaFotos.tsx`) — mosaico A/B alternável, lightbox (setas/teclado), `loading="lazy"`
- Mural de memórias (`MuralMemorias.tsx`) — nome+parentesco+texto+reação de coração via RPC `reagir_memoria(p_id)`
- Condolências — grid + formulário, grava real na tabela `condolencias`
- Acender vela (`AcenderVela.tsx`) — vela principal com vídeo real (`mix-blend-mode: screen`) + parede de até 45 velas votivas (técnica CSS), chama "voa" da principal até o próximo slot vago (`getBoundingClientRect`), RPC `acender_vela(p_slug)`, contador nunca desce, anti-spam via `localStorage`
- Seletor de tema (`SeletorTema.tsx`) — 3 paletas, demo apenas, não persiste
- Rodapé com logo real

**Especificação de mídia:** 10 fotos (8MB cada) + 4 vídeos (100MB cada) = 480MB, quota 500MB/memorial. Aplicado nas 3 rotas de upload.

**Índices:** `idx_homenagens_slug`, `idx_condolencias_homenagem_id`, `idx_mural_memorias_homenagem_id` — todos com `created_at DESC` onde a query ordena por data.

**Segurança (auditoria Opus 2026-07-23):** RLS de insert público removida de `homenagens` (só staff/parceiro autenticado cria memorial), `CHECK` constraints em `condolencias`/`mural_memorias`/galeria, policy duplicada removida, `search_path` fixado em `buscar_homenagens_publicas`, queries paralelizadas com `Promise.all`.

**Não implementado ainda:** troca de tema persistente, compartilhar, música de fundo (biblioteca curada royalty-free planejada, não construída — família NÃO pode fazer upload de música livre, risco de direito autoral/ECAD), múltiplos vídeos por memorial, links de Privacidade/Termos no rodapé, rate-limit de escrita pública via Route Handler (ver Fase Atual).

### Layout responsivo — feito (2026-07-23)
Mockup gerado no Claude Design (export "Bundled Page") analisado seção a seção — maior parte já batia com a produção (galeria mosaico A/B+lightbox, mural com corações via RPC, timeline em espinha, vela com parede de 45+chama voando). Gap real era só largura/layout: container fixo 720px virou responsivo (520px mobile/1100px desktop, classe `.mem-container`), hero virou linha (foto+texto lado a lado) no desktop em vez de sempre coluna centralizada, seção "Acender uma vela" saiu de dentro do hero e virou seção própria perto do rodapé (posição do mockup). Fonte mantida Georgia — decisão do Rafael, não trocou pro Playfair Display/Source Sans 3 do mockup.

## Convenção de Teste
Toda área de cadastro nova vem com 2 registros fictícios já cadastrados.

## Convenção de Formulários
Ver seção Convenções acima.

## Ordem de construção
1. [x] Auth integrado · 2. [x] CRUD de Parceiros · 3. [x] Módulo de Cemitérios · 4. [x] Portal do Parceiro B2B · 5. [x] CRUD de Memoriais (Central) · 6. [ ] Módulo Financeiro completo · 7. [x] Módulo de Usuários (`/admin/usuarios` — criar, trocar papel, ativar/desativar)

## Sócios — Emails
- Rafael (admin): rvnegocioss@gmail.com
- Pedro (admin): pedro.saraiva@estouonline.com.br
- Ricardo (admin): ricrodalves@gmail.com

## O que está pronto
Landing premium (Hero 3D) · Central completa (Parceiros/Cemitérios/Memoriais/Mapa/Usuários/Emails/Manual) · Portal do Parceiro B2B completo · Busca pública + sub-landing do parceiro · Portal da Família completo · QR Code automático com pipeline de e-mail pro fornecedor · Rate limit middleware centralizado · Política de Privacidade/Termos · Repositório GitHub `rvnegocioss-cloud/legado-digital-` · CI/CD (lint+typecheck+build em paralelo). Detalhe de cada peça nas seções "como funciona" acima.

## Chatbot IA (LegadoBot) — status
**Planejado (não construído):** entrada por voz, acesso de leitura/escrita direta no banco com guardrail (parte mais sensível, precisa desenho cuidadoso antes), escalonamento pra admin humano.

**Implementado (2026-07-14, só teste/sócios):**
- **Interno** (Central + Portal do Parceiro) — `app/api/legadobot/chat/route.ts` + `components/LegadoBotWidget.tsx`, backend Groq (`llama-3.3-70b-versatile`, gratuito, nuvem). Escopo por papel: staff vê tudo, Parceiro só o próprio `parceiro_id` (reforçado no prompt e no código). Navegação automática via diretiva `AÇÃO: /caminho` extraída da resposta.
- **Público** (landing) — `app/api/legadobot-publico/chat/route.ts` + `components/LegadoBotPublicoWidget.tsx`, sem autenticação, sem acesso a dado real, honesto sobre não ter canal de contato publicado ainda. Navegação limitada a `/busca` e `/parceiro/login`.
- Prompts em `docs/LEGADOBOT_PROMPT.md` (interno) e `docs/LEGADOBOT_PROMPT_PUBLICO.md` (público) — atualizar junto com qualquer mudança na Central/Parceiro (regra 14 acima).

## Ideias em avaliação (backlog não decidido, só registrado)
- **"Book" digital de apresentação pra família** (comercial) — material de apresentação pro parceiro mostrar na venda (vídeo, intenção do projeto). Não construído — falta decidir formato (página/vídeo/PDF) e quem produz.
- **Música gerada com IA (Suno)** — familiar gera música sobre a vida do homenageado. Avaliar pro próximo deploy.
- **Drones + mapeamento do cemitério + navegação tipo Waze até o túmulo** (ideia do Pedro) — relatório técnico completo em `/admin/mapa/drone`. 3 opções de captura de coordenada (GPS celular / GNSS RTK / ortomosaico de drone) e 3 de guiar visitante (link Google Maps / bússola própria / rota turn-by-turn tipo mapa indoor) — nada decidido, Fase 5.
- **Vídeo gerado por IA como fundo da landing** — Adobe Firefly/Canva AI/InVideo AI (nenhum conectado como MCP hoje). Avaliar depois do backlog do Pedro.

## O que NÃO está no MVP
Faturamento e cobrança interna · Pagamento online · App mobile nativo · Integração com cartórios · IA para biografias automáticas · Mapa cemiterial avançado · Marketplace de produtos físicos

## Premissas Técnicas
MVP enxuto mas não descartável · Base preparada pra escala e geolocalização · LGPD desde o início (consentimento, privacidade, trilha de alteração) · ERP externo pra faturamento — Legado Digital só registra fechamento mensal · IA deve propor arquitetura antes de escrever código · Explicar em linguagem simples ao usuário o que está sendo feito e por quê

## Convenções de Código
Componentes em PascalCase · TypeScript strict sempre · Variáveis/funções em camelCase · Pastas em kebab-case · Sempre usar Supabase MCP pra operações no banco · Sempre usar Vercel MCP pra deploy

## Skills instaladas
Log de uso em `docs/USO_SKILLS_MCPS.md`.
- **gstack** — 23 slash commands pra estruturar fluxo como equipe. Overhead desproporcional pra tarefa pequena — avaliar antes de invocar.
- **frontend-design** (Anthropic) — direção de design pra UI pública nova/distintiva.
- **ui-ux-pro-max, ui-styling, design-system, design, brand, banner-design, slides** (nextlevelbuilder) — banco de padrões de UI/UX; `ui-ux-pro-max` tem `scripts/search.py --domain <x>`.

## MCPs Disponíveis
Conectadas: supabase, vercel, memory, sequential-thinking, playwright, Google Calendar/Gmail/Drive, SlidesGPT, Three.js 3D Viewer, HyperFrames (HeyGen).
Pendente de auth: Notion, Canva, Windsor.ai. Com falha de conexão: Context7.

## Comandos Úteis
```bash
npm run dev        # inicia servidor local
npm run build      # build de produção
npm run lint       # verifica erros de estilo/linting
npm run typecheck  # verifica erros de tipo TypeScript
npm run start      # inicia servidor de produção
```

## CI/CD — GitHub Actions
`.github/workflows/ci.yml` — todo push/PR roda 3 jobs em paralelo: Lint (`npm run lint`), TypeScript Check (`tsc --noEmit`), Build (`npm run build`). Cache de npm e `.next/` entre runs. Qualquer job falhando = workflow vermelho.

**Branch Protection recomendado (ação manual do Rafael no GitHub):** Settings → Branches → aplicar ao `main` → "Require status checks to pass before merging" → adicionar `ci/lint`, `ci/typecheck`, `ci/build`.

## Credenciais (apenas referência — nunca commitar)
- Supabase Project Ref: yegvazxycfrbhblyzvhg
- Deploy: Vercel (projeto legado-digital-)

---

## Session Start Protocol ⚡

**MANDATORY** at start of each session:
```bash
✓ .claude/COMMON_MISTAKES.md      # ⚠️ CRITICAL - Read FIRST
✓ .claude/QUICK_START.md          # Essential commands
✓ .claude/ARCHITECTURE_MAP.md     # File locations
```

**At task completion:** criar doc em `.claude/completions/YYYY-MM-DD-task-name.md`, mover arquivo de sessão pra `.claude/sessions/archive/` (se criado).

**⚠️ NEVER auto-load:** `.claude/completions/`, `.claude/sessions/`, `docs/archive/` (custo zero de token, só ler se pedido).

---

**Last Updated**: 2026-07-23
**Histórico completo**: `Projects/Legado Digital - Historico Detalhado.md` (vault)
