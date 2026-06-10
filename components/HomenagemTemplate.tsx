"use client";

import { useState, useRef } from "react";

// ---------------------------------------------------------------------------
// INTERFACES
// ---------------------------------------------------------------------------
export interface TimelineEvent {
  year: string;
  title: string;
  description?: string;
}

export interface Homenagem {
  id: string;
  visitorName: string;
  visitorPhoto?: string;
  message: string;
  likes: number;
  createdAt: string;
}

export interface Assinatura {
  id: string;
  visitorName: string;
  relationship?: string;
  message: string;
  createdAt: string;
}

export interface GaleriaItem {
  url: string;
  tipo: "foto" | "video";
}

export type ThemeKey = "noturno" | "pedra" | "claro";

export interface HomenagemProps {
  fotoUrl?: string;
  nomeCompleto: string;
  dataNascimento: string;
  dataFalecimento: string;
  cidade?: string;
  vinculos?: string[];
  frasePreferida?: string;
  biografia?: string;
  timeline?: TimelineEvent[];
  galeria?: GaleriaItem[];
  videoUrl?: string;
  musicaUrl?: string;
  homenagens?: Homenagem[];
  assinaturas?: Assinatura[];
  localizacao?: {
    cemiterio: string;
    quadra: string;
    lote: string;
    sepultura: string;
  };
  slugUrl?: string;
  temaPadrao?: ThemeKey;
}

// ---------------------------------------------------------------------------
// TEMAS — paleta oficial Legado Digital
// ---------------------------------------------------------------------------
const temas = {
  noturno: {
    bg: "#0B1D2A",
    bgSecond: "#0f2436",
    bgCard: "rgba(255,255,255,0.04)",
    bgCardHover: "rgba(255,255,255,0.07)",
    bgInput: "rgba(255,255,255,0.06)",
    bgNav: "rgba(11,29,42,0.96)",
    text: "#F5F2EB",
    textMuted: "#8a9aa8",
    textLight: "#b8c8d4",
    border: "rgba(201,164,106,0.2)",
    borderStrong: "rgba(201,164,106,0.4)",
    gold: "#C9A46A",
    goldLight: "#dfc08a",
    goldDark: "#a8834a",
    nome: "Noturno",
    dot: "#0B1D2A",
    heroBg: "linear-gradient(180deg, #0f2436 0%, #0B1D2A 100%)",
    tagBg: "rgba(201,164,106,0.12)",
  },
  pedra: {
    bg: "#1e2428",
    bgSecond: "#252b30",
    bgCard: "rgba(255,255,255,0.04)",
    bgCardHover: "rgba(255,255,255,0.07)",
    bgInput: "rgba(255,255,255,0.06)",
    bgNav: "rgba(30,36,40,0.96)",
    text: "#F5F2EB",
    textMuted: "#8a9590",
    textLight: "#b8c0bc",
    border: "rgba(201,164,106,0.2)",
    borderStrong: "rgba(201,164,106,0.4)",
    gold: "#C9A46A",
    goldLight: "#dfc08a",
    goldDark: "#a8834a",
    nome: "Pedra",
    dot: "#1e2428",
    heroBg: "linear-gradient(180deg, #252b30 0%, #1e2428 100%)",
    tagBg: "rgba(201,164,106,0.12)",
  },
  claro: {
    bg: "#F5F2EB",
    bgSecond: "#ede9e0",
    bgCard: "rgba(11,29,42,0.04)",
    bgCardHover: "rgba(11,29,42,0.07)",
    bgInput: "rgba(11,29,42,0.05)",
    bgNav: "rgba(245,242,235,0.96)",
    text: "#0B1D2A",
    textMuted: "#58616B",
    textLight: "#3a4a56",
    border: "rgba(11,29,42,0.12)",
    borderStrong: "rgba(201,164,106,0.5)",
    gold: "#a8834a",
    goldLight: "#C9A46A",
    goldDark: "#8a6830",
    nome: "Claro",
    dot: "#F5F2EB",
    heroBg: "linear-gradient(180deg, #ede9e0 0%, #F5F2EB 100%)",
    tagBg: "rgba(11,29,42,0.08)",
  },
};

