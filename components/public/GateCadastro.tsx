'use client'

import { useState } from 'react'

export function GateCadastro({
  memorialId,
  nomeCompleto,
}: {
  memorialId: string
  nomeCompleto: string
}) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro('')

    const res = await fetch('/api/memorial-acesso-cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, nome, email }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setErro(json.error || 'Não foi possível entrar agora. Tenta de novo em instantes.')
      setEnviando(false)
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
      <form onSubmit={entrar} style={{ maxWidth: 380, width: '100%', textAlign: 'center', color: '#F5F2EB' }}>
        <p style={{ color: '#C9A46A', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>
          Identificação
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: '8px 0 6px' }}>Memorial de {nomeCompleto}</h1>
        <p style={{ fontSize: 13, color: 'rgba(245,242,235,0.6)', margin: '0 0 20px', lineHeight: 1.5 }}>
          A família pede que você se identifique antes de entrar. Seu nome e e-mail ficam registrados pra ela
          saber quem visitou.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            required
            maxLength={120}
            autoFocus
            style={estiloInput}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail"
            required
            maxLength={180}
            style={estiloInput}
          />
        </div>
        {erro && <p style={{ color: '#e08a8a', fontSize: 13, marginTop: 10 }}>{erro}</p>}
        <button type="submit" disabled={enviando} style={estiloBotao}>
          {enviando ? 'Entrando...' : 'Entrar no memorial'}
        </button>
      </form>
    </div>
  )
}

const estiloInput: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(201,164,106,0.3)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff',
  fontSize: 15,
}

const estiloBotao: React.CSSProperties = {
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
}
