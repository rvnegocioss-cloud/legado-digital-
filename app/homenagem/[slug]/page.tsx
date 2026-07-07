import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface Homenagem {
  nome_completo: string;
  data_nascimento: string | null;
  data_falecimento: string | null;
  cidade: string | null;
  frase_preferida: string | null;
  biografia: string | null;
  foto_url: string | null;
}

export default async function HomenagemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: homenagem } = await supabase
    .from("homenagens")
    .select("nome_completo, data_nascimento, data_falecimento, cidade, frase_preferida, biografia, foto_url")
    .eq("slug", slug)
    .single();

  if (!homenagem) {
    return (
      <div style={estilos.vazioWrap}>
        <div style={estilos.vazioCard}>
          <p style={{ fontSize: 18, color: "#C9A46A", margin: 0 }}>Memorial não encontrado.</p>
          <p style={{ color: "#7a8a96", marginTop: 8 }}>Confira o endereço e tente novamente.</p>
        </div>
      </div>
    );
  }

  const m = homenagem as Homenagem;
  const periodo = [m.data_nascimento, m.data_falecimento].filter(Boolean).join(" — ");

  return (
    <div style={estilos.page}>
      <header style={estilos.hero}>
        <div style={estilos.fotoRing}>
          <div style={estilos.fotoInner}>
            {m.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.foto_url} alt={m.nome_completo} style={estilos.foto} />
            ) : (
              <span style={{ color: "#7a8a96", fontSize: 14 }}>Sem foto</span>
            )}
          </div>
        </div>

        <div style={estilos.eyebrow}>Em Memória</div>
        <h1 style={estilos.nome}>{m.nome_completo}</h1>
        {periodo && <div style={estilos.periodo}>{periodo}</div>}
        {m.cidade && <div style={estilos.cidade}>📍 {m.cidade}</div>}

        {m.frase_preferida && (
          <blockquote style={estilos.frase}>&ldquo;{m.frase_preferida}&rdquo;</blockquote>
        )}
      </header>

      <main style={estilos.main}>
        <section style={estilos.card}>
          <div style={estilos.label}>Biografia</div>
          <p style={estilos.bio}>
            {m.biografia || "A biografia será adicionada em breve pela família."}
          </p>
        </section>
      </main>

      <footer style={estilos.footer}>
        <span style={{ fontFamily: "Georgia, serif" }}>Legado Digital</span>
        <span style={{ color: "#7a8a96", fontSize: 12 }}>Preservando histórias</span>
      </footer>
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0f2436 0%, #0B1D2A 100%)",
    color: "#F5F2EB",
    fontFamily: "Georgia, 'Times New Roman', serif",
    lineHeight: 1.6,
  },
  hero: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "56px 20px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  fotoRing: {
    width: 160,
    height: 160,
    borderRadius: "50%",
    padding: 4,
    background: "conic-gradient(from 0deg, #C9A46A, #dfc08a, #a8834a, #C9A46A)",
  },
  fotoInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    background: "#0f2436",
    border: "3px solid #0B1D2A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  foto: { width: "100%", height: "100%", objectFit: "cover" },
  eyebrow: {
    marginTop: 24,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "#C9A46A",
    fontWeight: 600,
  },
  nome: { fontSize: 40, fontWeight: 400, margin: "8px 0 12px", lineHeight: 1.1 },
  periodo: { fontSize: 20, color: "#C9A46A", marginBottom: 8 },
  cidade: { color: "#7a8a96", fontSize: 15 },
  frase: {
    margin: "24px 0 0",
    padding: "0 0 0 20px",
    borderLeft: "3px solid #C9A46A",
    fontSize: 20,
    fontStyle: "italic",
    color: "#b0c0cc",
    maxWidth: 560,
  },
  main: { maxWidth: 720, margin: "0 auto", padding: "12px 20px 48px" },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(201,164,106,0.18)",
    borderRadius: 12,
    padding: 28,
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "#C9A46A",
    fontWeight: 600,
  },
  bio: { marginTop: 14, fontSize: 16, lineHeight: 1.8, color: "#b0c0cc", whiteSpace: "pre-wrap" },
  footer: {
    borderTop: "1px solid rgba(201,164,106,0.18)",
    maxWidth: 720,
    margin: "0 auto",
    padding: "28px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vazioWrap: {
    minHeight: "100vh",
    background: "#0B1D2A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  vazioCard: { textAlign: "center", fontFamily: "Georgia, serif" },
};
