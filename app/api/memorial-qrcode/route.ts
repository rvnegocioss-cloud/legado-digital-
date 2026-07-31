import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { gerarQrCodePng } from '@/lib/qrcode'
import { dispararEmailFornecedor } from '@/lib/dispararEmailFornecedor'
import { criarTokenQr } from '@/lib/acessoMemorialSessao'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { memorialId } = await req.json()
  if (!memorialId) {
    return NextResponse.json({ error: 'memorialId obrigatório' }, { status: 400 })
  }

  const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('id, slug, parceiro_id')
    .eq('id', memorialId)
    .single()

  if (!homenagem || !homenagem.slug) {
    return NextResponse.json({ error: 'Memorial não encontrado ou sem slug' }, { status: 404 })
  }

  const { data: usuario } = await supabaseAdmin
    .from('usuarios')
    .select('id, usuarios_perfis(perfis(nome)), parceiros_usuarios(parceiro_id)')
    .eq('email', userData.user.email)
    .single()

  const papeis = ((usuario as any)?.usuarios_perfis || []).map((up: any) => up.perfis?.nome)
  const ehStaff = papeis.includes('Admin Legado Digital') || papeis.includes('Operador Legado Digital')
  const parceiroIds = ((usuario as any)?.parceiros_usuarios || []).map((pu: any) => pu.parceiro_id)
  const ehDonoDoParceiro = homenagem.parceiro_id && parceiroIds.includes(homenagem.parceiro_id)

  if (!ehStaff && !ehDonoDoParceiro) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const url = `${req.nextUrl.origin}/homenagem/${homenagem.slug}?qr=${criarTokenQr(memorialId)}`
  const png = await gerarQrCodePng(url)
  const caminho = `qrcodes/${homenagem.slug}.png`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('memoriais')
    .upload(caminho, png, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from('memoriais').getPublicUrl(caminho)
  const qrCodeUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { data: atualizado, error: updateError } = await supabaseAdmin
    .from('homenagens')
    .update({ qr_code_url: qrCodeUrl })
    .eq('id', memorialId)
    .select('updated_at')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const resultado = await dispararEmailFornecedor(supabaseAdmin, memorialId, req.nextUrl.origin)

  return NextResponse.json({
    ok: true,
    qrCodeUrl,
    url,
    emailEnviado: resultado.enviado,
    motivo: resultado.motivo,
    updatedAt: atualizado?.updated_at,
  })
}
