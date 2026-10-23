// Dados fictícios do próprio sistema + helpers de render compartilhados pelas 4 opções.
const D = {
  pend: [
    {n:'Maria Lígia da Cunha Machado',p:'Vale da Paz',falta:['contato da família','foto'],quem:'familia',orig:'cemitério',dias:2},
    {n:'Antônio Ferreira Lima',p:'Vale da Paz',falta:['história'],quem:'familia',orig:'parceiro',dias:9},
    {n:'Helena Martins Costa',p:'—',falta:['data de falecimento','foto'],quem:'equipe',orig:'central',dias:14},
    {n:'João Naves de Ávila',p:'—',falta:['história'],quem:'equipe',orig:'central',ilustre:1,dias:1},
    {n:'José Pereira Rocha',p:'Funerária Aurora',falta:['contato da família','data de falecimento','história'],quem:'familia',orig:'cemitério',dias:21},
    {n:'Carlos Saraiva',p:'—',falta:['foto'],quem:'familia',orig:'cemitério',dias:30}
  ],
  emails: [
    {t:'Envio ao fornecedor',d:'placas@graviart.com.br',m:'Carlos Saraiva',s:'erro',e:'SMTP 550: caixa cheia',q:'hoje 09:14'},
    {t:'Senha da família',d:'pedro.saraiva@estouonline.com.br',m:'Carlos Saraiva',s:'enviado',q:'hoje 08:40'},
    {t:'Confirmação de placa',d:'familia.lima@gmail.com',m:'Antônio Ferreira Lima',s:'confirmado',q:'ontem 17:02'},
    {t:'Convite de acesso (parceiro)',d:'contato@valedapaz.com.br',m:'—',s:'enviado',q:'ontem 11:30'},
    {t:'Código de acesso (visitante)',d:'visita@exemplo.com',m:'Helena Martins Costa',s:'enviado',q:'22/10 20:11'},
    {t:'Senha da família',d:'lucia.rocha@hotmail.com',m:'José Pereira Rocha',s:'erro',e:'endereço não existe',q:'21/10 15:50'}
  ],
  leads: [
    {t:'parceiro',n:'Marcos Aurora',emp:'Funerária Aurora',c:'Uberlândia',st:'novo',msg:'Quero oferecer aos nossos clientes.',q:'hoje 07:55'},
    {t:'parceiro',n:'Ana Tupa',emp:'Prefeitura de Tupaciguara',c:'Tupaciguara',st:'em contato',msg:'Dúvida sobre o mapa.',q:'20/10'},
    {t:'familia',n:'Lúcia Rocha',emp:'',c:'Uberlândia',st:'novo',msg:'Homenageado: José Pereira Rocha. Como funciona?',q:'ontem'}
  ],
  caixa: [
    {de:'contato@ — Pedro Saraiva',as:'Proposta para o plano Aurora',q:'hoje 10:02',nl:1},
    {de:'contato@ — Cartório Central',as:'Documentos do sepultamento',q:'ontem',nl:1},
    {de:'contato@ — Google Workspace',as:'Resumo semanal',q:'20/10',nl:0}
  ],
  parceiros: [
    {n:'Funerária Vale da Paz',tel:'(34) 99111-2233',mem:3,at:'ativo hoje'},
    {n:'Funerária Aurora',tel:'(34) 99888-0001',mem:1,at:'nunca acessou'}
  ]
};

const cls = s => ({erro:'red',enviado:'blu',confirmado:'grn',novo:'amb','em contato':'blu'}[s]||'');
const chip = (t,c='') => `<span class="chip ${c}">${t}</span>`;
const $ = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => [...r.querySelectorAll(s)];

function tabs(root){
  const bs = $$('[data-t]',root);
  const go = id => { bs.forEach(b=>b.classList.toggle('on',b.dataset.t===id)); $$('.panel',root.parentNode).forEach(p=>p.classList.toggle('on',p.id===id)); };
  bs.forEach(b=>b.onclick=()=>go(b.dataset.t));
  go(bs[0].dataset.t);
  return go;
}

