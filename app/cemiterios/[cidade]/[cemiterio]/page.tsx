import Link from "next/link";
import { notFound } from "next/navigation";
import { tema, CORES } from "@/lib/publicTheme";
import { supabaseServidor as supabase } from "@/lib/supabaseServidor";
import MapaPublicoCemiterio from "@/components/public/MapaPublicoCemiterioCarregador";
import { assinarOrtomosaico } from "@/lib/ortomosaicoAssinado";
import { urlMidiaProtegida } from "@/lib/urlMidia";

export const dynamic = "force-dynamic";

// noindex -- as props do Server Component (nome/foto de quem tem gate
// 'aberto') são serializadas no HTML; sem isso o Google indexaria nome de
// falecido a partir só do hover, mesmo protegido de scraping avulso.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ cidade: string; cemiterio: string }>;
}) {
  const { cemiterio } = await params;
  const { data } = await supabase.rpc("obter_mapa_publico_cemiterio", { p_slug: cemiterio });
  if (!data) return { title: "Cemitério não encontrado — Legado Digital" };
  return {
    title: `${data.cemiterio.nome} — Legado Digital`,
    robots: { index: false, follow: true },
  };
}

interface MapaPublico {
  cemiterio: {
    nome: string;
    cidade: string;
    estado: string;
    latitude: number;
    longitude: number;
    ortomosaico_url: string | null;
    ortomosaico_minzoom: number | null;
    ortomosaico_maxzoom: number | null;
    ortomosaico_bounds: number[] | null;
  };
  memoriais: GeoJSON.FeatureCollection<GeoJSON.Point, { slug: string; nome: string | null; foto_url: string | null; protegido: boolean }>;
}

export default async function CemiterioMapaPage({
  params,
}: {
  params: Promise<{ cidade: string; cemiterio: string }>;
}) {
  const { cidade, cemiterio } = await params;
  const { data } = await supabase.rpc("obter_mapa_publico_cemiterio", { p_slug: cemiterio });

  if (!data) {
    notFound();
  }

  const { cemiterio: c, memoriais } = data as MapaPublico;

  // URL assinada e de vida curta: o balde dos mapas e privado, pra ninguem
  // baixar o ortomosaico inteiro (o ativo mais caro do projeto) so por abrir
  // o mapa e olhar a requisicao.
  const ortoAssinado = await assinarOrtomosaico(c.ortomosaico_url);

  // Foto do memorial no card do mapa também vai assinada -- balde privado.
  // Foto do memorial no card do mapa também vai assinada -- balde privado.
  const memoriaisAssinados = {
    ...memoriais,
    features: await Promise.all(
      (memoriais?.features || []).map(async (f) => ({
        ...f,
        properties: { ...f.properties, foto_url: urlMidiaProtegida(f.properties?.foto_url) },
      }))
    ),
  } as typeof memoriais;

  return (
    <div style={tema.page}>
      <header style={tema.hero}>
        <div style={{ alignSelf: "flex-start", margin: "0 auto 12px" }}>
          <Link href={`/cemiterios/${cidade}`} style={{ color: CORES.textoFraco, fontSize: 12.5, textDecoration: "none" }}>
            ← Voltar pros cemitérios de {c.cidade}
          </Link>
        </div>
        <div style={tema.eyebrow}>Em Memória</div>
        <h1 style={tema.titulo}>{c.nome}</h1>
        <p style={tema.subtitulo}>
          {c.cidade} — {c.estado}. Toque num pino pra ver o memorial daquele túmulo.
        </p>
      </header>

      <main style={{ ...tema.main, maxWidth: 960 }}>
        <MapaPublicoCemiterio
          cemiterioNome={c.nome}
          cidade={c.cidade}
          estado={c.estado}
          latitude={c.latitude}
          longitude={c.longitude}
          ortoUrl={ortoAssinado}
          ortoMinzoom={c.ortomosaico_minzoom}
          ortoMaxzoom={c.ortomosaico_maxzoom}
          ortoBounds={c.ortomosaico_bounds}
          memoriais={memoriaisAssinados}
        />
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
