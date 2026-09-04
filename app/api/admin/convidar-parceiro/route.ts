import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmailConviteParceiro } from '@/lib/enviarEmailConviteParceiro'
import { registrarEmail } from '@/lib/emailLog'
import { gerarSenhaTemporaria } from '@/lib/gerarSenhaTemporaria'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const anonClient = createClient(supabaseUrl, anonKey)
  const { data: { user: caller }, error: callerError } = await anonClient.auth.getUser(token)
  if (callerError || !caller) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: papeisStaff } = await admin
    .from('perfis')
    .select('id')
    .in('nome', ['Admin Legado Digital', 'Operador Legado Digital'])

  const { data: vinculoStaff } = await admin
    .from('usuarios_perfis')
    .select('perfil_id')
    .eq('usuario_id', caller.id)
    .in('perfil_id', (papeisStaff || []).map((p) => p.id))
    .maybeSingle()

  if (!vinculoStaff) {
    return NextResponse.json({ error: 'Sem permissão pra convidar parceiros' }, { status: 403 })
  }

  const { parceiroId, email, nome, contatoId } = await req.json()
  if (!parceiroId || !email) {
    return NextResponse.json({ error: 'parceiroId e email são obrigatórios' }, { status: 400 })
  }

  const { data: perfilParceiro } = await admin
    .from('perfis')
    .select('id')
    .eq('nome', 'Parceiro B2B')
    .single()

  if (!perfilParceiro) {
    return NextResponse.json({ error: 'Papel "Parceiro B2B" não encontrado' }, { status: 500 })
  }

  const { data: parceiro } = await admin
    .from('parceiros_b2b')
    .select('nome_fantasia, razao_social')
    .eq('id', parceiroId)
    .single()

  const senhaTemporaria = gerarSenhaTemporaria(parceiro?.nome_fantasia || parceiro?.razao_social || nome || 'xy')

  const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 200 })
  const existing = existingUsers?.users.find((u) => u.email === email)

  if (existing) {
    const { data: perfisExistentes } = await admin
      .from('usuarios_perfis')
      .select('perfis(nome)')
      .eq('usuario_id', existing.id)
    const jaEhStaff = (perfisExistentes || []).some(
      (p: { perfis: { nome: string } | { nome: string }[] | null }) => {
        const perfil = Array.isArray(p.perfis) ? p.perfis[0] : p.perfis
        return perfil?.nome === 'Admin Legado Digital' || perfil?.nome === 'Operador Legado Digital'
      }
    )
    if (jaEhStaff) {
      return NextResponse.json(
        { error: 'Esse e-mail já pertence a uma conta da equipe Legado Digital — não pode virar parceiro automaticamente.' },
        { status: 409 }
      )
    }
  }

  let userId: string
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: senhaTemporaria,
      email_confirm: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = data.user.id
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: { nome: nome || email },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    userId = data.user.id
  }

  await admin
    .from('usuarios_perfis')
    .upsert({ usuario_id: userId, perfil_id: perfilParceiro.id }, { onConflict: 'usuario_id,perfil_id' })

  await admin
    .from('parceiros_usuarios')
    .upsert({ usuario_id: userId, parceiro_id: parceiroId }, { onConflict: 'usuario_id,parceiro_id' })

  await admin.from('usuarios').update({ senha_temporaria: true }).eq('id', userId)

  if (contatoId) {
    await admin.from('parceiros_contatos').update({ usuario_id: userId }).eq('id', contatoId)
  }

  const resultadoEmail = await enviarEmailConviteParceiro({
    destinatario: email,
    nome: nome || '',
    senhaTemporaria,
  })

  await registrarEmail(admin, {
    tipo: 'convite_parceiro',
    destinatario: email,
    assunto: 'Acesso ao Portal do Parceiro — Legado Digital',
    status: resultadoEmail.enviado ? 'enviado' : 'erro',
    erroMsg: resultadoEmail.enviado ? null : resultadoEmail.erro,
  })

  return NextResponse.json({
    success: true,
    message: resultadoEmail.enviado
      ? 'Usuário criado. Senha enviada por e-mail.'
      : 'Usuário criado, mas o e-mail não pôde ser enviado agora — repasse a senha temporária manualmente.',
    email,
    emailEnviado: resultadoEmail.enviado,
    senhaTemporaria,
  })
}
