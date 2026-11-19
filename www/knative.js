/* Kinora native playback.
   Android app: ExoPlayer (AndroidX Media3) decodes the video behind the page. It is reached through the Capacitor plugin "KinoraExoPlayer"
   (KinoraPlayerPlugin.java) and, when that plugin is not in the build, through the older JavaScript bridge (MainActivity.java).
   Both speak the shared Backend contract from kcore.js, so the player screen, the watch party and the progress saving never know which engine is running.
   Windows app: kmpv.js registers mpv the same way (beta). Hard files can also be handed to an installed mpv or VLC window (bottom of this file). */
(()=>{
const D=document,Q=s=>D.querySelector(s),QA=s=>[...D.querySelectorAll(s)];
const AND=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const KP=()=>window.KinoraPlayer;
const cfg=()=>{try{return CFG()}catch{return{}}};

/* ================= Android: the Capacitor plugin (preferred) ================= */
let plug=null,plugOK=false,plugState=null;
if(AND){
 try{
  plug=(Capacitor.Plugins&&Capacitor.Plugins.KinoraExoPlayer)||(Capacitor.registerPlugin&&Capacitor.registerPlugin('KinoraExoPlayer'))||null;
  if(plug&&plug.ping)plug.ping().then(r=>{
   plugOK=!!(r&&r.ok);
   if(plugOK&&plug.addListener)plug.addListener('state',e=>{plugState=e;plugState._t=Date.now()});
  }).catch(()=>{plugOK=false});
 }catch{plug=null}
}
const viaPlug=()=>!!(plug&&plugOK);
const send=(m,a)=>{try{const p=plug[m](a||{});if(p&&p.catch)p.catch(()=>{})}catch{}};

/* ================= Android: ExoPlayer as a Backend ================= */
const exo={
 name:'exo',label:'ExoPlayer',
 /* after repeated crashes the app switches the native player off by itself and the web player takes over */
 ready(){
  if(!(AND&&(KP()||viaPlug())))return false;
  try{if(window.KinoraNative&&KinoraNative.nativeOff&&KinoraNative.nativeOff())return false}catch{}
  return true;
 },
 can:s=>!!(s&&/^https?:/i.test(s.url||'')&&!s._srv),
 open(o){
  const hdr=JSON.stringify(o.headers||{});
  if(viaPlug())return plug.load({url:o.url,headers:hdr,startMs:o.start||0,rate:o.rate||1,mime:o.mime||'',mode:'auto'});
  KP().load(o.url,hdr,o.start||0,o.rate||1);
 },
 play(){viaPlug()?send('play'):KP().play()},
 pause(){viaPlug()?send('pause'):KP().pause()},
 seek(ms){viaPlug()?send('seek',{ms}):KP().seek(ms)},
 rate(x){viaPlug()?send('rate',{rate:x}):KP().rate(x)},
 volume(x){viaPlug()?send('volume',{volume:x}):KP().volume(x)},
 stop(){viaPlug()?send('stop'):KP().stop()},
 audio(i){viaPlug()?send('selectAudio',{index:i}):KP().selectAudio(i)},
 text(i){viaPlug()?send('selectText',{index:i}):KP().selectText(i)},
 state(){
  /* plugin events arrive about four times a second; if they stop, the bridge's own answer is used */
  if(viaPlug()&&plugState&&Date.now()-plugState._t<1200)return plugState;
  try{return JSON.parse(KP().state())}catch{return plugState}
 },
 /* a stream that has no index and cannot be jumped in: VLC takes it from the same spot (when the build has it), then the jump is made */
 seekHook(ms,st){
  let vlc=false;try{vlc=!!(st.ns&&!st.sw&&KP()&&KP().canVlc&&KP().canVlc())}catch{}
  if(!vlc)return false;
  st.sw=1;try{KP().switchEngine('vlc')}catch{}
  let sought=false,tm=0;
  const doSeek=()=>{if(sought)return;sought=true;clearInterval(chk);clearTimeout(tm);try{KP().seek(ms)}catch{}};
  const chk=setInterval(()=>{if(st.s>=3||st.can)doSeek()},100);
  tm=setTimeout(doSeek,2000);
  return true;
 }
};
if(window.KPlayback)KPlayback.register(exo);

/* ================= the page-facing API (kplay.js): the same for every engine ================= */
const probeUrl={url:'https://example.com/video.mp4'};
const on=()=>!!(window.KPlayback&&KPlayback.pick(probeUrl));
const can=s=>!!(window.KPlayback&&s&&KPlayback.pick(s));
let playedOnce=false;
function attach(v,s,t0,ctx){
 const be=window.KPlayback&&KPlayback.pick(s);if(!be)return;
 KPlayback.attach(v,be,s,t0,ctx,{onFirstPlay(){
  if(be.name==='exo'&&!playedOnce){playedOnce=true;try{if(window.KinoraNative&&KinoraNative.played)KinoraNative.played()}catch{}}
 }});
}
function detach(){try{window.KPlayback&&KPlayback.detach()}catch{}D.documentElement.classList.remove('knat')}
window.KNative={on,can,attach,detach};

/* ---- quick reachability check (Android): the first bytes of a stream, asked natively, so dead links are skipped before anything plays ---- */
const PRC=new Map();let prN=0;
window.KProbe={
 on:()=>!!(AND&&(viaPlug()||(KP()&&KP().probe&&KP().probeResult))),
 last:u=>{const e=PRC.get(u);return e&&Date.now()-e.t<90000?e.r:null},
 test(s,ms){
  const u=s&&s.url;if(!u)return Promise.resolve({ok:false});
  const c=window.KProbe.last(u);if(c)return Promise.resolve(c);
  ms=ms||3800;
  return new Promise(res=>{
   const id='p'+(++prN)+'_'+Date.now(),hd=(s.behaviorHints&&s.behaviorHints.proxyHeaders&&s.behaviorHints.proxyHeaders.request)||s.headers||{};
   let to=0,iv=0,done=false;
   const fin=r=>{if(done)return;done=true;clearInterval(iv);clearTimeout(to);
    /* only clear failures count: no answer, 404/410, server errors, or a web page instead of a video. 401/403/405 may still play with the player's own headers. */
    const hard=!r.ok&&(!r.code||r.code===404||r.code===410||r.code>=500||/html|json|text/.test(r.type||''));
    const o={...r,ok:!hard};PRC.set(u,{t:Date.now(),r:o});res(o)};
   to=setTimeout(()=>fin({ok:false,code:0,ms,timeout:1}),ms);
   if(viaPlug()){
    plug.probe({url:u,headers:JSON.stringify(hd)}).then(r=>fin(r||{ok:true,ms:0})).catch(()=>fin({ok:true,skip:1,ms:0}));
    return;
   }
   try{KP().probe(id,u,JSON.stringify(hd))}catch{return fin({ok:true,skip:1,ms:0})}
   iv=setInterval(()=>{let r='';try{r=KP().probeResult(id)}catch{}if(r){try{fin(JSON.parse(r))}catch{fin({ok:true,ms:0})}}},60);
  });
 }
};

/* ================= Windows: an installed mpv, VLC or PotPlayer in its own window (optional) ================= */
const W=window.kinoraWin;
let info=null,once=false;
if(W&&W.playerInfo)W.playerInfo().then(i=>{info=i}).catch(()=>{});
const HARD=/hevc|x265|h\.?265|dts|truehd|e-?ac-?3|\bac-?3\b|\.mkv(\?|$)/i;
const mode=()=>cfg().extPlayer||'off';
const lab=k=>({mpv:'mpv',vlc:'VLC',pot:'PotPlayer'}[k]||k);
const selKind=()=>{const w=cfg().extWhich||'',a=(info&&info.all)||[info&&info.kind];return a.includes(w)?w:a[0]};
function handle(s,ctx,t0,fail){
 if(!W||!W.playExternal||!info||once)return false;
 const m=mode();if(m==='off')return false;
 const txt=(s.name||'')+' '+(s.title||s.description||'')+' '+(s.url||'');
 if(m==='needed'&&!(HARD.test(txt)&&(typeof HEVC_OK!=='undefined'?(!HEVC_OK||/dts|truehd|e-?ac-?3|\bac-?3\b/i.test(txt)):true)))return false;
 if(!/^https?:/i.test(s.url||''))return false;
 const hd=(s.behaviorHints&&s.behaviorHints.proxyHeaders&&s.behaviorHints.proxyHeaders.request)||{};
 const prog=cfg().resume?(LS.get('prog',{})[ctx.vid||ctx.id]||{}):{};
 const start=t0||(prog.t>30&&prog.d&&prog.t<prog.d-60?prog.t:0);
 const ld=Q('#ld'),box=Q('#vw');
 if(box)box.innerHTML='<div class="kmsg">Playing in '+lab(selKind())+'<small style="color:#98a1ac;font-weight:500">Close the player window to come back here.</small><div class="kacts"><button class="btn" id="kx-w">Play here instead</button></div></div>';
 if(ld)ld.classList.remove('on');
 const b=Q('#kx-w');if(b)b.onclick=()=>{once=true;play(s,ctx,t0);setTimeout(()=>{once=false},1500)};
 W.playExternal({url:s.url,headers:hd,start,title:ctx.name||'Kinora',prefer:cfg().extWhich||''}).then(r=>{if(!r||!r.ok){once=true;fail('Could not open '+lab(selKind())+'. Playing here instead.');setTimeout(()=>{once=false},1500)}}).catch(()=>{});
 return true;
}
window.KExt={handle,stop(){},info:()=>info};

/* Windows: an installed player is an option, never the default. Kinora plays everything inside the app unless this is switched on. */
if(W&&!AND&&window.K6&&K6.PAGES&&K6.PAGES.play){
 const pp=K6.PAGES.play;
 K6.PAGES.play=function(){
  const r=pp.apply(this,arguments);
  try{
   const p=Q('.k7m')||Q('.k6');if(!p||Q('#kext',p))return r;
   const m=mode(),all=(info&&info.all)||[],w=cfg().extWhich||'';
   const chips=(attr,list,cur)=>list.map(x=>'<button class="ch'+(x[0]===cur?' on':'')+'" '+attr+'="'+x[0]+'">'+x[1]+'</button>').join('');
   p.insertAdjacentHTML('beforeend','<h4 class="k6h">External player (optional)</h4><div class="k6c" id="kext"><div class="k6o col"><span><b>Use an installed player</b><small>'+(all.length?'Found '+all.map(lab).join(', ')+'. Kinora plays everything inside the app by default.':'No mpv, VLC or PotPlayer found. Kinora plays everything inside the app.')+'</small></span><div class="k6ch wrap">'+chips('data-kex',[['off','Never'],['needed','Hard files only'],['always','Always']],m)+'</div></div>'+(all.length>1?'<div class="k6o col"><span><b>Which player</b></span><div class="k6ch wrap">'+chips('data-kwh',[['','Auto']].concat(all.map(k=>[k,lab(k)])),w)+'</div></div>':'')+'</div>');
  }catch{}
  return r;
 };
}
D.addEventListener('click',e=>{
 const x=e.target.closest&&e.target.closest('[data-kex]');
 if(x){setCfg({extPlayer:x.dataset.kex});QA('[data-kex]').forEach(b=>b.classList.toggle('on',b===x))}
 const y=e.target.closest&&e.target.closest('[data-kwh]');
 if(y){setCfg({extWhich:y.dataset.kwh});QA('[data-kwh]').forEach(b=>b.classList.toggle('on',b===y))}
});
})();
