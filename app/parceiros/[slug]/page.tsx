import { supabase } from "@/lib/supabase";
import { tema, CORES } from "@/lib/publicTheme";
import { BuscaMemorial } from "@/components/public/BuscaMemorial";

export const dynamic = "force-dynamic";

interface Parceiro {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
  slug: string;
  logo_url: string | null;
  descricao_publica: string | null;
  cidade: string | null;
  estado: string | null;
}

export default async function ParceiroPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: parceiro } = await supabase
    .from("parceiros_publicos")
    .select("id, nome_fantasia, razao_social, slug, logo_url, descricao_publica, cidade, estado")
    .eq("slug", slug)
    .single();

  if (!parceiro) {
    return (
      <div style={{ ...tema.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, color: CORES.dourado, margin: 0 }}>Página não encontrada.</p>
          <p style={{ color: CORES.textoFraco, marginTop: 8 }}>Confira o endereço e tente novamente.</p>
        </div>
      </div>
    );
  }

  const p = parceiro as Parceiro;

  return (
    <div style={tema.page}>
      <header style={tema.hero}>
        {p.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.logo_url}
            alt={p.nome_fantasia || p.razao_social}
            style={{ maxHeight: 64, maxWidth: 200, objectFit: "contain", marginBottom: 16 }}
          />
        )}
        <div style={tema.eyebrow}>Sob os cuidados de</div>
        <h1 style={tema.titulo}>{p.nome_fantasia || p.razao_social}</h1>
        <div style={{ width: 40, borderTop: `1px solid ${CORES.douradoBorda}`, margin: "12px 0" }} />
        {p.descricao_publica ? (
          <p style={{ ...tema.subtitulo, maxWidth: 560 }}>{p.descricao_publica}</p>
        ) : (
          <p style={{ ...tema.subtitulo, maxWidth: 560 }}>Descrição institucional em breve.</p>
        )}
      </header>

      <main style={tema.main}>
        <div style={tema.label}>Buscar memorial sob nossos cuidados</div>
        <BuscaMemorial parceiroId={p.id} />
      </main>

      <footer style={tema.footer}>
        <span style={{ fontFamily: "Georgia, serif" }}>Legado Digital</span>
        <span style={{ color: "#7a8a96", fontSize: 12 }}>Preservando histórias</span>
      </footer>
    </div>
  );
}
