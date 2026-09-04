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

## 2. Central — Dashboard (`/admin`) — 🟢 validada 04/09 (auditoria por código)

- [x] Login/auth — `getAdminUser()` exige papel real (Admin/Operador), confirmado
- [x] Métricas carregam via RPC `admin_dashboard_metricas` (agregação no Postgres)
- [x] Sino de alerta → feed `emails_enviados` — confirmado `Sobre:`/`Para:` certo
- [x] Alerta de memorial com dado faltando funcionando (nota: só olha os 200 mais recentes — irrelevante hoje com 7 memoriais, vira limite real em escala)
- [x] Tabela de QR Code — confirmado `urlMidiaProtegida()` aplicado certo
- [x] Dropdown "Parceiros" no header funcionando

## 3. Central — Parceiros (`/admin/parceiros`) — 🟢 validada 04/09

- [x] Lista + CRUD, logo via `urlMidiaProtegida`, descrição pública/slug salvando
- [x] **Achado grave, corrigido 04/09:** convite de contato sobrescrevia a senha de **qualquer** conta existente com aquele e-mail (não só parceiro — inclusive staff), sem checar dono. Corrigido: bloqueia com erro 409 se o e-mail já pertence a uma conta de staff.
- [x] "Acessar Plataforma do Parceiro" funcionando, corretamente gated por `getAdminUser()`

## 4. Central — Cemitérios + Mapa (`/admin/cemiterios`) — 🟢 validada 04/09

- [x] Ortomosaico via URL assinada (12h), gate `pode_ver_cemiterio()` confirmado
- [x] Mapa quadra/fila/túmulo, painel "Quem opera", painel GPS — todos confirmados por código
- [ ] **Achado, não corrigido (baixa prioridade):** painel de quadras do `MapaCemiterio.tsx` em modo leitura (Portal do Parceiro) não esconde o link "meus memoriais" que aponta pra `/admin/memoriais/{id}` — rota só-staff, dá link morto pro parceiro. Não vaza dado (a rota de destino é protegida), só UX quebrada.

## 5. Central — Memoriais (`/admin/memoriais`)

- [x] **Achado, corrigido:** lista de memoriais era tabela plana, mesmo problema já achado no histórico de e-mails ("tá solto, quero vinculado com o parceiro"). Reescrita com o mesmo esquema: agrupado por parceiro (retrátil), balde "Memoriais Legado Digital (nosso, sem parceiro)" pros cadastrados direto pela Central — mesmo exemplo citado pelo Rafael (memorial do bizavô do Pedro).
- [ ] Lista + ficha completa carregando
- [ ] QR Code — **corrigido hoje**, confirmar ao vivo (imagem + download)
- [ ] Upload de mídia funcionando
- [ ] Privacidade (5 modos) salvando
- [ ] Livro de assinaturas (se aplicável na ficha) — checar se staff também modera daqui ou só família

## 6. Central — Usuários (`/admin/usuarios`) — 🟢 validada 04/09

- [x] Ativar/desativar funcionando
- [x] **Achado grave, corrigido 04/09:** criar staff usava senha fixa `123456` (6 caracteres — abaixo do mínimo de 10 do Supabase Auth, convite provavelmente falhava sempre) e sobrescrevia qualquer conta existente com aquele e-mail. Corrigido: senha aleatória de 12 caracteres (mesmo padrão de `gerarSenhaTemporaria`, já usado pro parceiro), bloqueio se o e-mail já é de um parceiro, resposta da API agora devolve `email`/`tempPassword` (a tela já esperava esses campos e mostraria "undefined" antes).
- [x] **Achado grave, corrigido 04/09:** Operador conseguia se promover a Admin (ou promover/rebaixar qualquer staff) — RLS de `usuarios_perfis` não distinguia os 2 papéis. Corrigido: escrita em `usuarios_perfis` agora exige Admin (`is_admin_legado()`), leitura continua liberada pra qualquer staff.

## 7. Central — E-mails / Comunicações (`/admin/emails`) — 🟡 em andamento

- [x] **Achado, corrigido:** sino de alerta (`app/admin/layout.tsx`) mostrava o **nome do memorial** solto na 2ª linha de cada item, sem dizer se era "sobre quem" ou "pra quem" — lia como se o nome do memorial fosse o destinatário (achado ao vivo pelo Rafael: "ele não é fornecedor cara, o nome tá errado", sobre ver "Teste Conflito Silva" do lado de "Fornecedor"). Corrigido: `Sobre: {nome}` quando linkado a memorial, `Para: {destinatário}` quando não. Confirmado no banco: 100% dos e-mails já disparados (9 no total: 7 `envio_fornecedor`, 1 `convite_parceiro`, 1 `senha_familia`) foram só pra `rvnegocioss@gmail.com` — nunca saiu e-mail real pra fornecedor/parceiro/família de verdade, tudo teste.
- [x] Confirmado: nenhum fornecedor de placa real cadastrado ainda (`configuracoes_sistema.email_fornecedor_placas` = e-mail de teste do Rafael) — bate com o item já registrado no CLAUDE.md.
- [x] **Achado, corrigido:** histórico de e-mails (`/admin/emails`) era tabela plana sem fim — pedido do Rafael: "pensa quando tiver milhares de e-mails soltos, não faz sentido". Reescrito pra agrupar por parceiro (retrátil, mesmo padrão já usado no bloco de contatos acima), balde "Sem parceiro" pros memoriais cadastrados direto pela Central. Campo de busca adicionado (`ilike` em destinatário/assunto, debounce 300ms, servidor — não filtro só client-side, senão não acha e-mail fora da primeira leva carregada).
- [ ] Feed de `emails_enviados` carregando (visual, aguardando Rafael confirmar tela)
- [ ] Link `wa.me` (clique pra conversar) funcionando
- [ ] SMTP Google Workspace ainda entregando (DKIM/SPF/DMARC — confirmados 30/07, revalidar)

