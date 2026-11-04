import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { cartoes } from '../lib/financeiro/cartoes.ts'

const raiz = join(import.meta.dirname, '..')

function arquivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? arquivos(p) : /\.tsx$/.test(p) ? [p] : []
  })
}

const fontes = ['components/financeiro', 'app/admin/financeiro', 'app/parceiro/financeiro'].flatMap((d) => arquivos(join(raiz, d)))
const textos = fontes.map((f) => ({ f, t: readFileSync(f, 'utf8') }))

test('a lista oficial de cartoes tem fonte em todos', () => {
  assert.deepEqual(cartoes.filter((c) => !c.fonte).map((c) => c.id), [])
})

test('todo <CartaoFonte> declara id e fonte, e o id esta na lista (e vice-versa)', () => {
  const usados = []
  for (const { f, t } of textos) {
    if (f.endsWith('Blocos.tsx')) continue
    let i = t.indexOf('<CartaoFonte')
    while (i >= 0) {
      const trecho = t.slice(i, i + 420)
      const id = /id="([^"]+)"/.exec(trecho)?.[1]
      assert.ok(id, `cartao sem id em ${f}`)
      assert.ok(/fonte=/.test(trecho), `cartao ${id} sem fonte em ${f}`)
      usados.push(id)
      i = t.indexOf('<CartaoFonte', i + 1)
    }
  }
  for (const id of usados) assert.ok(cartoes.some((c) => c.id === id), `id fora da lista: ${id}`)
  for (const c of cartoes) assert.ok(usados.includes(c.id), `cartao da lista nao usado: ${c.id}`)
})

test('as 8 abas da Central e a pagina do parceiro existem; cada tela tem cartoes com prefixo proprio', () => {
  for (const p of ['', 'custos', 'equilibrio', 'rentabilidade', 'crescimento', 'memoriais', 'planos', 'fontes']) {
    assert.ok(existsSync(join(raiz, 'app/admin/financeiro', p, 'page.tsx')), `sem pagina: ${p || 'visao geral'}`)
  }
  assert.ok(existsSync(join(raiz, 'app/parceiro/financeiro/page.tsx')))
  for (const pre of ['eq-', 're-', 'cr-', 'me-', 'pl-', 'fo-', 'pa-']) {
    assert.ok(cartoes.some((c) => c.id.startsWith(pre)), `sem cartoes ${pre}`)
  }
})

test('nenhuma tela usa <Card> direto (so via CartaoFonte)', () => {
  for (const { f, t } of textos) {
    if (f.endsWith('Blocos.tsx')) continue
    assert.equal(/<Card[\s>]/.test(t), false, `Card cru em ${f}`)
  }
})

test('CSS nao vaza: arquivo do financeiro so tem regras sob .ld-financeiro', () => {
  const css = readFileSync(join(raiz, 'app/admin/financeiro/financeiro.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const seletores = [...css.matchAll(/(^|\})\s*([^{}]+)\{/g)].map((m) => m[2].trim())
  for (const s of seletores) assert.ok(s.startsWith('.ld-financeiro'), `seletor fora do escopo: ${s}`)
})

test('chave de modo nova no localStorage (nao reaproveita ld_modo)', () => {
  const t = readFileSync(join(raiz, 'lib/financeiro/estado.tsx'), 'utf8')
  assert.ok(t.includes('"ldf_modo"'))
  assert.equal(t.includes('"ld_modo'), false)
  assert.ok(/useState<Modo>\("detalhado"\)/.test(t))
})
