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
import { urlMidiaProtegida } from '@/lib/urlMidia'

registrarProtocoloPmtiles()

// Ícone de cruz -- pino discreto de mapa, não a vela (regra 20: vela é
// elemento de marca amarrado a "Acender uma vela", usar como pino sugeriria
// errado que clicar acende). Registrado 1x no mapa via map.addImage.
const CRUZ_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">' +
  '<circle cx="14" cy="14" r="13" fill="#0B1D2A" stroke="#C9A46A" stroke-width="2"/>' +
  '<path d="M14 7v14M8 12h12" stroke="#C9A46A" stroke-width="2.2" stroke-linecap="round"/></svg>'

interface MemorialDoTumulo {
  slug: string
  nome: string | null
  foto_url: string | null
  protegido: boolean
}

// Um túmulo pode guardar vários memoriais (uma gaveta cada). A RPC devolve um
// ponto por LÁPIDE com a lista dentro -- sem isso, dois memoriais no mesmo
// túmulo viravam dois pinos na mesma coordenada e só o de cima aparecia.
interface PinoProps extends MemorialDoTumulo {
  total?: number
  lapide_codigo?: string | null
  memoriais?: MemorialDoTumulo[] | string
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
  const [busca, setBusca] = useState('')
  const [semResultado, setSemResultado] = useState(false)

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
      const props = e.features?.[0]?.properties as PinoProps | undefined
      if (!props) return
      // Com mais de um memorial no mesmo túmulo o clique não escolhe por conta
      // própria: mantém o card aberto pra pessoa escolher qual quer abrir.
      if ((props.total ?? 1) > 1) return
      if (props.slug) router.push(`/homenagem/${props.slug}`)
    },
    [router]
  )

  // Busca dentro do próprio mapa: acha o túmulo pelo nome e voa até ele já
  // com o card aberto. Sem isto, achar alguém num cemitério de milhares de
  // túmulos dependia de varrer o mapa no olho.
  const procurar = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const termo = busca.trim().toLowerCase()
      if (!termo) return

      // Compara sem acento: quem digita "jose" tem que achar "José".
      const limpar = (t: string) =>
        t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const alvo = limpar(termo)

      const achado = (memoriais.features || []).find((f) => {
        const props = f.properties as PinoProps
        return lerMemoriais(props).some(
          (m) => m.nome && !m.protegido && limpar(m.nome).includes(alvo)
        )
      })

      if (!achado || achado.geometry.type !== 'Point') {
        setSemResultado(true)
        return
      }

      setSemResultado(false)
      const [lng, lat] = achado.geometry.coordinates as [number, number]
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 20, duration: 1400 })
      setHover({ lng, lat, props: achado.properties as PinoProps })
    },
    [busca, memoriais]
  )

  // O GeoJSON serializa arrays de properties como string ao passar pelo mapa.
  function lerMemoriais(props: PinoProps): MemorialDoTumulo[] {
    const bruto = props.memoriais
    if (Array.isArray(bruto)) return bruto
    if (typeof bruto === 'string') {
      try {
        const lista = JSON.parse(bruto)
        return Array.isArray(lista) ? lista : []
      } catch {
        return []
      }
    }
    return [{ slug: props.slug, nome: props.nome, foto_url: props.foto_url, protegido: props.protegido }]
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(201,164,106,0.2)' }}>
      {temMemoriais && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '12px 14px',
            background: 'rgba(11,29,42,0.55)',
            borderBottom: `1px solid ${CORES.douradoBorda}`,
          }}
        >
          <form onSubmit={procurar} style={{ display: 'flex', gap: 8, flex: '1 1 260px' }}>
            <input
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setSemResultado(false)
              }}
              placeholder="Procurar pelo nome de quem você visita"
              aria-label="Procurar memorial pelo nome"
              style={{
                flex: 1,
                minWidth: 0,
                padding: '9px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${CORES.douradoBorda}`,
                color: CORES.textoForte,
                fontFamily: 'Georgia, serif',
                fontSize: 14,
              }}
            />
            <button
              type="submit"
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: 0,
                background: CORES.dourado,
                color: CORES.fundoBase,
                fontFamily: 'Georgia, serif',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Achar no mapa
            </button>
          </form>

          <p style={{ margin: 0, fontSize: 11.5, color: CORES.textoFraco, flex: '1 1 220px' }}>
            {semResultado
              ? 'Nenhum memorial com esse nome neste cemitério.'
              : 'Cada cruz no mapa é um memorial. Toque numa cruz para ver quem está ali.'}
          </p>
        </div>
      )}

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
            {(() => {
              const lista = lerMemoriais(hover.props)
              const varios = lista.length > 1
              return (
                <div style={{ minWidth: 190, maxWidth: 260, fontFamily: 'Georgia, serif' }}>
                  {varios && (
                    <p
                      style={{
                        fontSize: 10,
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                        color: '#8a6d3b',
                        margin: '0 0 8px',
                        paddingBottom: 6,
                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                      }}
                    >
                      {lista.length} memoriais neste túmulo
                    </p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 210, overflowY: 'auto' }}>
                    {lista.map((mem, i) => (
                      <a
                        key={mem.slug || i}
                        href={mem.slug ? `/homenagem/${mem.slug}` : undefined}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
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
                          {mem.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={urlMidiaProtegida(mem.foto_url) || mem.foto_url}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span style={{ color: CORES.dourado, fontSize: 16 }}>+</span>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, margin: 0, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mem.protegido ? 'Memorial protegido' : mem.nome}
                          </p>
                          <p style={{ fontSize: 10.5, margin: 0, color: '#666' }}>
                            {mem.protegido ? 'Toque para pedir acesso' : 'Toque para ver o memorial'}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )
            })()}
          </Popup>
        )}
      </Map>

      <div className="p-3 text-center" style={{ background: 'rgba(11,29,42,0.4)' }}>
        {temMemoriais ? (
          <>
            <div
              style={{
                display: 'flex',
                gap: 18,
                justifyContent: 'center',
                flexWrap: 'wrap',
                fontSize: 11,
                color: CORES.textoFraco,
                marginBottom: 6,
              }}
            >
              <span>✛ cada cruz é um memorial</span>
              <span>Arraste para andar pelo cemitério</span>
              <span>Use + e − para aproximar</span>
            </div>
            <p style={{ fontSize: 11, color: CORES.textoFraco }}>
              {memoriais.features.length} túmulo{memoriais.features.length === 1 ? '' : 's'} com memorial em {cemiterioNome}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 11, color: CORES.textoFraco }}>Ainda não há memoriais publicados neste cemitério.</p>
        )}
      </div>
    </div>
  )
}
