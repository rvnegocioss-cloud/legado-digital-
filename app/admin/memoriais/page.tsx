'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, obterUsuarioIdAtual } from '@/lib/auth'
import { urlMidiaProtegida } from '@/lib/urlMidia'
import { Button } from '@/components/ui/button'

interface Memorial {
  id: string
  nome_completo: string
  data_nascimento: string | null
  data_falecimento: string | null
  cidade: string | null
  slug: string | null
  qr_code_url: string | null
  created_at: string
  parceiro_id: string | null
  lapide_id: string | null
  criado_por: { nome: string } | null
}

interface Parceiro {
  id: string
  nome_fantasia: string | null
  razao_social: string
}

export default function AdminMemoriais() {
  const [memoriais, setMemoriais] = useState<Memorial[]>([])
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [loading, setLoading] = useState(true)
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const router = useRouter()
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    loadMemoriais()
  }, [])

  async function loadMemoriais() {
    setLoading(true)

    // Rascunho da Central que nunca recebeu nome real (aba fechada sem
    // salvar) some depois de 2h -- mesma regra do Portal do Parceiro.
    const duasHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('homenagens')
      .delete()
      .is('parceiro_id', null)
      .like('slug', 'rascunho-%')
      .eq('nome_completo', 'Novo memorial')
      .lt('created_at', duasHorasAtras)

    const { data } = await supabase
      .from('homenagens')
      .select('id, nome_completo, data_nascimento, data_falecimento, cidade, slug, qr_code_url, created_at, parceiro_id, lapide_id, criado_por:criado_por_usuario_id(nome)')
      .order('created_at', { ascending: false })
    if (data) setMemoriais(data as unknown as Memorial[])

    const { data: parceirosData } = await supabase
      .from('parceiros_b2b')
      .select('id, nome_fantasia, razao_social')
      .order('razao_social')
    if (parceirosData) setParceiros(parceirosData)

    setLoading(false)
  }

  // "+ Novo Memorial" cria o rascunho na hora e abre direto a ficha completa
  // em abas -- a mesma do Portal do Parceiro (2026-09-16). A janela curta de
  // cadastro que existia aqui saiu. Slug definitivo nasce no primeiro save
  // com nome real (FichaMemorial).
  async function novoMemorial() {
    setCriando(true)
    setErro('')
    const id = crypto.randomUUID()
    const slug = `rascunho-${id.slice(0, 8)}`
    const criadoPorUsuarioId = await obterUsuarioIdAtual()
    const { error } = await supabase.from('homenagens').insert({
      id,
      nome_completo: 'Novo memorial',
      slug,
      memorial_slug: slug,
      origem_cadastro: 'central',
      criado_por_usuario_id: criadoPorUsuarioId,
    })
    if (error) {
      setErro(error.message)
      setCriando(false)
      return
    }
    router.push(`/admin/memoriais/${id}`)
  }

  if (loading) {
    return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Memoriais</h1>
        <div className="flex items-center gap-3">
          {erro && <p className="text-red-400 text-sm">{erro}</p>}
          <Button onClick={novoMemorial} disabled={criando}>
            {criando ? 'Criando...' : '+ Novo Memorial'}
          </Button>
        </div>
      </div>

      {/* Duas seções (pedido do Rafael, 2026-09-16, levantado pelo Ricardo na
          reunião de 11/09): todo memorial nasce ONLINE e passa sozinho pra
          JAZIGO quando é vinculado a um jazigo no cemitério. Mesmo cadastro,
          mesma ficha -- o que decide é só ter ou não jazigo (lapide_id). */}
      {memoriais.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--tema-zinc-400)]">Nenhum memorial cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {([
            ['jazigo', 'Memoriais Jazigo', 'Vinculados a um jazigo no cemitério.', memoriais.filter((m) => m.lapide_id)],
            ['online', 'Memoriais Online', 'Ainda sem jazigo — só digitais. Passam pra Jazigo sozinhos quando forem vinculados a um jazigo no cemitério.', memoriais.filter((m) => !m.lapide_id)],
          ] as const).map(([secao, titulo, explicacao, lista]) => (
          <section key={secao}>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-white">
                {titulo} <span className="text-sm font-normal text-[var(--tema-zinc-500)]">({lista.length})</span>
              </h2>
              <p className="text-xs text-[var(--tema-zinc-500)]">{explicacao}</p>
            </div>
            {lista.length === 0 ? (
              <p className="text-sm text-[var(--tema-zinc-500)] rounded-xl border border-[var(--tema-zinc-800)] p-4">Nenhum memorial aqui.</p>
            ) : (
        (() => {
          const parceiroPorId = new Map(parceiros.map((p) => [p.id, p]))
          const grupos = new Map<string, { parceiro: Parceiro | null; memoriais: Memorial[] }>()
          for (const m of lista) {
            const chave = m.parceiro_id || 'sem-parceiro'
            if (!grupos.has(chave)) {
              grupos.set(chave, { parceiro: m.parceiro_id ? parceiroPorId.get(m.parceiro_id) || null : null, memoriais: [] })
            }
            grupos.get(chave)!.memoriais.push(m)
          }
          const listaGrupos = Array.from(grupos.entries()).sort(([chaveA, a], [chaveB, b]) => {
            if (chaveA === 'sem-parceiro') return 1
            if (chaveB === 'sem-parceiro') return -1
            const nomeA = a.parceiro?.nome_fantasia || a.parceiro?.razao_social || ''
            const nomeB = b.parceiro?.nome_fantasia || b.parceiro?.razao_social || ''
            return nomeA.localeCompare(nomeB)
          })

          return (
            <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] divide-y divide-[var(--tema-zinc-800)]">
              {listaGrupos.map(([chave, grupo]) => {
                const aberto = abertoId === `${secao}-${chave}`
                const nome = grupo.parceiro
                  ? grupo.parceiro.nome_fantasia || grupo.parceiro.razao_social
                  : 'Memoriais Legado Digital (nosso, sem parceiro)'
                return (
                  <div key={chave}>
                    <button
                      onClick={() => setAbertoId(aberto ? null : `${secao}-${chave}`)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--tema-zinc-800)]/40 transition-colors"
                    >
                      <span className="text-white font-medium text-sm">{nome}</span>
                      <span className="text-[var(--tema-zinc-500)] text-xs">
                        {grupo.memoriais.length} memorial{grupo.memoriais.length === 1 ? '' : 'is'} {aberto ? '▲' : '▼'}
                      </span>
                    </button>
                    {aberto && (
                      <div className="px-4 pb-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[var(--tema-zinc-500)] text-xs">
                              <th className="text-left py-2 px-2">Nome</th>
                              <th className="text-left py-2 px-2">Nascimento</th>
                              <th className="text-left py-2 px-2">Falecimento</th>
                              <th className="text-left py-2 px-2">Cidade</th>
                              <th className="text-left py-2 px-2">Criado em</th>
                              <th className="text-left py-2 px-2">Cadastrado por</th>
                              <th className="text-left py-2 px-2">QR Code</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.memoriais.map((m) => (
                              <tr key={m.id} className="border-t border-[var(--tema-zinc-800)]/50">
                                <td className="py-2 px-2 text-white">
                                  <Link href={`/admin/memoriais/${m.id}`} className="hover:text-blue-400 hover:underline">
                                    {m.nome_completo}
                                  </Link>
                                </td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-300)]">{m.data_nascimento || '-'}</td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-300)]">{m.data_falecimento || '-'}</td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-300)]">{m.cidade || '-'}</td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-400)]">
                                  {new Date(m.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="py-2 px-2 text-[var(--tema-zinc-400)]">
                                  {m.criado_por?.nome || '—'}
                                </td>
                                <td className="py-2 px-2">
                                  {m.qr_code_url ? (
                                    <a
                                      href={urlMidiaProtegida(m.qr_code_url) || m.qr_code_url}
                                      download={`qrcode-${m.slug}.png`}
                                      className="text-blue-400 hover:underline text-xs"
                                    >
                                      Baixar
                                    </a>
                                  ) : (
                                    <span className="text-[var(--tema-zinc-500)] text-xs">Sem QR ainda</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()
            )}
          </section>
          ))}
        </div>
      )}
    </div>
  )
}
