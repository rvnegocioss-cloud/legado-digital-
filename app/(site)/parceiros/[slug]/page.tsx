import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { BuscaMemorial } from "@/components/public/BuscaMemorial";
import NodesFamilia from "@/components/public/NodesFamilia";
import MapaPublicoCemiterio from "@/components/public/MapaPublicoCemiterioCarregador";
import { buscarCemiterioDestaque } from "@/lib/cemiterioDestaque";
import {
  CAPA_PADRAO,
  carregarMemorialVitrine,
  carregarParceiroPublico,
  cemiteriosDoParceiro,
} from "@/lib/parceiroPublico";
import { linkTelefone, linkWhatsAppPublico } from "@/lib/paginaParceiro";
import "../../landing.css";
import "./parceiro.css";

// Página pública do parceiro -- "capa cheia" (protótipo aprovado pelo Rafael em
// 2026-10-09, wireframe em opendesign/mockups/pagina-parceiro/).
//
// É o site do Legado com a marca da funerária: a capa e a logo dela ocupam o
// topo, o menu grande do Legado dá lugar a uma faixa fina de assinatura
// (SiteNav decide isso pelo endereço) e o rodapé é o padrão do site, com
// Privacidade e Termos. O miolo reaproveita as peças da landing -- "O que a sua
// família recebe" e o mapa -- em vez de ter texto próprio: usa as classes de
// landing.css, então o padrão visual é o mesmo por construção.
//
// Nenhum menu do site aponta pra cá. Quem divulga o endereço é o parceiro
// (botão no site dele, WhatsApp, QR Code impresso).

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await carregarParceiroPublico(slug);
  if (!p) return { title: "Página não encontrada — Legado Digital" };
  return {
    title: `${p.nome} — Memorial digital`,
    description: p.frase || `Memoriais digitais sob os cuidados de ${p.nome}.`,
  };
}

const PASSOS = [
  {
    n: "1",
    titulo: "O memorial é criado no atendimento",
    texto: "Com os dados básicos de quem partiu. A família não precisa instalar nada.",
  },
  {
    n: "2",
    titulo: "A família completa a história",
    texto: "Com um acesso próprio, envia fotos e vídeos, escreve a biografia e decide quem pode ver.",
  },
  {
    n: "3",
    titulo: "A placa vai para o túmulo",
    texto: "O QR Code é instalado na lápide e o memorial abre no celular de quem visitar.",
  },
];

