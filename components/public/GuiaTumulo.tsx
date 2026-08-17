'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Marker, Popup, Source, Layer, NavigationControl, type MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Navigation, ChevronDown, ChevronRight, MapPin, Cross } from 'lucide-react'
import { CORES } from '@/lib/publicTheme'
import { normalizarOrtomosaico, sourceOrtomosaico } from '@/lib/ortomosaico'
import { registrarProtocoloPmtiles } from '@/lib/registrarProtocoloPmtiles'

registrarProtocoloPmtiles()

// Camada raster de satelite (Esri, gratis, sem chave) - mesma fonte que
// ja era usada no Leaflet, so descrita no formato de estilo do MapLibre.
// Base identica a de sempre -- quando o cemiterio tem ortomosaico de drone
// (ver useMemo abaixo), uma segunda source/layer entra POR CIMA dessa,
// nunca substituindo.
const ESTILO_SATELITE_BASE = {
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
  nomeCompleto?: string
  fotoUrl?: string | null
  ortoUrl?: string | null
  ortoMinzoom?: number | null
  ortoMaxzoom?: number | null
  ortoBounds?: number[] | null
  rotaCoordenadas?: [number, number][] | null
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

export default function GuiaTumulo({
  cemiterioNome,
  cemiterioLat,
  cemiterioLng,
  lapideLat,
  lapideLng,
  quadra,
  lote,
  nomeCompleto,
  fotoUrl,
  ortoUrl,
  ortoMinzoom,
  ortoMaxzoom,
  ortoBounds,
  rotaCoordenadas,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const [minhaPos, setMinhaPos] = useState<{ lat: number; lng: number } | null>(null)
  const [erroGps, setErroGps] = useState('')
  const [navegando, setNavegando] = useState(false)
  const [mostrarCard, setMostrarCard] = useState(false)
  const watchId = useRef<number | null>(null)
  const mapRef = useRef<MapRef | null>(null)

  const temTumulo = lapideLat != null && lapideLng != null

  const ortomosaico = useMemo(
    () => normalizarOrtomosaico({ url: ortoUrl, minzoom: ortoMinzoom, maxzoom: ortoMaxzoom, bounds: ortoBounds }),
    [ortoUrl, ortoMinzoom, ortoMaxzoom, ortoBounds]
  )

  // Objeto novo a cada render faria o MapLibre reinicializar o estilo e
  // piscar -- useMemo obrigatório. Sem ortomosaico, é exatamente o estilo
  // de sempre (mesma referência de conteúdo, só sources/layers estendidos).
  const estiloMapa = useMemo(() => {
    if (!ortomosaico) return ESTILO_SATELITE_BASE
    return {
      ...ESTILO_SATELITE_BASE,
      sources: { ...ESTILO_SATELITE_BASE.sources, orto: sourceOrtomosaico(ortomosaico) },
      layers: [...ESTILO_SATELITE_BASE.layers, { id: 'orto-layer', type: 'raster' as const, source: 'orto' }],
    }
  }, [ortomosaico])

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

  // Enquadra o portao e o tumulo na tela assim que o mapa carrega
  function aoCarregarMapa() {
    if (!temTumulo || !mapRef.current) return
    const pontos: [number, number][] = temRotaReal
      ? rotaCoordenadas!
      : [
          [cemiterioLng, cemiterioLat],
          [lapideLng!, lapideLat!],
        ]
    const lngs = pontos.map((p) => p[0])
    const lats = pontos.map((p) => p[1])
    mapRef.current.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
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
  // da pessoa). Quando o cemiterio tem ruas mapeadas e a rede alcanca os 2
  // pontos, rotaCoordenadas traz o caminho real pelas ruas (calculado no
  // servidor); sem isso, cai no comportamento de sempre -- linha reta direto
  // da coordenada geral do cemiterio (sabidamente impreciso, deixado assim
  // de proposito a pedido do Rafael).
  const temRotaReal = !!rotaCoordenadas && rotaCoordenadas.length >= 2
  const linhaRota =
    temTumulo && {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: temRotaReal
          ? rotaCoordenadas!
          : [
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
                mapStyle={estiloMapa as any}
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
                  <div
                    onMouseEnter={() => setMostrarCard(true)}
                    onMouseLeave={() => setMostrarCard(false)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMostrarCard((v) => !v)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <MapPin size={30} strokeWidth={2} fill="#C9A46A" style={{ color: '#0B1D2A' }} />
                  </div>
                </Marker>

                {mostrarCard && nomeCompleto && (
                  <Popup
                    longitude={lapideLng!}
                    latitude={lapideLat!}
                    anchor="bottom"
                    offset={36}
                    closeButton={false}
                    closeOnClick={false}
                    className="guia-tumulo-popup"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          padding: 2,
                          flexShrink: 0,
                          background: `conic-gradient(from 0deg, ${CORES.dourado}, ${CORES.douradoClaro}, ${CORES.douradoEscuro}, ${CORES.dourado})`,
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: CORES.fundoTopo,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {fotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={fotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Cross size={18} strokeWidth={1.5} style={{ color: CORES.dourado }} />
                          )}
                        </div>
                      </div>
                      <div>
                        <p
                          style={{
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                            fontWeight: 600,
                            margin: 0,
                            color: CORES.dourado,
                            fontFamily: 'Georgia, serif',
                          }}
                        >
                          Homenageado(a)
                        </p>
                        <p
                          style={{
                            fontSize: 14,
                            margin: '2px 0 0',
                            color: CORES.textoForte,
                            fontFamily: 'Georgia, serif',
                          }}
                        >
                          {nomeCompleto}
                        </p>
                      </div>
                    </div>
                  </Popup>
                )}

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

                <p
                  className="text-center mt-3 pt-3"
                  style={{ fontSize: 10, color: '#F5F2EB', opacity: 0.4, borderTop: '1px solid rgba(201,164,106,0.15)' }}
                >
                  {ortomosaico
                    ? 'Imagem aérea real deste cemitério, capturada por drone.'
                    : 'Imagem de satélite hoje — em breve substituída por ortomosaico de drone com a localização exata do túmulo'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
