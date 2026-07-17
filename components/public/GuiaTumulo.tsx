'use client'

import { useEffect, useRef, useState } from 'react'
import Map, { Marker, Source, Layer, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Navigation, ChevronDown, ChevronRight, MapPin } from 'lucide-react'

// Camada raster de satelite (Esri, gratis, sem chave) - mesma fonte que
// ja era usada no Leaflet, so descrita no formato de estilo do MapLibre.
const ESTILO_SATELITE = {
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

interface Props {
  cemiterioNome: string
  cemiterioLat: number
  cemiterioLng: number
  lapideLat: number | null
  lapideLng: number | null
  quadra: string | null
  lote: string | null
}

function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function linkRotaCarro(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
}

export default function GuiaTumulo({ cemiterioNome, cemiterioLat, cemiterioLng, lapideLat, lapideLng, quadra, lote }: Props) {
  const [aberto, setAberto] = useState(false)
  const [minhaPos, setMinhaPos] = useState<{ lat: number; lng: number } | null>(null)
  const [erroGps, setErroGps] = useState('')
  const [navegando, setNavegando] = useState(false)
  const watchId = useRef<number | null>(null)
  const mapRef = useRef<MapRef | null>(null)

  const temTumulo = lapideLat != null && lapideLng != null

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

  // Enquadra o portao e o tumulo na tela assim que o mapa carrega
  function aoCarregarMapa() {
    if (!temTumulo || !mapRef.current) return
    mapRef.current.fitBounds(
      [
        [Math.min(cemiterioLng, lapideLng!), Math.min(cemiterioLat, lapideLat!)],
        [Math.max(cemiterioLng, lapideLng!), Math.max(cemiterioLat, lapideLat!)],
      ],
      { padding: 50, maxZoom: 20, duration: 0 }
    )
  }

  function iniciarNavegacao() {
    if (!('geolocation' in navigator)) {
      setErroGps('Seu navegador não suporta localização.')
      return
    }
    setNavegando(true)
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => setMinhaPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setErroGps('Não consegui acessar sua localização — verifique a permissão do navegador.'),
      { enableHighAccuracy: true, maximumAge: 2000 }
    )
  }

  const distancia = minhaPos && temTumulo ? distanciaMetros(minhaPos.lat, minhaPos.lng, lapideLat!, lapideLng!) : null

  // Linha fixa: portao ate o tumulo (referencia estavel, nao muda com o GPS
  // da pessoa). Ponto de partida ainda usa a coordenada geral do cemiterio -
  // sabidamente impreciso (marcado no centro, nao na entrada de verdade),
  // deixado assim de proposito por enquanto a pedido do Rafael.
  const linhaRota =
    temTumulo && {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [cemiterioLng, cemiterioLat],
          [lapideLng!, lapideLat!],
        ],
      },
      properties: {},
    }

  return (
    <div className="space-y-3">
      <a
        href={linkRotaCarro(cemiterioLat, cemiterioLng)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs"
        style={{ background: '#C9A46A', color: '#0B1D2A' }}
      >
        <Navigation size={14} strokeWidth={1.5} />
        Rota de carro até {cemiterioNome}
      </a>

      {temTumulo && (
        <div>
          <button
            type="button"
            onClick={() => setAberto(!aberto)}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: '#C9A46A' }}
          >
            {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Guia até o túmulo dentro do cemitério
          </button>

          {aberto && (
            <div className="rounded-xl border overflow-hidden mt-3" style={{ borderColor: 'rgba(201,164,106,0.2)' }}>
              <Map
                ref={mapRef}
                onLoad={aoCarregarMapa}
                initialViewState={{ longitude: lapideLng!, latitude: lapideLat!, zoom: 19, pitch: 55, bearing: -20 }}
                mapStyle={ESTILO_SATELITE as any}
                style={{ height: 260, width: '100%' }}
                maxPitch={70}
              >
                <NavigationControl visualizePitch showZoom position="top-right" />

                {linhaRota && (
                  <Source id="linha-rota" type="geojson" data={linhaRota}>
                    <Layer
                      id="linha-rota-layer"
                      type="line"
                      paint={{ 'line-color': '#C9A46A', 'line-width': 4, 'line-dasharray': [2, 3] }}
                      layout={{ 'line-cap': 'round' }}
                    />
                  </Source>
                )}

                <Marker longitude={lapideLng!} latitude={lapideLat!} anchor="bottom">
                  <MapPin size={30} strokeWidth={2} fill="#C9A46A" style={{ color: '#0B1D2A' }} />
                </Marker>

                {minhaPos && (
                  <Marker longitude={minhaPos.lng} latitude={minhaPos.lat} anchor="center">
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#4285F4', border: '3px solid white', boxShadow: '0 0 6px rgba(0,0,0,0.4)' }} />
                  </Marker>
                )}
              </Map>

              <div className="p-4" style={{ background: 'rgba(11,29,42,0.4)' }}>
                {(quadra || lote) && (
                  <p className="text-xs mb-3 flex items-center gap-1.5 justify-center" style={{ color: '#F5F2EB', opacity: 0.7 }}>
                    <MapPin size={12} strokeWidth={1.5} />
                    {quadra && `Quadra ${quadra}`} {lote && `· Lote ${lote}`}
                  </p>
                )}

                {!navegando ? (
                  <button
                    type="button"
                    onClick={iniciarNavegacao}
                    className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ background: 'rgba(201,164,106,0.15)', color: '#C9A46A' }}
                  >
                    <MapPin size={16} strokeWidth={1.5} />
                    Mostrar caminho até o túmulo
                  </button>
                ) : (
                  <div className="text-center">
                    {distancia != null ? (
                      <p className="text-lg font-semibold" style={{ color: '#F5F2EB' }}>
                        {distancia < 1 ? 'Você chegou' : `${Math.round(distancia)} m até o túmulo`}
                      </p>
                    ) : (
                      <p className="text-xs" style={{ color: '#F5F2EB', opacity: 0.6 }}>Buscando sua localização...</p>
                    )}
                    <p className="mt-1 text-[11px]" style={{ color: '#F5F2EB', opacity: 0.5 }}>
                      Arraste com 2 dedos (ou botão direito) pra girar/inclinar o mapa em 3D. GPS tem margem de alguns metros — use a placa da lápide pra confirmar.
                    </p>
                  </div>
                )}
                {erroGps && <p className="text-xs text-red-400 mt-2">{erroGps}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
