'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/auth'

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsuarios()
  }, [])

  async function loadUsuarios() {
    const { data } = await supabase
      .from('usuarios')
      .select(`
        *,
        usuarios_perfis (
          perfis (
            nome
          )
        )
      `)
      .order('criado_em', { ascending: false })
    if (data) setUsuarios(data)
    setLoading(false)
  }

  if (loading) {
    return <p className="text-zinc-400">Carregando...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
      </div>

      {usuarios.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Nenhum usuário cadastrado ainda.</p>
          <p className="text-zinc-600 text-sm mt-2">Em breve: formulário de cadastro.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="text-left py-3 px-4">Nome</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Perfil</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                  <td className="py-3 px-4 text-white">{u.nome}</td>
                  <td className="py-3 px-4 text-zinc-300">{u.email}</td>
                  <td className="py-3 px-4 text-zinc-300">
                    {u.usuarios_perfis?.[0]?.perfis?.nome || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      u.ativo ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                    }`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    {new Date(u.criado_em).toLocaleDateString('pt-BR')}
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