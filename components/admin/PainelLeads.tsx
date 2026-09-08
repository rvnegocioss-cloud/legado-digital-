'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, Mail, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/auth'
import { linkWhatsApp } from '@/lib/linkWhatsApp'

export interface Lead {
  id: string
  tipo: 'parceiro' | 'familia'
  nome: string
  empresa: string | null
  email: string
  telefone: string | null
  cidade: string | null
  homenageado: string | null
  mensagem: string | null
  status: string
  lido: boolean
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  novo: 'Novo',
  em_contato: 'Em contato',
  convertido: 'Convertido',
  descartado: 'Descartado',
}

const STATUS_STYLE: Record<string, string> = {
  novo: 'bg-amber-900/50 text-amber-400',
  em_contato: 'bg-blue-900/50 text-blue-400',
  convertido: 'bg-green-900/50 text-green-400',
  descartado: 'bg-[var(--tema-zinc-800)] text-[var(--tema-zinc-400)]',
}

export default function PainelLeads({ tipo }: { tipo: 'parceiro' | 'familia' }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aberto, setAberto] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('tipo', tipo)
      .order('created_at', { ascending: false })
      .limit(200)
    const lista = (data as Lead[]) || []
    setLeads(lista)
    // Abre sozinho quando tem lead esperando resposta -- fechado, um lead novo
    // passaria batido atrás do retrátil, que é o oposto do que ele serve.
    if (lista.some((l) => !l.lido)) setAberto(true)
    setCarregando(false)
  }, [tipo])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function trocarStatus(id: string, status: string) {
    // Marca lido junto: quem já mexeu no status obviamente viu o lead, e é
    // o mesmo campo que apaga o badge do sino no header.
    await supabase.from('leads').update({ status, lido: true }).eq('id', id)
    setLeads((atual) => atual.map((l) => (l.id === id ? { ...l, status, lido: true } : l)))
  }

  const naoLidos = leads.filter((l) => !l.lido).length
  const titulo = tipo === 'parceiro' ? 'Leads de parceiro' : 'Leads de família'
  const origem = tipo === 'parceiro' ? '/parceiro/login' : '/familia/login'

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center gap-3 mb-3 text-left"
      >
        {aberto ? (
          <ChevronDown size={16} strokeWidth={1.5} className="shrink-0 text-[var(--tema-zinc-400)]" />
        ) : (
          <ChevronRight size={16} strokeWidth={1.5} className="shrink-0 text-[var(--tema-zinc-400)]" />
        )}
        <h2 className="text-lg font-medium text-white">{titulo}</h2>
        {naoLidos > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400">
            {naoLidos} não {naoLidos === 1 ? 'lido' : 'lidos'}
          </span>
        )}
        <span className="text-xs text-[var(--tema-zinc-500)]">
          {leads.length} no total · recebidos em {origem}
        </span>
      </button>

      {!aberto ? null : (
      <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] overflow-hidden overflow-x-auto">
        {carregando ? (
          <p className="text-[var(--tema-zinc-400)] text-sm p-6">Carregando...</p>
        ) : leads.length === 0 ? (
          <p className="text-[var(--tema-zinc-400)] text-sm p-6">Nenhum lead recebido ainda.</p>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[var(--tema-zinc-400)] border-b border-[var(--tema-zinc-800)]">
                <th className="px-4 py-3 font-medium">Quem</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium">Recebido</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--tema-zinc-800)]">
              {leads.map((l) => (
                <tr key={l.id} className={l.lido ? '' : 'bg-amber-900/10'}>
                  <td className="px-4 py-3">
                    <div className="text-white">{l.nome}</div>
                    {l.empresa && <div className="text-xs text-[var(--tema-zinc-500)]">{l.empresa}</div>}
                    {l.homenageado && (
                      <div className="text-xs text-[var(--tema-zinc-500)]">Homenageado: {l.homenageado}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${l.email}`}
                      className="inline-flex items-center gap-1.5 text-[var(--tema-blue-400)] hover:underline"
                    >
                      <Mail size={12} strokeWidth={1.5} />
                      {l.email}
                    </a>
                    {l.telefone && (
                      <div>
                        <a
                          href={linkWhatsApp(l.telefone) || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-green-400 hover:underline mt-1"
                        >
                          <MessageCircle size={12} strokeWidth={1.5} />
                          {l.telefone}
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--tema-zinc-400)]">{l.cidade || '—'}</td>
                  <td className="px-4 py-3 text-[var(--tema-zinc-400)]">
                    {new Date(l.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => trocarStatus(l.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-lg border-none cursor-pointer ${STATUS_STYLE[l.status] || ''}`}
                    >
                      {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
                        <option key={valor} value={valor} className="bg-[var(--tema-zinc-900)] text-white">
                          {rotulo}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}
    </div>
  )
}
