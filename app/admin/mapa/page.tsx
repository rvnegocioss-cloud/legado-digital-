'use client'

import { useEffect, useState } from 'react'
import { supabase, getCurrentUser } from '@/lib/auth'

const css = `
.mapa-paginas {
  --bg: #0B1D2A;
  --bg-secondary: #0f2436;
  --card: rgba(255,255,255,0.04);
  --card-strong: rgba(255,255,255,0.065);
  --border: rgba(201,164,106,0.16);
  --border-strong: rgba(201,164,106,0.45);
  --text: #F5F2EB;
  --text-muted: #a9b7c1;
  --text-faint: #7a8a96;
  --gold: #C9A46A;
  --gold-strong: #dfc08a;
  --gold-tint: rgba(201,164,106,0.12);
  --done-fg: #8fd0a8; --done-bg: rgba(143,208,168,0.1); --done-border: rgba(143,208,168,0.3);
  --wip-fg: #dfc08a; --wip-bg: rgba(201,164,106,0.14); --wip-border: rgba(201,164,106,0.4);
  --plan-fg: #9aa7b0; --plan-bg: rgba(154,167,176,0.08); --plan-border: rgba(154,167,176,0.28);
  --bug-fg: #e08a8a; --bug-bg: rgba(224,138,138,0.1); --bug-border: rgba(224,138,138,0.35);
  --shadow: 0 1px 2px rgba(0,0,0,0.3);

  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.5;
}
.mapa-paginas * { box-sizing: border-box; }

.mapa-paginas .masthead {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 3rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 2rem;
}
.mapa-paginas .eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold);
  font-weight: 600;
}
.mapa-paginas h1 {
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  font-weight: 500;
  margin: 0;
  text-wrap: balance;
  letter-spacing: -0.01em;
  color: var(--text);
}
.mapa-paginas .masthead p { color: var(--text-muted); max-width: 62ch; margin: 0; font-size: 0.98rem; }
.mapa-paginas h2 {
  font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
  font-weight: 500;
  font-size: 1.5rem;
  margin: 0 0 0.4rem;
  letter-spacing: -0.005em;
  color: var(--text);
}
.mapa-paginas .section { margin-bottom: 4.5rem; }
.mapa-paginas .section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2.2rem;
  flex-wrap: wrap;
}
.mapa-paginas .section-head p { color: var(--text-muted); font-size: 0.92rem; margin: 0.3rem 0 0; max-width: 58ch; }

.mapa-paginas .pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}
.mapa-paginas .pill.done { color: var(--done-fg); background: var(--done-bg); border-color: var(--done-border); }
.mapa-paginas .pill.wip  { color: var(--wip-fg);  background: var(--wip-bg);  border-color: var(--wip-border); }
.mapa-paginas .pill.plan { color: var(--plan-fg); background: var(--plan-bg); border-color: var(--plan-border); }
.mapa-paginas .pill.bug  { color: var(--bug-fg);  background: var(--bug-bg);  border-color: var(--bug-border); }
.mapa-paginas .pill::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.mapa-paginas .legend { display: flex; flex-wrap: wrap; gap: 0.6rem; }

.mapa-paginas .orgchart-scroll { overflow-x: auto; padding: 0.5rem 0 1rem; }
.mapa-paginas .orgchart, .mapa-paginas .orgchart ul { list-style: none; margin: 0; padding: 0; }
.mapa-paginas .orgchart { display: flex; justify-content: center; min-width: 780px; }
.mapa-paginas .orgchart ul { display: flex; position: relative; padding-top: 2.2rem; }
.mapa-paginas .orgchart ul::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  width: 0;
  height: 2.2rem;
  border-left: 2px solid var(--border-strong);
}
.mapa-paginas .orgchart li { position: relative; text-align: center; padding: 2.2rem 1rem 0; list-style: none; }
.mapa-paginas .orgchart li::before,
.mapa-paginas .orgchart li::after {
  content: "";
  position: absolute;
  top: 0;
  right: 50%;
  width: 50%;
  height: 2.2rem;
  border-top: 2px solid var(--border-strong);
}
.mapa-paginas .orgchart li::after { right: auto; left: 50%; border-left: 2px solid var(--border-strong); }
.mapa-paginas .orgchart > li { padding-top: 0; }
.mapa-paginas .orgchart > li::before, .mapa-paginas .orgchart > li::after { display: none; }
.mapa-paginas .orgchart li:first-child::before { border: none; }
.mapa-paginas .orgchart li:last-child::after { border: none; }
.mapa-paginas .orgchart li:first-child::after { border-radius: 6px 0 0 0; }
.mapa-paginas .orgchart li:last-child::before { border-radius: 0 6px 0 0; }

.mapa-paginas .node {
  display: inline-flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 190px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem 1rem 1.1rem;
  text-align: left;
  box-shadow: var(--shadow);
}
.mapa-paginas .node.root { width: 230px; border-color: var(--border-strong); background: var(--card-strong); }
.mapa-paginas .node .who { font-size: 0.65rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-faint); font-weight: 600; }
.mapa-paginas .node .name { font-weight: 600; font-size: 0.95rem; line-height: 1.25; color: var(--text); }
.mapa-paginas .node .path {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.72rem;
  color: var(--gold);
  background: var(--gold-tint);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  align-self: flex-start;
}
.mapa-paginas .node .desc { font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; }

.mapa-paginas .flow { display: flex; align-items: stretch; gap: 0; overflow-x: auto; padding-bottom: 0.5rem; }
.mapa-paginas .flow-col { display: flex; flex-direction: column; gap: 0.9rem; min-width: 220px; flex: 1; }
.mapa-paginas .flow-col-label { font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-faint); font-weight: 600; margin-bottom: 0.3rem; }
.mapa-paginas .flow-arrows { display: flex; flex-direction: column; justify-content: center; align-items: center; min-width: 64px; color: var(--border-strong); }
.mapa-paginas .flow-arrows svg { display: block; }
.mapa-paginas .flow-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 0.9rem 1rem; box-shadow: var(--shadow); }
.mapa-paginas .flow-card.center { border-color: var(--border-strong); background: var(--card-strong); }
.mapa-paginas .flow-card .name { font-weight: 600; font-size: 0.92rem; margin-bottom: 0.15rem; color: var(--text); }
.mapa-paginas .flow-card .desc { font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; }
.mapa-paginas .flow-card .tag {
  display: inline-block;
  margin-top: 0.45rem;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.7rem;
  color: var(--gold);
  background: var(--gold-tint);
  padding: 0.08rem 0.4rem;
  border-radius: 4px;
}

.mapa-paginas .callout {
  margin-top: 2rem;
  border: 1px dashed var(--border-strong);
  background: var(--gold-tint);
  border-radius: 10px;
  padding: 1rem 1.2rem;
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
}
.mapa-paginas .callout .mark { font-family: "Iowan Old Style", Georgia, serif; font-size: 1.3rem; color: var(--gold-strong); line-height: 1; }
.mapa-paginas .callout .body { font-size: 0.88rem; color: var(--text); }
.mapa-paginas .callout .body strong { color: var(--gold-strong); }
.mapa-paginas .callout .body p { margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.85rem; }

.mapa-paginas .modules-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; }
.mapa-paginas .module-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.1rem; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 0.5rem; }
.mapa-paginas .module-card .name { font-weight: 600; font-size: 0.92rem; color: var(--text); }
.mapa-paginas .module-card .path {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.72rem;
  color: var(--gold);
  background: var(--gold-tint);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  align-self: flex-start;
}
.mapa-paginas .module-card .desc { font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; }

.mapa-paginas .sugestao-form { display: flex; flex-direction: column; gap: 0.6rem; max-width: 640px; }
.mapa-paginas .sugestao-form textarea {
  width: 100%;
  min-height: 90px;
  resize: vertical;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.7rem 0.9rem;
  color: var(--text);
  font-family: inherit;
  font-size: 0.92rem;
}
.mapa-paginas .sugestao-form label { font-size: 0.78rem; color: var(--text-muted); }
.mapa-paginas .sugestao-form button {
  align-self: flex-start;
  background: var(--gold);
  color: var(--bg);
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1.2rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.mapa-paginas .sugestao-form button:disabled { opacity: 0.6; cursor: default; }
.mapa-paginas .sugestao-lista { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1.6rem; }
.mapa-paginas .sugestao-item {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.8rem 1rem;
}
.mapa-paginas .sugestao-item .autor { font-size: 0.72rem; color: var(--gold); font-weight: 600; }
.mapa-paginas .sugestao-item .data { font-size: 0.7rem; color: var(--text-faint); margin-left: 0.5rem; }
.mapa-paginas .sugestao-item p { margin: 0.35rem 0 0; font-size: 0.88rem; color: var(--text); white-space: pre-wrap; }

.mapa-paginas footer {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  color: var(--text-faint);
  font-size: 0.78rem;
}

@media (max-width: 720px) {
  .mapa-paginas .flow { flex-direction: column; }
  .mapa-paginas .flow-arrows { transform: rotate(90deg); padding: 0.4rem 0; }
  .mapa-paginas .node, .mapa-paginas .flow-col { width: 100%; }
}
`

