// O desenho do livro, em SVG.
//
// Por que SVG e nao CSS: a forma de uma folha de livro aberto e uma curva
// bezier -- a borda sobe na ponta externa, mergulha no vinco, e a de baixo faz
// o contrario. `border-radius` so faz canto eliptico, entao por CSS o resultado
// sempre saiu "retangulo de canto redondo", nunca folha. Foram quatro tentativas
// por esse caminho antes de trocar de ferramenta.
//
// O texto NAO entra aqui: fica em HTML por cima, entao continua selecionavel,
// pesquisavel e acessivel. Este arquivo desenha so o objeto.

const PAPEL_CLARO = '#f7f0df'
const PAPEL = '#efe4cd'
const PAPEL_SOMBRA = '#d8c8a8'
const PAPEL_FUNDO = '#b9a582'
const COURO = '#5d3719'
const COURO_ESCURO = '#3a2010'

/** Uma folha vista de canto, na pilha lateral. */
function folhaDaPilha(i: number, total: number, lado: 'esq' | 'dir') {
  // As folhas de fora saem mais que as de dentro: e o que abre o leque.
  const avanco = Math.sin((i / total) * Math.PI) * 9
  const x = lado === 'esq' ? 74 - i * 1.9 - avanco : 926 + i * 1.9 + avanco
  const topo = 58 + i * 1.1
  const base = 560 - i * 0.7
  const curva = lado === 'esq' ? x + 16 : x - 16
  return (
    <path
      key={`${lado}-${i}`}
      d={`M ${x},${topo} C ${curva},${topo + 40} ${curva},${base - 40} ${x},${base}`}
      fill="none"
      stroke={i % 2 === 0 ? PAPEL_SOMBRA : PAPEL_CLARO}
      strokeWidth={1.3}
      strokeLinecap="round"
      opacity={0.9}
    />
  )
}

export function LivroArte() {
  const pilha = 13

  return (
    <svg
      className="livro-arte"
      viewBox="0 0 1000 640"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Papel: claro na ponta externa, escurecendo pro vinco. E o que da a
            sensacao de folha erguida em vez de area pintada. */}
        <linearGradient id="lv-papel-esq" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={PAPEL_FUNDO} />
          <stop offset="9%" stopColor={PAPEL_SOMBRA} />
          <stop offset="42%" stopColor={PAPEL} />
          <stop offset="88%" stopColor={PAPEL_CLARO} />
          <stop offset="100%" stopColor={PAPEL} />
        </linearGradient>
        <linearGradient id="lv-papel-dir" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={PAPEL_FUNDO} />
          <stop offset="9%" stopColor={PAPEL_SOMBRA} />
          <stop offset="42%" stopColor={PAPEL} />
          <stop offset="88%" stopColor={PAPEL_CLARO} />
          <stop offset="100%" stopColor={PAPEL} />
        </linearGradient>

        {/* Vinco: a parte mais escura da imagem inteira. */}
        <linearGradient id="lv-vinco" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2a1607" stopOpacity="0" />
          <stop offset="34%" stopColor="#2a1607" stopOpacity="0.55" />
          <stop offset="50%" stopColor="#170c02" stopOpacity="0.92" />
          <stop offset="66%" stopColor="#2a1607" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2a1607" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="lv-couro" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={COURO} />
          <stop offset="60%" stopColor={COURO_ESCURO} />
          <stop offset="100%" stopColor="#25130a" />
        </linearGradient>

        {/* Sombra suave por baixo do livro inteiro. */}
        <radialGradient id="lv-chao" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sombra no chao */}
      <ellipse cx="500" cy="600" rx="470" ry="34" fill="url(#lv-chao)" />

      {/* Capa: aparece so como faixa por tras das folhas, nas pontas. */}
      <path
        d="M 500,96 C 380,48 210,36 44,74 L 30,566 C 200,610 390,614 500,592
           C 610,614 800,610 970,566 L 956,74 C 790,36 620,48 500,96 Z"
        fill="url(#lv-couro)"
      />

      {/* Pilha de folhas nas pontas externas -- e ela que da espessura ao livro */}
      <g>{Array.from({ length: pilha }, (_, i) => folhaDaPilha(i, pilha, 'esq'))}</g>
      <g>{Array.from({ length: pilha }, (_, i) => folhaDaPilha(i, pilha, 'dir'))}</g>

      {/* Folha da esquerda: sobe na ponta externa, mergulha no vinco. */}
      <path
        d="M 498,102 C 430,62 330,44 232,48 C 160,51 106,58 76,66
           L 66,556 C 140,584 260,596 360,590 C 420,586 466,578 498,570 Z"
        fill="url(#lv-papel-esq)"
      />
      {/* Folha da direita: espelho da esquerda. */}
      <path
        d="M 502,102 C 570,62 670,44 768,48 C 840,51 894,58 924,66
           L 934,556 C 860,584 740,596 640,590 C 580,586 534,578 502,570 Z"
        fill="url(#lv-papel-dir)"
      />

      {/* Realce na crista de cada folha, onde o papel pega luz. */}
      <path
        d="M 498,102 C 430,62 330,44 232,48 C 160,51 106,58 76,66"
        fill="none"
        stroke="#fffaf0"
        strokeWidth="2.5"
        opacity="0.5"
      />
      <path
        d="M 502,102 C 570,62 670,44 768,48 C 840,51 894,58 924,66"
        fill="none"
        stroke="#fffaf0"
        strokeWidth="2.5"
        opacity="0.5"
      />

      {/* Vinco */}
      <rect x="452" y="60" width="96" height="524" fill="url(#lv-vinco)" />

      {/* Curva da lombada na base, onde as duas folhas se encontram. */}
      <path
        d="M 462,566 C 476,596 524,596 538,566 C 524,586 476,586 462,566 Z"
        fill="#1d0f04"
        opacity="0.9"
      />
      <ellipse cx="500" cy="580" rx="26" ry="11" fill="#2c1809" />
    </svg>
  )
}
