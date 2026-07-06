'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

// Ícone padrão do Leaflet não carrega certo com bundlers — aponta pros arquivos do CDN
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const BRASIL_CENTRO: [number, number] = [-14.235, -51.9253]

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function Recentralizar({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], map.getZoom() < 10 ? 14 : map.getZoom())
    }
  }, [lat, lng, map])
  return null
}

export default function CemiterioMapPicker({ lat, lng, onChange }: Props) {
  const posicaoInicial: [number, number] = lat != null && lng != null ? [lat, lng] : BRASIL_CENTRO

  return (
    <div className="rounded-md overflow-hidden border border-zinc-700">
      <MapContainer
        center={posicaoInicial}
        zoom={lat != null && lng != null ? 14 : 4}
        style={{ height: '280px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <Recentralizar lat={lat} lng={lng} />
        {lat != null && lng != null && <Marker position={[lat, lng]} icon={icon} />}
      </MapContainer>
      <p className="text-xs text-zinc-500 bg-zinc-800 px-3 py-1.5">
        Clique no mapa pra marcar a localização do cemitério.
      </p>
    </div>
  )
}
