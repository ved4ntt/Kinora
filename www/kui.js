/* Kinora UI extras (one file):
   1. Card menu: hold a poster (or right-click it) and the artwork pops up over a blurred page with its actions.
   2. Skip button: a small button slides in from the side when an intro, recap or credits starts (IntroDB). Its outline fills
      while the moment lasts and the button disappears when it is full.
   3. Ratings: IMDb, Rotten Tomatoes, Metacritic, Letterboxd... on the details page (MDBList).
   4. Details page hero: no band above the picture and a soft fade at the bottom.
   5. Privacy switch for anonymous diagnostics (Settings > Playback). */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const say=m=>{try{toast(m)}catch{}};
const cfg=()=>{try{return CFG()}catch{return{}}};
const calm=()=>D.body.classList.contains('reduce')||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const ease='cubic-bezier(.22,1,.36,1)';

const css=D.createElement('style');
css.textContent=`
#kmn{position:fixed;inset:0;z-index:99990;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:max(20px,env(safe-area-inset-top)) 20px max(20px,env(safe-area-inset-bottom))}
#kmn .bg{position:absolute;inset:0;background:rgba(6,7,10,.58);-webkit-backdrop-filter:blur(22px) saturate(1.2);backdrop-filter:blur(22px) saturate(1.2);opacity:0;transition:opacity .28s ease}
#kmn.on .bg{opacity:1}
#kmn .art{position:relative;width:min(58vw,260px);aspect-ratio:2/3;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6);transform-origin:0 0;will-change:transform}
#kmn .art img{width:100%;height:100%;object-fit:cover;display:block}
#kmn .t{position:relative;max-width:min(86vw,360px);text-align:center;font:700 17px/1.25 Manrope,system-ui,sans-serif;color:#f4f2ee;opacity:0;transform:translateY(8px);transition:opacity .25s ease .12s,transform .3s ${ease} .12s}
#kmn .a{position:relative;display:flex;flex-direction:column;gap:8px;width:min(86vw,340px);opacity:0;transform:translateY(14px);transition:opacity .25s ease .16s,transform .34s ${ease} .16s}
#kmn.on .t,#kmn.on .a{opacity:1;transform:none}
#kmn .a button{display:flex;align-items:center;gap:12px;border:0;border-radius:14px;padding:14px 16px;background:rgba(255,255,255,.12);color:#f4f2ee;font:600 15px Manrope,system-ui,sans-serif;text-align:left;cursor:pointer;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);transition:background .15s,transform .15s}
#kmn .a button:hover{background:rgba(255,255,255,.2)}#kmn .a button:active{transform:scale(.98)}
#kmn .a button.rm{color:#ff8a8a}#kmn .a svg{width:20px;height:20px;flex:none}
.kmn-gone{transition:opacity .26s ease,transform .26s ease;opacity:0;transform:scale(.9)}
body.kmn-open{overflow:hidden}
#kskip{position:absolute;z-index:40;right:max(16px,env(safe-area-inset-right));bottom:clamp(96px,22%,210px);display:flex;align-items:center;gap:8px;min-height:44px;padding:0 20px;border:0;border-radius:99px;background:rgba(14,15,19,.72);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#f4f2ee;font:700 14px Manrope,system-ui,sans-serif;cursor:pointer;opacity:0;transform:translateX(28px);transition:opacity .28s ease,transform .38s ${ease};pointer-events:none}
#kskip.on{opacity:1;transform:none;pointer-events:auto}
#kskip:hover{background:rgba(30,32,40,.82)}
#kskip svg.pl{width:16px;height:16px;flex:none}
#kskip svg.rg{position:absolute;inset:0;pointer-events:none;overflow:visible}
#kskip rect{fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;stroke-dasharray:100;transition:stroke-dashoffset .26s linear}
.kmr-row{display:flex;flex-wrap:wrap;gap:8px 14px;margin:10px 0 2px;opacity:0;animation:kmrin .5s ease .05s forwards}
.kmr{display:inline-flex;align-items:center;gap:6px;font:600 13px Manrope,system-ui,sans-serif;color:#f4f2ee}
.kmr i{width:9px;height:9px;border-radius:50%;flex:none}.kmr small{opacity:.65;font-weight:500}
@keyframes kmrin{to{opacity:1}}
.kt-bg{-webkit-mask-image:linear-gradient(#000 58%,transparent);mask-image:linear-gradient(#000 58%,transparent)}
@media (prefers-reduced-motion:reduce){#kskip,#kmn *{transition:none!important}}
body.reduce #kskip,body.reduce #kmn *{transition:none!important}`;
D.head.append(css);

