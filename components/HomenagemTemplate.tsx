"use client";

import { useState, useRef, useEffect } from "react";

export interface TimelineEvent { year: string; title: string; description?: string; }
export interface Homenagem { id: string; visitorName: string; visitorPhoto?: string; message: string; likes: number; createdAt: string; }
export interface Assinatura { id: string; visitorName: string; relationship?: string; message: string; createdAt: string; }
export interface GaleriaItem { url: string; tipo: "foto" | "video"; }
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
  localizacao?: { cemiterio: string; quadra: string; lote: string; sepultura: string; };
  slugUrl?: string;
  temaPadrao?: ThemeKey;
}

const temas = {
  noturno: { nome:"Noturno", bg:"#0B1D2A", bgSecond:"#0f2436", bgCard:"rgba(255,255,255,0.04)", bgInput:"rgba(255,255,255,0.06)", bgNav:"rgba(11,29,42,0.97)", text:"#F5F2EB", textMuted:"#7a8a96", textLight:"#b0c0cc", border:"rgba(201,164,106,0.18)", borderStrong:"rgba(201,164,106,0.4)", gold:"#C9A46A", goldLight:"#dfc08a", goldDark:"#a8834a", tagBg:"rgba(201,164,106,0.1)", heroBg:"#0f2436", shadowCard:"0 4px 24px rgba(0,0,0,0.3)" },
  pedra: { nome:"Pedra", bg:"#1e2428", bgSecond:"#252b30", bgCard:"rgba(255,255,255,0.04)", bgInput:"rgba(255,255,255,0.06)", bgNav:"rgba(30,36,40,0.97)", text:"#F5F2EB", textMuted:"#8a9590", textLight:"#b8c0bc", border:"rgba(201,164,106,0.18)", borderStrong:"rgba(201,164,106,0.4)", gold:"#C9A46A", goldLight:"#dfc08a", goldDark:"#a8834a", tagBg:"rgba(201,164,106,0.1)", heroBg:"#252b30", shadowCard:"0 4px 24px rgba(0,0,0,0.3)" },
  claro: { nome:"Claro", bg:"#F5F2EB", bgSecond:"#ede9e0", bgCard:"rgba(11,29,42,0.03)", bgInput:"rgba(11,29,42,0.05)", bgNav:"rgba(245,242,235,0.97)", text:"#0B1D2A", textMuted:"#58616B", textLight:"#3a4a56", border:"rgba(11,29,42,0.1)", borderStrong:"rgba(201,164,106,0.5)", gold:"#a8834a", goldLight:"#C9A46A", goldDark:"#8a6830", tagBg:"rgba(11,29,42,0.06)", heroBg:"#ede9e0", shadowCard:"0 4px 24px rgba(0,0,0,0.08)" },
};

const Logo = ({ color, size = 32 }: { color: string; size?: number }) => (
  <svg width={size} height={size*1.15} viewBox="0 0 60 70" fill="none">
    <path d="M30 2 Q45 8 50 20 Q55 35 50 48 Q42 60 30 65 Q18 60 10 48 Q5 35 10 20 Q15 8 30 2Z" stroke={color} strokeWidth="1.5" fill="none" opacity="0.7"/>
    <path d="M20 45 Q30 38 40 45" stroke={color} strokeWidth="1.5" fill="none"/>
    <circle cx="30" cy="25" r="3" fill={color} opacity="0.8"/>
  </svg>
);

