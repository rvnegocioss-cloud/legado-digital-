import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
const { extrair } = createRequire(import.meta.url)('../public/canvas-legado/extrator.js');
const HOJE = '2026-10-27'; // terça

// esperado: campo -> valor exato. Campo ausente no esperado = deve ficar vazio.
const A = [
  ['ditada1', 'falecido', 'o nome do falecido é joão carlos da silva nasceu em 14 de março de 1938 e faleceu em 2 de novembro de 2026', { nome: 'João Carlos da Silva', nasc: '14/03/1938', fal: '02/11/2026' }],
  ['ditada2', 'convite', 'faleceu hoje a senhora Maria Aparecida Souza o velório será na capela do cemitério são pedro hoje às 19h e o sepultamento amanhã às 10h30 no cemitério são pedro funerária paz eterna telefone 34 3219 7017', { nome: 'Maria Aparecida Souza', vel_local: 'Capela do Cemitério São Pedro', vel_dia: 'Terça-feira, 27 de outubro', vel_hora: '19h', sep_dia: 'Quarta-feira, 28 de outubro', sep_hora: '10h30', cem: 'Cemitério São Pedro', fun: 'Funerária Paz Eterna', tel: '(34) 3219-7017' }],
  ['ditada3', 'missa', 'missa de sétimo dia do antônio pereira lima na igreja matriz de santa luzia dia 3/11 às 7 da noite', { igreja: 'Igreja Matriz de Santa Luzia', dia: '3 de novembro', hora: '19h' }],
  ['missa1', 'missa', 'Convidamos para a missa de 7º dia de Helena Martins Costa, que será celebrada na Igreja São José, em Uberlândia, no dia 12 de novembro de 2026, às 19h30.', { igreja: 'Igreja São José', cidade: 'Uberlândia', dia: '12 de novembro de 2026', hora: '19h30' }],
  ['missa2', 'missa', 'Missa de sétimo dia na Paróquia Nossa Senhora Aparecida, terça-feira, 10/11, às 18h. Participe.', { igreja: 'Paróquia Nossa Senhora Aparecida', dia: 'Terça-feira, 10 de novembro', hora: '18h' }],
  ['missa3', 'missa', 'A família convida para a missa na Capela Santa Rita amanhã às 8 da manhã', { igreja: 'Capela Santa Rita', dia: 'Quarta-feira, 28 de outubro', hora: '8h' }],
  ['obit1', 'falecido', 'Faleceu Sr. Gumercindo Saraiva Kappel. Nasceu em 06/06/1922 e partiu em 10/04/1995.', { nome: 'Gumercindo Saraiva Kappel', nasc: '06/06/1922', fal: '10/04/1995' }],
  ['obit2', 'falecido', 'Em memória de Rosa Maria de Jesus. Nascimento: 02/02/1950. Falecimento: 18/09/2026.', { nome: 'Rosa Maria de Jesus', nasc: '02/02/1950', fal: '18/09/2026' }],
  ['zap1', 'convite', 'Pessoal, com profundo pesar comunicamos o falecimento do Sr. Pedro Henrique Alves. Velório na Capela Municipal sábado às 14h. Sepultamento sábado às 16h no Cemitério Bom Pastor. Funerária Vale da Paz (34) 99876-5432', { nome: 'Pedro Henrique Alves', vel_local: 'Capela Municipal', vel_dia: 'Sábado', vel_hora: '14h', sep_dia: 'Sábado', sep_hora: '16h', cem: 'Cemitério Bom Pastor', fun: 'Funerária Vale da Paz', tel: '(34) 99876-5432' }],
  ['zap2', 'santinho', 'Gente, o santinho da tia Lourdes. Funerária Santa Clara, fone 34 3212-1100. Ela nasceu 15/08/1940 e faleceu 01/10/2026', { nasc: '15/08/1940', fal: '01/10/2026', fun: 'Funerária Santa Clara', tel: '(34) 3212-1100' }],
  ['ruido1', 'convite', 'ola boa tarde tudo bem?? preciso do convite do meu pai ele faleceu mas ainda nao sei o horario do velorio nem nada, depois te falo', {}],
  ['ruido2', 'missa', 'a missa vai ser la na igreja la perto de casa semana que vem de tarde nao lembro o dia', {}],
];

