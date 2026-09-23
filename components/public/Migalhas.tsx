import Link from "next/link";
import "./site-chrome.css";

// Caminho de migalhas do site público. Desenho tirado do wireframe do Pedro
// (tela "Navegação e casca") e da convenção do App Router usada em
// github.com/gcascio/next-breadcrumbs e agadzik/parallel-routes-breadcrumbs.
//
// Regras que o wireframe fixa e que estão implementadas aqui:
//
// 1. A trilha vem DO DADO, não da URL. Quem chega pelo QR Code, pela busca ou
//    por um link no WhatsApp vê exatamente a mesma trilha -- ela é derivada do
//    que a página carregou do banco, no servidor.
// 2. Nível que não existe SOME. Nunca aparece um "—" ou um nível vazio: um
//    memorial sem cemitério pula direto pra "Memoriais"; um jazigo com um só
//    memorial não tem página, então não entra na trilha.
// 3. O último nível não é link (é onde a pessoa já está).
// 4. A home não tem trilha -- o "Início" das outras páginas é o caminho até ela.
// 5. No celular a trilha colapsa: "Início › … › atual", com os níveis do meio
//    escondidos, mantendo o alvo de toque de 44px.
//
// Sai também como JSON-LD (BreadcrumbList) -- um dado só, duas saídas: a
// trilha que a pessoa vê e a que o Google lê.

export interface Nivel {
  /** O que aparece escrito. */
  rotulo: string;
  /** Destino. O último nível não tem href -- é a página atual. */
  href?: string;
}

export default function Migalhas({ trilha }: { trilha: Nivel[] }) {
  // Regra 4: sem trilha (ou só com o nível atual) não renderiza nada.
  if (!trilha || trilha.length < 2) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trilha.map((n, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: n.rotulo,
      ...(n.href ? { item: n.href } : {}),
    })),
  };

  return (
    <nav className="site-migalhas" aria-label="Você está em">
      <div className="inner">
        <ol>
          {trilha.map((n, i) => {
            const ultimo = i === trilha.length - 1;
            // Regra 5: no celular, só o primeiro e o último ficam visíveis.
            const classe = ultimo ? "atual" : i === 0 ? "raiz" : "meio";
            return (
              <li key={`${n.rotulo}-${i}`} className={classe}>
                {n.href && !ultimo ? (
                  <Link href={n.href}>{n.rotulo}</Link>
                ) : (
                  <span aria-current={ultimo ? "page" : undefined}>{n.rotulo}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </nav>
  );
}
