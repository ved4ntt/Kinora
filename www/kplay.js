/* Kinora player v2.2
   - Play opens the player straight away (no source chooser). Streams are ranked: the main source first, the rest are fallbacks.
   - Sources are looked up while you are still on the details page, so Play usually starts at once.
   - A dead or slow source is dropped after a few seconds (not 45) and the next one is tried automatically.
   - A small bar (a small popup on phones) lists the audio languages and the qualities found (4K down to 360p).
     Picking one switches the stream and keeps your place. A language that only exists at another quality shows it next to its name.
   - In the Android app the video is decoded by ExoPlayer (knative.js), in the Windows app mpv / VLC can take over, in the browser the web engine below plays it.
   - The engine fixes: blocked autoplay, missing play() handler, over-eager HLS recovery, a too-short watchdog, error/watchdog races,
     stalled HLS that never recovered, and `crossorigin` that made many hosts refuse to play. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const say=m=>{try{toast(m)}catch{}};
const WIN=/Electron/.test(navigator.userAgent);
const ANDROID=!!((window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())||window.KinoraNative);
const withT=(p,ms)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(Error('timeout')),ms))]);
const qlab=q=>q>=2160?'4K':q?q+'p':'Auto';
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return''}};

/* one-time settings: always auto-pick, and let every quality through (360p up to 4K) */
try{
 if(CFG().autoPlay===false)setCfg({autoPlay:true});
 if(!LS.get('kmig1',0)){setCfg({sMin:0,sMax:0});LS.set('kmig1',1)}
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
const main=()=>String(CFG().mainSrc||'HdHub');
const provRank=p=>p.prov===main()?0:1+(ORDER.indexOf(p.prov)<0?40:ORDER.indexOf(p.prov));
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
const rank=(p,sel,pref,bad)=>{
 const lm=sel.lang?(p.langs.includes(sel.lang)?0:p.langs.length?1:.5):0;
 const qd=sel.q?Math.abs(qIdx(p.q)-qIdx(sel.q))+(p.q>sel.q?.3:0):0;
 const ps=pref&&window.KSrc?-window.KSrc.score(p.raw,pref):0;
 return[bad&&bad.has(p.key)?1:0,ps,lm,qd,((CFG().hdr===true)===!!(p.hdr||p.dv))?0:1,(!HEVC_OK&&p.hevc&&!nativeOK())?1:0,provRank(p),webScore(p),p.q?0:1];
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
 clearTimeout(wd);clearTimeout(stallT);
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
 let dead=false;
 const fail=(why,kind)=>{if(dead||my!==seq)return;dead=true;clearTimeout(wd);clearTimeout(stallT);const x=vel;KPlay.fail&&KPlay.fail(why,x&&x.currentTime>5?x.currentTime:t0||0,s,kind)};
 if(!s.url||/^(magnet|torrent):/i.test(s.url)){setTimeout(()=>fail('This source is a torrent, which a player cannot open directly.'),0);return}
 /* Windows app: hand hard files to mpv or VLC when the user allows it */
 try{if(window.KExt&&KExt.handle&&KExt.handle(s,ctx,t0,why=>fail(why)))return}catch{}
 if(SRVOK()&&!s._srv&&s.behaviorHints&&s.behaviorHints.proxyHeaders&&!(window.KNative&&KNative.can(s)))return play(srvStream(s),ctx,t0);
 if(SRVOK()&&!s._srv&&WIN&&/hevc|x265|h\.?265|dts|truehd|e-?ac-?3|\bac3\b/i.test((s.name||'')+' '+(s.title||s.description||'')+' '+s.url))return play(srvStream(s),ctx,t0);

 const v=D.createElement('video');
 /* no crossorigin attribute: many hosts send no CORS headers and would refuse to play */
 v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.playsInline=true;v.preload='auto';v.autoplay=true;
 v.defaultPlaybackRate=v.playbackRate=CFG().speed||1;
 box.append(v);vel=v;
 let started=false;const deadline=Date.now()+150000;
 const arm=ms=>{clearTimeout(wd);wd=setTimeout(()=>{if(my===seq&&!started)fail('This source took too long to start.')},Math.max(4000,Math.min(ms,deadline-Date.now())))};
 /* a source with nothing to show for a few seconds is dropped when there is another to try; a lone source gets longer */
 const alts=(()=>{try{return KPlay.alts?KPlay.alts():0}catch{return 0}})();
 arm(s._srv?60000:alts>0?Math.max(9000,Math.min(14000,(window.KSpeed?KSpeed.limit(s):30000)*.35)):45000);

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
   manifestLoadingMaxRetry:2,manifestLoadingRetryDelay:700,levelLoadingMaxRetry:3,levelLoadingRetryDelay:700,fragLoadingMaxRetry:6,fragLoadingRetryDelay:700,fragLoadingMaxRetryTimeout:15000,nudgeMaxRetry:8});
  hl.on(Hls.Events.MANIFEST_PARSED,(_,d)=>{
   if(!started)arm(25000);
   if(want){let bi=-1,bd=1e9;d.levels.forEach((l,i)=>{const k=Math.abs((l.height||0)-want)+((l.height||0)>want?50:0);if(k<bd){bd=k;bi=i}});if(bi>=0){hl.startLevel=bi;hl.autoLevelCapping=bi}}
   tryPlay();
  });
  hl.on(Hls.Events.FRAG_LOADED,()=>{if(!started)arm(30000)});
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

 v.addEventListener('loadedmetadata',()=>{
  if(!started)arm(30000);
  if(!nat){
   const p=CFG().resume&&!window.START0?LS.get('prog',{})[key]:null,t=t0||(p&&p.t>30&&p.t<v.duration-60?p.t:0);
   if(t)try{v.currentTime=t}catch{}
  }
  window.START0=false;H('time');
 });
 v.addEventListener('loadeddata',()=>{if(!started)arm(30000);if(!tried){tried=true;tryPlay()}});
 v.addEventListener('canplay',()=>{if(!started)arm(25000);setBuf(false);if(v.paused&&v.autoplay&&!tried){tried=true;tryPlay()}});
 v.addEventListener('progress',()=>{
  H('time');
  if(!started&&v.buffered.length){arm(25000);setLt('Buffering\u2026')}
 });
 v.addEventListener('waiting',()=>{
  if(!started)return;
  setBuf(true);clearTimeout(stallT);stallT=setTimeout(stallRecover,5000);
 });
 v.addEventListener('stalled',()=>{if(started&&v.readyState<3){setBuf(true);clearTimeout(stallT);stallT=setTimeout(stallRecover,5000)}});
 v.addEventListener('seeking',()=>{if(started)setBuf(true)});
 v.addEventListener('seeked',()=>{if(v.readyState>=3)setBuf(false)});
 v.addEventListener('playing',()=>{
  const first=!started;started=true;clearTimeout(wd);clearTimeout(stallT);setBuf(false);
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
 tryPlay();
 try{addSubs(v,ctx)}catch{}
};
addEventListener('hashchange',()=>{if(!/^#\/watch\//.test(location.hash)){E.stop()}});

/* ================= the player screen ================= */
const stIcon=v=>ic(v&&!v.paused?'pause':'play');
V.watch=async function(type,id,vid){
 id=decodeURIComponent(id);vid=vid?decodeURIComponent(vid):'';
 if(type==='anime'&&window.KEmbed){app.innerHTML=LD;KEmbed.open(type,id,vid);return}
 const token=window.__kw={};
 const ma=addons.find(a=>has(a,'meta',type,id));
 const meta=ma?((await withT(call(ma,'meta',type,id),3000).catch(()=>({}))).meta||{}):{};
 if(window.__kw!==token)return;
 const vids=(meta.videos||[]).filter(v=>v.season>0).sort((x,y)=>x.season-y.season||x.episode-y.episode);
 const ep=vids.find(v=>v.id===vid),nx=ep?vids[vids.indexOf(ep)+1]:null,nm=meta.name?meta:{name:id};
 const ctx={type,id,vid,name:nm.name,poster:meta.poster,label:ep?'S'+ep.season+'E'+ep.episode:''};
 setAmb();
 const pick=PICK;PICK=null;
 const pref=window.KPREF&&window.KPREF.get?window.KPREF.get():null;window.KPREF=null;
 const title=h(ctx.name)+(ctx.label?' \u00b7 '+h(ctx.label):'')+(ep&&ep.title?' \u00b7 '+h(ep.title):'');
 app.innerHTML='<div id="pl" class="kp act" data-e="1" data-k9="1"><div id="vw"></div>'+
  '<div id="ld" class="on"><div class="lb" style="background-image:url(\''+h(meta.background||meta.poster||'')+'\')"></div><div class="lc">'+logoOrName(nm)+'<div class="lt" id="lt">Finding sources\u2026</div></div></div><div id="bfs"><i></i></div>'+
  '<div id="ov">'+logoOrName(nm)+'<div class="mt">'+mt(meta)+'</div><p>'+h((ep&&ep.overview)||meta.description||'')+'</p></div>'+
  '<div id="top"><a class="rb" href="#/title/'+type+'/'+encodeURIComponent(id)+'" aria-label="Back">'+ic('back')+'</a><b>'+title+'</b><div id="clk"><span id="ck1"></span><small id="ck2"></small></div></div>'+
  '<div id="kbar"></div>'+
  '<div id="ctl"><div id="sk"><i id="bf"></i><i id="pg"></i><b id="stp"></b></div><div class="kr"><div class="kl"><button class="kb" id="pp" aria-label="Play or pause">'+ic('play')+'</button><button class="kb kvol" id="vb" aria-label="Mute">'+ic('vol2')+'</button><input class="kvol" id="vs" type="range" min="0" max="1" step=".05" value="1" aria-label="Volume"><span id="tt">0:00 / 0:00</span></div>'+
  '<div class="krr">'+(nx?'<button class="kb" id="nx" aria-label="Next episode" title="Next episode">'+ic('next')+'</button>':'')+'<button class="kb" id="cc" aria-label="Subtitles and speed" title="Subtitles and speed">'+ic('cc')+'</button><button class="kq" id="kq" aria-label="Audio and quality"><span id="kqt">Auto</span></button><button class="kb" id="fs" aria-label="Fullscreen">'+ic('full')+'</button></div></div></div>'+
  '<div id="kmn"></div></div>';
 const pl=Q('#pl'),VID=()=>Q('#vw video');
 let it;
 pl.wake=()=>{pl.classList.add('act');pl.classList.remove('rest');clearTimeout(it);it=setTimeout(()=>{if(Q('#kmn.on')||Q('#kbar.on:hover'))return pl.wake();pl.classList.remove('act');const v=VID();if(v&&v.paused&&!pl.classList.contains('buf')&&!Q('#ld.on'))pl.classList.add('rest')},3000)};
 pl.onmousemove=pl.wake;pl.wake();

 /* ---------- streams ---------- */
 const E0=(pick&&pick._a==='Live TV')?{S:[],don:[],finished:true,subs:new Set()}:entryFor(type,id,vid,meta),extra=[],bad=new Set(),don=E0.don;
 let cur=null,st={lang:'',q:0},started=false,graceT=0,waiting=false;
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
 const order=sel=>playable().filter(okS).map(s=>({s,k:rank(s,sel,pref,null)})).sort((a,b)=>cmp(a.k,b.k)).map(x=>x.s);
 KPlay.alts=()=>order({lang:st.lang,q:st.q}).filter(x=>x!==cur).length;
 const defSel=()=>{
  const kp=LS.get('kpick',{}),pls=playable(),langs=langList(pls).map(x=>x.n);
  const lang=kp.lang&&langs.includes(kp.lang)?kp.lang:((CFG().prefLangs||[]).find(l=>langs.includes(l))||'');
  const pool0=lang?pls.filter(x=>x.langs.includes(lang)||!x.langs.length):pls;
  /* do not start on a codec this device cannot play when another choice exists */
  const okc=x=>HEVC_OK||nativeOK()||!x.hevc;
  const pool=pool0.filter(okc).length?pool0.filter(okc):pool0;
  const have=[...new Set(pool.map(x=>x.q).filter(Boolean))].sort((a,b)=>b-a);
  let q=kp.q&&have.includes(kp.q)?kp.q:0;
  if(!q){const pq=CFG().quality,cap=!pq||pq==='best'?(LS.get('maxq',2160)||2160):+pq;q=have.find(x=>x<=cap)||have[have.length-1]||0}
  return{lang,q};
 };

 /* ---------- the audio and quality bar ---------- */
 const setPill=()=>{
  const e=Q('#kqt');if(!e)return;
  e.textContent=[st.lang,qlab(st.q)].filter(Boolean).join(' \u00b7 ')+(cur&&cur.dv?' \u00b7 DV':cur&&cur.hdr?' \u00b7 HDR':'');
  const b=Q('#kq');if(b)b.title=cur?'Source: '+cur.prov:'';
 };
 const renderBar=()=>{
  const el=Q('#kbar');if(!el)return;
  const pls=playable();if(!pls.length){el.innerHTML='';return}
  const L=langList(pls),
   qs=[...new Set(pls.filter(x=>!st.lang||x.langs.includes(st.lang)||!x.langs.length).map(x=>x.q).filter(Boolean))].sort((a,b)=>b-a);
  const lc=L.map(({n})=>{
   const on=n===st.lang;let note='';
   if(!on&&st.q){const b=best(n,st.q);if(b&&b.q&&b.q!==st.q)note='<small>'+(b.q>st.q?'\u2191':'\u2193')+qlab(b.q)+'</small>'}
   return'<button class="kc'+(on?' on':'')+'" data-l="'+h(n)+'">'+h(n)+note+'</button>';
  }).join('');
  const qc=qs.map(q=>'<button class="kc'+(q===st.q?' on':'')+'" data-q="'+q+'">'+qlab(q)+'</button>').join('');
  const heart=don.length?'<button class="kc kheart" data-d aria-label="Support the add-on" title="Support the add-on">'+ic('heart')+'</button>':'';
  el.innerHTML='<div class="kbx">'+(L.length>1?'<div class="kbrow" data-r="a">'+lc+'<button class="kmore" data-m aria-label="More">'+ic('chev')+'</button></div>':'')+(qs.length>1||(qs.length&&L.length<2)?'<div class="kbrow" data-r="q">'+qc+'</div>':'')+'<div class="kbtl">'+heart+'<button class="kc kx" data-x aria-label="Close">'+ic('x')+'</button></div></div>';
 };
 const fitMore=()=>QA('#kbar .kbrow').forEach(r=>{const m=Q('.kmore',r);if(m)m.hidden=r.scrollWidth<=r.clientWidth+4});
 const showBar=ms=>{const el=Q('#kbar');if(!el)return;renderBar();if(!el.innerHTML)return;el.classList.add('on');fitMore();clearTimeout(showBar.t);if(ms)showBar.t=setTimeout(()=>{if(!el.matches(':hover'))el.classList.remove('on')},ms)};
 const hideBar=()=>{const el=Q('#kbar');if(el)el.classList.remove('on')};

 /* ---------- starting, switching and falling back ---------- */
 function use(p,t0){
  cur=p;st.q=p.q||st.q;st.lang=st.lang&&p.langs.includes(st.lang)?st.lang:(p.langs[0]||'');
  started=true;setPill();renderBar();
  play({...p.raw,_q:p.q,_kk:p.key},ctx,t0||0);
 }
 function start(){
  if(started)return;
  const sel=defSel(),n=order(sel)[0];if(!n)return;
  st={lang:sel.lang,q:sel.q};use(n);
 }
 function onBatch(){
  if(!live())return E0.subs.delete(onBatch);
  renderBar();
  if(waiting){
   const n=order({lang:st.lang,q:st.q})[0];
   if(n){waiting=false;use(n,curTime())}else if(E0.finished){waiting=false;showFail('No other source could play this title.')}
   return;
  }
  if(started)return;
  const pls=playable();
  if(!pls.length){if(E0.finished)showFail(E0.S.length?'These sources only offer torrents, which cannot be played here.':'No source returned a stream for this title.');return}
  if(pls.some(x=>x.prov===main())||E0.finished)start();
  else if(!graceT)graceT=setTimeout(()=>{if(live()&&!started)start()},1200);
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

 /* ---------- hooks the engine calls ---------- */
 const sync=()=>{const v=VID();if(!v)return;const b=Q('#pp');if(b)b.innerHTML=stIcon(v);pl.wake()};
 const tick=()=>{
  const v=VID(),d=v&&v.duration||0,p=Q('#pg');if(!v||!p)return;
  p.style.width=(d?100*v.currentTime/d:0)+'%';
  const t=Q('#tt');if(t)t.textContent=CFG().rem&&d?'-'+ft(d-v.currentTime)+' / '+ft(d):ft(v.currentTime)+' / '+ft(d);
  try{const b=Q('#bf');if(b)b.style.width=d&&v.buffered.length?100*v.buffered.end(v.buffered.length-1)/d+'%':'0'}catch{}
 };
 KPlay.hooks={
  state:sync,time:tick,
  vol:()=>{const v=VID();if(!v)return;const b=Q('#vb');if(b)b.innerHTML=volIc(v);const r=Q('#vs');if(r)r.value=v.muted?0:v.volume},
  playing:()=>{
   sync();pl.classList.remove('buf');
   if(!pl.dataset.shown){pl.dataset.shown=1;showBar(5000)}
   if(nx)setTimeout(()=>{if(live())entryFor(type,id,nx.id,meta)},8000);
  },
  muted:()=>{if(Q('#kun'))return;pl.insertAdjacentHTML('beforeend','<button id="kun" class="btn p">'+ic('mute')+' Tap to unmute</button>');Q('#kun').onclick=()=>{const v=VID();if(v)v.muted=false;Q('#kun').remove()};setTimeout(()=>{const b=Q('#kun');if(b)b.remove()},9000)},
  tap:()=>{const l=Q('#ld');if(l){l.classList.add('on');const t=Q('#lt');if(t)t.innerHTML='<button id="ktap" class="btn p">'+ic('play')+' Tap to play</button>';const b=Q('#ktap');if(b)b.onclick=e=>{e.stopPropagation();const v=VID();if(v)v.play().catch(()=>{});l.classList.remove('on')}}}
 };

 /* ---------- controls ---------- */
 const tog=()=>{const v=VID();v&&(v.paused?v.play().catch(()=>{}):v.pause())};
 const fsOn=()=>D.fullscreenElement||D.webkitFullscreenElement;
 const fs=()=>fsOn()?(D.exitFullscreen||D.webkitExitFullscreen).call(D):(D.documentElement.requestFullscreen||D.documentElement.webkitRequestFullscreen||(()=>{})).call(D.documentElement);
 Q('#pp').onclick=tog;Q('#fs').onclick=fs;
 Q('#tt').onclick=()=>{setCfg({rem:!CFG().rem});tick()};
 Q('#vb').onclick=()=>{const v=VID();if(v)v.muted=!v.muted};
 Q('#vs').oninput=e=>{const v=VID();if(v){v.volume=+e.target.value;v.muted=false}};
 if(nx)Q('#nx').onclick=()=>{location.hash=watchUrl(type,id,nx.id)};
 let ct=0;
 Q('#vw').addEventListener('click',e=>{
  if(e.target.tagName!=='VIDEO'||(e.pointerType&&e.pointerType!=='mouse'))return;
  hideBar();Q('#kmn').classList.remove('on');
  clearTimeout(ct);ct=setTimeout(tog,230);
 });
 Q('#vw').addEventListener('dblclick',e=>{clearTimeout(ct);const x=e.clientX/innerWidth;if(x>.4&&x<.6)fs()});
 const sk=Q('#sk'),seek=e=>{const v=VID();if(!v||!v.duration)return;const r=sk.getBoundingClientRect();v.currentTime=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width))*v.duration};
 sk.onpointerdown=e=>{sk.setPointerCapture(e.pointerId);seek(e);sk.onpointermove=seek};
 sk.onpointerup=sk.onpointercancel=()=>{sk.onpointermove=null};
 sk.addEventListener('pointermove',e=>{const v=VID();if(!v||!v.duration)return;const r=sk.getBoundingClientRect(),f=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),t=Q('#stp');t.style.left=f*100+'%';t.textContent=ft(f*v.duration)});
 Q('#kq').onclick=e=>{e.stopPropagation();const b=Q('#kbar');if(b.classList.contains('on'))hideBar();else{Q('#kmn').classList.remove('on');showBar(0)}};
 Q('#kbar').onclick=e=>{
  e.stopPropagation();
  const l=e.target.closest('[data-l]'),q=e.target.closest('[data-q]'),m=e.target.closest('[data-m]'),x=e.target.closest('[data-x]'),d=e.target.closest('[data-d]');
  if(l)choose(l.dataset.l,null);else if(q)choose(null,+q.dataset.q);
  else if(m){const r=m.parentNode;r.scrollBy({left:r.clientWidth*.7,behavior:'smooth'})}
  else if(x)hideBar();
  else if(d&&don[0]){const u=don[0].raw.externalUrl||don[0].url;if(window.kinoraWin&&kinoraWin.openExternal)kinoraWin.openExternal(u);else open(u,'_blank','noopener')}
 };
 pl.onclick=e=>{if(!e.target.closest('#kmn,#ctl,#top,#kbar'))Q('#kmn').classList.remove('on')};

 /* subtitles, audio tracks inside the file, and speed */
 const menu=()=>{
  const mn=Q('#kmn'),v=VID();
  if(mn.classList.contains('on')){mn.classList.remove('on');return}
  hideBar();
  const T=v?[...v.textTracks]:[],o={...SUBD,...LS.get('sub',{})},rate=v?v.playbackRate:1,A=v&&v.kAudio?v.kAudio():[];
  mn.innerHTML='<h4>Subtitles</h4><button class="kmi'+(T.every(t=>t.mode!=='showing')?' on':'')+'" data-t="-1">Off</button>'+T.map((t,i)=>'<button class="kmi'+(t.mode==='showing'?' on':'')+'" data-t="'+i+'">'+h(t.label)+'</button>').join('')+(T.length?'':'<p class="kn">No subtitles from your add-ons yet.</p>')+
   (A.length>1?'<h4>Audio track</h4>'+A.map((a,i)=>'<button class="kmi'+(a.on?' on':'')+'" data-a="'+i+'">'+h(a.n)+'</button>').join(''):'')+
   '<h4>Subtitle size</h4><div class="kch">'+[['S',70],['M',100],['L',140],['XL',190]].map(([n,z])=>'<button class="kc'+(Math.abs((o.sz||100)-z)<18?' on':'')+'" data-z="'+z+'">'+n+'</button>').join('')+'</div>'+
   '<h4>HDR</h4><div class="kch"><button class="kc'+(CFG().hdr===true?' on':'')+'" data-h="1">On</button><button class="kc'+(CFG().hdr===true?'':' on')+'" data-h="0">Off</button></div>'+
   '<h4>Speed</h4><div class="kch">'+[.5,.75,1,1.25,1.5,2].map(r=>'<button class="kc'+(rate===r?' on':'')+'" data-r="'+r+'">'+r+'\u00d7</button>').join('')+'</div>'+
   (ANDROID&&cur&&cur.url?'<button class="kmi" data-ext>Open in a player app</button>':'');
  mn.classList.add('on');
 };
 Q('#cc').onclick=e=>{e.stopPropagation();menu()};
 Q('#kmn').onclick=e=>{
  e.stopPropagation();const b=e.target.closest('button'),v=VID();if(!b)return;
  if(b.dataset.t!=null&&v){[...v.textTracks].forEach((t,i)=>t.mode=i===+b.dataset.t?'showing':'hidden');QA('[data-t]',Q('#kmn')).forEach(x=>x.classList.toggle('on',x===b))}
  if(b.dataset.a!=null&&v&&v.kAudioSet){v.kAudioSet(+b.dataset.a);QA('[data-a]',Q('#kmn')).forEach(x=>x.classList.toggle('on',x===b))}
  if(b.dataset.z)try{updateSub({sz:+b.dataset.z});QA('[data-z]',Q('#kmn')).forEach(x=>x.classList.toggle('on',x===b))}catch{}
  if(b.dataset.h!=null){setCfg({hdr:b.dataset.h==='1'});QA('[data-h]',Q('#kmn')).forEach(x=>x.classList.toggle('on',x===b));choose(null,st.q)}
  if(b.dataset.r&&v){v.playbackRate=+b.dataset.r;QA('[data-r]',Q('#kmn')).forEach(x=>x.classList.toggle('on',x===b))}
  if(b.hasAttribute('data-ext'))openExternal(cur);
 };

 /* ---------- go ---------- */
 const addP=(raw,an,flag)=>{const p=parse(raw,an);if(!p)return null;p[flag]=true;extra.unshift(p);return p};
 if(pick){const p=addP({...pick},pick._a||'Source','pinned');if(p)p.playable=true}
 if(pref&&pref.url&&/^https?:\/\/(?!localhost|127\.)/i.test(pref.url))addP({url:pref.url,name:pref.name,title:pref.title,behaviorHints:pref.headers?{proxyHeaders:{request:pref.headers}}:undefined},'Shared by the host','shared');
 if(extra.length){const p=extra[0];st={lang:p.langs[0]||'',q:p.q};use(p)}
 E0.subs.add(onBatch);
 const lt=Q('#lt');if(lt&&!started&&!E0.S.length)lt.textContent='Finding sources\u2026';
 onBatch();
};

/* Play goes straight to the player (there is no source chooser any more) */
playTitle=function(m,type,id,vid){PICK=null;if(window.KEmbed&&KEmbed.should(type)){KEmbed.open(type,id,vid,m);return}location.hash=watchUrl(type,id,vid)};

/* hardware back / Escape closes the bar and menu first */
{const b0=window.__kBack;window.__kBack=function(){const o=Q('#kmn.on,#kbar.on');if(o){o.classList.remove('on');return 1}return b0?b0():0}}

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
const early=()=>{clearTimeout(pft);pft=setTimeout(()=>{prefetchTitle().catch(()=>{})},350)};
addEventListener('hashchange',early);early();
const LAB={'kt-lib':'My list','kt-wl':'Watch later','kt-wd':'Watched'};
new MutationObserver(()=>{
 Object.keys(LAB).forEach(k=>{const b=Q('#'+k);if(b&&!b.getAttribute('aria-label')){b.setAttribute('aria-label',LAB[k]);b.title=LAB[k]}});
}).observe(D.getElementById('app'),{childList:true,subtree:true});

/* ================= settings: main source and a stream report ================= */
KPlay.report=()=>KPlay.last.map(p=>[p.addon,p.prov,qlab(p.q),p.langs.join('+')||'-',p.kind,p.playable?'':'(not playable)',p.hevc?'HEVC':'',p.size?p.size.toFixed(1)+'GB':'',host(p.url),String(p.raw.name||'').replace(/\s+/g,' ').slice(0,60),String(p.raw.title||p.raw.description||'').replace(/\s+/g,' ').slice(0,140)].filter(Boolean).join(' | ')).join('\n');
if(window.K6&&K6.PAGES.play){
 const pp=K6.PAGES.play;
 K6.PAGES.play=()=>{
  pp();const p=Q('.k6');if(!p)return;
  const m=main();
  p.insertAdjacentHTML('beforeend','<h4 class="k6h">Main source</h4><div class="k6c"><div class="k6o col"><span><b>Play from</b><small>Kinora tries this source first and uses the others as fallbacks.</small></span><div class="k6ch wrap">'+['HdHub','4KHDHub','HDHub4u','MoviesDrives','VegaMovies','MovieBox'].map(x=>'<button class="ch'+(x===m?' on':'')+'" data-ksrc="'+x+'">'+x+'</button>').join('')+'</div></div><div class="k6o"><span><b>Stream report</b><small>Copies the sources found for the last title you opened. Paste it when something will not play.</small></span><button class="btn" id="krep">Copy</button></div></div>');
 };
}
D.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('[data-ksrc]');
 if(b){setCfg({mainSrc:b.dataset.ksrc});QA('[data-ksrc]').forEach(x=>x.classList.toggle('on',x===b));return}
 if(e.target.closest&&e.target.closest('#krep')){const t=KPlay.report();if(!t)return say('Open a title and press play first');navigator.clipboard.writeText(t).then(()=>say('Stream report copied')).catch(()=>say('Could not copy'))}
});
})();
