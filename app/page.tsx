"use client";

import { useState, useRef } from "react";

export interface TimelineEvent {
  year: string;
  title: string;
  description?: string;
}

export interface Condolence {
  id: string;
  visitorName: string;
  message: string;
  createdAt: string;
}

export type ThemeKey = "noturno" | "nevoa" | "aurora";

export interface HomenagemProps {
  fotoUrl?: string;
  nomeCompleto: string;
  dataNascimento: string;
  dataFalecimento: string;
  cidade?: string;
  frasePreferida?: string;
  biografia?: string;
  timeline?: TimelineEvent[];
  galeriaFotos?: string[];
  videoUrl?: string;
  musicaUrl?: string;
  condolencias?: Condolence[];
  temaPadrao?: ThemeKey;
}

const temas = {
  noturno: {
    bg: "#1a1917",
    bgCard: "rgba(255,255,255,0.03)",
    bgInput: "rgba(255,255,255,0.05)",
    text: "#e8e2d9",
    textMuted: "#9a9085",
    border: "rgba(184,151,58,0.2)",
    gold: "#b8973a",
    goldLight: "#d4af6a",
    nome: "Noturno",
    barBg: "rgba(26,25,23,0.92)",
    altarCandle: "rgba(184,151,58,0.18)",
    altarGlow: "rgba(184,151,58,0.08)",
  },
  nevoa: {
    bg: "#eae8e4",
    bgCard: "rgba(0,0,0,0.04)",
    bgInput: "rgba(0,0,0,0.05)",
    text: "#2c2820",
    textMuted: "#7a7068",
    border: "rgba(120,90,40,0.2)",
    gold: "#8a6830",
    goldLight: "#b08840",
    nome: "Névoa",
    barBg: "rgba(234,232,228,0.92)",
    altarCandle: "rgba(120,90,40,0.12)",
    altarGlow: "rgba(120,90,40,0.06)",
  },
  aurora: {
    bg: "#f5ede8",
    bgCard: "rgba(180,100,80,0.04)",
    bgInput: "rgba(180,100,80,0.06)",
    text: "#2e1a14",
    textMuted: "#9a7060",
    border: "rgba(180,120,100,0.25)",
    gold: "#c08060",
    goldLight: "#d4a080",
    nome: "Aurora",
    barBg: "rgba(245,237,232,0.92)",
    altarCandle: "rgba(180,120,100,0.15)",
    altarGlow: "rgba(180,120,100,0.07)",
  },
};

// ---------------------------------------------------------------------------
// FUNDO ALTAR
// ---------------------------------------------------------------------------
const AltarBackground = ({ t }: { t: typeof temas.noturno }) => (
  <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
    {/* Vela esquerda */}
    <div style={{ position: "absolute", left: "6%", bottom: 0, width: 2, height: "45vh", background: `linear-gradient(to top, ${t.altarCandle}, transparent)` }} />
    <div style={{ position: "absolute", left: "calc(6% - 8px)", bottom: "45vh", width: 18, height: 28, background: `radial-gradient(ellipse, ${t.gold}cc 0%, ${t.gold}44 50%, transparent 80%)`, borderRadius: "50%", filter: "blur(3px)", animation: "flickerBg 2.2s ease-in-out infinite alternate" }} />
    <div style={{ position: "absolute", left: "calc(6% - 40px)", bottom: 0, width: 80, height: "50vh", background: `radial-gradient(ellipse at center bottom, ${t.altarCandle} 0%, transparent 70%)`, filter: "blur(8px)" }} />

    {/* Vela direita */}
    <div style={{ position: "absolute", right: "6%", bottom: 0, width: 2, height: "45vh", background: `linear-gradient(to top, ${t.altarCandle}, transparent)` }} />
    <div style={{ position: "absolute", right: "calc(6% - 8px)", bottom: "45vh", width: 18, height: 28, background: `radial-gradient(ellipse, ${t.gold}cc 0%, ${t.gold}44 50%, transparent 80%)`, borderRadius: "50%", filter: "blur(3px)", animation: "flickerBg 2.8s ease-in-out infinite alternate" }} />
    <div style={{ position: "absolute", right: "calc(6% - 40px)", bottom: 0, width: 80, height: "50vh", background: `radial-gradient(ellipse at center bottom, ${t.altarCandle} 0%, transparent 70%)`, filter: "blur(8px)" }} />

    {/* Luz central de baixo */}
    <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: "30vh", background: `radial-gradient(ellipse at center bottom, ${t.altarGlow} 0%, transparent 70%)`, filter: "blur(12px)" }} />

    {/* Velas menores de fundo */}
    <div style={{ position: "absolute", left: "18%", bottom: 0, width: 1.5, height: "30vh", background: `linear-gradient(to top, ${t.altarCandle}88, transparent)` }} />
    <div style={{ position: "absolute", left: "calc(18% - 6px)", bottom: "30vh", width: 12, height: 18, background: `radial-gradient(ellipse, ${t.gold}99 0%, transparent 80%)`, borderRadius: "50%", filter: "blur(2px)", animation: "flickerBg 3.1s ease-in-out infinite alternate" }} />

    <div style={{ position: "absolute", right: "18%", bottom: 0, width: 1.5, height: "30vh", background: `linear-gradient(to top, ${t.altarCandle}88, transparent)` }} />
    <div style={{ position: "absolute", right: "calc(18% - 6px)", bottom: "30vh", width: 12, height: 18, background: `radial-gradient(ellipse, ${t.gold}99 0%, transparent 80%)`, borderRadius: "50%", filter: "blur(2px)", animation: "flickerBg 2.5s ease-in-out infinite alternate" }} />
  </div>
);

