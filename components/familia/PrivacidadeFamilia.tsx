'use client'

import { useState } from 'react'
import type { ModoGate } from '@/lib/modosPrivacidade'

// Decisão do Rafael (2026-08-17): a família não escolhe modo de portão. Quem
// tem a senha de edição decide só POR ONDE as pessoas chegam (busca, link, QR
// Code) -- decisão da família, sem burocracia. Os modos com senha/identificação/
// lista de e-mails continuam existindo no sistema, mas quem configura isso é a
// Central/Parceiro (components/admin/PrivacidadeMemorial.tsx). O modo atual é
// preservado aqui: a família liga/desliga canal sem alterar o portão que a
// funerária tiver definido.
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
  const [buscaHabilitada, setBuscaHabilitada] = useState(buscaHabilitadaInicial)
  const [linkHabilitado, setLinkHabilitado] = useState(linkHabilitadoInicial)
  const [qrcodeHabilitado, setQrcodeHabilitado] = useState(qrcodeHabilitadoInicial)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  async function salvar() {
    setSalvando(true)
    setMsg('')
    const res = await fetch('/api/memorial-privacidade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memorialId,
        buscaHabilitada,
        linkHabilitado,
        qrcodeHabilitado,
        modoGate: modoGateInicial,
      }),
    })
    const json = await res.json()
    setMsg(res.ok ? 'Salvo.' : json.error || 'Erro ao salvar')
    setSalvando(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-2">Onde este memorial aparece</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={buscaHabilitada} onChange={(e) => setBuscaHabilitada(e.target.checked)} />
            Aparece na busca por nome e no mapa público de cemitérios
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={linkHabilitado} onChange={(e) => setLinkHabilitado(e.target.checked)} />
            Abre por link direto
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={qrcodeHabilitado} onChange={(e) => setQrcodeHabilitado(e.target.checked)} />
            Abre pelo QR Code da lápide
          </label>
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">
          Desmarcar tudo deixa o memorial só pra vocês — ninguém encontra por fora.
        </p>
      </div>

      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
      >
        {salvando ? 'Salvando...' : 'Salvar'}
      </button>
      {msg && <p className="text-[11px] text-zinc-400">{msg}</p>}
    </div>
  )
}
