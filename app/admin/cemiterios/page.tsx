'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
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
  loading: () => <div className="h-[280px] rounded-md bg-zinc-800 animate-pulse" />,
})

interface Cemiterio {
  id: string
  nome: string
  tipo: string
  endereco: string | null
  cidade: string | null
  estado: string | null
  latitude: number | null
  longitude: number | null
  ativo: boolean
  created_at: string
}

const FORM_INICIAL = {
  nome: '',
  tipo: 'cemiterio',
  endereco: '',
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

    const payload = { ...form, updated_at: new Date().toISOString() }

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

  if (loading) {
    return <p className="text-zinc-400">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Cemitérios</h1>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger render={<Button onClick={abrirNovo}>+ Novo Cemitério</Button>} />
          <DialogContent className="bg-zinc-900 text-white ring-zinc-800 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editando ? 'Editar Cemitério' : 'Novo Cemitério'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={salvar} className="space-y-3">
              <Input
                placeholder="Nome"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
              >
                <option value="cemiterio">Cemitério</option>
                <option value="crematorio">Crematório</option>
              </select>
              <Input
                placeholder="Endereço"
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <div className="flex gap-3">
                <Input
                  placeholder="Cidade"
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
                <Input
                  placeholder="UF"
                  maxLength={2}
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                  className="bg-zinc-800 border-zinc-700 text-white w-20"
                />
              </div>

              <CemiterioMapPicker
                lat={form.latitude}
                lng={form.longitude}
                onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
              />
              {form.latitude != null && form.longitude != null && (
                <p className="text-xs text-zinc-400">
                  Lat {form.latitude.toFixed(6)} · Lng {form.longitude.toFixed(6)}
                </p>
              )}

              {erro && <p className="text-red-400 text-sm">{erro}</p>}

              <DialogFooter className="bg-transparent border-zinc-800 mt-4">
                <Button type="submit" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {cemiterios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Nenhum cemitério cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-left py-3 px-4">Cidade/UF</th>
                <th className="text-left py-3 px-4">Localização</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {cemiterios.map((c) => (
                <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{c.nome}</td>
                  <td className="py-3 px-4 text-zinc-300 capitalize">{c.tipo}</td>
                  <td className="py-3 px-4 text-zinc-300">
                    {[c.cidade, c.estado].filter(Boolean).join('/')}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {c.latitude != null && c.longitude != null ? (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=16/${c.latitude}/${c.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        ver no mapa
                      </a>
                    ) : (
                      '—'
                    )}
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
                      onClick={() => abrirEdicao(c)}
                      className="text-zinc-400 hover:text-white text-xs"
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
