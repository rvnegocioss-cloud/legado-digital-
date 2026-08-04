'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import MapGL, { Source, Layer, Popup, NavigationControl, type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Cross, MapPin, Crosshair, X } from 'lucide-react'
import { supabase } from '@/lib/auth'
import { normalizarOrtomosaico, sourceOrtomosaico } from '@/lib/ortomosaico'
import { registrarProtocoloPmtiles } from '@/lib/registrarProtocoloPmtiles'

registrarProtocoloPmtiles()

const ESTILO_BASE = {
  version: 8 as const,
  sources: {
    esri: {
      type: 'raster' as const,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri',
      maxzoom: 20,
    },
  },
  layers: [{ id: 'esri-satelite', type: 'raster' as const, source: 'esri' }],
}

interface Cemiterio {
  id: string
  nome: string
  latitude: number | null
  longitude: number | null
  ortomosaico_url: string | null
  ortomosaico_minzoom: number | null
  ortomosaico_maxzoom: number | null
  ortomosaico_bounds: number[] | null
}

interface Lapide {
  id: string
  identificacao: string
  quadra: string | null
  lote: string | null
  latitude: number | null
  longitude: number | null
  coordenada_origem: string | null
}

interface Homenagem {
  id: string
  nome_completo: string
  foto_url: string | null
  slug: string | null
  lapide_id: string | null
}

const CORES_ORIGEM: Record<string, string> = {
  ortomosaico: '#C9A46A',
  gps_celular: '#4285F4',
  mapa_satelite: '#4285F4',
  importacao: '#8a8a8a',
  desconhecida: '#8a8a8a',
}

