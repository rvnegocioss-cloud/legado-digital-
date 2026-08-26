'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { usaReducaoMovimento } from '@/lib/usaReducaoMovimento'
import './livro-assinaturas.css'

// Livro de assinaturas de verdade: livro aberto, a pessoa digita o nome, uma
// pena escreve no papel, o nome acende em dourado e a pagina vira.
//
// Por que a escrita e feita com clip-path e nao com tracado de SVG: o nome e
// digitado pelo visitante, entao nao existe caminho vetorial pronto pra ele --
// tracado de SVG exige um path por letra, feito a mao. Revelar da esquerda pra
// direita com a pena acompanhando a borda da revelacao da a mesma leitura e
// funciona pra qualquer texto. Referencia: css-tricks.com/how-to-get-
// handwriting-animation-with-irregular-svg-strokes (a secao sobre mascara,
// que e o caminho recomendado justamente pra caligrafia de traco irregular).
//
// A fonte cursiva (Caveat) ja estava no projeto pelo next/font -- nenhum
// @import externo novo (restricao registrada em lib/publicTheme.ts).

export interface Assinatura {
  id: string
  visitor_name: string
  message: string
  created_at: string
}

const POR_PAGINA = 2

// Comprovantes das assinaturas feitas NESTE navegador. E o que autoriza
// remover: sem comprovante o servidor recusa, entao um visitante nunca apaga a
// mensagem que outra pessoa deixou.
interface Comprovante {
  id: string
  comprovante: string
}

function chaveGuardada(memorialId: string) {
  return `livro_assinaturas_${memorialId}`
}

const VAZIO: Comprovante[] = []

// Cache do valor lido: useSyncExternalStore compara por identidade, entao
// devolver um array novo a cada leitura entraria em laco infinito de render.
const cache = new Map<string, { bruto: string | null; valor: Comprovante[] }>()
const ouvintes = new Set<() => void>()

function lerComprovantes(memorialId: string): Comprovante[] {
  let bruto: string | null = null
  try {
    bruto = localStorage.getItem(chaveGuardada(memorialId))
  } catch {
    // Navegador com armazenamento bloqueado (aba anonima, politica do
    // dispositivo): a pessoa so perde o botao de remover, o livro funciona.
    return VAZIO
  }

  const guardado = cache.get(memorialId)
  if (guardado && guardado.bruto === bruto) return guardado.valor

  let valor: Comprovante[] = VAZIO
  try {
    const lista = bruto ? JSON.parse(bruto) : []
    if (Array.isArray(lista) && lista.length > 0) valor = lista
  } catch {
    valor = VAZIO
  }

  cache.set(memorialId, { bruto, valor })
  return valor
}

function guardarComprovantes(memorialId: string, lista: Comprovante[]) {
  try {
    localStorage.setItem(chaveGuardada(memorialId), JSON.stringify(lista))
  } catch {
    /* sem armazenamento: segue sem guardar */
  }
  cache.delete(memorialId)
  ouvintes.forEach((fn) => fn())
}

function inscrever(fn: () => void) {
  ouvintes.add(fn)
  return () => {
    ouvintes.delete(fn)
  }
}

