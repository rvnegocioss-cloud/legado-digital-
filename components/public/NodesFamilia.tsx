"use client";

import { useEffect, useState } from "react";

// Os três "nodes" da landing: o mesmo círculo com anel dourado da página
// antiga ("O Fio da Vida"), agora parado num card em vez de pendurado no fio
// -- o fio não veio junto, só o formato que acende no hover (decisão do
// Rafael, 2026-09-22). Clique abre a ilustração inteira em tela cheia.
const NODES = [
  {
    src: "/fio-da-vida/nodes/memorial-node-1.png",
    alt: "Senhora abrindo o memorial no celular, no jardim",
    titulo: "Memorial Legado Digital",
    texto:
      "Fotos, vídeos, biografia, linha do tempo e as mensagens de quem conviveu. Acessível pelo QR Code da placa, de qualquer celular.",
  },
  {
    src: "/fio-da-vida/nodes/qrcode-node-1.png",
    alt: "QR Code na placa do túmulo sendo lido pelo celular",
    titulo: "QR Code na lápide",
    texto:
      "Uma placa discreta com QR Code é instalada no túmulo. Quem visita aponta a câmera do celular e abre o memorial completo na hora.",
  },
  {
    src: "/fio-da-vida/nodes/portal-familia-1.png",
    alt: "Família editando o memorial no Portal da Família",
    titulo: "Portal da Família",
    texto:
      "A família recebe um acesso próprio: sobe fotos e vídeos, escreve a história, monta a linha do tempo e decide quem pode ver o memorial.",
  },
];

export default function NodesFamilia() {
  const [aberta, setAberta] = useState<(typeof NODES)[number] | null>(null);

  useEffect(() => {
    if (!aberta) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberta(null);
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta]);

  return (
    <>
      <div className="grid3">
        {NODES.map((n) => (
          <div key={n.src} className="card feat">
            <button type="button" className="ring" onClick={() => setAberta(n)} title="" aria-label={`Ampliar: ${n.alt}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={n.src} alt={n.alt} />
            </button>
            <h4>{n.titulo}</h4>
            <p>{n.texto}</p>
            <div className="zoom-hint">clique para ampliar</div>
          </div>
        ))}
      </div>

      {aberta && (
        <div
          className="landing-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={aberta.alt}
          onClick={() => setAberta(null)}
        >
          <button type="button" className="fechar" aria-label="Fechar" title="">
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={aberta.src} alt={aberta.alt} />
        </div>
      )}
    </>
  );
}
