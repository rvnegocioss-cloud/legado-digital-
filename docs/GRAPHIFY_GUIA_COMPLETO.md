# GRAPHIFY + OBSIDIAN + CLAUDE CODE
## Guia Completo para Economia de Tokens e Memória Persistente

> 🇧🇷 Documentação em português baseada nos repositórios:
> - `github.com/Graphify-Labs/graphify` (YC S26)
> - `github.com/lucasrosati/claude-code-memory-setup`

---

## 📦 ÍNDICE

1. [O Que É Graphify](#1-o-que-é-graphify)
2. [O Problema Que Resolve](#2-o-problema-que-resolve)
3. [Como Instalar (30 segundos)](#3-como-instalar-30-segundos)
4. [Como Usar](#4-como-usar)
5. [Integração com Obsidian (Memória Persistente)](#5-integração-com-obsidian-memória-persistente)
6. [Economia Real de Tokens](#6-economia-real-de-tokens)
7. [Fluxo de Trabalho Completo](#7-fluxo-de-trabalho-completo)
8. [Comandos Úteis](#8-comandos-úteis)
9. [Repositórios e Links](#9-repositórios-e-links)

---

## 1. O QUE É GRAPHIFY

**Graphify** é uma ferramenta open-source que cria um **grafo de conhecimento** do seu projeto de código. Funciona como uma skill para o Claude Code (e também Codex, OpenCode, Cursor, Gemini CLI).

### Como funciona:

```
Seu código (pasta)
       ↓
  Graphify
       ↓
  Knowledge Graph (grafo de conhecimento)
       ↓
  Claude Code consulta o grafo
       ↓
  💰 ECONOMIA: até 71.5x menos tokens!
```

### Diferenciais:

- ✅ **Código é parseado com tree-sitter AST** - determinístico, 100% local, sem LLM
- ✅ **Nada sai da sua máquina** - sem envio para nuvem
- ✅ **Não é um vector index** - sem embeddings, sem vector store
- ✅ **Cada conexão é explicada** - tags `EXTRACTED` (explícita) ou `INFERRED` (inferida)
- ✅ **Grátis no modo AST** - só usa API key se processar PDFs, imagens ou vídeos

---

## 2. O PROBLEMA QUE RESOLVE

### Problema 1 — Amnésia entre sessões

Toda vez que você abre uma sessão nova no Claude Code, precisa re-explicar:
- Stack do projeto
- Decisões passadas
- Bugs em andamento
- O que falta fazer

**O Claude Code não lembra de nada da sessão anterior.**

**Solução:** Obsidian Zettelkasten (memória declarativa)

### Problema 2 — Releitura do codebase

O Claude Code relê **todos os seus arquivos** a cada sessão para entender a estrutura.

Um projeto com **~40 arquivos** consome **~20.000 tokens** só para o Claude se orientar — antes de você fazer a primeira pergunta.

Se você faz **10 sessões por dia**: **200.000 tokens desperdiçados** ☠️

**Solução:** Graphify (mapa estrutural)

---

## 3. COMO INSTALAR (30 SEGUNDOS)

### Pré-requisitos

- Python 3.10+ instalado
- `uv` ou `pipx` instalado
- Claude Code instalado e autenticado

### Passo 1: Instalar o Graphify CLI

```bash
# Opção 1 (recomendada) - com uv
uv tool install graphifyy

# Opção 2 - com pipx
pipx install graphifyy

# Opção 3 - com pip
pip install graphifyy
```

### Passo 2: Registrar a skill no Claude Code

```bash
graphify install
```

Isso registra o comando `/graphify` como uma skill no Claude Code.

### Passo 3: Usar no seu projeto

Entre na pasta do projeto e rode:

```bash
/graphify .
```

Pronto! Isso gera 3 arquivos:

```
graphify-out/
├── graph.html       # Visualização interativa (abre no navegador)
├── graph.md         # Markdown do grafo (para o Claude ler)
└── graph.json       # Dados completos do grafo
```

---

## 4. COMO USAR

### Comando básico

```bash
/graphify .                           # Mapeia a pasta atual
/graphify src/                        # Mapeia só a pasta src
/graphify --depth 3                   # Profundidade máxima
/graphify --mode ast                  # Modo AST (grátis, local)
```

### Saída esperada

```
Graphifying /caminho/do/projeto...
✅ Codebase mapped in 2.3s
📊 147 files, 1,234 nodes, 2,567 edges
📁 Output: graphify-out/
   ├── graph.html       ← Abra no navegador
   ├── graph.md         ← Para o Claude Code ler
   └── graph.json       ← Para processamento
```

### Como o Claude Code usa o grafo

Depois de mapear, você pode perguntar:

- "Mostra o path entre o componente X e a API Y"
- "O que esse nó significa?"
- "Quais arquivos estão relacionados a [função/feature]?"

O Claude Code consulta o grafo em vez de reler os arquivos.

---

## 5. INTEGRAÇÃO COM OBSIDIAN (MEMÓRIA PERSISTENTE)

### Conceito

Um **vault Obsidian único** funciona como o "segundo cérebro" do Claude Code. Armazena:
- Decisões de arquitetura
- Contexto do projeto
- Progresso das features
- Chats importados do Claude

### Estrutura Recomendada

```
~/vault/                              # vault ÚNICO para todos os projetos
├── CLAUDE.md                         # instruções globais para o Claude Code
├── permanent/                        # notas atômicas consolidadas
├── inbox/                            # captura bruta (ideias, rascunhos)
├── fleeting/                         # rascunhos temporários
├── templates/                        # templates para novas notas
├── logs/                             # session logs globais
├── references/                       # material de referência
├── meu-projeto/                      # MOCs e notas do projeto X
│   ├── projeto/                      #   arquitetura, decisões, convenções
│   ├── pipeline/                     #   fluxos de dados, APIs
│   ├── dados/                        #   schema, modelo de dados
│   ├── features/                     #   features planejadas/implementadas
│   └── logs/                         #   session logs do projeto
├── outro-projeto/                    # MOCs e notas do projeto Y
│   └── ...
├── chats/                            # chats importados do Claude
│   ├── code/                         #   do Claude Code
│   └── web/                          #   do Claude Web/App
└── graphify/                         # knowledge graphs dos codebases
    ├── meu-projeto/                  #   notas do grafo do projeto X
    └── outro-projeto/                #   notas do grafo do projeto Y
```

### Por que vault único?

Com vault único, uma nota sobre "Supabase Auth" é linkada tanto pelo projeto A quanto pelo B. O graph view mostra conexões entre projetos que você não esperava.

### Setup Passo a Passo

**1. Criar o vault:**

Obsidian → "Create new vault" → escolha nome e local

**2. Criar a estrutura:**

```bash
cd ~/vault
mkdir -p permanent inbox fleeting templates logs references
mkdir -p meu-projeto/{projeto,pipeline,dados,features,logs}
mkdir -p graphify/meu-projeto
```

**3. Criar o CLAUDE.md:**

```markdown
# CLAUDE.md - Instruções Globais

## Projetos
- [meu-projeto]: Next.js + Supabase + Tailwind

## Vault Path
~/vault

## Comandos
- `/graphify .` → mapear codebase
- `/salvar` → salvar decisão
- `/retomar` → retomar sessão

## Estrutura de Notas
- permanent/: conhecimento consolidado
- inbox/: captura rápida
- logs/: session logs
```

---

## 6. ECONOMIA REAL DE TOKENS

### Exemplo prático do README original

| Cenário | Tokens por sessão | 10 sessões/dia | Mês (22 dias) |
|---------|------------------|----------------|---------------|
| **Sem Graphify** | ~20.000 tokens | ~200.000 tokens | ~4.400.000 tokens |
| **Com Graphify** | ~280 tokens | ~2.800 tokens | ~61.600 tokens |
| **Economia** | **71.5x menos** | **71.5x menos** | **71.5x menos** |

### Economia financeira (estimativa)

Considerando API Claude (claude-sonnet-4 ~$3/M tokens):

| Cenário | Gasto mensal |
|---------|-------------|
| Sem Graphify | ~$13.20/mês |
| Com Graphify | ~$0.18/mês |
| **Economia** | **~$13.02/mês** |

> 💡 E isso só contando o custo de orientação. O valor real é maior porque você também economiza tokens em contexto repetido de decisões e arquivos.

---

## 7. FLUXO DE TRABALHO COMPLETO

### Para cada sessão

```
1. INICIAR
   ↓
   Obsidian vault + CLAUDE.md
   
2. MAPEAR
   ↓
   /graphify .  (30s)
   → graphify-out/graph.md + graph.html

3. TRABALHAR
   ↓
   Claude Code usa o grafo
   → consulta o .md em vez de reler arquivos

4. SALVAR
   ↓
   /salvar "decisão: usar Supabase para auth"
   → Obsidian vault/permanent/

5. RETOMAR
   ↓
   /retomar "meu-projeto"
   → Obsidian vault carrega contexto anterior
```

### Integrações adicionais

| Ferramenta | Função | Custo |
|-----------|--------|-------|
| **Graphify** | Mapa do código | Grátis (modo AST) |
| **Obsidian** | Memória persistente | Grátis |
| **Pipeline de importação** | Histórico de conversas | Grátis |
| **Comandos /salvar e /retomar** | Continuidade entre sessões | Grátis |

---

## 8. OUTROS REPOSITÓRIOS RELACIONADOS

| Repositório | Descrição | Destaque |
|-------------|-----------|----------|
| `NadirRouter/NadirClaw` | Roteador open-source de LLM | Economiza 40-70% roteando prompts simples pra modelos baratos |
| `lferrarezi/Arjman` | Compressão Cognitiva para LLMs 🇧🇷 | Economia de até 60% com prompts "Estilo Caveman" |
| `samuelfaj/claudiomiro` | Agente autônomo em paralelo | Decompõe, codifica, revisa e comita sozinho |
| `affaan-m/ECC` | Sistema de performance para agentes | Skills, instintos, memória para Claude Code |

---

## 9. REPOSITÓRIOS E LINKS

### Graphify (oficial)

| Link | Descrição |
|------|-----------|
| [github.com/Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | Repositório oficial |
| [graphifylabs.ai](https://graphifylabs.ai) | Site oficial |
| [pypi.org/project/graphifyy](https://pypi.org/project/graphifyy) | Pacote PyPI |
| **Y Combinator S26** | Graphify faz parte do batch S26 do YC |

### Guia em Português

| Link | Descrição |
|------|-----------|
| [github.com/lucasrosati/claude-code-memory-setup](https://github.com/lucasrosati/claude-code-memory-setup) | Guia completo com README em PT-BR |
| `README.pt-BR.md` | Versão em português do guia completo |

### Outros

| Link | Descrição |
|------|-----------|
| [obsidian.md](https://obsidian.md) | Obsidian (gratuito) |
| [astral.sh/uv](https://docs.astral.sh/uv/) | UV package manager |
| [github.com/trendshift](https://trendshift.io/repositories/25296) | Graphify no Trendshift |

---

## ⚡ RESUMÃO (se só ler uma coisa)

```bash
# Instalar
uv tool install graphifyy
graphify install

# Usar no projeto
cd /caminho/do/projeto
/graphify .

# Obsidian: setup do vault
mkdir -p ~/vault/{permanent,inbox,logs,graphify}
# Criar CLAUDE.md com caminho do vault

# Resultado: 71.5x menos tokens/sessão 🎯
```

---

> **Última atualização:** 7/7/2026
> 
> **Documentação baseada nos repositórios originais:**
> - `Graphify-Labs/graphify` v8
> - `lucasrosati/claude-code-memory-setup`