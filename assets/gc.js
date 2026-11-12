/* Global Casoretto · overview with hotspots -> zoom into a place, map + full card side by side */
(()=>{
const D=window.GC_DATA, $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const [X0,Y0,X1,Y1]=D.extent, P=D.places, N=P.length;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches, desk=matchMedia('(min-width: 900px)');
const root=document.body, app=$('.app'), sheet=$('.sheet'), body=$('.sheet__body'), card=$('#card'), nav=$('#nav');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I={
  next:'<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  prev:'<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H5M9 5l-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  out:'<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8V3h5M17 12v5h-5M12 3h5v5M8 17H3v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  dl:'<svg class="i" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v10M5.5 9l4.5 4.5L14.5 9M4 17h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
/* ---------- map ---------- */
const ll=(x,y)=>L.latLng(-(y-Y0),x-X0);
const BB=b=>L.latLngBounds(ll(b[0],b[3]),ll(b[2],b[1]));
const map=L.map('map',{crs:L.CRS.Simple,minZoom:-3,maxZoom:3,zoomSnap:0.25,zoomDelta:0.75,wheelPxPerZoomLevel:90,zoomControl:false,attributionControl:false,
  maxBounds:BB([X0,Y0,X1,Y1]),maxBoundsViscosity:0.9,bounceAtZoomLimits:false});
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
for(const [n,z] of [['leads',440],['streets',450],['chips',610],['pins',620]]){ map.createPane(n).style.zIndex=z; }
map.getPane('streets').style.pointerEvents='none'; map.getPane('leads').style.pointerEvents='none';
const INTER=['dragging','touchZoom','scrollWheelZoom','doubleClickZoom','boxZoom','keyboard'];
function lock(v){ INTER.forEach(k=>map[k]&&map[k][v?'disable':'enable']()); root.dataset.lock=v?'1':'0'; }

const byId={}; P.forEach((p,i)=>{ p.i=i; byId[p.id]=p; });
const order=['via-porpora','viale-lombardia','via-teodosio','via-casoretto','piazza-durante','largo-gemito','san-materno','cinema'].filter(i=>byId[i]);
for(const id of order){ const p=byId[id];
  p.poly=L.polygon(p.dom.map(q=>ll(q[0],q[1])),{color:'#1c44ff',weight:1.5,fillColor:'#1c44ff',fillOpacity:.2,className:'gc-dom',bubblingMouseEvents:false}).addTo(map);
  p.poly.on('click',()=>{ if(cur!==p) select(p.id); }); }
/* hotspot labels of the overview (with a leader to the place) */
const hot=L.layerGroup().addTo(map);
for(const p of P){
  if(Math.hypot(p.lab[0]-p.anchor[0],p.lab[1]-p.anchor[1])>30){ hot.addLayer(L.polyline([ll(p.lab[0],p.lab[1]),ll(p.anchor[0],p.anchor[1])],{pane:'leads',color:'#1c44ff',weight:1.5,interactive:false}));
    hot.addLayer(L.circleMarker(ll(p.anchor[0],p.anchor[1]),{pane:'leads',radius:3.5,color:'#1c44ff',fillColor:'#1c44ff',fillOpacity:1,weight:0,interactive:false})); }
  const m=L.marker(ll(p.lab[0],p.lab[1]),{pane:'pins',keyboard:false,icon:L.divIcon({className:'gc-hot',iconSize:null,html:`<button class="gc-hot__in" type="button">${esc(p.name)}</button>`})});
  m.on('click',()=>select(p.id)); hot.addLayer(m); }
/* feature labels written on the map */
const chips=L.layerGroup().addTo(map); const chipList=[];
for(const p of P) p.items.forEach((it,k)=>{ if(!it.chip) return; (it.pts||[]).forEach((pt,pi)=>{ const lab=it.chips?it.chips[pi]:it.chip; if(!lab) return;
  const m=L.marker(ll(pt[0],pt[1]),{pane:'chips',keyboard:false,icon:L.divIcon({className:'gc-chip',iconSize:null,html:`<span class="gc-chip__in">${esc(lab)}</span>`})});
  m.on('click',()=>{ if(cur!==p) select(p.id,{fly:false}); focusItem(p,k,pt,true); }); m._gc={p,k,pr:it.pr,t:it.title}; chips.addLayer(m); chipList.push(m); }); });
const streets=L.layerGroup(); const stList=[];
for(const s of D.streets){ const m=L.marker(ll(s.x,s.y),{pane:'streets',interactive:false,keyboard:false,icon:L.divIcon({className:'gc-st',iconSize:null,
    html:`<span class="gc-st__in" style="transform:rotate(${s.a}deg) translate(-50%,-50%)">${esc(s.t)}</span>`})}); m._len=s.len; streets.addLayer(m); stList.push(m); }

/* ---------- state ---------- */
let state='domani', cur=null, selK=-1;
function setState(s){ state=s; root.dataset.state=s; const sw=$('.sw'); sw.setAttribute('aria-checked',s==='oggi'); }
$('.sw').addEventListener('click',()=>setState(state==='oggi'?'domani':'oggi'));
function refresh(){
  const z=map.getZoom(), home=!cur; root.dataset.tier=z<0.7?'mid':'near';
  for(const p of P){ p.poly.setStyle(home?{opacity:.9,fillOpacity:.22,weight:1.5}:{opacity:0,fillOpacity:0,weight:1.5}); }
  if(home){ if(!map.hasLayer(hot)) hot.addTo(map); } else if(map.hasLayer(hot)) map.removeLayer(hot);
  if(z>=-1.4){ if(!map.hasLayer(streets)) streets.addTo(map); } else if(map.hasLayer(streets)) map.removeLayer(streets);
  requestAnimationFrame(cull);
}
function cull(){
  const z=map.getZoom(), b=map.getBounds().pad(0.05), taken=[];
  const hit=r=>taken.some(q=>!(r.right<q.left-3||r.left>q.right+3||r.bottom<q.top-1||r.top>q.bottom+1));
  if(!cur) $$('.gc-hot__in').forEach(e=>taken.push(e.getBoundingClientRect()));
  const mine=m=>m._gc.p===cur||!!(cur&&cur.borrow&&m._gc.p.id===cur.borrow.frm&&cur.borrow.titles.includes(m._gc.t));
  const pr=m=>(m._gc.p===cur&&m._gc.k===selK?0:mine(m)?1:2);
  for(const m of [...chipList].sort((a,c)=>pr(a)-pr(c)||a._gc.pr-c._gc.pr)){ const el=m.getElement(); if(!el) continue; const sel=pr(m)===0; el.classList.toggle('is-sel',sel);
    if(!cur||!(z>=0.7||mine(m))||!b.contains(m.getLatLng())){ el.classList.add('is-off'); continue; }
    const r=el.firstElementChild.getBoundingClientRect(); if(hit(r)&&!sel) el.classList.add('is-off'); else { el.classList.remove('is-off'); taken.push(r); } }
  if(map.hasLayer(streets)) for(const m of stList){ const el=m.getElement(); if(!el) continue; const need=m._len>=900?-1.4:m._len>=350?-0.8:m._len>=160?0:0.6;
    if(z<need||!b.contains(m.getLatLng())){ el.classList.add('is-off'); continue; }
    const r=el.firstElementChild.getBoundingClientRect(); if(hit(r)) el.classList.add('is-off'); else { el.classList.remove('is-off'); taken.push(r); } }
}
map.on('zoomend moveend',refresh);
let homeZ=-3; map.on('zoomend',()=>{ if(cur&&!flying&&map.getZoom()<=homeZ+0.5) home(); });
let flying=false; map.on('movestart',e=>{}); 
function pad(){ if(desk.matches) return {paddingTopLeft:[40,40],paddingBottomRight:[40,40]};
  const h=sheet.getBoundingClientRect().height; return {paddingTopLeft:[12,60],paddingBottomRight:[12,h+12]}; }
function go(b,o={}){ const opt=Object.assign(pad(),{maxZoom:2.25},o);
  flying=true; clearTimeout(go.t); go.t=setTimeout(()=>{ flying=false; },1900);
  if(reduce||o.animate===false) map.fitBounds(BB(b),Object.assign(opt,{animate:false})); else map.flyToBounds(BB(b),Object.assign(opt,{duration:1.4,easeLinearity:.2})); }
const homeB=()=>D.home;

/* ---------- cards ---------- */
function home(o={}){ cur=null; selK=-1; root.dataset.mode='home'; lock(true); document.title='Global Casoretto · come potrebbe cambiare il quartiere';
  card.innerHTML=`<p class="micro c-kick">Una visione per il quartiere · Milano, Municipio 3</p><h1 class="c-h1">${esc(D.intro.t)}</h1><p class="c-lede">${esc(D.intro.p)}</p>
<ul class="c-list c-list--home">${P.map(p=>`<li><button class="c-row" data-go="${p.id}"><span><strong>${esc(p.title)}</strong><span class="t">${esc(p.tag)}</span></span>${I.next}</button></li>`).join('')}</ul>`;
  nav.innerHTML=`<p class="c-hint">Tocca una zona sulla mappa per entrare.</p>`;
  $$('[data-go]',card).forEach(b=>b.addEventListener('click',()=>select(b.dataset.go)));
  body.scrollTop=0; if(o.hash!==false) history.replaceState(null,'',location.pathname+location.search);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ go(homeB(),{animate:o.animate,maxZoom:0}); homeZ=map.getBoundsZoom(BB(homeB()),false,L.point(24,24)); refresh(); })); }