function dataCurta(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

function Folha({
  itens,
  lado,
  escrevendoId,
  vazio,
  moderar,
  aRemover,
  aoPedirRemocao,
  aoCancelar,
  removendoId,
}: {
  itens: Assinatura[]
  lado: 'esq' | 'dir'
  escrevendoId: string | null
  vazio: string
  moderar: boolean
  aRemover: string | null
  aoPedirRemocao: (id: string) => void
  aoCancelar: () => void
  removendoId: string | null
}) {
  return (
    <div className={`livro-pagina livro-pagina-${lado}`}>
      {/* Miolo da frente: a pilha de folhas que aparece na borda de baixo. E o
          que da espessura de livro -- sem ela o conjunto le como cartao. */}
      <span className="livro-miolo" aria-hidden="true" />
      <div className="livro-margem" aria-hidden="true" />
      <div className="livro-conteudo">
        {itens.length === 0 ? (
          <p className="livro-vazio">{vazio}</p>
        ) : (
          itens.map((a) => {
            const escrevendo = escrevendoId === a.id
            return (
              <figure key={a.id} className={`livro-registro${escrevendo ? ' livro-registro-novo' : ''}`}>
                <blockquote className="livro-mensagem">{a.message}</blockquote>
                <figcaption className="livro-assinatura-linha">
                  {moderar ? (
                    // No modo moderacao o proprio nome e o alvo do clique --
                    // pedido do Rafael. Nao apaga no primeiro clique: remocao e
                    // permanente e um toque errado apagaria a mensagem que
                    // alguem deixou pro falecido, sem volta.
                    <button
                      type="button"
                      className={`livro-nome livro-nome-alvo${aRemover === a.id ? ' livro-nome-marcado' : ''}`}
                      onClick={() => (aRemover === a.id ? aoCancelar() : aoPedirRemocao(a.id))}
                      disabled={removendoId === a.id}
                      title="Clique para remover esta assinatura"
                    >
                      <span className="livro-nome-texto">{a.visitor_name}</span>
                    </button>
                  ) : (
                    <span className={`livro-nome${escrevendo ? ' livro-nome-escrevendo' : ''}`}>
                      <span className="livro-nome-texto">{a.visitor_name}</span>
                      {escrevendo && (
                        <span className="livro-caneta" aria-hidden="true">
                          <span className="livro-caneta-aro" />
                          <span className="livro-caneta-bico" />
                        </span>
                      )}
                    </span>
                  )}
                  <span className="livro-data">{dataCurta(a.created_at)}</span>
                </figcaption>

                {moderar && aRemover === a.id && (
                  <p className="livro-confirma">
                    Remover esta assinatura para sempre?
                    <button type="button" className="livro-confirma-sim" onClick={() => aoPedirRemocao(a.id)} disabled={removendoId === a.id}>
                      {removendoId === a.id ? 'Removendo...' : 'Remover'}
                    </button>
                    <button type="button" className="livro-confirma-nao" onClick={aoCancelar}>
                      Cancelar
                    </button>
                  </p>
                )}
              </figure>
            )
          })
        )}
      </div>
    </div>
  )
}

export function LivroAssinaturas({
  memorialId,
  assinaturasIniciais,
  nomeHomenageado,
  moderar = false,
}: {
  memorialId: string
  assinaturasIniciais: Assinatura[]
  nomeHomenageado: string
  /** Portal da Família: clicar no nome remove qualquer assinatura, não só a
   *  própria. Quem autoriza é o servidor (cookie de família), nunca esta prop
   *  -- ela só decide o que a tela mostra. */
  moderar?: boolean
}) {
  // Mais antigas primeiro: livro se lê do começo, e assinatura nova entra no
  // fim, que é onde a pena vai escrever.
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>(() =>
    [...assinaturasIniciais].sort((a, b) => a.created_at.localeCompare(b.created_at))
  )
  const [spread, setSpread] = useState(0)
  const [virando, setVirando] = useState<'frente' | 'tras' | null>(null)
  const [escrevendoId, setEscrevendoId] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  // Lido com useSyncExternalStore em vez de useState+useEffect: o
  // armazenamento do navegador e estado que mora fora do React, e setState
  // dentro de efeito dispara render em cascata (o lint do React reprova).
  // No servidor a lista sai vazia -- ninguem tem comprovante ate abrir a
  // pagina, entao nao ha diferenca de marcacao pra reconciliar.
  const comprovantes = useSyncExternalStore(
    inscrever,
    useCallback(() => lerComprovantes(memorialId), [memorialId]),
    useCallback(() => VAZIO, [])
  )
  const [removendo, setRemovendo] = useState(false)
  const [aRemover, setARemover] = useState<string | null>(null)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const reduzMovimento = usaReducaoMovimento()

  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    // Copia a lista pra dentro do efeito: no cleanup, temporizadores.current
    // ja pode apontar pra outra coisa.
    const lista = temporizadores.current
    return () => lista.forEach(clearTimeout)
  }, [])

  const totalSpreads = Math.max(1, Math.ceil(assinaturas.length / (POR_PAGINA * 2)))

  const paginas = useMemo(() => {
    const base = spread * POR_PAGINA * 2
    return {
      esquerda: assinaturas.slice(base, base + POR_PAGINA),
      direita: assinaturas.slice(base + POR_PAGINA, base + POR_PAGINA * 2),
    }
  }, [assinaturas, spread])

  function agendar(fn: () => void, ms: number) {
    temporizadores.current.push(setTimeout(fn, ms))
  }

  function virar(direcao: 'frente' | 'tras') {
    if (virando) return
    const proximo = direcao === 'frente' ? spread + 1 : spread - 1
    if (proximo < 0 || proximo >= totalSpreads) return

    if (reduzMovimento) {
      setSpread(proximo)
      return
    }

    setVirando(direcao)
    agendar(() => {
      setSpread(proximo)
      setVirando(null)
    }, 720)
  }

  async function assinar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !mensagem.trim() || enviando) return
    setEnviando(true)
    setErro('')

    const res = await fetch('/api/memorial-condolencia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, nome: nome.trim(), mensagem: mensagem.trim() }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErro(json.error || 'Não foi possível registrar agora. Tenta de novo em instantes.')
      setEnviando(false)
      return
    }

    const json = await res.json().catch(() => ({}))

    const nova: Assinatura = {
      // Id real do banco, nao inventado: e ele que o comprovante assina, entao
      // um id de mentira aqui deixaria o botao de remover sem efeito nenhum.
      id: json.id || `nova-${Date.now()}`,
      visitor_name: nome.trim(),
      message: mensagem.trim(),
      created_at: json.criadoEm || new Date().toISOString(),
    }

    if (json.id && json.comprovante) {
      guardarComprovantes(memorialId, [...comprovantes, { id: json.id, comprovante: json.comprovante }])
    }

    const lista = [...assinaturas, nova]
    setAssinaturas(lista)
    setSpread(Math.floor((lista.length - 1) / (POR_PAGINA * 2)))
    setNome('')
    setMensagem('')
    setEnviando(false)

    if (!reduzMovimento) {
      setEscrevendoId(nova.id)
      // 2400ms = a escrita + a pausa do brilho. Depois disso a assinatura vira
      // uma igual as outras.
      agendar(() => setEscrevendoId(null), 2600)
    }
  }

  const minhas = useMemo(() => new Set(comprovantes.map((c) => c.id)), [comprovantes])

  // A assinatura desta pessoa que esta visivel agora -- so aparece botao pra
  // ela, e so se estiver na pagina aberta.
  const minhaNaPagina = useMemo(() => {
    const visiveis = [...paginas.esquerda, ...paginas.direita]
    return visiveis.find((a) => minhas.has(a.id)) || null
  }, [paginas, minhas])

  // Primeiro clique marca, segundo confirma. Remocao e permanente.
  async function pedirRemocao(id: string) {
    if (aRemover !== id) {
      setARemover(id)
      return
    }

    setRemovendoId(id)
    setErro('')

    const res = await fetch('/api/memorial-condolencia', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      // Sem comprovante: quem autoriza aqui e o cookie de familia, checado no
      // servidor. A prop `moderar` nao autoriza nada sozinha.
      body: JSON.stringify({ memorialId, id }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErro(json.error || 'Não foi possível remover agora.')
      setRemovendoId(null)
      return
    }

    const restantes = assinaturas.filter((a) => a.id !== id)
    setAssinaturas(restantes)
    setSpread((atual) => Math.min(atual, Math.max(0, Math.ceil(restantes.length / (POR_PAGINA * 2)) - 1)))
    setARemover(null)
    setRemovendoId(null)
  }

  async function remover() {
    if (!minhaNaPagina || removendo) return
    const ficha = comprovantes.find((c) => c.id === minhaNaPagina.id)
    if (!ficha) return

    setRemovendo(true)
    setErro('')

    const res = await fetch('/api/memorial-condolencia', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, id: ficha.id, comprovante: ficha.comprovante }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErro(json.error || 'Não foi possível remover agora.')
      setRemovendo(false)
      return
    }

    const restantes = assinaturas.filter((a) => a.id !== ficha.id)
    setAssinaturas(restantes)
    guardarComprovantes(memorialId, comprovantes.filter((c) => c.id !== ficha.id))
    // A pagina aberta pode ter deixado de existir depois da remocao.
    setSpread((atual) => Math.min(atual, Math.max(0, Math.ceil(restantes.length / (POR_PAGINA * 2)) - 1)))
    setRemovendo(false)
  }

  return (
    <div className="livro-bloco">
      <div className="livro-cena">
        <div className={`livro${virando ? ` livro-virando-${virando}` : ''}`}>
          <Folha
            itens={paginas.esquerda}
            lado="esq"
            escrevendoId={escrevendoId}
            moderar={moderar}
            aRemover={aRemover}
            aoPedirRemocao={pedirRemocao}
            aoCancelar={() => setARemover(null)}
            removendoId={removendoId}
            vazio={
              assinaturas.length === 0
                ? `Ninguém assinou ainda. Seja o primeiro a deixar uma palavra para ${nomeHomenageado}.`
                : ''
            }
          />
          <span className="livro-lombada" aria-hidden="true" />

          {/* Fita marcadora saindo da lombada, com o simbolo da marca.
              Fica sobre a lombada de proposito: e a unica faixa vertical do
              livro onde nao ha texto, entao a fita nunca cruza por cima do que
              alguem escreveu. */}
          <span className="livro-fita" aria-hidden="true">
            <span className="livro-fita-ponta">
              <Image
                src="/logo-icone-somente.png"
                alt=""
                width={72}
                height={94}
                className="livro-fita-logo"
              />
            </span>
          </span>
          <Folha
            itens={paginas.direita}
            lado="dir"
            escrevendoId={escrevendoId}
            moderar={moderar}
            aRemover={aRemover}
            aoPedirRemocao={pedirRemocao}
            aoCancelar={() => setARemover(null)}
            removendoId={removendoId}
            vazio=""
          />
          {virando && <span className="livro-folha-solta" aria-hidden="true" />}
        </div>
      </div>

      <div className="livro-controles">
        <button
          type="button"
          className="livro-seta"
          onClick={() => virar('tras')}
          disabled={spread === 0 || !!virando}
          aria-label="Página anterior do livro"
        >
          ←
        </button>
        <span className="livro-folio">
          {assinaturas.length === 0
            ? 'Livro em branco'
            : `Página ${spread + 1} de ${totalSpreads} · ${assinaturas.length} ${
                assinaturas.length === 1 ? 'assinatura' : 'assinaturas'
              }`}
        </span>
        <button
          type="button"
          className="livro-seta"
          onClick={() => virar('frente')}
          disabled={spread >= totalSpreads - 1 || !!virando}
          aria-label="Próxima página do livro"
        >
          →
        </button>
      </div>

      {moderar && assinaturas.length > 0 && (
        <p className="livro-dica-moderacao">
          Clique no nome de quem assinou para remover a assinatura do livro.
        </p>
      )}

      <form className="livro-form" onSubmit={assinar}>
        <div className="livro-campo">
          <label htmlFor="livro-nome">Seu nome</label>
          <input
            id="livro-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={80}
            required
            autoComplete="name"
          />
        </div>

        <div className="livro-campo">
          <label htmlFor="livro-mensagem">Sua mensagem</label>
          <textarea
            id="livro-mensagem"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            maxLength={500}
            rows={3}
            required
          />
        </div>

        {erro && (
          <p className="livro-erro" role="alert">
            {erro}
          </p>
        )}

        <div className="livro-acoes">
          <button type="submit" className="livro-botao" disabled={enviando}>
            {enviando ? 'Registrando...' : 'Assinar o livro'}
          </button>

          {!moderar && minhaNaPagina && (
            <button type="button" className="livro-botao-remover" onClick={remover} disabled={removendo}>
              {removendo ? 'Removendo...' : 'Remover minha assinatura'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
