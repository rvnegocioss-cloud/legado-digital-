"use client";

import Link from "next/link";
import Image from "next/image";
import "./site-chrome.css";

// Mesma estrutura/classes do rodapé real da landing (app/fio-da-vida.css) --
// pra nunca mais divergir visualmente. Corrigido 2026-09-11 junto do SiteNav.
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="inner">
        <div className="cols">
          <div className="brand-col">
            <Image className="logo-sm" src="/logo-legado-digital.svg" alt="Legado Digital" width={160} height={62} />
            <p>Um espaço permanente para preservar histórias. Memoriais digitais com QR Code para o setor funerário.</p>
          </div>
          <div className="col">
            <h4>Produto</h4>
            <Link href="/#beneficios">Benefícios</Link>
            <Link href="/#como-funciona">Como Funciona</Link>
            <Link href="/cemiterios">Cemitérios</Link>
            <Link href="/busca">Buscar um memorial</Link>
          </div>
          <div className="col">
            <h4>Empresa</h4>
            <a href="mailto:contato@legadodigital.net">contato@legadodigital.net</a>
            <Link href="/politica-de-privacidade">Privacidade</Link>
            <Link href="/termos-de-uso">Termos de Uso</Link>
          </div>
        </div>
        <div className="bottom">
          © 2026 Legado Digital. Todos os direitos reservados.
          <br />
          Preservando histórias hoje para que continuem inspirando amanhã.
        </div>
      </div>
    </footer>
  );
}
