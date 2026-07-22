/**
 * Utilitários opcionais de rate limit para uso dentro das rotas
 *
 * O middleware.ts já faz rate limit global por usuário/IP
 * Esses helpers são pra validações ADICIONAIS específicas de negócio:
 * - Rate limit por memorial (ex: 1000 uploads por dia)
 * - Rate limit por parceiro (ex: 10k requisições/dia)
 * - Detecção de padrão suspeito (ex: 50+ uploads em 10s do mesmo IP)
 *
 * NÃO duplicar o rate limit global do middleware aqui
 */

/**
 * Cache de rate limits por recurso (memorial, parceiro, etc)
 * Estrutura: { resourceId: { timestamps: [...], quota: { used, max } } }
 */
const resourceRateLimitCache = new Map<string, {
  timestamps: number[]
  quota?: { used: number; max: number }
  lastCleanup: number
}>()

/**
 * Limpa entries antigas para um recurso específico
 */
function cleanupResourceEntries(resourceId: string, windowMs: number = 86400000): boolean {
  const now = Date.now()
  const cutoff = now - windowMs
  const entry = resourceRateLimitCache.get(resourceId)

  if (!entry) return false

  const oldLength = entry.timestamps.length
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
  entry.lastCleanup = now

  if (entry.timestamps.length === 0) {
    resourceRateLimitCache.delete(resourceId)
  }

  return oldLength !== entry.timestamps.length
}

/**
 * Verifica rate limit por recurso (memorial, parceiro, etc)
 *
 * Exemplo:
 * const check = checkResourceRateLimit('memorial:abc123', {
 *   max: 1000,
 *   windowMs: 86400000, // 24h
 *   description: 'uploads por memorial'
 * })
 * if (!check.allowed) return NextResponse.json({ error: check.message }, { status: 429 })
 */
export function checkResourceRateLimit(
  resourceId: string,
  options: {
    max: number // limite máximo nesta janela
    windowMs?: number // janela de tempo em ms (default: 24h)
    description?: string // descrição para logs
  }
): {
  allowed: boolean
  current: number
  max: number
  message: string
} {
  const { max, windowMs = 86400000, description = 'requests' } = options
  const now = Date.now()

  // Periodic cleanup
  if (Math.random() < 0.05) {
    cleanupResourceEntries(resourceId, windowMs)
  }

  // Get or create entry
  let entry = resourceRateLimitCache.get(resourceId)
  if (!entry) {
    entry = { timestamps: [], lastCleanup: now }
    resourceRateLimitCache.set(resourceId, entry)
  }

  // Clean old timestamps
  const cutoff = now - windowMs
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
  entry.lastCleanup = now

  const current = entry.timestamps.length

  if (current >= max) {
    return {
      allowed: false,
      current,
      max,
      message: `Limite de ${max} ${description} por dia excedido. Tente novamente amanhã.`,
    }
  }

  // Register new request
  entry.timestamps.push(now)

  return {
    allowed: true,
    current: current + 1,
    max,
    message: `OK (${current + 1}/${max})`,
  }
}

/**
 * Detecta padrão de ataque: múltiplas requisições em janela curta
 *
 * Exemplo:
 * const anomaly = detectAnomalousPattern('uploads:192.168.1.1', {
 *   threshold: 50, // 50+ requisições
 *   windowMs: 10000, // em 10 segundos
 * })
 * if (anomaly.detected) {
 *   console.warn(`Padrão suspeito: ${anomaly.message}`)
 * }
 */
export function detectAnomalousPattern(
  patternId: string,
  options: {
    threshold: number // número de eventos pra gatilhar alerta
    windowMs?: number // janela de detecção (default: 10s)
  }
): {
  detected: boolean
  count: number
  threshold: number
  message: string
} {
  const { threshold, windowMs = 10000 } = options
  const now = Date.now()
  const cutoff = now - windowMs

  let entry = resourceRateLimitCache.get(patternId)
  if (!entry) {
    entry = { timestamps: [], lastCleanup: now }
    resourceRateLimitCache.set(patternId, entry)
  }

  // Filter timestamps in window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
  entry.lastCleanup = now

  // Register this event
  entry.timestamps.push(now)

  const detected = entry.timestamps.length >= threshold

  return {
    detected,
    count: entry.timestamps.length,
    threshold,
    message: `${entry.timestamps.length}/${threshold} events in ${windowMs}ms`,
  }
}

/**
 * Reset rate limit para um recurso (staff action)
 * Uso: após investigar ataque, resetar limite pra desbloquear
 */
export function resetResourceRateLimit(resourceId: string): void {
  resourceRateLimitCache.delete(resourceId)
  console.log(`[RATE_LIMIT] Reset: ${resourceId}`)
}

/**
 * Obter status do rate limit de um recurso (debug)
 */
export function getResourceRateLimitStatus(resourceId: string): {
  active: boolean
  count: number
  lastCleanup: number
} | null {
  const entry = resourceRateLimitCache.get(resourceId)
  if (!entry) return null

  return {
    active: entry.timestamps.length > 0,
    count: entry.timestamps.length,
    lastCleanup: entry.lastCleanup,
  }
}

/**
 * Debug: listar todos os rate limits ativos (memória atual)
 * ATENÇÃO: não usar em produção, apenas para monitoramento
 */
export function getAllActiveRateLimits(): Array<{
  resourceId: string
  count: number
  lastActivity: number
}> {
  const result: Array<{
    resourceId: string
    count: number
    lastActivity: number
  }> = []

  for (const [resourceId, entry] of resourceRateLimitCache.entries()) {
    if (entry.timestamps.length > 0) {
      result.push({
        resourceId,
        count: entry.timestamps.length,
        lastActivity: Math.max(...entry.timestamps),
      })
    }
  }

  return result.sort((a, b) => b.lastActivity - a.lastActivity)
}
