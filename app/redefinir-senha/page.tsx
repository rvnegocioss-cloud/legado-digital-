'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/auth'

/**
 * Traduz o motivo real que o Supabase devolve no link quebrado, em vez de
 * cair sempre no genérico "pode ter expirado" — que escondia a causa de
 * verdade (token de uso único já consumido antes do clique do usuário).
 */
function motivoDoLink(codigo: string | null, descricao: string | null): string {
  if (codigo === 'otp_expired' || /expired/i.test(descricao || '')) {
    return 'Esse link já foi usado ou passou da validade. Cada link de recuperação vale uma vez só — alguns provedores de e-mail (Gmail/Outlook) abrem o link sozinhos pra checar segurança e acabam gastando o seu antes de você clicar. Peça um novo e abra assim que chegar.'
  }
  if (codigo === 'access_denied') {
    return 'O link não foi aceito pelo servidor de acesso. Peça um novo e abra o mais recente que chegar na caixa de entrada.'
  }
  return descricao || 'O link não pôde ser validado. Peça um novo e abra o mais recente que chegar na caixa de entrada.'
}

export default function RedefinirSenhaPage() {
  const [estado, setEstado] = useState<'verificando' | 'pronto' | 'sem-link'>('verificando')
  const [motivo, setMotivo] = useState('')
  const [emailAlvo, setEmailAlvo] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    function liberar(email?: string | null) {
      if (!ativo) return
      if (email) setEmailAlvo(email)
      setEstado('pronto')
      // Tira token/código da barra de endereço depois de consumido
      if (window.location.hash || window.location.search) {
        window.history.replaceState(window.history.state, '', window.location.pathname)
      }
    }

    // O supabase-js também tenta processar a URL sozinho (detectSessionInUrl).
    // Quem chegar primeiro ganha; esse listener cobre esse caminho.
    const { data: listener } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (!ativo) return
      if (evento === 'PASSWORD_RECOVERY' || (evento === 'SIGNED_IN' && sessao)) {
        liberar(sessao?.user?.email)
      }
    })

    async function preparar() {
      // Parâmetros podem vir no hash (fluxo implicit: #access_token=...&type=recovery)
      // ou na query (fluxo PKCE: ?code=... / template com ?token_hash=...).
      // Lemos os dois pra não depender de qual formato o Supabase mandar.
      const doHash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const daQuery = new URLSearchParams(window.location.search)
      const ler = (chave: string) => daQuery.get(chave) ?? doHash.get(chave)

      // 1) Link já veio com erro do próprio Supabase (403 no /verify redireciona
      //    pra cá com #error=...). Antes isso caía no texto genérico.
      const erroLink = ler('error') || ler('error_description') || ler('error_code')
      if (erroLink) {
        if (!ativo) return
        setMotivo(motivoDoLink(ler('error_code'), ler('error_description')))
        setEstado('sem-link')
        return
      }

      try {
        // 2) Fluxo implicit — tokens no hash.
        const accessToken = ler('access_token')
        const refreshToken = ler('refresh_token')
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error && data.session) return liberar(data.session.user?.email)
        }

        // 3) Fluxo PKCE — código na query.
        const code = ler('code')
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error && data.session) return liberar(data.session.user?.email)
        }

        // 4) Template com token_hash (não consome no clique do scanner de e-mail).
        const tokenHash = ler('token_hash')
        const tipo = ler('type')
        if (tokenHash && (!tipo || tipo === 'recovery')) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })
          if (!error && data.session) return liberar(data.session.user?.email)
        }
      } catch {
        // cai na checagem de sessão abaixo
      }

      // 5) O supabase-js pode ter processado a URL antes da gente (e limpado o
      //    hash). Nesse caso a sessão já existe.
      const { data } = await supabase.auth.getSession()
      if (!ativo) return
      if (data.session) return liberar(data.session.user?.email)

      setMotivo('')
      setEstado('sem-link')
    }

    preparar()

    return () => {
      ativo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres')
      return
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não são iguais')
      return
    }

    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvando(false)

    if (error) {
      setErro(error.message)
      return
    }

    // Se essa conta tinha senha temporária pendente de troca (parceiro
    // recém-convidado que perdeu o e-mail e recuperou por aqui), desmarca —
    // senão ela cairia direto na tela de troca obrigatória de novo.
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      fetch('/api/parceiro/concluir-troca-senha', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {})
    }

    setSalvo(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Redefinir senha</h1>
        </div>

        {salvo ? (
          <div className="text-center space-y-3">
            <p className="text-green-400 text-sm">Senha alterada. Já pode entrar de novo.</p>
            <div className="flex justify-center gap-4 text-sm">
              <Link href="/admin/login" className="text-blue-400 hover:underline">Central</Link>
              <Link href="/parceiro/login" className="text-blue-400 hover:underline">Parceiro</Link>
            </div>
          </div>
        ) : estado === 'verificando' ? (
          <p className="text-zinc-400 text-sm text-center">Verificando o link...</p>
        ) : estado === 'sem-link' ? (
          <div className="space-y-3">
            <p className="text-zinc-400 text-sm text-center">
              {motivo ||
                'Abra essa página pelo link recebido por e-mail. Se você chegou aqui direto, não há link nenhum pra validar.'}
            </p>
            <p className="text-center text-sm">
              <Link href="/recuperar-senha" className="text-blue-400 hover:underline">
                Pedir um novo link
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={salvar} className="space-y-4">
            {emailAlvo && (
              <p className="text-zinc-400 text-sm text-center">
                Definindo nova senha para <span className="text-white">{emailAlvo}</span>
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-300">Nova senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="mt-1 w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                className="mt-1 w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {erro && <p className="text-red-400 text-sm">{erro}</p>}
            <button
              type="submit"
              disabled={salvando}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg"
            >
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
