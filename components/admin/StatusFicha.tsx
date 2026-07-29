interface StatusChip {
  label: string
  tom?: 'neutro' | 'verde' | 'amarelo'
}

const COR_PONTO: Record<NonNullable<StatusChip['tom']>, string> = {
  neutro: 'bg-zinc-600',
  verde: 'bg-green-500',
  amarelo: 'bg-yellow-500',
}

// Faixa de status somente-leitura no topo da ficha — resume em ícones o que
// hoje só dava pra saber rolando a tela inteira até o card certo.
export function StatusFicha({ chips }: { chips: StatusChip[] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {chips.map((c) => (
        <span
          key={c.label}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-100"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${COR_PONTO[c.tom || 'neutro']}`} />
          <span className="text-zinc-400">{c.label}</span>
        </span>
      ))}
    </div>
  )
}
