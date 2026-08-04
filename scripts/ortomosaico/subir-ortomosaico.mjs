// Sobe um arquivo .pmtiles pro bucket "mapas" no Supabase Storage e confirma
// que HTTP Range request funciona na URL final (obrigatório pro PMTiles
// funcionar no navegador sem servidor de tiles dedicado).
//
// Uso: node scripts/ortomosaico/subir-ortomosaico.mjs <arquivo.pmtiles> <caminho/no/bucket.pmtiles>

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Loader minimo de .env.local -- evita depender do pacote dotenv so pra um
// script standalone que roda fora do processo do Next.js.
for (const linha of readFileSync('.env.local', 'utf-8').split('\n')) {
  const m = linha.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] ??= m[2].replace(/^"(.*)"$/, '$1')
}

const [, , arquivoLocal, caminhoBucket] = process.argv
if (!arquivoLocal || !caminhoBucket) {
  console.error('Uso: node subir-ortomosaico.mjs <arquivo.pmtiles> <caminho/no/bucket.pmtiles>')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const buffer = readFileSync(arquivoLocal)
console.log(`Subindo ${arquivoLocal} (${(buffer.length / 1024 / 1024).toFixed(1)} MB) para mapas/${caminhoBucket} ...`)

const { error } = await supabase.storage
  .from('mapas')
  .upload(caminhoBucket, buffer, { contentType: 'application/octet-stream', upsert: true })

if (error) {
  console.error('Falha no upload:', error.message)
  process.exit(1)
}

const { data: publicUrlData } = supabase.storage.from('mapas').getPublicUrl(caminhoBucket)
const url = publicUrlData.publicUrl
console.log('Upload OK. URL pública:', url)

console.log('Testando Range request...')
const res = await fetch(url, { headers: { Range: 'bytes=0-127' } })
console.log('Status:', res.status, '(esperado 206)')
console.log('Content-Range:', res.headers.get('content-range'))
console.log('Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'))

if (res.status !== 206) {
  console.error('ATENÇÃO: servidor não devolveu 206 Partial Content — PMTiles não vai funcionar direito.')
  process.exit(1)
}

console.log('\nTudo certo. Guardar essa URL:')
console.log(url)
