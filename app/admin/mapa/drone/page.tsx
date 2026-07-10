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
        <h1>Mapeamento de cemitério por drone: guia técnico</h1>
        <p className="dek">
          Preparado pra decisão dos sócios (Pedro incluso) — como sair de &quot;temos a ideia&quot; pra
          &quot;cada túmulo tem uma coordenada confiável no banco&quot;. Cobre equipamento, apps de voo,
          processamento das fotos, e onde entra (e onde não entra) o que dá pra construir no sistema.
        </p>
        <div className="status-row">
          <span className="status-pill">Decisão em aberto — nada implementado ainda</span>
        </div>

        <nav className="toc">
          <span className="toc-label">Neste relatório</span>
          <ol>
            <li><a href="#hardware">1. Drone — qual usar</a></li>
            <li><a href="#apps">2. App de planejamento de voo</a></li>
            <li><a href="#gcp">3. Pontos de controle (GCP)</a></li>
            <li><a href="#software">4. Software que gera o mapa</a></li>
            <li><a href="#fluxo">5. Fluxo do início ao fim</a></li>
            <li><a href="#claude">6. O que o Claude Code faz e não faz</a></li>
            <li><a href="#custo">7. Estimativa de custo e esforço</a></li>
            <li><a href="#onde">8. Onde estudar cada parte</a></li>
          </ol>
        </nav>

        <section id="hardware">
          <h2><span className="num">01</span>Drone — qual usar</h2>
          <p>
            Não precisa de drone profissional de topografia pra começar. A diferença de precisão final
            vem mais do método (com ou sem ponto de controle no chão — seção 3) do que do modelo do drone.
          </p>
          <div className="chips">
            <span className="chip">DJI Mini 4 Pro</span>
            <span className="chip">DJI Air 3</span>
            <span className="chip">DJI Mavic 3 Enterprise (M3E)</span>
            <span className="chip">DJI D-RTK 2 (módulo GPS de precisão)</span>
          </div>
          <p>
            <strong>Mini 4 Pro / Air 3</strong> — suficiente pra gerar as fotos. GPS de bordo com erro de
            1-3m, corrigido depois com pontos de controle. <strong>Mavic 3 Enterprise</strong> — versão
            com módulo RTK embutido, já entrega coordenada de cada foto com poucos centímetros de erro
            sem precisar de tanto ponto de controle no chão.
          </p>
          <div className="callout">
            <span className="mark">i</span>
            <div className="body">
              Se o cemitério for pequeno (poucas quadras), um drone comum + alguns pontos de controle já
              resolve. Mavic com RTK só compensa se for mapear vários cemitérios com frequência.
            </div>
          </div>
        </section>

        <section id="apps">
          <h2><span className="num">02</span>App de planejamento de voo</h2>
          <p>
            É o app que desenha a grade de voo (tipo &quot;cortar grama&quot;) e faz o drone voar sozinho
            tirando foto automática com a sobreposição certa entre elas.
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>App</th><th>Onde roda</th><th>Observação</th></tr></thead>
              <tbody>
                <tr><td>DJI Pilot 2</td><td>Tablet/celular ligado ao controle</td><td>App oficial DJI. Drones mais novos já têm modo &quot;Mapping&quot;/&quot;Waypoint&quot; nativo.</td></tr>
                <tr><td>Pix4Dcapture</td><td>Tablet/celular</td><td>Gratuito, feito pra alimentar o Pix4D depois. Foco só em planejar o voo.</td></tr>
                <tr><td>DroneDeploy (app)</td><td>Tablet/celular</td><td>Planeja voo e já sobe as fotos pra nuvem da DroneDeploy processar.</td></tr>
                <tr><td>Litchi</td><td>Tablet/celular</td><td>3º terceiro, popular pra missão em grade, não depende de nenhum software específico depois.</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Configuração típica de missão: altura de voo (quanto mais baixo, mais detalhe e mais fotos),
            sobreposição frontal ~75-80%, sobreposição lateral ~60-65%. O app calcula o resto sozinho.
          </p>
        </section>

        <section id="gcp">
          <h2><span className="num">03</span>Pontos de controle no chão (GCP)</h2>
          <p>
            <strong>GCP</strong> (Ground Control Point) é um marco físico no chão — pode ser uma placa
            pintada, um alvo de fotogrametria, até uma cruz de fita — cuja coordenada real é medida com
            GPS de precisão <em>antes</em> do voo. O software depois usa esses pontos conhecidos pra
            corrigir o mapa final.
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Método</th><th>Precisão final</th><th>Custo/esforço</th></tr></thead>
              <tbody>
                <tr><td>Só GPS do drone, sem GCP</td><td>1 – 3 metros</td><td><span className="tag ok">Baixo</span></td></tr>
                <tr><td>Com 4-6 GCPs medidos</td><td>Poucos centímetros</td><td><span className="tag mid">Médio</span> — precisa medir os pontos antes do voo</td></tr>
                <tr><td>Drone com RTK embutido (Mavic 3E)</td><td>Poucos centímetros</td><td><span className="tag mid">Médio</span> — equipamento mais caro, sem trabalho extra no campo</td></tr>
              </tbody>
            </table>
          </div>
          <div className="callout warn">
            <span className="mark">!</span>
            <div className="body">
              Túmulo costuma ficar a ~1 metro do vizinho. Sem GCP nem RTK, o erro de 1-3m do GPS comum
              não é suficiente pra saber com certeza qual túmulo é qual — GCP deixa de ser opcional
              nesse caso.
            </div>
          </div>
        </section>

        <section id="software">
          <h2><span className="num">04</span>Software que transforma as fotos em mapa</h2>
          <p>
            Esse software junta as centenas de fotos do drone num <strong>ortomosaico</strong> — uma
            imagem única, vista de cima, sem distorção de ângulo, com cada pixel amarrado numa
            coordenada real.
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Software</th><th>Tipo</th><th>Facilidade</th><th>Custo</th></tr></thead>
              <tbody>
                <tr><td>DroneDeploy</td><td>Nuvem</td><td><span className="tag ok">Fácil</span> — sobe foto, processa sozinho</td><td>Assinatura</td></tr>
                <tr><td>Pix4Dcloud / Pix4Dmapper</td><td>Nuvem ou desktop</td><td><span className="tag mid">Médio</span> — mais opções técnicas de ajuste</td><td>Assinatura ou licença</td></tr>
                <tr><td>WebODM</td><td>Self-hosted (aberto)</td><td><span className="tag hard">Técnico</span> — precisa instalar/rodar num servidor</td><td>Gratuito (paga só o servidor/processamento)</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Saída de qualquer um deles: um arquivo de imagem georreferenciada (geralmente
            <code>GeoTIFF</code>) — é esse arquivo que entra no sistema como camada do mapa.
          </p>
        </section>

        <section id="fluxo">
          <h2><span className="num">05</span>Fluxo do início ao fim</h2>
          <ol className="steps">
            <li><h3>Medir os pontos de controle (GCP)</h3><p>Marcar 4-6 pontos físicos espalhados pelo cemitério, medir a coordenada real de cada um com GPS de precisão. (Pular essa etapa só se usar drone com RTK embutido.)</p></li>
            <li><h3>Voar o drone</h3><p>App de planejamento (Pilot 2 / Pix4Dcapture / DroneDeploy / Litchi) desenha a grade sobre a área do cemitério e o drone voa sozinho tirando as fotos.</p></li>
            <li><h3>Processar as fotos</h3><p>Sobe as fotos + as coordenadas dos GCPs no software (DroneDeploy, Pix4D ou WebODM), que devolve o ortomosaico georreferenciado.</p></li>
            <li><h3>Importar o ortomosaico no sistema</h3><p>O arquivo georreferenciado entra como camada de imagem no mapa do admin — aqui é onde o Claude Code constrói.</p></li>
            <li><h3>Marcar cada túmulo</h3><p>Equipe abre o mapa no admin, vê a imagem aérea real (nítida o bastante pra distinguir cada túmulo) e clica em cada um pra salvar a coordenada — mesmo padrão de clique já usado em <code>/admin/cemiterios</code> pra marcar o cemitério inteiro.</p></li>
          </ol>
        </section>

        <section id="claude">
          <h2><span className="num">06</span>O que o Claude Code faz e não faz</h2>
          <div className="boundary">
            <div className="col can">
              <h4>Dá pra construir</h4>
              <ul>
                <li>Upload do ortomosaico (GeoTIFF/imagem) pro sistema</li>
                <li>Exibir a imagem como camada no mapa do admin, na posição georreferenciada certa</li>
                <li>Tela de clique-pra-marcar cada túmulo, salvando lat/lng no banco (jazigo/gaveta)</li>
                <li>Editar/mover marcações depois de criadas</li>
              </ul>
            </div>
            <div className="col cannot">
              <h4>Fica de fora</h4>
              <ul>
                <li>Pilotar o drone ou comprar/configurar o equipamento</li>
                <li>Medir os pontos de controle (GCP) no chão</li>
                <li>Rodar o processamento fotogramétrico (DroneDeploy/Pix4D/WebODM)</li>
              </ul>
            </div>
          </div>
          <p>
            Ou seja: a parte física/operacional (voar, medir, processar) é serviço externo — drone
            próprio, operador contratado, ou parceria. O Claude Code entra depois que o ortomosaico já
            existe, construindo a ferramenta de marcação dentro do admin.
          </p>
        </section>

        <section id="custo">
          <h2><span className="num">07</span>Estimativa de custo e esforço</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Esforço</th><th>Observação</th></tr></thead>
              <tbody>
                <tr><td>Drone (comprar ou já ter)</td><td><span className="tag ok">Único</span></td><td>Mini/Air já resolve; RTK só se for recorrente em vários cemitérios</td></tr>
                <tr><td>Operador de drone</td><td><span className="tag mid">Por voo</span></td><td>Rafael/Pedro pilotando ou serviço terceirizado</td></tr>
                <tr><td>Medição de GCP</td><td><span className="tag mid">Por cemitério</span></td><td>GPS de precisão avulso ou serviço de topografia</td></tr>
                <tr><td>Processamento (software)</td><td><span className="tag ok">Por projeto</span></td><td>WebODM grátis (self-host) ou assinatura DroneDeploy/Pix4D</td></tr>
                <tr><td>Ferramenta de marcação no admin</td><td><span className="tag ok">Único</span></td><td>Construído uma vez, reaproveitado pra todos os cemitérios depois</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="onde">
          <h2><span className="num">08</span>Onde estudar cada parte</h2>
          <p>
            Sem links prontos aqui de propósito — pra não indicar endereço desatualizado ou errado.
            Busca pelo nome oficial de cada item direto no site do fabricante/produto:
          </p>
          <div className="chips">
            <span className="chip">DJI Pilot 2 — doc oficial DJI</span>
            <span className="chip">Pix4Dcapture / Pix4Dcloud</span>
            <span className="chip">DroneDeploy</span>
            <span className="chip">WebODM (OpenDroneMap)</span>
            <span className="chip">Litchi</span>
            <span className="chip">DJI D-RTK 2</span>
          </div>
          <p>
            Termos de busca que ajudam: <em>&quot;drone mapping ground control points tutorial&quot;</em>,{' '}
            <em>&quot;photogrammetry overlap settings&quot;</em>, <em>&quot;WebODM GCP file format&quot;</em>.
          </p>
        </section>

        <footer>
          Relatório preparado pra decisão dos sócios — nada aqui foi implementado ainda. Fase 5 do
          roadmap (Geolocalização avançada, mapeamento cemiterial).
        </footer>
      </div>
    </div>
  )
}