export default function HomenagemTemplate(props: HomenagemProps) {
  const { fotoUrl, nomeCompleto, dataNascimento, dataFalecimento, cidade, vinculos = [], frasePreferida, biografia, timeline = [], galeria = [], videoUrl, musicaUrl, homenagens: initialHomenagens = [], assinaturas: initialAssinaturas = [], localizacao, slugUrl, temaPadrao = "noturno" } = props;

  const [tema, setTema] = useState<ThemeKey>(temaPadrao);
  const [abaAtiva, setAbaAtiva] = useState("sobre");
  const [menuAberto, setMenuAberto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [homenagens] = useState(initialHomenagens);
  const [assinaturas] = useState(initialAssinaturas);
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
    { id: "homenagens", label: `Homenagens ${homenagens.length > 0? `(${homenagens.length})` : ""}` },
    { id: "livro", label: `Livro ${assinaturas.length > 0? `(${assinaturas.length})` : ""}` },
    { id: "galeria", label: "Galeria" },
    { id: "localizacao", label: "Localização" },
  ];

  const scrollToSection = (id: string) => {
    setAbaAtiva(id);
    setMenuAberto(false);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleMusica = () => {
    if (!audioRef.current) return;
    if (tocando) { audioRef.current.pause(); } else { audioRef.current.play().catch(()=>{}); }
    setTocando(!tocando);
  };

  const compartilhar = async () => {
    const url = slugUrl || window.location.href;
    try { if (navigator.share) { await navigator.share({ title: `Memorial ${nomeCompleto}`, text: frasePreferida || "", url }); } else { await navigator.clipboard.writeText(url); alert("Link copiado!"); } } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeVisitante.trim() ||!mensagem.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitOk(true);
    setNomeVisitante(""); setRelacao(""); setMensagem("");
    setTimeout(() => setSubmitOk(false), 3000);
  };

  const getEmbedUrl = (url: string) => {
    const m = url.match(/(?:youtube\.com.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m? `https://www.youtube.com/embed/${m[1]}` : url;
  };

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "Agora"; if (h < 24) return `Há ${h}h`; const d = Math.floor(h/24); return `Há ${d}d`;
  };

  useEffect(() => {
    const onScroll = () => {
      const pos = window.scrollY + 150;
      for (const a of abas) {
        const el = document.getElementById(`sec-${a.id}`);
        if (el && el.offsetTop <= pos && el.offsetTop + el.offsetHeight > pos) { setAbaAtiva(a.id); break; }
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const C = {
    card: { background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, boxShadow: t.shadowCard } as React.CSSProperties,
    input: { background: t.bgInput, border: `1px solid ${t.border}`, color: t.text, borderRadius: 8, padding: "12px 14px", fontSize: 15, width: "100%", outline: "none" } as React.CSSProperties,
    btnGold: { background: `linear-gradient(135deg, ${t.goldDark}, ${t.gold})`, color: "#0B1D2A", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer" } as React.CSSProperties,
    btnOutline: { background: "transparent", border: `1px solid ${t.borderStrong}`, color: t.gold, borderRadius: 8, padding: "8px 14px", cursor: "pointer" } as React.CSSProperties,
    tag: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: t.tagBg, border: `1px solid ${t.borderStrong}`, borderRadius: 20, fontSize: 13, color: t.gold } as React.CSSProperties,
    label: { fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: t.gold, fontWeight: 600 } as React.CSSProperties,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Lato:wght@300;400;700&family=Dancing+Script:wght@600&display=swap');
        *{box-sizing:border-box} html{scroll-behavior:smooth} body{margin:0}
       .fd{font-family:'Cormorant Garamond',serif}.cursive{font-family:'Dancing Script',cursive}
       .container{max-width:1120px;margin:0 auto;padding:0 16px}
       .hero-wrap{display:flex;flex-direction:column;align-items:center;text-align:center;gap:28px}
       .sobre-grid{display:grid;grid-template-columns:1fr;gap:20px}
       .hom-grid{display:grid;grid-template-columns:1fr;gap:14px}
       .ass-grid{display:grid;grid-template-columns:1fr;gap:14px}
       .gal-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
       .loc-grid{display:grid;grid-template-columns:1fr;gap:20px}
       .nav-desktop{display:none}
        @media(min-width:768px){.hom-grid{grid-template-columns:repeat(2,1fr)}.ass-grid{grid-template-columns:repeat(2,1fr)}.gal-grid{grid-template-columns:repeat(3,1fr)}.loc-grid{grid-template-columns:1fr 1fr}}
        @media(min-width:1024px){.hero-wrap{flex-direction:row;text-align:left;gap:48px}.sobre-grid{grid-template-columns:1.2fr 0.8fr}.hom-grid{grid-template-columns:repeat(3,1fr)}.ass-grid{grid-template-columns:repeat(3,1fr)}.gal-grid{grid-template-columns:repeat(4,1fr)}.nav-desktop{display:flex}}
       .img-cover{width:100%;height:100%;object-fit:cover}
       .card-lift{transition:transform.2s,box-shadow.2s}.card-lift:hover{transform:translateY(-2px)}
       .fade-up{animation:fu.6s ease-out}@keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      `}</style>

      {musicaUrl && <audio ref={audioRef} src={musicaUrl} loop preload="none" />}

      <div style={{ backgroundColor: t.bg, color: t.text, minHeight: "100vh", fontFamily: "'Lato', sans-serif", lineHeight: 1.6 }}>
        <nav style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: t.bgNav, backdropFilter: "blur(12px)", borderBottom: `1px solid ${t.border}` }}>
          <div className="container" style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Logo color={t.gold} size={32} />
              <div>
                <div className="fd" style={{ fontSize: 18, fontWeight: 600, letterSpacing: 1 }}>LEGADO DIGITAL</div>
                <div style={{ fontSize: 9, color: t.gold, letterSpacing: 3, marginTop: -2 }}>PRESERVANDO HISTÓRIAS</div>
              </div>
            </div>
            <div className="nav-desktop" style={{ alignItems: "center", gap: 12 }}>
              {musicaUrl && <button onClick={toggleMusica} style={C.btnOutline}>{tocando? "⏸ Pausar" : "🎵 Música"}</button>}
              <button onClick={compartilhar} style={C.btnOutline}>Compartilhar</button>
              <div style={{ display: "flex", gap: 6, padding: "4px", background: t.bgSecond, borderRadius: 20, border: `1px solid ${t.border}` }}>
                {(["noturno","pedra","claro"] as ThemeKey[]).map(k => (
                  <button key={k} onClick={() => setTema(k)} title={temas[k].nome} style={{ width: 24, height: 24, borderRadius: "50%", border: tema === k? `2px solid ${t.gold}` : "none", background: temas[k].bg, cursor: "pointer" }} />
                ))}
              </div>
            </div>
            <button onClick={() => setMenuAberto(!menuAberto)} style={{ background: "none", border: `1px solid ${t.border}`, color: t.text, padding: 8, borderRadius: 8, display: "block" }}>☰</button>
          </div>
          <div className="container nav-desktop" style={{ gap: 28, borderTop: `1px solid ${t.border}` }}>
            {abas.map(a => (
              <button key={a.id} onClick={() => scrollToSection(a.id)} style={{ background: "none", border: "none", color: abaAtiva === a.id? t.gold : t.textMuted, padding: "14px 0", fontSize: 14, cursor: "pointer", borderBottom: abaAtiva === a.id? `2px solid ${t.gold}` : "2px solid transparent" }}>{a.label}</button>
            ))}
          </div>
        </nav>

        {menuAberto && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} onClick={() => setMenuAberto(false)}>
            <div style={{ background: t.bg, padding: 20 }} onClick={e => e.stopPropagation()}>
              {abas.map(a => <div key={a.id} onClick={() => scrollToSection(a.id)} style={{ padding: 14, borderBottom: `1px solid ${t.border}`, cursor: "pointer" }}>{a.label}</div>)}
            </div>
          </div>
        )}

        <section style={{ background: `linear-gradient(180deg, ${t.heroBg} 0%, ${t.bg} 100%)`, padding: "48px 0" }}>
          <div className="container hero-wrap fade-up">
            <div style={{ position: "relative" }}>
              <div style={{ width: 180, height: 180, borderRadius: "50%", padding: 4, background: `conic-gradient(from 0deg, ${t.gold}, ${t.goldLight}, ${t.goldDark}, ${t.gold})` }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: t.bgSecond, border: `3px solid ${t.bg}` }}>
                  {fotoUrl? <img src={fotoUrl} alt={nomeCompleto} className="img-cover" style={{ filter: "grayscale(20%)" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted }}>Sem foto</div>}
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={C.label}>Em Memória</div>
              <h1 className="fd" style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 300, margin: "8px 0 12px", lineHeight: 1.1 }}>{nomeCompleto}</h1>
              <div className="fd" style={{ fontSize: 22, color: t.gold, marginBottom: 8 }}>{dataNascimento} — {dataFalecimento}</div>
              {cidade && <div style={{ color: t.textMuted, fontSize: 15, marginBottom: 16 }}>📍 {cidade}</div>}
              {vinculos.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>{vinculos.map(v => <span key={v} style={C.tag}>👤 {v}</span>)}</div>}
              {frasePreferida && <div style={{ marginTop: 24, paddingLeft: 20, borderLeft: `3px solid ${t.gold}` }}><p className="fd" style={{ fontSize: 20, fontStyle: "italic", color: t.textLight, margin: 0, lineHeight: 1.5 }}>"{frasePreferida}"</p></div>}
            </div>
          </div>
        </section>

        <main className="container" style={{ padding: "32px 16px", display: "flex", flexDirection: "column", gap: 40 }}>
          <section id="sec-sobre">
            <h2 className="fd" style={{ fontSize: 28, marginBottom: 20, fontWeight: 400 }}>Sobre</h2>
            <div className="sobre-grid">
              <div style={{...C.card, padding: 28 }} className="card-lift">
                <div style={C.label}>Biografia</div>
                <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.8, color: t.textLight, whiteSpace: "pre-wrap" }}>{biografia || "A biografia será adicionada em breve pela família."}</p>
              </div>
              {videoUrl && <div style={{...C.card, padding: 12 }} className="card-lift"><div style={{ aspectRatio: "16/9", borderRadius: 8, overflow: "hidden" }}><iframe src={getEmbedUrl(videoUrl)} style={{ width: "100%", height: "100%", border: 0 }} allowFullScreen title="Vídeo" /></div></div>}
            </div>
          </section>

          {timeline.length > 0 && (
            <section id="sec-timeline">
              <h2 className="fd" style={{ fontSize: 28, marginBottom: 20, fontWeight: 400 }}>Linha do Tempo</h2>
              <div style={{ position: "relative", paddingLeft: 28 }}>
                <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: `linear-gradient(to bottom, ${t.gold}, transparent)` }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  {timeline.map((ev, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <div style={{ position: "absolute", left: -28, top: 6, width: 16, height: 16, borderRadius: "50%", background: t.gold, boxShadow: `0 0 0 4px ${t.bg}`, border: `2px solid ${t.bg}` }} />
                      <div style={{...C.card, padding: 20 }} className="card-lift">
                        <div style={{ color: t.gold, fontWeight: 700, fontSize: 18, fontFamily: "'Cormorant Garamond', serif" }}>{ev.year}</div>
                        <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>{ev.title}</div>
                        {ev.description && <div style={{ color: t.textMuted, marginTop: 6, lineHeight: 1.6 }}>{ev.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section id="sec-homenagens">
            <h2 className="fd" style={{ fontSize: 28, marginBottom: 20, fontWeight: 400 }}>Homenagens {homenagens.length > 0 && <span style={{ color: t.gold, fontSize: 18 }}>({homenagens.length})</span>}</h2>
            <div className="hom-grid">
              {homenagens.map(h => (
                <div key={h.id} style={{...C.card, padding: 20 }} className="card-lift">
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: t.bgSecond, flexShrink: 0 }}>{h.visitorPhoto? <img src={h.visitorPhoto} alt="" className="img-cover" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted, fontSize: 14 }}>{h.visitorName[0]}</div>}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <strong style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.visitorName}</strong>
                        <span style={{ fontSize: 12, color: t.textMuted, flexShrink: 0 }}>{formatTime(h.createdAt)}</span>
                      </div>
                      <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: t.textLight, whiteSpace: "pre-wrap" }}>{h.message}</p>
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: "#e05555", fontSize: 13 }}>❤ {h.likes}</div>
                    </div>
                  </div>
                </div>
              ))}
              {homenagens.length === 0 && <div style={{...C.card, padding: 40, textAlign: "center", gridColumn: "1 / -1", color: t.textMuted }}>Seja o primeiro a deixar uma homenagem.</div>}
            </div>
          </section>

          <section id="sec-livro">
            <h2 className="fd" style={{ fontSize: 28, marginBottom: 20, fontWeight: 400 }}>Livro de Assinaturas</h2>
            <form onSubmit={handleSubmit} style={{...C.card, padding: 24 }}>
              <div className="sobre-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <input style={C.input} placeholder="Seu nome completo" value={nomeVisitante} onChange={e => setNomeVisitante(e.target.value)} required />
                <input style={C.input} placeholder="Relação (ex: Filha, Amigo)" value={relacao} onChange={e => setRelacao(e.target.value)} />
              </div>
              <textarea style={{...C.input, marginTop: 12, minHeight: 100, resize: "vertical" }} placeholder="Deixe sua mensagem de carinho..." value={mensagem} onChange={e => setMensagem(e.target.value)} required />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button type="submit" disabled={submitting} style={{...C.btnGold, opacity: submitting? 0.6 : 1 }}>{submitting? "Enviando..." : "Assinar Livro"}</button>
              </div>
              {submitOk && <div style={{ marginTop: 12, padding: 10, background: t.tagBg, border: `1px solid ${t.borderStrong}`, borderRadius: 8, color: t.gold, fontSize: 13 }}>✓ Assinatura registrada com carinho.</div>}
            </form>
            <div className="ass-grid" style={{ marginTop: 24 }}>
              {assinaturas.map(a => (
                <div key={a.id} style={{...C.card, padding: 20, textAlign: "center" }} className="card-lift">
                  <div className="cursive" style={{ fontSize: 24, color: t.gold, marginBottom: 4 }}>{a.visitorName}</div>
                  {a.relationship && <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>{a.relationship}</div>}
                  <p style={{ fontSize: 14, lineHeight: 1.5, color: t.textLight, fontStyle: "italic", margin: 0 }}>"{a.message}"</p>
                  <div style={{ marginTop: 10, fontSize: 11, color: t.textMuted }}>{new Date(a.createdAt).toLocaleDateString('pt-BR')}</div>
                </div>
              ))}
            </div>
          </section>

          {galeria.length > 0 && (
            <section id="sec-galeria">
              <h2 className="fd" style={{ fontSize: 28, marginBottom: 20, fontWeight: 400 }}>Galeria</h2>
              <div className="gal-grid">
                {galeria.map((item, i) => (
                  <div key={i} style={{...C.card, padding: 0, aspectRatio: "1", overflow: "hidden", position: "relative", cursor: "pointer" }} className="card-lift">
                    <img src={item.url} alt="" className="img-cover" />
                    {item.tipo === "video" && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}><div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>▶</div></div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {localizacao && (
            <section id="sec-localizacao">
              <h2 className="fd" style={{ fontSize: 28, marginBottom: 20, fontWeight: 400 }}>Localização</h2>
              <div className="loc-grid">
                <div style={{...C.card, padding: 24 }}>
                  <div style={C.label}>Jazigo</div>
                  <div style={{ marginTop: 12, lineHeight: 1.8 }}>
                    <div><strong>Cemitério:</strong> {localizacao.cemiterio}</div>
                    <div><strong>Quadra:</strong> {localizacao.quadra} • <strong>Lote:</strong> {localizacao.lote} • <strong>Sepultura:</strong> {localizacao.sepultura}</div>
                  </div>
                </div>
                <div style={{...C.card, padding: 24, textAlign: "center" }}>
                  <div style={C.label}>QR Code do Memorial</div>
                  <div style={{ marginTop: 12, display: "inline-block", padding: 12, background: "white", borderRadius: 8 }}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(slugUrl || "")}`} alt="QR" width={120} height={120} />
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        <footer style={{ borderTop: `1px solid ${t.border}`, marginTop: 60, padding: "32px 0" }}>
          <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo color={t.gold} size={24} /><span className="fd">Legado Digital</span></div>
            <div style={{ display: "flex", gap: 20, fontSize: 12, color: t.textMuted }}><span>🔒 Site Seguro</span><span>✓ Verificado</span><span>© 2025</span></div>
          </div>
        </footer>
      </div>
    </>
  );
}