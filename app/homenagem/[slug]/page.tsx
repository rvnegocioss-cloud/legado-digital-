import Image from "next/image";
import { MapPin, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verificarTokenAcessoMemorial } from "@/lib/acessoMemorialSessao";
import { GateSenhaAcesso } from "@/components/public/GateSenhaAcesso";
import { AcenderVela } from "@/components/public/AcenderVela";
import { FormularioCondolencia } from "@/components/public/FormularioCondolencia";
import { GaleriaFotos } from "@/components/public/GaleriaFotos";
import GuiaTumulo from "@/components/public/GuiaTumuloCarregador";
import { SeletorTema } from "@/components/public/SeletorTema";
import { FaixaPresencaViva } from "@/components/public/FaixaPresencaViva";
import { ResumoPoucasPalavras } from "@/components/public/ResumoPoucasPalavras";
import { MuralMemorias } from "@/components/public/MuralMemorias";
import { BotaoCompartilhar } from "@/components/public/BotaoCompartilhar";
import { CORES, anosDestaque, dataPtBr } from "@/lib/publicTheme";
import { VAR_FUNDO_TOPO, VAR_FUNDO_BASE, VAR_DOURADO } from "@/lib/temasMemorial";

// var CSS com fallback pro valor oficial navy+dourado — SeletorTema.tsx sobrescreve
// em runtime via document.documentElement.style.setProperty(), sem reload.
const v = (nomeVar: string, valorPadrao: string) => `var(${nomeVar}, ${valorPadrao})`;

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
  const timeline = Array.isArray(m.timeline) ? m.timeline : [];
  const galeria = Array.isArray(m.galeria_fotos) ? m.galeria_fotos.filter(Boolean) : [];

  // 3 consultas independentes (dependem só de m.id/slug) — rodam em paralelo
  // em vez de em série, cortando 3 idas de rede pra 1.
  const [{ data: condolenciasData }, { data: muralData }, { data: localizacaoData }] = await Promise.all([
    supabase
      .from("condolencias")
      .select("id, visitor_name, message, created_at")
      .eq("homenagem_id", m.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("mural_memorias")
      .select("id, nome, parentesco, texto, foto_url, coracoes, created_at")
      .eq("homenagem_id", m.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("obter_localizacao_memorial", { p_slug: slug }).maybeSingle(),
  ]);

  const condolencias = (condolenciasData || []) as Condolencia[];
  const mural = muralData || [];
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
      <SeletorTema />

      <nav className="mem-container" style={estilos.nav}>
        <div style={estilos.navLinks}>
          <a href="#biografia" style={estilos.navLink}>Sobre</a>
          <a href="#timeline" style={estilos.navLink}>Linha do Tempo</a>
          <a href="#homenagens" style={estilos.navLink}>Homenagens</a>
          <a href="#livro" style={estilos.navLink}>Livro</a>
          <a href="#galeria" style={estilos.navLink}>Fotos e Vídeos</a>
          <a href="#localizacao" style={estilos.navLink}>Localização</a>
        </div>
        <div style={estilos.navAcoes}>
          <a href="#homenagens" style={estilos.navBotaoFantasma}>Deixar homenagem</a>
          <a href="#livro" style={estilos.navBotaoDourado}>Assinar livro</a>
          <BotaoCompartilhar nome={m.nome_completo} />
        </div>
      </nav>

      <header className="mem-hero mem-container" style={estilos.hero}>
        <div className="mem-hero-ring" style={estilos.fotoGlowWrap}>
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

        <div className="mem-hero-texto">
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
        </div>
      </header>

      <FaixaPresencaViva
        velas={m.velas_acesas ?? 0}
        homenagens={condolencias.length}
        memorias={mural.length + galeria.length}
      />

      <main className="mem-container" style={estilos.main}>
        <section id="biografia">
          <SecaoTitulo texto="Biografia" />
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "2.2fr 1fr",
              gap: 24,
              alignItems: "start",
            }}
            className="mem-bio-grid"
          >
            <div style={{ ...estilos.card, marginTop: 0 }}>
              <p className="mem-bio" style={estilos.bio}>
                {m.biografia || "A biografia será adicionada em breve pela família."}
              </p>
            </div>
            <ResumoPoucasPalavras
              cidade={m.cidade}
              anos={anos || null}
              totalTimeline={timeline.length}
              totalFotos={galeria.length}
            />
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
          <section id="timeline" style={{ marginTop: 56 }}>
            <SecaoTitulo texto="Uma Vida" />
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
          <section id="galeria" style={{ marginTop: 56 }}>
            <SecaoTitulo texto="Galeria" />
            <div style={{ marginTop: 14 }}>
              <GaleriaFotos fotos={galeria} />
            </div>
          </section>
        )}

        <section id="homenagens" style={{ marginTop: 56 }}>
          <SecaoTitulo texto="Mural de Memórias" />
          <div style={{ marginTop: 14 }}>
            <MuralMemorias memorialId={m.id} memoriasIniciais={mural} />
          </div>
        </section>

        {localizacao?.cemiterio_lat != null && localizacao?.cemiterio_lng != null && (
          <section id="localizacao" style={{ marginTop: 56 }}>
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

        <section id="livro" style={{ marginTop: 56 }}>
          <SecaoTitulo texto={`Livro de Assinaturas${condolencias.length > 0 ? ` (${condolencias.length})` : ""}`} />
          <p style={{ color: CORES.textoFraco, fontSize: 14, marginTop: 10 }}>
            Assine e deixe sua mensagem — um registro permanente de carinho.
          </p>
          {condolencias.length === 0 ? (
            <p style={{ color: CORES.textoFraco, marginTop: 14, fontStyle: "italic" }}>
              Ainda ninguém assinou o livro.
            </p>
          ) : (
            <div style={{ ...estilos.condolenciasWrap, marginTop: 18 }}>
              {condolencias.map((c) => (
                <div key={c.id} style={estilos.condolenciaCard}>
                  <p style={{ margin: 0, color: CORES.textoCorpo, fontSize: 15 }}>{c.message}</p>
                  <div style={estilos.assinaturaLinha}>
                    <span style={estilos.assinatura}>{c.visitor_name}</span>
                    <span style={estilos.condolenciaData}>{dataPtBr(c.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <FormularioCondolencia memorialId={m.id} />
        </section>

        <section style={{ marginTop: 56, textAlign: "center" }}>
          <SecaoTitulo texto="Acender uma vela" />
          <p style={{ color: CORES.textoFraco, fontSize: 14, marginTop: 10, marginBottom: 24 }}>
            Em memória de {m.nome_completo}
          </p>
          <AcenderVela slug={slug} velasIniciais={m.velas_acesas ?? 0} />
        </section>
      </main>

      <footer className="mem-container" style={estilos.footer}>
        <Image src="/logo-legado-digital.svg" alt="Legado Digital" width={160} height={64} style={{ height: 44, width: "auto" }} />
        <div style={estilos.selosWrap}>
          <span style={estilos.selo}>
            <ShieldCheck size={14} strokeWidth={1.5} />
            Privacidade garantida
          </span>
          <span style={estilos.selo}>
            <Lock size={14} strokeWidth={1.5} />
            Homenagens passam por moderação
          </span>
        </div>
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
    background: `linear-gradient(180deg, ${v(VAR_FUNDO_TOPO, CORES.fundoTopo)} 0%, ${v(VAR_FUNDO_BASE, CORES.fundoBase)} 100%)`,
    color: CORES.textoForte,
    fontFamily: "Georgia, 'Times New Roman', serif",
    lineHeight: 1.6,
  },
  nav: {
    margin: "0 auto",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    borderBottom: `1px solid ${CORES.douradoBorda}`,
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: v(VAR_FUNDO_TOPO, CORES.fundoTopo),
  },
  navLinks: { display: "flex", flexWrap: "wrap", gap: 18 },
  navLink: { color: CORES.textoFraco, fontSize: 12.5, textDecoration: "none", letterSpacing: 0.3 },
  navAcoes: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  navBotaoFantasma: {
    color: CORES.textoFraco,
    fontSize: 12,
    textDecoration: "none",
    border: `1px solid ${CORES.douradoBorda}`,
    padding: "8px 14px",
    borderRadius: 4,
    whiteSpace: "nowrap",
  },
  navBotaoDourado: {
    color: v(VAR_FUNDO_TOPO, CORES.fundoTopo),
    background: v(VAR_DOURADO, CORES.dourado),
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
    padding: "8px 14px",
    borderRadius: 4,
    whiteSpace: "nowrap",
  },
  hero: {
    margin: "0 auto",
    padding: "64px 20px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  fotoGlowWrap: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center" },
  fotoGlow: {
    position: "absolute",
    inset: -30,
    background: CORES.glowHero,
  },
  fotoRing: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    padding: 2,
    background: v(VAR_DOURADO, CORES.dourado),
  },
  fotoInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    background: v(VAR_FUNDO_TOPO, CORES.fundoTopo),
    border: `4px solid ${v(VAR_FUNDO_BASE, CORES.fundoBase)}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  foto: { width: "100%", height: "100%", objectFit: "cover" },
  monograma: { fontSize: "clamp(40px, 6vw, 56px)", color: v(VAR_DOURADO, CORES.dourado), fontFamily: "Georgia, serif" },
  eyebrowLinha: { marginTop: 28, display: "flex", alignItems: "center", gap: 10 },
  hairlineCurta: { width: 24, height: 1, background: CORES.douradoBorda },
  eyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: v(VAR_DOURADO, CORES.dourado),
    fontWeight: 600,
  },
  nome: {
    fontSize: "clamp(34px, 6vw, 52px)",
    fontWeight: 400,
    margin: "10px 0 10px",
    lineHeight: 1.1,
    letterSpacing: -0.5,
  },
  anos: { fontSize: 20, color: v(VAR_DOURADO, CORES.dourado), marginBottom: 6 },
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
  main: { margin: "0 auto", padding: "12px 20px 56px" },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: v(VAR_DOURADO, CORES.dourado),
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
  timelineEspinha: { position: "absolute", left: 4, top: 0, bottom: 0, width: 2, background: v(VAR_DOURADO, CORES.dourado) },
  timelineItem: { position: "relative", display: "flex", flexDirection: "column" },
  timelineNo: {
    position: "absolute",
    left: -24,
    top: 6,
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: v(VAR_DOURADO, CORES.dourado),
    boxShadow: `0 0 0 3px ${v(VAR_FUNDO_BASE, CORES.fundoBase)}`,
  },
  timelineAno: { color: v(VAR_DOURADO, CORES.dourado), fontSize: 24, fontFamily: "Georgia, serif", lineHeight: 1 },
  timelineTitulo: { fontSize: 17, marginTop: 6, color: CORES.textoForte },
  timelineDesc: { color: CORES.textoFraco, fontSize: 14.5, marginTop: 4, lineHeight: 1.6 },
  condolenciasWrap: { marginTop: 18, display: "flex", flexDirection: "column", gap: 12 },
  condolenciaCard: {
    background: CORES.superficieCard,
    borderLeft: `2px solid ${v(VAR_DOURADO, CORES.dourado)}`,
    border: `1px solid ${CORES.douradoBorda}`,
    borderRadius: 10,
    padding: 16,
  },
  condolenciaCabecalho: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" },
  condolenciaData: { fontSize: 12, color: CORES.textoFraco },
  assinaturaLinha: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: `1px dashed ${CORES.douradoBorda}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    flexWrap: "wrap",
  },
  assinatura: {
    fontFamily: "var(--font-assinatura), cursive",
    fontSize: 26,
    color: v(VAR_DOURADO, CORES.dourado),
    lineHeight: 1,
  },
  selosWrap: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18 },
  selo: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: CORES.textoFraco },
  footer: {
    borderTop: `1px solid ${CORES.douradoBorda}`,
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
