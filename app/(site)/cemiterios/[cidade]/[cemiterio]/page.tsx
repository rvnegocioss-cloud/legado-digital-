import Link from "next/link";
import Migalhas from "@/components/public/Migalhas";
import { notFound } from "next/navigation";
import { supabaseServidor as supabase } from "@/lib/supabaseServidor";
import MapaPublicoCemiterio from "@/components/public/MapaPublicoCemiterioCarregador";
import { assinarOrtomosaico } from "@/lib/ortomosaicoAssinado";
import { urlMidiaProtegida } from "@/lib/urlMidia";
import "../../cemiterios.css";

// Reconstruída em 2026-09-23 a partir do protótipo aprovado pelo Rafael
// (wireframe/reestruturacao-site-publico/prototipo-cemiterio.html, tela ②).
// Backup do arquivo original em `Desktop\Paginas Originais - Cemiterios\`.
//
// O que mudou: saiu do lib/publicTheme (Georgia, 960px, hero centralizado) e
// passou pros tokens de app/tokens.css, alinhando com o menu e o rodapé. O
// topo virou o formato do protótipo -- informação do cemitério à esquerda,
// ação à direita -- e a lista de quem está enterrado ali passou a aparecer ao
// lado do mapa, em vez de só existir como pino.
//
// NÃO entrou, por decisão do Rafael (mudança de banco só na integração):
// o bloco institucional do protótipo -- logo do cemitério, telefone, WhatsApp,
// horário de visitação, texto de apresentação, fotos, serviços e planos.
// Nenhuma dessas colunas existe na tabela `cemiterios` hoje.
//
// O componente do mapa (MapaPublicoCemiterio) NÃO foi tocado.

export const dynamic = "force-dynamic";

// noindex -- as props do Server Component (nome/foto de quem tem gate
// 'aberto') são serializadas no HTML; sem isso o Google indexaria nome de
// falecido a partir só do hover, mesmo protegido de scraping avulso.
// O wireframe propõe tirar esse noindex; é decisão de privacidade que
// depende do Rafael, então segue como está.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ cidade: string; cemiterio: string }>;
}) {
  const { cemiterio } = await params;
  const { data } = await supabase.rpc("obter_mapa_publico_cemiterio", { p_slug: cemiterio });
  if (!data) return { title: "Cemitério não encontrado — Legado Digital" };
  return {
    title: `${data.cemiterio.nome} — Legado Digital`,
    robots: { index: false, follow: true },
  };
}

interface Contato {
  rotulo: string;
  tipo: "telefone" | "whatsapp";
  valor: string;
}

// Só dígitos, com o DDI do Brasil, pro link abrir direto no discador / WhatsApp.
function soDigitos(v: string): string {
  const d = v.replace(/\D/g, "");
  return d.startsWith("55") ? d : `55${d}`;
}

interface MapaPublico {
  cemiterio: {
    nome: string;
    cidade: string;
    estado: string;
    endereco?: string | null;
    bairro?: string | null;
    horario_visitacao?: string | null;
    descricao_publica?: string | null;
    site_url?: string | null;
    servicos?: string[] | null;
    contatos?: Contato[] | null;
    informacoes_fonte?: string | null;
    informacoes_atualizadas_em?: string | null;
    latitude: number;
    longitude: number;
    ortomosaico_url: string | null;
    ortomosaico_minzoom: number | null;
    ortomosaico_maxzoom: number | null;
    ortomosaico_bounds: number[] | null;
  };
  memoriais: GeoJSON.FeatureCollection<
    GeoJSON.Point,
    { slug: string; nome: string | null; foto_url: string | null; protegido: boolean }
  >;
}

