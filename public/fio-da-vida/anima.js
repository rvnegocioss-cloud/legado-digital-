(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VB_W = 800, VB_H = 3900;

  /* only DOT + PHOTO anchors define the thread's spine — INFO cards sit beside it,
     fed by a short stub, so the thread never crosses written text */
  var nodeEls = Array.prototype.slice.call(document.querySelectorAll('.node'));
  var anchors = nodeEls.map(function (n) {
    return { el: n, x: +n.dataset.x, y: +n.dataset.y, t: +n.dataset.t,
             isSpine: !n.classList.contains('info'), lit: false, litAt: -999 };
  });

  anchors.forEach(function (a) {
    a.el.style.left = (a.x / VB_W * 100) + '%';
    a.el.style.top = (a.y / VB_H * 100) + '%';
  });

  var stage0 = document.getElementById('stage');
  var vbScale = 1;
  var keepout = [];
  function measureHideRadii() {
    vbScale = stage0.clientWidth / VB_W || 1;
    keepout = [];
    anchors.forEach(function (a) {
      if (a.el.classList.contains('photo')) {
        a.rHide = (a.el.offsetWidth / 2) / vbScale + 14;
        var cap = a.el.querySelector('.cap');
        if (cap) {
          var capX, capY;
          if (getComputedStyle(cap).position === 'static') {
            /* mobile: legenda cai embaixo da foto (position:static), não do lado */
            capX = a.x;
            capY = a.y + (a.el.offsetHeight / 2 + 10 + cap.offsetHeight / 2) / vbScale;
          } else {
            var side = cap.classList.contains('side-left') ? -1 : 1;
            capX = a.x + side * (a.el.offsetWidth / 2 + 26 + cap.offsetWidth / 2) / vbScale;
            capY = a.y;
          }
          keepout.push({ x: capX, y: capY, hw: (cap.offsetWidth / 2) / vbScale, hh: (cap.offsetHeight / 2) / vbScale });
        }
      } else {
        a.rHide = 0;
      }
      if (!a.isSpine) {
        a.boxHW = (a.el.offsetWidth / 2) / vbScale;
        a.boxHH = (a.el.offsetHeight / 2) / vbScale;
        keepout.push({ x: a.x, y: a.y, hw: a.boxHW, hh: a.boxHH });
      }
    });
    equalizarEspacos();
    montarConstelacao();
    construirDNA();
    aplicarMascaraTexto();
  }


  /* cada texto fica com o MESMO respiro em cima e embaixo, medindo a caixa real */
  function equalizarEspacos() {
    /* cada texto fica com o MESMO respiro em cima e embaixo dentro do seu vao,
       medindo a caixa real de cada elemento (foto e texto tem alturas diferentes) */
    var conteudo = anchors.filter(function (a) { return !a.el.classList.contains('dot'); })
                          .sort(function (p, q) { return p.y - q.y; });
    var meia = function (n) { return (n.el.offsetHeight / 2) / vbScale; };
    conteudo.forEach(function (a, i) {
      if (!a.el.classList.contains('texto')) return;
      var ant = conteudo[i - 1], dep = conteudo[i + 1];
      if (!ant || !dep) return;
      var topo = ant.y + meia(ant);
      var base = dep.y - meia(dep);
      var y = (topo + base) / 2;
      a.y = y;
      a.el.style.top = (y / VB_H * 100) + '%';
    });
  }

  function aplicarMascaraTexto() {
    var g = document.getElementById('maskHoles');
    if (!g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    var folga = 12;
    /* as caixas sao medidas AQUI, ja com a posicao final de cada elemento -
       antes eu usava as medidas antigas e o buraco saia no lugar errado */
    anchors.forEach(function (a) {
      if (a.rHide) return;
      var hw = (a.el.offsetWidth / 2) / vbScale, hh = (a.el.offsetHeight / 2) / vbScale;
      var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', a.x - hw - folga);
      r.setAttribute('y', a.y - hh - folga);
      r.setAttribute('width', (hw + folga) * 2);
      r.setAttribute('height', (hh + folga) * 2);
      r.setAttribute('rx', 8);
      r.setAttribute('fill', '#000');
      g.appendChild(r);
    });
    /* o fio tambem nao e desenhado dentro de nenhuma foto (nada de rastro por cima da imagem) */
    anchors.forEach(function (a) {
      if (!a.rHide) return;
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', a.x);
      c.setAttribute('cy', a.y);
      c.setAttribute('r', a.rHide + 6);
      c.setAttribute('fill', '#000');
      g.appendChild(c);
    });
    /* o fio termina no ultimo node: tudo abaixo disso e apagado, senao a ponta
       invade a area da FAQ, que nao tem fundo e deixa a linha aparecer entre as letras */
    var ultimo = 0;
    anchors.forEach(function (a) {
      if (a.el.classList.contains('dot')) return;   /* ponto decorativo nao conta */
      if (a.y > ultimo) ultimo = a.y;
    });
    var corte = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    corte.setAttribute('x', -50);
    corte.setAttribute('y', ultimo + 90);
    corte.setAttribute('width', VB_W + 100);
    corte.setAttribute('height', VB_H);
    corte.setAttribute('fill', '#000');
    g.appendChild(corte);
    /* mesma mascara dos textos de cima, aplicada ao que fica FORA do palco
       (FAQ, vela, rodape): converto a posicao na tela para a escala do fio */
    var caixaPalco = stage0.getBoundingClientRect();
    ['.faq', '.closing', 'footer.site'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      var r = el.getBoundingClientRect();
      var x0 = (r.left - caixaPalco.left) / vbScale;
      var y0 = (r.top - caixaPalco.top) / vbScale;
      var rc = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rc.setAttribute('x', x0 - 40);
      rc.setAttribute('y', y0 - 40);
      rc.setAttribute('width', r.width / vbScale + 80);
      rc.setAttribute('height', r.height / vbScale + 80);
      rc.setAttribute('fill', '#000');
      g.appendChild(rc);
    });
    keepout.forEach(function (k) {
      var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', k.x - k.hw - folga);
      r.setAttribute('y', k.y - k.hh - folga);
      r.setAttribute('width', (k.hw + folga) * 2);
      r.setAttribute('height', (k.hh + folga) * 2);
      r.setAttribute('rx', 8);
      r.setAttribute('fill', '#000');
      g.appendChild(r);
    });
  }

  window.addEventListener('resize', measureHideRadii);
  if (document.fonts) document.fonts.ready.then(measureHideRadii);
  window.addEventListener('load', function () { measureHideRadii(); setTimeout(measureHideRadii, 400); });

  function pathThrough(pts, tension) {
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6 * tension, c1y = p1[1] + (p2[1] - p0[1]) / 6 * tension;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6 * tension, c2y = p2[1] - (p3[1] - p1[1]) / 6 * tension;
      d += ' C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + p2[0] + ',' + p2[1];
    }
    return d;
  }

  var spineAnchors = anchors.filter(function (a) { return a.isSpine; });
  var spinePts = spineAnchors.map(function (a) { return [a.x, a.y]; });
  /* explicit detours around the two info cards so the spine never crosses their text */
  spinePts.splice(4, 0, [200, 1520]);
  spinePts.splice(10, 0, [650, 3280]);
  /* os pontos precisam estar SEMPRE em ordem de altura: com os nodes remanejados,
     um desvio antigo (y=3280) ficava depois da ultima foto (y=3560) e a linha
     descia ate a foto e voltava pra cima */
  spinePts.sort(function (a, b) { return a[1] - b[1]; });
  var spine = [[400, -160]].concat(spinePts).concat([[400, VB_H + 160]]);
  var main = document.getElementById('threadPath');
  main.setAttribute('d', pathThrough(spine, 1.05));
  var lenMain = main.getTotalLength();
  main.style.strokeDasharray = lenMain;

  /* ---------- trelica de DNA: cada foto que o fio passa acrescenta um fio novo ---------- */
  var grupoDNA = document.getElementById('fiosDNA');
  var fiosDNA = [];

  function construirDNA() {
    if (!grupoDNA) return;
    while (grupoDNA.firstChild) grupoDNA.removeChild(grupoDNA.firstChild);
    fiosDNA = [];

    var fotos = anchors.filter(function (a) { return a.el.classList.contains('photo'); })
                       .sort(function (a, b) { return a.y - b.y; });
    if (!fotos.length || !lenMain) return;

    var PASSOS = 420;                 /* resolucao da amostragem do fio principal */
    var amostras = [];
    for (var i = 0; i <= PASSOS; i++) {
      var t = i / PASSOS;
      var pt = main.getPointAtLength(lenMain * t);
      amostras.push({ t: t, x: pt.x, y: pt.y, d: lenMain * t });
    }
    /* normal aproximada em cada amostra (perpendicular ao caminho) */
    for (var i = 0; i < amostras.length; i++) {
      var a0 = amostras[Math.max(0, i - 1)], a1 = amostras[Math.min(amostras.length - 1, i + 1)];
      var dx = a1.x - a0.x, dy = a1.y - a0.y;
      var m = Math.hypot(dx, dy) || 1;
      amostras[i].nx = -dy / m;
      amostras[i].ny = dx / m;
    }

    var ONDA = 300;                   /* comprimento de onda do entrelace */
    var AMP = 26;                     /* afastamento maximo do fio principal */
    var RAMPA = 260;                  /* distancia em que a amplitude cresce do zero */

    fotos.forEach(function (foto, k) {
      /* acha a amostra onde o fio principal passa pela foto */
      var iniIdx = 0, melhor = 1e9;
      for (var i = 0; i < amostras.length; i++) {
        var dd = Math.abs(amostras[i].y - foto.y);
        if (dd < melhor) { melhor = dd; iniIdx = i; }
      }
      var dIni = amostras[iniIdx].d;
      var fase = (k % 2 === 0) ? 0 : Math.PI;     /* lados alternados: trança de verdade */
      var d = '';
      for (var i = iniIdx; i < amostras.length; i++) {
        var a = amostras[i];
        var perc = Math.min(1, (a.d - dIni) / RAMPA);          /* nasce colado na foto */
        var amp = AMP * perc * (0.75 + 0.25 * Math.sin(a.d / 900));
        var off = Math.sin((a.d - dIni) / ONDA * Math.PI * 2 + fase) * amp;
        var x = a.x + a.nx * off, y = a.y + a.ny * off;
        d += (d ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
      }
      if (!d) return;
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'fio-dna');
      path.setAttribute('d', d);
      path.setAttribute('stroke-width', (2.0 - k * 0.18).toFixed(2));
      path.setAttribute('opacity', (0.72 - k * 0.06).toFixed(2));
      grupoDNA.appendChild(path);
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      fiosDNA.push({ el: path, len: len, tIni: amostras[iniIdx].t });
    });
  }

  function desenharDNA(p) {
    for (var i = 0; i < fiosDNA.length; i++) {
      var f = fiosDNA[i];
      var q = (p - f.tIni) / (1 - f.tIni);
      q = q < 0 ? 0 : (q > 1 ? 1 : q);
      f.el.style.strokeDashoffset = f.len * (1 - q);
    }
  }


  /* ---------- constelacao de fundo: rede de memoriais distantes ---------- */
  var cvConst = document.getElementById('constCanvas');
  var ctxConst = cvConst ? cvConst.getContext('2d') : null;
  var estrelas = [], ligacoes = [], viagens = [];

  function montarConstelacao() {
    if (!ctxConst) return;
    estrelas = [];
    var N = 78, rnd = 20260814;
    function r() { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return rnd / 0x7fffffff; }
    for (var i = 0; i < N; i++) {
      estrelas.push({ x: 40 + r() * (VB_W - 80), y: 60 + r() * (VB_H - 120),
                      z: 0.25 + r() * 0.75, br: 0.35 + r() * 0.65, fase: r() * 6.28 });
    }
    ligacoes = [];
    for (var i = 0; i < estrelas.length; i++) {
      var perto = [];
      for (var j = 0; j < estrelas.length; j++) {
        if (i === j) continue;
        var d = Math.hypot(estrelas[i].x - estrelas[j].x, estrelas[i].y - estrelas[j].y);
        if (d < 320) perto.push([d, j]);
      }
      perto.sort(function (a, b) { return a[0] - b[0]; });
      perto.slice(0, 2).forEach(function (pr) { ligacoes.push([i, pr[1], pr[0]]); });
    }
    anchors.filter(function (a) { return a.el.classList.contains('photo'); })
           .forEach(function (a) {
             var melhor = null, dist = 1e9;
             estrelas.forEach(function (e) {
               if (e.z > 0.42) return;                      /* so as bem distantes */
               var d = Math.hypot(e.x - a.x, e.y - a.y);
               var acima = e.y < a.y - 120;                  /* nasce la em cima, no fundo */
               if (d > 240 && d < 460 && acima && d < dist) { dist = d; melhor = e; }
             });
             if (!melhor) {   /* nenhuma serve: cria um ponto de fuga proprio no fundo */
               melhor = { x: a.x < 400 ? 620 : 180, y: Math.max(60, a.y - 340),
                          z: 0.3, br: 0.9, fase: 0 };
               estrelas.push(melhor);
             }
             melhor.origemDe = a; melhor.flare = 0;
             a.origem = melhor;
           });
  }

  function desenharConstelacao(tempo, p) {
    if (!ctxConst) return;
    ctxConst.clearRect(0, 0, VB_W, VB_H);
    ctxConst.lineWidth = 0.6;
    for (var i = 0; i < ligacoes.length; i++) {
      var a = estrelas[ligacoes[i][0]], b = estrelas[ligacoes[i][1]], d = ligacoes[i][2];
      var al = 0.05 * (1 - d / 320) * (a.z + b.z) / 2;
      ctxConst.strokeStyle = 'rgba(201,164,106,' + al.toFixed(3) + ')';
      ctxConst.beginPath(); ctxConst.moveTo(a.x, a.y); ctxConst.lineTo(b.x, b.y); ctxConst.stroke();
    }
    for (var i = 0; i < estrelas.length; i++) {
      var e = estrelas[i];
      if (e.origemDe) {                       /* a ESTRELA de onde a imagem vai nascer */
        var f = e.flare || 0;
        if (f > 0.01) {
          var R = 26 + 54 * f;
          var gg = ctxConst.createRadialGradient(e.x, e.y, 0, e.x, e.y, R);
          gg.addColorStop(0, 'rgba(255,252,240,' + (0.95 * f).toFixed(3) + ')');
          gg.addColorStop(0.18, 'rgba(255,236,196,' + (0.55 * f).toFixed(3) + ')');
          gg.addColorStop(1, 'rgba(201,164,106,0)');
          ctxConst.fillStyle = gg;
          ctxConst.beginPath(); ctxConst.arc(e.x, e.y, R, 0, 6.283); ctxConst.fill();
          /* raios da estrela */
          ctxConst.save();
          ctxConst.globalAlpha = 0.75 * f;
          ctxConst.strokeStyle = 'rgba(255,246,222,0.9)';
          ctxConst.lineWidth = 1.1;
          var braco = 20 + 70 * f;
          [[1,0],[0,1],[0.7,0.7],[0.7,-0.7]].forEach(function (d) {
            ctxConst.beginPath();
            ctxConst.moveTo(e.x - d[0]*braco, e.y - d[1]*braco);
            ctxConst.lineTo(e.x + d[0]*braco, e.y + d[1]*braco);
            ctxConst.stroke();
          });
          ctxConst.restore();
        }
      }
      var pulso = 0.75 + 0.25 * Math.sin(tempo / 1400 + e.fase);
      var raio = 0.7 + e.z * 1.9;
      var al = 0.10 + 0.42 * e.br * e.z * pulso;
      var g = ctxConst.createRadialGradient(e.x, e.y, 0, e.x, e.y, raio * 5);
      g.addColorStop(0, 'rgba(255,232,190,' + al.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(201,164,106,0)');
      ctxConst.fillStyle = g;
      ctxConst.beginPath(); ctxConst.arc(e.x, e.y, raio * 5, 0, 6.283); ctxConst.fill();
    }
    for (var i = 0; i < anchors.length; i++) {
      var v = anchors[i];
      if (!v.origem || !v.el.classList.contains('photo')) continue;
      var q = v.viagemQ || 0;
      if (q <= 0.001 || q >= 0.999) continue;
      var ax = v.origem.x, ay = v.origem.y;
      var bx = ax + (v.x - ax) * q, by = ay + (v.y - ay) * q;
      var grad = ctxConst.createLinearGradient(ax, ay, bx, by);
      grad.addColorStop(0, 'rgba(201,164,106,0)');
      grad.addColorStop(1, 'rgba(255,240,205,' + (0.55 * (1 - q)).toFixed(3) + ')');
      ctxConst.strokeStyle = grad;
      ctxConst.lineWidth = 1.1 + 1.4 * (1 - q);
      ctxConst.beginPath(); ctxConst.moveTo(ax, ay); ctxConst.lineTo(bx, by); ctxConst.stroke();
    }
  }

  /* ---------- a viagem e comandada pelo SCROLL ----------
     janela de cada foto: comeca antes do gatilho dela (estrela acende) e
     termina no gatilho (imagem assentada). Subindo a pagina, ela volta pra estrela. */
  var JANELA = 0.16;   /* quanto maior, mais devagar a imagem vem da estrela */

  function atualizarViagens(prog) {
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      if (!a.el.classList.contains('photo')) continue;
      if (!a.origem) {                       /* sem estrela: aparece do jeito normal */
        a.el.style.opacity = a.lit ? '1' : '';
        a.el.style.setProperty('--dx','0px'); a.el.style.setProperty('--dy','0px');
        a.el.style.setProperty('--s','1');   a.el.style.setProperty('--bl','0px');
        continue;
      }
      /* a janela comeca QUANDO o fio chega na foto (nao antes) e termina depois:
         estrela acende ali, imagem vem crescendo enquanto voce continua descendo */
      var ini = a.t - JANELA * 0.5, fim = ini + JANELA;
      var q = (prog - ini) / (fim - ini);
      q = q < 0 ? 0 : (q > 1 ? 1 : q);

      /* PRIMEIRA METADE: so a estrela, brilhando sozinha.
         SEGUNDA METADE: a imagem sai dela e vem crescendo devagar. */
      var SOLO = 0.5;
      a.origem.flare = q < SOLO ? Math.min(1, q / (SOLO * 0.6))
                                : Math.max(0, 1 - (q - SOLO) / 0.45);
      var qv = q <= SOLO ? 0 : (q - SOLO) / (1 - SOLO);
      var e = qv * qv * (3 - 2 * qv);

      if (qv <= 0) { a.el.style.opacity = '0'; a.el.classList.add('viajando'); }
      else if (qv >= 1) {
        a.el.style.setProperty('--dx','0px'); a.el.style.setProperty('--dy','0px');
        a.el.style.setProperty('--s','1');   a.el.style.setProperty('--bl','0px');
        a.el.style.opacity = '';
        a.el.classList.remove('viajando');
      } else {
        a.el.classList.add('viajando');
        var dx = (a.origem.x - a.x) * (1 - e) * vbScale;
        var dy = (a.origem.y - a.y) * (1 - e) * vbScale;
        a.el.style.setProperty('--dx', dx.toFixed(1) + 'px');
        a.el.style.setProperty('--dy', dy.toFixed(1) + 'px');
        a.el.style.setProperty('--s', (0.02 + 0.98 * e).toFixed(3));
        a.el.style.setProperty('--bl', ((1 - e) * 9).toFixed(1) + 'px');
        a.el.style.opacity = (0.06 + 0.94 * Math.min(1, e * 1.35)).toFixed(3);
      }
      a.viagemQ = qv;
    }
  }

  var tip = document.getElementById('tip');
  /* a bolinha so existe depois que o fio entrou no palco - antes disso ela
     ficava parada em cima do texto do hero */
  var tipMin = 0.015;
  var closing = document.getElementById('closing');
  var connector = document.getElementById('connector');
  if (!connector) connector = { classList: { add: function(){}, remove: function(){} } };
  var stubs = [document.getElementById('stub1'), document.getElementById('stub2')];
  stubs.forEach(function (s) { var l = s.getTotalLength(); s.style.strokeDasharray = l; s.style.strokeDashoffset = l; });
  measureHideRadii();

  function setProgress(p, nowMs) {
    p = Math.max(0, Math.min(1, p));
    main.style.strokeDashoffset = lenMain * (1 - p);
    desenharDNA(p);
    var w = 2.6 + Math.max(0, (p - 0.8) / 0.2) * 1.6;
    main.style.strokeWidth = w;

    /* o orbe desce na MESMA velocidade do scroll: procura no caminho o ponto
       que esta na altura correspondente. Antes ele andava pelo comprimento do
       traçado — como o caminho serpenteia, ele adiantava em relacao a rolagem. */
    var pt = (function (yAlvo) {
      var lo = 0, hi = lenMain, mid, q;
      for (var it = 0; it < 18; it++) {
        mid = (lo + hi) / 2;
        q = main.getPointAtLength(mid);
        if (q.y < yAlvo) lo = mid; else hi = mid;
      }
      return main.getPointAtLength((lo + hi) / 2);
    })((function () {
      /* o orbe paira no meio da tela: a altura alvo e a linha central da
         viewport convertida pra coordenada do palco. Assim ele desce junto
         com a rolagem, nunca adianta nem fica pra tras. */
      var elPalco = document.getElementById('stage');
      if (!elPalco) return p * VB_H;
      var rs = elPalco.getBoundingClientRect();
      var y = (window.innerHeight * 0.5 - rs.top) / rs.height * VB_H;
      return y < -148 ? -148 : (y > VB_H ? VB_H : y);
    })());
    var R_FADE = 38;
    /* o orbe agora NASCE logo abaixo do texto do hero (pedido do Rafael):
       e dali que ele parte. Por isso o limiar de entrada foi aberto. */
    if (p > 0.001 && p < 0.985) {
      tip.style.left = (pt.x / VB_W * 100) + '%';
      tip.style.top = (pt.y / VB_H * 100) + '%';
      var occl = 0;
      for (var k = 0; k < anchors.length; k++) {
        var A = anchors[k];
        if (!A.lit && !A.el.classList.contains('pre')) continue;
        /* sem o fio desenhado, o orbe so precisa sumir quando esta DENTRO da
           foto/texto — nao ao chegar perto. Antes ele apagava quase o tempo todo. */
        if (A.rHide) {
          var d = Math.hypot(A.x - pt.x, A.y - pt.y);
          occl = Math.max(occl, clamp01((A.rHide - d) / 14));
        } else if (!A.isSpine) {
          var hw = (A.el.offsetWidth / 2) / vbScale, hh = (A.el.offsetHeight / 2) / vbScale;
          if (Math.abs(A.x - pt.x) < hw && Math.abs(A.y - pt.y) < hh) occl = 1;
        }
      }
      tip.style.opacity = 1 - occl;
    } else {
      tip.style.opacity = 0;
    }

    anchors.forEach(function (a) {
      var wasLit = a.lit;
      if (p >= a.t) {
        a.lit = true; a.el.classList.add('lit'); a.el.classList.remove('pre');
        if (!wasLit) { a.litAt = nowMs; a.el.classList.add('flash'); setTimeout(function () { a.el.classList.remove('flash'); }, 720); }
      } else if (p >= a.t - 0.06) {
        a.lit = false; a.el.classList.remove('lit'); a.el.classList.add('pre');
      } else {
        a.lit = false; a.el.classList.remove('lit'); a.el.classList.remove('pre');
      }
    });

    var i1 = anchors.filter(function (a){return !a.isSpine;})[0], i2 = anchors.filter(function (a){return !a.isSpine;})[1];
    if (i1 && i1.lit) stubs[0].style.strokeDashoffset = 0; else if (stubs[0]) stubs[0].style.strokeDashoffset = stubs[0].style.strokeDasharray;
    if (i2 && i2.lit) stubs[1].style.strokeDashoffset = 0; else if (stubs[1]) stubs[1].style.strokeDashoffset = stubs[1].style.strokeDasharray;

    if (p > 0.9) closing.classList.add('lit'); else closing.classList.remove('lit');
    return p;
  }

  /* ---------- generative mesh, integrated with the main thread's progress and lit anchors ---------- */
  var canvas = document.getElementById('meshCanvas');
  var ctx = canvas.getContext('2d');
  var TAU = Math.PI * 2;
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function envelope(u) { return Math.sin(Math.PI * u); }

  var SEG = 12, R_ATTRACT = 260, R2 = R_ATTRACT * R_ATTRACT;
  var K_BASE = 0.10, K_LIT = 0.5;

  function buildStrand(idx, throughAnchors) {
    var seed = rand(0, 100);
    var s = { pts: [], braid: idx % 2 ? 1 : -1, group: idx >> 1, seed: seed,
              w: rand(0.6, 1.4), alpha: rand(0.07, 0.22) };
    if (throughAnchors) {
      /* "sibling" strand: loosely tracks the same route as the main thread, offset — frozen geometry.
         Poucas e próximas do fio principal de propósito — leitura de "companheiras
         entrelaçando", não nuvem de fundo. */
      var off = rand(-55, 55);
      for (var i = 0; i <= SEG; i++) {
        var u = i / SEG;
        var idxF = u * (spineAnchors.length - 1);
        var i0 = Math.floor(idxF), i1b = Math.min(spineAnchors.length - 1, i0 + 1), fr = idxF - i0;
        var ax = spineAnchors[i0].x + (spineAnchors[i1b].x - spineAnchors[i0].x) * fr;
        var ay = spineAnchors[i0].y + (spineAnchors[i1b].y - spineAnchors[i0].y) * fr;
        var bx = ax + off + Math.sin(u * 5 + seed) * 20;
        bx += Math.sin(seed * 3.7 + i * 0.9) * rand(10, 24) * 0.5;
        bx += s.braid * Math.sin(u * Math.PI * 3 + s.group) * 24;
        var by = ay + Math.cos(seed * 2.3 + i * 1.3) * rand(6, 14) * 0.5;
        s.pts.push({ bx: bx, by: by, x: bx, y: by });
      }
      s.w = rand(1.1, 1.7); s.alpha = rand(0.18, 0.32);
      s.lag = rand(-0.16, -0.05); s.speed = rand(0.95, 1.05); s.feather = rand(0.08, 0.14);
    } else {
      var x0 = rand(-500, 1300), x1 = rand(-500, 1300);
      for (var j = 0; j <= SEG; j++) {
        var uu = j / SEG;
        var bxx = x0 + (x1 - x0) * uu + Math.sin(uu * 3.1 + seed) * rand(60, 130) + Math.sin(uu * 7.3 + seed * 2.1) * rand(14, 36);
        bxx += Math.sin(seed * 3.7 + j * 0.9) * rand(18, 52) * envelope(uu) * 0.5;
        bxx += s.braid * Math.sin(uu * Math.PI * 3 + s.group) * 24;
        var byy = -160 + uu * (VB_H + 320) + Math.cos(seed * 2.3 + j * 1.3) * rand(6, 20) * envelope(uu) * 0.5;
        s.pts.push({ bx: bxx, by: byy, x: bxx, y: byy });
      }
      s.lag = rand(-0.22, -0.03); s.speed = rand(0.86, 1.10); s.feather = rand(0.12, 0.24);
    }
    s.depth = rand(-1, 1);
    return s;
  }

  /* malha reduzida a propósito: só 3 fios "companheiros" do fio principal, tipo
     DNA se formando — sem a nuvem de fio solto de fundo (13 strands removidas). */
  var strands = [];
  for (var j = 0; j < 3; j++) strands.push(buildStrand(100 + j, true));
  strands.sort(function (a, b) { return a.depth - b.depth; });

  var lastScrollY = window.scrollY, scrollVel = 0;

  function nearestOnRect(px, py, L, T, R, B) {
    var cx = Math.max(L, Math.min(R, px)), cy = Math.max(T, Math.min(B, py));
    if (cx > L && cx < R && cy > T && cy < B) {
      var dl = px - L, dr = R - px, dt = py - T, db = B - py;
      var m = Math.min(dl, dr, dt, db);
      if (m === dl) return [L, py];
      if (m === dr) return [R, py];
      if (m === dt) return [px, T];
      return [px, B];
    }
    return [cx, cy];
  }

  function updateStrand(s, time, prog) {
    for (var i = 0; i <= SEG; i++) {
      var p = s.pts[i];
      var tx = p.bx, ty = p.by;

      var boost = 0;
      for (var a = 0; a < anchors.length; a++) {
        var A = anchors[a];
        if (Math.abs(A.y - p.by) > R_ATTRACT + (A.boxHH || 0)) continue;
        var targetX, targetY;
        if (A.isSpine) {
          targetX = A.x; targetY = A.y;
        } else {
          var hw = A.boxHW || 0, hh = A.boxHH || 0;
          var np = nearestOnRect(tx, ty, A.x - hw, A.y - hh, A.x + hw, A.y + hh);
          targetX = np[0]; targetY = np[1];
        }
        var dx = targetX - tx, dy = targetY - ty, d2 = dx * dx + dy * dy;
        if (d2 > R2) continue;
        var f = 1 - Math.sqrt(d2) / R_ATTRACT; f *= f;
        var lit = clamp01((prog - A.t + 0.06) / 0.10);
        var kk = (K_BASE + (K_LIT - K_BASE) * lit) * f;
        tx += dx * kk; ty += dy * kk * 0.55;
        var recency = 1 - clamp01((time - A.litAt) / 900);
        if (recency > 0) boost = Math.max(boost, f * recency);
      }

      var margin = 44;
      for (var kx = 0; kx < keepout.length; kx++) {
        var kb = keepout[kx];
        var L = kb.x - kb.hw - margin, R = kb.x + kb.hw + margin;
        var T = kb.y - kb.hh - margin, B = kb.y + kb.hh + margin;
        if (tx > L && tx < R && ty > T && ty < B) {
          var dl = tx - L, dr = R - tx, dt = ty - T, db = B - ty;
          var mm = Math.min(dl, dr, dt, db);
          if (mm === dl) tx = L; else if (mm === dr) tx = R; else if (mm === dt) ty = T; else ty = B;
        }
      }

      p.boost = boost;
      p.x += (tx - p.x) * 0.12;
      p.y += (ty - p.y) * 0.12;
    }
  }

  var prog = 0;
  var inViewport = true, tabVisible = !document.hidden, visible = true;
  function recomputeVisible() { visible = inViewport && tabVisible; }
  var io = new IntersectionObserver(function (entries) { inViewport = entries[0].isIntersecting; recomputeVisible(); });
  io.observe(canvas);
  document.addEventListener('visibilitychange', function () { tabVisible = !document.hidden; recomputeVisible(); });

  function drawMesh(time) {
    var T = time * 0.001;
    ctx.clearRect(0, 0, VB_W, VB_H);
    atualizarViagens(prog);
    desenharConstelacao(time, prog);
    strands.forEach(function (s) { updateStrand(s, time, prog); });

    strands.forEach(function (s) {
      var back = (s.depth + 1) / 2;
      var baseA = s.alpha * (0.45 + 0.55 * back) * (0.8 + 0.2 * prog);
      var head = prog * s.speed - s.lag;
      var alive = clamp01((1.04 + s.feather - head) / 0.18);
      var pulse = (0.72 + 0.28 * Math.sin(T * 2.2 + s.seed)) * alive;

      for (var i = 0; i < s.pts.length - 1; i++) {
        var u1 = (i + 1) / SEG;
        var rev = clamp01((head - u1) / s.feather);
        if (rev <= 0) continue;

        var p0 = s.pts[i], p1 = s.pts[i + 1];
        var mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
        var mx0 = i === 0 ? p0.x : (s.pts[i - 1].x + p0.x) / 2;
        var my0 = i === 0 ? p0.y : (s.pts[i - 1].y + p0.y) / 2;
        var localBoost = Math.max(p0.boost || 0, p1.boost || 0);
        var edge = rev * (1 - rev) * 4;
        var a = Math.min(1, baseA + localBoost * 0.55) * rev + edge * 0.34 * pulse;
        var w = s.w * (0.7 + 0.5 * back) + localBoost * 1.6 + edge * 1.6 * pulse;

        ctx.beginPath();
        ctx.moveTo(mx0, my0);
        ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
        ctx.strokeStyle = 'rgba(201,164,106,' + a + ')';
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (localBoost > 0.35 && (i === 3 || i === 8)) {
          ctx.beginPath();
          ctx.arc(p0.x, p0.y, 1.6 + localBoost * 1.4, 0, TAU);
          ctx.fillStyle = 'rgba(255,244,222,' + Math.min(1, 0.4 + localBoost * 0.6) + ')';
          ctx.fill();
        }
      }

      /* faint fixed sparks along the strand for ornament — same reveal gate */
      [0.3, 0.7].forEach(function (uu) {
        var revS = clamp01((head - uu) / s.feather);
        if (revS <= 0) return;
        var idxF = uu * (s.pts.length - 1), i0 = Math.floor(idxF), fr = idxF - i0;
        var i1s = Math.min(s.pts.length - 1, i0 + 1);
        var sx = s.pts[i0].x + (s.pts[i1s].x - s.pts[i0].x) * fr;
        var sy = s.pts[i0].y + (s.pts[i1s].y - s.pts[i0].y) * fr;
        ctx.beginPath();
        ctx.arc(sx, sy, 1, 0, TAU);
        ctx.fillStyle = 'rgba(223,192,138,' + (baseA * 1.6 * revS) + ')';
        ctx.fill();
      });
    });

    /* garantia dura: nenhum fio pode ficar atrás de texto, ponto final — não é
       "empurrar os pontos pra longe" (probabilístico, um segmento entre dois pontos
       pode atravessar mesmo com os dois pontos fora da caixa), é apagar os pixels
       do canvas dentro do retângulo do texto depois de desenhar. O canvas só tem
       a malha (fio principal é SVG à parte, nós são DOM à parte), então apagar
       aqui nunca afeta mais nada. */
    ctx.globalCompositeOperation = 'destination-out';
    var topFade = ctx.createLinearGradient(0, 0, 0, 560);
    topFade.addColorStop(0, 'rgba(0,0,0,1)'); topFade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topFade; ctx.fillRect(0, 0, VB_W, 560);
    var PASS = [[46, 0.30], [34, 0.42], [24, 0.58], [14, 1.00]];
    for (var kx = 0; kx < keepout.length; kx++) {
      var kb = keepout[kx];
      for (var qp = 0; qp < PASS.length; qp++) {
        var pd = PASS[qp][0];
        ctx.fillStyle = 'rgba(0,0,0,' + PASS[qp][1] + ')';
        ctx.fillRect(kb.x - kb.hw - pd, kb.y - kb.hh - pd, (kb.hw + pd) * 2, (kb.hh + pd) * 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  if (reduced) {
    setProgress(1, 0);
    prog = 1;
    drawMesh(0);
  } else {
    setProgress(0, 0);
    (function loop(t) {
      var sy = window.scrollY;
      scrollVel = (sy - lastScrollY) * 0.6 + scrollVel * 0.85;
      lastScrollY = sy;
      if (visible) drawMesh(t);
      requestAnimationFrame(loop);
    })(0);

    var stage = document.getElementById('stage');
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var rect = stage.getBoundingClientRect();
        var vh = window.innerHeight;
        var total = rect.height + vh;
        var passed = vh - rect.top;
        prog = setProgress(passed / total, performance.now());
        aplicarMascaraTexto();
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    /* sem isto o orbe so aparecia no lugar certo depois do primeiro scroll:
       o layout ainda nao estava pronto quando o primeiro onScroll rodou */
    window.addEventListener('load', onScroll);
    setTimeout(onScroll, 120); setTimeout(onScroll, 600);
  }
})();

/* ---- proximo bloco ---- */

/* rede de seguranca: nenhuma foto pode ficar invisivel por falha de animacao */
setTimeout(function () {
  document.querySelectorAll('.node.photo').forEach(function (el) {
    var o = getComputedStyle(el).opacity;
    if (parseFloat(o) < 0.05) {
      el.style.opacity = '1';
      el.style.setProperty('--dx','0px'); el.style.setProperty('--dy','0px');
      el.style.setProperty('--s','1');    el.style.setProperty('--bl','0px');
      el.classList.add('lit'); el.classList.remove('pre','viajando');
    }
  });
}, 3000);

/* ---- proximo bloco ---- */

/* ---------- chamas reais: quadros do video da vela, somando luz ---------- */
(function () {
  var VELAS = [{"x": 0.09588, "y": 0.74300, "a": 55}, {"x": 0.18448, "y": 0.73438, "a": 54}, {"x": 0.28149, "y": 0.73633, "a": 55}, {"x": 0.38989, "y": 0.74121, "a": 55}, {"x": 0.49658, "y": 0.74707, "a": 57}, {"x": 0.60083, "y": 0.75098, "a": 56}, {"x": 0.69824, "y": 0.74902, "a": 56}, {"x": 0.79163, "y": 0.74414, "a": 55}, {"x": 0.87781, "y": 0.74414, "a": 55}];
  var ALVO = 14;                 /* teste: acende so esta vela */
  var SO_UMA = false;
  var QW = 43, QH = 132, NQ = 37;
  var IMGW = 2048, IMGH = 1024;
  var BASE = 0.92;                     /* onde o pavio cai dentro do quadro */
  var ESC = 3.0;

  var sec = document.getElementById('closing');
  var cv = document.getElementById('cvChamas');
  if (!sec || !cv) return;
  var ctx = cv.getContext('2d');
  var sprite = new Image();
  var pronto = false;
  sprite.onload = function () { pronto = true; requestAnimationFrame(loop); };
  sprite.src = '/fio-da-vida/chama-sprite.png';

  var W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
  function medir() {
    var r = sec.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* mesma conta do background-size:cover + position:center do .veil */
  function cover() {
    /* CONTAIN, alinhado ao CSS do .veil (background-size:contain, position:center top) */
    var ri = IMGW / IMGH, rc = W / H, dw, dh;
    if (ri > rc) { dw = W; dh = W / ri; } else { dh = H; dw = H * ri; }
    return { dx: (W - dw) / 2, dy: 0, dw: dw, dh: dh };
  }

  function progresso() {
    /* Mede pela BASE da faixa: 0 quando ela ainda esta logo abaixo da tela
       (orbe la em cima, tudo apagado) e 1 quando ela ja subiu ate a metade
       da tela (rodape a vista, todas acesas). Curso de ~0.7 tela — o orbe
       tem espaco para descer sem precisar esticar a secao. */
    var r = sec.getBoundingClientRect(), vh = window.innerHeight;
    var ini = vh * 1.44;             /* base da faixa ainda fora da tela */
    var fim = vh * 0.55;             /* base da faixa no meio da tela */
    var q = (ini - r.bottom) / (ini - fim);
    return q < 0 ? 0 : (q > 1 ? 1 : q);
  }

  function loop() {
    if (!pronto) return;
    requestAnimationFrame(loop);
    var b = cover(), p = progresso(), t = performance.now();
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    /* ---------- o orbe, em 4 fases ----------
       DESCIDA   : entra pelo alto e desce ate o pavio da 1a vela.
       CAMINHADA : anda de pavio em pavio; cada vela acende ao ser tocada.
       SUBIDA    : passada a ultima vela, sobe pela direita e curva ate o ceu
                   escuro acima da arvore.
       ESTRELA   : la ele vira uma estrela — e so entao as outras acendem,
                   uma por vela, formando a constelacao. */
    var N = VELAS.length;
    var ENTRA = 0.10, SAI = 0.99;
    var caminho = (p - ENTRA) / (SAI - ENTRA);
    var DESCIDA = 0.16, FIM_ANDA = 0.68, FIM_SOBE = 0.86;

    /* onde cada estrela mora, na parte escura do ceu (coordenada da imagem) */
    /* uma estrela por vela. 3o valor = tamanho proprio (constelacao nao tem
       estrela toda do mesmo tamanho). Todas ficam FORA da caixa da frase
       (x 0.173-0.827 / y 0.118-0.398) e fora do POUSO do orbe. */
    var CEU = [
      [0.042, 0.352, 1.40], [0.115, 0.468, 0.72], [0.148, 0.278, 1.05],
      [0.085, 0.545, 0.58], [0.298, 0.098, 0.88], [0.870, 0.292, 1.30],
      [0.928, 0.432, 0.68], [0.845, 0.522, 0.95], [0.965, 0.192, 0.52]
    ];
    var POUSO = [0.520, 0.098];        /* acima da arvore: onde o orbe vira estrela */

    function pavio(i) {
      var v = VELAS[i < 0 ? 0 : (i > N - 1 ? N - 1 : i)];
      var alt = v.a * (b.dh / IMGH) * ESC;
      return { x: b.dx + v.x * b.dw, y: b.dy + v.y * b.dh - alt * 0.04 };
    }
    function noCeu(par) { return { x: b.dx + par[0] * b.dw, y: b.dy + par[1] * b.dh }; }

    var pos = -1, descida = -1, sobe = -1, virou = 0;
    if (caminho < DESCIDA) {
      descida = caminho / DESCIDA;
    } else if (caminho < FIM_ANDA) {
      pos = (caminho - DESCIDA) / (FIM_ANDA - DESCIDA) * (N - 1);
    } else if (caminho < FIM_SOBE) {
      pos = N - 1;
      sobe = (caminho - FIM_ANDA) / (FIM_SOBE - FIM_ANDA);
    } else {
      pos = N - 1; sobe = 1;
      virou = Math.min(1, (caminho - FIM_SOBE) / (1 - FIM_SOBE));
    }

    /* as chamas: so acendem quando o orbe encosta */
    for (var i = 0; i < N; i++) {
      var v = VELAS[i];
      var f = pos < 0 ? 0 : (pos - i + 0.22) / 0.38;
      f = f < 0 ? 0 : (f > 1 ? 1 : f);
      if (f <= 0.001) continue;
      var cx = b.dx + v.x * b.dw, cy = b.dy + v.y * b.dh;
      var alt = v.a * (b.dh / IMGH) * ESC * (0.30 + 0.70 * f);
      var larg = alt * (QW / QH);
      var ciclo = NQ * 2 - 2;
      var k = t / 55 + i * 7;
      k = k - Math.floor(k / ciclo) * ciclo;
      var q = Math.floor(k < NQ ? k : ciclo - k);
      ctx.globalAlpha = f;
      ctx.drawImage(sprite, q * QW, 0, QW, QH, cx - larg / 2, cy - alt * BASE, larg, alt);
      ctx.globalAlpha = 1;
    }

    /* a vela acende -> a estrela dela nasce logo acima, na mesma passada do orbe */
    for (var e = 0; e < CEU.length; e++) {
      var fe = pos < 0 ? 0 : (pos - e - 0.06) / 0.34;
      fe = fe < 0 ? 0 : (fe > 1 ? 1 : fe);
      if (fe <= 0.001) continue;
      var pe = noCeu(CEU[e]);
      var pisca = 0.52 + 0.48 * Math.sin(t / 540 + e * 1.9);
      var br = fe * pisca;
      var esc = CEU[e][2] || 1;
      var re = Math.max(1.05, H * 0.0026) * esc;

      /* 1) brilho em volta */
      var ge = ctx.createRadialGradient(pe.x, pe.y, 0, pe.x, pe.y, re * 12);
      ge.addColorStop(0.00, 'rgba(255,252,243,' + (0.90 * br).toFixed(3) + ')');
      ge.addColorStop(0.14, 'rgba(255,241,212,' + (0.42 * br).toFixed(3) + ')');
      ge.addColorStop(0.42, 'rgba(214,190,150,' + (0.12 * br).toFixed(3) + ')');
      ge.addColorStop(1.00, 'rgba(201,164,106,0)');
      ctx.fillStyle = ge;
      ctx.beginPath(); ctx.arc(pe.x, pe.y, re * 12, 0, 6.283); ctx.fill();

      /* 2) as 4 pontas: dois fusos de AGULHA (a largura de controle e ~6% do
         comprimento — e isso que da a ponta fina em vez do losango gordo).
         A vertical e mais longa que a horizontal, como estrela de verdade. */
      var Rv = re * 8.2, Rh = re * 5.0, lg = re * 0.30;
      ctx.fillStyle = 'rgba(255,254,248,' + (0.96 * br).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(pe.x, pe.y - Rv);
      ctx.quadraticCurveTo(pe.x + lg, pe.y, pe.x, pe.y + Rv);
      ctx.quadraticCurveTo(pe.x - lg, pe.y, pe.x, pe.y - Rv);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pe.x - Rh, pe.y);
      ctx.quadraticCurveTo(pe.x, pe.y + lg, pe.x + Rh, pe.y);
      ctx.quadraticCurveTo(pe.x, pe.y - lg, pe.x - Rh, pe.y);
      ctx.closePath(); ctx.fill();

      /* 3) nucleo pequeno e quente, pra ponta parecer nascer de um ponto de luz */
      var gn = ctx.createRadialGradient(pe.x, pe.y, 0, pe.x, pe.y, re * 1.7);
      gn.addColorStop(0, 'rgba(255,255,255,' + (0.98 * br).toFixed(3) + ')');
      gn.addColorStop(1, 'rgba(255,246,222,0)');
      ctx.fillStyle = gn;
      ctx.beginPath(); ctx.arc(pe.x, pe.y, re * 1.7, 0, 6.283); ctx.fill();
    }

    /* o orbe */
    if (caminho > -0.10 && caminho < 1.30) {
      var ox, oy, vida = 1, raio = 1;
      if (descida >= 0) {
        var alvo0 = pavio(0);
        var ed = 1 - Math.pow(1 - descida, 2.2);
        ox = alvo0.x;
        oy = (-H * 0.10) + (alvo0.y + H * 0.10) * ed;
        vida = Math.min(1, descida / 0.14);
      } else if (sobe < 0) {
        var i0 = Math.floor(pos), fr = pos - i0;
        var a0 = pavio(i0), a1 = pavio(i0 + 1);
        ox = a0.x + (a1.x - a0.x) * fr;
        oy = a0.y + (a1.y - a0.y) * fr;
      } else {
        /* sobe pela direita e curva ate o ponto acima da arvore */
        var ini = pavio(N - 1), fim = noCeu(POUSO);
        var es = sobe * sobe * (3 - 2 * sobe);
        var ctrlX = b.dx + 0.955 * b.dw;             /* puxa a curva pra direita */
        var ctrlY = ini.y - (ini.y - fim.y) * 0.42;
        var u = 1 - es;
        ox = u*u*ini.x + 2*u*es*ctrlX + es*es*fim.x;
        oy = u*u*ini.y + 2*u*es*ctrlY + es*es*fim.y;
        if (virou > 0) raio = 1 - 0.62 * virou;      /* encolhe ate virar estrela */
      }
      oy += Math.sin(t / 900) * (H * 0.005);

      if (vida > 0) {
        var R = Math.max(10, H * 0.017) * raio;
        var g = ctx.createRadialGradient(ox, oy, 0, ox, oy, R * 7);
        g.addColorStop(0.00, 'rgba(255,253,246,' + (0.95 * vida).toFixed(3) + ')');
        g.addColorStop(0.10, 'rgba(255,238,201,' + (0.85 * vida).toFixed(3) + ')');
        g.addColorStop(0.26, 'rgba(240,207,146,' + (0.34 * vida).toFixed(3) + ')');
        g.addColorStop(0.60, 'rgba(201,164,106,' + (0.11 * vida).toFixed(3) + ')');
        g.addColorStop(1.00, 'rgba(201,164,106,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(ox, oy, R * 7, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,250,' + (0.98 * vida).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(ox, oy, R * 0.62, 0, 6.283); ctx.fill();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  window.addEventListener('resize', medir);
  medir();
})();

/* ---- proximo bloco ---- */

/* a dica de rolar cumpriu a funcao no primeiro scroll: sai de cena e nao volta */
(function () {
  var fora = false;
  function checar() {
    if (fora || window.scrollY < 40) return;
    fora = true;
    document.body.classList.add('ja-rolou');
    window.removeEventListener('scroll', checar);
  }
  window.addEventListener('scroll', checar, { passive: true });
})();

/* ---- proximo bloco ---- */

/* dropdown "Area Restrita" da navbar - mesmo comportamento da landing real */
(function () {
  var caixa = document.querySelector('.area-restrita');
  var botao = document.getElementById('btnArea');
  if (!caixa || !botao) return;
  function fechar() { caixa.classList.remove('aberto'); botao.setAttribute('aria-expanded', 'false'); }
  botao.addEventListener('click', function (e) {
    e.stopPropagation();
    var abre = !caixa.classList.contains('aberto');
    caixa.classList.toggle('aberto', abre);
    botao.setAttribute('aria-expanded', abre ? 'true' : 'false');
  });
  document.addEventListener('click', function (e) { if (!caixa.contains(e.target)) fechar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
})();