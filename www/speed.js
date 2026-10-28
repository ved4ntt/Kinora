/* Kinora smart source + player fixes
   - learns which sources start fastest on this device and puts them first (no add-on is made "default")
   - hides sources that keep failing
   - shows the full length of the video straight away (the timeline no longer starts at 10 seconds)
   - an audio picker that works: real tracks when the player exposes them, otherwise the languages found in your sources
   - a prompt to turn on P2P when only torrent sources exist
   - Explore page (Movies, Series, Live TV, Calendar) */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const say=m=>{try{toast(m)}catch{}};
const DAY=864e5,HR=36e5;
const mode=()=>CFG().srcMode||'fast';

/* ================= learned source speed ================= */
const host=s=>{try{return new URL(s.url).hostname.replace(/^www\./,'')}catch{return''}};
const sid=s=>s&&s.url?host(s)+'|'+String(s._a||'').slice(0,40):'';
const db=()=>LS.get('spd',{});
const save=o=>{const k=Object.keys(o);if(k.length>150)k.sort((a,b)=>o[a].t-o[b].t).slice(0,k.length-120).forEach(x=>delete o[x]);LS.set('spd',o)};
const DEAD=new Set();
const blank=()=>({ms:0,n:0,ok:0,f:0,t:0,lf:0});
function ok(s,ms){const k=sid(s);if(!k)return;const o=db(),e=o[k]||blank();e.ms=e.ok?Math.round(e.ms*.6+ms*.4):Math.round(ms);e.ok++;e.n++;e.f=0;e.t=Date.now();o[k]=e;save(o);DEAD.delete(s.url)}
function bad(s){const k=sid(s);if(!k)return;const o=db(),e=o[k]||blank();e.f++;e.n++;e.t=e.lf=Date.now();o[k]=e;save(o);DEAD.add(s.url)}
const ent=s=>{const e=db()[sid(s)];return e&&Date.now()-e.t<21*DAY?e:null};
function pen(s){
 const e=ent(s);let p=0;
 if(e&&e.f&&Date.now()-e.lf<6*HR)p+=Math.min(3,e.f)*3;
 if(mode()==='quality')return p;
 return p+(e&&e.ok?Math.min(7,e.ms/1400):.9);
}
function dead(s){if(!s)return false;if(DEAD.has(s.url))return true;const e=ent(s);return!!(e&&!e.ok&&e.f>=2&&Date.now()-e.lf<12*HR)}
function limit(s){const e=ent(s);return e&&e.ok?Math.max(9000,Math.min(25000,e.ms*3+4000)):25000}
window.KSpeed={ok,bad,pen,dead,limit,ent,sid,reset(){LS.set('spd',{});DEAD.clear()}};
try{if(CFG().defSrc)setCfg({defSrc:''})}catch{}

/* ================= full length straight away ================= */
const realD=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'duration').get;
const RT={};
const rt2s=r=>{if(!r)return 0;const s=String(r),h=/(\d+)\s*h/i.exec(s),m=/(\d+)\s*m/i.exec(s);if(h||m)return((h?+h[1]:0)*60+(m?+m[1]:0))*60;const x=/(\d+)/.exec(s);return x?+x[1]*60:0};
async function runtimeOf(ctx){
 const k=ctx.type+'|'+ctx.id+'|'+(ctx.vid||'');if(k in RT)return RT[k];RT[k]=0;
 try{const a=addons.find(x=>has(x,'meta',ctx.type,ctx.id));if(a){const m=((await call(a,'meta',ctx.type,ctx.id)).meta)||{},ep=(m.videos||[]).find(v=>v.id===ctx.vid);RT[k]=rt2s((ep&&ep.runtime)||m.runtime)}}catch{}
 return RT[k];
}
function fixDur(v,ctx){
 if(!ctx.type||ctx.type==='tv')return;
 const k=ctx.type+'|'+ctx.id+'|'+(ctx.vid||'');
 let rt=RT[k]||0,last=0,since=performance.now(),trusted=false;
 runtimeOf(ctx).then(x=>{rt=x||0});
 Object.defineProperty(v,'duration',{configurable:true,get(){
  const d=realD.call(v);
  if(trusted||!(rt>0))return d;
  if(isFinite(d)&&d>0){
   if(Math.abs(d-last)>.5){last=d;since=performance.now()}
   if(d>=rt*.7||(v.readyState>=3&&d>120&&performance.now()-since>9000)){trusted=true;return d}
  }
  return rt;
 }});
}

/* ================= measure every real playback attempt ================= */
{const p0=play;play=function(s,ctx){
 const r=p0.apply(this,arguments);
 const v=Q('#vw video');if(!v||!s||!s.url)return r;
 try{fixDur(v,ctx||{})}catch{}
 const t=performance.now();let fin=false,to=0;
 const done=good=>{if(fin)return;fin=true;clearTimeout(to);if(!v.isConnected||!navigator.onLine)return;good?ok(s,performance.now()-t):bad(s)};
 to=setTimeout(()=>done(false),limit(s)+1500);
 v.addEventListener('playing',()=>done(true),{once:true});
 v.addEventListener('error',()=>done(false),{once:true});
 return r;
}}

