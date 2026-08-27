// Carregamento da sprite da chama com alfa aplicado — compartilhado entre
// o mural de velas votivas, a vela principal em castiçal e a chama que voa
// entre as duas (as três agora usam a mesma sprite, então usam o mesmo
// carregador, em vez de repetir a extração de alfa três vezes).
//
// A sprite é RGB sem canal alfa (fundo preto sólido). Desenhá-la direto com
// 'lighter' num canvas transparente pinta um retângulo preto em volta de cada
// chama (o alfa também é somado). Corrigido na raiz: dar alfa à sprite UMA vez
// no carregamento — alfa = brilho do pixel, preto vira transparente de
// verdade. Depois disso o desenho é source-over normal, sem blend mode.

export const SPRITE_CHAMA_SRC = '/fio-da-vida/chama-sprite.png'
export const CHAMA_QUADRO_LARGURA = 43
export const CHAMA_QUADRO_ALTURA = 132
export const CHAMA_QUADROS_NA_SPRITE = 37

export function carregarSpriteComAlfa(src: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const sprite = new Image()
    sprite.onload = () => {
      const oc = document.createElement('canvas')
      oc.width = sprite.naturalWidth
      oc.height = sprite.naturalHeight
      const o = oc.getContext('2d')
      if (!o) {
        reject(new Error('sem contexto 2d'))
        return
      }
      o.drawImage(sprite, 0, 0)
      const dados = o.getImageData(0, 0, oc.width, oc.height)
      const px = dados.data
      for (let i = 0; i < px.length; i += 4) {
        const lum = Math.max(px[i], px[i + 1], px[i + 2])
        px[i + 3] = lum < 10 ? 0 : lum
      }
      o.putImageData(dados, 0, 0)
      resolve(oc)
    }
    sprite.onerror = () => reject(new Error('falha ao carregar sprite'))
    sprite.src = src
  })
}

/** Quadro atual do ciclo ping-pongue (sem emenda no loop), dado um instante t em ms. */
export function quadroDaChama(t: number, deslocamento = 0, velocidade = 55): number {
  const ciclo = CHAMA_QUADROS_NA_SPRITE * 2 - 2
  const k = Math.floor(t / velocidade + deslocamento) % ciclo
  return k < CHAMA_QUADROS_NA_SPRITE ? k : ciclo - k
}
