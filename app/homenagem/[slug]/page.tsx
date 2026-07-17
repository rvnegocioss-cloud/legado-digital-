import Image from "next/image";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verificarTokenAcessoMemorial } from "@/lib/acessoMemorialSessao";
import { GateSenhaAcesso } from "@/components/public/GateSenhaAcesso";
import { AcenderVela } from "@/components/public/AcenderVela";
import { FormularioCondolencia } from "@/components/public/FormularioCondolencia";
import { GaleriaFotos } from "@/components/public/GaleriaFotos";
import GuiaTumulo from "@/components/public/GuiaTumuloCarregador";
import { CORES, anosDestaque, dataPtBr } from "@/lib/publicTheme";

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
  velas_acesas: number | null;
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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabase
    .from("homenagens")
    .select("nome_completo, foto_url, data_nascimento, data_falecimento")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return { title: "Memorial não encontrado — Legado Digital" };

  const periodo = anosDestaque(data.data_nascimento, data.data_falecimento);
  return {
    title: `${data.nome_completo} — Legado Digital`,
    description: periodo ? `Em memória de ${data.nome_completo} (${periodo})` : `Em memória de ${data.nome_completo}`,
    openGraph: {
      title: data.nome_completo,
      images: data.foto_url ? [data.foto_url] : undefined,
    },
  };
}