export default async function CemiterioMapaPage({
  params,
}: {
  params: Promise<{ cidade: string; cemiterio: string }>;
}) {
  const { cidade, cemiterio } = await params;
  const { data } = await supabase.rpc("obter_mapa_publico_cemiterio", { p_slug: cemiterio });

  if (!data) {
    notFound();
  }

  const { cemiterio: c, memoriais } = data as MapaPublico;

  // URL assinada e de vida curta: o balde dos mapas e privado, pra ninguem
  // baixar o ortomosaico inteiro (o ativo mais caro do projeto) so por abrir
  // o mapa e olhar a requisicao.
  const ortoAssinado = await assinarOrtomosaico(c.ortomosaico_url);

  // Foto do memorial no card do mapa também vai assinada -- balde privado.
  const memoriaisAssinados = {
    ...memoriais,
    features: await Promise.all(
      (memoriais?.features || []).map(async (f) => ({
        ...f,
        properties: { ...f.properties, foto_url: urlMidiaProtegida(f.properties?.foto_url) },
      }))
    ),
  } as typeof memoriais;

  // Um item por PESSOA. Cada feature do mapa é um TÚMULO e pode ter vários
  // homenageados (`properties.memoriais`); listar só a feature escondia todo
  // mundo depois do primeiro e contava túmulos como se fossem memoriais.
  type Pessoa = { slug: string; nome: string | null; foto_url: string | null; protegido: boolean };
  const lista: Pessoa[] = (memoriaisAssinados?.features || []).flatMap((f) => {
    const p = f.properties as unknown as { memoriais?: Pessoa[] | string } & Pessoa;
    let gente: Pessoa[] = [];
    if (Array.isArray(p.memoriais)) gente = p.memoriais;
    else if (typeof p.memoriais === "string") {
      try {
        gente = JSON.parse(p.memoriais);
      } catch {
        gente = [];
      }
    }
    const todos = gente.length ? gente : [{ slug: p.slug, nome: p.nome, foto_url: p.foto_url, protegido: p.protegido }];
    // A foto de quem vem aninhado em `properties.memoriais` chega crua do
    // banco (URL pública do balde, hoje privado -> 400). Só a foto de nível
    // superior era assinada, então o 2º homenageado do túmulo aparecia com
    // imagem quebrada. urlMidiaProtegida é idempotente.
    return todos.map((x) => ({ ...x, foto_url: urlMidiaProtegida(x.foto_url) }));
  });
  const rotaCemiterio = `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`;

  return (
    <div className="cem">


      <Migalhas
        trilha={[
          { rotulo: "Início", href: "/" },
          { rotulo: "Cemitérios", href: "/cemiterios" },
          { rotulo: `${c.cidade} — ${c.estado}`, href: `/cemiterios/${cidade}` },
          { rotulo: c.nome.trim() },
        ]}
      />

      <main>
        <div className="topo-cemiterio">
          <div className="info">
            <p className="eyebrow">Em memória</p>
            <h1>{c.nome.trim()}</h1>
            <p className="subtitulo">
              {c.cidade} — {c.estado}
              {lista.length > 0 && (
                <>
                  {" · "}
                  {lista.length} {lista.length === 1 ? "memorial" : "memoriais"}
                </>
              )}
            </p>
          </div>

          <div className="acoes">
            {/* Informações do cemitério ao lado do "Caminho até o cemitério"
                (pedido do Rafael, 2026-09-23). Campo sem dado não aparece:
                nunca um "—" nem uma linha vazia. */}
            {(c.endereco || c.horario_visitacao || (c.contatos && c.contatos.length > 0)) && (
              <div className="ficha-cemiterio">
                <h2>Informações</h2>
                <dl>
                  {c.endereco && (
                    <div>
                      <dt>Endereço</dt>
                      <dd>
                        {c.endereco}
                        {c.bairro ? ` — Bairro ${c.bairro}` : ""}
                        <br />
                        {c.cidade} — {c.estado}
                      </dd>
                    </div>
                  )}
                  {c.horario_visitacao && (
                    <div>
                      <dt>Visitação</dt>
                      <dd>{c.horario_visitacao}</dd>
                    </div>
                  )}
                  {c.contatos && c.contatos.length > 0 && (
                    <div>
                      <dt>Contato</dt>
                      <dd>
                        <ul className="contatos">
                          {c.contatos.map((ct, i) => (
                            <li key={i}>
                              <span className="rotulo">{ct.rotulo}</span>
                              <a
                                href={
                                  ct.tipo === "whatsapp"
                                    ? `https://wa.me/${soDigitos(ct.valor)}`
                                    : `tel:+${soDigitos(ct.valor)}`
                                }
                                {...(ct.tipo === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                              >
                                {ct.tipo === "whatsapp" ? "WhatsApp " : ""}
                                {ct.valor}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            <a href={rotaCemiterio} target="_blank" rel="noopener noreferrer" className="btn">
              Caminho até o cemitério
            </a>
          </div>
        </div>

        <div className="mapa-e-lista">
          <MapaPublicoCemiterio
            cemiterioNome={c.nome}
            cidade={c.cidade}
            estado={c.estado}
            latitude={c.latitude}
            longitude={c.longitude}
            ortoUrl={ortoAssinado}
            ortoMinzoom={c.ortomosaico_minzoom}
            ortoMaxzoom={c.ortomosaico_maxzoom}
            ortoBounds={c.ortomosaico_bounds}
            memoriais={memoriaisAssinados}
          />

          <aside className="painel-lista">
            <h2>Memoriais neste cemitério</h2>

            {lista.length === 0 ? (
              <p className="nota-lista">Nenhum memorial publicado neste cemitério ainda.</p>
            ) : (
              <div className="rolagem">
                {lista.map((p) => {
                  const protegido = p?.protegido;
                  const nome = protegido ? "Memorial protegido" : p?.nome || "Sem nome";
                  return (
                    <Link key={p.slug} href={`/homenagem/${p.slug}`} className="item-memorial">
                      {p?.foto_url && !protegido ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="retrato" src={p.foto_url} alt="" />
                      ) : (
                        <span className="retrato" />
                      )}
                      <span style={{ flex: 1 }}>
                        <span className="nome" style={{ display: "block" }}>
                          {nome}
                        </span>
                      </span>
                      {protegido && <span className="cadeado">senha</span>}
                    </Link>
                  );
                })}
              </div>
            )}

            <p className="nota-lista">
              Cada cruz no mapa é um memorial. Memorial sem localização marcada aparece só nesta
              lista.
            </p>
          </aside>
        </div>

        {(c.descricao_publica || (c.servicos && c.servicos.length > 0) || c.site_url) && (
          <section className="sobre-cemiterio">
            <h2>Sobre o {c.nome.trim()}</h2>
            <div className="sobre-grade">
              {c.descricao_publica && <p className="sobre-texto">{c.descricao_publica}</p>}

              {c.servicos && c.servicos.length > 0 && (
                <div className="sobre-bloco">
                  <h3>Serviços</h3>
                  <ul>
                    {c.servicos.map((sv, i) => (
                      <li key={i}>{sv}</li>
                    ))}
                  </ul>
                </div>
              )}

              {c.site_url && (
                <div className="sobre-bloco">
                  <h3>Consultar sepultados</h3>
                  <p>
                    A Prefeitura mantém uma consulta online da localização de sepulturas nos cemitérios
                    municipais.
                  </p>
                  <a href={c.site_url} target="_blank" rel="noopener noreferrer" className="btn o">
                    Abrir a consulta
                  </a>
                </div>
              )}
            </div>

            {c.informacoes_fonte && (
              <p className="fonte-info">
                Fonte: {c.informacoes_fonte}
                {c.informacoes_atualizadas_em
                  ? ` · conferido em ${new Date(c.informacoes_atualizadas_em + "T12:00:00").toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
            )}
          </section>
        )}
      </main>


    </div>
  );
}
