/* Kinora player v3
   - The player opens straight away. Sources are looked up while you are still on the details page.
   - 4KHDHub is always tried first, the other sources are fallbacks. A dead or slow source is dropped after a few seconds.
   - Top left: back. Top right: one normal popup for language, quality and subtitles (with full subtitle settings).
   - Bottom: the seek bar (always full length, drag to preview, the jump happens when you let go) and a few plain buttons.
   - No fullscreen / minimise / close buttons on the player. The Windows app goes full screen by itself while a video plays.
   - Seeking: one jump per drag, a spinner until the new picture is really on screen, and a light "keeping up" watchdog.
   - In the Android app the video is decoded by ExoPlayer (knative.js), in the Windows app mpv / VLC can take over,
     in the browser the web engine below plays it. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const say=m=>{try{toast(m)}catch{}};
const WIN=/Electron/.test(navigator.userAgent);
const ANDROID=!!((window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())||window.KinoraNative);
const APP_PLAYER=WIN||ANDROID;
const withT=(p,ms)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(Error('timeout')),ms))]);
const qlab=q=>q>=2160?'4K':q?q+'p':'Auto';
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return''}};
const MAIN='4KHDHub';

/* one-time settings: always auto-pick, let every quality through, no torrents, no stale stream filters */
try{
 if(CFG().autoPlay===false)setCfg({autoPlay:true});
 if(!LS.get('kmig1',0)){setCfg({sMin:0,sMax:0});LS.set('kmig1',1)}
 if(!LS.get('kmig3',0)){setCfg({langOnly:false,qOnly:false,p2p:false,autoSwitch:true});LS.set('kmig3',1)}
}catch{}

/* ================= reading what an add-on returned ================= */
const LANGS=[['Hindi',/\b(hindi|hin)\b/i],['English',/\b(english|eng)\b/i],['Tamil',/\b(tamil|tam)\b/i],['Telugu',/\b(telugu|tel)\b/i],['Malayalam',/\bmalayalam\b/i],['Kannada',/\bkannada\b/i],['Bengali',/\b(bengali|bangla)\b/i],['Marathi',/\bmarathi\b/i],['Punjabi',/\bpunjabi\b/i],['Gujarati',/\bgujarati\b/i],['Urdu',/\burdu\b/i],['Spanish',/\b(spanish|espa[n\u00f1]ol|castellano|latino|spa)\b/i],['French',/\b(french|fran[c\u00e7]ais|fre)\b/i],['German',/\b(german|deutsch|ger)\b/i],['Italian',/\b(italian|italiano|ita)\b/i],['Portuguese',/\b(portugu[e\u00ea]s|portuguese)\b/i],['Russian',/\b(russian|rus)\b/i],['Arabic',/\barabic\b/i],['Turkish',/\bturkish\b/i],['Japanese',/\b(japanese|jpn)\b/i],['Korean',/\b(korean|kor)\b/i],['Chinese',/\b(chinese|mandarin|cantonese)\b/i],['Thai',/\bthai\b/i],['Vietnamese',/\bvietnamese\b/i],['Indonesian',/\bindonesian\b/i],['Malay',/\bmalay\b/i],['Polish',/\bpolish\b/i]];
const PROV=[['4KHDHub',/4khdhub/],['HDHub4u',/hdhub4u/],['HdHub',/hdhub/],['MoviesDrives',/moviesdrives?/],['VegaMovies',/vegamovies/],['MovieBox',/moviebox/],['VidLink',/vidlink/],['VidFast',/vidfast/],['VAPlayer',/vaplayer/],['2Peckle',/2peckle/],['Cinejoy',/cinejoy/],['Miruro',/miruro/],['KissKH',/kisskh/],['Anikoto',/anikoto/],['Vidy',/\bvidy\b/],['Obejrzyj',/obejrzyj/],['Arctic',/arctic/],['ToonWorld4All',/toonworld4all/],['Ani.pm',/anipm/],['Reanime',/reanime/],['LaMovie',/lamovie/],['SoloLatino',/sololatino/],['Moflix',/moflix/],['PremiumSmart',/premiumsmart/]];
const ORDER=PROV.map(x=>x[0]);
const DON=/donat|buy\s*me\s*a?\s*coffee|\bko-?fi\b|patreon|sponsor|support\s+(the\s+)?(dev|developer|project|us|add-?on)|tip\s*jar/i,DONH=/ko-fi\.com|buymeacoffee|patreon\.com|paypal\.me|razorpay\.com|upi:\/\//i;
const resOf=t=>/\b(2160p?|4k|uhd)\b|3840\s*x\s*2160/i.test(t)?2160:/\b1440p?\b|2560\s*x\s*1440|\b2k\b/i.test(t)?1440:/\b1080p?\b|1920\s*x\s*1080|\bfhd\b/i.test(t)?1080:/\b720p?\b|1280\s*x\s*720/i.test(t)?720:/\b480p?\b|\bsd\b|854\s*x\s*480/i.test(t)?480:/\b(360p?|240p?)\b/i.test(t)?360:0;

function parse(raw,an){
 if(!raw||typeof raw!=='object')return null;
 const b=raw.behaviorHints||{},url=raw.url||'';
 const txt=[raw.name,raw.title,raw.description,b.filename].filter(Boolean).join(' \n ').replace(/[\u{1F1E6}-\u{1F1FF}]/gu,' ');
 const p={raw:{...raw,_a:an},addon:an,url,txt};
 p.key=url||raw.infoHash||raw.externalUrl||raw.ytId||txt.slice(0,90);
 p.donate=DON.test(txt)||DONH.test(url+' '+(raw.externalUrl||''));
 p.kind=raw.ytId&&!url?'yt':(raw.infoHash&&!url)||/^magnet:/i.test(url)?'torrent':!url&&raw.externalUrl?'ext':/\.m3u8(\?|$)/i.test(url)?'hls':url?'file':'none';
 p.playable=(p.kind==='hls'||p.kind==='file')&&/^https?:/i.test(url);
 p.q=resOf(txt);
 p.langs=LANGS.filter(x=>x[1].test(txt)).map(x=>x[0]);
 p.hevc=/hevc|x265|h\.?265/i.test(txt);
 p.dv=/dolby.?vision|\bdovi\b|\bdv\b/i.test(txt);
 p.hdr=/hdr10\+?|\bhdr\b/i.test(txt);
 p.exotic=/dts|truehd|e-?ac-?3|\bdd\+|\bac-?3\b/i.test(txt);
 const nt=(txt+' '+host(url)+' '+an).toLowerCase().replace(/[^a-z0-9]/g,'');
 const pn=(an+' '+host(url)).toLowerCase().replace(/[^a-z0-9]/g,'');
 p.prov=(PROV.find(x=>x[1].test(pn))||PROV.find(x=>x[1].test(nt))||[an||'Source'])[0];
 const m=/(\d+(?:\.\d+)?)\s*(gb|mb)/i.exec(txt);
 p.size=b.videoSize?b.videoSize/1e9:m?(m[2].toLowerCase()==='gb'?+m[1]:+m[1]/1000):0;
 return p;
}
const main=()=>MAIN;
const provRank=p=>p.prov===MAIN?0:1+(ORDER.indexOf(p.prov)<0?40:ORDER.indexOf(p.prov));
const nativeOK=()=>!!(window.KNative&&KNative.on&&KNative.on());
const webScore=p=>{
 let s=0;const ext=(p.url.split('?')[0].match(/\.([a-z0-9]{2,4})$/i)||[])[1]||'';
 if(p.kind==='hls')s-=1;else if(/^(mp4|m4v|webm)$/i.test(ext))s+=0;else if(/^mkv$/i.test(ext))s+=nativeOK()?0:1.5;else s+=1;
 if(p.exotic&&!nativeOK()&&!(WIN&&SRVOK()))s+=2;
 if(window.KSpeed){try{s+=Math.min(3,KSpeed.pen(p.raw)/3)}catch{}}
 return s;
};
const QL=[2160,1440,1080,720,480,360];
const qIdx=q=>{if(!q)return 2.5;let b=0,d=1e9;QL.forEach((x,i)=>{const k=Math.abs(x-q);if(k<d){d=k;b=i}});return b};
/* sel.pf = provider first (used to start and to fall back); without it a picked language or quality wins over the provider */
const rank=(p,sel,pref,bad)=>{
 const lm=sel.lang?(p.langs.includes(sel.lang)?0:p.langs.length?1:.5):0;
 const qd=sel.q?Math.abs(qIdx(p.q)-qIdx(sel.q))+(p.q>sel.q?.3:0):0;
 const ps=pref&&window.KSrc?-window.KSrc.score(p.raw,pref):0;
 const hd=((CFG().hdr===true)===!!(p.hdr||p.dv))?0:1,hv=(!HEVC_OK&&p.hevc)?1:0,pr=provRank(p),bd=bad&&bad.has(p.key)?1:0;
 // App clients let learned startup speed outrank provider preference; web keeps provider-first ordering.
 return sel.pf?(APP_PLAYER?[bd,hv,ps,lm,qd,hd,webScore(p),pr,p.q?0:1]:[bd,hv,ps,pr,lm,qd,hd,webScore(p),p.q?0:1]):[bd,ps,lm,qd,hd,hv,pr,webScore(p),p.q?0:1];
};
const cmp=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0};

