"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp, Maximize2, X } from "lucide-react";
import "./apresentacao.css";

// Apresentação guiada do parceiro: o atendente abre no balcão (tablet, TV ou
// computador) e conduz a conversa uma tela por vez. Aberta pelo botão
// "Apresentar para a família" da tela "Minha página" do Portal do Parceiro.
//
// Rolagem com encaixe (scroll-snap) em vez de carrossel próprio: toque, roda do
// mouse, teclado e barra de espaço já funcionam de graça e cada tela continua
// sendo conteúdo normal da página. Sem animação contínua (nada de
// requestAnimationFrame) -- só o que o navegador faz ao rolar.

export interface DadosApresentacao {
  nome: string
  slug: string
  logo: string | null
  capa: string
  whatsapp: string | null
  exemplo: { nome: string; slug: string; foto: string | null; anos: string | null; frase: string | null } | null
}

const TELAS = [
  {
    img: "/fio-da-vida/nodes/memorial-node-1.png",
    alt: "Família vendo o memorial no tablet",
    rotulo: "O memorial",
    titulo: "Uma página inteira para a história de quem partiu",
    texto: "Fotos, vídeos, a história contada pela família, a linha do tempo e as mensagens de quem conviveu.",
  },
  {
    img: "/fio-da-vida/nodes/qrcode-node-1.png",
    alt: "QR Code na placa do túmulo sendo lido pelo celular",
    rotulo: "A placa",
    titulo: "Um QR Code no túmulo",
    texto: "Quem visita aponta a câmera do celular e abre o memorial na hora. Não precisa instalar nada.",
  },
  {
    img: "/fio-da-vida/nodes/mapa-rota-1.png",
    alt: "Mapa do cemitério com a rota até o túmulo",
    rotulo: "O caminho",
    titulo: "Como chegar até o túmulo",
    texto: "O mapa aéreo do cemitério mostra a rota do portão até o lugar exato. Ninguém da família se perde.",
  },
  {
    img: "/fio-da-vida/nodes/portal-familia-1.png",
    alt: "Família editando o memorial no Portal da Família",
    rotulo: "A família no comando",
    titulo: "Vocês decidem o que aparece",
    texto: "Com um acesso próprio, a família envia as fotos, escreve a história e escolhe quem pode ver.",
  },
  {
    img: "/parceiro-pagina/familia-reunida.jpg",
    alt: "Família reunida na sala vendo o memorial na TV",
    rotulo: "De onde estiver",
    titulo: "A família inteira em volta da mesma história",
    texto: "Quem mora longe acessa pelo link. Filhos e netos conhecem a história de quem veio antes.",
  },
];

