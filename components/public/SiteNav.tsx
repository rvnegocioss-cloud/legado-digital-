"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./site-chrome.css";

// Mesma estrutura/classes do menu real da landing (app/fio-da-vida.css) --
// pra nunca mais divergir visualmente. Achado real 2026-09-11: essa página
// tinha um menu diferente (link/tamanho de logo diferentes, sem FAQ, sem
// Contato, sem Área Restrita) e só o logo mudo como "voltar", sem nenhuma
// seta ou texto -- corrigido pros dois.
const LINKS = [
  { href: "/#beneficios", label: "Benefícios" },
  { href: "/#como-funciona", label: "Como Funciona" },
  { href: "/#faq", label: "FAQ" },
  { href: "/cemiterios", label: "Cemitérios" },
];

const CONTATO_LINKS = [
  { href: "mailto:contato@legadodigital.net", label: "contato@legadodigital.net" },
  { href: "/parceiro/login#cadastro", label: "Quero ser parceiro" },
  { href: "/familia/login#cadastro", label: "Quero um memorial" },
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
  const [contatoAberto, setContatoAberto] = useState(false);
  const [areaAberta, setAreaAberta] = useState(false);

  return (
    <nav className="site-navbar">
      <div className="inner">
        <Link href="/" className="volta-link" aria-label="Voltar pro início">
          ← <Image className="logo-sm" src="/logo-legado-digital.svg" alt="Legado Digital" width={220} height={86} />
        </Link>

        <div className="links">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}

          <div className={`contato-nav ${contatoAberto ? "aberto" : ""}`}>
            <button
              type="button"
              className="link-contato"
              onClick={() => setContatoAberto((v) => !v)}
              onBlur={(e) => {
                if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setContatoAberto(false);
              }}
            >
              Contato <Seta />
            </button>
            {contatoAberto && (
              <div className="menu-area">
                {CONTATO_LINKS.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setContatoAberto(false)}>
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`area-restrita ${areaAberta ? "aberto" : ""}`}>
          <button
            type="button"
            className="cta"
            onClick={() => setAreaAberta((v) => !v)}
            onBlur={(e) => {
              if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) setAreaAberta(false);
            }}
          >
            Área Restrita <Seta />
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
    </nav>
  );
}
