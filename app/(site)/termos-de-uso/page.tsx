import Link from "next/link";
import "../documento.css";

// Reescrita 2026-09-23 (padronização do site público), junto com a Política
// de Privacidade. Antes era órfã: sem menu, sem rodapé, em Georgia, 720px e
// estilo escrito à mão no arquivo. Agora usa a casca do site e os tokens de
// app/tokens.css.

export const metadata = {
  title: "Termos de Uso — Legado Digital",
  description: "As regras de uso da plataforma de memoriais digitais do Legado Digital.",
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

export default function TermosDeUsoPage() {
  return (
    <div className="doc">


      <main>
        <div className="coluna">
          <p className="eyebrow">Última atualização: julho de 2026</p>
          <h1>Termos de Uso</h1>
          <p className="resumo">
            As regras de uso da plataforma, para famílias, parceiros e visitantes.
          </p>

          <Secao titulo="1. O que é o Legado Digital">
            <p>
              O Legado Digital é uma plataforma de criação e gestão de memoriais digitais vinculados a
              QR Code, lápides e jazigos. O serviço é oferecido a famílias através de parceiros do setor
              funerário e cemiterial (funerárias, cemitérios, crematórios, planos funerários, prefeituras
              e demais entidades parceiras).
            </p>
          </Secao>

          <Secao titulo="2. Quem pode usar">
            <ul>
              <li>
                <strong>Parceiros B2B</strong> — cadastram memoriais e gerenciam a própria página
                institucional.
              </li>
              <li>
                <strong>Familiares responsáveis</strong> — recebem acesso para personalizar o conteúdo do
                memorial de um ente querido.
              </li>
              <li>
                <strong>Visitantes</strong> — acessam memoriais conforme a privacidade definida pela
                família, e podem deixar homenagens e mensagens.
              </li>
            </ul>
          </Secao>

          <Secao titulo="3. Conteúdo do memorial">
            <p>
              A família (ou o parceiro em seu nome) é responsável pela veracidade e adequação do conteúdo
              publicado — fotos, vídeos, biografia, linha do tempo e mensagens. Não é permitido publicar
              conteúdo:
            </p>
            <ul>
              <li>Que viole direitos autorais de terceiros (ex: música protegida sem licença);</li>
              <li>
                Ofensivo, discriminatório ou que desrespeite a memória do homenageado ou de terceiros;
              </li>
              <li>Ilegal sob a legislação brasileira.</li>
            </ul>
            <p>
              A Legado Digital pode remover conteúdo que viole estas regras, mediante notificação ao
              responsável pelo memorial sempre que possível.
            </p>
          </Secao>

          <Secao titulo="4. Acesso e senhas">
            <p>
              Cada memorial pode ter duas senhas independentes: uma senha de <strong>edição</strong>,
              usada pela família no Portal da Família para atualizar fotos, vídeo, biografia e linha do
              tempo; e uma senha de <strong>acesso</strong>, opcional, que a família pode definir para
              restringir quem visualiza a página pública. Cada responsável é encarregado de manter suas
              senhas em sigilo — a Legado Digital não se responsabiliza por acessos indevidos decorrentes
              de compartilhamento voluntário da senha.
            </p>
          </Secao>

          <Secao titulo="5. Homenagens e mensagens públicas">
            <p>
              Visitantes podem deixar homenagens e mensagens visíveis na página do memorial. Essas
              mensagens não passam por moderação automática — a família responsável pode removê-las pelo
              Portal da Família, ou pedir a remoção ao parceiro ou à equipe do Legado Digital.
            </p>
          </Secao>

          <Secao titulo="6. Disponibilidade do serviço">
            <p>
              Fazemos esforços razoáveis para manter a plataforma disponível, mas não garantimos
              disponibilidade ininterrupta. Manutenções, atualizações ou falhas de infraestrutura de
              terceiros (hospedagem, banco de dados, envio de e-mail) podem causar indisponibilidade
              temporária.
            </p>
          </Secao>

          <Secao titulo="7. Relação com o parceiro contratante">
            <p>
              O plano contratado, valores, forma de pagamento e prazo de atendimento são definidos
              diretamente entre a família e o parceiro (funerária, cemitério, etc.) que oferece o serviço
              — a Legado Digital é a fornecedora da tecnologia usada por esse parceiro.
            </p>
          </Secao>

          <Secao titulo="8. Propriedade do conteúdo">
            <p>
              Fotos, vídeos, textos e demais conteúdos enviados pela família continuam de propriedade da
              família. Ao publicar no memorial, a família autoriza a Legado Digital a armazenar e exibir
              esse conteúdo exclusivamente para a prestação do serviço (exibição pública ou restrita do
              memorial, conforme a privacidade escolhida).
            </p>
          </Secao>

          <Secao titulo="9. Alterações destes termos">
            <p>
              Podemos atualizar estes termos conforme o serviço evolui. Alterações relevantes serão
              publicadas nesta página com a data de atualização revisada.
            </p>
          </Secao>

          <Secao titulo="10. Lei aplicável">
            <p>
              Estes termos são regidos pela legislação brasileira, incluindo a Lei Geral de Proteção de
              Dados (Lei 13.709/2018) — ver também nossa{" "}
              <Link href="/politica-de-privacidade">Política de Privacidade</Link>.
            </p>
          </Secao>
        </div>
      </main>


    </div>
  );
}
