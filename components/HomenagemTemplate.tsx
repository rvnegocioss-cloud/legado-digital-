"use client";

import { useState, useRef, useEffect } from "react";

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
// TEMAS
// ---------------------------------------------------------------------------
const temas = {
  noturno: {
    bg: "#0B1D2A", bgSecond: "#0f2436", bgCard: "rgba(255,255,255,0.04)",
    bgInput: "rgba(255,255,255,0.06)", bgNav: "rgba(11,29,42,0.97)",
    text: "#F5F2EB", textMuted: "#7a8a96", textLight: "#b0c0cc",
    border: "rgba(201,164,106,0.18)", borderStrong: "rgba(201,164,106,0.4)",
    gold: "#C9A46A", goldLight: "#dfc08a", goldDark: "#a8834a",
    tagBg: "rgba(201,164,106,0.1)", heroBg: "#0f2436",
    shadowCard: "0 4px 24px rgba(0,0,0,0.3)", nome: "Noturno",
  },
  pedra: {
    bg: "#1e2428", bgSecond: "#252b30", bgCard: "rgba(255,255,255,0.04)",
    bgInput: "rgba(255,255,255,0.06)", bgNav: "rgba(30,36,40,0.97)",
    text: "#F5F2EB", textMuted: "#8a9590", textLight: "#b8c0bc",
    border: "rgba(201,164,106,0.18)", borderStrong: "rgba(201,164,106,0.4)",
    gold: "#C9A46A", goldLight: "#dfc08a", goldDark: "#a8834a",
    tagBg: "rgba(201,164,106,0.1)", heroBg: "#252b30",
    shadowCard: "0 4px 24px rgba(0,0,0,0.3)", nome: "Pedra",
  },
  claro: {
    bg: "#F5F2EB", bgSecond: "#ede9e0", bgCard: "rgba(11,29,42,0.03)",
    bgInput: "rgba(11,29,42,0.05)", bgNav: "rgba(245,242,235,0.97)",
    text: "#0B1D2A", textMuted: "#58616B", textLight: "#3a4a56",
    border: "rgba(11,29,42,0.1)", borderStrong: "rgba(201,164,106,0.5)",
    gold: "#a8834a", goldLight: "#C9A46A", goldDark: "#8a6830",
    tagBg: "rgba(11,29,42,0.06)", heroBg: "#ede9e0",
    shadowCard: "0 4px 24px rgba(0,0,0,0.08)", nome: "Claro",
  },
};

