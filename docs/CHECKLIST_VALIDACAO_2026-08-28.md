# Checklist de Validação — 28/08/2026

> Auditoria completa por tópico, seguindo a ordem do menu real do site. Um tópico de cada vez: valida, corrige o que achar, marca, segue pro próximo. Nada aqui é destrutivo — achado que precisar de ação de risco (DROP/DELETE/reset) para e pede confirmação antes (regra 1 do CLAUDE.md).

**Status geral:** 🔵 não iniciado · 🟡 em andamento · 🟢 validado · 🔴 achado corrigido nesta sessão

---

## Ordem de trabalho

1. 🟡 **Landing page** (`/`)
2. 🔵 **Central — Dashboard** (`/admin`)
3. 🔵 **Central — Parceiros** (`/admin/parceiros`)
4. 🔵 **Central — Cemitérios + Mapa** (`/admin/cemiterios`)
5. 🔵 **Central — Memoriais** (`/admin/memoriais`)
6. 🔵 **Central — Usuários** (`/admin/usuarios`)
7. 🔵 **Central — E-mails / Comunicações** (`/admin/emails`)
8. 🔵 **Portal do Parceiro** (`/parceiro`, `/parceiro/memoriais`, `/parceiro/cemiterios`, `/parceiro/emails`)
9. 🔵 **Portal da Família** (`/familia/login`, `/familia/[slug]`)
10. 🔵 **Página pública do memorial** (`/homenagem/[slug]` + `/classico`)
11. 🔵 **Busca pública + Mapa público de cemitérios** (`/busca`, `/cemiterios`)
12. 🔵 **Página pública do parceiro** (`/parceiros/[slug]`)
13. 🔵 **Segurança transversal** (RLS, RPCs, rate limit, headers, MCPs de scan)
14. 🔵 **Pendências de decisão** (não são bug — esperam resposta sua)

---

## 1. Landing page (`/`) — 🟢 validada 28/08

- [x] Hero carrega, sem erro de console (testado ao vivo, Playwright, produção — 0 erros/warnings)
- [x] Navbar "Área Restrita" (dropdown Central/Parceiro/Família) — hrefs corretos
- [x] Logo real no nav e no rodapé (regra 12)
- [x] Links de rodapé Privacidade/Termos corretos
- [x] LegadoBot Público presente ("Posso ajudar?")
- [x] **Achado, corrigido:** CLAUDE.md "O que está pronto" ainda dizia "Landing premium (Hero 3D)" — landing inteira foi trocada em 25/08 pela "O Fio da Vida" (migrada do protótipo, `9f3d9a4`), nunca atualizado ali. Corrigido.
- [x] Busca embutida no hero (feature de 30/07) sumiu quando a landing foi trocada em 25/08 — **confirmado com o Rafael: intencional, ele mesmo pediu pra tirar.** Não é regressão, fica assim.

## 2. Central — Dashboard (`/admin`)

- [ ] Login/auth funcionando
- [ ] Métricas carregam (visitas, memoriais, parceiros)
- [ ] Sino de alerta → feed de `emails_enviados` funcionando (link pro memorial/comunicações)
- [ ] Alerta de memorial com dado faltando funcionando
- [ ] Tabela de QR Code — **corrigida hoje**, confirmar ao vivo que renderiza
- [ ] Dropdown "Parceiros" no header (pular pro Portal do Parceiro) funcionando

## 3. Central — Parceiros (`/admin/parceiros`)

- [ ] Lista carrega, CRUD funciona
- [ ] Logo do parceiro exibindo (`urlMidiaProtegida`)
- [ ] Descrição pública / slug salvando
- [ ] Convite de contato — **bug conhecido não corrigido**: sobrescreve conta existente se e-mail já tem cadastro (achado 26/08). Decisão sua pendente: bloquear e-mail duplicado?
- [ ] "Acessar Plataforma do Parceiro" (modo Central) funcionando

