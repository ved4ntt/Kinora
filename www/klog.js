/* Kinora Playback Lab (test mode)
   Turn it on in Settings > Playback > Playback lab. Then play any movie or episode as normal:
   Kinora tries EVERY playable source of that title one after another, 30 seconds each, and records for each one
   how long it took to start, every buffering stop, the real picture size, codec, bitrate, file size, dropped frames,
   how fast a jump (seek) recovers, and why a source failed. Windows and Android write their own separate logs.
   Size matters as much as resolution: every source gets a "bits per pixel" grade, so a 4K file that is squeezed
   too hard (starved) is marked as such. Export puts a .json (everything) and a .txt (readable report) in Downloads/Kinora-Logs. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const WIN=/Electron/.test(navigator.userAgent);
const AND=!!(window.KinoraNative||(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()));
const PLAT=WIN?'windows':AND?'android':'web';
const KEY='klab_log',ONK='klab_on',WINDOW_S=30,SEEK_AT=22,START_MAX=45000;
const WATCH=/^#\/watch\/(movie|series)\/([^/?]+)(?:\/([^/?]+))?/;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const say=m=>{try{toast(m)}catch{}};
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return''}};
const clean=(s,n)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
const r1=x=>x==null||!isFinite(x)?null:Math.round(x*10)/10,r2=x=>x==null||!isFinite(x)?null:Math.round(x*100)/100;
const med=a=>{a=a.filter(x=>x!=null&&isFinite(x)).sort((x,y)=>x-y);return a.length?a[a.length>>1]:null};
const qlab=q=>q>=2160?'4K':q?q+'p':'?';
const pd=(s,n)=>String(s==null?'':s).slice(0,n).padEnd(n);
const bufEnd=v=>{try{const b=v&&v.buffered;return b&&b.length?b.end(b.length-1):0}catch{return 0}};
const until=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<ms){const x=fn();if(x)return x;await sleep(150)}return null};
const aq=(w,h)=>!w||!h?0:(w>=3000||h>=1900)?2160:(w>=2400||h>=1300)?1440:(w>=1700||h>=1000)?1080:(w>=1100||h>=680)?720:(w>=700||h>=460)?480:360;
const DIM={2160:[3840,2160],1440:[2560,1440],1080:[1920,1080],720:[1280,720],480:[854,480],360:[640,360]};

/* ================= the log ================= */
const device=()=>{const c=navigator.connection||{};return{ua:navigator.userAgent,cores:navigator.hardwareConcurrency||0,mem:navigator.deviceMemory||0,screen:[screen.width,screen.height,+(devicePixelRatio||1).toFixed(2)],net:{type:c.effectiveType||'',down:c.downlink||0,rtt:c.rtt||0},hevcOK:typeof HEVC_OK!=='undefined'?!!HEVC_OK:null,server:(()=>{try{return SRVOK()}catch{return false}})()}};
const blank=()=>({v:1,id:'lab-'+Date.now(),platform:PLAT,started:new Date().toISOString(),app:'',device:device(),titles:[]});
let LOG=LS.get(KEY,null);
if(!LOG||!Array.isArray(LOG.titles)||LOG.platform!==PLAT)LOG=blank();
try{if(AND&&window.KinoraNative&&KinoraNative.version)LOG.app=KinoraNative.version();else if(WIN&&window.kinoraWin&&kinoraWin.upd)kinoraWin.upd.version().then(v=>{LOG.app=v}).catch(()=>{})}catch{}
const save=()=>{try{LS.set(KEY,LOG)}catch{try{LOG.titles.forEach(t=>t.attempts.forEach(a=>{delete a.samples}));LS.set(KEY,LOG)}catch{}}};
const on=()=>!!LS.get(ONK,false);
const setOn=v=>{LS.set(ONK,!!v);renderHud()};

