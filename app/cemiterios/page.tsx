import Link from "next/link";
import { MapPin } from "lucide-react";
import { tema, CORES } from "@/lib/publicTheme";
import { supabaseServidor as supabase } from "@/lib/supabaseServidor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cemitérios — Legado Digital",
  description: "Encontre memoriais digitais por cidade e cemitério.",
};

interface CidadePublica {
  cidade: string;
  estado: string;
  cidade_slug: string;
  total_cemiterios: number;
}

export default async function CemiteriosPage() {
  const { data } = await supabase.rpc("listar_cidades_publicas");
  const cidades = (data || []) as CidadePublica[];

  return (
    <div style={tema.page}>
      <header style={tema.hero}>
        <div style={tema.eyebrow}>Em Memória</div>
        <h1 style={tema.titulo}>Cemitérios</h1>
        <p style={tema.subtitulo}>
          Escolha uma cidade pra ver os cemitérios mapeados e os memoriais publicados neles.
        </p>
      </header>

      <main style={tema.main}>
        {cidades.length === 0 ? (
          <p style={tema.vazio}>Nenhum cemitério público cadastrado ainda.</p>
        ) : (
          <div style={tema.placaGrid}>
            {cidades.map((c) => (
              <Link key={c.cidade_slug} href={`/cemiterios/${c.cidade_slug}`} style={tema.placaLink}>
                <div style={tema.placa}>
                  <div style={tema.placaAnel}>
                    <div style={tema.placaAnelInner}>
                      <MapPin size={20} strokeWidth={1.5} color={CORES.dourado} />
                    </div>
                  </div>
                  <div style={tema.placaTextos}>
                    <div style={tema.placaNome}>{c.cidade} — {c.estado}</div>
                    <div style={tema.placaHairline} />
                    <div style={tema.placaMeta}>
                      {c.total_cemiterios} cemitério{c.total_cemiterios === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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
