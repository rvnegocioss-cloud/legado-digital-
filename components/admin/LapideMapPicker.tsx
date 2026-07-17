'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface Props {
  lat: number | null
  lng: number | null
  centroCemiterio: [number, number] | null
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
      map.setView([lat, lng], Math.max(map.getZoom(), 18))
    }
  }, [lat, lng, map])
  return null
}

export default function LapideMapPicker({ lat, lng, centroCemiterio, onChange }: Props) {
  const [satelite, setSatelite] = useState(true)
  const centro: [number, number] =
    lat != null && lng != null ? [lat, lng] : centroCemiterio || [-14.235, -51.9253]

  return (
    <div className="rounded-md overflow-hidden border border-zinc-700">
      <div className="flex items-center justify-between bg-zinc-800 px-3 py-1.5">
        <p className="text-xs text-zinc-500">Clique no mapa pra marcar o túmulo exato.</p>
        <button
          type="button"
          onClick={() => setSatelite(!satelite)}
          className="text-xs text-blue-400 hover:underline whitespace-nowrap"
        >
          {satelite ? 'Ver mapa de ruas' : 'Ver satélite'}
        </button>
      </div>
      <MapContainer center={centro} zoom={lat != null && lng != null ? 19 : 17} style={{ height: '320px', width: '100%' }}>
        {satelite ? (
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />
        ) : (
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        )}
        <ClickHandler onChange={onChange} />
        <Recentralizar lat={lat} lng={lng} />
        {lat != null && lng != null && <Marker position={[lat, lng]} icon={icon} />}
      </MapContainer>
    </div>
  )
}
