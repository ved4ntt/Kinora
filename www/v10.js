/* Kinora v10: Nuvio-class features and polish.
   Search with recents and Discover, calendar, richer Continue Watching with Up next, Top 10, in-player episodes,
   next-episode card, content advisory, touch gestures, shuffle, scroll arrows and rating badges. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const say=m=>{try{toast(m)}catch{}};
const COARSE=matchMedia('(pointer:coarse)').matches,HOVER=matchMedia('(hover:hover)').matches;
const on=k=>CFG()[k]!==false;
Object.assign(I,{
 shuffle:'<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 eps:'<rect x="7" y="3" width="14" height="12" rx="2"/><path d="M3 8v11a2 2 0 0 0 2 2h11"/>',
 chev:'<path d="M9 5l7 7-7 7"/>',chevl:'<path d="M15 5l-7 7 7 7"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'
});
const vidsOf=m=>(m&&m.videos||[]).filter(v=>v.season>0).sort((x,y)=>x.season-y.season||x.episode-y.episode);
const metaOf=async(type,id)=>{const a=addons.find(x=>has(x,'meta',type,id));if(!a)return null;return((await call(a,'meta',type,id).catch(()=>({}))).meta)||null};
const hashMedia=()=>{const m=/^#\/watch\/([^/]+)\/([^/?]+)(?:\/([^/?]+))?/.exec(location.hash);return m?{type:m[1],id:decodeURIComponent(m[2]),vid:m[3]?decodeURIComponent(m[3]):''}:null};
const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};

/* ================= decorating cards, hero and rows ================= */
let kt;const kick=()=>{clearTimeout(kt);kt=setTimeout(decorate,120)};
new MutationObserver(kick).observe(D.getElementById('app'),{childList:true,subtree:true});
function decorate(){
 QA('.card[data-k]:not([data-kd])').forEach(c=>{c.dataset.kd=1;const m=M[c.dataset.k];if(m&&m.imdbRating&&!Q('.kr',c))c.insertAdjacentHTML('beforeend',`<i class="kr">★ ${h(m.imdbRating)}</i>`)});
 QA('.hero .mt:not([data-kd]),.sinfo .mt:not([data-kd])').forEach(e=>{e.dataset.kd=1;e.innerHTML=e.innerHTML.replace(/^★ ([\d.]+)/,'<span class="kimdb"><b>IMDb</b>$1</span>')});
 arrows();playerPlus();seriesExtras();libraryExtras();
}
function arrows(){
 if(!HOVER)return;
 QA('.row .scroll:not([data-ka])').forEach(s=>{
  s.dataset.ka=1;const r=s.parentNode;r.classList.add('kar-row');
  r.insertAdjacentHTML('beforeend',`<button class="kar l off" aria-label="Scroll left">${ic('chevl')}</button><button class="kar r" aria-label="Scroll right">${ic('chev')}</button>`);
  const L=Q('.kar.l',r),R=Q('.kar.r',r);
  const upd=()=>{L.classList.toggle('off',s.scrollLeft<8);R.classList.toggle('off',s.scrollLeft+s.clientWidth>=s.scrollWidth-8)};
  s.addEventListener('scroll',upd,{passive:true});r.addEventListener('mouseenter',upd);
  L.onclick=()=>s.scrollBy({left:-s.clientWidth*.85,behavior:'smooth'});R.onclick=()=>s.scrollBy({left:s.clientWidth*.85,behavior:'smooth'});
  new ResizeObserver(upd).observe(s);upd();
 });
}

