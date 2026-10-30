'use client'

import { AlertTriangle, ClipboardList, Inbox, Mail, User, ArrowRight } from 'lucide-react'
import { rotuloTipoEmail } from '@/lib/emailLog'

export type AbaComunicacoes = 'geral' | 'pendencias' | 'emails' | 'contatos' | 'fornecedor'

export interface ItemFila {
  chave: string
  tipo: 'erro' | 'lead' | 'pendencia'
  titulo: string
  meta: string
  aba: AbaComunicacoes
}

export interface AtividadeEmail {
  id: string
  tipo: string
  status: string
  created_at: string
  memorial: string | null
}

const STATUS_STYLE: Record<string, string> = {
  enviado: 'bg-blue-900/50 text-blue-400',
  confirmado: 'bg-green-900/50 text-green-400',
  erro: 'bg-red-900/50 text-red-400',
}

const ICONE_FILA = { erro: AlertTriangle, lead: User, pendencia: ClipboardList } as const
const COR_FILA = { erro: '#f08a80', lead: '#C9A46A', pendencia: '#fbbf24' } as const
const ROTULO_BOTAO = { erro: 'Ver e-mail', lead: 'Responder', pendencia: 'Ver pendência' } as const

// Aba "Visão geral": 4 números, fila de hoje (até 5 itens, erro > lead novo >
// pendência antiga) e atividade recente. Todo número vem de consulta real.
export default function VisaoGeralComunicacoes({
  erros,
  pendencias,
  leadsNovos,
  fila,
  atividade,
  onIr,
}: {
  erros: number | null
  pendencias: number | null
  leadsNovos: number | null
  fila: ItemFila[]
  atividade: AtividadeEmail[]
  onIr: (aba: AbaComunicacoes) => void
}) {
  const v = (n: number | null) => (n === null ? '…' : n)
  const caixa = 'rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)]'

  const stats = [
    { aba: 'emails' as const, Icone: AlertTriangle, cor: '#f08a80', valor: v(erros), rotulo: 'e-mails com erro' },
    { aba: 'pendencias' as const, Icone: ClipboardList, cor: '#fbbf24', valor: v(pendencias), rotulo: 'memoriais com dado faltando' },
    { aba: 'contatos' as const, Icone: User, cor: '#C9A46A', valor: v(leadsNovos), rotulo: 'leads novos não lidos' },
  ]

  return (
    <div>
      <div className="grid gap-3.5 mb-3.5 grid-cols-2 lg:grid-cols-4">
        {stats.map(({ aba, Icone, cor, valor, rotulo }) => (
          <button
            key={rotulo}
            type="button"
            onClick={() => onIr(aba)}
            className={`${caixa} text-left p-3.5 hover:border-[#C9A46A] transition-colors`}
          >
            <span style={{ color: cor }}>
              <Icone size={16} strokeWidth={1.5} />
            </span>
            <div className="text-[30px] font-semibold leading-tight mt-1.5 text-white">{valor}</div>
            <div className="text-xs text-[var(--tema-zinc-400)]">{rotulo}</div>
          </button>
        ))}
        <div className={`${caixa} p-3.5 opacity-60`} title="Depende da integração com o Google">
          <span className="text-[var(--tema-blue-400)]">
            <Inbox size={16} strokeWidth={1.5} />
          </span>
          <div className="text-[30px] font-semibold leading-tight mt-1.5 text-white">em breve</div>
          <div className="text-xs text-[var(--tema-zinc-400)]">não lidos do contato@</div>
        </div>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className={`${caixa} p-5 min-w-0`}>
          <h2 className="text-[15px] font-semibold text-white">Fila de hoje</h2>
          <p className="text-xs text-[var(--tema-zinc-400)] mb-3">Do mais urgente para o menos: erro, lead novo, pendência antiga.</p>
          {fila.length === 0 ? (
            <p className="text-sm text-[var(--tema-zinc-400)] py-2">Nada urgente. Tudo em dia.</p>
          ) : (
            fila.map((f) => {
              const Icone = ICONE_FILA[f.tipo]
              return (
                <div
                  key={f.chave}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5 border-t border-[var(--tema-zinc-800)]"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
                    <span
                      className="w-[30px] h-[30px] rounded-full bg-[var(--tema-zinc-800)] flex items-center justify-center shrink-0"
                      style={{ color: COR_FILA[f.tipo] }}
                    >
                      <Icone size={16} strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{f.titulo}</p>
                      <p className="text-xs text-[var(--tema-zinc-400)]">{f.meta}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onIr(f.aba)}
                    className="inline-flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1.5 border"
                    style={{ color: '#C9A46A', borderColor: 'rgba(201,164,106,.5)', background: 'rgba(201,164,106,.14)' }}
                  >
                    <ArrowRight size={14} strokeWidth={1.5} />
                    {ROTULO_BOTAO[f.tipo]}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className={`${caixa} p-5 min-w-0`}>
          <h2 className="text-[15px] font-semibold text-white">Atividade recente</h2>
          <p className="text-xs text-[var(--tema-zinc-400)] mb-3">Últimos e-mails automáticos.</p>
          {atividade.length === 0 ? (
            <p className="text-sm text-[var(--tema-zinc-400)] py-2">Nenhum e-mail disparado ainda.</p>
          ) : (
            atividade.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 py-2.5 border-t border-[var(--tema-zinc-800)]"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="text-[var(--tema-zinc-400)] shrink-0">
                    <Mail size={14} strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-white text-[13px] font-medium">{rotuloTipoEmail(e.tipo)}</p>
                    <p className="text-xs text-[var(--tema-zinc-400)]">
                      {e.memorial || '—'} · {new Date(e.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs shrink-0 ${STATUS_STYLE[e.status] || 'bg-[var(--tema-zinc-800)] text-[var(--tema-zinc-400)]'}`}>
                  {e.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
