# Status do Projeto — Legado Digital

Documento separado do CLAUDE.md: só duas listas, feito e pendente, sem histórico misturado. Atualizar sempre que algo mudar de status. Fonte cruzada: CLAUDE.md, `/admin/mapa`, tabela `mapa_sugestoes`, `docs/RASCUNHO_IDEIAS.md`.

## Feito — Feedback do Pedro (2026-07-14), em ordem

1. Logo real na Central
2. Menu vertical à esquerda (sidebar)
3. Topo limpo — sino de alerta + avatar/nome + dropdown (só "Sair", preferências de layout NÃO incluídas)
4. Dashboard — visitas, novos memoriais (7 dias), top 5 cemitérios e top 5 parceiros por visita
5. E-mail do fornecedor de placas — fluxo de 1 fornecedor, confirmação da família antes de enviar
6. Parceiro — consulta CNPJ na Receita (BrasilAPI), preenche formulário
7. Cemitério — lápides (+ gavetas, + visualização 3D, foi além do pedido)
8. Memorial — privacidade em 3 modos (busca / link / QR Code), todos ligados por padrão, família desativa o que quiser
9. Usuários — bug de RLS corrigido (só o próprio usuário via, faltava policy de staff)
10. Central de e-mail → virou Central de Comunicações (parceiros + memoriais + histórico de envio)

## Feito — Geral (Fase 1 e 2)

- Auth (Supabase), Central completa, Portal do Parceiro B2B completo
- CRUD de Parceiros, Cemitérios, Memoriais
- Busca pública com correção de acento (`unaccent`)
- Sub-landing do parceiro (`/parceiros/[slug]`) redesenhada
- Senha de acesso (memorial) + senha de edição (família), hash scrypt, nunca texto plano
- Portal da Família (1 e-mail sem conta, senha simples, cookie HMAC)
- QR Code automático (geração + e-mail pro fornecedor + confirmação da família)
- Página do memorial redesenhada ("luxo moderno") — hero, biografia com drop-cap, timeline em espinha, galeria, condolências
- Vela acendível (CSS puro, sem JS contínuo) — corrigida nessa sessão (loop de eco no Jarvis não afeta isso, são projetos diferentes)
- LegadoBot Fase 1 (Central + Parceiro, Groq) e LegadoBot Público (landing)
- Plugin `/watch` instalado (assistir vídeo — ffmpeg + yt-dlp)

## Pendente — Prioridade imediata

1. **Logo da landing** — texto "PRESERVANDO HISTÓRIAS" ilegível, precisa upscale ou tratamento; posição também errada, precisa ficar mais perto da seção de benefícios/escritos
2. **Sidebar retrátil na Central** — botão de seta pra recolher (só ícones) e expandir (ícones + texto), ganhar espaço de conteúdo
3. **Contatos do parceiro com perfil** (Responsável Legal/Financeiro/Comercial/Técnico) — tabela `parceiros_contatos` nova, contato pode virar usuário com visão restrita
4. **Confirmar com Pedro** — ele pediu "aba de usuários com acesso ao memorial" (multi-usuário família); isso foi simplificado de propósito em 2026-07-10, precisa validar se ele sabia
5. **Confirmar formato do dashboard** — Pedro pediu memoriais/QR recentes agrupados por Parceiro+Cemitério; hoje é top-5 por visita, formato diferente

## Pendente — Decisões suas em aberto (não construir sem responder)

- Modelo de negócio: vender direto pra família ou só via parceiro? (era pra decidir na reunião de sócios 15/07)
- Templates/cores do memorial — múltiplos temas de verdade ou só 1 fixo?
- "Livro de Assinaturas" vs "Homenagens" — 2 conceitos diferentes ou 2 nomes pra mesma coisa?
- Botão "Começar Agora" da landing → vídeo/tour (você ainda vai gravar)
- Sistema de senha automática (família + acesso) na criação do memorial — Fable 5 propôs criptografia reversível (AES-256-GCM), falta seu sim

## Pendente — Backlog maior (sem prazo)

- Módulo Financeiro completo (contratos/planos/aquisições/fechamento mensal)
- Módulo de Usuários
- Política de Privacidade + Termos de Uso
- Website institucional finalizado
- Busca embutida direto na landing
- Modos de privacidade: "privado por e-mail/cadastro" e "oculto"
- "Esqueci a senha" self-service da família
- Formulário de condolência, lightbox da galeria (página do memorial)
- 12 ideias da pesquisa de inovação família (`docs/PESQUISA_EXPERIENCIA_FAMILIA.md`) — nenhuma implementada
- Domínio próprio (trava Resend mandar e-mail pro destinatário real)
- `SUPABASE_SERVICE_ROLE_KEY` faltando no Vercel

## Registrado, sem ação ainda

- 3 imagens do deck do Pedro nunca abertas (Página Memorial Pública, Aplicações Digitais/Institucionais, Presença Física)
- Dashboard: elementos do mockup do Pedro que faltam (Memorial em Destaque, Comentários Recentes, Resumo de Moderação, donut de QR Codes, Ações Rápidas)
- Cemitério inteiro em 3D (Google Photorealistic 3D Tiles, pago, custo não avaliado)
- Globo 3D — adiado explicitamente por você em 2026-07-15
