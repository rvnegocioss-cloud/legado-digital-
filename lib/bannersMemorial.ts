/**
 * Catálogo fechado de banners de capa do memorial.
 *
 * A família ESCOLHE de uma lista, nunca sobe a própria imagem: banner é a
 * primeira coisa que se vê na página, e arquivo enviado por família varia de
 * proporção, peso e enquadramento -- foto retrato de celular esticada em faixa
 * de 24:10 quebra o topo do memorial. Todos aqui são 24:10, sem pessoa e sem
 * texto, então nenhum deles pode estourar o layout.
 */
export interface BannerMemorial {
  id: string
  nome: string
  arquivo: string
  miniatura: string
}

export const BANNERS_MEMORIAL: BannerMemorial[] = [
  { id: 'montanha', nome: 'Amanhecer na montanha', arquivo: '/banners/banner-1.webp', miniatura: '/banners/banner-1-mini.webp' },
  { id: 'mar', nome: 'Mar ao entardecer', arquivo: '/banners/banner-2.webp', miniatura: '/banners/banner-2-mini.webp' },
  { id: 'floresta', nome: 'Luz na floresta', arquivo: '/banners/banner-3.webp', miniatura: '/banners/banner-3-mini.webp' },
  { id: 'trigo', nome: 'Campo dourado', arquivo: '/banners/banner-4.webp', miniatura: '/banners/banner-4-mini.webp' },
  { id: 'estrelas', nome: 'Céu estrelado', arquivo: '/banners/banner-5.webp', miniatura: '/banners/banner-5-mini.webp' },
  { id: 'jardim', nome: 'Jardim de manhã', arquivo: '/banners/banner-6.webp', miniatura: '/banners/banner-6-mini.webp' },
]

/**
 * Nunca confia no valor cru do banco: banner removido do catálogo (ou lixo
 * gravado por rota antiga) tem que cair em "sem banner", não em imagem 404.
 */
export function resolverBanner(id?: string | null): BannerMemorial | null {
  if (!id) return null
  return BANNERS_MEMORIAL.find((b) => b.id === id) || null
}
