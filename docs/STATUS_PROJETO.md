# Status do Projeto — Legado Digital

Documento vivo, atualizado a cada mudança nessa sessão. Só 3 listas: feito, pendente, ideias. Fonte cruzada: CLAUDE.md, `/admin/mapa`, tabela `mapa_sugestoes`, `docs/RASCUNHO_IDEIAS.md`.

_Última atualização: 2026-07-17._

## Modelo de senhas (organizado, referência — confirmado com o Rafael)

**São 2 senhas separadas, cada uma com um papel só:**

1. **Senha da família** (`homenagens_seguranca.senha_familia_hash`) — uma só por memorial. Serve pra família **logar e editar** o memorial (foto, vídeo, bio, timeline) em `/familia/login`.
2. **Senha de acesso** / "senha do QR Code" (`homenagens_seguranca.senha_acesso_hash`) — serve pros **dois caminhos de visitante ao mesmo tempo**: abrir a página direto pelo QR Code/link, E aparecer no resultado da busca pública por nome (`/busca`). Não são senhas diferentes pra cada caminho — é a mesma, bloqueando os dois juntos (já que QR e link são a mesma URL por baixo).

O "Como Chegar" (rota + guia até o túmulo) vive dentro da própria página do memorial, então herda automaticamente essa proteção — não tem senha própria, nem precisa.

## Feito nessa sessão (2026-07-16)

- **Bug do Jarvis (ponte de voz) corrigido** — loop de eco (mic captava a própria resposta falada como comando novo), pausa o mic durante o TTS agora
- **Sessão travada da extensão VS Code identificada e abandonada** — arquivo `.jsonl` de 32MB nunca compactava, extensão ficava tentando resumir e travando toda vez
- **Logo da navbar reposicionada** — mais perto do menu, conforme marcação sua em print (tamanho intacto, só posição)
- **Sidebar da Central retrátil** — botão de seta recolhe pra só ícones, expande com texto
- **Ficha do memorial reorganizada:**
  - Nome completo encolhido + Mídia (foto/vídeo/galeria) ao lado dele, retrátil
  - Privacidade (senha, modos de acesso) + Cadastro da família logo abaixo de Biografia, cada um retrátil
- **Bug real corrigido: consulta de CNPJ retornava 502** — BrasilAPI bloqueava (403) requisição sem header `User-Agent` vindo da Vercel. Corrigido, testado com CNPJ real (Prefeitura de Uberlândia), funcionando em produção
- **Cadastro da família por CPF — Fase 1 (modo teste)** — campo CPF + botão "Consultar CPF" preenche Nome do responsável automaticamente. Provedor `cpfcnpj.com.br`, token de teste (dado fictício, zero custo). CPF nunca é persistido. Planejado com Opus antes de construir.
- **Contatos da empresa parceira com perfil — item 3 do Pedro FECHADO** — tabela `parceiros_contatos` (nome/e-mail/telefone/perfis), UI em `/admin/parceiros/[id]`, botão "Conceder acesso" por contato liga direto no fluxo de convite existente (badge "Tem acesso ao sistema" quando já concedido)
- **Deploy corrigido** — falha pontual da Vercel (não injetou env var num build específico), rebuild limpo resolveu, site nunca ficou fora do ar
- **Plugin `/watch` instalado** — assistir vídeo (ffmpeg + yt-dlp), pra pesquisa de referência técnica
- **Memory MCP em uso** — fatos duráveis salvos no grafo, além do arquivo de memória já existente

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
- Vela acendível (CSS puro, sem JS contínuo)
- LegadoBot Fase 1 (Central + Parceiro, Groq) e LegadoBot Público (landing)

## Pendente — Prioridade imediata

1. **Resolução da logo** — texto "Preservando Histórias" ilegível (arquivo fonte só 803×389px). Verificar se tem versão maior no Drive ("logo vários tamanhos") antes de gerar upscale artificial (tentativa anterior via Real-ESRGAN falhou, Hugging Face não respondeu)
2. **CPF em produção** — falta: tabela de preço dos pacotes, token de produção, resolver IP fixo (token amarrado a IP, Vercel serverless não garante IP fixo)
3. **Confirmar com Pedro** — "aba de usuários com acesso ao memorial" (multi-usuário família) foi simplificado de propósito em 2026-07-10, precisa validar se ele sabia
4. **Confirmar formato do dashboard** — Pedro pediu memoriais/QR agrupados por Parceiro+Cemitério, hoje é top-5 por visita

## Pendente — Domínio/E-mail (você já tem legadodigital.net)

1. Verificar domínio no painel Resend (Domains → Add Domain) — gera registros SPF/DKIM
2. Adicionar esses registros DNS onde o domínio foi registrado
3. Trocar `onboarding@resend.dev` pelo remetente real nos 3 arquivos de e-mail
4. Testar entrega real (não só pro seu e-mail de dono da conta)
5. Decidir se quer caixa de entrada de verdade (Google Workspace/Zoho) — Resend só envia, não recebe

## Pendente — Decisões suas em aberto (não construir sem responder)

- Modelo de negócio: vender direto pra família ou só via parceiro?
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
- `SUPABASE_SERVICE_ROLE_KEY` faltando no Vercel

## Ideias registradas, sem ação ainda

- 3 imagens do deck do Pedro nunca abertas (Página Memorial Pública, Aplicações Digitais/Institucionais, Presença Física)
- Dashboard: elementos do mockup do Pedro que faltam (Memorial em Destaque, Comentários Recentes, Resumo de Moderação, donut de QR Codes, Ações Rápidas)
- Cemitério inteiro em 3D (Google Photorealistic 3D Tiles, pago, custo não avaliado)
- Globo 3D — adiado explicitamente por você em 2026-07-15