/* ================= finding streams (cached, and started early) ================= */
const SC=new Map();
function formsOf(type,id,vid,meta){
 const vs=(meta.videos||[]).filter(v=>v.season>0),ep=vs.find(v=>v.id===vid);
 const m=/:(\d+):(\d+)$/.exec(vid||''),sn=ep?ep.season:m&&m[1],en=ep?ep.episode:m&&m[2];
 const imdb=meta.imdb_id||(/^tt\d+/.test(id)?id.split(':')[0]:''),tmdb=meta.moviedb_id||(/^tmdb:/.test(id)?id.split(':')[1]:'');
 return[imdb&&(type==='series'?imdb+':'+sn+':'+en:imdb),tmdb&&(type==='series'?'tmdb:'+tmdb+':'+sn+':'+en:'tmdb:'+tmdb),vid||id].filter(x=>x&&!/undefined/.test(x));
}
function entryFor(type,id,vid,meta){
 const key=type+'|'+(vid||id),old=SC.get(key);
 if(old&&Date.now()-old.t<9e5&&!(old.finished&&!old.S.length&&Date.now()-old.t>3e4))return old;
 const forms=formsOf(type,id,vid,meta||{});
 const e={t:Date.now(),S:[],seen:new Set(),don:[],finished:false,subs:new Set(),emit(){e.subs.forEach(f=>{try{f()}catch{}})}};
 SC.set(key,e);if(SC.size>14)SC.delete(SC.keys().next().value);
 const list=addons.filter(a=>forms.find(x=>has(a,'stream',type,x)));
 if(!list.length){e.finished=true;return e}
 Promise.all(list.map(async a=>{
  const sid=forms.find(x=>has(a,'stream',type,x));
  const r=await withT(call(a,'stream',type,sid),14000).catch(()=>({}));
  (r.streams||[]).forEach(raw=>{
   const p=parse(raw,a.manifest.name);if(!p)return;
   if(p.donate){if(p.kind==='ext'||p.url)e.don.push(p);return}
   if(e.seen.has(p.key))return;e.seen.add(p.key);e.S.push(p);
  });
  e.emit();
 })).then(()=>{e.finished=true;e.emit()});
 return e;
}

