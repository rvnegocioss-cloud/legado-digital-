'use client'

import { useState } from 'react'

// Metade clara das telas de acesso (/parceiro/login e /familia/login).
// Mesmo componente pros dois tipos de lead — muda só o texto e os campos
// próprios de cada um, nunca a lógica de envio.
export default function FormularioLead({ tipo }: { tipo: 'parceiro' | 'familia' }) {
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cidade, setCidade] = useState('')
  const [homenageado, setHomenageado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)

  const ehParceiro = tipo === 'parceiro'

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, nome, empresa, email, telefone, cidade, homenageado }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok || !json.ok) {
      setErro(json.error || 'Não foi possível enviar agora')
      setEnviando(false)
      return
    }

    setEnviado(true)
    setEnviando(false)
  }

  if (enviado) {
    return (
      <div className="w-full max-w-[420px]">
        <span className="inline-block text-[11px] uppercase tracking-[1.8px] text-[#8a6d3b] bg-[rgba(201,164,106,0.16)] px-3 py-[5px] rounded-full mb-3.5">
          Recebido
        </span>
        <h2 className="text-[26px] font-normal text-[#1a2730] mb-2">Obrigado pelo contato</h2>
        <p className="text-sm text-[#5b6670] leading-relaxed">
          {ehParceiro
            ? 'Nossa equipe comercial entra em contato pelo e-mail e telefone informados.'
            : 'Vamos entrar em contato e indicar uma funerária parceira da sua região.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="w-full max-w-[420px]">
      <span className="inline-block text-[11px] uppercase tracking-[1.8px] text-[#8a6d3b] bg-[rgba(201,164,106,0.16)] px-3 py-[5px] rounded-full mb-3.5">
        {ehParceiro ? 'Ainda não é parceiro' : 'Ainda não tem um memorial'}
      </span>

      <h2 className="text-[26px] font-normal text-[#1a2730] mb-2">
        {ehParceiro ? 'Leve o Legado Digital pra sua funerária' : 'Quero um memorial pra minha família'}
      </h2>
      <p className="text-sm text-[#5b6670] leading-relaxed mb-6">
        {ehParceiro
          ? 'Deixe seus dados e nossa equipe entra em contato pra apresentar como funciona.'
          : 'Deixe seus dados e nós indicamos uma funerária parceira na sua cidade.'}
      </p>

      <label className="block text-[11px] uppercase tracking-[1.6px] text-[#8a6d3b] mb-1.5">
        {ehParceiro ? 'Nome do responsável' : 'Seu nome'}
      </label>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        required
        placeholder="Nome completo"
        className="w-full px-3.5 py-3 rounded-lg mb-3.5 text-[15px] bg-white border border-[#ddd6c8] text-[#22303a] placeholder-[#a9b2ba] focus:outline-none focus:border-[#C9A46A]"
      />

      {ehParceiro && (
        <>
          <label className="block text-[11px] uppercase tracking-[1.6px] text-[#8a6d3b] mb-1.5">Empresa</label>
          <input
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="Nome da funerária ou cemitério"
            className="w-full px-3.5 py-3 rounded-lg mb-3.5 text-[15px] bg-white border border-[#ddd6c8] text-[#22303a] placeholder-[#a9b2ba] focus:outline-none focus:border-[#C9A46A]"
          />
        </>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-[11px] uppercase tracking-[1.6px] text-[#8a6d3b] mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={ehParceiro ? 'voce@empresa.com.br' : 'voce@email.com'}
            className="w-full px-3.5 py-3 rounded-lg mb-3.5 text-[15px] bg-white border border-[#ddd6c8] text-[#22303a] placeholder-[#a9b2ba] focus:outline-none focus:border-[#C9A46A]"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] uppercase tracking-[1.6px] text-[#8a6d3b] mb-1.5">Telefone</label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            className="w-full px-3.5 py-3 rounded-lg mb-3.5 text-[15px] bg-white border border-[#ddd6c8] text-[#22303a] placeholder-[#a9b2ba] focus:outline-none focus:border-[#C9A46A]"
          />
        </div>
      </div>

      <label className="block text-[11px] uppercase tracking-[1.6px] text-[#8a6d3b] mb-1.5">Cidade / Estado</label>
      <input
        value={cidade}
        onChange={(e) => setCidade(e.target.value)}
        placeholder="Uberlândia / MG"
        className="w-full px-3.5 py-3 rounded-lg mb-3.5 text-[15px] bg-white border border-[#ddd6c8] text-[#22303a] placeholder-[#a9b2ba] focus:outline-none focus:border-[#C9A46A]"
      />

      {!ehParceiro && (
        <>
          <label className="block text-[11px] uppercase tracking-[1.6px] text-[#8a6d3b] mb-1.5">
            Nome do homenageado (opcional)
          </label>
          <input
            value={homenageado}
            onChange={(e) => setHomenageado(e.target.value)}
            placeholder="De quem é a homenagem"
            className="w-full px-3.5 py-3 rounded-lg mb-3.5 text-[15px] bg-white border border-[#ddd6c8] text-[#22303a] placeholder-[#a9b2ba] focus:outline-none focus:border-[#C9A46A]"
          />
        </>
      )}

      {erro && <p className="text-red-600 text-sm mb-3">{erro}</p>}

      <button
        type="submit"
        disabled={enviando}
        className="w-full py-3.5 rounded-lg bg-[#0B1D2A] text-white text-[15px] font-bold disabled:opacity-60"
      >
        {enviando ? 'Enviando...' : ehParceiro ? 'Quero conhecer' : 'Quero saber como funciona'}
      </button>
    </form>
  )
}