/* ================= measuring helpers ================= */
async function baseline(){
 const t=performance.now();
 try{
  const ac=new AbortController(),to=setTimeout(()=>ac.abort(),9000);
  const r=await fetch('https://speed.cloudflare.com/__down?bytes=6000000',{cache:'no-store',signal:ac.signal});
  const b=await r.arrayBuffer();clearTimeout(to);
  return{mbps:r1(b.byteLength*8/((performance.now()-t)/1000)/1e6),ms:Math.round(performance.now()-t)};
 }catch{return{mbps:null}}
}
/* Windows: what the player would see, asked through the same proxy */
async function probeWin(s){
 const t=performance.now(),u=s.url,hd=s.behaviorHints&&s.behaviorHints.proxyHeaders&&s.behaviorHints.proxyHeaders.request;
 try{
  let url=u;
  if(SRVOK()){const c=srvCfg();url=c.url.replace(/\/$/,'')+'/proxy?k='+encodeURIComponent(c.key)+'&u='+encodeURIComponent(u)+(hd?'&h='+encodeURIComponent(btoa(JSON.stringify(hd))):'')+(/\.m3u8(\?|$)/i.test(u)?'&x=.m3u8':'')}
  const ac=new AbortController(),to=setTimeout(()=>ac.abort(),6000);
  const r=await fetch(url,{headers:{Range:'bytes=0-2047'},signal:ac.signal});
  const ttfb=Math.round(performance.now()-t);
  const rd=r.body&&r.body.getReader?r.body.getReader():null;if(rd)await rd.read();
  const ms=Math.round(performance.now()-t);clearTimeout(to);try{ac.abort()}catch{}
  const cr=/\/(\d+)$/.exec(r.headers.get('content-range')||''),cl=+(r.headers.get('content-length')||0),type=(r.headers.get('content-type')||'').toLowerCase();
  return{ok:r.status>=200&&r.status<300&&!/html|json|text\/plain/.test(type),code:r.status,ms,ttfb,range:r.status===206,size:cr?+cr[1]:(r.status===200?cl:0),type};
 }catch(e){return{ok:false,code:0,ms:Math.round(performance.now()-t),err:String(e).slice(0,80)}}
}
const probe=async s=>{
 try{
  if(window.KProbe&&KProbe.on())return await KProbe.test(s,5000);
  if(WIN||PLAT==='web')return await probeWin(s);
 }catch{}
 return null;
};

/* bits per pixel decides if a file is squeezed too hard for its resolution */
function grade(r){
 const dim=r.res&&r.res.w&&r.res.h?[r.res.w,r.res.h]:DIM[r.q];
 if(!dim||!r.vidMbps)return'';
 const hevc=/hevc|hvc|hev1|av01|av1|h265/i.test(String(r.vcodec||''))||r.hevc;
 const g=hevc?.06:.10;
 const bpp=r.vidMbps*1e6/(dim[0]*dim[1]*(r.fps>0?r.fps:24));
 r.bpp=Math.round(bpp*1000)/1000;
 return bpp>=g*1.8?'high':bpp>=g?'good':bpp>=g*.58?'lean':'starved';
}
function analyze(r){
 r.aq=aq(r.res&&r.res.w,r.res&&r.res.h);
 const sz=r.probe&&r.probe.size>1e6?r.probe.size/1e9:r.labelGB;
 r.sizeGB=sz?r2(sz):null;r.sizeSrc=r.probe&&r.probe.size>1e6?'server':r.labelGB?'label':'';
 if(r.sizeGB&&r.durS>60){r.avgMbps=r2(r.sizeGB*8000/r.durS);r.gbHr=r2(r.sizeGB/(r.durS/3600))}
 r.vidMbps=r.avgMbps?Math.max(.1,r.avgMbps-(r.abr||.35)):(r.vbrDecl||(r.hls&&r.hls.mbps)||null);
 r.grade=grade(r);
 const F=[],q=r.aq||r.q;
 if(r.status!=='ok'){F.push(r.status==='timeout'?'NO_START':'FAILED')}
 else{
  if(r.ttffMs>15000)F.push('VERY_SLOW_START');else if(r.ttffMs>8000)F.push('SLOW_START');
  if(r.stallN>=2||r.stallMs>3000)F.push('STALLS');
  if(r.expectS>8&&r.playedS<r.expectS*.85)F.push('CHOPPY');
  if(r.drop&&r.drop.n>60&&r.drop.d/r.drop.n>.05)F.push('DROPPED_FRAMES');
  if(r.seekState==='fail')F.push('SEEK_FAIL');else if(r.seekMs>6000)F.push('SEEK_SLOW');
 }
 if(r.grade==='starved')F.push(q>=2160?'STARVED_4K':q>=1080?'STARVED_1080':'STARVED');
 if(r.aq&&r.q&&r.aq<r.q)F.push('FAKE_RES');
 if(r.probe&&r.probe.range===false)F.push('NO_RANGE');
 if(r.hevc&&r.device_hevc===false)F.push('HEVC_UNSUPPORTED');
 r.flags=F;
 const bad=['STALLS','CHOPPY','VERY_SLOW_START','DROPPED_FRAMES','SEEK_FAIL','STARVED_4K','STARVED_1080','STARVED','FAKE_RES'];
 r.verdict=r.status!=='ok'?'dead':F.some(x=>bad.includes(x))?'poor':(F.includes('SLOW_START')||F.includes('SEEK_SLOW')||r.grade==='lean')?'ok':'good';
}
function harvest(r,v){
 try{
  if(v){
   r.res={w:v.videoWidth||0,h:v.videoHeight||0};
   const raw=v.kStat&&v.kStat();
   if(raw){
    r.engine=(()=>{try{return KinoraPlayer.engine()}catch{return'exo'}})();r.route='native';
    if(raw.vf){r.res={w:raw.vf.w,h:raw.vf.h};r.vcodec=raw.vf.codecs||raw.vf.mime;r.vbrDecl=raw.vf.br>0?r2(raw.vf.br/1e6):null;r.fps=raw.vf.fps>0?r1(raw.vf.fps):null}
    if(raw.af){r.acodec=raw.af.mime;r.ach=raw.af.ch;r.abr=raw.af.br>0?r2(raw.af.br/1e6):null}
    if(raw.dr!=null)r.drop={d:raw.dr,n:(raw.rn||0)+raw.dr};
   }else{
    r.engine='web';
    const q=v.getVideoPlaybackQuality&&v.getVideoPlaybackQuality();if(q)r.drop={d:q.droppedVideoFrames,n:q.totalVideoFrames};
    const src=v.currentSrc||v.src||'';r.route=/\/hls\/|stream\.m3u8/.test(src)?'convert':/\/proxy\?/.test(src)?'proxy':'direct';
   }
  }
  if(typeof HL!=='undefined'&&HL&&HL.levels&&HL.levels.length){
   const L=HL.levels,c=L[HL.currentLevel>=0?HL.currentLevel:HL.loadLevel]||null;
   r.hls={levels:L.length,top:Math.max(...L.map(x=>x.height||0)),h:c?c.height:0,mbps:c?r2(c.bitrate/1e6):null,est:HL.bandwidthEstimate?r2(HL.bandwidthEstimate/1e6):null};
  }
 }catch{}
}

