'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Map, { Source, Layer, Popup, NavigationControl, type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import type { StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useRouter } from 'next/navigation'
import { CORES } from '@/lib/publicTheme'
import { normalizarOrtomosaico } from '@/lib/ortomosaico'
import { estiloComOrtomosaico } from '@/lib/estiloSatelite'
import { registrarProtocoloPmtiles } from '@/lib/registrarProtocoloPmtiles'

registrarProtocoloPmtiles()

// Ícone de cruz -- pino discreto de mapa, não a vela (regra 20: vela é
// elemento de marca amarrado a "Acender uma vela", usar como pino sugeriria
// errado que clicar acende). Registrado 1x no mapa via map.addImage.
const CRUZ_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">' +
  '<circle cx="14" cy="14" r="13" fill="#0B1D2A" stroke="#C9A46A" stroke-width="2"/>' +
  '<path d="M14 7v14M8 12h12" stroke="#C9A46A" stroke-width="2.2" stroke-linecap="round"/></svg>'

interface PinoProps {
  slug: string
  nome: string | null
  foto_url: string | null
  protegido: boolean
}

interface Props {
  cemiterioNome: string
  cidade: string
  estado: string
  latitude: number
  longitude: number
  ortoUrl: string | null
  ortoMinzoom: number | null
  ortoMaxzoom: number | null
  ortoBounds: number[] | null
  memoriais: GeoJSON.FeatureCollection<GeoJSON.Point, PinoProps>
}

export default function MapaPublicoCemiterio({
  cemiterioNome,
  latitude,
  longitude,
  ortoUrl,
  ortoMinzoom,
  ortoMaxzoom,
  ortoBounds,
  memoriais,
}: Props) {
  const router = useRouter()
  const mapRef = useRef<MapRef | null>(null)
  const [hover, setHover] = useState<{ lng: number; lat: number; props: PinoProps } | null>(null)

  const ortomosaico = useMemo(
    () => normalizarOrtomosaico({ url: ortoUrl, minzoom: ortoMinzoom, maxzoom: ortoMaxzoom, bounds: ortoBounds }),
    [ortoUrl, ortoMinzoom, ortoMaxzoom, ortoBounds]
  )
  const estiloMapa = useMemo(() => estiloComOrtomosaico(ortomosaico), [ortomosaico])

  const temMemoriais = memoriais.features.length > 0

  const aoCarregarMapa = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || map.hasImage('cruz-pino')) return
    const img = new Image(28, 28)
    img.onload = () => {
      if (!map.hasImage('cruz-pino')) map.addImage('cruz-pino', img)
    }
    img.src = `data:image/svg+xml;base64,${btoa(CRUZ_SVG)}`

    if (ortomosaico?.bounds) {
      const [minLng, minLat, maxLng, maxLat] = ortomosaico.bounds
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 0, maxZoom: 19 })
    }
  }, [ortomosaico])

  const aoMoverMouse = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (!feature || feature.geometry.type !== 'Point') {
      setHover(null)
      return
    }
    const [lng, lat] = feature.geometry.coordinates as [number, number]
    setHover({ lng, lat, props: feature.properties as PinoProps })
  }, [])

  const aoClicarPino = useCallback(
    (e: MapLayerMouseEvent) => {
      const slug = e.features?.[0]?.properties?.slug
      if (slug) router.push(`/homenagem/${slug}`)
    },
    [router]
  )

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(201,164,106,0.2)' }}>
      <Map
        ref={mapRef}
        onLoad={aoCarregarMapa}
        initialViewState={{ longitude, latitude, zoom: ortomosaico ? 18 : 16 }}
        mapStyle={estiloMapa as unknown as StyleSpecification}
        style={{ height: 480, width: '100%' }}
        interactiveLayerIds={['pinos-memorial']}
        onMouseMove={aoMoverMouse}
        onMouseLeave={() => setHover(null)}
        onClick={aoClicarPino}
        cursor={hover ? 'pointer' : 'grab'}
      >
        <NavigationControl visualizePitch showZoom position="top-right" />

        {temMemoriais && (
          <Source id="memoriais" type="geojson" data={memoriais}>
            <Layer
              id="pinos-memorial"
              type="symbol"
              layout={{ 'icon-image': 'cruz-pino', 'icon-size': 1, 'icon-allow-overlap': true }}
            />
          </Source>
        )}

        {hover && (
          <Popup
            longitude={hover.lng}
            latitude={hover.lat}
            anchor="bottom"
            offset={20}
            closeButton={false}
            closeOnClick={false}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 150, fontFamily: 'Georgia, serif' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: CORES.fundoTopo,
                  border: `1.5px solid ${CORES.dourado}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {hover.props.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hover.props.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: CORES.dourado, fontSize: 18 }}>+</span>
                )}
              </div>
              <div>
                <p style={{ fontSize: 13, margin: 0, color: '#1a1a1a' }}>
                  {hover.props.protegido ? 'Memorial protegido' : hover.props.nome}
                </p>
                <p style={{ fontSize: 10.5, margin: 0, color: '#666' }}>
                  {hover.props.protegido ? 'Toque para pedir acesso' : 'Toque para ver o memorial'}
                </p>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      <div className="p-3 text-center" style={{ background: 'rgba(11,29,42,0.4)' }}>
        {temMemoriais ? (
          <p style={{ fontSize: 11, color: CORES.textoFraco }}>
            {memoriais.features.length} memorial{memoriais.features.length === 1 ? '' : 'is'} publicado{memoriais.features.length === 1 ? '' : 's'} em {cemiterioNome}
          </p>
        ) : (
          <p style={{ fontSize: 11, color: CORES.textoFraco }}>Ainda não há memoriais publicados neste cemitério.</p>
        )}
      </div>
    </div>
  )
}
