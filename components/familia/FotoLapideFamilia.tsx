'use client'

import { useEffect, useState } from 'react'
import { urlMidiaProtegida } from '@/lib/urlMidia'

// Bloco "Foto da lápide" do Portal da Família: a equipe cadastra a foto, a
// família só decide se ela aparece no card do mapa público (padrão: oculta).
export default function FotoLapideFamilia({ slug }: { slug: string }) {
  const [carregando, setCarregando] = useState(true)
  const [temLapide, setTemLapide] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [publica, setPublica] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    fetch(`/api/familia-jazigo?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.fotoLapide) {
          setTemLapide(true)
          setUrl(j.fotoLapide.url || null)
          setPublica(!!j.fotoLapide.publica)
        }
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [slug])

  async function alternar() {
    const novo = !publica
    setSalvando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/familia-jazigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, fotoPublica: novo }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Não foi possível salvar')
      setPublica(novo)
      setMsg({ tipo: 'ok', texto: novo ? 'A foto agora aparece no mapa público.' : 'A foto agora está oculta.' })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Erro ao salvar' })
    }
    setSalvando(false)
  }

  if (carregando || !temLapide) return null

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 mt-4">
      <h2 className="text-base font-semibold text-white mb-3">Foto da lápide</h2>
      {url ? (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlMidiaProtegida(url) || url}
            alt="Foto da lápide"
            className="w-24 h-24 rounded-md object-cover border border-zinc-800"
          />
          <div className="flex-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                role="switch"
                checked={publica}
                disabled={salvando}
                onChange={alternar}
                className="h-4 w-4 accent-amber-500"
              />
              <span className="text-sm text-zinc-200">
                Mostrar a foto da lápide no mapa público do cemitério
              </span>
            </label>
            <p className="text-xs text-zinc-400 mt-2">
              Só você escolhe. Quando desligada, ninguém vê a foto fora deste portal.
            </p>
            {msg && (
              <p className={`text-xs mt-2 ${msg.tipo === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                {msg.texto}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-400">A funerária ainda não cadastrou a foto da lápide.</p>
      )}
    </div>
  )
}