/* ================= hooks into the player ================= */
const KP=window.KPlay;
let running=false,sweeping=false,abort=false,skipSrc=false,skipTitle=false,cur=null,retest=false;
let origFail=KP.fail,origAlts=KP.alts,origMore=window.KEngineMore;
/* while testing, a failing source must not make the player jump to another one by itself, and slow sources get a full chance to start */
Object.defineProperty(KP,'fail',{configurable:true,get(){return cur?(why,t,s,kind)=>cur.fail(why,kind):origFail},set(f){origFail=f}});
Object.defineProperty(KP,'alts',{configurable:true,get(){return sweeping?()=>0:origAlts},set(f){origAlts=f}});
Object.defineProperty(window,'KEngineMore',{configurable:true,get(){return sweeping?()=>false:origMore},set(f){origMore=f}});

/* ================= one source, 30 seconds ================= */
function attempt(p,ctx,idx,total){
 return new Promise(resolve=>{
  const s={...p.raw,_q:p.q,_kk:p.key};
  const r={n:idx,prov:p.prov,addon:p.addon,host:host(p.url),name:clean(p.raw.name,90),desc:clean(p.raw.title||p.raw.description,170),q:p.q,langs:p.langs,kind:p.kind,hevc:p.hevc?1:0,dv:p.dv?1:0,hdr:p.hdr?1:0,exotic:p.exotic?1:0,labelGB:p.size?r2(p.size):null,status:'',why:'',device_hevc:typeof HEVC_OK!=='undefined'?!!HEVC_OK:null};
  let v=null,started=false,done=false,t0=0,firstAt=0,posStart=0,posSeek=null,elSeek=0,stallAt=0,stallPos=0,seekPhase=false,seekState='',seekAt=0,seekTo=0,n=0,mo=null,iv=0;
  const stalls=[],samples=[];
  hud.src=idx;hud.total=total;hud.prov=p.prov;hud.q=p.q;hud.lang=p.langs[0]||'';hud.state='Checking…';renderHud();
  const closeStall=()=>{if(stallAt){stalls.push(Math.round(performance.now()-stallAt));stallAt=0}};
  const finish=(st,why,kind)=>{
   if(done)return;done=true;clearInterval(iv);try{mo&&mo.disconnect()}catch{}
   cur=null;const now=performance.now();closeStall();
   r.status=st;r.why=why||'';if(kind)r.failKind=kind;
   r.windowS=started?r1(Math.min(WINDOW_S+12,(now-firstAt)/1000)):0;
   r.stallN=stalls.length;r.stallMs=stalls.reduce((a,b)=>a+b,0);r.stallMax=stalls.length?Math.max(...stalls):0;
   if(started){
    const endPos=posSeek!=null?posSeek:(v?v.currentTime:0),exp=posSeek!=null?elSeek:r.windowS;
    r.playedS=r1(endPos-posStart);r.expectS=r1(exp);
    const sl=samples.length?samples[samples.length-1]:null;if(sl)r.aheadS=sl[2];
    if(r.bufGain==null&&v)r.bufGain=r1(bufEnd(v)-(r._b0||0));
   }
   if(seekState){r.seekState=seekState}
   delete r._b0;
   harvest(r,v);
   r.durS=ctx.rt||(v&&isFinite(v.duration)?Math.round(v.duration):0)||0;
   analyze(r);r.samples=samples;resolve(r);
  };
  const bind=x=>{
   if(!x||x._klab)return;x._klab=1;v=x;
   x.addEventListener('loadedmetadata',()=>{if(r.metaMs==null)r.metaMs=Math.round(performance.now()-t0)});
   x.addEventListener('playing',()=>{
    if(!started){started=true;firstAt=performance.now();r.ttffMs=Math.round(firstAt-t0);posStart=x.currentTime;r._b0=bufEnd(x)}
    else if(stallAt&&!seekPhase)closeStall();
   });
   const w=()=>{if(started&&!stallAt&&!seekPhase&&!done&&!x.seeking&&!x.paused){stallAt=performance.now();stallPos=x.currentTime}};
   x.addEventListener('waiting',w);x.addEventListener('stalled',()=>{if(x.readyState<3)w()});
  };
  const tick=()=>{
   if(done)return;
   const x=Q('#vw video');if(x&&x!==v)bind(x);
   const now=performance.now();
   if(skipSrc){skipSrc=false;return finish('skipped','Skipped by you')}
   if(abort)return finish('skipped','Stopped');
   if(!started){
    hud.state='Starting… '+Math.round((now-t0)/1000)+'s';renderHud();
    if(now-t0>START_MAX)return finish('timeout','No picture after '+START_MAX/1000+' s');
    if(v&&v.readyState>=3&&v.paused&&now-t0>4000){try{v.muted=true;v.play()}catch{}}
    return;
   }
   const el=(now-firstAt)/1000,pos=v?v.currentTime:0;
   if(n++%2===0)samples.push([r1(el),r1(pos),r1(bufEnd(v)-pos),v?v.readyState:0]);
   if(stallAt&&!seekPhase&&v&&v.readyState>=3&&pos>stallPos+.15)closeStall();
   hud.state=(stallAt?'Buffering… ':'Playing ')+Math.round(Math.min(el,WINDOW_S))+'/'+WINDOW_S+'s'+(seekPhase?' · jump test':'');renderHud();
   if(!seekState&&el>=SEEK_AT){
    const d=ctx.rt||(v&&isFinite(v.duration)?v.duration:0);
    if(d>180&&v){closeStall();posSeek=v.currentTime;elSeek=r1(el);seekTo=Math.floor(d*.4);seekPhase=true;seekState='wait';seekAt=now;try{v.currentTime=seekTo}catch{}}
    else seekState='na';
   }
   if(seekState==='wait'){
    if(v&&Math.abs(pos-seekTo)<6&&v.readyState>=3&&!v.seeking&&pos>seekTo+.4){r.seekMs=Math.round(now-seekAt);seekState='ok';seekPhase=false}
    else if(el>=SEEK_AT+12){seekState='fail';seekPhase=false;return finish('ok')}
   }
   if(seekState!=='wait'&&el>=WINDOW_S)finish('ok');
  };
  cur={fail:(why,kind)=>finish('failed',why,kind)};
  (async()=>{
   r.probe=await probe(s);
   if(done)return;
   if(r.probe&&r.probe.ok===false&&!r.probe.skip&&(r.probe.code===404||r.probe.code===410||r.probe.code>=500)){/* still try it: the player may know better, but the log keeps the answer */}
   window.START0=true;
   t0=performance.now();hud.state='Starting…';
   try{KEngine.play(s,ctx,0)}catch(e){return finish('failed',String(e).slice(0,120))}
   const box=Q('#vw');bind(Q('#vw video'));
   if(box){mo=new MutationObserver(()=>bind(Q('#vw video')));mo.observe(box,{childList:true})}
   iv=setInterval(tick,500);
  })();
 });
}

