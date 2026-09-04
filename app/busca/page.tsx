import { tema } from "@/lib/publicTheme";
import { BuscaMemorial } from "@/components/public/BuscaMemorial";
import SiteNav from "@/components/public/SiteNav";
import SiteFooter from "@/components/public/SiteFooter";

export default function BuscaPage() {
  return (
    <div style={tema.page}>
      <SiteNav />
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

      <SiteFooter />
    </div>
  );
}
