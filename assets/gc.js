/* Global Casoretto · one map, today / tomorrow, guided tour */
(()=>{
const D=window.GC_DATA, $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const [X0,Y0,X1,Y1]=D.extent, P=D.places, N=P.length;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches, desk=matchMedia('(min-width: 900px)');
const root=document.body, app=$('.app'), sheet=$('.sheet'), card=$('#card'), nav=$('#nav'), toast=$('.toast');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I={
  next:'<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  prev:'<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H5M9 5l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x:'<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  pin:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 18s5.5-5.2 5.5-9.5a5.5 5.5 0 10-11 0C4.500 12.8 10 18 10 18z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="10" cy="8.500" r="1.8" fill="currentColor"/></svg>',
  up:'<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 12l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down:'<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  dl:'<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10M5.500 9l4.500 4.500L14.500 9M4 17h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/* ---------- map ---------- */
const ll=(x,y)=>L.latLng(-(y-Y0),x-X0);
const BB=b=>L.latLngBounds(ll(b[0],b[3]),ll(b[2],b[1]));
const map=L.map('map',{crs:L.CRS.Simple,minZoom:-3,maxZoom:3,zoomSnap:0.25,zoomDelta:0.75,wheelPxPerZoomLevel:90,zoomControl:false,attributionControl:false,
  maxBounds:BB([X0,Y0,X1,Y1]),maxBoundsViscosity:0.9,bounceAtZoomLimits:false,keyboard:true});
const retina=L.Browser.retina, off=retina?4:3, ts=retina?128:256; $('#map').style.setProperty('--ts',ts+'px');
const idx={}; for(const k of ['oggi','domani']){ idx[k]={}; for(const z in D.tiles[k]) idx[k][z]=new Set(D.tiles[k][z]); }
const Sparse=L.TileLayer.extend({
  initialize(url,set,o){ this._set=set; L.TileLayer.prototype.initialize.call(this,url,o); },
  createTile(c,done){ const s=this._set[c.z+this.options.zoomOffset];
    if(!s||!s.has(c.x+'_'+c.y)){ const el=document.createElement('div'); requestAnimationFrame(()=>done(null,el)); return el; }
    return L.TileLayer.prototype.createTile.call(this,c,done); } });
const base={tileSize:ts,zoomOffset:off,minZoom:-3,maxZoom:3,keepBuffer:3,updateWhenZooming:false};
L.tileLayer('tiles/oggi/{z}/{x}/{y}.webp',Object.assign({},base,{maxNativeZoom:5-off,minNativeZoom:Math.max(-3,-off)})).addTo(map);
new Sparse('tiles/oggi/{z}/{x}/{y}.webp',idx.oggi,Object.assign({},base,{minZoom:6-off-0.5,maxNativeZoom:6-off})).addTo(map);
new Sparse('tiles/domani/{z}/{x}/{y}.webp',idx.domani,Object.assign({},base,{maxNativeZoom:6-off,minNativeZoom:Math.max(-3,-off),className:'gc-domani'})).addTo(map);
function fitMin(){ map.setMinZoom(Math.max(-3,map.getBoundsZoom(BB([X0,Y0,X1,Y1]),true))); }

for(const [n,z] of [['streets',450],['chips',610],['pins',620],['pulse',630]]){ map.createPane(n).style.zIndex=z; }
map.getPane('streets').style.pointerEvents='none';

/* domains (tap areas + overview highlight) */
const byId={}; P.forEach((p,i)=>{ p.i=i; byId[p.id]=p; });
const order=['via-porpora','viale-lombardia','via-teodosio','via-casoretto','piazza-durante','largo-gemito','san-materno','affaccio','cinema'];
for(const id of order){ const p=byId[id];
  p.poly=L.polygon(p.dom.map(q=>ll(q[0],q[1])),{color:'#1c44ff',weight:1.5,fillColor:'#1c44ff',fillOpacity:.18,className:'gc-dom',bubblingMouseEvents:false}).addTo(map);
  p.poly.on('click',()=>select(p.id,{via:'map'})); }
/* pins */
for(const p of P){
  p.pin=L.marker(ll(p.anchor[0],p.anchor[1]),{pane:'pins',keyboard:false,icon:L.divIcon({className:'gc-pin'+(p.id==='cinema'?' gc-pin--keep':''),iconSize:null,
    html:`<span class="gc-pin__in" role="button" aria-label="${p.n}. ${esc(p.title)}"><span class="badge">${p.n}</span><span class="gc-pin__t">${esc(p.name)}</span></span>`})}).addTo(map);
  p.pin.on('click',()=>select(p.id,{via:'map'}));
}
/* feature chips (appear when you zoom in) */
const chips=L.layerGroup(); const chipList=[];
for(const p of P) p.items.forEach((it,k)=>{ (it.pts||[]).forEach(pt=>{ if(!it.chip) return;
  const m=L.marker(ll(pt[0],pt[1]),{pane:'chips',keyboard:false,icon:L.divIcon({className:'gc-chip',iconSize:null,html:`<span class="gc-chip__in">${esc(it.chip)}</span>`})});
  m.on('click',()=>showItem(p,k,pt)); m._gc={p,k,pr:it.pr,t:it.title}; chips.addLayer(m); chipList.push(m); }); });
/* street names */
const streets=L.layerGroup(); const stList=[];
for(const s of D.streets){ const m=L.marker(ll(s.x,s.y),{pane:'streets',interactive:false,keyboard:false,icon:L.divIcon({className:'gc-st',iconSize:null,
    html:`<span class="gc-st__in" style="transform:rotate(${s.a}deg) translate(-50%,-50%)">${esc(s.t)}</span>`})}); m._len=s.len; streets.addLayer(m); stList.push(m); }
let pulse=null;

/* ---------- state ---------- */
let state='domani', mode='intro', cur=null, item=null, open=false, demo=null, hinted=false;
function setState(s,auto){ state=s; root.dataset.state=s; $$('.toggle button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.s===s));
  $$('.c-od__row',card).forEach(r=>r.classList.toggle('is-on',r.dataset.s===s)); if(!auto) stopDemo(true); syncSheet(); }
function stopDemo(keep){ if(demo){ clearInterval(demo); demo=null; if(!keep&&state!=='domani') setState('domani',true); } }
function startDemo(){ if(reduce) return; let n=0; demo=setInterval(()=>{ setState(state==='oggi'?'domani':'oggi',true); if(++n>=6&&state==='domani') stopDemo(); },2600); }
$$('.toggle button').forEach(b=>b.addEventListener('click',()=>setState(b.dataset.s)));

function tier(){ const z=map.getZoom(); return z<-0.6?'far':z<0.7?'mid':'near'; }
function refresh(){
  const z=map.getZoom(), t=tier(); root.dataset.tier=t;
  for(const p of P){ const sel=p===cur;
    const st= t==='far'?{opacity:.9,fillOpacity:.2,weight:1.5}:{opacity:0,fillOpacity:0,weight:1.5};
    if(sel){ if(t==='far'){ st.fillOpacity=.34; st.weight=2.5; } else if(t==='mid'){ st.opacity=.45; st.weight=1.5; } }
    if(p.id==='cinema'){ st.opacity=.9; st.fillOpacity=Math.max(st.fillOpacity,.18); st.weight=2; }
    p.poly.setStyle(st); const pe=p.pin.getElement(); if(pe){ pe.classList.toggle('is-sel',sel); pe.classList.toggle('is-hid',sel&&t!=='far'&&p.id!=='cinema'); } }
  if(z>=0.7||(cur&&z>=-1.2)){ if(!map.hasLayer(chips)) chips.addTo(map); } else if(map.hasLayer(chips)) map.removeLayer(chips);
  if(z>=-1.6){ if(!map.hasLayer(streets)) streets.addTo(map); } else if(map.hasLayer(streets)) map.removeLayer(streets);
  requestAnimationFrame(cull);
}
function cull(){
  const z=map.getZoom(), b=map.getBounds().pad(0.05), taken=[];
  const hit=r=>taken.some(q=>!(r.right<q.left-3||r.left>q.right+3||r.bottom<q.top-2||r.top>q.bottom+2));
  const pins=[...P].sort((a,c)=>(c===cur)-(a===cur));
  for(const p of pins){ const el=p.pin.getElement(); if(!el) continue; el.classList.remove('no-name'); if(el.classList.contains('is-hid')||(root.dataset.tier==='near'&&p.id!=='cinema')) continue;
    const bd=$('.badge',el).getBoundingClientRect(); const r=$('.gc-pin__in',el).getBoundingClientRect();
    if((hit(r)&&p!==cur)||(cur&&p!==cur&&root.dataset.tier!=='far'&&p.id!=='cinema')){ el.classList.add('no-name'); taken.push(bd); } else taken.push(r); }
  if(map.hasLayer(chips)){ const mine=m=>m._gc.p===cur||!!(cur&&cur.borrow&&m._gc.p.id===cur.borrow.frm&&cur.borrow.titles.includes(m._gc.t));
   const pr=m=>(item&&m._gc.p===cur&&m._gc.k===item.k?0:mine(m)?1:2);
   for(const m of [...chipList].sort((a,c)=>pr(a)-pr(c)||a._gc.pr-c._gc.pr)){ const el=m.getElement(); if(!el) continue; const sel=pr(m)===0; el.classList.toggle('is-sel',sel);
    if(!(z>=0.7||mine(m))||!b.contains(m.getLatLng())){ el.classList.add('is-off'); continue; }
    const r=el.firstElementChild.getBoundingClientRect(); if(hit(r)&&!sel) el.classList.add('is-off'); else { el.classList.remove('is-off'); taken.push(r); } } }
  if(map.hasLayer(streets)) for(const m of stList){ const el=m.getElement(); if(!el) continue; const need=m._len>=900?-1.6:m._len>=350?-0.8:m._len>=160?0:0.6;
    if(z<need||!b.contains(m.getLatLng())){ el.classList.add('is-off'); continue; }
    const r=el.firstElementChild.getBoundingClientRect(); if(hit(r)) el.classList.add('is-off'); else { el.classList.remove('is-off'); taken.push(r); } }
}
map.on('zoomend moveend',refresh);
map.on('zoomend',()=>{ if(!hinted&&mode==='explore'&&tier()!=='near'){ hinted=true; say('Avvicinati per vedere i dettagli'); } });
function say(t){ toast.textContent=t; toast.classList.add('is-on'); clearTimeout(say.t); say.t=setTimeout(()=>toast.classList.remove('is-on'),2600); }

function pad(){ if(desk.matches) return {paddingTopLeft:[48,84],paddingBottomRight:[48,48]};
  const h=Math.min(sheet.getBoundingClientRect().height,innerHeight*0.6); return {paddingTopLeft:[14,62],paddingBottomRight:[14,h+58]}; }
function go(b,o={}){ const opt=Object.assign(pad(),{maxZoom:2.25},o);
  if(reduce||o.animate===false) map.fitBounds(BB(b),Object.assign(opt,{animate:false})); else map.flyToBounds(BB(b),Object.assign(opt,{duration:1.25,easeLinearity:.22})); }

/* ---------- cards ---------- */
function syncSheet(){ requestAnimationFrame(()=>{ app.style.setProperty('--sheet-h',(desk.matches?0:Math.round(sheet.getBoundingClientRect().height))+'px'); }); }
function setOpen(v){ open=v; sheet.classList.toggle('is-open',v); app.classList.toggle('is-open',v); const b=$('.nav-more'); if(b){ b.innerHTML=(v?'Chiudi':'Scopri di più')+(v?I.down:I.up); b.setAttribute('aria-expanded',v); } if(!v) $('.sheet__body').scrollTop=0; syncSheet(); }
$('.sheet__handle').addEventListener('click',()=>setOpen(!open));
function listHTML(){ return `<ul class="c-list">${P.map(p=>`<li><button class="c-row" data-go="${p.id}"><span class="badge">${p.n}</span><span><strong>${esc(p.title)}</strong><span class="t">${esc(p.tag)}</span></span>${I.next}</button></li>`).join('')}</ul>`; }
function bindList(el){ $$('[data-go]',el).forEach(b=>b.addEventListener('click',()=>{ $('#menu').open&&$('#menu').close(); select(b.dataset.go); })); }
function setMode(m){ mode=m; root.dataset.mode=m; }

function intro(){ setMode('intro'); cur=null; item=null; clearPulse();
  card.innerHTML=`<p class="micro c-kick">Una visione per il quartiere · Milano, Municipio 3</p><h1 class="c-h1">${esc(D.intro.t)}</h1><p class="c-lede">${esc(D.intro.p)}</p>${desk.matches?listHTML():''}`; bindList(card);
  nav.innerHTML=`<button class="btn btn--grow" data-a="tour">Inizia il giro ${I.next}</button><button class="btn btn--ghost" data-a="explore">Esplora</button>`;
  $('[data-a="tour"]',nav).onclick=()=>{ setState('domani'); select(P[0].id); }; $('[data-a="explore"]',nav).onclick=()=>{ setState('domani'); explore(); };
  setOpen(false); refresh(); }
function explore(msg){ setMode('explore'); cur=null; item=null; clearPulse(); history.replaceState(null,'','#mappa');
  card.innerHTML= desk.matches||msg ? `${msg?`<h2 class="c-title">${msg.t}</h2><p class="c-text">${msg.p}</p>`:`<h2 class="c-title">I nove luoghi</h2><p class="c-text">Scegli un luogo, oppure muoviti sulla mappa: più ti avvicini, più dettagli compaiono.</p>`}${listHTML()}`
    : `<div class="c-mini"><p><strong>Tocca un numero</strong> sulla mappa, o avvicinati per scoprire i dettagli.</p></div>`;
  nav.innerHTML=`<button class="btn btn--grow" data-a="tour">${msg?'Ricomincia il giro':'Giro guidato'} ${I.next}</button>${desk.matches?'':`<button class="btn btn--ghost" data-a="list">Tutti i luoghi</button>`}`;
  $('[data-a="tour"]',nav).onclick=()=>select(P[0].id); const lb=$('[data-a="list"]',nav); if(lb) lb.onclick=()=>openMenu();
  bindList(card); setOpen(!!msg&&!desk.matches); refresh(); }

function placeHTML(p){
  const facts=p.facts.map(f=>`<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join('');
  const items=p.items.map((it,k)=>{ const has=it.pts&&it.pts.length; const inner=`<strong>${esc(it.title)}</strong><span class="t">${esc(it.text)}</span>${has?`<span class="go">${I.pin}</span>`:''}`;
    return `<li>${has?`<button class="c-item" data-k="${k}" aria-label="${esc(it.title)}: mostra sulla mappa">${inner}</button>`:`<div class="c-item">${inner}</div>`}</li>`; }).join('');
  return `<div class="c-top"><span class="badge">${p.n}</span><span class="micro">${esc(p.cat)} · ${p.i+1} di ${N}</span><button class="c-close" aria-label="Chiudi la scheda e torna alla mappa">${I.x}</button></div>
<h2 class="c-title">${esc(p.title)}</h2><p class="c-tag">${esc(p.tag)}</p>
${p.sketch?`<figure class="c-sketch${p.sketch.peek?' c-sketch--peek':''}"><img src="${p.sketch.src}" width="${p.sketch.w}" height="${p.sketch.h}" alt="Disegno: ${esc(p.sketch.cap)}"><figcaption>${esc(p.sketch.cap)}</figcaption></figure>`:''}
<div class="c-od"><button class="c-od__row" data-s="oggi" aria-label="Mostra oggi sulla mappa"><span class="micro">Oggi</span><span>${esc(p.oggi)}</span></button>
<button class="c-od__row" data-s="domani" aria-label="Mostra domani sulla mappa"><span class="micro">Domani</span><span>${esc(p.domani)}</span></button></div>
<div class="c-more"><dl class="c-facts" style="--n:${p.facts.length}">${facts}</dl>
<h3 class="micro c-sub">Cosa cambia</h3><ul class="c-items">${items}</ul>
${p.full?`<div class="c-links"><button class="c-link" data-a="full">Vedi tutta la via sulla mappa ${I.next}</button></div>`:''}
<h3 class="micro c-sub">Per approfondire</h3><div class="c-links">
<a class="c-link" href="${p.id}/"><span>Tavola tecnica<small>Pianta completa, sezione e legenda</small></span>${I.next}</a>
<a class="c-link" href="${p.pdf}" download><span>Scarica la tavola<small>PDF · ${p.pdfSize}</small></span>${I.dl}</a></div></div>`; }
function navHTML(p){ const last=p.i===N-1;
  return `<button class="btn btn--ghost btn--icon" data-a="prev" aria-label="Luogo precedente" ${p.i===0?'disabled':''}>${I.prev}</button>
<button class="btn btn--ghost btn--grow nav-more" data-a="more" aria-expanded="false">Scopri di più${I.up}</button>
<span class="dots" aria-hidden="true">${P.map((q,i)=>`<i class="${i===p.i?'on':''}"></i>`).join('')}</span>
<button class="btn" data-a="next">${last?'Fine':'Avanti'} ${I.next}</button>`; }
function select(id,o={}){ const p=byId[id]; if(!p) return; stopDemo(); setMode('place'); cur=p; item=null; clearPulse();
  card.innerHTML=placeHTML(p); nav.innerHTML=navHTML(p);
  $('.c-close',card).onclick=()=>explore(); $$('.c-od__row',card).forEach(r=>r.addEventListener('click',()=>setState(r.dataset.s)));
  $$('button.c-item',card).forEach(b=>b.addEventListener('click',()=>showItem(p,+b.dataset.k)));
  const fb=$('[data-a="full"]',card); if(fb) fb.onclick=()=>{ setOpen(false); requestAnimationFrame(()=>go(p.full,{maxZoom:1})); };
  $('[data-a="prev"]',nav).onclick=()=>select(P[p.i-1].id); $('[data-a="more"]',nav).onclick=()=>setOpen(!open);
  $('[data-a="next"]',nav).onclick=()=>{ if(p.i<N-1) select(P[p.i+1].id); else { explore({t:'Hai visto tutte le nove idee',p:'Ora la mappa è tua: avvicinati per scoprire i dettagli, o riapri un luogo.'}); go(D.home[desk.matches?'desk':'mob']); } };
  setState(state,true); setOpen(false); history.replaceState(null,'','#'+id); document.title=p.title+' · Global Casoretto';
  requestAnimationFrame(()=>{ syncSheet(); requestAnimationFrame(()=>{ if(o.fly!==false) go(p.view,{animate:o.animate}); refresh(); }); }); }
function clearPulse(){ if(pulse){ map.removeLayer(pulse); pulse=null; } }
function showItem(p,k,pt){ if(cur!==p) { select(p.id,{fly:false}); }
  const it=p.items[k]; pt=pt||it.pts[0]; item={k}; setMode('item'); setState('domani');
  card.innerHTML=`<button class="c-back" data-a="back">${I.prev}${esc(p.title)}</button><h2 class="c-title">${esc(it.title)}</h2><p class="c-text">${esc(it.text)}</p>`;
  nav.innerHTML=''; $('[data-a="back"]',card).onclick=()=>select(p.id);
  setOpen(false); clearPulse(); if(!it.chip) pulse=L.marker(ll(pt[0],pt[1]),{pane:'pulse',interactive:false,icon:L.divIcon({className:'gc-pulse',iconSize:null,html:'<span class="gc-pulse__in"></span>'})}).addTo(map);
  requestAnimationFrame(()=>{ syncSheet(); requestAnimationFrame(()=>{ const r=42; go([pt[0]-r,pt[1]-r,pt[0]+r,pt[1]+r],{maxZoom:2.5}); refresh(); }); }); }

/* ---------- menu ---------- */
const menu=$('#menu');
function openMenu(){ $('#menu-list').innerHTML=listHTML(); bindList(menu); menu.showModal(); }
$('.menu-btn').addEventListener('click',openMenu); $('.menu__close').addEventListener('click',()=>menu.close());
$('.zb-in')?.addEventListener('click',()=>map.zoomIn()); $('.zb-out')?.addEventListener('click',()=>map.zoomOut());
$('.home-btn').addEventListener('click',()=>{ go(D.home[desk.matches?'desk':'mob']); });
$('.brand').addEventListener('click',e=>{ e.preventDefault(); intro(); go(D.home[desk.matches?'desk':'mob']); history.replaceState(null,'',location.pathname); });

/* ---------- start ---------- */
function start(){ map.fitBounds(BB(D.home[desk.matches?'desk':'mob']),{animate:false}); fitMin();
  const h=location.hash.slice(1);
  if(byId[h]){ select(h,{animate:false}); }
  else { intro(); requestAnimationFrame(()=>{ syncSheet(); requestAnimationFrame(()=>{ go(D.home[desk.matches?'desk':'mob'],{animate:false}); refresh(); if(h!=='mappa') startDemo(); else explore(); }); }); }
}
['pointerdown','wheel','keydown'].forEach(t=>$('#map').addEventListener(t,()=>stopDemo(),{passive:true}));
addEventListener('resize',()=>{ map.invalidateSize(); fitMin(); syncSheet(); });
addEventListener('hashchange',()=>{ const h=location.hash.slice(1); if(byId[h]&&byId[h]!==cur) select(h); });
new ResizeObserver(syncSheet).observe(sheet);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>requestAnimationFrame(cull));
start();
})();
