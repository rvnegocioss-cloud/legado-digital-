'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Copy, ExternalLink, Play, X } from 'lucide-react'
import { supabase, getParceiroUser, getAdminUser } from '@/lib/auth'
import { urlMidiaProtegida } from '@/lib/urlMidia'
import {
  LIMITE_FRASE,
  PEDIDO_CAPA_IA,
  REGRAS_IMAGEM,
  validarDimensoes,
  validarPeso,
  type TipoImagemParceiro,
} from '@/lib/paginaParceiro'

// "Minha página" do Portal do Parceiro (wireframe A aprovado pelo Rafael em
// 2026-10-09: abas + prévia fixa ao lado).
//
// Aqui o parceiro monta a marca dele -- logo, capa, frase e contato -- que vale
// pros dois modos: a página pública (/parceiros/[slug]) e a apresentação guiada
// (/apresentacao/[slug]). Regra que o Rafael cobrou: TEM QUE CABER NA TELA, sem
// rolar. Por isso os campos são divididos em abas curtas e os três botões de
// uso diário ficam fixos no alto.
//
// Substitui a antiga aba "Página Pública" do Dashboard, que ficava escondida no
// fim da tela e só tinha logo e descrição.

const CAPA_PADRAO = '/parceiro-pagina/capa-padrao.jpg'

interface Parceiro {
  id: string
  nome_fantasia: string | null
  razao_social: string
  slug: string | null
  cidade: string | null
  estado: string | null
  logo_url: string | null
  capa_url: string | null
  descricao_publica: string | null
  whatsapp_publico: string | null
  telefone_publico: string | null
  endereco_publico: string | null
}

type Aba = 'imagens' | 'textos' | 'contato' | 'site'

const ABAS: [Aba, string][] = [
  ['imagens', 'Logo e capa'],
  ['textos', 'Textos'],
  ['contato', 'Contato'],
  ['site', 'No seu site'],
]

async function token() {
  return (await supabase.auth.getSession()).data.session?.access_token || ''
}

