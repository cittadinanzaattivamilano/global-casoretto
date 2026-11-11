/* Global Casoretto · interactions (no dependencies) */
(()=>{
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- pan & zoom ---------- */
class PanZoom{
  constructor(vp,layer,o={}){
    this.vp=vp; this.layer=layer; this.o=Object.assign({coop:false,wheel:'always',maxF:8,onChange:()=>{},onTouch1:()=>{}},o);
    this.lw=+layer.dataset.w; this.lh=+layer.dataset.h; layer.style.width=this.lw+'px'; layer.style.height=this.lh+'px';
    this.k=1; this.x=0; this.y=0; this.min=1; this.max=8; this.pts=new Map(); this.moved=false; this.raf=0;
    vp.addEventListener('pointerdown',e=>this.down(e));
    vp.addEventListener('pointermove',e=>this.move(e));
    ['pointerup','pointercancel','lostpointercapture'].forEach(t=>vp.addEventListener(t,e=>this.up(e)));
    vp.addEventListener('wheel',e=>this.wheel(e),{passive:false});
    vp.addEventListener('click',e=>{ if(this.moved){ e.preventDefault(); e.stopPropagation(); } },true);
    vp.addEventListener('dblclick',e=>{ const r=vp.getBoundingClientRect(); this.zoomAt(e.clientX-r.left,e.clientY-r.top,this.k*2,true); });
    new ResizeObserver(()=>{ const z=this.zoomed(); const cx=(this.vp.clientWidth/2-this.x)/this.k, cy=(this.vp.clientHeight/2-this.y)/this.k;
      this.limits(); if(z) this.focus(cx,cy,this.k,false); else this.reset(false); }).observe(vp);
  }
  fit(){ return Math.min(this.vp.clientWidth/this.lw,this.vp.clientHeight/this.lh); }
  limits(){ this.min=this.fit(); this.max=this.min*this.o.maxF; }
  zoomed(){ return this.k>this.min*1.02; }
  reset(anim){ this.limits(); this.k=this.min; this.x=(this.vp.clientWidth-this.lw*this.k)/2; this.y=(this.vp.clientHeight-this.lh*this.k)/2; this.apply(anim); }
  clamp(){ const vw=this.vp.clientWidth, vh=this.vp.clientHeight, sw=this.lw*this.k, sh=this.lh*this.k;
    this.x= sw<=vw ? (vw-sw)/2 : Math.min(0,Math.max(vw-sw,this.x));
    this.y= sh<=vh ? (vh-sh)/2 : Math.min(0,Math.max(vh-sh,this.y)); }
  apply(anim){
    this.clamp(); const L=this.layer;
    L.style.transition= anim&&!reduce ? 'transform .5s cubic-bezier(.2,.75,.15,1)' : 'none';
    L.style.transform=`translate3d(${this.x}px,${this.y}px,0) scale(${this.k})`; L.style.setProperty('--k',this.k);
    const z=this.zoomed(); this.vp.classList.toggle('is-zoomed',z); this.vp.closest('.map')?.classList.toggle('is-zoomed',z);
    if(this.o.coop) this.vp.style.touchAction= z ? 'none' : 'pan-x pan-y';
    if(anim&&!reduce){ const t0=performance.now(); const tick=()=>{ this.o.onChange(this,this.cur()); if(performance.now()-t0<560) this.raf=requestAnimationFrame(tick); else this.o.onChange(this); };
      cancelAnimationFrame(this.raf); this.raf=requestAnimationFrame(tick); }
    else this.o.onChange(this);
  }
  cur(){ const m=new DOMMatrixReadOnly(getComputedStyle(this.layer).transform); return {k:m.a,x:m.e,y:m.f}; }
  zoomAt(cx,cy,k,anim){ k=Math.max(this.min,Math.min(this.max,k)); const f=k/this.k; this.x=cx-(cx-this.x)*f; this.y=cy-(cy-this.y)*f; this.k=k; this.apply(anim); }
  zoomBy(f){ this.zoomAt(this.vp.clientWidth/2,this.vp.clientHeight/2,this.k*f,true); }
  focus(ux,uy,k,anim){ this.k=Math.max(this.min,Math.min(this.max,k)); this.x=this.vp.clientWidth/2-ux*this.k; this.y=this.vp.clientHeight/2-uy*this.k; this.apply(anim); }
  down(e){
    if(e.pointerType==='mouse'&&e.button!==0) return;
    this.pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); if(this.pts.size===1){ this.start={x:e.clientX,y:e.clientY}; this.moved=false; }
    if(this.pts.size===2){ this.moved=true; try{ for(const id of this.pts.keys()) this.vp.setPointerCapture(id); }catch(_){} }
  }
  move(e){
    const p=this.pts.get(e.pointerId); if(!p) return;
    const nx=e.clientX, ny=e.clientY;
    if(this.pts.size===1){
      if(this.o.coop && e.pointerType==='touch' && !this.zoomed()){ if(Math.hypot(nx-this.start.x,ny-this.start.y)>8) this.o.onTouch1(); p.x=nx; p.y=ny; return; }
      if(!this.moved && Math.hypot(nx-this.start.x,ny-this.start.y)>6){ this.moved=true; this.vp.classList.add('is-drag'); try{ this.vp.setPointerCapture(e.pointerId); }catch(_){} }
      if(this.moved){ this.x+=nx-p.x; this.y+=ny-p.y; this.apply(false); }
    } else if(this.pts.size===2){
      const [a,b]=[...this.pts.values()]; const r=this.vp.getBoundingClientRect();
      const c0={x:(a.x+b.x)/2-r.left,y:(a.y+b.y)/2-r.top}, d0=Math.hypot(a.x-b.x,a.y-b.y)||1;
      p.x=nx; p.y=ny;
      const [a2,b2]=[...this.pts.values()]; const c1={x:(a2.x+b2.x)/2-r.left,y:(a2.y+b2.y)/2-r.top}, d1=Math.hypot(a2.x-b2.x,a2.y-b2.y)||1;
      const k=Math.max(this.min,Math.min(this.max,this.k*d1/d0)), f=k/this.k;
      this.x=c1.x-(c0.x-this.x)*f; this.y=c1.y-(c0.y-this.y)*f; this.k=k; this.apply(false); return;
    }
    p.x=nx; p.y=ny;
  }
  up(e){ if(!this.pts.has(e.pointerId)) return; this.pts.delete(e.pointerId); if(!this.pts.size) this.vp.classList.remove('is-drag'); }
  wheel(e){
    if(this.o.wheel==='ctrl' && !(e.ctrlKey||e.metaKey)) return;
    e.preventDefault(); const r=this.vp.getBoundingClientRect(); const f=Math.exp(-e.deltaY*(e.ctrlKey?0.01:0.0022));
    this.zoomAt(e.clientX-r.left,e.clientY-r.top,this.k*f,false);
  }
}

/* ---------- view transition direction ---------- */
const order=u=>{ try{ const p=new URL(u,location.href).pathname.replace(/index\.html$/,'').replace(/\/$/,''); const id=p.split('/').pop();
  const ids=(window.GC_ORDER||[]); const i=ids.indexOf(id); return i<0?0:i+1; }catch(_){ return 0; } };
const vtType=(from,to)=>{ const a=order(from), b=order(to); if(a===0&&b>0) return 'deeper'; if(b===0&&a>0) return 'up'; return b>a?'next':'prev'; };
addEventListener('pageswap',e=>{ if(!e.viewTransition) return; const to=e.activation?.entry?.url; if(to) e.viewTransition.types.add(vtType(location.href,to)); });
addEventListener('pagereveal',e=>{ if(!e.viewTransition) return; const from=window.navigation?.activation?.from?.url; if(from) e.viewTransition.types.add(vtType(from,location.href));
  // coming back to the map from a detail opened by a pin: morph into the pin, not the card
  if(document.body.dataset.page==='home'){ try{ const via=sessionStorage.getItem('gc-via'), id=sessionStorage.getItem('gc-id');
    if(via==='pin'&&id&&order(from)>0){ const c=$(`.card[data-iv="${id}"]`); c&&$$('[style*="view-transition-name"]',c).forEach(x=>x.style.viewTransitionName='none');
      const pb=$(`.pin[data-iv="${id}"] .badge`); pb&&(pb.style.viewTransitionName='badge-'+id); } }catch(_){} } });

/* ---------- reveal on scroll ---------- */
if('IntersectionObserver' in window && !reduce){
  const io=new IntersectionObserver(es=>es.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target);} }),{rootMargin:'0px 0px -8% 0px'});
  $$('.rv').forEach(el=>{ const r=el.getBoundingClientRect(); if(r.top<innerHeight) el.classList.add('in'); else io.observe(el); });
} else $$('.rv').forEach(el=>el.classList.add('in'));

