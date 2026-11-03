// Rótulos de parentesco. Ficam fora de ArvoreFamilia.tsx de propósito: aquele
// arquivo é 'use client', e valor exportado de um arquivo client chega vazio
// num Server Component (a lista da página mostrava "AVO_MATERNA", "MAE").
export const ROTULO: Record<string, string> = {
  pai: 'Pai', mae: 'Mãe', conjuge: 'Cônjuge',
  filho: 'Filho', filha: 'Filha', irmao: 'Irmão', irma: 'Irmã',
  avo_paterno: 'Avô paterno', avo_paterna: 'Avó paterna',
  avo_materno: 'Avô materno', avo_materna: 'Avó materna',
  neto: 'Neto', neta: 'Neta',
}
