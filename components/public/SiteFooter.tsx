"use client";

import Link from "next/link";
import Image from "next/image";
import "./site-chrome.css";

// Rodapé único de todo o site aberto. Reescrito 2026-09-22 pro padrão do
// protótipo aprovado pelo Rafael: colunas por público (família / parceiro /
// empresa) em vez da coluna "Produto" genérica de antes. "Sobre" fica como
// texto, sem link, enquanto a página /sobre não existir -- link morto é pior
// que nenhum link.
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="inner">
        <div className="cols">
          <div className="brand-col">
            <Image className="logo-sm" src="/logo-legado-digital.svg" alt="Legado Digital" width={160} height={62} />
            <p>Um espaço permanente para preservar histórias. Memoriais digitais com QR Code.</p>
          </div>
          <div className="col">
            <h4>Memoriais</h4>
            <Link href="/busca">Buscar memorial</Link>
            <Link href="/cemiterios">Cemitérios</Link>
            <Link href="/familia/login#cadastro">Quero um memorial</Link>
          </div>
          <div className="col">
            <h4>Parceiros</h4>
            <Link href="/parceiro/login#cadastro">Seja nosso parceiro</Link>
            <Link href="/#como-funciona">Como funciona</Link>
            <Link href="/parceiro/login">Portal do Parceiro</Link>
          </div>
          <div className="col">
            <h4>Empresa</h4>
            <span>Sobre</span>
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
