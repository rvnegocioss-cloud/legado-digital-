'use client'

import { useState } from 'react'

// Convenções da genealogia tradicional (regra 23 do CLAUDE.md):
//   pai à esquerda, mãe à direita (padrão brasileiro) · casal unido por linha
//   horizontal · descendência desce do MEIO da linha do casal, nunca de um dos
//   cônjuges · irmãos em ordem de nascimento, do mais velho à esquerda ·
//   avós paternos à esquerda, maternos à direita.
export interface Parente {
  id: string
  tipo: string
  uniao: string | null
  ordem: number | null
  nome: string
  slug: string | null
  tem_memorial: boolean
  foto_url: string | null
  nascimento: number | null
  falecimento: number | null
}

export interface ArvoreDados {
  memorial: {
    id: string
    nome: string
    slug: string
    foto_url: string | null
    nascimento: string | null
    falecimento: string | null
  }
  parentes: Parente[]
}

// Altura de cada geração, em % da ilustração: copa é a geração mais nova, base
// é a mais antiga -- é como a árvore do fundo foi desenhada.
const Y = { netos: 16, filhos: 27, ref: 46, pais: 62, avos: 78 }

const ROTULO: Record<string, string> = {
  pai: 'Pai', mae: 'Mãe', conjuge: 'Cônjuge',
  filho: 'Filho', filha: 'Filha', irmao: 'Irmão', irma: 'Irmã',
  avo_paterno: 'Avô paterno', avo_paterna: 'Avó paterna',
  avo_materno: 'Avô materno', avo_materna: 'Avó materna',
  neto: 'Neto', neta: 'Neta',
}

function anos(de: number | null, ate: number | null) {
  if (de && ate) return `${de} — ${ate}`
  if (de) return `${de}`
  if (ate) return `— ${ate}`
  return ''
}

function anosDoMemorial(m: ArvoreDados['memorial']) {
  const ano = (d: string | null) => (d ? new Date(d).getFullYear() : null)
  return anos(ano(m.nascimento), ano(m.falecimento))
}

