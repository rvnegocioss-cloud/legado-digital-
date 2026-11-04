// Passo "redondo" (1, 2, 2,5, 5, 10 vezes uma potência de 10) maior ou igual a v.
function passo(v: number) {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
}

// Limites do eixo vertical para valores que vão de minV (negativo) até 0.
// Deixa um passo de folga acima do zero (espaço para as linhas de ajuda).
export function limites(minV: number, margem = 1) {
  const r = Math.abs(minV) * margem
  if (r === 0) return { min: -100, max: 100 }
  const s = passo(r / 3)
  // 3 passos abaixo do zero + 1 acima = 4 intervalos iguais, com o zero sempre numa marca do eixo
  return { min: -3 * s, max: s }
}

// Teto redondo para eixo que começa em zero.
export function teto(v: number) {
  return -limites(-v).min
}
