'use client'

import { Lock } from 'lucide-react'
import { urlMidiaProtegida } from '@/lib/urlMidia'

// Card que abre ao passar o mouse (ou tocar) numa cruz do mapa público do
// cemitério. Refeito em 2026-09-23 por pedido do Rafael: o anterior era o card
// branco padrão do MapLibre, em Georgia, com miniaturas de 36px cortadas em
// círculo -- fora do padrão do site e sem enquadrar foto nenhuma direito.
//
// Dois formatos, decididos pela quantidade de homenageados no túmulo:
//
//  - 1 memorial  -> card simples: retrato + nome + "Toque para ver o memorial".
//  - 2 ou mais   -> CARD DE JAZIGO FAMILIAR: nome do jazigo, foto da lápide no
//                   topo e, embaixo, um retrato por homenageado, cada um levando
//                   ao próprio memorial. Mesma lógica do card que a Central já
//                   tem no mapa de edição, sem os controles de edição.
//
// Enquadramento: todo retrato é caixa 4:5 (a proporção de foto de rosto) com
// object-fit: cover e ponto de foco alto (object-position: center 22%), então o
// rosto nunca é cortado ao meio; a lápide é 4:3. As caixas têm proporção fixa
// pra o card não pular de tamanho enquanto a imagem carrega.
//
// Privacidade: memorial com senha/cadastro mostra o nome (já está gravado na
// pedra, à vista de quem passa) e um cadeado, mas NÃO a foto -- a trava protege
// o conteúdo da página, e o retrato é conteúdo.

export interface MemorialDoCard {
  slug: string
  nome: string | null
  foto_url: string | null
  protegido: boolean
}

export interface DadosDoCard {
  jazigo_nome?: string | null
  foto_lapide?: string | null
}

function iniciais(nome: string | null): string {
  return (nome || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
}

function Retrato({ mem, className }: { mem: MemorialDoCard; className: string }) {
  const foto = !mem.protegido && mem.foto_url ? urlMidiaProtegida(mem.foto_url) || mem.foto_url : null
  return (
    <span className={className}>
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt={mem.nome || ''} loading="lazy" />
      ) : mem.protegido ? (
        <Lock size={20} strokeWidth={1.5} aria-label="Memorial com senha" />
      ) : (
        <span className="cp-mono">{iniciais(mem.nome)}</span>
      )}
    </span>
  )
}

export default function CardPino({ dados, lista }: { dados: DadosDoCard; lista: MemorialDoCard[] }) {
  const varios = lista.length > 1

  if (!varios) {
    const mem = lista[0]
    if (!mem) return null
    return (
      <a className="cp cp-unico" href={mem.slug ? `/homenagem/${mem.slug}` : undefined}>
        <Retrato mem={mem} className="cp-foto cp-foto-unico" />
        <span className="cp-texto">
          <span className="cp-tnome">{mem.nome}</span>
          <span className="cp-cta">
            {mem.protegido ? 'Toque para entrar com a senha' : 'Toque para ver o memorial'}
          </span>
        </span>
      </a>
    )
  }

  const foto = dados.foto_lapide ? urlMidiaProtegida(dados.foto_lapide) || dados.foto_lapide : null
  const colunas = Math.min(lista.length, 3)

  return (
    <div className="cp cp-jazigo">
      {foto && (
        <div className="cp-lapide">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt={`Lápide do ${dados.jazigo_nome || 'jazigo'}`} loading="lazy" />
        </div>
      )}

      <div className="cp-cab">
        <span className="cp-eyebrow">Jazigo familiar</span>
        <h3 className="cp-nome">{dados.jazigo_nome || 'Jazigo da família'}</h3>
        <span className="cp-meta">{lista.length} memoriais neste túmulo</span>
      </div>

      <div className="cp-grade" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
        {lista.map((mem, i) => (
          <a key={mem.slug || i} className="cp-tile" href={mem.slug ? `/homenagem/${mem.slug}` : undefined}>
            <Retrato mem={mem} className="cp-foto" />
            <span className="cp-tnome">{mem.nome}</span>
            {mem.protegido && <span className="cp-selo">com senha</span>}
          </a>
        ))}
      </div>
    </div>
  )
}
