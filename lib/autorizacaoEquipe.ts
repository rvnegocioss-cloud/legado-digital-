/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server'

const PAPEIS_STAFF = ['Admin Legado Digital', 'Operador Legado Digital']

export interface Chamador {
  usuarioId: string
  email: string
  ehStaff: boolean
  parceiroIds: string[]
}

/**
 * Identifica quem está chamando uma rota de API pela sessão do Supabase Auth.
 *
 * O mesmo bloco existia solto dentro de lib/autorizacaoMemorial.ts, que só
 * serve pra memorial (precisa de um `homenagem` pra decidir). Rota que mexe em
 * coisa fora de memorial — logo do parceiro, foto de túmulo — não tinha onde se
 * apoiar e acabaria copiando o bloco de novo. Fica aqui pra próxima nascer
 * usando isto em vez de repetir.
 *
 * Devolve null quando não há sessão válida. Nunca decide permissão sozinho:
 * quem decide é a rota, olhando `ehStaff`/`parceiroIds` contra o recurso.
 */
export async function identificarChamador(
  req: NextRequest,
  supabaseAdmin: any
): Promise<Chamador | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null

  const { createClient } = await import('@supabase/supabase-js')
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: userData, error: userError } = await supabaseAuth.auth.getUser()
  if (userError || !userData.user?.email) return null

  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('id, ativo, usuarios_perfis(perfis(nome)), parceiros_usuarios(parceiro_id)')
    .eq('email', userData.user.email)
    .maybeSingle()

  // Conta desativada não é chamador válido — sem isso, desativar um usuário na
  // Central não tiraria o acesso dele às rotas de API.
  if (!usuario || usuario.ativo === false) return null

  const papeis = (usuario.usuarios_perfis || []).map((up: any) => up.perfis?.nome)

  return {
    usuarioId: usuario.id,
    email: userData.user.email,
    ehStaff: papeis.some((p: string) => PAPEIS_STAFF.includes(p)),
    parceiroIds: (usuario.parceiros_usuarios || []).map((pu: any) => pu.parceiro_id),
  }
}
