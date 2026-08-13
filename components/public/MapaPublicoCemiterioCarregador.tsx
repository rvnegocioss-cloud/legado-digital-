'use client'

import dynamic from 'next/dynamic'

// MapLibre acessa `window`, então não pode ser renderizado no servidor --
// mesmo padrão de components/public/GuiaTumuloCarregador.tsx.
const MapaPublicoCemiterio = dynamic(() => import('./MapaPublicoCemiterio'), {
  ssr: false,
  loading: () => <div style={{ height: 480, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />,
})

export default MapaPublicoCemiterio
