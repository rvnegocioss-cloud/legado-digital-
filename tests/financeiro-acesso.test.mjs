import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decidirAcessoParceiro } from '../lib/financeiro/acesso.ts'
import { agruparMemoriais, montarParceiros, soDoParceiro, COLUNAS_HOMENAGENS, COLUNAS_PARCEIROS } from '../lib/financeiro/consultas.ts'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

test('parceiro so acessa o proprio ID; outro ID = 403', () => {
  const quem = { ehStaff: false, parceiroIds: [A] }
  assert.deepEqual(decidirAcessoParceiro(quem, A), { ok: true, parceiroId: A })
  assert.deepEqual(decidirAcessoParceiro(quem, B), { ok: false, status: 403 })
  assert.deepEqual(decidirAcessoParceiro(quem, null), { ok: true, parceiroId: A })
})
test('parceiro com varios vinculos precisa informar o ID; ID invalido = 400', () => {
  const quem = { ehStaff: false, parceiroIds: [A, B] }
  assert.deepEqual(decidirAcessoParceiro(quem, null), { ok: false, status: 400 })
  assert.deepEqual(decidirAcessoParceiro(quem, 'x'), { ok: false, status: 400 })
  assert.deepEqual(decidirAcessoParceiro(quem, B), { ok: true, parceiroId: B })
})
test('staff acessa qualquer parceiro, mas precisa informar o ID', () => {
  const quem = { ehStaff: true, parceiroIds: [] }
  assert.deepEqual(decidirAcessoParceiro(quem, B), { ok: true, parceiroId: B })
  assert.deepEqual(decidirAcessoParceiro(quem, null), { ok: false, status: 400 })
})
test('sem vinculo nenhum = 403', () => {
  assert.deepEqual(decidirAcessoParceiro({ ehStaff: false, parceiroIds: [] }, A), { ok: false, status: 403 })
})
test('filtro por parceiro_id so devolve linhas do parceiro', () => {
  const linhas = [
    { id: '1', parceiro_id: A },
    { id: '2', parceiro_id: B },
    { id: '3', parceiro_id: null },
  ]
  assert.deepEqual(soDoParceiro(linhas, A).map((l) => l.id), ['1'])
  assert.deepEqual(soDoParceiro(linhas, B).map((l) => l.id), ['2'])
})
test('agrupamento por mes e origem (horario de Brasilia, meses vazios entram com zero)', () => {
  const l = (id, iso, parceiro_id, origem_cadastro) => ({ id, created_at: iso, parceiro_id, origem_cadastro })
  const r = agruparMemoriais(
    [
      l('1', '2026-07-10T12:00:00Z', null, 'central'),
      l('2', '2026-07-31T23:30:00Z', null, 'mapa_cemiterio'), // 20h30 em Brasilia: ainda julho
      l('3', '2026-09-02T12:00:00Z', A, 'parceiro'),
      l('4', '2026-09-03T12:00:00Z', null, null),
    ],
    new Date('2026-09-20T12:00:00Z'),
  )
  assert.deepEqual(r.memoriaisPorMes, [{ mes: 'Jul', total: 2 }, { mes: 'Ago', total: 0 }, { mes: 'Set', total: 2 }])
  assert.deepEqual(r.memoriaisPorMesOrigem[2], { mes: 'Set', Nossos: 1, Parceiros: 1 })
  assert.equal(r.totalMemoriais, 4)
  assert.deepEqual(r.memoriaisPorOrigem, { mapaCemiterio: 1, central: 1, parceiroPortal: 1, familia: 0, semOrigem: 1, deParceiros: 1 })
})
test('parceiros: nome cai para razao social e conta os memoriais de cada um', () => {
  const ps = montarParceiros(
    [{ id: A, nome_fantasia: null, razao_social: 'Razao A', plano_contratado: null, status_pagamento: null, created_at: '2026-09-14T12:00:00Z' }],
    [{ id: '1', created_at: '2026-09-15T12:00:00Z', parceiro_id: A, origem_cadastro: null }],
  )
  assert.equal(ps[0].nome, 'Razao A')
  assert.equal(ps[0].memoriais, 1)
  assert.equal(ps[0].criadaEm, '14/09/2026')
})
test('selects tem lista explicita de colunas (nada de *) e sem dado de familia', () => {
  assert.equal(COLUNAS_HOMENAGENS, 'id, created_at, parceiro_id, origem_cadastro')
  assert.equal(COLUNAS_PARCEIROS, 'id, nome_fantasia, razao_social, plano_contratado, status_pagamento, created_at')
})
