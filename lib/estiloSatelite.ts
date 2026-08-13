import type { Ortomosaico } from '@/lib/ortomosaico'
import { sourceOrtomosaico } from '@/lib/ortomosaico'

// Camada raster de satélite (Esri, grátis, sem chave) -- mesma fonte usada
// em GuiaTumulo.tsx e MapaCemiterio.tsx. Extraída aqui só pro mapa público
// novo (components/public/MapaPublicoCemiterio.tsx); GuiaTumulo.tsx fica
// intocado de propósito (regra 17) -- a duplicação nos outros 2 arquivos é
// dívida conhecida, não entra nesta feature.
export const ESTILO_SATELITE_BASE = {
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

// Estilo com ortomosaico empilhado por cima da base, se existir -- mesma
// técnica de sempre, nunca substitui a camada de satélite.
export function estiloComOrtomosaico(ortomosaico: Ortomosaico | null) {
  if (!ortomosaico) return ESTILO_SATELITE_BASE
  return {
    ...ESTILO_SATELITE_BASE,
    sources: { ...ESTILO_SATELITE_BASE.sources, orto: sourceOrtomosaico(ortomosaico) },
    layers: [...ESTILO_SATELITE_BASE.layers, { id: 'orto-layer', type: 'raster' as const, source: 'orto' }],
  }
}
