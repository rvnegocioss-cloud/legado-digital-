// maplibre-gl 6 é só ESM e carrega o web worker por URL de verdade (não mais
// por blob). Com Next.js/Turbopack a orientação oficial é copiar os dois
// arquivos do worker para public/ e apontar com setWorkerUrl
// (https://maplibre.org/maplibre-gl-js/docs/ — "Next.js (Turbopack)").
//
// A cópia roda antes de todo build/dev (prebuild/predev no package.json) para
// o worker ser SEMPRE o da versão instalada: worker de versão diferente da
// biblioteca quebra o mapa em silêncio. Por isso public/maplibre/ fica fora
// do git.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const origem = join(raiz, 'node_modules', 'maplibre-gl', 'dist')
const destino = join(raiz, 'public', 'maplibre')

mkdirSync(destino, { recursive: true })
// O worker importa o "shared" como arquivo irmão: os dois precisam ir juntos.
for (const arquivo of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(origem, arquivo), join(destino, arquivo))
}
console.log('worker do maplibre copiado para public/maplibre/')
