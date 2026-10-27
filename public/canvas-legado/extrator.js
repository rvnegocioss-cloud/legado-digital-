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
  /* ---------- Previsão do tempo (Open-Meteo, sem chave). Funções puras + busca com fetch injetável ---------- */
  var DIAS_SEM = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function isoDe(a, m, d) { var t = new Date(Date.UTC(a, m - 1, d)); if (t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null; return a + '-' + p2(m) + '-' + p2(d); }
  /* texto livre ("Terça-feira, 3 de novembro", "12 de novembro de 2026", "3/11") -> "AAAA-MM-DD" ou null. Sem ano: ano de hoje, ou o próximo se já passou há mais de 30 dias. */
  function dataParaISO(txt, hojeISO) {
    var s = sem(String(txt || '')), a, m, d, r;
    var hj = hojeISO.split('-').map(Number);
    if ((r = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/))) { d = +r[1]; m = +r[2]; a = r[3] ? +r[3] : 0; }
    else if ((r = s.match(/(\d{1,2})\s*(?:de\s+)?([a-z]+)(?:\s+de\s+(\d{4}))?/)) && mesNum(r[2])) { d = +r[1]; m = mesNum(r[2]); a = r[3] ? +r[3] : 0; }
    else return null;
    if (a && a < 100) a += 2000;
    if (a) return isoDe(a, m, d);
    var iso = isoDe(hj[0], m, d); if (!iso) return null;
    var dif = (Date.parse(iso) - Date.parse(hojeISO)) / 86400000;
    return dif < -30 ? isoDe(hj[0] + 1, m, d) : iso;
  }
  /* "Uberlândia - MG" / "Cemitério São Pedro — Uberlândia" -> "Uberlândia" */
  function limpaCidade(s) {
    s = String(s || '').trim(); if (!s) return '';
    var partes = s.split(/\s+[—–-]\s+|\s*\/\s*|\s*,\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (partes.length > 1 && /^[A-Za-z]{2}$/.test(partes[partes.length - 1])) partes.pop();
    return partes[partes.length - 1] || '';
  }
  function condicao(c) {
    if (c === 0) return 'Céu limpo';
    if (c === 1) return 'Predominantemente limpo';
    if (c === 2) return 'Parcialmente nublado';
    if (c === 3) return 'Nublado';
    if (c === 45 || c === 48) return 'Névoa';
    if (c >= 51 && c <= 57) return 'Garoa';
    if (c === 61 || c === 80) return 'Chuva fraca';
    if (c === 63 || c === 81) return 'Chuva';
    if (c === 65 || c === 82 || c === 67) return 'Chuva forte';
    if (c === 66) return 'Chuva fraca';
    if (c >= 71 && c <= 77 || c === 85 || c === 86) return 'Frio com neve';
    if (c === 95 || c === 96 || c === 99) return 'Trovoadas';
    return '';
  }
  function montaLinha(iso, cod, tmin, tmax, prob) {
    var c = condicao(cod); if (!c || tmin == null || tmax == null || isNaN(tmin) || isNaN(tmax)) return '';
    var p = iso.split('-').map(Number), dow = new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).getUTCDay();
    var dia = DIAS_SEM[dow]; dia = dia.charAt(0).toUpperCase() + dia.slice(1);
    var t = 'Previsão para ' + dia + ', ' + p[2] + ' de ' + MESES[p[1] - 1] + ': ' + c + ', ' + Math.round(tmin) + '° a ' + Math.round(tmax) + '°';
    if (prob != null && !isNaN(prob)) t += ', chuva ' + Math.round(prob) + '%';
    return t;
  }
  var CACHE_PREV = {};
  /* devolve {ok:true,texto} ou {ok:false,erro:'passada'|'longe'|'cidade'|'rede'|'dados'} */
  function buscaPrevisao(cidade, iso, hojeISO, fetchFn) {
    cidade = limpaCidade(cidade);
    if (!cidade || !iso) return Promise.resolve({ ok: false, erro: 'faltam' });
    var dif = (Date.parse(iso) - Date.parse(hojeISO)) / 86400000;
    if (dif < 0) return Promise.resolve({ ok: false, erro: 'passada' });
    if (dif > 15) return Promise.resolve({ ok: false, erro: 'longe' });
    var key = sem(cidade) + '|' + iso; if (CACHE_PREV[key]) return Promise.resolve(CACHE_PREV[key]);
    var f = fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(root) : null); if (!f) return Promise.resolve({ ok: false, erro: 'rede' });
    return f('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(cidade) + '&count=1&language=pt&country=BR')
      .then(function (r) { return r.json(); })
      .then(function (g) {
        var l = g && g.results && g.results[0]; if (!l) return { ok: false, erro: 'cidade' };
        return f('https://api.open-meteo.com/v1/forecast?latitude=' + l.latitude + '&longitude=' + l.longitude + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FSao_Paulo&forecast_days=16')
          .then(function (r) { return r.json(); })
          .then(function (w) {
            var d = w && w.daily, i = d && d.time ? d.time.indexOf(iso) : -1; if (i < 0) return { ok: false, erro: 'dados' };
            var t = montaLinha(iso, d.weather_code[i], d.temperature_2m_min[i], d.temperature_2m_max[i], d.precipitation_probability_max ? d.precipitation_probability_max[i] : null);
            if (!t) return { ok: false, erro: 'dados' };
            return (CACHE_PREV[key] = { ok: true, texto: t });
          });
      })
      .catch(function () { return { ok: false, erro: 'rede' }; });
  }
  function limpaCachePrevisao() { CACHE_PREV = {}; }
  var api = { extrair: extrair, previsao: { dataParaISO: dataParaISO, limpaCidade: limpaCidade, condicao: condicao, montaLinha: montaLinha, buscaPrevisao: buscaPrevisao, limpaCache: limpaCachePrevisao } };
  // ---- Template 1 Retrato (so adicao): endereco e versiculo. Fica fora de extrair() de proposito. ----
  var UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
  function extrairExtra(texto, tipo) {
    var out = {};
    if (tipo !== 'missa' && tipo !== 'convite') return out;
    var T = String(texto || '').replace(/\s+/g, ' ').trim();
    var put = function (k, v, c) { v = String(v || '').trim().replace(/[,;.\s]+$/, ''); if (v) out[k] = { valor: v, confianca: c || 'alta' }; };
    var mr = T.match(/\b(?:Rua|Avenida|Av\.|Travessa|Tv\.|Pra[çc]a|Alameda|Rodovia)\s+[A-Za-zÀ-ÿ][^,;.\n]*?(?:,\s*(?:n[ºo°.]*\s*)?|\s+n[ºo°.]*\s*|\s+)\d{1,5}[A-Za-z]?\b/);
    if (mr) put('end_rua', mr[0]);
    var mb = T.match(/\b[Bb]airro\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'’ ]*?)(?=\s*(?:[,;.\/-]|\s+(?:em|na|no|às|as|dia|hoje|amanh)\b|$))/);
    if (mb) put('end_bairro', mb[1]);
    var re = /\b((?:[A-ZÀ-Ý][a-zà-ÿ]+\s+(?:d[aeo]s?\s+)?)?[A-ZÀ-Ý][a-zà-ÿ]+)\s*[\/\-–]\s*([A-Z]{2})\b/g, mc;
    while ((mc = re.exec(T))) {
      if (UFS.indexOf(mc[2]) < 0) continue;
      var cid = mc[1]; if (out.end_bairro && cid.indexOf(out.end_bairro.valor) === 0) cid = cid.slice(out.end_bairro.valor.length).trim();
      if (cid) { put('end_cidade_uf', cid + '/' + mc[2]); break; }
    }
    var mv = T.match(/[“"]([^”"]{15,300})[”"]\s*[-–—,(]?\s*((?:[1-3]\s?)?[A-ZÀ-Ý][a-zà-ÿ]{1,12}\.?\s+\d{1,3}\s*[,.:]\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?/);
    if (mv) put('versiculo', '“' + mv[1].trim() + '”' + (mv[2] ? ' — ' + mv[2].trim() : ''), mv[2] ? 'alta' : 'media');
    return out;
  }
  api.extrairExtra = extrairExtra;
  root.LegadoExtrator = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