/* ================= one title, every source ================= */
const hud={src:0,total:0,prov:'',q:0,lang:'',state:'',title:'',msg:'',retest:false};
const kOf=(type,id,vid)=>type+'|'+id+'|'+(vid||'');
async function sweep(type,id,vid){
 if(running)return;
 running=true;abort=false;skipSrc=false;skipTitle=false;hud.msg='';hud.retest=false;hud.src=0;hud.state='Preparing…';renderHud();
 const ext=window.KExt,eh=ext&&ext.handle;
 try{
  if(!await until(()=>Q('#pl #vw'),7000)){hud.msg='This is not a normal player page, so nothing was tested.';return}
  sweeping=true;if(ext)ext.handle=()=>false;
  const bP=baseline();
  hud.state='Collecting sources…';renderHud();
  const t0=Date.now();
  while(!abort&&Date.now()-t0<25000){if(Date.now()-t0>900&&!(origMore&&origMore()))break;await sleep(300)}
  await sleep(300);
  const all=(KP.last||[]).slice(),play=all.filter(p=>p.playable);
  const nm=(Q('#ktl')||{}).textContent||id,m=/:(\d+):(\d+)$/.exec(vid||'');
  const ctx={type,id,vid,name:nm.split(' \u00b7 ')[0],poster:'',label:m?'S'+m[1]+'E'+m[2]:''};
  try{if(window.KRuntimeOf)ctx.rt=await KRuntimeOf(ctx)}catch{}
  hud.title=ctx.name+(ctx.label?' '+ctx.label:'');
  const key=kOf(type,id,vid);
  LOG.titles=LOG.titles.filter(t=>t.k!==key);
  const entry={k:key,type,id,vid:vid||'',name:ctx.name,label:ctx.label,rt:ctx.rt||0,startedAt:new Date().toISOString(),done:false,net:await bP,
   counts:{total:all.length,playable:play.length,torrent:all.filter(p=>p.kind==='torrent').length,ext:all.filter(p=>p.kind==='ext'||p.kind==='yt').length},attempts:[]};
  LOG.titles.push(entry);save();
  /* one provider after another so a stopped run still covers every provider */
  const by={};play.forEach(p=>(by[p.prov]=by[p.prov]||[]).push(p));
  Object.values(by).forEach(a=>a.sort((x,y)=>y.q-x.q));
  const names=Object.keys(by),cand=[];
  for(let i=0;cand.length<play.length;i++)names.forEach(k=>{if(by[k][i])cand.push(by[k][i])});
  if(!cand.length){hud.msg='No playable source was found for this title.';entry.done=true;save();return}
  for(let i=0;i<cand.length;i++){
   if(abort||skipTitle)break;
   entry.attempts.push(await attempt(cand[i],ctx,i+1,cand.length));save();
   await sleep(400);
  }
  entry.endedAt=new Date().toISOString();entry.done=!abort;save();
  const ok=entry.attempts.filter(a=>a.status==='ok').length;
  hud.msg=(abort?'Stopped. ':'Done: ')+ctx.name+' · '+entry.attempts.length+' sources tested, '+ok+' played. '+counts();
 }catch(e){hud.msg='Lab error: '+String(e).slice(0,120)}
 finally{
  sweeping=false;running=false;cur=null;if(ext)ext.handle=eh;
  try{KEngine.stop()}catch{}
  const w=WATCH.exec(location.hash);
  if(w){
   if(kOf(w[1],decodeURIComponent(w[2]),w[3]?decodeURIComponent(w[3]):'')===kOf(type,id,vid))location.hash='#/title/'+type+'/'+encodeURIComponent(id);
   else maybeStart(w);
  }
  renderHud();
 }
}
function counts(){
 const d=LOG.titles.filter(t=>t.done);
 return 'Movies '+new Set(d.filter(t=>t.type==='movie').map(t=>t.id)).size+'/5 · Series '+new Set(d.filter(t=>t.type==='series').map(t=>t.id)).size+'/5';
}
function maybeStart(m){
 if(!on()||running)return;
 const type=m[1],id=decodeURIComponent(m[2]),vid=m[3]?decodeURIComponent(m[3]):'';
 if(!retest&&LOG.titles.some(t=>t.k===kOf(type,id,vid)&&t.done)){hud.msg='Already tested. '+counts();hud.retest=true;hud.pending=m;renderHud();return}
 retest=false;sweep(type,id,vid);
}
addEventListener('hashchange',()=>{
 const m=WATCH.exec(location.hash);
 if(running){if(!m)abort=true;return}
 if(!m)hud.msg='';
 if(on()&&m)setTimeout(()=>{const n=WATCH.exec(location.hash);if(n)maybeStart(n)},450);
 renderHud();
});
setTimeout(()=>{const m=WATCH.exec(location.hash);if(m)maybeStart(m)},1800);