function Arrow() {
  return (
    <div className="flow-arrows" aria-hidden="true">
      <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
        <path
          d="M2 12H36M36 12L27 4M36 12L27 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

interface Sugestao {
  id: string
  autor_email: string
  mensagem: string
  created_at: string
}

export default function MapaPaginas() {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregarSugestoes()
  }, [])

  async function carregarSugestoes() {
    const { data } = await supabase
      .from('mapa_sugestoes')
      .select('id, autor_email, mensagem, created_at')
      .order('created_at', { ascending: false })
    setSugestoes(data || [])
  }

  async function enviarSugestao(e: React.FormEvent) {
    e.preventDefault()
    if (!mensagem.trim()) return
    setEnviando(true)
    setErro('')

    const user = await getCurrentUser()
    if (!user?.email) {
      setErro('Sessão expirada — faça login de novo.')
      setEnviando(false)
      return
    }

    const { error } = await supabase
      .from('mapa_sugestoes')
      .insert({ autor_email: user.email, mensagem: mensagem.trim() })

    if (error) {
      setErro(error.message)
      setEnviando(false)
      return
    }

    setMensagem('')
    setEnviando(false)
    carregarSugestoes()
  }

  return (
    <div className="mapa-paginas">
      <style>{css}</style>

      <header className="masthead">
        <span className="eyebrow">Legado Digital · Arquitetura de páginas</span>
        <h1>Como as páginas se encaixam</h1>
        <p>
          Mapa dos seis ambientes do MVP e de como um memorial circula entre a Central, os
          parceiros e o público — pra visualizar o que já existe e o que ainda falta construir.
        </p>
      </header>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Mapa geral dos ambientes</h2>
            <p>Tudo parte do Website Institucional. A partir dele, cada tipo de pessoa entra por uma porta diferente.</p>
          </div>
          <div className="legend">
            <span className="pill done">Pronto</span>
            <span className="pill wip">Em construção</span>
            <span className="pill plan">Planejado</span>
            <span className="pill bug">Com bug</span>
          </div>
        </div>

        <div className="orgchart-scroll">
          <ul className="orgchart">
            <li>
              <div className="node root">
                <span className="who">Entrada</span>
                <span className="name">Website Institucional</span>
                <span className="desc">Landing page, captação de parceiros B2B, botão &quot;Acessar Plataforma&quot;</span>
              </div>
              <ul>
                <li>
                  <div className="node">
                    <span className="who">Equipe interna</span>
                    <span className="name">Central Legado Digital</span>
                    <span className="path">/admin</span>
                    <span className="desc">Vê tudo: parceiros, cemitérios, memoriais, usuários</span>
                    <span className="pill wip">Módulos em andamento ↓</span>
                  </div>
                </li>
                <li>
                  <div className="node">
                    <span className="who">Funerárias, prefeituras</span>
                    <span className="name">Portal do Parceiro B2B</span>
                    <span className="path">/parceiro</span>
                    <span className="desc">Dashboard + CRUD — cada parceiro só vê e cadastra os próprios memoriais</span>
                    <span className="pill done">Pronto</span>
                  </div>
                </li>
                <li>
                  <div className="node">
                    <span className="who">Responsáveis pelo memorial</span>
                    <span className="name">Portal da Família</span>
                    <span className="path">/familia</span>
                    <span className="desc">Gerencia conteúdo e privacidade do memorial</span>
                    <span className="pill plan">Planejado</span>
                  </div>
                </li>
                <li>
                  <div className="node">
                    <span className="who">Qualquer visitante</span>
                    <span className="name">Página do Memorial</span>
                    <span className="path">/homenagem/[slug]</span>
                    <span className="desc">Acesso via QR Code, URL ou busca, conforme privacidade</span>
                    <span className="pill done">Pronto</span>
                  </div>
                </li>
                <li>
                  <div className="node">
                    <span className="who">Público em geral</span>
                    <span className="name">Busca Pública</span>
                    <span className="path">/busca</span>
                    <span className="desc">Buscar memorial por nome — ainda sem filtro de privacidade (todo publicado aparece)</span>
                    <span className="pill wip">Em construção</span>
                  </div>
                </li>
                <li>
                  <div className="node">
                    <span className="who">Público em geral</span>
                    <span className="name">Sub-landing do Parceiro</span>
                    <span className="path">/parceiros/[slug]</span>
                    <span className="desc">Página pública do parceiro (logo, descrição, memoriais + busca interna)</span>
                    <span className="pill done">Pronto</span>
                  </div>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Módulos dentro da Central</h2>
            <p>
              O <code>/admin</code> não é uma tela só — cada módulo tem seu próprio estágio.
            </p>
          </div>
        </div>
        <div className="modules-grid">
          <div className="module-card">
            <span className="name">Parceiros</span>
            <span className="path">/admin/parceiros</span>
            <span className="desc">CRUD completo + ficha por parceiro (dados, plano/pagamento, memoriais dele)</span>
            <span className="pill done">Pronto</span>
          </div>
          <div className="module-card">
            <span className="name">Cemitérios</span>
            <span className="path">/admin/cemiterios</span>
            <span className="desc">Cadastro com mapa (Leaflet) pra marcar a localização</span>
            <span className="pill done">Pronto</span>
          </div>
          <div className="module-card">
            <span className="name">Memoriais</span>
            <span className="path">/admin/memoriais</span>
            <span className="desc">CRUD completo + ficha por memorial, com link pra página pública</span>
            <span className="pill done">Pronto</span>
          </div>
          <div className="module-card">
            <span className="name">Usuários</span>
            <span className="path">/admin/usuarios</span>
            <span className="desc">Tela existe, sem gestão real ainda</span>
            <span className="pill plan">Planejado</span>
          </div>
          <div className="module-card">
            <span className="name">Financeiro</span>
            <span className="desc">Contratos, planos, aquisições, fechamento mensal — Fase 4</span>
            <span className="pill plan">Planejado</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Como um memorial circula</h2>
            <p>Todo memorial nasce de um jeito (direto ou via parceiro) e depois é enxergado de formas diferentes, dependendo de quem está olhando.</p>
          </div>
        </div>

        <div className="flow">
          <div className="flow-col">
            <span className="flow-col-label">Quem cadastra</span>
            <div className="flow-card">
              <div className="name">Legado Digital · Direto</div>
              <div className="desc">Venda direta pela landing page, sem parceiro envolvido</div>
              <span className="tag">parceiro_id = null</span>
            </div>
            <div className="flow-card">
              <div className="name">Funerária · Parceiro</div>
              <div className="desc">A funerária cadastra o memorial no próprio espaço dela</div>
              <span className="tag">parceiro_id = X</span>
            </div>
          </div>

          <Arrow />

          <div className="flow-col" style={{ flex: '0 0 210px' }}>
            <span className="flow-col-label">O registro</span>
            <div className="flow-card center">
              <div className="name">Memorial</div>
              <div className="desc">
                Tabela <code>homenagens</code> — biografia, fotos, timeline, privacidade
              </div>
            </div>
          </div>

          <Arrow />

          <div className="flow-col">
            <span className="flow-col-label">Quem visualiza</span>
            <div className="flow-card">
              <div className="name">Central Legado Digital</div>
              <div className="desc">
                Vê <strong style={{ color: 'var(--text)' }}>todos</strong> os memoriais, de todos os parceiros e diretos
              </div>
            </div>
            <div className="flow-card">
              <div className="name">Portal do Parceiro</div>
              <div className="desc">
                Vê <strong style={{ color: 'var(--text)' }}>só os próprios</strong> memoriais cadastrados
              </div>
            </div>
            <div className="flow-card">
              <div className="name">Página pública</div>
              <div className="desc">
                Qualquer um vê, <strong style={{ color: 'var(--text)' }}>conforme a privacidade</strong> definida
              </div>
            </div>
          </div>
        </div>

        <div className="callout">
          <span className="mark">✓</span>
          <div className="body">
            <strong>Resolvido:</strong> upload de vídeo e fotos direto no sistema (bucket{' '}
            <code>memoriais</code> no Supabase Storage) em <code>/admin/memoriais/[id]</code> e{' '}
            <code>/parceiro/memoriais</code>. Sem YouTube — vídeo toca nativo na página pública.
            <p>Timeline ainda é campo de texto simples, falta virar UI de verdade (bloco por evento).</p>
          </div>
        </div>

        <div className="callout">
          <span className="mark">♫</span>
          <div className="body">
            <strong>Decisão — Música de fundo:</strong> família não vai poder subir música livre
            (risco jurídico real: tocar música protegida publicamente é execução pública, Lei
            9.610/98 — pode gerar cobrança do ECAD ou notificação de remoção).
            <p>
              Solução: biblioteca curada de faixas instrumentais royalty-free, hospedada no nosso
              Storage — família escolhe de uma lista. Ainda não construído.
            </p>
          </div>
        </div>

        <div className="callout">
          <span className="mark">?</span>
          <div className="body">
            <strong>Pendente:</strong> limite de fotos/vídeo por memorial ainda sem número
            definido — depende do plano contratado no Supabase (armazenamento/banda). Não
            inventar número sem checar o plano real primeiro.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Sugestões dos sócios</h2>
            <p>Espaço pra Rafael, Pedro e Ricardo deixarem opinião sobre as páginas — fica registrado aqui.</p>
          </div>
        </div>

        <form className="sugestao-form" onSubmit={enviarSugestao}>
          <label htmlFor="sugestao-mensagem">Sua sugestão ou opinião</label>
          <textarea
            id="sugestao-mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Ex: acho que a busca pública devia mostrar a cidade em destaque..."
          />
          {erro && <span style={{ color: 'var(--bug-fg)', fontSize: '0.82rem' }}>{erro}</span>}
          <button type="submit" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Registrar sugestão'}
          </button>
        </form>

        {sugestoes.length > 0 && (
          <div className="sugestao-lista">
            {sugestoes.map((s) => (
              <div key={s.id} className="sugestao-item">
                <span className="autor">{s.autor_email}</span>
                <span className="data">
                  {new Date(s.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <p>{s.mensagem}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer>
        Atualizado em 2026-07-09 (busca pública, sub-landing do parceiro, campo de sugestões dos
        sócios, upload de foto do homenageado nos formulários) — os rótulos refletem o que foi
        verificado no código e no banco, não apenas o roadmap do CLAUDE.md.
      </footer>
    </div>
  )
}
