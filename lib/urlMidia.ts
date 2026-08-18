// Converte a URL pública antiga do Storage no caminho do nosso portão de mídia
// (/api/midia/...), que confere a privacidade do memorial a cada requisição.
//
// Mantém compatibilidade: URL que não é do balde de memoriais (YouTube, por
// exemplo) passa intacta.

const MARCADOR = '/object/public/memoriais/'

export function urlMidiaProtegida(url: string | null | undefined): string | null {
  if (!url) return null
  const i = url.indexOf(MARCADOR)
  if (i < 0) return url
  const caminho = url.slice(i + MARCADOR.length).split('?')[0]
  return '/api/midia/' + caminho
}

export function urlsMidiaProtegidas(urls: (string | null | undefined)[] | null | undefined): string[] {
  return (urls || []).map(urlMidiaProtegida).filter((u): u is string => !!u)
}
