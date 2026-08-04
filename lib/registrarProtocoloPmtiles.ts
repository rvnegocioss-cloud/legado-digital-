'use client'

import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'

// Registro idempotente do protocolo pmtiles:// no MapLibre -- sem isso, a
// source com tiles: ['pmtiles://...'] não sabe como ler o arquivo.
let registrado = false

export function registrarProtocoloPmtiles() {
  if (registrado || typeof window === 'undefined') return
  const protocolo = new Protocol()
  maplibregl.addProtocol('pmtiles', protocolo.tile)
  registrado = true
}
