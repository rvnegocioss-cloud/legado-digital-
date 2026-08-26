import "./perfil.css";
import Image from "next/image";
import { MapPin, ShieldCheck, Lock, Flame, Images, Route } from "lucide-react";
import { supabaseServidor as supabase } from "@/lib/supabaseServidor";
import { cookies } from "next/headers";
import { verificarTokenAcessoMemorial, verificarTokenQr } from "@/lib/acessoMemorialSessao";
import { resolverAcesso, type ModoGate } from "@/lib/modosPrivacidade";
import { GateSenhaAcesso } from "@/components/public/GateSenhaAcesso";
import { GateNaoEncontrado } from "@/components/public/GateNaoEncontrado";
import { GateCadastro } from "@/components/public/GateCadastro";
import { GateEmailAutorizado } from "@/components/public/GateEmailAutorizado";
import { AcenderVela } from "@/components/public/AcenderVela";
import { FormularioCondolencia } from "@/components/public/FormularioCondolencia";
import { GaleriaFotos } from "@/components/public/GaleriaFotos";
import GuiaTumulo from "@/components/public/GuiaTumuloCarregador";
import { SeletorTema } from "@/components/public/SeletorTema";
import { MuralMemorias } from "@/components/public/MuralMemorias";
import { BotaoCompartilhar } from "@/components/public/BotaoCompartilhar";
import { RailVida, type MarcoVida } from "@/components/public/RailVida";
import { CORES, anosDestaque, dataPtBr } from "@/lib/publicTheme";
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
// GuiaTumulo (regra 17), GaleriaFotos, MuralMemorias, FormularioCondolencia,
// SeletorTema, BotaoCompartilhar.

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
      "id, nome_completo, data_nascimento, data_falecimento, cidade, frase_preferida, biografia, foto_url, video_url, videos_galeria, galeria_fotos, timeline, velas_acesas, vinculos, tema"
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

  supabase.rpc("incrementar_visualizacao", { p_slug: slug }).then(() => {});

  const anos = anosDestaque(m.data_nascimento, m.data_falecimento);
  const timeline = Array.isArray(m.timeline) ? m.timeline : [];
  const galeria = urlsMidiaProtegidas(Array.isArray(m.galeria_fotos) ? m.galeria_fotos.filter(Boolean) : []);
  const videosGaleria = urlsMidiaProtegidas(Array.isArray(m.videos_galeria) ? m.videos_galeria.filter(Boolean) : []);
  const fotoAssinada = urlMidiaProtegida(m.foto_url);
  const videoAssinado = isYoutube(m.video_url || "") ? m.video_url : urlMidiaProtegida(m.video_url);
  const paleta = PALETAS_MEMORIAL.find((p) => p.id === m.tema) ?? PALETAS_MEMORIAL[0];

  const [{ data: condolenciasData }, { data: muralData }, { data: localizacaoData }, { data: ruasData }] =
    await Promise.all([
      supabase
        .from("condolencias")
        .select("id, visitor_name, message, created_at")
        .eq("homenagem_id", m.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("mural_memorias")
        .select("id, nome, parentesco, texto, foto_url, coracoes, created_at")
        .eq("homenagem_id", m.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("obter_localizacao_memorial", { p_slug: slug }).maybeSingle(),
      supabase.rpc("obter_rede_ruas_memorial", { p_slug: slug }),
    ]);

  const condolencias = (condolenciasData || []) as Condolencia[];
  const mural = muralData || [];
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

  const dourado = v(VAR_DOURADO, paleta.dourado);

  return (
    <div
      className="perfil-page"
      style={
        {
          minHeight: "100vh",
          background: `linear-gradient(180deg, ${v(VAR_FUNDO_TOPO, paleta.fundoTopo)} 0%, ${v(
            VAR_FUNDO_BASE,
            paleta.fundoBase
          )} 100%)`,
          color: CORES.textoForte,
          fontFamily: "Georgia, 'Times New Roman', serif",
          lineHeight: 1.6,
          [VAR_FUNDO_TOPO]: paleta.fundoTopo,
          [VAR_FUNDO_BASE]: paleta.fundoBase,
          [VAR_FUNDO_PROFUNDO]: paleta.fundoProfundo,
          [VAR_DOURADO]: paleta.dourado,
          [VAR_DOURADO_CLARO]: paleta.douradoClaro,
          [VAR_DOURADO_ESCURO]: paleta.douradoEscuro,
          // A variante usa --perfil-dourado no CSS pra nao depender do nome
          // interno do tema; segue o SeletorTema em runtime pelo var() abaixo.
          "--perfil-dourado": dourado,
        } as React.CSSProperties
      }
    >
      <SeletorTema temaInicial={m.tema} />

      {/* ---- Capa + identificação ------------------------------------------
          A base abre com o hero ocupando quase uma tela inteira. Aqui a capa é
          uma faixa baixa e a foto encosta na borda dela, então nome, datas e
          vínculos já aparecem sem rolar nada. */}
      <div className="perfil-capa" aria-hidden="true">
        <span className="perfil-capa-brilho" />
      </div>

      <header className="perfil-cabecalho">
        <div className="perfil-retrato">
          {fotoAssinada ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoAssinada} alt={m.nome_completo} className="perfil-retrato-img" />
          ) : (
            <span className="perfil-monograma">{iniciais}</span>
          )}
        </div>

        <div className="perfil-identidade">
          <span className="perfil-eyebrow">Em memória</span>
          <h1 className="perfil-nome">{m.nome_completo}</h1>

          <div className="perfil-linha-dados">
            {anos && <span className="perfil-anos">{anos}</span>}
            {m.cidade && (
              <span className="perfil-cidade">
                <MapPin size={13} strokeWidth={1.5} />
                {m.cidade}
              </span>
            )}
          </div>

          {Array.isArray(m.vinculos) && m.vinculos.length > 0 && (
            <div className="perfil-vinculos">
              {m.vinculos.map((x) => (
                <span key={x} className="perfil-vinculo">
                  {x}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="perfil-acoes">
          <a href="#homenagens" className="perfil-btn perfil-btn-fantasma">
            Deixar homenagem
          </a>
          <a href="#livro" className="perfil-btn perfil-btn-dourado">
            Assinar livro
          </a>
          <BotaoCompartilhar nome={m.nome_completo} />
        </div>
      </header>

      {m.frase_preferida && (
        <div className="perfil-frase-faixa">
          <blockquote className="perfil-frase">&ldquo;{m.frase_preferida}&rdquo;</blockquote>
        </div>
      )}

      {/* ---- Corpo: coluna de leitura + lateral fixa ---------------------- */}
      <div className="perfil-corpo">
        <RailVida marcos={marcos} anoInicio={anoNasc ? String(anoNasc) : null} anoFim={anoFalec ? String(anoFalec) : null} />

        <main className="perfil-coluna">
          <section id="biografia" className="perfil-secao">
            <h2 className="perfil-titulo">A história</h2>
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

          {videoAssinado && (
            <section className="perfil-secao">
              <h2 className="perfil-titulo">Vídeo</h2>
              <div className="perfil-video">
                {isYoutube(m.video_url || "") ? (
                  <iframe
                    src={getEmbedUrl(m.video_url || "")}
                    style={{ width: "100%", height: "100%", border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    title="Vídeo"
                  />
                ) : (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video
                    src={videoAssinado || undefined}
                    controls
                    preload="metadata"
                    poster={fotoAssinada || undefined}
                    style={{ width: "100%", height: "100%", background: "#000" }}
                  />
                )}
              </div>
            </section>
          )}

          {videosGaleria.length > 0 && (
            <section className="perfil-secao">
              <h2 className="perfil-titulo">Mais vídeos</h2>
              <div className="perfil-videos-grade">
                {videosGaleria.map((url) => (
                  <div key={url} className="perfil-video">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={url} controls preload="metadata" style={{ width: "100%", height: "100%", background: "#000" }} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {galeria.length > 0 && (
            <section id="galeria" className="perfil-secao">
              <h2 className="perfil-titulo">Galeria</h2>
              <GaleriaFotos fotos={galeria} />
            </section>
          )}

          <section id="homenagens" className="perfil-secao">
            <h2 className="perfil-titulo">Mural de memórias</h2>
            <MuralMemorias memorialId={m.id} memoriasIniciais={mural} />
          </section>

          {localizacao?.cemiterio_lat != null && localizacao?.cemiterio_lng != null && (
            <section id="localizacao" className="perfil-secao">
              <h2 className="perfil-titulo">Como chegar</h2>
              <GuiaTumulo
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
              />
            </section>
          )}

          <section id="livro" className="perfil-secao">
            <h2 className="perfil-titulo">
              Livro de assinaturas
              {condolencias.length > 0 && <span className="perfil-contagem">{condolencias.length}</span>}
            </h2>
            <p className="perfil-apoio">Assine e deixe sua mensagem — um registro permanente de carinho.</p>

            {condolencias.length === 0 ? (
              <p className="perfil-vazio">Ainda ninguém assinou o livro.</p>
            ) : (
              <div className="perfil-assinaturas">
                {condolencias.map((c) => (
                  <figure key={c.id} className="perfil-assinatura-card">
                    <blockquote className="perfil-assinatura-texto">{c.message}</blockquote>
                    <figcaption className="perfil-assinatura-rodape">
                      <span className="perfil-assinatura-nome">{c.visitor_name}</span>
                      <span className="perfil-assinatura-data">{dataPtBr(c.created_at)}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            <FormularioCondolencia memorialId={m.id} />
          </section>

          {/* AcenderVela entra idêntico, sem uma prop nova (regra 20). Fica na
              coluna principal porque a parede de velas precisa de largura. */}
          <section id="vela" className="perfil-secao perfil-secao-vela">
            <h2 className="perfil-titulo perfil-titulo-centro">Acender uma vela</h2>
            <p className="perfil-apoio perfil-apoio-centro">Em memória de {m.nome_completo}</p>
            <AcenderVela slug={slug} velasIniciais={m.velas_acesas ?? 0} />
          </section>
        </main>

        {/* ---- Lateral: o que empurrava a coluna pra baixo ------------------ */}
        <aside className="perfil-lateral">
          <div className="perfil-lateral-fixa">
            <div className="perfil-cartao">
              <h3 className="perfil-cartao-titulo">Presença</h3>
              <dl className="perfil-numeros">
                <div className="perfil-numero">
                  <dt>Velas acesas</dt>
                  <dd>{m.velas_acesas ?? 0}</dd>
                </div>
                <div className="perfil-numero">
                  <dt>Homenagens</dt>
                  <dd>{condolencias.length}</dd>
                </div>
                <div className="perfil-numero">
                  <dt>Memórias</dt>
                  <dd>{mural.length + galeria.length}</dd>
                </div>
              </dl>
              <a href="#vela" className="perfil-atalho">
                <Flame size={14} strokeWidth={1.5} />
                Acender uma vela
              </a>
            </div>

            {galeria.length > 0 && (
              <div className="perfil-cartao">
                <h3 className="perfil-cartao-titulo">
                  <Images size={14} strokeWidth={1.5} />
                  Fotos
                  <span className="perfil-contagem">{galeria.length}</span>
                </h3>
                <div className="perfil-miniaturas">
                  {galeria.slice(0, 6).map((foto) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={foto} href="#galeria" className="perfil-miniatura">
                      <img src={foto} alt="" loading="lazy" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {localizacao?.cemiterio_nome && (
              <div className="perfil-cartao">
                <h3 className="perfil-cartao-titulo">
                  <Route size={14} strokeWidth={1.5} />
                  Onde descansa
                </h3>
                <p className="perfil-local-nome">{localizacao.cemiterio_nome}</p>
                {(localizacao.quadra || localizacao.lote) && (
                  <p className="perfil-local-detalhe">
                    {[localizacao.quadra && `Quadra ${localizacao.quadra}`, localizacao.lote && `Túmulo ${localizacao.lote}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                <a href="#localizacao" className="perfil-atalho">
                  Ver o caminho até lá
                </a>
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="perfil-rodape">
        <Image
          src="/logo-legado-digital.svg"
          alt="Legado Digital"
          width={160}
          height={64}
          style={{ height: 40, width: "auto" }}
        />
        <div className="perfil-selos">
          <span className="perfil-selo">
            <ShieldCheck size={14} strokeWidth={1.5} />
            Privacidade garantida
          </span>
          <span className="perfil-selo">
            <Lock size={14} strokeWidth={1.5} />
            Homenagens passam por moderação
          </span>
        </div>
        <div className="perfil-rodape-links">
          <a href="/politica-de-privacidade">Privacidade</a>
          <a href="/termos-de-uso">Termos</a>
        </div>
      </footer>
    </div>
  );
}
