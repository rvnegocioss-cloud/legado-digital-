'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { tema, periodoTexto, CORES } from '@/lib/publicTheme'

interface Resultado {
  id: string
  nome_completo: string
  data_nascimento: string | null
  data_falecimento: string | null
  cidade: string | null
  foto_url: string | null
  slug: string | null
  tem_senha: boolean
}

export function BuscaMemorial({ parceiroId }: { parceiroId?: string }) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<Resultado[] | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [desbloqueadoId, setDesbloqueadoId] = useState<string | null>(null)
  const [senhaAbertaId, setSenhaAbertaId] = useState<string | null>(null)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState('')
  const [verificando, setVerificando] = useState(false)

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    const nome = termo.trim()
    if (!nome) return
    setBuscando(true)
    setResultados(null)
    setSenhaAbertaId(null)
    setDesbloqueadoId(null)

    const { data } = await supabase.rpc('buscar_homenagens_publicas', {
      termo: nome,
      p_parceiro_id: parceiroId || null,
    })
    setResultados((data || []) as Resultado[])
    setBuscando(false)
  }

  async function verificarSenha(e: React.FormEvent, memorialId: string) {
    e.preventDefault()
    setVerificando(true)
    setSenhaErro('')

    const res = await fetch('/api/memorial-acesso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memorialId, senha: senhaInput }),
    })
    const json = await res.json()

    if (!res.ok || !json.ok) {
      setSenhaErro(json.error || 'Senha incorreta')
    } else {
      setDesbloqueadoId(memorialId)
      setSenhaInput('')
    }
    setVerificando(false)
  }

  return (
    <div>
      <form onSubmit={buscar} style={tema.buscaForm}>
        <label htmlFor="q" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
          Nome do homenageado
        </label>
        <input
          id="q"
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Nome completo do homenageado"
          style={tema.buscaInput}
        />
        <button type="submit" style={tema.buscaBotao} disabled={buscando}>
          {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {resultados !== null && resultados.length === 0 && (
        <p style={tema.vazio}>
          Nenhum memorial encontrado com o nome &ldquo;{termo}&rdquo;. Confira a grafia e tente de novo.
        </p>
      )}

      {resultados === null && (
        <p style={tema.vazio}>Digite o nome completo de quem você procura.</p>
      )}

      {resultados && resultados.length > 0 && (
        <div style={tema.placaGrid}>
          {resultados.map((r) => {
            const precisaSenha = r.tem_senha && desbloqueadoId !== r.id
            const conteudo = (
              <div style={tema.placa}>
                <div style={tema.placaAnel}>
                  <div style={tema.placaAnelInner}>
                    {r.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.foto_url} alt={r.nome_completo} style={tema.placaFoto} />
                    ) : (
                      <span style={{ color: CORES.textoFraco, fontSize: 10 }}>Sem foto</span>
                    )}
                  </div>
                </div>
                <div style={tema.placaTextos}>
                  <div style={tema.placaNome}>{r.nome_completo}</div>
                  <div style={tema.placaHairline} />
                  <div style={tema.placaMeta}>
                    {precisaSenha
                      ? 'Acesso restrito — senha necessária'
                      : [periodoTexto(r.data_nascimento, r.data_falecimento), r.cidade].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            )

            if (!precisaSenha) {
              return (
                <Link key={r.id} href={`/homenagem/${r.slug}`} style={tema.placaLink}>
                  {conteudo}
                </Link>
              )
            }

            const senhaAberta = senhaAbertaId === r.id
            return (
              <div key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSenhaAbertaId(senhaAberta ? null : r.id)
                    setSenhaErro('')
                    setSenhaInput('')
                  }}
                  style={{ ...tema.placaLink, all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
                >
                  {conteudo}
                </button>
                {senhaAberta && (
                  <form
                    onSubmit={(e) => verificarSenha(e, r.id)}
                    style={{ display: 'flex', gap: 8, marginTop: 8 }}
                  >
                    <input
                      type="password"
                      value={senhaInput}
                      onChange={(e) => setSenhaInput(e.target.value)}
                      placeholder="Senha de acesso"
                      style={{ ...tema.buscaInput, fontSize: 14, padding: '8px 12px' }}
                      autoFocus
                    />
                    <button type="submit" style={{ ...tema.buscaBotao, padding: '0 14px' }} disabled={verificando}>
                      {verificando ? '...' : 'Entrar'}
                    </button>
                  </form>
                )}
                {senhaAberta && senhaErro && (
                  <p style={{ color: '#e08a8a', fontSize: 12, marginTop: 4 }}>{senhaErro}</p>
                )}
                {desbloqueadoId === r.id && (
                  <Link href={`/homenagem/${r.slug}`} style={{ ...tema.buscaBotao, display: 'inline-block', textDecoration: 'none', marginTop: 8, textAlign: 'center' }}>
                    Ver memorial →
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
