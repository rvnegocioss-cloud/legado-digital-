import { supabase } from '@/lib/auth'

export async function gerarQrCodeCliente(memorialId: string): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const res = await fetch('/api/memorial-qrcode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ memorialId }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json.qrCodeUrl || null
}