## 4. Central — Cemitérios + Mapa (`/admin/cemiterios`)

- [ ] Lista de cemitérios, ortomosaico carregando (assinado, não público)
- [ ] Mapa: quadra/fila/túmulo, modo edição funcionando
- [ ] Painel "Quem opera neste cemitério" funcionando
- [ ] Painel de conferência por GPS de campo funcionando

## 5. Central — Memoriais (`/admin/memoriais`)

- [x] **Achado, corrigido:** lista de memoriais era tabela plana, mesmo problema já achado no histórico de e-mails ("tá solto, quero vinculado com o parceiro"). Reescrita com o mesmo esquema: agrupado por parceiro (retrátil), balde "Memoriais Legado Digital (nosso, sem parceiro)" pros cadastrados direto pela Central — mesmo exemplo citado pelo Rafael (memorial do bizavô do Pedro).
- [ ] Lista + ficha completa carregando
- [ ] QR Code — **corrigido hoje**, confirmar ao vivo (imagem + download)
- [ ] Upload de mídia funcionando
- [ ] Privacidade (5 modos) salvando
- [ ] Livro de assinaturas (se aplicável na ficha) — checar se staff também modera daqui ou só família

## 6. Central — Usuários (`/admin/usuarios`)

- [ ] Criar staff, trocar papel, ativar/desativar funcionando

## 7. Central — E-mails / Comunicações (`/admin/emails`) — 🟡 em andamento

- [x] **Achado, corrigido:** sino de alerta (`app/admin/layout.tsx`) mostrava o **nome do memorial** solto na 2ª linha de cada item, sem dizer se era "sobre quem" ou "pra quem" — lia como se o nome do memorial fosse o destinatário (achado ao vivo pelo Rafael: "ele não é fornecedor cara, o nome tá errado", sobre ver "Teste Conflito Silva" do lado de "Fornecedor"). Corrigido: `Sobre: {nome}` quando linkado a memorial, `Para: {destinatário}` quando não. Confirmado no banco: 100% dos e-mails já disparados (9 no total: 7 `envio_fornecedor`, 1 `convite_parceiro`, 1 `senha_familia`) foram só pra `rvnegocioss@gmail.com` — nunca saiu e-mail real pra fornecedor/parceiro/família de verdade, tudo teste.
- [x] Confirmado: nenhum fornecedor de placa real cadastrado ainda (`configuracoes_sistema.email_fornecedor_placas` = e-mail de teste do Rafael) — bate com o item já registrado no CLAUDE.md.
- [x] **Achado, corrigido:** histórico de e-mails (`/admin/emails`) era tabela plana sem fim — pedido do Rafael: "pensa quando tiver milhares de e-mails soltos, não faz sentido". Reescrito pra agrupar por parceiro (retrátil, mesmo padrão já usado no bloco de contatos acima), balde "Sem parceiro" pros memoriais cadastrados direto pela Central. Campo de busca adicionado (`ilike` em destinatário/assunto, debounce 300ms, servidor — não filtro só client-side, senão não acha e-mail fora da primeira leva carregada).
- [ ] Feed de `emails_enviados` carregando (visual, aguardando Rafael confirmar tela)
- [ ] Link `wa.me` (clique pra conversar) funcionando
- [ ] SMTP Google Workspace ainda entregando (DKIM/SPF/DMARC — confirmados 30/07, revalidar)

## 8. Portal do Parceiro (`/parceiro`)

- [ ] Login + troca de senha obrigatória no 1º acesso
- [ ] Dashboard — QR Code **corrigido hoje**, confirmar ao vivo
- [ ] `/parceiro/memoriais` — lista + ficha completa, QR **corrigido hoje**
- [ ] `/parceiro/cemiterios` — modo leitura funcionando, sem botão de escrita vazando
- [ ] `/parceiro/emails` — filtro por empresa funcionando

