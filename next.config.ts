import type { NextConfig } from "next";

// CSP permissiva o suficiente pra não quebrar nada que já funciona (fotos de
// família no Supabase Storage, mapa MapLibre com satélite Esri, vídeo do
// YouTube embutido, estilo inline do React usado na página pública inteira)
// — ainda bloqueia o essencial: nada de script externo, nada de embutir o
// site em iframe de terceiro, nada fora de https. Auditoria de segurança,
// 2026-07-24.
//
// 2026-07-29: connect-src faltava server.arcgisonline.com (tiles de satélite
// do mapa "Como Chegar") e worker-src faltava blob: (MapLibre roda um web
// worker próprio pra decodificar tile) — o mapa em si carregava (não usa
// rede), só a imagem de satélite e a decodificação ficavam bloqueadas pelo
// CSP, com erro só no console do navegador, nunca visível na tela.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://server.arcgisonline.com",
  "frame-src https://www.youtube.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join('; ')

// Canvas Legado (2026-10-28): editor estático em /canvas-legado/* carrega
// html2canvas e jsPDF do cdnjs e fontes do Google. Afrouxa SÓ esse path.
const CSP_CANVAS = CSP
  .replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com")
  .replace("style-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com")
  .replace("font-src 'self' data:", "font-src 'self' data: https://fonts.gstatic.com")
  .replace("connect-src 'self'", "connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com")

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
      {
        source: '/canvas-legado/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP_CANVAS },
          { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=(self)' },
        ],
      },
    ]
  },
};

export default nextConfig;
