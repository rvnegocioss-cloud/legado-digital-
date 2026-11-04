import { test } from 'node:test'
import assert from 'node:assert/strict'
import { divisaoPorMemorial, EQ, EQP, LIQ, LIQP, margem, novosPorMesSimulados, serie, receita, resumoParceiro, saldo, serieEquilibrio, variacaoPct } from '../lib/financeiro/financeiro.ts'
import { custosIniciais, memoriaisPorMes } from '../lib/financeiro/padroes.ts'
import { PARCEIRO_EXEMPLO, RAZAO_PARCEIROS } from '../lib/financeiro/padroes.ts'

const perto = (a, b, d = 1e-9) => assert.ok(Math.abs(a - b) < d, `${a} != ${b}`)

test('equilibrio: serie comeca em 0 e ponto 7 e EQ', () => {
  const s = serieEquilibrio({ p: 5, pct: 0.3, K: 496.5, razao: RAZAO_PARCEIROS })
  assert.equal(s.length, 11)
  assert.equal(s[0].memoriais, '0')
  assert.equal(s[7].memoriais, '112')
  assert.ok(s[7]['Receita nossa'] >= 496.5)
  assert.ok(s[6]['Receita nossa'] < 496.5)
  assert.ok(s[7]['Receita com parceiros (simulação)'] > s[7]['Receita nossa'])
  assert.ok(s.every((x) => x['Custo fixo'] === 496.5))
})
test('divisao por memorial fecha com o cobrado', () => {
  const n = divisaoPorMemorial(5, 0.3, 'Nossos')
  const q = divisaoPorMemorial(5, 0.3, 'Parceiros')
  assert.equal(n.parteParceiro, 0)
  perto(n.nossaParte, LIQ(5))
  perto(q.parteParceiro, 1.5)
  perto(q.nossaParte, LIQP(5, 0.3))
  for (const d of [n, q]) perto(d.parteParceiro + d.nossaParte + d.descontos, d.cobrado)
  perto(margem(5, 0.3, 'Nossos'), 0.8938, 1e-3)
  assert.ok(margem(5, 0.3, 'Parceiros') < margem(5, 0.3, 'Nossos'))
})
test('novos por mes somados batem com a serie acumulada', () => {
  const novos = novosPorMesSimulados(3, 1)
  const sr = serie({ origem: 'Todos', simulacao: true, K: 496.5, p: 5, pct: 0.3, sn: 3, spn: 1 })
  assert.equal(novos.reduce((t, m) => t + m.Nossos + m.Parceiros, 0), sr[11].memoriais)
})
test('variacao %: mes anterior zero vira nulo', () => {
  perto(variacaoPct(5, 2), 1.5)
  perto(variacaoPct(1, 5), -0.8)
  assert.equal(variacaoPct(3, 0), null)
  assert.equal(variacaoPct(0, 0), null)
})
test('visao do parceiro soma so o que e do parceiro', () => {
  const r = resumoParceiro([...PARCEIRO_EXEMPLO.memoriais], PARCEIRO_EXEMPLO.pct)
  assert.equal(r.cadastradosNoMes, 3)
  assert.equal(r.clientesPagaram, 70)
  perto(r.vocePorRecebe, 21)
  perto(r.faltaReceber, 3)
})
test('LIQP(p,0) == LIQ(p)', () => {
  for (const p of [5, 6, 7, 8, 9, 9.99]) perto(LIQP(p, 0), LIQ(p))
})
test('Nossos + Parceiros == Todos', () => {
  for (const p of [5, 9.99]) {
    const t = receita('Todos', 7, 3, p, 0.3)
    perto(receita('Nossos', 7, 3, p, 0.3) + receita('Parceiros', 7, 3, p, 0.3), t)
  }
})
test('saldo com receita zero', () => {
  for (let n = 1; n <= 12; n++) perto(saldo(n, 0, 496.5), -496.5 * n)
})
test('equilibrio e liquidos', () => {
  assert.equal(EQ(5, 496.5), 112)
  assert.equal(LIQP(5, 0.3).toFixed(2), '3.06')
  assert.equal(LIQ(5).toFixed(2), '4.47')
  assert.equal(EQP(5, 0, 0.3, 496.5), 112)
})
test('padroes: soma dos custos e dos meses', () => {
  perto(custosIniciais.reduce((t, c) => t + c.valor, 0), 496.5)
  assert.equal(memoriaisPorMes.reduce((t, m) => t + m.total, 0), 13)
})

import { fonteEfetiva } from '../lib/financeiro/fonte.ts'
import { readFileSync } from 'node:fs'
test('etiqueta REAL so quando os dados vieram da API; senao EXEMPLO', () => {
  assert.equal(fonteEfetiva('REAL', true), 'REAL')
  assert.equal(fonteEfetiva('REAL', false), 'EXEMPLO')
  for (const f of ['INFORMADO', 'CALCULADO', 'EXEMPLO', 'SIMULAÇÃO']) {
    assert.equal(fonteEfetiva(f, true), f)
    assert.equal(fonteEfetiva(f, false), f)
  }
})
test('estado: dados.real so e true com dadosApi; EtiquetaFonte usa fonteEfetiva', () => {
  const e = readFileSync(new URL('../lib/financeiro/estado.tsx', import.meta.url), 'utf8')
  assert.ok(/real: false,\s*\n\s*dataConsulta: DATA_SNAPSHOT/.test(e))
  assert.ok(/real: true,/.test(e) && /dadosApi \? dadosDaApi/.test(e))
  const t = readFileSync(new URL('../components/financeiro/EtiquetaFonte.tsx', import.meta.url), 'utf8')
  assert.ok(t.includes('fonteEfetiva(pedida'))
})
