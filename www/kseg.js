/* Kinora skip buttons (IntroDB) and the next-episode card.
   - Skip recap / Skip intro / Skip credits / Skip to the post-credits scene / Next episode appear as chips above the controls at the right moment.
   - The seek bar shows where those moments are (small coloured marks), so you can see an intro before you reach it.
   - Settings > Playback > Skip buttons: Off, Buttons (default) or Automatic (intros and recaps are skipped after a 3 second countdown; seeking back into the moment does not repeat it).
   - Keys: S skips what the chip says, N goes to the next episode.
   IntroDB is read without a key. The answer is cached for a day, so a title costs one small request. If IntroDB has nothing for a title, nothing is shown. */
(()=>{
'use strict';
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const cfg=()=>{try{return CFG()}catch{return{}}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SEGK='kseg',TTL=24*3600e3;
const WATCH=/^#\/watch\/(movie|series)\/([^/?]+)(?:\/([^/?]+))?/;
const svg=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const ICON={
 skip:svg('<path d="M5 5l9 7-9 7z"/><path d="M18 5v14"/>'),
 next:svg('<path d="M6 5l9 7-9 7z"/><path d="M19 5v14"/>'),
 scene:svg('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.5l5 2.5-5 2.5z"/>')
};
const HOLD={recap:25,intro:25,outro:45};          /* seconds a chip stays when the moment is longer */

let S={key:'',list:[],iv:0,chips:new Map(),done:new Set(),dur:0,auto:null,nx:null};

/* ---------- IntroDB (same request and cache as before, so nothing is fetched twice) ---------- */
async function getSegs(type,id,vid){
 if(!/^tt\d+$/.test(id))return null;
 let qs='imdb_id='+id;
 if(type==='movie')qs+='&is_movie=true';
 else{const m=/:(\d+):(\d+)$/.exec(vid||'');if(!m)return null;qs+='&season='+m[1]+'&episode='+m[2]}
 const store=LS.get(SEGK,{}),c=store[qs];
 if(c&&Date.now()-c.t<TTL)return c.d;
 let d=null,ok=false;
 try{
  const ac=typeof AbortController!=='undefined'?new AbortController():null,to=setTimeout(()=>{try{ac&&ac.abort()}catch{}},6000);
  const r=await fetch('https://api.introdb.app/segments?'+qs,ac?{signal:ac.signal}:{});
  clearTimeout(to);
  if(r.status===404)ok=true;
  else if(r.ok){
   const j=await r.json(),out=[];
   const add=(k,o)=>{if(o&&+o.end_sec>+o.start_sec)out.push({k,s:+o.start_sec,e:+o.end_sec})};
   if(!j.no_recap)add('recap',j.recap);
   if(!j.no_intro)add('intro',j.intro);
   if(!j.no_outro)add('outro',j.outro);
   add('post',j.post_credits);
   d=out;ok=true;
  }
 }catch{}
 if(ok){const ks=Object.keys(store);if(ks.length>80)delete store[ks[0]];store[qs]={t:Date.now(),d};LS.set(SEGK,store)}
 return d;
}

/* ---------- seek bar marks ---------- */
const LAB={recap:'Recap',intro:'Intro',outro:'Credits',post:'Post-credits scene'};
function drawMarks(dur){
 const sk=Q('#sk');if(!sk)return;
 let box=Q('#ksg',sk);
 if(!box){box=D.createElement('div');box.id='ksg';sk.prepend(box)}
 S.dur=dur;
 box.innerHTML=dur>0?S.list.map(g=>'<u class="sg sg-'+g.k+'" style="left:'+(100*g.s/dur).toFixed(2)+'%;width:'+Math.max(.4,100*(Math.min(g.e,dur)-g.s)/dur).toFixed(2)+'%" title="'+LAB[g.k]+'"></u>').join(''):'';
}

/* ---------- chips ---------- */
function chipsBox(){
 const pl=Q('#pl');if(!pl)return null;
 let b=Q('#kchips',pl);
 if(!b){
  b=D.createElement('div');b.id='kchips';pl.append(b);
  b.addEventListener('click',e=>{
   e.stopPropagation();
   const c=e.target.closest('.kchip');if(!c)return;
   const k=c.dataset.id,w=S.chips.get(k);if(w&&w.act)w.act();
  });
 }
 return b;
}
function seekTo(sec){
 const v=Q('#vw video');if(!v)return;
 const d=v.duration&&isFinite(v.duration)?v.duration:0;
 try{v.currentTime=d?Math.min(sec,d-.3):sec}catch{}
}
function setChip(id,label,icon,p,act,mark){
 const box=chipsBox();if(!box)return;
 let w=S.chips.get(id);
 if(!w){
  const el=D.createElement('button');el.type='button';el.className='kchip';el.dataset.id=id;
  el.innerHTML='<i class="ci">'+icon+'</i><span class="cl"></span>'+(matchMedia('(pointer:fine)').matches&&mark?'<kbd>'+mark+'</kbd>':'');
  box.append(el);w={el,label:'',act};S.chips.set(id,w);
  requestAnimationFrame(()=>el.classList.add('on'));
 }
 w.act=act;
 if(w.label!==label){w.label=label;Q('.cl',w.el).textContent=label}
 w.el.style.setProperty('--p',Math.max(0,Math.min(1,p)).toFixed(3));
 w.seen=S.tick;
}
function dropChips(){
 for(const [id,w] of [...S.chips]){
  if(w.seen===S.tick)continue;
  S.chips.delete(id);w.el.classList.remove('on');setTimeout(()=>w.el.remove(),260);
 }
}

/* ---------- next episode ---------- */
function nextCard(show,remain){
 const pl=Q('#pl');if(!pl)return;
 let c=Q('#knx',pl);
 if(!show){if(c){c.classList.remove('on');setTimeout(()=>c.remove(),260)}S.nxT=0;return}
 const nx=Q('#nx');if(!nx)return;
 if(!c){
  c=D.createElement('div');c.id='knx';
  c.innerHTML='<div class="kt"><small>Up next</small><b></b></div><div class="ka"><button type="button" class="kgo">Play now</button><button type="button" class="kno" aria-label="Stay on this episode">\u2715</button></div><i class="kbar"><u></u></i>';
  pl.append(c);
  c.onclick=e=>{
   e.stopPropagation();
   if(e.target.closest('.kno')){S.nxOff=true;nextCard(false)}
   else if(e.target.closest('.kgo')){S.nxOff=true;nx.click()}
  };
  requestAnimationFrame(()=>c.classList.add('on'));
  S.nxT=performance.now();
 }
 Q('b',c).textContent=nx.dataset.l||'Next episode';
 const left=Math.max(0,10-(performance.now()-S.nxT)/1000);
 Q('u',c).style.width=(100-left*10)+'%';
 if(left<=0&&!S.nxOff){S.nxOff=true;nextCard(false);nx.click()}
}

/* ---------- the loop ---------- */
function tick(){
 const v=Q('#vw video'),pl=Q('#pl');
 if(!v||!pl){return}
 S.tick=(S.tick||0)+1;
 const t=v.currentTime||0,d=v.duration&&isFinite(v.duration)?v.duration:0;
 if(d&&Math.abs(d-S.dur)>1)drawMarks(d);
 const mode=cfg().skipSeg===false?'off':cfg().skipAuto?'auto':'btn';
 const nx=Q('#nx'),post=S.list.find(g=>g.k==='post');
 let inOutro=false;
 if(mode!=='off'&&!pl.classList.contains('scrub')&&!v.seeking){
  for(const g of S.list){
   if(g.k==='post')continue;
   const win=Math.min(g.e-g.s,HOLD[g.k]||25);
   if(!(t>=g.s-.3&&t<g.s+win))continue;
   const p=Math.max(0,t-g.s)/win;
   if(g.k==='outro'){
    inOutro=true;
    if(post&&post.s>g.e-3)setChip('post','Skip to post-credits scene',ICON.scene,p,()=>seekTo(post.s+.1));
    if(nx)setChip('next','Next episode',ICON.next,p,()=>nx.click(),'N');
    else setChip('outro','Skip credits',ICON.skip,p,()=>seekTo(g.e+.2),'S');
   }else{
    const id=g.k+'@'+g.s;
    const label=g.k==='recap'?'Skip recap':'Skip intro';
    if(mode==='auto'&&!S.done.has(id)){
     /* automatic: a 3 second countdown shown on the chip, then the jump; seeking back into the moment later does not repeat it */
     if(!S.auto||S.auto.id!==id)S.auto={id,at:performance.now()};
     const q=(performance.now()-S.auto.at)/3000;
     setChip(id,'Skipping '+(g.k==='recap'?'recap':'intro')+'\u2026',ICON.skip,q,()=>{S.done.add(id);seekTo(g.e+.2)},'S');
     if(q>=1){S.done.add(id);S.auto=null;seekTo(g.e+.2)}
    }else setChip(id,label,ICON.skip,p,()=>{S.done.add(id);seekTo(g.e+.2)},'S');
   }
  }
 }
 dropChips();
 /* up next: during the credits (or the last 25 s when IntroDB has no credits for this episode), with a 10 s countdown that can be cancelled */
 const hasOutro=S.list.some(g=>g.k==='outro');
 const nearEnd=d>600&&d-t<25&&!hasOutro;
 const wantNx=!!nx&&cfg().autonext!==false&&!S.nxOff&&(inOutro||nearEnd)&&!v.paused&&!pl.classList.contains('scrub');
 if(wantNx)nextCard(true);else if(Q('#knx'))nextCard(false);
 /* pausing freezes the countdown */
 if(Q('#knx')&&v.paused)S.nxT=(S.nxT||performance.now())+250;
}
function stop(){
 clearInterval(S.iv);S.iv=0;S.list=[];S.chips.forEach(w=>w.el.remove());S.chips.clear();S.done=new Set();S.auto=null;S.nxOff=false;S.dur=0;
 const c=Q('#knx');if(c)c.remove();const m=Q('#ksg');if(m)m.remove();
}
function route(){
 stop();
 const m=WATCH.exec(location.hash);
 if(!m)return;
 const type=m[1],id=decodeURIComponent(m[2]),vid=m[3]?decodeURIComponent(m[3]):'',key=type+'|'+id+'|'+vid;
 S.key=key;
 /* the loop runs always on the player screen (the next-episode card does not need IntroDB), the segments join when they arrive */
 S.iv=setInterval(tick,250);
 if(cfg().skipSeg===false)return;
 getSegs(type,id,vid).then(l=>{if(S.key!==key||!l||!l.length)return;S.list=l;S.dur=0}).catch(()=>{});
}
addEventListener('hashchange',route);
setTimeout(route,600);

/* keys: S skips what the chip says, N is the next episode */
D.addEventListener('keydown',e=>{
 if(!WATCH.test(location.hash)||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.target&&e.target.matches&&e.target.matches('input,textarea,select'))return;
 const k=e.key.toLowerCase();
 if(k==='s'){const w=S.chips.get([...S.chips.keys()].find(x=>x!=='next'&&x!=='post')||'');if(w&&w.act){e.preventDefault();w.act()}}
 else if(k==='n'){const nx=Q('#nx');if(nx){e.preventDefault();nx.click()}}
});

/* ---------- Settings > Playback ---------- */
const P=window.K6&&K6.PAGES;
if(P&&typeof P.play==='function'){
 const pp=P.play;
 P.play=function(){
  const r=pp.apply(this,arguments);
  try{
   const root=Q('.k7m')||Q('.k6');if(!root||Q('#kskipset',root))return r;
   const mode=cfg().skipSeg===false?'off':cfg().skipAuto?'auto':'btn';
   const ch=(k,n)=>'<button class="ch'+(mode===k?' on':'')+'" data-kseg="'+k+'">'+n+'</button>';
   root.insertAdjacentHTML('beforeend','<h4 class="k6h">Skip buttons</h4><div class="k6c" id="kskipset"><div class="k6o col"><span><b>Intro, recap and credits</b><small>From IntroDB. Buttons appear at the right moment; Automatic skips intros and recaps after a 3 second countdown. Keys: S skips, N is the next episode.</small></span><div class="k6ch wrap">'+ch('off','Off')+ch('btn','Buttons')+ch('auto','Automatic')+'</div></div></div>');
  }catch{}
  return r;
 };
}
D.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('[data-kseg]');if(!b)return;
 const k=b.dataset.kseg;
 setCfg(k==='off'?{skipSeg:false,skipAuto:false}:k==='auto'?{skipSeg:true,skipAuto:true}:{skipSeg:true,skipAuto:false});
 QA('[data-kseg]').forEach(x=>x.classList.toggle('on',x===b));
 if(WATCH.test(location.hash))route();
});

window.KSeg={list:()=>S.list,route};
})();
