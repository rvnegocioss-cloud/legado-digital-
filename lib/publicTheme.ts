// Tema compartilhado das páginas públicas (memorial, busca, sub-landing de parceiro).
// Mesma identidade "luxo moderno" de app/homenagem/[slug]/page.tsx: navy + dourado,
// Georgia (fonte de sistema — nunca @import externo, ver CLAUDE.md "Bugs conhecidos").
import type { CSSProperties } from "react";

export const CORES = {
  fundoTopo: "#0f2436",
  fundoBase: "#0B1D2A",
  dourado: "#C9A46A",
  douradoBorda: "rgba(201,164,106,0.18)",
  textoForte: "#F5F2EB",
  textoCorpo: "#b0c0cc",
  textoFraco: "#7a8a96",
} as const;

export const tema: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${CORES.fundoTopo} 0%, ${CORES.fundoBase} 100%)`,
    color: CORES.textoForte,
    fontFamily: "Georgia, 'Times New Roman', serif",
    lineHeight: 1.6,
  },
  hero: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "56px 20px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  eyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: CORES.dourado,
    fontWeight: 600,
  },
  titulo: { fontSize: 36, fontWeight: 400, margin: "8px 0 12px", lineHeight: 1.15 },
  subtitulo: { color: CORES.textoFraco, fontSize: 15, maxWidth: 520 },
  main: { maxWidth: 960, margin: "0 auto", padding: "12px 20px 48px" },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: CORES.dourado,
    fontWeight: 600,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${CORES.douradoBorda}`,
    borderRadius: 12,
    padding: 28,
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  footer: {
    borderTop: `1px solid ${CORES.douradoBorda}`,
    maxWidth: 960,
    margin: "0 auto",
    padding: "28px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vazio: { color: CORES.textoFraco, marginTop: 14 },

  // Campo de busca — full width, contorno dourado sutil, foco sem outline padrão do browser.
  buscaForm: { display: "flex", gap: 8, width: "100%", maxWidth: 480, marginTop: 28 },
  buscaInput: {
    flex: 1,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${CORES.douradoBorda}`,
    borderRadius: 8,
    padding: "12px 16px",
    color: CORES.textoForte,
    fontFamily: "Georgia, serif",
    fontSize: 16,
  },
  buscaBotao: {
    background: CORES.dourado,
    color: CORES.fundoBase,
    border: "none",
    borderRadius: 8,
    padding: "0 20px",
    fontFamily: "Georgia, serif",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },

  // Grid de "placas" — elemento assinatura: ecoa a placa de identificação
  // gravada num jazigo/gaveta física, não um card genérico.
  placaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16,
    marginTop: 20,
  },
  placaLink: { textDecoration: "none", color: "inherit" },
  placa: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${CORES.douradoBorda}`,
    borderRadius: 10,
    padding: 16,
    transition: "border-color 0.15s ease",
  },
  placaAnel: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    padding: 2,
    background: `conic-gradient(from 0deg, ${CORES.dourado}, #dfc08a, #a8834a, ${CORES.dourado})`,
    flexShrink: 0,
  },
  placaAnelInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    background: CORES.fundoTopo,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placaFoto: { width: "100%", height: "100%", objectFit: "cover" },
  placaTextos: { minWidth: 0 },
  placaNome: {
    fontSize: 17,
    color: CORES.textoForte,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  placaHairline: {
    width: 28,
    borderTop: `1px solid ${CORES.douradoBorda}`,
    margin: "6px 0",
  },
  placaMeta: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: CORES.textoFraco,
  },
};

export function periodoTexto(nascimento: string | null, falecimento: string | null) {
  return [nascimento, falecimento].filter(Boolean).join(" — ");
}
