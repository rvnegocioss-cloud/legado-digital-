import QRCode from 'qrcode'

export async function gerarQrCodePng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    width: 512,
    margin: 2,
    color: { dark: '#0B1D2A', light: '#FFFFFF' },
  })
}
