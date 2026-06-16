"use client";

import { useEffect, useRef } from "react";

interface FundoParallaxProps {
  /** caminho da imagem em /public (ex: "/velas.jpg") */
  src: string;
  /** camada escura por cima, pra leitura do texto */
  overlay?: string;
  /** intensidade do movimento (px) */
  forca?: number;
  /** posição do recorte da imagem */
  posicao?: string;
}

/**
 * Fundo com efeito parallax 3D.
 * - PC: a imagem se move conforme o mouse (profundidade).
 * - Celular: reage ao inclinar o aparelho (giroscópio).
 * Mobile-first, leve (sem bibliotecas).
 */
export default function FundoParallax({
  src,
  overlay = "linear-gradient(180deg, rgba(8,16,24,0.74) 0%, rgba(8,16,24,0.38) 45%, rgba(8,16,24,0.12) 100%)",
  forca = 28,
  posicao = "center 72%",
}: FundoParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // nx, ny = posição do mouse normalizada (-1..1); cx, cy = valores suavizados
    let nx = 0, ny = 0, cx = 0, cy = 0, raf = 0;

    const loop = () => {
      cx += (nx - cx) * 0.08;
      cy += (ny - cy) * 0.08;
      // inclinação 3D: o lado para onde o mouse aponta vem para frente (cresce)
      const ry = cx * 14;          // rotação no eixo Y (graus)
      const rx = -cy * 10;         // rotação no eixo X (graus)
      const tX = cx * -forca;      // leve deslocamento junto
      const tY = cy * -forca * 0.6;
      el.style.transform =
        `scale(1.18) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${tX}px, ${tY}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onMouse = (e: MouseEvent) => {
      nx = clamp((e.clientX / window.innerWidth - 0.5) * 2);
      ny = clamp((e.clientY / window.innerHeight - 0.5) * 2);
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      nx = clamp(e.gamma / 30);
      ny = clamp((e.beta - 45) / 30);
    };

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("deviceorientation", onOrient);
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [forca]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0, perspective: "900px" }}>
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: "-12%",
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: posicao,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: overlay }} />
    </div>
  );
}
