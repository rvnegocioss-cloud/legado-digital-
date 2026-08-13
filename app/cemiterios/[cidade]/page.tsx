import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Satellite } from "lucide-react";
import { tema, CORES } from "@/lib/publicTheme";
import { supabaseServidor as supabase } from "@/lib/supabaseServidor";

export const dynamic = "force-dynamic";

interface CemiterioPublico {
  slug: string;
  nome: string;
  endereco: string | null;
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  tem_ortomosaico: boolean;
}

export default async function CidadeCemiteriosPage({
  params,
}: {
  params: Promise<{ cidade: string }>;
}) {
  const { cidade } = await params;
  const { data } = await supabase.rpc("listar_cemiterios_publicos", { p_cidade_slug: cidade });
  const cemiterios = (data || []) as CemiterioPublico[];

  if (cemiterios.length === 0) {
    notFound();
  }

  const { cidade: nomeCidade, estado } = cemiterios[0];

  return (
    <div style={tema.page}>
      <header style={tema.hero}>
        <div style={{ alignSelf: "flex-start", margin: "0 auto 12px" }}>
          <Link href="/cemiterios" style={{ color: CORES.textoFraco, fontSize: 12.5, textDecoration: "none" }}>
            ← Voltar pros cemitérios
          </Link>
        </div>
        <div style={tema.eyebrow}>Em Memória</div>
        <h1 style={tema.titulo}>{nomeCidade} — {estado}</h1>
        <p style={tema.subtitulo}>Cemitérios mapeados nesta cidade.</p>
      </header>

      <main style={tema.main}>
        <div style={tema.placaGrid}>
          {cemiterios.map((c) => (
            <Link key={c.slug} href={`/cemiterios/${cidade}/${c.slug}`} style={tema.placaLink}>
              <div style={tema.placa}>
                <div style={tema.placaAnel}>
                  <div style={tema.placaAnelInner}>
                    <MapPin size={20} strokeWidth={1.5} color={CORES.dourado} />
                  </div>
                </div>
                <div style={tema.placaTextos}>
                  <div style={tema.placaNome}>{c.nome.trim()}</div>
                  <div style={tema.placaHairline} />
                  <div style={tema.placaMeta}>
                    {c.tem_ortomosaico ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Satellite size={11} strokeWidth={1.5} /> Mapa aéreo de drone
                      </span>
                    ) : (
                      c.endereco || "Ver mapa"
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
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
