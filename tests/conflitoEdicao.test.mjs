// Trava contra regressão do bug que fez a família Saraiva perder a linha do
// tempo duas vezes (2026-08-17). Roda no CI a cada push: `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolverConflito } from '../lib/conflitoEdicao.ts'

const base = {
  biografia: 'texto original',
  galeria_fotos: ['foto1.jpg'],
  cidade: 'Uberlândia',
  timeline: [{ year: '1922', title: 'Nascimento' }],
}

test('equipe mexe em OUTRO campo: família consegue salvar (caso real do Pedro)', () => {
  const atual = { ...base, galeria_fotos: ['foto1.jpg', 'foto-da-equipe.jpg'] }
  const enviado = { ...base, biografia: 'texto novo da família' }
  const r = resolverConflito(enviado, base, atual)
  assert.deepEqual(r.conflitos, [])
  assert.deepEqual(Object.keys(r.paraGravar), ['biografia'])
})

test('equipe mexe no MESMO campo: barra e diz qual', () => {
  const atual = { ...base, biografia: 'texto que a funerária escreveu' }
  const enviado = { ...base, biografia: 'texto da família' }
  const r = resolverConflito(enviado, base, atual)
  assert.deepEqual(r.conflitos, ['biografia'])
})

test('campo não tocado nunca é gravado (não carimba updated_at à toa)', () => {
  const r = resolverConflito({ ...base }, base, { ...base })
  assert.deepEqual(r.paraGravar, {})
  assert.deepEqual(r.conflitos, [])
})

test('família não sobrescreve com valor velho o que a equipe acabou de mudar', () => {
  const atual = { ...base, cidade: 'Cidade nova posta pela equipe' }
  const enviado = { ...base, biografia: 'só mexi na biografia' }
  const r = resolverConflito(enviado, base, atual)
  assert.equal('cidade' in r.paraGravar, false)
  assert.deepEqual(r.conflitos, [])
})

test('array e json comparam por conteúdo, não por referência', () => {
  const enviado = { ...base, timeline: [{ year: '1922', title: 'Nascimento' }] }
  const r = resolverConflito(enviado, base, { ...base })
  assert.equal('timeline' in r.paraGravar, false)
})

test('tela antiga (sem base) devolve tudo e deixa a trava por updated_at decidir', () => {
  const r = resolverConflito({ biografia: 'x' }, null, base)
  assert.deepEqual(r.paraGravar, { biografia: 'x' })
  assert.deepEqual(r.conflitos, [])
})
