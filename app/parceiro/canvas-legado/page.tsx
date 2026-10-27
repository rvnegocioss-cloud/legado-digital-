// Canvas Legado (etapa 1): editor de convite fúnebre, missa de 7º dia e santinho,
// embutido por iframe same-origin a partir de public/canvas-legado/index.html.
export default function CanvasLegado() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Canvas Legado</h1>
        <p className="text-[var(--tema-zinc-400)] text-sm mt-1">Crie convite fúnebre, missa de 7º dia e santinho</p>
      </div>
      <iframe
        src="/canvas-legado/index.html"
        title="Canvas Legado"
        allow="microphone"
        className="w-full border-0 rounded-lg bg-white"
        style={{ height: 'calc(100vh - 140px)', minHeight: 640 }}
      />
    </div>
  )
}
