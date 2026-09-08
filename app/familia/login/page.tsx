'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { urlMidiaProtegida } from '@/lib/urlMidia'
import FormularioLead from '@/components/public/FormularioLead'

interface Resultado {
  id: string
  nome_completo: string
  cidade: string | null
  foto_url: string | null
  slug: string | null
}

export default function FamiliaLoginPage() {
  const router = useRouter()

  const [nomeBusca, setNomeBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<Resultado[] | null>(null)
  const [selecionado, setSelecionado] = useState<Resultado | null>(null)
  const [senha, setSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')

  const [mostrarEsqueci, setMostrarEsqueci] = useState(false)
  const [emailRecuperacao, setEmailRecuperacao] = useState('')
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false)
  const [msgRecuperacao, setMsgRecuperacao] = useState('')

  async function buscarNome(e: React.FormEvent) {
    e.preventDefault()
    const nome = nomeBusca.trim()
    if (!nome) return
    setBuscando(true)
    setErro('')
    setSelecionado(null)

    const { data } = await supabase.rpc('buscar_homenagens_publicas', { termo: nome })

    setResultados((data || []) as Resultado[])
    setBuscando(false)
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    if (!selecionado?.slug) return
    setEntrando(true)
    setErro('')

    const res = await fetch('/api/familia-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: selecionado.slug, senha }),
    })
    const json = await res.json()

    if (!res.ok || !json.ok) {
      setErro(json.error || 'Não foi possível entrar')
      setEntrando(false)
      return
    }
    router.push(`/familia/${json.slug}`)
  }

  async function enviarRecuperacao(e: React.FormEvent) {
    e.preventDefault()
    if (!selecionado?.slug) return
    setEnviandoRecuperacao(true)
    setMsgRecuperacao('')

    const res = await fetch('/api/familia-esqueci-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: selecionado.slug, email: emailRecuperacao }),
    })
    const json = await res.json()

    setMsgRecuperacao(res.ok ? json.mensagem : json.error || 'Erro ao enviar')
    setEnviandoRecuperacao(false)
  }

  const rotuloLabel = 'block text-[11px] uppercase tracking-[1.6px] text-[#C9A46A] mb-1.5'
  const campoEscuro =
    'w-full px-3.5 py-3 rounded-lg mb-4 text-[15px] bg-white/5 border border-[rgba(201,164,106,0.2)] text-[#F5F2EB] placeholder-[#5c6b76] focus:outline-none focus:border-[#C9A46A]'

  return (
    // Cadastro (metade clara) à esquerda no desktop; no celular o login vem
    // primeiro — por isso row-reverse em vez de trocar a ordem do JSX.
    <div className="min-h-screen flex flex-col lg:flex-row-reverse">
      <div className="flex-1 flex items-center justify-center px-10 py-14 bg-gradient-to-b from-[#0f2436] to-[#0B1D2A]">
        <div className="w-full max-w-[380px]">
          <Image
            src="/logo-legado-digital.svg"
            alt="Legado Digital"
            width={320}
            height={128}
            className="h-[86px] w-auto object-contain mb-6"
            priority
          />
          <h1 className="text-[26px] font-normal text-[#F5F2EB] mb-1.5">Portal da Família</h1>
          <p className="text-sm text-[#7a8a96] mb-7">Adicione fotos, vídeos e a história de quem você ama.</p>

          {!selecionado ? (
            <form onSubmit={buscarNome}>
              <label className={rotuloLabel}>Nome do homenageado</label>
              <input
                type="text"
                placeholder="Nome completo"
                value={nomeBusca}
                onChange={(e) => setNomeBusca(e.target.value)}
                required
                className={campoEscuro}
              />
              <button
                type="submit"
                disabled={buscando}
                className="w-full py-3.5 rounded-lg bg-[#C9A46A] hover:bg-[#dfc08a] disabled:opacity-60 text-[#0B1D2A] text-[15px] font-bold transition-colors"
              >
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>

              {resultados !== null && resultados.length === 0 && (
                <p className="text-[#7a8a96] text-sm mt-3">Nenhum memorial encontrado com esse nome.</p>
              )}

              {resultados && resultados.length > 0 && (
                <div className="space-y-2 pt-4">
                  {resultados.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelecionado(r)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-[rgba(201,164,106,0.2)] hover:border-[#C9A46A] text-left"
                    >
                      {r.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={urlMidiaProtegida(r.foto_url) || r.foto_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/10" />
                      )}
                      <div>
                        <div className="text-sm text-[#F5F2EB]">{r.nome_completo}</div>
                        {r.cidade && <div className="text-xs text-[#7a8a96]">{r.cidade}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={entrar}>
              <button
                type="button"
                onClick={() => { setSelecionado(null); setSenha(''); setErro('') }}
                className="text-xs text-[#7a8a96] hover:text-white mb-3"
              >
                ← Buscar outro nome
              </button>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-[rgba(201,164,106,0.2)] mb-4">
                {selecionado.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlMidiaProtegida(selecionado.foto_url) || selecionado.foto_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/10" />
                )}
                <div className="text-sm text-[#F5F2EB]">{selecionado.nome_completo}</div>
              </div>

              <label className={rotuloLabel}>Senha da família</label>
              <input
                type="text"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoFocus
                className={campoEscuro}
              />
              <p className="-mt-2 mb-4 text-[11px] text-[#5c6b76]">
                A senha foi enviada por e-mail quando o memorial foi cadastrado.
              </p>

              {erro && <p className="text-red-400 text-sm mb-3">{erro}</p>}

              <button
                type="submit"
                disabled={entrando}
                className="w-full py-3.5 rounded-lg bg-[#C9A46A] hover:bg-[#dfc08a] disabled:opacity-60 text-[#0B1D2A] text-[15px] font-bold transition-colors"
              >
                {entrando ? 'Entrando...' : 'Entrar'}
              </button>

              {!mostrarEsqueci ? (
                <button
                  type="button"
                  onClick={() => { setMostrarEsqueci(true); setMsgRecuperacao('') }}
                  className="block w-full text-center mt-3.5 text-[12.5px] text-[#7a8a96] hover:text-white"
                >
                  Esqueci minha senha
                </button>
              ) : (
                <div className="pt-4 mt-4 border-t border-[rgba(201,164,106,0.2)] space-y-2">
                  <p className="text-xs text-[#7a8a96]">
                    Digite o e-mail cadastrado pra esse memorial — se estiver certo, mandamos uma senha nova.
                  </p>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={emailRecuperacao}
                    onChange={(e) => setEmailRecuperacao(e.target.value)}
                    className={campoEscuro}
                  />
                  <button
                    type="button"
                    onClick={enviarRecuperacao}
                    disabled={enviandoRecuperacao || !emailRecuperacao}
                    className="w-full py-3 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-60 text-[#F5F2EB] text-sm font-medium"
                  >
                    {enviandoRecuperacao ? 'Enviando...' : 'Enviar nova senha por e-mail'}
                  </button>
                  {msgRecuperacao && <p className="text-xs text-[#7a8a96]">{msgRecuperacao}</p>}
                </div>
              )}
            </form>
          )}

          <Link href="/" className="block text-center mt-4 text-[12.5px] text-[#7a8a96] hover:text-white">
            Voltar pro site
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-10 py-14 bg-[#F7F5F0]">
        <FormularioLead tipo="familia" />
      </div>
    </div>
  )
}
