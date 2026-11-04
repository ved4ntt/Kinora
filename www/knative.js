/* Kinora native playback.
   Android app: ExoPlayer (Media3) decodes the video behind the page (MainActivity.java). This file makes it look like a normal <video>
   to the player screen, so the controls, quality bar, watch party and progress keep working.
   Windows app: hard files (HEVC, DTS, AC3...) can be handed to mpv or VLC when one is installed. */
(()=>{
const D=document,Q=s=>D.querySelector(s),QA=s=>[...D.querySelectorAll(s)];
const AND=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const KP=()=>window.KinoraPlayer;
const cfg=()=>{try{return CFG()}catch{return{}}};
let cur=null,tmr=0;

/* ================= Android: ExoPlayer behind the page ================= */
const on=()=>!!(AND&&KP()&&cfg().native!==false);
const can=s=>on()&&s&&/^https?:/i.test(s.url||'')&&!s._srv;
function fire(v,n){try{v.dispatchEvent(new Event(n))}catch{}}
function detach(){
 clearInterval(tmr);tmr=0;
 if(cur){try{KP().stop()}catch{}cur=null}
 D.documentElement.classList.remove('knat');
}
function attach(v,s,t0,ctx){
 detach();
 const st=cur={s:1,pw:false,p:0,d:0,b:0,e:'',rate:1,vol:1,muted:false,a:[],t:[],meta:false,can:false,play:false,ended:false,err:false};
 const def=(k,g,set)=>{try{Object.defineProperty(v,k,{configurable:true,get:g,set})}catch{}};
 def('currentTime',()=>st.p/1000,x=>{st.p=x*1000;try{KP().seek(Math.max(0,Math.round(x*1000)))}catch{}fire(v,'seeking');setTimeout(()=>fire(v,'seeked'),250)});
 def('duration',()=>st.d>0?st.d/1000:NaN);
 def('paused',()=>!st.pw);
 def('ended',()=>st.s===4);
 def('readyState',()=>st.s===3?4:st.s===2?2:1);
 def('buffered',()=>({length:st.b>0?1:0,start:()=>0,end:()=>st.b/1000}));
 def('volume',()=>st.vol,x=>{st.vol=Math.min(1,Math.max(0,+x));try{KP().volume(st.muted?0:st.vol)}catch{}fire(v,'volumechange')});
 def('muted',()=>st.muted,x=>{st.muted=!!x;try{KP().volume(st.muted?0:st.vol)}catch{}fire(v,'volumechange')});
 def('playbackRate',()=>st.rate,x=>{st.rate=+x||1;try{KP().rate(st.rate)}catch{}});
 def('error',()=>st.err?{code:/decod|format|codec|unsupported|MediaCodec/i.test(st.e)?3:4,message:'ExoPlayer: '+st.e}:null);
 const tt=[];
 def('textTracks',()=>st.t.map((x,i)=>({label:x.n,get mode(){return x.on?'showing':'hidden'},set mode(m){if(m==='showing'){try{KP().selectText(i)}catch{}x.on=true}else if(x.on){try{KP().selectText(-1)}catch{}x.on=false}}})));
 v.kAudio=()=>st.a.map(x=>({n:x.n,on:x.on}));
 v.kAudioSet=i=>{try{KP().selectAudio(i)}catch{}st.a.forEach((x,k)=>x.on=k===i)};
 v.play=()=>{try{KP().play()}catch{}st.pw=true;return Promise.resolve()};
 v.pause=()=>{try{KP().pause()}catch{}st.pw=false};
 v.load=()=>{};
 const prog=ctx&&cfg().resume&&!window.START0?(LS.get('prog',{})[ctx.vid||ctx.id]||{}):{};
 const start=Math.round(1000*(t0||(prog.t>30&&prog.d&&prog.t<prog.d-60?prog.t:0)));
 const hd=(s.behaviorHints&&s.behaviorHints.proxyHeaders&&s.behaviorHints.proxyHeaders.request)||s.headers||{};
 try{KP().load(s.url,JSON.stringify(hd),start,cfg().speed||1)}catch(e){st.err=true;st.e=String(e);setTimeout(()=>fire(v,'error'),0);return}
 fire(v,'loadstart');
 tmr=setInterval(()=>{
  if(cur!==st)return;
  let j;try{j=JSON.parse(KP().state())}catch{return}
  const was={s:st.s,pw:st.pw,play:st.play};
  st.s=j.s;st.d=j.d>0?j.d:0;st.b=j.b||0;st.a=j.a||st.a;st.t=(j.t||[]).map((x,i)=>({...x,on:!!x.on}));
  if(!st.pwLocal)st.pw=!!j.pw;
  if(j.p!=null&&!(v._seekHold>Date.now()))st.p=j.p;
  if(j.e&&!st.err){st.err=true;st.e=j.e;fire(v,'error');return}
  if(!st.meta&&st.d>0){st.meta=true;fire(v,'loadedmetadata');fire(v,'loadeddata')}
  if(st.s===3&&!st.can){st.can=true;fire(v,'canplay')}
  const playingNow=st.s===3&&st.pw;
  if(playingNow&&!st.play){st.play=true;fire(v,'play');fire(v,'playing')}
  else if(!playingNow&&st.play){st.play=false;if(st.s===2)fire(v,'waiting');else fire(v,'pause')}
  else if(st.s===2&&was.s!==2&&st.meta)fire(v,'waiting');
  fire(v,'timeupdate');fire(v,'progress');
  if(st.s===4&&!st.ended){st.ended=true;fire(v,'ended')}
 },250);
}
window.KNative={on,can,attach,detach};

/* ================= Windows: mpv or VLC ================= */
const W=window.kinoraWin;
let info=null,once=false;
if(W&&W.playerInfo)W.playerInfo().then(i=>{info=i}).catch(()=>{});
const HARD=/hevc|x265|h\.?265|dts|truehd|e-?ac-?3|\bac-?3\b|\.mkv(\?|$)/i;
const mode=()=>cfg().extPlayer||'needed';
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
 if(box)box.innerHTML='<div class="kmsg">Playing in '+(info.kind==='mpv'?'mpv':'VLC')+'<small style="color:#98a1ac;font-weight:500">Close the player window to come back here.</small><div class="kacts"><button class="btn" id="kx-w">Play here instead</button></div></div>';
 if(ld)ld.classList.remove('on');
 const b=Q('#kx-w');if(b)b.onclick=()=>{once=true;play(s,ctx,t0);setTimeout(()=>{once=false},1500)};
 W.playExternal({url:s.url,headers:hd,start,title:ctx.name||'Kinora'}).then(r=>{if(!r||!r.ok){once=true;fail('Could not open '+info.kind+'. Playing here instead.');setTimeout(()=>{once=false},1500)}}).catch(()=>{});
 return true;
}
window.KExt={handle,stop(){},info:()=>info};

/* ================= settings (apps only) ================= */
if(window.K6&&K6.PAGES&&K6.PAGES.play&&(AND||W)){
 const pp=K6.PAGES.play;
 K6.PAGES.play=()=>{
  pp();const p=Q('.k6');if(!p)return;
  if(AND){
   const n=cfg().native!==false;
   p.insertAdjacentHTML('beforeend','<h4 class="k6h">Player</h4><div class="k6c"><div class="k6o"><span><b>Native player (ExoPlayer)</b><small>Smoother playback, hardware decoding, and more video and sound formats. Turn off to use the web player.</small></span><button class="k6t'+(n?' on':'')+'" data-knat role="switch" aria-checked="'+n+'" aria-label="Native player"></button></div></div>');
  }else{
   const m=mode(),k=info?info.kind==='mpv'?'mpv':'VLC':'';
   p.insertAdjacentHTML('beforeend','<h4 class="k6h">Player</h4><div class="k6c"><div class="k6o col"><span><b>mpv or VLC</b><small>'+(k?'Found '+k+'. Hard files (HEVC, DTS, AC3, MKV) can play there, which is the smoothest way on Windows.':'Install mpv or VLC to play hard files smoothly. Until then Kinora uses its own player.')+'</small></span><div class="k6ch wrap">'+[['off','Never'],['needed','When needed'],['always','Always']].map(x=>'<button class="ch'+(x[0]===m?' on':'')+'" data-kex="'+x[0]+'">'+x[1]+'</button>').join('')+'</div></div></div>');
  }
 };
}
D.addEventListener('click',e=>{
 const n=e.target.closest&&e.target.closest('[data-knat]');
 if(n){const v=cfg().native!==false;setCfg({native:!v});n.classList.toggle('on',!v);n.setAttribute('aria-checked',String(!v));return}
 const x=e.target.closest&&e.target.closest('[data-kex]');
 if(x){setCfg({extPlayer:x.dataset.kex});QA('[data-kex]').forEach(b=>b.classList.toggle('on',b===x))}
});
})();