/* ---------- hover sync (map <-> cards) ---------- */
function hot(id,on){ $$(`[data-iv="${id}"]`).forEach(el=>el.classList.toggle('is-hot',on)); }
$$('[data-iv]').forEach(el=>{ el.addEventListener('pointerenter',e=>{ if(e.pointerType==='mouse') hot(el.dataset.iv,true); });
  el.addEventListener('pointerleave',()=>hot(el.dataset.iv,false)); el.addEventListener('focus',()=>hot(el.dataset.iv,true)); el.addEventListener('blur',()=>hot(el.dataset.iv,false)); });

/* ---------- home map ---------- */
const mapVp=$('#map');
if(mapVp){
  const layer=$('.map__layer',mapVp), pins=$$('.pin',mapVp), labs=$$('.mlab',mapVp), leads=$('.map__leads',mapVp), hint=$('.map__hint');
  let hintT=0; const showHint=()=>{ if(!hint) return; hint.classList.add('is-on'); clearTimeout(hintT); hintT=setTimeout(()=>hint.classList.remove('is-on'),1600); };
  const P=pins.map(p=>({el:p,ux:+p.dataset.x,uy:+p.dataset.y,dx:0,dy:0}));
  const L=labs.map(l=>({el:l,ux:+l.dataset.x,uy:+l.dataset.y,a:+l.dataset.a,min:+l.dataset.min||0,anc:l.dataset.anc||'middle'}));
  const draw=(pz,c)=>{
    const {k,x,y}=c||pz; const vw=mapVp.clientWidth, vh=mapVp.clientHeight;
    const D=mapVp.clientWidth<720?33:38;
    const s=P.map(p=>({p,ax:x+p.ux*k,ay:y+p.uy*k,sx:x+p.ux*k,sy:y+p.uy*k}));
    for(let it=0;it<80;it++){ for(let i=0;i<s.length;i++) for(let j=i+1;j<s.length;j++){ const A=s[i],B=s[j]; let dx=B.sx-A.sx, dy=B.sy-A.sy; let d=Math.hypot(dx,dy);
        if(d<D){ if(d<0.01){ dx=1; dy=-1; d=1.41; } const m=(D-d)/2/d; A.sx-=dx*m; A.sy-=dy*m; B.sx+=dx*m; B.sy+=dy*m; } }
      for(const q of s){ q.sx+=(q.ax-q.sx)*0.04; q.sy+=(q.ay-q.sy)*0.04; } }
    let lp='';
    for(const q of s){ q.p.el.style.transform=`translate3d(${q.sx}px,${q.sy}px,0) translate(-50%,-50%)`;
      if(Math.hypot(q.sx-q.ax,q.sy-q.ay)>4) lp+=`<path d="M${q.ax.toFixed(1)},${q.ay.toFixed(1)}L${q.sx.toFixed(1)},${q.sy.toFixed(1)}"/><circle cx="${q.ax.toFixed(1)}" cy="${q.ay.toFixed(1)}" r="3"/>`; }
    leads.innerHTML=lp;
    for(const l of L){ const sx=x+l.ux*k, sy=y+l.uy*k; const vis=k>=l.min && sx>-60&&sx<vw+60&&sy>-20&&sy<vh+20;
      l.el.hidden=!vis; const tx=l.anc==='start'?'0%':l.anc==='end'?'-100%':'-50%';
      l.el.style.transform=`translate3d(${sx}px,${sy}px,0) rotate(${l.a}deg) translate(${tx},-50%)`; l.el.style.transformOrigin='0 0'; }
  };
  const pz=new PanZoom(mapVp,layer,{coop:true,wheel:'ctrl',maxF:7,onChange:draw,onTouch1:()=>{}});
  pz.reset(false);
  $('.map__in')?.addEventListener('click',()=>pz.zoomBy(1.6));
  $('.map__out')?.addEventListener('click',()=>pz.zoomBy(1/1.6));
  $('.map__reset')?.addEventListener('click',()=>pz.reset(true));
  mapVp.addEventListener('wheel',e=>{ if(!(e.ctrlKey||e.metaKey)&&!pz.zoomed()&&matchMedia('(hover:hover)').matches){ if(hint){ hint.textContent=hint.dataset.wheel; showHint(); } } },{passive:true});
  mapVp.addEventListener('touchstart',e=>{ if(e.touches.length===1&&!pz.zoomed()&&hint){ /* one finger scrolls the page */ } },{passive:true});
  // view transition: pin click morphs the pin badge, card click the card badge + image
  const mark=(via,id)=>{ try{ sessionStorage.setItem('gc-via',via); sessionStorage.setItem('gc-id',id); }catch(_){} };
  pins.forEach(p=>p.addEventListener('click',()=>{ const id=p.dataset.iv; const c=$(`.card[data-iv="${id}"]`);
    c&&$$('[style*="view-transition-name"]',c).forEach(x=>x.style.viewTransitionName='none'); $('.badge',p).style.viewTransitionName='badge-'+id; mark('pin',id); }));
  $$('.map__layer a[data-iv]').forEach(a=>a.addEventListener('click',()=>{ const id=a.dataset.iv; const c=$(`.card[data-iv="${id}"]`);
    c&&$$('[style*="view-transition-name"]',c).forEach(x=>x.style.viewTransitionName='none'); const pb=$(`.pin[data-iv="${id}"] .badge`); pb&&(pb.style.viewTransitionName='badge-'+id); mark('pin',id); }));
  $$('.card').forEach(c=>c.addEventListener('click',()=>mark('card',c.dataset.iv)));
}

