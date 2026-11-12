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
const ul=l=>[l.lng+X0,Y0-l.lat];
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
for(const [n,z] of [['streets',440],['leads',450],['chips',610],['pins',620]]){ map.createPane(n).style.zIndex=z; }
map.getPane('streets').style.pointerEvents='none'; map.getPane('leads').style.pointerEvents='none';
const INTER=['dragging','touchZoom','scrollWheelZoom','doubleClickZoom','boxZoom','keyboard'];
function lock(v){ INTER.forEach(k=>map[k]&&map[k][v?'disable':'enable']()); root.dataset.lock=v?'1':'0'; }

const byId={}; P.forEach((p,i)=>{ p.i=i; byId[p.id]=p; });
const order=['via-porpora','viale-lombardia','via-teodosio','via-casoretto','piazza-durante','largo-gemito','san-materno','via-accademia','cinema'].filter(i=>byId[i]);
for(const id of order){ const p=byId[id];
  p.poly=L.polygon(p.dom.map(q=>ll(q[0],q[1])),{color:'#1c44ff',weight:1.5,fillColor:'#1c44ff',fillOpacity:.2,className:'gc-dom',bubblingMouseEvents:false}).addTo(map);
  p.poly.on('click',()=>{ if(cur!==p) select(p.id); }); }
/* hotspot labels of the overview (with a leader to the place) */
const hot=L.layerGroup().addTo(map);
const txtL=[];
for(const p of P){ const txt=!desk.matches&&p.labm&&p.labm[2];
  if(txt){ const A=ll(p.anchor[0],p.anchor[1]);
    const ln=L.polyline([A,A],{pane:'leads',color:'#1c44ff',weight:1.2,interactive:false}), dt=L.circleMarker(A,{pane:'leads',radius:2.8,color:'#1c44ff',fillColor:'#1c44ff',fillOpacity:1,weight:0,interactive:false});
    const m=L.marker(A,{pane:'pins',keyboard:false,icon:L.divIcon({className:'gc-hot gc-hot--txt gc-hot--'+txt,iconSize:null,html:`<button class="gc-hot__in" type="button">${esc(p.name)}</button>`})});
    m.on('click',()=>select(p.id)); hot.addLayer(ln); hot.addLayer(dt); hot.addLayer(m); txtL.push({p,A,ln,m,d:p.labm}); continue; }
  if(Math.hypot(p.lab[0]-p.anchor[0],p.lab[1]-p.anchor[1])>30){ hot.addLayer(L.polyline([ll(p.lab[0],p.lab[1]),ll(p.anchor[0],p.anchor[1])],{pane:'leads',color:'#1c44ff',weight:1.5,interactive:false}));
    hot.addLayer(L.circleMarker(ll(p.anchor[0],p.anchor[1]),{pane:'leads',radius:3.5,color:'#1c44ff',fillColor:'#1c44ff',fillOpacity:1,weight:0,interactive:false})); }
  const m=L.marker(ll(p.lab[0],p.lab[1]),{pane:'pins',keyboard:false,icon:L.divIcon({className:'gc-hot',iconSize:null,html:`<button class="gc-hot__in" type="button">${esc(p.name)}</button>`})});
  m.on('click',()=>select(p.id)); hot.addLayer(m); }
function placeTxt(){ if(!txtL.length) return; try{ for(const o of txtL){ const c=map.latLngToContainerPoint(o.A), q=map.containerPointToLatLng(c.add([o.d[0],o.d[1]])); o.m.setLatLng(q); o.ln.setLatLngs([q,o.A]); } }catch(e){} }
map.on('zoomend viewreset resize',placeTxt);
/* in a place: the other places stay visible as hotspots (blue area + name), a click moves there */
const near=L.layerGroup().addTo(map);
for(const p of P){ p.near=L.marker(ll(p.anchor[0],p.anchor[1]),{pane:'pins',keyboard:false,icon:L.divIcon({className:'gc-hot gc-hot--near',iconSize:null,html:`<button class="gc-hot__in" type="button">${esc(p.name)}</button>`})});
  p.near.on('click',()=>select(p.id)); }
