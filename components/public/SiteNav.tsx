"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useVoltar } from "@/lib/useVoltar";
import "./site-chrome.css";

// Menu único de todo o site aberto (landing, busca, cemitérios, jazigo,
// memorial, página do parceiro). Reescrito 2026-09-22 pro padrão do
// protótipo aprovado pelo Rafael: três destinos do público final + as duas
// ações da direita. Saíram "Benefícios" e "FAQ" (são seções da home, não
// destinos), o dropdown "Contato" (misturava e-mail com dois CTAs) e
// "Para parceiros" (a página pública /parceiros ainda não existe).
const LINKS = [
  { href: "/busca", label: "Buscar memorial" },
  { href: "/cemiterios", label: "Cemitérios" },
  { href: "/#como-funciona", label: "Como funciona" },
];

const AREA_RESTRITA_LINKS = [
  { href: "/parceiro/login", label: "Portal do Parceiro" },
  { href: "/familia/login", label: "Portal da Família" },
];

function Seta() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SiteNav() {
  const [areaAberta, setAreaAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();
  const voltar = useVoltar("/");
  // Na home não há pra onde voltar nem "pro site" pra ir: a pessoa já está lá.
  const naHome = pathname === "/";

  // Trocar de página fecha o menu: sem isso ele fica aberto por cima do
  // conteúdo novo (a navegação do App Router não desmonta a nav).
  useEffect(() => {
    setMenuAberto(false);
    setAreaAberta(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  return (
    <nav className="site-navbar">
      <div className="inner">
        {/* Três coisas diferentes, cada uma com um botão só dela (correção do
            Rafael, 2026-09-23 -- a seta e a logo eram o MESMO link fixo pra
            home, então quem clicava na cruz do mapa, abria o memorial e
            apertava a seta caía na landing em vez de voltar pro mapa):

            ← seta       volta pra página de ONDE A PESSOA VEIO (useVoltar);
                         sem página anterior no site, cai na home.
            logo         leva pra home, como em qualquer site.
            Voltar pro   texto explícito pra home (regra 11) -- é ele que
            site         responde "como eu chego no site?", a seta não. */}
        <div className="volta-grupo">
          {!naHome && (
            <button
              type="button"
              className="volta-seta"
              onClick={voltar}
              aria-label="Voltar para a página anterior"
              title=""
            >
              ←
            </button>
          )}
          <Link href="/" className="volta-link" aria-label="Legado Digital — ir para o início">
            <Image
              className="logo-sm"
              src="/logo-legado-digital.svg"
              alt="Legado Digital"
              width={220}
              height={86}
            />
          </Link>
          {!naHome && (
            <Link href="/" className="volta-site">
              Voltar pro site
            </Link>
          )}
        </div>

        {/* No celular os links e as ações saem da barra e vão pro painel deste
            botão. Antes eles simplesmente sumiam (`.links { display: none }`
            sem nada no lugar), e não havia como chegar em Buscar memorial nem
            em Cemitérios pelo telefone -- achado do Rafael, 2026-09-23. */}
        <button
          type="button"
          className={`hamburguer ${menuAberto ? "aberto" : ""}`}
          aria-expanded={menuAberto}
          aria-controls="menu-do-site"
          aria-label={menuAberto ? "Fechar o menu" : "Abrir o menu"}
          title=""
          onClick={() => setMenuAberto((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="nav-direita">
          <div className="links">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="acoes">
            <Link href="/familia/login#cadastro" className="cta-vazado">
              Quero um memorial
            </Link>

            <div className={`area-restrita ${areaAberta ? "aberto" : ""}`}>
              <button
                type="button"
                className="link-entrar"
                aria-expanded={areaAberta}
                onClick={() => setAreaAberta((v) => !v)}
              >
                Entrar <Seta />
              </button>
              {areaAberta && (
                <div className="menu-area">
                  {AREA_RESTRITA_LINKS.map((l) => (
                    <Link key={l.href} href={l.href} onClick={() => setAreaAberta(false)}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {menuAberto && (
        <div className="menu-celular" id="menu-do-site">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuAberto(false)}>
              {l.label}
            </Link>
          ))}

          <Link
            href="/familia/login#cadastro"
            className="destaque"
            onClick={() => setMenuAberto(false)}
          >
            Quero um memorial
          </Link>

          <p className="titulo-grupo">Entrar</p>
          {AREA_RESTRITA_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuAberto(false)}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
