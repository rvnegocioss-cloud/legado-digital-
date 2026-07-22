import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Rate limit middleware para Legado Digital
 *
 * Política de rate limits:
 * - Login/logout: 3 requisições/minuto
 * - Upload: 5/min (família), 10/min (staff)
 * - API geral: 30/min
 * - Garbage collect: entries com timestamp < now - 3600s
 *
 * Tracking:
 * - Por usuário (email via Supabase Auth, se autenticado)
 * - Fallback por IP (x-forwarded-for para Vercel)
 * - Chave: ratelimit:{email/ip}:{rota_tipo}
 */

interface RateLimitEntry {
  timestamps: number[]
  lastCleanup: number
}

// Cache global em memória: ratelimit:{identifier}:{routeType} -> { timestamps: [...], lastCleanup: ... }
const rateLimitCache = new Map<string, RateLimitEntry>()

// Tipos de limite (rota agrupa em categorias)
interface RateLimitConfig {
  limit: number // requisições por minuto
  routePatterns: string[] // regex patterns ou prefixos exatos
}

const RATE_LIMIT_CONFIG: Record<string, RateLimitConfig> = {
  login: {
    limit: 3,
    routePatterns: [
      '/api/familia-login',
      '/api/admin/login', // se existir
      '/api/parceiro/login', // se existir
      '/api/familia-esqueci-senha',
    ],
  },
  upload: {
    limit: 10, // será 5 para família, 10 para staff (decidido na rota)
    routePatterns: [
      '/api/familia-upload',
      '/api/admin/upload',
      '/api/parceiro/upload',
    ],
  },
  api: {
    limit: 30,
    routePatterns: [
      '/api/', // tudo em /api que não caiu em categorias anteriores
    ],
  },
}

/**
 * Extrai o tipo de limite baseado na rota
 */
function getRateLimitType(pathname: string): string {
  for (const [type, config] of Object.entries(RATE_LIMIT_CONFIG)) {
    for (const pattern of config.routePatterns) {
      if (pathname.startsWith(pattern)) {
        return type
      }
    }
  }
  return 'api' // default
}

/**
 * Extrai IP do header x-forwarded-for (Vercel) ou connection remoteAddress
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

/**
 * Obtém identificador do cliente: email (se autenticado) ou IP
 */
async function getClientIdentifier(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    // Tentar obter user_id do token JWT
    try {
      const token = authHeader.substring(7)
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      )
      if (payload.email) {
        return payload.email // Usar email como ID se autenticado
      }
    } catch (e) {
      // Token inválido ou parse falhou, fallback para IP
    }
  }

  // Fallback: usar IP
  return getClientIp(req)
}

/**
 * Limpa entries antigas (timestamp < now - 3600s)
 * Retorna true se limpeza foi feita
 */
function cleanupOldEntries(): boolean {
  const now = Date.now()
  const oneHourAgo = now - 3600000
  let cleaned = false

  for (const [key, entry] of rateLimitCache.entries()) {
    if (entry.lastCleanup < oneHourAgo) {
      entry.timestamps = entry.timestamps.filter((t) => t > oneHourAgo)
      entry.lastCleanup = now

      if (entry.timestamps.length === 0) {
        rateLimitCache.delete(key)
      }
      cleaned = true
    }
  }

  return cleaned
}

/**
 * Verifica se requisição está dentro do rate limit
 * Retorna { allowed: boolean, count: number, limit: number }
 */
function checkRateLimit(
  identifier: string,
  routeType: string,
  isStaffUpload: boolean = false
): { allowed: boolean; count: number; limit: number } {
  const now = Date.now()
  const oneMinuteAgo = now - 60000
  const key = `ratelimit:${identifier}:${routeType}`

  // Limpeza periódica (a cada 100 requisições)
  if (Math.random() < 0.01) {
    cleanupOldEntries()
  }

  // Obter ou criar entry
  let entry = rateLimitCache.get(key)
  if (!entry) {
    entry = { timestamps: [], lastCleanup: now }
    rateLimitCache.set(key, entry)
  }

  // Limpar timestamps antigos
  entry.timestamps = entry.timestamps.filter((t) => t > oneMinuteAgo)
  entry.lastCleanup = now

  // Determinar limite baseado na config
  let limit = RATE_LIMIT_CONFIG[routeType]?.limit || 30

  // Override: uploads de staff têm limite maior
  if (routeType === 'upload' && isStaffUpload) {
    limit = 10
  } else if (routeType === 'upload') {
    limit = 5
  }

  const count = entry.timestamps.length

  // Verifica limite
  if (count >= limit) {
    return { allowed: false, count, limit }
  }

  // Registrar novo timestamp
  entry.timestamps.push(now)

  return { allowed: true, count: count + 1, limit }
}