function clipPoly(pts,r){ const E=[[0,r[0],1],[0,r[2],-1],[1,r[1],1],[1,r[3],-1]]; let o=pts;
  for(const [ax,v,sg] of E){ const inp=o; o=[]; const ins=q=>sg*(q[ax]-v)>=0;
    for(let i=0;i<inp.length;i++){ const a=inp[i], c=inp[(i+1)%inp.length], ia=ins(a), ic=ins(c);
      if(ia) o.push(a); if(ia!==ic){ const t=(v-a[ax])/(c[ax]-a[ax]); o.push([a[0]+t*(c[0]-a[0]),a[1]+t*(c[1]-a[1])]); } }
    if(o.length<3) return null; }
  return o; }
function centroid(o){ let A=0,cx=0,cy=0; for(let i=0;i<o.length;i++){ const a=o[i], c=o[(i+1)%o.length], k=a[0]*c[1]-c[0]*a[1]; A+=k; cx+=(a[0]+c[0])*k; cy+=(a[1]+c[1])*k; }
  return Math.abs(A)<1e-6?null:[cx/(3*A),cy/(3*A),Math.abs(A)/2]; }
function nearUpdate(){ if(!cur){ near.clearLayers(); return; }
  const sz=map.getSize(), mxp=Math.min(70,sz.x*0.18), myp=28;
  const a=map.containerPointToLatLng([mxp,myp+(desk.matches?0:70)]), c=map.containerPointToLatLng([sz.x-mxp,sz.y-myp]);
  const pa=ul(a), pc=ul(c), r=[Math.min(pa[0],pc[0]),Math.min(pa[1],pc[1]),Math.max(pa[0],pc[0]),Math.max(pa[1],pc[1])];
  const px=Math.abs(map.latLngToContainerPoint(ll(1,0)).x-map.latLngToContainerPoint(ll(0,0)).x);
  for(const p of P){ let ok=false; if(p!==cur&&!(cur.borrow&&cur.borrow.frm===p.id)){ const o=clipPoly(p.dom,r), g=o&&centroid(o);
      if(g&&g[2]*px*px>1400){ p.near.setLatLng(ll(g[0],g[1])); ok=true; } }
    if(ok){ if(!near.hasLayer(p.near)) near.addLayer(p.near); } else if(near.hasLayer(p.near)) near.removeLayer(p.near); } }
/* feature labels written on the map */
const chips=L.layerGroup().addTo(map); const chipList=[];
for(const p of P) p.items.forEach((it,k)=>{ if(!it.chip) return; (it.pts||[]).forEach((pt,pi)=>{ const lab=it.chips?it.chips[pi]:it.chip; if(!lab) return;
  const m=L.marker(ll(pt[0],pt[1]),{pane:'chips',keyboard:false,icon:L.divIcon({className:'gc-chip',iconSize:null,html:`<span class="gc-chip__in">${esc(lab)}</span>`})});
  const tg=(pt[2]||[]).filter(t=>Math.hypot(t[0]-pt[0],t[1]-pt[1])>2); m._ld=[]; if(tg.length){ const dx=tg.reduce((a,t)=>a+t[0],0)/tg.length-pt[0]; m.options.icon.options.className='gc-chip '+(dx<0?'gc-chip--l':'gc-chip--r');
    for(const t of tg){ m._ld.push(L.polyline([ll(pt[0],pt[1]),ll(t[0],t[1])],{pane:'leads',color:'#1c44ff',weight:1.2,interactive:false,opacity:0})); m._ld.push(L.circleMarker(ll(t[0],t[1]),{pane:'leads',radius:2.6,color:'#fff',weight:1,fillColor:'#1c44ff',fillOpacity:0,opacity:0,interactive:false})); } }
  m.on('click',()=>{ if(cur!==p) select(p.id,{fly:false}); focusItem(p,k,pt,true); }); m._gc={p,k,pr:it.pr,t:it.title}; chips.addLayer(m); chipList.push(m); }); });
