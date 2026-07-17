import Image from "next/image";
import Link from "next/link";
import { CORES } from "@/lib/publicTheme";

export const metadata = {
  title: "Política de Privacidade — Legado Digital",
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 400, color: CORES.textoForte, marginBottom: 4 }}>{titulo}</h2>
      <div style={{ height: 1, background: CORES.douradoBorda, marginBottom: 14, maxWidth: 80 }} />
      <div style={{ color: CORES.textoCorpo, fontSize: 15, lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}

export default function PoliticaPrivacidadePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${CORES.fundoTopo} 0%, ${CORES.fundoBase} 100%)`,
        color: CORES.textoForte,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 80px" }}>
        <Link href="/" style={{ color: CORES.textoFraco, fontSize: 13, textDecoration: "none" }}>
          ← Voltar pro site
        </Link>

        <div style={{ textAlign: "center", margin: "32px 0 8px" }}>
          <Image
            src="/logo-legado-digital.svg"
            alt="Legado Digital"
            width={200}
            height={80}
            style={{ height: 72, width: "auto", margin: "0 auto" }}
          />
        </div>

        <p style={{ textAlign: "center", color: CORES.dourado, fontSize: 11, textTransform: "uppercase", letterSpacing: 2 }}>
          Última atualização: julho de 2026
        </p>
        <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 400, margin: "8px 0 0" }}>
          Política de Privacidade
        </h1>

        <Secao titulo="1. Quem somos">
          <p>
            O Legado Digital é uma plataforma de memoriais digitais vinculados a QR Code, oferecida a
            famílias através de parceiros funerários, cemitérios, crematórios e demais entidades do setor
            (modelo B2B2C — a contratação é feita pelo parceiro, não diretamente pela família).
          </p>
          <p style={{ color: CORES.textoFraco, fontSize: 13.5, marginTop: 10 }}>
            Razão social e CNPJ desta operadora estão em fase de formalização societária e serão publicados
            aqui assim que o registro estiver concluído.
          </p>
        </Secao>

        <Secao titulo="2. Quais dados coletamos">
          <p>Dependendo de como você usa a plataforma, podemos tratar:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Dados do homenageado: nome, datas, cidade, biografia, fotos, vídeos e linha do tempo fornecidos pela família ou pelo parceiro.</li>
            <li>Dados de contato da família responsável: e-mail, usado apenas para login no Portal da Família e envio de senha de acesso.</li>
            <li>Mensagens de condolência: nome e mensagem deixados por visitantes da página do memorial.</li>
            <li>Dados de acesso técnico: cookies de sessão (login administrativo, sessão da família, senha de acesso do memorial) e contadores de visita/acesso agregados.</li>
            <li>Dados cadastrais do parceiro B2B (funerária, cemitério, prefeitura, etc.): razão social, CNPJ, contato comercial.</li>
          </ul>
        </Secao>

        <Secao titulo="3. Para que usamos esses dados">
          <ul style={{ paddingLeft: 20 }}>
            <li>Criar, exibir e manter o memorial digital conforme configurado pela família.</li>
            <li>Autenticar o acesso da família, do parceiro e da equipe interna.</li>
            <li>Enviar e-mails operacionais (senha de acesso, confirmação de mensagem de placa, notificações de QR Code) através do nosso provedor de e-mail.</li>
            <li>Cumprir a privacidade escolhida pela família (público, com senha, ou modos restritos), controlando quem pode ver o quê.</li>
            <li>Gerar estatísticas agregadas de uso (número de visitas) para o parceiro e para a equipe interna.</li>
          </ul>
        </Secao>

        <Secao titulo="4. Com quem compartilhamos">
          <p>
            Não vendemos dados pessoais. Usamos prestadores de infraestrutura que processam dados em nosso
            nome, sob contrato, apenas para operar o serviço:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li><strong>Supabase</strong> — banco de dados e armazenamento de arquivos (fotos, vídeos, QR Codes).</li>
            <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
            <li><strong>Resend</strong> — envio dos e-mails operacionais citados acima.</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            O parceiro B2B que cadastrou o memorial (funerária, cemitério, etc.) também tem acesso aos dados
            dos memoriais que ele mesmo cadastrou, necessário pra prestar o serviço contratado pela família.
          </p>
        </Secao>

        <Secao titulo="5. Privacidade configurável pela família">
          <p>
            A família decide o modo de acesso do memorial: público (busca, link ou QR Code), protegido por
            senha, ou com caminhos individuais desativados. Uma senha separada, nunca visível a mais ninguém
            além de quem a recebe, controla a edição do conteúdo do memorial.
          </p>
        </Secao>

        <Secao titulo="6. Seus direitos (Lei Geral de Proteção de Dados — Lei 13.709/2018)">
          <p>Como titular dos dados, você pode solicitar a qualquer momento:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
            <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
            <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
            <li>Eliminação dos dados pessoais tratados com o seu consentimento;</li>
            <li>Revogação do consentimento, quando aplicável.</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Solicitações relacionadas a um memorial específico podem ser feitas diretamente ao parceiro que o
            cadastrou (funerária, cemitério, etc.) ou à nossa equipe pelos canais indicados na página do
            parceiro.
          </p>
        </Secao>

        <Secao titulo="7. Retenção">
          <p>
            Mantemos os dados de um memorial enquanto o contrato entre o parceiro e a Legado Digital estiver
            ativo, ou enquanto a família mantiver o memorial publicado. Dados podem ser mantidos por período
            adicional quando exigido por obrigação legal.
          </p>
        </Secao>

        <Secao titulo="8. Contato">
          <p>
            Dúvidas sobre esta política ou sobre o tratamento dos seus dados podem ser encaminhadas ao
            parceiro responsável pelo memorial ou à equipe do Legado Digital.
          </p>
        </Secao>
      </div>
    </div>
  );
}
