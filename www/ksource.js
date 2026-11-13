/* Kinora source picker.
   1. Measures your internet speed when the app opens (and again when it gets old) so nothing has to be chosen by hand.
   2. Hides cam recordings (HDTC, TS, CAM...), sample files and sources known to be dead.
   3. Gives the player a ranking key: sources that keep up with your speed first, then files that are not squeezed too
      hard for their resolution, then the biggest file that still fits. kplay.js calls KFit.mark(p) and KFit.keys(p). */
(()=>{
const D=document,K='kspd',TTL=10*60e3;
const DIM={2160:[3840,2160],1440:[2560,1440],1080:[1920,1080],720:[1280,720],480:[854,480],360:[640,360]};
/* cam / telesync / screener and sample files: never a real copy of the film */
const CAM_I=/\b(hd-?cam|cam-?rip|hd-?tc|hdtc|tele-?sync|tele-?cine|hd-?ts|pre-?dvd|dvd-?scr|screener|workprint)\b/i;
const CAM_S=/(?:^|[\s._\[(-])(?:CAM|TC|TS|SAMPLE)(?:$|[\s._\])-])/;
/* soft problems: burned-in subtitles, ads, live-audio recordings. Allowed, but they rank below clean copies */
const SOFT=/(?:^|[\s._\[(-])(?:HC|HARD-?SUBS?|KORSUB|ADS?|ADVERT\w*|WATERMARK(?:ED)?|LINE[\s._-]?AUDIO|CLEAN[\s._-]?AUDIO)(?:$|[\s._\])-])/i;
/* found dead by the playback tests (0 plays out of many tries); the learned list in KSpeed still adds to this */
const DEAD_HOST=['pixel.hubcloud.pw','pixel.rohitkiskk.workers.dev','sbcdnw.hakunaymatata.com'];
const DEAD_PROV=['VidLink'];
const hostOf=u=>{try{return new URL(u).hostname.toLowerCase()}catch{return''}};

/* ---------- internet speed ---------- */
let spd=null,busy=null;
try{spd=JSON.parse(localStorage.getItem(K)||'null')}catch{}
async function measure(){
 if(busy)return busy;
 busy=(async()=>{
  /* small and short on purpose: 2 x 700 KB, at most 2.5 s, and never while a video is loading or playing */
  const t0=performance.now();let bytes=0;
  const ac=new AbortController(),to=setTimeout(()=>ac.abort(),2500);
  try{
   await Promise.all([0,1].map(async()=>{
    const r=await fetch('https://speed.cloudflare.com/__down?bytes=700000&r='+Math.random(),{cache:'no-store',signal:ac.signal});
    const rd=r.body.getReader();
    for(;;){const x=await rd.read();if(x.done)break;bytes+=x.value.length}
   }));
  }catch{}
  clearTimeout(to);
  const s=(performance.now()-t0)/1000;
  if(bytes>200e3&&s>.1){
   const m=Math.round(bytes*8/s/1e5)/10;
   /* a short test under-reads fast lines a little, so it is only allowed to move the number up when it is clearly higher */
   spd={mbps:spd&&Date.now()-spd.t<6*3600e3?Math.max(m,spd.mbps*.7):m,t:Date.now()};
   try{localStorage.setItem(K,JSON.stringify(spd))}catch{}
  }
  busy=null;return spd;
 })();
 return busy;
}
const watching=()=>/^#\/watch\//.test(location.hash);
const quiet=()=>{try{if(navigator.connection&&navigator.connection.saveData)return false}catch{}return!watching()};
const fresh=()=>spd&&Date.now()-spd.t<TTL;
const mbps=()=>spd&&Date.now()-spd.t<6*3600e3?spd.mbps:0;
/* what a stream may use: about half of the measured speed, so it starts fast and keeps going; 20 Mbps is assumed until a measurement exists */
const budget=()=>{const m=mbps();return m?Math.max(1.5,m*.5):20};

const KFit={rt:0,measure,mbps,budget,fast(){return this.budget()>=30},
 setRt(s){this.rt=+s||0},
 rtOf(p){return this.rt||(/^#\/watch\/series/.test(location.hash)?2700:6600)},
 /* Mbps the stream needs: from the "~2.9 Mbps" note in its text, else file size / running time */
 rate(p){return p.mbps||(p.size>0?p.size*8000/this.rtOf(p):0)},
 mark(p){
  const t=p.txt||'';let why='';
  const h=hostOf(p.url);
  if(CAM_I.test(t)||CAM_S.test(t))why='cam';
  else if(p.size>0&&p.size<.3&&p.q>=1080)why='sample';
  else if(DEAD_HOST.some(x=>h===x||h.endsWith('.'+x)))why='dead';
  else if(DEAD_PROV.includes(p.prov))why='dead';
  p.junk=why;p.meh=!why&&SOFT.test(t)?1:0;
  const m=/~\s*(\d+(?:\.\d+)?)\s*mbps/i.exec(t);if(m)p.mbps=+m[1];
  let show=false;try{show=!!CFG().showJunk}catch{}
  if(why&&!show)p.playable=false;
 },
 /* class 0 keeps up, 1 is tight, 2 is heavy, 3 will not keep up */
 fit(p){
  const r=this.rate(p);if(!r)return 0;
  const b=this.budget();
  return r<=b?0:r<=b*1.4?1:r<=b*2.2?2:3;
 },
 /* bits per pixel: is the file squeezed too hard for its resolution? */
 starved(p){
  const d=DIM[p.q],r=this.rate(p);if(!d||!r||p.q<1080)return 0;
  const vid=Math.max(.1,r-(p.exotic?.6:.35)),bpp=vid*1e6/(d[0]*d[1]*24),g=p.hevc?.06:.10;
  return bpp<g*.58?1:0;
 },
 /* the numbers kplay.js puts into its sort: [junk, fit, starved, biggest file that fits] (smaller is better) */
 keys(p){
  const j=p.junk?2:p.meh?1:0,f=this.fit(p);
  return[j,f,this.starved(p),f===0&&p.size>0?-Math.min(p.size,60):0];
 }
};
window.KFit=KFit;

/* measure when the app opens, when the network comes back and when the number has gone old */
setTimeout(()=>{if(quiet())measure()},2500);
addEventListener('online',()=>{if(quiet())measure()});
D.addEventListener('visibilitychange',()=>{if(D.visibilityState==='visible'&&!fresh()&&quiet())measure()});
addEventListener('hashchange',()=>{
 const m=/^#\/watch\/(movie|series)\/([^/?]+)(?:\/([^/?]+))?/.exec(location.hash);
 if(!m)return;
 KFit.rt=0;
 try{if(window.KRuntimeOf)Promise.resolve(KRuntimeOf({type:m[1],id:decodeURIComponent(m[2]),vid:m[3]?decodeURIComponent(m[3]):''})).then(s=>{if(s>0)KFit.rt=s}).catch(()=>{})}catch{}
});
})();
