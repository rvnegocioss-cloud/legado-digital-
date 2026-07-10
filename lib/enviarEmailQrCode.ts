import { Resend } from 'resend'

interface DadosEmailQrCode {
  destinatario: string
  nomeCompleto: string
  memorialId: string
  slug: string
  url: string
  qrCodePng: Buffer
  mensagemPlaca?: string | null
}

function escapeHtml(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export async function enviarEmailQrCode(dados: DadosEmailQrCode) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { enviado: false, erro: 'RESEND_API_KEY não configurada' }

  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from: 'Legado Digital <onboarding@resend.dev>',
    to: dados.destinatario,
    subject: `QR Code para produção — ${dados.nomeCompleto}`,
    html: `
      <p>Novo QR Code gerado para produção de placa.</p>
      <p>
        <strong>Nome do homenageado:</strong> ${dados.nomeCompleto}<br/>
        <strong>ID do memorial:</strong> ${dados.memorialId}<br/>
        <strong>Slug/endereço:</strong> ${dados.slug}<br/>
        <strong>Link do memorial:</strong> <a href="${dados.url}">${dados.url}</a>
      </p>
      ${
        dados.mensagemPlaca
          ? `<p><strong>Mensagem pra gravar na placa (texto definido pela família):</strong><br/>
             ${escapeHtml(dados.mensagemPlaca).replace(/\n/g, '<br/>')}</p>`
          : `<p><em>Família não definiu texto de placa — confirmar com o cadastro antes de confeccionar.</em></p>`
      }
      <p>O arquivo em anexo (<code>${dados.slug}.png</code>) é o QR Code definitivo. O nome do
      arquivo corresponde ao slug do memorial — confira que bate com o nome/ID e com a mensagem
      acima antes de mandar pra produção da placa.</p>
    `,
    attachments: [{ filename: `${dados.slug}.png`, content: dados.qrCodePng }],
  })

  if (error) return { enviado: false, erro: error.message }
  return { enviado: true }
}