export default async function ParceiroPublicoPage({ params }: Props) {
  const { slug } = await params;
  const p = await carregarParceiroPublico(slug);

  if (!p) {
    return (
      <div className="landing">
        <section className="sec">
          <div className="wrap" style={{ textAlign: "center", padding: "80px 0" }}>
            <h1 className="h2">Página não encontrada.</h1>
            <p className="txt" style={{ margin: "0 auto 20px" }}>
              Confira o endereço e tente novamente.
            </p>
            <Link href="/" className="btn">
              Ir para o site
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const [vitrine, destaque] = await Promise.all([
    carregarMemorialVitrine(),
    cemiteriosDoParceiro(p.id).then((slugs) => buscarCemiterioDestaque(slugs)),
  ]);

  const whats = linkWhatsAppPublico(p.whatsapp);
  const tel = linkTelefone(p.telefone);
  const temContato = !!(whats || tel || p.endereco);

  return (
    <div className="landing pg-parceiro">
      {/* ---------- CAPA: a marca da funerária ---------- */}
      <header className="capa" style={{ backgroundImage: `url(${p.capa || CAPA_PADRAO})` }}>
        <div className="dentro">
          {p.logo && (
            <div className="logo-parc">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt={`Logo ${p.nome}`} />
            </div>
          )}
          <div className="eyebrow">Sob os cuidados de</div>
          <h1>{p.nome}</h1>
          {(p.local || p.frase) && <p>{[p.local, p.frase].filter(Boolean).join(" · ")}</p>}
        </div>
      </header>

      {/* ---------- BUSCA: sobe por cima da capa ---------- */}
      <div className="busca-sobe">
        <div className="wrap">
          <div className="searchbox">
            <h3>Encontre o memorial de quem você procura</h3>
            <p className="small">
              Busque pelo nome da pessoa. Aqui aparecem os memoriais sob os cuidados de {p.nome}.
            </p>
            <BuscaMemorial parceiroId={p.id} />
          </div>
        </div>
      </div>

      {/* ---------- O QUE A FAMÍLIA RECEBE (mesmo bloco da landing) ---------- */}
      <section className="sec sem-borda">
        <div className="wrap">
          <h2 className="h2" style={{ marginBottom: 20 }}>
            O que a sua família recebe
          </h2>
          <NodesFamilia />
          <div className="grid4">
            <div className="card diff">
              <h4>Privacidade Total</h4>
              <p>A família controla quem acessa: público, privado ou com senha.</p>
            </div>
            <div className="card diff">
              <h4>Homenagens</h4>
              <p>Quem visita acende uma vela ou deixa uma homenagem. A família aprova e remove o que quiser.</p>
            </div>
            <div className="card diff">
              <h4>Família Participa</h4>
              <p>Parentes recebem acesso para editar, adicionar fotos e personalizar o memorial.</p>
            </div>
            <div className="card diff">
              <h4>Memorial Elegante</h4>
              <p>Design moderno com fotos, vídeos, biografia e linha do tempo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- MEMORIAL DE EXEMPLO ---------- */}
      {vitrine && (
        <section className="sec alt">
          <div className="wrap split vitrine">
            <div>
              <h2 className="h2">Assim fica a página da sua família</h2>
              <p className="txt">
                Um espaço permanente para guardar uma história: quem foi, o que viveu, quem amou. A
                família decide o que fica público e o que fica protegido.
              </p>
              <p className="small" style={{ marginTop: 14 }}>
                Este é um memorial de exemplo, com dados fictícios — o memorial de verdade de uma
                família nunca é usado como vitrine.
              </p>
            </div>
            <Link href={`/homenagem/${vitrine.slug}`} className="card preview">
              <span className="tag-exemplo">memorial de exemplo</span>
              <div className="ficha-card">
                <div className="foto-ring">
                  <div className="foto-ring-in">
                    <div className="foto-ring-inner">
                      {vitrine.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={vitrine.foto} alt={vitrine.nome_completo} />
                      ) : (
                        <span className="monograma">{vitrine.nome_completo.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="eyebrow-ficha">Em memória de</div>
                <div className="nome-ficha">{vitrine.nome_completo}</div>
                {vitrine.anos && <div className="anos-ficha">{vitrine.anos}</div>}
                {vitrine.cidade && (
                  <div className="cidade-ficha">
                    <MapPin size={13} strokeWidth={1.5} />
                    <span>{vitrine.cidade}</span>
                  </div>
                )}
                {vitrine.frase_preferida && (
                  <p className="frase-ficha">&ldquo;{vitrine.frase_preferida}&rdquo;</p>
                )}
              </div>
              <div className="actions" style={{ paddingBottom: 20 }}>
                <span className="btn">Ver memorial</span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ---------- MAPA (mesmo bloco da landing) ---------- */}
      {destaque && (
        <section className={vitrine ? "sec" : "sec alt"}>
          <div className="wrap mapa-bloco">
            <div>
              <h2 className="h2">O legado tem um lugar. E um caminho até ele.</h2>
              <p className="txt">
                O mapa do cemitério localiza o memorial e traça a rota por GPS, direto do celular,
                até o túmulo exato.
              </p>
            </div>
            <div className="card mapcard">
              <div className="mapa-vivo">
                <MapaPublicoCemiterio
                  cemiterioNome={destaque.cemiterio.nome}
                  cidade={destaque.cemiterio.cidade}
                  estado={destaque.cemiterio.estado}
                  latitude={destaque.cemiterio.latitude}
                  longitude={destaque.cemiterio.longitude}
                  ortoUrl={destaque.ortoUrl}
                  ortoMinzoom={destaque.cemiterio.ortomosaico_minzoom}
                  ortoMaxzoom={destaque.cemiterio.ortomosaico_maxzoom}
                  ortoBounds={destaque.cemiterio.ortomosaico_bounds}
                  memoriais={destaque.memoriais}
                />
              </div>
              <div className="corpo">
                <div className="nome">{destaque.cemiterio.nome.trim()}</div>
                <p className="small">
                  {destaque.cemiterio.cidade} — {destaque.cemiterio.estado}
                  {destaque.doParceiro ? ` · atendido por ${p.nome}` : " · exemplo de cemitério mapeado"}
                </p>
                <div className="row" style={{ marginTop: 12 }}>
                  <Link href={destaque.href} className="btn">
                    Abrir o mapa deste cemitério
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ---------- COMO FUNCIONA + CONTATO ---------- */}
      <section className="sec alt">
        <div className="wrap">
          <h2 className="h2">Como funciona</h2>
          <div className="grid3 passos">
            {PASSOS.map((x) => (
              <div key={x.n} className="card diff">
                <div className="num">{x.n}</div>
                <h4>{x.titulo}</h4>
                <p>{x.texto}</p>
              </div>
            ))}
          </div>

          {temContato && (
            <div className="card contato">
              <div>
                <h2 className="h2" style={{ margin: 0 }}>
                  Fale com {p.nome}
                </h2>
                {p.endereco && <p className="small">{p.endereco}</p>}
              </div>
              <div className="row">
                {whats && (
                  <a href={whats} target="_blank" rel="noopener noreferrer" className="btn">
                    WhatsApp
                  </a>
                )}
                {tel && (
                  <a href={tel} className="btn o">
                    {p.telefone}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
