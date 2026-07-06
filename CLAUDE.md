# Legado Digital — Briefing do Projeto

## Regra Obrigatória — Atualização do CLAUDE.md
**Após cada tarefa concluída, o Claude Code DEVE atualizar este arquivo:**
- Marcar itens concluídos com [x]
- Adicionar o que foi feito na seção "O que está pronto"
- Atualizar "Fase Atual" com próximos passos
- Registrar decisões técnicas importantes tomadas
- Esta regra não pode ser ignorada — é parte do fluxo de trabalho

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
- [ ] CRUD completo de Memoriais na Central (hoje só leitura)
- [ ] Corrigir rota pública `/homenagem` (falta `[slug]` dinâmico — hoje inacessível)
- [ ] Portal do Parceiro B2B (login e área própria — ver seção abaixo)
- [ ] Website institucional finalizado

## Próximo Passo — Portal do Parceiro B2B
Cada funerária/parceiro vai ter acesso próprio (fora da Central), vendo só os próprios memoriais.

### Pendências pra isso funcionar
1. Semear papel **"Parceiro B2B"** em `perfis` (hoje só existem Admin e Operador Legado Digital)
2. Criar tabela `parceiros_usuarios` (usuario_id, parceiro_id) — permite mais de 1 pessoa por funerária
3. RLS em `homenagens` restringindo parceiro ao próprio `parceiro_id` (função tipo `is_own_parceiro()`)
4. `/parceiro/login` + `/parceiro/layout.tsx` (mesmo padrão do admin, checando papel Parceiro B2B)
5. `/parceiro/memoriais` — CRUD restrito ao próprio parceiro
6. Botão "Convidar contato" em `/admin/parceiros/[id]` pra criar o acesso do parceiro

### Estrutura já existente pra apoiar isso
- `/admin/parceiros/[id]` — ficha do parceiro (dados, plano/pagamento, memoriais dele) — Central enxerga tudo
- `parceiros_b2b.plano_contratado` / `status_pagamento` (em_dia/pendente/inadimplente) — campos simples; módulo financeiro completo (`contratos`, `planos`, `aquisicoes`, `fechamento_mensal`) fica pra Fase 4

### Ordem de construção
1. [x] Auth integrado
2. [x] CRUD de Parceiros
3. [x] Módulo de Cemitérios
4. [ ] CRUD de Memoriais (Central)
5. [ ] Portal do Parceiro B2B
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
  - **Memoriais**: listagem em `/admin/memoriais` (só leitura ainda — CRUD é o próximo passo)
  - Usuários: página existe, ainda sem gestão real
- Schema: usuarios, perfis, permissoes, usuarios_perfis, perfis_permissoes, parceiros_b2b, cemiterios
- `homenagens.parceiro_id` — vincula memorial ao parceiro que cadastrou (null = venda direta Legado Digital)
- Função helper `is_legado_staff()` — usada nas políticas RLS de parceiros_b2b, cemiterios e homenagens
- 2 funerárias fictícias cadastradas pra testes: Funerária Memória Eterna (SP), Funerária Paz Perpétua (RJ)
- Contas dos 3 sócios criadas via Admin API (script `scripts/seed-socios.mjs`)
- Next.js 16 + TypeScript + Tailwind funcionando
- Build passando sem erros
- Repositório GitHub: rvnegocioss-cloud/legado-digital-

## Bugs conhecidos
- `/homenagem` (página pública do memorial) não tem rota dinâmica `[slug]` — hoje é inacessível pra qualquer memorial real. Corrigir antes de divulgar QR Codes/URLs.

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