// ---------------------------------------------------------------------------
// SVG — ORNAMENTO FOTO (círculo + ramos + cruz)
// ---------------------------------------------------------------------------
const FotoOrnamento = ({ color, tamanho }: { color: string; tamanho: number }) => {
  const r = tamanho / 2;
  return (
    <svg
      width={tamanho + 120}
      height={tamanho + 120}
      viewBox={`0 0 ${tamanho + 120} ${tamanho + 120}`}
      fill="none"
      style={{ position: "absolute", top: -60, left: -60, pointerEvents: "none" }}
    >
      {/* Círculo */}
      <circle cx={r + 60} cy={r + 60} r={r + 8} stroke={color} strokeWidth="1" strokeOpacity="0.45" />

      {/* Ramo canto superior direito */}
      <g transform={`translate(${r + 60 + r * 0.55}, ${r + 60 - r * 0.55}) rotate(-30)`}>
        <line x1="0" y1="0" x2="32" y2="-18" stroke={color} strokeWidth="1.2" strokeOpacity="0.6" strokeLinecap="round"/>
        <line x1="8" y1="-4" x2="18" y2="-16" stroke={color} strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round"/>
        <line x1="16" y1="-9" x2="28" y2="-20" stroke={color} strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round"/>
        <ellipse cx="20" cy="-17" rx="5" ry="3" transform="rotate(-20 20 -17)" fill={color} fillOpacity="0.3"/>
        <ellipse cx="30" cy="-21" rx="4" ry="2.5" transform="rotate(-35 30 -21)" fill={color} fillOpacity="0.28"/>
        <ellipse cx="10" cy="-15" rx="4" ry="2.5" transform="rotate(-10 10 -15)" fill={color} fillOpacity="0.25"/>
        <circle cx="20" cy="-17" r="1.5" fill={color} fillOpacity="0.5"/>
        <circle cx="30" cy="-21" r="1.2" fill={color} fillOpacity="0.45"/>
        {/* folhinhas coração */}
        <path d="M23,-14 Q25,-11 23,-9 Q21,-11 23,-14Z" fill={color} fillOpacity="0.35"/>
        <path d="M32,-18 Q34,-15 32,-13 Q30,-15 32,-18Z" fill={color} fillOpacity="0.3"/>
        <path d="M14,-19 Q16,-16 14,-14 Q12,-16 14,-19Z" fill={color} fillOpacity="0.3"/>
      </g>

      {/* Ramo canto inferior esquerdo */}
      <g transform={`translate(${r + 60 - r * 0.55}, ${r + 60 + r * 0.55}) rotate(150)`}>
        <line x1="0" y1="0" x2="32" y2="-18" stroke={color} strokeWidth="1.2" strokeOpacity="0.6" strokeLinecap="round"/>
        <line x1="8" y1="-4" x2="18" y2="-16" stroke={color} strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round"/>
        <line x1="16" y1="-9" x2="28" y2="-20" stroke={color} strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round"/>
        <ellipse cx="20" cy="-17" rx="5" ry="3" transform="rotate(-20 20 -17)" fill={color} fillOpacity="0.3"/>
        <ellipse cx="30" cy="-21" rx="4" ry="2.5" transform="rotate(-35 30 -21)" fill={color} fillOpacity="0.28"/>
        <ellipse cx="10" cy="-15" rx="4" ry="2.5" transform="rotate(-10 10 -15)" fill={color} fillOpacity="0.25"/>
        <circle cx="20" cy="-17" r="1.5" fill={color} fillOpacity="0.5"/>
        <circle cx="30" cy="-21" r="1.2" fill={color} fillOpacity="0.45"/>
        <path d="M23,-14 Q25,-11 23,-9 Q21,-11 23,-14Z" fill={color} fillOpacity="0.35"/>
        <path d="M32,-18 Q34,-15 32,-13 Q30,-15 32,-18Z" fill={color} fillOpacity="0.3"/>
        <path d="M14,-19 Q16,-16 14,-14 Q12,-16 14,-19Z" fill={color} fillOpacity="0.3"/>
      </g>

      {/* Cruz abaixo da foto */}
      <line x1={r + 60} y1={r * 2 + 78} x2={r + 60} y2={r * 2 + 108} stroke={color} strokeWidth="1.2" strokeOpacity="0.55" strokeLinecap="round"/>
      <line x1={r + 60 - 10} y1={r * 2 + 88} x2={r + 60 + 10} y2={r * 2 + 88} stroke={color} strokeWidth="1.2" strokeOpacity="0.55" strokeLinecap="round"/>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------
export default function HomenagemTemplate({
  fotoUrl,
  nomeCompleto,
  dataNascimento,
  dataFalecimento,
  cidade,
  frasePreferida,
  biografia,
  timeline = [],
  galeriaFotos = [],
  videoUrl,
  musicaUrl,
  condolencias: initialCondolences = [],
  temaPadrao = "noturno",
}: HomenagemProps) {

  const [tema, setTema] = useState<ThemeKey>(temaPadrao);
  const [tocando, setTocando] = useState(false);
  const [condolencias, setCondolencias] = useState<Condolence[]>(initialCondolences);
  const [visitorName, setVisitorName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const t = temas[tema];
  const FOTO_SIZE = 180;

  const toggleMusica = () => {
    if (!audioRef.current) return;
    if (tocando) { audioRef.current.pause(); setTocando(false); }
    else { audioRef.current.play(); setTocando(true); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      // TODO: Integrar com Supabase
      await new Promise((r) => setTimeout(r, 600));
      const nova: Condolence = { id: crypto.randomUUID(), visitorName, message, createdAt: new Date().toISOString() };
      setCondolencias((prev) => [nova, ...prev]);
      setVisitorName("");
      setMessage("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const compartilhar = () => {
    if (navigator.share) navigator.share({ title: `Homenagem — ${nomeCompleto}`, url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); alert("Link copiado!"); }
  };

  const getEmbedUrl = (url: string) => {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return yt ? `https://www.youtube.com/embed/${yt[1]}` : url;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const s = {
    divider: { background: `linear-gradient(90deg, transparent, ${t.gold}, transparent)`, height: 1, opacity: 0.5 } as React.CSSProperties,
    card: { background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 4 } as React.CSSProperties,
    input: { background: t.bgInput, border: `1px solid ${t.border}`, color: t.text, borderRadius: 4, padding: "12px 16px", width: "100%", fontFamily: "'Lato', sans-serif", fontSize: 14, outline: "none" } as React.CSSProperties,
    btn: { background: `linear-gradient(135deg, ${t.gold}, ${t.goldLight})`, color: "#1a1410", border: "none", borderRadius: 4, padding: "13px 24px", fontFamily: "'Lato', sans-serif", fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase" as const, cursor: "pointer", width: "100%", fontWeight: 700 } as React.CSSProperties,
    label: { color: t.gold, fontSize: "0.65rem", letterSpacing: "0.35em", textTransform: "uppercase" as const, fontFamily: "'Lato', sans-serif" } as React.CSSProperties,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Lato:wght@300;400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .fd { font-family: 'Cormorant Garamond', serif; }
        .fade-up { animation: fadeUp 1s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes flickerBg {
          0%   { opacity: 0.6; transform: scale(1) translateY(0); }
          33%  { opacity: 1;   transform: scale(1.15) translateY(-2px); }
          66%  { opacity: 0.8; transform: scale(0.95) translateY(1px); }
          100% { opacity: 0.9; transform: scale(1.05) translateY(-1px); }
        }
        .gallery-img { transition: transform 0.5s, filter 0.5s; filter: grayscale(15%); display: block; width: 100%; height: 100%; object-fit: cover; }
        .gallery-img:hover { transform: scale(1.04); filter: grayscale(0%); }
        textarea, input { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(184,151,58,0.25); border-radius: 3px; }
      `}</style>

      {musicaUrl && <audio ref={audioRef} src={musicaUrl} loop />}

      <div style={{ position: "relative", backgroundColor: t.bg, color: t.text, minHeight: "100vh", fontFamily: "'Lato', sans-serif", transition: "background 0.6s, color 0.4s" }}>

        <AltarBackground t={t} />

        {/* Conteúdo acima do altar */}
        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ============================================================
              BARRA SUPERIOR
          ============================================================ */}
          <div style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(14px)", background: t.barBg, borderBottom: `1px solid ${t.border}`, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="fd" style={{ color: t.gold, fontSize: "0.65rem", letterSpacing: "0.45em", textTransform: "uppercase" }}>
              Legado Digital
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Temas */}
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                {(["noturno", "nevoa", "aurora"] as ThemeKey[]).map((k) => (
                  <button key={k} title={temas[k].nome} onClick={() => setTema(k)} style={{ width: 16, height: 16, borderRadius: "50%", cursor: "pointer", border: tema === k ? `2px solid ${t.gold}` : `2px solid transparent`, background: k === "noturno" ? "#1a1917" : k === "nevoa" ? "#eae8e4" : "#f5ede8", outline: tema === k ? `1px solid ${t.gold}44` : "none", transition: "border 0.3s, transform 0.2s", transform: tema === k ? "scale(1.2)" : "scale(1)" }} />
                ))}
              </div>
              {/* Música */}
              {musicaUrl && (
                <button onClick={toggleMusica} title={tocando ? "Pausar" : "Tocar música"} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {tocando
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill={t.gold}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill={t.gold}><polygon points="5,3 19,12 5,21"/></svg>
                  }
                </button>
              )}
              {/* Compartilhar */}
              <button onClick={compartilhar} title="Compartilhar" style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.6, padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.text} strokeWidth="1.5">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ============================================================
              HERO
          ============================================================ */}
          <section className="fade-up" style={{ textAlign: "center", padding: "72px 24px 20px", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 65% 45% at 50% 0%, ${t.gold}0e 0%, transparent 70%)`, pointerEvents: "none" }} />

            {/* Foto + ornamento */}
            <div style={{ display: "inline-block", position: "relative", marginBottom: 52 }}>
              <FotoOrnamento color={t.gold} tamanho={FOTO_SIZE} />
              <div style={{ background: `conic-gradient(${t.gold} 0deg, ${t.goldLight} 90deg, ${t.gold} 180deg, ${t.goldLight} 270deg, ${t.gold} 360deg)`, borderRadius: "50%", padding: 3, width: FOTO_SIZE, height: FOTO_SIZE }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: t.bgCard, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {fotoUrl
                    ? <img src={fotoUrl} alt={nomeCompleto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke={`${t.gold}60`} strokeWidth="1"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  }
                </div>
              </div>
            </div>

            {/* Nome */}
            <h1 className="fd" style={{ fontSize: "clamp(2rem, 7vw, 3.4rem)", fontWeight: 300, letterSpacing: "0.03em", color: t.text, lineHeight: 1.15, marginBottom: 14 }}>
              {nomeCompleto}
            </h1>

            {/* Datas */}
            <p style={{ ...s.label, marginBottom: cidade ? 6 : 0 }}>
              {dataNascimento}
              <span style={{ margin: "0 14px", opacity: 0.4 }}>✦</span>
              {dataFalecimento}
            </p>

            {cidade && <p style={{ color: t.textMuted, fontSize: "0.8rem", marginTop: 5 }}>{cidade}</p>}

            <div style={{ ...s.divider, maxWidth: 180, margin: "28px auto 0" }} />
          </section>

          {/* ============================================================
              FRASE
          ============================================================ */}
          {frasePreferida && (
            <section style={{ maxWidth: 620, margin: "0 auto 52px", padding: "0 24px", textAlign: "center" }}>
              <p className="fd" style={{ fontSize: "clamp(1.1rem, 2.8vw, 1.45rem)", fontStyle: "italic", fontWeight: 300, color: t.textMuted, lineHeight: 1.75 }}>
                "{frasePreferida}"
              </p>
            </section>
          )}

          {/* ============================================================
              BIOGRAFIA
          ============================================================ */}
          {biografia && (
            <section style={{ maxWidth: 720, margin: "0 auto 56px", padding: "0 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 26 }}>
                <span style={s.label}>História de Vida</span>
                <div style={{ ...s.divider, maxWidth: 100, margin: "10px auto 0" }} />
              </div>
              <p className="fd" style={{ fontSize: "clamp(1rem, 2vw, 1.18rem)", lineHeight: 1.95, color: t.textMuted, fontWeight: 300, textAlign: "center" }}>
                {biografia}
              </p>
            </section>
          )}

          {/* ============================================================
              LINHA DO TEMPO
          ============================================================ */}
          {timeline.length > 0 && (
            <section style={{ maxWidth: 620, margin: "0 auto 56px", padding: "0 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <span style={s.label}>Momentos Marcantes</span>
                <div style={{ ...s.divider, maxWidth: 100, margin: "10px auto 0" }} />
              </div>
              <div style={{ position: "relative", paddingLeft: 36 }}>
                <div style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 1, background: `linear-gradient(to bottom, transparent, ${t.gold}55, transparent)` }} />
                {timeline.map((item, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: 34 }}>
                    <div style={{ position: "absolute", left: -30, top: 5, width: 11, height: 11, borderRadius: "50%", background: t.gold, opacity: 0.75 }} />
                    <span style={{ ...s.label, display: "block", marginBottom: 5 }}>{item.year}</span>
                    <p className="fd" style={{ fontSize: "1.08rem", color: t.text, marginBottom: 3 }}>{item.title}</p>
                    {item.description && <p style={{ fontSize: "0.84rem", color: t.textMuted, lineHeight: 1.65 }}>{item.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================
              GALERIA
          ============================================================ */}
          {galeriaFotos.length > 0 && (
            <section style={{ maxWidth: 960, margin: "0 auto 56px", padding: "0 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <span style={s.label}>Galeria de Memórias</span>
                <div style={{ ...s.divider, maxWidth: 100, margin: "10px auto 0" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                {galeriaFotos.map((url, i) => (
                  <div key={i} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: 4, border: `1px solid ${t.border}` }}>
                    <img src={url} alt={`Memória ${i + 1}`} className="gallery-img" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================
              VÍDEO
          ============================================================ */}
          {videoUrl && (
            <section style={{ maxWidth: 800, margin: "0 auto 56px", padding: "0 24px" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <span style={s.label}>Memória em Vídeo</span>
                <div style={{ ...s.divider, maxWidth: 100, margin: "10px auto 0" }} />
              </div>
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 4, border: `1px solid ${t.border}` }}>
                <iframe src={getEmbedUrl(videoUrl)} title="Vídeo homenagem" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
              </div>
            </section>
          )}

          {/* ============================================================
              CONDOLÊNCIAS
          ============================================================ */}
          <section style={{ maxWidth: 640, margin: "0 auto 80px", padding: "0 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <span style={s.label}>Livro de Condolências</span>
              <div style={{ ...s.divider, maxWidth: 100, margin: "10px auto 0" }} />
            </div>
            {/* TODO: Integrar com Supabase */}
            <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
              <div style={{ marginBottom: 10 }}>
                <input type="text" placeholder="Seu nome" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} maxLength={80} required style={s.input} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <textarea placeholder="Deixe sua mensagem de carinho..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={4} required style={s.input} />
              </div>
              {submitSuccess && <p style={{ color: t.gold, fontSize: "0.78rem", marginBottom: 10, textAlign: "center" }}>✦ Mensagem registrada com carinho.</p>}
              <button type="submit" disabled={submitting} style={{ ...s.btn, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Enviando..." : "Enviar Mensagem"}
              </button>
            </form>
            {condolencias.length === 0
              ? <p className="fd" style={{ color: t.textMuted, fontStyle: "italic", fontSize: "0.9rem", textAlign: "center" }}>Seja o primeiro a deixar uma mensagem.</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {condolencias.map((c) => (
                    <div key={c.id} style={{ ...s.card, padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span className="fd" style={{ color: t.goldLight, fontSize: "0.92rem", fontWeight: 600 }}>{c.visitorName}</span>
                        <span style={{ color: t.textMuted, fontSize: "0.72rem" }}>{formatDate(c.createdAt)}</span>
                      </div>
                      <p style={{ color: t.textMuted, fontSize: "0.84rem", lineHeight: 1.65 }}>{c.message}</p>
                    </div>
                  ))}
                </div>
            }
          </section>

          {/* ============================================================
              FOOTER
          ============================================================ */}
          <footer style={{ borderTop: `1px solid ${t.border}`, padding: "32px 24px", textAlign: "center" }}>
            <span className="fd" style={{ color: t.gold, fontSize: "0.65rem", letterSpacing: "0.45em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Legado Digital
            </span>
            <div style={{ ...s.divider, maxWidth: 60, margin: "0 auto 12px" }} />
            <p style={{ color: t.textMuted, fontSize: "0.75rem" }}>Preservando memórias com dignidade e amor.</p>
            <a href="/criar" style={{ color: t.gold, fontSize: "0.75rem", display: "block", marginTop: 10, textDecoration: "none", opacity: 0.65 }}>
              + Criar nova homenagem
            </a>
          </footer>

        </div>
      </div>
    </>
  );
}