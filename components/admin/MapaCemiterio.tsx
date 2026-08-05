'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import MapGL, { Source, Layer, Marker, Popup, NavigationControl, type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Cross, Flag, MapPin, Crosshair, X, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { supabase } from '@/lib/auth'
import { normalizarOrtomosaico, sourceOrtomosaico } from '@/lib/ortomosaico'
import { registrarProtocoloPmtiles } from '@/lib/registrarProtocoloPmtiles'
import { useDesenhoNoMapa } from './mapa/useDesenhoNoMapa'
import { centroide, comprimentoPolilinha } from '@/lib/geo'
import { interpolarPontos, validarEspacamento } from '@/lib/enderecoTumulo'

registrarProtocoloPmtiles()

const ESTILO_BASE = {
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

interface Cemiterio {
  id: string
  nome: string
  latitude: number | null
  longitude: number | null
  ortomosaico_url: string | null
  ortomosaico_minzoom: number | null
  ortomosaico_maxzoom: number | null
  ortomosaico_bounds: number[] | null
  entrada_latitude: number | null
  entrada_longitude: number | null
}

interface Lapide {
  id: string
  identificacao: string
  quadra: string | null
  lote: string | null
  latitude: number | null
  longitude: number | null
  coordenada_origem: string | null
}

interface Homenagem {
  id: string
  nome_completo: string
  foto_url: string | null
  slug: string | null
  lapide_id: string | null
}

interface Quadra {
  id: string
  numero: number
  nome: string | null
  situacao: string
  poligono: { type: 'Polygon'; coordinates: number[][][] } | null
  geometria_revisada: boolean
}

interface LapideEdicao {
  id: string
  numero: number | null
  fila_id: string | null
  codigo: string | null
  latitude: number
  longitude: number
  situacao: string
  temMemorial: boolean
}

interface Fila {
  id: string
  quadra_id: string
  numero: number
  quantidade_prevista: number | null
  eixo: { type: 'LineString'; coordinates: [number, number][] } | null
  geometria_revisada: boolean
}

type ItemNumeracao = { id: string; numero: number; label: string; distancia: number | null }
type NumeracaoProposta = { tipo: 'quadras' | 'filas'; contexto: string; itens: ItemNumeracao[]; precisaConfirmar: boolean }

const CORES_ORIGEM: Record<string, string> = {
  ortomosaico: '#C9A46A',
  gps_celular: '#4285F4',
  mapa_satelite: '#4285F4',
  importacao: '#8a8a8a',
  desconhecida: '#8a8a8a',
}

const FC_VAZIA = { type: 'FeatureCollection' as const, features: [] as never[] }

export function MapaCemiterio({ cemiterioId }: { cemiterioId: string }) {
  const [carregando, setCarregando] = useState(true)
  const [cemiterio, setCemiterio] = useState<Cemiterio | null>(null)
  const [lapides, setLapides] = useState<Lapide[]>([])
  const [homenagens, setHomenagens] = useState<Homenagem[]>([])
  const [quadras, setQuadras] = useState<Quadra[]>([])
  const [filas, setFilas] = useState<Fila[]>([])
  const [lapideSelecionada, setLapideSelecionada] = useState<Lapide | null>(null)
  const [lapideHover, setLapideHover] = useState<Lapide | null>(null)
  const [modoMarcar, setModoMarcar] = useState(false)
  const [lapideParaMarcar, setLapideParaMarcar] = useState<Lapide | null>(null)
  const [modoMarcarEntrada, setModoMarcarEntrada] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const mapRef = useRef<MapRef | null>(null)

  const desenho = useDesenhoNoMapa()
  const [quadraExpandida, setQuadraExpandida] = useState<Record<string, boolean>>({})
  const [quadraAtivaParaFila, setQuadraAtivaParaFila] = useState<Quadra | null>(null)
  const [numeracaoProposta, setNumeracaoProposta] = useState<NumeracaoProposta | null>(null)
  const [dialogoFila, setDialogoFila] = useState<{ filaId: string; quadraNumero: number; filaNumero: number; comprimentoM: number } | null>(null)
  const [quantidadeInput, setQuantidadeInput] = useState('')

  const [quadraEmEdicao, setQuadraEmEdicao] = useState<Quadra | null>(null)
  const [lapidesEdicao, setLapidesEdicao] = useState<LapideEdicao[]>([])
  const [modoAdicionarTumulo, setModoAdicionarTumulo] = useState(false)
  const [tumuloSelecionadoEdicao, setTumuloSelecionadoEdicao] = useState<string | null>(null)

  useEffect(() => {
    carregar()
  }, [cemiterioId])

  async function carregar() {
    setCarregando(true)
    const [{ data: c }, { data: l }, { data: h }, { data: geo }] = await Promise.all([
      supabase
        .from('cemiterios')
        .select('id, nome, latitude, longitude, ortomosaico_url, ortomosaico_minzoom, ortomosaico_maxzoom, ortomosaico_bounds, entrada_latitude, entrada_longitude')
        .eq('id', cemiterioId)
        .single(),
      supabase
        .from('lapides')
        .select('id, identificacao, quadra, lote, latitude, longitude, coordenada_origem')
        .eq('cemiterio_id', cemiterioId)
        .limit(20000),
      supabase
        .from('homenagens')
        .select('id, nome_completo, foto_url, slug, lapide_id, lapides!inner(cemiterio_id)')
        .eq('lapides.cemiterio_id', cemiterioId),
      supabase.rpc('obter_geojson_cemiterio', { p_cemiterio_id: cemiterioId }),
    ])
    setCemiterio(c)
    setLapides(l || [])
    setHomenagens(h || [])

    const geoData = geo as {
      quadras?: { features: { properties: { id: string; numero: number; nome: string | null; situacao: string; geometria_revisada: boolean }; geometry: Quadra['poligono'] }[] }
      filas?: {
        features: {
          properties: { id: string; quadra_id: string; numero: number; quantidade_prevista: number | null; geometria_revisada: boolean }
          geometry: Fila['eixo']
        }[]
      }
    } | null

    setQuadras(
      (geoData?.quadras?.features || []).map((f) => ({
        id: f.properties.id,
        numero: f.properties.numero,
        nome: f.properties.nome,
        situacao: f.properties.situacao,
        poligono: f.geometry,
        geometria_revisada: f.properties.geometria_revisada,
      }))
    )
    setFilas(
      (geoData?.filas?.features || []).map((f) => ({
        id: f.properties.id,
        quadra_id: f.properties.quadra_id,
        numero: f.properties.numero,
        quantidade_prevista: f.properties.quantidade_prevista,
        eixo: f.geometry,
        geometria_revisada: f.properties.geometria_revisada,
      }))
    )
    setCarregando(false)
  }

  const ortomosaico = useMemo(
    () =>
      cemiterio
        ? normalizarOrtomosaico({
            url: cemiterio.ortomosaico_url,
            minzoom: cemiterio.ortomosaico_minzoom,
            maxzoom: cemiterio.ortomosaico_maxzoom,
            bounds: cemiterio.ortomosaico_bounds,
          })
        : null,
    [cemiterio]
  )

  const estiloMapa = useMemo(() => {
    if (!ortomosaico) return ESTILO_BASE
    return {
      ...ESTILO_BASE,
      sources: { ...ESTILO_BASE.sources, orto: sourceOrtomosaico(ortomosaico) },
      layers: [...ESTILO_BASE.layers, { id: 'orto-layer', type: 'raster' as const, source: 'orto' }],
    }
  }, [ortomosaico])

  const lapidesComCoordenada = lapides.filter((l) => l.latitude != null && l.longitude != null)
  const lapidesSemCoordenada = lapides.filter((l) => l.latitude == null || l.longitude == null)
  const homenagemPorLapide = new Map(homenagens.map((h) => [h.lapide_id, h]))

  const idsEdicao = useMemo(() => new Set(lapidesEdicao.map((l) => l.id)), [lapidesEdicao])

  const geojsonPinos = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: lapidesComCoordenada
        .filter((l) => !idsEdicao.has(l.id))
        .map((l) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [l.longitude!, l.latitude!] },
          properties: { lapideId: l.id, origem: l.coordenada_origem || 'desconhecida' },
        })),
    }),
    [lapidesComCoordenada, idsEdicao]
  )

  const quadrasGeojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: quadras
        .filter((q) => q.poligono)
        .map((q) => ({
          type: 'Feature' as const,
          geometry: q.poligono!,
          properties: { id: q.id, numero: q.numero, label: `Q${q.numero}` },
        })),
    }),
    [quadras]
  )

  const quadrasCentroides = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: quadras
        .filter((q) => q.poligono)
        .map((q) => {
          const anel = q.poligono!.coordinates[0] as [number, number][]
          const c = centroide(anel)
          return {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
            properties: { label: `Q${q.numero}` },
          }
        }),
    }),
    [quadras]
  )

  const filasGeojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: filas
        .filter((f) => f.eixo)
        .map((f) => ({
          type: 'Feature' as const,
          geometry: f.eixo!,
          properties: { id: f.id, numero: f.numero },
        })),
    }),
    [filas]
  )

  const filaDoDialogo = dialogoFila ? filas.find((f) => f.id === dialogoFila.filaId) : null
  const quantidadeNumerica = parseInt(quantidadeInput, 10)
  const previewPontos = useMemo(() => {
    if (!filaDoDialogo?.eixo || !quantidadeNumerica || quantidadeNumerica < 1) return null
    return interpolarPontos(filaDoDialogo.eixo.coordinates, quantidadeNumerica)
  }, [filaDoDialogo, quantidadeNumerica])

  const espacamentoInfo =
    dialogoFila && previewPontos && previewPontos.length > 1 ? validarEspacamento(dialogoFila.comprimentoM, previewPontos.length) : null

  const geojsonPreviewGeracao = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: (previewPontos || []).map((p, i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: p },
        properties: { i },
      })),
    }),
    [previewPontos]
  )

  function aoCarregarMapa() {
    if (!mapRef.current) return
    if (ortomosaico?.bounds) {
      mapRef.current.fitBounds(
        [
          [ortomosaico.bounds[0], ortomosaico.bounds[1]],
          [ortomosaico.bounds[2], ortomosaico.bounds[3]],
        ],
        { padding: 40, duration: 0 }
      )
    } else if (lapidesComCoordenada.length > 0) {
      const lngs = lapidesComCoordenada.map((l) => l.longitude!)
      const lats = lapidesComCoordenada.map((l) => l.latitude!)
      mapRef.current.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, maxZoom: 20, duration: 0 }
      )
    } else if (cemiterio?.latitude != null && cemiterio?.longitude != null) {
      mapRef.current.flyTo({ center: [cemiterio.longitude, cemiterio.latitude], zoom: 17, duration: 0 })
    }
  }

  async function aoClicarMapa(e: MapLayerMouseEvent) {
    if (modoMarcarEntrada) {
      await salvarEntrada(e.lngLat.lat, e.lngLat.lng)
      return
    }

    if (modoMarcar && lapideParaMarcar) {
      await salvarCoordenada(lapideParaMarcar.id, e.lngLat.lat, e.lngLat.lng)
      return
    }

    if (modoAdicionarTumulo) {
      await adicionarTumulo(e.lngLat.lat, e.lngLat.lng)
      return
    }

    if (desenho.ativo) {
      desenho.adicionarPonto(e.lngLat.lng, e.lngLat.lat)
      return
    }

    const feature = e.features?.[0]
    if (feature?.properties?.lapideId) {
      const lapide = lapides.find((l) => l.id === feature.properties!.lapideId)
      if (lapide) setLapideSelecionada(lapide)
    } else {
      setLapideSelecionada(null)
    }
  }

  function aoMoverMouseMapa(e: MapLayerMouseEvent) {
    const feature = e.features?.[0]
    if (feature?.properties?.lapideId) {
      const lapide = lapides.find((l) => l.id === feature.properties!.lapideId)
      setLapideHover(lapide && homenagemPorLapide.get(lapide.id) ? lapide : null)
    } else {
      setLapideHover(null)
    }
  }

  async function salvarEntrada(lat: number, lng: number) {
    setSalvando(true)
    setMsg('')
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { error } = await supabase
      .from('cemiterios')
      .update({
        entrada_latitude: lat,
        entrada_longitude: lng,
        entrada_atualizada_em: new Date().toISOString(),
        entrada_atualizada_por: session?.user?.id || null,
      })
      .eq('id', cemiterioId)

    if (error) {
      setMsg(error.message)
    } else {
      setMsg('Entrada do cemitério marcada.')
      setModoMarcarEntrada(false)
      await carregar()
    }
    setSalvando(false)
  }

  async function salvarCoordenada(lapideId: string, lat: number, lng: number) {
    setSalvando(true)
    setMsg('')
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { error } = await supabase
      .from('lapides')
      .update({
        latitude: lat,
        longitude: lng,
        coordenada_origem: ortomosaico ? 'ortomosaico' : 'mapa_satelite',
        coordenada_atualizada_em: new Date().toISOString(),
        coordenada_atualizada_por: session?.user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lapideId)

    if (error) {
      setMsg(error.message)
    } else {
      setMsg(`Coordenada salva pra ${lapideParaMarcar?.identificacao}.`)
      setLapideParaMarcar(null)
      await carregar()
    }
    setSalvando(false)
  }

  async function onConcluirQuadra(pontos: [number, number][]) {
    setSalvando(true)
    setMsg('')
    const c = centroide(pontos)
    const proximoNumero = quadras.reduce((max, q) => Math.max(max, q.numero), 0) + 1
    const { error } = await supabase.from('quadras').insert({
      cemiterio_id: cemiterioId,
      numero: proximoNumero,
      poligono: { type: 'Polygon', coordinates: [pontos] },
      centro_latitude: c.lat,
      centro_longitude: c.lng,
    })
    if (error) setMsg(error.message)
    else {
      setMsg(`Quadra ${proximoNumero} criada — numera a partir da entrada quando tiver todas desenhadas.`)
      await carregar()
    }
    setSalvando(false)
  }

  async function onConcluirFila(pontos: [number, number][]) {
    if (!quadraAtivaParaFila) return
    setSalvando(true)
    setMsg('')
    const proximoNumero = filas.filter((f) => f.quadra_id === quadraAtivaParaFila.id).reduce((max, f) => Math.max(max, f.numero), 0) + 1
    const { data, error } = await supabase
      .from('filas')
      .insert({
        cemiterio_id: cemiterioId,
        quadra_id: quadraAtivaParaFila.id,
        numero: proximoNumero,
        eixo: { type: 'LineString', coordinates: pontos },
      })
      .select('id')
      .single()

    if (error || !data) {
      setMsg(error?.message || 'Erro ao criar rua.')
      setSalvando(false)
      return
    }

    setMsg(`Rua ${proximoNumero} da Quadra ${quadraAtivaParaFila.numero} criada — agora gera os túmulos.`)
    await carregar()
    setDialogoFila({
      filaId: data.id,
      quadraNumero: quadraAtivaParaFila.numero,
      filaNumero: proximoNumero,
      comprimentoM: comprimentoPolilinha(pontos),
    })
    setQuantidadeInput('')
    setQuadraAtivaParaFila(null)
    setSalvando(false)
  }

  async function proporNumeracaoQuadras() {
    setMsg('')
    const { data, error } = await supabase.rpc('propor_numeracao_quadras', { p_cemiterio_id: cemiterioId })
    if (error) {
      setMsg(error.message)
      return
    }
    setNumeracaoProposta({
      tipo: 'quadras',
      contexto: cemiterioId,
      precisaConfirmar: false,
      itens: ((data || []) as { quadra_id: string; numero_sugerido: number; nome: string | null; distancia_entrada_m: number | null }[]).map((d) => ({
        id: d.quadra_id,
        numero: d.numero_sugerido,
        label: d.nome || `Quadra`,
        distancia: d.distancia_entrada_m,
      })),
    })
  }

  async function proporNumeracaoFilas(quadra: Quadra) {
    setMsg('')
    const { data, error } = await supabase.rpc('propor_numeracao_filas', { p_quadra_id: quadra.id })
    if (error) {
      setMsg(error.message)
      return
    }
    setNumeracaoProposta({
      tipo: 'filas',
      contexto: quadra.id,
      precisaConfirmar: false,
      itens: ((data || []) as { fila_id: string; numero_sugerido: number; distancia_entrada_m: number | null }[]).map((d) => ({
        id: d.fila_id,
        numero: d.numero_sugerido,
        label: `Rua`,
        distancia: d.distancia_entrada_m,
      })),
    })
  }

  async function confirmarNumeracao(forcar: boolean) {
    if (!numeracaoProposta) return
    setSalvando(true)
    setMsg('')
    const ordem = numeracaoProposta.itens.map((i) => i.id)
    const rpc = numeracaoProposta.tipo === 'quadras' ? 'aplicar_numeracao_quadras' : 'aplicar_numeracao_filas'
    const params =
      numeracaoProposta.tipo === 'quadras'
        ? { p_cemiterio_id: cemiterioId, p_ordem: ordem, p_confirmar_recodificacao: forcar }
        : { p_quadra_id: numeracaoProposta.contexto, p_ordem: ordem, p_confirmar_recodificacao: forcar }

    const { error } = await supabase.rpc(rpc, params as any)

    if (error) {
      if (!forcar && error.message.includes('memorial vinculado')) {
        setMsg(error.message)
        setNumeracaoProposta({ ...numeracaoProposta, precisaConfirmar: true })
      } else {
        setMsg(error.message)
      }
    } else {
      setMsg(numeracaoProposta.tipo === 'quadras' ? 'Quadras numeradas.' : 'Ruas numeradas.')
      setNumeracaoProposta(null)
      await carregar()
    }
    setSalvando(false)
  }

  async function gerarTumulos() {
    if (!dialogoFila || !quantidadeNumerica || quantidadeNumerica < 1) {
      setMsg('Digita uma quantidade válida.')
      return
    }
    setSalvando(true)
    setMsg('')
    const { error } = await supabase.rpc('gerar_lapides_fila', {
      p_fila_id: dialogoFila.filaId,
      p_quantidade: quantidadeNumerica,
      p_substituir: false,
    })
    if (error) {
      setMsg(error.message)
    } else {
      setMsg(`${quantidadeNumerica} túmulos gerados na Rua ${dialogoFila.filaNumero} da Quadra ${dialogoFila.quadraNumero}.`)
      setDialogoFila(null)
      await carregar()
    }
    setSalvando(false)
  }

  async function entrarModoEdicao(quadra: Quadra) {
    setMsg('')
    desenho.cancelar()
    setModoMarcar(false)
    setModoMarcarEntrada(false)
    const { data, error } = await supabase
      .from('lapides')
      .select('id, numero, fila_id, codigo, latitude, longitude, situacao, homenagens(id)')
      .eq('quadra_id', quadra.id)
      .not('latitude', 'is', null)
      .order('numero')
    if (error) {
      setMsg(error.message)
      return
    }
    setLapidesEdicao(
      (data || []).map((l: any) => ({
        id: l.id,
        numero: l.numero,
        fila_id: l.fila_id,
        codigo: l.codigo,
        latitude: l.latitude,
        longitude: l.longitude,
        situacao: l.situacao,
        temMemorial: Array.isArray(l.homenagens) ? l.homenagens.length > 0 : !!l.homenagens,
      }))
    )
    setQuadraEmEdicao(quadra)
    setModoAdicionarTumulo(false)
    setTumuloSelecionadoEdicao(null)
  }

  function sairModoEdicao() {
    setQuadraEmEdicao(null)
    setLapidesEdicao([])
    setModoAdicionarTumulo(false)
    setTumuloSelecionadoEdicao(null)
  }

  async function arrastarTumulo(id: string, lat: number, lng: number) {
    const lapide = lapidesEdicao.find((l) => l.id === id)
    if (lapide?.fila_id && filas.find((f) => f.id === lapide.fila_id)?.geometria_revisada) {
      setMsg('Essa fileira tá travada -- destrava pra mexer nesse túmulo.')
      return
    }
    setLapidesEdicao((atual) => atual.map((l) => (l.id === id ? { ...l, latitude: lat, longitude: lng } : l)))
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const { error } = await supabase
      .from('lapides')
      .update({
        latitude: lat,
        longitude: lng,
        coordenada_origem: 'ortomosaico',
        coordenada_precisao: 'exata',
        coordenada_atualizada_em: new Date().toISOString(),
        coordenada_atualizada_por: session?.user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) setMsg(error.message)
  }

  function _distanciaPontoSegmento(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const dx = x2 - x1
    const dy = y2 - y1
    const comprimentoSq = dx * dx + dy * dy
    let t = comprimentoSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / comprimentoSq
    t = Math.max(0, Math.min(1, t))
    const projX = x1 + t * dx
    const projY = y1 + t * dy
    return Math.hypot(px - projX, py - projY)
  }

  async function adicionarTumulo(lat: number, lng: number) {
    if (!quadraEmEdicao) return
    const filasDaQuadra = filas.filter((f) => f.quadra_id === quadraEmEdicao.id && f.eixo && !f.geometria_revisada)
    if (filasDaQuadra.length === 0) {
      setMsg('Nenhuma rua livre pra vincular o túmulo novo (ou não tem rua, ou tão todas travadas).')
      return
    }

    let filaMaisPerto = filasDaQuadra[0]
    let menorDist = Infinity
    for (const f of filasDaQuadra) {
      const [c0, c1] = f.eixo!.coordinates
      const d = _distanciaPontoSegmento(lng, lat, c0[0], c0[1], c1[0], c1[1])
      if (d < menorDist) {
        menorDist = d
        filaMaisPerto = f
      }
    }

    const numerosDaFila = lapidesEdicao.filter((l) => l.fila_id === filaMaisPerto.id).map((l) => l.numero || 0)
    const proximoNumero = (numerosDaFila.length > 0 ? Math.max(...numerosDaFila) : 0) + 1
    const codigo = `Q${String(quadraEmEdicao.numero).padStart(2, '0')}-R${String(filaMaisPerto.numero).padStart(2, '0')}-T${String(proximoNumero).padStart(3, '0')}`

    setSalvando(true)
    const { data, error } = await supabase
      .from('lapides')
      .insert({
        cemiterio_id: cemiterioId,
        quadra_id: quadraEmEdicao.id,
        fila_id: filaMaisPerto.id,
        numero: proximoNumero,
        codigo,
        identificacao: codigo,
        quadra: String(quadraEmEdicao.numero),
        lote: String(proximoNumero),
        latitude: lat,
        longitude: lng,
        coordenada_origem: 'ortomosaico',
        coordenada_precisao: 'exata',
        situacao: 'nao_confirmada',
      })
      .select('id, numero, fila_id, codigo, latitude, longitude, situacao')
      .single()

    if (error || !data) {
      setMsg(error?.message || 'Erro ao adicionar túmulo.')
    } else {
      setLapidesEdicao((atual) => [...atual, { ...data, temMemorial: false }])
      setMsg(`Túmulo ${codigo} adicionado.`)
    }
    setSalvando(false)
  }

  async function apagarTumulo(id: string) {
    const lapide = lapidesEdicao.find((l) => l.id === id)
    if (!lapide) return
    if (lapide.temMemorial) {
      setMsg('Esse túmulo já tem memorial vinculado -- não dá pra apagar por aqui.')
      return
    }
    if (lapide.fila_id && filas.find((f) => f.id === lapide.fila_id)?.geometria_revisada) {
      setMsg('Essa fileira tá travada -- destrava pra apagar esse túmulo.')
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('lapides').delete().eq('id', id)
    if (error) {
      setMsg(error.message)
    } else {
      setLapidesEdicao((atual) => atual.filter((l) => l.id !== id))
      setTumuloSelecionadoEdicao(null)
      setMsg(`Túmulo ${lapide.codigo} apagado.`)
    }
    setSalvando(false)
  }

  async function travarQuadra() {
    if (!quadraEmEdicao) return
    setSalvando(true)
    const { error } = await supabase.from('quadras').update({ geometria_revisada: true }).eq('id', quadraEmEdicao.id)
    if (error) {
      setMsg(error.message)
    } else {
      setMsg(`Quadra ${quadraEmEdicao.numero} travada -- geometria confirmada.`)
      sairModoEdicao()
      await carregar()
    }
    setSalvando(false)
  }

  async function destravarQuadra(quadra: Quadra) {
    setSalvando(true)
    const { error } = await supabase.from('quadras').update({ geometria_revisada: false }).eq('id', quadra.id)
    if (error) setMsg(error.message)
    else await carregar()
    setSalvando(false)
  }

  async function travarFila(quadraNumero: number, fila: Fila) {
    setSalvando(true)
    const { error } = await supabase.from('filas').update({ geometria_revisada: true }).eq('id', fila.id)
    if (error) setMsg(error.message)
    else {
      setMsg(`Rua ${fila.numero} da Quadra ${quadraNumero} travada.`)
      await carregar()
    }
    setSalvando(false)
  }

  async function destravarFila(fila: Fila) {
    setSalvando(true)
    const { error } = await supabase.from('filas').update({ geometria_revisada: false }).eq('id', fila.id)
    if (error) setMsg(error.message)
    else await carregar()
    setSalvando(false)
  }

  if (carregando) return <p className="text-zinc-400 text-sm">Carregando mapa...</p>
  if (!cemiterio) return <p className="text-zinc-400 text-sm">Cemitério não encontrado.</p>

  const desenhandoQuadra = desenho.ativo && desenho.modo === 'poligono'
  const desenhandoFila = desenho.ativo && desenho.modo === 'linha'

  return (
    <div>
      <Link href={`/admin/cemiterios/${cemiterioId}/lapides`} className="text-zinc-400 hover:text-white text-sm mb-4 inline-block">
        ← Voltar pra Lápides de {cemiterio.nome}
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Mapa — {cemiterio.nome}</h1>
      <p className="text-zinc-400 text-sm mb-2">
        {quadras.length} quadra(s) · {filas.length} rua(s) · {lapidesComCoordenada.length} de {lapides.length} túmulos com coordenada
      </p>
      {!ortomosaico && (
        <p className="text-amber-400 text-xs mb-4 bg-amber-950/30 border border-amber-900/40 rounded-lg px-3 py-2 inline-block">
          Este cemitério ainda não tem ortomosaico de drone — a marcação usa satélite genérico (precisão de metros, não de centímetros).
        </p>
      )}

      <div className="grid lg:grid-cols-12 gap-4 mt-4">
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-zinc-800 overflow-hidden" style={{ height: 560 }}>
            <MapGL
              ref={mapRef}
              onLoad={aoCarregarMapa}
              initialViewState={{
                longitude: cemiterio.longitude ?? -47.9,
                latitude: cemiterio.latitude ?? -15.8,
                zoom: cemiterio.longitude != null ? 17 : 4,
                pitch: 0,
                bearing: 0,
              }}
              maxPitch={70}
              mapStyle={estiloMapa as any}
              style={{
                width: '100%',
                height: '100%',
                cursor:
                  modoMarcarEntrada || (modoMarcar && lapideParaMarcar) || desenho.ativo || modoAdicionarTumulo
                    ? 'crosshair'
                    : undefined,
              }}
              interactiveLayerIds={['lapides-pinos']}
              onClick={aoClicarMapa}
              onMouseMove={aoMoverMouseMapa}
            >
              <NavigationControl showZoom position="top-right" />

              <Source id="quadras" type="geojson" data={quadrasGeojson}>
                <Layer id="quadras-fill" type="fill" paint={{ 'fill-color': '#C9A46A', 'fill-opacity': 0.08 }} />
                <Layer id="quadras-linha" type="line" paint={{ 'line-color': '#C9A46A', 'line-width': 1.5, 'line-opacity': 0.6 }} />
              </Source>

              <Source id="quadras-labels" type="geojson" data={quadrasCentroides}>
                <Layer
                  id="quadras-labels-layer"
                  type="symbol"
                  layout={{ 'text-field': ['get', 'label'], 'text-size': 13, 'text-allow-overlap': false }}
                  paint={{ 'text-color': '#C9A46A', 'text-halo-color': '#0B1D2A', 'text-halo-width': 1.5 }}
                />
              </Source>

              <Source id="filas" type="geojson" data={filasGeojson}>
                <Layer id="filas-linha" type="line" paint={{ 'line-color': '#4285F4', 'line-width': 2, 'line-opacity': 0.7, 'line-dasharray': [1, 1] }} />
              </Source>

              <Source id="desenho-preview" type="geojson" data={desenho.geojsonPreview ?? FC_VAZIA}>
                <Layer
                  id="desenho-preview-fill"
                  type="fill"
                  filter={['==', ['geometry-type'], 'Polygon']}
                  paint={{ 'fill-color': '#22c55e', 'fill-opacity': 0.15 }}
                />
                <Layer
                  id="desenho-preview-linha"
                  type="line"
                  filter={['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]]}
                  paint={{ 'line-color': '#22c55e', 'line-width': 2 }}
                />
                <Layer
                  id="desenho-preview-ponto"
                  type="circle"
                  filter={['==', ['geometry-type'], 'Point']}
                  paint={{ 'circle-radius': 6, 'circle-color': '#22c55e' }}
                />
              </Source>

              {dialogoFila && (
                <Source id="preview-geracao" type="geojson" data={geojsonPreviewGeracao}>
                  <Layer
                    id="preview-geracao-pontos"
                    type="circle"
                    paint={{ 'circle-radius': 4, 'circle-color': '#a3e635', 'circle-stroke-width': 1, 'circle-stroke-color': '#0B1D2A' }}
                  />
                </Source>
              )}

              <Source id="lapides" type="geojson" data={geojsonPinos}>
                <Layer
                  id="lapides-pinos"
                  type="circle"
                  paint={{
                    'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 3, 20, 9],
                    'circle-color': [
                      'match',
                      ['get', 'origem'],
                      'ortomosaico',
                      CORES_ORIGEM.ortomosaico,
                      'gps_celular',
                      CORES_ORIGEM.gps_celular,
                      'mapa_satelite',
                      CORES_ORIGEM.mapa_satelite,
                      CORES_ORIGEM.desconhecida,
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#0B1D2A',
                  }}
                />
              </Source>

              {cemiterio.entrada_latitude != null && cemiterio.entrada_longitude != null && (
                <Marker longitude={cemiterio.entrada_longitude} latitude={cemiterio.entrada_latitude} anchor="bottom">
                  <div title="Entrada do cemitério">
                    <Flag size={22} strokeWidth={2} fill="#22c55e" style={{ color: '#0B1D2A' }} />
                  </div>
                </Marker>
              )}

              {quadraEmEdicao &&
                lapidesEdicao.map((l) => {
                  const filaTravada = !!(l.fila_id && filas.find((f) => f.id === l.fila_id)?.geometria_revisada)
                  return (
                    <Marker
                      key={l.id}
                      longitude={l.longitude}
                      latitude={l.latitude}
                      anchor="center"
                      draggable={!filaTravada}
                      onDragEnd={(e) => arrastarTumulo(l.id, e.lngLat.lat, e.lngLat.lng)}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          setTumuloSelecionadoEdicao((atual) => (atual === l.id ? null : l.id))
                        }}
                        title={`${l.codigo || ''}${filaTravada ? ' (fila travada)' : ''}`}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: filaTravada ? 'not-allowed' : 'grab',
                          opacity: filaTravada ? 0.55 : 1,
                          color: '#0B1D2A',
                          background: l.temMemorial ? '#22c55e' : tumuloSelecionadoEdicao === l.id ? '#f87171' : '#C9A46A',
                          border: '2px solid #0B1D2A',
                          boxShadow: '0 0 0 1px rgba(255,255,255,0.6)',
                        }}
                      >
                        {l.numero ?? '?'}
                      </div>
                    </Marker>
                  )
                })}

              {tumuloSelecionadoEdicao && (() => {
                const l = lapidesEdicao.find((x) => x.id === tumuloSelecionadoEdicao)
                if (!l) return null
                const filaTravada = !!(l.fila_id && filas.find((f) => f.id === l.fila_id)?.geometria_revisada)
                const bloqueado = l.temMemorial || filaTravada
                return (
                  <Popup
                    longitude={l.longitude}
                    latitude={l.latitude}
                    anchor="top"
                    offset={16}
                    closeButton={false}
                    onClose={() => setTumuloSelecionadoEdicao(null)}
                  >
                    <div style={{ minWidth: 140 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: 0 }}>{l.codigo}</p>
                      <p style={{ fontSize: 11, color: '#888', margin: '2px 0 8px' }}>
                        {l.temMemorial ? 'Tem memorial vinculado' : filaTravada ? 'Fileira travada' : 'Sem memorial'}
                      </p>
                      <button
                        type="button"
                        disabled={bloqueado || salvando}
                        onClick={() => apagarTumulo(l.id)}
                        style={{
                          fontSize: 12,
                          color: bloqueado ? '#999' : '#dc2626',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: bloqueado ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Apagar túmulo
                      </button>
                    </div>
                  </Popup>
                )
              })()}

              {lapideHover && lapideHover.id !== lapideSelecionada?.id && (
                <Popup
                  longitude={lapideHover.longitude!}
                  latitude={lapideHover.latitude!}
                  anchor="bottom"
                  offset={12}
                  closeButton={false}
                  closeOnClick={false}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        padding: 2,
                        flexShrink: 0,
                        background: 'conic-gradient(from 0deg, #C9A46A, #E4CFA0, #A9824B, #C9A46A)',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          background: '#0B1D2A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {homenagemPorLapide.get(lapideHover.id)?.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={homenagemPorLapide.get(lapideHover.id)!.foto_url!}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Cross size={16} strokeWidth={1.5} style={{ color: '#C9A46A' }} />
                        )}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600, margin: 0, color: '#a15c00' }}>
                        Homenageado(a)
                      </p>
                      <p style={{ fontSize: 13, margin: '2px 0 0', fontWeight: 600 }}>
                        {homenagemPorLapide.get(lapideHover.id)?.nome_completo}
                      </p>
                    </div>
                  </div>
                </Popup>
              )}

              {lapideSelecionada && (
                <Popup
                  longitude={lapideSelecionada.longitude!}
                  latitude={lapideSelecionada.latitude!}
                  anchor="bottom"
                  offset={12}
                  onClose={() => setLapideSelecionada(null)}
                  closeButton
                >
                  <div style={{ minWidth: 180 }}>
                    {(() => {
                      const h = homenagemPorLapide.get(lapideSelecionada.id)
                      return (
                        <>
                          <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
                            {lapideSelecionada.identificacao}
                            {lapideSelecionada.quadra && ` · Q${lapideSelecionada.quadra}`}
                            {lapideSelecionada.lote && ` L${lapideSelecionada.lote}`}
                          </p>
                          {h ? (
                            <p style={{ fontSize: 12, margin: '4px 0' }}>{h.nome_completo}</p>
                          ) : (
                            <p style={{ fontSize: 11, color: '#888', margin: '4px 0' }}>Sem memorial vinculado</p>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                            {h && (
                              <a href={`/admin/memoriais/${h.id}`} style={{ fontSize: 12, color: '#0B5FFF' }}>
                                Abrir memorial →
                              </a>
                            )}
                            <a
                              href={`/admin/cemiterios/${cemiterioId}/lapides/${lapideSelecionada.id}/gavetas-3d`}
                              style={{ fontSize: 12, color: '#0B5FFF' }}
                            >
                              Gavetas 3D →
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setModoMarcar(true)
                                setLapideParaMarcar(lapideSelecionada)
                                setLapideSelecionada(null)
                              }}
                              style={{ fontSize: 12, color: '#a15c00', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                            >
                              Mover pino
                            </button>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </Popup>
              )}
            </MapGL>
          </div>
        </div>

        <div className="lg:col-span-4">
          {msg && (
            <p className="text-xs text-zinc-300 mb-3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">{msg}</p>
          )}

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mb-4">
            <h2 className="text-sm font-semibold text-white mb-1">Entrada do cemitério</h2>
            <p className="text-xs text-zinc-500 mb-3">
              {cemiterio.entrada_latitude != null
                ? 'Marcada — é daqui que a rota até o túmulo começa na página pública, e as quadras/ruas são numeradas a partir daqui.'
                : 'Ainda não marcada — rota pública usa o centro genérico, e não dá pra numerar quadra/rua sem uma âncora.'}
            </p>
            {modoMarcarEntrada ? (
              <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/40 px-3 py-2 flex items-center justify-between">
                <p className="text-xs text-emerald-300">Clique no mapa no portão/entrada real</p>
                <button type="button" onClick={() => setModoMarcarEntrada(false)} className="text-emerald-400 hover:text-emerald-200">
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={salvando}
                onClick={() => {
                  setModoMarcarEntrada(true)
                  setModoMarcar(false)
                  setLapideParaMarcar(null)
                  desenho.cancelar()
                }}
                className="w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 text-zinc-300 hover:bg-zinc-800"
              >
                <Flag size={12} strokeWidth={1.5} />
                {cemiterio.entrada_latitude != null ? 'Remarcar entrada' : 'Marcar entrada do cemitério'}
              </button>
            )}
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mb-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-white">Quadras e ruas</h2>
              <button
                type="button"
                disabled={salvando || desenho.ativo}
                onClick={() => {
                  setModoMarcarEntrada(false)
                  setModoMarcar(false)
                  desenho.iniciar('poligono', onConcluirQuadra)
                }}
                className="text-xs flex items-center gap-1 text-amber-400 hover:text-amber-200 disabled:opacity-40"
              >
                <Plus size={12} strokeWidth={2} /> Nova quadra
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Desenha o contorno de cada quadra, numera a partir da entrada, depois desenha as ruas dentro dela.
            </p>

            {desenhandoQuadra && (
              <BarraDesenho
                texto={`Clica nos cantos da quadra (${desenho.pontos.length} ponto${desenho.pontos.length === 1 ? '' : 's'}) — mínimo 3`}
                podeConcluir={desenho.pontos.length >= 3}
                onConcluir={desenho.concluir}
                onDesfazer={desenho.desfazerUltimoPonto}
                onCancelar={desenho.cancelar}
              />
            )}

            {desenhandoFila && (
              <BarraDesenho
                texto={`Clica no centro do 1º e do último túmulo da fileira (${desenho.pontos.length} ponto${desenho.pontos.length === 1 ? '' : 's'})`}
                podeConcluir={desenho.pontos.length >= 2}
                onConcluir={desenho.concluir}
                onDesfazer={desenho.desfazerUltimoPonto}
                onCancelar={() => {
                  desenho.cancelar()
                  setQuadraAtivaParaFila(null)
                }}
              />
            )}

            {quadras.length === 0 && !desenhandoQuadra && (
              <p className="text-zinc-500 text-xs">Nenhuma quadra desenhada ainda.</p>
            )}

            {(() => {
              const quadrasSemFila = quadras.filter((q) => !filas.some((f) => f.quadra_id === q.id))
              const filasSemTumulo = filas.filter((f) => !f.quantidade_prevista)
              if (quadrasSemFila.length === 0 && filasSemTumulo.length === 0) return null
              return (
                <p className="text-xs text-amber-400 mb-2">
                  ⚠ Pendências: {quadrasSemFila.length > 0 && `${quadrasSemFila.length} quadra(s) sem rua`}
                  {quadrasSemFila.length > 0 && filasSemTumulo.length > 0 && ' · '}
                  {filasSemTumulo.length > 0 && `${filasSemTumulo.length} rua(s) sem túmulo gerado`}
                </p>
              )
            })()}

            {cemiterio.entrada_latitude != null && quadras.length > 1 && !numeracaoProposta && (
              <button
                type="button"
                onClick={proporNumeracaoQuadras}
                className="w-full text-xs text-center py-1.5 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 mb-2"
              >
                Numerar quadras a partir da entrada
              </button>
            )}

            {numeracaoProposta?.tipo === 'quadras' && (
              <PainelNumeracaoProposta
                titulo="Ordem proposta das quadras"
                itens={numeracaoProposta.itens}
                precisaConfirmar={numeracaoProposta.precisaConfirmar}
                onConfirmar={() => confirmarNumeracao(numeracaoProposta.precisaConfirmar)}
                onCancelar={() => setNumeracaoProposta(null)}
              />
            )}

            <ul className="space-y-1 max-h-96 overflow-y-auto">
              {quadras
                .slice()
                .sort((a, b) => a.numero - b.numero)
                .map((q) => {
                  const filasDaQuadra = filas.filter((f) => f.quadra_id === q.id).sort((a, b) => a.numero - b.numero)
                  const expandida = !!quadraExpandida[q.id]
                  return (
                    <li key={q.id} className="rounded border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setQuadraExpandida((s) => ({ ...s, [q.id]: !s[q.id] }))}
                        className="w-full flex items-center gap-1.5 text-left text-sm px-2 py-1.5 text-zinc-200 hover:bg-zinc-800"
                      >
                        {expandida ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Quadra {q.numero}
                        {q.geometria_revisada && <span className="text-emerald-400 text-xs">🔒</span>}
                        <span className="text-zinc-500 text-xs ml-auto">{filasDaQuadra.length} rua(s)</span>
                      </button>

                      {expandida && (
                        <div className="px-3 pb-2 pt-1 border-t border-zinc-800">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <button
                              type="button"
                              disabled={salvando || desenho.ativo || q.geometria_revisada}
                              onClick={() => {
                                setModoMarcarEntrada(false)
                                setModoMarcar(false)
                                setQuadraAtivaParaFila(q)
                                desenho.iniciar('linha', onConcluirFila)
                              }}
                              className="text-xs flex items-center gap-1 text-amber-400 hover:text-amber-200 disabled:opacity-40"
                            >
                              <Plus size={11} strokeWidth={2} /> Nova rua
                            </button>
                            {cemiterio.entrada_latitude != null && filasDaQuadra.length > 1 && (
                              <button
                                type="button"
                                disabled={q.geometria_revisada}
                                onClick={() => proporNumeracaoFilas(q)}
                                className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                              >
                                Numerar ruas
                              </button>
                            )}
                            {q.geometria_revisada ? (
                              <button
                                type="button"
                                disabled={salvando}
                                onClick={() => destravarQuadra(q)}
                                className="text-xs text-emerald-400 hover:text-emerald-200 ml-auto"
                              >
                                🔒 Travada — destravar
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={salvando || desenho.ativo}
                                onClick={() => entrarModoEdicao(q)}
                                className="text-xs text-blue-400 hover:text-blue-200 ml-auto"
                              >
                                Editar túmulos no mapa
                              </button>
                            )}
                          </div>

                          {numeracaoProposta?.tipo === 'filas' && numeracaoProposta.contexto === q.id && (
                            <PainelNumeracaoProposta
                              titulo="Ordem proposta das ruas"
                              itens={numeracaoProposta.itens}
                              precisaConfirmar={numeracaoProposta.precisaConfirmar}
                              onConfirmar={() => confirmarNumeracao(numeracaoProposta.precisaConfirmar)}
                              onCancelar={() => setNumeracaoProposta(null)}
                            />
                          )}

                          {filasDaQuadra.length === 0 ? (
                            <p className="text-zinc-500 text-xs">Nenhuma rua desenhada.</p>
                          ) : (
                            <ul className="space-y-1">
                              {filasDaQuadra.map((f) => (
                                <li key={f.id} className="flex items-center justify-between text-xs text-zinc-300">
                                  <span>
                                    Rua {f.numero} {f.geometria_revisada && <span className="text-emerald-400">🔒</span>}{' '}
                                    {f.quantidade_prevista ? `— ${f.quantidade_prevista} túmulos` : '— sem túmulos'}
                                  </span>
                                  <span className="flex items-center gap-2">
                                    {!f.geometria_revisada && (
                                      <button
                                        type="button"
                                        disabled={salvando}
                                        onClick={() => {
                                          setDialogoFila({
                                            filaId: f.id,
                                            quadraNumero: q.numero,
                                            filaNumero: f.numero,
                                            comprimentoM: f.eixo ? comprimentoPolilinha(f.eixo.coordinates) : 0,
                                          })
                                          setQuantidadeInput(f.quantidade_prevista ? String(f.quantidade_prevista) : '')
                                        }}
                                        className="text-amber-400 hover:text-amber-200"
                                      >
                                        {f.quantidade_prevista ? 'Regerar' : 'Gerar túmulos'} →
                                      </button>
                                    )}
                                    {f.quantidade_prevista != null &&
                                      (f.geometria_revisada ? (
                                        <button type="button" disabled={salvando} onClick={() => destravarFila(f)} className="text-emerald-400 hover:text-emerald-200">
                                          Destravar
                                        </button>
                                      ) : (
                                        <button type="button" disabled={salvando} onClick={() => travarFila(q.numero, f)} className="text-zinc-400 hover:text-zinc-200">
                                          🔒 Travar
                                        </button>
                                      ))}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
            </ul>
          </div>

          {quadraEmEdicao && (
            <div className="rounded-xl bg-zinc-900 border border-blue-900/40 p-4 mb-4">
              <h2 className="text-sm font-semibold text-white mb-1">Editando Quadra {quadraEmEdicao.numero}</h2>
              <p className="text-xs text-zinc-500 mb-3">{lapidesEdicao.length} túmulo(s) — arrasta a bolinha pra reposicionar.</p>

              <button
                type="button"
                onClick={() => setModoAdicionarTumulo((v) => !v)}
                className={`w-full text-xs px-3 py-1.5 rounded mb-2 flex items-center justify-center gap-1 ${
                  modoAdicionarTumulo ? 'bg-emerald-700 text-white' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <Plus size={12} strokeWidth={2} />
                {modoAdicionarTumulo ? 'Clica no mapa pra adicionar (clica de novo pra sair)' : 'Adicionar túmulo (clicando no mapa)'}
              </button>

              <p className="text-xs text-zinc-500 mb-3">Clica numa bolinha pra ver o código e apagar.</p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={salvando}
                  onClick={travarQuadra}
                  className="flex-1 text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
                >
                  🔒 Travar quadra (geometria confirmada)
                </button>
                <button
                  type="button"
                  onClick={sairModoEdicao}
                  className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Sair
                </button>
              </div>
            </div>
          )}

          {dialogoFila && (
            <div className="rounded-xl bg-zinc-900 border border-amber-900/40 p-4 mb-4">
              <h2 className="text-sm font-semibold text-white mb-1">
                Gerar túmulos — Quadra {dialogoFila.quadraNumero}, Rua {dialogoFila.filaNumero}
              </h2>
              <p className="text-xs text-zinc-500 mb-2">Comprimento da fileira: {dialogoFila.comprimentoM.toFixed(1)} m</p>
              <label className="block text-xs text-zinc-400 mb-1">Quantidade de túmulos</label>
              <input
                type="number"
                min={1}
                max={500}
                value={quantidadeInput}
                onChange={(e) => setQuantidadeInput(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white mb-2"
                placeholder="ex: 15"
              />
              {espacamentoInfo && (
                <p className={`text-xs mb-2 ${espacamentoInfo.ok ? 'text-zinc-400' : 'text-amber-400'}`}>
                  {espacamentoInfo.espacamento.toFixed(2)} m entre túmulos
                  {espacamentoInfo.aviso && ` — ${espacamentoInfo.aviso}`}
                </p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={salvando || !quantidadeNumerica}
                  onClick={gerarTumulos}
                  className="text-xs px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-40"
                >
                  Gerar {quantidadeNumerica || ''} túmulos
                </button>
                <button
                  type="button"
                  onClick={() => setDialogoFila(null)}
                  className="text-xs px-3 py-1.5 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-white mb-1">Marcar túmulo avulso</h2>
            <p className="text-xs text-zinc-500 mb-3">
              Pra lápide que já existe no cadastro mas ainda não tem coordenada (fora do fluxo de quadra/rua acima).
            </p>

            {modoMarcar && lapideParaMarcar && (
              <div className="rounded-lg bg-amber-950/30 border border-amber-900/40 px-3 py-2 mb-3 flex items-center justify-between">
                <p className="text-xs text-amber-300">
                  Clique no mapa onde fica <strong>{lapideParaMarcar.identificacao}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setModoMarcar(false)
                    setLapideParaMarcar(null)
                  }}
                  className="text-amber-400 hover:text-amber-200"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            )}

            <p className="text-xs text-zinc-500 mb-2">Pendentes ({lapidesSemCoordenada.length})</p>
            <ul className="space-y-1 max-h-72 overflow-y-auto">
              {lapidesSemCoordenada.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => {
                      setModoMarcarEntrada(false)
                      desenho.cancelar()
                      setModoMarcar(true)
                      setLapideParaMarcar(l)
                    }}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded flex items-center gap-2 ${
                      lapideParaMarcar?.id === l.id ? 'bg-amber-900/40 text-amber-200' : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Crosshair size={12} strokeWidth={1.5} />
                    {l.identificacao}
                    {l.quadra && <span className="text-zinc-500">· Q{l.quadra}</span>}
                  </button>
                </li>
              ))}
              {lapidesSemCoordenada.length === 0 && (
                <li className="text-zinc-500 text-xs">Nenhuma lápide avulsa pendente.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mt-4">
            <h2 className="text-sm font-semibold text-white mb-2">Legenda</h2>
            <div className="space-y-1.5 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: CORES_ORIGEM.ortomosaico }} />
                Marcado/gerado no ortomosaico (preciso)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: CORES_ORIGEM.gps_celular }} />
                GPS de celular / satélite genérico
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: CORES_ORIGEM.desconhecida }} />
                Origem desconhecida
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={12} strokeWidth={1.5} style={{ color: '#C9A46A' }} />
                Contorno dourado = quadra · linha azul tracejada = rua
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BarraDesenho({
  texto,
  podeConcluir,
  onConcluir,
  onDesfazer,
  onCancelar,
}: {
  texto: string
  podeConcluir: boolean
  onConcluir: () => void
  onDesfazer: () => void
  onCancelar: () => void
}) {
  return (
    <div className="rounded-lg bg-emerald-950/30 border border-emerald-900/40 px-3 py-2 mb-3">
      <p className="text-xs text-emerald-300 mb-2">{texto}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!podeConcluir}
          onClick={onConcluir}
          className="text-xs px-2 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          Concluir
        </button>
        <button type="button" onClick={onDesfazer} className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Desfazer ponto
        </button>
        <button type="button" onClick={onCancelar} className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Cancelar
        </button>
      </div>
    </div>
  )
}

function PainelNumeracaoProposta({
  titulo,
  itens,
  precisaConfirmar,
  onConfirmar,
  onCancelar,
}: {
  titulo: string
  itens: ItemNumeracao[]
  precisaConfirmar: boolean
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <div className="rounded-lg bg-zinc-800/60 border border-zinc-700 px-3 py-2 mb-3">
      <p className="text-xs text-zinc-300 mb-1">{titulo}</p>
      <ol className="text-xs text-zinc-400 list-decimal list-inside mb-2 max-h-32 overflow-y-auto">
        {itens.map((i) => (
          <li key={i.id}>
            {i.numero}. {i.label} {i.distancia != null && `— ${i.distancia.toFixed(0)}m da entrada`}
          </li>
        ))}
      </ol>
      {precisaConfirmar && (
        <p className="text-xs text-amber-400 mb-2">
          Algum item afetado já tem memorial vinculado — código dele vai mudar. Confirma mesmo assim?
        </p>
      )}
      <div className="flex items-center gap-2">
        <button type="button" onClick={onConfirmar} className="text-xs px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-500">
          Confirmar numeração
        </button>
        <button type="button" onClick={onCancelar} className="text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          Cancelar
        </button>
      </div>
    </div>
  )
}