for(const p of P){ if(!p.label) continue; const m=L.marker(ll(p.anchor[0],p.anchor[1]-16),{pane:'chips',interactive:false,keyboard:false,icon:L.divIcon({className:'gc-chip',iconSize:null,html:`<span class="gc-chip__in">${esc(p.label)}</span>`})}); m._gc={p,k:-9,pr:-1,t:''}; m._ld=[]; chips.addLayer(m); chipList.push(m); }
const streets=L.layerGroup(); const stList=[];
for(const s of D.streets){ const m=L.marker(ll(s.x,s.y),{pane:'streets',interactive:false,keyboard:false,icon:L.divIcon({className:'gc-st',iconSize:null,
    html:`<span class="gc-st__in" style="transform:rotate(${s.a}deg) translate(-50%,-50%)">${esc(s.t)}</span>`})}); m._len=s.len; streets.addLayer(m); stList.push(m); }

/* ---------- state ---------- */
let state='domani', cur=null, selK=-1;
function setState(s){ state=s; root.dataset.state=s; const sw=$('.sw'); sw.setAttribute('aria-checked',s==='oggi'); requestAnimationFrame(()=>cull()); }
$('.sw').addEventListener('click',()=>setState(state==='oggi'?'domani':'oggi'));
function refresh(){ placeTxt();
  const z=map.getZoom(), home=!cur; root.dataset.tier=z<0.7?'mid':'near';
  for(const p of P){ p.poly.setStyle(home||(p.label&&p===cur)?{opacity:.9,fillOpacity:.22,weight:1.5}:p!==cur?{opacity:.75,fillOpacity:.18,weight:1.5}:{opacity:0,fillOpacity:0,weight:1.5}); }
  nearUpdate();
  if(home){ if(!map.hasLayer(hot)) hot.addTo(map); } else if(map.hasLayer(hot)) map.removeLayer(hot);
  if(z>=-1.4){ if(!map.hasLayer(streets)) streets.addTo(map); } else if(map.hasLayer(streets)) map.removeLayer(streets);
  requestAnimationFrame(cull);
}
function cull(){
  const z=map.getZoom(), b=map.getBounds().pad(0.05), taken=[];
  const hit=r=>taken.some(q=>!(r.right<q.left-3||r.left>q.right+3||r.bottom<q.top-1||r.top>q.bottom+1));
  $$('.gc-hot__in').forEach(e=>taken.push(e.getBoundingClientRect()));
  const mine=m=>m._gc.p===cur||!!(cur&&cur.borrow&&m._gc.p.id===cur.borrow.frm&&cur.borrow.titles.includes(m._gc.t));
  const pr=m=>(m._gc.p===cur&&m._gc.k===selK?0:mine(m)?1:2);
  for(const m of [...chipList].sort((a,c)=>pr(a)-pr(c)||a._gc.pr-c._gc.pr)){ const el=m.getElement(); if(!el) continue; const sel=pr(m)===0; el.classList.toggle('is-sel',sel); let on=state!=='oggi';
    if(!on||!cur||!mine(m)||!b.contains(m.getLatLng())) on=false;
    else { const r=el.firstElementChild.getBoundingClientRect(); if(hit(r)&&!sel) on=false; else taken.push(r); }
    el.classList.toggle('is-off',!on); m._ld.forEach(x=>x.setStyle({opacity:on?1:0,fillOpacity:on&&x instanceof L.CircleMarker?1:0})); }
  if(map.hasLayer(streets)) for(const m of stList){ const el=m.getElement(); if(!el) continue; const need=m._len>=900?-1.4:m._len>=350?-0.8:m._len>=160?0:0.6;
    if(z<need||!b.contains(m.getLatLng())){ el.classList.add('is-off'); continue; }
    const r=el.firstElementChild.getBoundingClientRect(); if(hit(r)) el.classList.add('is-off'); else { el.classList.remove('is-off'); taken.push(r); } }
}
map.on('zoomend moveend',refresh);
let homeZ=-3;
function free(){ clearTimeout(limit.t); map.setMaxBounds(BB([X0,Y0,X1,Y1])); map.options.maxBoundsViscosity=0.9; map.setMinZoom(-3); }
function limit(p,wait){ clearTimeout(limit.t); limit.t=setTimeout(()=>{ if(cur!==p) return; const a=p.full||p.view, v=p.view; let b=[Math.min(a[0],v[0]),Math.min(a[1],v[1]),Math.max(a[2],v[2]),Math.max(a[3],v[3])]; const mx=(b[2]-b[0])*0.2+40, my=(b[3]-b[1])*0.2+40; b=[b[0]-mx,b[1]-my,b[2]+mx,b[3]+my];
  map.setMinZoom(Math.min(map.getZoom(),map.getBoundsZoom(BB(b),false))); map.options.maxBoundsViscosity=1; map.setMaxBounds(BB(b)); },wait); }