export function MapaCemiterio({ cemiterioId }: { cemiterioId: string }) {
  const [carregando, setCarregando] = useState(true)
  const [cemiterio, setCemiterio] = useState<Cemiterio | null>(null)
  const [lapides, setLapides] = useState<Lapide[]>([])
  const [homenagens, setHomenagens] = useState<Homenagem[]>([])
  const [lapideSelecionada, setLapideSelecionada] = useState<Lapide | null>(null)
  const [modoMarcar, setModoMarcar] = useState(false)
  const [lapideParaMarcar, setLapideParaMarcar] = useState<Lapide | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const mapRef = useRef<MapRef | null>(null)

  useEffect(() => {
    carregar()
  }, [cemiterioId])

  async function carregar() {
    setCarregando(true)
    const [{ data: c }, { data: l }, { data: h }] = await Promise.all([
      supabase
        .from('cemiterios')
        .select('id, nome, latitude, longitude, ortomosaico_url, ortomosaico_minzoom, ortomosaico_maxzoom, ortomosaico_bounds')
        .eq('id', cemiterioId)
        .single(),
      supabase
        .from('lapides')
        .select('id, identificacao, quadra, lote, latitude, longitude, coordenada_origem')
        .eq('cemiterio_id', cemiterioId),
      supabase
        .from('homenagens')
        .select('id, nome_completo, foto_url, slug, lapide_id, lapides!inner(cemiterio_id)')
        .eq('lapides.cemiterio_id', cemiterioId),
    ])
    setCemiterio(c)
    setLapides(l || [])
    setHomenagens(h || [])
    setCarregando(false)
  }

  const ortomosaico = useMemo(
    () =>
      cemiterio
        ? normalizarOrtomosaico({
            url: cemiterio.ortomosaico_url,
            minzoom: cemiterio.ortomosaico_minzoom,
            maxzoom: cemiterio.ortomosaico_maxzoom,
            bounds: cemiterio.ortomosaico_bounds,
          })
        : null,
    [cemiterio]
  )

  const estiloMapa = useMemo(() => {
    if (!ortomosaico) return ESTILO_BASE
    return {
      ...ESTILO_BASE,
      sources: { ...ESTILO_BASE.sources, orto: sourceOrtomosaico(ortomosaico) },
      layers: [...ESTILO_BASE.layers, { id: 'orto-layer', type: 'raster' as const, source: 'orto' }],
    }
  }, [ortomosaico])

  const lapidesComCoordenada = lapides.filter((l) => l.latitude != null && l.longitude != null)
  const lapidesSemCoordenada = lapides.filter((l) => l.latitude == null || l.longitude == null)
  const homenagemPorLapide = new Map(homenagens.map((h) => [h.lapide_id, h]))

  const geojsonPinos = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: lapidesComCoordenada.map((l) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [l.longitude!, l.latitude!] },
        properties: { lapideId: l.id, origem: l.coordenada_origem || 'desconhecida' },
      })),
    }),
    [lapidesComCoordenada]
  )

  function aoCarregarMapa() {
    if (!mapRef.current) return
    if (ortomosaico?.bounds) {
      mapRef.current.fitBounds(
        [
          [ortomosaico.bounds[0], ortomosaico.bounds[1]],
          [ortomosaico.bounds[2], ortomosaico.bounds[3]],
        ],
        { padding: 40, duration: 0 }
      )
    } else if (lapidesComCoordenada.length > 0) {
      const lngs = lapidesComCoordenada.map((l) => l.longitude!)
      const lats = lapidesComCoordenada.map((l) => l.latitude!)
      mapRef.current.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, maxZoom: 20, duration: 0 }
      )
    } else if (cemiterio?.latitude != null && cemiterio?.longitude != null) {
      mapRef.current.flyTo({ center: [cemiterio.longitude, cemiterio.latitude], zoom: 17, duration: 0 })
    }
  }

  async function aoClicarMapa(e: MapLayerMouseEvent) {
    if (modoMarcar && lapideParaMarcar) {
      await salvarCoordenada(lapideParaMarcar.id, e.lngLat.lat, e.lngLat.lng)
      return
    }

    const feature = e.features?.[0]
    if (feature?.properties?.lapideId) {
      const lapide = lapides.find((l) => l.id === feature.properties!.lapideId)
      if (lapide) setLapideSelecionada(lapide)
    } else {
      setLapideSelecionada(null)
    }
  }

  async function salvarCoordenada(lapideId: string, lat: number, lng: number) {
    setSalvando(true)
    setMsg('')
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { error } = await supabase
      .from('lapides')
      .update({
        latitude: lat,
        longitude: lng,
        coordenada_origem: ortomosaico ? 'ortomosaico' : 'mapa_satelite',
        coordenada_atualizada_em: new Date().toISOString(),
        coordenada_atualizada_por: session?.user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lapideId)

    if (error) {
      setMsg(error.message)
    } else {
      setMsg(`Coordenada salva pra ${lapideParaMarcar?.identificacao}.`)
      setLapideParaMarcar(null)
      await carregar()
    }
    setSalvando(false)
  }

  if (carregando) return <p className="text-zinc-400 text-sm">Carregando mapa...</p>
  if (!cemiterio) return <p className="text-zinc-400 text-sm">Cemitério não encontrado.</p>

  return (
    <div>
      <Link href={`/admin/cemiterios/${cemiterioId}/lapides`} className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">
        ← Voltar pra Lápides de {cemiterio.nome}
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Mapa — {cemiterio.nome}</h1>
      <p className="text-zinc-400 text-sm mb-2">
        {lapidesComCoordenada.length} de {lapides.length} lápides com coordenada
        {ortomosaico && ` · ${lapides.filter((l) => l.coordenada_origem === 'ortomosaico').length} marcadas no ortomosaico`}
      </p>
      {!ortomosaico && (
        <p className="text-amber-400 text-xs mb-4 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2 inline-block">
          Este cemitério ainda não tem ortomosaico de drone — a marcação usa satélite genérico (precisão de metros, não de centímetros).
        </p>
      )}

      <div className="grid lg:grid-cols-12 gap-4 mt-4">
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-zinc-800 overflow-hidden" style={{ height: 560 }}>
            <MapGL
              ref={mapRef}
              onLoad={aoCarregarMapa}
              initialViewState={{
                longitude: cemiterio.longitude ?? -47.9,
                latitude: cemiterio.latitude ?? -15.8,
                zoom: cemiterio.longitude != null ? 17 : 4,
              }}
              mapStyle={estiloMapa as any}
              style={{ width: '100%', height: '100%', cursor: modoMarcar && lapideParaMarcar ? 'crosshair' : undefined }}
              interactiveLayerIds={['lapides-pinos']}
              onClick={aoClicarMapa}
            >
              <NavigationControl showZoom position="top-right" />

              <Source id="lapides" type="geojson" data={geojsonPinos}>
                <Layer
                  id="lapides-pinos"
                  type="circle"
                  paint={{
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 3, 20, 9],
                    'circle-color': [
                      'match',
                      ['get', 'origem'],
                      'ortomosaico',
                      CORES_ORIGEM.ortomosaico,
                      'gps_celular',
                      CORES_ORIGEM.gps_celular,
                      'mapa_satelite',
                      CORES_ORIGEM.mapa_satelite,
                      CORES_ORIGEM.desconhecida,
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#0B1D2A',
                  }}
                />
              </Source>

              {lapideSelecionada && (
                <Popup
                  longitude={lapideSelecionada.longitude!}
                  latitude={lapideSelecionada.latitude!}
                  anchor="bottom"
                  offset={12}
                  onClose={() => setLapideSelecionada(null)}
                  closeButton
                >
                  <div style={{ minWidth: 180 }}>
                    {(() => {
                      const h = homenagemPorLapide.get(lapideSelecionada.id)
                      return (
                        <>
                          <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
                            {lapideSelecionada.identificacao}
                            {lapideSelecionada.quadra && ` · Q${lapideSelecionada.quadra}`}
                            {lapideSelecionada.lote && ` L${lapideSelecionada.lote}`}
                          </p>
                          {h ? (
                            <p style={{ fontSize: 12, margin: '4px 0' }}>{h.nome_completo}</p>
                          ) : (
                            <p style={{ fontSize: 11, color: '#888', margin: '4px 0' }}>Sem memorial vinculado</p>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                            {h && (
                              <a href={`/admin/memoriais/${h.id}`} style={{ fontSize: 12, color: '#0B5FFF' }}>
                                Abrir memorial →
                              </a>
                            )}
                            <a
                              href={`/admin/cemiterios/${cemiterioId}/lapides/${lapideSelecionada.id}/gavetas-3d`}
                              style={{ fontSize: 12, color: '#0B5FFF' }}
                            >
                              Gavetas 3D →
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setModoMarcar(true)
                                setLapideParaMarcar(lapideSelecionada)
                                setLapideSelecionada(null)
                              }}
                              style={{ fontSize: 12, color: '#a15c00', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              Mover pino
                            </button>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </Popup>
              )}
            </MapGL>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-white mb-1">Marcar túmulos</h2>
            <p className="text-xs text-zinc-500 mb-3">
              Clica numa lápide da lista, depois clica no ponto certo dela na imagem do mapa.
            </p>

            {modoMarcar && lapideParaMarcar && (
              <div className="rounded-lg bg-amber-950/30 border border-amber-900/40 px-3 py-2 mb-3 flex items-center justify-between">
                <p className="text-xs text-amber-300">
                  Clique no mapa onde fica <strong>{lapideParaMarcar.identificacao}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setModoMarcar(false)
                    setLapideParaMarcar(null)
                  }}
                  className="text-amber-400 hover:text-amber-200"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            )}

            {msg && <p className="text-xs text-zinc-400 mb-3">{msg}</p>}

            <p className="text-xs text-zinc-500 mb-2">
              Pendentes ({lapidesSemCoordenada.length})
            </p>
            <ul className="space-y-1 max-h-72 overflow-y-auto">
              {lapidesSemCoordenada.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => {
                      setModoMarcar(true)
                      setLapideParaMarcar(l)
                    }}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 ${
                      lapideParaMarcar?.id === l.id ? 'bg-amber-900/40 text-amber-200' : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Crosshair size={12} strokeWidth={1.5} />
                    {l.identificacao}
                    {l.quadra && <span className="text-zinc-500">· Q{l.quadra}</span>}
                  </button>
                </li>
              ))}
              {lapidesSemCoordenada.length === 0 && (
                <li className="text-zinc-500 text-xs">Todas as lápides já têm coordenada.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mt-4">
            <h2 className="text-sm font-semibold text-white mb-2">Legenda</h2>
            <div className="space-y-1.5 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: CORES_ORIGEM.ortomosaico }} />
                Marcado no ortomosaico (preciso)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: CORES_ORIGEM.gps_celular }} />
                GPS de celular / satélite genérico
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: CORES_ORIGEM.desconhecida }} />
                Origem desconhecida
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