/* ================= the playback engine ================= */
const E=window.KEngine={};
const KPlay=window.KPlay={hooks:null,fail:null,alts:null,report:()=>'',last:[],_t:{parse,rank,cmp,resOf}};
const H=(n,...a)=>{try{KPlay.hooks&&KPlay.hooks[n]&&KPlay.hooks[n](...a)}catch{}};
let seq=0,wd=0,stallT=0,vel=null;
function cleanup(){
 clearTimeout(wd);clearTimeout(stallT);clearInterval(E._fz);clearTimeout(E._sr);
 if(HL){try{HL.destroy()}catch{}HL=null}
 if(vel){try{vel.pause();vel.removeAttribute('src');vel.load()}catch{}vel=null}
 try{window.KNative&&KNative.detach()}catch{}
 D.documentElement.classList.remove('knat');
}
E.stop=()=>{seq++;cleanup();try{window.KExt&&KExt.stop()}catch{}};
E.play=function(s,ctx,t0){
 const box=Q('#vw'),ld=Q('#ld');if(!box)return;
 const my=++seq;cleanup();box.innerHTML='';
 const setLt=t=>{const e=Q('#lt');if(e)e.textContent=t};
 if(ld)ld.classList.add('on');setLt('Starting\u2026');
 const pl=Q('#pl');if(pl)pl.classList.remove('buf','knat');
 if(s.ytId&&!s.url){if(ld)ld.classList.remove('on');return box.innerHTML='<iframe src="https://www.youtube.com/embed/'+encodeURIComponent(s.ytId)+'?autoplay=1" allow="autoplay;fullscreen" allowfullscreen></iframe>'}
 let dead=false,started=false;
 const fail=(why,kind)=>{if(dead||my!==seq)return;dead=true;clearTimeout(wd);clearTimeout(stallT);clearInterval(E._fz);if(!started)try{window.KSpeed&&KSpeed.bad(s._o||s)}catch{}const x=vel;KPlay.fail&&KPlay.fail(why,x&&x.currentTime>5?x.currentTime:t0||0,s,kind)};
 if(!s.url||/^(magnet|torrent):/i.test(s.url)){setTimeout(()=>fail('This source is a torrent, which a player cannot open directly.'),0);return}
 /* Windows app: hand hard files to mpv or VLC when it is installed */
 try{if(window.KExt&&KExt.handle&&KExt.handle(s,ctx,t0,why=>fail(why)))return}catch{}
 /* Windows app: plain files go through the built-in fast proxy (it also adds the headers the host wants) */
 if(WIN&&SRVOK()&&!s._srv&&!s._kp&&/^https?:/i.test(s.url)&&!/\.m3u8(\?|$)/i.test(s.url)&&!/^https?:\/\/127\.0\.0\.1/.test(s.url)){
  const c=srvCfg(),hd=s.behaviorHints&&s.behaviorHints.proxyHeaders&&s.behaviorHints.proxyHeaders.request,bh={...(s.behaviorHints||{})};delete bh.proxyHeaders;
  return E.play({...s,_o:s._o||s,_kp:1,behaviorHints:bh,url:c.url.replace(/\/$/,'')+'/proxy?k='+encodeURIComponent(c.key)+'&u='+encodeURIComponent(s.url)+(hd?'&h='+encodeURIComponent(btoa(JSON.stringify(hd))):'')},ctx,t0);
 }
 if(SRVOK()&&!s._srv&&s.behaviorHints&&s.behaviorHints.proxyHeaders&&!(window.KNative&&KNative.can(s)))return play(srvStream(s),ctx,t0);
 if(SRVOK()&&!s._srv&&WIN&&/hevc|x265|h\.?265|dts|truehd|e-?ac-?3|\bac3\b/i.test((s.name||'')+' '+(s.title||s.description||'')+' '+s.url))return play(srvStream(s),ctx,t0);

 const v=D.createElement('video');
 /* no crossorigin attribute: many hosts send no CORS headers and would refuse to play */
 v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.playsInline=true;v.preload='auto';v.autoplay=true;
 v.defaultPlaybackRate=v.playbackRate=CFG().speed||1;
 box.append(v);vel=v;
 const deadline=Date.now()+120000,tStart=performance.now();
 const arm=ms=>{clearTimeout(wd);wd=setTimeout(()=>{if(my===seq&&!started)fail('This source took too long to start.')},Math.max(3500,Math.min(ms,deadline-Date.now())))};
 /* a source with nothing to show for a few seconds is dropped when there is another to try; a lone source gets longer */
 const alts=(()=>{try{return KPlay.alts?KPlay.alts():0}catch{return 0}})();
 arm(s._srv?50000:alts>0?(APP_PLAYER?Math.max(4500,Math.min(6000,(window.KSpeed?KSpeed.limit(s):30000)*.2)):Math.max(7000,Math.min(11000,(window.KSpeed?KSpeed.limit(s):30000)*.3))):40000);

 /* play() can be refused by the browser: fall back to muted playback, then to a tap */
 let tried=false;
 const tryPlay=()=>{
  const pr=v.play();
  if(pr&&pr.catch)pr.catch(err=>{
   if(my!==seq||!err)return;
   if(err.name==='NotAllowedError'){v.muted=true;v.play().then(()=>H('muted')).catch(()=>H('tap'))}
  });
 };

 const isHls=s.kind==='hls'||/\.m3u8(\?|$)/i.test(s.url);
 const nat=!!(window.KNative&&KNative.can(s));
 if(nat){
  /* Android app: ExoPlayer draws behind the page; this <video> is only a stand-in so the controls, party sync and progress keep working */
  KNative.attach(v,s,t0||0,ctx);
  D.documentElement.classList.add('knat');if(pl)pl.classList.add('knat');
 }else if(isHls&&window.Hls&&Hls.isSupported()){
  const bl=Math.max(40,CFG().buf||60),want=+s._q||0;
  const hl=HL=new Hls({enableWorker:true,lowLatencyMode:false,maxBufferLength:bl,maxMaxBufferLength:bl*3,backBufferLength:30,maxBufferSize:150e6,maxBufferHole:.5,startFragPrefetch:true,testBandwidth:false,abrEwmaDefaultEstimate:6e6,
   manifestLoadingMaxRetry:2,manifestLoadingRetryDelay:600,levelLoadingMaxRetry:3,levelLoadingRetryDelay:600,fragLoadingMaxRetry:6,fragLoadingRetryDelay:600,fragLoadingMaxRetryTimeout:12000,nudgeMaxRetry:8});
  hl.on(Hls.Events.MANIFEST_PARSED,(_,d)=>{
   if(!started)arm(22000);
   if(want){let bi=-1,bd=1e9;d.levels.forEach((l,i)=>{const k=Math.abs((l.height||0)-want)+((l.height||0)>want?50:0);if(k<bd){bd=k;bi=i}});if(bi>=0){hl.startLevel=bi;hl.autoLevelCapping=bi}}
   tryPlay();
  });
  hl.on(Hls.Events.FRAG_LOADED,()=>{if(!started)arm(25000)});
  hl.on(Hls.Events.ERROR,(_,d)=>{
   if(hl!==HL||my!==seq)return;
   if(d.fatal){
    if(d.type===Hls.ErrorTypes.NETWORK_ERROR){
     hl._nr=(hl._nr||0)+1;
     if(hl._nr<=3){setTimeout(()=>{if(hl===HL&&my===seq)hl.startLoad()},Math.min(3000,500*Math.pow(2,hl._nr)));return}
     return fail('The stream stopped loading. The host may be down or blocking requests.');
    }
    if(d.type===Hls.ErrorTypes.MEDIA_ERROR){
     hl._mr=(hl._mr||0)+1;
     if(hl._mr===2)try{hl.swapAudioCodec()}catch{}
     if(hl._mr<=3){hl.recoverMediaError();return}
     return fail('This device cannot decode this stream.');
    }
    return fail('This stream could not be loaded.');
   }
   if(d.details==='bufferStalledError'){
    hl._st=(hl._st||0)+1;
    clearTimeout(E._sr);E._sr=setTimeout(()=>{try{if(vel&&!vel.paused&&vel.readyState<3){hl.startLoad();vel.currentTime+=0.1}}catch{}},1500);
    if(hl._st>=3&&hl.currentLevel>0&&hl.autoLevelEnabled){hl.nextLoadLevel=hl.currentLevel-1;hl._st=0}
   }else if(d.details==='bufferNudgeOnStall'){try{if(vel&&vel.readyState<3)vel.currentTime+=0.1}catch{}}
  });
  hl.loadSource(s.url);hl.attachMedia(v);
 }else v.src=s.url;

 const key=ctx.vid||ctx.id;let last=0;
 const markW=()=>{if(!v.duration||v.currentTime/v.duration<.9)return;if(ctx.vid){const w=EW();if(!w[ctx.vid]){w[ctx.vid]=1;LS.set('ew',w)}}else if(!stOf(ctx).w)setSt(ctx,{w:true})};
 const setBuf=on=>{const p=Q('#pl');if(p)p.classList.toggle('buf',!!on)};
 const stallRecover=()=>{
  if(my!==seq||v.paused||v.readyState>=3)return;
  setBuf(true);
  if(HL){try{HL.startLoad()}catch{}}
  try{v.currentTime+=0.05}catch{}
  clearTimeout(stallT);
  stallT=setTimeout(()=>{if(my===seq&&!v.paused&&v.readyState<3&&CFG().autoSwitch!==false)fail('This source keeps stalling.','slow')},20000);
 };

 /* after a jump the spinner stays until a new picture is really on screen (audio alone is not "playing") */
 let fid=0,fw=false,fsafe=0;
 const frameWait=()=>{
  if(nat||!v.requestVideoFrameCallback)return;
  const id=++fid;fw=true;clearTimeout(fsafe);
  v.requestVideoFrameCallback(()=>{if(id===fid){fw=false;clearTimeout(fsafe);setBuf(false)}});
  fsafe=setTimeout(()=>{if(id===fid){fw=false;if(v.readyState>=3)setBuf(false)}},7000);
 };

 v.addEventListener('loadedmetadata',()=>{
  if(!started)arm(28000);
  if(!nat){
   const p=CFG().resume&&!window.START0?LS.get('prog',{})[key]:null,t=t0||(p&&p.t>30&&p.t<v.duration-60?p.t:0);
   if(t)try{v.currentTime=t}catch{}
  }
  window.START0=false;H('time');
 });
 v.addEventListener('durationchange',()=>H('time'));
 v.addEventListener('loadeddata',()=>{if(!started)arm(28000);if(!tried){tried=true;tryPlay()}});
 v.addEventListener('canplay',()=>{if(!started)arm(22000);if(!fw)setBuf(false);if(v.paused&&v.autoplay&&!tried){tried=true;tryPlay()}});
 v.addEventListener('progress',()=>{
  H('time');
  if(!started&&v.buffered.length){arm(22000);setLt('Buffering\u2026')}
 });
 v.addEventListener('waiting',()=>{
  if(!started)return;
  setBuf(true);clearTimeout(stallT);stallT=setTimeout(stallRecover,5000);
 });
 v.addEventListener('stalled',()=>{if(started&&v.readyState<3){setBuf(true);clearTimeout(stallT);stallT=setTimeout(stallRecover,5000)}});
 v.addEventListener('seeking',()=>{if(started){setBuf(true);frameWait()}});
 v.addEventListener('seeked',()=>{if(nat||!v.requestVideoFrameCallback){if(v.readyState>=3)setBuf(false)}});
 v.addEventListener('playing',()=>{
  const first=!started;started=true;clearTimeout(wd);clearTimeout(stallT);if(!fw)setBuf(false);
  if(first)try{window.KSpeed&&KSpeed.ok(s._o||s,performance.now()-tStart)}catch{}
  if(ld)ld.classList.remove('on');H('state');if(first)H('playing',s);
  if(first&&!nat&&'webkitAudioDecodedByteCount' in v)setTimeout(()=>{
   if(my!==seq||dead||v.paused||v.muted||v.volume===0||v.currentTime<1.5)return;
   if(v.webkitAudioDecodedByteCount===0){
    if(SRVOK()&&!s._srv){say('Fixing the sound\u2026');play(srvStream({...s}),ctx,v.currentTime);return}
    fail('This source has no sound on this device.','audio');
   }
  },4500);
 });
 v.addEventListener('pause',()=>H('state'));v.addEventListener('play',()=>H('state'));
 v.addEventListener('volumechange',()=>H('vol'));
 v.addEventListener('timeupdate',()=>{
  H('time');markW();
  if(Date.now()-last<5000)return;last=Date.now();
  const p=LS.get('prog',{});p[key]={...ctx,t:v.currentTime,d:v.duration,at:last};LS.set('prog',p);
 });
 v.addEventListener('ended',()=>{const n=Q('#nx');n&&CFG().autonext&&n.click()});
 v.addEventListener('error',()=>{
  if(my!==seq)return;
  const c=v.error&&v.error.code;
  if(c===2&&!v._net&&!HL&&!nat&&started){v._net=1;const ct=v.currentTime;try{v.load();v.addEventListener('loadedmetadata',()=>{try{v.currentTime=ct}catch{}tryPlay()},{once:true});return}catch{}}
  if(HL&&started)return; /* the HLS handler already decides */
  fail((v.error&&v.error.message)||(c===3?'This device cannot decode this video or audio (often HEVC video or DTS/AC3 sound).':c===4?'This stream cannot be opened here. It may be blocked by the host or not meant for players.':'A network error stopped this stream.'));
 });

 /* "audio plays but the picture is frozen": show the spinner, and move to a lighter version when the video cannot keep up */
 if(!nat&&v.getVideoPlaybackQuality){
  let lastN=-1,t1=0;
  E._fz=setInterval(()=>{
   if(my!==seq||!started||v.paused||v.seeking||v.readyState<3||!v.videoWidth){lastN=-1;t1=0;return}
   const n=v.getVideoPlaybackQuality().totalVideoFrames;
   if(n>0&&n===lastN){
    if(!t1)t1=Date.now();const dt=Date.now()-t1;
    if(dt>2200)setBuf(true);
    if(dt>9000&&!v._frz&&(KPlay.alts?KPlay.alts():0)>0){v._frz=1;say('The video is not keeping up. Trying a lighter version\u2026');fail('The video is not keeping up with the sound.','slow')}
   }else if(t1){t1=0;if(!fw)setBuf(false)}
   lastN=n;
  },1000);
 }
 tryPlay();
 try{addSubs(v,ctx)}catch{}
};
addEventListener('hashchange',()=>{if(!/^#\/watch\//.test(location.hash)){E.stop();try{window.kinoraWin&&kinoraWin.act&&kinoraWin.act('fs-off')}catch{}}});
/* every part of the app that starts a video goes through this engine (it replaces the older wrappers, and does their work itself) */
play=function(s,ctx,t0){return E.play(s,ctx,t0)};

/* ================= the player screen ================= */
const stIcon=v=>ic(v&&!v.paused?'pause':'play');
const IC2={
 b10:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v4.5h4.5"/><path d="M10.2 9.6v5M13 9.6h1.8a1.2 1.2 0 0 1 1.2 1.2v2.4a1.2 1.2 0 0 1-1.2 1.2H13z"/></svg>',
 f10:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/><path d="M10.2 9.6v5M13 9.6h1.8a1.2 1.2 0 0 1 1.2 1.2v2.4a1.2 1.2 0 0 1-1.2 1.2H13z"/></svg>',
 pk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/></svg>',
 dn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
 ck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};
const rt2s=r=>{if(!r)return 0;const s=String(r),hh=/(\d+)\s*h/i.exec(s),m=/(\d+)\s*m/i.exec(s);if(hh||m)return((hh?+hh[1]:0)*60+(m?+m[1]:0))*60;const x=/(\d+)/.exec(s);return x?+x[1]*60:0};
const SUBCOL=[['#ffffff','White'],['#ffe45c','Yellow'],['#7de3ff','Cyan'],['#8dffa0','Green']];
let kkh=null;

V.watch=async function(type,id,vid){
 id=decodeURIComponent(id);vid=vid?decodeURIComponent(vid):'';
 if(window.KEmbed&&KEmbed.should&&KEmbed.should(type)){app.innerHTML=LD;KEmbed.open(type,id,vid);return}
 const token=window.__kw={};
 if(kkh){D.removeEventListener('keydown',kkh,true);kkh=null}
 /* the player appears at once; details fill in when the add-on answers */
 let meta={...((typeof M!=='undefined'&&M[type+'|'+id])||{})};
 const ma=addons.find(a=>has(a,'meta',type,id));
 const metaP=meta.videos||!ma?Promise.resolve(meta):withT(call(ma,'meta',type,id),9000).then(r=>r.meta||{}).catch(()=>({}));
 setAmb();
 const pick=PICK;PICK=null;
 const pref=window.KPREF&&window.KPREF.get?window.KPREF.get():null;window.KPREF=null;
 const nm0=meta.name?meta:{name:''};
 const ctx={type,id,vid,name:nm0.name,poster:meta.poster,label:''};
 app.innerHTML='<div id="pl" class="kp act" data-e="1" data-k9="1"><div id="vw"></div>'+
  '<div id="ld" class="on"><div class="lb" style="background-image:url(\''+h(meta.background||meta.poster||'')+'\')"></div><div class="lc">'+logoOrName(nm0)+'<div class="lt" id="lt">Finding sources\u2026</div></div></div><div id="bfs"><i></i></div>'+
  '<div id="kcue"></div>'+
  '<div id="ov"></div>'+
  '<div id="top"><a class="rb" id="kback" href="#/title/'+type+'/'+encodeURIComponent(id)+'" aria-label="Back">'+ic('back')+'</a><b id="ktl">'+h(nm0.name||'')+'</b><div id="clk"></div>'+
  '<button class="kpk" id="kpk" aria-label="Language, quality and subtitles" aria-haspopup="true">'+IC2.pk+'<span id="kqt">Auto</span>'+IC2.dn+'</button></div>'+
  '<div id="kpop" role="dialog" aria-label="Language, quality and subtitles"></div>'+
  '<div id="ctl"><div id="sk"><i id="bf"></i><i id="pg"></i><b id="stp"></b></div><div class="kr"><div class="kl"><button class="kb" id="pp" aria-label="Play or pause">'+ic('play')+'</button><button class="kb ksk" id="kb10" aria-label="Back 10 seconds">'+IC2.b10+'</button><button class="kb ksk" id="kf10" aria-label="Forward 10 seconds">'+IC2.f10+'</button><button class="kb kvol" id="vb" aria-label="Mute">'+ic('vol2')+'</button><input class="kvol" id="vs" type="range" min="0" max="1" step=".05" value="1" aria-label="Volume"><span id="tt">0:00 / 0:00</span></div>'+
  '<div class="krr"><i id="cc" hidden></i></div></div></div>'+
  '<button id="fs" hidden aria-hidden="true" tabindex="-1"></button></div>';
 const pl=Q('#pl'),VID=()=>Q('#vw video');
 try{window.kinoraWin&&kinoraWin.act&&kinoraWin.act('fs-on')}catch{}
 let it;
 pl.wake=()=>{pl.classList.add('act');pl.classList.remove('rest');clearTimeout(it);it=setTimeout(()=>{if(Q('#kpop.on')||pl.classList.contains('scrub'))return pl.wake();pl.classList.remove('act');const v=VID();if(v&&v.paused&&!pl.classList.contains('buf')&&!Q('#ld.on'))pl.classList.add('rest')},3200)};
 pl.onmousemove=pl.wake;pl.wake();

 /* ---------- meta-dependent bits ---------- */
 let ep=null,nx=null,RT=0;
 const applyMeta=m=>{
  if(window.__kw!==token)return;
  meta=m&&Object.keys(m).length?{...meta,...m}:meta;
  const vids=(meta.videos||[]).filter(x=>x.season>0).sort((x,y)=>x.season-y.season||x.episode-y.episode);
  ep=vids.find(x=>x.id===vid)||null;nx=ep?vids[vids.indexOf(ep)+1]:null;
  const nm=meta.name?meta:{name:''};
  ctx.name=nm.name;ctx.poster=meta.poster||ctx.poster;ctx.label=ep?'S'+ep.season+'E'+ep.episode:'';
  RT=rt2s((ep&&ep.runtime)||meta.runtime);
  const t=h(ctx.name)+(ctx.label?' \u00b7 '+h(ctx.label):'')+(ep&&ep.title?' \u00b7 '+h(ep.title):'');
  const tl=Q('#ktl');if(tl)tl.innerHTML=t;
  const ov=Q('#ov');if(ov)ov.innerHTML=logoOrName(nm)+'<div class="mt">'+mt(meta)+'</div><p>'+h((ep&&ep.overview)||meta.description||'')+'</p>';
  const lb=Q('#ld .lb');if(lb&&(meta.background||meta.poster))lb.style.backgroundImage='url(\''+(meta.background||meta.poster)+'\')';
  const krr=Q('.krr');
  if(krr&&nx&&!Q('#nx')){krr.insertAdjacentHTML('afterbegin','<button class="kb" id="nx" aria-label="Next episode" title="Next episode">'+ic('next')+'</button>');Q('#nx').onclick=()=>{location.hash=watchUrl(type,id,nx.id)}}
  if(krr&&!nx){const b=Q('#nx');if(b)b.remove()}
  try{tick()}catch{}
 };
 /* run once everything below is defined (the seek bar and its helpers are created further down) */
 queueMicrotask(()=>applyMeta(meta));
 metaP.then(applyMeta);

 /* ---------- streams ---------- */
 const E0=(pick&&pick._a==='Live TV')?{S:[],don:[],finished:true,subs:new Set()}:entryFor(type,id,vid,meta),extra=[],bad=new Set(),don=E0.don;
 let cur=null,st={lang:'',q:0},started=false,graceT=0,waiting=false,popTab='lang';
 KPlay.last=E0.S;
 const all=()=>extra.concat(E0.S);
 const playable=()=>all().filter(x=>x.playable);
 const curTime=()=>{const v=VID();return v&&v.currentTime>5?v.currentTime:0};
 const live=()=>window.__kw===token&&!!Q('#pl');

 const langList=pls=>{
  const c={};pls.forEach(p=>p.langs.forEach(l=>c[l]=(c[l]||0)+1));
  const pr=[LS.get('kpick',{}).lang,...(CFG().prefLangs||[])].filter(Boolean);
  return Object.keys(c).sort((a,b)=>(pr.includes(b)-pr.includes(a))||c[b]-c[a]).map(n=>({n,c:c[n]}));
 };
 const best=(lang,q)=>{
  const pool=playable().filter(x=>!lang||x.langs.includes(lang)||(!x.langs.length&&!st.lang));
  return pool.map(s=>({s,k:rank(s,{lang,q},null,bad)})).sort((a,b)=>cmp(a.k,b.k)).map(x=>x.s)[0];
 };
 const okS=x=>!bad.has(x.key)&&!(window.KSpeed&&KSpeed.dead(x.raw));
 const order=sel=>playable().filter(okS).map(s=>({s,k:rank(s,{...sel,pf:true},pref,null)})).sort((a,b)=>cmp(a.k,b.k)).map(x=>x.s);
 KPlay.alts=()=>order({lang:st.lang,q:st.q}).filter(x=>x!==cur).length;
 const defSel=()=>{
  const kp=LS.get('kpick',{}),pls=playable(),langs=langList(pls).map(x=>x.n);
  const lang=kp.lang&&langs.includes(kp.lang)?kp.lang:((CFG().prefLangs||[]).find(l=>langs.includes(l))||'');
  let pool0=lang?pls.filter(x=>x.langs.includes(lang)||!x.langs.length):pls;
  /* do not start on a codec this device cannot play when another choice exists */
  const okc=x=>HEVC_OK||!x.hevc;
  const mp=pool0.filter(x=>x.prov===MAIN),preferred=mp.length?mp:pool0;
  const safe=preferred.filter(okc),safeAny=APP_PLAYER?pool0.filter(okc):safe;
  const pool=safe.length?safe:safeAny.length?safeAny:preferred;
  const have=[...new Set(pool.map(x=>x.q).filter(Boolean))].sort((a,b)=>b-a);
  let q=kp.q&&have.includes(kp.q)?kp.q:0;
  // Keep automatic app playback at 1080p for faster starts; users can still choose 4K explicitly.
  if(!q){const pq=CFG().quality,maxq=LS.get('maxq',2160)||2160,cap=!pq||pq==='best'?(APP_PLAYER?Math.min(1080,maxq):maxq):+pq;q=have.find(x=>x<=cap)||have[have.length-1]||0}
  return{lang,q};
 };

 /* ---------- the language / quality / subtitles popup (top right) ---------- */
 const setPill=()=>{
  const e=Q('#kqt');if(!e)return;
  e.textContent=[st.lang,qlab(st.q)].filter(Boolean).join(' \u00b7 ')||'Auto';
  const b=Q('#kpk');if(b)b.title=cur?'Source: '+cur.prov:'';
 };
 const subList=()=>{
  const v=VID();if(!v)return[];
  const ext=[...v.querySelectorAll('track')].map((t,i)=>({k:'x',i,n:t.label||'Subtitles',tr:t.track}));
  const emb=nat()?[...v.textTracks].map((t,i)=>({k:'e',i,n:t.label||'Track '+(i+1),tr:t})):[];
  return ext.concat(emb);
 };
 const nat=()=>D.documentElement.classList.contains('knat');
 let cursub=null,subLabel='';
 const audioList=()=>{
  const v=VID();if(!v)return[];
  if(v.kAudio)return v.kAudio().map((a,i)=>({n:a.n,on:a.on,set:()=>v.kAudioSet(i)}));
  if(HL&&HL.audioTracks&&HL.audioTracks.length>1)return HL.audioTracks.map((t,i)=>({n:t.name||t.lang||'Track '+(i+1),on:i===HL.audioTrack,set:()=>{HL.audioTrack=i}}));
  if(v.audioTracks&&v.audioTracks.length>1)return[...v.audioTracks].map((t,i)=>({n:t.label||(typeof langName==='function'?langName(t.language):t.language)||'Track '+(i+1),on:t.enabled,set:()=>[...v.audioTracks].forEach((x,j)=>{x.enabled=j===i})}));
  return[];
 };
 const row=(attr,label,note,on)=>'<button class="kro'+(on?' on':'')+'" '+attr+'><span>'+label+'</span>'+(note?'<small>'+note+'</small>':'')+'<em>'+(on?IC2.ck:'')+'</em></button>';
 const chip=(attr,label,on)=>'<button class="kch2'+(on?' on':'')+'" '+attr+'>'+label+'</button>';
 const renderPop=()=>{
  const el=Q('#kpop');if(!el)return;
  const pls=playable(),keep=(Q('.kpb',el)||{}).scrollTop||0;
  let body='';
  if(popTab==='lang'){
   const L=langList(pls);
   body=L.length?'<h5>Audio language</h5>'+L.map(({n})=>{
    const on=n===st.lang;let note='';
    if(!on&&st.q){const b=best(n,st.q);if(b&&b.q&&b.q!==st.q)note=(b.q>st.q?'\u2191':'\u2193')+qlab(b.q)}
    return row('data-l="'+h(n)+'"',h(n),note,on);
   }).join(''):'<p class="kn">Looking for audio languages\u2026</p>';
   const A=audioList();
   if(A.length>1)body+='<h5>Audio tracks in this file</h5>'+A.map((a,i)=>row('data-a="'+i+'"',h(a.n),'',a.on)).join('');
  }else if(popTab==='qual'){
   const qs=[...new Set(pls.filter(x=>!st.lang||x.langs.includes(st.lang)||!x.langs.length).map(x=>x.q).filter(Boolean))].sort((a,b)=>b-a);
   body=qs.length?'<h5>Quality</h5>'+qs.map(q=>{
    const p=best(st.lang,q),extra=p?[p.dv?'Dolby Vision':p.hdr?'HDR':'',p.size?p.size.toFixed(1)+' GB':''].filter(Boolean).join(' \u00b7 '):'';
    return row('data-q="'+q+'"',qlab(q),extra,q===st.q);
   }).join(''):'<p class="kn">Looking for qualities\u2026</p>';
   const v=VID(),rate=v?v.playbackRate:1;
   body+='<h5>Playback speed</h5><div class="kcs">'+[.5,.75,1,1.25,1.5,2].map(r=>chip('data-r="'+r+'"',r+'\u00d7',rate===r)).join('')+'</div>';
   if(cur)body+='<p class="kn">Playing from '+h(cur.prov)+'</p>';
  }else{
   const T=subList(),o={...SUBD,...LS.get('sub',{})};
   body='<h5>Subtitles</h5>'+row('data-t="off"','Off','',!cursub)+T.map(t=>row('data-t="'+t.k+t.i+'"',h(t.n),'',cursub&&cursub.k===t.k&&cursub.i===t.i)).join('')+(T.length?'':'<p class="kn">No subtitles from your add-ons yet. They load a few seconds after the video starts.</p>');
   body+='<h5>Size</h5><div class="kcs">'+[['S',70],['M',100],['L',140],['XL',190]].map(([n,z])=>chip('data-sz="'+z+'"',n,Math.abs((o.sz||100)-z)<18)).join('')+'</div>'+
    '<h5>Colour</h5><div class="kcs">'+SUBCOL.map(([c,n])=>'<button class="ksw'+((o.col||'#ffffff').toLowerCase()===c?' on':'')+'" data-col="'+c+'" style="--c:'+c+'" aria-label="'+n+'"></button>').join('')+'</div>'+
    '<h5>Background</h5><div class="kcs">'+[['None',0],['Light',.35],['Dark',.6],['Solid',.9]].map(([n,b])=>chip('data-bg="'+b+'"',n,Math.abs((o.bg==null?.55:o.bg)-b)<.13)).join('')+'</div>'+
    '<h5>Edge</h5><div class="kcs">'+[['None','none'],['Shadow','shadow'],['Outline','outline']].map(([n,e])=>chip('data-edge="'+e+'"',n,(o.edge||'shadow')===e)).join('')+'</div>'+
    '<h5>Font</h5><div class="kcs">'+[['Sans','sans'],['Serif','serif'],['Mono','mono']].map(([n,f])=>chip('data-font="'+f+'"',n,(o.font||'sans')===f)).join('')+chip('data-bold="'+(o.bold?0:1)+'"','Bold',!!o.bold)+'</div>'+
    '<h5>Position</h5><div class="kcs">'+[['Low',93],['Normal',88],['High',76]].map(([n,p])=>chip('data-pos="'+p+'"',n,Math.abs((o.pos==null?88:o.pos)-p)<5)).join('')+'</div>'+
    '<h5>Timing</h5><div class="kdl"><button class="kch2" data-dl="-0.5" aria-label="Earlier">\u2212 0.5s</button><b>'+((o.dl||0)>0?'+':'')+(+(o.dl||0)).toFixed(1)+' s</b><button class="kch2" data-dl="0.5" aria-label="Later">+ 0.5s</button></div>'+
    '<button class="kch2 kreset" data-reset="1">Reset subtitle style</button>';
  }
  const heart=don.length?'<button class="kheart" data-d aria-label="Support the add-on" title="Support the add-on">'+ic('heart')+'</button>':'';
  el.innerHTML='<div class="kpt2">'+[['lang','Language'],['qual','Quality'],['subs','Subtitles']].map(([k,n])=>'<button data-tab="'+k+'" class="'+(popTab===k?'on':'')+'">'+n+'</button>').join('')+heart+'</div><div class="kpb">'+body+'</div>';
  const b=Q('.kpb',el);if(b)b.scrollTop=keep;
 };
 const popOpen=()=>{const el=Q('#kpop');return!!(el&&el.classList.contains('on'))};
 const showPop=tab=>{const el=Q('#kpop');if(!el)return;if(tab)popTab=tab;renderPop();el.classList.add('on');const b=Q('#kpk');if(b)b.classList.add('on');pl.wake()};
 const hidePop=()=>{const el=Q('#kpop');if(el)el.classList.remove('on');const b=Q('#kpk');if(b)b.classList.remove('on')};

 /* ---------- subtitles drawn by the player (the same on every device) ---------- */
 const clean=t=>h(String(t||'').replace(/<(?!\/?(i|b|u)\b)[^>]*>/gi,'').replace(/\{\\[^}]*\}/g,'')).replace(/&lt;(\/?)(i|b|u)&gt;/gi,'<$1$2>').replace(/\n/g,'<br>');
 const styleCue=()=>{
  const el=Q('#kcue');if(!el)return;
  const o={...SUBD,...LS.get('sub',{})},ff={sans:'Manrope,system-ui,sans-serif',serif:'Georgia,serif',mono:'ui-monospace,monospace'}[o.font]||'inherit';
  const ed={none:'none',shadow:'0 2px 6px #000,0 0 2px #000',outline:'-1px -1px #000,1px -1px #000,-1px 1px #000,1px 1px #000,0 0 4px #000'}[o.edge||'shadow'];
  el.style.cssText='top:'+(o.pos==null?88:o.pos)+'%;font-size:'+Math.max(14,Math.round(innerHeight*.042*(o.sz||100)/100))+'px;font-family:'+ff+';font-weight:'+(o.bold?700:500)+';color:'+rgba(o.col||'#ffffff',o.op==null?1:o.op)+';text-shadow:'+ed;
  el.dataset.bg=rgba(o.bgc||'#000000',o.bg==null?.55:o.bg);
  const sp=Q('span',el);if(sp)sp.style.background=el.dataset.bg;
 };
 const drawCue=()=>{
  const el=Q('#kcue');if(!el)return;
  let txt='';
  const v=VID(),sel=cursub&&cursub.k==='x'?subList().find(s=>s.k==='x'&&s.i===cursub.i):null;
  if(v&&sel&&sel.tr&&sel.tr.cues){
   const o={...SUBD,...LS.get('sub',{})},dl=+o.dl||0,t=(v.currentTime||0)-dl;
   for(const c of sel.tr.cues){const a=c._s!=null?c._s:c.startTime,b=c._e!=null?c._e:c.endTime;if(a<=t&&t<=b)txt+=(txt?'\n':'')+c.text}
  }
  if(el._t===txt)return;el._t=txt;
  el.innerHTML=txt?'<span style="background:'+(el.dataset.bg||'rgba(0,0,0,.55)')+'">'+clean(txt)+'</span>':'';
 };
 const pickSub=k=>{
  const v=VID();if(!v)return;
  subList().forEach(s=>{try{if(s.k==='x')s.tr.mode='hidden';else s.tr.mode='hidden'}catch{}});
  if(k==='off'){cursub=null;subLabel=''}
  else{
   const s=subList().find(x=>x.k+x.i===k);if(!s)return;
   cursub={k:s.k,i:s.i};subLabel=s.n;
   if(s.k==='e'){try{s.tr.mode='showing'}catch{}}
  }
  const el=Q('#kcue');if(el){el._t=null;el.innerHTML=''}
  styleCue();drawCue();
  const sv=LS.get('ksubsel',{});sv.l=subLabel;LS.set('ksubsel',sv);
 };
 const adoptSubs=()=>{
  /* a track an add-on switched on (automatic subtitles), or the language you used last time */
  const T=subList();if(!T.length)return;
  const showing=T.find(s=>s.k==='x'&&s.tr&&s.tr.mode==='showing');
  if(showing){pickSub(showing.k+showing.i);return}
  if(!cursub&&!adoptSubs.done){
   const want=subLabel||(LS.get('ksubsel',{}).l||'');
   const m=want&&T.find(s=>s.n===want);
   if(m){pickSub(m.k+m.i);adoptSubs.done=1}
  }
 };
 const subTimer=setInterval(()=>{if(!live())return clearInterval(subTimer);adoptSubs();if(popOpen()&&popTab==='subs'&&!Q('.kro[data-t]',Q('#kpop')))renderPop()},900);

 /* ---------- starting, switching and falling back ---------- */
 function use(p,t0){
  cur=p;st.q=p.q||st.q;st.lang=st.lang&&p.langs.includes(st.lang)?st.lang:(p.langs[0]||'');
  started=true;setPill();if(popOpen())renderPop();
  adoptSubs.done=0;cursub=null;
  play({...p.raw,_q:p.q,_kk:p.key},ctx,t0||0);
 }
 function start(){
  if(started)return;
  const sel=defSel(),n=order(sel)[0];if(!n)return;
  st={lang:sel.lang,q:sel.q};use(n);
 }
 function onBatch(){
  if(!live())return E0.subs.delete(onBatch);
  if(popOpen())renderPop();
  if(waiting){
   const n=order({lang:st.lang,q:st.q})[0];
   if(n){waiting=false;use(n,curTime())}else if(E0.finished){waiting=false;showFail('No other source could play this title.')}
   return;
  }
  if(started)return;
  const pls=playable();
  if(!pls.length){if(E0.finished)showFail(E0.S.length?'These sources only offer torrents, which cannot be played here.':'No source returned a stream for this title.');return}
  if(pls.some(x=>x.prov===MAIN)||E0.finished)start();
  else if(!graceT)graceT=setTimeout(()=>{if(live()&&!started)start()},APP_PLAYER?250:1800);
 }
 KPlay.fail=(why,t,s,kind)=>{
  if(!live()||!cur||(s&&s._kk&&s._kk!==cur.key))return;
  bad.add(cur.key);
  let n=null;
  if(kind==='slow'&&st.q){n=order({lang:st.lang,q:st.q}).find(x=>x.q&&x.q<st.q);if(n)say('Slow connection: switching to '+qlab(n.q))}
  if(!n){n=order({lang:st.lang,q:st.q})[0];if(n)say('That source did not work. Trying another\u2026')}
  if(n){use(n,t);return}
  if(!E0.finished){waiting=true;const l=Q('#ld');if(l)l.classList.add('on');const e=Q('#lt');if(e)e.textContent='Looking for another source\u2026';return}
  showFail(why);
 };
 function showFail(why){
  const l=Q('#ld');if(l)l.classList.remove('on');
  const box=Q('#vw');if(!box)return;
  box.innerHTML='<div class="kmsg">'+h(why)+'<div class="kacts"><button class="btn p" id="kre">Try again</button>'+(cur&&cur.url?'<button class="btn" id="kcp">Copy link</button>':'')+(ANDROID&&cur&&cur.url?'<button class="btn" id="kext">Open in a player app</button>':'')+'</div></div>';
  const re=Q('#kre');if(re)re.onclick=()=>{bad.clear();started=false;waiting=false;SC.delete(type+'|'+(vid||id));const b=Q('#ld');if(b)b.classList.add('on');start()};
  const cp=Q('#kcp');if(cp)cp.onclick=()=>navigator.clipboard.writeText(cur.url).then(()=>say('Link copied. Paste it into VLC or MX Player.')).catch(()=>say('Could not copy the link'));
  const ex=Q('#kext');if(ex)ex.onclick=()=>openExternal(cur);
 }
 function openExternal(p){
  const u=p&&p.url;if(!u)return;
  try{const m=/^(https?):\/\/(.+)$/i.exec(u);location.href='intent://'+m[2]+'#Intent;scheme='+m[1].toLowerCase()+';type=video/*;end'}catch{say('Could not open a player app')}
 }
 const choose=(lang,q)=>{
  const p=best(lang!=null?lang:st.lang,q!=null?q:st.q);
  if(!p||p===cur)return;
  const kp=LS.get('kpick',{});if(lang!=null)kp.lang=lang;if(q!=null)kp.q=q;LS.set('kpick',kp);
  if(lang!=null)st.lang=lang;
  use(p,curTime());
 };

 /* ---------- seek bar ---------- */
 const sk=Q('#sk');
 let scrub=false,sf=0,seekT=0,pend=null;
 const conv=()=>!!(cur&&/\/hls\/|\/stream\.m3u8/.test((VID()&&VID().src)||''));
 /* the full length is known as soon as the title is: the real value takes over when the file reports it */
 const dur=()=>{
  const v=VID(),d=v&&v.duration;
  const real=d&&isFinite(d)&&d>0?d:0;
  if(RT&&(!real||(conv()&&real<RT*.97)))return RT;
  return real||0;
 };
 const tick=()=>{
  const v=VID(),p=Q('#pg');if(!p)return;
  const d=dur(),t=v?v.currentTime:0;
  if(!scrub)p.style.width=(d?Math.min(100,100*t/d):0)+'%';
  const tt=Q('#tt');if(tt)tt.textContent=CFG().rem&&d?'-'+ft(Math.max(0,d-t))+' / '+ft(d):ft(t)+' / '+ft(d);
  try{const b=Q('#bf');if(b)b.style.width=d&&v&&v.buffered.length?Math.min(100,100*v.buffered.end(v.buffered.length-1)/d)+'%':'0'}catch{}
  const ck=Q('#clk');
  if(ck&&v&&d&&!v.paused){const e=new Date(Date.now()+Math.max(0,d-t)/(v.playbackRate||1)*1000),s='Ends at '+e.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false});if(ck.textContent!==s)ck.textContent=s}
 };
 const fracOf=e=>{const r=sk.getBoundingClientRect();return Math.min(1,Math.max(0,(e.clientX-r.left)/r.width))};
 const tip=f=>{const t=Q('#stp'),d=dur();if(!t)return;t.style.left=Math.min(97,Math.max(3,f*100))+'%';t.textContent=ft(f*d)};
 const seekTo=t=>{
  const v=VID(),d=dur();if(!v)return;
  t=Math.max(0,d?Math.min(d-.5,t):t);pend=t;
  clearTimeout(seekT);
  seekT=setTimeout(()=>{const x=VID();if(x&&pend!=null)try{x.currentTime=pend}catch{}pend=null},90);
  const p=Q('#pg');if(p&&d)p.style.width=100*t/d+'%';
 };
 sk.onpointerdown=e=>{
  if(e.button>0||!dur())return;
  scrub=true;sf=fracOf(e);pl.classList.add('scrub');
  try{sk.setPointerCapture(e.pointerId)}catch{}
  const p=Q('#pg');if(p)p.style.width=sf*100+'%';tip(sf);pl.wake();
 };
 sk.onpointermove=e=>{
  const f=fracOf(e);tip(f);
  if(scrub){sf=f;const p=Q('#pg');if(p)p.style.width=f*100+'%';pl.wake()}
 };
 const endScrub=()=>{if(!scrub)return;scrub=false;pl.classList.remove('scrub');seekTo(sf*dur())};
 sk.onpointerup=endScrub;
 sk.onpointercancel=()=>{scrub=false;pl.classList.remove('scrub');tick()};
 sk.addEventListener('lostpointercapture',()=>{if(scrub)endScrub()});

 /* ---------- hooks the engine calls ---------- */
 const sync=()=>{const v=VID();if(!v)return;const b=Q('#pp');if(b)b.innerHTML=stIcon(v);pl.wake()};
 KPlay.hooks={
  state:sync,time:()=>{tick();drawCue()},
  vol:()=>{const v=VID();if(!v)return;const b=Q('#vb');if(b)b.innerHTML=volIc(v);const r=Q('#vs');if(r)r.value=v.muted?0:v.volume},
  playing:()=>{
   sync();pl.classList.remove('buf');styleCue();
   if(nx)setTimeout(()=>{if(live())entryFor(type,id,nx.id,meta)},8000);
  },
  muted:()=>{if(Q('#kun'))return;pl.insertAdjacentHTML('beforeend','<button id="kun" class="btn p">'+ic('mute')+' Tap to unmute</button>');Q('#kun').onclick=()=>{const v=VID();if(v)v.muted=false;Q('#kun').remove()};setTimeout(()=>{const b=Q('#kun');if(b)b.remove()},9000)},
  tap:()=>{const l=Q('#ld');if(l){l.classList.add('on');const t=Q('#lt');if(t)t.innerHTML='<button id="ktap" class="btn p">'+ic('play')+' Tap to play</button>';const b=Q('#ktap');if(b)b.onclick=e=>{e.stopPropagation();const v=VID();if(v)v.play().catch(()=>{});l.classList.remove('on')}}}
 };

 /* ---------- controls ---------- */
 const tog=()=>{const v=VID();v&&(v.paused?v.play().catch(()=>{}):v.pause())};
 const fsOn=()=>D.fullscreenElement||D.webkitFullscreenElement;
 const fs=()=>{
  if(window.kinoraWin&&kinoraWin.act){try{kinoraWin.act('full')}catch{}return}
  fsOn()?(D.exitFullscreen||D.webkitExitFullscreen).call(D):(D.documentElement.requestFullscreen||D.documentElement.webkitRequestFullscreen||(()=>{})).call(D.documentElement);
 };
 const jump=d=>{const v=VID();if(!v)return;const base=pend!=null?pend:v.currentTime;seekTo(base+d)};
 Q('#pp').onclick=tog;Q('#fs').onclick=fs;
 Q('#kb10').onclick=()=>jump(-(CFG().skip||10));Q('#kf10').onclick=()=>jump(CFG().skip||10);
 Q('#tt').onclick=()=>{setCfg({rem:!CFG().rem});tick()};
 Q('#vb').onclick=()=>{const v=VID();if(v)v.muted=!v.muted};
 Q('#vs').oninput=e=>{const v=VID();if(v){v.volume=+e.target.value;v.muted=false}};
 let ct=0;
 Q('#vw').addEventListener('click',e=>{
  if(e.target.tagName!=='VIDEO'||(e.pointerType&&e.pointerType!=='mouse'))return;
  hidePop();
  clearTimeout(ct);ct=setTimeout(tog,230);
 });
 Q('#vw').addEventListener('dblclick',e=>{clearTimeout(ct);const x=e.clientX/innerWidth;if(x>.4&&x<.6)fs()});
 /* arrows jump once per key press burst, J and L skip too */
 kkh=e=>{
  if(!live()||(e.target&&e.target.matches&&e.target.matches('input:not(#vs),textarea')))return;
  const k=e.key,s=CFG().skip||10;
  if(k==='ArrowRight'||k==='l'||k==='L'){e.preventDefault();e.stopImmediatePropagation();jump(s);pl.wake()}
  else if(k==='ArrowLeft'||k==='j'||k==='J'){e.preventDefault();e.stopImmediatePropagation();jump(-s);pl.wake()}
 };
 D.addEventListener('keydown',kkh,true);

 Q('#kpk').onclick=e=>{e.stopPropagation();popOpen()?hidePop():showPop()};
 Q('#kpop').onclick=e=>{
  e.stopPropagation();
  const g=sel=>e.target.closest(sel),v=VID();
  const tb=g('[data-tab]');if(tb){popTab=tb.dataset.tab;renderPop();return}
  const l=g('[data-l]'),q=g('[data-q]'),a=g('[data-a]'),t=g('[data-t]'),r=g('[data-r]');
  if(l){choose(l.dataset.l,null);renderPop();return}
  if(q){choose(null,+q.dataset.q);renderPop();return}
  if(a){const A=audioList()[+a.dataset.a];if(A)A.set();setTimeout(renderPop,120);return}
  if(r&&v){v.playbackRate=+r.dataset.r;renderPop();return}
  if(t){pickSub(t.dataset.t);renderPop();return}
  const s=g('[data-sz],[data-col],[data-bg],[data-edge],[data-font],[data-bold],[data-pos],[data-dl],[data-reset]');
  if(s){
   const d=s.dataset,o={...SUBD,...LS.get('sub',{})};
   if(d.sz)updateSub({sz:+d.sz});else if(d.col)updateSub({col:d.col});else if(d.bg!=null)updateSub({bg:+d.bg});
   else if(d.edge)updateSub({edge:d.edge});else if(d.font)updateSub({font:d.font});else if(d.bold!=null)updateSub({bold:d.bold==='1'});
   else if(d.pos)updateSub({pos:+d.pos});else if(d.dl)updateSub({dl:Math.round(((+o.dl||0)+ +d.dl)*10)/10});
   else if(d.reset){LS.set('sub',{});try{applySub()}catch{}}
   styleCue();drawCue();renderPop();return;
  }
  if(g('[data-d]')&&don[0]){const u=don[0].raw.externalUrl||don[0].url;if(window.kinoraWin&&kinoraWin.openExternal)kinoraWin.openExternal(u);else open(u,'_blank','noopener')}
 };
 pl.onclick=e=>{if(!e.target.closest('#kpop,#kpk'))hidePop()};
 addEventListener('resize',styleCue);

 /* ---------- go ---------- */
 const addP=(raw,an,flag)=>{const p=parse(raw,an);if(!p)return null;p[flag]=true;extra.unshift(p);return p};
 if(pick){const p=addP({...pick},pick._a||'Source','pinned');if(p)p.playable=true}
 if(pref&&pref.url&&/^https?:\/\/(?!localhost|127\.)/i.test(pref.url))addP({url:pref.url,name:pref.name,title:pref.title,behaviorHints:pref.headers?{proxyHeaders:{request:pref.headers}}:undefined},'Shared by the host','shared');
 if(extra.length){const p=extra[0];st={lang:p.langs[0]||'',q:p.q};use(p)}
 E0.subs.add(onBatch);
 const lt=Q('#lt');if(lt&&!started&&!E0.S.length)lt.textContent='Finding sources\u2026';
 styleCue();
 onBatch();
};

