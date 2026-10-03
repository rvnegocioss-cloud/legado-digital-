'use client'

// maplibre-gl 6 não tem mais export default: as funções vêm nomeadas.
import { addProtocol, setWorkerUrl } from 'maplibre-gl'
import { Protocol } from 'pmtiles'

// maplibre-gl 6 carrega o web worker por URL própria, e com Next/Turbopack
// essa URL precisa ser dita à mão -- sem isso o mapa abre em branco com
// "Worker failed to load" (visto na prévia de 2026-10-03). Os arquivos são
// copiados para public/maplibre/ por scripts/copiar-worker-maplibre.mjs.
//
// Fica no escopo do módulo, e não dentro da função, de propósito: os três
// mapas do projeto (Central, público e "Como Chegar") importam este arquivo,
// então a URL já está definida antes de qualquer um deles criar o mapa --
// inclusive em cemitério sem ortomosaico, que nunca chama a função abaixo.
if (typeof window !== 'undefined') {
  setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')
}

// Registro idempotente do protocolo pmtiles:// no MapLibre -- sem isso, a
// source com tiles: ['pmtiles://...'] não sabe como ler o arquivo.
let registrado = false

export function registrarProtocoloPmtiles() {
  if (registrado || typeof window === 'undefined') return
  const protocolo = new Protocol()
  addProtocol('pmtiles', protocolo.tile)
  registrado = true
}