## 8. Portal do Parceiro (`/parceiro`) — 🟢 validada 04/09

- [x] Login + troca de senha obrigatória — token server-side confirmado, cliente não consegue burlar
- [x] Dashboard QR Code, `/parceiro/memoriais` lista+ficha+QR — confirmados
- [x] `/parceiro/cemiterios` modo leitura — confirmado sem write vazando (spot-check ~20 pontos de gate no arquivo de 3800 linhas)
- [x] `/parceiro/emails` — filtro server-side real (`.eq('homenagens.parceiro_id', ...)`), não só UI

## 9. Portal da Família (`/familia/login`, `/familia/[slug]`) — 🟢 validada 04/09

- [x] Login só com senha, sem coluna de e-mail na autenticação — confirmado
- [x] Livro de assinaturas com moderação — clique-pra-remover funcionando, autorização real via `autorizarMemorial` (não confia no prop do client)
- [x] Card de Privacidade (senha + 3 toggles) salvando, `gate_versao` invalidando cookie na hora
- [x] Upload 2 etapas — valida cookie, magic bytes, e trava caminho pro próprio memorial (sem sequestro cross-memorial)
- [x] Trava de edição simultânea + auto-save + rascunho local — confirmados
- [x] Preview reflete página oficial nova — é link direto pra `/homenagem/[slug]` (a nova), não widget embutido, mas resultado é o esperado

## 10. Página pública do memorial (`/homenagem/[slug]`) — 🟢 validada 04/09

- [x] Página oficial nova com livro/régua/castiçal confirmados no código
- [x] `/classico` preservada como rota separada de verdade (não é alias)
- [x] Mural de 35 velas + castiçal + chama voadora — todos wired
- [x] Como Chegar presente e intocado (regra 17 respeitada, não revisado por dentro)
- [x] Os 5 modos de privacidade — lógica de precedência confirmada linha a linha em `lib/modosPrivacidade.ts`
- [x] **Achado grave, corrigido 04/09:** as escritas públicas (condolência, mural, vela) **não conferiam o portão de privacidade no servidor** — só rate limit. Um memorial com senha/oculto ainda aceitava spam se alguém pegasse o `memorialId` no HTML da página (visível mesmo antes de passar pelo gate). Corrigido: `lib/verificarGatePublico.ts` novo, chamado nos 3 endpoints antes de qualquer insert — reusa a mesma lógica (`resolverAcesso`) e cookie (`mem_acesso_{slug}`) que a página pública já usa pra exibir o conteúdo.

## 11. Busca pública + Mapa público de cemitérios — 🟢 validada 04/09

- [x] `/busca` — logo certo, RPC `buscar_homenagens_publicas` confirmada (filtro `busca_habilitada`+`modo_gate<>oculto`)
- [x] Mapa público (3 níveis) — logo certo, RPCs confirmadas
- [x] Rate limit `mapa_publico` (60/min) confirmado ainda ativo em `proxy.ts`

## 12. Página pública do parceiro (`/parceiros/[slug]`) — 🟢 validada 04/09

- [x] Logo do parceiro + logo Legado Digital exibindo
- [x] Busca restrita ao parceiro — confirmado filtro server-side dentro da RPC (`SECURITY DEFINER`), não dá pra burlar removendo o param no client
- [x] Seção "Um exemplo real" funcionando, só memorial genuinamente público
- [x] Achado bônus (foto `localhost`) corrigido

## 13. Segurança transversal — 🟢 revalidada 04/09 (nada regrediu desde 28/08)

- [x] `get_advisors` rodado de novo — mesmos achados já conhecidos/aceitos, nada novo
- [x] 13 RPCs de cemitério + rotas admin recentes — confirmado uso do padrão tripartite (staff/parceiro-dono/família)
- [x] Rate limit `proxy.ts` — todas as categorias (login, upload, edicao_familia, api, pagina, mapa_publico) confirmadas presentes e wired
- [x] Headers de segurança (CSP/HSTS/X-Frame-Options) — confirmados de pé, incluindo o `server.arcgisonline.com` no CSP (bug de 29/07, sem regressão)
- [x] **Achado, corrigido 04/09** (mesmo daqui de cima): gate de escrita pública nas 3 rotas de interação
- [x] `admin_dashboard_metricas` executável por `anon` — corrigido, revogado (só `authenticated` agora)
- [ ] Leaked Password Protection — **ação manual sua** no painel Supabase (Auth → Providers → Email), não dá via código
- [ ] `scripts/audit-rls.js` — ainda não roda (falta `SUPABASE_DB_PASSWORD`); `get_advisors` cobre a maior parte
- [ ] Semgrep MCP — ainda `CONNECTION_CLOSED`
- [ ] Threat Modeling MCP — instalado, ainda não usado

## 14. Pendências de decisão (não são bug)

- [ ] Contagem de velas do Carlos Saraiva inflada por teste (17 vs ~3 orgânico) — perguntado antes, sem resposta ainda
- [x] ~~Convite de parceiro sobrescreve conta existente~~ — **corrigido 04/09** (bloqueia se e-mail já é staff; e o mesmo bug no convite de staff também corrigido)
- [ ] Módulo de pagamento — aguardando CNPJ + decisão de preço/modelo
- [ ] Link morto pro parceiro no painel de quadras do mapa (achado 04/09, baixa prioridade — ver seção 4)
