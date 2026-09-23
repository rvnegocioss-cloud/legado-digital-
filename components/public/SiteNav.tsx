"use client";

import { useState } from "react";
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
  const pathname = usePathname();
  const voltar = useVoltar("/");
  // Na home não há pra onde voltar nem "pro site" pra ir: a pessoa já está lá.
  const naHome = pathname === "/";

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
    </nav>
  );
}