/* ================= report and export ================= */
function provSummary(){
 const g={};
 LOG.titles.forEach(t=>t.attempts.forEach(a=>{if(a.status!=='skipped')(g[a.prov]=g[a.prov]||[]).push(a)}));
 return Object.keys(g).map(k=>{
  const a=g[k],ok=a.filter(x=>x.status==='ok');
  return{prov:k,n:a.length,ok:ok.length,dead:a.length-ok.length,ttffMed:med(ok.map(x=>x.ttffMs)),stallsAvg:ok.length?r1(ok.reduce((s,x)=>s+x.stallN,0)/ok.length):null,starved:a.filter(x=>/STARVED/.test((x.flags||[]).join())).length,fake:a.filter(x=>(x.flags||[]).includes('FAKE_RES')).length,mbpsMed:med(a.map(x=>x.avgMbps)),good:a.filter(x=>x.verdict==='good').length};
 }).sort((x,y)=>y.good-x.good||y.ok/y.n-x.ok/x.n);
}
const line=a=>[pd(a.n,3),pd((a.verdict||'').toUpperCase(),5),pd(a.prov,13),pd(qlab(a.q)+(a.aq&&a.aq!==a.q?'>'+qlab(a.aq):''),9),pd((a.langs||[]).join('+')||'-',13),pd(a.sizeGB||'-',6),pd(a.avgMbps||'-',6),pd(a.bpp||'-',6),pd(a.grade||'-',7),pd(a.ttffMs!=null?r1(a.ttffMs/1000)+'s':'-',6),pd(a.stallN?a.stallN+'x/'+r1(a.stallMs/1000)+'s':'0',9),pd(a.seekMs!=null?r1(a.seekMs/1000)+'s':a.seekState==='fail'?'FAIL':'-',6),(a.flags||[]).join(',')+(a.status!=='ok'&&a.why?' ['+clean(a.why,70)+']':'')].join(' ');
function report(){
 const d=LOG.device||{},L=[];
 L.push('KINORA PLAYBACK LAB | '+PLAT+' | app '+(LOG.app||'?')+' | '+LOG.started.slice(0,16).replace('T',' ')+' UTC');
 L.push('Device: '+(d.cores||'?')+' cores, '+(d.mem||'?')+' GB, screen '+(d.screen||[]).join('x')+', net '+((d.net||{}).type||'?')+', HEVC in browser: '+d.hevcOK+', Windows server: '+d.server);
 L.push('How to read: ttff = time until the first picture; Mbps = file size / running time; bpp = video bits per pixel per frame; grade high/good/lean/starved = how hard the file is compressed for its resolution (starved = too squeezed, e.g. a 4K file that looks soft); FAKE_RES = the picture is smaller than the label says.');
 LOG.titles.forEach(t=>{
  L.push('');
  L.push('== '+t.type.toUpperCase()+' | '+t.name+(t.label?' '+t.label:'')+' | '+t.attempts.length+'/'+t.counts.playable+' playable sources tested | internet '+(t.net&&t.net.mbps!=null?t.net.mbps+' Mbps':'n/a')+' | skipped '+t.counts.torrent+' torrent, '+t.counts.ext+' external');
  L.push('#   verd  provider      res       language      GB     Mbps   bpp    grade   ttff   stalls    seek   flags');
  t.attempts.forEach(a=>L.push(line(a)));
 });
 L.push('');L.push('== BY PROVIDER (all titles)');
 L.push(pd('provider',14)+pd('tested',7)+pd('played',7)+pd('good',5)+pd('ttff med',9)+pd('stalls/src',11)+pd('starved',8)+pd('fake res',9)+'Mbps med');
 provSummary().forEach(p=>L.push(pd(p.prov,14)+pd(p.n,7)+pd(p.ok,7)+pd(p.good,5)+pd(p.ttffMed!=null?r1(p.ttffMed/1000)+'s':'-',9)+pd(p.stallsAvg!=null?p.stallsAvg:'-',11)+pd(p.starved,8)+pd(p.fake,9)+(p.mbpsMed!=null?p.mbpsMed:'-')));
 const worst=[];LOG.titles.forEach(t=>t.attempts.forEach(a=>{if((a.flags||[]).some(f=>/STARVED_4K|FAKE_RES/.test(f)))worst.push('  '+t.name+' | '+a.prov+' | '+qlab(a.q)+(a.aq?'>'+qlab(a.aq):'')+' | '+(a.sizeGB||'?')+' GB | '+(a.avgMbps||'?')+' Mbps | '+(a.flags||[]).join(','))}));
 if(worst.length){L.push('');L.push('== 4K FILES THAT ARE TOO SQUEEZED / PICTURE SMALLER THAN LABEL');worst.forEach(x=>L.push(x))}
 return L.join('\n');
}
function jsonText(){
 const meta={v:LOG.v,id:LOG.id,platform:LOG.platform,app:LOG.app,started:LOG.started,exported:new Date().toISOString(),device:LOG.device,providers:provSummary()};
 return '{"meta":'+JSON.stringify(meta)+',"titles":[\n'+LOG.titles.map(t=>{const {attempts,...tm}=t;return '{"title":'+JSON.stringify(tm)+',"attempts":[\n'+attempts.map(a=>JSON.stringify(a)).join(',\n')+'\n]}'}).join(',\n')+'\n]}';
}
const stamp=()=>{const n=new Date(),z=x=>String(x).padStart(2,'0');return n.getFullYear()+z(n.getMonth()+1)+z(n.getDate())+'-'+z(n.getHours())+z(n.getMinutes())};
const dl=(name,text,mime)=>{const a=D.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime}));a.download=name;D.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(a.href)},2000)};
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch{try{const x=D.createElement('textarea');x.value=t;x.style.cssText='position:fixed;opacity:0';D.body.append(x);x.select();const ok=D.execCommand('copy');x.remove();return ok}catch{return false}}}
async function exportLog(){
 if(!LOG.titles.length)return say('Nothing recorded yet. Turn the lab on and play a title.');
 const base='kinora-lab-'+PLAT+'-'+stamp(),json=jsonText(),txt=report();
 let where='';
 try{
  if(WIN&&window.kinoraWin&&kinoraWin.saveLog){const r=await kinoraWin.saveLog({name:base,json,txt});if(r&&r.ok)where='Saved to Downloads\\Kinora-Logs (folder opened)'}
  else if(AND&&window.KinoraNative&&KinoraNative.saveLogs){const r=JSON.parse(KinoraNative.saveLogs(base,json,txt));if(r.ok){where='Saved to '+r.dir;try{KinoraNative.shareLogs('Kinora lab log',txt.slice(0,30000))}catch{}}}
 }catch{}
 if(!where){dl(base+'.json',json,'application/json');setTimeout(()=>dl(base+'.txt',txt,'text/plain'),400);where='Downloaded .json and .txt'}
 say(where);
 return where;
}
async function copyReport(){say(await copyText(report())?'Report copied. Paste it in the chat.':'Could not copy')}
function clearLog(){LOG=blank();try{if(AND&&window.KinoraNative&&KinoraNative.version)LOG.app=KinoraNative.version()}catch{}save();renderHud()}

