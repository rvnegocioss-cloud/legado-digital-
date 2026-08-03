'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ROTULOS_MODO, type ModoGate } from '@/lib/modosPrivacidade'

const MODOS_ORDEM: ModoGate[] = ['aberto', 'senha', 'cadastro', 'email', 'oculto']

interface EmailAutorizado {
  id: string
  email: string
  criado_em: string
}

interface Visitante {
  id: string
  nome: string
  email: string
  criado_em: string
}

// A família decide se o próprio memorial fica aberto ou travado (pedido do
// Rafael, 2026-07-31) — mesmas opções que Central/Parceiro têm em
// components/admin/PrivacidadeMemorial.tsx, só que aqui autentica pelo
// cookie de sessão da família (as rotas chamadas aceitam os 3 papéis:
// staff, parceiro dono e família — mesmo tripé de /api/memorial-storage-usage).
export function PrivacidadeFamilia({
  memorialId,
  modoGateInicial,
  buscaHabilitadaInicial,
  linkHabilitadoInicial,
  qrcodeHabilitadoInicial,
}: {
  memorialId: string
  modoGateInicial: ModoGate
  buscaHabilitadaInicial: boolean
  linkHabilitadoInicial: boolean
  qrcodeHabilitadoInicial: boolean
}) {
  const [modoGate, setModoGate] = useState(modoGateInicial)
  const [buscaHabilitada, setBuscaHabilitada] = useState(buscaHabilitadaInicial)
  const [linkHabilitado, setLinkHabilitado] = useState(linkHabilitadoInicial)
  const [qrcodeHabilitado, setQrcodeHabilitado] = useState(qrcodeHabilitadoInicial)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const [emails, setEmails] = useState<EmailAutorizado[]>([])
  const [novoEmail, setNovoEmail] = useState('')
  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  const [visitantes, setVisitantes] = useState<Visitante[]>([])

  useEffect(() => {
    if (modoGateInicial === 'email') carregarEmails()
    if (modoGateInicial === 'cadastro') carregarVisitantes()
  }, [memorialId])

  async function carregarEmails() {
    const res = await fetch(`/api/memorial-emails-autorizados?memorialId=${memorialId}`)
    if (res.ok) setEmails((await res.json()).emails || [])
  }

  async function carregarVisitantes() {
    const res = await fetch(`/api/memorial-visitantes?memorialId=${memorialId}`)
    if (res.ok) setVisitantes((await res.json()).visitantes || [])
  }

  async function salvar() {
    setSalvando(true)
    setMsg('')
    const res = await fetch('/api/memorial-privacidade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, buscaHabilitada, linkHabilitado, qrcodeHabilitado, modoGate }),
    })
    const json = await res.json()
    setMsg(res.ok ? 'Salvo.' : json.error || 'Erro ao salvar')
    setSalvando(false)
    if (res.ok) {
      if (modoGate === 'oculto') {
        setBuscaHabilitada(false)
        setLinkHabilitado(false)
        setQrcodeHabilitado(false)
      }
      if (modoGate === 'email') carregarEmails()
      if (modoGate === 'cadastro') carregarVisitantes()
    }
  }

  async function adicionarEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!novoEmail.trim()) return
    setSalvandoEmail(true)
    setEmailMsg('')
    const res = await fetch('/api/memorial-emails-autorizados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, email: novoEmail.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setEmailMsg(json.error || 'Erro ao adicionar')
    } else {
      setNovoEmail('')
      await carregarEmails()
    }
    setSalvandoEmail(false)
  }

  async function removerEmail(id: string) {
    await fetch(`/api/memorial-emails-autorizados?id=${id}&memorialId=${memorialId}`, { method: 'DELETE' })
    await carregarEmails()
  }

  const oculto = modoGate === 'oculto'

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-2">Por onde as pessoas chegam</p>
        <div className={`space-y-2 ${oculto ? 'opacity-40 pointer-events-none' : ''}`}>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={buscaHabilitada} onChange={(e) => setBuscaHabilitada(e.target.checked)} disabled={oculto} />
            Público — aparece na busca por nome
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={linkHabilitado} onChange={(e) => setLinkHabilitado(e.target.checked)} disabled={oculto} />
            Acesso por link direto
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={qrcodeHabilitado} onChange={(e) => setQrcodeHabilitado(e.target.checked)} disabled={oculto} />
            Acesso por QR Code
          </label>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-zinc-400 mb-2">O que a pessoa precisa fazer pra ver</p>
        <div className="space-y-2">
          {MODOS_ORDEM.map((modo) => (
            <label key={modo} className="flex items-start gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                name={`modo-gate-familia-${memorialId}`}
                checked={modoGate === modo}
                onChange={() => setModoGate(modo)}
                className="mt-0.5"
              />
              <span>
                {ROTULOS_MODO[modo].titulo}
                <span className="block text-[11px] text-zinc-500">{ROTULOS_MODO[modo].descricao}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
      >
        {salvando ? 'Salvando...' : 'Salvar privacidade'}
      </button>
      {msg && <p className="text-[11px] text-zinc-400">{msg}</p>}

      {modoGate === 'email' && (
        <div className="pt-2 border-t border-zinc-800">
          <p className="text-xs font-medium text-zinc-400 mb-2">E-mails autorizados a ver o memorial ({emails.length})</p>
          <form onSubmit={adicionarEmail} className="flex gap-2 mb-2">
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
            />
            <button type="submit" disabled={salvandoEmail} className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm">
              Adicionar
            </button>
          </form>
          {emailMsg && <p className="text-[11px] text-red-400 mb-2">{emailMsg}</p>}
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {emails.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm text-zinc-300 bg-zinc-900/60 rounded px-2 py-1">
                <span>{e.email}</span>
                <button type="button" onClick={() => removerEmail(e.id)} aria-label="Remover">
                  <Trash2 size={14} strokeWidth={1.5} className="text-zinc-500 hover:text-red-400" />
                </button>
              </li>
            ))}
            {emails.length === 0 && <li className="text-zinc-500 text-xs">Nenhum e-mail autorizado ainda.</li>}
          </ul>
        </div>
      )}

      {modoGate === 'cadastro' && (
        <div className="pt-2 border-t border-zinc-800">
          <p className="text-xs font-medium text-zinc-400 mb-2">Visitantes identificados ({visitantes.length})</p>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {visitantes.map((v) => (
              <li key={v.id} className="text-sm text-zinc-300 bg-zinc-900/60 rounded px-2 py-1">
                <span className="font-medium">{v.nome}</span> <span className="text-zinc-500">{v.email}</span>
              </li>
            ))}
            {visitantes.length === 0 && <li className="text-zinc-500 text-xs">Ninguém se identificou ainda.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