export default async function HomenagemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: homenagem } = await supabase
    .from("homenagens")
    .select(
      "id, nome_completo, data_nascimento, data_falecimento, cidade, frase_preferida, biografia, foto_url, video_url, galeria_fotos, timeline, velas_acesas"
    )
    .eq("slug", slug)
    .single();

  if (!homenagem) {
    return (
      <div style={estilos.vazioWrap}>
        <div style={estilos.vazioCard}>
          <p style={{ fontSize: 18, color: CORES.dourado, margin: 0 }}>Memorial não encontrado.</p>
          <p style={{ color: CORES.textoFraco, marginTop: 8 }}>Confira o endereço e tente novamente.</p>
        </div>
      </div>
    );
  }

  const m = homenagem as Homenagem;

  supabase.rpc("incrementar_visualizacao", { p_slug: slug }).then(() => {});

  const { data: seguranca } = await supabase
    .from("homenagens_busca_publica")
    .select("tem_senha, link_habilitado, qrcode_habilitado")
    .eq("slug", slug)
    .maybeSingle();

  if (seguranca && !seguranca.link_habilitado && !seguranca.qrcode_habilitado) {
    return (
      <div style={estilos.vazioWrap}>
        <div style={estilos.vazioCard}>
          <p style={{ fontSize: 18, color: CORES.dourado, margin: 0 }}>Acesso direto desativado.</p>
          <p style={{ color: CORES.textoFraco, marginTop: 8 }}>A família restringiu o acesso por link e QR Code deste memorial.</p>
        </div>
      </div>
    );
  }

  if (seguranca?.tem_senha) {
    const cookieStore = await cookies();
    const token = cookieStore.get(`mem_acesso_${slug}`)?.value;
    const acessoValido = verificarTokenAcessoMemorial(token, m.id);
    if (!acessoValido) {
      return <GateSenhaAcesso memorialId={m.id} nomeCompleto={m.nome_completo} />;
    }
  }

  const anos = anosDestaque(m.data_nascimento, m.data_falecimento);

  const { data: condolenciasData } = await supabase
    .from("condolencias")
    .select("id, visitor_name, message, created_at")
    .eq("homenagem_id", m.id)
    .order("created_at", { ascending: false });

  const condolencias = (condolenciasData || []) as Condolencia[];
  const timeline = Array.isArray(m.timeline) ? m.timeline : [];
  const galeria = Array.isArray(m.galeria_fotos) ? m.galeria_fotos.filter(Boolean) : [];

  const { data: localizacaoData } = await supabase
    .rpc("obter_localizacao_memorial", { p_slug: slug })
    .maybeSingle();
  const localizacao = localizacaoData as {
    cemiterio_nome: string;
    cemiterio_lat: number | null;
    cemiterio_lng: number | null;
    lapide_lat: number | null;
    lapide_lng: number | null;
    quadra: string | null;
    lote: string | null;
    identificacao: string | null;
  } | null;

  return (
    <div style={estilos.page}>
      <header style={estilos.hero}>
        <div style={estilos.fotoGlowWrap}>
          <div style={estilos.fotoGlow} />
          <div style={estilos.fotoRing}>
            <div style={estilos.fotoInner}>
              {m.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.foto_url} alt={m.nome_completo} style={estilos.foto} />
              ) : (
                <span style={estilos.monograma}>
                  {m.nome_completo
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={estilos.eyebrowLinha}>
          <span style={estilos.hairlineCurta} />
          <span style={estilos.eyebrow}>Em Memória</span>
          <span style={estilos.hairlineCurta} />
        </div>

        <h1 style={estilos.nome}>{m.nome_completo}</h1>
        {anos && <div style={estilos.anos}>{anos}</div>}
        {m.cidade && (
          <div style={estilos.cidade}>
            <MapPin size={14} strokeWidth={1.5} />
            <span>{m.cidade}</span>
          </div>
        )}

        {m.frase_preferida && (
          <div style={estilos.fraseWrap}>
            <span style={estilos.hairlineCurta} />
            <blockquote style={estilos.frase}>&ldquo;{m.frase_preferida}&rdquo;</blockquote>
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <AcenderVela slug={slug} velasIniciais={m.velas_acesas ?? 0} />
        </div>
      </header>

      <main style={estilos.main}>
        <section>
          <SecaoTitulo texto="Biografia" />
          <div style={estilos.card}>
            <p className="mem-bio" style={estilos.bio}>
              {m.biografia || "A biografia será adicionada em breve pela família."}
            </p>
          </div>
        </section>

        {m.video_url && (
          <section style={{ marginTop: 56 }}>
            <SecaoTitulo texto="Vídeo" />
            <div style={estilos.videoFrame}>
              {isYoutube(m.video_url) ? (
                <iframe
                  src={getEmbedUrl(m.video_url)}
                  style={{ width: "100%", height: "100%", border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  title="Vídeo"
                />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={m.video_url}
                  controls
                  preload="metadata"
                  poster={m.foto_url || undefined}
                  style={{ width: "100%", height: "100%", background: "#000" }}
                />
              )}
            </div>
          </section>
        )}

        {timeline.length > 0 && (
          <section style={{ marginTop: 56 }}>
            <SecaoTitulo texto="Linha do Tempo" />
            <div style={estilos.timelineWrap}>
              <div className="mem-timeline-espinha" style={estilos.timelineEspinha} />
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {timeline.map((ev, i) => (
                  <div key={i} style={estilos.timelineItem}>
                    <span style={estilos.timelineNo} />
                    <div>
                      {ev.year && <div style={estilos.timelineAno}>{ev.year}</div>}
                      {ev.title && <div style={estilos.timelineTitulo}>{ev.title}</div>}
                      {ev.description && <p style={estilos.timelineDesc}>{ev.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {galeria.length > 0 && (
          <section style={{ marginTop: 56 }}>
            <SecaoTitulo texto="Galeria" />
            <div style={{ marginTop: 14 }}>
              <GaleriaFotos fotos={galeria} />
            </div>
          </section>
        )}

        {localizacao?.cemiterio_lat != null && localizacao?.cemiterio_lng != null && (
          <section style={{ marginTop: 56 }}>
            <SecaoTitulo texto="Como Chegar" />
            <div style={{ marginTop: 14 }}>
              <GuiaTumulo
                cemiterioNome={localizacao.cemiterio_nome}
                cemiterioLat={localizacao.cemiterio_lat}
                cemiterioLng={localizacao.cemiterio_lng}
                lapideLat={localizacao.lapide_lat}
                lapideLng={localizacao.lapide_lng}
                quadra={localizacao.quadra}
                lote={localizacao.lote}
              />
            </div>
          </section>
        )}

        <section style={{ marginTop: 56 }}>
          <SecaoTitulo texto={`Condolências${condolencias.length > 0 ? ` (${condolencias.length})` : ""}`} />
          {condolencias.length === 0 ? (
            <p style={{ color: CORES.textoFraco, marginTop: 14, fontStyle: "italic" }}>
              Ainda não há condolências registradas.
            </p>
          ) : (
            <div style={estilos.condolenciasWrap}>
              {condolencias.map((c) => (
                <div key={c.id} style={estilos.condolenciaCard}>
                  <div style={estilos.condolenciaCabecalho}>
                    <span style={{ fontWeight: 600, color: CORES.textoForte }}>{c.visitor_name}</span>
                    <span style={estilos.condolenciaData}>{dataPtBr(c.created_at)}</span>
                  </div>
                  <p style={{ margin: "6px 0 0", color: CORES.textoCorpo, fontSize: 15 }}>{c.message}</p>
                </div>
              ))}
            </div>
          )}
          <FormularioCondolencia memorialId={m.id} />
        </section>
      </main>

      <footer style={estilos.footer}>
        <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={160} height={64} style={{ height: 32, width: "auto" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/politica-de-privacidade" style={{ color: CORES.textoFraco, fontSize: 12, textDecoration: "none" }}>Privacidade</a>
          <a href="/termos-de-uso" style={{ color: CORES.textoFraco, fontSize: 12, textDecoration: "none" }}>Termos</a>
        </div>
      </footer>
    </div>
  );
}

function SecaoTitulo({ texto }: { texto: string }) {
  return (
    <div>
      <h2 style={estilos.label}>{texto}</h2>
      <div style={estilos.hairline} />
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: `linear-gradient(180deg, ${CORES.fundoTopo} 0%, ${CORES.fundoBase} 100%)`,
    color: CORES.textoForte,
    fontFamily: "Georgia, 'Times New Roman', serif",
    lineHeight: 1.6,
  },
  hero: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "64px 20px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  fotoGlowWrap: { position: "relative", width: 188, height: 188, display: "flex", alignItems: "center", justifyContent: "center" },
  fotoGlow: {
    position: "absolute",
    inset: -30,
    background: CORES.glowHero,
  },
  fotoRing: {
    position: "relative",
    width: 188,
    height: 188,
    borderRadius: "50%",
    padding: 2,
    background: CORES.dourado,
  },
  fotoInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    background: CORES.fundoTopo,
    border: `4px solid ${CORES.fundoBase}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  foto: { width: "100%", height: "100%", objectFit: "cover" },
  monograma: { fontSize: 44, color: CORES.dourado, fontFamily: "Georgia, serif" },
  eyebrowLinha: { marginTop: 28, display: "flex", alignItems: "center", gap: 10 },
  hairlineCurta: { width: 24, height: 1, background: CORES.douradoBorda },
  eyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: CORES.dourado,
    fontWeight: 600,
  },
  nome: {
    fontSize: "clamp(34px, 6vw, 52px)",
    fontWeight: 400,
    margin: "10px 0 10px",
    lineHeight: 1.1,
    letterSpacing: -0.5,
  },
  anos: { fontSize: 20, color: CORES.dourado, marginBottom: 6 },
  cidade: { display: "inline-flex", alignItems: "center", gap: 6, color: CORES.textoFraco, fontSize: 15 },
  fraseWrap: { marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 },
  frase: {
    margin: 0,
    fontSize: 20,
    fontStyle: "italic",
    color: CORES.textoCorpo,
    maxWidth: 540,
    textAlign: "center",
  },
  main: { maxWidth: 720, margin: "0 auto", padding: "12px 20px 56px" },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: CORES.dourado,
    fontWeight: 600,
    margin: 0,
  },
  hairline: { marginTop: 10, height: 1, background: CORES.douradoBorda },
  card: {
    marginTop: 18,
    background: CORES.superficieCard,
    border: `1px solid ${CORES.douradoBorda}`,
    borderTop: `1px solid ${CORES.douradoBordaForte}`,
    borderRadius: 14,
    padding: 32,
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  bio: { fontSize: 16.5, lineHeight: 1.85, color: CORES.textoCorpo, whiteSpace: "pre-wrap" },
  videoFrame: {
    marginTop: 18,
    aspectRatio: "16/9",
    borderRadius: 14,
    overflow: "hidden",
    border: `1px solid ${CORES.douradoBorda}`,
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  },
  timelineWrap: { marginTop: 18, position: "relative", paddingLeft: 24 },
  timelineEspinha: { position: "absolute", left: 4, top: 0, bottom: 0, width: 2, background: CORES.dourado },
  timelineItem: { position: "relative", display: "flex", flexDirection: "column" },
  timelineNo: {
    position: "absolute",
    left: -24,
    top: 6,
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: CORES.dourado,
    boxShadow: `0 0 0 3px ${CORES.fundoBase}`,
  },
  timelineAno: { color: CORES.dourado, fontSize: 24, fontFamily: "Georgia, serif", lineHeight: 1 },
  timelineTitulo: { fontSize: 17, marginTop: 6, color: CORES.textoForte },
  timelineDesc: { color: CORES.textoFraco, fontSize: 14.5, marginTop: 4, lineHeight: 1.6 },
  condolenciasWrap: { marginTop: 18, display: "flex", flexDirection: "column", gap: 12 },
  condolenciaCard: {
    background: CORES.superficieCard,
    borderLeft: `2px solid ${CORES.dourado}`,
    border: `1px solid ${CORES.douradoBorda}`,
    borderRadius: 10,
    padding: 16,
  },
  condolenciaCabecalho: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" },
  condolenciaData: { fontSize: 12, color: CORES.textoFraco },
  footer: {
    borderTop: `1px solid ${CORES.douradoBorda}`,
    maxWidth: 720,
    margin: "0 auto",
    padding: "28px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  vazioWrap: {
    minHeight: "100vh",
    background: CORES.fundoBase,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  vazioCard: { textAlign: "center", fontFamily: "Georgia, serif" },
};
