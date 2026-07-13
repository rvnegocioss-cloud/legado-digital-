import { Camera, Video, MessageSquareText, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { tema, CORES } from "@/lib/publicTheme";
import { BuscaMemorial } from "@/components/public/BuscaMemorial";

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
      <div style={{ ...tema.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, color: CORES.dourado, margin: 0 }}>Página não encontrada.</p>
          <p style={{ color: CORES.textoFraco, marginTop: 8 }}>Confira o endereço e tente novamente.</p>
        </div>
      </div>
    );
  }

  const p = parceiro as Parceiro;
  const localCidade = [p.cidade, p.estado].filter(Boolean).join("/");

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

      <footer style={tema.footer}>
        <a
          href="/"
          style={{ fontFamily: "Georgia, serif", color: CORES.textoForte, textDecoration: "none" }}
        >
          Legado Digital
        </a>
        <span style={{ color: "#7a8a96", fontSize: 12 }}>Preservando histórias</span>
      </footer>
    </div>
  );
}
