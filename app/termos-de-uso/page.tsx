import Image from "next/image";
import Link from "next/link";
import { CORES } from "@/lib/publicTheme";

export const metadata = {
  title: "Termos de Uso — Legado Digital",
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

export default function TermosDeUsoPage() {
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
            style={{ height: 56, width: "auto", margin: "0 auto" }}
          />
        </div>

        <p style={{ textAlign: "center", color: CORES.dourado, fontSize: 11, textTransform: "uppercase", letterSpacing: 2 }}>
          Última atualização: julho de 2026
        </p>
        <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 400, margin: "8px 0 0" }}>
          Termos de Uso
        </h1>

        <Secao titulo="1. O que é o Legado Digital">
          <p>
            O Legado Digital é uma plataforma de criação e gestão de memoriais digitais vinculados a QR
            Code, lápides e jazigos. O serviço é oferecido a famílias através de parceiros do setor funerário
            e cemiterial (funerárias, cemitérios, crematórios, planos funerários, prefeituras e demais
            entidades parceiras) — não há contratação direta pela família junto à Legado Digital.
          </p>
        </Secao>

        <Secao titulo="2. Quem pode usar">
          <ul style={{ paddingLeft: 20 }}>
            <li><strong>Parceiros B2B</strong> — cadastram memoriais e gerenciam a própria página institucional.</li>
            <li><strong>Familiares responsáveis</strong> — recebem acesso pra personalizar o conteúdo do memorial de um ente querido.</li>
            <li><strong>Visitantes</strong> — acessam memoriais públicos ou protegidos por senha, e podem deixar mensagens de condolência.</li>
          </ul>
        </Secao>

        <Secao titulo="3. Conteúdo do memorial">
          <p>
            A família (ou o parceiro em seu nome) é responsável pela veracidade e adequação do conteúdo
            publicado — fotos, vídeos, biografia, linha do tempo e mensagens. Não é permitido publicar
            conteúdo:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Que viole direitos autorais de terceiros (ex: música protegida sem licença);</li>
            <li>Ofensivo, discriminatório ou que desrespeite a memória do homenageado ou de terceiros;</li>
            <li>Ilegal sob a legislação brasileira.</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            A Legado Digital pode remover conteúdo que viole estas regras, mediante notificação ao
            responsável pelo memorial sempre que possível.
          </p>
        </Secao>

        <Secao titulo="4. Acesso e senhas">
          <p>
            Cada memorial pode ter duas senhas independentes: uma senha de <strong>edição</strong>, usada pela
            família no Portal da Família pra atualizar fotos, vídeo, biografia e linha do tempo; e uma senha
            de <strong>acesso</strong>, opcional, que a família pode definir pra restringir quem visualiza a
            página pública. Cada responsável é encarregado de manter suas senhas em sigilo — a Legado Digital
            não se responsabiliza por acessos indevidos decorrentes de compartilhamento voluntário da senha.
          </p>
        </Secao>

        <Secao titulo="5. Condolências e comentários públicos">
          <p>
            Visitantes podem deixar mensagens de condolência publicamente visíveis na página do memorial.
            Essas mensagens não passam por moderação automática — a família responsável pode entrar em
            contato com o parceiro ou a equipe do Legado Digital pra solicitar a remoção de uma mensagem
            inadequada.
          </p>
        </Secao>

        <Secao titulo="6. Disponibilidade do serviço">
          <p>
            Fazemos esforços razoáveis pra manter a plataforma disponível, mas não garantimos disponibilidade
            ininterrupta. Manutenções, atualizações ou falhas de infraestrutura de terceiros (hospedagem,
            banco de dados, envio de e-mail) podem causar indisponibilidade temporária.
          </p>
        </Secao>

        <Secao titulo="7. Relação com o parceiro contratante">
          <p>
            O plano contratado, valores, forma de pagamento e SLA de atendimento são definidos diretamente
            entre a família e o parceiro (funerária, cemitério, etc.) que oferece o serviço — a Legado Digital
            é a fornecedora da tecnologia usada por esse parceiro, não parte no contrato comercial com a
            família final.
          </p>
        </Secao>

        <Secao titulo="8. Propriedade do conteúdo">
          <p>
            Fotos, vídeos, textos e demais conteúdos enviados pela família continuam de propriedade da
            família. Ao publicar no memorial, a família autoriza a Legado Digital a armazenar e exibir esse
            conteúdo exclusivamente pra prestação do serviço (exibição pública ou restrita do memorial,
            conforme a privacidade escolhida).
          </p>
        </Secao>

        <Secao titulo="9. Alterações destes termos">
          <p>
            Podemos atualizar estes termos conforme o serviço evolui. Alterações relevantes serão publicadas
            nesta página com a data de atualização revisada.
          </p>
        </Secao>

        <Secao titulo="10. Lei aplicável">
          <p>
            Estes termos são regidos pela legislação brasileira, incluindo a Lei Geral de Proteção de Dados
            (Lei 13.709/2018) — ver também nossa{" "}
            <Link href="/politica-de-privacidade" style={{ color: CORES.dourado }}>
              Política de Privacidade
            </Link>
            .
          </p>
        </Secao>
      </div>
    </div>
  );
}
