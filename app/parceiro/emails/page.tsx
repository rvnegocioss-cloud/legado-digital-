'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/auth'

interface EmailEnviado {
  id: string
  tipo: string
  destinatario: string
  status: string
  erro_msg: string | null
  confirmado_em: string | null
  created_at: string
  homenagens: { nome_completo: string } | null
}

const TIPO_LABEL: Record<string, string> = {
  senha_familia: 'Senha da família',
  confirmacao_placa: 'Confirmação de placa',
  envio_fornecedor: 'Envio ao fornecedor',
}

const STATUS_STYLE: Record<string, string> = {
  enviado: 'bg-blue-900/50 text-blue-400',
  confirmado: 'bg-green-900/50 text-green-400',
  erro: 'bg-red-900/50 text-red-400',
}

export default function ParceiroEmails() {
  return (
    <Suspense fallback={<p className="text-zinc-400">Carregando...</p>}>
      <ParceiroEmailsInner />
    </Suspense>
  )
}

function ParceiroEmailsInner() {
  const searchParams = useSearchParams()
  const parceiroIdParam = searchParams.get('parceiro_id')
  const [emails, setEmails] = useState<EmailEnviado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    // RLS já restringe aos memoriais do próprio parceiro
    const { data } = await supabase
      .from('emails_enviados')
      .select('*, homenagens(nome_completo)')
      .order('created_at', { ascending: false })
      .limit(100)
    setEmails((data as any) || [])
    setLoading(false)
  }

  if (loading) return <p className="text-zinc-400">Carregando...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Central de E-mails</h1>
      <p className="text-zinc-400 text-sm mb-8">
        E-mails disparados pros seus memoriais — confirme aqui se a família já aprovou a mensagem
        da placa, sem precisar abrir e-mail nenhum.
      </p>

      {emails.length === 0 ? (
        <p className="text-zinc-400">Nenhum e-mail disparado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Memorial</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-left py-3 px-4">Destinatário</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Quando</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((e) => (
                <tr key={e.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{e.homenagens?.nome_completo || '—'}</td>
                  <td className="py-3 px-4 text-zinc-300">{TIPO_LABEL[e.tipo] || e.tipo}</td>
                  <td className="py-3 px-4 text-zinc-300">{e.destinatario}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${STATUS_STYLE[e.status] || 'bg-zinc-800 text-zinc-400'}`}>
                      {e.status}
                    </span>
                    {e.erro_msg && <p className="text-xs text-zinc-500 mt-1">{e.erro_msg}</p>}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(e.confirmado_em || e.created_at).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
