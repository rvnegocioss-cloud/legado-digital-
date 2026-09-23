import Link from "next/link";
import { MapPin } from "lucide-react";
import { supabaseServidor } from "@/lib/supabaseServidor";
import { BuscaMemorial } from "@/components/public/BuscaMemorial";
import NodesFamilia from "@/components/public/NodesFamilia";
import MapaPublicoCemiterio from "@/components/public/MapaPublicoCemiterioCarregador";
import { assinarOrtomosaico } from "@/lib/ortomosaicoAssinado";
import { urlMidiaProtegida } from "@/lib/urlMidia";
import "./landing.css";

// Landing oficial desde 2026-09-22 — implementação do protótipo aprovado pelo
// Rafael (wireframe/reestruturacao-site-publico/prototipo-home.html), montado a
// partir do wireframe do Pedro. A landing anterior ("O Fio da Vida", fio dourado
// com nodes acendendo no scroll) NÃO foi apagada: continua inteira em
// /fio-da-vida, e o backup completo (código + assets + briefing) está em
// `Desktop\Landing Page Original - Fio da Vida\`.
//
// O que muda em relação à antiga: a home deixa de ser uma peça de venda B2B e
// vira a porta do público final -- busca de memorial no topo, busca de
// cemitério logo abaixo, o que a família recebe, os dois caminhos pra ter o
// memorial (parceiro sem custo / direto pelo site) e só então um bloco curto
// pra funerária.

export const revalidate = 300;

// Memorial de exemplo mostrado ao lado da busca. Fixo num registro fictício de
// teste, nunca no memorial real de uma família -- usar a homenagem de alguém
// como vitrine da home seria expor a família sem ela ter pedido.
const SLUG_EXEMPLO = "helena-martins-costa";

interface MemorialExemplo {
  nome_completo: string;
  data_nascimento: string | null;
  data_falecimento: string | null;
  cidade: string | null;
  frase_preferida: string | null;
  slug: string | null;
}

