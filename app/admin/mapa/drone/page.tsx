import Link from 'next/link'

const css = `
.doc{
  background:#EDEFF1;
  color:#16222B;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  line-height:1.55;
  min-height:100vh;
}
.doc-shell{max-width:840px;margin:0 auto;padding:2rem 1.5rem 6rem;}

.kicker{
  font-size:0.72rem; letter-spacing:0.14em; text-transform:uppercase;
  color:#7A5F2F; font-weight:700; margin-bottom:0.7rem;
}
.doc h1{
  font-family:"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,"Times New Roman",serif;
  font-weight:500; font-size:clamp(1.7rem,3.2vw,2.35rem); margin:0 0 0.6rem; text-wrap:balance; letter-spacing:-0.01em;
}
.dek{color:#4B5A64; max-width:62ch; font-size:1.02rem; margin:0 0 1.6rem;}
.status-row{display:flex; flex-wrap:wrap; gap:0.6rem; margin-bottom:2rem;}
.status-pill{
  display:inline-flex; align-items:center; gap:0.4rem;
  font-size:0.78rem; padding:0.32rem 0.7rem; border-radius:999px;
  background:#FBF0DA; color:#8A6416; border:1px solid #EBD09C; font-weight:600;
}
.status-pill.ok{background:#E4F0E8; color:#2F6B4F; border-color:#BBD9C7;}

.toc{
  border:1px solid #D4D9DC; border-radius:10px; background:#F7F8F9;
  padding:1rem 1.3rem; margin-bottom:2.5rem;
}
.toc-label{font-size:0.72rem; letter-spacing:0.1em; text-transform:uppercase; color:#8895A0; font-weight:700; margin-bottom:0.6rem; display:block;}
.toc ol{margin:0; padding-left:1.1rem; columns:2; column-gap:1.6rem; font-size:0.87rem;}
.toc li{margin-bottom:0.35rem; break-inside:avoid;}
.toc a{color:#4B5A64; text-decoration:none;}
.toc a:hover{color:#7A5F2F; text-decoration:underline;}

.doc section{margin-bottom:2.5rem; scroll-margin-top:1.5rem;}
.doc h2{
  font-family:"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif;
  font-weight:500; font-size:1.4rem; margin:0 0 1rem; padding-bottom:0.6rem;
  border-bottom:1px solid #D4D9DC; color:#16222B;
}
.doc h2 .num{color:#7A5F2F; font-variant-numeric:tabular-nums; margin-right:0.5rem; font-family:inherit;}
.doc h3{font-size:1.02rem; font-weight:700; margin:1.6rem 0 0.6rem; color:#16222B;}
.doc p{margin:0 0 0.9rem; max-width:70ch;}
.doc ul,.doc ol.steps{margin:0 0 0.9rem; padding-left:1.3rem;}
.doc li{margin-bottom:0.4rem;}
.doc code{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  background:#E4EBEF; color:#3B5568; padding:0.1rem 0.4rem; border-radius:5px; font-size:0.86em;
}
.doc strong{color:#16222B; font-weight:700;}

.callout{
  display:flex; gap:0.9rem; border:1px solid #D4D9DC; background:#F7F8F9;
  border-radius:10px; padding:1.1rem 1.3rem; margin:1.2rem 0;
}
.callout .mark{
  flex:none; width:1.9rem; height:1.9rem; border-radius:7px; display:flex; align-items:center; justify-content:center;
  font-size:0.95rem; font-weight:700; background:#F3ECDD; color:#7A5F2F;
}
.callout.warn .mark{background:#FBF0DA; color:#8A6416;}
.callout .body{flex:1; font-size:0.94rem;}

.chips{display:flex; flex-wrap:wrap; gap:0.5rem; margin:0.9rem 0;}
.chip{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:0.82rem; padding:0.3rem 0.65rem; border-radius:7px;
  background:#E4EBEF; color:#3B5568; border:1px solid #D4D9DC;
}

.table-wrap{overflow-x:auto; border:1px solid #D4D9DC; border-radius:10px; margin:1rem 0;}
.doc table{width:100%; border-collapse:collapse; font-size:0.88rem; min-width:520px;}
.doc thead th{
  text-align:left; padding:0.65rem 0.9rem; background:#F7F8F9;
  font-size:0.72rem; letter-spacing:0.06em; text-transform:uppercase; color:#8895A0;
  border-bottom:1px solid #D4D9DC; font-weight:700;
}
.doc tbody td{padding:0.7rem 0.9rem; border-bottom:1px solid #D4D9DC; vertical-align:top;}
.doc tbody tr:last-child td{border-bottom:none;}
.doc tbody td:first-child{font-weight:600; white-space:nowrap;}
.tag{
  display:inline-block; font-size:0.74rem; font-weight:700; padding:0.15rem 0.55rem; border-radius:999px;
}
.tag.ok{background:#E4F0E8; color:#2F6B4F; border:1px solid #BBD9C7;}
.tag.mid{background:#FBF0DA; color:#8A6416; border:1px solid #EBD09C;}
.tag.hard{background:#F7E4E0; color:#8A3A2E; border:1px solid #E7BBB1;}

.steps{list-style:none; margin:0; padding:0; counter-reset:step;}
.steps li{counter-increment:step; position:relative; padding-left:2.6rem; margin-bottom:1.3rem;}
.steps li::before{
  content:counter(step); position:absolute; left:0; top:0; width:1.9rem; height:1.9rem;
  border-radius:50%; background:#F3ECDD; color:#7A5F2F; font-weight:700;
  display:flex; align-items:center; justify-content:center; font-size:0.88rem;
}
.steps h3{margin:0 0 0.3rem;}
.steps p{margin:0;}

.boundary{display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin:1.2rem 0;}
@media (max-width:600px){.boundary{grid-template-columns:1fr;}}
.boundary .col{border-radius:10px; padding:1.1rem 1.2rem; border:1px solid #D4D9DC;}
.boundary .col.can{background:#E4F0E8; border-color:#BBD9C7;}
.boundary .col.cannot{background:#F7E4E0; border-color:#E7BBB1;}
.boundary h4{margin:0 0 0.6rem; font-size:0.82rem; text-transform:uppercase; letter-spacing:0.06em;}
.boundary .col.can h4{color:#2F6B4F;}
.boundary .col.cannot h4{color:#8A3A2E;}
.boundary .col ul{padding-left:1.1rem; margin:0; font-size:0.9rem;}

.doc footer{border-top:1px solid #D4D9DC; margin-top:2rem; padding-top:1.5rem; font-size:0.82rem; color:#8895A0;}
.back-link{color:#4B5A64; font-size:0.85rem; text-decoration:none; display:inline-block; margin-bottom:1rem;}
.back-link:hover{color:#16222B;}
`