/* ================= home: Continue watching, Up next, Top 10 ================= */
const cwCard=p=>{
 const left=p.d?Math.max(0,p.d-p.t):0,pct=Math.min(100,100*p.t/(p.d||1));
 return`<div class="card kcw" data-pk="${h(p.vid||p.id)}"><a href="${watchUrl(p.type,p.id,p.vid)}"><img loading="lazy" src="${h(p.poster||'')}" alt="${h(p.name)}">${p.label?`<i class="kcl">${h(p.label.replace(/^S(\d+)E(\d+)$/,'S$1 E$2'))}</i>`:''}<span class="kpl">${ic('play')}</span><div class="kbar"><i style="width:${pct}%"></i></div></a><a class="kci2" href="#/title/${p.type}/${encodeURIComponent(p.id)}" aria-label="Details">${ic('info')}</a><button class="kcx" aria-label="Remove from Continue watching">${ic('x')}</button><b>${h(p.name)}</b><small>${ft(left)} left</small></div>`;
};
async function polishHome(){
 const hero=Q('#hero');if(!hero)return;
 const prog=Object.values(LS.get('prog',{})).sort((a,b)=>b.at-a.at);
 const live=prog.filter(p=>p.d&&p.t>20&&p.t/p.d<.92).slice(0,14);
 let sec=QA('.row').find(s=>/^continue watching$/i.test((Q('h2',s)||{}).textContent||''));
 const html=`<section class="row" id="kcw"><h2>Continue watching</h2><div class="scroll">${live.map(cwCard).join('')}</div></section>`;
 if(sec){sec.outerHTML=live.length?html:''}
 else if(live.length)hero.insertAdjacentHTML('afterend',html);
 const done=new Map();
 prog.filter(p=>p.type==='series'&&p.d&&p.t/p.d>=.92).forEach(p=>{if(!done.has(p.id)&&!live.some(x=>x.id===p.id))done.set(p.id,p)});
 [...done.values()].slice(0,6).forEach(async p=>{
  const m=await metaOf('series',p.id);if(!m||!Q('#hero'))return;
  const vs=vidsOf(m),i=vs.findIndex(v=>v.id===p.vid),n=vs[i+1];
  if(i<0||!n||EW()[n.id]||(n.released&&new Date(n.released)>new Date()))return;
  let box=Q('#kcw .scroll');
  if(!box){Q('#hero').insertAdjacentHTML('afterend','<section class="row" id="kcw"><h2>Continue watching</h2><div class="scroll"></div></section>');box=Q('#kcw .scroll')}
  box.insertAdjacentHTML('afterbegin',`<div class="card kcw kup"><a href="${watchUrl('series',p.id,n.id)}"><img loading="lazy" src="${h(m.poster||p.poster||'')}" alt="${h(m.name)}"><i class="kcl up">Up next · S${n.season} E${n.episode}</i><span class="kpl">${ic('play')}</span></a><b>${h(m.name)}</b><small>${h(n.title||n.name||'Episode '+n.episode)}</small></div>`);
 });
 if(on('top10')){
  const f=cats()[0];if(!f)return;
  const r=await call(f.a,'catalog',f.c.type,f.c.id).catch(()=>null),ms=((r&&r.metas)||[]).filter(m=>m.poster&&!(CFG().hideAdult&&adult(m))).slice(0,10);
  if(!ms.length||!Q('#hero')||Q('#kt10'))return;
  ms.forEach(m=>{M[m.type+'|'+m.id]=m});
  const t=`<section class="row" id="kt10"><h2>Top 10 ${typeLabel(f.c.type).toLowerCase()} right now</h2><div class="scroll t10">${ms.map((m,i)=>`<div class="t10w"><i class="t10n">${i+1}</i>${card(m,i)}</div>`).join('')}</div></section>`;
  const after=Q('#kcw')||Q('#hero');after.insertAdjacentHTML('afterend',t);
 }
}
{const h0=V.home;V.home=async function(){await h0.apply(this,arguments);try{await polishHome()}catch{}}}
D.addEventListener('click',e=>{
 const x=e.target.closest('.kcx');if(!x)return;
 e.preventDefault();e.stopPropagation();
 const c=x.closest('.kcw'),k=c.dataset.pk,p=LS.get('prog',{});
 if(p[k]){delete p[k];LS.set('prog',p)}
 c.classList.add('gone');setTimeout(()=>{c.remove();const s=Q('#kcw .scroll');if(s&&!s.children.length)Q('#kcw').remove()},260);
},true);

