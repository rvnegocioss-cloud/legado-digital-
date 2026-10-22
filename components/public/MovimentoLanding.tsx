"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

// Só MOVIMENTO da landing (protótipo aprovado:
// opendesign/mockups/landing-animacao/prototipo.html). Não muda imagem, texto,
// cor, tamanho nem CSS: o estado "escondido" é aplicado só aqui, pelo GSAP, depois
// de montar -- se o JS falhar, o conteúdo fica 100% visível. Sem aurora/partículas
// (efeito visual novo, não aprovado). Montado só em app/(site)/page.tsx.
// prefers-reduced-motion: reduce => nada se anima e o Lenis nem liga.
gsap.registerPlugin(ScrollTrigger);

const FIM = { clearProps: "transform,opacity,visibility" };

export default function MovimentoLanding() {
  useEffect(() => {
    const raiz = document.querySelector<HTMLElement>(".landing");
    if (!raiz) return;

    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        // ---------- Lenis + ScrollTrigger ----------
        const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (tempo: number) => lenis.raf(tempo * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        // Mapa: zoom/pan com a roda precisa do scroll nativo.
        const mapa = raiz.querySelector<HTMLElement>(".mapa-vivo");
        mapa?.setAttribute("data-lenis-prevent", "");

        // Lightbox dos nodes (position:fixed, montada/desmontada pelo React):
        // enquanto existir, o Lenis fica parado.
        const observador = new MutationObserver(() => {
          if (document.querySelector(".landing-lightbox")) lenis.stop();
          else lenis.start();
        });
        observador.observe(document.body, { childList: true, subtree: true });

        // ---------- hero: cascata só do bloco de texto/busca ----------
        const h1 = raiz.querySelector(".hero .split > div:first-child .h1");
        const lede = raiz.querySelectorAll(
          ".hero .split > div:first-child > :not(.h1)"
        );
        // h1 só desliza (sem opacidade) pra não atrasar o LCP; o resto aparece em cascata.
        if (h1) gsap.from(h1, { y: 24, duration: 0.8, ease: "power3.out", delay: 0.05, ...FIM });
        if (lede.length) {
          gsap.from(lede, {
            y: 24,
            autoAlpha: 0,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.14,
            delay: 0.15,
            ...FIM,
          });
        }

        // ---------- seções: entrada suave (opacity + y), sem pin e sem scrub ----------
        const blocos = Array.from(
          raiz.querySelectorAll<HTMLElement>(
            ".sec > .wrap > *, #como-funciona > .wrap > *, .b2b > .wrap > *, #faq > .wrap > *"
          )
        ).filter((el) => !el.matches(".nodes-familia, .grid4, .mapcard"));
        const unicos = Array.from(new Set(blocos));
        const diffs = Array.from(raiz.querySelectorAll<HTMLElement>(".diff"));
        const nodes = Array.from(raiz.querySelectorAll<HTMLElement>(".nodes-familia .feat"));
        const mapaCard = raiz.querySelector<HTMLElement>(".mapcard");

        const entrar = (els: Element[], stagger: number, y: number) => {
          if (!els.length) return;
          gsap.set(els, { autoAlpha: 0, y });
          ScrollTrigger.batch(els, {
            start: "top 88%",
            once: true,
            interval: 0.1,
            onEnter: (alvo) =>
              gsap.to(alvo, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger, ...FIM }),
          });
        };

        entrar(unicos, 0.1, 22);
        entrar(diffs, 0.1, 18);
        // nodes: só fade leve em cascata (sem mexer em moldura/anel/imagem)
        if (nodes.length) {
          gsap.set(nodes, { autoAlpha: 0 });
          ScrollTrigger.batch(nodes, {
            start: "top 90%",
            once: true,
            interval: 0.1,
            onEnter: (alvo) =>
              gsap.to(alvo, { autoAlpha: 1, duration: 0.9, ease: "power2.out", stagger: 0.15, ...FIM }),
          });
        }
        // mapa: só fade do contêiner
        if (mapaCard) {
          gsap.set(mapaCard, { autoAlpha: 0 });
          ScrollTrigger.create({
            trigger: mapaCard,
            start: "top 90%",
            once: true,
            onEnter: () =>
              gsap.to(mapaCard, { autoAlpha: 1, duration: 1, ease: "power2.out", ...FIM }),
          });
        }

        // ---------- refresh depois que imagens/mapa mudam a altura ----------
        let tmr: ReturnType<typeof setTimeout> | undefined;
        const atualizar = () => {
          clearTimeout(tmr);
          tmr = setTimeout(() => ScrollTrigger.refresh(), 150);
        };
        window.addEventListener("load", atualizar);
        const imgs = Array.from(raiz.querySelectorAll("img")).filter((i) => !i.complete);
        imgs.forEach((i) => i.addEventListener("load", atualizar));
        const ro = new ResizeObserver(atualizar);
        ro.observe(raiz);
        atualizar();

        return () => {
          clearTimeout(tmr);
          ro.disconnect();
          window.removeEventListener("load", atualizar);
          imgs.forEach((i) => i.removeEventListener("load", atualizar));
          observador.disconnect();
          mapa?.removeAttribute("data-lenis-prevent");
          gsap.ticker.remove(tick);
          lenis.destroy();
        };
      },
      raiz
    );

    return () => mm.revert();
  }, []);

  return null;
}