function medirImagem(arquivo: File): Promise<{ largura: number; altura: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const img = new window.Image()
    img.onload = () => {
      resolve({ largura: img.naturalWidth, altura: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      reject(new Error('Não foi possível ler essa imagem.'))
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

const campo =
  'flex w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2 text-sm text-white placeholder-[var(--tema-zinc-500)]'
const rotulo = 'block text-xs font-medium text-[var(--tema-zinc-400)] mb-1.5'
const botaoVazado =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--tema-zinc-700)] text-sm text-[var(--tema-zinc-300)] hover:text-white hover:border-[var(--tema-zinc-500)] disabled:opacity-50'

export default function MinhaPagina() {
  return (
    <Suspense fallback={<p className="text-[var(--tema-zinc-400)]">Carregando...</p>}>
      <MinhaPaginaInner />
    </Suspense>
  )
}

function MinhaPaginaInner() {
  const parceiroIdParam = useSearchParams().get('parceiro_id')

  const [p, setP] = useState<Parceiro | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<Aba>('imagens')

  const [frase, setFrase] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')

  const [enviando, setEnviando] = useState<TipoImagemParceiro | null>(null)
  const [erroImagem, setErroImagem] = useState<Partial<Record<TipoImagemParceiro, string>>>({})
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [copiado, setCopiado] = useState('')

  const inputLogo = useRef<HTMLInputElement | null>(null)
  const inputCapa = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parceiroIdParam])

  async function carregar() {
    setCarregando(true)
    // ?parceiro_id= só vale pra staff de verdade (mesma regra do Dashboard):
    // sem isso um parceiro editaria a URL e abriria a página de outra empresa.
    let id: string | null = null
    if (parceiroIdParam && (await getAdminUser())) id = parceiroIdParam
    if (!id) {
      const u = (await getParceiroUser()) as any
      id = u?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }
    if (!id) {
      setCarregando(false)
      return
    }
    const { data } = await supabase
      .from('parceiros_b2b')
      .select(
        'id, nome_fantasia, razao_social, slug, cidade, estado, logo_url, capa_url, descricao_publica, whatsapp_publico, telefone_publico, endereco_publico'
      )
      .eq('id', id)
      .single()
    if (data) {
      setP(data as Parceiro)
      setFrase(data.descricao_publica || '')
      setWhatsapp(data.whatsapp_publico || '')
      setTelefone(data.telefone_publico || '')
      setEndereco(data.endereco_publico || '')
    }
    setCarregando(false)
  }

  async function enviarImagem(tipo: TipoImagemParceiro, arquivo: File | undefined) {
    if (!arquivo || !p) return
    const regra = REGRAS_IMAGEM[tipo]
    setErroImagem((e) => ({ ...e, [tipo]: '' }))
    setEnviando(tipo)
    try {
      // Confere no navegador primeiro, pra recusar na hora sem gastar o envio.
      // O servidor confere de novo nos bytes do arquivo.
      if (!regra.mimes.includes(arquivo.type)) {
        throw new Error(`Formato não aceito. ${regra.rotulo} precisa ser ${regra.mimes.map((m) => m.replace('image/', '').toUpperCase()).join(', ')}.`)
      }
      const pesado = validarPeso(tipo, arquivo.size)
      if (pesado) throw new Error(pesado)
      const { largura, altura } = await medirImagem(arquivo)
      const fora = validarDimensoes(tipo, largura, altura)
      if (fora) throw new Error(fora)

      const cabecalho = { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }
      const prep = await fetch('/api/parceiro-pagina/imagem', {
        method: 'POST',
        headers: cabecalho,
        body: JSON.stringify({ etapa: 'preparar', parceiroId: p.id, tipo, tamanho: arquivo.size, mime: arquivo.type }),
      })
      const prepJson = await prep.json()
      if (!prep.ok) throw new Error(prepJson.error || 'Não foi possível preparar o envio')

      const { error: erroEnvio } = await supabase.storage
        .from('memoriais')
        .uploadToSignedUrl(prepJson.caminho, prepJson.token, arquivo)
      if (erroEnvio) throw new Error(erroEnvio.message)

      const conf = await fetch('/api/parceiro-pagina/imagem', {
        method: 'POST',
        headers: cabecalho,
        body: JSON.stringify({ etapa: 'confirmar', parceiroId: p.id, tipo, caminho: prepJson.caminho }),
      })
      const confJson = await conf.json()
      if (!conf.ok) throw new Error(confJson.error || 'A imagem foi recusada')

      setP((atual) => (atual ? { ...atual, [regra.coluna]: confJson.url } : atual))
    } catch (err: any) {
      setErroImagem((e) => ({ ...e, [tipo]: err.message || 'Erro ao enviar a imagem' }))
    }
    setEnviando(null)
    if (inputLogo.current) inputLogo.current.value = ''
    if (inputCapa.current) inputCapa.current.value = ''
  }

  async function removerImagem(tipo: TipoImagemParceiro) {
    if (!p) return
    setEnviando(tipo)
    const res = await fetch('/api/remover-arquivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ recurso: tipo === 'logo' ? 'logo_parceiro' : 'capa_parceiro', id: p.id }),
    })
    if (res.ok) setP((atual) => (atual ? { ...atual, [REGRAS_IMAGEM[tipo].coluna]: null } : atual))
    else setErroImagem((e) => ({ ...e, [tipo]: 'Não foi possível remover a imagem.' }))
    setEnviando(null)
  }

  async function salvar() {
    if (!p) return
    setSalvando(true)
    setAviso(null)
    const res = await fetch('/api/parceiro-pagina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ parceiroId: p.id, frase, whatsapp, telefone, endereco }),
    })
    const json = await res.json()
    if (res.ok) {
      setP((atual) => (atual ? { ...atual, slug: json.slug, descricao_publica: frase, whatsapp_publico: whatsapp, telefone_publico: telefone, endereco_publico: endereco } : atual))
      setAviso({ tipo: 'ok', texto: 'Salvo.' })
    } else {
      setAviso({ tipo: 'erro', texto: json.error || 'Não foi possível salvar.' })
    }
    setSalvando(false)
  }

  function copiar(chave: string, texto: string) {
    navigator.clipboard?.writeText(texto)
    setCopiado(chave)
    setTimeout(() => setCopiado(''), 1800)
  }

  if (carregando) return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>
  if (!p) return <p className="text-[var(--tema-zinc-400)]">Parceiro não encontrado.</p>

  const nome = p.nome_fantasia || p.razao_social
  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const enderecoPagina = p.slug ? `${origem}/parceiros/${p.slug}` : ''
  const enderecoApresentacao = p.slug ? `${origem}/apresentacao/${p.slug}` : ''
  const logo = urlMidiaProtegida(p.logo_url)
  const capa = urlMidiaProtegida(p.capa_url)
  const local = [p.cidade, p.estado].filter(Boolean).join(' — ')

  const itens: [string, boolean][] = [
    ['Logo', !!p.logo_url],
    ['Capa', !!p.capa_url],
    ['Frase', !!frase.trim()],
    ['WhatsApp', !!whatsapp.trim()],
  ]
  const faltando = itens.filter(([, ok]) => !ok).map(([n]) => n)

  function blocoImagem(tipo: TipoImagemParceiro) {
    const r = REGRAS_IMAGEM[tipo]
    const atual = tipo === 'logo' ? logo : capa
    const ocupado = enviando === tipo
    return (
      <div>
        <label className={rotulo}>
          {tipo === 'logo' ? 'Logo' : 'Foto de capa'}
        </label>
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--tema-zinc-700)] p-3">
          {tipo === 'logo' ? (
            <span className="h-14 w-14 shrink-0 rounded-full bg-white p-1.5 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {atual ? <img src={atual} alt="Logo atual" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-zinc-400">sem logo</span>}
            </span>
          ) : (
            <span
              className="h-12 w-36 shrink-0 rounded-md bg-[var(--tema-zinc-800)] bg-cover bg-center flex items-center justify-center text-[10px] text-[var(--tema-zinc-500)]"
              style={atual ? { backgroundImage: `url(${atual})` } : undefined}
            >
              {!atual && 'capa padrão'}
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={botaoVazado} disabled={ocupado} onClick={() => (tipo === 'logo' ? inputLogo : inputCapa).current?.click()}>
              {ocupado ? 'Enviando...' : atual ? `Trocar ${tipo}` : `Enviar ${tipo}`}
            </button>
            {atual && (
              <button type="button" className="text-xs text-[var(--tema-zinc-500)] hover:text-red-400" disabled={ocupado} onClick={() => removerImagem(tipo)}>
                Remover
              </button>
            )}
          </div>
          <input
            ref={tipo === 'logo' ? inputLogo : inputCapa}
            type="file"
            accept={r.mimes.join(',')}
            className="hidden"
            onChange={(e) => enviarImagem(tipo, e.target.files?.[0])}
          />
        </div>
        <p className="mt-1.5 text-xs text-[var(--tema-zinc-500)]">
          {tipo === 'logo' ? (
            <>PNG com <b className="text-[#dfc08a]">fundo transparente</b>, quadrada, mínimo <b className="text-[#dfc08a]">{r.larguraMinima} × {r.alturaMinima} px</b>, até 2 MB.</>
          ) : (
            <>Tamanho certo <b className="text-[#dfc08a]">{r.larguraIdeal} × {r.alturaIdeal} px</b>. Mínimo aceito <b className="text-[#dfc08a]">{r.larguraMinima} × {r.alturaMinima} px</b>. Até 5 MB, sem texto na imagem. Imagem menor é recusada.</>
          )}
        </p>
        {erroImagem[tipo] && (
          <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-xs text-red-300">{erroImagem[tipo]}</p>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* ---- cabeçalho: os três usos do dia a dia, sempre à vista ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Minha página</h1>
          <p className="text-xs text-[var(--tema-zinc-500)]">
            {enderecoPagina ? enderecoPagina.replace(/^https?:\/\//, '') : 'Salve uma vez pra criar o endereço da sua página.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={enderecoApresentacao || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!p.slug}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#C9A46A] text-[#1a1408] hover:bg-[#dfc08a] ${p.slug ? '' : 'pointer-events-none opacity-50'}`}
          >
            <Play size={15} strokeWidth={1.5} /> Apresentar para a família
          </a>
          <a href={enderecoPagina || undefined} target="_blank" rel="noopener noreferrer" className={`${botaoVazado} ${p.slug ? '' : 'pointer-events-none opacity-50'}`}>
            <ExternalLink size={15} strokeWidth={1.5} /> Ver página pública
          </a>
          <button type="button" className={botaoVazado} disabled={!p.slug} onClick={() => copiar('link', enderecoPagina)}>
            {copiado === 'link' ? <Check size={15} strokeWidth={1.5} /> : <Copy size={15} strokeWidth={1.5} />} {copiado === 'link' ? 'Copiado' : 'Copiar link'}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3 items-start">
        {/* ---- edição em abas ---- */}
        <div className="lg:col-span-2 rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)]">
          <nav className="flex flex-wrap gap-1 border-b border-[var(--tema-zinc-800)] px-4">
            {ABAS.map(([id, texto]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAba(id)}
                className={`px-3 py-3 text-sm border-b-2 -mb-px transition-colors ${
                  aba === id ? 'border-[#C9A46A] text-white font-medium' : 'border-transparent text-[var(--tema-zinc-400)] hover:text-white'
                }`}
              >
                {texto}
              </button>
            ))}
          </nav>

          <div className="p-5">
            {aba === 'imagens' && (
              <div className="space-y-4">
                <div className="grid gap-5 md:grid-cols-2">
                  {blocoImagem('logo')}
                  {blocoImagem('capa')}
                </div>
                <div className="rounded-lg border border-[var(--tema-zinc-800)] bg-[var(--tema-zinc-950)]/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-[var(--tema-zinc-300)]">
                      <b className="text-white">Não tem uma capa pronta?</b> Peça a um gerador de imagens, como o ChatGPT.
                    </p>
                    <button type="button" className={`${botaoVazado} shrink-0`} onClick={() => copiar('pedido', PEDIDO_CAPA_IA)}>
                      {copiado === 'pedido' ? <Check size={15} strokeWidth={1.5} /> : <Copy size={15} strokeWidth={1.5} />} {copiado === 'pedido' ? 'Copiado' : 'Copiar pedido'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--tema-zinc-500)]">{PEDIDO_CAPA_IA}</p>
                </div>
              </div>
            )}

            {aba === 'textos' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className={rotulo}>Nome que aparece na página</label>
                  <input className={`${campo} opacity-70`} value={nome} disabled readOnly />
                  <p className="mt-1.5 text-xs text-[var(--tema-zinc-500)]">É o nome fantasia do cadastro. Pra mudar, fale com a equipe do Legado Digital.</p>
                </div>
                <div>
                  <label className={rotulo} htmlFor="frase">
                    Frase de apresentação ({frase.length}/{LIMITE_FRASE})
                  </label>
                  <textarea id="frase" rows={2} maxLength={LIMITE_FRASE} className={campo} value={frase} onChange={(e) => setFrase(e.target.value)} placeholder="Ex.: Há 38 anos cuidando das famílias da nossa cidade com respeito e presença." />
                  <p className="mt-1.5 text-xs text-[var(--tema-zinc-500)]">Aparece embaixo do nome, em cima da capa.</p>
                </div>
              </div>
            )}

            {aba === 'contato' && (
              <div className="space-y-4 max-w-2xl">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={rotulo} htmlFor="whats">WhatsApp (com DDD)</label>
                    <input id="whats" className={campo} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
                  </div>
                  <div>
                    <label className={rotulo} htmlFor="tel">Telefone (com DDD)</label>
                    <input id="tel" className={campo} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 0000-0000" inputMode="tel" />
                  </div>
                </div>
                <div>
                  <label className={rotulo} htmlFor="end">Endereço</label>
                  <input id="end" className={campo} value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número — bairro, cidade" />
                </div>
                <p className="text-xs text-[var(--tema-zinc-500)]">Aparecem no bloco “Fale com {nome}”, no fim da página, e no último passo da apresentação. Campo vazio não aparece.</p>
              </div>
            )}

            {aba === 'site' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-[var(--tema-zinc-800)] p-3">
                  <p className="text-sm font-medium text-white">Botão no seu site</p>
                  <p className="mt-1 text-xs text-[var(--tema-zinc-500)]">
                    Coloque um botão “Memorial Digital” no site da sua empresa apontando pra sua página. Funciona hoje, em qualquer site. Mande o código abaixo pra quem cuida do seu site.
                  </p>
                  <code className="mt-2 block break-all rounded bg-[var(--tema-zinc-950)]/60 p-2 text-[11px] text-[var(--tema-zinc-300)]">
                    {`<a href="${enderecoPagina || 'salve a página primeiro'}">Memorial Digital</a>`}
                  </code>
                  <button type="button" className={`${botaoVazado} mt-2`} disabled={!p.slug} onClick={() => copiar('codigo', `<a href="${enderecoPagina}">Memorial Digital</a>`)}>
                    {copiado === 'codigo' ? <Check size={15} strokeWidth={1.5} /> : <Copy size={15} strokeWidth={1.5} />} {copiado === 'codigo' ? 'Copiado' : 'Copiar código'}
                  </button>
                </div>
                <div className="rounded-lg border border-[#C9A46A]/30 bg-[#C9A46A]/5 p-3">
                  <p className="text-sm font-medium text-white">
                    Endereço com o nome da sua empresa <span className="ml-1 rounded-full border border-[#C9A46A]/40 px-2 py-0.5 text-[10px] font-normal text-[#dfc08a]">sob consulta</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--tema-zinc-400)]">
                    Sua página pode abrir num endereço seu, por exemplo <b className="text-[#dfc08a]">memorial.suaempresa.com.br</b>, em vez de legadodigital.net. A família vê o seu endereço do começo ao fim.
                  </p>
                  <p className="mt-2 text-xs text-[var(--tema-zinc-500)]">
                    Precisa de um ajuste no domínio da sua empresa, feito junto com a equipe do Legado Digital. Ainda não é automático.
                  </p>
                  <a href={`mailto:contato@legadodigital.net?subject=${encodeURIComponent('Endereço próprio para a página — ' + nome)}`} className={`${botaoVazado} mt-2`}>
                    Pedir pelo e-mail contato@legadodigital.net
                  </a>
                </div>
              </div>
            )}

            {(aba === 'textos' || aba === 'contato') && (
              <div className="mt-5 flex items-center gap-3 border-t border-[var(--tema-zinc-800)] pt-4">
                <button type="button" onClick={salvar} disabled={salvando} className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#C9A46A] text-[#1a1408] hover:bg-[#dfc08a] disabled:opacity-60">
                  {salvando ? 'Salvando...' : 'Salvar minha página'}
                </button>
                {aviso && <span className={`text-sm ${aviso.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{aviso.texto}</span>}
              </div>
            )}
            {aba === 'imagens' && (
              <p className="mt-4 border-t border-[var(--tema-zinc-800)] pt-3 text-xs text-[var(--tema-zinc-500)]">
                Logo e capa são gravadas na hora em que a imagem é aceita. Não precisa salvar.
              </p>
            )}
          </div>
        </div>

        {/* ---- prévia fixa ---- */}
        <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-4">
          <h2 className="text-sm font-medium text-white mb-3">Prévia — como a família vê</h2>
          <div className="overflow-hidden rounded-lg border border-[var(--tema-zinc-800)]">
            <div className="relative flex h-40 flex-col items-center justify-center bg-cover bg-center px-3 text-center" style={{ backgroundImage: `url(${capa || CAPA_PADRAO})` }}>
              <div className="absolute inset-0 bg-[#081722]/60" />
              {logo && (
                <span className="relative mb-1.5 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white p-1 ring-2 ring-[#C9A46A]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" className="max-h-full max-w-full object-contain" />
                </span>
              )}
              <span className="relative text-[9px] uppercase tracking-widest text-[#dfc08a]">Sob os cuidados de</span>
              <b className="relative font-normal text-[17px] leading-tight text-[#F5F2EB]" style={{ fontFamily: 'var(--font-serif), serif' }}>{nome}</b>
              <span className="relative mt-0.5 line-clamp-2 text-[10.5px] text-[#dfe5e8]">{[local, frase].filter(Boolean).join(' · ')}</span>
            </div>
            <div className="bg-[#132734] px-3 py-2.5">
              <div className="h-2 w-2/3 rounded bg-white/10" />
              <div className="mt-1.5 h-2 rounded bg-white/10" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {itens.map(([n, ok]) => (
              <span key={n} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${ok ? 'border-green-500/30 text-green-400' : 'border-red-500/40 text-red-300'}`}>
                {ok ? <Check size={12} strokeWidth={1.5} /> : <X size={12} strokeWidth={1.5} />} {n}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--tema-zinc-500)]">
            {faltando.length ? `Falta: ${faltando.join(', ').toLowerCase()}.` : 'Sua página está completa.'}
            {!p.capa_url && ' Sem capa enviada, a página usa uma imagem padrão.'}
          </p>
        </div>
      </div>
    </div>
  )
}
