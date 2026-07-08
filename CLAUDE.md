# Legado Digital — Briefing do Projeto

## Regra Obrigatória — Atualização do CLAUDE.md
**Após cada tarefa concluída, o Claude Code DEVE atualizar este arquivo:**
- Marcar itens concluídos com [x]
- Adicionar o que foi feito na seção "O que está pronto"
- Atualizar "Fase Atual" com próximos passos
- Registrar decisões técnicas importantes tomadas
- Esta regra não pode ser ignorada — é parte do fluxo de trabalho

**Um commit só, um deploy só:** CLAUDE.md e `/admin/mapa` atualizam no MESMO commit/push da modificação de código, nunca em commit separado depois. Gasta tempo e token à toa fazer 2 deploys pra mesma tarefa.

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
- [ ] Website institucional finalizado

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
- Upload de fotos/vídeo/timeline no CRUD do parceiro (hoje só campos biográficos básicos)
- Módulo financeiro completo (`contratos`, `planos`, `aquisicoes`, `fechamento_mensal`) — Fase 4; por ora só `plano_contratado`/`status_pagamento` simples em `parceiros_b2b`
- `SUPABASE_SERVICE_ROLE_KEY` ainda não foi adicionada nas variáveis de ambiente do **Vercel** (só existe no `.env.local`) — "Convidar contato" só funciona em produção depois disso

## Página do Memorial (`/homenagem/[slug]`) — como funciona
Pública, sem login. Reescrita do zero (2026-07-07) como **componente 100% servidor** — zero JS client na rota, sem risco de travar o navegador (ver Bugs conhecidos).

### O que já exibe (lendo direto do Postgres)
- Hero: foto, nome, datas, cidade, frase preferida
- Biografia
- Vídeo incorporado (`video_url`, converte link do YouTube)
- Galeria de fotos (`galeria_fotos`)
- Linha do tempo (`timeline` jsonb)
- Condolências — lidas de verdade da tabela `condolencias` via `homenagem_id` (não é mais hack reaproveitando `homenagens`)

### Gap conhecido (por isso as seções somem em teste)
As seções só aparecem se o memorial **tiver o dado preenchido** — e hoje **nenhum formulário de edição tem campo pra vídeo/galeria/timeline** (nem `/admin/memoriais/[id]` nem `/parceiro/memoriais`, só nome/datas/cidade/frase/bio). Só dá pra popular via SQL direto. Precisa adicionar esses campos nos dois formulários de edição.

### Visual
Identidade navy `#0B1D2A` + dourado `#C9A46A` (mesma do template antigo "Noturno"), tipografia serif. Estilização ainda básica (inline styles simples) — refino visual "luxo moderno" é a próxima etapa, mantendo tudo em CSS puro (sem animação contínua, sem fetch de fonte externa).

### Ainda não incluído (planejado, não construído)
- Formulário de nova condolência (será ilha client isolada, pequena)
- Acender/apagar vela, troca de tema, compartilhar, player de música (ilhas client, uma por vez, sem RAF)
- Localização (cemitério/jazigo) — sem dado real ainda, schema de jazigo/gaveta não existe (Fase 5)
- Portal da Família — família edita o próprio memorial. Mesmo padrão do parceiro (tabela `responsaveis_familiares` + função `is_own_familiar(homenagem_id)`), só que escopado num memorial em vez de um parceiro inteiro. Não conflita com RLS existente (políticas somam). Ainda não iniciado.

## Convenção de Teste
**Toda área de cadastro nova vem com 2 registros fictícios** já cadastrados, pra nunca ficar vendo tela vazia ao revisar. (Ex: 2 funerárias, 2 memoriais.)

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
- **Portal do Parceiro B2B** em app/parceiro/ — login, layout protegido, CRUD de memoriais restrito ao próprio parceiro (ver seção própria acima)
- Schema: usuarios, perfis, permissoes, usuarios_perfis, perfis_permissoes, parceiros_b2b, cemiterios, parceiros_usuarios
- `homenagens.parceiro_id` — vincula memorial ao parceiro que cadastrou (null = venda direta Legado Digital)
- Funções helper: `is_legado_staff()` (RLS de parceiros_b2b/cemiterios/homenagens pra equipe interna), `is_own_parceiro(uuid)` (RLS de homenagens/parceiros_b2b pro próprio parceiro)
- 2 funerárias fictícias cadastradas pra testes: Funerária Memória Eterna (SP), Funerária Paz Perpétua (RJ)
- 4 memoriais fictícios: 2 via Memória Eterna, 2 diretos (Legado Digital)
- Contas dos 3 sócios criadas via Admin API (script `scripts/seed-socios.mjs`)
- Next.js 16 + TypeScript + Tailwind funcionando
- Build passando sem erros
- Repositório GitHub: rvnegocioss-cloud/legado-digital-

## Bugs conhecidos
- (resolvido) `/homenagem` não tinha rota dinâmica `[slug]` — corrigido, agora em `app/homenagem/[slug]/page.tsx`, testado com memorial real e slug inexistente
- (resolvido) Links "Ver página"/"Acessar página do memorial" abriam com `target="_blank"` — no navegador mobile isso gerava a tela nativa "This page couldn't load" quando a aba nova era descartada em segundo plano. Removido `target="_blank"`, agora abre na mesma aba.
- (resolvido) `HomenagemTemplate.tsx` tinha `@import url(fonts.googleapis.com/...)` direto no `<style>` — fonte buscada em tempo real do Google no navegador do visitante. Em rede que não alcança `fonts.googleapis.com` (firewall, operadora, bloqueador), travava o carregamento da página inteira ("This page couldn't load"). Corrigido: removido o `@import`, `.fd`/`.cursive` usam fonte de sistema (Georgia/Times New Roman), sem dependência de rede externa.
- (resolvido) **Causa real do "This page couldn't load"**: `FundoParallax.tsx` (fundo 3D das velas no hero do memorial) rodava um `requestAnimationFrame` infinito reescrevendo `transform` a cada frame numa camada `preserve-3d` + `will-change` + giroscópio/`DeviceOrientation`. Em GPUs/navegadores mais fracos vazava memória do compositor até o navegador matar a aba (tela nativa de crash do Edge/Chrome). A página aparecia e depois "sumia". Veio pro ar quando os deploys da sessão rebuildaram o parallax. Corrigido: `FundoParallax` agora é **estático** (crossfade das imagens + overlay), sem loop de animação nem compute contínuo.

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

## Skills gstack
**Localização**: `D:\gstack` (HD externo)

Gstack de Garry Tan — 23 slash commands para estruturar Claude Code como uma equipe (CEO, Designer, Eng Manager, Release Manager, QA). Carregue com:
```bash
/plugin install D:\gstack
```

Skills principais:
- `/office-hours` — descoberta de produto
- `/plan-ceo-review` — escopo estratégico
- `/plan-eng-review` — arquitetura
- `/review` — revisão de código
- `/qa` — testes com Playwright
- `/ship` — release

## MCPs Disponíveis
- supabase: operações no banco
- vercel: deploy
- filesystem: leitura e escrita de arquivos
- memory: memória persistente entre sessões
- sequential-thinking: raciocínio em etapas
- context7: documentação de libs em tempo real
- n8n: automações (emails, notificações)
- github: versionamento

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

**Last Updated**: 2026-07-07
**Optimized with**: [Claude Token Optimizer](https://github.com/nadimtuhin/claude-token-optimizer)