export default function ArvoreFamilia({ dados }: { dados: ArvoreDados | null }) {
  const [aberta, setAberta] = useState(false)

  if (!dados) return null

  const parentes = dados.parentes || []
  const comMemorial = parentes.filter((p) => p.tem_memorial).length + 1

  const de = (tipo: string) => parentes.filter((p) => p.tipo === tipo)
  const um = (tipo: string) => de(tipo)[0] || null
  // Irmãos e filhos entram em ordem de nascimento -- é o que põe o mais velho
  // à esquerda, como manda a convenção.
  const porOrdem = (tipos: string[]) =>
    parentes
      .filter((p) => tipos.includes(p.tipo))
      .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || (a.nascimento ?? 0) - (b.nascimento ?? 0))

  const pai = um('pai')
  const mae = um('mae')
  const conjuge = um('conjuge')
  const filhos = porOrdem(['filho', 'filha'])
  const netos = porOrdem(['neto', 'neta'])
  const avosPat = [um('avo_paterno'), um('avo_paterna')].filter(Boolean) as Parente[]
  const avosMat = [um('avo_materno'), um('avo_materna')].filter(Boolean) as Parente[]

  // Posições em % pra acompanharem qualquer largura de tela.
  const pos: Record<string, { x: number; y: number }> = {}
  const nos: { chave: string; x: number; y: number; tam: number; p: Parente | null; ehRef?: boolean }[] = []

  function por(chave: string, x: number, y: number, tam: number, p: Parente | null, ehRef = false) {
    pos[chave] = { x, y }
    nos.push({ chave, x, y, tam, p, ehRef })
  }

  por('ref', conjuge ? 38 : 50, Y.ref, 80, null, true)
  if (conjuge) por('conjuge', 62, Y.ref, 70, conjuge)
  if (pai) por('pai', 30, Y.pais, 62, pai)
  if (mae) por('mae', 52, Y.pais, 62, mae)

  const espalhar = (lista: Parente[], y: number, tam: number, prefixo: string) => {
    const n = lista.length
    if (!n) return
    const largura = Math.min(70, 18 * n)
    const passo = n > 1 ? largura / (n - 1) : 0
    const x0 = 50 - largura / 2
    lista.forEach((p, i) => por(`${prefixo}${i}`, n > 1 ? x0 + i * passo : 50, y, tam, p))
  }
  espalhar(filhos, Y.filhos, 58, 'filho')
  espalhar(netos, Y.netos, 50, 'neto')

  avosPat.forEach((p, i) => por(`avoPat${i}`, 15 + i * 17, Y.avos, 50, p))
  avosMat.forEach((p, i) => por(`avoMat${i}`, 68 + i * 17, Y.avos, 50, p))

  // ---- linhas ----
  const linhas: { x1: number; y1: number; x2: number; y2: number; classe: string }[] = []
  const traco = (x1: number, y1: number, x2: number, y2: number, classe: string) =>
    linhas.push({ x1, y1, x2, y2, classe })

  const casal = (a: string, b: string, uniao?: string | null) => {
    if (!pos[a] || !pos[b]) return
    traco(pos[a].x, pos[a].y, pos[b].x, pos[b].y,
      uniao === 'separacao' ? 'l-separado' : 'l-casal')
  }

  // A descendência desce do MEIO do casal e uma barra horizontal reúne os
  // irmãos antes de cada um receber a própria vertical.
  const descendencia = (a: string, b: string | null, filhosChaves: string[]) => {
    const pa = pos[a]
    const pb = b ? pos[b] : null
    if (!pa || !filhosChaves.length) return
    const meioX = pb ? (pa.x + pb.x) / 2 : pa.x
    const meioY = pb ? (pa.y + pb.y) / 2 : pa.y
    const yFilhos = pos[filhosChaves[0]].y
    const yBarra = (meioY + yFilhos) / 2
    traco(meioX, meioY, meioX, yBarra, 'l-desc')
    const xs = filhosChaves.map((c) => pos[c].x)
    traco(Math.min(...xs), yBarra, Math.max(...xs), yBarra, 'l-desc')
    filhosChaves.forEach((c) => traco(pos[c].x, yBarra, pos[c].x, pos[c].y, 'l-desc'))
  }

  if (conjuge) casal('ref', 'conjuge', conjuge.uniao)
  if (pai && mae) casal('pai', 'mae', 'casamento')
  if (pai || mae) descendencia(pai ? 'pai' : 'mae', pai && mae ? 'mae' : null, ['ref'])
  if (filhos.length) descendencia('ref', conjuge ? 'conjuge' : null, filhos.map((_, i) => `filho${i}`))
  if (netos.length && filhos.length) descendencia('filho0', null, netos.map((_, i) => `neto${i}`))
  if (avosPat.length === 2) {
    casal('avoPat0', 'avoPat1', 'casamento')
    if (pai) descendencia('avoPat0', 'avoPat1', ['pai'])
  }
  if (avosMat.length === 2) {
    casal('avoMat0', 'avoMat1', 'casamento')
    if (mae) descendencia('avoMat0', 'avoMat1', ['mae'])
  }

  function iniciais(nome: string) {
    return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  }

  return (
    <>
      <button type="button" className="arv-card" onClick={() => setAberta(true)}>
        <span className="arv-rotu">Árvore genealógica</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="arv-mini" src="/arvore/arvore-fundo.png" alt="" />
        <span className="arv-abrir">
          {comMemorial === 1 ? '1 memorial' : `${comMemorial} memoriais`} ·{' '}
          {parentes.length + 1} na árvore · abrir
        </span>
      </button>

      {aberta && (
        <div className="arv-visor" onClick={() => setAberta(false)}>
          <button
            type="button"
            className="arv-fechar"
            onClick={() => setAberta(false)}
            aria-label="Fechar"
          >
            ×
          </button>

          <div className="arv-quadro" onClick={(e) => e.stopPropagation()}>
            <div className="arv-titulo">Família {dados.memorial.nome.split(' ').slice(-1)[0]}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="arv-fundo" src="/arvore/arvore-fundo.png" alt="Árvore da família" />

            <svg className="arv-linhas" viewBox="0 0 100 100" preserveAspectRatio="none">
              {linhas.map((l, i) => (
                <line
                  key={i}
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x2}
                  y2={l.y2}
                  className={l.classe}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {nos.map((no) => {
              const ehRef = !!no.ehRef
              const nome = ehRef ? dados.memorial.nome : no.p!.nome
              const foto = ehRef ? dados.memorial.foto_url : no.p!.foto_url
              const tem = ehRef ? true : no.p!.tem_memorial
              const papel = ehRef ? 'Este memorial' : ROTULO[no.p!.tipo] || ''
              const detalhe = ehRef
                ? anosDoMemorial(dados.memorial)
                : tem
                  ? anos(no.p!.nascimento, no.p!.falecimento) || 'memorial no Legado Digital'
                  : 'sem memorial ainda'
              const href = ehRef ? null : no.p!.slug ? `/homenagem/${no.p!.slug}` : null
              const Tag = href ? 'a' : 'span'

              return (
                <Tag
                  key={no.chave}
                  {...(href ? { href } : {})}
                  className={`arv-slot${tem ? '' : ' pendente'}${ehRef ? ' foco' : ''}`}
                  style={{
                    left: `${no.x}%`,
                    top: `${no.y}%`,
                    ['--tam' as string]: `${no.tam}px`,
                  }}
                >
                  <span className="arv-aro">
                    <span className="arv-aro-in">
                      {foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={foto} alt="" />
                      ) : (
                        iniciais(nome)
                      )}
                    </span>
                  </span>
                  <span className="arv-txt">
                    {papel && <span className="arv-papel">{papel}</span>}
                    <span className="arv-nome">{nome}</span>
                    <span className="arv-anos">{detalhe}</span>
                  </span>
                </Tag>
              )
            })}
          </div>

          <div className="arv-legenda">
            <span><span className="arv-tracinho" />Casamento</span>
            <span><span className="arv-tracinho pont" />Separação</span>
            <span>Pai à esquerda · mãe à direita · irmãos do mais velho ao mais novo</span>
          </div>
          <div className="arv-legenda">
            <span><i className="arv-bolinha ok" />Já tem memorial — toque para abrir</span>
            <span><i className="arv-bolinha nao" />Ainda sem memorial (viva ou não)</span>
          </div>
        </div>
      )}
    </>
  )
}
