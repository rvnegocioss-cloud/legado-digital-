import Link from "next/link";
import Image from "next/image";
import { CORES } from "@/lib/publicTheme";

const linkStyle = { color: CORES.textoFraco, fontSize: 13, textDecoration: "none" } as const;

export default function SiteFooter() {
  return (
    <footer style={{ borderTop: `1px solid ${CORES.douradoBorda}`, marginTop: 40 }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 20px 24px",
          display: "flex",
          flexWrap: "wrap",
          gap: 32,
        }}
      >
        <div style={{ flex: "1 1 260px", minWidth: 220 }}>
          <Image
            src="/logo-legado-digital.svg"
            alt="Legado Digital"
            width={160}
            height={64}
            style={{ height: 32, width: "auto" }}
          />
          <p style={{ color: CORES.textoFraco, fontSize: 13, marginTop: 12, maxWidth: 320 }}>
            Um espaço permanente para preservar histórias. Memoriais digitais com QR Code para
            o setor funerário.
          </p>
        </div>
        <div style={{ flex: "1 1 160px", minWidth: 160 }}>
          <h4 style={{ color: CORES.textoForte, fontSize: 13, marginBottom: 10, fontWeight: 400 }}>Produto</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/#beneficios" style={linkStyle}>Benefícios</Link>
            <Link href="/#como-funciona" style={linkStyle}>Como Funciona</Link>
            <Link href="/cemiterios" style={linkStyle}>Cemitérios</Link>
            <Link href="/busca" style={linkStyle}>Buscar um memorial</Link>
          </div>
        </div>
        <div style={{ flex: "1 1 160px", minWidth: 160 }}>
          <h4 style={{ color: CORES.textoForte, fontSize: 13, marginBottom: 10, fontWeight: 400 }}>Empresa</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a href="mailto:contato@legadodigital.net" style={linkStyle}>contato@legadodigital.net</a>
            <Link href="/politica-de-privacidade" style={linkStyle}>Privacidade</Link>
            <Link href="/termos-de-uso" style={linkStyle}>Termos de Uso</Link>
          </div>
        </div>
      </div>
      <div
        style={{
          borderTop: `1px solid ${CORES.douradoBorda}`,
          padding: "16px 20px",
          textAlign: "center",
          color: CORES.textoFraco,
          fontSize: 11.5,
        }}
      >
        © 2026 Legado Digital. Todos os direitos reservados.
      </div>
    </footer>
  );
}