// Pendências agrupadas por memorial, com filtros.
function pendList(el,{agrupar='memorial',filtro='todos',quem='todos'}={}){
  let L = D.pend.filter(m=>(filtro==='todos'||m.falta.includes(filtro))&&(quem==='todos'||m.quem===quem));
  if(!L.length){el.innerHTML='<p class="mut">Nada pendente com esse filtro.</p>';return}
  if(agrupar==='tipo'){
    const tipos=['contato da família','data de falecimento','foto','história'];
    el.innerHTML=tipos.map(t=>{const x=L.filter(m=>m.falta.includes(t));if(!x.length)return'';
      return `<h3>${t} ${chip(x.length,'amb')}</h3>`+x.map(m=>`<div class="item"><div class="main"><b>${m.n}</b> ${m.ilustre?chip('Ilustre','blu'):''}<div class="mut small">${m.p} · há ${m.dias} dias</div></div><div class="acts"><button class="btn">Abrir ficha</button><button class="btn">Lembrar família</button></div></div>`).join('')}).join('');
    return}
  el.innerHTML=L.map(m=>`<div class="item"><div class="main"><b>${m.n}</b> ${m.ilustre?chip('Ilustre','blu'):''}${m.quem==='familia'?chip('aguardando a família','blu'):''}<div class="small">falta: ${m.falta.map(f=>chip(f,'amb')).join('')}</div><div class="mut small">${m.p} · cadastrado via ${m.orig} · há ${m.dias} dias</div></div><div class="acts"><button class="btn pri">Abrir ficha</button>${m.falta.includes('contato da família')?'':'<button class="btn">Lembrar família</button>'}<button class="btn">Reenviar acesso</button></div></div>`).join('');
}

function emailsList(el,{so=null}={}){
  const L=D.emails.filter(e=>!so||e.s===so);
  el.innerHTML=`<div class="scrollx"><table><tr><th>Tipo</th><th>Memorial</th><th>Para</th><th>Status</th><th>Quando</th><th></th></tr>${L.map(e=>`<tr><td>${e.t}</td><td>${e.m}</td><td class="small">${e.d}</td><td>${chip(e.s,cls(e.s))}${e.e?`<div class="small mut">${e.e}</div>`:''}</td><td class="small">${e.q}</td><td>${e.s==='erro'?'<button class="btn">Reenviar</button>':''}</td></tr>`).join('')}</table></div>`;
}

function leadsList(el,tipo=null){
  const L=D.leads.filter(l=>!tipo||l.t===tipo);
  el.innerHTML=L.map(l=>`<div class="item"><div class="main"><b>${l.n}</b> ${l.emp?'· '+l.emp:''} ${chip(l.st,cls(l.st))} ${chip(l.t,'')}<div class="small">${l.msg}</div><div class="mut small">${l.c} · ${l.q}</div></div><div class="acts"><button class="btn">WhatsApp</button><button class="btn">E-mail</button><select><option>${l.st}</option><option>convertido</option><option>descartado</option></select></div></div>`).join('');
}

function fornecedor(el){
  el.innerHTML=`<label>E-mail do fornecedor de placas</label><div class="row"><input value="placas@graviart.com.br" style="min-width:230px"><button class="btn pri">Salvar</button></div><div class="small mut" style="margin-top:6px">Cada QR Code gerado vai pra esse endereço com o PNG anexado.</div><div class="item" style="margin-top:8px"><div class="main"><b>Último envio</b><div class="small">Carlos Saraiva · hoje 09:14 ${chip('erro: caixa cheia','red')}</div></div><div class="acts"><button class="btn">Reenviar</button></div></div>`;
}

function caixa(el){
  el.innerHTML=`<div class="nota">Futuro: lido da caixa contato@ via Google (conta de serviço). Hoje só mostra o desenho.</div>`+D.caixa.map(c=>`<div class="item"><div class="main"><b>${c.as}</b> ${c.nl?chip('não lido','amb'):''}<div class="mut small">${c.de} · ${c.q}</div></div><div class="acts"><button class="btn">Responder</button><button class="btn">Vincular a lead</button></div></div>`).join('');
}

function parceiros(el){
  el.innerHTML=D.parceiros.map(p=>`<div class="item"><div class="main"><b>${p.n}</b> <span class="mut small">· ${p.at} · ${p.mem} memoriais</span><div class="small">${p.tel}</div></div><div class="acts"><button class="btn">WhatsApp</button><button class="btn">Ver contatos das famílias</button></div></div>`).join('');
}

function filtros(el,opts,cb,ini){
  el.innerHTML=opts.map(o=>`<button class="f ${o===ini?'on':''}" data-v="${o}">${o}</button>`).join('');
  $$('button',el).forEach(b=>b.onclick=()=>{$$('button',el).forEach(x=>x.classList.toggle('on',x===b));cb(b.dataset.v)});
}

const cab = (n,titulo,l1,l2,l3) => `<div class="topo"><a class="voltar" href="index.html">← voltar às 4 opções</a><span class="mut small">Wireframe · rascunho · dados fictícios</span></div><div class="ideia"><h1>Opção ${n} — ${titulo}</h1><p><b>Ideia:</b> ${l1}</p><p><b>Vantagem:</b> ${l2}</p><p><b>Risco:</b> ${l3}</p></div>`;
