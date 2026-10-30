'use client'

import { useState } from 'react'

// Chave "Memorial online / offline" -- compartilhada por Central, Portal do
// Parceiro e Portal da Família. Offline = modo_gate 'oculto' (a rota força os
// 3 canais off); online = 'aberto' com busca/link/QR ligados. Usa a rota
// existente /api/memorial-privacidade, sem alterar a autorização dela.
// Autenticação: Central/Parceiro passam getAuthHeaders (Bearer do Supabase);
// a família não passa nada (cookie de sessão HMAC vai sozinho).
export function ChaveMemorialOnline({
  memorialId,
  estadoInicialOnline = true,
  getAuthHeaders,
}: {
  memorialId: string
  estadoInicialOnline?: boolean
  getAuthHeaders?: () => Promise<Record<string, string>>
}) {
  const [online, setOnline] = useState(estadoInicialOnline)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function alternar() {
    if (salvando) return
    const novo = !online
    setOnline(novo) // otimista
    setSalvando(true)
    setErro('')
    try {
      const extra = getAuthHeaders ? await getAuthHeaders() : {}
      const res = await fetch('/api/memorial-privacidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...extra },
        body: JSON.stringify({
          memorialId,
          buscaHabilitada: novo,
          linkHabilitado: novo,
          qrcodeHabilitado: novo,
          modoGate: novo ? 'aberto' : 'oculto',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOnline(!novo)
        setErro(json.error || 'Não foi possível salvar')
      }
    } catch {
      setOnline(!novo)
      setErro('Não foi possível salvar')
    }
    setSalvando(false)
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={online}
          aria-label="Memorial online / offline"
          disabled={salvando}
          onClick={alternar}
          className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-60"
        >
          <span
            className={`relative block w-11 h-6 shrink-0 rounded-full transition-colors ${
              online ? 'bg-emerald-600' : 'bg-[var(--tema-zinc-700,#3f3f46)]'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                online ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>
        <div>
          <p className="text-sm font-medium text-[var(--tema-zinc-200,#e4e4e7)]">
            Memorial online / offline:{' '}
            <span className={online ? 'text-emerald-500' : 'text-amber-500'}>{online ? 'Online' : 'Offline'}</span>
          </p>
          <p className="text-[11px] text-[var(--tema-zinc-400,#a1a1aa)]">
            Offline: ninguém vê a página pública (busca, link e QR mostram &apos;não encontrado&apos;). Online: aparece normalmente.
          </p>
        </div>
      </div>
      {erro && <p className="text-[11px] text-red-500 mt-1">{erro}</p>}
    </div>
  )
}