/* ---------- detail: viewer, hotspots, items ---------- */
const GC=window.GC;
const dlg=$('#viewer');
if(GC && dlg){
  const vp=$('.viewer__vp',dlg), layer=$('.viewer__layer',dlg), img=$('img',layer), hots=$('.viewer__hots',dlg), cap=$('.viewer__cap',dlg), sheet=$('.sheet',dlg), vhint=$('.viewer__hint',dlg);
  let pz=null, cur=-1;
  const showItem=n=>{ const it=GC.items[n]; if(!it){ sheet.classList.remove('is-on'); return; }
    $('.badge',sheet).textContent=n; $('h3',sheet).textContent=it.title; $('p',sheet).textContent=it.text; sheet.classList.add('is-on');
    $$('.vhot',hots).forEach(h=>h.classList.toggle('is-on',+h.dataset.n===n)); };
  const load=(i)=>new Promise(res=>{ const f=GC.figs[i]; cur=i; cap.textContent=f.caption||GC.title;
    layer.dataset.w=f.w; layer.dataset.h=f.h; img.width=f.w; img.height=f.h;
    hots.innerHTML=f.hot.filter(h=>GC.items[h.n]).map(h=>`<button class="vhot" data-n="${h.n}" style="left:${(h.x*100).toFixed(3)}%;top:${(h.y*100).toFixed(3)}%" aria-label="Punto ${h.n}: ${GC.items[h.n].title.replace(/"/g,'&quot;')}"></button>`).join('');
    $$('.vhot',hots).forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); showItem(+b.dataset.n); }));
    const done=()=>{ if(!pz) pz=new PanZoom(vp,layer,{wheel:'always',maxF:Math.max(4,f.w/vp.clientWidth*1.1)}); else { pz.lw=f.w; pz.lh=f.h; layer.style.width=f.w+'px'; layer.style.height=f.h+'px'; pz.o.maxF=Math.max(4,f.w/vp.clientWidth*1.1); } pz.reset(false); res(); };
    img.onload=done; img.src=f.full; if(img.complete&&img.naturalWidth&&img.src.endsWith(f.full)) { img.onload=null; done(); }
  });
  const open=async(i,n,focus)=>{
    sheet.classList.remove('is-on');
    if(!dlg.open){ dlg.showModal(); document.documentElement.style.overflow='hidden'; }
    if(cur!==i||!pz) await load(i); else pz.reset(false);
    if(vhint){ vhint.style.opacity=1; setTimeout(()=>vhint.style.opacity=0,1800); }
    if(focus&&!n){ const [cx,cy,cw,ch]=focus; requestAnimationFrame(()=>{ const kk=Math.min(vp.clientWidth/(cw*pz.lw),vp.clientHeight/(ch*pz.lh)); pz.focus(cx*pz.lw,cy*pz.lh,kk,true); }); }
    if(n){ const h=GC.figs[i].hot.find(h=>h.n===n); if(h){ requestAnimationFrame(()=>{ pz.focus(h.x*pz.lw,h.y*pz.lh,Math.max(pz.min*3.2,Math.min(pz.max,pz.min*5)),true);
      const b=$(`.vhot[data-n="${n}"]`,hots); if(b){ b.classList.remove('is-pulse'); void b.offsetWidth; b.classList.add('is-pulse'); } showItem(n); }); } }
  };
  dlg.addEventListener('close',()=>{ document.documentElement.style.overflow=''; });
  $('.viewer__close',dlg).addEventListener('click',()=>dlg.close());
  $('[data-z="+"]',dlg).addEventListener('click',()=>pz&&pz.zoomBy(1.6));
  $('[data-z="-"]',dlg).addEventListener('click',()=>pz&&pz.zoomBy(1/1.6));
  $('.sheet__x',dlg).addEventListener('click',()=>{ sheet.classList.remove('is-on'); $$('.vhot',hots).forEach(h=>h.classList.remove('is-on')); });
  vp.addEventListener('click',e=>{ if(e.target===vp||e.target===img||e.target===layer){ sheet.classList.remove('is-on'); $$('.vhot',hots).forEach(h=>h.classList.remove('is-on')); } });
  $$('.fig__btn').forEach(b=>b.addEventListener('click',e=>{ const h=e.target.closest('.fig__hot'); const f=b.dataset.focus?b.dataset.focus.split(',').map(Number):null; open(+b.dataset.fig, h?+h.dataset.n:0, f); }));
  $$('button.item__b').forEach(b=>b.addEventListener('click',()=>open(+b.dataset.fig,+b.dataset.n)));
}
// keyboard: arrows move between boards
addEventListener('keydown',e=>{ if(dlg&&dlg.open) return; if(e.target.closest('input,textarea')) return;
  if(e.key==='ArrowRight'){ const a=$('a[rel="next"]'); a&&(location.href=a.href); } if(e.key==='ArrowLeft'){ const a=$('a[rel="prev"]'); a&&(location.href=a.href); } });
})();