export default function RelatorioMapeamentoDrone() {
  return (
    <div className="doc">
      <style>{css}</style>
      <div className="doc-shell">
        <Link href="/admin/mapa" className="back-link">← Voltar pro Mapa</Link>

        <span className="kicker">Legado Digital · Central — Cemitérios</span>
        <h1>Mapeamento de cemitério por drone: o que deu certo</h1>
        <p className="dek">
          Registro do que já foi feito de verdade — pra ninguém esquecer o que funcionou. Dois
          cemitérios voados e processados, pipeline validado em produção, e a lição real sobre
          qual tipo de arquivo pedir da próxima vez.
        </p>
        <div className="status-row">
          <span className="status-pill ok">Em produção — 2 cemitérios mapeados</span>
          <span className="status-pill">José Lázaro: parcial, em andamento</span>
          <span className="status-pill">São Pedro: ortomosaico no ar, endereçamento pendente</span>
        </div>

        <nav className="toc">
          <span className="toc-label">Neste relatório</span>
          <ol>
            <li><a href="#quem">1. Quem fez e com o quê</a></li>
            <li><a href="#jl">2. José Lázaro (Tupaciguara/MG)</a></li>
            <li><a href="#sp">3. São Pedro (Uberlândia/MG)</a></li>
            <li><a href="#arquivos">4. Tipo de arquivo — o que deu certo</a></li>
            <li><a href="#pipeline">5. Pipeline que processa o material</a></li>
            <li><a href="#producao">6. Onde já está no ar</a></li>
            <li><a href="#3d">7. Modelo 3D — material pronto, sem visualizador ainda</a></li>
            <li><a href="#proximo">8. Recomendação pro próximo cemitério</a></li>
          </ol>
        </nav>

        <section id="quem">
          <h2><span className="num">01</span>Quem fez e com o quê</h2>
          <p>
            Os dois voos foram feitos por <strong>Rafael Rassi</strong>, com drone e câmera
            próprios (captura nadir — reto de cima, sem inclinação). O processamento fotogramétrico
            (transformar as centenas de fotos num ortomosaico único georreferenciado) do São Pedro
            também foi feito por ele, no <strong>Agisoft Metashape</strong>.
          </p>
          <div className="callout warn">
            <span className="mark">!</span>
            <div className="body">
              Câmera nadir não lê o nome gravado na face vertical da lápide, por mais nítida que a
              imagem seja — é limite físico do ângulo de captura, confirmado abrindo os arquivos
              brutos dos dois voos. Por isso o sistema usa endereçamento por código
              (<code>Q36-R01-T011</code>) em vez de tentar ler nome na foto — nome vem depois, por
              foto de campo de perto ou cadastro da família.
            </div>
          </div>
        </section>

        <section id="jl">
          <h2><span className="num">02</span>José Lázaro (Tupaciguara/MG)</h2>
          <p>
            Primeiro cemitério mapeado, em frente ao Fórum Adolpho Fidélis dos Santos. Entrega em
            <code>GeoPackage</code> (SIRGAS 2000 / UTM 22S), processado com o pipeline próprio pra
            <strong> 2,2cm de resolução nativa por pixel</strong> — roda em produção na tela a
            3,5cm/px (zoom máximo 22), nítido o bastante pra distinguir cada túmulo individual.
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Status real</th></tr></thead>
              <tbody>
                <tr><td>Ortomosaico</td><td><span className="tag ok">No ar</span> — camada de satélite do mapa da Central e do "Como Chegar" público</td></tr>
                <tr><td>Quadras reconhecidas</td><td>12 candidatos achados pelo reconhecimento automático, ~7-8 são quadras reais (resto é pomar/telhado)</td></tr>
                <tr><td>Túmulos endereçados</td><td>Fileira 11 revisada e travada na mão; demais fileiras foram apagadas depois de um bug de alinhamento (corrigido no código, ainda não regeradas)</td></tr>
                <tr><td>Entrada do cemitério</td><td><span className="tag mid">Pendente</span> — Rafael ainda não marcou pela Central</td></tr>
                <tr><td>1º memorial real vinculado</td><td>Ainda não — José Antônio da Silva é memorial de teste</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="sp">
          <h2><span className="num">03</span>São Pedro (Uberlândia/MG)</h2>
          <p>
            Segundo cemitério, voado 11/ago/2026. Entrega em pirâmide de tiles já renderizada
            (esquema XYZ/Google, o mesmo do Google Maps) — pipeline processou sem precisar
            reamostrar a imagem duas vezes, resultando em <strong>1,6cm de resolução nativa por
            pixel</strong>, 2× mais nítido que o José Lázaro.
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Status real</th></tr></thead>
              <tbody>
                <tr><td>Ortomosaico</td><td><span className="tag ok">No ar</span> — mapa público (<code>/cemiterios</code>) e mapa da Central</td></tr>
                <tr><td>Numeração oficial</td><td>Confirmada via mapa impresso da Prefeitura + letreiros de ferro em campo (2 conferências independentes batendo)</td></tr>
                <tr><td>Escala estimada</td><td>10-15 mil túmulos (contra 104 do José Lázaro) — cemitério urbano antigo, densidade alta</td></tr>
                <tr><td>Endereçamento por quadra/fila</td><td><span className="tag mid">Pendente</span> — recomendado mapear pelo fluxo manual, começando por 1 quadra pra medir tempo real antes de comprometer o resto</td></tr>
                <tr><td>1º memorial real vinculado</td><td><span className="tag ok">Carlos Saraiva</span>, <code>Q36-R01-T011</code>, conferido por 4 fontes (registro oficial da prefeitura, contagem no ortomosaico, foto de campo, GPS a 0,62m do ponto real)</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="arquivos">
          <h2><span className="num">04</span>Tipo de arquivo — o que deu certo</h2>
          <p>
            A lição mais cara do São Pedro: o arquivo que <strong>parecia</strong> ser o certo era o
            errado. Registrado aqui pra não repetir a confusão no próximo cemitério.
          </p>
          <div className="boundary">
            <div className="col can">
              <h4>Funcionou bem</h4>
              <ul>
                <li><code>GeoPackage</code> (voo cru, José Lázaro) — processa com rewarp no pipeline</li>
                <li><strong>Pirâmide de tiles já renderizada, EPSG:3857/XYZ</strong> (<code>Sao Pedro map.zip</code>, 2,8GB) — o que o Metashape/DJI Terra/WebODM exportam via &quot;Export Tiled&quot; — processa direto, sem reamostrar duas vezes, resultado mais nítido</li>
                <li><code>.kmz</code> — bom pra conferir contorno/posição rápido, não pro ortomosaico em si</li>
              </ul>
            </div>
            <div className="col cannot">
              <h4>Não usar</h4>
              <ul>
                <li>Pasta de <code>tile-X-Y.tif</code> soltos — parece o material bom, mas é nível intermediário decimado (25,8cm/px, 16× pior) ou máscara técnica sem cor nenhuma</li>
                <li>Modelo 3D &quot;Model&quot; simples do Metashape (exportado como <code>.glb</code>) — resumido, textura única de baixa resolução (5,3cm) — ver seção 7</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="pipeline">
          <h2><span className="num">05</span>Pipeline que processa o material</h2>
          <p>
            Um script só (<code>scripts/ortomosaico/converter-ortomosaico.py</code>) processa os dois
            formatos de entrada, sem depender de GDAL nem compilador instalado:
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Modo</th><th>Entrada</th><th>Quando usar</th></tr></thead>
              <tbody>
                <tr><td><code>--src</code></td><td>GeoPackage cru do voo</td><td>Quando só existe o raster bruto, sem tile pré-renderizado (José Lázaro)</td></tr>
                <tr><td><code>--src-xyz</code></td><td>Pirâmide de tiles já renderizada</td><td>Quando o processador do voo já entrega em XYZ/EPSG:3857 — copia direto, sem rewarp, resultado mais nítido (São Pedro)</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Saída dos dois: tiles WebP com transparência → MBTiles → <strong>PMTiles</strong> (arquivo
            único, hospedado no Storage privado do Supabase, servido por URL assinada de vida curta —
            é o ativo mais caro do projeto, não fica público direto).
          </p>
        </section>

        <section id="producao">
          <h2><span className="num">06</span>Onde já está no ar</h2>
          <div className="boundary">
            <div className="col can">
              <h4>Em produção agora</h4>
              <ul>
                <li>&quot;Como Chegar&quot; da página pública do memorial — troca o satélite genérico pelo ortomosaico real quando o cemitério tem um</li>
                <li>Mapa da Central (<code>/admin/cemiterios/[id]/mapa</code>) — staff marca cada túmulo clicando na imagem real</li>
                <li>Mapa Público de Cemitérios (<code>/cemiterios</code>, sem login) — os dois cemitérios já aparecem</li>
              </ul>
            </div>
            <div className="col cannot">
              <h4>Ainda não construído</h4>
              <ul>
                <li>Visualizador 3D (material já existe, ver seção 7)</li>
                <li>Vistoria de campo mobile (staff confirmando túmulo por túmulo andando no cemitério)</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="3d">
          <h2><span className="num">07</span>Modelo 3D — material pronto, sem visualizador ainda</h2>
          <p>
            O projeto do Metashape do São Pedro inclui um <strong>Tiled Model</strong> (9 níveis de
            detalhe, textura em 1,6cm) — muito melhor que o <code>.glb</code> de teste anterior, que
            era export do modelo &quot;resumido&quot; errado. Ainda não tem visualizador no site (MapLibre,
            a lib usada hoje, não lê 3D Tiles nativo) — trilho separado, não decidido ainda.
          </p>
          <div className="callout">
            <span className="mark">i</span>
            <div className="body">
              Pedido certo pro Rafael Rassi da próxima vez: exportar o <strong>Tiled Model</strong>
              (não o Model simples) em formato <strong>Cesium 3D Tiles</strong> — não precisa
              reprocessar o voo, só trocar a opção de export.
            </div>
          </div>
        </section>

        <section id="proximo">
          <h2><span className="num">08</span>Recomendação pro próximo cemitério</h2>
          <ol className="steps">
            <li><h3>Pedir a pirâmide de tiles já renderizada</h3><p>Mesmo formato do <code>Sao Pedro map.zip</code> (Export Tiled em EPSG:3857) — mais direto de processar e mais fácil de conferir antes de subir do que GeoPackage cru.</p></li>
            <li><h3>Mapear 1 quadra primeiro</h3><p>Medir o tempo real de endereçamento antes de comprometer o cemitério inteiro — São Pedro estimado em 10-15 mil túmulos.</p></li>
            <li><h3>Usar o fluxo manual, não o automático</h3><p>O reconhecimento automático (<code>mapear-cemiterio.py</code>) ainda tem 2 bugs conhecidos não corrigidos que pioram em fileiras coladas/apertadas.</p></li>
            <li><h3>Pedir o Tiled Model em Cesium 3D Tiles</h3><p>Se quiser manter a porta aberta pro visualizador 3D futuro, sem custo extra de voo.</p></li>
          </ol>
        </section>

        <footer>
          Detalhe técnico completo (arquitetura, bugs corrigidos, cada decisão de design) fica em
          <code> docs/mapa.md</code> — anexo vivo, atualizado a cada mudança real na tecnologia. Este
          relatório é o resumo executivo: só o que já foi feito e comprovado, sem hipótese.
        </footer>
      </div>
    </div>
  )
}
