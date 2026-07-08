import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface TimelineEvent {
  year?: string;
  title?: string;
  description?: string;
}

interface Homenagem {
  id: string;
  nome_completo: string;
  data_nascimento: string | null;
  data_falecimento: string | null;
  cidade: string | null;
  frase_preferida: string | null;
  biografia: string | null;
  foto_url: string | null;
  video_url: string | null;
  galeria_fotos: string[] | null;
  timeline: TimelineEvent[] | null;
}

interface Condolencia {
  id: string;
  visitor_name: string;
  message: string;
  created_at: string;
}

function getEmbedUrl(url: string) {
  const m = url.match(/(?:youtube\.com.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

function isYoutube(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

export default async function HomenagemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: homenagem } = await supabase
    .from("homenagens")
    .select(
      "id, nome_completo, data_nascimento, data_falecimento, cidade, frase_preferida, biografia, foto_url, video_url, galeria_fotos, timeline"
    )
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

  const { data: condolenciasData } = await supabase
    .from("condolencias")
    .select("id, visitor_name, message, created_at")
    .eq("homenagem_id", m.id)
    .order("created_at", { ascending: false });

  const condolencias = (condolenciasData || []) as Condolencia[];
  const timeline = Array.isArray(m.timeline) ? m.timeline : [];
  const galeria = Array.isArray(m.galeria_fotos) ? m.galeria_fotos.filter(Boolean) : [];

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

        {m.video_url && (
          <section style={{ ...estilos.card, marginTop: 24, padding: 12 }}>
            <div style={{ aspectRatio: "16/9", borderRadius: 8, overflow: "hidden" }}>
              {isYoutube(m.video_url) ? (
                <iframe
                  src={getEmbedUrl(m.video_url)}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  allowFullScreen
                  title="Vídeo"
                />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={m.video_url}
                  controls
                  style={{ width: "100%", height: "100%", background: "#000" }}
                />
              )}
            </div>
          </section>
        )}

        {timeline.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <div style={estilos.label}>Linha do Tempo</div>
            <div style={estilos.timelineWrap}>
              {timeline.map((ev, i) => (
                <div key={i}>
                  {ev.year && <div style={estilos.timelineAno}>{ev.year}</div>}
                  {ev.title && <div style={estilos.timelineTitulo}>{ev.title}</div>}
                  {ev.description && <p style={estilos.timelineDesc}>{ev.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {galeria.length > 0 && (
          <section style={{ marginTop: 32 }}>
            <div style={estilos.label}>Galeria</div>
            <div style={estilos.galeriaGrid}>
              {galeria.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt={`Foto ${i + 1}`} style={estilos.galeriaFoto} />
              ))}
            </div>
          </section>
        )}

        <section style={{ marginTop: 32 }}>
          <div style={estilos.label}>
            Condolências {condolencias.length > 0 && `(${condolencias.length})`}
          </div>
          {condolencias.length === 0 ? (
            <p style={{ color: "#7a8a96", marginTop: 14 }}>Ainda não há condolências registradas.</p>
          ) : (
            <div style={estilos.condolenciasWrap}>
              {condolencias.map((c) => (
                <div key={c.id} style={estilos.condolenciaCard}>
                  <div style={{ fontWeight: 600, color: "#F5F2EB" }}>{c.visitor_name}</div>
                  <p style={{ margin: "6px 0 0", color: "#b0c0cc", fontSize: 15 }}>{c.message}</p>
                </div>
              ))}
            </div>
          )}
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
  timelineWrap: {
    marginTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    borderLeft: "2px solid #C9A46A",
    paddingLeft: 20,
  },
  timelineAno: { color: "#C9A46A", fontSize: 14, fontWeight: 600 },
  timelineTitulo: { fontSize: 17, marginTop: 2 },
  timelineDesc: { color: "#7a8a96", fontSize: 14, marginTop: 4 },
  galeriaGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 10,
  },
  galeriaFoto: { width: "100%", height: 140, objectFit: "cover", borderRadius: 8 },
  condolenciasWrap: { marginTop: 14, display: "flex", flexDirection: "column", gap: 12 },
  condolenciaCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(201,164,106,0.18)",
    borderRadius: 10,
    padding: 16,
  },
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
