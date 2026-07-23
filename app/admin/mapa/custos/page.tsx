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

.thesis{
  display:grid; grid-template-columns:auto 1fr; gap:1.4rem; align-items:center;
  border:1px solid #D4D9DC; background:#F7F8F9; border-radius:10px;
  padding:1.3rem 1.5rem; margin-bottom:1.2rem;
}
.thesis-num{
  font-family:"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif;
  font-size:2.2rem; font-weight:700; color:#7A5F2F; white-space:nowrap;
  font-variant-numeric:tabular-nums;
}
.thesis-text{font-size:0.92rem; color:#4B5A64;}
@media (max-width:600px){.thesis{grid-template-columns:1fr;}}

.chips{display:flex; flex-wrap:wrap; gap:0.5rem; margin:0.9rem 0 2rem;}
.chip{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:0.82rem; padding:0.3rem 0.65rem; border-radius:7px;
  background:#E4EBEF; color:#3B5568; border:1px solid #D4D9DC;
}

.doc section{margin-bottom:2.5rem; scroll-margin-top:1.5rem;}
.doc h2{
  font-family:"Iowan Old Style","Palatino Linotype","Book Antiqua",Georgia,serif;
  font-weight:500; font-size:1.4rem; margin:0 0 1rem; padding-bottom:0.6rem;
  border-bottom:1px solid #D4D9DC; color:#16222B;
}
.doc p{margin:0 0 0.9rem; max-width:70ch;}
.doc strong{color:#16222B; font-weight:700;}
.doc code{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  background:#E4EBEF; color:#3B5568; padding:0.1rem 0.4rem; border-radius:5px; font-size:0.86em;
}

.arch{display:grid; grid-template-columns:1fr auto 1fr; gap:1rem; align-items:stretch; margin:1rem 0;}
@media (max-width:600px){.arch{grid-template-columns:1fr;}}
.arch .box{border:1px solid #D4D9DC; background:#F7F8F9; border-radius:10px; padding:1rem 1.2rem;}
.arch .box h4{margin:0 0 0.4rem; font-size:0.82rem; letter-spacing:0.04em; color:#7A5F2F;}
.arch .box p{margin:0; font-size:0.86rem; color:#4B5A64;}
.arch .arrow{display:flex; align-items:center; justify-content:center; font-size:0.8rem; color:#8895A0; text-align:center;}

.table-wrap{overflow-x:auto; border:1px solid #D4D9DC; border-radius:10px; margin:1rem 0;}
.doc table{width:100%; border-collapse:collapse; font-size:0.88rem; min-width:520px;}
.doc thead th{
  text-align:left; padding:0.65rem 0.9rem; background:#F7F8F9;
  font-size:0.72rem; letter-spacing:0.06em; text-transform:uppercase; color:#8895A0;
  border-bottom:1px solid #D4D9DC; font-weight:700;
}
.doc thead th.num, .doc tbody td.num{text-align:right;}
.doc tbody td{padding:0.7rem 0.9rem; border-bottom:1px solid #D4D9DC; vertical-align:top; font-variant-numeric:tabular-nums;}
.doc tbody tr:last-child td{border-bottom:none;}
.doc tbody td:first-child{font-weight:600; white-space:nowrap; font-variant-numeric:tabular-nums;}
.tag{
  display:inline-block; font-size:0.74rem; font-weight:700; padding:0.15rem 0.55rem; border-radius:999px;
}
.tag.ok{background:#E4F0E8; color:#2F6B4F; border:1px solid #BBD9C7;}
.tag.mid{background:#FBF0DA; color:#8A6416; border:1px solid #EBD09C;}
.tag.hard{background:#F7E4E0; color:#8A3A2E; border:1px solid #E7BBB1;}

.callout{
  display:flex; gap:0.9rem; border:1px solid #D4D9DC; background:#F7F8F9;
  border-radius:10px; padding:1.1rem 1.3rem; margin:1.2rem 0;
}
.callout .mark{
  flex:none; width:1.9rem; height:1.9rem; border-radius:7px; display:flex; align-items:center; justify-content:center;
  font-size:0.95rem; font-weight:700; background:#F3ECDD; color:#7A5F2F;
}
.callout.ok{background:#E4F0E8; border-color:#BBD9C7;}
.callout.ok .mark{background:#D2E7DA; color:#2F6B4F;}
.callout .body{flex:1; font-size:0.94rem;}

.recommend-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:0.8rem; margin-top:1rem;}
.recommend-item{border:1px solid #BBD9C7; background:#E4F0E8; border-radius:8px; padding:0.8rem 1rem;}
.recommend-item .label{font-size:0.7rem; color:#4B6E5A; text-transform:uppercase; letter-spacing:0.05em;}
.recommend-item .value{font-family:"Iowan Old Style","Palatino Linotype",Georgia,serif; font-size:1.25rem; font-weight:700; color:#16222B; margin-top:0.15rem;}
.recommend-item .sub{font-size:0.72rem; color:#4B6E5A; margin-top:0.15rem;}

.doc footer{border-top:1px solid #D4D9DC; margin-top:2rem; padding-top:1.5rem; font-size:0.82rem; color:#8895A0;}
.doc footer a{color:#7A5F2F;}
.back-link{color:#4B5A64; font-size:0.85rem; text-decoration:none; display:inline-block; margin-bottom:1rem;}
.back-link:hover{color:#16222B;}
`

export default function RelatorioCustoEscala() {
  return (
    <div className="doc">
      <style>{css}</style>
      <div className="doc-shell">
        <Link href="/admin/mapa" className="back-link">← Voltar pro Mapa</Link>

        <span className="kicker">Legado Digital · Infraestrutura — pra Rafael, Pedro e Ricardo</span>
        <h1>Quanto custa escalar armazenamento de mídia</h1>
        <p className="dek">
          Cada memorial guarda até <strong>10 fotos + 4 vídeos</strong>. Preço real pesquisado
          em julho de 2026 (Supabase Pro + Vercel Pro), projeção de custo até 100 mil
          memoriais ativos.
        </p>
        <div className="status-row">
          <span className="status-pill">Quota proposta: 500MB/memorial — aguardando decisão de implementar</span>
        </div>

        <div className="thesis">
          <div className="thesis-num">$3.930<span style={{ fontSize: '0.95rem', color: '#4B5A64', fontWeight: 400 }}>/mês</span></div>
          <div className="thesis-text">
            Custo total (armazenamento + banda de visita estimada) pra <strong>100.000 memoriais
            ativos</strong>, cada um com os 10 fotos + 4 vídeos cheios. Trivial pra uma base
            pagante desse tamanho num modelo B2B2C com taxa anual por parceiro.
          </div>
        </div>

        <div className="chips">
          <span className="chip">10 fotos × 8MB = 80MB</span>
          <span className="chip">4 vídeos × 100MB = 400MB</span>
          <span className="chip">Total por memorial: 480MB → quota 500MB</span>
        </div>

        <section id="onde">
          <h2>Onde mora cada custo</h2>
          <p>
            Foto e vídeo são servidos direto do bucket do Supabase Storage
            (<code>&lt;img src&gt;</code> / <code>&lt;video src&gt;</code> apontando pra URL
            do Supabase, confirmado em <code>app/homenagem/[slug]/page.tsx</code>). O Vercel
            nunca toca o arquivo — só entrega a página (HTML/JS) e busca o texto no banco.
            Por isso a conta de mídia é inteira do Supabase.
          </p>
          <div className="arch">
            <div className="box">
              <h4>SUPABASE</h4>
              <p>Banco de dados (nome, biografia, texto) + Storage (os 10 fotos + 4 vídeos em si). Toda mídia é servida daqui, direto pro navegador de quem visita.</p>
            </div>
            <div className="arrow">busca dado e<br />link do arquivo →</div>
            <div className="box">
              <h4>VERCEL</h4>
              <p>Só roda o código do site (Next.js). Manda a página com o link da foto — não guarda nem transporta o arquivo pesado.</p>
            </div>
          </div>
        </section>

        <section id="preco">
          <h2>Preço real — Supabase Pro vs Vercel Pro</h2>
          <p>Pesquisado em julho de 2026. Fontes ao final da página.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Plano</th><th className="num">Base</th><th>Incluído</th><th>Excedente</th></tr>
              </thead>
              <tbody>
                <tr><td>Supabase Pro — armazenamento</td><td className="num">$25/mês</td><td>100GB storage</td><td>$0,021/GB extra</td></tr>
                <tr><td>Supabase Pro — banda (egress)</td><td className="num">incluso acima</td><td>250GB/mês</td><td>$0,09/GB extra</td></tr>
                <tr><td>Vercel Pro — banda de página</td><td className="num">$20/assento/mês</td><td>1TB/mês</td><td>~$0,40/GB extra*</td></tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#8895A0' }}>
            * varia por região, entre $0,15–$0,35/GB em alguns cálculos — Vercel não é o
            gargalo aqui porque mídia não passa por ele.
          </p>
        </section>

        <section id="storage">
          <h2>Custo de armazenamento por escala</h2>
          <p>
            Supabase Pro ($25 base + $0,021/GB acima de 100GB), com cada memorial guardando
            os 10 fotos + 4 vídeos completos (480MB usado dos 500MB de quota). Escala
            pensada pro crescimento real do negócio.
          </p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Memoriais ativos</th><th className="num">Armazenamento total</th><th className="num">Custo mensal</th></tr></thead>
              <tbody>
                <tr><td>1.000</td><td className="num">480GB</td><td className="num"><span className="tag ok">$33,40</span></td></tr>
                <tr><td>10.000</td><td className="num">4.800GB (4,8TB)</td><td className="num"><span className="tag mid">$127,90</span></td></tr>
                <tr><td>50.000</td><td className="num">24.000GB (24TB)</td><td className="num"><span className="tag mid">$547,90</span></td></tr>
                <tr><td>100.000</td><td className="num">48.000GB (48TB)</td><td className="num"><span className="tag hard">$1.072,90</span></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="banda">
          <h2>O custo que cresce rápido: banda de visita (egress)</h2>
          <p>
            Armazenamento parado é barato. O que pesa é gente <strong>visitando</strong> o
            memorial — cada visita carrega foto/vídeo de novo.
          </p>
          <div className="callout">
            <span className="mark">i</span>
            <div className="body">
              <strong>Banda mensal = memoriais ativos × visitas médias/mês × dado médio por visita.</strong>
              Estimativa de trabalho (ajustável, não é fato — ninguém tem esse dado ainda):
              20 visitas/mês por memorial, ~16MB por visita (foto principal + miniaturas +
              20% das visitas assistindo trecho de 1 dos 4 vídeos).
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Memoriais ativos</th><th className="num">Banda estimada/mês</th><th className="num">Custo extra</th></tr></thead>
              <tbody>
                <tr><td>1.000</td><td className="num">320GB</td><td className="num"><span className="tag ok">$6,30</span></td></tr>
                <tr><td>10.000</td><td className="num">3.200GB</td><td className="num"><span className="tag mid">$265,50</span></td></tr>
                <tr><td>50.000</td><td className="num">16.000GB</td><td className="num"><span className="tag hard">$1.417,50</span></td></tr>
                <tr><td>100.000</td><td className="num">32.000GB</td><td className="num"><span className="tag hard">$2.857,50</span></td></tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#8895A0' }}>
            Vercel, no mesmo cenário (página ~0,3MB, sem mídia): mesmo em 100.000 memoriais
            × 20 visitas × 0,3MB = 600GB/mês — ainda dentro de 1TB incluso do Pro. Vercel
            não estoura em nenhum desses degraus.
          </p>
        </section>

        <section id="total">
          <h2>Total combinado — armazenamento + banda</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Memoriais ativos</th><th className="num">Armazenamento</th><th className="num">Banda extra</th><th className="num">Total/mês</th></tr></thead>
              <tbody>
                <tr><td>1.000</td><td className="num">$33,40</td><td className="num">$6,30</td><td className="num"><span className="tag ok">$39,70</span></td></tr>
                <tr><td>10.000</td><td className="num">$127,90</td><td className="num">$265,50</td><td className="num"><span className="tag mid">$393,40</span></td></tr>
                <tr><td>50.000</td><td className="num">$547,90</td><td className="num">$1.417,50</td><td className="num"><span className="tag mid">$1.965,40</span></td></tr>
                <tr><td>100.000</td><td className="num">$1.072,90</td><td className="num">$2.857,50</td><td className="num"><span className="tag hard">$3.930,40</span></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="recomendacao">
          <h2>Recomendação</h2>
          <div className="callout ok">
            <span className="mark">✓</span>
            <div className="body">
              <strong>Quota de 500MB por memorial cobre os 10 fotos + 4 vídeos com folga.</strong>{' '}
              480MB usado dos 500MB — 20MB de margem pra variação de tamanho real do arquivo.
              Banda de visita é o item que precisa de monitoramento real assim que o produto
              tiver tráfego — a premissa de 20 visitas/mês é chute educado, não dado medido.
              <div className="recommend-grid">
                <div className="recommend-item">
                  <div className="label">Foto (cada)</div>
                  <div className="value">8MB</div>
                  <div className="sub">10 fotos = 80MB</div>
                </div>
                <div className="recommend-item">
                  <div className="label">Vídeo (cada)</div>
                  <div className="value">100MB</div>
                  <div className="sub">4 vídeos = 400MB</div>
                </div>
                <div className="recommend-item">
                  <div className="label">Total/memorial</div>
                  <div className="value">500MB</div>
                  <div className="sub">480MB usado, 20MB folga</div>
                </div>
                <div className="recommend-item">
                  <div className="label">Custo em 100k memoriais</div>
                  <div className="value">$3.930/mês</div>
                  <div className="sub">storage + banda estimada</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer>
          <p>
            Fontes (pesquisa web, julho 2026):{' '}
            <a href="https://schematichq.com/blog/supabase-pricing" target="_blank" rel="noopener noreferrer">Supabase Pricing Explained</a>{' · '}
            <a href="https://makerkit.dev/blog/saas/supabase-pricing" target="_blank" rel="noopener noreferrer">Supabase Pricing 2026</a>{' · '}
            <a href="https://comparedge.com/tools/vercel/pricing" target="_blank" rel="noopener noreferrer">Vercel Pricing 2026</a>{' · '}
            <a href="https://temps.sh/blog/vercel-pricing-2026-pro-plan-explained" target="_blank" rel="noopener noreferrer">Vercel Pro Plan Breakdown</a>
          </p>
          <p style={{ marginTop: '0.6rem' }}>
            Cálculo de armazenamento é determinístico (preço público). Cálculo de banda/egress
            usa premissa de tráfego assumida — ajustar quando houver dado real de visitas.
            Nenhum valor de fatura real da conta foi consultado, só tabela de preço pública.
          </p>
        </footer>
      </div>
    </div>
  )
}
