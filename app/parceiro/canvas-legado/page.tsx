// Canvas Legado (etapa 1): editor de convite fúnebre, missa de 7º dia e santinho,
// embutido por iframe same-origin a partir de public/canvas-legado/index.html.
export default function CanvasLegado() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Canvas Legado</h1>
        <p className="text-[var(--tema-zinc-400)] text-sm mt-1">Crie convite fúnebre, missa de 7º dia e santinho</p>
      </div>
      {/* O editor pesa uns 3 MB: enquanto carrega, o fundo escuro com a mensagem
          aparece no lugar da caixa branca em branco que parecia página quebrada. */}
      <div
        className="relative w-full rounded-lg overflow-hidden bg-[var(--tema-zinc-950)]"
        style={{ height: 'calc(100vh - 140px)', minHeight: 640 }}
      >
        <p className="absolute inset-0 flex items-center justify-center text-sm text-[var(--tema-zinc-400)]">
          Abrindo o Canvas Legado...
        </p>
        <iframe
          src="/canvas-legado/index.html"
          title="Canvas Legado"
          allow="microphone"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  )
}