function apenasAno(data: string | null): string | null {
  if (!data) return null;
  const m = data.match(/(\d{4})/);
  return m ? m[1] : null;
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

// Cemitério em destaque na home: o mapa real, não uma ilustração. Pega o
// primeiro cemitério público que já tem ortomosaico de drone -- hoje o São
// Pedro (Uberlândia). Se nenhum tiver mapa aéreo ainda, o bloco inteiro some
// em vez de mostrar um retângulo vazio.
async function buscarCemiterioDestaque() {
  const { data: cidades } = await supabaseServidor.rpc("listar_cidades_publicas");
  for (const c of (cidades || []) as { cidade_slug: string }[]) {
    const { data: cems } = await supabaseServidor.rpc("listar_cemiterios_publicos", {
      p_cidade_slug: c.cidade_slug,
    });
    const comMapa = ((cems || []) as { slug: string; tem_ortomosaico: boolean }[]).find(
      (x) => x.tem_ortomosaico
    );
    if (!comMapa) continue;

    const { data } = await supabaseServidor.rpc("obter_mapa_publico_cemiterio", {
      p_slug: comMapa.slug,
    });
    if (!data) continue;

    const ortoUrl = await assinarOrtomosaico(data.cemiterio.ortomosaico_url);
    const memoriais = {
      ...data.memoriais,
      features: (data.memoriais?.features || []).map(
        (f: { properties?: Record<string, unknown> }) => ({
          ...f,
          properties: {
            ...f.properties,
            foto_url: urlMidiaProtegida(f.properties?.foto_url as string | null),
          },
        })
      ),
    };

    return {
      cemiterio: data.cemiterio,
      memoriais,
      ortoUrl,
      total: memoriais.features.length,
      href: `/cemiterios/${c.cidade_slug}/${comMapa.slug}`,
    };
  }
  return null;
}

async function buscarExemplo(): Promise<MemorialExemplo | null> {
  const { data } = await supabaseServidor
    .from("homenagens")
    .select("nome_completo, data_nascimento, data_falecimento, cidade, frase_preferida, slug")
    .eq("slug", SLUG_EXEMPLO)
    .maybeSingle();
  return (data as MemorialExemplo) || null;
}

export default async function Home() {
  const [exemplo, destaque] = await Promise.all([buscarExemplo(), buscarCemiterioDestaque()]);
  const nascimento = apenasAno(exemplo?.data_nascimento ?? null);
  const falecimento = apenasAno(exemplo?.data_falecimento ?? null);

  return (
    <div className="landing">


      {/* ---------- HERO: busca de memorial + prévia ---------- */}
      <section className="hero">
        <div className="wrap split">
          <div>
            <h1 className="h1">
              Toda Família Tem Uma História <span className="gold">Que Deve Ser Eterna</span>
            </h1>
            <p className="lede">
              Guardar e contar a história de quem partiu é o que mantém a família inteira, e dá valor
              a tudo o que aquela pessoa construiu.
            </p>
            <div className="searchbox">
              <h3>Encontre o memorial de quem você procura</h3>
              <p className="small">
                Busque pelo nome da pessoa. A lista aparece enquanto você digita — memorial com
                acesso restrito pede senha antes de abrir.
              </p>
              <BuscaMemorial />
            </div>
          </div>

          {exemplo?.slug && (
            <Link href={`/homenagem/${exemplo.slug}`} className="card preview">
              <span className="tag-exemplo">memorial de exemplo</span>
              <div className="ficha-card">
                <div className="foto-ring">
                  <div className="foto-ring-in">
                    <div className="foto-ring-inner">
                      <span className="monograma">{iniciais(exemplo.nome_completo)}</span>
                    </div>
                  </div>
                </div>
                <div className="eyebrow-ficha">Em memória de</div>
                <div className="nome-ficha">{exemplo.nome_completo}</div>
                {exemplo.cidade && (
                  <div className="cidade-ficha">
                    <MapPin size={13} strokeWidth={1.5} />
                    <span>{exemplo.cidade}</span>
                  </div>
                )}
                {exemplo.frase_preferida && <p className="frase-ficha">&ldquo;{exemplo.frase_preferida}&rdquo;</p>}
                {nascimento && falecimento && (
                  <p className="small" style={{ marginTop: 10 }}>
                    {nascimento} – {falecimento}
                  </p>
                )}
              </div>
              <div className="actions">
                <span className="btn">Ver memorial</span>
              </div>
              <p className="nota">
                <b>Assim fica a página da sua família.</b> Este é um memorial de exemplo, com dados
                fictícios — o memorial de verdade de uma família nunca é usado como vitrine.
              </p>
            </Link>
          )}
        </div>
      </section>

      {/* ---------- CEMITÉRIOS MAPEADOS ---------- */}
      <section className="sec alt">
        <div className="wrap split">
          <div>
            <h2 className="h2">O legado tem um lugar. E um caminho até ele.</h2>
            <p className="txt">
              O mapa do cemitério localiza o memorial e traça a rota por GPS, direto do celular, até
              o túmulo exato.
            </p>
            <div className="searchbox">
              <h3>Encontre um cemitério mapeado</h3>
              <p className="small">
                Veja os cemitérios já mapeados por cidade, com o mapa aéreo e a localização de cada
                memorial.
              </p>
              <Link href="/cemiterios" className="btn">
                Ver os cemitérios mapeados
              </Link>
            </div>
          </div>

          {/* Mapa de verdade, não ilustração: o mesmo componente da página do
              cemitério, com o ortomosaico de drone e os pinos vindos do banco.
              Passar o mouse numa cruz mostra quem está ali. */}
          {destaque && (
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
                  {destaque.cemiterio.cidade} — {destaque.cemiterio.estado} ·{" "}
                  {destaque.total} {destaque.total === 1 ? "memorial" : "memoriais"}
                </p>
                <div className="row" style={{ marginTop: 12 }}>
                  <Link href={destaque.href} className="btn">
                    Abrir o mapa deste cemitério
                  </Link>
                  <Link href="/cemiterios" className="btn o">
                    Ver todos
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- O QUE A FAMÍLIA RECEBE ---------- */}
      <section className="sec" id="como-funciona">
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

      {/* ---------- COMO TER O MEMORIAL ---------- */}
      <section className="sec alt">
        <div className="wrap">
          <h2 className="h2">Como ter o memorial da sua família</h2>
          <p className="txt">
            Dois caminhos. Pela funerária ou cemitério parceiro, a família não paga nada. Direto pelo
            site, a família escolhe um plano e a equipe do Legado Digital acompanha tudo.
          </p>
          <div className="grid2">
            <div className="card pathcard">
              <h3>Pela sua funerária ou cemitério parceiro</h3>
              <p>
                Sem custo para a família. O parceiro cadastra o memorial e a família recebe o acesso
                para personalizar.
              </p>
              <Link href="/cemiterios" className="link-u">
                Ver se o meu cemitério é parceiro
              </Link>
            </div>
            <div className="card pathcard">
              <h3>Direto pelo site</h3>
              <div className="steps">
                <div>
                  <div className="n">01</div>
                  <h5>Preencha o pedido</h5>
                  <p>Quem partiu, onde descansa, documentos.</p>
                </div>
                <div>
                  <div className="n">02</div>
                  <h5>Escolha o plano</h5>
                  <p>Sem pagar nada agora.</p>
                </div>
                <div>
                  <div className="n">03</div>
                  <h5>Receba a confirmação</h5>
                  <p>Por e-mail. A equipe segue com a contratação.</p>
                </div>
              </div>
              <Link href="/familia/login#cadastro" className="btn big">
                Quero um memorial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PARCEIROS (bloco curto) ---------- */}
      <section className="sec b2b">
        <div className="wrap split">
          <div>
            <h2 className="h2">Para funerárias e cemitérios</h2>
            <p className="txt">
              Um novo serviço para oferecer à sua rede de clientes. Você cadastra o falecido em 2
              minutos, a família personaliza, o QR Code vai para a placa — e a sua marca fica na
              homenagem que a família visita por anos.
            </p>
            <div className="row">
              <Link href="/parceiro/login#cadastro" className="btn big">
                Seja nosso parceiro
              </Link>
              <span className="small">Sem multas ou taxas de cancelamento</span>
            </div>
          </div>

          <div className="dash-mock">
            <span className="tag-exemplo">exemplo — Funerária Vale da Paz</span>
            <div className="tabs-mock">
              <span className="on">Resumo</span>
              <span>Memoriais</span>
              <span>Página</span>
            </div>

            <div className="cards">
              <div className="kpi">
                <div className="lbl">Memoriais cadastrados</div>
                <div className="val">8</div>
              </div>
              <div className="kpi">
                <div className="lbl">Plano contratado</div>
                <div className="val">Essencial</div>
              </div>
              <div className="kpi">
                <div className="lbl">Status de pagamento</div>
                <div className="val pill">Em dia</div>
              </div>
            </div>

            <div className="panel-title">Memoriais e QR Codes</div>
            <table>
              <thead>
                <tr>
                  <th>QR Code</th>
                  <th>Nome</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="qrph" />
                  </td>
                  <td>Joana Ribeiro</td>
                  <td className="mut">Publicado</td>
                </tr>
                <tr>
                  <td>
                    <div className="qrph" />
                  </td>
                  <td>Sebastião Nunes</td>
                  <td className="mut">Publicado</td>
                </tr>
                <tr>
                  <td className="mut">Sem QR ainda</td>
                  <td>Aparecida Rocha</td>
                  <td className="mut">Rascunho</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------- FAQ (só da família) ---------- */}
      <section className="sec" id="faq">
        <div className="wrap">
          <h2 className="h2" style={{ marginBottom: 20 }}>
            Perguntas Frequentes
          </h2>

          <details className="faq-item" open>
            <summary>
              A família precisa pagar algo? <span className="chev">▼</span>
            </summary>
            <p>
              Pela funerária ou cemitério parceiro, não: o memorial já vem incluído no serviço do
              parceiro. Direto pelo site, a família escolhe um plano — sem pagar nada no momento do
              pedido, a equipe entra em contato para a contratação.
            </p>
          </details>

          <details className="faq-item">
            <summary>
              O QR Code é único para cada falecido? <span className="chev">▼</span>
            </summary>
            <p>
              Sim. Cada memorial gera um QR Code exclusivo que leva diretamente à página de homenagem
              daquele ente querido.
            </p>
          </details>

          <details className="faq-item">
            <summary>
              Como funciona a privacidade com senha? <span className="chev">▼</span>
            </summary>
            <p>
              A família define no painel: aberta, com senha, com identificação, lista de e-mails
              autorizados ou totalmente oculta.
            </p>
          </details>

          <details className="faq-item">
            <summary>
              Meu cemitério não é parceiro. O que eu faço? <span className="chev">▼</span>
            </summary>
            <p>
              A família pode contratar direto pelo site mesmo assim — o memorial funciona igual, com
              o endereço do cemitério escrito na página. Quando aquele cemitério for mapeado, o
              memorial ganha o ponto no mapa e a rota até o túmulo, sem precisar refazer nada.
            </p>
          </details>
        </div>
      </section>

      <div className="quote">
        <div className="wrap">
          <p>Cada memorial acende o próprio ponto de luz. Juntos, viram uma constelação que não se apaga.</p>
        </div>
      </div>


    </div>
  );
}