const linhas = [];
let cert = 0, tot = 0, errados = 0, extras = 0;
const porCampo = {};
const falhas = [];
for (const [id, tipo, texto, esp] of A) {
  const got = extrair(texto, tipo, HOJE);
  for (const k of Object.keys(esp)) {
    tot++; porCampo[k] ??= [0, 0]; porCampo[k][1]++;
    const g = got[k]?.valor;
    if (g === esp[k]) { cert++; porCampo[k][0]++; }
    else { falhas.push(`${id}.${k}: esperado "${esp[k]}" obtido ${g === undefined ? 'VAZIO' : '"' + g + '"'}`); if (g !== undefined) errados++; }
  }
  for (const k of Object.keys(got)) if (!(k in esp)) { extras++; errados++; falhas.push(`${id}.${k}: preenchido "${got[k].valor}" mas deveria ficar vazio`); }
}
console.log('\nCampo         acerto');
for (const [k, [a, b]] of Object.entries(porCampo)) console.log(k.padEnd(13), `${a}/${b}`);
console.log(`TOTAL ${cert}/${tot} = ${Math.round(100 * cert / tot)}%  | valores ERRADOS preenchidos: ${errados} (extras indevidos: ${extras})`);
falhas.forEach(f => console.log(' - ' + f));

test('critério: acerto >= 70% e no máximo 2 errados preenchidos', () => {
  assert.ok(cert / tot >= 0.7, 'acerto ' + cert + '/' + tot);
  assert.ok(errados <= 2, 'errados ' + errados);
});

// ---- Template 1 Retrato: endereço e versículo (extrairExtra, só adição) ----
const { extrairExtra } = createRequire(import.meta.url)('../public/canvas-legado/extrator.js');
test('retrato: acha rua, bairro e cidade/UF da missa', () => {
  const r = extrairExtra('Missa de sétimo dia no Santuário Nossa Senhora Aparecida, Praça Nossa Senhora Aparecida, nº 100, bairro Nossa Senhora Aparecida, Uberlândia/MG, terça às 19h', 'missa');
  assert.equal(r.end_rua?.valor, 'Praça Nossa Senhora Aparecida, nº 100');
  assert.equal(r.end_bairro?.valor, 'Nossa Senhora Aparecida');
  assert.equal(r.end_cidade_uf?.valor, 'Uberlândia/MG');
});
test('retrato: avenida com número e cidade com hífen no convite', () => {
  const r = extrairExtra('Velório na capela, Av. João Naves de Ávila, 2121, bairro Santa Mônica, Uberlândia - MG', 'convite');
  assert.equal(r.end_rua?.valor, 'Av. João Naves de Ávila, 2121');
  assert.equal(r.end_bairro?.valor, 'Santa Mônica');
  assert.equal(r.end_cidade_uf?.valor, 'Uberlândia/MG');
});
test('retrato: versículo entre aspas com referência bíblica', () => {
  const r = extrairExtra('Missa terça. “Eu sou a ressurreição e a vida. Quem acredita em mim, ainda que tenha morrido, viverá.” João 11,25 A família agradece.', 'missa');
  assert.equal(r.versiculo?.valor, '“Eu sou a ressurreição e a vida. Quem acredita em mim, ainda que tenha morrido, viverá.” — João 11,25');
  assert.equal(r.versiculo?.confianca, 'alta');
});
test('retrato: nada inventado sem endereço/versículo e nada no santinho', () => {
  assert.deepEqual(extrairExtra('Missa de sétimo dia na terça às 19h na igreja matriz de Uberlândia', 'missa'), {});
  assert.deepEqual(extrairExtra('Rua das Flores, 10, bairro Centro, Uberlândia/MG “Deus é amor e fidelidade sempre.” Salmo 23,1', 'santinho'), {});
});
