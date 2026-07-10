import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { dispararEmailFornecedor } from '@/lib/dispararEmailFornecedor'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B1D2A',
        color: '#F5F2EB',
        fontFamily: 'Georgia, "Times New Roman", serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 420, textAlign: 'center' }}>{children}</div>
    </div>
  )
}

export default async function ConfirmarPlacaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  const { data: emailRow } = await supabaseAdmin
    .from('emails_enviados')
    .select('id, homenagem_id, status')
    .eq('token', token)
    .eq('tipo', 'confirmacao_placa')
    .maybeSingle()

  if (!emailRow) {
    return (
      <Wrap>
        <p style={{ color: '#C9A46A' }}>Link inválido ou expirado.</p>
      </Wrap>
    )
  }

  const { data: homenagem } = await supabaseAdmin
    .from('homenagens')
    .select('nome_completo, mensagem_placa')
    .eq('id', emailRow.homenagem_id)
    .single()

  if (emailRow.status === 'confirmado') {
    return (
      <Wrap>
        <p style={{ color: '#C9A46A', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
          Já confirmado
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 400, margin: '8px 0' }}>
          Obrigado — o texto da placa de {homenagem?.nome_completo} já foi confirmado.
        </h1>
      </Wrap>
    )
  }

  await supabaseAdmin
    .from('emails_enviados')
    .update({ status: 'confirmado', confirmado_em: new Date().toISOString() })
    .eq('id', emailRow.id)

  await supabaseAdmin
    .from('homenagens_seguranca')
    .upsert(
      {
        homenagem_id: emailRow.homenagem_id,
        mensagem_placa_confirmada: true,
        mensagem_placa_confirmada_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'homenagem_id', ignoreDuplicates: false }
    )

  const h = await headers()
  const host = h.get('host') || ''
  const proto = h.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  await dispararEmailFornecedor(supabaseAdmin, emailRow.homenagem_id, `${proto}://${host}`)

  return (
    <Wrap>
      <p style={{ color: '#C9A46A', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
        Confirmado
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 400, margin: '8px 0' }}>
        Texto da placa de {homenagem?.nome_completo} confirmado.
      </h1>
      <p style={{ color: '#b0c0cc', marginTop: 8 }}>
        &ldquo;{homenagem?.mensagem_placa}&rdquo;
      </p>
      <p style={{ color: '#7a8a96', fontSize: 14, marginTop: 20 }}>
        Já pode encaminhar pra produção. Obrigado.
      </p>
    </Wrap>
  )
}