## 9. Portal da Família (`/familia/login`, `/familia/[slug]`)

- [ ] Login só com senha (sem e-mail) funcionando
- [ ] Livro de assinaturas com moderação (clicar no nome remove) — **mudou essa semana**, validar ao vivo
- [ ] Card de Privacidade (senha + 3 toggles) salvando
- [ ] Upload de foto/vídeo (fluxo de 2 etapas) funcionando
- [ ] Trava de edição simultânea + auto-save funcionando
- [ ] Preview reflete a página oficial nova (livro/castiçal/régua) — **mudou essa semana**

## 10. Página pública do memorial (`/homenagem/[slug]`)

- [ ] Página oficial nova carrega certo (livro, régua, castiçal) — **promovida essa semana**
- [ ] `/classico` preservada intocada, ainda acessível
- [ ] Seletor de tema funciona na nova, sabidamente quebrado na clássica (não mexer)
- [ ] Mural de velas (35, canvas) + castiçal principal + chama voadora funcionando
- [ ] Como Chegar intocado (regra 17)
- [ ] Todos os gates de privacidade (5 modos) bloqueando certo

## 11. Busca pública + Mapa público de cemitérios

- [ ] `/busca` — logo **corrigido hoje**, busca funcionando
- [ ] `/cemiterios`, `/cemiterios/[cidade]`, `/cemiterios/[cidade]/[cemiterio]` — logo **corrigido hoje**, mapa carregando
- [ ] Rate limit `mapa_publico` (60/min) ainda ativo

## 12. Página pública do parceiro (`/parceiros/[slug]`)

- [x] Logo do parceiro + logo Legado Digital (**corrigido hoje**) exibindo
- [ ] Busca restrita ao parceiro funcionando
- [x] **Feature nova (pedido do Rafael, "pega um e coloca lá"):** seção "Um exemplo real" — mostra 1 memorial de verdade daquele parceiro (foto/monograma, nome, frase, link), só se for genuinamente público (gate aberto + busca + link habilitados, mesma regra de privacidade do mapa público) — nunca mostra memorial que a família protegeu. Some sozinho se o parceiro não tiver nenhum elegível.
- [x] **Achado bônus, corrigido:** 2 memoriais de teste ("Helena Martins Costa", "Antônio Ferreira Lima") tinham `foto_url` apontando pra `http://localhost:3000/...` — link morto em produção, zerado no banco, cai no monograma padrão.

## 13. Segurança transversal

- [x] `get_advisors` rodado (28/08) — nenhum achado novo, tudo já conhecido/aceito ou intencional
- [x] 13 RPCs de cemitério (numeração/vínculo) — confirmado por leitura de código que todas checam `is_legado_staff()`/`pode_ver_cemiterio()` internamente
- [ ] Leaked Password Protection — **ação manual sua** no painel Supabase (Auth → Providers → Email), não dá via código
- [ ] `scripts/audit-rls.js` — não roda hoje (falta `SUPABASE_DB_PASSWORD` no `.env.local` + `psql` instalado); `get_advisors` já cobre RLS habilitado/policy, redundante em parte
- [ ] Semgrep MCP — instalado, mas `CONNECTION_CLOSED` ao conectar; binário roda sozinho, causa ainda não achada
- [ ] Threat Modeling MCP — instalado e conectado, ainda não usado
- [ ] Headers de segurança (CSP/HSTS/X-Frame-Options) — revalidar ainda de pé
- [ ] Rate limit `proxy.ts` — revalidar ainda ativo em todas as categorias

## 14. Pendências de decisão (não são bug)

- [ ] Contagem de velas do Carlos Saraiva inflada por teste (17 vs ~3 orgânico) — perguntado antes, sem resposta ainda
- [ ] Convite de parceiro sobrescreve conta existente — decisão sobre bloquear e-mail duplicado
- [ ] Módulo de pagamento — aguardando CNPJ + decisão de preço/modelo
