/* Extrator por regras (sem IA) - texto falado/colado pt-BR -> campos do Canvas Legado. */
(function (root) {
  'use strict';
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var DSEM = { segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado', domingo: 'Domingo' };
  var CONEC = { da: 1, de: 1, do: 1, das: 1, dos: 1, e: 1, di: 1, du: 1 };
  var L = 'A-Za-zÀ-ÿ';
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var sem = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  function titulo(s) {
    return s.trim().split(/\s+/).map(function (w, i) {
      var l = w.toLowerCase();
      if (i > 0 && CONEC[l]) return l;
      return l.charAt(0).toUpperCase() + l.slice(1);
    }).join(' ');
  }
  function mesNum(nome) { var n = sem(nome); for (var i = 0; i < 12; i++) if (sem(MESES[i]) === n) return i + 1; return 0; }
  var RE_EXT = new RegExp('\\b(\\d{1,2})\\s*(?:º|°)?\\s*(?:de\\s+)?(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\\s+de\\s+(\\d{4}))?', 'gi');
  var RE_NUM = /(?<![\d\/.])(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{4}|\d{2}))?(?![\d\/])/g;
  function achaDatas(seg) {
    var out = [], m;
    RE_EXT.lastIndex = 0;
    while ((m = RE_EXT.exec(seg))) { var d = +m[1], mo = mesNum(m[2]); if (d >= 1 && d <= 31 && mo) out.push({ d: d, m: mo, a: m[3] ? +m[3] : null, pos: m.index }); }
    RE_NUM.lastIndex = 0;
    while ((m = RE_NUM.exec(seg))) {
      var dd = +m[1], mm = +m[2]; if (dd < 1 || dd > 31 || mm < 1 || mm > 12) continue;
      var a = m[3] ? +m[3] : null; if (a !== null && a < 100) a += a > 30 ? 1900 : 2000;
      out.push({ d: dd, m: mm, a: a, pos: m.index });
    }
    return out.sort(function (x, y) { return x.pos - y.pos; });
  }
  function relativo(seg, hoje) {
    if (!hoje) return null;
    var base = new Date(hoje + 'T12:00:00'); if (isNaN(base)) return null;
    var s = sem(seg), off = null;
    if (/\bhoje\b/.test(s)) off = 0; else if (/\bamanha\b/.test(s)) off = 1; else if (/\bdepois de amanha\b/.test(s)) off = 2;
    if (off === null) return null;
    base.setDate(base.getDate() + off);
    return { d: base.getDate(), m: base.getMonth() + 1, a: base.getFullYear(), wd: base.getDay() };
  }
  var WD = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  function achaSemana(seg) {
    var m = /\b(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(?:-?\s*feira)?\b/i.exec(seg);
    return m ? DSEM[sem(m[1])] : null;
  }
  function fmtDia(seg, hoje) {
    var datas = achaDatas(seg), d = datas[0], rel = relativo(seg, hoje), wd = achaSemana(seg);
    if (d) return { v: (wd ? wd + ', ' : '') + d.d + ' de ' + MESES[d.m - 1] + (d.a ? ' de ' + d.a : ''), c: 'alta' };
    if (rel) return { v: WD[rel.wd] + ', ' + rel.d + ' de ' + MESES[rel.m - 1], c: 'alta' };
    if (wd) return { v: wd, c: 'baixa' };
    return null;
  }
  function achaHora(seg) {
    var m = /\b(\d{1,2})\s*(?:h|horas?|:)\s*(\d{2})?\b(?!\s*(?:de\b|\/))(?:\s*(?:da|de)\s+(manh[ãa]|tarde|noite))?/i.exec(seg);
    var per;
    if (m) { per = m[3]; } else {
      m = /\b(?:[àa]s\s+)?(\d{1,2})\s*(?:horas?\s*)?(?:da|de)\s+(manh[ãa]|tarde|noite)(?=\s|$|[.,;])/i.exec(seg);
      if (!m) return null; per = m[2]; m = [m[0], m[1], undefined];
    }
    var h = +m[1], mi = m[2] ? +m[2] : 0;
    if (h > 23 || mi > 59) return null;
    if (per && /tarde|noite/i.test(per) && h < 12) h += 12;
    return h + 'h' + (mi ? pad(mi) : '');
  }
  var CORTE_NOME = /[,.;:\n]|\s(?:nasceu|nascido|nascida|faleceu|falecido|falecida|nascimento|falecimento|em|no|na|aos|com|e|dia|o|a|ontem|hoje|velório|velorio|sepultamento|missa|\d)(?=\s|$)/i;
  function nomeApos(T) {
    var gatilhos = [
      /(?:o\s+)?nome\s+(?:do\s+falecido\s+|da\s+falecida\s+)?(?:[ée]|:|-)\s*/i,
      /\bse\s+chama(?:va)?\s+/i,
      /\bfalecimento\s+d[oa]\s+(?:sr\.?\s*|sra\.?\s*|senhor\s+|senhora\s+|dr\.?\s*|dra\.?\s*)?/i,
      /\bem\s+mem[óo]ria\s+d[oae]\s+(?:sr\.?\s*|sra\.?\s*)?/i,
      /\bhomenagem\s+(?:a|ao|à)\s+/i,
      /\b[Ff]aleceu\s+(?:hoje\s+|ontem\s+)?(?:o\s+|a\s+)?(?:sr\.?\s*|sra\.?\s*|senhor\s+|senhora\s+)?(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/,
      /\b(?:comunicamos|lamentamos|com\s+pesar|com\s+profundo\s+pesar)[^.]*?\bfalecimento\s+d[oa]\s+(?:sr\.?\s*|sra\.?\s*)?/i,
      /\bnome\s+(?:completo\s*)?(?:[ée]\s+)?/i
    ];
    for (var i = 0; i < gatilhos.length; i++) {
      var m = gatilhos[i].exec(T); if (!m) continue;
      var rest = T.slice(m.index + m[0].length);
      var cut = rest.search(CORTE_NOME); if (cut === 0) continue; if (cut > 0) rest = rest.slice(0, cut);
      var ws = rest.trim().split(/\s+/).filter(Boolean);
      if (ws.length < 2 || ws.length > 7) continue;
      if (!ws.every(function (w) { return /^[A-Za-zÀ-ÿ'’\-]+$/.test(w); })) continue;
      if (CONEC[ws[0].toLowerCase()] || CONEC[ws[ws.length - 1].toLowerCase()]) continue;
      return { v: titulo(ws.join(' ')), c: (i <= 1 || i === 7) ? 'alta' : 'media' };
    }
    return null;
  }
  function cortaLocal(rest) {
    var cut = rest.search(/\s(?:[àa]s|dia|amanh[ãa]|hoje|e\s+(?:o|a)|com|para|saindo)(?=\s|$)|\s\d|[,.;\n]|\s(?:e|o|a)\s*$|\s(?:segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(?=[\s,\-]|$)/i);
    var r = (cut > 0 ? rest.slice(0, cut) : rest).trim();
    var ws = r.split(/\s+/);
    if (ws.length > 8 || ws.length < 2) return null;
    return titulo(r);
  }
  function extrair(texto, tipo, hojeISO) {
    var out = {};
    var T = ' ' + String(texto || '').replace(/\s+/g, ' ').trim() + ' ';
    var put = function (k, v, c) { if (v) out[k] = { valor: v, confianca: c || 'alta' }; };
    var gat = [['nasc', /\b(nasceu|nascido|nascida|nascimento|nasc\.)/gi], ['fal', /\b(faleceu|falecimento|falecida|falecido|[óo]bito|partiu|descansou)\b/gi], ['vel', /\bvel[óo]rio\b/gi], ['sep', /\b(sepultamento|enterro|sepultado|sepultada|ser[áa]\s+sepultad[oa])\b/gi], ['missa', /\bmissa\b/gi], ['fun', /\bfuner[áa]ria\b/gi]];
    var pos = [];
    gat.forEach(function (g) { var m; g[1].lastIndex = 0; while ((m = g[1].exec(T))) pos.push({ k: g[0], i: m.index }); });
    pos.sort(function (a, b) { return a.i - b.i; });
    function seg(k, exigeData) {
      var ps = pos.filter(function (x) { return x.k === k; }), last = '';
      for (var j = 0; j < ps.length; j++) {
        var p = ps[j], nx = pos.filter(function (x) { return x.i > p.i && x.k !== k; })[0];
        var t = T.slice(p.i, nx ? nx.i : T.length); if (!last) last = t;
        if (!exigeData || achaDatas(t).length) return t;
      }
      return last;
    }
    // falecido
    if (!tipo || tipo === 'falecido' || tipo === 'convite' || tipo === 'missa' || tipo === 'santinho') {
      var n = nomeApos(T); if (n) put('nome', n.v, n.c);
      var sn = seg('nasc', true), dn = achaDatas(sn)[0];
      if (dn && dn.a) put('nasc', pad(dn.d) + '/' + pad(dn.m) + '/' + dn.a);
      else if (dn) put('nasc', pad(dn.d) + '/' + pad(dn.m), 'baixa');
      var sf = seg('fal', true), df = achaDatas(sf)[0];
      if (df && df.a) put('fal', pad(df.d) + '/' + pad(df.m) + '/' + df.a);
      else if (df) put('fal', pad(df.d) + '/' + pad(df.m), 'baixa');
    }
    if (tipo === 'missa') {
      var s = seg('missa');
      if (s) {
        var dia = fmtDia(s, hojeISO); if (dia) put('dia', dia.v, dia.c);
        put('hora', achaHora(s));
        var mi = /\b(igreja|par[óo]quia|capela|catedral|matriz|bas[íi]lica|santu[áa]rio)\b/i.exec(s);
        if (mi) {
          var rest = s.slice(mi.index);
          var cut = rest.search(/\s(?:em|na cidade de)\s+|[,.;]|\s[àa]s\s|\sdia\s|\s\d|\s(?:amanh[ãa]|hoje)\b/i);
          var ig = (cut > 0 ? rest.slice(0, cut) : rest).trim();
          if (ig.split(/\s+/).length >= 2 && ig.split(/\s+/).length <= 8) {
            put('igreja', titulo(ig));
            var rm = new RegExp('\\s(?:em|na cidade de)\\s+([' + L + "'’ \\-]{2,40}?)(?=\\s*(?:[,.;\\n]|\\s[àa]s\\s|\\sdia\\s|\\s-\\s?[A-Z]{2}\\b|\\s\\d|\\s(?:amanh|hoje)|$))", 'i').exec(rest.slice(cut > 0 ? cut : 0));
            if (rm) put('cidade', titulo(rm[1]), 'media');
          }
        }
      }
    }
    if (tipo === 'convite') {
      var v = seg('vel');
      if (v) {
        var dv = fmtDia(v, hojeISO); if (dv) put('vel_dia', dv.v, dv.c);
        put('vel_hora', achaHora(v));
        var lm = /\b(?:na|no|em)\s+((?:capela|sala|igreja|velat[óo]rio|funer[áa]ria)\s+[^,.;]*)/i.exec(v);
        if (lm) { var lv = cortaLocal(lm[1]); if (lv) put('vel_local', lv, 'media'); }
      }
      var sp = seg('sep');
      if (sp) {
        var ds = fmtDia(sp, hojeISO); if (ds) put('sep_dia', ds.v, ds.c);
        put('sep_hora', achaHora(sp));
      }
      var cm = /\b(cemit[ée]rio\s+[^,.;]*)/i.exec(sp || T);
      if (cm) { var cv = cortaLocal(cm[1]); if (cv) put('cem', cv, 'media'); }
    }
    // funerária e telefone (todas as peças)
    var fm = new RegExp('funer[áa]ria\\s+((?:d[aeo]s?\\s+)?[' + L + "'’]+(?:\\s+(?:d[aeo]s?\\s+)?[" + L + "'’]+){0,3})", 'i').exec(T);
    if (fm) {
      var fn = fm[1].replace(/\s+(telefone|fone|tel|contato|ligue|whatsapp|zap|informa[çc][õo]es|e|o|a|às|as)\b.*$/i, '').trim();
      if (fn && !/^(do|da|de)$/i.test(fn)) put('fun', 'Funerária ' + titulo(fn), 'media');
    }
    var tm = /(?<!\d)\(?(\d{2})\)?[\s.\-]*(9?\d{4})[\s.\-]?(\d{4})(?!\d)/.exec(T);
    if (tm) put('tel', '(' + tm[1] + ') ' + tm[2] + '-' + tm[3]);
    // filtra campos que não pertencem à peça
    var permitidos = {
      falecido: ['nome', 'nasc', 'fal'],
      convite: ['nome', 'nasc', 'fal', 'vel_local', 'vel_dia', 'vel_hora', 'cem', 'sep_dia', 'sep_hora', 'fun', 'tel'],
      missa: ['nome', 'nasc', 'fal', 'igreja', 'cidade', 'dia', 'hora', 'fun', 'tel'],
      santinho: ['nome', 'nasc', 'fal', 'fun', 'tel']
    }[tipo];
    if (permitidos) Object.keys(out).forEach(function (k) { if (permitidos.indexOf(k) < 0) delete out[k]; });
    return out;
  }
  var api = { extrair: extrair };
  root.LegadoExtrator = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
