'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Modo ajuda: liga/desliga de uma vez só as dicas explicativas em cada campo
// do Portal da Família (pedido do Rafael, 2026-09-16). Lembrado no navegador
// -- quem liga uma vez não precisa ligar de novo na próxima visita.
const CHAVE = 'legado-modo-ajuda'

const ModoAjudaContext = createContext<{ ativo: boolean; alternar: () => void }>({
  ativo: false,
  alternar: () => {},
})

export function ModoAjudaProvider({ children }: { children: React.ReactNode }) {
  const [ativo, setAtivo] = useState(false)

  useEffect(() => {
    try {
      setAtivo(localStorage.getItem(CHAVE) === '1')
    } catch {
      // navegador sem localStorage (modo privado) -- fica desligado, sem travar nada
    }
  }, [])

  const alternar = useCallback(() => {
    setAtivo((atual) => {
      const novo = !atual
      try {
        localStorage.setItem(CHAVE, novo ? '1' : '0')
      } catch {}
      return novo
    })
  }, [])

  return <ModoAjudaContext.Provider value={{ ativo, alternar }}>{children}</ModoAjudaContext.Provider>
}

export function useModoAjuda() {
  return useContext(ModoAjudaContext)
}

export function BotaoModoAjuda() {
  const { ativo, alternar } = useModoAjuda()
  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={ativo}
      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
        ativo
          ? 'border-[#C9A46A] text-[#C9A46A] bg-[rgba(201,164,106,0.12)]'
          : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
      }`}
    >
      {ativo ? '✓ Modo ajuda' : 'Modo ajuda'}
    </button>
  )
}

// Fica ao lado do rótulo de um campo. Só existe quando o Modo ajuda está
// ligado -- desligado, a tela fica idêntica a hoje, sem ícone nenhum sobrando.
// Funciona em toque (clique) e em mouse (hover), pra valer em celular também.
export function Dica({ texto }: { texto: string }) {
  const { ativo } = useModoAjuda()
  const [aberta, setAberta] = useState(false)

  if (!ativo) return null

  return (
    <span
      className="relative inline-flex items-center ml-1.5 align-middle"
      onMouseEnter={() => setAberta(true)}
      onMouseLeave={() => setAberta(false)}
    >
      <button
        type="button"
        onClick={() => setAberta((a) => !a)}
        className="w-[15px] h-[15px] rounded-full border border-[#C9A46A] text-[#C9A46A] text-[9.5px] leading-none flex items-center justify-center font-semibold"
        aria-label="Ajuda sobre este campo"
        aria-expanded={aberta}
      >
        ?
      </button>
      {aberta && (
        <span
          role="tooltip"
          className="absolute z-30 left-0 top-full mt-1.5 w-60 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[11.5px] leading-snug text-zinc-300 shadow-xl normal-case font-normal"
        >
          {texto}
        </span>
      )}
    </span>
  )
}