/* ================= sources menu: hide the dead, show how fast the rest are ================= */
function decorate(mn){
 const ks=window.KS;if(!ks)return;
 QA('button[data-s]',mn).forEach(b=>{
  if(b.dataset.kd)return;b.dataset.kd=1;
  const i=+b.dataset.s,s=ks.S[i];if(!s)return;
  if(dead(s)&&i!==ks.cur()){b.remove();return}
  const e=ent(s),sm=Q('small',b);
  if(sm&&e&&e.ok)sm.insertAdjacentHTML('beforeend',` <em class="kspd">${(e.ms/1000).toFixed(1)}s to start</em>`);
 });
}
/* ================= P2P prompt ================= */
D.addEventListener('click',e=>{if(!e.target.closest||!e.target.closest('[data-p2p]'))return;e.stopPropagation();setCfg({p2p:true});say('P2P is on');setTimeout(()=>route(),150)},true);
const p2pBtn='<button class="btn p kp2" data-p2p>Turn on P2P</button>';
addEventListener('hashchange',()=>{window.__kTor=0});
function notes(){
 const off=CFG().p2p===false,n=window.__kTor||0,msg=Q('#vw .msg');
 if(msg&&!Q('.kp2n',msg)){
  if(off&&n)msg.insertAdjacentHTML('beforeend',`<div class="kp2n"><p>${n} torrent source${n>1?'s are':' is'} hidden because P2P is off. Turn it on to see ${n>1?'them':'it'}.</p>${p2pBtn}</div>`);
  else if(/torrent/i.test(msg.textContent))msg.insertAdjacentHTML('beforeend','<div class="kp2n"><p>Torrent sources only play when your add-on turns them into direct links with a debrid service. Pick a source that has a direct link.</p></div>');
 }
 const mn=Q('#mn.on');
 if(mn&&/^Sources/.test((Q('h3',mn)||{}).textContent||'')){
  decorate(mn);
  if(off&&n&&!Q('.kp2n',mn))mn.insertAdjacentHTML('beforeend',`<div class="kp2n"><p>${n} torrent source${n>1?'s':''} hidden (P2P is off).</p>${p2pBtn}</div>`);
 }
}
let nt;new MutationObserver(()=>{clearTimeout(nt);nt=setTimeout(notes,90)}).observe(D.getElementById('app'),{childList:true,subtree:true});

/* ================= audio picker ================= */
const LN={en:'English',hi:'Hindi',ta:'Tamil',te:'Telugu',ml:'Malayalam',kn:'Kannada',bn:'Bengali',mr:'Marathi',pa:'Punjabi',es:'Spanish',fr:'French',de:'German',it:'Italian',ja:'Japanese',ko:'Korean',ru:'Russian',ar:'Arabic',tr:'Turkish',zh:'Chinese',pt:'Portuguese'};
const LANGS=[['Hindi',/\b(hindi|hin)\b/i],['English',/\b(english|eng)\b/i],['Tamil',/\b(tamil|tam)\b/i],['Telugu',/\b(telugu|tel)\b/i],['Malayalam',/\bmalayalam\b/i],['Kannada',/\bkannada\b/i],['Bengali',/\bbengali\b/i],['Marathi',/\bmarathi\b/i],['Punjabi',/\bpunjabi\b/i],['Spanish',/\b(spanish|latino)\b/i],['French',/\bfrench\b/i],['German',/\bgerman\b/i],['Italian',/\bitalian\b/i],['Japanese',/\bjapanese\b/i],['Korean',/\bkorean\b/i],['Russian',/\brussian\b/i],['Arabic',/\barabic\b/i],['Turkish',/\bturkish\b/i],['Chinese',/\b(chinese|mandarin)\b/i]];
const txt=s=>`${s.name||''} ${s.title||s.description||''} ${(s.behaviorHints&&s.behaviorHints.filename)||''}`;
const langsOf=s=>LANGS.filter(([,re])=>re.test(txt(s))).map(x=>x[0]);
const multiOf=s=>/\b(dual|multi)[ ._-]?(audio|lang)?\b/i.test(txt(s))||langsOf(s).length>1;
const tname=(t,i)=>String(t.name||t.label||LN[String(t.lang||t.language||'').slice(0,2).toLowerCase()]||t.lang||t.language||'Track '+(i+1));
const score=s=>(wr(s)?0:20)+qd(s)+pen(s);
function audioMenu(){
 const mn=Q('#mn'),v=Q('#pl video');if(!mn)return;
 if(mn.classList.contains('on')&&/^Audio/.test((Q('h3',mn)||{}).textContent||'')){mn.classList.remove('on');return}
 const T=[],hl=typeof HL!=='undefined'?HL:null;
 if(hl&&hl.audioTracks&&hl.audioTracks.length>1)hl.audioTracks.forEach((t,i)=>T.push({n:tname(t,i),on:i===hl.audioTrack,set:()=>{hl.audioTrack=i}}));
 else if(v&&v.audioTracks&&v.audioTracks.length>1)[...v.audioTracks].forEach((t,i)=>T.push({n:tname(t,i),on:t.enabled,set:()=>[...v.audioTracks].forEach((x,j)=>{x.enabled=j===i})}));
 const ks=window.KS,cur=ks&&ks.cur()>=0?ks.S[ks.cur()]:null,curL=cur?langsOf(cur):[],alt=[];
 if(ks)LANGS.forEach(([n])=>{
  const c=ks.S.map((s,i)=>[s,i]).filter(([s,i])=>s.url&&!/^(magnet|torrent):/.test(s.url)&&!dead(s)&&langsOf(s).includes(n));
  if(!c.length)return;
  const here=curL.includes(n),others=c.filter(([,i])=>i!==ks.cur());
  if(!here&&!others.length)return;
  others.sort((a,b)=>score(a[0])-score(b[0]));
  alt.push({n,here,i:others[0]?others[0][1]:-1,c:others.length});
 });
 let html='<h3>Audio</h3>',list=[];
 T.forEach(x=>{list.push(x)});
 if(T.length)html+=T.map((x,i)=>`<button class="mi${x.on?' on':''}" data-aud="${i}">${h(x.n)}</button>`).join('');
 if(alt.length){
  html+=T.length?'<h3>Other languages</h3>':'';
  alt.forEach(a=>{
   const i=list.length;
   list.push({set:()=>{if(!a.here&&a.i>=0)ks.go(a.i,v?v.currentTime:0)}});
   html+=`<button class="mi${a.here?' on':''}" data-aud="${i}">${h(a.n)}<small>${a.here?'Playing now':'Switch to a source with '+a.c+' option'+(a.c>1?'s':'')}</small></button>`;
  });
 }
 if(!T.length){
  html+=!alt.length?'<p class="sub" style="padding:6px 12px">This stream has one audio track.</p>'
   :(cur&&multiOf(cur)?'<p class="sub" style="padding:6px 12px">This file holds several audio tracks, but this player cannot switch between them here. Pick a source in your language above.</p>':'');
 }
 mn.className='on sm';mn.innerHTML=html;mn._t=list;
}
D.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#aud')){e.stopPropagation();e.preventDefault();audioMenu()}},true);

