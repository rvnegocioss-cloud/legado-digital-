import { NextRequest } from 'next/server'
import { verificarTokenFamilia } from './familiaSessao'

// Tripé de acesso reaproveitado por toda rota que família/parceiro/staff
// podem mexer no mesmo memorial (mesmo padrão de /api/memorial-storage-usage) —
// família pelo cookie próprio, staff/parceiro pela sessão Supabase Auth.
export async function autorizarMemorial(
  req: NextRequest,
  supabaseAdmin: any,
  homenagem: { id: string; parceiro_id: string | null }
): Promise<{ autorizado: boolean; comoFamilia: boolean }> {
  const { data: seguranca } = await supabaseAdmin
    .from('homenagens_seguranca')
    .select('senha_familia_hash')
    .eq('homenagem_id', homenagem.id)
    .maybeSingle()

  const tokenFamilia = req.cookies.get(`familia_${homenagem.id}`)?.value
  if (verificarTokenFamilia(tokenFamilia, homenagem.id, seguranca?.senha_familia_hash)) {
    return { autorizado: true, comoFamilia: true }
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return { autorizado: false, comoFamilia: false }

  const { createClient } = await import('@supabase/supabase-js')
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser()
  if (userError || !userData.user) return { autorizado: false, comoFamilia: false }

  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('id, usuarios_perfis(perfis(nome)), parceiros_usuarios(parceiro_id)')
    .eq('email', userData.user.email)
    .single()

  const papeis = ((usuario as any)?.usuarios_perfis || []).map((up: any) => up.perfis?.nome)
  const ehStaff = papeis.includes('Admin Legado Digital') || papeis.includes('Operador Legado Digital')
  const parceiroIds = ((usuario as any)?.parceiros_usuarios || []).map((pu: any) => pu.parceiro_id)
  const ehDonoDoParceiro = homenagem.parceiro_id && parceiroIds.includes(homenagem.parceiro_id)

  return { autorizado: !!(ehStaff || ehDonoDoParceiro), comoFamilia: false }
}
