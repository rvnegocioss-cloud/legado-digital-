import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { tema, periodoTexto, CORES } from "@/lib/publicTheme";

export const dynamic = "force-dynamic";

interface Parceiro {
  id: string;
  nome_fantasia: string | null;
  razao_social: string;
  slug: string;
  logo_url: string | null;
  descricao_publica: string | null;
  cidade: string | null;
  estado: string | null;
}

interface Memorial {
  nome_completo: string;
  data_nascimento: string | null;
  data_falecimento: string | null;
  cidade: string | null;
  foto_url: string | null;
  slug: string | null;
}

export default async function ParceiroPublicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const termo = (q || "").trim();

  const { data: parceiro } = await supabase
    .from("parceiros_publicos")
    .select("id, nome_fantasia, razao_social, slug, logo_url, descricao_publica, cidade, estado")
    .eq("slug", slug)
    .single();

  if (!parceiro) {
    return (
      <div style={{ ...tema.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, color: CORES.dourado, margin: 0 }}>Página não encontrada.</p>
          <p style={{ color: CORES.textoFraco, marginTop: 8 }}>Confira o endereço e tente novamente.</p>
        </div>
      </div>
    );
  }

  const p = parceiro as Parceiro;

  let query = supabase
    .from("homenagens")
    .select("nome_completo, data_nascimento, data_falecimento, cidade, foto_url, slug")
    .eq("parceiro_id", p.id)
    .not("slug", "is", null)
    .order("nome_completo")
    .limit(60);

  if (termo) {
    query = query.ilike("nome_completo", `%${termo}%`);
  }

  const { data } = await query;
  const memoriais = (data || []) as Memorial[];

  return (
    <div style={tema.page}>
      <header style={tema.hero}>
        {p.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.logo_url}
            alt={p.nome_fantasia || p.razao_social}
            style={{ maxHeight: 64, maxWidth: 200, objectFit: "contain", marginBottom: 16 }}
          />
        )}
        <div style={tema.eyebrow}>Sob os cuidados de</div>
        <h1 style={tema.titulo}>{p.nome_fantasia || p.razao_social}</h1>
        <div style={{ width: 40, borderTop: `1px solid ${CORES.douradoBorda}`, margin: "12px 0" }} />
        {p.descricao_publica ? (
          <p style={{ ...tema.subtitulo, maxWidth: 560 }}>{p.descricao_publica}</p>
        ) : (
          <p style={{ ...tema.subtitulo, maxWidth: 560 }}>Descrição institucional em breve.</p>
        )}
      </header>

      <main style={tema.main}>
        <div style={tema.label}>Memoriais sob nossos cuidados</div>

        <form action={`/parceiros/${p.slug}`} style={tema.buscaForm}>
          <label
            htmlFor="q"
            style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
          >
            Buscar memorial por nome
          </label>
          <input
            id="q"
            type="text"
            name="q"
            defaultValue={termo}
            placeholder="Buscar por nome"
            style={tema.buscaInput}
          />
          <button type="submit" style={tema.buscaBotao}>
            Buscar
          </button>
        </form>

        {memoriais.length === 0 ? (
          <p style={tema.vazio}>
            {termo
              ? `Nenhum memorial encontrado com o nome "${termo}".`
              : "Nenhum memorial publicado ainda."}
          </p>
        ) : (
          <div style={tema.placaGrid}>
            {memoriais.map((m) => (
              <Link key={m.slug} href={`/homenagem/${m.slug}`} style={tema.placaLink}>
                <div style={tema.placa}>
                  <div style={tema.placaAnel}>
                    <div style={tema.placaAnelInner}>
                      {m.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.foto_url} alt={m.nome_completo} style={tema.placaFoto} />
                      ) : (
                        <span style={{ color: "#7a8a96", fontSize: 10 }}>Sem foto</span>
                      )}
                    </div>
                  </div>
                  <div style={tema.placaTextos}>
                    <div style={tema.placaNome}>{m.nome_completo}</div>
                    <div style={tema.placaHairline} />
                    <div style={tema.placaMeta}>
                      {[periodoTexto(m.data_nascimento, m.data_falecimento), m.cidade]
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