/* ================= 1. card menu ================= */
const CARD='a[data-k],.card[data-k],.kh-c[data-k],[data-k].kxc';
const cardOf=t=>{const c=t&&t.closest&&t.closest(CARD);return c&&Q('img',c)&&/^[a-z]+\|/.test(c.dataset.k||'')?c:null};
const ico=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
const IC={w:ico('<path d="M20 6 9 17l-5-5"/>'),u:ico('<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>'),lib:ico('<path d="M12 5v14M5 12h14"/>'),d:ico('<circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v4h1"/>'),x:ico('<path d="M18 6 6 18M6 6l12 12"/>')};
let box=null,holdT=0,sx=0,sy=0,swallow=0;
const metaOf=c=>{
 const k=c.dataset.k;let m=null;try{m=M[k]}catch{}
 if(m)return m;
 const[type,id]=k.split('|');
 return{type,id,name:(Q('span,b,h3',c)||{}).textContent||'',poster:(Q('img',c)||{}).src||''};
};
function close(){
 const b=box;if(!b)return;box=null;
 b.classList.remove('on');D.body.classList.remove('kmn-open');
 const art=Q('.art',b),from=b._from;
 if(art&&from&&!calm()){art.style.transition='transform .26s cubic-bezier(.4,0,.2,1)';art.style.transform=from}
 setTimeout(()=>b.remove(),calm()?0:280);
}
function open(c){
 if(box)close();
 const m=metaOf(c),im=Q('img',c),src=(im&&(im.currentSrc||im.src))||m.poster||'';
 const cw=!!c.dataset.cw;
 let w=false,l=false;try{w=!!stOf(m).w;l=inLib(m)}catch{}
 const el=D.createElement('div');el.id='kmn';
 el.innerHTML='<div class="bg"></div><div class="art"><img alt="" src="'+h(src)+'"></div><div class="t">'+h(m.name||'')+'</div><div class="a">'+
  '<button data-a="w">'+(w?IC.u+'Mark as unwatched':IC.w+'Mark as watched')+'</button>'+
  '<button data-a="l">'+IC.lib+(l?'Remove from library':'Add to library')+'</button>'+
  '<button data-a="d">'+IC.d+'Details</button>'+
  (cw?'<button data-a="r" class="rm">'+IC.x+'Remove from Continue watching</button>':'')+'</div>';
 D.body.append(el);D.body.classList.add('kmn-open');box=el;
 const art=Q('.art',el);
 if(!calm()){
  /* the artwork starts exactly on top of the poster you held, then grows into place */
  const r=c.getBoundingClientRect(),to=art.getBoundingClientRect();
  const from='translate('+(r.left-to.left)+'px,'+(r.top-to.top)+'px) scale('+(r.width/to.width)+')';
  el._from=from;art.style.transform=from;void art.offsetWidth;
  art.style.transition='transform .42s cubic-bezier(.2,.9,.25,1.12)';
  requestAnimationFrame(()=>{art.style.transform='none';el.classList.add('on')});
 }else el.classList.add('on');
 try{navigator.vibrate&&navigator.vibrate(14)}catch{}
 el.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(!b){if(!e.target.closest('.art'))close();return}
  const a=b.dataset.a;
  if(a==='w'){try{setSt(m,{w:!w});say(w?'Marked as unwatched':'Marked as watched')}catch{}}
  else if(a==='l'){try{toggleLib(m)}catch{}if(/library/.test(location.hash)){try{V.library()}catch{}}}
  else if(a==='d'){close();location.hash='#/title/'+m.type+'/'+encodeURIComponent(m.id);return}
  else if(a==='r'){
   const p=LS.get('prog',{});Object.keys(p).forEach(k=>{if(p[k]&&p[k].id===m.id&&p[k].type===m.type)delete p[k]});LS.set('prog',p);
   c.classList.add('kmn-gone');
   setTimeout(()=>{const s=c.parentElement;c.remove();const row=s&&s.closest('section');if(row&&!Q('[data-cw]',row))row.remove()},280);
   say('Removed from Continue watching');
  }
  close();
 });
}
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&box)close()});
D.addEventListener('pointerdown',e=>{
 if(e.button>0||box)return;
 const c=cardOf(e.target);if(!c)return;
 sx=e.clientX;sy=e.clientY;clearTimeout(holdT);
 holdT=setTimeout(()=>{swallow=Date.now()+800;open(c)},e.pointerType==='mouse'?600:420);
},true);
D.addEventListener('pointermove',e=>{if(holdT&&(Math.abs(e.clientX-sx)>10||Math.abs(e.clientY-sy)>10)){clearTimeout(holdT);holdT=0}},true);
['pointerup','pointercancel','pointerleave'].forEach(t=>D.addEventListener(t,()=>{clearTimeout(holdT);holdT=0},true));
/* the tap that ends a hold must not open the title */
D.addEventListener('click',e=>{if(Date.now()<swallow&&cardOf(e.target)){e.preventDefault();e.stopPropagation()}},true);
D.addEventListener('contextmenu',e=>{const c=cardOf(e.target);if(c){e.preventDefault();e.stopImmediatePropagation();if(!box&&Date.now()>=swallow)open(c)}},true);

