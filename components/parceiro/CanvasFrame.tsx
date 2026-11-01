'use client'

import { useEffect, useState } from 'react'

// O Chrome do Rafa bloqueava o editor dentro de <iframe src="/canvas-legado/...">
// (caixa cinza com ícone de página quebrada), embora o mesmo arquivo abra normal
// sozinho. Aqui o HTML é buscado e entregue por srcDoc: não depende de cabeçalho
// de enquadramento. O <base> faz libs/, mini.js e extrator.js continuarem
// resolvendo dentro de /canvas-legado/.
export default function CanvasFrame() {
  const [html, setHtml] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch('/canvas-legado/index.html')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.text()
      })
      .then((t) => {
        if (!vivo) return
        setHtml(t.replace('<head>', '<head><base href="/canvas-legado/">'))
      })
      .catch(() => {
        if (vivo) setFalhou(true)
      })
    return () => {
      vivo = false
    }
  }, [])

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden bg-[var(--tema-zinc-950)]"
      style={{ height: 'calc(100vh - 140px)', minHeight: 640 }}
    >
      {!html && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--tema-zinc-400)]">
          {falhou ? (
            <span>
              Não consegui abrir o Canvas aqui.{' '}
              <a className="underline" href="/canvas-legado/index.html" target="_blank" rel="noopener">
                Abrir em outra aba
              </a>
            </span>
          ) : (
            'Abrindo o Canvas Legado...'
          )}
        </p>
      )}
      {html && (
        <iframe
          srcDoc={html}
          title="Canvas Legado"
          allow="microphone"
          className="absolute inset-0 w-full h-full border-0"
        />
      )}
    </div>
  )
}
