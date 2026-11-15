/* Kinora sound sidecar (Windows app).
   Most of the sources are HEVC WEB-DL files with Dolby Digital Plus, DTS or TrueHD sound. The web engine decodes HEVC video in hardware but cannot play
   that sound. Before, the whole film was sent through a converter. Now the VIDEO plays exactly as it is, straight from the source, with hardware decoding,
   10-bit, HDR and real seeking. Only the sound is turned into AAC (up to 5.1) by the built-in server and played next to the picture:
     - the sound is asked for a little ahead of the picture and let in exactly when the picture gets there,
     - after every jump it is asked for again at the new position,
     - the page's volume and mute controls drive it, the video's own sound stays silent,
     - if anything goes wrong the player falls back to the converter, as before. */
(()=>{
'use strict';
const WIN=/Electron/.test(navigator.userAgent||'');
const srv=()=>{try{return typeof SRVOK==='function'&&SRVOK()?srvCfg():null}catch{return null}};
const can=()=>WIN&&!!srv();
const MD=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'muted');
const VD=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'volume');
/* language names as the picker stores them -> codes the file may use */
const LC={Hindi:'hin hi',English:'eng en',Tamil:'tam ta',Telugu:'tel te',Malayalam:'mal ml',Kannada:'kan kn',Bengali:'ben bn',Marathi:'mar mr',Spanish:'spa es',French:'fre fra fr',German:'ger deu de',Italian:'ita it',Japanese:'jpn ja',Korean:'kor ko',Russian:'rus ru',Portuguese:'por pt',Chinese:'chi zho zh'};

function attach(v,s,opt){
 opt=opt||{};
 const c=srv();if(!c||!v||!s||!s.url)return null;
 const base=c.url.replace(/\/$/,''),K=encodeURIComponent(c.key),src=encodeURIComponent(s.url);
 const A=new Audio();A.preload='auto';
 let dead=false,ready=false,pending=false,gen=0,cur=0,tracks=[],t0=0,lead=1.2,tries=0,goT=0,failT=0,armT=0,mon=0;
 let uiMuted=false,uiVol=1;
 try{uiMuted=!!MD.get.call(v);uiVol=VD.get.call(v)}catch{}
 A.muted=uiMuted;A.volume=uiVol;

 /* the video's own sound stays silent; the page's volume / mute controls drive the sidecar */
 try{MD.set.call(v,true)}catch{}
 try{
  Object.defineProperty(v,'muted',{configurable:true,get:()=>uiMuted,set:x=>{uiMuted=!!x;A.muted=uiMuted;v.dispatchEvent(new Event('volumechange'))}});
  Object.defineProperty(v,'volume',{configurable:true,get:()=>uiVol,set:x=>{uiVol=Math.min(1,Math.max(0,+x||0));A.volume=uiVol;v.dispatchEvent(new Event('volumechange'))}});
 }catch{}

 const vt=()=>v.currentTime||0;
 const rate=()=>v.playbackRate||1;
 /* the track's own channel count (up to 5.1) once known, so stereo is not blown up and 5.1 is not folded down */
 const url=ss=>base+'/audio?k='+K+'&u='+src+'&ss='+ss.toFixed(2)+'&a='+cur+(tracks[cur]?'&ch='+Math.min(6,tracks[cur].channels||2):'');
 const quiet=()=>{try{A.pause()}catch{}};
 function destroy(){
  if(dead)return;dead=true;gen++;clearTimeout(goT);clearTimeout(failT);clearTimeout(armT);clearInterval(mon);
  try{A.pause();A.removeAttribute('src');A.load()}catch{}
 }
 function fail(why){
  if(dead)return;destroy();
  try{opt.fail&&opt.fail(why||'The sound could not be prepared.')}catch{}
 }

 /* let the sound in exactly when the picture reaches the point the sound stream starts at */
 function arm(){
  clearTimeout(armT);
  if(dead||!ready||v.paused||v.seeking||!A.paused)return;
  const wait=t0-vt();
  if(wait>.02){armT=setTimeout(arm,Math.min(1500,wait/rate()*1000));return}
  if(wait<-.35){ready=false;lead=Math.min(4,lead+.6);schedule(0);return}   /* the picture got past the start of the sound: ask again with more lead */
  A.play().catch(()=>{});
 }

 /* (re)start the sound at the picture's position */
 function go(){
  if(dead)return;
  const my=++gen;quiet();ready=false;pending=true;clearTimeout(armT);
  const T=vt()+lead;t0=T;
  let once=false;
  clearTimeout(failT);
  failT=setTimeout(()=>{if(my===gen&&pending&&!dead){pending=false;if(++tries>2)fail('The sound took too long to start.');else schedule()}},12000);
  A.onerror=()=>{if(my!==gen||dead)return;pending=false;if(++tries>2)fail('The sound could not be decoded.');else schedule(600)};
  A.oncanplay=()=>{
   if(my!==gen||dead||once)return;once=true;
   pending=false;ready=true;tries=0;clearTimeout(failT);
   arm();
  };
  A.src=url(T);A.playbackRate=rate();
  try{A.load()}catch{}
 }
 function schedule(ms){clearTimeout(goT);goT=setTimeout(go,ms==null?150:ms)}

 const on=(e,f)=>v.addEventListener(e,f);
 on('playing',()=>{if(dead)return;if(!ready&&!pending)schedule();else arm()});
 on('play',()=>{if(!dead)arm()});
 on('pause',()=>{quiet();clearTimeout(armT)});
 on('waiting',()=>{quiet();clearTimeout(armT)});
 on('seeking',()=>{gen++;ready=false;pending=false;quiet();clearTimeout(failT);clearTimeout(armT)});
 on('seeked',()=>{if(!dead)schedule()});
 on('ratechange',()=>{A.playbackRate=rate()});
 on('ended',()=>{quiet();clearTimeout(armT)});
 on('emptied',destroy);

 /* keep the sound on the picture: small drift is absorbed by a tiny speed change, large drift asks for the sound again */
 mon=setInterval(()=>{
  if(dead)return;
  if(!v.isConnected){destroy();return}
  if(v.paused||v.seeking)return;
  if(ready&&A.paused&&!A.ended){arm();return}
  if(!ready||A.paused||A.ended)return;
  const d=vt()-(t0+A.currentTime);
  if(Math.abs(d)>1.2){schedule(0);return}
  A.playbackRate=Math.abs(d)>.12?rate()*(1+Math.max(-.04,Math.min(.04,d*.1))):rate();
 },1500);

 /* which sound track: the picked language, else the file's default, else the first */
 const pick=()=>{
  let want='';try{want=((LS.get('kpick',{})||{}).lang)||''}catch{}
  const codes=(LC[want]||'').split(' ').filter(Boolean);
  let i=codes.length?tracks.findIndex(t=>codes.includes(String(t.lang||'').toLowerCase())):-1;
  if(i<0)i=tracks.findIndex(t=>t.def);
  return i<0?0:i;
 };
 /* the sound starts at once with track 1; when the track list arrives it restarts only if another track should play */
 fetch(base+'/tracks?k='+K+'&u='+src,{cache:'no-store'}).then(r=>r.json()).then(r=>{
  tracks=(r&&r.audio)||[];
  const n=pick();
  if(!dead&&(n!==cur||(tracks[0]&&!ready&&!pending))){cur=n;if(!v.paused&&!v.seeking)schedule(0)}
 }).catch(()=>{});
 if(!v.paused&&!v.seeking&&v.readyState>=2)schedule(0);
 return{stop:destroy,get dead(){return dead}};
}

window.KAudio={can,attach};
})();
