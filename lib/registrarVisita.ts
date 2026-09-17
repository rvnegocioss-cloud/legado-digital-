import { createHmac } from 'crypto'
import { headers } from 'next/headers'
import { supabaseServidor } from '@/lib/supabaseServidor'

// Robôs, prévias de link (WhatsApp, Facebook, Telegram...) e navegadores
// automatizados não são visita de gente.
const NAO_E_PESSOA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|skype|embedly|headless|playwright|puppeteer|selenium|lighthouse|pingdom|uptime|curl|wget|python|node-fetch|axios|go-http/i

/**
 * Conta 1 visita por visitante, por memorial, por dia (2026-09-17). O visitante
 * vira um código HMAC de IP + navegador + dia — nada identificável é guardado,
 * e o código muda a cada dia. Recarregar a página, prefetch do Next e robô não
 * somam nada.
 */
export async function registrarVisita(slug: string) {
  try {
    const h = await headers()
    const ua = h.get('user-agent') || ''
    if (!ua || NAO_E_PESSOA.test(ua)) return
    const proposito = `${h.get('purpose') || ''} ${h.get('sec-purpose') || ''} ${h.get('next-router-prefetch') || ''}`
    if (/prefetch|prerender|1/i.test(proposito.trim())) return

    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || ''
    const dia = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const visitante = createHmac('sha256', process.env.SESSION_HMAC_SECRET!).update(`${ip}|${ua}|${dia}`).digest('hex').slice(0, 32)

    await supabaseServidor.rpc('registrar_visita', { p_slug: slug, p_visitante: visitante })
  } catch {
    // contagem nunca pode derrubar a página do memorial
  }
}
