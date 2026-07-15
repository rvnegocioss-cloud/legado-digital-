'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'

type Mensagem = { role: 'user' | 'assistant'; content: string }

export default function LegadoBotPublicoWidget() {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { role: 'assistant', content: 'Posso ajudar? Sou o assistente do Legado Digital, pode perguntar o que é o projeto.' },
  ])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, aberto])

  async function enviar() {
    const texto = input.trim()
    if (!texto || carregando) return

    const novasMensagens: Mensagem[] = [...mensagens, { role: 'user', content: texto }]
    setMensagens(novasMensagens)
    setInput('')
    setCarregando(true)

    try {
      const resp = await fetch('/api/legadobot-publico/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagens: novasMensagens }),
      })
      const json = await resp.json()

      if (!resp.ok) {
        setMensagens([...novasMensagens, { role: 'assistant', content: json.error || 'Erro ao responder.' }])
        return
      }

      setMensagens([...novasMensagens, { role: 'assistant', content: json.resposta }])

      if (json.acao) {
        setTimeout(() => router.push(json.acao), 600)
      }
    } catch {
      setMensagens([...novasMensagens, { role: 'assistant', content: 'Não consegui responder agora, tenta de novo em instantes.' }])
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {aberto && (
        <div className="mb-3 w-80 sm:w-96 h-[26rem] rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800" style={{ background: '#0B1D2A' }}>
            <span className="text-sm font-medium" style={{ color: '#C9A46A' }}>Legado Digital</span>
            <button onClick={() => setAberto(false)} aria-label="Fechar" className="text-zinc-400 hover:text-white">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {mensagens.map((m, i) => (
              <div
                key={i}
                className={`text-sm rounded-lg px-3 py-2 max-w-[85%] ${
                  m.role === 'user' ? 'ml-auto bg-zinc-800 text-white' : 'bg-zinc-800/50 text-zinc-200'
                }`}
              >
                {m.content}
              </div>
            ))}
            {carregando && (
              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <Loader2 size={14} className="animate-spin" strokeWidth={1.5} /> pensando...
              </div>
            )}
            <div ref={fimRef} />
          </div>

          <div className="p-3 border-t border-zinc-800 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviar()}
              placeholder="Pergunte algo..."
              className="flex-1 bg-zinc-800 text-sm text-white rounded-lg px-3 py-2 outline-none placeholder:text-zinc-500"
            />
            <button
              onClick={enviar}
              disabled={carregando}
              aria-label="Enviar"
              className="text-zinc-400 hover:text-white disabled:opacity-40 shrink-0"
            >
              <Send size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setAberto(!aberto)}
        aria-label="Posso ajudar?"
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        style={{ background: '#C9A46A' }}
      >
        {aberto ? <X size={22} strokeWidth={1.5} color="#0B1D2A" /> : <MessageCircle size={22} strokeWidth={1.5} color="#0B1D2A" />}
      </button>
    </div>
  )
}
