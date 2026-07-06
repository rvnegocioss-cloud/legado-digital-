'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/auth'

export default function AdminMemoriais() {
  const [memoriais, setMemoriais] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMemoriais()
  }, [])

  async function loadMemoriais() {
    const { data } = await supabase
      .from('homenagens')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setMemoriais(data)
    setLoading(false)
  }

  if (loading) {
    return <p className="text-zinc-400">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Memoriais</h1>
      </div>

      {memoriais.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Nenhum memorial cadastrado ainda.</p>
          <p className="text-zinc-600 text-sm mt-2">Em breve: formulário de cadastro.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Nascimento</th>
                <th className="text-left py-3 px-4">Falecimento</th>
                <th className="text-left py-3 px-4">Cidade</th>
                <th className="text-left py-3 px-4">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {memoriais.map(m => (
                <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{m.nome_completo}</td>
                  <td className="py-3 px-4 text-zinc-300">
                    {m.data_nascimento || '-'}
                  </td>
                  <td className="py-3 px-4 text-zinc-300">
                    {m.data_falecimento || '-'}
                  </td>
                  <td className="py-3 px-4 text-zinc-300">{m.cidade || '-'}</td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(m.created_at).toLocaleDateString('pt-BR')}
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