function placeHTML(p){
  const facts=p.facts.map(f=>`<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join('');
  const items=p.items.map((it,k)=>{ const has=it.pts&&it.pts.length; const inner=`<strong>${esc(it.chip||it.title)}</strong><span class="t">${esc(it.text)}</span>`;
    return `<li id="it-${k}">${has?`<button class="c-item" data-k="${k}" aria-label="${esc(it.chip||it.title)}: mostra sulla mappa">${inner}</button>`:`<div class="c-item">${inner}</div>`}</li>`; }).join('');
  const fig=p.sec?`<figure class="c-sketch"><img src="${p.sec.src}" width="${p.sec.w}" height="${p.sec.h}" alt="Sezione della strada, oggi e con il progetto" loading="lazy"><figcaption>La sezione della strada: oggi e con il progetto</figcaption></figure>`
    :p.sketch?`<figure class="c-sketch"><img src="${p.sketch.src}" width="${p.sketch.w}" height="${p.sketch.h}" alt="Disegno: ${esc(p.sketch.cap)}" loading="lazy"><figcaption>${esc(p.sketch.cap)}</figcaption></figure>`:'';
  return `<p class="micro c-kick">${esc(p.cat)} · ${p.i+1} di ${N}</p>
<h2 class="c-title">${esc(p.title)}</h2><p class="c-tag">${esc(p.tag)}</p>
<div class="c-od"><div class="c-od__row"><span class="micro">Oggi</span><span>${esc(p.oggi)}</span></div><div class="c-od__row"><span class="micro">Domani</span><span>${esc(p.domani)}</span></div></div>
<dl class="c-facts" style="--n:${p.facts.length}">${facts}</dl>
${p.full?`<div class="c-links"><button class="c-link" data-a="full">Vedi tutta la via ${I.out}</button></div>`:''}
<h3 class="micro c-sub">Cosa trovi</h3><ul class="c-items">${items}</ul>
${fig}
${p.trees?`<h3 class="micro c-sub">Gli alberi</h3><p class="c-text c-text--s">${esc(p.trees.intro)}</p><ul class="c-items">${p.trees.cards.map(t=>`<li><div class="c-item"><strong>${esc(t.title)}</strong><span class="t">${esc(t.text)}</span></div></li>`).join('')}</ul>`:''}
<h3 class="micro c-sub">Per approfondire</h3><div class="c-links">${p.extra?`<a class="c-link" href="${p.extra.href}"><span>${esc(p.extra.t)}<small>${esc(p.extra.s)}</small></span>${I.next}</a>`:''}
<a class="c-link" href="${p.id}/"><span>Tavola tecnica<small>Pianta completa, sezione e legenda</small></span>${I.next}</a>
<a class="c-link" href="${p.pdf}" download><span>Scarica la tavola<small>PDF · ${p.pdfSize}</small></span>${I.dl}</a></div>`; }
function select(id,o={}){ const p=byId[id]; if(!p) return; cur=p; selK=-1; root.dataset.mode='place'; lock(false);
  card.innerHTML=placeHTML(p); const nx=P[(p.i+1)%N];
  nav.innerHTML=`<button class="btn btn--ghost" data-a="home" aria-label="Torna alla visione d'insieme">${I.out}<span>Insieme</span></button><button class="btn btn--grow" data-a="next"><span class="nx"><small>Prossimo</small>${esc(nx.name)}</span>${I.next}</button>`;
  $$('button.c-item',card).forEach(b=>b.addEventListener('click',()=>focusItem(p,+b.dataset.k)));
  const fb=$('[data-a="full"]',card); if(fb) fb.onclick=()=>go(p.full,{maxZoom:1});
  $('[data-a="home"]',nav).onclick=()=>home(); $('[data-a="next"]',nav).onclick=()=>select(nx.id);
  body.scrollTop=0; history.replaceState(null,'','#'+id); document.title=p.title+' · Global Casoretto';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(o.fly!==false) go(p.view,{animate:o.animate}); refresh(); })); }
function focusItem(p,k,pt,fromMap){ const it=p.items[k]; selK=k; setState('domani');
  $$('.c-items li',card).forEach(li=>li.classList.toggle('is-on',li.id==='it-'+k));
  const li=$('#it-'+k,card); if(li&&fromMap) li.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'});
  if(!fromMap){ pt=pt||it.pts[0]; const r=38; go([pt[0]-r,pt[1]-r,pt[0]+r,pt[1]+r],{maxZoom:2.5}); }
  requestAnimationFrame(cull); }

/* ---------- menu ---------- */
const menu=$('#menu');
$('.menu-btn').addEventListener('click',()=>{ $('#menu-list').innerHTML=`<ul class="c-list">${P.map(p=>`<li><button class="c-row" data-go="${p.id}"><span><strong>${esc(p.title)}</strong><span class="t">${esc(p.tag)}</span></span>${I.next}</button></li>`).join('')}</ul>`;
  $$('[data-go]',menu).forEach(b=>b.addEventListener('click',()=>{ menu.close(); select(b.dataset.go); })); menu.showModal(); });
$('.menu__close').addEventListener('click',()=>menu.close());
$('.zb-in')?.addEventListener('click',()=>map.zoomIn()); $('.zb-out')?.addEventListener('click',()=>map.zoomOut());
$('.brand').addEventListener('click',e=>{ e.preventDefault(); home(); });
function fitMin(){ map.setMinZoom(Math.max(-3,map.getBoundsZoom(BB([X0,Y0,X1,Y1]),false))); }
map.fitBounds(BB(homeB()),{animate:false}); fitMin(); homeZ=map.getBoundsZoom(BB(homeB()),false,L.point(24,24)); setState('domani');
const h0=location.hash.slice(1); if(byId[h0]) select(h0,{animate:false}); else home({animate:false});
addEventListener('resize',()=>{ map.invalidateSize(); fitMin(); if(!cur) go(homeB(),{animate:false,maxZoom:0}); });
addEventListener('hashchange',()=>{ const h=location.hash.slice(1); if(byId[h]&&byId[h]!==cur) select(h); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>requestAnimationFrame(cull));
})();
