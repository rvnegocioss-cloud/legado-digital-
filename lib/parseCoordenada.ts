// Le uma coordenada colada pela staff: numero puro, link do Google Maps
// (varios formatos) ou grau/minuto/segundo. Serve pra conferir o ponto que
// alguem marcou no celular contra o tumulo marcado no ortomosaico.
//
// Ordem de prioridade nos links do Google: !3d<lat>!4d<lng> vem PRIMEIRO
// porque e o pino de verdade; @lat,lng e so o centro da tela quando a foto
// foi tirada, quase sempre alguns metros deslocado do pino.

export interface CoordenadaLida {
  lat: number
  lng: number
  origem: 'pino' | 'centro_mapa' | 'consulta' | 'numero' | 'gms'
}

const LIMITE_LAT = 90
const LIMITE_LNG = 180

function valida(lat: number, lng: number, origem: CoordenadaLida['origem']): CoordenadaLida | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > LIMITE_LAT || Math.abs(lng) > LIMITE_LNG) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng, origem }
}

// 18°54'49.3"S 48°17'48.2"W  (aceita ', ’, ", ” e espaco no meio)
function lerGrausMinutosSegundos(texto: string): CoordenadaLida | null {
  const re = /(\d+)\s*°\s*(\d+)\s*['’]\s*([\d.]+)\s*["”]?\s*([NSEWOnsewo])/g
  const achados: { valor: number; letra: string }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(texto)) !== null) {
    const graus = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600
    achados.push({ valor: graus, letra: m[4].toUpperCase() })
  }
  if (achados.length < 2) return null
  let lat: number | null = null
  let lng: number | null = null
  for (const a of achados) {
    if (a.letra === 'S' || a.letra === 'N') lat = a.letra === 'S' ? -a.valor : a.valor
    // O de Oeste (portugues) e W de West valem a mesma coisa
    if (a.letra === 'W' || a.letra === 'O' || a.letra === 'E') lng = a.letra === 'E' ? a.valor : -a.valor
  }
  if (lat == null || lng == null) return null
  return valida(lat, lng, 'gms')
}

export function lerCoordenada(entrada: string): CoordenadaLida | null {
  const texto = (entrada || '').trim()
  if (!texto) return null

  // 1) Pino real dentro do link do Google Maps: !3d-18.9136976!4d-48.2967242
  const pino = texto.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (pino) {
    const c = valida(Number(pino[1]), Number(pino[2]), 'pino')
    if (c) return c
  }

  // 2) ?q=lat,lng  ou  &query=lat,lng  (link curto ja resolvido, app do celular)
  const consulta = texto.match(/[?&](?:q|query|destination)=(-?\d+\.\d+)[,%2C\s]+(-?\d+\.\d+)/i)
  if (consulta) {
    const c = valida(Number(consulta[1]), Number(consulta[2]), 'consulta')
    if (c) return c
  }

  // 3) @lat,lng,zoom -- centro da tela, nao o pino
  const centro = texto.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (centro) {
    const c = valida(Number(centro[1]), Number(centro[2]), 'centro_mapa')
    if (c) return c
  }

  // 4) Grau/minuto/segundo
  const gms = lerGrausMinutosSegundos(texto)
  if (gms) return gms

  // 5) Dois numeros soltos: "-18.9136976, -48.2967242"
  const numeros = texto.match(/(-?\d{1,3}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})/)
  if (numeros) {
    const c = valida(Number(numeros[1]), Number(numeros[2]), 'numero')
    if (c) return c
  }

  return null
}

export const ROTULO_ORIGEM_COORDENADA: Record<CoordenadaLida['origem'], string> = {
  pino: 'pino do Google Maps',
  consulta: 'coordenada do link',
  centro_mapa: 'centro da tela do Google Maps (menos preciso que o pino)',
  gms: 'grau/minuto/segundo',
  numero: 'coordenada digitada',
}
