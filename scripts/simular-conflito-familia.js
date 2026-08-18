const fs = require('fs')
for (const l of fs.readFileSync('c:/Users/rafa/legado-digital-/.env.local','utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)="?(.*?)"?\s*$/); if (m) process.env[m[1]] = m[2]
}
const APP = 'https://legado-digital-two.vercel.app'
const SLUG = 'teste-conflito-silva'
const ID = 'ab3b2ca8-d3e7-45a8-8363-322848f066ac'
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
let cookie = ''

async function req(caminho, corpo, metodo='POST') {
  const res = await fetch(APP + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: metodo === 'GET' ? undefined : JSON.stringify(corpo),
  })
  const set = res.headers.get('set-cookie')
  if (set) cookie = set.split(';')[0]
  const txt = await res.text()
  let json; try { json = JSON.parse(txt) } catch { json = { bruto: txt.slice(0,150) } }
  return { status: res.status, json }
}

// "a equipe/funeraria mexendo no memorial pelo painel dela"
async function equipeEscreve(campos) {
  const res = await fetch(`${SUPA}/rest/v1/homenagens?slug=eq.${SLUG}`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(campos),
  })
  return res.status
}

const CAMPOS = ['nome_completo','data_nascimento','data_falecimento','cidade','frase_preferida','biografia','foto_url','video_url','videos_galeria','galeria_fotos','timeline','vinculos','tema']

async function abrirPagina() {
  const r = await req(`/api/familia-memorial?slug=${SLUG}`, null, 'GET')
  const m = r.json.memorial
  const base = {}
  for (const c of CAMPOS) base[c] = m[c]
  return { base, updatedAt: m.updated_at }
}

async function salvar(tela, mudancas, opcoes = {}) {
  const corpo = { slug: SLUG, updatedAtEsperado: tela.updatedAt, ...tela.base, ...mudancas }
  if (!opcoes.telaAntiga) corpo.valoresBase = tela.base
  return req('/api/familia-memorial', corpo)
}

function resultado(nome, ok, detalhe) {
  console.log(`${ok ? '  PASSOU' : '  FALHOU'}  ${nome}${detalhe ? ' -> ' + detalhe : ''}`)
  return ok
}

;(async () => {
  const login = await req('/api/familia-login', { slug: SLUG, senha: 'teste1234' })
  if (login.status !== 200) return console.log('login falhou:', login.json)
  console.log('Sessao de familia aberta (login real, senha teste1234)\n')
  const placar = []

  console.log('CENARIO 1 - equipe mexe em OUTRO campo enquanto a familia escreve (o caso do Pedro)')
  let tela = await abrirPagina()
  await equipeEscreve({ galeria_fotos: ['https://exemplo/foto-da-equipe.jpg'] })
  let r = await salvar(tela, { biografia: 'Texto novo escrito pela familia. ' + Date.now() })
  placar.push(resultado('familia consegue salvar a biografia', r.status === 200, `HTTP ${r.status} ${r.json.error || ''}`))

  console.log('\nCENARIO 2 - equipe reescreve O MESMO campo (conflito de verdade)')
  tela = await abrirPagina()
  await equipeEscreve({ biografia: 'Texto que a funeraria escreveu em paralelo.' })
  r = await salvar(tela, { biografia: 'Texto da familia que nao pode sobrescrever a funeraria.' })
  placar.push(resultado('sistema barra e diz qual campo', r.status === 409 && Array.isArray(r.json.camposEmConflito), `HTTP ${r.status} campos=${JSON.stringify(r.json.camposEmConflito)}`))

  console.log('\nCENARIO 3 - familia salva duas vezes seguidas (nao pode brigar consigo mesma)')
  tela = await abrirPagina()
  r = await salvar(tela, { frase_preferida: 'Primeira gravacao' })
  const primeiro = r.status
  tela = await abrirPagina()
  r = await salvar(tela, { frase_preferida: 'Segunda gravacao seguida' })
  placar.push(resultado('duas gravacoes seguidas passam', primeiro === 200 && r.status === 200, `HTTP ${primeiro} depois ${r.status}`))

  console.log('\nCENARIO 4 - equipe mexe em 2 campos, familia edita um terceiro')
  tela = await abrirPagina()
  await equipeEscreve({ cidade: 'Cidade mexida pela equipe', tema: 'verde' })
  r = await salvar(tela, { timeline: [{ year: '1999', title: 'Evento escrito pela familia', description: 'teste' }] })
  placar.push(resultado('familia salva a linha do tempo', r.status === 200, `HTTP ${r.status} ${r.json.error || ''}`))

  console.log('\nCENARIO 5 - pagina antiga (sem a correcao) continua protegida')
  tela = await abrirPagina()
  await equipeEscreve({ frase_preferida: 'Mexido pela equipe de novo' })
  r = await salvar(tela, { biografia: 'Texto de uma aba antiga.' }, { telaAntiga: true })
  placar.push(resultado('trava antiga ainda barra', r.status === 409, `HTTP ${r.status}`))

  console.log('\n================ RESULTADO ================')
  console.log(`${placar.filter(Boolean).length} de ${placar.length} cenarios passaram`)
})()
