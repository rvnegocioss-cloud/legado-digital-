'use client'

import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import PainelParceirosCemiterio from '@/components/admin/PainelParceirosCemiterio'

// MapLibre acessa `window`, não pode renderizar no servidor.
const MapaCemiterio = dynamic(
  () => import('@/components/admin/MapaCemiterio').then((m) => m.MapaCemiterio),
  { ssr: false, loading: () => <p className="text-zinc-400 text-sm">Carregando mapa...</p> }
)

export default function MapaCemiterioPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div>
      <MapaCemiterio cemiterioId={id} />
      <PainelParceirosCemiterio cemiterioId={id} />
    </div>
  )
}
