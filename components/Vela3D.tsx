"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface Vela3DProps {
  /** cor de acento (dourado) vinda do tema */
  cor?: string;
  /** começa acesa? */
  iniciarAcesa?: boolean;
}

/**
 * Vela 3D interativa — toque/clique para acender ou apagar.
 * Mobile-first, leve, componente isolado (não depende do resto da página).
 */
export default function Vela3D({ cor = "#C9A46A", iniciarAcesa = true }: Vela3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const acesaRef = useRef(iniciarAcesa);
  const [acesa, setAcesa] = useState(iniciarAcesa);

  useEffect(() => { acesaRef.current = acesa; }, [acesa]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const goldHex = new THREE.Color(cor);
    const W = () => mount.clientWidth;
    const H = () => mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 100);
    camera.position.set(0, 1.1, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W(), H());
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = "pointer";
    renderer.domElement.style.touchAction = "manipulation";

    // luz ambiente fraca (sempre presente)
    const ambient = new THREE.AmbientLight(0x88aacc, 0.35);
    scene.add(ambient);

    const grupo = new THREE.Group();
    scene.add(grupo);

    // corpo da vela
    const corpoGeo = new THREE.CylinderGeometry(0.45, 0.5, 2.2, 48);
    const corpoMat = new THREE.MeshStandardMaterial({ color: 0xf3ece0, roughness: 0.55, metalness: 0.0 });
    const corpo = new THREE.Mesh(corpoGeo, corpoMat);
    corpo.position.y = -0.3;
    grupo.add(corpo);

    // topo da vela (leve depressão)
    const topoGeo = new THREE.CylinderGeometry(0.42, 0.45, 0.08, 48);
    const topoMat = new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.6 });
    const topo = new THREE.Mesh(topoGeo, topoMat);
    topo.position.y = 0.84;
    grupo.add(topo);

    // pavio
    const pavioGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.22, 8);
    const pavioMat = new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 1 });
    const pavio = new THREE.Mesh(pavioGeo, pavioMat);
    pavio.position.y = 0.95;
    grupo.add(pavio);

    // chama (cone com material emissivo)
    const chamaGeo = new THREE.ConeGeometry(0.16, 0.55, 24);
    const chamaMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.95 });
    const chama = new THREE.Mesh(chamaGeo, chamaMat);
    chama.position.y = 1.32;
    grupo.add(chama);

    // núcleo da chama (mais clara)
    const nucleoGeo = new THREE.ConeGeometry(0.08, 0.32, 16);
    const nucleoMat = new THREE.MeshBasicMaterial({ color: 0xfff4d0 });
    const nucleo = new THREE.Mesh(nucleoGeo, nucleoMat);
    nucleo.position.y = 1.28;
    grupo.add(nucleo);

    // halo/glow ao redor da chama
    const haloGeo = new THREE.SphereGeometry(0.4, 24, 24);
    const haloMat = new THREE.MeshBasicMaterial({ color: goldHex, transparent: true, opacity: 0.12 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 1.32;
    grupo.add(halo);

    // luz da chama (ilumina o ambiente)
    const luz = new THREE.PointLight(0xffcaa0, 0, 14, 2);
    luz.position.set(0, 1.4, 0.2);
    scene.add(luz);

    // luz de preenchimento fraca para a vela não ficar 100% preta apagada
    const fill = new THREE.DirectionalLight(0x6680aa, 0.5);
    fill.position.set(2, 4, 3);
    scene.add(fill);

    // partículas (brasas subindo)
    const N = 90;
    const poss = new Float32Array(N * 3);
    const speeds = new Float32Array(N);
    const reset = (i: number) => {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.12;
      poss[i * 3] = Math.cos(a) * r;
      poss[i * 3 + 1] = 1.4 + Math.random() * 0.3;
      poss[i * 3 + 2] = Math.sin(a) * r;
      speeds[i] = 0.004 + Math.random() * 0.01;
    };
    for (let i = 0; i < N; i++) reset(i);
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute("position", new THREE.BufferAttribute(poss, 3));
    const partMat = new THREE.PointsMaterial({ color: goldHex, size: 0.06, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const particulas = new THREE.Points(partGeo, partMat);
    scene.add(particulas);

    // toggle acender/apagar
    const onClick = () => setAcesa((v) => !v);
    renderer.domElement.addEventListener("click", onClick);

    let raf = 0;
    let tempo = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      tempo += 0.05;
      const ligada = acesaRef.current;

      // flicker da chama
      const flick = ligada ? 0.85 + Math.sin(tempo * 7) * 0.08 + Math.random() * 0.06 : 0;
      chama.scale.set(1, flick, 1);
      nucleo.scale.set(1, flick, 1);
      chama.position.x = ligada ? Math.sin(tempo * 4) * 0.012 : 0;
      nucleo.position.x = chama.position.x;
      chama.visible = ligada;
      nucleo.visible = ligada;

      // luz pulsante
      const alvoLuz = ligada ? 2.2 + Math.sin(tempo * 6) * 0.4 : 0;
      luz.intensity += (alvoLuz - luz.intensity) * 0.15;
      const alvoHalo = ligada ? 0.12 + Math.sin(tempo * 6) * 0.04 : 0;
      haloMat.opacity += (alvoHalo - haloMat.opacity) * 0.15;
      halo.visible = haloMat.opacity > 0.005;

      // partículas
      const alvoPart = ligada ? 0.9 : 0;
      partMat.opacity += (alvoPart - partMat.opacity) * 0.08;
      for (let i = 0; i < N; i++) {
        poss[i * 3 + 1] += speeds[i] * (ligada ? 1 : 0.3);
        poss[i * 3] += Math.sin(tempo + i) * 0.0008;
        if (poss[i * 3 + 1] > 2.3) reset(i);
      }
      partGeo.attributes.position.needsUpdate = true;

      // rotação suave do conjunto
      grupo.rotation.y = Math.sin(tempo * 0.15) * 0.18;

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      corpoGeo.dispose(); corpoMat.dispose();
      topoGeo.dispose(); topoMat.dispose();
      pavioGeo.dispose(); pavioMat.dispose();
      chamaGeo.dispose(); chamaMat.dispose();
      nucleoGeo.dispose(); nucleoMat.dispose();
      haloGeo.dispose(); haloMat.dispose();
      partGeo.dispose(); partMat.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [cor]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div
        ref={mountRef}
        style={{ width: "100%", maxWidth: 260, height: 300, margin: "0 auto" }}
        aria-label="Vela em memória — toque para acender ou apagar"
      />
      <span style={{ fontSize: 12, letterSpacing: 1, opacity: 0.7 }}>
        {acesa ? "Toque para apagar" : "Toque para acender"}
      </span>
    </div>
  );
}
