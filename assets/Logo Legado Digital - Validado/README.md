# Logo Legado Digital — Versão Validada (2026-07-17)

Corrige o problema de legibilidade: "Preservando Histórias" ficava borrado/ilegível porque o arquivo antigo (`public/logo-legado-digital.png`) era um PNG raster de só 803×389px com o texto já desenhado dentro — qualquer ampliação ou uso pequeno perdia nitidez.

## O que mudou

- **Texto agora é vetorial de verdade** (dentro do `.svg`), não mais desenhado numa imagem. Fica nítido em qualquer tamanho — tela pequena, impressão grande, zoom — porque vetor não tem resolução, é matemática de curva.
- **Ícone (arco + chama + planta + livro) continua o mesmo** — já era de alta qualidade (732×952px, sem texto), só reaproveitado.
- Cores mantidas: `#F5F2EB` (branco quente, texto principal) e gradiente `#DFC390 → #C9A46A → #A8834A` (dourado, subtítulo e ícone), iguais à paleta oficial já em uso no projeto.

## Arquivos

- `logo-legado-digital.svg` — arquivo mestre, vetor, editável. Referencia `icone-arco-chama-planta.png` (caminho relativo, pasta autossuficiente).
- `icone-arco-chama-planta.png` — só o ícone, alta resolução, fundo transparente.
- `logo-legado-digital-transparente-2400px.png` — logo completa (ícone + texto), fundo transparente, 2400px de largura. Uso geral, qualquer fundo.
- `logo-legado-digital-fundo-navy-2400px.png` — logo completa já sobre o navy oficial (`#0B1D2A`), pronta pra usar direto (apresentação, documento, redes sociais).

## Onde já está em uso

O site (`legado-digital-`) já foi atualizado pra usar o `.svg` (não mais o `.png` antigo) em todas as telas: navbar da landing, sidebar da Central, header mobile, rodapé, página do memorial, e os 3 logins (Central/Parceiro/Família).
