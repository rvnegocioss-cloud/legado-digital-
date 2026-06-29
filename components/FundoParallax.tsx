"use client";

import { useEffect, useRef } from "react";

interface FundoParallaxProps {
  /** imagem com as velas apagadas (estado inicial) */
  srcApagada: string;
  /** imagem com as velas acesas */
  srcAcesa: string;
  /** estado atual: true = acesas */
  acesa: boolean;
  /** camada escura por cima, pra leitura do texto */
  overlay?: string;
  /** intensidade do movimento 3D */
  forca?: number;
  /** posição do recorte da imagem */
  posicao?: string;
}

/**
 * Fundo de velas com:
 * - crossfade suave entre apagada e acesa (brilho dourado entrando)
 * - inclinação 3D pelo mouse (PC), arrastar o dedo e giroscópio (celular)
 * Mobile-first, leve, sem bibliotecas.
 */
export default function FundoParallax({
  srcApagada,
  srcAcesa,
  acesa,
  overlay = "linear-gradient(180deg, rgba(8,16,24,0.74) 0%, rgba(8,16,24,0.38) 45%, rgba(8,16,24,0.12) 100%)",
  forca = 26,
  posicao = "center 72%",
}: FundoParallaxProps) {
  const tiltRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = tiltRef.current;
    if (!el) return;

    let nx = 0, ny = 0, cx = 0, cy = 0, raf = 0;

    const loop = () => {
      cx += (nx - cx) * 0.08;
      cy += (ny - cy) * 0.08;
      const ry = cx * 13;            // o lado para onde o cursor aponta vem para frente
      const rx = -cy * 9;
      const tX = cx * -forca;
      const tY = cy * -forca * 0.6;
      el.style.transform =
        `scale(1.16) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${tX}px, ${tY}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    const onMouse = (e: MouseEvent) => {
      nx = clamp((e.clientX / window.innerWidth - 0.5) * 2);
      ny = clamp((e.clientY / window.innerHeight - 0.5) * 2);
    };

    // celular: arrastar o dedo move o fundo (funciona em qualquer aparelho)
    const onTouch = (e: TouchEvent) => {
      const tch = e.touches[0];
      if (!tch) return;
      nx = clamp((tch.clientX / window.innerWidth - 0.5) * 2);
      ny = clamp((tch.clientY / window.innerHeight - 0.5) * 2);
    };

    // celular: giroscópio (iOS precisa de permissão pedida num toque)
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      nx = clamp(e.gamma / 28);
      ny = clamp((e.beta - 45) / 28);
    };

    const pedirGiro = () => {
      const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (D && typeof D.requestPermission === "function") {
        D.requestPermission().then((r) => {
          if (r === "granted") window.addEventListener("deviceorientation", onOrient);
        }).catch(() => {});
      } else {
        window.addEventListener("deviceorientation", onOrient);
      }
      window.removeEventListener("touchstart", pedirGiro);
    };

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchstart", pedirGiro);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchstart", pedirGiro);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [forca]);

  const camada: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: posicao,
    backfaceVisibility: "hidden",
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, perspective: "1000px" }}>
      <div
        ref={tiltRef}
        style={{
          position: "absolute",
          inset: "-12%",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
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
      </div>

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