/* Play goes straight to the player (there is no source chooser any more) */
playTitle=function(m,type,id,vid){PICK=null;if(window.KEmbed&&KEmbed.should(type)){KEmbed.open(type,id,vid,m);return}location.hash=watchUrl(type,id,vid)};

/* hardware back / Escape closes the popup first */
{const b0=window.__kBack;window.__kBack=function(){const o=Q('#kpop.on');if(o){o.classList.remove('on');const b=Q('#kpk');if(b)b.classList.remove('on');return 1}return b0?b0():0}}

/* ================= details page: look up streams early, icon buttons ================= */
async function prefetchTitle(){
 const m=/^#\/title\/(movie|series)\/([^/?]+)/.exec(location.hash);if(!m)return;
 const type=m[1],id=decodeURIComponent(m[2]),a=addons.find(x=>has(x,'meta',type,id));if(!a)return;
 const meta=((await call(a,'meta',type,id).catch(()=>({}))).meta)||{};
 if(!/^#\/title\//.test(location.hash))return;
 let vid='';
 if(type==='series'){
  const vs=(meta.videos||[]).filter(v=>v.season>0).sort((x,y)=>x.season-y.season||x.episode-y.episode);
  const pr=Object.values(LS.get('prog',{})).filter(p=>p&&p.id===id&&p.vid).sort((x,y)=>y.at-x.at)[0];
  vid=(pr&&vs.find(v=>v.id===pr.vid)?pr.vid:(vs.find(v=>!EW()[v.id])||vs[0]||{}).id)||'';
  if(!vid)return;
 }
 entryFor(type,id,vid,meta);
}
let pft=0;
const early=()=>{clearTimeout(pft);pft=setTimeout(()=>{prefetchTitle().catch(()=>{})},200)};
addEventListener('hashchange',early);early();
const LAB={'kt-lib':'My list','kt-wl':'Watch later','kt-wd':'Watched'};
new MutationObserver(()=>{
 Object.keys(LAB).forEach(k=>{const b=Q('#'+k);if(b&&!b.getAttribute('aria-label')){b.setAttribute('aria-label',LAB[k]);b.title=LAB[k]}});
}).observe(D.getElementById('app'),{childList:true,subtree:true});

/* a short stream report for when something will not play (kept for support, not shown in Settings) */
KPlay.report=()=>KPlay.last.map(p=>[p.addon,p.prov,qlab(p.q),p.langs.join('+')||'-',p.kind,p.playable?'':'(not playable)',p.hevc?'HEVC':'',p.size?p.size.toFixed(1)+'GB':'',host(p.url),String(p.raw.name||'').replace(/\s+/g,' ').slice(0,60),String(p.raw.title||p.raw.description||'').replace(/\s+/g,' ').slice(0,140)].filter(Boolean).join(' | ')).join('\n');
})();
