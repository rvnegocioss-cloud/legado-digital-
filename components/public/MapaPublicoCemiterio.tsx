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
import CardPino, { type MemorialDoCard } from '@/components/public/CardPino'

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
  foto_lapide?: string | null
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
  // Card fixado por clique: sem isso o card fechava assim que o mouse saía da
  // cruz, e no computador ninguém conseguia chegar nos nomes pra clicar.
  const [fixo, setFixo] = useState(false)
  // O card NÃO pode sumir no instante em que o mouse sai da cruz -- senão não
  // dá pra levar o mouse até ele e clicar num nome (achado do Rafael,
  // 2026-09-23). Sai só depois de uma pequena folga sem estar na cruz nem no
  // card; entrar no card cancela o fechamento.
  const timerFechar = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelarFechar = useCallback(() => {
    if (timerFechar.current) clearTimeout(timerFechar.current)
    timerFechar.current = null
  }, [])
  const agendarFechar = useCallback(() => {
    cancelarFechar()
    timerFechar.current = setTimeout(() => setHover(null), 400)
  }, [cancelarFechar])
  const [busca, setBusca] = useState('')
  const [expandido, setExpandido] = useState(false)
  // A camada de pinos espera a imagem da cruz existir no mapa -- ver
  // aoCarregarMapa. Sem isso, o mapa abria sem nenhuma cruz marcada.
  const [iconePronto, setIconePronto] = useState(false)

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
    if (!map) return

    // O crédito compacto do MapLibre nasce ABERTO (ele mesmo põe a classe
    // `maplibregl-compact-show`), ou seja, a faixa de texto continuava em cima
    // do mapa. Tirar a classe deixa só o "i"; quem quiser o crédito toca nele.
    // Roda no primeiro `idle`, não no `load`: o MapLibre põe a classe de volta
    // quando termina de montar o controle, depois do `load`.
    const recolherCredito = () =>
      map.getContainer()
        .querySelector('.maplibregl-ctrl-attrib.maplibregl-compact')
        ?.classList.remove('maplibregl-compact-show')
    recolherCredito()
    map.once('idle', recolherCredito)

    // A camada de pinos só entra depois que a imagem da cruz existe no mapa.
    // Antes, a camada era criada na mesma hora e a imagem chegava depois (o
    // carregamento é assíncrono): o MapLibre não achava 'cruz-pino' e não
    // desenhava pino nenhum. As cruzes só apareciam quando alguma outra coisa
    // forçava o mapa a se redesenhar -- digitar na busca, por exemplo. Ou
    // seja: quem abria o mapa não via onde tinha memorial (achado real,
    // reportado pelo Rafael em 2026-09-16).
    if (map.hasImage('cruz-pino')) {
      setIconePronto(true)
    } else {
      const img = new Image(28, 28)
      img.onload = () => {
        if (!map.hasImage('cruz-pino')) map.addImage('cruz-pino', img)
        setIconePronto(true)
      }
      img.src = `data:image/svg+xml;base64,${btoa(CRUZ_SVG)}`
    }

    if (ortomosaico?.bounds) {
      const [minLng, minLat, maxLng, maxLat] = ortomosaico.bounds
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 0, maxZoom: 19 })
    }
  }, [ortomosaico])

  const aoMoverMouse = useCallback(
    (e: MapLayerMouseEvent) => {
      if (fixo) return
      const feature = e.features?.[0]
      if (!feature || feature.geometry.type !== 'Point') {
        agendarFechar()
        return
      }
      cancelarFechar()
      const [lng, lat] = feature.geometry.coordinates as [number, number]
      setHover({ lng, lat, props: feature.properties as PinoProps })
    },
    [fixo, agendarFechar, cancelarFechar]
  )

  const aoClicarPino = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      const props = feature?.properties as PinoProps | undefined
      // Clique em área vazia solta o card fixado.
      if (!props || !feature || feature.geometry.type !== 'Point') {
        cancelarFechar()
        setFixo(false)
        setHover(null)
        return
      }
      // Com mais de um memorial no mesmo túmulo o clique não escolhe por conta
      // própria: FIXA o card pra pessoa escolher qual quer abrir.
      if ((props.total ?? 1) > 1) {
        const [lng, lat] = feature.geometry.coordinates as [number, number]
        setHover({ lng, lat, props })
        setFixo(true)
        return
      }
      if (props.slug) router.push(`/homenagem/${props.slug}`)
    },
    [router, cancelarFechar]
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
    setFixo((s.props.total ?? 1) > 1)
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
                fontFamily: 'var(--ld-font-corpo)',
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
                        fontFamily: 'var(--ld-font-corpo)',
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
            Cada cruz no mapa é um memorial. Passe o mouse ou toque numa cruz para ver quem está ali.
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
          onMouseLeave={() => { if (!fixo) agendarFechar() }}
          onClick={aoClicarPino}
          cursor={hover ? 'pointer' : 'grab'}
          /* O crédito do mapa é obrigatório (termos do Esri World Imagery), mas
             a caixa branca padrão do MapLibre brigava com o tema escuro e comia
             a largura do mapa no celular. `compact` encolhe pra um "i" que abre
             ao toque; a cor vem do CSS (.maplibregl-ctrl-attrib em globals). */
          attributionControl={{ compact: true }}
        >
          <NavigationControl visualizePitch showZoom position="top-right" />

        {temMemoriais && iconePronto && (
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
            offset={14}
            className="card-pino-publico"
            closeButton={fixo}
            closeOnClick={false}
            onClose={() => {
              setFixo(false)
              setHover(null)
            }}
          >
            <div onMouseEnter={cancelarFechar} onMouseLeave={() => { if (!fixo) agendarFechar() }}>
              <CardPino
                dados={{ jazigo_nome: hover.props.jazigo_nome, foto_lapide: hover.props.foto_lapide }}
                lista={lerMemoriais(hover.props) as MemorialDoCard[]}
              />
            </div>
          </Popup>
        )}
        </Map>

        {/* Em tela cheia o rodapé do mapa some, então o botão de fechar fica no
            canto de BAIXO. Antes ficava no canto de cima à esquerda e tapava a
            lista de resultados da busca (achado do Rafael, 2026-09-23). Com o
            mapa pequeno o botão mora no rodapé, logo abaixo. */}
        {expandido && (
          <button
            type="button"
            onClick={() => setExpandido(false)}
            aria-label="Fechar mapa em tela cheia"
            className="btn-tela-cheia"
            style={{ position: 'absolute', bottom: 34, left: 10, zIndex: 10 }}
          >
            <Minimize2 size={14} strokeWidth={1.5} />
            Fechar
          </button>
        )}
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
            <button
              type="button"
              onClick={() => setExpandido(true)}
              aria-label="Abrir mapa em tela cheia"
              className="btn-tela-cheia"
              style={{ margin: '4px auto 8px' }}
            >
              <Maximize2 size={14} strokeWidth={1.5} />
              Tela cheia
            </button>
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
