# Legado Digital — Briefing do Projeto

> Histórico detalhado (bug corrigido, decisão tomada, mudança dia-a-dia) arquivado no vault: `Projects/Legado Digital - Historico Detalhado.md`. Este arquivo mantém só regra permanente + estado atual + arquitetura de referência — carregado toda sessão, precisa ficar enxuto.

## Regras Permanentes (nunca ignorar)

1. **Proteção contra ação destrutiva** — nunca `DROP TABLE`/`DELETE` sem filtro/`TRUNCATE`/migração que altera ou remove coluna existente/`git push --force`/`git reset --hard`/deletar branch/`rm -rf` sem mostrar a ação exata primeiro e ter confirmação explícita do Rafael. Backup automático obrigatório (`scripts/backup-supabase.js`, salva em `Desktop\Cerebro Claude - Legado Digital\backups\`) antes de qualquer ação destrutiva. Supabase do projeto é plano free, sem PITR — motivo a mais pra nunca arriscar sem backup.
2. **Tudo escalável desde o início** — schema de banco, upload de arquivo, geração de identificador, rate limit: nunca gambiarra que só funciona em escala pequena, mesmo que "resolva por agora".
3. **Modelo por tarefa** (Agent tool) — Sonnet 5: execução (código/edição/build/commit), padrão dessa sessão, não precisa spawnar subagente pra isso. Opus 4.8: planejamento complexo/arquitetura, `subagent_type:"Plan"` + `model:"opus"` antes de decisão grande — nunca inventar arquitetura complexa sozinho. Haiku 4.5: tarefa mecânica/repetitiva de subagente. Fable 5: teto de capacidade quando a tarefa realmente precisa (caro, 1M contexto), ainda não testado no projeto.
4. **CLAUDE.md atualizado no mesmo commit** da feature, nunca depois. Marcar `[x]`, atualizar Fase Atual/O que está pronto. Se uma decisão anterior for **revertida/mudada** no meio da sessão (ex: um fluxo que foi construído e depois desfeito a pedido do Rafael), a descrição velha tem que ser corrigida na hora, não pode sobreviver até o Rafael notar depois. Changelog detalhado (o "como/por que" de cada mudança) vai pro vault (Dev Logs/), não empilha aqui — aqui fica só a linha resumida. **Antes de encerrar a sessão ou trocar de sessão**, revisar o arquivo inteiro contra o que foi feito de verdade (não só os últimos commits) — item desatualizado não pode esperar o Rafael perguntar. Regra reforçada 2026-07-29.
5. **Backup de material relevante** (PDF/doc/técnica validada) em `Desktop\Cerebro Claude - Legado Digital\` (HTML simples, sem base64/Drive).
6. **Pesquisar referência real antes de construir UI/efeito com barra de qualidade alta** (CodePen/Awwwards/doc oficial) — nunca inventar do zero e torcer pra ficar bom.
7. **Build passou → commit + push direto, sem perguntar.** Só para e avisa se o build falhar.
8. **Nunca pedir slug/endereço técnico em tela pública** — busca sempre por nome do homenageado, slug resolvido por trás.
9. **Log de skill/MCP usado** em `docs/USO_SKILLS_MCPS.md` (o quê, motivo, o que produziu).
10. **Rótulo de UI deixa ação óbvia** (ex: "Memoriais (Cadastrar/Editar)", não só "Memoriais").
11. **Toda página de detalhe/edição/login tem link de volta visível** no topo (nunca só o botão voltar do navegador).
12. **Logo real (`public/logo-legado-digital.svg`) em toda tela de acesso/identificação**, via `next/image`, nunca texto solto. Sempre menor que o container que envolve, com folga — nunca transborda.
13. **Layout de ficha na Central** — card grande (form/tabela/lista que cresce) ocupa linha cheia ou split 2/3+1/3 com painel de referência curto ao lado (caso "um grande + um de consulta rápida"); cards curtos nunca ficam sozinhos numa coluna larga, vão lado a lado num grid parelho (`lg:grid-cols-2 xl:grid-cols-3`). Central é ferramenta de trabalho densa (tela larga aproveitada), diferente do lado público (mobile-first).
14. **`docs/LEGADOBOT_PROMPT.md`/`LEGADOBOT_PROMPT_PUBLICO.md` atualizados junto** com qualquer mudança relevante na Central/Portal do Parceiro/segurança — **automático, sem esperar aprovação** (mudou 2026-07-30 a pedido do Rafael: o bot precisa sempre saber do estado atual do sistema). Vale junto a regra 22 (hierarquia de segurança) — toda mudança de prompt tem que respeitar o corte estrutural staff/parceiro, nunca só instrução de texto.
15. **Ideia/pergunta sem resposta do Rafael** vai pro `docs/RASCUNHO_IDEIAS.md` — nunca decide/constrói de lá sem confirmação dele primeiro.
16. **Toda feature nova refletida nos lados relevantes** (Central ↔ Portal do Parceiro ↔ Página Pública) — nunca implementar só de um lado.
17. **Nunca remover/mexer na seção "Como Chegar"** (`GuiaTumulo`/`GuiaTumuloCarregador`, mapa/rota até o cemitério e o túmulo na página do memorial) sem pedido explícito do Rafael. Regra registrada 2026-07-23.
18. **Não desobedecer instrução explícita do Rafael** — quando ele pede uma ação direta (commitar, subir, corrigir algo específico), executar sem ficar re-explicando/re-verificando em loop nem adicionando passo extra não pedido. Dúvida real de segurança (regra 1) ainda vale, mas fora isso a obediência é direta. Regra registrada 2026-07-24.
19. **Quando faltar dado pra uma seção aparecer** (ex: memorial de teste sem galeria/timeline), gerar/cadastrar o dado direto (fictício quando for teste, real quando fizer sentido) — não só reportar que falta, resolver. Regra registrada 2026-07-24.
20. **Nunca mexer na estrutura/posição da vela (`components/public/AcenderVela.tsx`)** sem pedido explícito — corpo da vela, pavio, posição da chama (`bottom: calc(100% + 14px)`, `left: calc(50% + 8px)`, técnica `border-radius: 50% 50% 50% 0` + `rotate(-45deg)`) já estão calibrados certos, deu muito trabalho alinhar. Se qualquer variação nova de layout for criada, essa seção entra **idêntica**, reaproveitando o componente sem alteração. Regra registrada 2026-07-24.
21. **A página atual do memorial (`/homenagem/[slug]`) é o modelo base — nunca reescrita.** Qualquer variação de layout nova (ex: versão "tipo Facebook") é uma página/rota separada, nunca substitui ou modifica a atual. Marcada com tag git `homenagem-modelo-base-2026-07-24` (`git checkout` nela restaura esse estado exato se algo der errado numa variação futura) e print de referência em `docs/pagina-atual-referencia-2026-07-24.png`. **Detalhe completo dos dois modelos travados (página + vela) em `docs/MODELOS.md`** — consultar ali antes de qualquer dúvida, nunca editar o que está descrito lá sem pedido explícito. Regra registrada 2026-07-24.
22. **Hierarquia de segurança entre os 3 níveis nunca se cruza** — Central (staff) acessa tudo → Parceiro B2B só os próprios memoriais/dados → Família só o próprio memorial (depois de e-mail+senha). Parceiro nunca acessa nada equivalente à Central; Família nunca acessa Parceiro nem outro memorial. Vale pra toda feature nova: RLS/policy, API route, e agora também o LegadoBot (prompt cortado por papel — a seção só-staff é removida do contexto do modelo pra parceiro, não é só instrução de "não conte", ver regra 14). Qualquer mudança de schema/rota precisa checar contra essa régua antes de considerar pronta. Regra registrada 2026-07-30 depois de auditoria real (Opus) que confirmou o desenho correto mas achou 1 furo crítico + 8 médios/baixos, todos corrigidos no mesmo dia.

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
2 eixos ortogonais: **canal** (busca / link direto / QR Code — os 3 toggles independentes) × **portão** (`modo_gate`: aberto · com senha · com identificação/cadastro · lista de e-mails autorizados · oculto). Todos os 5 modos de portão implementados (2026-07-31) — detalhe completo na Fase Atual.

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
- [x] **Busca embutida direto na landing** (2026-07-30) — botão "Buscar um Memorial" que levava pra `/busca` virou `BuscaMemorial` (mesmo componente da página de busca) embutido direto no hero da landing.
- [x] **Modos de privacidade completos** (2026-07-31, planejado com Opus + executado no mesmo dia, incluindo QR assinado e UI da família na mesma sessão) — os 5 modos existem de verdade: aberto, com senha (já existia), com identificação (cadastro), lista de e-mails autorizados (email, allowlist + OTP de 6 dígitos por 10min), e oculto (some de busca/link/QR pra todo mundo, staff/parceiro/família continuam vendo pelos próprios painéis). Achado no meio do planejamento: já existia um scaffold de schema pra isso desde 2026-07-17 (coluna `modo_gate` + tabelas `memorial_visitantes`/`homenagens_emails_autorizados`/`memorial_email_codigos`) aplicado via MCP mas nunca salvo em `supabase/migrations/` nem usado em código — recuperado retroativamente (`20260717190749_...sql`). Arquitetura: 2 eixos ortogonais — canal (busca/link/QR) × portão (`modo_gate`), resolvidos em ordem fixa por `lib/modosPrivacidade.ts` (`resolverAcesso`): oculto vence tudo → canal errado responde igual a "não encontrado" (nunca "acesso restrito", anti-enumeração) → portão aberto passa → senha/cadastro/email pedem prova. Cookie de acesso ganhou `modo` + `gate_versao` no payload — trocar o modo ou salvar privacidade deriva `gate_versao+1` e derruba na hora qualquer cookie emitido antes, mesmo dentro da validade (30 dias pra senha, 7 pra cadastro/email). UI: componente único `components/admin/PrivacidadeMemorial.tsx` reaproveitado por Central e Portal do Parceiro (radio dos 5 modos + os 3 toggles de canal + gerenciador de e-mails autorizados quando modo=email + lista de visitantes identificados quando modo=cadastro), zero duplicação entre os dois lados. Rotas novas: `/api/memorial-acesso-cadastro`, `/api/memorial-acesso-email/solicitar`+`/confirmar`, `/api/memorial-emails-autorizados` (CRUD da lista), `/api/memorial-visitantes` (leitura) — as 2 de e-mail caem automaticamente no rate limit de login (3/min) do `proxy.ts` por prefixo de path (`/api/memorial-acesso*`), sem precisar mexer no proxy. OTP com rate limit no banco (não no Map em memória do `proxy.ts`, que não é compartilhado entre instâncias serverless da Vercel): 10/hora por memorial, 3/hora por e-mail, 5 tentativas erradas invalida o código, código expira em 10min, resposta sempre genérica — mesmo padrão anti-enumeração de `/api/familia-esqueci-senha`. **QR Code assinado (Fase 7)**: `?qr=<token>` HMAC determinístico (`lib/acessoMemorialSessao.ts`, `criarTokenQr`/`verificarTokenQr`) embutido no QR gerado (`/api/memorial-qrcode` e `lib/dispararEmailFornecedor.ts`, os 2 pontos que geram o PNG) — agora `qrcode_habilitado` e `link_habilitado` são canais de verdade, distintos. Compatível com QR já gerado antes (sem `?qr=` cai em canal "link", nenhuma placa existente quebra). **UI da família (`/familia/[slug]`)**: card "Privacidade" com o mesmo editor completo de Central/Parceiro (radio dos 5 modos + 3 toggles de canal + allowlist/visitantes) — confirmado pelo Rafael no mesmo dia que a família pode travar/destravar o próprio memorial sozinha, sem precisar pedir pra funerária. `/api/memorial-privacidade` passou a aceitar o tripé staff/parceiro-dono/família (`lib/autorizacaoMemorial.ts`, mesmo helper de `/api/memorial-emails-autorizados`) em vez de só staff/parceiro. `/api/familia-memorial` (GET) devolve também um bloco `privacidade` (lido de `homenagens_seguranca`, já que a família não tem RLS direta nessa tabela) usado como estado inicial do editor.
- [ ] Website institucional finalizado
- [x] Contatos da empresa (`parceiros_contatos`) ligados ao fluxo de convite existente — já funciona: contato cadastrado com e-mail dispara convite automático, contato sem e-mail tem botão "Conceder acesso" próprio, `POST /api/admin/convidar-parceiro` grava `usuario_id` de volta na linha do contato via `contatoId`. Item estava desatualizado na lista, corrigido 2026-07-30 (regra 4).
- [x] **Privacidade em 3 toggles levada pro `/parceiro/memoriais`** (2026-07-30) — antes só existia em `/admin/memoriais/[id]`; API `/api/memorial-privacidade` já aceitava parceiro dono (auditoria anterior), faltava só a UI/estado no lado do Parceiro — copiado igual ao de Central (busca/link/QR, todos ligados por padrão).
- [x] "Esqueci a senha" da família — self-service já existe (botão na tela `/familia/login` → `/api/familia-esqueci-senha`, resposta genérica anti-enumeração, senha nova por e-mail). Item estava desatualizado na lista, corrigido 2026-07-30 (regra 4).
- [ ] Suporte a múltiplos vídeos por memorial (`videos_galeria`) — pausado a pedido do Rafael
- [ ] Troca de tema persistente (hoje é só demo/preview, não salva no banco — precisa campo `tema` em `homenagens`)
- [x] **Rate-limit de escrita pública** (2026-07-30) — condolências, mural (criar + reagir) e vela agora passam por Route Handlers próprios (`/api/memorial-condolencia`, `/api/memorial-mural`, `/api/memorial-mural-reagir`, `/api/memorial-vela`), com service role, cobertos pelo rate limit geral do `proxy.ts` (30/min por IP em `/api/*`) mais um limite por-recurso (`lib/rateLimitUtil.ts`: por memorial e por IP, ex: 50 condolências/hora por memorial). O bypass direto foi de fato fechado, não só movido: migration `20260730_revoke_public_writes_condolencias_mural_vela.sql` removeu a policy de INSERT público em `condolencias`/`mural_memorias` e revogou `EXECUTE` de `anon`/`authenticated`/`PUBLIC` nas RPCs `reagir_memoria`/`acender_vela` — testado como role `anon` direto no banco, insert e RPC bloqueados. `visualização` (contagem de views) roda dentro do próprio SSR de `/homenagem/[slug]`, então em vez de reescrever esse fluxo só adicionei `/homenagem/` à lista de paths cobertos pelo `proxy.ts` (30/min por IP na página inteira, que já inclui a contagem).
- [x] **Auditoria de segurança completa (Opus, 2026-07-24)** — achado grave: `app/middleware.ts` nunca rodou em produção (Next.js 16 renomeou a convenção pra `proxy.ts` na raiz) — zero rate limit em qualquer rota até hoje. Corrigido, mais 5 itens: chat público do LegadoBot sem trava de origem/vazamento de erro, consulta de CNPJ sem autenticação, headers de segurança site-wide (CSP/HSTS/X-Frame-Options), rota de backup com bug que sempre bloqueava por acidente (corrigida com auth de verdade), `sharp` desatualizado (CVEs reais, lib que processa foto de família) atualizado via `overrides`. Detalhe completo no vault.
- [x] **2 vazamentos de dados entre parceiros + 11 achados de lógica/integração (2026-07-27)** — parceiro sem vínculo via bug de RLS via cross-tenant via URL `?parceiro_id=`, `getAdminUser()` sem checar papel, e-mail da família exposto na leitura pública, sem rate limit de senha, mural sem moderação, slug duplicado sem trava (quebrava login da família), upload sem limite no Storage, race condition de edição concorrente (nova coluna `homenagens.updated_at`), barra de armazenamento decorativa, rascunho órfão público, coração do mural sem persistir. Todos corrigidos, buildados, no ar. Detalhe completo nos Dev Logs de 2026-07-27 do vault.
- [x] **UI de moderação do mural de memórias** (2026-07-29) — botão "Remover" na ficha, Central e Portal do Parceiro, usando a permissão de DELETE já liberada em 2026-07-27.
- [x] **Troca de senha obrigatória no 1º login do parceiro** (2026-07-29, planejado com Opus) — senha temporária deixou de ser fixa "123456", agora gerada por parceiro (`lib/gerarSenhaTemporaria.ts`: 2 letras do nome + 6 dígitos aleatórios). Nova coluna `usuarios.senha_temporaria`; `app/parceiro/layout.tsx` bloqueia com tela cheia (`TrocarSenhaObrigatoria.tsx`) até trocar — só pra convite novo, staff em modo Central nunca cai nessa tela.
- [x] **Mapa "Como Chegar" sem imagem de satélite** (2026-07-29, achado crítico ao vivo com o Rafael) — CSP (auditoria 2026-07-24) faltava `server.arcgisonline.com` no `connect-src` e `worker-src` pra blob: (MapLibre usa fetch()+web worker, não `<img>` como o Leaflet antigo que a CSP foi calibrada pra). Corrigido só em `next.config.ts`, sem tocar em `GuiaTumulo.tsx` (regra 17). De quebra: pino do túmulo agora mostra foto+nome ao passar mouse/tocar (pedido explícito), e nota no rodapé do mapa avisando que a imagem de satélite será substituída pelo ortomosaico do drone quando existir.
- [x] **`/parceiro/emails` sem filtro por empresa** (2026-07-29) — staff em modo Central via e-mail de qualquer parceiro ali, corrigido com o mesmo padrão de filtro já usado no resto do Portal do Parceiro.
- [x] **3 achados de segurança baixa prioridade** (2026-07-29) — 13 RLS policies restritas de `public` pra `authenticated`; sessão de família/senha de memorial passou a usar `SESSION_HMAC_SECRET` próprio em vez de reaproveitar `SUPABASE_SERVICE_ROLE_KEY` (já configurado na Vercel + `.env.local`).
- [x] **Auditoria de segurança Central/Parceiro/Família (Opus, 2026-07-29)** — pedido do Rafael pra confirmar que os 3 níveis nunca se cruzam. Achado crítico real: `parceiros_publicos` e `homenagens_busca_publica` (views) rodavam sem `security_invoker` (privilégio do dono, ignora RLS) e tinham GRANT de escrita pra `anon` — qualquer requisição com a chave pública conseguia `DELETE`/`UPDATE` direto num parceiro via REST, sem login nenhum (cascade derrubava login da funerária e orfanava memoriais). Corrigido em 3 migrations: revoke de escrita imediato, depois `security_invoker` real em `parceiros_publicos` (com correção no meio do caminho — a primeira tentativa da policy vazava email/cnpj/telefone pra qualquer `authenticated`, não só `anon`, corrigida antes de virar risco). `homenagens_busca_publica` manteve o padrão atual de propósito (documentado no SQL) — teria que expor a coluna de hash de senha pra funcionar como invoker. Mais 6 achados médios/baixos, todos corrigidos: view `homenagens_publica` com colunas explícitas substituindo GRANT genérico em `homenagens` pra leitura pública (fragilidade, não vazamento ativo); `/api/memorial-storage-usage` sem autenticação nenhuma, agora aceita staff/parceiro dono ou sessão de família; 2 rotas de upload mortas (`admin/upload`, `parceiro/upload`) removidas; login da família passou a exigir e-mail cadastrado junto da senha (senha sozinha era só 32 bits); `/api/familia-memorial` com `select('*')` virou lista de coluna explícita; sessão da família (cookie 12h) agora revoga na hora quando a senha troca (token embute pedaço do hash vigente); parceiro não conseguia salvar a própria página pública (RLS só tinha policy de UPDATE pra staff) — corrigido com função `SECURITY DEFINER` estreita em vez de abrir policy genérica (evitaria vazar `status_pagamento`/`cnpj` pra escrita do próprio parceiro). E-mail/telefone/nome da família confirmados como NUNCA vazados (GRANT por coluna já funcionava, testado com query real como `anon`). Nada do que foi mexido nas fichas hoje (cadastro de família, QR Code, CPF) tinha problema de cruzamento. 9 commits separados, todos com build/typecheck verde antes de subir.
- [x] **QR Code verificado + bug de reenvio pro fornecedor corrigido** (2026-07-29, pedido urgente do Rafael) — a URL embutida no QR sempre vem do slug fresco no banco pelo `memorialId` (`/api/memorial-qrcode`), sem risco de apontar pro memorial errado. Achado real: no Portal do Parceiro, `salvar()` regenerava o QR **e reenviava e-mail pro fornecedor da placa física a cada "Salvar"** (qualquer edição, não só a primeira vez) — sem checagem de já ter sido enviado, risco de pedido duplicado de placa física. Corrigido pra só gerar/enviar no primeiro save (quando `qr_code_url` ainda não existe). Na Central isso nunca foi bug (só gera no diálogo de criação, nunca de novo no `salvar()`). Confirmado também: criação no Portal do Parceiro ("+ Novo Memorial") não gera QR na hora (diferente da Central) — decisão consciente, não corrigida: geraria QR/e-mail pro fornecedor pra um registro ainda vazio ("Novo memorial"), então o gatilho certo é o primeiro save com dado real, não a criação do rascunho.
- [ ] **Módulo de pagamento/cobrança pros parceiros** — plano de arquitetura pronto (Opus, 2026-07-29): começar só com registro estruturado de contrato/consumo (sem gateway ainda, empresa pré-CNPJ não consegue nota fiscal/conta PJ); quando integrar, recomendado Asaas (boleto/PIX/NFS-e, recorrência anual). Aguardando decisão de preço/modelo do Rafael.
- [ ] **Central de Comunicações bidirecional (e-mail+WhatsApp)** — plano de arquitetura pronto (Opus, 2026-07-29): receber e-mail via polling do Gmail API; WhatsApp só via Meta Business Cloud API oficial (não-oficial banido sem aviso, risco alto). Aguardando o Rafael criar conta Google Cloud + Meta Business antes de qualquer código.
- [ ] **Mapa satélite/3D do cemitério inteiro** (ideia registrada 2026-07-29, `docs/RASCUNHO_IDEIAS.md`) — mesma estrutura do mapa "Como Chegar", mas mostrando todos os homenageados de um cemitério de uma vez pra Central; lógica: Cemitério → Mapa do Cemitério → clica na lápide → abre Gavetas 3D (já existe). Nota visual já em `/admin/cemiterios`. Escopo grande, não construir sem prioridade confirmada.
- [~] Deck do Pedro: 2 das 3 imagens abertas e analisadas 2026-07-24 (Página Memorial Pública, Aplicações Digitais/Institucionais) — gaps reais achados registrados abaixo em "Página do Memorial". Falta só "Presença Física e Comunicação".
- [ ] Redesenho de Dashboard + Gestão de Memorial em abas pra bater com o mockup do Pedro (escopo grande, não é tarefa de 1 sessão)
- [x] **Alerta de status do envio pro fornecedor da placa** (2026-07-30) — achado real ao investigar o pedido do Rafael: `configuracoes_sistema.email_fornecedor_placas` nunca tinha sido configurado (sempre `null`), então nenhum e-mail pro fornecedor jamais saiu, silenciosamente (zero registro em `emails_enviados`). Configurado com o e-mail do Rafael pra teste (`rvnegocioss@gmail.com`, via `/admin` → card "E-mail do fornecedor de placas" que já existia) — **trocar pelo e-mail real do fornecedor quando tiver**. Chip "Placa" na Central e no Portal do Parceiro agora reflete a fase real (sem mensagem/aguardando família/confirmada+enviada/erro no envio), puxando o último registro de `emails_enviados` tipo `envio_fornecedor` — antes só mostrava se a família confirmou, não se o e-mail de fato saiu. Confirmado também: família não tem campo pra escrever a frase da placa no próprio portal (`/familia/[slug]`) — só confirma via link de e-mail que a Central/Parceiro manda depois de escrever. **Bug real pego ao vivo no teste do Rafael:** com o e-mail do fornecedor recém-configurado, ele clicou "Gerar QR Code" manual num rascunho ainda com nome placeholder ("Novo memorial", nunca renomeado) — QR gerou e e-mail foi pro fornecedor com esse nome vazio (`emails_enviados` confirmou: assunto "QR Code para produção — Novo memorial", enviado). Corrigido: tanto o botão manual quanto o auto-disparo do primeiro save agora travam (Central: nome vazio; Parceiro: vazio ou ainda "Novo memorial") com aviso amarelo — QR ainda pode ser gerado com a página incompleta (foto/bio/timeline vêm depois, isso é normal), só o nome é obrigatório antes, porque o pedido pro fornecedor precisa saber de quem é a placa.
- [x] **Bug: "outra pessoa alterou" falso positivo ao editar nome** (2026-07-30, reportado ao vivo pelo Rafael) — trigger do banco `homenagens_set_updated_at` atualiza `updated_at` em QUALQUER escrita em `homenagens`, inclusive as "silenciosas" da própria ficha (gerar QR, cadastrar e-mail da família, salvar mensagem da placa, trocar "quem preenche o conteúdo"). Como só o "Salvar memorial" principal sincronizava o `updated_at` guardado na tela, usar qualquer uma dessas outras ações antes invalidava a trava de edição concorrente e bloqueava o próprio autor com a mensagem de "outra pessoa mexeu". Corrigido nos 2 lados (Central + Parceiro): as 4 rotas (`cadastrar-email-familia`, `salvar-mensagem-placa`, `memorial-qrcode`, e o update direto de `preenchido_por`) agora devolvem o `updated_at` novo, e cada handler já sincroniza o estado local na hora — não precisa mais recarregar a página entre uma ação e outra.
- [x] **QR Code e "Enviar acesso" da família agora exigem dado mínimo real** (2026-07-30, pedido direto do Rafael) — o e-mail de família também tinha saído como "Acesso ao memorial de Novo memorial" (confirmado em `emails_enviados`, mesmo bug do QR/fornecedor). Reforçado: QR Code (manual e auto no primeiro save) agora exige nome real **e** data de falecimento preenchida, não só nome; "Enviar acesso" da família exige nome real antes de disparar. Mensagem amarela explica o motivo em vez de falhar silencioso.
- [x] **Ficha do Parceiro sem campo de Cemitério/Lápide** (2026-07-30, achado real ao vivo pelo Rafael comparando com a página pública) — memoriais criados pelo Portal do Parceiro nunca tinham "Como Chegar" (mapa/rota) na página pública, porque não existia campo pra vincular lápide. Causa dupla: (1) UI realmente não tinha o campo (só a Central tinha); (2) RLS de `cemiterios`/`lapides` era 100% staff-only — o parceiro nem conseguia LER as próprias, mesmo `cemiterios.parceiro_id` já existindo. Corrigido: 2 policies novas de SELECT (`is_own_parceiro`) pra parceiro ler só os próprios cemitérios/lápides, campo Cemitério→Lápide (dependente) adicionado na seção Identificação da ficha do Parceiro, mesmo padrão da Central. Chip "Localização vinculada/Sem localização" na faixa de status do topo.
- [x] **Auditoria sistemática (Opus, 2026-07-30) — plano de verificação + 13 achados médios/críticos + 5 no dashboard** — pedido explícito do Rafael depois de 4 bugs achados só testando ao vivo: "monta um plano de verificação, não é tão complexo". Checklist reutilizável de 4 categorias criado (paridade de campo público×edição, dado mínimo antes de efeito externo, estado cliente desatualizado por trigger de banco, funcionalidade sem policy). **Achado crítico com risco real de perda de dado, corrigido na hora:** memorial criado pelo Portal do Parceiro nasce com slug `rascunho-<id>` e **nunca virava definitivo** em lugar nenhum do código, nem depois de preencher o nome real — e a limpeza automática de rascunho abandonado (`>2h`, roda a cada abertura de "Meus Memoriais") apaga qualquer coisa com esse padrão de slug, preenchida ou não. Um memorial de teste do Rafael (`jon doe da silva`) estava a horas de ser apagado sozinho; renomeado o slug manualmente pra tirar da faixa de risco, e corrigido na raiz: `salvar()` do Parceiro agora gera slug definitivo (`gerarSlugUnico`) no primeiro save com nome real, pra qualquer memorial novo daqui pra frente — o cleanup de 2h passa a fazer só o que devia (apagar rascunho de verdade abandonado). Também fechado: Central tinha o mesmo bug do "Novo memorial" indo pro QR/e-mail do fornecedor por um caminho que a correção de mais cedo não cobria (`load()` gerava QR sozinho só de abrir a ficha de um rascunho do Parceiro, sem clicar em nada) — mesma trava de nome+data aplicada lá. **Pendente, não corrigido ainda (lista completa nos Dev Logs do vault):** barra/quota de armazenamento sempre calcula 0MB (bug de contagem de pasta no Storage, atinge Central/Parceiro/Família); condolências sem policy de moderação (mural tem, condolências não, apesar do selo público prometer); card "Status de pagamento" decorativo mostrando verde por padrão quando o dado é desconhecido; contagem de visita soma antes de checar senha/bloqueio; `/admin` carrega tabela inteira sem paginação (não escala).
- [x] **"Clique pra conversar" (WhatsApp) na Central de Comunicações e no Portal do Parceiro** (2026-07-30) — Rafael queria WhatsApp de verdade dentro da Central (mensagem recebida aparecendo lá) — isso segue bloqueado esperando ele criar conta Google Cloud + Meta Business (API oficial, não dá pra contornar sem violar termo/arriscar banimento do número). Como alternativa legítima pra "facilitar agora": link oficial `wa.me` (`lib/linkWhatsApp.ts`) — abre o WhatsApp Web/app de quem já tá logado, direto na conversa com o número certo, zero API/conta necessária. Não traz mensagem recebida pra dentro do sistema, só atalho de abrir a conversa. Adicionado em `/admin/emails` (telefone do parceiro + telefone da família por memorial) e replicado em `/parceiro/emails` (nova seção "Contato das famílias", só existia a tabela de histórico de e-mail antes).
- [x] **Gaps da página pública vs mockup "Página Memorial Pública"** (achados 2026-07-24, feitos no mesmo dia) — barra de navegação no topo com botões "Deixar homenagem"/"Assinar livro"/"Compartilhar" (`BotaoCompartilhar.tsx`); "Livro de Assinaturas" como seção própria (reaproveita `condolencias`, assinatura em fonte cursiva); selos de confiança no rodapé. Card de QR Code na Localização foi feito e depois **removido a pedido do Rafael** (lugar errado). **Ainda falta:** badges de papel/vínculo perto do nome (Esposo/Pai/Avô/Amigo) — precisa campo novo no formulário, coluna `homenagens.vinculos` já existe no banco (migração aplicada 2026-07-24), só falta a UI.
- [ ] Razão social/CNPJ da própria Legado Digital (empresa em formalização) — placeholder nos Termos/Privacidade até sair
- [ ] Módulo financeiro completo (`contratos`, `planos`, `aquisicoes`, `fechamento_mensal`) — Fase 4
- [x] `SUPABASE_SERVICE_ROLE_KEY` **confirmado presente** nas env vars da Vercel (checado via CLI 2026-07-24, achado antigo estava desatualizado) — "Convidar contato" já funciona em produção.
- [x] **E-mail automático** (feito 2026-07-24) — trocado de Resend pra SMTP do Google Workspace (`lib/emailTransport.ts`, nodemailer). `contato@legadodigital.net` é um Grupo (sem senha própria); autenticação real via usuário técnico `sistema@legadodigital.net` com "Enviar como" `contato@` configurado. Variáveis já na Vercel. **DKIM + SPF + DMARC confirmados propagados** (2026-07-30, checado via `nslookup` real contra Google 8.8.8.8 e Cloudflare 1.1.1.1) — Pedro configurou o SPF (`v=spf1 include:_spf.google.com ~all`) no Hostinger depois do DKIM; DMARC já existia (`v=DMARC1; p=none`, configurado por ele antes). Autenticação de e-mail completa — nenhum bloqueio de DNS pendente.
- [x] **Layout responsivo da página do memorial** (mockup Claude Design, 2026-07-23) — container 520/1100px, hero lado a lado no desktop, seção "Acender uma vela" na posição do mockup (fim da página). Fonte mantida (Georgia) — decisão do Rafael, não trocou pro Playfair/Source Sans do mockup. Spec: `docs/superpowers/specs/2026-07-23-pagina-memorial-redesign-mockup.md`, plano: `docs/superpowers/plans/2026-07-23-pagina-memorial-layout-responsivo.md`.

## Portal do Parceiro B2B — como funciona
Cada funerária/parceiro tem acesso próprio, fora da Central, vendo só os próprios memoriais.
1. Papel **"Parceiro B2B"** semeado em `perfis`; tabela `parceiros_usuarios` (usuario_id, parceiro_id) permite mais de 1 pessoa por funerária
2. RLS em `homenagens`: `homenagens_parceiro_own` restringe ao próprio `parceiro_id` via `is_own_parceiro()`; `homenagens_staff_all` mantém acesso total pra Admin/Operador
3. `/parceiro/login` + `/parceiro/layout.tsx` — protegido, papel Parceiro B2B
4. `/parceiro` — dashboard (total de memoriais, plano contratado, status de pagamento)
5. `/parceiro/memoriais` — "+ Novo Memorial" cria o rascunho na hora e já leva direto pra ficha completa em `/parceiro/memoriais/[id]` (2026-07-29 — uma tentativa de separar em cadastro curto + ficha foi revertida no mesmo dia a pedido do Rafael: ele queria só melhor organização visual, não um passo a mais antes de chegar no memorial). **Layout revisado (2026-07-29, planejado com Opus + pesquisa de referência real — Linear/Notion/Attio/HubSpot/Stripe/Airtable/Salt Design System):** grid de 12 colunas (`lg:grid-cols-12`, conteúdo `col-span-8` + operacional `col-span-4`, era `grid-cols-2` sem breakpoint — travava em 2 colunas do celular ao monitor grande); faixa de status no topo (6 indicadores: público/senha, acesso da família, quem preenche, placa, galeria, armazenamento); seções sempre visíveis por assunto (Identificação, História, Galeria e vídeo, Linha do tempo) — nada mais escondido atrás de retrátil fechado por padrão; campo do tamanho do conteúdo esperado (data não ocupa a largura de um nome); labels em `text-zinc-400` (contraste corrigido, `zinc-500` reprovava AA); botões com o que fazem no nome ("Salvar memorial", "Definir senha", "Enviar acesso"). Componentes novos reaproveitáveis: `components/admin/CampoFicha.tsx`, `SecaoFicha.tsx`, `StatusFicha.tsx`. **Cadastro da família** ganhou campos "Nome do responsável" e "Telefone" ao lado do e-mail já existente (colunas `homenagens.familia_nome_responsavel`/`familia_telefone`, API `cadastrar-email-familia` atualizada) — mesmo fluxo de sempre (gera senha, manda por e-mail, família usa pra entrar no Portal da Família e subir fotos), só captura mais dado de contato do responsável. Mesmos 2 campos também na Central. **Pendente:** mesma revisão de layout ainda não replicada na Central (`/admin/memoriais/[id]`, form ainda com `SecaoRetratil` e campos desorganizados) — mapeado pelo Opus, fica pra próxima passada. Container do Portal ainda `max-w-7xl` (não alargado — decisão do Rafael pendente).
6. Botão "Convidar contato" em `/admin/parceiros/[id]` → `POST /api/admin/convidar-parceiro` (service role, server-side) — cria usuário com senha gerada por parceiro (`lib/gerarSenhaTemporaria.ts`, não mais fixa), vincula papel+parceiro, exige troca de senha no 1º login (`usuarios.senha_temporaria`)
7. **Acesso direto da Central**: botão "Acessar Plataforma do Parceiro" na ficha leva a equipe interna pro Portal do Parceiro daquele parceiro (`/parceiro?parceiro_id=X`) sem logar de novo — aviso "Visualizando como: X — modo Central"

## Busca pública e privacidade por senha — como funciona
`/busca` e `/parceiros/[slug]` usam `components/public/BuscaMemorial.tsx`: busca por nome, sem grade aberta (vazava privacidade). Resultado sem senha mostra link direto; com senha, pede senha antes.

Busca **sem sensibilidade a acento** via `buscar_homenagens_publicas(termo, p_parceiro_id)` (extensão `unaccent`), chamada via `supabase.rpc()`.

**Arquitetura de segurança:** senha nunca fica em `homenagens` (leitura pública restrita a colunas seguras, ver abaixo). Fica em `homenagens_seguranca` (hash scrypt, salt = id do memorial), sem policy de leitura pública. View `homenagens_busca_publica` expõe só booleano `tem_senha`. Verificação/escrita passam por API routes server-side (`/api/memorial-acesso` público, `/api/memorial-senha` autenticado) com service role key — hash nunca trafega pro client.

**Leitura pública de `homenagens` (2026-07-29):** view `homenagens_publica` (13 colunas explícitas — as que `app/homenagem/[slug]/page.tsx` de fato usa) substitui o GRANT genérico que existia antes pra `anon`. `familia_email`/`familia_nome_responsavel`/`familia_telefone`/`mensagem_placa`/`preenchido_por`/`updated_at` nunca saem daí. `parceiros_publicos` (usada em `/parceiros/[slug]`) segue o mesmo padrão pra `parceiros_b2b`.

**Achado real (Opus, 2026-07-30, investigando o plano dos modos de privacidade completos):** `security_invoker=on` de `homenagens_publica` (linha acima) tinha sido setado em 2026-07-29 mas foi **derrubado silenciosamente** por um `create or replace view` posterior (migration de vínculos, mesmo dia) — `create or replace view` não preserva reloptions, então qualquer edição futura na view precisa reaplicar `alter view ... set (security_invoker = on)` depois. Mais grave: `/homenagem/[slug]/page.tsx` (Server Component) lia com a chave **anon** (pública, embutida em todo navegador) em vez de service role — como a policy de leitura pública de `homenagens`/`homenagens_publica` segue liberada pra `anon` (é assim que a página funciona sem login), qualquer um com a slug conseguia ler o memorial inteiro direto via REST do Supabase **ignorando senha, busca/link/QR desabilitado e tudo mais** — o gate só bloqueava a tela, não o dado. Impacto real hoje é zero (nenhum memorial em produção usa senha), mas era teatro de segurança esperando um memorial de verdade usar. Corrigido: a página passou a ler com `lib/supabaseServidor.ts` (novo, service role, guard de runtime contra import em client component); `generateMetadata` também vazava nome/foto no `<title>`/OpenGraph antes de checar senha, corrigido junto. **Fechado (2026-07-30):** `SELECT` de `anon` revogado em `homenagens`/`homenagens_publica`/`condolencias`/`mural_memorias`, `security_invoker=on` reaplicado em `homenagens_publica` — testado como role `anon` direto no banco, as 4 leituras bloqueadas (`permission denied`), busca (`homenagens_busca_publica`) continua funcionando normal. Durante a correção, o conector remoto do Supabase MCP (`claude.ai Supabase`) caiu no meio da sessão e não reconectou — resolvido trocando pra um **MCP local do Supabase** (`~/.claude.json`, chave `supabase`, roda `@supabase/mcp-server-supabase` instalado em `~/.claude/local-mcp/supabase/`, autenticado com um Personal Access Token da conta — guardado em `Knowledge/Legado Digital - Credenciais Tecnicas.md` no vault). `get_advisors` rodado depois da correção: 1 achado ERROR pré-existente e já aceito (`homenagens_busca_publica` sem `security_invoker`, decisão documentada — precisaria expor hash de senha pra virar invoker), resto é WARN de baixa prioridade (search_path de função, extensão `unaccent` no schema public, leaked password protection do Auth desligado) — não tocados, fora do escopo desse achado.

**A senha bloqueia os DOIS caminhos:** busca E link/QR direto — hoje é só um dos 5 modos de portão possíveis (`modo_gate = 'senha'`), resolvidos por `lib/modosPrivacidade.ts` (`resolverAcesso`). Detalhe completo dos 5 modos (com identificação, com allowlist de e-mail, oculto) no item "Modos de privacidade completos" da Fase Atual. Cookie assinado HMAC `mem_acesso_{slug}` (30 dias pra senha, 7 pra cadastro/email), payload versionado (`modo` + `gate_versao`) — trocar o modo derruba cookie na hora.

Definir/trocar/remover senha: campo "Senha de acesso" no formulário (Central `/admin/memoriais/[id]` e Portal do Parceiro `/parceiro/memoriais`) — em branco = memorial público.

## Portal da Família — como funciona
**1 e-mail de contato por memorial, sem conta** (modelo simplificado — antigo responsável+código pra até 3 parentes foi removido):
1. Central/Parceiro cadastra nome do responsável, e-mail e telefone da família na ficha (`homenagens.familia_nome_responsavel`, `familia_email`, `familia_telefone`) → `POST /api/admin/cadastrar-email-familia`
2. Sistema gera senha simples (8 caracteres hex), hasheia em `homenagens_seguranca.senha_familia_hash`, manda por e-mail (SMTP Google Workspace)
3. Família busca pelo nome do homenageado em `/familia/login` (nunca por slug) + **e-mail cadastrado + senha** via `POST /api/familia-login` (e-mail exigido desde 2026-07-29 — senha sozinha tinha só 32 bits de entropia), cookie HMAC de 12h que revoga na hora se a senha trocar
4. Dentro de `/familia/[slug]`, edita os mesmos campos do admin/parceiro (foto, vídeo, galeria, timeline, bio, frase) — grava direto em `homenagens`

Se o SMTP falhar (ex: DKIM não propagado ainda), a API retorna a senha na resposta pro staff/parceiro repassar manualmente.

**Ainda falta:** "esqueci a senha" da família (hoje só reemissão manual).

**Cadastro do responsável por CPF (modo teste apenas)** — campo CPF + "Consultar CPF" (`POST /api/admin/consultar-cpf`, provedor `cpfcnpj.com.br`, token de teste) preenche Nome automaticamente; CPF nunca é persistido. **Existe na Central e no Portal do Parceiro** (2026-07-29 — Rafael notou que faltava no Portal do Parceiro, adicionado igual à Central; rota liberada pra parceiro dono do memorial também, antes era staff-only). **Não é produção ainda** — falta token de produção e resolver IP fixo exigido pelo provedor vs IP de egress dinâmico da Vercel (bloqueio técnico sem solução ainda). Plano com decisões em `docs/RASCUNHO_IDEIAS.md`.

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

**Last Updated**: 2026-07-29
**Histórico completo**: `Projects/Legado Digital - Historico Detalhado.md` (vault)
