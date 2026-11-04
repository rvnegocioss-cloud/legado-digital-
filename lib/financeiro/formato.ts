export const brl = (v: number, casas = 2) => {
  const s = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(Math.abs(v))
  return (v < 0 ? "−" : "") + s.replace(/ /g, " ")
}
export const inteiro = (v: number) => new Intl.NumberFormat("pt-BR").format(v)
export const pct = (v: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v * 100) + "%"
