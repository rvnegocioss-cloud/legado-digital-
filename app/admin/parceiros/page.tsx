'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/auth'

export default function AdminParceiros() {
  const [parceiros, setParceiros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadParceiros()
  }, [])

  async function loadParceiros() {
    const { data } = await supabase
      .from('parceiros_b2b')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setParceiros(data)
    setLoading(false)
  }

  if (loading) {
    return <p className="text-zinc-400">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Parceiros B2B</h1>
      </div>

      {parceiros.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Nenhum parceiro cadastrado ainda.</p>
          <p className="text-zinc-600 text-sm mt-2">Em breve: formulário de cadastro.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Tipo</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {parceiros.map(p => (
                <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{p.nome_fantasia || p.razao_social}</td>
                  <td className="py-3 px-4 text-zinc-300">{p.email}</td>
                  <td className="py-3 px-4 text-zinc-300">{p.tipo_parceiro}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      p.ativo ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
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