export default function ApresentacaoGuiada({ dados }: { dados: DadosApresentacao }) {
  const palco = useRef<HTMLDivElement | null>(null)
  const [atual, setAtual] = useState(0)
  const total = TELAS.length + (dados.exemplo ? 3 : 2)

  const irPara = useCallback((i: number) => {
    const el = palco.current
    if (!el) return
    const alvo = Math.max(0, Math.min(total - 1, i))
    el.children[alvo]?.scrollIntoView({ behavior: "smooth" })
  }, [total])

  useEffect(() => {
    const el = palco.current
    if (!el) return
    const aoRolar = () => setAtual(Math.round(el.scrollTop / el.clientHeight))
    el.addEventListener("scroll", aoRolar, { passive: true })
    return () => el.removeEventListener("scroll", aoRolar)
  }, [])

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); irPara(atual + 1) }
      if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); irPara(atual - 1) }
      if (e.key === "Home") irPara(0)
      if (e.key === "End") irPara(total - 1)
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  }, [atual, irPara, total])

  function telaCheia() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const linkWhats = dados.whatsapp

  return (
    <div className="apres">
      <div className="apres-barra">
        <div className="lado">
          {dados.logo && (
            <span className="mini-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dados.logo} alt={dados.nome} />
            </span>
          )}
          <span className="por">
            por <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={84} height={33} />
          </span>
        </div>
        <div className="lado">
          <button type="button" onClick={telaCheia} aria-label="Tela cheia" title="">
            <Maximize2 size={16} strokeWidth={1.5} /> <span>Tela cheia</span>
          </button>
          <Link href={`/parceiros/${dados.slug}`} aria-label="Sair da apresentação">
            <X size={16} strokeWidth={1.5} /> <span>Sair</span>
          </Link>
        </div>
      </div>

      <div className="apres-pontos" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <button key={i} type="button" tabIndex={-1} className={i === atual ? "on" : ""} onClick={() => irPara(i)} />
        ))}
      </div>

      <div className="apres-setas">
        <button type="button" onClick={() => irPara(atual - 1)} disabled={atual === 0} aria-label="Tela anterior" title="">
          <ChevronUp size={20} strokeWidth={1.5} />
        </button>
        <span>
          {atual + 1} de {total}
        </span>
        <button type="button" onClick={() => irPara(atual + 1)} disabled={atual === total - 1} aria-label="Próxima tela" title="">
          <ChevronDown size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div className="apres-palco" ref={palco}>
        <section className="tela abre" style={{ backgroundImage: `url(${dados.capa})` }}>
          <div className="wrap">
            {dados.logo && (
              <div className="logo-g">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dados.logo} alt="" />
              </div>
            )}
            <div className="rotulo">{dados.nome} apresenta</div>
            <h1>
              A história de quem você ama,
              <br />
              guardada para sempre
            </h1>
            <p>O memorial digital que acompanha o seu plano.</p>
          </div>
        </section>

        {TELAS.map((t, i) => (
          <section key={t.img} className={`tela ${i % 2 ? "alt inv" : ""}`}>
            <div className="wrap duo">
              <div className="quadro">
                <Image src={t.img} alt={t.alt} fill sizes="(max-width: 900px) 100vw, 55vw" />
              </div>
              <div>
                <div className="rotulo">
                  {i + 1} · {t.rotulo}
                </div>
                <h2>{t.titulo}</h2>
                <p>{t.texto}</p>
              </div>
            </div>
          </section>
        ))}

        {dados.exemplo && (
          <section className="tela alt inv">
            <div className="wrap duo">
              <div className="ficha">
                <div className="ring">
                  {dados.exemplo.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dados.exemplo.foto} alt={dados.exemplo.nome} />
                  ) : (
                    <span>{dados.exemplo.nome.charAt(0)}</span>
                  )}
                </div>
                <div className="nome">{dados.exemplo.nome}</div>
                {dados.exemplo.anos && <div className="anos">{dados.exemplo.anos}</div>}
                {dados.exemplo.frase && <div className="frase">&ldquo;{dados.exemplo.frase}&rdquo;</div>}
              </div>
              <div>
                <div className="rotulo">{TELAS.length + 1} · Veja um de verdade</div>
                <h2>Abra agora um memorial de exemplo</h2>
                <p>Navegue pela página como a família vai ver. Os dados são fictícios.</p>
                <a href={`/homenagem/${dados.exemplo.slug}`} target="_blank" rel="noopener noreferrer" className="botao">
                  Abrir o memorial de exemplo
                </a>
              </div>
            </div>
          </section>
        )}

        <section className="tela fecha">
          <div className="wrap">
            <div className="rotulo">Incluso no seu plano</div>
            <h2>Vamos criar o memorial da sua família?</h2>
            <p>{dados.nome} faz o cadastro com você.</p>
            <div className="acoes">
              {linkWhats && (
                <a href={linkWhats} target="_blank" rel="noopener noreferrer" className="botao">
                  Falar com {dados.nome}
                </a>
              )}
              <Link href={`/parceiros/${dados.slug}`} className="botao vazado">
                Ver a página de {dados.nome}
              </Link>
            </div>
            <div className="rodape">
              <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={120} height={47} />
              <span>
                <Link href="/politica-de-privacidade">Privacidade</Link> · <Link href="/termos-de-uso">Termos</Link>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
