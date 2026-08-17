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
  temSenhaAcessoInicial,
}: {
  memorialId: string
  modoGateInicial: ModoGate
  buscaHabilitadaInicial: boolean
  linkHabilitadoInicial: boolean
  qrcodeHabilitadoInicial: boolean
  temSenhaAcessoInicial: boolean
}) {
  const [buscaHabilitada, setBuscaHabilitada] = useState(buscaHabilitadaInicial)
  const [linkHabilitado, setLinkHabilitado] = useState(linkHabilitadoInicial)
  const [qrcodeHabilitado, setQrcodeHabilitado] = useState(qrcodeHabilitadoInicial)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const [temSenha, setTemSenha] = useState(temSenhaAcessoInicial)
  const [editandoSenha, setEditandoSenha] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [msgSenha, setMsgSenha] = useState('')

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

  function gerarSenha() {
    // Sem ambiguidade visual: sem 0/O, 1/l/I -- a senha vai ser ditada no
    // grupo da familia, nao so copiada.
    const alfabeto = 'abcdefghijkmnpqrstuvwxyz23456789'
    const bytes = new Uint8Array(10)
    crypto.getRandomValues(bytes)
    setNovaSenha(Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join(''))
  }

  async function salvarSenha(senha: string | null) {
    setSalvandoSenha(true)
    setMsgSenha('')
    const res = await fetch('/api/memorial-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, senha }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsgSenha(json.error || 'Erro ao salvar a senha')
    } else {
      setTemSenha(!!senha)
      setEditandoSenha(false)
      setNovaSenha('')
      setMsgSenha(senha ? 'Senha ativada. Guarde ela — nem nós conseguimos vê-la depois.' : 'Proteção removida. O memorial volta a abrir direto.')
    }
    setSalvandoSenha(false)
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

      <div className="pt-4 border-t border-zinc-800">
        <p className="text-xs font-medium text-zinc-400 mb-1">Página pública ou privada</p>
        <p className="text-[11px] text-zinc-500 mb-2">
          {temSenha
            ? 'Privada: ninguém abre sem a senha — nem quem escanear o QR Code da lápide, nem quem tiver o link.'
            : 'Pública: qualquer pessoa que chegar pelos canais acima abre a página direto. Com senha, é tudo ou nada — a senha vale pro link, pra busca e pro QR Code juntos.'}
        </p>

        {temSenha && !editandoSenha ? (
          <div className="space-y-2">
            <p className="text-sm text-emerald-400">Privada — pede senha em todos os canais, QR Code incluído</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditandoSenha(true)
                  setMsgSenha('')
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm"
              >
                Redefinir senha
              </button>
              <button
                type="button"
                disabled={salvandoSenha}
                onClick={() => {
                  if (confirm('Remover a senha? O memorial passa a abrir direto pra quem tiver o link ou o QR Code.')) salvarSenha(null)
                }}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm disabled:opacity-50"
              >
                Remover proteção
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Escolha uma senha"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={gerarSenha}
                className="px-3 py-2 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs whitespace-nowrap"
              >
                Gerar senha
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={salvandoSenha || novaSenha.trim().length < 4}
                onClick={() => salvarSenha(novaSenha.trim())}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {salvandoSenha ? 'Salvando...' : temSenha ? 'Salvar nova senha' : 'Proteger com senha'}
              </button>
              {editandoSenha && (
                <button
                  type="button"
                  onClick={() => {
                    setEditandoSenha(false)
                    setNovaSenha('')
                  }}
                  className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm"
                >
                  Cancelar
                </button>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">
              Anote a senha antes de salvar. Ela fica guardada embaralhada — nem a nossa equipe consegue vê-la depois.
              Se perder, é só criar outra aqui.
            </p>
          </div>
        )}

        {msgSenha && <p className="text-[11px] text-zinc-400 mt-2">{msgSenha}</p>}
      </div>
    </div>
  )
}
