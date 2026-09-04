'use client'

/**
 * Landing "O Fio da Vida".
 *
 * A marcação e o CSS vieram do protótipo HTML validado
 * (Desktop\Cerebro Claude - Legado Digital\prototipo-fio-da-vida) e entram aqui
 * byte a byte de propósito: o efeito depende de detalhes calibrados na mão
 * (chama por sprite, blend no div e não no canvas, orbe seguindo a altura do
 * scroll). Converter pra JSX atributo por atributo arriscaria quebrar isso sem
 * ninguém perceber, então a marcação é injetada e o script roda intacto a
 * partir de /fio-da-vida/anima.js.
 *
 * A landing anterior está preservada em app/page_fio_antiga.tsx.
 */

import Script from 'next/script'
import LegadoBotPublicoWidget from '@/components/LegadoBotPublicoWidget'
import './fio-da-vida.css'

const MARCACAO = `<nav class="navbar">
  <div class="inner">
    <a href="/" class="logo-link" aria-label="Legado Digital - Home"><img class="logo-sm" src="/logo-legado-digital.svg" alt="Legado Digital" /></a>
    <div class="links">
      <a href="#beneficios">Benefícios</a>
      <a href="#como-funciona">Como Funciona</a>
      <a href="#faq">FAQ</a>
      <a href="/cemiterios">Cemitérios</a>
    </div>
    <div class="area-restrita">
      <button class="cta" type="button" id="btnArea" aria-expanded="false">Área Restrita
        <svg class="chev-area" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="menu-area" id="menuArea">
        <a href="/admin/login">Legado Central</a>
        <a href="/parceiro/login">Portal do Parceiro</a>
        <a href="/familia/login">Portal da Família</a>
      </div>
    </div>
  </div>
</nav>

<div class="hero-zone">
  <div class="mega-backdrop"></div>
  <header class="intro">
    <div class="portal-bg"></div>
    <div class="portal-veu"></div>
    <div class="beam"></div>
    <div class="beam-linger"></div>
    <div class="glow"></div>
    <h1><span class="word" style="animation-delay:1.45s">Toda</span> <span class="word" style="animation-delay:1.55s">Família</span><br><em><span class="word" style="animation-delay:1.68s">Tem</span> <span class="word" style="animation-delay:1.76s">Uma</span> <span class="word" style="animation-delay:1.86s">História</span></em></h1>
    <p class="sub">Legado Digital é o memorial digital que sua funerária oferece à família: uma página com fotos, vídeos e histórias reais, acessada por QR Code na lápide. Cada memorial é um ponto de luz — sozinho no começo, depois interligado a todos os outros, numa constelação viva.</p>
    <div class="dica-rolar" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
    </div>
  </header>
</div>

<div class="side-glow">
  <div class="blob" style="left:4%;  top:14%; width:210px; height:210px; --sd:15s; --sx:22px;  --sy:-24px; background-image:url('/fio-da-vida/bolha-teia.png');"></div>
  <div class="blob" style="right:4%; top:42%; width:230px; height:230px; --sd:18s; --sx:-20px; --sy:26px;  background-image:url('/fio-da-vida/bolha-velas.png');"></div>
  <div class="blob" style="left:3%;  top:70%; width:200px; height:200px; --sd:13s; --sx:24px;  --sy:22px;  background-image:url('/fio-da-vida/bolha-celular.png');"></div>

  <div class="petal l" style="top:2%;  --pin:80px;  --pf:14s; --pdelay:0s;   --pdx:60px;"></div>
  <div class="petal l" style="top:7%;  --pin:230px; --pf:15.2s; --pdelay:10s; --pdx:-35px;"></div>
  <div class="petal l" style="top:9%;  --pin:180px; --pf:16s; --pdelay:4s;   --pdx:-50px;"></div>
  <div class="petal l" style="top:14%; --pin:95px;  --pf:13.8s; --pdelay:11s; --pdx:40px;"></div>
  <div class="petal l" style="top:18%; --pin:280px; --pf:13s; --pdelay:1s;   --pdx:60px;"></div>
  <div class="petal l" style="top:23%; --pin:150px; --pf:16.8s; --pdelay:12s; --pdx:-45px;"></div>
  <div class="petal l" style="top:27%; --pin:120px; --pf:17s; --pdelay:6s;   --pdx:-40px;"></div>
  <div class="petal l" style="top:32%; --pin:260px; --pf:14.2s; --pdelay:0.5s; --pdx:50px;"></div>
  <div class="petal l" style="top:36%; --pin:220px; --pf:14.5s; --pdelay:3s; --pdx:55px;"></div>
  <div class="petal l" style="top:41%; --pin:105px; --pf:15.8s; --pdelay:7.5s; --pdx:-40px;"></div>
  <div class="petal l" style="top:46%; --pin:320px; --pf:15.5s; --pdelay:8s; --pdx:-60px;"></div>
  <div class="petal l" style="top:51%; --pin:190px; --pf:13.2s; --pdelay:2.5s; --pdx:45px;"></div>
  <div class="petal l" style="top:55%; --pin:100px; --pf:13.5s; --pdelay:2s; --pdx:45px;"></div>
  <div class="petal l" style="top:60%; --pin:270px; --pf:16.2s; --pdelay:9.5s; --pdx:-55px;"></div>
  <div class="petal l" style="top:64%; --pin:200px; --pf:16.5s; --pdelay:5s; --pdx:-55px;"></div>
  <div class="petal l" style="top:69%; --pin:130px; --pf:14.8s; --pdelay:1.5s; --pdx:35px;"></div>
  <div class="petal l" style="top:73%; --pin:300px; --pf:14s;   --pdelay:9s; --pdx:60px;"></div>
  <div class="petal l" style="top:78%; --pin:170px; --pf:15.4s; --pdelay:6.5s; --pdx:-50px;"></div>
  <div class="petal l" style="top:82%; --pin:150px; --pf:15s;   --pdelay:1s; --pdx:-45px;"></div>
  <div class="petal l" style="top:87%; --pin:240px; --pf:13.6s; --pdelay:4.5s; --pdx:40px;"></div>
  <div class="petal l" style="top:91%; --pin:250px; --pf:16s;   --pdelay:6s; --pdx:50px;"></div>

  <div class="petal r" style="top:5%;  --pin:80px;  --pf:15s; --pdelay:2s;  --pdx:-65px;"></div>
  <div class="petal r" style="top:10%; --pin:250px; --pf:14.4s; --pdelay:11s; --pdx:40px;"></div>
  <div class="petal r" style="top:14%; --pin:200px; --pf:14s; --pdelay:7s;  --pdx:55px;"></div>
  <div class="petal r" style="top:19%; --pin:100px; --pf:16.4s; --pdelay:0.5s; --pdx:-40px;"></div>
  <div class="petal r" style="top:23%; --pin:120px; --pf:16.5s; --pdelay:0s;--pdx:-50px;"></div>
  <div class="petal r" style="top:28%; --pin:280px; --pf:13.4s; --pdelay:8.5s; --pdx:45px;"></div>
  <div class="petal r" style="top:32%; --pin:300px; --pf:13.5s; --pdelay:4s;--pdx:45px;"></div>
  <div class="petal r" style="top:37%; --pin:150px; --pf:15.6s; --pdelay:2.5s; --pdx:-35px;"></div>
  <div class="petal r" style="top:41%; --pin:160px; --pf:15.5s; --pdelay:9s;--pdx:-60px;"></div>
  <div class="petal r" style="top:46%; --pin:220px; --pf:14.6s; --pdelay:6.5s; --pdx:50px;"></div>
  <div class="petal r" style="top:50%; --pin:260px; --pf:14.5s; --pdelay:3s;--pdx:50px;"></div>
  <div class="petal r" style="top:55%; --pin:95px;  --pf:16.6s; --pdelay:10.5s; --pdx:-40px;"></div>
  <div class="petal r" style="top:59%; --pin:100px; --pf:16s;   --pdelay:6s;--pdx:-45px;"></div>
  <div class="petal r" style="top:64%; --pin:310px; --pf:13.8s; --pdelay:1.5s; --pdx:55px;"></div>
  <div class="petal r" style="top:68%; --pin:220px; --pf:13.5s; --pdelay:1s;--pdx:55px;"></div>
  <div class="petal r" style="top:73%; --pin:170px; --pf:15.2s; --pdelay:5.5s; --pdx:-45px;"></div>
  <div class="petal r" style="top:77%; --pin:320px; --pf:15s;   --pdelay:8s;--pdx:-50px;"></div>
  <div class="petal r" style="top:82%; --pin:130px; --pf:14.2s; --pdelay:3.5s; --pdx:40px;"></div>
  <div class="petal r" style="top:86%; --pin:140px; --pf:14.5s; --pdelay:5s;--pdx:60px;"></div>
  <div class="petal r" style="top:91%; --pin:240px; --pf:16.2s; --pdelay:7.5s; --pdx:-40px;"></div>
  <div class="petal r" style="top:95%; --pin:240px; --pf:16s;   --pdelay:2s;--pdx:-40px;"></div>

<section class="thread-stage" id="stage">
  <canvas id="constCanvas" width="800" height="3760"></canvas>
  <canvas id="meshCanvas" width="800" height="3760"></canvas>

  <svg viewBox="0 0 800 3900" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <mask id="threadMask" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="3760">
        <rect x="0" y="0" width="800" height="3760" fill="#fff" />
        <g id="maskHoles"></g>
      </mask>
      <linearGradient id="threadGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#dfc08a" />
        <stop offset="50%" stop-color="#C9A46A" />
        <stop offset="100%" stop-color="#a8834a" />
      </linearGradient>
    </defs>
    <g id="fiosDNA" mask="url(#threadMask)"></g>
    <path class="thread-main" id="threadPath" d="" mask="url(#threadMask)" />
    <path class="thread-stub" id="stub1" mask="url(#threadMask)" d="M400,1440 C 470,1470 540,1500 556,1520" />
    <path class="thread-stub" id="stub2" mask="url(#threadMask)" d="M400,3220 C 330,3245 260,3265 244,3280" />
  </svg>

  <div class="tip" id="tip" style="opacity:0;"></div>

  <div class="node dot"   data-x="460" data-y="150"  data-t="0.06"></div>

  <div class="node photo" data-x="330" data-y="300" data-t="0.092">
    <div class="ring"><img src="/fio-da-vida/nodes/mapa-rota-1.png" class="node-img node-img-a" style="--reveza-atraso:0.0s" alt="Mapa aéreo do cemitério com o memorial marcado e a rota até o túmulo" /><img src="/fio-da-vida/nodes/mapa-rota-2.png" class="node-img node-img-b" style="--reveza-atraso:0.0s" alt="Mapa aéreo do cemitério com o memorial marcado e a rota até o túmulo" /></div>
    <div class="cap side-right"><b>O caminho até lá</b>Nosso mapa localiza o memorial no cemitério e traça a rota por GPS, direto do celular, até o túmulo exato.<a href="/cemiterios" class="cap-link">Ver o mapa dos cemitérios →</a></div>
  </div>

  <div class="node dot"   data-x="520" data-y="780"  data-t="0.19"></div>

    <div id="beneficios" class="node info texto" data-x="400" data-y="655" data-t="0.166">
      <div class="tit"><span class="grad">Diferenciais</span> que Transformam</div>
      <div class="linha"><b>QR Code na Placa</b><span>Um QR Code único e discreto instalado na placa memorial. Qualquer visitante escaneia e acessa a homenagem.</span></div>
      <div class="linha"><b>Privacidade Total</b><span>A família controla quem acessa: público, privado ou com senha. O respeito ao falecido é prioridade.</span></div>
      <div class="linha"><b>Memorial Elegante</b><span>Design moderno com fotos, vídeos, biografia e linha do tempo. Uma verdadeira homenagem digital.</span></div>
    </div>

    <div class="node info texto" data-x="400" data-y="1585" data-t="0.359">
      <div class="tit"><span class="grad">Diferenciais</span> que Transformam</div>
      <div class="linha"><b>Livro de Condolências</b><span>Visitantes deixam mensagens de carinho. A família pode ver e moderar cada homenagem.</span></div>
      <div class="linha"><b>Família Participa</b><span>Parentes recebem acesso para editar, adicionar fotos e personalizar o memorial do ente querido.</span></div>
      <div class="linha"><b>Gestão Completa</b><span>Dashboard para funerária gerenciar todos os memoriais em um só lugar. Simples e intuitivo.</span></div>
    </div>

    <div id="como-funciona" class="node info texto" data-x="400" data-y="2515" data-t="0.552">
      <div class="tit">Como <span class="grad">Funciona</span></div>
      <div class="linha"><b>01 Funerária Cadastra</b><span>Cadastre o falecido na plataforma em 2 minutos.</span></div>
      <div class="linha"><b>02 Família Personaliza</b><span>Parentes recebem acesso e montam o memorial.</span></div>
      <div class="linha"><b>03 QR Code Gerado</b><span>QR Code único é gerado e instalado na placa.</span></div>
      <div class="linha"><b>04 Homenagens Chegam</b><span>Visitantes escaneiam e deixam condolências.</span></div>
    </div>



  <div class="node photo" data-x="340" data-y="1387" data-t="0.318">
    <div class="ring"><img src="/fio-da-vida/nodes/encontro-diario-1.png" class="node-img node-img-a" style="--reveza-atraso:0.8s" alt="Senhora vendo o memorial no tablet, luz da tarde" /><img src="/fio-da-vida/nodes/encontro-diario-2.png" class="node-img node-img-b" style="--reveza-atraso:0.8s" alt="Senhora vendo o memorial no tablet, luz da tarde" /></div>
    <div class="cap side-right"><b>Um encontro de todo dia</b>Ela abre o memorial e passa um tempo com ele. Nem sempre precisa de motivo.</div>
  </div>

  <div class="node dot" data-x="560" data-y="1780" data-t="0.399"></div>

  <div class="node photo" data-x="320" data-y="2473" data-t="0.543">
    <div class="ring"><img src="/fio-da-vida/nodes/constelacao-1.png" class="node-img node-img-a" style="--reveza-atraso:1.6s" alt="Retratos e velas formando uma constelação" /><img src="/fio-da-vida/nodes/constelacao-2.png" class="node-img node-img-b" style="--reveza-atraso:1.6s" alt="Retratos e velas formando uma constelação" /></div>
    <div class="cap side-right"><b>Ninguém se apaga</b>Cada memorial acende um ponto de luz que a família mantém aceso.</div>
  </div>

  <div class="node dot" data-x="500" data-y="2420" data-t="0.532"></div>

  <div class="node dot" data-x="300" data-y="2620" data-t="0.574"></div>

  <div class="node photo" data-x="480" data-y="3559" data-t="0.769">
    <div class="ring"><img src="/fio-da-vida/nodes/de-onde-estiver-1.png" class="node-img node-img-a node-4fotos" style="--reveza-atraso:2.4s" alt="Mão segurando o celular com o memorial aberto" /><img src="/fio-da-vida/nodes/de-onde-estiver-2.png" class="node-img node-img-b" style="--reveza-atraso:2.4s" alt="Mão segurando o celular com o memorial aberto" /><img src="/fio-da-vida/nodes/de-onde-estiver-3.png" class="node-img node-img-c" style="--reveza-atraso:2.4s" alt="Mão segurando o celular com o memorial aberto" /><img src="/fio-da-vida/nodes/de-onde-estiver-4.png" class="node-img node-img-d" style="--reveza-atraso:2.4s" alt="Mão segurando o celular com o memorial aberto" /></div>
    <div class="cap side-left"><b>De onde você estiver</b>O neto que mora longe também tem para onde voltar.</div>
  </div>

  <div class="node dot" data-x="400" data-y="3559" data-t="0.769"></div>

</section>
</div>

<section class="faq" id="faq">
  <div class="head">
    <h2>Perguntas <span class="grad">Frequentes</span></h2>
  </div>
  <div class="body">
    <div class="list">
      <details class="item" open>
        <summary>Como minha funerária começa a usar?<span class="chev">▼</span></summary>
        <p class="ans">Basta criar uma conta, escolher um plano e começar a cadastrar os memoriais. Em menos de 5 minutos você já pode gerar o primeiro QR Code.</p>
      </details>
      <details class="item">
        <summary>A família precisa pagar algo?<span class="chev">▼</span></summary>
        <p class="ans">Não. O memorial digital é um serviço oferecido pela funerária. A família só precisa personalizar o conteúdo.</p>
      </details>
      <details class="item">
        <summary>O QR Code é único para cada falecido?<span class="chev">▼</span></summary>
        <p class="ans">Sim. Cada memorial gera um QR Code exclusivo que leva diretamente à página de homenagem daquele ente querido.</p>
      </details>
      <details class="item">
        <summary>Como funciona a privacidade com senha?<span class="chev">▼</span></summary>
        <p class="ans">A família define no painel: aberta, com senha, com identificação, lista de e-mails autorizados ou totalmente oculta.</p>
      </details>
      <details class="item">
        <summary>Posso cancelar quando quiser?<span class="chev">▼</span></summary>
        <p class="ans">Sim. Sem multas ou taxas de cancelamento — pode cancelar a qualquer momento.</p>
      </details>
</div>
  </div>
</section>



<section class="closing" id="closing">
  <div class="veil" style="background-image:url('/fio-da-vida/cena-velas.png');"></div>
  <div class="chamas"><canvas id="cvChamas"></canvas></div>
  <div class="flame"></div>
  <p>Cada memorial acende o próprio ponto de luz. Juntos, viram uma constelação que não apaga.</p>
</section>

<footer class="site">
  <div class="inner">
    <div class="cols">
      <div class="brand-col">
        <img class="logo-sm" src="/logo-legado-digital.svg" alt="Legado Digital" />
        <p>Um espaço permanente para preservar histórias. Memoriais digitais com QR Code para o setor funerário.</p>
      </div>
      <div class="col">
        <h4>Produto</h4>
        <a href="#beneficios">Benefícios</a>
        <a href="#como-funciona">Como Funciona</a>
        <a href="#faq">FAQ</a>
      </div>
      <div class="col">
        <h4>Empresa</h4>
        <span>Sobre</span>
        <a href="mailto:contato@legadodigital.net">contato@legadodigital.net</a>
        <a href="/politica-de-privacidade">Privacidade</a>
        <a href="/termos-de-uso">Termos de Uso</a>
      </div>
    </div>
    <div class="bottom">
      © 2026 Legado Digital. Todos os direitos reservados.<br>
      Preservando histórias hoje para que continuem inspirando amanhã.
    </div>
  </div>
</footer>`

export default function Home() {
  return (
    <>
      <div className="fio-da-vida" dangerouslySetInnerHTML={{ __html: MARCACAO }} />
      <Script src="/fio-da-vida/anima.js" strategy="afterInteractive" />
      <LegadoBotPublicoWidget />
    </>
  )
}