let flying=false; map.on('movestart',e=>{}); 
function pad(){ if(desk.matches) return {paddingTopLeft:[40,40],paddingBottomRight:[40,40]};
  return {paddingTopLeft:[12,96],paddingBottomRight:[12,12]}; }
function go(b,o={}){ const opt=Object.assign(pad(),{maxZoom:2.25},o);
  flying=true; clearTimeout(go.t); go.t=setTimeout(()=>{ flying=false; },1900);
  if(reduce||o.animate===false) map.fitBounds(BB(b),Object.assign(opt,{animate:false})); else map.flyToBounds(BB(b),Object.assign(opt,{duration:1.4,easeLinearity:.2})); }
const homeB=()=>D.home;

/* ---------- cards ---------- */
function openZoom(src){ const d=$('#zoom'), im=$('img',d); im.src=src; im.classList.remove('is-big'); d.showModal(); history.pushState({gcZoom:1},'',location.href); }
function home(o={}){ free(); if(state!=='domani') setState('domani'); $('.sec-btn').hidden=true; $('.x-btn').hidden=true; cur=null; selK=-1; root.dataset.mode='home'; lock(true); document.title='Global Casoretto · come potrebbe cambiare il quartiere';
  card.innerHTML=`<p class="micro c-kick">Una visione per il quartiere · Milano, Municipio 3</p><h1 class="c-h1">${esc(D.intro.t)}</h1><p class="c-lede">${esc(D.intro.p)}</p>
<div class="c-key">
<section><h2 class="micro">Più alberi</h2><dl class="c-facts" style="--n:2"><div><dt>380</dt><dd>nuovi alberi (stima)</dd></div><div><dt>580+</dt><dd>alberi esistenti conservati</dd></div></dl>
<p>Nessun albero dei viali viene tolto. Via Porpora, oggi senza alberi lungo la strada, ne riceve circa 190; via Casoretto diventa un filare continuo.</p></section>
<section><h2 class="micro">Più sicurezza</h2><dl class="c-facts" style="--n:2"><div><dt>4 km</dt><dd>di strade a 30 km/h o meno</dd></div><div><dt>5</dt><dd>nuovi semafori pedonali</dd></div></dl>
<p>Ciclabili protette su ogni via ridisegnata, marciapiedi liberi dalle auto, incroci rialzati, due piazze senza traffico.</p></section>
</div>
<ul class="c-list c-list--home">${P.map(p=>`<li><button class="c-row" data-go="${p.id}"><span><strong>${esc(p.title)}</strong><span class="t">${esc(p.tag)}</span></span>${I.next}</button></li>`).join('')}</ul>`;
  nav.innerHTML=`<p class="c-hint">Tocca una zona sulla mappa per entrare.</p>`;
  $$('[data-go]',card).forEach(b=>b.addEventListener('click',()=>select(b.dataset.go)));
  body.scrollTop=0; if(o.hash!==false) history.replaceState(null,'',location.pathname+location.search);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ map.invalidateSize(false); go(homeB(),{animate:o.animate,maxZoom:0}); homeZ=map.getBoundsZoom(BB(homeB()),false,L.point(24,24)); refresh(); })); }
