/* Kinora device layer (loaded last).
   1. Android: the player's brightness and volume drive the REAL phone settings. Swipe up/down on the left half of the video for brightness and on
      the right half for volume, or open the sliders button. When the player closes, both are put back the way they were (MainActivity.java).
      Windows and the browser: volume only (mouse wheel over the video, the volume slider).
   2. A device check (Settings > Playback): what this device really decodes and outputs. It is read from the system, never guessed from codec names.
      It also feeds the source ranking, so a Dolby Vision file with no HDR10 layer is not chosen on a device that cannot show it.
   3. Windows: a quick "does this link answer?" check, the same one the Android app has, so dead links are skipped in a second instead of after a long wait;
      conversions are stopped when the player closes. */
(()=>{
'use strict';
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const WIN=/Electron/.test(navigator.userAgent||'');
const DEVN=()=>window.KinoraDevice||null;
const ANDROID=()=>!!DEVN();
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const nz=f=>{try{const x=+f();return isFinite(x)?x:null}catch{return null}};
const vid=()=>Q('#vw video');
const say=m=>{try{toast(m)}catch{}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(ANDROID())D.documentElement.classList.add('kdroid');

const SV=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const IC={
 sun:SV('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3L7 7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7"/>'),
 vol:SV('<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
 mute:SV('<path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
 tune:SV('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>')
};

/* ================================================================= device volume and brightness */
const KDev={
 on:false,pre:0,mine:{vol:null,br:null},
 begin(){const d=DEVN();if(!d||KDev.on)return;KDev.on=true;try{d.begin()}catch{}},
 end(){const d=DEVN();if(!d||!KDev.on)return;KDev.on=false;KDev.mine={vol:null,br:null};try{d.end()}catch{}},
 getVol(){const d=DEVN();if(d)return nz(()=>d.volume());const v=vid();return v?(v.muted?0:v.volume):null},
 setVol(x){
  x=clamp(x);KDev.mine.vol=x;
  const d=DEVN();
  if(d){try{d.setVolume(x)}catch{}return}
  const v=vid();if(v){v.volume=x;v.muted=x===0}
 },
 getBr(){const d=DEVN();return d?nz(()=>d.brightness()):null},
 setBr(x){const d=DEVN();if(!d)return;x=clamp(x,.02,1);KDev.mine.br=x;try{d.setBrightness(x)}catch{}}
};
window.KDev=KDev;

/* the level pop-up that shows while you swipe */
let hudEl=null,hudT=0;
function hud(kind,x){
 const pl=Q('#pl');if(!pl)return;
 if(!hudEl||!hudEl.isConnected){
  hudEl=D.createElement('div');hudEl.id='kdh';hudEl.setAttribute('aria-hidden','true');
  hudEl.innerHTML='<span class="kdh-i"></span><div class="kdh-t"><i></i></div><span class="kdh-n"></span>';
  pl.append(hudEl);
 }
 hudEl.className=(kind==='br'?'l':'r')+' on';
 Q('.kdh-i',hudEl).innerHTML=kind==='br'?IC.sun:(x<.001?IC.mute:IC.vol);
 hudEl.style.setProperty('--v',x.toFixed(3));
 Q('.kdh-n',hudEl).textContent=Math.round(x*100);
 clearTimeout(hudT);hudT=setTimeout(()=>{if(hudEl)hudEl.classList.remove('on')},900);
}

/* the sliders panel (phones, and the embed player) */
const row=(k,label,icon)=>'<label class="kdv-r"><i>'+icon+'</i><input type="range" min="'+(k==='br'?2:0)+'" max="100" step="1" data-k="'+k+'" aria-label="'+label+'"><b data-p="'+k+'">0</b></label>';
function panel(host){
 let p=Q('#kdv');
 if(p){if(host&&p.parentNode!==host)host.append(p);return p}
 p=D.createElement('div');p.id='kdv';p.setAttribute('role','dialog');p.setAttribute('aria-label','Brightness and volume');
 p.innerHTML=(ANDROID()?row('br','Brightness',IC.sun):'')+row('vol','Volume',IC.vol);
 (host||Q('#pl')||D.body).append(p);
 p.addEventListener('input',e=>{
  const r=e.target.closest&&e.target.closest('input[type=range]');if(!r)return;
  const x=+r.value/100;
  if(r.dataset.k==='br')KDev.setBr(x);else KDev.setVol(x);
  syncUI();
 });
 return p;
}
function togglePanel(host){
 const p=panel(host),open=!p.classList.contains('on');
 p.classList.toggle('on',open);
 QA('#kdb,#kdt').forEach(b=>b.classList.toggle('on',open));
 if(open){syncUI();const pl=Q('#pl');if(pl&&pl.wake)pl.wake()}
}
let volIcon='';
function syncUI(){
 const v=KDev.getVol(),b=KDev.getBr();
 if(v!=null){
  const s=Q('#pl #vs');if(s&&D.activeElement!==s)s.value=v;
  const m=Q('#pl #vb'),k=v<.001?'mute':'vol';
  if(m&&ANDROID()&&volIcon!==k){volIcon=k;m.innerHTML=IC[k]}
 }
 const p=Q('#kdv');if(!p)return;
 [['vol',v],['br',b]].forEach(([k,x])=>{
  if(x==null)return;
  const r=Q('input[data-k="'+k+'"]',p);if(!r)return;
  const n=Math.round(x*100);
  if(D.activeElement!==r)r.value=n;
  r.style.setProperty('--p',n+'%');
  const t=Q('[data-p="'+k+'"]',p);if(t)t.textContent=n;
 });
}

/* swipe up/down on the video: left half = brightness (Android), right half = volume */
const G={armed:false,on:false,pid:-1,kind:'vol',x0:0,y0:0,start:0,pending:null,raf:0};
const inVw=e=>!!(e.target&&e.target.closest&&e.target.closest('#pl #vw'));
D.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch'||!inVw(e)||Q('#kpop.on,#kp.on,#kdv.on'))return;
 G.kind=(e.clientX<innerWidth/2&&ANDROID())?'br':'vol';
 G.start=G.kind==='br'?KDev.getBr():KDev.getVol();
 G.armed=G.start!=null;G.on=false;G.pid=e.pointerId;G.x0=e.clientX;G.y0=e.clientY;G.pending=null;
},true);
D.addEventListener('pointermove',e=>{
 if(!G.armed||e.pointerId!==G.pid)return;
 if(!G.on){
  const dx=e.clientX-G.x0,dy=e.clientY-G.y0;
  if(Math.abs(dy)<14||Math.abs(dy)<Math.abs(dx)*1.4)return;
  G.on=true;G.y0=e.clientY;
  /* the "hold the right side for 2x" timer in kui.js must not fire during a swipe */
  try{D.dispatchEvent(new PointerEvent('pointercancel',{pointerType:'touch',bubbles:true}))}catch{}
 }
 window.__kSwipe=Date.now();
 G.pending=clamp(G.start+(G.y0-e.clientY)/Math.max(160,innerHeight*.62),G.kind==='br'?.02:0,1);
 if(!G.raf)G.raf=requestAnimationFrame(()=>{
  G.raf=0;if(G.pending==null)return;
  const x=G.pending;G.pending=null;
  if(G.kind==='br')KDev.setBr(x);else KDev.setVol(x);
  hud(G.kind,x);syncUI();
 });
},true);
const endSwipe=e=>{if(!e.isTrusted||e.pointerId!==G.pid)return;if(G.on)window.__kSwipe=Date.now();G.armed=false;G.on=false};
D.addEventListener('pointerup',endSwipe,true);
D.addEventListener('pointercancel',endSwipe,true);

/* desktop: the mouse wheel over the video changes the volume */
D.addEventListener('wheel',e=>{
 if(!inVw(e)||e.ctrlKey)return;
 const cur=KDev.getVol();if(cur==null)return;
 e.preventDefault();
 const x=clamp(cur+(e.deltaY<0?.05:-.05));
 KDev.setVol(x);hud('vol',x);syncUI();
},{passive:false});

/* Android: the speaker button and the slider in the controls drive the phone volume, not just the player's own level */
D.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('#pl #vb');if(!b||!ANDROID())return;
 e.stopImmediatePropagation();e.preventDefault();
 const c=KDev.getVol()||0;
 if(c>.001){KDev.pre=c;KDev.setVol(0)}else KDev.setVol(KDev.pre||.5);
 syncUI();
},true);
D.addEventListener('input',e=>{
 const r=e.target;if(!r||r.id!=='vs'||!ANDROID())return;
 e.stopImmediatePropagation();KDev.setVol(+r.value);syncUI();
},true);

/* a tap outside closes the sliders panel and the watch party panel */
D.addEventListener('pointerdown',e=>{
 const t=e.target;if(!t||!t.closest)return;
 const p=Q('#kdv.on');
 if(p&&!t.closest('#kdv,#kdb,#kdt')){p.classList.remove('on');QA('#kdb,#kdt').forEach(b=>b.classList.remove('on'))}
 const kp=Q('#kp.on');
 if(kp&&Q('#pl')&&!t.closest('#kp,#kpb,#krb,#krp,.dmod,#kdsheet,#kn')){const x=Q('[data-a="close"]',kp);if(x)x.click()}
},true);
{const b0=window.__kBack;window.__kBack=function(){const p=Q('#kdv.on');if(p){p.classList.remove('on');QA('#kdb,#kdt').forEach(b=>b.classList.remove('on'));return 1}return b0?b0():0}}

/* ---- the button that opens the sliders (player controls, and the embed player) ---- */
function injectButtons(){
 const krr=Q('#pl .krr');
 if(krr&&!Q('#kdb',krr)){
  krr.insertAdjacentHTML('afterbegin','<button class="kb" id="kdb" type="button" aria-label="Brightness and volume" title="Brightness and volume">'+IC.tune+'</button>');
  Q('#kdb',krr).onclick=e=>{e.stopPropagation();togglePanel(Q('#pl'))};
 }
 const em=Q('#kemb');
 if(em&&ANDROID()&&!Q('#kdt',em)){
  const b=D.createElement('button');b.id='kdt';b.type='button';b.className='rb';b.setAttribute('aria-label','Brightness and volume');b.innerHTML=IC.tune;
  em.append(b);
  b.onclick=e=>{e.stopPropagation();togglePanel(em)};
 }
}

/* ---- the player opens: remember the levels. It closes: give them back, and stop any conversion still running ---- */
let was=false;
const active=()=>!!(Q('#pl')||Q('#kemb'));
function stopConversions(){
 try{
  if(!WIN||typeof SRVOK!=='function'||!SRVOK())return;
  const c=srvCfg();
  fetch(c.url.replace(/\/$/,'')+'/stop?k='+encodeURIComponent(c.key)).catch(()=>{});
 }catch{}
}
function lifecycle(){
 const a=active();
 if(a&&!was){was=true;KDev.begin();setTimeout(syncUI,300)}
 else if(!a&&was){was=false;KDev.end();stopConversions()}
 if(a)injectButtons();
}
const appEl=D.getElementById('app');
if(appEl)new MutationObserver(lifecycle).observe(appEl,{childList:true});
new MutationObserver(lifecycle).observe(D.body,{childList:true});
addEventListener('hashchange',()=>setTimeout(lifecycle,0));
/* the phone put the levels back when the app left the screen; set the viewer's own levels again when it returns */
D.addEventListener('visibilitychange',()=>{
 if(D.visibilityState!=='visible'||!was||!ANDROID())return;
 const m={...KDev.mine};KDev.on=false;KDev.begin();
 if(m.vol!=null)KDev.setVol(m.vol);
 if(m.br!=null)KDev.setBr(m.br);
});
/* hardware volume keys change the level too: keep the slider honest */
setInterval(()=>{if(was)syncUI()},600);
lifecycle();

/* ================================================================= what this device can really play */
const CAP={p:null,busy:null};
const aud=(d,pass,ff)=>pass?'passthrough':d.any?'decoder':ff?'software':'none';

function fromAndroid(j){
 const g=k=>j[k]||{},hev=g('hevc'),dv=g('dolbyVision'),av=g('av1'),avc=g('avc'),ao=g('audioOut');
 const disp=Array.isArray(j.displayHdr)?j.displayHdr:[],ff=!!j.ffmpegAudio;
 return{
  platform:'android',device:j.device||'',
  h264:{ok:!!avc.any,hw:!!avc.hw},
  hevc:{ok:!!hev.any,hw:!!hev.hw,main10:hev.hw?!!hev.main10:null,uhd:!!hev.uhd},
  av1:{ok:!!av.any,hw:!!av.hw},
  dv:{decoder:!!(dv.any&&dv.hw),profiles:dv.profiles||[],display:disp.includes('dolby-vision')},
  hdr10:{decode:!!hev.hdr10||!!(hev.hw&&hev.main10),display:disp.includes('hdr10')},
  hdr10p:{decode:!!hev.hdr10plus,display:disp.includes('hdr10+')},
  displayHdr:disp,hdmi:!!ao.hdmi,
  audio:{ac3:aud(g('ac3'),ao.ac3,ff),eac3:aud(g('eac3'),ao.eac3,ff),atmos:ao.eac3joc?'passthrough':'none',dts:aud(g('dts'),ao.dts||ao.dtshd,ff),truehd:aud(g('truehd'),ao.truehd,ff)}
 };
}
async function fromWeb(){
 const mc=navigator.mediaCapabilities;
 const info=async(ct,extra)=>{
  let ok=false;try{ok=!!(window.MediaSource&&MediaSource.isTypeSupported(ct))}catch{}
  let hw=null;
  if(mc&&mc.decodingInfo){
   try{const r=await mc.decodingInfo({type:'file',video:Object.assign({contentType:ct,width:1920,height:1080,bitrate:12e6,framerate:24},extra||{})});ok=!!r.supported;hw=!!r.powerEfficient}catch{}
  }
  return{ok,hw};
 };
 const hdrOK=async()=>{
  if(!(mc&&mc.decodingInfo))return null;
  try{const r=await mc.decodingInfo({type:'file',video:{contentType:'video/mp4; codecs="hvc1.2.4.L153.B0"',width:3840,height:2160,bitrate:30e6,framerate:24,colorGamut:'rec2020',transferFunction:'pq',hdrMetadataType:'smpteSt2086'}});return !!r.supported}catch{return null}
 };
 const sound=async(ct)=>{
  if(!(mc&&mc.decodingInfo))return null;
  try{const r=await mc.decodingInfo({type:'file',audio:{contentType:ct,channels:'5.1'}});return !!r.supported}catch{return null}
 };
 const [h264,hevc,h10,uhd,av1,hdr,ac3,eac3]=await Promise.all([
  info('video/mp4; codecs="avc1.640028"'),info('video/mp4; codecs="hvc1.1.6.L120.B0"'),info('video/mp4; codecs="hvc1.2.4.L120.B0"'),
  info('video/mp4; codecs="hvc1.2.4.L153.B0"',{width:3840,height:2160,bitrate:30e6}),info('video/mp4; codecs="av01.0.08M.10"'),
  hdrOK(),sound('audio/mp4; codecs="ac-3"'),sound('audio/mp4; codecs="ec-3"')
 ]);
 let gpu=null;
 if(WIN&&window.kinoraWin&&kinoraWin.sysCaps){try{gpu=await kinoraWin.sysCaps()}catch{}}
 const vd=gpu&&gpu.gpu&&gpu.gpu.video_decode;                      /* 'enabled' = the graphics driver decodes video in hardware */
 const hwOn=vd?String(vd)==='enabled':null;
 const hwf=x=>x.hw==null?hwOn:(x.hw&&hwOn!==false);
 const conv=WIN&&typeof SRVOK==='function'&&SRVOK();
 const sd=b=>b===true?'decoder':conv?'converted':'none';
 let hdrDisp=false;try{hdrDisp=matchMedia('(dynamic-range: high)').matches}catch{}
 return{
  platform:WIN?'windows':'web',device:(gpu&&gpu.devices&&gpu.devices[0]&&('GPU '+gpu.devices[0].vendor+':'+gpu.devices[0].device))||'',gpuDecode:vd||'',
  h264:{ok:h264.ok,hw:hwf(h264)},
  hevc:{ok:hevc.ok,hw:hwf(hevc),main10:h10.ok,uhd:uhd.ok},
  av1:{ok:av1.ok,hw:hwf(av1)},
  dv:{decoder:false,profiles:[],display:false},
  hdr10:{decode:hdr===true,display:hdrDisp},
  hdr10p:{decode:false,display:false},
  displayHdr:hdrDisp?['hdr'] :[],hdmi:false,
  audio:{ac3:sd(ac3),eac3:sd(eac3),atmos:'none',dts:conv?'converted':'none',truehd:conv?'converted':'none'}
 };
}
function probe(){
 if(CAP.busy)return CAP.busy;
 CAP.busy=(async()=>{
  let c=null;
  try{
   const d=DEVN();
   if(d&&d.caps)c=fromAndroid(JSON.parse(d.caps()));
   else c=await fromWeb();
  }catch{}
  CAP.p=c;return c;
 })();
 return CAP.busy;
}
const yn=(b,a,c)=>b?a:c;
function rows(c){
 if(!c)return[];
 const hw=x=>!x.ok?'Not supported':x.hw===true?'Hardware decoder':x.hw===false?'Software only (can stutter at 4K)':'Supported (hardware not confirmed)';
 const A=c.audio,pl=c.platform==='android';
 const snd=(k,name)=>A[k]==='passthrough'?'Sent as it is to your sound system':A[k]==='decoder'?'Decoded by this device':A[k]==='software'?'Decoded in software (stereo or 5.1, no passthrough)':A[k]==='converted'?'Kinora converts it to AAC (up to 5.1)':'Not supported';
 const R=[
  ['H.264 / AVC',hw(c.h264)],
  ['HEVC / H.265',hw(c.hevc)],
  ['HEVC Main 10 (10-bit)',c.hevc.main10===true?'Supported':c.hevc.main10===false?(pl?'Not reported by this device':'Not supported'):'Not known'],
  ['4K HEVC',yn(c.hevc.uhd,'Decoder reports 4K','Decoder does not report 4K')],
  ['AV1',hw(c.av1)],
  ['HDR10 picture',(c.hdr10.decode?'Stream decodes':'Cannot decode')+' · display '+(c.hdr10.display?'supports HDR':'is not HDR')],
  ['HDR10+',pl?(c.hdr10p.decode?'Decoder reports it':'Decoder does not report it')+' · display '+(c.hdr10p.display?'supports it':'does not report it'):'Not supported by this player'],
  ['Dolby Vision',c.dv.decoder?'Decoder present'+(c.dv.profiles.length?' (profiles '+c.dv.profiles.join(', ')+')':''):'No Dolby Vision decoder (DV files play as plain HDR10 at best)'],
  ['Dolby Digital (AC-3)',snd('ac3')],
  ['Dolby Digital Plus (E-AC-3)',snd('eac3')],
  ['Dolby Atmos',A.atmos==='passthrough'?'Available on the current output':'Not available here: Atmos tracks play as regular 5.1 or stereo'],
  ['DTS',snd('dts')],
  ['TrueHD',snd('truehd')]
 ];
 if(c.gpuDecode)R.unshift(['Graphics driver video decoding',c.gpuDecode==='enabled'?'On':'Off ('+c.gpuDecode+')']);
 if(c.device)R.unshift([pl?'Device':'Graphics',c.device]);
 return R;
}
window.KCaps={
 get:probe,
 data:()=>CAP.p,
 rows:()=>rows(CAP.p),
 text:()=>rows(CAP.p).map(r=>r[0]+': '+r[1]).join('\n')+'\n(Read from the system. Only playing a file proves a format works.)',
 /* 0 = fine, 1+ = this source is likely to play wrongly on this device (used by the source ranking) */
 risk(p){
  const c=CAP.p;if(!c||!p)return 0;
  let r=0;
  if(p.dv&&!p.hdr&&!c.dv.decoder)r++;          /* Dolby Vision with no HDR10 layer needs a Dolby Vision decoder, or the colours come out purple and green */
  if(p.av1&&c.av1&&c.av1.ok===false)r++;
  /* Android draws the picture on a TextureView, which does not carry HDR: HDR and Dolby Vision files come out grey and washed out. Same-resolution SDR copies are preferred. */
  if(c.platform==='android'&&(p.hdr||p.dv))r++;
  return r;
 }
};
setTimeout(()=>{probe().catch(()=>{})},700);

/* ---- Settings > Playback: the device check ---- */
{
 const P=window.K6&&K6.PAGES;
 if(P&&typeof P.play==='function'){
  const pp=P.play;
  P.play=function(){
   const r=pp.apply(this,arguments);
   try{
    const root=Q('.k7m')||Q('.k6');if(!root||Q('#kcaps',root))return r;
    root.insertAdjacentHTML('beforeend','<h4 class="k6h">Device check</h4><div class="k6c" id="kcaps"><div class="k6o"><span><b>What this device can play</b><small>Reads the real decoders and outputs from the system. It does not guess from file names.</small></span><button class="btn" id="kcaps-b" type="button">Check</button></div></div>');
    Q('#kcaps-b',root).onclick=async()=>{
     const box=Q('#kcaps',root),b=Q('#kcaps-b',root);
     b.textContent='Checking\u2026';b.disabled=true;
     CAP.busy=null;await probe();
     b.disabled=false;b.textContent='Check again';
     Q('.kcr',box)&&QA('.kcr',box).forEach(n=>n.remove());
     const html=rows(CAP.p).map(([a,v])=>'<div class="k6o kcr"><span><b>'+esc(a)+'</b><small>'+esc(v)+'</small></span></div>').join('')+
      '<div class="k6o kcr"><span><small>This is what the device reports. Only playing a file proves a format works.</small></span><button class="btn" id="kcaps-c" type="button">Copy</button></div>';
     box.insertAdjacentHTML('beforeend',html);
     const cp=Q('#kcaps-c',box);if(cp)cp.onclick=()=>navigator.clipboard.writeText(KCaps.text()).then(()=>say('Copied')).catch(()=>say('Could not copy'));
    };
   }catch{}
   return r;
  };
 }
}

/* ================================================================= Windows: "does this link answer?" before anything plays */
if(WIN&&!(window.KProbe&&KProbe.on&&KProbe.on())){
 const PRC=new Map();
 const srv=()=>{try{return typeof SRVOK==='function'&&SRVOK()?srvCfg():null}catch{return null}};
 /* behind the built-in proxy, test the real address */
 const origin=s=>{
  let u=(s&&s.url)||'',h='';
  const hd=(s&&s.behaviorHints&&s.behaviorHints.proxyHeaders&&s.behaviorHints.proxyHeaders.request)||(s&&s.headers)||null;
  try{const x=new URL(u);if(x.hostname==='127.0.0.1'&&x.pathname==='/proxy'){u=x.searchParams.get('u')||u;h=x.searchParams.get('h')||''}}catch{}
  if(!h&&hd){try{h=btoa(JSON.stringify(hd))}catch{}}
  return{u,h};
 };
 window.KProbe={
  on:()=>!!srv(),
  last:u=>{const e=PRC.get(u);return e&&Date.now()-e.t<90000?e.r:null},
  test(s,ms){
   const o=origin(s),c=srv();
   if(!c||!/^https?:/i.test(o.u))return Promise.resolve({ok:true,skip:1,ms:0});
   const hit=window.KProbe.last(o.u);if(hit)return Promise.resolve(hit);
   ms=ms||6500;
   const ac=new AbortController(),to=setTimeout(()=>ac.abort(),ms+1500);
   return fetch(c.url.replace(/\/$/,'')+'/probe?k='+encodeURIComponent(c.key)+'&u='+encodeURIComponent(o.u)+(o.h?'&h='+encodeURIComponent(o.h):'')+'&ms='+ms,{signal:ac.signal,cache:'no-store'})
    .then(r=>r.json())
    .then(r=>{
     /* only a clear answer condemns a link (see KPlayback.judge); a slow host keeps its place and gets more time to start */
     const out=window.KPlayback&&KPlayback.judge?KPlayback.judge(r):{...r,ok:r.ok!==false};
     if(out.slow&&!out.ms)out.ms=ms;
     PRC.set(o.u,{t:Date.now(),r:out});return out;
    })
    .catch(()=>({ok:true,skip:1,ms:0}))   /* when the check itself fails, the source is not condemned */
    .finally(()=>clearTimeout(to));
  }
 };
}
})();