// ---------------------------------------------------------------------------
// SVG LOGO
// ---------------------------------------------------------------------------
const Logo = ({ color, size = 36 }: { color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 60 70" fill="none">
    <path d="M30 2 Q45 8 50 20 Q55 35 50 48 Q42 60 30 65 Q18 60 10 48 Q5 35 10 20 Q15 8 30 2Z" stroke={color} strokeWidth="1.5" fill="none" strokeOpacity="0.7"/>
    <path d="M20 45 Q30 38 40 45" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <path d="M16 45 Q30 42 44 45" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    <line x1="30" y1="44" x2="30" y2="18" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M30 18 Q26 22 24 28" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M30 18 Q34 22 36 28" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M30 22 Q27 25 26 30" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M30 22 Q33 25 34 30" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round"/>
    <circle cx="30" cy="17" r="2" fill={color} fillOpacity="0.8"/>
    <line x1="30" y1="15" x2="30" y2="10" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    <circle cx="30" cy="9" r="1.5" fill={color} fillOpacity="0.9"/>
  </svg>
);

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------
export default function HomenagemTemplate({
  fotoUrl,
  nomeCompleto,
  dataNascimento,
  dataFalecimento,
  cidade,
  vinculos = [],
  frasePreferida,
  biografia,
  timeline = [],
  galeria = [],
  videoUrl,
  musicaUrl,
  homenagens: initialHomenagens = [],
  assinaturas: initialAssinaturas = [],
  localizacao,
  slugUrl,
  temaPadrao = "noturno",
}: HomenagemProps) {

  const [tema, setTema] = useState<ThemeKey>(temaPadrao);
  const [abaAtiva, setAbaAtiva] = useState("sobre");
  const [tocando, setTocando] = useState(false);
  const [homenagens] = useState<Homenagem[]>(initialHomenagens);
  const [assinaturas] = useState<Assinatura[]>(initialAssinaturas);
  const [visitorName, setVisitorName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const t = temas[tema];

  const abas = [
    { id: "sobre", label: "Sobre" },
    { id: "timeline", label: "Linha do Tempo" },
    { id: "homenagens", label: "Homenagens" },
    { id: "livro", label: "Livro" },
    { id: "galeria", label: "Fotos e Vídeos" },
    { id: "localizacao", label: "Localização" },
  ];

  const scrollToAba = (id: string) => {
    setAbaAtiva(id);
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleMusica = () => {
    if (!audioRef.current) return;
    if (tocando) { audioRef.current.pause(); setTocando(false); }
    else { audioRef.current.play(); setTocando(true); }
  };

  const compartilhar = () => {
    if (navigator.share) navigator.share({ title: `Memorial — ${nomeCompleto}`, url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); alert("Link copiado!"); }
  };

  const handleSubmitAssinatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      // TODO: Integrar com Supabase
      await new Promise((r) => setTimeout(r, 600));
      setVisitorName("");
      setMessage("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const getEmbedUrl = (url: string) => {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return yt ? `https://www.youtube.com/embed/${yt[1]}` : url;
  };

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "Agora";
    if (h < 24) return `Há ${h} hora${h > 1 ? "s" : ""}`;
    const d = Math.floor(h / 24);
    return `Há ${d} dia${d > 1 ? "s" : ""}`;
  };

  // Estilos base
  const s = {
    divider: { background: `linear-gradient(90deg, transparent, ${t.gold}, transparent)`, height: 1, opacity: 0.5 } as React.CSSProperties,
    card: { background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8 } as React.CSSProperties,
    input: { background: t.bgInput, border: `1px solid ${t.border}`, color: t.text, borderRadius: 6, padding: "12px 16px", width: "100%", fontFamily: "'Lato', sans-serif", fontSize: 14, outline: "none", transition: "border 0.3s" } as React.CSSProperties,
    btnGold: { background: `linear-gradient(135deg, ${t.goldDark}, ${t.gold}, ${t.goldLight})`, color: "#0B1D2A", border: "none", borderRadius: 6, padding: "10px 20px", fontFamily: "'Lato', sans-serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase" as const, cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" as const } as React.CSSProperties,
    btnOutline: { background: "transparent", border: `1px solid ${t.borderStrong}`, color: t.gold, borderRadius: 6, padding: "10px 20px", fontFamily: "'Lato', sans-serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase" as const, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" as const } as React.CSSProperties,
    label: { color: t.gold, fontSize: "0.62rem", letterSpacing: "0.35em", textTransform: "uppercase" as const, fontFamily: "'Lato', sans-serif" } as React.CSSProperties,
    sectionTitle: { fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400, color: t.text, marginBottom: 4 } as React.CSSProperties,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Lato:wght@300;400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .fd { font-family: 'Cormorant Garamond', serif; }
        .fade-up { animation: fadeUp 0.9s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .card-hover { transition: background 0.3s, transform 0.3s, box-shadow 0.3s; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
        .gallery-img { transition: transform 0.5s, filter 0.5s; filter: grayscale(20%); display: block; width: 100%; height: 100%; object-fit: cover; }
        .gallery-img:hover { transform: scale(1.06); filter: grayscale(0%); }
        textarea, input { outline: none; }
        textarea { resize: none; }
        .aba-btn { transition: color 0.3s, border-color 0.3s; white-space: nowrap; }
        .theme-btn { transition: transform 0.2s, border 0.2s; }
        .theme-btn:hover { transform: scale(1.2); }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,164,106,0.3); border-radius: 3px; }
        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; text-align: center !important; align-items: center !important; }
          .sobre-grid { grid-template-columns: 1fr !important; }
          .homenagens-grid { grid-template-columns: 1fr !important; }
          .assinaturas-grid { grid-template-columns: 1fr !important; }
          .galeria-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .loc-grid { grid-template-columns: 1fr !important; }
          .nav-abas { overflow-x: auto !important; }
        }
      `}</style>

      {musicaUrl && <audio ref={audioRef} src={musicaUrl} loop />}

      <div style={{ backgroundColor: t.bg, color: t.text, minHeight: "100vh", fontFamily: "'Lato', sans-serif", transition: "background 0.5s, color 0.4s" }}>

        {/* ================================================================
            NAVBAR PRINCIPAL
        ================================================================ */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(16px)", background: t.bgNav, borderBottom: `1px solid ${t.border}`, padding: "0 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Logo color={t.gold} size={32} />
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontWeight: 600, color: t.text, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.1 }}>
                  Legado Digital
                </div>
                <div style={{ fontSize: "0.55rem", color: t.gold, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                  Preservando Histórias
                </div>
              </div>
            </div>

            {/* Abas de navegação */}
            <div className="nav-abas" style={{ display: "flex", gap: 0, alignItems: "center", overflowX: "auto" }}>
              {abas.map((aba) => (
                <button
                  key={aba.id}
                  className="aba-btn"
                  onClick={() => scrollToAba(aba.id)}
                  style={{ background: "none", border: "none", borderBottom: abaAtiva === aba.id ? `2px solid ${t.gold}` : "2px solid transparent", color: abaAtiva === aba.id ? t.gold : t.textMuted, padding: "0 16px", height: 64, cursor: "pointer", fontSize: "0.78rem", letterSpacing: "0.08em", fontFamily: "'Lato', sans-serif", fontWeight: abaAtiva === aba.id ? 700 : 400 }}
                >
                  {aba.label}
                </button>
              ))}
            </div>

            {/* Ações direita */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Temas */}
              <div style={{ display: "flex", gap: 5, marginRight: 8 }}>
                {(["noturno", "pedra", "claro"] as ThemeKey[]).map((k) => (
                  <button key={k} className="theme-btn" title={temas[k].nome} onClick={() => setTema(k)} style={{ width: 14, height: 14, borderRadius: "50%", cursor: "pointer", border: tema === k ? `2px solid ${t.gold}` : `1px solid ${t.border}`, background: k === "noturno" ? "#0B1D2A" : k === "pedra" ? "#1e2428" : "#F5F2EB", padding: 0 }} />
                ))}
              </div>

              {musicaUrl && (
                <button onClick={toggleMusica} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  {tocando
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill={t.gold}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    : <svg width="10" height="10" viewBox="0 0 24 24" fill={t.gold}><polygon points="5,3 19,12 5,21"/></svg>
                  }
                </button>
              )}

              <button style={s.btnOutline} onClick={() => scrollToAba("livro")}>
                ✍ Assinar Livro
              </button>
              <button style={s.btnGold} onClick={() => scrollToAba("homenagens")}>
                ♡ Deixar Homenagem
              </button>
              <button onClick={compartilhar} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 6, padding: "10px 12px", cursor: "pointer", color: t.textMuted }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
            </div>
          </div>
        </nav>

        {/* ================================================================
            HERO SECTION
        ================================================================ */}
        <section style={{ background: t.heroBg, borderBottom: `1px solid ${t.border}`, padding: "56px 24px 48px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div className="hero-grid fade-up" style={{ display: "flex", alignItems: "center", gap: 48 }}>

              {/* Foto */}
              <div style={{ flexShrink: 0, position: "relative" }}>
                <div style={{ background: `conic-gradient(${t.gold} 0deg, ${t.goldLight} 90deg, ${t.goldDark} 180deg, ${t.goldLight} 270deg, ${t.gold} 360deg)`, borderRadius: "50%", padding: 4, width: 200, height: 200, flexShrink: 0 }}>
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: t.bgCard, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {fotoUrl
                      ? <img src={fotoUrl} alt={nomeCompleto} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(30%)" }} />
                      : <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={`${t.gold}60`} strokeWidth="0.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    }
                  </div>
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <p style={{ ...s.label, marginBottom: 10 }}>Memorial</p>
                <h1 className="fd" style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 300, color: t.text, lineHeight: 1.1, marginBottom: 10 }}>
                  {nomeCompleto}
                </h1>
                <p style={{ color: t.gold, fontSize: "1.1rem", fontFamily: "'Cormorant Garamond', serif", marginBottom: 20, letterSpacing: "0.05em" }}>
                  {dataNascimento} — {dataFalecimento}
                </p>

                {/* Vínculos */}
                {vinculos.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                    {vinculos.map((v, i) => (
                      <span key={i} style={{ background: t.tagBg, border: `1px solid ${t.borderStrong}`, color: t.gold, borderRadius: 20, padding: "4px 14px", fontSize: "0.78rem", fontFamily: "'Lato', sans-serif", letterSpacing: "0.05em" }}>
                        {v}
                      </span>
                    ))}
                  </div>
                )}

                {/* Frase */}
                {frasePreferida && (
                  <div style={{ borderLeft: `3px solid ${t.gold}`, paddingLeft: 20, marginTop: 8 }}>
                    <p className="fd" style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", fontStyle: "italic", color: t.textLight, lineHeight: 1.7, fontWeight: 300 }}>
                      "{frasePreferida}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SOBRE + LINHA DO TEMPO
        ================================================================ */}
        <section id="section-sobre" style={{ padding: "56px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div className="sobre-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>

              {/* Sobre */}
              <div style={{ ...s.card, padding: "32px" }}>
                <div style={{ marginBottom: 20 }}>
                  <p style={s.label}>Sobre</p>
                  <h2 style={s.sectionTitle}>{nomeCompleto.split(" ")[0]}</h2>
                  <div style={{ ...s.divider, marginTop: 12 }} />
                </div>
                {biografia
                  ? <p className="fd" style={{ fontSize: "1.05rem", lineHeight: 1.9, color: t.textMuted, fontWeight: 300 }}>{biografia}</p>
                  : <p style={{ color: t.textMuted, fontSize: "0.9rem", fontStyle: "italic" }}>Biografia em breve.</p>
                }
              </div>

              {/* Linha do Tempo */}
              <div id="section-timeline" style={{ ...s.card, padding: "32px" }}>
                <div style={{ marginBottom: 20 }}>
                  <p style={s.label}>Linha do Tempo</p>
                  <h2 style={s.sectionTitle}>Trajetória</h2>
                  <div style={{ ...s.divider, marginTop: 12 }} />
                </div>

                {timeline.length > 0 ? (
                  <div style={{ position: "relative", paddingLeft: 28 }}>
                    <div style={{ position: "absolute", left: 6, top: 0, bottom: 0, width: 1, background: `linear-gradient(to bottom, ${t.gold}80, transparent)` }} />
                    {timeline.map((item, i) => (
                      <div key={i} style={{ position: "relative", marginBottom: 24 }}>
                        <div style={{ position: "absolute", left: -26, top: 4, width: 10, height: 10, borderRadius: "50%", background: t.gold, border: `2px solid ${t.bg}` }} />
                        <span style={{ ...s.label, display: "block", marginBottom: 3 }}>{item.year}</span>
                        <p style={{ color: t.text, fontSize: "0.9rem", fontWeight: 600, marginBottom: 2 }}>{item.title}</p>
                        {item.description && <p style={{ color: t.textMuted, fontSize: "0.82rem", lineHeight: 1.5 }}>{item.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: t.textMuted, fontSize: "0.9rem", fontStyle: "italic" }}>Linha do tempo em breve.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            HOMENAGENS
        ================================================================ */}
        <section id="section-homenagens" style={{ padding: "0 24px 56px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <p style={s.label}>Mensagens</p>
                <h2 style={s.sectionTitle}>Homenagens</h2>
                <div style={{ ...s.divider, marginTop: 8, maxWidth: 80 }} />
              </div>
              <span style={{ color: t.textMuted, fontSize: "0.8rem" }}>Ver todas as homenagens</span>
            </div>

            {homenagens.length > 0 ? (
              <div className="homenagens-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {homenagens.slice(0, 3).map((h) => (
                  <div key={h.id} className="card-hover" style={{ ...s.card, padding: "24px" }}>
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: t.bgCard, border: `1px solid ${t.border}`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {h.visitorPhoto
                          ? <img src={h.visitorPhoto} alt={h.visitorName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={`${t.gold}80`} strokeWidth="1"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        }
                      </div>
                      <div>
                        <p style={{ color: t.text, fontSize: "0.88rem", fontWeight: 700 }}>{h.visitorName}</p>
                        <p style={{ color: t.textMuted, fontSize: "0.75rem" }}>{formatTime(h.createdAt)}</p>
                      </div>
                    </div>
                    <p style={{ color: t.textMuted, fontSize: "0.85rem", lineHeight: 1.65, marginBottom: 16 }}>{h.message}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: t.gold, fontSize: "0.8rem" }}>♥</span>
                      <span style={{ color: t.textMuted, fontSize: "0.78rem" }}>{h.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...s.card, padding: "40px", textAlign: "center" }}>
                <p className="fd" style={{ color: t.textMuted, fontStyle: "italic" }}>Seja o primeiro a deixar uma homenagem.</p>
                <button style={{ ...s.btnGold, marginTop: 20, width: "auto", padding: "10px 32px" }}>♡ Deixar Homenagem</button>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================
            LIVRO DE ASSINATURAS
        ================================================================ */}
        <section id="section-livro" style={{ padding: "0 24px 56px", background: t.bgSecond }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", paddingTop: 56 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <p style={s.label}>Mensagens</p>
                <h2 style={s.sectionTitle}>Livro de Assinaturas</h2>
                <div style={{ ...s.divider, marginTop: 8, maxWidth: 80 }} />
              </div>
              <span style={{ color: t.textMuted, fontSize: "0.8rem" }}>Ver todas as assinaturas</span>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmitAssinatura} style={{ ...s.card, padding: "28px", marginBottom: 28 }}>
              {/* TODO: Integrar com Supabase */}
              <p style={{ ...s.label, display: "block", marginBottom: 16 }}>Deixar uma assinatura</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <input type="text" placeholder="Seu nome completo" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} maxLength={80} required style={s.input} />
                <input type="text" placeholder="Sua relação (ex: Filho, Amigo)" style={s.input} />
              </div>
              <textarea placeholder="Escreva sua mensagem..." value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} required style={{ ...s.input, marginBottom: 12 }} />
              {submitSuccess && <p style={{ color: t.gold, fontSize: "0.8rem", marginBottom: 10 }}>✦ Assinatura registrada com carinho.</p>}
              <button type="submit" disabled={submitting} style={{ ...s.btnGold, width: "auto", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Enviando..." : "✍ Assinar o Livro"}
              </button>
            </form>

            {/* Lista */}
            {assinaturas.length > 0 && (
              <div className="assinaturas-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                {assinaturas.slice(0, 3).map((a) => (
                  <div key={a.id} className="card-hover" style={{ ...s.card, padding: "24px" }}>
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ color: t.text, fontWeight: 700, fontSize: "0.88rem" }}>{a.visitorName}</p>
                      {a.relationship && <p style={{ color: t.gold, fontSize: "0.75rem" }}>{a.relationship}</p>}
                      <p style={{ color: t.textMuted, fontSize: "0.72rem" }}>{formatTime(a.createdAt)}</p>
                    </div>
                    <p style={{ color: t.textMuted, fontSize: "0.84rem", lineHeight: 1.65, marginBottom: 16 }}>{a.message}</p>
                    <p className="fd" style={{ color: t.gold, fontSize: "1.1rem", fontStyle: "italic" }}>{a.visitorName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ================================================================
            FOTOS E VÍDEOS
        ================================================================ */}
        <section id="section-galeria" style={{ padding: "56px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <p style={s.label}>Memórias</p>
                <h2 style={s.sectionTitle}>Fotos e Vídeos</h2>
                <div style={{ ...s.divider, marginTop: 8, maxWidth: 80 }} />
              </div>
              <span style={{ color: t.textMuted, fontSize: "0.8rem" }}>Ver todos</span>
            </div>

            {galeria.length > 0 ? (
              <div className="galeria-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {galeria.slice(0, 5).map((item, i) => (
                  <div key={i} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: 6, border: `1px solid ${t.border}`, position: "relative" }}>
                    {item.tipo === "video"
                      ? <div style={{ width: "100%", height: "100%", background: t.bgCard, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill={t.gold}><polygon points="5,3 19,12 5,21"/></svg>
                        </div>
                      : <img src={item.url} alt={`Memória ${i + 1}`} className="gallery-img" />
                    }
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...s.card, padding: "40px", textAlign: "center" }}>
                <p className="fd" style={{ color: t.textMuted, fontStyle: "italic" }}>Fotos e vídeos serão adicionados em breve.</p>
              </div>
            )}

            {videoUrl && (
              <div style={{ marginTop: 24, borderRadius: 8, overflow: "hidden", border: `1px solid ${t.border}`, position: "relative", paddingBottom: "40%", height: 0 }}>
                <iframe src={getEmbedUrl(videoUrl)} title="Vídeo memorial" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
              </div>
            )}
          </div>
        </section>

        {/* ================================================================
            LOCALIZAÇÃO
        ================================================================ */}
        <section id="section-localizacao" style={{ padding: "0 24px 56px", background: t.bgSecond }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", paddingTop: 56 }}>
            <div style={{ marginBottom: 28 }}>
              <p style={s.label}>Cemitério</p>
              <h2 style={s.sectionTitle}>Localização</h2>
              <div style={{ ...s.divider, marginTop: 8, maxWidth: 80 }} />
            </div>

            <div className="loc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

              {/* Mapa placeholder */}
              <div style={{ ...s.card, padding: "24px", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ flex: 1, background: `${t.bgCard}`, borderRadius: 4, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 140, border: `1px solid ${t.border}` }}>
                  <div style={{ textAlign: "center" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={`${t.gold}80`} strokeWidth="1.2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                    <p style={{ color: t.textMuted, fontSize: "0.75rem", marginTop: 8 }}>Mapa interativo</p>
                  </div>
                </div>
                {localizacao && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={{ color: t.text, fontSize: "0.88rem", fontWeight: 600 }}>📍 {localizacao.cemiterio}</p>
                    <p style={{ color: t.textMuted, fontSize: "0.8rem" }}>Quadra: {localizacao.quadra} | Lote: {localizacao.lote} | Sepultura: {localizacao.sepultura}</p>
                    <button style={{ ...s.btnOutline, marginTop: 8, width: "fit-content" }}>Ver Rotas ↗</button>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div style={{ ...s.card, padding: "32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <p style={s.label}>Acesse este memorial</p>
                <p style={{ color: t.textMuted, fontSize: "0.85rem" }}>Escaneie o QR Code ou acesse o link abaixo para visitar e homenagear.</p>

                {/* QR Placeholder */}
                <div style={{ width: 120, height: 120, background: t.bgCard, border: `2px solid ${t.borderStrong}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={`${t.gold}80`} strokeWidth="1">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    <rect x="5" y="5" width="3" height="3" fill={`${t.gold}60`}/><rect x="16" y="5" width="3" height="3" fill={`${t.gold}60`}/><rect x="5" y="16" width="3" height="3" fill={`${t.gold}60`}/>
                    <path d="M14 14h2v2h-2zM17 14h3v1h-3zM14 17h1v3h-1zM16 16h1v1h-1zM18 16h2v2h-2zM17 19h3v2h-3z" fill={`${t.gold}60`}/>
                  </svg>
                </div>

                {slugUrl && (
                  <p style={{ color: t.gold, fontSize: "0.8rem", wordBreak: "break-all" }}>
                    legadodigital.com/memorial/{slugUrl}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            FOOTER
        ================================================================ */}
        <footer style={{ background: t.bgSecond, borderTop: `1px solid ${t.border}`, padding: "32px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.textMuted, fontSize: "0.78rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.gold} strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Privacidade e segurança garantidas. Todas as homenagens passam por moderação.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: t.textMuted, fontSize: "0.78rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.gold} strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Um lugar seguro para preservar memórias e manter vínculos vivos para sempre.
              </div>
            </div>
            <div style={{ ...s.divider, width: "100%", maxWidth: 400 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Logo color={t.gold} size={24} />
              <div>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", color: t.gold, fontSize: "0.9rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Legado Digital</span>
                <span style={{ color: t.textMuted, fontSize: "0.7rem", display: "block", letterSpacing: "0.2em" }}>Preservando Histórias</span>
              </div>
            </div>
            <p style={{ color: t.textMuted, fontSize: "0.72rem" }}>
              Legado Digital — preservando histórias hoje para que continuem inspirando amanhã.
            </p>
          </div>
        </footer>

      </div>
    </>
  );
}