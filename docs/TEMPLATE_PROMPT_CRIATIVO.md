# Template de Brief Criativo (aprendido 2026-07-15)

Estrutura extraída de um prompt de referência real (brief pra landing page cinematográfica da Sony WH-1000XM6, passado pelo Rafael como exemplo de "prompt bem feito"). Não é sobre fone de ouvido — é o **formato** que vale reaproveitar toda vez que a gente for pedir uma peça visual grande (landing, redesign, vídeo, 3D) pra um modelo mais forte (Opus, Claude Design, etc). Um brief fraco ("deixa mais bonito") produz resposta genérica. Um brief nesse formato produz resposta específica e no alvo.

## Anatomia do brief

1. **ACT AS** — define uma persona de especialista bem específica pro modelo assumir (não "assistente útil genérico"). Ex: "Awwwards-level Creative Developer especialista em Next.js, Framer Motion, storytelling por scroll".
2. **A TAREFA** — 1 parágrafo direto do que precisa existir no final.
3. **INTENÇÃO DE STACK TÉCNICA** — framework/estilo/animação de referência (mesmo que seja só "pensar no estilo disso", não gerar código literal).
4. **DIREÇÃO VISUAL E ESTÉTICA DE MARCA** — cores com **hex exato** (fundo primário, fundo secundário, cor de título, cor de corpo, cor de destaque), gradientes descritos com valores, adjetivos de "vibe" geral.
5. **Especificação componente por componente** — cada peça de UI (ex: navbar) com estrutura e comportamento detalhado (o que tem à esquerda/centro/direita, como se comporta no scroll).
6. **MECÂNICA CENTRAL** — a interação principal explicada de forma mecânica, passo a passo.
7. **BEATS DE STORYTELLING POR SCROLL** — dividido em faixas de porcentagem (0–15%, 15–40%, etc), cada uma com: Visual (o que aparece), Copy (título + subtítulo + texto de apoio), Tom (adjetivos de como deve soar).
8. **PALAVRAS-CHAVE DE POLIMENTO VISUAL** — lista explícita de adjetivos/termos de estilo pra enviesar o resultado (ex: "cinematic, photorealistic, editorial, Apple-level, glassmorphism, buttery scroll").
9. **TIPOGRAFIA E DETALHES DE GRADIENTE** — fontes específicas, peso, tamanho, tratamento (gradiente no texto, sombra, etc).
10. **PROMPT FINAL COMBINADO** — tudo acima reescrito como um parágrafo único, pronto pra colar de uma vez (redundante com a versão estruturada, mas é o que realmente se usa na prática).

## Como aplicar no Legado Digital

Da próxima vez que for pedir uma peça visual grande pra outro modelo (Opus, Claude Design, etc) — landing, memorial, vídeo, 3D — montar o brief nesse formato em vez de descrever em 1-2 frases soltas. Especialmente útil pros itens já registrados em `docs/RASCUNHO_IDEIAS.md` que ainda vão precisar de direção visual forte (globo 3D, desenho do jazigo, vídeo/tour do "Começar Agora").
