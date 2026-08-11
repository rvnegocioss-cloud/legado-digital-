'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { BarraDesenho } from './BarraDesenho'
import { comprimentoPolilinha } from '@/lib/geo'
import type { DiagnosticoRede, ResultadoRota } from '@/lib/rotaCemiterio'

interface Rua {
  id: string
  numero: number
  nome: string | null
  eixo: { type: 'LineString'; coordinates: [number, number][] } | null
  geometria_revisada: boolean
  comprimento_m: number | null
}

interface DesenhoApi {
  ativo: boolean
  pontos: [number, number][]
  iniciar: (modo: 'linha', onConcluir: (pontos: [number, number][]) => void) => void
  concluir: () => void
  desfazerUltimoPonto: () => void
  cancelar: () => void
}

export default function PainelRuas({
  ruas,
  editavel,
  salvando,
  desenhandoRua,
  desenho,
  ruaEmEdicao,
  diagnostico,
  temEntrada,
  modoTestarRota,
  rotaTeste,
  onNovaRua,
  onRenomear,
  onTravar,
  onDestravar,
  onEditar,
  onSairEdicao,
  onApagar,
  onToggleTestarRota,
}: {
  ruas: Rua[]
  editavel: boolean
  salvando: boolean
  desenhandoRua: boolean
  desenho: DesenhoApi
  ruaEmEdicao: Rua | null
  diagnostico: DiagnosticoRede | null
  temEntrada: boolean
  modoTestarRota: boolean
  rotaTeste: ResultadoRota | null
  onNovaRua: () => void
  onRenomear: (ruaId: string, nome: string) => void
  onTravar: (rua: Rua) => void
  onDestravar: (rua: Rua) => void
  onEditar: (rua: Rua) => void
  onSairEdicao: () => void
  onApagar: (rua: Rua) => void
  onToggleTestarRota: () => void
}) {
  const [renomeandoId, setRenomeandoId] = useState<string | null>(null)
  const [nomeInput, setNomeInput] = useState('')

  return (
    <div className="rounded-xl bg-[var(--tema-zinc-900)] border border-[var(--tema-zinc-800)] p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-white">Ruas (caminhos internos) · {ruas.length}</h2>
        {editavel && (
          <button type="button" disabled={salvando || desenho.ativo} onClick={onNovaRua} className="text-xs flex items-center gap-1 hover:opacity-80 disabled:opacity-40" style={{ color: '#a855f7' }}>
            <Plus size={12} strokeWidth={2} /> Nova rua
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--tema-zinc-500)] mb-3">
        Desenha por onde a pessoa anda de verdade (asfalto/calçada) -- a rota da página pública segue essas ruas em vez de cortar reto por cima das
        quadras.
      </p>

      {desenhandoRua && (
        <BarraDesenho
          texto={`Clica ao longo do caminho (${desenho.pontos.length} ponto${desenho.pontos.length === 1 ? '' : 's'})${
            desenho.pontos.length >= 2 ? ` — ${comprimentoPolilinha(desenho.pontos).toFixed(1)} m` : ''
          }`}
          podeConcluir={desenho.pontos.length >= 2}
          onConcluir={desenho.concluir}
          onDesfazer={desenho.desfazerUltimoPonto}
          onCancelar={desenho.cancelar}
        />
      )}

      {!temEntrada ? (
        <p className="text-xs text-[var(--tema-zinc-500)] mb-3">Marque a entrada do cemitério (card mais abaixo) pra eu conferir se as ruas se conectam com a portaria.</p>
      ) : ruas.length > 0 && diagnostico ? (
        diagnostico.idsDesconectadas.length > 0 ? (
          <p className="text-xs mb-3" style={{ color: '#f59e0b' }}>
            ⚠ {diagnostico.idsDesconectadas.length} rua(s) sem ligação com a portaria -- a rota vai ignorar ela(s). Arrasta um vértice pra encostar
            em outra rua.
          </p>
        ) : (
          <p className="text-xs text-emerald-400 mb-3">✓ Rede conectada -- {diagnostico.comprimentoTotalM.toFixed(0)} m de rua mapeada.</p>
        )
      ) : null}

      {ruas.length > 0 && (
        <button
          type="button"
          disabled={!temEntrada}
          onClick={onToggleTestarRota}
          className={`w-full text-xs px-3 py-1.5 rounded mb-2 disabled:opacity-40 ${
            modoTestarRota ? 'bg-purple-700 text-branco-fixo' : 'border border-[var(--tema-zinc-700)] text-[var(--tema-zinc-300)] hover:bg-[var(--tema-zinc-800)]'
          }`}
        >
          {modoTestarRota ? 'Clica num túmulo pra testar a rota (clica de novo pra sair)' : 'Testar rota até um túmulo'}
        </button>
      )}
      {modoTestarRota && rotaTeste && (
        <p className="text-xs mb-3" style={{ color: rotaTeste.usouRede ? '#a855f7' : '#f87171' }}>
          {rotaTeste.usouRede
            ? `${rotaTeste.distanciaM.toFixed(0)} m pela rua (linha reta: ${rotaTeste.distanciaRetaM.toFixed(0)} m)`
            : `Linha reta (${rotaTeste.distanciaRetaM.toFixed(0)} m) -- ${
                rotaTeste.motivo === 'entrada_longe'
                  ? 'a portaria está longe demais de qualquer rua mapeada.'
                  : rotaTeste.motivo === 'tumulo_longe'
                    ? 'esse túmulo está longe demais de qualquer rua mapeada.'
                    : rotaTeste.motivo === 'sem_caminho'
                      ? 'não achei caminho conectado até esse túmulo.'
                      : 'nenhuma rua mapeada ainda.'
              }`}
        </p>
      )}

      {ruas.length === 0 ? (
        <p className="text-[var(--tema-zinc-500)] text-xs">Nenhuma rua desenhada ainda.</p>
      ) : (
        <ul className="space-y-1">
          {ruas
            .slice()
            .sort((a, b) => a.numero - b.numero)
            .map((r) => (
              <li key={r.id} className="rounded border border-[var(--tema-zinc-800)] px-2 py-1.5">
                {renomeandoId === r.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={nomeInput}
                      onChange={(e) => setNomeInput(e.target.value)}
                      placeholder="Nome da rua (ex: Alameda Central)"
                      className="text-xs bg-[var(--tema-zinc-800)] border border-[var(--tema-zinc-700)] rounded px-2 py-1 text-white flex-1 min-w-[140px]"
                    />
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => {
                        onRenomear(r.id, nomeInput)
                        setRenomeandoId(null)
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-200"
                    >
                      Salvar
                    </button>
                    <button type="button" onClick={() => setRenomeandoId(null)} className="text-xs text-[var(--tema-zinc-400)] hover:text-[var(--tema-zinc-200)]">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-[var(--tema-zinc-300)]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-[2px] inline-block shrink-0" style={{ background: '#a855f7' }} />
                      Rua {r.numero} {r.nome && `— ${r.nome}`} {r.geometria_revisada && <span className="text-emerald-400">🔒</span>}{' '}
                      {r.comprimento_m != null && <span className="text-[var(--tema-zinc-500)]">({r.comprimento_m.toFixed(0)} m)</span>}
                      {diagnostico?.idsDesconectadas.includes(r.id) && <span style={{ color: '#f59e0b' }}>⚠ desconectada</span>}
                    </span>
                    {editavel && (
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRenomeandoId(r.id)
                            setNomeInput(r.nome || '')
                          }}
                          className="text-[var(--tema-zinc-400)] hover:text-white"
                        >
                          ✎ Renomear
                        </button>
                        {ruaEmEdicao?.id === r.id ? (
                          <button type="button" onClick={onSairEdicao} className="text-blue-400 hover:text-blue-200">
                            Sair da edição
                          </button>
                        ) : (
                          <button type="button" disabled={salvando || desenho.ativo} onClick={() => onEditar(r)} className="text-blue-400 hover:text-blue-200 disabled:opacity-40">
                            Editar no mapa
                          </button>
                        )}
                        {r.geometria_revisada ? (
                          <button type="button" disabled={salvando} onClick={() => onDestravar(r)} className="text-emerald-400 hover:text-emerald-200">
                            Destravar
                          </button>
                        ) : (
                          <button type="button" disabled={salvando} onClick={() => onTravar(r)} className="text-[var(--tema-zinc-400)] hover:text-[var(--tema-zinc-200)]">
                            🔒 Travar
                          </button>
                        )}
                        <button type="button" disabled={salvando} onClick={() => onApagar(r)} className="text-red-400 hover:text-red-200">
                          Apagar
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