/* ================= 2. skip intro / recap / credits (IntroDB, reads need no key) ================= */
const SEGK='kseg',SEG_TTL=24*3600e3,WIN_S=25;
const WATCH=/^#\/watch\/(movie|series)\/([^/?]+)(?:\/([^/?]+))?/;
async function getSegs(type,id,vid){
 if(!/^tt\d+$/.test(id))return null;
 let qs='imdb_id='+id;
 if(type==='movie')qs+='&is_movie=true';
 else{const m=/:(\d+):(\d+)$/.exec(vid||'');if(!m)return null;qs+='&season='+m[1]+'&episode='+m[2]}
 const store=LS.get(SEGK,{}),c=store[qs];
 if(c&&Date.now()-c.t<SEG_TTL)return c.d;
 let d=null,ok=false;
 try{
  const r=await fetch('https://api.introdb.app/segments?'+qs);
  if(r.status===404){ok=true}
  else if(r.ok){
   const j=await r.json(),out=[];
   const add=(k,label,o)=>{if(o&&+o.end_sec>+o.start_sec)out.push({k,label,s:+o.start_sec,e:+o.end_sec})};
   if(!j.no_recap)add('recap','Skip recap',j.recap);
   if(!j.no_intro)add('intro','Skip intro',j.intro);
   if(!j.no_outro)add('outro','Skip credits',j.outro);
   add('post','Skip post-credits',j.post_credits);
   d=out;ok=true;
  }
 }catch{}
 if(ok){const ks=Object.keys(store);if(ks.length>80)delete store[ks[0]];store[qs]={t:Date.now(),d};LS.set(SEGK,store)}
 return d;
}
let seg={list:[],key:'',iv:0,btn:null,cur:null};
const PLAY_SVG='<svg class="pl" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5v14l8-7zM15 5v14h3V5z"/></svg>';
function hideSkip(){
 const b=seg.btn;seg.cur=null;
 if(b){b.classList.remove('on');const x=b;seg.btn=null;setTimeout(()=>x.remove(),calm()?0:320)}
}
function showSkip(g,p){
 const host=Q('#pl');if(!host)return;
 if(!seg.btn||seg.cur!==g){
  if(seg.btn){seg.btn.remove()}
  const b=D.createElement('button');b.id='kskip';b.type='button';
  b.innerHTML='<svg class="rg"><rect pathLength="100"/></svg><span>'+h(g.label)+'</span>'+PLAY_SVG;
  b.onclick=e=>{e.stopPropagation();const v=Q('#vw video');if(!v)return;const end=Math.min(g.e+.2,(v.duration||g.e+1)-.1);try{v.currentTime=end}catch{}hideSkip()};
  host.append(b);seg.btn=b;seg.cur=g;
  /* the outline is a rounded rectangle exactly as big as the button */
  const w=b.offsetWidth,hh=b.offsetHeight,r=Q('rect',b),sv=Q('svg.rg',b);
  sv.setAttribute('viewBox','0 0 '+w+' '+hh);sv.setAttribute('width',w);sv.setAttribute('height',hh);
  r.setAttribute('x',1.25);r.setAttribute('y',1.25);r.setAttribute('width',w-2.5);r.setAttribute('height',hh-2.5);r.setAttribute('rx',(hh-2.5)/2);
  r.style.strokeDashoffset=100;
  requestAnimationFrame(()=>b.classList.add('on'));
 }
 const r=Q('rect',seg.btn);if(r)r.style.strokeDashoffset=String(Math.max(0,100*(1-Math.min(1,p))).toFixed(1));
}
function segTick(){
 const v=Q('#vw video');if(!v){hideSkip();return}
 const t=v.currentTime;let hit=null,win=0;
 for(const g of seg.list){const w=Math.min(g.e-g.s,WIN_S);if(t>=g.s-.3&&t<g.s+w){hit=g;win=w;break}}
 if(!hit){if(seg.btn)hideSkip();return}
 showSkip(hit,Math.max(0,t-hit.s)/win);
}
function segRoute(){
 clearInterval(seg.iv);hideSkip();seg.list=[];
 const m=WATCH.exec(location.hash);
 if(!m||cfg().skipSeg===false)return;
 const type=m[1],id=decodeURIComponent(m[2]),vid=m[3]?decodeURIComponent(m[3]):'',key=type+'|'+id+'|'+vid;
 seg.key=key;
 getSegs(type,id,vid).then(l=>{if(seg.key!==key||!l||!l.length)return;seg.list=l;seg.iv=setInterval(segTick,250)});
}
addEventListener('hashchange',segRoute);
setTimeout(segRoute,1500);

