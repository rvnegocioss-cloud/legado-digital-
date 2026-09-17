'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// E-mail do fornecedor de placas. Saiu do Dashboard (2026-09-17) e mora na
// Central de Comunicações, junto do resto que é e-mail automático.
export default function EmailFornecedorPlacas() {
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase
      .from('configuracoes_sistema')
      .select('valor')
      .eq('chave', 'email_fornecedor_placas')
      .maybeSingle()
      .then(({ data }) => setEmail(data?.valor || ''))
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setMsg('')
    const { error } = await supabase
      .from('configuracoes_sistema')
      .update({ valor: email.trim() || null, updated_at: new Date().toISOString() })
      .eq('chave', 'email_fornecedor_placas')
    setMsg(error ? error.message : 'Salvo — próximos QR Codes gerados já vão pra esse e-mail.')
    setSalvando(false)
  }

  return (
    <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-5 mb-8">
      <h2 className="text-sm font-medium text-white mb-1">E-mail do fornecedor de placas</h2>
      <p className="text-[var(--tema-zinc-400)] text-xs mb-3">
        Toda vez que um QR Code é gerado, ele é encaminhado automaticamente pra esse e-mail — nome do homenageado, ID do memorial, link da página e o PNG do QR anexado.
      </p>
      <form onSubmit={salvar} className="flex gap-3 max-w-md">
        <Input
          type="email"
          placeholder="fornecedor@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-[var(--tema-zinc-800)] border-[var(--tema-zinc-700)] text-white flex-1"
        />
        <Button type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
      {msg && <p className="text-xs text-[var(--tema-zinc-400)] mt-2">{msg}</p>}
    </div>
  )
}
