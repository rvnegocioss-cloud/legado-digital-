'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ROTULOS_MODO, type ModoGate } from '@/lib/modosPrivacidade'

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

// Somente-leitura pra maioria dos modos (quem decide é Central/Parceiro) —
// exceção: modo "email" a família gerencia a própria allowlist (só ela
// sabe quem são os parentes autorizados), e modo "cadastro" ela vê quem
// se identificou. As 2 rotas usadas aqui autenticam pelo cookie de sessão
// da família automaticamente (mesmo tripé de /api/memorial-storage-usage),
// sem precisar de token nenhum.
export function PrivacidadeFamilia({ memorialId, modoGate }: { memorialId: string; modoGate: ModoGate }) {
  const [emails, setEmails] = useState<EmailAutorizado[]>([])
  const [novoEmail, setNovoEmail] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [visitantes, setVisitantes] = useState<Visitante[]>([])

  useEffect(() => {
    if (modoGate === 'email') carregarEmails()
    if (modoGate === 'cadastro') carregarVisitantes()
  }, [modoGate, memorialId])

  async function carregarEmails() {
    const res = await fetch(`/api/memorial-emails-autorizados?memorialId=${memorialId}`)
    if (res.ok) setEmails((await res.json()).emails || [])
  }

  async function carregarVisitantes() {
    const res = await fetch(`/api/memorial-visitantes?memorialId=${memorialId}`)
    if (res.ok) setVisitantes((await res.json()).visitantes || [])
  }

  async function adicionarEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!novoEmail.trim()) return
    setSalvando(true)
    setMsg('')
    const res = await fetch('/api/memorial-emails-autorizados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, email: novoEmail.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg(json.error || 'Erro ao adicionar')
    } else {
      setNovoEmail('')
      await carregarEmails()
    }
    setSalvando(false)
  }

  async function removerEmail(id: string) {
    await fetch(`/api/memorial-emails-autorizados?id=${id}&memorialId=${memorialId}`, { method: 'DELETE' })
    await carregarEmails()
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-white">{ROTULOS_MODO[modoGate].titulo}</p>
        <p className="text-xs text-zinc-400 mt-1">{ROTULOS_MODO[modoGate].descricao}</p>
        {modoGate !== 'email' && modoGate !== 'cadastro' && (
          <p className="text-xs text-zinc-500 mt-2">Pra mudar, fale com a funerária responsável.</p>
        )}
      </div>

      {modoGate === 'email' && (
        <div className="pt-2 border-t border-zinc-800">
          <label className="text-xs font-medium text-zinc-400 block mb-1">
            E-mails autorizados a ver o memorial ({emails.length})
          </label>
          <form onSubmit={adicionarEmail} className="flex gap-2 mb-2">
            <input
              type="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
            />
            <button type="submit" disabled={salvando} className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm">
              Adicionar
            </button>
          </form>
          {msg && <p className="text-xs text-red-400 mb-2">{msg}</p>}
          <ul className="space-y-1">
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
          <label className="text-xs font-medium text-zinc-400 block mb-1">
            Visitantes identificados ({visitantes.length})
          </label>
          <ul className="space-y-1">
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
