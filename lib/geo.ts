export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLng = (lng2 - lng1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function comprimentoPolilinha(coordenadas: [number, number][]) {
  let total = 0
  for (let i = 0; i < coordenadas.length - 1; i++) {
    const [lng1, lat1] = coordenadas[i]
    const [lng2, lat2] = coordenadas[i + 1]
    total += distanciaMetros(lat1, lng1, lat2, lng2)
  }
  return total
}

export function centroide(coordenadas: [number, number][]) {
  const soma = coordenadas.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 }
  )
  return { lng: soma.lng / coordenadas.length, lat: soma.lat / coordenadas.length }
}

export function pontoDentroDePoligono(lng: number, lat: number, anel: [number, number][]) {
  let dentro = false
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i]
    const [xj, yj] = anel[j]
    const intersecta = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersecta) dentro = !dentro
  }
  return dentro
}