/* ================= 3. ratings (MDBList) and 4. details hero ================= */
const MK='kmdb',MTTL=7*24*3600e3;
const RT=[['imdb','IMDb','#f5c518',v=>v.toFixed(1)],['tomatoes','Critics','#fa320a',v=>Math.round(v)+'%'],['popcorn','Audience','#f6b01e',v=>Math.round(v)+'%'],['metacritic','Metacritic','#66cc33',v=>Math.round(v)],['letterboxd','Letterboxd','#00e054',v=>v.toFixed(1)],['trakt','Trakt','#ed1c24',v=>Math.round(v)+'%'],['tmdb','TMDB','#01b4e4',v=>Math.round(v)+'%']];
async function ratings(type,id){
 const key=(window.KINORA_CONFIG||{}).mdblistKey;
 if(!key||!/^tt\d+$/.test(id))return null;
 const ck=type+'|'+id,store=LS.get(MK,{}),c=store[ck];
 if(c&&Date.now()-c.t<MTTL)return c.d;
 try{
  const r=await fetch('https://api.mdblist.com/imdb/'+(type==='movie'?'movie':'show')+'/'+id+'?apikey='+encodeURIComponent(key));
  if(!r.ok)return null;
  const j=await r.json(),d={};
  (j.ratings||[]).forEach(x=>{if(x&&x.source&&typeof x.value==='number'&&x.value>0)d[x.source]={v:x.value}});
  const ks=Object.keys(store);if(ks.length>120)delete store[ks[0]];
  store[ck]={t:Date.now(),d};LS.set(MK,store);return d;
 }catch{return null}
}
const t0=V.title;
if(t0)V.title=async function(type,id){
 const r=await t0.apply(this,arguments);
 try{
  /* hero: pull it up under the top bar so no band shows above the picture */
  const kt=Q('.kt',app);
  if(kt){requestAnimationFrame(()=>{const top=kt.getBoundingClientRect().top+scrollY;if(top>2)kt.style.marginTop=(-top)+'px'})}
  ratings(type,id).then(d=>{
   if(!d)return;
   const meta=Q('.kt-in .kh-meta',app);if(!meta||Q('.kmr-row',app))return;
   const chips=RT.filter(x=>d[x[0]]).slice(0,6).map(x=>'<span class="kmr"><i style="background:'+x[2]+'"></i><b>'+h(String(x[3](d[x[0]].v)))+'</b><small>'+x[1]+'</small></span>').join('');
   if(chips)meta.insertAdjacentHTML('afterend','<div class="kmr-row">'+chips+'</div>');
  });
 }catch{}
 return r;
};

/* ================= 5. privacy switch (Settings > Playback) ================= */
const P=window.K6&&K6.PAGES;
if(P&&P.play){
 const pp=P.play;
 P.play=function(){
  const r=pp.apply(this,arguments);
  try{
   const root=Q('.k6');if(!root||Q('#kprivacy',root))return r;
   const tg=(id,on)=>'<button class="k6t'+(on?' on':'')+'" id="'+id+'" role="switch" aria-checked="'+on+'"></button>';
   root.insertAdjacentHTML('beforeend','<h4 class="k6h">Privacy</h4><div class="k6c" id="kprivacy">'+
    '<div class="k6o"><span><b>Anonymous diagnostics</b><small>Sends which source host worked or failed, start time and buffering. Never your account, titles, IP or anything you type. Helps fix broken sources.</small></span>'+tg('kdiag',cfg().diag!==false)+'</div>'+
    '<div class="k6o"><span><b>Skip buttons</b><small>Shows a Skip intro, recap or credits button when a show has them (IntroDB).</small></span>'+tg('kskipt',cfg().skipSeg!==false)+'</div></div>');
   const wire=(id,key,msg)=>{const b=Q('#'+id);if(b)b.onclick=()=>{const on=!(cfg()[key]!==false);setCfg({[key]:on});b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on));say(msg(on))}};
   wire('kdiag','diag',on=>on?'Anonymous diagnostics on':'Anonymous diagnostics off');
   wire('kskipt','skipSeg',on=>on?'Skip buttons on':'Skip buttons off');
  }catch{}
  return r;
 };
}
})();
