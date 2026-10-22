/* Kinora app layer: Windows window controls, Android back button and landscape, first-open sheet, player extras */
(()=>{
const D=document,root=D.documentElement,Q=s=>D.querySelector(s);
const MOB=matchMedia('(max-width:820px)').matches||matchMedia('(pointer:coarse)').matches;
const WIN=!!window.kinoraWin;
if(WIN)root.classList.add('win');
const q4=n=>n>=2160?'4K':n+'p';
const say=m=>{try{toast(m)}catch{}};

/* ---------- how high can this device play smoothly? ---------- */
async function maxSmooth(){
 const mc=navigator.mediaCapabilities;
 const T=[[2160,3840,'avc1.640033',25e6],[1080,1920,'avc1.640028',8e6],[720,1280,'avc1.64001f',4e6]];
 if(mc&&mc.decodingInfo)for(const[h,w,c,b]of T){
  try{const r=await mc.decodingInfo({type:'file',video:{contentType:`video/mp4; codecs="${c}"`,width:w,height:h,bitrate:b,framerate:30}});if(r.supported&&r.smooth)return h}catch{}
 }
 const cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||4;
 return cores>=8&&mem>=6?2160:cores>=6?1080:720;
}

/* ---------- first-open sheet (stored on this device only) ---------- */
const RECOMMENDED=['https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json','https://opensubtitles-v3.strem.io/manifest.json'];
onboard=async function(){
 if(LS.get('onb',0)||Q('#ob'))return;
 const c=CFG(),mx=await maxSmooth();LS.set('maxq',mx);
 const qs=[['best','Best'],[2160,'4K'],[1080,'1080p'],[720,'720p'],[480,'480p']];
 const g=(k,o,cur)=>`<div class="ob" data-k="${k}">${o.map(([v,t])=>`<button class="ch${String(cur)===String(v)?' on':''}" data-v="${v}">${t}</button>`).join('')}</div>`;
 const langs=['English','Hindi','Spanish','French','German','Portuguese','Italian','Arabic','Japanese','Korean','Chinese','Russian','Turkish'];
 const d=D.createElement('div');d.className='dmod ob2';d.id='ob';
 d.innerHTML=`<div class="dcard obc"><h1>Welcome</h1><p class="sub">These choices stay on this device.</p>
 <h3>Quality</h3>${g('quality',qs,c.quality||'best')}<p class="obn" id="obn"></p>
 <h3>Play button</h3>${g('autoPlay',[[true,'Auto-pick a source'],[false,'I choose']],c.autoPlay!==false)}
 <h3>Subtitles</h3>${g('autosub',[[false,'Off'],[true,'On']],!!c.autosub)}<select id="obl" hidden>${langs.map(x=>`<option>${x}</option>`).join('')}</select>
 <h3>Add-ons</h3>${g('rec',[[true,'Recommended (TMDB, subtitles)'],[false,'None']],true)}
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
   setCfg({quality:val('quality'),autoPlay:val('autoPlay'),autosub:val('autosub'),sublang:Q('#obl').value});
   LS.set('onb',1);
   const rec=val('rec');d.remove();
   if(rec)(async()=>{for(const u of RECOMMENDED)await addAddon(u).catch(()=>{});window.KRefresh&&KRefresh()})();
  }
 };
 D.body.append(d);note();
};

/* ---------- Windows: minimal in-app window controls, single-confirm quit, mouse side buttons ---------- */
function confirmQuit(){
 if(Q('#qd'))return;
 const d=D.createElement('div');d.className='dmod';d.id='qd';d.style.zIndex=300;
 d.innerHTML=`<div class="dcard qd"><h2>Quit Kinora?</h2><p class="sub">Your progress is saved.</p><div class="acts"><button class="btn" data-c="0">Stay</button><button class="btn p" data-c="1">Quit</button></div></div>`;
 d.onclick=e=>{const b=e.target.closest('[data-c]');if(e.target===d||(b&&b.dataset.c==='0'))return d.remove();if(b)kinoraWin.act('quit')};
 D.body.append(d);
}
if(WIN){
 D.body.insertAdjacentHTML('beforeend','<div id="drag"></div><div id="wc"><button data-w="min" aria-label="Minimize"><svg viewBox="0 0 12 12"><path d="M3 6h6"/></svg></button><button data-w="max" aria-label="Maximize or restore"><svg viewBox="0 0 12 12"><rect x="3" y="3" width="6" height="6" rx="1.4"/></svg></button><button data-w="quit" class="x" aria-label="Quit"><svg viewBox="0 0 12 12"><path d="M3.2 3.2l5.6 5.6M8.8 3.2L3.2 8.8"/></svg></button></div>');
 Q('#wc').onclick=e=>{const b=e.target.closest('button');if(!b)return;b.dataset.w==='quit'?confirmQuit():kinoraWin.act(b.dataset.w)};
 const side=e=>{if(e.button===3){e.preventDefault();e.stopPropagation();if(e.type==='mouseup')kinoraWin.act('back')}else if(e.button===4){e.preventDefault();e.stopPropagation();if(e.type==='mouseup')kinoraWin.act('forward')}};
 ['mouseup','mousedown','auxclick'].forEach(t=>addEventListener(t,side,true));
}

/* ---------- Android: back goes to the previous page; native code handles "press again to exit" ---------- */
window.__kBack=()=>{
 if(D.fullscreenElement){D.exitFullscreen();return 1}
 const m=[...D.querySelectorAll('#so,.tmod,.dmod:not(#ob)')].pop();
 if(m){const x=m.querySelector('#sx,#tx,#dx');x?x.click():m.remove();return 1}
 if(pm.classList.contains('on')){pm.classList.remove('on');return 1}
 const sf=Q('#sf.open');if(sf){sf.classList.remove('open');return 1}
 const mn=Q('#mn.on');if(mn){mn.classList.remove('on');return 1}
 const can=window.navigation&&'canGoBack' in navigation?navigation.canGoBack:history.length>1;
 if(can){history.back();return 1}
 return 0;
};
/* landscape while a video is open on phones */
const nat=window.KinoraNative;
function orient(on){try{if(nat)nat.orient(on?'land':'auto');else if(screen.orientation&&screen.orientation.lock){on?screen.orientation.lock('landscape').catch(()=>{}):screen.orientation.unlock()}}catch{}}
let inPl=false;

/* ---------- player extras: clock with end time, quality chips, audio tracks, repeat, share ---------- */
let CURS=null,CURX=null;
{const p0=play;play=function(s,ctx){CURS=s;CURX=ctx;const r=p0.apply(this,arguments);setTimeout(fillInfo,60);return r}}
const ico=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
function fillInfo(){
 try{
  const s=CURS,chp=Q('#chp');if(!s||!chp)return;
  const t=`${s.name||''} ${s.title||''} ${s.description||''}`,ch=[];
  const q=qOf(s);if(q)ch.push(q4(q));
  if(/dolby.?vision|\bdv\b|dovi/i.test(t))ch.push('Dolby Vision');else if(/hdr10\+?|\bhdr\b/i.test(t))ch.push('HDR');
  if(/atmos/i.test(t))ch.push('Atmos');
  const a=(t.match(/\b(7\.1|5\.1|2\.0)\b/)||[])[1];if(a)ch.push('Audio '+a);
  chp.innerHTML=ch.map(x=>`<span class="vc">${x}</span>`).join('');
  let m={};try{m=M[CURX.type+'|'+CURX.id]||{}}catch{}
  const g=Array.isArray(m.genres)?m.genres[0]:'';
  Q('#in2').textContent=[m.releaseInfo||m.year,g,s._a?'via '+s._a:''].filter(Boolean).join(' • ');
 }catch{}
}
function audioTracks(){
 const v=Q('#pl video'),h=typeof HL!=='undefined'?HL:null;
 if(h&&h.audioTracks&&h.audioTracks.length>1)return h.audioTracks.map((t,i)=>({n:t.name||langName(t.lang),on:i===h.audioTrack,set:()=>{h.audioTrack=i}}));
 if(v&&v.audioTracks&&v.audioTracks.length>1)return[...v.audioTracks].map((t,i)=>({n:t.label||langName(t.language),on:t.enabled,set:()=>[...v.audioTracks].forEach((x,j)=>{x.enabled=j===i})}));
 return[];
}
function enhance(){
 const top=Q('#top'),ctl=Q('#ctl'),cc=Q('#cc'),mn=Q('#mn');if(!top||!ctl)return;
 const sp=top.lastElementChild;
 if(sp&&sp.tagName==='SPAN')sp.outerHTML='<div id="clk"><span id="ck1"></span><small id="ck2"></small></div>';
 ctl.insertAdjacentHTML('afterbegin','<div id="inf"><div id="chp"></div><div id="in2"></div></div>');
 if(cc){
  const add=(id,l,p)=>cc.insertAdjacentHTML('beforebegin',`<button class="cb" id="${id}" aria-label="${l}" title="${l}">${ico(p)}</button>`);
  add('aud','Audio','<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>');
  add('rep','Repeat','<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>');
  add('shr','Copy link','<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>');
  Q('#aud').onclick=e=>{
   e.stopPropagation();if(!mn)return;const t=audioTracks();
   mn.className='on sm';
   mn.innerHTML='<h3>Audio</h3>'+(t.length?t.map((x,i)=>`<button class="mi${x.on?' on':''}" data-aud="${i}">${x.n}</button>`).join(''):'<p class="sub" style="padding:6px 12px">This stream has one audio track.</p>');
   mn._t=t;
  };
  Q('#rep').onclick=e=>{const v=Q('#pl video');if(!v)return;v.loop=!v.loop;e.currentTarget.classList.toggle('on',v.loop);say(v.loop?'Repeat on':'Repeat off')};
  Q('#shr').onclick=async()=>{const s=CURS;try{await navigator.clipboard.writeText((s&&s.url)||location.href);say('Link copied')}catch{say('Could not copy the link')}};
  if(mn)mn.addEventListener('click',e=>{const b=e.target.closest('[data-aud]');if(b&&mn._t){mn._t[+b.dataset.aud].set();mn.classList.remove('on')}});
 }
 fillInfo();
}
new MutationObserver(()=>{
 const pl=Q('#pl');
 if(pl&&!pl.dataset.e){pl.dataset.e=1;try{enhance()}catch{}}
 const has=!!pl;if(has!==inPl){inPl=has;if(MOB)orient(has)}
}).observe(D.getElementById('app'),{childList:true,subtree:true});
setInterval(()=>{
 if(!Q('#pl'))return;
 const v=Q('#pl video'),n=new Date(),f=d=>d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}).toLowerCase();
 const a=Q('#ck1'),b=Q('#ck2');if(a)a.textContent=f(n);
 if(b&&v&&isFinite(v.duration))b.textContent='Ends at '+f(new Date(n.getTime()+(v.duration-v.currentTime)/(v.playbackRate||1)*1000));
},1000);
})();
