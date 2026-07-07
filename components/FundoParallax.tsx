"use client";

interface FundoParallaxProps {
  /** imagem com as velas apagadas (estado inicial) */
  srcApagada: string;
  /** imagem com as velas acesas */
  srcAcesa: string;
  /** estado atual: true = acesas */
  acesa: boolean;
  /** camada escura por cima, pra leitura do texto */
  overlay?: string;
  /** posição do recorte da imagem */
  posicao?: string;
}

/**
 * Fundo de velas estático com crossfade suave entre apagada e acesa.
 *
 * Nota: a versão anterior tinha inclinação 3D contínua (requestAnimationFrame
 * infinito + preserve-3d + will-change + giroscópio). Em navegadores/GPUs mais
 * fracos isso vazava memória do compositor até o navegador matar a aba
 * ("This page couldn't load"). Removido o loop de animação — o fundo agora é
 * estático, sem dependência de rede nem compute contínuo.
 */
export default function FundoParallax({
  srcApagada,
  srcAcesa,
  acesa,
  overlay = "linear-gradient(180deg, rgba(8,16,24,0.74) 0%, rgba(8,16,24,0.38) 45%, rgba(8,16,24,0.12) 100%)",
  posicao = "center 72%",
}: FundoParallaxProps) {
  const camada: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: posicao,
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {/* velas apagadas — sempre visível por baixo */}
      <div style={{ ...camada, backgroundImage: `url(${srcApagada})` }} />
      {/* velas acesas — aparece no crossfade */}
      <div
        style={{
          ...camada,
          backgroundImage: `url(${srcAcesa})`,
          opacity: acesa ? 1 : 0,
          transition: "opacity 1.6s ease-in-out",
        }}
      />

      {/* brilho dourado que entra ao acender */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(120% 80% at 50% 85%, rgba(255,180,90,0.30), rgba(255,150,60,0.10) 40%, transparent 70%)",
          opacity: acesa ? 1 : 0,
          transition: "opacity 1.8s ease-in-out",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* camada escura pra leitura do texto */}
      <div style={{ position: "absolute", inset: 0, background: overlay, pointerEvents: "none" }} />
    </div>
  );
}
