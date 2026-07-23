// 3 paletas de cor pro seletor de tema da página do memorial (demo pros sócios).
// Só usado em app/homenagem/[slug]/page.tsx — não mexe no tema compartilhado
// de /busca e /parceiros/[slug] (lib/publicTheme.ts).

export interface PaletaMemorial {
  id: string;
  nome: string;
  fundoTopo: string;
  fundoBase: string;
  fundoProfundo: string;
  dourado: string;
  douradoClaro: string;
  douradoEscuro: string;
}

export const PALETAS_MEMORIAL: PaletaMemorial[] = [
  {
    id: "navy",
    nome: "Navy + Dourado",
    fundoTopo: "#0f2436",
    fundoBase: "#0B1D2A",
    fundoProfundo: "#081722",
    dourado: "#C9A46A",
    douradoClaro: "#dfc08a",
    douradoEscuro: "#a8834a",
  },
  {
    id: "verde",
    nome: "Verde + Bronze",
    fundoTopo: "#1c3327",
    fundoBase: "#14251C",
    fundoProfundo: "#0d1912",
    dourado: "#B08D57",
    douradoClaro: "#c9a876",
    douradoEscuro: "#8a6d3f",
  },
  {
    id: "grafite",
    nome: "Grafite + Dourado-claro",
    fundoTopo: "#262628",
    fundoBase: "#1C1C1E",
    fundoProfundo: "#131314",
    dourado: "#D4B483",
    douradoClaro: "#e0c69e",
    douradoEscuro: "#b3925f",
  },
];

// Nomes das CSS custom properties que o seletor sobrescreve em runtime.
export const VAR_FUNDO_TOPO = "--mem-fundo-topo";
export const VAR_FUNDO_BASE = "--mem-fundo-base";
export const VAR_FUNDO_PROFUNDO = "--mem-fundo-profundo";
export const VAR_DOURADO = "--mem-dourado";
export const VAR_DOURADO_CLARO = "--mem-dourado-claro";
export const VAR_DOURADO_ESCURO = "--mem-dourado-escuro";
