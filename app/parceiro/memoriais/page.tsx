'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, getParceiroUser, getAdminUser } from '@/lib/auth'
import { gerarQrCodeCliente } from '@/lib/gerarQrCode'
import { gerarSlugUnico } from '@/lib/gerarSlug'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Memorial {
  id: string
  nome_completo: string
  cidade: string | null
  slug: string | null
  qr_code_url: string | null
  preenchido_por: 'funeraria' | 'familia' | null
  created_at: string
}

const FORM_INICIAL = {
  nome_completo: '',
  data_falecimento: '',
  familia_email: '',
  preenchido_por: 'familia' as 'familia' | 'funeraria',
}

const PREENCHIDO_POR_LABEL: Record<string, string> = {
  familia: 'Família',
  funeraria: 'Funerária',
}

export default function ParceiroMemoriais() {
  return (
    <Suspense fallback={<p className="text-zinc-400">Carregando...</p>}>
      <ParceiroMemoriaisInner />
    </Suspense>
  )
}

function ParceiroMemoriaisInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')
  const suffix = parceiroIdParam ? `?parceiro_id=${parceiroIdParam}` : ''

  const [memoriais, setMemoriais] = useState<Memorial[]>([])
  const [parceiroId, setParceiroId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    load()
  }, [parceiroIdParam])

  async function load() {
    setLoading(true)

    // ?parceiro_id= na URL só vale se quem está logado é staff de verdade
    // (veio do botão "Acessar Plataforma do Parceiro" na Central) — sem essa
    // checagem, um parceiro comum poderia editar a URL e ver memoriais de
    // outra empresa, ja que a leitura de homenagens e publica no banco.
    let meuParceiroId: string | null = null
    if (parceiroIdParam) {
      const adminUser = await getAdminUser()
      if (adminUser) meuParceiroId = parceiroIdParam
    }
    if (!meuParceiroId) {
      const parceiroUser = (await getParceiroUser()) as any
      meuParceiroId = parceiroUser?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }
    setParceiroId(meuParceiroId)

    if (!meuParceiroId) {
      // Sem parceiro vinculado: nunca roda a consulta sem filtro (RLS de leitura
      // pública em homenagens é aberta pra página do memorial funcionar, então
      // sem esse corte a consulta abaixo devolveria memoriais de todo mundo).
      setMemoriais([])
      setLoading(false)
      return
    }

    // Limpa rascunhos abandonados de versões antigas do cadastro (aba fechada
    // sem salvar) com mais de 2h — ficam públicos pra sempre se ninguém limpar.
    const duasHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('homenagens')
      .delete()
      .eq('parceiro_id', meuParceiroId)
      .like('slug', 'rascunho-%')
      .lt('created_at', duasHorasAtras)

    const { data } = await supabase
      .from('homenagens')
      .select('id, nome_completo, cidade, slug, qr_code_url, preenchido_por, created_at')
      .eq('parceiro_id', meuParceiroId)
      .order('created_at', { ascending: false })

    setMemoriais(data || [])
    setLoading(false)
  }

  function abrirCadastro() {
    setForm(FORM_INICIAL)
    setErro('')
    setDialogAberto(true)
  }

  async function salvarCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!parceiroId) return
    setSalvando(true)
    setErro('')

    const slug = await gerarSlugUnico(supabase, form.nome_completo)
    const { data: novo, error } = await supabase
      .from('homenagens')
      .insert({
        nome_completo: form.nome_completo,
        data_falecimento: form.data_falecimento || null,
        slug,
        memorial_slug: slug,
        parceiro_id: parceiroId,
        preenchido_por: form.preenchido_por,
      })
      .select('id')
      .single()

    if (error || !novo) {
      setErro(error?.message || 'Erro ao cadastrar memorial')
      setSalvando(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const resEmail = await fetch('/api/admin/cadastrar-email-familia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ memorialId: novo.id, email: form.familia_email }),
    })
    const jsonEmail = await resEmail.json()

    gerarQrCodeCliente(novo.id)

    setSalvando(false)
    setDialogAberto(false)

    if (form.preenchido_por === 'funeraria') {
      router.push(`/parceiro/memoriais/${novo.id}${suffix}`)
      return
    }

    if (!resEmail.ok) {
      setErro(`Memorial cadastrado, mas o e-mail da família falhou: ${jsonEmail.error || 'erro desconhecido'}`)
    }
    load()
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Meus Memoriais</h1>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger render={<Button onClick={abrirCadastro}>+ Novo Memorial</Button>} />
          <DialogContent className="bg-zinc-900 text-white ring-zinc-800 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Cadastrar Memorial</DialogTitle>
            </DialogHeader>

            <form onSubmit={salvarCadastro} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Nome completo</label>
                <Input
                  placeholder="Nome completo do falecido"
                  required
                  value={form.nome_completo}
                  onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Data de falecimento</label>
                <Input
                  placeholder="DD/MM/AAAA"
                  value={form.data_falecimento}
                  onChange={(e) => setForm({ ...form, data_falecimento: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">E-mail da família</label>
                <p className="text-xs text-zinc-400 mb-2">
                  Recebe agora mesmo a senha de acesso pra entrar em /familia/login e cuidar do memorial.
                </p>
                <Input
                  type="email"
                  placeholder="email@familia.com"
                  required
                  value={form.familia_email}
                  onChange={(e) => setForm({ ...form, familia_email: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-2">Quem vai preencher o conteúdo?</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="radio"
                      name="preenchido_por"
                      checked={form.preenchido_por === 'familia'}
                      onChange={() => setForm({ ...form, preenchido_por: 'familia' })}
                    />
                    A família vai preencher (fotos, história, etc.)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="radio"
                      name="preenchido_por"
                      checked={form.preenchido_por === 'funeraria'}
                      onChange={() => setForm({ ...form, preenchido_por: 'funeraria' })}
                    />
                    Nós (a funerária) vamos preencher agora
                  </label>
                </div>
              </div>

              {erro && <p className="text-red-400 text-sm">{erro}</p>}

              <DialogFooter className="bg-transparent border-zinc-800 mt-4">
                <Button type="submit" disabled={salvando}>
                  {salvando ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {erro && !dialogAberto && <p className="text-red-400 text-sm mb-4">{erro}</p>}

      {memoriais.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Nenhum memorial cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Cidade</th>
                <th className="text-left py-3 px-4">Conteúdo por</th>
                <th className="text-left py-3 px-4">Criado em</th>
                <th className="text-left py-3 px-4"></th>
                <th className="text-left py-3 px-4"></th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {memoriais.map((m) => (
                <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{m.nome_completo}</td>
                  <td className="py-3 px-4 text-zinc-300">{m.cidade || '-'}</td>
                  <td className="py-3 px-4 text-zinc-400">
                    {m.preenchido_por ? PREENCHIDO_POR_LABEL[m.preenchido_por] : '—'}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4">
                    {m.slug && (
                      <a
                        href={`/homenagem/${m.slug}`}
                        className="text-blue-400 hover:underline text-xs"
                      >
                        Ver página
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {m.qr_code_url && (
                      <a
                        href={m.qr_code_url}
                        download={`qrcode-${m.slug}.png`}
                        className="text-blue-400 hover:underline text-xs"
                      >
                        Baixar QR Code
                      </a>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <a
                      href={`/parceiro/memoriais/${m.id}${suffix}`}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      Editar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
