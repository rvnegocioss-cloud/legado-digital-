import { Camera, Video, MessageSquareText, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { supabaseServidor } from "@/lib/supabaseServidor";
import { tema, CORES } from "@/lib/publicTheme";
import { BuscaMemorial } from "@/components/public/BuscaMemorial";
import { urlMidiaProtegida } from "@/lib/urlMidia";
import SiteNav from "@/components/public/SiteNav";
import SiteFooter from "@/components/public/SiteFooter";

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

const RECURSOS = [
  {
    Icone: Camera,
    titulo: "Fotos e galeria",
    texto: "A família escolhe as imagens que contam a história de quem se foi.",
  },
  {
    Icone: Video,
    titulo: "Vídeo e linha do tempo",
    texto: "Momentos marcantes organizados em ordem, do começo ao fim da história.",
  },
  {
    Icone: MessageSquareText,
    titulo: "Mensagens e homenagens",
    texto: "Amigos e parentes deixam palavras que ficam guardadas junto ao memorial.",
  },
  {
    Icone: Lock,
    titulo: "Privacidade definida pela família",
    texto: "Aberto por busca, só por link, ou protegido por senha — quem decide é a família.",
  },
];

const PASSOS = [
  {
    numero: "01",
    titulo: "Busque pelo nome",
    texto: "Use o campo acima com o nome completo de quem você procura.",
  },
  {
    numero: "02",
    titulo: "Abra o memorial",
    texto: "Encontrado o nome certo, entre na página — pode pedir senha se a família definiu uma.",
  },
  {
    numero: "03",
    titulo: "Reviva a história",
    texto: "Fotos, vídeo, linha do tempo e mensagens de quem também guarda essa memória.",
  },
];

export default async function ParceiroPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: parceiro } = await supabase
    .from("parceiros_publicos")
    .select("id, nome_fantasia, razao_social, slug, logo_url, descricao_publica, cidade, estado")
    .eq("slug", slug)
    .single();

  if (!parceiro) {
    return (
      <div style={tema.page}>
        <SiteNav />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 20px" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 18, color: CORES.dourado, margin: 0 }}>Página não encontrada.</p>
            <p style={{ color: CORES.textoFraco, marginTop: 8 }}>Confira o endereço e tente novamente.</p>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const p = parceiro as Parceiro;
  const localCidade = [p.cidade, p.estado].filter(Boolean).join("/");

  // Exemplo real de memorial pra visitante entender o produto antes de
  // buscar — só memorial genuinamente público (gate aberto, busca e link
  // habilitados) pode virar vitrine comercial, nunca um protegido pela
  // família. Sem linha em homenagens_seguranca = público por padrão
  // (mesma semântica do resto do sistema).
  const { data: candidatos } = await supabaseServidor
    .from("homenagens")
    .select("id, nome_completo, slug, foto_url, frase_preferida")
    .eq("parceiro_id", p.id)
    .neq("nome_completo", "Novo memorial")
    .not("slug", "like", "rascunho-%")
    .order("created_at", { ascending: false })
    .limit(10);

  let exemplo: { id: string; nome_completo: string; slug: string; foto_url: string | null; frase_preferida: string | null } | null = null;
  if (candidatos && candidatos.length > 0) {
    const { data: segurancas } = await supabaseServidor
      .from("homenagens_seguranca")
      .select("homenagem_id, modo_gate, busca_habilitada, link_habilitado")
      .in("homenagem_id", candidatos.map((c) => c.id));
    const segPorId = new Map((segurancas || []).map((s) => [s.homenagem_id, s]));
    exemplo = candidatos.find((c) => {
      const seg = segPorId.get(c.id);
      const gate = seg?.modo_gate ?? "aberto";
      const busca = seg?.busca_habilitada ?? true;
      const link = seg?.link_habilitado ?? true;
      return gate === "aberto" && busca && link;
    }) || null;
  }

  return (
    <div style={tema.page}>
      <SiteNav />
      <header style={tema.hero}>
        {p.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlMidiaProtegida(p.logo_url) || p.logo_url}
            alt={p.nome_fantasia || p.razao_social}
            style={{ maxHeight: 64, maxWidth: 200, objectFit: "contain", marginBottom: 16 }}
          />
        )}
        <div style={tema.eyebrow}>Sob os cuidados de</div>
        <h1 style={tema.titulo}>{p.nome_fantasia || p.razao_social}</h1>
        {localCidade && <p style={{ color: CORES.textoFraco, fontSize: 13, margin: "-6px 0 8px" }}>{localCidade}</p>}
        <div style={{ width: 40, borderTop: `1px solid ${CORES.douradoBorda}`, margin: "12px 0" }} />
        {p.descricao_publica ? (
          <p style={{ ...tema.subtitulo, maxWidth: 560 }}>{p.descricao_publica}</p>
        ) : (
          <p style={{ ...tema.subtitulo, maxWidth: 560 }}>
            Memoriais digitais de quem já passou por nossos cuidados, preservados com respeito
            e acessíveis pra quem precisa lembrar.
          </p>
        )}

        <div style={{ ...tema.card, width: "100%", maxWidth: 560, marginTop: 32, textAlign: "left" }}>
          <div style={tema.label}>Buscar memorial sob nossos cuidados</div>
          <BuscaMemorial parceiroId={p.id} />
        </div>
      </header>

      <main>
        {exemplo && (
          <section style={tema.secao}>
            <div style={tema.eyebrow}>Um exemplo real</div>
            <a
              href={`/homenagem/${exemplo.slug}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                textDecoration: "none",
                maxWidth: 560,
              }}
            >
              {exemplo.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urlMidiaProtegida(exemplo.foto_url) || exemplo.foto_url}
                  alt={exemplo.nome_completo}
                  style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: CORES.douradoBorda,
                    color: CORES.dourado,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {exemplo.nome_completo.charAt(0)}
                </div>
              )}
              <div>
                <p style={{ color: CORES.textoForte, fontSize: 16, margin: 0 }}>{exemplo.nome_completo}</p>
                {exemplo.frase_preferida && (
                  <p style={{ color: CORES.textoFraco, fontSize: 13, margin: "4px 0 0" }}>{exemplo.frase_preferida}</p>
                )}
                <p style={{ color: CORES.dourado, fontSize: 12, margin: "6px 0 0" }}>Ver memorial →</p>
              </div>
            </a>
          </section>
        )}

        <section style={tema.secao}>
          <div style={tema.eyebrow}>O que é o Legado Digital</div>
          <div style={tema.secaoGrid}>
            <div>
              <h2 style={tema.secaoTitulo}>Um espaço permanente pra guardar uma história</h2>
              <p style={tema.secaoTexto}>
                Cada memorial reúne fotos, vídeos, uma linha do tempo e as mensagens de quem
                quis deixar uma lembrança — acessível pelo QR Code na lápide, por link direto,
                ou pela busca acima. A família decide o que fica público e o que fica protegido.
              </p>
              <p style={{ ...tema.citacao }}>
                &ldquo;Um lugar que não substitui a visita ao cemitério, mas garante que a
                história de alguém não se perca com o tempo.&rdquo;
              </p>
            </div>
            <div>
              {RECURSOS.map(({ Icone, titulo, texto }) => (
                <div key={titulo} style={tema.recursoItem}>
                  <Icone size={18} strokeWidth={1.5} color={CORES.dourado} style={tema.recursoIcone} />
                  <div>
                    <div style={tema.recursoTitulo}>{titulo}</div>
                    <div style={tema.recursoTexto}>{texto}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={tema.eyebrow}>Como funciona</div>
          <div style={tema.passos}>
            {PASSOS.map((passo) => (
              <div key={passo.numero}>
                <div style={tema.passoNumero}>{passo.numero}</div>
                <div style={tema.passoTitulo}>{passo.titulo}</div>
                <div style={tema.passoTexto}>{passo.texto}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