function placeHTML(p){
  const facts=p.facts.map(f=>`<div><dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd></div>`).join('');
  const items=p.items.map((it,k)=>{ const has=it.pts&&it.pts.length; const inner=`<strong>${esc(it.chip||it.title)}</strong><span class="t">${esc(it.text)}</span>`;
    return `<li id="it-${k}">${has?`<button class="c-item" data-k="${k}" aria-label="${esc(it.chip||it.title)}: mostra sulla mappa">${inner}</button>`:`<div class="c-item">${inner}</div>`}</li>`; }).join('');
  const fig=p.sec?`<figure class="c-sketch"><img src="${p.sec.src}" width="${p.sec.w}" height="${p.sec.h}" alt="Sezione della strada, oggi e con il progetto" loading="lazy"><button class="c-zoom" type="button" data-full="${p.sec.full}">Apri a schermo intero</button><figcaption>La sezione della strada: oggi e con il progetto</figcaption></figure>`
    :p.sketch?`<figure class="c-sketch"><img src="${p.sketch.src}" width="${p.sketch.w}" height="${p.sketch.h}" alt="Disegno: ${esc(p.sketch.cap)}" loading="lazy"><button class="c-zoom" type="button" data-full="${p.sketch.full}">Apri a schermo intero</button><figcaption>${esc(p.sketch.cap)}</figcaption></figure>`:'';
  return `<button class="c-back" type="button" data-a="home2">${I.prev}Tutti gli interventi</button>
<p class="micro c-kick">${esc(p.cat)} · ${p.i+1} di ${N}</p>
<h2 class="c-title">${esc(p.title)}</h2><p class="c-tag">${esc(p.tag)}</p>
<div class="c-od"><div class="c-od__row"><span class="micro">Oggi</span><span>${esc(p.oggi)}</span></div><div class="c-od__row"><span class="micro">Domani</span><span>${esc(p.domani)}</span></div></div>
<dl class="c-facts" style="--n:${p.facts.length}">${facts}</dl>
${p.full?`<div class="c-links"><button class="c-link" data-a="full">Vedi tutta la via ${I.out}</button></div>`:''}
<div class="c-lg"><h3 class="micro c-sub">Legenda</h3><div class="lg lg--card">${$('#lg').innerHTML}</div></div>
<h3 class="micro c-sub">Cosa trovi</h3><ul class="c-items">${items}</ul>
${fig}
${p.trees?`<h3 class="micro c-sub">Gli alberi</h3><p class="c-text c-text--s">${esc(p.trees.intro)}</p><ul class="c-items">${p.trees.cards.map(t=>`<li><div class="c-item"><strong>${esc(t.title)}</strong><span class="t">${esc(t.text)}</span></div></li>`).join('')}</ul>`:''}
${p.pdf?`<h3 class="micro c-sub">Scarica</h3><div class="c-links"><a class="c-link" href="${p.pdf}" download><span>Scarica la tavola<small>PDF · ${p.pdfSize}</small></span>${I.dl}</a></div>`:''}`; }
function select(id,o={}){ const p=byId[id]; if(!p) return; free(); cur=p; selK=-1; root.dataset.mode='place'; lock(false);
  card.innerHTML=placeHTML(p); const nx=P[(p.i+1)%N];
  nav.innerHTML=`<button class="btn btn--ghost" data-a="home" aria-label="Torna alla visione d'insieme">${I.out}<span>Insieme</span></button><button class="btn btn--grow" data-a="next"><span class="nx"><small>Prossimo</small>${esc(nx.name)}</span>${I.next}</button>`;
  $('[data-a="home2"]',card).onclick=()=>home();
  $$('.c-zoom',card).forEach(z=>z.addEventListener('click',()=>openZoom(z.dataset.full)));
  $('.x-btn').hidden=false;
  const sb=$('.sec-btn'); sb.hidden=!p.sec||p.id==='largo-gemito'; if(p.sec) sb.onclick=()=>openZoom(p.sec.full);
  $$('button.c-item',card).forEach(b=>b.addEventListener('click',()=>focusItem(p,+b.dataset.k)));
  const fb=$('[data-a="full"]',card); if(fb) fb.onclick=()=>go(p.full,{maxZoom:1});
  $('[data-a="home"]',nav).onclick=()=>home(); $('[data-a="next"]',nav).onclick=()=>select(nx.id);
  body.scrollTop=0; history.replaceState(null,'','#'+id); document.title=p.title+' · Global Casoretto';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ map.invalidateSize(false); if(o.fly!==false) go(p.view,{animate:o.animate}); refresh(); limit(p,(reduce||o.animate===false||o.fly===false)?60:1800); })); }
