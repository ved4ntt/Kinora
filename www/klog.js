/* Kinora anonymous diagnostics.
   Sends a small anonymous record for each playback (which source host worked or failed, how long it took to start,
   how often it buffered, picture size, bitrate) so broken or slow sources can be found and fixed.
   Never sent: your name, email, account, the title you watch, IP address, or anything you type.
   A random install code (not linked to any account) lets the numbers be counted once per device.
   It is on by default and can be switched off in Settings > Privacy. Records go to the "playback_diag" table (insert only). */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s);
const UA=navigator.userAgent||'';
const WIN=/Electron/.test(UA);
const AND=!!(window.KinoraNative||(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()));
const PLAT=WIN?'windows':AND?'android':'web';
const QK='diag_q',DAYK='diag_day';
const enabled=()=>{try{return CFG().diag!==false}catch{return true}};
const r1=x=>x==null||!isFinite(x)?null:Math.round(x*10)/10,r2=x=>x==null||!isFinite(x)?null:Math.round(x*100)/100;
const iid=()=>{let v=LS.get('diag_id','');if(!v){v=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():(Math.random().toString(36).slice(2)+Date.now().toString(36));LS.set('diag_id',v)}return String(v).slice(0,40)};
const appVer=()=>{try{if(AND&&window.KinoraNative&&KinoraNative.version)return String(KinoraNative.version()).slice(0,20)}catch{}return window.__kver||''};
if(WIN){try{kinoraWin.upd.version().then(v=>{window.__kver=String(v).slice(0,20)}).catch(()=>{})}catch{}}
/* host without the account or bucket part: "1c8e2ebb....r2.cloudflarestorage.com" becomes "r2.cloudflarestorage.com" */
const hostOf=u=>{try{let h=new URL(u).hostname.replace(/^www\./,'').split('.');while(h.length>2&&(/^[0-9a-f]{16,}$/i.test(h[0])||/^\d+$/.test(h[0])))h.shift();return h.join('.').slice(0,80)}catch{return''}};
const bufEnd=v=>{try{const b=v&&v.buffered;return b&&b.length?b.end(b.length-1):0}catch{return 0}};