/* ================= search: recents and Discover ================= */
const recent=()=>LS.get('recent',[]);
const addRecent=q=>{q=q.trim();if(q.length<2)return;LS.set('recent',[q,...recent().filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,8))};
{const s0=V.search;V.search=function(q){
 const raw=q?decodeURIComponent(q):'';
 if(!raw.trim())return discoverPage();
 addRecent(raw);return s0.apply(this,arguments);
}}
async function discoverPage(){
 const rec=recent();
 app.innerHTML=`<div class="page"><h1>Search</h1>${rec.length?`<div class="krec"><h2>Recent searches</h2><div class="krl">${rec.map(q=>`<div class="krc"><a href="#/search/${encodeURIComponent(q)}">${ic('clock')}<span>${h(q)}</span></a><button data-rm="${h(q)}" aria-label="Remove">${ic('x')}</button></div>`).join('')}</div><button class="klink" id="rclr">Clear all</button></div>`:'<p class="sub">Use the search box above to find a movie or series.</p>'}
  <h2>Discover</h2><div class="kdisc"><select id="dt" aria-label="Type"><option value="movie">Movies</option><option value="series">Series</option></select><select id="dc" aria-label="Catalog"></select><select id="dg" aria-label="Genre"></select></div><div class="grid" id="dgrid"></div><div id="dmore" class="kmore"></div></div>`;
 const g=Q('#dgrid');let skip=0,busy=0,tok=0,end=0;
 const list=()=>cats().filter(x=>x.c.type===Q('#dt').value);
 const fillC=()=>{Q('#dc').innerHTML=list().map((x,i)=>`<option value="${i}">${h(x.c.name||x.c.id)}</option>`).join('');fillG()};
 const fillG=()=>{const x=list()[+Q('#dc').value],o=x?((x.c.extra||[]).find(e=>e.name==='genre')||{}).options||[]:[];Q('#dg').innerHTML='<option value="">All genres</option>'+o.map(v=>`<option>${h(v)}</option>`).join('');Q('#dg').style.display=o.length?'':'none'};
 const load=async(reset)=>{
  if(reset){tok++;skip=0;end=0;g.innerHTML='';Q('#dmore').innerHTML=''}
  if(busy||end)return;busy=1;const my=tok,x=list()[+Q('#dc').value];
  if(!x){busy=0;g.innerHTML='<p class="sub">No catalogs available for this type.</p>';return}
  Q('#dmore').innerHTML=LDS;
  const r=await call(x.a,'catalog',x.c.type,x.c.id,[Q('#dg').value&&'genre='+encodeURIComponent(Q('#dg').value),skip&&'skip='+skip].filter(Boolean).join('&')).catch(()=>({}));
  busy=0;if(my!==tok||!Q('#dgrid'))return;
  const ms=r.metas||[];if(!ms.length)end=1;
  g.insertAdjacentHTML('beforeend',ms.map((m,i)=>card(m,i)).join(''));skip+=ms.length;
  Q('#dmore').innerHTML=end?'':'<button class="btn" id="dml">Show more</button>';
  const b=Q('#dml');if(b)b.onclick=()=>load();
 };
 Q('#dt').onchange=()=>{fillC();load(true)};Q('#dc').onchange=()=>{fillG();load(true)};Q('#dg').onchange=()=>load(true);
 app.querySelectorAll('[data-rm]').forEach(b=>b.onclick=e=>{e.stopPropagation();LS.set('recent',recent().filter(x=>x!==b.dataset.rm));discoverPage()});
 const cl=Q('#rclr');if(cl)cl.onclick=()=>{LS.set('recent',[]);discoverPage()};
 fillC();load(true);
}
/* on phones the search icon opens the bar; also show Discover underneath */
D.addEventListener('click',e=>{if(COARSE&&e.target.closest('#sf svg')&&!/^#\/search/.test(location.hash))setTimeout(()=>{location.hash='#/search'},60)},true);

/* ================= calendar ================= */
function libraryExtras(){
 const p=Q('.page h1');if(!p||p.textContent!=='Library'||Q('#kcal'))return;
 if(!Q('#lt2'))return;
 p.insertAdjacentHTML('afterend',`<a class="rb kcalb" id="kcal" href="#/calendar" title="Calendar" aria-label="Calendar">${ic('cal')}</a>`);
}
V.calendar=async function(){
 app.innerHTML=`<div class="page"><h1>Calendar</h1><p class="sub">New episodes for the series in your library and watch history.</p><div id="cal">${LDS}</div></div>`;
 const ids=new Map();
 Object.values(LS.get('lib',{})).filter(x=>x.type==='series').forEach(x=>ids.set(x.id,x));
 Object.values(LS.get('prog',{})).filter(x=>x.type==='series').forEach(x=>ids.set(x.id,x));
 Object.values(ST()).filter(x=>x.type==='series'&&(x.l||x.r==='love'||x.r==='like')).forEach(x=>ids.set(x.id,x));
 const list=[...ids.values()].slice(0,30);
 if(!list.length){Q('#cal').innerHTML='<p class="sub">Save a series or start watching one and its new episodes will show here.</p>';return}
 const ms=await Promise.all(list.map(x=>metaOf('series',x.id).catch(()=>null)));
 if(!Q('#cal'))return;
 const now=startOfDay(new Date()),far=new Date(now.getTime()+60*864e5),back=new Date(now.getTime()-14*864e5),ev=[];
 ms.forEach(m=>{if(!m)return;vidsOf(m).forEach(v=>{if(!v.released)return;const d=new Date(v.released);if(isNaN(d))return;if(d>=back&&d<far)ev.push({d,m,v})})});
 const fmtD=d=>{const n=Math.round((startOfDay(d)-now)/864e5);return n===0?'Today':n===1?'Tomorrow':n===-1?'Yesterday':d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})};
 const item=x=>`<a class="kev${EW()[x.v.id]?' wtd':''}" href="#/title/series/${encodeURIComponent(x.m.id)}"><img loading="lazy" src="${h(x.v.thumbnail||x.m.background||x.m.poster||'')}" alt=""><div><b>${h(x.m.name)}</b><small>S${x.v.season} E${x.v.episode} · ${h(x.v.title||x.v.name||'Episode '+x.v.episode)}</small></div></a>`;
 const grp=(arr)=>{const g=new Map();arr.forEach(x=>{const k=startOfDay(x.d).getTime();(g.get(k)||g.set(k,[]).get(k)).push(x)});return[...g.entries()].map(([k,v])=>`<div class="kday"><h3>${h(fmtD(new Date(k)))}</h3><div class="kevl">${v.map(item).join('')}</div></div>`).join('')};
 const up=ev.filter(x=>x.d>=now).sort((a,b)=>a.d-b.d),old=ev.filter(x=>x.d<now).sort((a,b)=>b.d-a.d);
 Q('#cal').innerHTML=(up.length?`<h2>Coming up</h2>${grp(up)}`:'<p class="sub">No new episodes are scheduled in the next two months.</p>')+(old.length?`<h2>Recently aired</h2>${grp(old)}`:'');
};

/* ================= series extras: shuffle ================= */
function seriesExtras(){
 const a=Q('.hero.dt .acts');if(!a||Q('#ksh'))return;
 const p=location.hash.split('/');if(p[1]!=='title'||p[2]!=='series')return;
 a.insertAdjacentHTML('beforeend',`<button class="rb" id="ksh" title="Shuffle an episode" aria-label="Shuffle an episode">${ic('shuffle')}</button>`);
 Q('#ksh').onclick=()=>{
  const id=decodeURIComponent(p[3]||''),m=M['series|'+id],vs=vidsOf(m);
  if(!vs.length)return say('No episode list is available for shuffle');
  const w=EW(),pool=vs.filter(v=>!w[v.id]&&(!v.released||new Date(v.released)<=new Date())),src=pool.length?pool:vs,v=src[Math.floor(Math.random()*src.length)];
  say('Shuffled: S'+v.season+' E'+v.episode);location.hash=watchUrl('series',id,v.id);
 };
}

/* ================= player: gestures, next episode, episodes, content advisory ================= */
const G={br:1};
const hud=(t,side)=>{
 const pl=Q('#pl');if(!pl)return;
 let e=Q('#khud');if(!e){e=D.createElement('div');e.id='khud';pl.append(e)}
 e.textContent=t;e.className='on'+(side?' '+side:'');clearTimeout(hud.t);hud.t=setTimeout(()=>e.classList.remove('on'),side?650:900);
};
function playerPlus(){
 const pl=Q('#pl');if(!pl||pl.dataset.k10)return;pl.dataset.k10=1;
 const mm=hashMedia();if(!mm)return;
 G.dismissed=false;G.nextInfo=null;G.br=1;
 /* episodes button (series only) */
 const cc=Q('#cc');
 if(mm.type==='series'&&cc&&!Q('#kep')){
  cc.insertAdjacentHTML('beforebegin',`<button class="cb" id="kep" title="Episodes" aria-label="Episodes">${ic('eps')}</button>`);
  Q('#kep').onclick=e=>{e.stopPropagation();episodesPanel(mm)};
 }
 /* next episode info */
 if(mm.type==='series')metaOf('series',mm.id).then(m=>{
  const vs=vidsOf(m),i=vs.findIndex(v=>v.id===mm.vid),n=vs[i+1];
  if(n)G.nextInfo={v:n,m,key:mm.vid}
 });
 /* content advisory */
 if(on('pGuide')&&/^tt\d+/.test(mm.id)){
  const once=()=>{D.removeEventListener('playing',once,true);advisory(mm.id)};
  D.addEventListener('playing',once,true);
 }
 if(COARSE)gestures(pl);
 const iv=setInterval(()=>{if(!pl.isConnected)return clearInterval(iv);nextCard(pl)},500);
}
/* --- next episode card --- */
function nextCard(pl){
 const v=Q('#vw video'),nx=Q('#nx'),info=G.nextInfo;let e=Q('#kne');
 const rem=v&&isFinite(v.duration)?v.duration-v.currentTime:1e9;
 const show=on('nextCard')&&v&&nx&&info&&!G.dismissed&&v.duration>180&&rem<=25&&rem>.5&&!v.paused;
 if(!show){if(e)e.classList.remove('on');return}
 const n=info.v,t=n.title||n.name||'Episode '+n.episode;
 if(!e){
  e=D.createElement('div');e.id='kne';
  e.innerHTML=`<img alt=""><div class="kni"><small>Up next</small><b></b><small class="knt"></small></div><button class="btn p" data-go>Play now</button><button class="rb kx" data-x aria-label="Dismiss">${ic('x')}</button>`;
  pl.append(e);
  e.onclick=ev=>{
   if(ev.target.closest('[data-go]'))nx.click();
   else if(ev.target.closest('[data-x]')){G.dismissed=true;const vv=Q('#vw video');if(vv)vv.onended=null;e.classList.remove('on')}
  };
 }
 const im=Q('img',e);if(im.dataset.s!==(n.thumbnail||'')){im.dataset.s=n.thumbnail||'';im.src=n.thumbnail||info.m.poster||''}
 Q('b',e).textContent='S'+n.season+' E'+n.episode+' · '+t;
 Q('.knt',e).textContent=CFG().autonext!==false?'Starting in '+Math.ceil(rem)+'s':'Ready when you are';
 e.classList.add('on');
}
/* --- episodes panel --- */
async function episodesPanel(mm){
 const pl=Q('#pl');if(!pl)return;
 let p=Q('#kpe');if(p){p.classList.toggle('on');return}
 p=D.createElement('aside');p.id='kpe';p.className='on';p.innerHTML=`<header><h2>Episodes</h2><button class="rb" data-x aria-label="Close">${ic('x')}</button></header><div class="tabs" id="kps"></div><div class="kpl2">${LDS}</div>`;
 pl.append(p);
 p.onclick=e=>{e.stopPropagation();if(e.target.closest('[data-x]'))p.classList.remove('on')};
 pl.addEventListener('click',e=>{if(!e.target.closest('#kpe,#kep'))p.classList.remove('on')});
 const m=await metaOf('series',mm.id);if(!p.isConnected)return;
 const vs=vidsOf(m),seasons=[...new Set(vs.map(v=>v.season))],cur=vs.find(v=>v.id===mm.vid);
 let s=(cur||vs[0]||{}).season;
 const draw=()=>{
  Q('#kps',p).innerHTML='<i class="ind"></i>'+seasons.map(x=>`<button class="${x===s?'on':''}" data-s="${x}">Season ${x}</button>`).join('');
  Q('.kpl2',p).innerHTML=vs.filter(v=>v.season===s).map(v=>`<a class="kpe${v.id===mm.vid?' on':''}${EW()[v.id]?' wtd':''}" href="${watchUrl('series',mm.id,v.id)}"><img loading="lazy" src="${h(v.thumbnail||'')}" alt=""><div><b>${v.episode}. ${h(v.title||v.name||'Episode '+v.episode)}</b><small>${v.released?new Date(v.released).toLocaleDateString():''}</small></div>${EW()[v.id]?`<i>${ic('check')}</i>`:''}</a>`).join('')||'<p class="sub">No episodes listed.</p>';
  const c=Q('.kpe.on',p);if(c)c.scrollIntoView({block:'center'});slide();
 };
 Q('#kps',p).onclick=e=>{const b=e.target.closest('button');if(b){s=+b.dataset.s;draw()}};
 draw();
}
/* --- content advisory (from IMDb's parents guide) --- */
const PGM=[['VIOLENCE','Violence'],['PROFANITY','Profanity'],['FRIGHTENING_INTENSE_SCENES','Frightening'],['ALCOHOL_DRUGS','Alcohol/Drugs'],['SEXUAL_CONTENT','Nudity']];
function parseGuide(j){
 const cats=(j&&(j.parentsGuide||j.categories))||[];if(!Array.isArray(cats))return null;
 const by={};cats.forEach(c=>{by[String(c.category||'').toUpperCase()]=c});
 const out=[];
 PGM.forEach(([k,l])=>{
  const b=(by[k]&&by[k].severityBreakdowns)||[],none=b.find(x=>String(x.severityLevel).toLowerCase()==='none'),
   top=b.filter(x=>String(x.severityLevel).toLowerCase()!=='none').sort((a,c)=>(c.voteCount||0)-(a.voteCount||0))[0];
  if(!top||(none&&(none.voteCount||0)>(top.voteCount||0)))return;
  const s=String(top.severityLevel).toLowerCase();out.push([l,s.charAt(0).toUpperCase()+s.slice(1)]);
 });
 return out;
}
async function guideOf(id){
 const k='pg:'+id,c=LS.get(k,null);
 if(c&&Date.now()-c.t<(c.v&&c.v.length?30:2)*864e5)return c.v;
 let v=null;
 try{const r=await fetch('https://api.imdbapi.dev/titles/'+id+'/parentsGuide');if(r.ok)v=parseGuide(await r.json())}catch{}
 LS.set(k,{t:Date.now(),v});return v;
}
async function advisory(id){
 const v=await guideOf(id);
 const pl=Q('#pl');if(!v||!v.length||!pl)return;
 const e=D.createElement('div');e.id='kpg';
 e.innerHTML=v.map(([l,s])=>`<p><b>${h(l)}</b><span> · ${h(s)}</span></p>`).join('');
 pl.append(e);requestAnimationFrame(()=>e.classList.add('on'));
 setTimeout(()=>{e.classList.remove('on');setTimeout(()=>e.remove(),700)},7500);
}
/* --- touch gestures: double-tap, hold for 2x, swipe to seek / volume / brightness --- */
function gestures(pl){
 const vw=Q('#vw',pl);if(!vw)return;
 let g=null,tapAt=0,tapX=0,tapT=0,holdT=0,lastTouch=0;
 const V1=()=>Q('#vw video'),skip=()=>CFG().skip||10;
 ['click','dblclick'].forEach(t=>vw.addEventListener(t,e=>{if(Date.now()-lastTouch<700){e.stopImmediatePropagation();e.preventDefault()}},true));
 vw.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!on('gestures'))return;const v=V1();if(!v)return;
  lastTouch=Date.now();
  g={id:e.pointerId,x:e.clientX,y:e.clientY,mode:'',vol:v.volume,time:v.currentTime,br:G.br,act:pl.classList.contains('act')};
  clearTimeout(holdT);
  if(on('hold2x'))holdT=setTimeout(()=>{const vv=V1();if(g&&!g.mode&&vv&&!vv.paused){g.mode='hold';g.rate=vv.playbackRate;vv.playbackRate=2;hud('2× speed')}},480);
 });
 vw.addEventListener('pointermove',e=>{
  if(!g||e.pointerId!==g.id)return;const v=V1();if(!v)return;
  lastTouch=Date.now();
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(!g.mode&&(Math.abs(dx)>16||Math.abs(dy)>16)){clearTimeout(holdT);g.mode=Math.abs(dx)>Math.abs(dy)?'seek':(g.x<innerWidth/2?'bright':'vol')}
  if(g.mode==='seek'&&isFinite(v.duration)){const t=Math.max(0,Math.min(v.duration,g.time+dx/innerWidth*Math.min(v.duration,420)));g.target=t;hud((t>=g.time?'+':'−')+ft(Math.abs(t-g.time))+'   '+ft(t))}
  else if(g.mode==='vol'){const x=Math.max(0,Math.min(1,g.vol-dy/(innerHeight*.75)));v.volume=x;v.muted=false;hud('Volume '+Math.round(x*100)+'%')}
  else if(g.mode==='bright'){G.br=Math.max(.35,Math.min(1.6,g.br-dy/(innerHeight*.75)));v.style.filter='brightness('+G.br.toFixed(2)+')';hud('Brightness '+Math.round(G.br*100)+'%')}
 });
 const end=e=>{
  if(!g||(e.pointerId!==g.id))return;
  clearTimeout(holdT);lastTouch=Date.now();
  const v=V1(),m=g.mode,x=e.clientX,wasAct=g.act,tgt=g.target;g=null;
  if(!v)return;
  if(m==='hold'){v.playbackRate=CFG().speed||1;return}
  if(m==='seek'){if(e.type==='pointerup'&&tgt!=null)v.currentTime=tgt;return}
  if(m)return;
  if(e.type==='pointercancel')return;
  const now=Date.now();
  if(now-tapAt<320&&Math.abs(x-tapX)<90){
   clearTimeout(tapT);tapAt=0;const w=innerWidth;
   if(x<w*.38){v.currentTime=Math.max(0,v.currentTime-skip());hud('−'+skip()+' s','l')}
   else if(x>w*.62){v.currentTime=Math.min(v.duration||1e9,v.currentTime+skip());hud('+'+skip()+' s','r')}
   else v.paused?v.play():v.pause();
   pl.wake&&pl.wake();
  }else{
   tapAt=now;tapX=x;
   tapT=setTimeout(()=>{tapAt=0;if(wasAct){pl.classList.remove('act')}else pl.wake&&pl.wake()},320);
  }
 };
 vw.addEventListener('pointerup',end);vw.addEventListener('pointercancel',end);
}

/* ================= settings additions ================= */
if(window.K6){
 const row=(k,t,s)=>`<div class="k6o"><span><b>${t}</b><small>${s}</small></span><button class="k6t${on(k)?' on':''}" data-tg="${k}" role="switch" aria-checked="${on(k)}" aria-label="${t}"></button></div>`;
 const pp=K6.PAGES.play;
 K6.PAGES.play=()=>{pp();const p=Q('.k6');if(p)p.insertAdjacentHTML('beforeend',`<h4 class="k6h">Player extras</h4><div class="k6c">${row('pGuide','Content advisory','Show violence, language and other notes for a few seconds when a title starts')}${row('nextCard','Next episode card','Show an Up next card near the end of an episode')}${COARSE?row('gestures','Touch gestures','Double-tap to skip, swipe to seek, and slide to change volume or brightness'):''}</div>`)};
 const lk=K6.PAGES.look;
 K6.PAGES.look=()=>{lk();const p=Q('.k6');if(p)p.insertAdjacentHTML('beforeend',`<h4 class="k6h">Home</h4><div class="k6c">${row('top10','Top 10 row','Show a numbered Top 10 row on the home page')}</div>`)};
}
decorate();
})();
