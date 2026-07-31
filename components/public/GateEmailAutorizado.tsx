'use client'

import { useState } from 'react'

export function GateEmailAutorizado({
  memorialId,
  nomeCompleto,
}: {
  memorialId: string
  nomeCompleto: string
}) {
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [reenvioBloqueadoAte, setReenvioBloqueadoAte] = useState(0)

  async function solicitar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro('')

    const res = await fetch('/api/memorial-acesso-email/solicitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, email }),
    })
    const json = await res.json()
    setEnviando(false)

    if (!res.ok) {
      setErro(json.error || 'Não foi possível enviar agora. Tenta de novo em instantes.')
      return
    }
    setMensagem(json.mensagem)
    setReenvioBloqueadoAte(Date.now() + 60000)
    setEtapa('codigo')
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro('')

    const res = await fetch('/api/memorial-acesso-email/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, email, codigo }),
    })
    const json = await res.json()

    if (!res.ok) {
      setErro(json.error || 'Código inválido ou expirado.')
      setEnviando(false)
      return
    }
    window.location.reload()
  }

  const podeReenviar = Date.now() >= reenvioBloqueadoAte

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
      <div style={{ maxWidth: 380, width: '100%', textAlign: 'center', color: '#F5F2EB' }}>
        <p style={{ color: '#C9A46A', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>
          Acesso por e-mail autorizado
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: '8px 0 6px' }}>Memorial de {nomeCompleto}</h1>

        {etapa === 'email' ? (
          <>
            <p style={{ fontSize: 13, color: 'rgba(245,242,235,0.6)', margin: '0 0 20px', lineHeight: 1.5 }}>
              A família restringiu esse memorial a uma lista de e-mails autorizados. Digite o seu — se
              estiver na lista, mandamos um código de acesso.
            </p>
            <form onSubmit={solicitar} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                required
                autoFocus
                style={estiloInput}
              />
              {erro && <p style={{ color: '#e08a8a', fontSize: 13 }}>{erro}</p>}
              <button type="submit" disabled={enviando} style={estiloBotao}>
                {enviando ? 'Enviando...' : 'Enviar código'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'rgba(245,242,235,0.6)', margin: '0 0 20px', lineHeight: 1.5 }}>
              {mensagem} Digite o código de 6 dígitos que enviamos pra {email}.
            </p>
            <form onSubmit={confirmar} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                inputMode="numeric"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                autoFocus
                maxLength={6}
                style={{ ...estiloInput, textAlign: 'center', letterSpacing: 6, fontSize: 20 }}
              />
              {erro && <p style={{ color: '#e08a8a', fontSize: 13 }}>{erro}</p>}
              <button type="submit" disabled={enviando} style={estiloBotao}>
                {enviando ? 'Verificando...' : 'Entrar'}
              </button>
              <button
                type="button"
                disabled={!podeReenviar}
                onClick={(e) => solicitar(e as unknown as React.FormEvent)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: podeReenviar ? '#C9A46A' : 'rgba(201,164,106,0.4)',
                  fontSize: 12,
                  cursor: podeReenviar ? 'pointer' : 'default',
                  marginTop: 4,
                }}
              >
                Reenviar código
              </button>
            </form>
          </>
        )}
      </div>
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
  marginTop: 4,
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
