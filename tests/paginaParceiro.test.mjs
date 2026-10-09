import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { lerDimensoes, validarDimensoes, validarPeso, linkWhatsAppPublico } from '../lib/paginaParceiro.ts'

const arq = (n) => new Uint8Array(readFileSync(new URL('./fixtures/' + n, import.meta.url)))

test('lê largura e altura de JPEG, PNG e WebP (com e sem perda) direto dos bytes', () => {
  assert.deepEqual(lerDimensoes(arq('capa-1920x640.jpg')), { largura: 1920, altura: 640, mime: 'image/jpeg' })
  assert.deepEqual(lerDimensoes(arq('logo-800x800.png')), { largura: 800, altura: 800, mime: 'image/png' })
  assert.deepEqual(lerDimensoes(arq('capa-1600x533.webp')), { largura: 1600, altura: 533, mime: 'image/webp' })
  assert.deepEqual(lerDimensoes(arq('logo-640x640.webp')), { largura: 640, altura: 640, mime: 'image/webp' })
})

test('arquivo que não é imagem não passa, mesmo com nome de imagem', () => {
  assert.equal(lerDimensoes(new TextEncoder().encode('isto é um texto, não uma foto de capa')), null)
  assert.equal(lerDimensoes(new Uint8Array(4)), null)
})

test('capa abaixo do mínimo é recusada e a mensagem diz o tamanho que ela tem', () => {
  const d = lerDimensoes(arq('capa-1024x400.jpg'))
  const msg = validarDimensoes('capa', d.largura, d.altura)
  assert.match(msg, /1024 × 400/)
  assert.match(msg, /1600 × 533/)
})

test('capa no tamanho certo e no mínimo exato são aceitas', () => {
  assert.equal(validarDimensoes('capa', 1920, 640), null)
  assert.equal(validarDimensoes('capa', 1600, 533), null)
})

test('capa grande mas fora do formato de faixa é recusada (foto de celular em pé, quadrada)', () => {
  assert.match(validarDimensoes('capa', 3000, 4000), /fora do formato/)
  assert.match(validarDimensoes('capa', 2000, 2000), /fora do formato/)
})

test('logo: mínimo 500 × 500 e quadrada', () => {
  assert.equal(validarDimensoes('logo', 800, 800), null)
  assert.match(validarDimensoes('logo', 300, 300), /500 × 500/)
  assert.match(validarDimensoes('logo', 1600, 600), /quadrada/)
})

test('peso: logo até 2 MB, capa até 5 MB', () => {
  assert.equal(validarPeso('logo', 2 * 1024 * 1024), null)
  assert.match(validarPeso('logo', 2 * 1024 * 1024 + 1), /2 MB/)
  assert.match(validarPeso('capa', 6 * 1024 * 1024), /5 MB/)
})

test('WhatsApp vira link wa.me com DDI; número curto não vira link', () => {
  assert.equal(linkWhatsAppPublico('(34) 90000-0000'), 'https://wa.me/5534900000000')
  assert.equal(linkWhatsAppPublico('5534900000000'), 'https://wa.me/5534900000000')
  assert.equal(linkWhatsAppPublico('123'), null)
  assert.equal(linkWhatsAppPublico(null), null)
})
