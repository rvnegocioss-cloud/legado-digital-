'use client'

// maplibre-gl 6 não tem mais export default: as funções vêm nomeadas.
import { addProtocol } from 'maplibre-gl'
import { Protocol } from 'pmtiles'

// Registro idempotente do protocolo pmtiles:// no MapLibre -- sem isso, a
// source com tiles: ['pmtiles://...'] não sabe como ler o arquivo.
let registrado = false

export function registrarProtocoloPmtiles() {
  if (registrado || typeof window === 'undefined') return
  const protocolo = new Protocol()
  addProtocol('pmtiles', protocolo.tile)
  registrado = true
}
