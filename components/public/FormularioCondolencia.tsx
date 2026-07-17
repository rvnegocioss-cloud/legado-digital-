'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CORES } from '@/lib/publicTheme'

export function FormularioCondolencia({ memorialId }: { memorialId: string }) {
  const [nome, setNome] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !mensagem.trim()) return
    setEnviando(true)
    setErro('')

    const { error } = await supabase
      .from('condolencias')
      .insert({ homenagem_id: memorialId, visitor_name: nome.trim(), message: mensagem.trim() })

    if (error) {
      setErro('Não foi possível enviar agora. Tenta de novo em instantes.')
      setEnviando(false)
      return
    }

    setEnviado(true)
    setEnviando(false)
  }

  if (enviado) {
    return (
      <p style={{ color: CORES.dourado, fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
        Obrigado por deixar sua homenagem.
      </p>
    )
  }

  return (
    <form onSubmit={enviar} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input
        type="text"
        placeholder="Seu nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={80}
        required
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(201,164,106,0.2)',
          borderRadius: 8,
          padding: '10px 14px',
          color: CORES.textoForte,
          fontSize: 14,
        }}
      />
      <textarea
        placeholder="Deixe sua mensagem de carinho"
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        maxLength={500}
        rows={3}
        required
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(201,164,106,0.2)',
          borderRadius: 8,
          padding: '10px 14px',
          color: CORES.textoForte,
          fontSize: 14,
          resize: 'vertical',
        }}
      />
      {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
      <button
        type="submit"
        disabled={enviando}
        style={{
          alignSelf: 'flex-start',
          background: CORES.dourado,
          color: CORES.fundoProfundo,
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 13,
          fontWeight: 600,
          cursor: enviando ? 'default' : 'pointer',
          opacity: enviando ? 0.6 : 1,
        }}
      >
        {enviando ? 'Enviando...' : 'Deixar homenagem'}
      </button>
    </form>
  )
}
