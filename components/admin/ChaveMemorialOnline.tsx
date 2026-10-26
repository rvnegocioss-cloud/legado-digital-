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
  destaque = false,
  onMudar,
}: {
  memorialId: string
  estadoInicialOnline?: boolean
  getAuthHeaders?: () => Promise<Record<string, string>>
  // Visual grande (faixa laranja/verde) usado so no modo simples do celular.
  destaque?: boolean
  onMudar?: (online: boolean) => void
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
      } else {
        onMudar?.(novo)
      }
    } catch {
      setOnline(!novo)
      setErro('Não foi possível salvar')
    }
    setSalvando(false)
  }

  if (destaque) {
    return (
      <div
        className={`my-3 rounded-2xl border-2 p-4 ${
          online ? 'border-emerald-500 bg-emerald-500/10' : 'border-amber-500 bg-amber-500/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-lg font-bold text-[var(--tema-zinc-200,#e4e4e7)]">
              {online ? 'Página ONLINE' : 'Página OFFLINE'}
            </p>
            <p className="text-[15px] text-[var(--tema-zinc-400,#a1a1aa)]">
              {online
                ? 'Todos que tiverem o link ou o QR podem ver.'
                : 'Ninguém consegue ver ainda. Ligue quando estiver pronta.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={online}
            aria-label="Ligar ou desligar a página (online ou offline)"
            disabled={salvando}
            onClick={alternar}
            className="shrink-0 min-h-[56px] min-w-[72px] flex items-center justify-center disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A46A] rounded-full"
          >
            <span
              className={`relative block w-16 h-9 shrink-0 rounded-full transition-colors ${
                online ? 'bg-emerald-600' : 'bg-[var(--tema-zinc-700,#555)]'
              }`}
            >
              <span
                className={`absolute top-1 w-7 h-7 rounded-full bg-white transition-all ${
                  online ? 'left-[32px]' : 'left-1'
                }`}
              />
            </span>
          </button>
        </div>
        {erro && <p className="text-[15px] text-red-500 mt-1">{erro}</p>}
      </div>
    )
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
