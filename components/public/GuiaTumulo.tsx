'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, ChevronDown, ChevronRight, MapPin } from 'lucide-react'

const iconTumulo = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const iconVoce = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

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

function AjustarVisao({ pontos }: { pontos: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (pontos.length < 2) return
    map.fitBounds(pontos, { padding: [40, 40], maxZoom: 20 })
  }, [pontos, map])
  return null
}

export default function GuiaTumulo({ cemiterioNome, cemiterioLat, cemiterioLng, lapideLat, lapideLng, quadra, lote }: Props) {
  const [aberto, setAberto] = useState(false)
  const [minhaPos, setMinhaPos] = useState<{ lat: number; lng: number } | null>(null)
  const [erroGps, setErroGps] = useState('')
  const [navegando, setNavegando] = useState(false)
  const watchId = useRef<number | null>(null)

  const temTumulo = lapideLat != null && lapideLng != null

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

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
  const pontosRota: [number, number][] =
    minhaPos && temTumulo ? [[minhaPos.lat, minhaPos.lng], [lapideLat!, lapideLng!]] : []

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
              <MapContainer center={[lapideLat!, lapideLng!]} zoom={19} style={{ height: '260px', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={20}
                />
                <Marker position={[lapideLat!, lapideLng!]} icon={iconTumulo} />
                {minhaPos && <Marker position={[minhaPos.lat, minhaPos.lng]} icon={iconVoce} />}
                {pontosRota.length === 2 && (
                  <>
                    <Polyline positions={pontosRota} pathOptions={{ color: '#C9A46A', weight: 4, dashArray: '2 8', lineCap: 'round' }} />
                    <AjustarVisao pontos={pontosRota} />
                  </>
                )}
              </MapContainer>

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
                      Siga a linha pontilhada no mapa — GPS tem margem de alguns metros, use a placa da lápide pra confirmar.
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
