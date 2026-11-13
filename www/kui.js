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
body.reduce #kskip,body.reduce #kmn *{transition:none!important}

/* motion: pages slide up softly, home rows follow one after another */
@keyframes kin{from{opacity:0;transform:translateY(18px) scale(.992)}to{opacity:1;transform:none}}
.kin{animation:kin .5s ${ease} both}
.kin .kh>*{animation:kin .62s ${ease} both}
.kin .kh>*:nth-child(2){animation-delay:.06s}.kin .kh>*:nth-child(3){animation-delay:.12s}.kin .kh>*:nth-child(4){animation-delay:.18s}.kin .kh>*:nth-child(5){animation-delay:.24s}.kin .kh>*:nth-child(6){animation-delay:.3s}.kin .kh>*:nth-child(n+7){animation-delay:.36s}
body.reduce .kin,body.reduce .kin .kh>*{animation:none}
.kh-c{transition:transform .3s ${ease}}.kh-c:active{transform:scale(.965)}
.kh-c .kh-i{transition:transform .38s ${ease},box-shadow .38s ease}
@media(hover:hover){.kh-c:hover .kh-i{transform:translateY(-4px);box-shadow:0 18px 40px rgba(0,0,0,.45)}}

/* home banner: taller, shorter summary, three actions */
html body .kh-hero{height:min(88vh,920px)!important;min-height:540px!important}
@media(max-width:820px){html body .kh-hero{height:min(84svh,740px)!important;min-height:500px!important}}
html body .kh-in{max-width:700px}
html body .kh-d{font-size:13.5px!important;line-height:1.5!important;-webkit-line-clamp:2!important;opacity:.86;margin:0 0 16px!important}
.kh-acts{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.kh-btn.kh-b2{background:rgba(255,255,255,.16);color:#f4f2ee;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.kh-btn.kh-b3{width:46px;padding:0;justify-content:center;border:0;cursor:pointer;background:rgba(255,255,255,.16);color:#f4f2ee;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.kh-btn.kh-b3.on{background:#f4f2ee;color:#0a0b0e}
.kh-btn.kh-b3 svg{width:20px;height:20px}
.kh-btn:active{transform:scale(.96)}

/* Explore: the two pickers share the row evenly; sheets can be dragged down */
.kxe-pk{display:grid!important;grid-template-columns:1fr 1fr;gap:10px}
.kxpk{width:100%!important;justify-content:space-between}
.kxe-pills{-webkit-mask-image:linear-gradient(90deg,#000 90%,transparent);mask-image:linear-gradient(90deg,#000 90%,transparent)}
.kxp.sheet,.kxsh{will-change:transform}.kxp-g,.kxsh .g{cursor:grab;touch-action:none}

/* search */
.ks2{padding-top:clamp(70px,10vh,104px)!important}
.ks2-bar{display:flex;align-items:center;gap:10px;margin:0 clamp(18px,4vw,56px) 6px;height:54px;padding:0 8px 0 16px;border-radius:16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);transition:border-color .25s,background .25s}
.ks2-bar:focus-within{border-color:rgba(255,255,255,.34);background:rgba(255,255,255,.1)}
.ks2-bar svg{width:20px;height:20px;flex:none;opacity:.7}
.ks2-bar input{flex:1;min-width:0;background:none;border:0;outline:0;color:#f4f2ee;font:600 16px Manrope,system-ui,sans-serif}
.ks2-bar input::placeholder{color:rgba(244,242,238,.45)}
.ks2-bar button{width:38px;height:38px;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:#f4f2ee;cursor:pointer;font-size:15px;opacity:0;pointer-events:none;transition:opacity .2s}
.ks2-bar.has button{opacity:1;pointer-events:auto}
.ks2 .kh-i img{opacity:0;transition:opacity .4s ease}.ks2 .kh-i img.in{opacity:1}
.ks2-sk .kh-i{aspect-ratio:2/3;background:linear-gradient(110deg,#14161c 30%,#1e2129 50%,#14161c 70%);background-size:200% 100%;animation:ks2s 1.25s linear infinite}
@keyframes ks2s{to{background-position:-200% 0}}
.ks2-row{animation:kin .45s ${ease} both}
.ks2-empty{margin:26px clamp(18px,4vw,56px);opacity:.65;font:500 15px Manrope,system-ui,sans-serif}
.ks2-rec{display:flex;flex-wrap:wrap;gap:8px;margin:14px clamp(18px,4vw,56px)}
.ks2-rec a{padding:9px 15px;border-radius:99px;background:rgba(255,255,255,.08);color:#f4f2ee;text-decoration:none;font:600 13.5px Manrope,system-ui,sans-serif;transition:background .2s,transform .2s}
.ks2-rec a:hover{background:rgba(255,255,255,.16)}.ks2-rec a:active{transform:scale(.96)}`;
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
   const p=LS.get('prog',{}),dp=LS.get('dprog',{}),now=Date.now();
   Object.keys(p).forEach(k=>{if(p[k]&&p[k].id===m.id&&p[k].type===m.type){dp[k]=now;delete p[k]}});
   LS.set('dprog',dp);LS.set('prog',p);
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
 if(!/^tt\d+$/.test(id))return null;
 let cl;try{cl=CL()}catch{return null}
 if(!cl||!cl.url)return null;
 const ck=type+'|'+id,store=LS.get(MK,{}),c=store[ck];
 if(c&&Date.now()-c.t<MTTL)return c.d;
 try{
  /* the MDBList key stays on the server: the app asks the "ratings" function, which also shares one cache between everyone */
  const r=await fetch(cl.url+'/functions/v1/ratings?type='+(type==='movie'?'movie':'show')+'&id='+id,{headers:{apikey:cl.key}});
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

/* ================= 6. motion and scroll ================= */
{
 let animH='',lastNav=Date.now();
 /* a new page slides up once; a refresh of the same page (a toggle, a filter) stays still */
 new MutationObserver(()=>{
  const el=app.firstElementChild;
  if(!el||el.classList.contains('ldw')||el.classList.contains('kin')||animH===location.hash)return;
  animH=location.hash;el.classList.add('kin');setTimeout(()=>el.classList.remove('kin'),900);
 }).observe(app,{childList:true});
 /* going to another page starts at the top; changing something on the page you are on must not throw you to the top */
 addEventListener('hashchange',()=>{lastNav=Date.now()},true);
 D.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-go],[data-back],[data-nav],a[href^="#"]'))lastNav=Date.now()},true);
 const st=window.scrollTo.bind(window);
 window.scrollTo=function(a,b){
  if(a===0&&b===0&&scrollY>0&&Date.now()-lastNav>1600)return;
  return st.apply(window,arguments);
 };
}

/* ================= 7. bottom sheets (Explore pickers, profile) can be dragged down to close ================= */
{
 const wireSheet=(sh,bdSel)=>{
  if(sh._kd)return;sh._kd=1;
  let y0=0,dy=0,t0=0,on=false;
  const zone=y=>y-sh.getBoundingClientRect().top<64;
  sh.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||!zone(e.clientY))return;on=true;y0=e.clientY;dy=0;t0=Date.now();sh.style.transition='none';try{sh.setPointerCapture(e.pointerId)}catch{}});
  sh.addEventListener('pointermove',e=>{if(!on)return;dy=Math.max(0,e.clientY-y0);sh.style.transform='translateY('+dy+'px)'});
  const end=()=>{
   if(!on)return;on=false;
   const fast=dy/Math.max(1,Date.now()-t0)>.6;
   sh.style.transition='transform .3s '+ease;
   if(dy>90||fast){const bd=Q(bdSel);sh.style.transform='translateY(100%)';setTimeout(()=>{if(bd)bd.click()},120)}
   else sh.style.transform='';
   setTimeout(()=>{sh.style.transition=''},320);
  };
  sh.addEventListener('pointerup',end);sh.addEventListener('pointercancel',end);
 };
 const scan=()=>{QA('.kxp.sheet').forEach(s=>wireSheet(s,'.kxp-bd'));QA('.kxsh').forEach(s=>wireSheet(s,'.kxsh-bd'))};
 new MutationObserver(scan).observe(D.body,{childList:true});
}

/* ================= 8. search: type and it searches, a Movies row then a Series row, titles first, artwork only when needed ================= */
{
 const REC='ksr',sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const rec=()=>LS.get(REC,[]);
 const addRec=q=>{if(!q||q.length<2)return;LS.set(REC,[q].concat(rec().filter(x=>x.toLowerCase()!==q.toLowerCase())).slice(0,8))};
 const rel=(m,ql)=>{const n=(m.name||'').toLowerCase();return n===ql?0:n.startsWith(ql)?1:n.includes(ql)?2:3};
 const rate=m=>parseFloat(m.imdbRating)||0;
 const SK=Array.from({length:9},()=>'<div class="kh-c ks2-sk"><div class="kh-i"></div><span>&nbsp;</span></div>').join('');
 const SEARCH_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
 let tok=0,io=null,idle=0;

 /* artwork: a card gets its picture when it scrolls into view; the rest follow slowly, two at a time */
 const show=img=>{const s=img.dataset.src;if(!s)return;delete img.dataset.src;img.onload=()=>img.classList.add('in');img.onerror=()=>img.classList.add('in');img.src=s};
 const trickle=my=>{
  clearTimeout(idle);
  idle=setTimeout(()=>{
   if(my!==tok)return;
   const rest=QA('.ks2 img[data-src]').slice(0,2);
   if(!rest.length)return;
   rest.forEach(show);trickle(my);
  },260);
 };
 const watchImgs=(root)=>{
  if(!io)io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);show(e.target)}}),{rootMargin:'120px'});
  QA('img[data-src]',root).forEach(i=>io.observe(i));
 };

 V.search=async function(q=''){
  try{q=decodeURIComponent(q||'')}catch{}
  q=q.trim();
  const my=++tok;
  app.innerHTML='<div class="page ks2"><div class="ks2-bar'+(q?' has':'')+'">'+SEARCH_SVG+'<input id="ks2i" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="Search movies, series and anime" value="'+h(q)+'"><button id="ks2x" type="button" aria-label="Clear">\u2715</button></div><div id="ks2b"></div></div>';
  const inp=Q('#ks2i'),bar=Q('.ks2-bar'),box=Q('#ks2b');
  let timer=0,comp=false;
  const go=v=>{history.replaceState(null,'',v?'#/search/'+encodeURIComponent(v):'#/search');run(v)};
  const sched=()=>{clearTimeout(timer);bar.classList.toggle('has',!!inp.value);timer=setTimeout(()=>go(inp.value.trim()),230)};
  inp.addEventListener('compositionstart',()=>{comp=true});
  inp.addEventListener('compositionend',()=>{comp=false;sched()});
  inp.addEventListener('input',()=>{if(!comp)sched()});
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(timer);const v=inp.value.trim();addRec(v);go(v);inp.blur()}});
  Q('#ks2x').onclick=()=>{inp.value='';bar.classList.remove('has');inp.focus();clearTimeout(timer);go('')};
  box.addEventListener('click',e=>{if(e.target.closest('a.kh-c'))addRec(inp.value.trim())});
  if(!q||!(matchMedia('(pointer:coarse)').matches))setTimeout(()=>{if(my===tok)inp.focus()},60);
  run(q);

  function suggest(){
   const r=rec();
   box.innerHTML=r.length?'<div class="ks2-rec">'+r.map(x=>'<a href="#/search/'+encodeURIComponent(x)+'">'+h(x)+'</a>').join('')+'</div>':'<p class="ks2-empty">Start typing. Results appear as you type.</p>';
  }
  async function run(v){
   const me=++tok;clearTimeout(idle);
   if(v.length<2){suggest();return}
   const ql=v.toLowerCase(),seen=new Set(),res={movie:[],series:[],other:[]},nodes=new Map();
   const shell=(id,t)=>'<section class="kh-row ks2-row" id="ks2-'+id+'"><h2>'+t+'</h2><div class="kh-sc">'+SK+'</div></section>';
   box.innerHTML=shell('movie','Movies')+shell('series','Series');
   let dirty=false;
   const draw=()=>{
    if(dirty)return;dirty=true;
    requestAnimationFrame(()=>{
     dirty=false;if(me!==tok)return;
     for(const t of ['movie','series','other']){
      const list=res[t];if(!list.length)continue;
      let row=Q('#ks2-'+t,box);
      if(!row){box.insertAdjacentHTML('beforeend','<section class="kh-row ks2-row" id="ks2-'+t+'"><h2>Other</h2><div class="kh-sc"></div></section>');row=Q('#ks2-'+t,box)}
      const sc=Q('.kh-sc',row),h2=Q('h2',row);h2.innerHTML=(t==='movie'?'Movies':t==='series'?'Series':'Other')+' <small style="opacity:.5;font-weight:600">'+list.length+'</small>';
      const ord=list.slice().sort((a,b)=>rel(a,ql)-rel(b,ql)||rate(b)-rate(a));
      const els=[];
      for(const m of ord){
       const k=m.type+'|'+m.id;let n=nodes.get(k);
       if(!n){const t0=D.createElement('template');t0.innerHTML=(window.KTile?KTile(m):'').replace(' src="',' data-src="').trim();n=t0.content.firstElementChild;if(!n)continue;nodes.set(k,n)}
       els.push(n);
      }
      sc.replaceChildren(...els);watchImgs(sc);
     }
     trickle(me);
    });
   };
   const srcs=cats().filter(x=>(x.c.extra||[]).some(e=>e.name==='search'));
   const fetchOne=async(a,c,extra)=>{
    const r=await call(a,'catalog',c.type,c.id,'search='+encodeURIComponent(v)+extra).catch(()=>({}));
    if(me!==tok)return;
    let add=false;
    for(const m of r.metas||[]){const k=m.type+m.id;if(seen.has(k))continue;seen.add(k);(res[m.type==='movie'||m.type==='series'?m.type:'other']).push(m);add=true}
    if(add)draw();
   };
   const pool=async(jobs,n)=>{let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<jobs.length&&me===tok){const j=jobs[i++];await j()}}))};
   /* first page of every source, four at a time */
   await pool(srcs.map(({a,c})=>()=>fetchOne(a,c,'')),4);
   if(me!==tok)return;
   if(!seen.size)box.innerHTML='<p class="ks2-empty">No results for \u201c'+h(v)+'\u201d. Try a different spelling.</p>';
   else{QA('.ks2-sk',box).forEach(n=>n.remove());QA('.kh-row',box).forEach(r=>{if(!Q('.kh-c',r))r.remove()})}
   /* more results (page 2) only once the screen is calm */
   await sleep(600);
   if(me!==tok||!seen.size)return;
   await pool(srcs.map(({a,c})=>()=>fetchOne(a,c,'&skip=25')),2);
  }
 };
}
})();
