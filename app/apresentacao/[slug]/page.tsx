import type { Metadata } from "next";
import Link from "next/link";
import ApresentacaoGuiada from "@/components/public/ApresentacaoGuiada";
import { CAPA_PADRAO, carregarMemorialVitrine, carregarParceiroPublico } from "@/lib/parceiroPublico";
import { linkWhatsAppPublico } from "@/lib/paginaParceiro";

// Apresentação guiada do parceiro (protótipo aprovado pelo Rafael, 2026-10-09).
//
// Segundo modo da página do parceiro: mesma logo, mesma capa, mas uma tela
// cheia por vez, pra o atendente mostrar ao vivo. Fica FORA do grupo (site) de
// propósito -- não leva o menu nem o rodapé do site, é uma peça de tela cheia.
//
// Abre por link, sem login: o atendente usa no tablet ou na TV do balcão sem
// digitar senha na frente do cliente. Só tem material de venda (nenhum dado de
// família), não aparece em menu nenhum e pede pra não ser indexada.

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await carregarParceiroPublico(slug);
  return {
    title: p ? `${p.nome} — Apresentação do memorial digital` : "Apresentação não encontrada",
    robots: { index: false, follow: false },
  };
}

export default async function ApresentacaoPage({ params }: Props) {
  const { slug } = await params;
  const p = await carregarParceiroPublico(slug);

  if (!p) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "var(--ld-bg)", color: "var(--ld-fg)", fontFamily: "var(--ld-font-corpo)" }}>
        <p style={{ fontSize: 18, margin: 0 }}>Apresentação não encontrada.</p>
        <Link href="/" style={{ color: "var(--ld-gold-lite)" }}>
          Voltar pro site
        </Link>
      </div>
    );
  }

  const vitrine = await carregarMemorialVitrine();

  return (
    <ApresentacaoGuiada
      dados={{
        nome: p.nome,
        slug: p.slug,
        logo: p.logo,
        capa: p.capa || CAPA_PADRAO,
        whatsapp: linkWhatsAppPublico(p.whatsapp),
        exemplo: vitrine
          ? { nome: vitrine.nome_completo, slug: vitrine.slug, foto: vitrine.foto, anos: vitrine.anos, frase: vitrine.frase_preferida }
          : null,
      }}
    />
  );
}
