'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CORES, dataPtBr } from '@/lib/publicTheme'

interface MemoriaMural {
  id: string
  nome: string
  parentesco: string | null
  texto: string
  foto_url: string | null
  coracoes: number
  created_at: string
}

export function MuralMemorias({ memorialId, memoriasIniciais }: { memorialId: string; memoriasIniciais: MemoriaMural[] }) {
  const [memorias, setMemorias] = useState(memoriasIniciais)
  const [reagidas, setReagidas] = useState<Record<string, boolean>>({})
  const [nome, setNome] = useState('')
  const [parentesco, setParentesco] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function reagir(id: string) {
    if (reagidas[id]) return
    setReagidas((r) => ({ ...r, [id]: true }))

    // RPC atômica no servidor (não é UPDATE direto do client — RLS não libera
    // update público, e update direto teria race condition + permitiria
    // qualquer um setar o valor arbitrário via API).
    const { data, error } = await supabase.rpc('reagir_memoria', { p_id: id })
    if (error) return

    const novoTotal = typeof data === 'number' ? data : undefined
    setMemorias((lista) =>
      lista.map((m) => (m.id === id ? { ...m, coracoes: novoTotal ?? m.coracoes + 1 } : m))
    )
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !texto.trim()) return
    setEnviando(true)
    setErro('')

    const { data, error } = await supabase
      .from('mural_memorias')
      .insert({
        homenagem_id: memorialId,
        nome: nome.trim(),
        parentesco: parentesco.trim() || null,
        texto: texto.trim(),
      })
      .select()
      .single()

    if (error || !data) {
      setErro('Não foi possível enviar agora. Tenta de novo em instantes.')
      setEnviando(false)
      return
    }

    setMemorias((lista) => [data as MemoriaMural, ...lista])
    setNome('')
    setParentesco('')
    setTexto('')
    setEnviando(false)
  }

  return (
    <div>
      <div style={{ fontSize: 14, color: CORES.textoFraco, marginBottom: 24 }}>
        Histórias e lembranças deixadas pela família e amigos.
      </div>

      {memorias.length > 0 && (
        <div
          style={{
            columnCount: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
            marginBottom: 28,
            alignItems: 'start',
          }}
        >
          {memorias.map((m) => (
            <div
              key={m.id}
              style={{
                background: CORES.superficieCard,
                border: `1px solid ${CORES.douradoBorda}`,
                borderRadius: 10,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: CORES.textoForte }}>{m.nome}</span>
                {m.parentesco && <span style={{ fontSize: 12, color: CORES.dourado }}>{m.parentesco}</span>}
              </div>
              {m.foto_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.foto_url}
                  alt=""
                  loading="lazy"
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 6, marginBottom: 10 }}
                />
              )}
              <p style={{ fontSize: 14, lineHeight: 1.7, color: CORES.textoCorpo, margin: 0 }}>{m.texto}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
                <button
                  onClick={() => reagir(m.id)}
                  aria-label="Guardar essa memória"
                  disabled={!!reagidas[m.id]}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'transparent',
                    border: 'none',
                    color: reagidas[m.id] ? CORES.dourado : CORES.textoFraco,
                    fontSize: 12,
                    cursor: reagidas[m.id] ? 'default' : 'pointer',
                    padding: 0,
                  }}
                >
                  <Heart size={14} strokeWidth={1.5} fill={reagidas[m.id] ? CORES.dourado : 'none'} />
                  {m.coracoes}
                </button>
                <span style={{ fontSize: 12, color: CORES.textoFraco }}>{dataPtBr(m.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
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
        <input
          type="text"
          placeholder="Seu parentesco (ex: filha, amigo) — opcional"
          value={parentesco}
          onChange={(e) => setParentesco(e.target.value)}
          maxLength={40}
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
          placeholder="Conte uma memória com ela"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={600}
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
          {enviando ? 'Enviando...' : 'Guardar memória'}
        </button>
      </form>
    </div>
  )
}
