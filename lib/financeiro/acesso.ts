// Decisão de acesso do portal do parceiro (função pura, testada em tests/financeiro-acesso.test.mjs).
// Regra 22: staff vê qualquer parceiro; parceiro só o(s) próprio(s); outro ID = 403.
export type ChamadorMin = { ehStaff: boolean; parceiroIds: string[] }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type DecisaoAcesso = { ok: true; parceiroId: string } | { ok: false; status: 400 | 403 }

export function decidirAcessoParceiro(quem: ChamadorMin, idPedido: string | null): DecisaoAcesso {
  // parceiro com um único vínculo pode omitir o ID; staff e parceiro com vários precisam informar
  const id = idPedido ?? (!quem.ehStaff && quem.parceiroIds.length === 1 ? quem.parceiroIds[0] : null)
  if (!id || !UUID.test(id)) return { ok: false, status: 400 }
  if (quem.ehStaff || quem.parceiroIds.includes(id)) return { ok: true, parceiroId: id }
  return { ok: false, status: 403 }
}
