"use client";

import { useEffect, useRef } from "react";

interface FundoParallaxProps {
  /** caminho da imagem em /public (ex: "/velas.jpg") */
  src: string;
  /** camada escura por cima, pra leitura do texto */
  overlay?: string;
  /** intensidade do movimento (px) */
  forca?: number;
}

/**
 * Fundo com efeito parallax 3D.
 * - PC: a imagem se move conforme o mouse (profundidade).
 * - Celular: reage ao inclinar o aparelho (giroscópio).
 * Mobile-first, leve (sem bibliotecas).
 */
export default function FundoParallax({
  src,
  overlay = "linear-gradient(180deg, rgba(8,16,24,0.45) 0%, rgba(8,16,24,0.78) 100%)",
  forca = 28,
}: FundoParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    const loop = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      el.style.transform = `scale(1.14) translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const onMouse = (e: MouseEvent) => {
      tx = ((e.clientX / window.innerWidth) - 0.5) * -forca * 2;
      ty = ((e.clientY / window.innerHeight) - 0.5) * -forca;
    };

    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tx = clamp(e.gamma / 30) * -forca * 1.6;
      ty = clamp((e.beta - 45) / 30) * -forca;
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
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: "-7%",
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          willChange: "transform",
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: overlay }} />
    </div>
  );
}
