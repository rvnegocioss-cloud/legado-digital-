import type { NextConfig } from "next";

// CSP permissiva o suficiente pra não quebrar nada que já funciona (fotos de
// família no Supabase Storage, mapa Leaflet/OpenStreetMap, vídeo do YouTube
// embutido, estilo inline do React usado na página pública inteira) — ainda
// bloqueia o essencial: nada de script externo, nada de embutir o site em
// iframe de terceiro, nada fora de https. Auditoria de segurança, 2026-07-24.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "frame-src https://www.youtube.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join('; ')

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
    ]
  },
};

export default nextConfig;
