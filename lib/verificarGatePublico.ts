import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolverAcesso, type ModoGate } from '@/lib/modosPrivacidade'
import { verificarTokenAcessoMemorial } from '@/lib/acessoMemorialSessao'

// Achado real (auditoria 2026-09-04): condolência, mural e vela inseriam
// direto sem checar o portão de privacidade — um memorial com senha (ou
// oculto) ainda aceitava escrita pública se alguém soubesse o memorialId
// (visível no payload da página mesmo antes de passar pelo gate). Rate
// limit sozinho não resolve isso, é outra checagem.
export async function escritaPublicaLiberada(
  req: NextRequest,
  supabaseAdmin: SupabaseClient,
  memorialId: string
): Promise<boolean> {
  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('slug')
    .eq('id', memorialId)
    .maybeSingle()
  if (!homenagem?.slug) return false

  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('busca_habilitada, link_habilitado, qrcode_habilitado, modo_gate, gate_versao')
    .eq('homenagem_id', memorialId)
    .maybeSingle()

  const modoGate = (seguranca?.modo_gate ?? 'aberto') as ModoGate
  const gateVersao = seguranca?.gate_versao ?? 1
  const token = req.cookies.get(`mem_acesso_${homenagem.slug}`)?.value
  const cookieValido = verificarTokenAcessoMemorial(token, memorialId, modoGate, gateVersao)

  const resultado = resolverAcesso({
    modoGate,
    buscaHabilitada: seguranca?.busca_habilitada ?? true,
    linkHabilitado: seguranca?.link_habilitado ?? true,
    qrcodeHabilitado: seguranca?.qrcode_habilitado ?? true,
    canal: 'link',
    cookieValido,
  })

  return resultado.tipo === 'liberado'
}