/**
 * Define headers de cache baseado na rota
 */
function setCacheHeaders(
  res: NextResponse,
  pathname: string
): NextResponse {
  if (pathname.startsWith('/admin/') || pathname.startsWith('/api/')) {
    // Dados sensíveis: nunca cache
    res.headers.set('Cache-Control', 'no-store, must-revalidate')
    res.headers.set('Pragma', 'no-cache')
    res.headers.set('Expires', '0')
  } else if (pathname.startsWith('/parceiro/')) {
    // User-specific, cache curto
    res.headers.set('Cache-Control', 'private, max-age=300')
  } else if (pathname.startsWith('/familia/')) {
    // User-specific, cache curto
    res.headers.set('Cache-Control', 'private, max-age=300')
  }
  // Default para páginas públicas: cache no navegador mas revalidar com servidor
  else {
    res.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300')
  }

  return res
}

/**
 * Detecta se a requisição é de staff
 * Heurística: validar token Supabase Auth e checar role
 */
async function isStaffUser(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  try {
    const token = authHeader.substring(7)
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    )

    // Supabase Auth usa 'user_role' ou claims customizadas
    // Por segurança, apenas confiamos se a rota fizer a verificação real
    // Isso aqui é só uma heurística pra rate limit
    return payload?.app_metadata?.role === 'admin' ||
           payload?.app_metadata?.role === 'operador' ||
           payload?.user_role === 'admin'
  } catch (e) {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Não aplicar rate limit em:
  // - Static files
  // - Public assets
  // - Health checks
  // - Algumas rotas de auth (login do Supabase é client-side)
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    pathname === '/health' ||
    pathname === '/favicon.ico' ||
    pathname === '/' // Home page
  ) {
    return NextResponse.next()
  }

  // Rate limit só em /api/*, /admin/*, /parceiro/*, /familia/*
  const protectedPaths = ['/api/', '/admin/', '/parceiro/', '/familia/']
  const shouldRateLimit = protectedPaths.some((p) => pathname.startsWith(p))

  if (!shouldRateLimit) {
    return NextResponse.next()
  }

  try {
    const identifier = await getClientIdentifier(request)
    const routeType = getRateLimitType(pathname)
    const isStaff = await isStaffUser(request)

    const { allowed, count, limit } = checkRateLimit(
      identifier,
      routeType,
      isStaff
    )

    if (!allowed) {
      // Rate limit excedido
      const res = NextResponse.json(
        {
          error: 'Too many requests',
          message: `Limite de ${limit} requisições por minuto excedido`,
          retryAfter: 60,
        },
        { status: 429 }
      )

      // Header padrão de rate limit
      res.headers.set('Retry-After', '60')
      res.headers.set('X-RateLimit-Limit', String(limit))
      res.headers.set('X-RateLimit-Remaining', '0')
      res.headers.set('X-RateLimit-Reset', String(Date.now() + 60000))

      // Log de 429 para detecção de padrão de ataque
      console.warn(
        `[RATE_LIMIT] 429 - ${identifier} | Rota: ${pathname} | Tipo: ${routeType} | Count: ${count}/${limit} | IP: ${getClientIp(request)}`
      )

      return res
    }

    // Requisição permitida: incluir headers informativos
    const res = NextResponse.next()

    res.headers.set('X-RateLimit-Limit', String(limit))
    res.headers.set('X-RateLimit-Remaining', String(Math.max(0, limit - count)))
    res.headers.set('X-RateLimit-Reset', String(Date.now() + 60000))

    // Aplicar política de cache
    setCacheHeaders(res, pathname)

    return res
  } catch (error) {
    // Se algo der errado no middleware, deixar passar (fail-open)
    // mas logar o erro para debug
    console.error('[MIDDLEWARE_ERROR]', error)
    const res = NextResponse.next()
    setCacheHeaders(res, pathname)
    return res
  }
}

/**
 * Configurar quais rotas passam pelo middleware
 * Matcher simplificado: qualquer coisa em /api/, /admin/, /parceiro/, /familia/
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|public/|health).*)',
  ],
}
