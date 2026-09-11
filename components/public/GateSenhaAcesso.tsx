'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function GateSenhaAcesso({
  memorialId,
  nomeCompleto,
}: {
  memorialId: string
  nomeCompleto: string
}) {
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [verificando, setVerificando] = useState(false)

  async function verificar(e: React.FormEvent) {
    e.preventDefault()
    setVerificando(true)
    setErro('')

    const res = await fetch('/api/memorial-acesso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, senha }),
    })
    const json = await res.json()

    if (!res.ok || !json.ok) {
      setErro(json.error || 'Senha incorreta')
      setVerificando(false)
      return
    }
    window.location.reload()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f2436 0%, #0B1D2A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      <form onSubmit={verificar} style={{ maxWidth: 360, width: '100%', textAlign: 'center', color: '#F5F2EB' }}>
        <p style={{ color: '#C9A46A', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>
          Acesso restrito
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: '8px 0 20px' }}>Memorial de {nomeCompleto}</h1>
        <div style={{ position: 'relative' }}>
          <input
            type={verSenha ? 'text' : 'password'}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha de acesso"
            required
            autoFocus
            style={{
              width: '100%',
              padding: '10px 38px 10px 14px',
              borderRadius: 8,
              border: '1px solid rgba(201,164,106,0.3)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontSize: 15,
            }}
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            aria-label={verSenha ? 'Esconder senha' : 'Ver senha'}
            tabIndex={-1}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 0, padding: 0, cursor: 'pointer', color: '#7a8a96',
              display: 'flex',
            }}
          >
            {verSenha ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        </div>
        {erro && <p style={{ color: '#e08a8a', fontSize: 13, marginTop: 10 }}>{erro}</p>}
        <button
          type="submit"
          disabled={verificando}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '10px',
            borderRadius: 8,
            border: 'none',
            background: '#C9A46A',
            color: '#0B1D2A',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          {verificando ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
