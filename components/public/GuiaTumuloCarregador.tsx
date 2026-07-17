'use client'

import dynamic from 'next/dynamic'

// Leaflet acessa `window`, então não pode ser renderizado no servidor.
// ssr:false só é permitido dentro de um Client Component - por isso esse
// arquivo separado, importado normalmente (sem dynamic()) pela página
// server-side do memorial.
const GuiaTumulo = dynamic(() => import('./GuiaTumulo'), {
  ssr: false,
  loading: () => <div style={{ height: 220, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />,
})

export default GuiaTumulo
