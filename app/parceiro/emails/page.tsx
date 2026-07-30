'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { supabase, getParceiroUser, getAdminUser } from '@/lib/auth'
import { linkWhatsApp } from '@/lib/linkWhatsApp'

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

interface FamiliaContato {
  id: string
  nome_completo: string
  familia_email: string | null
  familia_telefone: string | null
}

const TIPO_LABEL: Record<string, string> = {
  senha_familia: 'Senha da família',
  confirmacao_placa: 'Confirmação de placa',
  envio_fornecedor: 'Envio ao fornecedor',
  convite_parceiro: 'Convite de acesso (parceiro)',
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
  const [familias, setFamilias] = useState<FamiliaContato[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [parceiroIdParam])

  async function load() {
    setLoading(true)

    // Mesma checagem do resto do Portal do Parceiro: ?parceiro_id= só vale
    // se quem está logado é staff de verdade. Sem isso, staff testando "como"
    // parceiro (modo Central) via is_legado_staff() enxergava e-mail de
    // TODAS as empresas aqui, e até tipos que não são de nenhum memorial
    // (ex: convite de acesso ao parceiro) — nunca era filtrado por empresa.
    let meuParceiroId: string | null = null
    if (parceiroIdParam) {
      const adminUser = await getAdminUser()
      if (adminUser) meuParceiroId = parceiroIdParam
    }
    if (!meuParceiroId) {
      const parceiroUser = (await getParceiroUser()) as any
      meuParceiroId = parceiroUser?.parceiros_usuarios?.[0]?.parceiros_b2b?.id || null
    }

    if (!meuParceiroId) {
      setEmails([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('emails_enviados')
      .select('*, homenagens!inner(nome_completo, parceiro_id)')
      .eq('homenagens.parceiro_id', meuParceiroId)
      .order('created_at', { ascending: false })
      .limit(100)
    setEmails((data as any) || [])

    const { data: familiasData } = await supabase
      .from('homenagens')
      .select('id, nome_completo, familia_email, familia_telefone')
      .eq('parceiro_id', meuParceiroId)
      .order('nome_completo')
    setFamilias(familiasData || [])

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

      <h2 className="text-lg font-medium text-white mb-1">Contato das famílias</h2>
      <p className="text-zinc-400 text-sm mb-4">
        Clica no WhatsApp pra abrir a conversa direto — não traz mensagem recebida pra cá, só facilita chamar.
      </p>
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 mb-10 overflow-x-auto">
        {familias.length === 0 ? (
          <p className="text-zinc-500 text-sm">Nenhum memorial cadastrado ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs">
                <th className="text-left py-2 px-2">Memorial</th>
                <th className="text-left py-2 px-2">E-mail</th>
                <th className="text-left py-2 px-2">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {familias.map((f) => (
                <tr key={f.id} className="border-t border-zinc-800/50">
                  <td className="py-2 px-2 text-white">{f.nome_completo}</td>
                  <td className="py-2 px-2 text-zinc-300">
                    {f.familia_email || <span className="text-zinc-600">sem e-mail cadastrado</span>}
                  </td>
                  <td className="py-2 px-2">
                    {linkWhatsApp(f.familia_telefone) ? (
                      <a
                        href={linkWhatsApp(f.familia_telefone)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-green-400 hover:text-green-300"
                      >
                        <MessageCircle size={12} strokeWidth={1.5} />
                        {f.familia_telefone}
                      </a>
                    ) : (
                      <span className="text-zinc-600">sem número</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 className="text-lg font-medium text-white mb-1">Histórico de e-mails automáticos</h2>
      <p className="text-zinc-400 text-sm mb-4">Todo e-mail que o sistema disparou pros seus memoriais.</p>

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
