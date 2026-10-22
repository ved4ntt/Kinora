/* Kinora v5: per-device onboarding, bundled plugins, player extras, app window + back handling */
(()=>{
const D=document,root=D.documentElement,Q=s=>D.querySelector(s);
const MOB=matchMedia('(max-width:820px)').matches||matchMedia('(pointer:coarse)').matches;
const WIN=!!window.kinoraWin;
if(WIN)root.classList.add('win');
const q4=n=>n>=2160?'4K':n+'p';
const say=m=>{try{toast(m)}catch{}};

/* ---- bundled plugins: paste your own manifest links here ---- */
const DEFAULT_ADDONS=[
 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json',
 'https://cyberflix.elfhosted.com/manifest.json',
 'https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json'
];
async function installDefaults(){
 for(const u of DEFAULT_ADDONS){if(addons.some(a=>a.url===u))continue;await addAddon(u).catch(()=>{})}
}

/* ---- how high can this device play smoothly? ---- */
async function maxSmooth(){
 const mc=navigator.mediaCapabilities;
 const T=[[2160,3840,'avc1.640033',25e6],[1080,1920,'avc1.640028',8e6],[720,1280,'avc1.64001f',4e6]];
 if(mc&&mc.decodingInfo)for(const[h,w,c,b]of T){
  try{const r=await mc.decodingInfo({type:'file',video:{contentType:`video/mp4; codecs="${c}"`,width:w,height:h,bitrate:b,framerate:30}});if(r.supported&&r.smooth)return h}catch{}
 }
 const cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||4;
 return cores>=8&&mem>=6?2160:cores>=6?1080:720;
}

/* ---- first-open sheet (stored on this device only) ---- */
onboard=async function(){
 if(LS.get('onb',0)||Q('#ob'))return;
 const c=LS.get('cfg',{}),mx=await maxSmooth();LS.set('maxq',mx);
 const qs=[['best','Best'],[2160,'4K'],[1080,'1080p'],[720,'720p'],[480,'480p']];
 const g=(k,o,cur)=>`<div class="ob" data-k="${k}">${o.map(([v,t])=>`<button class="ch${String(cur)===String(v)?' on':''}" data-v="${v}">${t}</button>`).join('')}</div>`;
 const langs=['English','Hindi','Spanish','French','German','Portuguese','Italian','Arabic','Japanese','Korean','Chinese','Russian','Turkish'];
 const d=D.createElement('div');d.className='dmod ob2';d.id='ob';
 d.innerHTML=`<div class="dcard obc"><h1>Welcome</h1><p class="sub">These choices stay on this device.</p>
 <h3>Quality</h3>${g('quality',qs,c.quality||'best')}<p class="obn" id="obn"></p>
 <h3>Play button</h3>${g('autoPlay',[[true,'Auto-pick source'],[false,'I choose']],c.autoPlay!==false)}
 <h3>Subtitles</h3>${g('autosub',[[false,'Off'],[true,'On']],!!c.autosub)}<select id="obl" hidden>${langs.map(x=>`<option>${x}</option>`).join('')}</select>
 <h3>Plugins</h3>${g('bundled',[[true,'Pre-installed'],[false,'My own']],true)}
 <div class="acts"><button class="btn p" id="obd">Start watching</button></div></div>`;
 const note=()=>{const v=d.querySelector('[data-k=quality] .on').dataset.v,n=v==='best'?0:+v,w=n>mx,el=Q('#obn');
  el.className='obn'+(w?' warn':'');
  el.textContent=w?`Your ${MOB?'phone':'device'} may stutter above ${q4(mx)}. Playback could be choppy.`:`Smooth playback detected up to ${q4(mx)}.`};
 d.onclick=e=>{
  const b=e.target.closest('.ch');
  if(b){b.parentNode.querySelectorAll('.ch').forEach(x=>x.classList.toggle('on',x===b));
   if(b.parentNode.dataset.k==='quality')note();
   if(b.parentNode.dataset.k==='autosub')Q('#obl').hidden=b.dataset.v!=='true'}
  if(e.target.closest('#obd')){
   const val=k=>{const v=d.querySelector(`[data-k=${k}] .on`).dataset.v;return v==='true'?true:v==='false'?false:(isNaN(v)?v:+v)};
   LS.set('cfg',{...LS.get('cfg',{}),quality:val('quality'),autoPlay:val('autoPlay'),autosub:val('autosub'),sublang:Q('#obl').value});
   LS.set('onb',1);try{applyCfg()}catch{}
   d.remove();
   if(val('bundled'))installDefaults().then(()=>{say('Pre-installed plugins ready');try{route()}catch{}});
  }
 };
 D.body.append(d);note();
};

/* ---- settings: bundled-plugin button + quality warning ---- */
new MutationObserver(()=>{
 const af=Q('#af');
 if(af&&!Q('#bi')){
  af.insertAdjacentHTML('beforebegin',`<div class="set"><div>Pre-installed plugins<small>Add the bundled catalogs in one tap, or install your own below</small></div><button class="btn p" id="bi">Install bundled</button></div>`);
  Q('#bi').onclick=async e=>{e.target.textContent='Installing…';await installDefaults();say('Bundled plugins installed');try{route()}catch{}};
 }
}).observe(D.getElementById('app'),{childList:true,subtree:true});
D.addEventListener('click',e=>{
 const b=e.target.closest('[data-k="quality"] button');if(!b||b.closest('#ob'))return;
 const mx=LS.get('maxq',0),n=+b.dataset.v;if(mx&&n>mx)say(`This device plays up to ${q4(mx)} smoothly. Higher may stutter.`);
});

/* ---- player extras: ends-at clock, badges, audio, repeat, share ---- */
let CURS=null,CURX=null;
{const p0=play;play=function(s,ctx){CURS=s;CURX=ctx;const r=p0.apply(this,arguments);setTimeout(fillInfo,60);return r}}
const ico=p=>`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
function fillInfo(){
 try{
  const s=CURS,chp=Q('#chp');if(!s||!chp)return;
  const t=`${s.name||''} ${s.title||''} ${s.description||''}`,ch=[];
  const q=typeof qOf==='function'?qOf(s):0;if(q)ch.push(q4(q));
  if(/dolby.?vision|\bdv\b|dovi/i.test(t))ch.push('Dolby Vision');else if(/hdr10\+?|\bhdr\b/i.test(t))ch.push('HDR');
  if(/atmos/i.test(t))ch.push('Atmos');
  const a=(t.match(/\b(7\.1|5\.1|2\.0)\b/)||[])[1];if(a)ch.push('Audio '+a);
  chp.innerHTML=ch.map(x=>`<span class="vc">${x}</span>`).join('');
  let m={};try{m=M[CURX.type+'|'+CURX.id]||{}}catch{}
  const g=Array.isArray(m.genres)?m.genres[0]:'';
  Q('#in2').textContent=[m.releaseInfo||m.year,g,s._a?'via '+s._a:''].filter(Boolean).join(' • ');
 }catch{}
}
function langName(c){try{return new Intl.DisplayNames(['en'],{type:'language'}).of(c)}catch{return c||'Track'}}
function audioTracks(){
 const v=Q('#pl video'),h=typeof HL!=='undefined'?HL:null;
 if(h&&h.audioTracks&&h.audioTracks.length>1)return h.audioTracks.map((t,i)=>({n:t.name||langName(t.lang),on:i===h.audioTrack,set:()=>{h.audioTrack=i}}));
 if(v&&v.audioTracks&&v.audioTracks.length>1)return[...v.audioTracks].map((t,i)=>({n:t.label||langName(t.language),on:t.enabled,set:()=>[...v.audioTracks].forEach((x,j)=>{x.enabled=j===i})}));
 return[];
}
function enhance(pl){
 const top=Q('#top'),ctl=Q('#ctl'),cc=Q('#cc'),mn=Q('#mn');if(!top||!ctl)return;
 const sp=top.lastElementChild;
 if(sp)sp.outerHTML='<div id="clk"><span id="ck1"></span><small id="ck2"></small></div>';
 ctl.insertAdjacentHTML('afterbegin','<div id="inf"><div id="chp"></div><div id="in2"></div></div>');
 if(cc){
  const cls=cc.className,add=(id,l,p)=>cc.insertAdjacentHTML('beforebegin',`<button class="${cls}" id="${id}" aria-label="${l}" title="${l}">${ico(p)}</button>`);
  add('aud','Audio','<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>');
  add('rep','Repeat','<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>');
  add('shr','Share link','<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c3 0 5 2 5 5"/>');
  Q('#aud').onclick=()=>{
   if(!mn)return;const t=audioTracks();
   mn.innerHTML=t.length?t.map((x,i)=>`<button class="mi${x.on?' on':''}" data-aud="${i}">${x.n}</button>`).join(''):'<div class="mi">This stream has one audio track.</div>';
   mn.classList.add('on');mn._t=t;
  };
  Q('#rep').onclick=e=>{const v=Q('#pl video');if(!v)return;v.loop=!v.loop;e.currentTarget.classList.toggle('on',v.loop)};
  Q('#shr').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);say('Link copied')}catch{say('Could not copy the link')}};
  if(mn)mn.addEventListener('click',e=>{const b=e.target.closest('[data-aud]');if(b&&mn._t){mn._t[+b.dataset.aud].set();mn.classList.remove('on')}});
 }
 fillInfo();
}
new MutationObserver(()=>{const pl=Q('#pl');if(pl&&!pl.dataset.e){pl.dataset.e=1;try{enhance(pl)}catch{}}}).observe(D.getElementById('app'),{childList:true,subtree:true});
setInterval(()=>{
 if(!Q('#pl'))return;
 const v=Q('#pl video'),n=new Date(),f=d=>d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}).toLowerCase();
 const a=Q('#ck1'),b=Q('#ck2');if(a)a.textContent=f(n);
 if(b&&v&&isFinite(v.duration))b.textContent='Ends at '+f(new Date(n.getTime()+(v.duration-v.currentTime)/(v.playbackRate||1)*1000));
},1000);

/* ---- Windows: frameless window with in-app controls and a double-confirm quit ---- */
function confirmQuit(){
 let n=0;const d=D.createElement('div');d.className='dmod';d.style.zIndex=300;
 const draw=()=>{d.innerHTML=`<div class="dcard qd"><h2>${n?'Are you absolutely sure?':'Quit Kinora?'}</h2><p class="sub">${n?'Playback will stop. Your progress is saved.':'This closes the app.'}</p><div class="acts"><button class="btn" data-c="0">${n?'Go back':'Stay'}</button><button class="btn p" data-c="1">${n?'Yes, quit':'Quit'}</button></div></div>`};
 d.onclick=e=>{const b=e.target.closest('[data-c]');
  if(e.target===d||(b&&b.dataset.c==='0'))return d.remove();
  if(b){if(n)kinoraWin.act('quit');else{n=1;draw()}}};
 draw();D.body.append(d);
}
if(WIN){
 D.body.insertAdjacentHTML('beforeend','<div id="drag"></div><div id="wc"><button data-w="min" aria-label="Minimize"><svg viewBox="0 0 12 12"><path d="M2 6h8"/></svg></button><button data-w="max" aria-label="Maximize"><svg viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" rx="1.2"/></svg></button><button data-w="quit" class="x" aria-label="Quit"><svg viewBox="0 0 12 12"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg></button></div>');
 Q('#wc').onclick=e=>{const b=e.target.closest('button');if(!b)return;b.dataset.w==='quit'?confirmQuit():kinoraWin.act(b.dataset.w)};
}

/* ---- Android: back closes things first, goes back a page, and only exits on a second press ---- */
const capApp=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.App;
let last=0;
if(capApp)capApp.addListener('backButton',()=>{
 if(D.fullscreenElement){D.exitFullscreen();return}
 const m=[...D.querySelectorAll('.dmod:not(#ob)')].pop();if(m){m.remove();return}
 const p=location.hash.replace(/^#\/?/,'');
 if(p&&p!=='home'){history.length>1?history.back():(location.hash='#/');return}
 if(Date.now()-last<2000)capApp.exitApp();else{last=Date.now();say('Press back again to exit')}
});
})();
