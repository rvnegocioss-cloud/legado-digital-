import "./perfil.css";
import { MapPin } from "lucide-react";
import SiteFooter from "@/components/public/SiteFooter";
import { supabaseServidor as supabase } from "@/lib/supabaseServidor";
import { registrarVisita } from "@/lib/registrarVisita";
import { cookies } from "next/headers";
import { verificarTokenAcessoMemorial, verificarTokenQr } from "@/lib/acessoMemorialSessao";
import { resolverAcesso, type ModoGate } from "@/lib/modosPrivacidade";
import { GateSenhaAcesso } from "@/components/public/GateSenhaAcesso";
import { GateNaoEncontrado } from "@/components/public/GateNaoEncontrado";
import { GateCadastro } from "@/components/public/GateCadastro";
import { GateEmailAutorizado } from "@/components/public/GateEmailAutorizado";
import { AcenderVela } from "@/components/public/AcenderVela";
import { LivroAssinaturas } from "@/components/public/LivroAssinaturas";
import { GaleriaFotos } from "@/components/public/GaleriaFotos";
import GuiaTumuloModal from "@/components/public/GuiaTumuloModal";
import AmbienteLateral, { type Ambiente, type CorLateral } from "@/components/public/AmbienteLateral";
import GaleriaTopo from "@/components/public/GaleriaTopo";
import ArvoreFamilia, { ROTULO as ROTULO_PARENTESCO, type ArvoreDados } from "@/components/public/ArvoreFamilia";
import TextoVerMais from "@/components/public/TextoVerMais";
import { SeletorTema } from "@/components/public/SeletorTema";
import { resolverBanner } from "@/lib/bannersMemorial";
import FotoRetratoTelaCheia from "@/components/public/FotoRetratoTelaCheia";
import VoltarLink from "@/components/public/VoltarLink";
import { BotaoCompartilhar } from "@/components/public/BotaoCompartilhar";
import { RailVida, type MarcoVida } from "@/components/public/RailVida";
import { CORES, anosDestaque } from "@/lib/publicTheme";
import { lerParagrafos } from "@/lib/textoRico";
import { calcularRota, type RuaMapeada } from "@/lib/rotaCemiterio";
import { assinarOrtomosaico } from "@/lib/ortomosaicoAssinado";
import { urlMidiaProtegida, urlsMidiaProtegidas } from "@/lib/urlMidia";
import {
  PALETAS_MEMORIAL,
  VAR_FUNDO_TOPO,
  VAR_FUNDO_BASE,
  VAR_FUNDO_PROFUNDO,
  VAR_DOURADO,
  VAR_DOURADO_CLARO,
  VAR_DOURADO_ESCURO,
} from "@/lib/temasMemorial";

// Variante "perfil" da página do memorial.
//
// A página base (../page.tsx) é modelo travado e NÃO é tocada por este arquivo
// (regra 21 do projeto, tag git homenagem-modelo-base-2026-07-24). Esta rota
// existe pra resolver uma queixa concreta: em 1440px a base tem 7.363px de
// altura, tudo empilhado numa coluna de 1100px, com as laterais vazias.
//
// A resposta é ocupar essas laterais com o que hoje empurra a coluna pra baixo
// (presença, resumo, prévia da galeria, atalhos) e deixar a coluna central só
// com o que se lê de verdade. No celular nada disso existe: volta a ser uma
// coluna só, na mesma ordem da base.
//
// Componentes reaproveitados sem UMA alteração: AcenderVela (regra 20),
// GuiaTumulo (regra 17), GaleriaFotos, SeletorTema e BotaoCompartilhar.
// O Livro de Assinaturas e proprio desta variante
// (components/public/LivroAssinaturas.tsx) -- a base segue com a lista de
// cartoes de sempre, intocada. Mural de memórias (MuralMemorias.tsx) saiu
// da página em 2026-09-15 (pedido do Rafael) -- componente continua
// existindo no repo, só não é mais chamado aqui.

const v = (nomeVar: string, valorPadrao: string) => `var(${nomeVar}, ${valorPadrao})`;

export const dynamic = "force-dynamic";

interface TimelineEvent {
  year?: string;
  title?: string;
  description?: string;
}

interface Homenagem {
  id: string;
  nome_completo: string;
  data_nascimento: string | null;
  data_falecimento: string | null;
  cidade: string | null;
  frase_preferida: string | null;
  biografia: string | null;
  foto_url: string | null;
  video_url: string | null;
  videos_galeria: string[] | null;
  galeria_fotos: string[] | null;
  tema: string;
  ambiente_lateral: string;
  banner_capa?: string | null;
  cor_lateral: string;
  timeline: TimelineEvent[] | null;
  velas_acesas: number | null;
  vinculos: string[] | null;
}

