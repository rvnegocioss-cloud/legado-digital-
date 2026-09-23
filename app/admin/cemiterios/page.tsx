'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { supabase } from '@/lib/auth'
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
import 'leaflet/dist/leaflet.css'

// Leaflet acessa `window`, então não pode ser renderizado no servidor
const CemiterioMapPicker = dynamic(() => import('@/components/CemiterioMapPicker'), {
  ssr: false,
  loading: () => <div className="h-[280px] rounded-md bg-[var(--tema-zinc-800)] animate-pulse" />,
})

// Contato publico do cemiterio. O rotulo diz DE QUEM e o numero: o WhatsApp que
// existe pode ser o da Prefeitura, e a pagina publica precisa dizer isso em vez
// de fingir que e o do proprio cemiterio.
interface ContatoCemiterio {
  rotulo: string
  tipo: 'telefone' | 'whatsapp'
  valor: string
}

interface Cemiterio {
  id: string
  nome: string
  tipo: string
  endereco: string | null
  bairro: string | null
  horario_visitacao: string | null
  descricao_publica: string | null
  site_url: string | null
  servicos: string[] | null
  contatos: ContatoCemiterio[] | null
  informacoes_fonte: string | null
  cidade: string | null
  estado: string | null
  latitude: number | null
  longitude: number | null
  ativo: boolean
  publico: boolean
  created_at: string
}

const FORM_INICIAL = {
  nome: '',
  tipo: 'cemiterio',
  endereco: '',
  bairro: '',
  horario_visitacao: '',
  descricao_publica: '',
  site_url: '',
  servicosTexto: '',
  contatos: [] as ContatoCemiterio[],
  informacoes_fonte: '',
  cidade: '',
  estado: '',
  latitude: null as number | null,
  longitude: null as number | null,
}

