import { tema } from "@/lib/publicTheme";
import Migalhas from "@/components/public/Migalhas";
import { BuscaMemorial } from "@/components/public/BuscaMemorial";

export default function BuscaPage() {
  return (
    <div style={tema.page}>

      <Migalhas trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Buscar memorial" }]} />

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


    </div>
  );
}