/* ================= HUD (small bar on top while testing) ================= */
const st=D.createElement('style');
st.textContent=`#klab{position:fixed;top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:99999;display:none;align-items:center;gap:10px;max-width:min(94vw,640px);padding:8px 10px 8px 12px;border-radius:16px;background:rgba(10,11,14,.86);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.14);color:#f1efea;font:600 12px/1.35 Manrope,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.45)}
#klab .klt{display:flex;flex-direction:column;min-width:0}#klab .klt span{font-weight:500;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#klab b{letter-spacing:.08em;margin-right:6px;color:#7de3ff}
#klab .kla{display:flex;gap:6px;flex-shrink:0}#klab button{border:0;border-radius:99px;padding:7px 11px;background:rgba(255,255,255,.12);color:inherit;font:inherit;cursor:pointer;white-space:nowrap}#klab button:hover{background:rgba(255,255,255,.22)}
.klp .klr{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:16px;background:rgba(255,255,255,.05);margin:10px 0}.klp .klr small{display:block;opacity:.7;margin-top:3px;font-weight:500}
.klp .kls{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.klp .klt2{padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);margin:8px 0}.klp .klt2 small{opacity:.7;display:block;margin-top:3px}`;
D.head.append(st);
const hudEl=D.createElement('div');hudEl.id='klab';D.body.append(hudEl);
function renderHud(){
 const watch=WATCH.test(location.hash),fin=LOG.titles.some(t=>t.done);
 if(!on()||(!running&&!hud.msg&&!watch)){hudEl.style.display='none';return}
 hudEl.style.display='flex';
 let html;
 if(running&&hud.src)html='<div class="klt"><div><b>LAB</b>'+h(hud.title)+'</div><span>Source '+hud.src+'/'+hud.total+' \u00b7 '+h(hud.prov)+' \u00b7 '+qlab(hud.q)+(hud.lang?' \u00b7 '+h(hud.lang):'')+' \u00b7 '+h(hud.state)+'</span></div><div class="kla"><button data-a="ss">Skip source</button><button data-a="st">Skip title</button><button data-a="x">Stop</button></div>';
 else if(running)html='<div class="klt"><div><b>LAB</b>'+h(hud.state||'Preparing\u2026')+'</div></div><div class="kla"><button data-a="x">Stop</button></div>';
 else if(hud.msg)html='<div class="klt"><div><b>LAB</b>'+h(hud.msg)+'</div></div><div class="kla">'+(hud.retest?'<button data-a="re">Re-test</button>':'')+(fin?'<button data-a="ex">Export</button>':'')+'</div>';
 else html='<div class="klt"><div><b>LAB</b>Test mode is on. The title you play is tested automatically.</div></div>'+(fin?'<div class="kla"><button data-a="ex">Export</button></div>':'');
 hudEl.innerHTML=html;
}
hudEl.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;e.stopPropagation();
 const a=b.dataset.a;
 if(a==='ss')skipSrc=true;
 else if(a==='st'){skipTitle=true;skipSrc=true}
 else if(a==='x'){abort=true;skipSrc=true}
 else if(a==='ex')exportLog();
 else if(a==='re'&&hud.pending){retest=true;const m=hud.pending;hud.msg='';maybeStart(m)}
});
renderHud();

