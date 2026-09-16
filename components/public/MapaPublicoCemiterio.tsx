'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Source, Layer, Popup, NavigationControl, type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import type { StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useRouter } from 'next/navigation'
import { Maximize2, Minimize2 } from 'lucide-react'
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
  // Nome do jazigo ("Jazigo Família Saraiva"). Com mais de um memorial no
  // mesmo túmulo, é assim que o card se apresenta (2026-09-16).
  jazigo_nome?: string | null
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<{ lng: number; lat: number; props: PinoProps } | null>(null)
  const [busca, setBusca] = useState('')
  const [expandido, setExpandido] = useState(false)

  // Tela cheia de verdade no celular -- o mapa pequeno inline não dava pra
  // usar andando no cemitério. Fullscreen API some com a barra do navegador
  // onde o aparelho aceita (Android); position:fixed cobrindo 100dvh é o
  // reforço que funciona em qualquer aparelho (inclusive iOS, que não deixa
  // um <div> pedir tela cheia).
  useEffect(() => {
    if (!expandido) return
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    containerRef.current?.requestFullscreen?.().catch(() => {})
    function tecla(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpandido(false)
    }
    function aoMudarFullscreen() {
      if (!document.fullscreenElement) setExpandido(false)
    }
    window.addEventListener('keydown', tecla)
    document.addEventListener('fullscreenchange', aoMudarFullscreen)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', tecla)
      document.removeEventListener('fullscreenchange', aoMudarFullscreen)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [expandido])

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

  // Busca dentro do próprio mapa: os nomes vão aparecendo enquanto a pessoa
  // digita, e escolher um voa até o túmulo com o card aberto (regra do Rafael,
  // 2026-09-15 -- antes exigia clicar em "Achar no mapa" e ia sempre no 1º
  // resultado, sem mostrar os outros). Aqui não há consulta ao banco: os
  // memoriais já vieram junto com o mapa, então o filtro é em memória.
  const sugestoes = useMemo(() => {
    const termo = busca.trim()
    if (termo.length < 2) return []

    // Compara sem acento: quem digita "jose" tem que achar "José".
    const limpar = (t: string) =>
      t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const alvo = limpar(termo)

    const achados: { nome: string; lng: number; lat: number; props: PinoProps }[] = []
    for (const f of memoriais.features || []) {
      if (f.geometry.type !== 'Point') continue
      const props = f.properties as PinoProps
      for (const m of lerMemoriais(props)) {
        // Memorial com senha também é achável pelo nome: quem procura a
        // sepultura da própria família precisa achar o túmulo no mapa, e a
        // senha continua sendo pedida ao abrir a página.
        if (!m.nome || !limpar(m.nome).includes(alvo)) continue
        const [lng, lat] = f.geometry.coordinates as [number, number]
        achados.push({ nome: m.nome, lng, lat, props })
        if (achados.length >= 8) return achados
      }
    }
    return achados
  }, [busca, memoriais])

  const irPara = useCallback((s: { lng: number; lat: number; props: PinoProps }) => {
    mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: 20, duration: 1400 })
    setHover({ lng: s.lng, lat: s.lat, props: s.props })
    setBusca('')
  }, [])

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
    <div
      ref={containerRef}
      className={expandido ? 'overflow-hidden' : 'rounded-xl border overflow-hidden'}
      style={
        expandido
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 300,
              width: '100vw',
              height: '100dvh',
              background: CORES.fundoBase,
              display: 'flex',
              flexDirection: 'column',
            }
          : { borderColor: 'rgba(201,164,106,0.2)' }
      }
    >
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
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Comece a digitar o nome de quem você visita"
              aria-label="Procurar memorial pelo nome"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${CORES.douradoBorda}`,
                color: CORES.textoForte,
                fontFamily: 'Georgia, serif',
                fontSize: 14,
              }}
            />
            {busca.trim().length >= 2 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 5,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#0f2436',
                  border: `1px solid ${CORES.douradoBorda}`,
                  boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
                }}
              >
                {sugestoes.length === 0 ? (
                  <p style={{ margin: 0, padding: '9px 12px', fontSize: 12.5, color: CORES.textoFraco }}>
                    Nenhum memorial com esse nome neste cemitério.
                  </p>
                ) : (
                  sugestoes.map((s, i) => (
                    <button
                      key={`${s.nome}-${i}`}
                      type="button"
                      onClick={() => irPara(s)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        background: 'none',
                        border: 0,
                        borderTop: i === 0 ? 0 : `1px solid ${CORES.douradoBorda}`,
                        color: CORES.textoForte,
                        fontFamily: 'Georgia, serif',
                        fontSize: 13.5,
                        cursor: 'pointer',
                      }}
                    >
                      {s.nome}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: CORES.textoFraco, flex: '1 1 220px' }}>
            Cada cruz no mapa é um memorial. Toque numa cruz para ver quem está ali.
          </p>
        </div>
      )}

      <div style={{ position: 'relative', flex: expandido ? 1 : undefined, minHeight: 0 }}>
        <Map
          ref={mapRef}
          onLoad={aoCarregarMapa}
          initialViewState={{ longitude, latitude, zoom: ortomosaico ? 18 : 16 }}
          mapStyle={estiloMapa as unknown as StyleSpecification}
          style={{ height: expandido ? '100%' : 620, width: '100%' }}
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
                  {/* Túmulo com mais de um memorial se apresenta pelo nome da
                      família, não por uma contagem seca (2026-09-16). Sem nome
                      de jazigo cadastrado, cai na contagem de sempre. */}
                  {varios && (
                    <p
                      style={{
                        fontSize: hover.props.jazigo_nome ? 12.5 : 10,
                        letterSpacing: hover.props.jazigo_nome ? 0 : 1.2,
                        textTransform: hover.props.jazigo_nome ? 'none' : 'uppercase',
                        fontWeight: hover.props.jazigo_nome ? 700 : 400,
                        color: hover.props.jazigo_nome ? '#1a1a1a' : '#8a6d3b',
                        margin: '0 0 8px',
                        paddingBottom: 6,
                        borderBottom: '1px solid rgba(0,0,0,0.08)',
                      }}
                    >
                      {hover.props.jazigo_nome || `${lista.length} memoriais neste túmulo`}
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
                          {/* O nome aparece sempre, inclusive em memorial com
                              senha: a trava protege o CONTEÚDO da página, não
                              de quem é o túmulo -- o nome já está gravado na
                              pedra, à vista de quem passa (2026-09-16). */}
                          <p style={{ fontSize: 13, margin: 0, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mem.nome}
                          </p>
                          <p style={{ fontSize: 10.5, margin: 0, color: '#666' }}>
                            {mem.protegido ? 'Toque para entrar com a senha' : 'Toque para ver o memorial'}
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

        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          aria-label={expandido ? 'Fechar mapa em tela cheia' : 'Abrir mapa em tela cheia'}
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 8,
            border: `1px solid ${CORES.douradoBorda}`,
            background: 'rgba(11,29,42,0.8)',
            color: CORES.textoForte,
            fontFamily: 'Georgia, serif',
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          {expandido ? <Minimize2 size={14} strokeWidth={1.5} /> : <Maximize2 size={14} strokeWidth={1.5} />}
          {expandido ? 'Fechar' : 'Tela cheia'}
        </button>
      </div>

      {!expandido && (
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
      )}
    </div>
  )
}
