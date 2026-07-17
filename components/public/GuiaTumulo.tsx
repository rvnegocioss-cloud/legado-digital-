'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Navigation, Compass } from 'lucide-react'

const iconTumulo = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
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

function bearingGraus(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180
  const y = Math.sin((lng2 - lng1) * rad) * Math.cos(lat2 * rad)
  const x =
    Math.cos(lat1 * rad) * Math.sin(lat2 * rad) -
    Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lng2 - lng1) * rad)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function linkRotaCarro(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
}

export default function GuiaTumulo({ cemiterioNome, cemiterioLat, cemiterioLng, lapideLat, lapideLng, quadra, lote }: Props) {
  const [minhaPos, setMinhaPos] = useState<{ lat: number; lng: number } | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const [erroGps, setErroGps] = useState('')
  const [bussolaAtiva, setBussolaAtiva] = useState(false)
  const watchId = useRef<number | null>(null)

  const temTumulo = lapideLat != null && lapideLng != null

  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

  function iniciarGps() {
    if (!('geolocation' in navigator)) {
      setErroGps('Seu navegador não suporta localização.')
      return
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => setMinhaPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setErroGps('Não consegui acessar sua localização — verifique a permissão do navegador.'),
      { enableHighAccuracy: true, maximumAge: 2000 }
    )
  }

  async function ativarBussola() {
    const DeviceOrientationEventTyped = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof DeviceOrientationEventTyped.requestPermission === 'function') {
      const resultado = await DeviceOrientationEventTyped.requestPermission()
      if (resultado !== 'granted') return
    }
    window.addEventListener('deviceorientation', (e: any) => {
      const h = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null)
      if (h != null) setHeading(h)
    })
    setBussolaAtiva(true)
    iniciarGps()
  }

  const distancia = minhaPos && temTumulo ? distanciaMetros(minhaPos.lat, minhaPos.lng, lapideLat!, lapideLng!) : null
  const rumoTumulo = minhaPos && temTumulo ? bearingGraus(minhaPos.lat, minhaPos.lng, lapideLat!, lapideLng!) : null
  const rotacaoSeta = rumoTumulo != null && heading != null ? rumoTumulo - heading : rumoTumulo

  return (
    <div className="space-y-4">
      <a
        href={linkRotaCarro(cemiterioLat, cemiterioLng)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium text-sm"
        style={{ background: '#C9A46A', color: '#0B1D2A' }}
      >
        <Navigation size={16} strokeWidth={1.5} />
        Rota de carro até {cemiterioNome}
      </a>

      {temTumulo && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(201,164,106,0.2)' }}>
          <MapContainer center={[lapideLat!, lapideLng!]} zoom={19} style={{ height: '220px', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={20}
            />
            <Marker position={[lapideLat!, lapideLng!]} icon={iconTumulo} />
            {minhaPos && <Marker position={[minhaPos.lat, minhaPos.lng]} />}
          </MapContainer>

          <div className="p-4 text-center" style={{ background: 'rgba(11,29,42,0.4)' }}>
            {(quadra || lote) && (
              <p className="text-xs mb-3" style={{ color: '#F5F2EB', opacity: 0.7 }}>
                {quadra && `Quadra ${quadra}`} {lote && `· Lote ${lote}`}
              </p>
            )}

            {!bussolaAtiva ? (
              <button
                type="button"
                onClick={ativarBussola}
                className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(201,164,106,0.15)', color: '#C9A46A' }}
              >
                <Compass size={16} strokeWidth={1.5} />
                Ativar guia até o túmulo
              </button>
            ) : (
              <div>
                {rotacaoSeta != null ? (
                  <Navigation
                    size={40}
                    strokeWidth={1.5}
                    className="mx-auto transition-transform duration-300"
                    style={{ color: '#C9A46A', transform: `rotate(${rotacaoSeta}deg)` }}
                  />
                ) : (
                  <p className="text-xs" style={{ color: '#F5F2EB', opacity: 0.6 }}>Buscando sua localização...</p>
                )}
                {distancia != null && (
                  <p className="mt-2 text-lg font-semibold" style={{ color: '#F5F2EB' }}>
                    {distancia < 1 ? 'Você chegou' : `${Math.round(distancia)} m`}
                  </p>
                )}
                <p className="mt-1 text-[11px]" style={{ color: '#F5F2EB', opacity: 0.5 }}>
                  GPS tem margem de alguns metros — use a placa da lápide pra confirmar.
                </p>
              </div>
            )}
            {erroGps && <p className="text-xs text-red-400 mt-2">{erroGps}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
