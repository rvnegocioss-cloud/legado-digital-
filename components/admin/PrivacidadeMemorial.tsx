'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { supabase } from '@/lib/auth'
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

// Componente compartilhado Central + Portal do Parceiro — cada lado embrulha
// isso no próprio wrapper de seção (SecaoRetratil / SecaoFicha), o conteúdo
// interno é idêntico pros dois pra nunca divergir (regra 16).
export function PrivacidadeMemorial({ memorialId }: { memorialId: string }) {
  const [carregando, setCarregando] = useState(true)
  const [buscaHabilitada, setBuscaHabilitada] = useState(true)
  const [linkHabilitado, setLinkHabilitado] = useState(true)
  const [qrcodeHabilitado, setQrcodeHabilitado] = useState(true)
  const [modoGate, setModoGate] = useState<ModoGate>('aberto')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const [emails, setEmails] = useState<EmailAutorizado[]>([])
  const [novoEmail, setNovoEmail] = useState('')
  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  const [visitantes, setVisitantes] = useState<Visitante[]>([])

  useEffect(() => {
    if (memorialId) carregar()
  }, [memorialId])

  async function authHeader() {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }
  }

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase
      .from('homenagens_seguranca')
      .select('busca_habilitada, link_habilitado, qrcode_habilitado, modo_gate')
      .eq('homenagem_id', memorialId)
      .maybeSingle()

    setBuscaHabilitada(data?.busca_habilitada ?? true)
    setLinkHabilitado(data?.link_habilitado ?? true)
    setQrcodeHabilitado(data?.qrcode_habilitado ?? true)
    const modo = (data?.modo_gate ?? 'aberto') as ModoGate
    setModoGate(modo)
    setCarregando(false)

    if (modo === 'email') carregarEmails()
    if (modo === 'cadastro') carregarVisitantes()
  }

  async function carregarEmails() {
    const headers = await authHeader()
    const res = await fetch(`/api/memorial-emails-autorizados?memorialId=${memorialId}`, { headers })
    if (res.ok) setEmails((await res.json()).emails || [])
  }

  async function carregarVisitantes() {
    const headers = await authHeader()
    const res = await fetch(`/api/memorial-visitantes?memorialId=${memorialId}`, { headers })
    if (res.ok) setVisitantes((await res.json()).visitantes || [])
  }

  async function salvar() {
    setSalvando(true)
    setMsg('')
    const headers = await authHeader()
    const res = await fetch('/api/memorial-privacidade', {
      method: 'POST',
      headers,
      body: JSON.stringify({ memorialId, buscaHabilitada, linkHabilitado, qrcodeHabilitado, modoGate }),
    })
    const json = await res.json()
    setMsg(res.ok ? 'Salvo.' : json.error || 'Erro ao salvar')
    setSalvando(false)
    if (res.ok) {
      // Oculto força os 3 canais off no servidor -- reflete na tela sem
      // esperar um reload.
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
    const headers = await authHeader()
    const res = await fetch('/api/memorial-emails-autorizados', {
      method: 'POST',
      headers,
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
    const headers = await authHeader()
    await fetch(`/api/memorial-emails-autorizados?id=${id}&memorialId=${memorialId}`, {
      method: 'DELETE',
      headers,
    })
    await carregarEmails()
  }

  if (carregando) return <p className="text-[var(--tema-zinc-500)] text-xs">Carregando...</p>

  const oculto = modoGate === 'oculto'

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[var(--tema-zinc-400)] text-xs font-medium mb-2">Por onde as pessoas chegam</p>
        <div className={`space-y-2 ${oculto ? 'opacity-40 pointer-events-none' : ''}`}>
          <label className="flex items-center gap-2 text-sm text-[var(--tema-zinc-300)]">
            <input type="checkbox" checked={buscaHabilitada} onChange={(e) => setBuscaHabilitada(e.target.checked)} disabled={oculto} />
            Público — aparece na busca por nome e no mapa público de cemitérios
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--tema-zinc-300)]">
            <input type="checkbox" checked={linkHabilitado} onChange={(e) => setLinkHabilitado(e.target.checked)} disabled={oculto} />
            Acesso por link direto
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--tema-zinc-300)]">
            <input type="checkbox" checked={qrcodeHabilitado} onChange={(e) => setQrcodeHabilitado(e.target.checked)} disabled={oculto} />
            Acesso por QR Code
          </label>
        </div>
      </div>

      <div>
        <p className="text-[var(--tema-zinc-400)] text-xs font-medium mb-2">O que a pessoa precisa fazer pra ver</p>
        <div className="space-y-2">
          {MODOS_ORDEM.map((modo) => (
            <label key={modo} className="flex items-start gap-2 text-sm text-[var(--tema-zinc-300)]">
              <input
                type="radio"
                name={`modo-gate-${memorialId}`}
                checked={modoGate === modo}
                onChange={() => setModoGate(modo)}
                className="mt-0.5"
              />
              <span>
                {ROTULOS_MODO[modo].titulo}
                <span className="block text-[11px] text-[var(--tema-zinc-500)]">{ROTULOS_MODO[modo].descricao}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-branco-fixo text-sm font-medium disabled:opacity-50"
      >
        {salvando ? 'Salvando...' : 'Salvar privacidade'}
      </button>
      {msg && <p className="text-[11px] text-[var(--tema-zinc-400)]">{msg}</p>}

      {modoGate === 'email' && (
        <div className="pt-2 border-t border-[var(--tema-zinc-800)]">
          <p className="text-[var(--tema-zinc-400)] text-xs font-medium mb-2">Lista de e-mails autorizados ({emails.length})</p>
          <form onSubmit={adicionarEmail} className="flex gap-2 mb-2">
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="flex-1 bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded-lg px-3 py-1.5 text-sm text-white"
            />
            <button type="submit" disabled={salvandoEmail} className="px-3 py-1.5 rounded-lg bg-[var(--tema-zinc-700)] hover:bg-[var(--tema-zinc-600)] text-white text-sm">
              Adicionar
            </button>
          </form>
          {emailMsg && <p className="text-[11px] text-red-400 mb-2">{emailMsg}</p>}
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {emails.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm text-[var(--tema-zinc-300)] bg-[var(--tema-zinc-800)]/50 rounded px-2 py-1">
                <span>{e.email}</span>
                <button type="button" onClick={() => removerEmail(e.id)} aria-label="Remover">
                  <Trash2 size={14} strokeWidth={1.5} className="text-[var(--tema-zinc-500)] hover:text-red-400" />
                </button>
              </li>
            ))}
            {emails.length === 0 && <li className="text-[var(--tema-zinc-600)] text-xs">Nenhum e-mail autorizado ainda.</li>}
          </ul>
        </div>
      )}

      {modoGate === 'cadastro' && (
        <div className="pt-2 border-t border-[var(--tema-zinc-800)]">
          <p className="text-[var(--tema-zinc-400)] text-xs font-medium mb-2">Visitantes identificados ({visitantes.length})</p>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {visitantes.map((v) => (
              <li key={v.id} className="text-sm text-[var(--tema-zinc-300)] bg-[var(--tema-zinc-800)]/50 rounded px-2 py-1">
                <span className="font-medium">{v.nome}</span>{' '}
                <span className="text-[var(--tema-zinc-500)]">{v.email}</span>
              </li>
            ))}
            {visitantes.length === 0 && <li className="text-[var(--tema-zinc-600)] text-xs">Ninguém se identificou ainda.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
