'use client'

import { Lock } from 'lucide-react'
import { urlMidiaProtegida } from '@/lib/urlMidia'

// Card que abre ao passar o mouse (ou tocar) numa cruz do mapa público do
// cemitério.
//
// Segue o PADRÃO do card de jazigo que a Central já tem no mapa de edição
// (components/admin/MapaCemiterio.tsx, classe .card-jazigo) -- o Rafael mandou
// olhar lá em vez de inventar (2026-09-23; a 1ª versão daqui usava retratos
// retangulares 4:5 lado a lado, fora do padrão, e grande demais):
//
//   - pequeno (largura fixa ~210px);
//   - foto da lápide baixa no topo (só quando existe);
//   - "JAZIGO" + nome do jazigo;
//   - homenageados EM LISTA VERTICAL, um abaixo do outro;
//   - a foto de cada um dentro de um NODE: círculo com anel dourado (o mesmo
//     conic-gradient da Central e da landing), nome ao lado em link.
//
// Diferença pra Central, de propósito: sem gaveta (G1, G2...) e sem controles
// de edição -- visitante não vê gaveta nem ossário (wireframe do Pedro, tela
// "Estados de localização", nota 5).
//
// Privacidade: memorial com senha/cadastro mostra o nome (já está gravado na
// pedra, à vista de quem passa) e um cadeado no lugar da foto -- a trava
// protege o conteúdo da página, e o retrato é conteúdo.

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

function Node({ mem }: { mem: MemorialDoCard }) {
  const foto = !mem.protegido && mem.foto_url ? urlMidiaProtegida(mem.foto_url) || mem.foto_url : null
  return (
    <span className="cp-node">
      <span className="cp-node-in">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="" loading="lazy" />
        ) : (
          <Lock size={13} strokeWidth={1.5} aria-label={mem.protegido ? 'Memorial com senha' : undefined} />
        )}
      </span>
    </span>
  )
}

export default function CardPino({ dados, lista }: { dados: DadosDoCard; lista: MemorialDoCard[] }) {
  const varios = lista.length > 1
  const foto = dados.foto_lapide ? urlMidiaProtegida(dados.foto_lapide) || dados.foto_lapide : null

  return (
    <div className="cp">
      {varios && foto && (
        <div className="cp-lapide">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="Foto da lápide" loading="lazy" />
        </div>
      )}

      <div className="cp-corpo">
        {varios && (
          <>
            <p className="cp-eyebrow">Jazigo familiar</p>
            <p className="cp-nome">{dados.jazigo_nome || 'Jazigo da família'}</p>
            <div className="cp-div" />
          </>
        )}

        <div className="cp-lista">
          {lista.map((mem, i) => (
            <a key={mem.slug || i} className="cp-linha" href={mem.slug ? `/homenagem/${mem.slug}` : undefined}>
              <Node mem={mem} />
              <span className="cp-texto">
                <span className="cp-tnome">{mem.nome}</span>
                {!varios && (
                  <span className="cp-cta">
                    {mem.protegido ? 'Toque para entrar com a senha' : 'Toque para ver o memorial'}
                  </span>
                )}
                {varios && mem.protegido && <span className="cp-cta">com senha</span>}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
