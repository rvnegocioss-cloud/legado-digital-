import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { tema, periodoTexto } from "@/lib/publicTheme";

export const dynamic = "force-dynamic";

interface Resultado {
  nome_completo: string;
  data_nascimento: string | null;
  data_falecimento: string | null;
  cidade: string | null;
  foto_url: string | null;
  slug: string | null;
}

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const termo = (q || "").trim();

  let resultados: Resultado[] = [];
  if (termo) {
    const { data } = await supabase
      .from("homenagens")
      .select("nome_completo, data_nascimento, data_falecimento, cidade, foto_url, slug")
      .not("slug", "is", null)
      .ilike("nome_completo", `%${termo}%`)
      .order("nome_completo")
      .limit(30);
    resultados = (data || []) as Resultado[];
  }

  return (
    <div style={tema.page}>
      <header style={tema.hero}>
        <div style={tema.eyebrow}>Em Memória</div>
        <h1 style={tema.titulo}>Buscar um memorial</h1>
        <p style={tema.subtitulo}>
          Encontre a página de homenagem de quem você procura pelo nome.
        </p>

        <form action="/busca" style={tema.buscaForm}>
          <label htmlFor="q" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
            Nome do homenageado
          </label>
          <input
            id="q"
            type="text"
            name="q"
            defaultValue={termo}
            placeholder="Nome completo do homenageado"
            style={tema.buscaInput}
          />
          <button type="submit" style={tema.buscaBotao}>
            Buscar
          </button>
        </form>
      </header>

      <main style={tema.main}>
        {termo && resultados.length === 0 && (
          <p style={tema.vazio}>
            Nenhum memorial encontrado com o nome &ldquo;{termo}&rdquo;. Confira a grafia e tente de
            novo.
          </p>
        )}

        {!termo && (
          <p style={tema.vazio}>Digite o nome completo de quem você procura.</p>
        )}

        {resultados.length > 0 && (
          <div style={tema.placaGrid}>
            {resultados.map((r) => (
              <Link key={r.slug} href={`/homenagem/${r.slug}`} style={tema.placaLink}>
                <div style={tema.placa}>
                  <div style={tema.placaAnel}>
                    <div style={tema.placaAnelInner}>
                      {r.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.foto_url} alt={r.nome_completo} style={tema.placaFoto} />
                      ) : (
                        <span style={{ color: "#7a8a96", fontSize: 10 }}>Sem foto</span>
                      )}
                    </div>
                  </div>
                  <div style={tema.placaTextos}>
                    <div style={tema.placaNome}>{r.nome_completo}</div>
                    <div style={tema.placaHairline} />
                    <div style={tema.placaMeta}>
                      {[periodoTexto(r.data_nascimento, r.data_falecimento), r.cidade]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer style={tema.footer}>
        <span style={{ fontFamily: "Georgia, serif" }}>Legado Digital</span>
        <span style={{ color: "#7a8a96", fontSize: 12 }}>Preservando histórias</span>
      </footer>
    </div>
  );
}
