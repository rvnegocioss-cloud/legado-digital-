'use client'

import { useEffect, useState } from 'react'
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

  // Entrar digitando nome + senha, sem escolher na lista -- é o caminho de
  // quem escondeu o próprio memorial e por isso não o encontra na busca.
  const [porNome, setPorNome] = useState(false)
  const [mostrarEsqueci, setMostrarEsqueci] = useState(false)
  const [emailRecuperacao, setEmailRecuperacao] = useState('')
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false)
  const [msgRecuperacao, setMsgRecuperacao] = useState('')

  // Busca enquanto digita: a lista vai se formando sozinha a partir da 2ª
  // letra, sem apertar botão nenhum (pedido do Rafael, 2026-09-15). Espera
  // 300ms depois da última tecla pra não disparar uma consulta por caractere.
  useEffect(() => {
    const nome = nomeBusca.trim()
    if (selecionado) return
    if (nome.length < 2) {
      setResultados(null)
      setBuscando(false)
      return
    }

    let cancelado = false
    setBuscando(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc('buscar_homenagens_publicas', { termo: nome })
      // Resposta de uma busca antiga não pode sobrescrever a lista atual --
      // quem digita rápido dispara várias, e elas não voltam em ordem.
      if (cancelado) return
      setResultados((data || []) as Resultado[])
      setBuscando(false)
    }, 300)

    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [nomeBusca, selecionado])

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    if (!selecionado?.slug && !porNome) return
    setEntrando(true)
    setErro('')

    // Memorial escondido não aparece na busca (é o objetivo), então a própria
    // família ficava sem como clicar nele pra entrar. Aqui ela manda o nome
    // junto com a senha, e o servidor confere os dois de uma vez (2026-09-16).
    const res = await fetch('/api/familia-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        selecionado?.slug ? { slug: selecionado.slug, senha } : { nome: nomeBusca, senha }
      ),
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
            <form onSubmit={(e) => e.preventDefault()}>
              <label className={rotuloLabel}>Nome do homenageado</label>
              <input
                type="text"
                placeholder="Comece a digitar o nome"
                value={nomeBusca}
                onChange={(e) => setNomeBusca(e.target.value)}
                autoComplete="off"
                className={campoEscuro}
              />

              {buscando && <p className="text-[#7a8a96] text-sm">Buscando...</p>}

              {/* Memorial escondido não aparece na busca — de propósito. Mas a
                  própria família precisa conseguir entrar, então aqui ela
                  digita a senha direto, sem escolher da lista (2026-09-16). */}
              {!buscando && resultados !== null && resultados.length === 0 && (
                <div className="rounded-lg bg-white/5 border border-[rgba(201,164,106,0.2)] p-3 mt-1">
                  <p className="text-[#7a8a96] text-sm mb-2">
                    Nenhum memorial encontrado com esse nome.
                  </p>
                  <p className="text-[#7a8a96] text-xs mb-3">
                    Se vocês deixaram o memorial escondido, ele não aparece nesta busca. Confira o nome
                    e digite a senha aqui embaixo pra entrar.
                  </p>
                  <form onSubmit={entrar}>
                    <label className={rotuloLabel}>Senha da família</label>
                    <input
                      type="password"
                      value={senha}
                      onChange={(e) => {
                        setSenha(e.target.value)
                        setPorNome(true)
                      }}
                      autoComplete="current-password"
                      className={campoEscuro}
                    />
                    {erro && <p className="text-red-400 text-sm mb-2">{erro}</p>}
                    <button
                      type="submit"
                      disabled={entrando || !senha}
                      className="w-full py-3 rounded-lg bg-[#C9A46A] hover:bg-[#dfc08a] disabled:opacity-60 text-[#0B1D2A] text-[15px] font-bold transition-colors"
                    >
                      {entrando ? 'Entrando...' : 'Entrar'}
                    </button>
                  </form>
                </div>
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

      {/* id="cadastro": destino do "Quero um memorial" do site (menu, seção
          "Como ter o memorial da sua família" e rodapé). Sem essa âncora o
          link caía no topo da tela de login -- a pessoa clicava pra pedir um
          memorial e encontrava um campo de senha. Achado ao auditar os
          caminhos em 2026-09-23. */}
      <div
        id="cadastro"
        className="flex-1 flex items-center justify-center px-10 py-14 bg-[#F7F5F0] scroll-mt-4"
      >
        <FormularioLead tipo="familia" />
      </div>
    </div>
  )
}