interface Condolencia {
  id: string;
  visitor_name: string;
  message: string;
  created_at: string;
}

function getEmbedUrl(url: string) {
  const m = url.match(/(?:youtube\.com.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

function isYoutube(url: string) {
  return /youtube\.com|youtu\.be/.test(url);
}

/** Primeiro ano de 4 dígitos de um rótulo como "1952/1960" ou "1970-1980". */
function primeiroAno(rotulo: string | undefined): number | null {
  const m = (rotulo || "").match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabase
    .from("homenagens_publica")
    .select("id, nome_completo, foto_url, data_nascimento, data_falecimento")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return { title: "Memorial não encontrado — Legado Digital" };

  // Mesmo cuidado da página base: metadata roda ANTES do portão, então sem
  // esta checagem o nome e a foto vazariam pro <title> e pro preview de link
  // mesmo num memorial com senha ou oculto.
  const { data: seguranca } = await supabase
    .from("homenagens_seguranca")
    .select("modo_gate, link_habilitado, qrcode_habilitado")
    .eq("homenagem_id", data.id)
    .maybeSingle();

  const modo = (seguranca?.modo_gate ?? "aberto") as ModoGate;
  const canalFechado = seguranca && !seguranca.link_habilitado && !seguranca.qrcode_habilitado;

  if (modo === "oculto" || canalFechado) {
    return { title: "Memorial não encontrado — Legado Digital" };
  }
  if (modo !== "aberto") {
    return {
      title: "Memorial privado — Legado Digital",
      description: "Esse memorial exige verificação antes de mostrar o conteúdo.",
    };
  }

  const periodo = anosDestaque(data.data_nascimento, data.data_falecimento);
  return {
    title: `${data.nome_completo} — Legado Digital`,
    description: periodo ? `Em memória de ${data.nome_completo} (${periodo})` : `Em memória de ${data.nome_completo}`,
    openGraph: {
      title: data.nome_completo,
      images: data.foto_url ? [urlMidiaProtegida(data.foto_url) as string] : undefined,
    },
  };
}

// Copia LITERAL dos valores de estilo do topo da pagina original
// (app/homenagem/[slug]/page.tsx). O Rafael pediu pra nao inventar nada
// novo aqui -- e o mesmo nav + hero, pixel a pixel, so que sem o header/main
// da base (esta pagina tem o corpo proprio da variante logo abaixo).
const estiloTopo = {
  nav: {
    margin: "0 auto",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    borderBottom: `1px solid ${CORES.douradoBorda}`,
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: v(VAR_FUNDO_TOPO, CORES.fundoTopo),
  },
  navLinks: { display: "flex", flexWrap: "wrap", gap: 18 },
  navLink: { color: CORES.textoFraco, fontSize: 12.5, textDecoration: "none", letterSpacing: 0.3 },
  navAcoes: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  navBotaoFantasma: {
    color: CORES.textoFraco,
    fontSize: 12,
    textDecoration: "none",
    border: `1px solid ${CORES.douradoBorda}`,
    padding: "8px 14px",
    borderRadius: 4,
    whiteSpace: "nowrap",
  },
  navBotaoDourado: {
    color: v(VAR_FUNDO_TOPO, CORES.fundoTopo),
    background: v(VAR_DOURADO, CORES.dourado),
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
    padding: "8px 14px",
    borderRadius: 4,
    whiteSpace: "nowrap",
  },
  // Faixa 1 (site nav) -- mesmo visual da faixa sticky de sempre, só sem
  // prender no topo ao rolar (regra do wireframe: "a faixa gruda no topo,
  // o cabeçalho do site não").
  navTopo: {
    margin: "0 auto",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
    borderBottom: `1px solid ${CORES.douradoBorda}`,
    background: v(VAR_FUNDO_TOPO, CORES.fundoTopo),
  },
  // Faixa 2 (migalhas)
  migalhas: {
    margin: "0 auto",
    padding: "9px 20px",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    fontSize: 11.5,
    color: CORES.textoFraco,
    borderBottom: `1px solid ${CORES.douradoBorda}`,
  },
  migalhaLink: { color: CORES.textoFraco, textDecoration: "none" },
  migalhaSep: { color: CORES.textoFraco, opacity: 0.5 },
  migalhaAtual: { color: CORES.textoFraco },
  migalhaAtualForte: { color: v(VAR_DOURADO_CLARO, CORES.douradoClaro), fontWeight: 600 },
  hero: {
    margin: "0 auto",
    padding: "64px 20px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  fotoGlowWrap: { position: "relative", display: "flex", alignItems: "center", justifyContent: "center" },
  fotoGlow: {
    position: "absolute",
    inset: -30,
    background: CORES.glowHero,
  },
  fotoRing: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    padding: 2,
    background: v(VAR_DOURADO, CORES.dourado),
  },
  fotoInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    background: v(VAR_FUNDO_TOPO, CORES.fundoTopo),
    border: `4px solid ${v(VAR_FUNDO_BASE, CORES.fundoBase)}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  foto: { width: "100%", height: "100%", objectFit: "cover" },
  monograma: { fontSize: "clamp(40px, 6vw, 56px)", color: v(VAR_DOURADO, CORES.dourado), fontFamily: "Georgia, serif" },
  eyebrowLinha: { marginTop: 28, display: "flex", alignItems: "center", gap: 10 },
  hairlineCurta: { width: 24, height: 1, background: CORES.douradoBorda },
  eyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: v(VAR_DOURADO, CORES.dourado),
    fontWeight: 600,
  },
  nome: {
    fontSize: "clamp(34px, 6vw, 52px)",
    fontWeight: 400,
    margin: "10px 0 10px",
    lineHeight: 1.1,
    letterSpacing: -0.5,
  },
  vinculosWrap: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  vinculoBadge: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    color: v(VAR_DOURADO, CORES.dourado),
    border: `1px solid ${CORES.douradoBorda}`,
    borderRadius: 999,
    padding: "3px 12px",
  },
  anos: { fontSize: 20, color: v(VAR_DOURADO, CORES.dourado), marginBottom: 6 },
  cidade: { display: "inline-flex", alignItems: "center", gap: 6, color: CORES.textoFraco, fontSize: 15 },
  fraseWrap: { marginTop: 32, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 14 },
  frase: {
    margin: 0,
    fontSize: 20,
    fontStyle: "italic",
    color: CORES.textoCorpo,
    maxWidth: 540,
    textAlign: "center" as const,
  },

  // ---- Card de identidade (copiado do wireframe do Pedro, 14/09/2026) ----
  // Substitui o hero solto de antes: foto + nome + dados dentro de uma
  // caixa com borda, sem o glow atrás da foto. Os 2 botões de baixo (que
  // no protótipo eram vela/homenagem) viram Rota/Guia -- essas ações já
  // existem em seções próprias mais abaixo na página, intocadas.
  //
  // Largura proporcional, não fixa (achado real 2026-09-15: 360px fixo
  // dentro de um container flex:1 deixava ~180-250px de fundo vazio entre
  // o card e a galeria, em telas largas). Sem cap fixo, só o que a coluna
  // (.mem-hero-texto, flex:1) já entrega -- o card preenche igual à
  // galeria ao lado, cada um na sua proporção natural do espaço restante.
  // Elementos internos em clamp(), mesma técnica de .mem-hero-ring em
  // globals.css -- crescem junto com a largura real da tela, não em saltos.
  fichaCard: {
    width: "100%",
    background: "linear-gradient(180deg, rgba(201,164,106,0.05), transparent 40%), rgba(255,255,255,0.03)",
    border: `1px solid ${CORES.douradoBorda}`,
    borderRadius: 10,
    padding: "clamp(28px, 3vw, 40px) clamp(24px, 3vw, 36px) clamp(24px, 2.4vw, 32px)",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    textAlign: "center" as const,
  },
  fotoRingSemGlow: {
    position: "relative" as const,
    width: "clamp(170px, 15vw, 240px)",
    height: "clamp(170px, 15vw, 240px)",
    marginBottom: 18,
  },
  eyebrowFicha: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 1.8,
    color: CORES.textoFraco,
    margin: "0 0 8px",
  },
  nomeFicha: {
    fontFamily: "var(--font-cinzel), Georgia, serif",
    fontSize: "clamp(22px, 2.2vw, 32px)",
    fontWeight: 600,
    color: CORES.textoForte,
    margin: "0 0 8px",
    lineHeight: 1.2,
  },
  papeisFicha: {
    fontSize: "clamp(12px, 1vw, 14px)",
    letterSpacing: 0.4,
    color: v(VAR_DOURADO_CLARO, CORES.douradoClaro),
    margin: "0 0 12px",
  },
  anosFicha: { fontSize: "clamp(15px, 1.3vw, 19px)", color: v(VAR_DOURADO, CORES.dourado), margin: "0 0 5px" },
  cidadeFicha: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    justifyContent: "center" as const,
    fontSize: "clamp(12.5px, 1vw, 14px)",
    color: CORES.textoFraco,
    margin: "0 0 16px",
  },
  fraseFicha: {
    fontStyle: "italic" as const,
    fontSize: "clamp(14px, 1.2vw, 17px)",
    color: CORES.textoCorpo,
    margin: "0 0 22px",
    lineHeight: 1.5,
    maxWidth: "36ch",
  },
  botoesFicha: { display: "flex", flexDirection: "column" as const, gap: 10, width: "100%" },
  botaoFichaPrimario: {
    display: "block",
    textAlign: "center" as const,
    padding: "clamp(11px, 1vw, 14px) 16px",
    borderRadius: 6,
    fontSize: "clamp(13px, 1vw, 14.5px)",
    fontWeight: 600,
    textDecoration: "none",
    background: v(VAR_DOURADO, CORES.dourado),
    color: v(VAR_FUNDO_TOPO, CORES.fundoTopo),
  },
  botaoFichaSecundario: {
    display: "block",
    width: "100%",
    textAlign: "center" as const,
    padding: "clamp(11px, 1vw, 14px) 16px",
    borderRadius: 6,
    fontSize: "clamp(13px, 1vw, 14.5px)",
    fontWeight: 600,
    border: `1px solid ${v(VAR_DOURADO, CORES.dourado)}`,
    background: "transparent",
    color: v(VAR_DOURADO_CLARO, CORES.douradoClaro),
    cursor: "pointer",
    font: "inherit",
  },
} as const;

export default async function PerfilMemorialPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ qr?: string }>;
}) {
  const { slug } = await params;
  const { qr } = await searchParams;

  const { data: homenagem } = await supabase
    .from("homenagens_publica")
    .select(
      "id, nome_completo, data_nascimento, data_falecimento, cidade, frase_preferida, biografia, foto_url, video_url, videos_galeria, galeria_fotos, timeline, velas_acesas, vinculos, tema, ambiente_lateral, cor_lateral, banner_capa"
    )
    .eq("slug", slug)
    .single();

  if (!homenagem) return <GateNaoEncontrado />;

  const m = homenagem as Homenagem;

  const { data: seguranca } = await supabase
    .from("homenagens_busca_publica")
    .select("busca_habilitada, link_habilitado, qrcode_habilitado, modo_gate, gate_versao")
    .eq("slug", slug)
    .maybeSingle();

  const modoGate = (seguranca?.modo_gate ?? "aberto") as ModoGate;
  const gateVersao = seguranca?.gate_versao ?? 1;

  const cookieStore = await cookies();
  const token = cookieStore.get(`mem_acesso_${slug}`)?.value;
  const cookieValido = verificarTokenAcessoMemorial(token, m.id, modoGate, gateVersao);

  const canal = qr && verificarTokenQr(qr, m.id) ? "qr" : "link";

  const resultado = resolverAcesso({
    modoGate,
    buscaHabilitada: seguranca?.busca_habilitada ?? true,
    linkHabilitado: seguranca?.link_habilitado ?? true,
    qrcodeHabilitado: seguranca?.qrcode_habilitado ?? true,
    canal,
    cookieValido,
  });

  if (resultado.tipo === "nao_encontrado") return <GateNaoEncontrado />;
  if (resultado.tipo === "portao") {
    if (resultado.modo === "senha") return <GateSenhaAcesso memorialId={m.id} nomeCompleto={m.nome_completo} />;
    if (resultado.modo === "cadastro") return <GateCadastro memorialId={m.id} nomeCompleto={m.nome_completo} />;
    return <GateEmailAutorizado memorialId={m.id} nomeCompleto={m.nome_completo} />;
  }

  // 1 visita por visitante/dia; robô, prévia de link e recarregar não contam.
  await registrarVisita(slug);

  const anos = anosDestaque(m.data_nascimento, m.data_falecimento);
  const timeline = Array.isArray(m.timeline) ? m.timeline : [];
  const galeria = urlsMidiaProtegidas(Array.isArray(m.galeria_fotos) ? m.galeria_fotos.filter(Boolean) : []);
  const videosGaleria = urlsMidiaProtegidas(Array.isArray(m.videos_galeria) ? m.videos_galeria.filter(Boolean) : []);
  const fotoAssinada = urlMidiaProtegida(m.foto_url);
  const videoAssinado = isYoutube(m.video_url || "") ? m.video_url : urlMidiaProtegida(m.video_url);
  // Catálogo fechado: id desconhecido vira "sem capa", nunca imagem 404.
  const banner = resolverBanner(m.banner_capa);

  const paleta = PALETAS_MEMORIAL.find((p) => p.id === m.tema) ?? PALETAS_MEMORIAL[0];

  // Mural de memórias saiu da página (2026-09-15, pedido do Rafael) -- o
  // Livro de assinaturas (componente customizado, muitas rodadas de trabalho)
  // fica como a única seção de homenagem, intocado. Registro que já existia
  // no mural (ex: Pedro Saraiva · neto) continua no banco, só não aparece
  // mais aqui -- decisão consciente, migrar pro livro fica pra depois.
  const [{ data: condolenciasData }, { data: localizacaoData }, { data: ruasData }] =
    await Promise.all([
      supabase
        .from("condolencias")
        .select("id, visitor_name, message, created_at")
        .eq("homenagem_id", m.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("obter_localizacao_memorial", { p_slug: slug }).maybeSingle(),
      supabase.rpc("obter_rede_ruas_memorial", { p_slug: slug }),
    ]);

  const condolencias = (condolenciasData || []) as Condolencia[];
  const localizacao = localizacaoData as {
    cemiterio_nome: string;
    cemiterio_lat: number | null;
    cemiterio_lng: number | null;
    lapide_lat: number | null;
    lapide_lng: number | null;
    quadra: string | null;
    lote: string | null;
    identificacao: string | null;
    orto_url: string | null;
    orto_minzoom: number | null;
    orto_maxzoom: number | null;
    orto_bounds: number[] | null;
  } | null;

  const rota =
    localizacao?.cemiterio_lat != null &&
    localizacao?.cemiterio_lng != null &&
    localizacao?.lapide_lat != null &&
    localizacao?.lapide_lng != null
      ? calcularRota(
          { lat: localizacao.cemiterio_lat, lng: localizacao.cemiterio_lng },
          { lat: localizacao.lapide_lat, lng: localizacao.lapide_lng },
          (ruasData as RuaMapeada[] | null) ?? []
        )
      : null;

  const ortoAssinado = await assinarOrtomosaico(localizacao?.orto_url);

  // Árvore da família: cadastrada pela família no portal dela, aqui só exibida.
  const { data: arvoreBruta } = await supabase.rpc("obter_arvore_familia", {
    p_homenagem_id: m.id,
  });
  const arvore = arvoreBruta as ArvoreDados | null;
  const arvoreAssinada: ArvoreDados | null = arvore?.memorial
    ? {
        memorial: { ...arvore.memorial, foto_url: urlMidiaProtegida(arvore.memorial.foto_url) },
        parentes: (arvore.parentes || []).map((x) => ({
          ...x,
          foto_url: urlMidiaProtegida(x.foto_url),
        })),
      }
    : null;

  // ---- Régua da vida -------------------------------------------------------
  // Os marcos entram na régua na posição proporcional aos anos vividos, não
  // igualmente espaçados: assim a régua mostra que a vida teve décadas
  // silenciosas e um período denso, em vez de fingir ritmo constante.
  const anoNasc = primeiroAno(m.data_nascimento || undefined);
  const anoFalec = primeiroAno(m.data_falecimento || undefined);
  const vao = anoNasc != null && anoFalec != null && anoFalec > anoNasc ? anoFalec - anoNasc : null;

  const marcos: MarcoVida[] = timeline
    .map((ev, i) => {
      const ano = primeiroAno(ev.year);
      if (ano == null || vao == null || anoNasc == null) return null;
      const bruta = (ano - anoNasc) / vao;
      return {
        id: `marco-${i}`,
        ano: ev.year || String(ano),
        titulo: ev.title || "",
        posicao: Math.min(1, Math.max(0, bruta)),
      };
    })
    .filter((x): x is MarcoVida => x !== null);

  const paragrafos = lerParagrafos(m.biografia);
  const iniciais = m.nome_completo
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");


  return (
    <div className="perfil-page">
      {/* As variaveis do tema vao pra :root numa folha de estilo, NAO inline no
          container.
          
          Por que isso importa: o SeletorTema escreve em
          document.documentElement.style. Variavel declarada no proprio elemento
          tapa a que vem da raiz -- entao com as vars inline aqui, o container
          sempre venceria e os 3 circulos nunca mudariam nada. E exatamente o
          que acontece na pagina base ate hoje: medido em producao, o fundo
          continua rgb(15,36,54) depois do clique, com a raiz ja em #262628.
          
          Regra inline no documentElement vence regra de folha em :root, entao
          desta forma o inicial vem do servidor (sem piscar) e o clique vence
          o inicial. */}
      <style>{`:root{
        ${VAR_FUNDO_TOPO}:${paleta.fundoTopo};
        ${VAR_FUNDO_BASE}:${paleta.fundoBase};
        ${VAR_FUNDO_PROFUNDO}:${paleta.fundoProfundo};
        ${VAR_DOURADO}:${paleta.dourado};
        ${VAR_DOURADO_CLARO}:${paleta.douradoClaro};
        ${VAR_DOURADO_ESCURO}:${paleta.douradoEscuro};
      }`}</style>

      {/* Decoração das faixas laterais -- escolha da família no próprio portal,
          nunca um controle exposto ao visitante. Só desenha fora do palco de
          conteúdo, nunca atrás de texto. */}
      <AmbienteLateral
        ambiente={(m.ambiente_lateral || "nenhum") as Ambiente}
        cor={(m.cor_lateral || "preto") as CorLateral}
      />

      <SeletorTema temaInicial={m.tema} />

      {/* Faixa 1: nav do site -- copiado do wireframe do Pedro (14/09/2026),
          pra quem chega pelo QR conhecer o resto do site sem sair do
          memorial. Não gruda ao rolar (só a faixa 3 gruda). Logo/voltar
          intocados (VoltarLink), só ganharam companhia ao lado. */}
      <nav className="mem-container mem-nav-topo" style={estiloTopo.navTopo}>
        <VoltarLink
          style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--mem-dourado, #C9A46A)" }}
          logoStyle={{ height: 64, width: "auto" }}
        />
        <div style={estiloTopo.navLinks}>
          <a href="/busca" style={estiloTopo.navLink}>Buscar memorial</a>
          <a href="/cemiterios" style={estiloTopo.navLink}>Cemitérios</a>
          <a href="/#como-funciona" style={estiloTopo.navLink}>Como funciona</a>
          <a href="/parceiro/login" style={estiloTopo.navLink}>Para parceiros</a>
        </div>
      </nav>

      {/* Faixa 2: migalhas -- caminho de volta pra quem chegou direto pelo QR
          e nunca esteve no site. Nível de jazigo fica de fora até
          /jazigo/[slug] existir de verdade (plano do wireframe, não
          construído ainda) -- sem linkar pra rota que não responde. */}
      <div className="mem-container" style={estiloTopo.migalhas}>
        <a href="/" style={estiloTopo.migalhaLink}>Início</a>
        {localizacao?.cemiterio_nome ? (
          <>
            <span style={estiloTopo.migalhaSep}>›</span>
            <a href="/cemiterios" style={estiloTopo.migalhaLink}>Cemitérios</a>
            <span style={estiloTopo.migalhaSep}>›</span>
            <span style={estiloTopo.migalhaAtual}>{localizacao.cemiterio_nome}</span>
          </>
        ) : (
          <>
            <span style={estiloTopo.migalhaSep}>›</span>
            <a href="/busca" style={estiloTopo.migalhaLink}>Memoriais</a>
          </>
        )}
        <span style={estiloTopo.migalhaSep}>›</span>
        <span style={estiloTopo.migalhaAtualForte}>{m.nome_completo}</span>
      </div>

      {/* Faixa 3: sub-navegação da própria página -- a faixa sticky de
          sempre, só com os rótulos do wireframe (Uma vida / Fotos) e as
          ações de participação reunidas do mesmo lado. */}
      <nav className="mem-container mem-nav-topo" style={estiloTopo.nav}>
        <div style={estiloTopo.navLinks}>
          <a href="#biografia" style={estiloTopo.navLink}>Sobre</a>
          <a href="#timeline" style={estiloTopo.navLink}>Uma vida</a>
          <a href="#galeria" style={estiloTopo.navLink}>Fotos</a>
          <a href="#familia" style={estiloTopo.navLink}>Família</a>
          <a href="#livro" style={estiloTopo.navLink}>Homenagens</a>
          <a href="#localizacao" style={estiloTopo.navLink}>Localização</a>
        </div>
        <div style={estiloTopo.navAcoes}>
          <a href="#livro" style={estiloTopo.navBotaoDourado}>Assinar livro</a>
          <BotaoCompartilhar nome={m.nome_completo} />
        </div>
      </nav>

      {/* Imagem de capa = FUNDO do topo (pedido do Rafael, 2026-09-15): fica
          atrás do retrato e do bloco de fotos/vídeo, contida na largura da
          página (mesmo container do nav/hero, nunca de ponta a ponta). O véu
          deixa a paisagem aparecer em cima e escurece rumo ao fim do bloco,
          pra nome/datas/botões nunca perderem contraste. */}
      <header
        className={`mem-hero mem-container${banner ? " mem-hero-com-capa" : ""}`}
        style={estiloTopo.hero}
      >
        {banner && (
          <>
            <div
              aria-hidden
              className="mem-capa-fundo"
              style={{ backgroundImage: `url(${banner.arquivo})` }}
            />
            <div aria-hidden className="mem-capa-fundo mem-capa-veu" />
          </>
        )}
        {/* Card de identidade -- copiado do wireframe do Pedro (14/09/2026),
            confirmado com o Rafael por print anotado: foto sem glow, nome em
            Cinzel menor, papéis em texto puro (sem pill), botões de baixo
            viram Rota/Guia (vela e homenagem continuam nas seções próprias
            mais abaixo, intocadas). */}
        <div className="mem-hero-texto">
          <div style={estiloTopo.fichaCard}>
            <div style={estiloTopo.fotoRingSemGlow}>
              <div style={estiloTopo.fotoRing}>
                <div style={estiloTopo.fotoInner}>
                  {fotoAssinada ? (
                    <FotoRetratoTelaCheia src={fotoAssinada} alt={m.nome_completo} style={estiloTopo.foto} />
                  ) : (
                    <span style={estiloTopo.monograma}>{iniciais}</span>
                  )}
                </div>
              </div>
            </div>

            <p style={estiloTopo.eyebrowFicha}>Em memória de</p>
            <h1 style={estiloTopo.nomeFicha}>{m.nome_completo}</h1>
            {Array.isArray(m.vinculos) && m.vinculos.length > 0 && (
              <p style={estiloTopo.papeisFicha}>{m.vinculos.join(" · ")}</p>
            )}
            {anos && <p style={estiloTopo.anosFicha}>{anos}</p>}
            {m.cidade && (
              <p style={estiloTopo.cidadeFicha}>
                <MapPin size={13} strokeWidth={1.5} />
                <span>{m.cidade}</span>
              </p>
            )}
            {m.frase_preferida && (
              <p style={estiloTopo.fraseFicha}>&ldquo;{m.frase_preferida}&rdquo;</p>
            )}

            {/* Os mesmos dois caminhos que já existem na seção Localização, só
                que puxados pro topo -- lá embaixo ninguém achava. A lógica do
                mapa/rota continua intocada (regra 17): aqui é só atalho. */}
            {localizacao?.cemiterio_lat != null && localizacao?.cemiterio_lng != null && (
              <div style={estiloTopo.botoesFicha}>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${localizacao.cemiterio_lat},${localizacao.cemiterio_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={estiloTopo.botaoFichaPrimario}
                >
                  Rota de carro até o cemitério
                </a>
                <GuiaTumuloModal
                  cemiterioNome={localizacao.cemiterio_nome}
                  cemiterioLat={localizacao.cemiterio_lat}
                  cemiterioLng={localizacao.cemiterio_lng}
                  lapideLat={localizacao.lapide_lat}
                  lapideLng={localizacao.lapide_lng}
                  quadra={localizacao.quadra}
                  lote={localizacao.lote}
                  nomeCompleto={m.nome_completo}
                  fotoUrl={fotoAssinada}
                  ortoUrl={ortoAssinado}
                  ortoMinzoom={localizacao.orto_minzoom}
                  ortoMaxzoom={localizacao.orto_maxzoom}
                  ortoBounds={localizacao.orto_bounds}
                  rotaCoordenadas={rota?.usouRede ? rota.coordenadas : null}
                  estiloBotao={estiloTopo.botaoFichaSecundario}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mem-hero-galeria">
          <GaleriaTopo
            fotos={galeria}
            videoCapa={isYoutube(m.video_url || "") ? getEmbedUrl(m.video_url || "") : videoAssinado}
            videosExtras={videosGaleria}
            ehYoutube={isYoutube(m.video_url || "")}
          />
        </div>
      </header>

      {/* ---- Corpo: coluna de leitura + lateral fixa ---------------------- */}
      <div className="perfil-corpo">
        <RailVida marcos={marcos} anoInicio={anoNasc ? String(anoNasc) : null} anoFim={anoFalec ? String(anoFalec) : null} />

        <main className="perfil-coluna">
          <section id="biografia" className="perfil-secao">
            <h2 className="perfil-titulo">A história</h2>
            <TextoVerMais>
              <div className="perfil-texto">
                {paragrafos.length > 0 ? (
                  paragrafos.map((pedacos, i) => (
                    <p key={i} className={i === 0 ? "perfil-paragrafo perfil-paragrafo-abertura" : "perfil-paragrafo"}>
                      {pedacos.map((pedaco, j) =>
                        pedaco.negrito ? <strong key={j}>{pedaco.texto}</strong> : <span key={j}>{pedaco.texto}</span>
                      )}
                    </p>
                  ))
                ) : (
                  <p className="perfil-paragrafo perfil-vazio">A biografia será adicionada em breve pela família.</p>
                )}
              </div>
            </TextoVerMais>
          </section>

          {timeline.length > 0 && (
            <section id="timeline" className="perfil-secao">
              <h2 className="perfil-titulo">Uma vida</h2>
              <ol className="perfil-linha-tempo">
                {timeline.map((ev, i) => (
                  <li key={i} id={`marco-${i}`} className="perfil-marco">
                    <span className="perfil-marco-no" aria-hidden="true" />
                    <div className="perfil-marco-conteudo">
                      {ev.year && <span className="perfil-marco-ano">{ev.year}</span>}
                      {ev.title && <h3 className="perfil-marco-titulo">{ev.title}</h3>}
                      {ev.description && <p className="perfil-marco-desc">{ev.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* O vídeo de capa fica SÓ no topo, ao lado do rosto; aqui embaixo
              entram os outros vídeos e as fotos. Antes o mesmo vídeo aparecia
              nos dois lugares.

              Fotos grandes + árvore pequena no fim (opção 6 dos wireframes,
              opendesign/mockups/mosaico-arvore -- ideia do próprio Rafael).
              As fotos ficam em 2 colunas de tiles grandes e fecham sozinhas
              (4 fotos = 2 fileiras cheias); a árvore SAI da grade e vira uma
              peça pequena numa faixa própria embaixo, com a lista de
              parentesco preenchendo o resto da linha. Enquanto a árvore era
              o 5º tile da grade, 5 itens em 3 colunas sempre deixavam uma
              célula vazia -- a conta nunca fechava. */}
          {(galeria.length > 0 || videosGaleria.length > 0 || arvoreAssinada) && (
            <section id="galeria" className="perfil-secao perfil-secao-midia">
              <h2 className="perfil-titulo">Fotos, vídeos e família</h2>
              {(galeria.length > 0 || videosGaleria.length > 0) && (
                <GaleriaFotos fotos={galeria} videos={videosGaleria} />
              )}
              {arvoreAssinada && (
                <div id="familia" className="perfil-familia-faixa">
                  <ArvoreFamilia dados={arvoreAssinada} />
                  {arvoreAssinada.parentes.length > 0 && (
                    <ul className="perfil-familia-lista">
                      {arvoreAssinada.parentes.map((p) => (
                        <li key={p.id}>
                          <span className="perfil-familia-papel">{ROTULO_PARENTESCO[p.tipo] || p.tipo}</span>
                          {p.tem_memorial && p.slug ? (
                            <a href={`/homenagem/${p.slug}`}>{p.nome}</a>
                          ) : (
                            <span>{p.nome}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          )}

          {/* A seção "Como Chegar" que vivia aqui embaixo foi movida pro modal
              que abre do botão no topo (GuiaTumuloModal) -- pedido do Rafael,
              2026-09-11: ninguém achava rolando a página, tinha que clicar
              2 vezes. O componente GuiaTumulo/GuiaTumuloCarregador em si
              continua intocado, regra 17 -- só mudou onde é revelado. */}

          <section id="livro" className="perfil-secao">
            <h2 className="perfil-titulo">
              Livro de assinaturas
              {condolencias.length > 0 && <span className="perfil-contagem">{condolencias.length}</span>}
            </h2>
            <p className="perfil-apoio">
              Escreva seu nome e ele será registrado no livro, à mão, para sempre.
            </p>
            <LivroAssinaturas
              memorialId={m.id}
              assinaturasIniciais={condolencias}
              nomeHomenageado={m.nome_completo.split(" ")[0]}
            />
          </section>

          {/* AcenderVela entra idêntico, sem uma prop nova (regra 20). Fica na
              coluna principal porque a parede de velas precisa de largura. */}
          <section id="vela" className="perfil-secao perfil-secao-vela">
            <h2 className="perfil-titulo perfil-titulo-centro">Acender uma vela</h2>
            <p className="perfil-apoio perfil-apoio-centro">Em memória de {m.nome_completo}</p>
            <AcenderVela slug={slug} velasIniciais={m.velas_acesas ?? 0} />
          </section>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
