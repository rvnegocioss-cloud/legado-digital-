/** Douglas-Peucker em coordenadas [lng, lat], com tolerância em METROS.
 *  Projeção local equirretangular em torno do primeiro ponto (basta pra escala de cemitério). */
export function simplificarLinha(coords: [number, number][], toleranciaM: number): [number, number][] {
  if (coords.length < 3) return coords.slice()
  const [lng0, lat0] = coords[0]
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180)
  const ky = 110574
  const p = coords.map(([lng, lat]) => ({ x: (lng - lng0) * kx, y: (lat - lat0) * ky }))
  const manter = new Array<boolean>(coords.length).fill(false)
  manter[0] = true
  manter[coords.length - 1] = true
  const pilha: [number, number][] = [[0, coords.length - 1]]
  while (pilha.length) {
    const [i0, i1] = pilha.pop()!
    const a = p[i0]
    const b = p[i1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const L = Math.hypot(dx, dy)
    let maior = 0
    let idx = -1
    for (let i = i0 + 1; i < i1; i++) {
      const d = L === 0 ? Math.hypot(p[i].x - a.x, p[i].y - a.y) : Math.abs(dy * p[i].x - dx * p[i].y + b.x * a.y - b.y * a.x) / L
      if (d > maior) {
        maior = d
        idx = i
      }
    }
    if (idx >= 0 && maior > toleranciaM) {
      manter[idx] = true
      pilha.push([i0, idx], [idx, i1])
    }
  }
  return coords.filter((_, i) => manter[i])
}