/* ================= the Lab page (#/lab) and the Settings switch ================= */
const tg=(id,onv)=>'<button class="k6t'+(onv?' on':'')+'" id="'+id+'" role="switch" aria-checked="'+onv+'" aria-label="Playback lab"></button>';
const wireTg=id=>{const b=Q('#'+id);if(b)b.onclick=()=>{const v=!on();setOn(v);b.classList.toggle('on',v);b.setAttribute('aria-checked',String(v));say(v?'Playback lab is on. Play a title to test it.':'Playback lab is off')}};
V.lab=function(){
 const T=LOG.titles;
 app.innerHTML='<div class="page klp"><h1>Playback lab</h1><p class="sub">Play any title with the lab on. Kinora tests every source of it for 30 seconds each, then moves to the next one by itself, and writes down startup time, buffering, picture size, bitrate, file size, jump speed and failures. Platform: <b>'+PLAT+'</b>. Test 5 movies and 5 series, then export.</p>'+
  '<div class="klr"><span><b>Test mode</b><small>'+counts()+'</small></span>'+tg('klt1',on())+'</div>'+
  '<div class="kls"><button class="btn p" id="kle">Export log</button><button class="btn" id="klc">Copy report</button><button class="btn" id="klx">Clear log</button></div>'+
  (T.length?T.map(t=>{const ok=t.attempts.filter(a=>a.status==='ok').length,gd=t.attempts.filter(a=>a.verdict==='good').length,sv=t.attempts.filter(a=>/STARVED/.test((a.flags||[]).join())).length;
   return '<div class="klt2"><b>'+h(t.name)+(t.label?' '+h(t.label):'')+'</b> <small>'+(t.type==='movie'?'Movie':'Series')+(t.done?'':' \u00b7 not finished')+'<br>'+t.attempts.length+' of '+t.counts.playable+' sources tested \u00b7 '+ok+' played \u00b7 '+gd+' good \u00b7 '+sv+' too compressed</small></div>'}).join(''):'<p class="sub">Nothing recorded yet.</p>')+'</div>';
 wireTg('klt1');
 Q('#kle').onclick=exportLog;Q('#klc').onclick=copyReport;
 Q('#klx').onclick=()=>{if(confirm('Delete the whole lab log on this device?')){clearLog();V.lab()}};
};
const P=window.K6&&K6.PAGES;
if(P&&P.play){
 const pp=P.play;
 P.play=function(){
  const r=pp.apply(this,arguments);
  try{
   const root=Q('.k6');if(!root||Q('#klabrow',root))return r;
   root.insertAdjacentHTML('beforeend','<h4 class="k6h">Testing</h4><div class="k6c" id="klabrow"><div class="k6o"><span><b>Playback lab</b><small>Test mode. Whatever you play, Kinora tries every source for 30 seconds each, records startup, buffering, quality, bitrate and size, then switches on its own.</small></span>'+tg('klabtg',on())+'</div><div class="k6o"><span><b>Lab log</b><small>'+counts()+'</small></span><a class="btn" href="#/lab">Open</a></div></div>');
   wireTg('klabtg');
  }catch{}
  return r;
 };
}
window.KLab={on,setOn,export:exportLog,report,log:()=>LOG,clear:clearLog};
})();
