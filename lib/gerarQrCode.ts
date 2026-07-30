import { supabase } from '@/lib/auth'

export interface ResultadoGerarQrCode {
  qrCodeUrl: string | null
  updatedAt: string | null
}

export async function gerarQrCodeCliente(memorialId: string): Promise<ResultadoGerarQrCode> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { qrCodeUrl: null, updatedAt: null }

  const res = await fetch('/api/memorial-qrcode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ memorialId }),
  })
  if (!res.ok) return { qrCodeUrl: null, updatedAt: null }
  const json = await res.json()
  return { qrCodeUrl: json.qrCodeUrl || null, updatedAt: json.updatedAt || null }
}
