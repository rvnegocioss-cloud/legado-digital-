import { tema } from "@/lib/publicTheme";
import { BuscaMemorial } from "@/components/public/BuscaMemorial";

export default function BuscaPage() {
  return (
    <div style={tema.page}>
      <header style={tema.hero}>
        <div style={tema.eyebrow}>Em Memória</div>
        <h1 style={tema.titulo}>Buscar um memorial</h1>
        <p style={tema.subtitulo}>
          Encontre a página de homenagem de quem você procura pelo nome. Memoriais com acesso
          restrito pedem senha antes de abrir.
        </p>
      </header>

      <main style={tema.main}>
        <BuscaMemorial />
      </main>

      <footer style={tema.footer}>
        <span style={{ fontFamily: "Georgia, serif" }}>Legado Digital</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/politica-de-privacidade" style={{ color: "#7a8a96", fontSize: 12, textDecoration: "none" }}>Privacidade</a>
          <a href="/termos-de-uso" style={{ color: "#7a8a96", fontSize: 12, textDecoration: "none" }}>Termos</a>
        </div>
      </footer>
    </div>
  );
}
