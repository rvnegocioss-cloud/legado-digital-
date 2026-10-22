// Endereço oficial do memorial (ver docs/PLANO_URL_MEMORIAL_HIERARQUICA.md).
//   /homenagem/{cidade}/{cemiterio}/t{id_publico}/{memorial}
//   /homenagem/uberlandia/saopedro/t37/grande-otelo
// Parte PURA (sem banco): pode ser importada de client e servidor.
// A busca dos pedaços no banco fica em lib/urlMemorialServidor.ts.

export type DadosUrlMemorial = {
  slug: string
  /** cemiterios.cidade (texto cru; vira slug sem acento e sem UF) */
  cidade?: string | null
  /** cemiterios.slug_curto */
  cemiterioSlug?: string | null
  /** lapides.id_publico (permanente) */
  idPublico?: number | string | null
  /** lapides.numero_oficial (só exibição, nunca entra no endereço) */
  numeroOficial?: string | null
  /** false quando modo_gate != 'aberto' (ausência de registro = aberto) */
  aberto?: boolean
}

export function slugificar(texto: string): string {
  return texto
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function urlCurtaMemorial(slug: string): string {
  return `/homenagem/${slug}`
}

/**
 * Endereço oficial. Cai no curto se o memorial não for aberto ou se faltar
 * túmulo/cemitério/slug_curto (regras 5 e 6 do plano).
 */
export function urlCanonicaMemorial(d: DadosUrlMemorial): string {
  const cidade = d.cidade ? slugificar(d.cidade) : ''
  const cem = d.cemiterioSlug?.trim().toLowerCase()
  const idp = d.idPublico == null ? '' : String(d.idPublico).trim()
  if (d.aberto === false || !cidade || !cem || !/^\d+$/.test(idp)) {
    return urlCurtaMemorial(d.slug)
  }
  return `/homenagem/${cidade}/${cem}/t${idp}/${d.slug}`
}