function focusItem(p,k,pt,fromMap){ const it=p.items[k]; selK=k; setState('domani');
  $$('.c-items li',card).forEach(li=>li.classList.toggle('is-on',li.id==='it-'+k));
  const li=$('#it-'+k,card); if(li&&fromMap) li.scrollIntoView({block:'center',behavior:reduce?'auto':'smooth'});
  if(!fromMap){ pt=pt||it.pts[0]; const r=38; go([pt[0]-r,pt[1]-r,pt[0]+r,pt[1]+r],{maxZoom:2.5}); }
  requestAnimationFrame(cull); }

/* ---------- menu ---------- */
$('.zoom__x').addEventListener('click',()=>$('#zoom').close());
$('#zoom').addEventListener('close',()=>{ if(history.state&&history.state.gcZoom) history.back(); });
addEventListener('popstate',()=>{ const d=$('#zoom'); if(d.open) d.close(); }); $('#zoom img').addEventListener('click',e=>e.currentTarget.classList.toggle('is-big'));
$('.x-btn').addEventListener('click',()=>home());
const menu=$('#menu');

$('.menu-btn').addEventListener('click',()=>{ $('#menu-list').innerHTML=`<ul class="c-list">${P.map(p=>`<li><button class="c-row" data-go="${p.id}"><span><strong>${esc(p.title)}</strong><span class="t">${esc(p.tag)}</span></span>${I.next}</button></li>`).join('')}</ul>`;
  $$('[data-go]',menu).forEach(b=>b.addEventListener('click',()=>{ menu.close(); select(b.dataset.go); })); menu.showModal(); });
$('.menu__close').addEventListener('click',()=>menu.close());
$('.zb-in')?.addEventListener('click',()=>map.zoomIn()); $('.zb-out')?.addEventListener('click',()=>map.zoomOut());
$('.brand').addEventListener('click',e=>{ e.preventDefault(); home(); });
function fitMin(){}
map.fitBounds(BB(homeB()),{animate:false}); fitMin(); chipList.forEach(m=>m._ld.forEach(x=>x.addTo(map))); homeZ=map.getBoundsZoom(BB(homeB()),false,L.point(24,24)); setState('domani');
const h0=location.hash.slice(1); if(byId[h0]) select(h0,{animate:false}); else home({animate:false});
addEventListener('resize',()=>{ map.invalidateSize(); fitMin(); if(!cur) go(homeB(),{animate:false,maxZoom:0}); });
addEventListener('hashchange',()=>{ const h=location.hash.slice(1); if(byId[h]&&byId[h]!==cur) select(h); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>requestAnimationFrame(cull));
})();
