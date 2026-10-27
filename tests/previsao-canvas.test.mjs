import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
const { previsao: P } = createRequire(import.meta.url)('../public/canvas-legado/extrator.js');
const HOJE = '2026-10-27';

test('weather_code vira texto em portugues', () => {
  assert.equal(P.condicao(0), 'Céu limpo');
  assert.equal(P.condicao(2), 'Parcialmente nublado');
  assert.equal(P.condicao(3), 'Nublado');
  assert.equal(P.condicao(45), 'Névoa');
  assert.equal(P.condicao(61), 'Chuva fraca');
  assert.equal(P.condicao(63), 'Chuva');
  assert.equal(P.condicao(80), 'Chuva fraca');
  assert.equal(P.condicao(95), 'Trovoadas');
  assert.equal(P.condicao(999), '');
});

test('data livre vira ISO', () => {
  assert.equal(P.dataParaISO('Terça-feira, 3 de novembro', HOJE), '2026-11-03');
  assert.equal(P.dataParaISO('12 de novembro de 2026', HOJE), '2026-11-12');
  assert.equal(P.dataParaISO('3/11', HOJE), '2026-11-03');
  assert.equal(P.dataParaISO('lixo', HOJE), null);
  assert.equal(P.dataParaISO('', HOJE), null);
});

test('cidade aceita "Cidade - UF" e cemiterio com cidade', () => {
  assert.equal(P.limpaCidade('Uberlândia - MG'), 'Uberlândia');
  assert.equal(P.limpaCidade('Uberlândia'), 'Uberlândia');
  assert.equal(P.limpaCidade('Cemitério São Pedro — Uberlândia'), 'Uberlândia');
});

test('linha montada, com e sem chuva', () => {
  assert.equal(P.montaLinha('2026-11-03', 2, 18.4, 29.6, 40), 'Previsão para Terça-feira, 3 de novembro: Parcialmente nublado, 18° a 30°, chuva 40%');
  assert.equal(P.montaLinha('2026-11-03', 0, 18, 30, null), 'Previsão para Terça-feira, 3 de novembro: Céu limpo, 18° a 30°');
  assert.equal(P.montaLinha('2026-11-03', 999, 18, 30, 1), '');
});

function falso() {
  let n = 0;
  return { n: () => n, f: async (u) => { n++; return { json: async () => u.includes('geocoding')
    ? (u.includes('Nada') ? {} : { results: [{ latitude: -18.9, longitude: -48.3 }] })
    : { daily: { time: ['2026-10-27', '2026-11-03'], weather_code: [0, 63], temperature_2m_max: [31, 27.2], temperature_2m_min: [19, 17.1], precipitation_probability_max: [0, 80] } } }; } };
}

test('busca com resposta simulada, cache e erros', async () => {
  P.limpaCache();
  const s = falso();
  const r = await P.buscaPrevisao('Uberlândia - MG', '2026-11-03', HOJE, s.f);
  assert.deepEqual(r, { ok: true, texto: 'Previsão para Terça-feira, 3 de novembro: Chuva, 17° a 27°, chuva 80%' });
  const antes = s.n(); await P.buscaPrevisao('Uberlândia', '2026-11-03', HOJE, s.f);
  assert.equal(s.n(), antes, 'segunda busca vem do cache');
  assert.equal((await P.buscaPrevisao('Uberlândia', '2026-10-01', HOJE, s.f)).erro, 'passada');
  assert.equal((await P.buscaPrevisao('Uberlândia', '2026-12-25', HOJE, s.f)).erro, 'longe');
  assert.equal((await P.buscaPrevisao('Nada', '2026-11-03', HOJE, s.f)).erro, 'cidade');
  assert.equal((await P.buscaPrevisao('', '2026-11-03', HOJE, s.f)).erro, 'faltam');
  assert.equal((await P.buscaPrevisao('X', '2026-11-03', HOJE, async () => { throw new Error('off'); })).erro, 'rede');
});
