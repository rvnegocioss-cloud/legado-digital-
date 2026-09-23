import Migalhas from "@/components/public/Migalhas";
import "../documento.css";

// Reescrita 2026-09-23 (padronização do site público). Antes esta página era
// órfã: sem menu, sem rodapé, em Georgia, 720px de largura e todo o estilo
// escrito à mão dentro do arquivo. Agora usa a mesma casca de todo o site
// (SiteNav/SiteFooter) e os tokens de app/tokens.css -- a página só entrega
// o texto.

export const metadata = {
  title: "Política de Privacidade — Legado Digital",
  description:
    "Como o Legado Digital trata os dados de famílias, homenageados, visitantes e parceiros.",
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{titulo}</h2>
      <div className="regua" />
      {children}
    </section>
  );
}

export default function PoliticaPrivacidadePage() {
  return (
    <div className="doc">


      <Migalhas trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Política de Privacidade" }]} />

      <main>
        <div className="coluna">
          <p className="eyebrow">Última atualização: julho de 2026</p>
          <h1>Política de Privacidade</h1>
          <p className="resumo">
            Esta página explica quais dados o Legado Digital trata, por quê, com quem compartilha e
            quais são os seus direitos.
          </p>

          <Secao titulo="1. Quem somos">
            <p>
              O Legado Digital é uma plataforma de memoriais digitais vinculados a QR Code, oferecida a
              famílias através de parceiros funerários, cemitérios, crematórios e demais entidades do
              setor (modelo B2B2C — a contratação é feita pelo parceiro, não diretamente pela família).
            </p>
            <p className="nota">
              Razão social e CNPJ desta operadora estão em fase de formalização societária e serão
              publicados aqui assim que o registro estiver concluído.
            </p>
          </Secao>

          <Secao titulo="2. Quais dados coletamos">
            <p>Dependendo de como você usa a plataforma, podemos tratar:</p>
            <ul>
              <li>
                Dados do homenageado: nome, datas, cidade, biografia, fotos, vídeos e linha do tempo
                fornecidos pela família ou pelo parceiro.
              </li>
              <li>
                Dados de contato da família responsável: nome, e-mail e telefone, usados para enviar a
                senha de acesso e permitir o login no Portal da Família.
              </li>
              <li>
                Mensagens de condolência e homenagem: nome e mensagem deixados por visitantes da página
                do memorial.
              </li>
              <li>
                Dados de acesso técnico: cookies de sessão (login administrativo, sessão da família,
                senha de acesso do memorial) e contagem de visitas agregada — uma visita por visitante,
                por memorial, por dia, sem guardar nada que identifique a pessoa.
              </li>
              <li>
                Dados cadastrais do parceiro B2B (funerária, cemitério, prefeitura, etc.): razão social,
                CNPJ e contato comercial.
              </li>
            </ul>
          </Secao>

          <Secao titulo="3. Para que usamos esses dados">
            <ul>
              <li>Criar, exibir e manter o memorial digital conforme configurado pela família.</li>
              <li>Autenticar o acesso da família, do parceiro e da equipe interna.</li>
              <li>
                Enviar e-mails operacionais (senha de acesso, confirmação da mensagem da placa,
                notificação de QR Code para o fornecedor).
              </li>
              <li>
                Cumprir a privacidade escolhida pela família (aberto, com senha, com identificação,
                lista de e-mails autorizados ou oculto), controlando quem pode ver o quê.
              </li>
              <li>
                Gerar estatística agregada de uso (número de visitas) para o parceiro e para a equipe
                interna.
              </li>
            </ul>
          </Secao>

          <Secao titulo="4. Com quem compartilhamos">
            <p>
              Não vendemos dados pessoais. Usamos prestadores de infraestrutura que processam dados em
              nosso nome, sob contrato, apenas para operar o serviço:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> — banco de dados e armazenamento de arquivos (fotos, vídeos,
                QR Codes).
              </li>
              <li>
                <strong>Vercel</strong> — hospedagem da aplicação.
              </li>
              <li>
                <strong>Google Workspace</strong> — envio dos e-mails operacionais citados acima.
              </li>
            </ul>
            <p>
              O parceiro B2B que cadastrou o memorial (funerária, cemitério, etc.) também tem acesso aos
              dados dos memoriais que ele mesmo cadastrou, necessário para prestar o serviço contratado
              pela família. Um parceiro nunca acessa memorial de outro parceiro.
            </p>
          </Secao>

          <Secao titulo="5. Privacidade configurável pela família">
            <p>
              A família decide como o memorial pode ser alcançado — busca por nome, link direto e QR
              Code são três chaves independentes — e qual portão o visitante encontra: aberto, com
              senha, com identificação, restrito a uma lista de e-mails autorizados, ou totalmente
              oculto.
            </p>
            <p>
              A senha de edição do conteúdo é separada da senha de visita e nunca é legível por nenhuma
              equipe: fica guardada apenas como hash.
            </p>
          </Secao>

          <Secao titulo="6. Seus direitos (Lei Geral de Proteção de Dados — Lei 13.709/2018)">
            <p>Como titular dos dados, você pode solicitar a qualquer momento:</p>
            <ul>
              <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>
                Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em
                desconformidade com a lei;
              </li>
              <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
              <li>Eliminação dos dados pessoais tratados com o seu consentimento;</li>
              <li>Revogação do consentimento, quando aplicável.</li>
            </ul>
            <p>
              Solicitações relacionadas a um memorial específico podem ser feitas diretamente ao parceiro
              que o cadastrou (funerária, cemitério, etc.) ou à nossa equipe pelo e-mail abaixo.
            </p>
          </Secao>

          <Secao titulo="7. Retenção">
            <p>
              Mantemos os dados de um memorial enquanto o contrato entre o parceiro e a Legado Digital
              estiver ativo, ou enquanto a família mantiver o memorial publicado. Dados podem ser
              mantidos por período adicional quando exigido por obrigação legal.
            </p>
          </Secao>

          <Secao titulo="8. Contato">
            <p>
              Dúvidas sobre esta política ou sobre o tratamento dos seus dados podem ser encaminhadas ao
              parceiro responsável pelo memorial ou à equipe do Legado Digital, pelo e-mail{" "}
              <a href="mailto:contato@legadodigital.net">contato@legadodigital.net</a>.
            </p>
          </Secao>
        </div>
      </main>


    </div>
  );
}
