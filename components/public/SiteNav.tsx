import Link from "next/link";
import Image from "next/image";
import { CORES } from "@/lib/publicTheme";

const LINKS = [
  { href: "/#beneficios", label: "Benefícios" },
  { href: "/#como-funciona", label: "Como Funciona" },
  { href: "/cemiterios", label: "Cemitérios" },
  { href: "/busca", label: "Buscar um memorial" },
];

export default function SiteNav() {
  return (
    <nav
      style={{
        borderBottom: `1px solid ${CORES.douradoBorda}`,
        background: "rgba(8,23,34,0.5)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/logo-legado-digital.svg"
            alt="Legado Digital"
            width={140}
            height={56}
            style={{ height: 28, width: "auto" }}
          />
        </Link>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{ color: CORES.textoFraco, fontSize: 13, textDecoration: "none" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
