# Plano — Assistente da Central (voz, ações, mapa e print -> cadastro)
Data: 2026-10-23. Feito pelo Opus (agente Plan), só leitura. Nada foi alterado no sistema. Só staff (regra 22).

## Achados no código que mudam o desenho
- `app/api/legadobot/chat/route.ts` atende staff e parceiro na mesma rota, chama 1 provedor (LEGADOBOT_LLM_*, Groq) e devolve 502 em qualquer erro, sem reserva. A diretiva `AÇÃO:` só navega para 5 rotas fixas.
- `MapaCemiterio.tsx` grava pelo `supabase` do navegador com a sessão do usuário; quem barra é a RLS. Uma ação do robô que chame essas mesmas funções nunca passa da permissão de quem está logado.
- Hoje NÃO existe diferença entre Operador e Admin na RLS (`lib/autorizacaoEquipe.ts` junta os dois em `ehStaff`). A divisão por perfil precisa ser criada (lista de ferramentas por papel + checagem nas rotas sensíveis).
- Já existe uma ponte: evento `legadobot:abrir` ({pergunta, contexto}) e `router.push` no widget. O executor nasce dela.

## 1) Arquitetura
- Voz: Web Speech API (SpeechRecognition pt-BR + speechSynthesis), grátis; no Chrome/Edge o áudio passa pelo Google (avisar; manter modo só texto). Microfone por botão "segurar para falar".
- Camada de IA `lib/assistente/provedores.ts`: formato OpenAI /chat/completions com tools; fila de reserva por env `ASSISTENTE_PROVEDORES=groq,gemini,openrouter`; erro 429/5xx ou >8 s passa pro próximo. Claude só com chave própria do usuário, guardada no servidor, nunca padrão.
- RVMAPPI/Ollama local: a Vercel não alcança o localhost do PC. Recomendado: o NAVEGADOR chama o Ollama em http://localhost:11434 (OLLAMA_ORIGINS liberando o domínio), seletor "IA: Local / Nuvem grátis". Servidor continua validando e executando; a IA só propõe.
- Ferramentas como contrato JSON em `lib/assistente/ferramentas.ts`: {nome, descricao, parametros (zod), papelMinimo operador|admin, risco leitura|escrita|irreversivel, exigeConfirmacao, onde cliente|servidor, telaNecessaria}. O servidor só envia à IA as ferramentas que o papel alcança.
- Executor sem hackear o navegador: cada tela registra suas ações (`useAcoesAssistente('mapa', {...})`) expondo funções que já existem; o widget valida com zod, mostra prévia/confirmação e chama a função registrada. Ferramentas de servidor = rotas `/api/assistente/*` com `identificarChamador`.

## 2) Catálogo inicial (foco no mapa)
abrir_pagina; mapa_trocar_aba; mapa_buscar (jazigo/memorial); mapa_abrir_jazigo; mapa_escolher_quadra/fileira (todas leitura). Escrita com confirmação: mapa_marcar_tumulo_avulso (trocar o prompt() por parâmetro), mapa_marcar_pino (o clique final é humano), mapa_vincular_memorial, mapa_criar_memorial_aqui (com prévia), mapa_conferir_gps, mapa_criar_ponto_ref; mapa_mover_para_gps (só Admin); ficha_preencher (só preenche, quem salva é o humano); familia_cadastrar (Admin, dispara e-mail, confirmação obrigatória). FORA da 1ª leva: apagar túmulo/fileira/rua, renumerar, gerar em lote, duplicar fileira.

## 3) Arquivo/print -> cadastro
Colar (Ctrl+V) ou upload (PNG/JPG/WEBP/PDF 1 pág/.txt/.eml, até 5 MB) -> OCR no navegador (Tesseract.js, por, grátis, imagem não sai do PC) -> texto -> IA extrai JSON fixo {falecido, familia[], jazigo, cemiterio} (modo JSON + zod) -> validação (dígito do CPF, e-mail, telefone, datas coerentes, cemitério/jazigo procurados no banco, nunca inventados) -> PRÉVIA com cada campo marcado (lido do print / não encontrado / inválido) -> usuário corrige e confirma -> grava pelas rotas existentes. No PC dele: Tesseract + Ollama local (qwen2.5 7B ou llama3.2 3B). Na Vercel: extração com SÓ o texto na fila de reserva; visão na nuvem desligada por padrão (botão "enviar imagem a serviço externo" + aviso LGPD + auditoria). Prévia obrigatória: não existe "grava sem eu ver" (foto torta/manuscrito erra CPF e data).

## 4) Permissões, confirmação, auditoria, desligar
Operador: leitura, navegação, mapa (marcar, conferir, vincular, criar memorial), preencher ficha. Admin: + mover pelo GPS, cadastrar família (e-mail), depois apagar. NUNCA: permissão/senha, dinheiro, publicar memorial, SQL, configurações, código. Confirmação por cartão "Vou fazer X em Y. Confirmar?" (falado "confirmo" ou clique; irreversível só vale clique). Auditoria: tabela `assistente_acoes` (usuario_id, ferramenta, args sem CPF completo, resultado, provedor_ia, origem voz/texto/print, confirmado, criado_em), RLS ligada, GRANT só service_role + SELECT staff, gravada por /api/assistente/auditar. Desligar: ASSISTENTE_ATIVO=false na Vercel; liga/desliga por usuário; botão "Parar".

## 5) Etapas (uma por vez, testável)
1. Consertar o LegadoBot (ler o 502 nos logs, corrigir chave/modelo) + fila de provedores. Aceite: com a Groq desligada, responde pelo 2º provedor.
2. Rota `/api/assistente/chat` só staff com tools (rota do parceiro intocada). Aceite: parceiro 403; Operador não recebe ferramentas de Admin.
3. Registro de ações + executor no cliente, só leitura. Aceite: "abre o jazigo da Maria Silva" faz o mapa voar até ele.
4. Auditoria, chave geral e confirmação.
5. Escritas do mapa (avulso, pino, vincular, criar memorial, GPS) com confirmação; Operador recusado em "mover pelo GPS".
6. Voz (microfone + fala; ler os nomes de volta antes de confirmar).
7. Ollama local pelo navegador (funciona sem internet).
8. Print -> prévia -> cadastro (Tesseract, extração, validação; nada grava sem clique).
Interface (botão de microfone, cartão de confirmação, tela de prévia) passa por wireframe (regra 24), painel à esquerda. LEGADOBOT_PROMPT.md e CLAUDE.md atualizados a cada etapa (regras 4 e 14).

## 6) Riscos
Voz erra nomes (sempre repetir na tela e falar de volta; busca aproximada com 3 candidatos). Prompt injection por print/cadastro (texto do OCR entra só como dado, em chamada de extração SEM ferramentas). Limite do plano grátis (reserva, histórico de 10 mensagens, aviso quando todos falham). IA errando campos (zod + CPF + conferência no banco + prévia). Modelo grátis chamando ferramenta à toa (escrita só com confirmação humana).

## 7) O que NÃO fazer
Não ler/clicar no HTML por fora como a extensão (frágil). Não dar service_role/SQL/execução de código ao robô. Não estender a rota que o parceiro usa nem misturar prompts (regra 22). Sem escuta sempre ligada nem confirmação só por voz em ação irreversível. Sem print de família a serviço de visão de terceiros por padrão. "Faz tudo que eu pedir": apagar, enviar e-mail e publicar ficam de fora até estabilizar; permissão/senha e dinheiro, fora para sempre. Começar por texto com ferramentas confiáveis, depois o microfone.
