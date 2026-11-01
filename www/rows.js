/* Kinora rows: arrow buttons, mouse drag, banner drag, phone "centre card" peek, desktop hover card. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];

/* ---- arrow buttons on every row ---- */
const arrows=()=>QA('.kh-row:not([data-a])').forEach(r=>{
 const s=Q('.kh-sc',r);if(!s)return;r.dataset.a=1;
 r.insertAdjacentHTML('beforeend','<button class="kh-ar l off" aria-label="Scroll left">'+ic('chevl')+'</button><button class="kh-ar r" aria-label="Scroll right">'+ic('chev')+'</button>');
 const L=Q('.kh-ar.l',r),R=Q('.kh-ar.r',r),u=()=>{L.classList.toggle('off',s.scrollLeft<8);R.classList.toggle('off',s.scrollLeft+s.clientWidth>=s.scrollWidth-8)};
 s.addEventListener('scroll',u,{passive:true});r.addEventListener('mouseenter',u);
 L.onclick=()=>s.scrollBy({left:-s.clientWidth*.85,behavior:'smooth'});
 R.onclick=()=>s.scrollBy({left:s.clientWidth*.85,behavior:'smooth'});
});
let q=0;
new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;arrows()})}).observe(D.getElementById('app'),{childList:true,subtree:true});

/* ---- drag rows and the banner with the mouse ---- */
let dr=null;
D.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='mouse'||e.button)return;
 const s=e.target.closest('.kh-sc'),h=e.target.closest('.kh-hero');
 if(s)dr={s,x:e.clientX,l:s.scrollLeft,m:0};else if(h)dr={h,x:e.clientX,m:0};
});
addEventListener('pointermove',e=>{
 if(!dr)return;const dx=e.clientX-dr.x;if(Math.abs(dx)>6)dr.m=1;
 if(dr.s&&dr.m){dr.s.style.scrollSnapType='none';dr.s.scrollLeft=dr.l-dx}
});
addEventListener('pointerup',e=>{
 if(!dr)return;const d=dr;dr=null;const dx=e.clientX-d.x;
 if(d.s){d.s.style.scrollSnapType='';if(d.m)d.s.dataset.dr=Date.now()}
 else if(d.h&&Math.abs(dx)>60){
  const dots=QA('.kh-dots i'),i=dots.findIndex(x=>x.classList.contains('on')),n=dots[i+(dx<0?1:-1)]||dots[dx<0?0:dots.length-1];
  if(n)n.click();d.h.dataset.dr=Date.now();
 }
});
D.addEventListener('click',e=>{const s=e.target.closest('.kh-sc,.kh-hero');if(s&&s.dataset.dr&&Date.now()-s.dataset.dr<300){e.preventDefault();e.stopPropagation()}},true);

/* ---- phones: the card in the middle pops up a little with its details while you slide ---- */
if(matchMedia('(hover:none)').matches){
 let raf=0;
 const mark=s=>{
  const c=s.getBoundingClientRect(),mid=c.left+c.width/2;let best=null,bd=1e9;
  QA('.kh-c',s).forEach(k=>{const r=k.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-mid);if(d<bd){bd=d;best=k}});
  QA('.kh-c.mid',s).forEach(k=>k!==best&&k.classList.remove('mid'));
  if(best)best.classList.add('mid');
 };
 D.addEventListener('scroll',e=>{const s=e.target;if(!s.classList||!s.classList.contains('kh-sc'))return;cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>mark(s))},true);
}

/* ---- desktop: hover a title for a small card, wait a moment for the big one (the page background follows) ---- */
if(matchMedia('(hover:hover) and (min-width:761px)').matches){
 let pop=null,cur=null,t1=0,t2=0;
 const kill=()=>{clearTimeout(t1);clearTimeout(t2);cur=null;if(pop){const p=pop;pop=null;p.classList.remove('on');setTimeout(()=>p.remove(),260)}};
 const body=(m,big)=>'<div class="khp-i" style="background-image:url(\''+h(m.background||m.poster||'')+'\')"></div><div class="khp-b"><h3>'+h(m.name)+'</h3><div class="khp-m">'+(m.imdbRating?'<span>\u2605 '+h(m.imdbRating)+'</span>':'')+(m.releaseInfo||m.year?'<span>'+h(String(m.releaseInfo||m.year))+'</span>':'')+(m.genres||[]).slice(0,big?4:2).map(g=>'<span>'+h(g)+'</span>').join('')+'</div>'+(big&&m.description?'<p class="khp-d">'+h(m.description)+'</p>':'')+'<div class="khp-a"><button data-a="go">Play</button><button data-a="lib">'+(inLib(m)?'In my list':'My list')+'</button></div></div>';
 const open=c=>{
  const m=M[c.dataset.k];if(!m||!c.isConnected)return;
  const r=c.querySelector('.kh-i').getBoundingClientRect(),w=Math.max(260,r.width*1.45);
  const left=x=>Math.min(innerWidth-x-14,Math.max(14,r.left+r.width/2-x/2));
  pop=D.createElement('div');pop.className='khp';
  pop.style.cssText='width:'+w+'px;left:'+left(w)+'px;top:'+Math.max(14,Math.min(innerHeight-340,r.top-40))+'px';
  pop.innerHTML=body(m,false);D.body.append(pop);
  requestAnimationFrame(()=>pop&&pop.classList.add('on'));
  pop.onmouseleave=kill;
  pop.onclick=e=>{const b=e.target.closest('button');if(b&&b.dataset.a==='lib'){e.stopPropagation();b.textContent=toggleLib(m)?'In my list':'My list';return}location.hash=dt(m);kill()};
  t2=setTimeout(()=>{
   if(!pop)return;const W=Math.min(440,innerWidth-28);
   pop.style.width=W+'px';pop.style.left=left(W)+'px';pop.style.top=Math.max(14,Math.min(innerHeight-450,parseFloat(pop.style.top)))+'px';
   pop.innerHTML=body(m,true);try{setAmb(m.background||m.poster)}catch{}
  },1100);
 };
 D.addEventListener('mouseover',e=>{
  const c=e.target.closest&&e.target.closest('.kh-c[data-k]');
  if(!c){if(!(e.target.closest&&e.target.closest('.khp')))kill();return}
  if(c===cur)return;kill();cur=c;t1=setTimeout(()=>open(c),420);
 });
}
})();