/* ---------- the queue and sending ---------- */
let Q_=LS.get(QK,[]);if(!Array.isArray(Q_))Q_=[];
const saveQ=()=>{try{LS.set(QK,Q_.slice(-120))}catch{}};
let sending=false,lastSend=0;
function dayBudget(){const d=new Date().toISOString().slice(0,10),x=LS.get(DAYK,{});if(x.d!==d){x.d=d;x.n=0}return x}
async function flush(force){
 if(sending||!Q_.length||!enabled())return;
 if(!force&&Date.now()-lastSend<20000)return;
 let cl;try{cl=CL()}catch{return}
 if(!cl||!cl.url||!cl.key)return;
 sending=true;lastSend=Date.now();
 const batch=Q_.slice(0,40);
 try{
  const r=await fetch(cl.url+'/rest/v1/playback_diag',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',apikey:cl.key,Prefer:'return=minimal'},body:JSON.stringify(batch)});
  if(r.ok||(r.status>=400&&r.status<500)){Q_=Q_.slice(batch.length);saveQ()}
 }catch{}
 sending=false;
 if(Q_.length&&enabled())setTimeout(()=>flush(),21000);
}
function add(row){
 if(!enabled())return;
 const b=dayBudget();if(b.n>=150)return;b.n++;LS.set(DAYK,b);
 Q_.push(row);saveQ();setTimeout(()=>flush(),3000);
}
addEventListener('pagehide',()=>flush(true));
D.addEventListener('visibilitychange',()=>{if(D.visibilityState==='hidden')flush(true)});
setTimeout(()=>flush(),8000);

/* ---------- one playback ---------- */
let S=null;
const provOf=s=>{try{const p=(KPlay.last||[]).find(x=>x.key===s._kk);return p?String(p.prov||'').slice(0,60):''}catch{return''}};
function begin(s,ctx){
 finish();
 if(!enabled()||!s||!s.url){S=null;return}
 let p=null;try{p=(KPlay.last||[]).find(x=>x.key===s._kk)||null}catch{}
 S={t0:performance.now(),s,ctx:ctx||{},p,v:null,started:false,first:0,ttff:null,stallN:0,stallMs:0,stallAt:0,pos0:0,posEnd:0,fail:'',done:false,iv:0,mo:null};
 const box=Q('#vw');
 const bind=x=>{
  if(!x||x._kd||!S)return;x._kd=1;S.v=x;
  x.addEventListener('playing',()=>{
   if(!S||S.v!==x)return;
   if(!S.started){S.started=true;S.first=performance.now();S.ttff=Math.round(S.first-S.t0);S.pos0=x.currentTime}
   else if(S.stallAt){S.stallMs+=Math.round(performance.now()-S.stallAt);S.stallAt=0}
  });
  const w=()=>{if(S&&S.v===x&&S.started&&!S.stallAt&&!x.seeking&&!x.paused){S.stallAt=performance.now();S.stallN++}};
  x.addEventListener('waiting',w);x.addEventListener('stalled',()=>{if(x.readyState<3)w()});
  x.addEventListener('ended',()=>finish('ended'));
 };
 if(box){bind(Q('#vw video'));S.mo=new MutationObserver(()=>bind(Q('#vw video')));S.mo.observe(box,{childList:true})}
 S.iv=setInterval(()=>{if(!S)return;const x=Q('#vw video');if(x&&x!==S.v)bind(x);if(S.v&&S.started)S.posEnd=S.v.currentTime},1000);
}
function note(why,kind){
 if(!S||S.done||S.fail)return;
 S.fail=String(why||kind||'failed').replace(/https?:\/\/\S+/g,'').replace(/\s+/g,' ').trim().slice(0,120);
 finish('failed');
}
function finish(how){
 const x=S;if(!x||x.done)return;
 x.done=true;clearInterval(x.iv);try{x.mo&&x.mo.disconnect()}catch{}
 S=null;
 const now=performance.now();
 if(x.stallAt){x.stallMs+=Math.round(now-x.stallAt);x.stallAt=0}
 const v=x.v,watched=x.started&&v?Math.max(0,Math.round(((how==='ended'||how==='left')?(v.currentTime||x.posEnd):(x.posEnd||v.currentTime))-x.pos0)):0;
 let outcome;
 if(x.fail)outcome='failed';
 else if(x.started)outcome=watched>=20?'played':null;           /* browsed away within 20 s: not a verdict on the source */
 else outcome=(now-x.t0)>8000?'abandoned':null;                /* left while it was still loading */
 if(!outcome)return;
 const s=x.s,p=x.p||{},row={install:iid(),platform:PLAT,app:appVer(),kind:x.ctx.type==='movie'?'movie':x.ctx.type==='series'?'series':'other',provider:provOf(s),host:hostOf(s.url),quality:+s._q||null,outcome,reason:x.fail||null,ttff_ms:x.ttff,stall_n:x.stallN,stall_ms:x.stallMs,watched_s:Math.min(watched,36000)};
 try{
  if(v){
   let w=v.videoWidth||0,h=v.videoHeight||0,dr=null;
   const raw=v.kStat&&v.kStat();
   if(raw){
    if(raw.vf){w=raw.vf.w;h=raw.vf.h;row.codec=String(raw.vf.codecs||raw.vf.mime||'').slice(0,40)}
    if(raw.dr!=null&&(raw.rn||raw.dr))dr=raw.dr/((raw.rn||0)+raw.dr)*100;
    try{row.engine=String(KinoraPlayer.engine()).slice(0,12)}catch{row.engine='native'}row.route='native';
   }else{
    row.engine='web';
    const q=v.getVideoPlaybackQuality&&v.getVideoPlaybackQuality();if(q&&q.totalVideoFrames>60)dr=q.droppedVideoFrames/q.totalVideoFrames*100;
    const src=v.currentSrc||v.src||'';row.route=/\/hls\/|stream\.m3u8/.test(src)?'convert':/\/proxy\?/.test(src)?'proxy':'direct';
   }
   if(w&&h){row.real_w=w;row.real_h=h}
   if(dr!=null)row.dropped_pct=r2(Math.min(100,dr));
  }
  if(!row.codec&&p.hevc)row.codec='hevc';
  if(p.size&&x.ctx.rt>60){row.size_gb=r2(p.size);row.mbps=r2(p.size*8000/x.ctx.rt)}
  const c=navigator.connection;if(c&&c.downlink)row.net_mbps=r2(c.downlink);
 }catch{}
 add(row);
}

/* ---------- hooks (they only watch, they never change how playback behaves) ---------- */
const E=window.KEngine,KP=window.KPlay;
if(E&&E.play&&KP){
 const p0=E.play;
 E.play=function(s,ctx,t0){
  /* the same stream can be re-entered (proxy, sound fix): only a new stream starts a new record */
  const key=s&&(s._kk||s.url);
  if(!(S&&S.key===key)){try{begin(s,ctx);if(S)S.key=key}catch{}}
  return p0.apply(this,arguments);
 };
 let orig=KP.fail;
 Object.defineProperty(KP,'fail',{configurable:true,get(){return orig?function(why,t,s,kind){try{note(why,kind)}catch{}return orig.apply(this,arguments)}:orig},set(f){orig=f}});
 addEventListener('hashchange',()=>{if(!/^#\/watch\//.test(location.hash))finish('left')});
 addEventListener('pagehide',()=>finish('left'));
}
window.KDiag={enabled,flush:()=>flush(true),reset(){LS.set('diag_id','');Q_=[];saveQ()}};

/* one quiet notice the first time, so nobody is surprised */
setTimeout(()=>{
 try{if(LS.get('diag_note',0)||!enabled())return;LS.set('diag_note',1);toast('Anonymous diagnostics are on to help fix broken sources. Turn off in Settings > Playback > Privacy.')}catch{}
},9000);
})();