export default function AdminCemiterios() {
  const [cemiterios, setCemiterios] = useState<Cemiterio[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [editando, setEditando] = useState<Cemiterio | null>(null)
  const [form, setForm] = useState(FORM_INICIAL)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    loadCemiterios()
  }, [])

  async function loadCemiterios() {
    setLoading(true)
    const { data } = await supabase
      .from('cemiterios')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setCemiterios(data)
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_INICIAL)
    setErro('')
    setDialogAberto(true)
  }

  function abrirEdicao(c: Cemiterio) {
    setEditando(c)
    setForm({
      nome: c.nome,
      tipo: c.tipo,
      endereco: c.endereco || '',
      bairro: c.bairro || '',
      horario_visitacao: c.horario_visitacao || '',
      descricao_publica: c.descricao_publica || '',
      site_url: c.site_url || '',
      servicosTexto: (c.servicos || []).join('\n'),
      contatos: c.contatos || [],
      informacoes_fonte: c.informacoes_fonte || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
      latitude: c.latitude,
      longitude: c.longitude,
    })
    setErro('')
    setDialogAberto(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()

    if (form.latitude == null || form.longitude == null) {
      setErro('Marque a localização no mapa antes de salvar.')
      return
    }

    setSalvando(true)
    setErro('')

    const { servicosTexto, ...resto } = form
    const vazio = (t: string) => (t.trim() === '' ? null : t.trim())
    const contatos = form.contatos
      .map((c) => ({ ...c, rotulo: c.rotulo.trim(), valor: c.valor.trim() }))
      .filter((c) => c.valor !== '')
    const servicos = servicosTexto
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const temInformacao =
      contatos.length > 0 || servicos.length > 0 || !!vazio(form.horario_visitacao) || !!vazio(form.descricao_publica)
    const payload = {
      ...resto,
      bairro: vazio(form.bairro),
      horario_visitacao: vazio(form.horario_visitacao),
      descricao_publica: vazio(form.descricao_publica),
      site_url: vazio(form.site_url),
      informacoes_fonte: vazio(form.informacoes_fonte),
      servicos: servicos.length ? servicos : null,
      contatos,
      informacoes_atualizadas_em: temInformacao ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    }

    const { error } = editando
      ? await supabase.from('cemiterios').update(payload).eq('id', editando.id)
      : await supabase.from('cemiterios').insert(payload)

    if (error) {
      setErro(error.message)
      setSalvando(false)
      return
    }

    setSalvando(false)
    setDialogAberto(false)
    loadCemiterios()
  }

  async function alternarAtivo(c: Cemiterio) {
    await supabase.from('cemiterios').update({ ativo: !c.ativo }).eq('id', c.id)
    loadCemiterios()
  }

  // Chave de governança do mapa público (/cemiterios) -- só a Central liga,
  // Parceiro só vê o chip de leitura (regra 22).
  async function alternarPublico(c: Cemiterio) {
    await supabase.from('cemiterios').update({ publico: !c.publico }).eq('id', c.id)
    loadCemiterios()
  }

  if (loading) {
    return <p className="text-[var(--tema-zinc-400)]">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Cemitérios</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/mapa/drone"
            className="px-3 py-1.5 rounded-lg border border-[var(--tema-zinc-700)] text-[var(--tema-zinc-300)] hover:text-white hover:border-[var(--tema-zinc-500)] text-sm font-medium whitespace-nowrap"
          >
            Instalação Drone
          </Link>
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogTrigger render={<Button onClick={abrirNovo}>+ Novo Cemitério</Button>} />
          <DialogContent className="bg-[var(--tema-zinc-900)] text-white ring-[var(--tema-zinc-800)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editando ? 'Editar Cemitério' : 'Novo Cemitério'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={salvar} className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Nome</label>
                <Input
                  placeholder="Nome do cemitério ou crematório"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-[var(--tema-zinc-700)] bg-[var(--tema-zinc-800)] px-3 py-2 text-sm text-white"
                >
                  <option value="cemiterio">Cemitério</option>
                  <option value="crematorio">Crematório</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Endereço</label>
                <Input
                  placeholder="Rua, número, bairro"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Cidade</label>
                  <Input
                    placeholder="Cidade"
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">UF</label>
                  <Input
                    placeholder="UF"
                    maxLength={2}
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                    className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white w-20"
                  />
                </div>
              </div>

              {/* Informacoes que aparecem na pagina PUBLICA do cemiterio, ao lado do
                  botao "Caminho ate o cemiterio". Campo em branco nao aparece. */}
              <div className="pt-2 border-t border-[var(--tema-zinc-800)]">
                <p className="text-sm font-medium text-[var(--tema-zinc-300)]">Informações na página pública</p>
                <p className="text-xs text-[var(--tema-zinc-500)] mt-0.5">
                  Aparecem em /cemiterios, ao lado do botão de rota. Deixe em branco o que não souber.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Bairro</label>
                  <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Horário de visitação</label>
                  <Input
                    placeholder="Ex: Todos os dias, das 7h às 17h30"
                    value={form.horario_visitacao}
                    onChange={(e) => setForm({ ...form, horario_visitacao: e.target.value })}
                    className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Sobre o cemitério</label>
                <textarea
                  rows={3}
                  value={form.descricao_publica}
                  onChange={(e) => setForm({ ...form, descricao_publica: e.target.value })}
                  className="w-full rounded-md bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] text-white text-sm p-2"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Serviços (um por linha)</label>
                <textarea
                  rows={3}
                  value={form.servicosTexto}
                  onChange={(e) => setForm({ ...form, servicosTexto: e.target.value })}
                  className="w-full rounded-md bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] text-white text-sm p-2"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Site oficial (link)</label>
                <Input
                  placeholder="https://"
                  value={form.site_url}
                  onChange={(e) => setForm({ ...form, site_url: e.target.value })}
                  className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Contatos</label>
                <p className="text-xs text-[var(--tema-zinc-500)] mb-2">
                  O rótulo diz de quem é o número (ex: &quot;Cemitério&quot;, &quot;WhatsApp da Prefeitura&quot;) — é o que a
                  página pública mostra acima dele.
                </p>
                <div className="space-y-2">
                  {form.contatos.map((ct, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <select
                        value={ct.tipo}
                        onChange={(e) => {
                          const c = [...form.contatos]
                          c[i] = { ...ct, tipo: e.target.value as 'telefone' | 'whatsapp' }
                          setForm({ ...form, contatos: c })
                        }}
                        className="rounded-md bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] text-white text-sm p-2"
                      >
                        <option value="telefone">Telefone</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                      <Input
                        placeholder="Rótulo"
                        value={ct.rotulo}
                        onChange={(e) => {
                          const c = [...form.contatos]
                          c[i] = { ...ct, rotulo: e.target.value }
                          setForm({ ...form, contatos: c })
                        }}
                        className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white flex-1"
                      />
                      <Input
                        placeholder="(34) 3000-0000"
                        value={ct.valor}
                        onChange={(e) => {
                          const c = [...form.contatos]
                          c[i] = { ...ct, valor: e.target.value }
                          setForm({ ...form, contatos: c })
                        }}
                        className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white w-40"
                      />
                      <button
                        type="button"
                        aria-label="Remover contato"
                        onClick={() => setForm({ ...form, contatos: form.contatos.filter((_, k) => k !== i) })}
                        className="text-red-400 text-sm px-2 py-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, contatos: [...form.contatos, { rotulo: '', tipo: 'telefone', valor: '' }] })
                  }
                  className="mt-2 text-xs text-[var(--tema-blue-400)]"
                >
                  + Adicionar contato
                </button>
              </div>
              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">De onde vieram essas informações</label>
                <Input
                  placeholder="Ex: site da Prefeitura, ligação em 23/09"
                  value={form.informacoes_fonte}
                  onChange={(e) => setForm({ ...form, informacoes_fonte: e.target.value })}
                  className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--tema-zinc-500)] mb-1">Localização no mapa</label>
                <CemiterioMapPicker
                  lat={form.latitude}
                  lng={form.longitude}
                  onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
                />
              </div>
              {form.latitude != null && form.longitude != null && (
                <p className="text-xs text-[var(--tema-zinc-400)]">
                  Lat {form.latitude.toFixed(6)} · Lng {form.longitude.toFixed(6)}
                </p>
              )}

              {erro && <p className="text-red-400 text-sm">{erro}</p>}

              <DialogFooter className="bg-transparent border-[var(--tema-zinc-800)] mt-4">
                <Button type="submit" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {cemiterios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--tema-zinc-400)]">Nenhum cemitério cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--tema-zinc-400)] border-b border-[var(--tema-zinc-800)]">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Mapa</th>
                <th className="text-left py-3 px-4">Jazigos</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-left py-3 px-4">Cidade/UF</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Mapa público (Ligar/Desligar)</th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {cemiterios.map((c) => (
                <tr key={c.id} className="border-b border-[var(--tema-zinc-800)]/50 hover:bg-[var(--tema-zinc-900)]/50">
                  <td className="py-3 px-4 text-white">{c.nome}</td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/cemiterios/${c.id}/mapa`} className="text-xs font-medium" style={{ color: '#C9A46A' }}>
                      Mapa
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/cemiterios/${c.id}/lapides`} className="text-xs font-medium" style={{ color: '#C9A46A' }}>
                      Jazigos
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-[var(--tema-zinc-300)] capitalize">{c.tipo}</td>
                  <td className="py-3 px-4 text-[var(--tema-zinc-300)]">
                    {[c.cidade, c.estado].filter(Boolean).join('/')}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => alternarAtivo(c)}
                      className={`px-2 py-1 rounded text-xs ${
                        c.ativo ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                      }`}
                    >
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => alternarPublico(c)}
                      className={`px-2 py-1 rounded text-xs ${
                        c.publico ? 'bg-blue-900/50 text-blue-400' : 'bg-[var(--tema-zinc-800)] text-[var(--tema-zinc-400)]'
                      }`}
                    >
                      {c.publico ? 'Visível em /cemiterios' : 'Oculto de /cemiterios'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => abrirEdicao(c)}
                      className="text-[var(--tema-zinc-400)] hover:text-white text-xs"
                    >
                      Editar
                    </button>
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