/* ================= Explore ================= */
V.explore=function(){
 const T=[['discover/movie','film','Movies','Popular, new and by genre'],['discover/series','tv','Series','Shows and seasons'],['live','live','Live TV','Channels from your playlists'],['calendar','cal','Calendar','New episodes of your series']];
 app.innerHTML=`<div class="page"><h1>Explore</h1><p class="sub">Browse everything Kinora can show.</p><div class="kex">${T.map(([r,i,t,d])=>`<a class="kxt" href="#/${r}"><i>${ic(i)}</i><b>${t}</b><small>${d}</small></a>`).join('')}</div></div>`;
};
{const r0=renderPm;renderPm=function(){
 r0.apply(this,arguments);const m=Q('#pm');
 if(m&&!Q('#kxp',m)){m.insertAdjacentHTML('beforeend','<a class="btn" id="kxp" href="#/explore" style="display:block;width:100%;margin-top:8px;text-align:center">Explore · Movies, Series, Live TV</a>');Q('#kxp',m).onclick=()=>m.classList.remove('on')}
}}
try{renderPm()}catch{}
if(window.K6){
 const hub=K6.PAGES.hub;
 K6.PAGES.hub=()=>{hub();const c=Q('.k6 .k6c');if(c)c.insertAdjacentHTML('afterbegin',`<a class="k6r" href="#/explore"><i><svg viewBox="0 0 24 24">${I.film}</svg></i><span><b>Explore</b><small>Movies, Series, Live TV and Calendar</small></span><svg class="cv" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></a>`)};
 const pp=K6.PAGES.play;
 K6.PAGES.play=()=>{
  pp();const first=Q('.k6 .k6h');if(!first)return;
  const m=mode(),n=Object.keys(db()).length;
  first.insertAdjacentHTML('beforebegin',`<h4 class="k6h">Default source</h4><div class="k6c"><div class="k6o"><span><b>How Kinora picks a source</b><small>Fastest start remembers which sources start quickest on this device and tries them first. Sources that keep failing are hidden.</small></span><div class="k6ch"><button class="ch${m==='fast'?' on':''}" data-set="srcMode" data-v="fast">Fastest start</button><button class="ch${m==='quality'?' on':''}" data-set="srcMode" data-v="quality">Best quality</button></div></div><div class="k6o"><span><b>Learned so far</b><small id="kspn">${n?n+' sources measured on this device':'Nothing yet. It learns as you watch.'}</small></span><button class="btn" id="kspf">Forget</button></div></div>`);
  const f=Q('#kspf');if(f)f.onclick=()=>{KSpeed.reset();const s=Q('#kspn');if(s)s.textContent='Nothing yet. It learns as you watch.';say('Learned speeds cleared')};
 };
}
})();
