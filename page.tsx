/**
 * HomenagemTemplate — Legado Digital
 * Arquivo: app/homenagem/[id]/page.tsx
 *
 * Componente de homenagem póstuma de alta performance.
 * Paleta: Stone/Slate (cinzas sofisticados) + Gold (toques dourados).
 * Tipografia: Cormorant Garamond (display) + Lato (corpo).
 * Pronto para integração com Supabase.
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

// ---------------------------------------------------------------------------
// INTERFACES DE DADOS
// ---------------------------------------------------------------------------

export interface Condolence {
  id: string;
  visitorName: string;
  message: string;
  createdAt: string; // ISO string vindo do Supabase
}

export interface HomenagemProps {
  /** URL da foto principal do falecido */
  fotoUrl: string;
  /** Nome completo do falecido */
  nomeCompleto: string;
  /** Data de nascimento — ex: "12 de março de 1945" */
  dataNascimento: string;
  /** Data de falecimento — ex: "3 de junho de 2024" */
  dataFalecimento: string;
  /** Texto de biografia / perfil */
  biografia: string;
  /** URL de vídeo (YouTube embed ou MP4 direto) */
  videoUrl?: string;
  /** Array de URLs de fotos para a galeria */
  galeriaFotos?: string[];
  /** Lista inicial de condolências (pré-carregadas do servidor) */
  condolencias?: Condolence[];
}

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export default function HomenagemTemplate({
  fotoUrl,
  nomeCompleto,
  dataNascimento,
  dataFalecimento,
  biografia,
  videoUrl,
  galeriaFotos = [],
  condolencias: initialCondolences = [],
}: HomenagemProps) {
  // -------------------------------------------------------------------------
  // ESTADO LOCAL
  // -------------------------------------------------------------------------
  const [condolencias, setCondolencias] = useState<Condolence[]>(initialCondolences);
  const [visitorName, setVisitorName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // -------------------------------------------------------------------------
  // EFEITO: Carregar condolências em tempo real (opcional — WebSocket Supabase)
  // -------------------------------------------------------------------------
  useEffect(() => {
    // TODO: Integrar com Supabase Realtime
    // Exemplo:
    // const channel = supabase
    //   .channel("condolencias")
    //   .on("postgres_changes", { event: "INSERT", schema: "public", table: "condolencias" }, (payload) => {
    //     setCondolencias((prev) => [payload.new as Condolence, ...prev]);
    //   })
    //   .subscribe();
    // return () => { supabase.removeChannel(channel); };
  }, []);

  // -------------------------------------------------------------------------
  // ENVIO DE CONDOLÊNCIA
  // -------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !message.trim()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      // TODO: Integrar com Supabase
      // const { data, error } = await supabase
      //   .from("condolencias")
      //   .insert([{ visitor_name: visitorName, message, homenagem_id: params.id }])
      //   .select()
      //   .single();
      // if (error) throw error;
      // setCondolencias((prev) => [data, ...prev]);

      // Simulação local (remover após integrar Supabase):
      await new Promise((r) => setTimeout(r, 800));
      const newCondolence: Condolence = {
        id: crypto.randomUUID(),
        visitorName,
        message,
        createdAt: new Date().toISOString(),
      };
      setCondolencias((prev) => [newCondolence, ...prev]);

      setVisitorName("");
      setMessage("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch {
      setSubmitError("Não foi possível enviar sua mensagem. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  // Detecta se a URL de vídeo é YouTube e converte para embed
  const getEmbedUrl = (url: string): string => {
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url; // Assume URL direta (MP4, Vimeo embed, etc.)
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <>
      {/* Fontes via Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Lato:wght@300;400;700&display=swap');

        :root {
          --gold: #b8973a;
          --gold-light: #d4af6a;
          --gold-muted: #8a6f2e;
        }

        body { background-color: #1a1917; }

        .font-display { font-family: 'Cormorant Garamond', serif; }
        .font-body    { font-family: 'Lato', sans-serif; }

        .gold-divider {
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
        }

        .photo-ring {
          background: conic-gradient(
            var(--gold) 0deg,
            var(--gold-light) 90deg,
            var(--gold-muted) 180deg,
            var(--gold-light) 270deg,
            var(--gold) 360deg
          );
        }

        .gallery-item:hover img {
          transform: scale(1.05);
          filter: grayscale(0%);
        }

        .gallery-item img {
          transition: transform 0.6s ease, filter 0.6s ease;
          filter: grayscale(20%);
        }

        .condolence-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(184,151,58,0.25);
          color: #e2ddd8;
          transition: border-color 0.3s, background 0.3s;
        }

        .condolence-input:focus {
          outline: none;
          border-color: var(--gold);
          background: rgba(255,255,255,0.07);
        }

        .condolence-input::placeholder {
          color: rgba(180,170,155,0.45);
        }

        .btn-gold {
          background: linear-gradient(135deg, var(--gold-muted), var(--gold), var(--gold-light));
          background-size: 200% 200%;
          transition: background-position 0.4s ease, opacity 0.3s;
        }

        .btn-gold:hover {
          background-position: right center;
        }

        .fade-in {
          animation: fadeUp 0.9s ease both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .section-appear { animation: fadeUp 0.8s ease both; }
      `}</style>

      <main className="min-h-screen font-body" style={{ backgroundColor: "#1a1917", color: "#e2ddd8" }}>

        {/* ================================================================
            HERO SECTION
        ================================================================ */}
        <section className="relative flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center fade-in">

          {/* Ornamento de fundo */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(184,151,58,0.07) 0%, transparent 70%)",
            }}
          />

          {/* Foto circular com anel dourado */}
          <div className="relative mb-8">
            <div
              className="photo-ring rounded-full p-[3px] shadow-2xl"
              style={{ width: 180, height: 180 }}
            >
              <div className="relative rounded-full overflow-hidden bg-stone-800" style={{ width: "100%", height: "100%" }}>
                {fotoUrl ? (
                  <Image
                    src={fotoUrl}
                    alt={`Foto de ${nomeCompleto}`}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  /* Placeholder quando não há foto */
                  <div className="flex items-center justify-center w-full h-full bg-stone-700">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(184,151,58,0.6)" strokeWidth="1">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Ponto dourado decorativo */}
            <span
              className="absolute bottom-2 right-2 rounded-full border-2"
              style={{
                width: 16,
                height: 16,
                background: "var(--gold)",
                borderColor: "#1a1917",
              }}
            />
          </div>

          {/* Nome */}
          <h1
            className="font-display mb-3 leading-tight"
            style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", color: "#f0ebe3", fontWeight: 300, letterSpacing: "0.02em" }}
          >
            {nomeCompleto}
          </h1>

          {/* Datas */}
          <p
            className="font-display tracking-widest uppercase"
            style={{ color: "var(--gold)", fontSize: "0.8rem", letterSpacing: "0.25em", fontWeight: 400 }}
          >
            {dataNascimento}
            <span className="mx-3" style={{ color: "rgba(184,151,58,0.5)" }}>✦</span>
            {dataFalecimento}
          </p>

          {/* Divider dourado */}
          <div className="gold-divider mt-10 h-px w-48 opacity-60" />
        </section>

        {/* ================================================================
            BIOGRAFIA
        ================================================================ */}
        <section className="section-appear mx-auto max-w-2xl px-6 pb-16 text-center">
          <p
            className="font-display leading-relaxed"
            style={{ fontSize: "clamp(1.05rem, 2.5vw, 1.25rem)", color: "#c8c0b4", fontWeight: 300, fontStyle: "italic" }}
          >
            {biografia}
          </p>
        </section>

        {/* ================================================================
            VÍDEO (condicional)
        ================================================================ */}
        {videoUrl && (
          <section className="section-appear mx-auto max-w-3xl px-6 pb-20">
            {/* Título da seção */}
            <div className="flex items-center gap-4 mb-6">
              <div className="gold-divider h-px flex-1 opacity-40" />
              <span
                className="font-display uppercase tracking-widest text-xs"
                style={{ color: "var(--gold)", letterSpacing: "0.3em" }}
              >
                Memória em Vídeo
              </span>
              <div className="gold-divider h-px flex-1 opacity-40" />
            </div>

            {/* Player responsivo */}
            <div
              className="aspect-video w-full overflow-hidden rounded-sm shadow-2xl"
              style={{ border: "1px solid rgba(184,151,58,0.2)" }}
            >
              <iframe
                src={getEmbedUrl(videoUrl)}
                title={`Vídeo em homenagem a ${nomeCompleto}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </section>
        )}

        {/* ================================================================
            GALERIA DE FOTOS (condicional)
        ================================================================ */}
        {galeriaFotos.length > 0 && (
          <section className="section-appear mx-auto max-w-5xl px-6 pb-20">
            {/* Título da seção */}
            <div className="flex items-center gap-4 mb-8">
              <div className="gold-divider h-px flex-1 opacity-40" />
              <span
                className="font-display uppercase tracking-widest text-xs"
                style={{ color: "var(--gold)", letterSpacing: "0.3em" }}
              >
                Galeria
              </span>
              <div className="gold-divider h-px flex-1 opacity-40" />
            </div>

            {/* Grid responsivo */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {galeriaFotos.map((url, idx) => (
                <div
                  key={idx}
                  className="gallery-item relative aspect-square overflow-hidden rounded-sm"
                  style={{ border: "1px solid rgba(184,151,58,0.15)" }}
                >
                  <Image
                    src={url}
                    alt={`Foto ${idx + 1} da galeria`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  {/* Overlay escuro sutil */}
                  <div
                    className="absolute inset-0"
                    style={{ background: "rgba(26,25,23,0.2)" }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================
            SEÇÃO DE CONDOLÊNCIAS
        ================================================================ */}
        <section className="section-appear mx-auto max-w-2xl px-6 pb-24">

          {/* Título da seção */}
          <div className="flex items-center gap-4 mb-10">
            <div className="gold-divider h-px flex-1 opacity-40" />
            <span
              className="font-display uppercase tracking-widest text-xs"
              style={{ color: "var(--gold)", letterSpacing: "0.3em" }}
            >
              Livro de Condolências
            </span>
            <div className="gold-divider h-px flex-1 opacity-40" />
          </div>

          {/* Formulário */}
          {/* TODO: Integrar com Supabase — ver função handleSubmit acima */}
          <form onSubmit={handleSubmit} className="mb-12 space-y-4">
            <input
              type="text"
              placeholder="Seu nome"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              maxLength={80}
              required
              className="condolence-input w-full rounded-sm px-4 py-3 text-sm font-body"
            />

            <textarea
              placeholder="Deixe sua mensagem de carinho..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              required
              className="condolence-input w-full rounded-sm px-4 py-3 text-sm font-body resize-none"
            />

            {/* Feedback de erro */}
            {submitError && (
              <p className="text-xs" style={{ color: "#e07070" }}>
                {submitError}
              </p>
            )}

            {/* Feedback de sucesso */}
            {submitSuccess && (
              <p className="text-xs" style={{ color: "var(--gold-light)" }}>
                ✦ Sua mensagem foi registrada com respeito e gratidão.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-gold w-full rounded-sm py-3 text-sm font-body font-semibold tracking-widest uppercase disabled:opacity-50"
              style={{ color: "#1a1917", letterSpacing: "0.2em" }}
            >
              {submitting ? "Enviando..." : "Enviar Mensagem"}
            </button>
          </form>

          {/* Lista de condolências */}
          {/* TODO: Integrar com Supabase — dados vêm via props ou Realtime */}
          <div className="space-y-6">
            {condolencias.length === 0 && (
              <p
                className="text-center text-sm font-display italic"
                style={{ color: "rgba(180,170,155,0.45)" }}
              >
                Seja o primeiro a deixar uma mensagem.
              </p>
            )}

            {condolencias.map((c) => (
              <div
                key={c.id}
                className="rounded-sm p-5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(184,151,58,0.12)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="font-display text-sm font-semibold"
                    style={{ color: "var(--gold-light)" }}
                  >
                    {c.visitorName}
                  </span>
                  <span
                    className="font-body text-xs"
                    style={{ color: "rgba(180,170,155,0.45)" }}
                  >
                    {formatDate(c.createdAt)}
                  </span>
                </div>
                <p
                  className="font-body text-sm leading-relaxed"
                  style={{ color: "#b0a89e" }}
                >
                  {c.message}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================
            FOOTER — Legado Digital
        ================================================================ */}
        <footer
          className="border-t py-10 text-center"
          style={{ borderColor: "rgba(184,151,58,0.12)" }}
        >
          <div className="flex flex-col items-center gap-2">
            {/* Logotipo texto da marca */}
            <span
              className="font-display tracking-widest uppercase"
              style={{ color: "var(--gold-muted)", fontSize: "0.7rem", letterSpacing: "0.4em" }}
            >
              Legado Digital
            </span>
            <div className="gold-divider h-px w-16 opacity-30 my-1" />
            <p
              className="font-body text-xs"
              style={{ color: "rgba(180,170,155,0.35)" }}
            >
              Preservando memórias com dignidade e respeito.
            </p>
            <a
              href="/criar"
              className="font-body text-xs mt-2 transition-colors duration-300"
              style={{ color: "rgba(184,151,58,0.55)", textDecoration: "none" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--gold)")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(184,151,58,0.55)")}
            >
              + Criar nova homenagem
            </a>
          </div>
        </footer>

      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// EXEMPLO DE USO: app/homenagem/[id]/page.tsx
// ---------------------------------------------------------------------------
//
// import { createClient } from "@/lib/supabase/server";
// import HomenagemTemplate from "@/components/HomenagemTemplate";
//
// export default async function HomenagemsPage({ params }: { params: { id: string } }) {
//   // TODO: Integrar com Supabase — buscar dados da homenagem
//   // const supabase = createClient();
//   // const { data: homenagem } = await supabase
//   //   .from("homenagens")
//   //   .select("*, condolencias(*)")
//   //   .eq("id", params.id)
//   //   .single();
//
//   // if (!homenagem) notFound();
//
//   return (
//     <HomenagemTemplate
//       fotoUrl={homenagem.foto_url}
//       nomeCompleto={homenagem.nome_completo}
//       dataNascimento={homenagem.data_nascimento}
//       dataFalecimento={homenagem.data_falecimento}
//       biografia={homenagem.biografia}
//       videoUrl={homenagem.video_url}
//       galeriaFotos={homenagem.galeria_fotos}
//       condolencias={homenagem.condolencias}
//     />
//   );
// }