// ---------------------------------------------------------------------------
// LOGO SVG
// ---------------------------------------------------------------------------
const Logo = ({ color, size = 32 }: { color: string; size?: number }) => (
  <svg width={size} height={size * 1.15} viewBox="0 0 60 70" fill="none">
    <path d="M30 2 Q45 8 50 20 Q55 35 50 48 Q42 60 30 65 Q18 60 10 48 Q5 35 10 20 Q15 8 30 2Z" stroke={color} strokeWidth="1.5" fill="none" strokeOpacity="0.7"/>
    <path d="M20 45 Q30 38 40 45" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <path d="M16 45 Q30 42 44 45" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
    <line x1="30" y1="44" x2="30" y2="18" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M30 18 Q26 22 24 28" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M30 18 Q34 22 36 28" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round"/>
    <circle cx="30" cy="17" r="2" fill={color} fillOpacity="0.8"/>
    <line x1="30" y1="15" x2="30" y2="10" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    <circle cx="30" cy="9" r="1.5" fill={color} fillOpacity="0.9"/>
  </svg>
);

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------
export default function HomenagemTemplate({
  fotoUrl, nomeCompleto, dataNascimento, dataFalecimento,
  cidade, vinculos = [], frasePreferida, biografia,
  timeline = [], galeria = [], videoUrl, musicaUrl,
  homenagens: initialHomenagens = [], assinaturas: initialAssinaturas = [],
  localizacao, slugUrl, temaPadrao = "noturno",
}: HomenagemProps) {

  const [tema, setTema] = useState<ThemeKey>(temaPadrao);
  const [abaAtiva, setAbaAtiva] = useState("sobre");
  const [menuAberto, setMenuAberto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [homenagens] = useState<Homenagem[]>(initialHomenagens);
  const [assinaturas] = useState<Assinatura[]>(initialAssinaturas);
  const [nomeVisitante, setNomeVisitante] = useState("");
  const [relacao, setRelacao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const t = temas[tema];

  const abas = [
    { id: "sobre", label: "Sobre" },
    { id: "timeline", label: "Linha do Tempo" },
    { id: "homenagens", label: `Homenagens${homenagens.length > 0? ` ${homenagens.length}` : ""}` },
    { id: "livro", label: `Livro${assinaturas.length > 0? ` ${assinaturas.length}` : ""}` },
    { id: "galeria", label: "Fotos e Vídeos" },
    { id: "localizacao", label: "Localização" },
  ];

  const scrollToSection = (id: string) => {
    setAbaAtiva(id);
    setMenuAberto(false);
    const el = document.getElementById(`sec-${id}`);
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handler = () => {
      const sections = abas.map(a => document.getElementById(`sec-${a.id}`));
      const scrollY = window.scrollY + 140;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i];
        if (el && el.offsetTop <= scrollY) { setAbaAtiva(abas[i].id); break; }
      }
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const toggleMusica = () => {
    if (!audioRef.current) return;
    if (tocando) { audioRef.current.pause(); setTocando(false); }
    else { audioRef.current.play(); setTocando(true); }
  };

  const compartilhar = () => {
    if (navigator.share) navigator.share({ title: `Memorial — ${nomeCompleto}`, url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); alert("Link copiado!"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeVisitante.trim() ||!mensagem.trim()) return;
    setSubmitting(true);
    try {
      await new Promise(r => setTimeout(r, 700));
      setNomeVisitante(""); setRelacao(""); setMensagem("");
      setSubmitOk(true);
      setTimeout(() => setSubmitOk(false), 4000);
    } finally { setSubmitting(false); }
  };

  const getEmbedUrl = (url: string) => {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return yt? `https://www.youtube.com/embed/${yt[1]}` : url;
  };

  const formatTime = (iso: string) => {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    if (h < 1) return "Agora";
    if (h < 24) return `Há ${h}h`;
    const d = Math.floor(h / 24);
    return `Há ${d} dia${d > 1? "s" : ""}`;
  };

  const C = {
    divider: { background: `linear-gradient(90deg,transparent,${t.gold},transparent)`, height: 1, opacity: 0.45 } as React.CSSProperties,
    card: { background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: t.shadowCard } as React.CSSProperties,
    input: { background: t.bgInput, border: `1px solid ${t.border}`, color: t.text, borderRadius: 8, padding: "13px 16px", width: "100%", fontFamily: "'Lato',sans-serif", fontSize: 14, outline: "none", transition: "border 0.2s" } as React.CSSProperties,
    btnGold: { background: `linear-gradient(135deg,${t.goldDark},${t.gold},${t.goldLight})`, color: "#0B1D2A", border: "none", borderRadius: 8, padding: "12px 22px", fontFamily: "'Lato',sans-serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" as const, cursor: "pointer", fontWeight: 700 } as React.CSSProperties,
    btnOutline: { background: "transparent", border: `1px solid ${t.borderStrong}`, color: t.gold, borderRadius: 8, padding: "11px 20px", fontFamily: "'Lato',sans-serif", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" as const, cursor: "pointer", fontWeight: 600 } as React.CSSProperties,
    tag: { background: t.tagBg, border: `1px solid ${t.borderStrong}`, color: t.gold, borderRadius: 20, padding: "5px 14px", fontSize: "0.78rem", fontFamily: "'Lato',sans-serif" } as React.CSSProperties,
    label: { color: t.gold, fontSize: "0.6rem", letterSpacing: "0.3em", textTransform: "uppercase" as const, fontFamily: "'Lato',sans-serif", display: "block" as const } as React.CSSProperties,
    sectionHead: { fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.3rem,3vw,1.7rem)", fontWeight: 400, color: t.text, marginBottom: 4 } as React.CSSProperties,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Lato:wght@300;400;700&family=Dancing+Script:wght@600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        body{-webkit-font-smoothing:antialiased;}
       .fd{font-family:'Cormorant Garamond',serif;}
       .cursive{font-family:'Dancing Script',cursive;}
       .fade-up{animation:fadeUp 0.8s ease both;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
       .img-cover{width:100%;height:100%;object-fit:cover;display:block;}
       .gal-item{overflow:hidden;border-radius:8px;position:relative;}
       .gal-item img{transition:transform 0.5s,filter 0.5s;filter:grayscale(15%);}
       .gal-item:hover img{transform:scale(1.06);filter:grayscale(0%);}
       .card-lift{transition:transform 0.25s,box-shadow 0.25s;}
       .card-lift:hover{transform:translateY(-3px);}
       .aba{transition:color 0.2s,border-color 0.2s;background:none;border:none;cursor:pointer;white-space:nowrap;font-family:'Lato',sans-serif;}
        textarea{resize:none;}
        input,textarea{outline:none;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(201,164,106,0.3);border-radius:2px;}
       .overlay-menu{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:98;}

        /* ---- MOBILE FIRST ---- */
       .hero-wrap{display:flex;flex-direction:column;align-items:center;text-align:center;gap:28px;}
       .hero-info{width:100%;}
       .vinculos-wrap{justify-content:center;}
       .sobre-grid{display:grid;grid-template-columns:1fr;gap:20px;}
       .hom-grid{display:grid;grid-template-columns:1fr;gap:16px;}
       .ass-grid{display:grid;grid-template-columns:1fr;gap:16px;}
       .gal-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
       .loc-grid{display:grid;grid-template-columns:1fr;gap:20px;}
       .form-row{display:grid;grid-template-columns:1fr;gap:12px;}
       .nav-actions-desktop{display:none;}
       .hamburger{display:flex;}
       .abas-desktop{display:none;}
       .footer-security{flex-direction:column;gap:12px;text-align:center;}

        /* ---- TABLET (640px+) ---- */
        @media(min-width:640px){
         .gal-grid{grid-template-columns:repeat(3,1fr);}
         .form-row{grid-template-columns:1fr 1fr;}
         .hom-grid{grid-template-columns:repeat(2,1fr);}
         .ass-grid{grid-template-columns:repeat(2,1fr);}
        }

        /* ---- DESKTOP (1024px+) ---- */
        @media(min-width:1024px){
         .hero-wrap{flex-direction:row;text-align:left;gap:52px;}
         .hero-info{width:auto;flex:1;}
         .vinculos-wrap{justify-content:flex-start;}
         .sobre-grid{grid-template-columns:1fr 1fr;}
         .hom-grid{grid-template-columns:repeat(3,1fr);}
         .ass-grid{grid-template-columns:repeat(3,1fr);}
         .gal-grid{grid-template-columns:repeat(5,1fr);}
         .loc-grid{grid-template-columns:1fr 1fr;}
         .nav-actions-desktop{display:flex;}
         .hamburger{display:none;}
         .abas-desktop{display:flex;}
         .footer-security{flex-direction:row;gap:32px;}
        }
      `}</style>

      {musicaUrl && <audio ref={audioRef} src={musicaUrl} loop />}

      <div style={{ backgroundColor: t.bg, color: t.text, minHeight: "100vh", fontFamily: "'Lato',sans-serif", transition: "background 0.5s,color 0.4s" }}>
        {/* NAVBAR, HERO, SOBRE, TIMELINE, HOMENAGENS, LIVRO, GALERIA, LOCALIZACAO e FOOTER - todo o código que você me enviou */}
        {/*... cole aqui o restante do JSX do seu arquivo original... */}
      </div>
    </>
  );
}