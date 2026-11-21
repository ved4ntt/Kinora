/* Kinora playback core (loaded before knative.js and kmpv.js).

   One contract for every native engine, so Windows and Android expose the same controls and the same events to the player screen:

     Backend  { name, label, ready(), can(source),
                open({url,headers,start,rate,mime,volume}),
                play(), pause(), seek(ms), rate(x), volume(0..1), stop(),
                audio(i), text(i),                      track by index, text(-1) = off
                state() -> { s,pw,p,d,b,e,a,t,vf,af,ns } s: 1 idle, 2 buffering, 3 ready, 4 ended; times in ms; e: error text, '' when fine
                seekHook?(ms,st) -> bool                an engine may take over a seek (Android: hand a non-seekable stream to VLC) }

   Engines: Android = ExoPlayer (AndroidX Media3, knative.js), Windows = mpv (kmpv.js, beta). The web build keeps its own <video>.

   Also here:
     KPlayback.detect(source)  what kind of source this is (file, hls, dash, smooth, embed, torrent...) from the link and the add-on's hints
     KPlayback.sniff(source)   the same, corrected by what the host really answers (content type, byte ranges, size) when a native probe exists
     KPlayback.attach(...)     the stand-in <video> that lets the existing controls, watch party and progress saving work on top of any Backend */
(()=>{
'use strict';
const D=document;
const cfg=()=>{try{return CFG()}catch{return{}}};
const fire=(v,n)=>{try{v.dispatchEvent(new Event(n))}catch{}};

/* ================= source type ================= */
const VIDEO_EXT=/^(mp4|m4v|mkv|webm|mov|avi|ts|m2ts|mts|flv|wmv|mpg|mpeg|3gp|ogv|mp3|m4a|aac|flac|opus)$/i;
const EMBED_HOST=/(^|\.)(youtube\.com|youtu\.be|vimeo\.com|streamtape|dood|voe\.sx|filemoon|mixdrop|vidmoly|streamwish|embedrise|upstream|vidsrc|2embed|embed\.su|autoembed|multiembed)\b/i;
const MIME={hls:'application/x-mpegURL',dash:'application/dash+xml',smooth:'application/vnd.ms-sstr+xml'};
function detect(s){
 const url=String((s&&s.url)||'');
 const clean=url.split(/[?#]/)[0].toLowerCase();
 const ext=(/\.([a-z0-9]{2,5})$/.exec(clean)||[])[1]||'';
 const low=url.toLowerCase();
 let kind='file',sure=true;
 if(!url){kind=s&&s.ytId?'youtube':s&&(s.infoHash||s.externalUrl)?'external':'none'}
 else if(/^magnet:/i.test(url)||ext==='torrent')kind='torrent';
 else if(!/^https?:/i.test(url))kind='none';
 else if(ext==='m3u8'||/[?&](format|type)=m3u8\b/.test(low)||/\/hls\//.test(low)&&!VIDEO_EXT.test(ext))kind='hls';
 else if(ext==='mpd'||/manifest\.mpd|[?&](format|type)=mpd\b/.test(low))kind='dash';
 else if(ext==='ism'||/\.ism\/manifest/i.test(low))kind='smooth';
 else if(VIDEO_EXT.test(ext))kind='file';
 else{
  let h='';try{h=new URL(url).hostname}catch{}
  if(EMBED_HOST.test(h)||/\/(embed|player|e)\//.test(low)&&!ext)kind='embed';
  else{kind='file';sure=false}   /* no extension: the host decides, sniff() finds out */
 }
 return{kind,ext,sure,mime:MIME[kind]||''};
}
const SC=new Map();
async function sniff(s){
 const d=detect(s);
 if(!s||!s.url||d.kind==='none'||d.kind==='torrent'||d.kind==='external'||d.kind==='youtube')return{...d,ok:false};
 const key=s.url;
 const hit=SC.get(key);if(hit&&Date.now()-hit.t<90000)return hit.r;
 let r={...d,ok:true,range:null,size:0,type:''};
 try{
  if(window.KProbe&&KProbe.on&&KProbe.on()){
   const p=await KProbe.test(s);
   const t=String(p.type||'').toLowerCase();
   r={...r,ok:p.ok!==false,range:p.range==null?null:!!p.range,size:+p.size||0,type:t,code:p.code||0,ms:p.ms||0};
   /* the host's own answer beats the file name */
   if(/mpegurl/.test(t))Object.assign(r,{kind:'hls',mime:MIME.hls});
   else if(/dash\+xml/.test(t))Object.assign(r,{kind:'dash',mime:MIME.dash});
   else if(/vnd\.ms-sstr/.test(t))Object.assign(r,{kind:'smooth',mime:MIME.smooth});
   else if(/^video\/|^audio\/|octet-stream|matroska/.test(t)&&r.kind!=='hls'&&r.kind!=='dash')Object.assign(r,{kind:'file'});
   else if(/text\/html/.test(t))Object.assign(r,{kind:'embed',ok:false});
  }
 }catch{}
 SC.set(key,{t:Date.now(),r});if(SC.size>60)SC.delete(SC.keys().next().value);
 return r;
}

/* ================= backends ================= */
const B={};
const ORDER=['mpv','exo'];
let current=null;

/* ================= the stand-in <video> ================= */
function attach(v,be,s,t0,ctx,opt){
 opt=opt||{};
 detach();
 const st={s:1,pw:false,p:0,d:0,b:0,e:'',rate:1,vol:1,muted:false,a:[],t:[],meta:false,can:false,play:false,ended:false,err:false,raw:null};
 const def=(k,g,set)=>{try{Object.defineProperty(v,k,{configurable:true,get:g,set})}catch{}};
 const fail=m=>{if(st.err)return;st.err=true;st.e=String(m||'');fire(v,'error')};
 def('currentTime',()=>st.p/1000,x=>{
  st.p=x*1000;v._seekHold=Date.now()+1500;
  const ms=Math.max(0,Math.round(x*1000));
  let handled=false;try{handled=!!(be.seekHook&&be.seekHook(ms,st,v))}catch{}
  if(!handled){try{be.seek(ms)}catch{}}
  fire(v,'seeking');setTimeout(()=>fire(v,'seeked'),350);
 });
 /* the whole length from the first second: the engine's own length is used only when it is trustworthy */
 const dur=()=>{const d=st.d/1000;if(st.rt&&(!(d>0)||d<st.rt*.5))return st.rt;return d>0?d:NaN};
 def('duration',dur);
 def('seekable',()=>{const d=dur()||0;return{length:d>0?1:0,start:()=>0,end:()=>d}});
 def('paused',()=>!st.pw);
 def('ended',()=>st.s===4);
 def('readyState',()=>st.s===3?4:st.s===2?2:1);
 def('buffered',()=>({length:st.b>0?1:0,start:()=>0,end:()=>st.b/1000}));
 def('volume',()=>st.vol,x=>{st.vol=Math.min(1,Math.max(0,+x));try{be.volume(st.muted?0:st.vol)}catch{}fire(v,'volumechange')});
 def('muted',()=>st.muted,x=>{st.muted=!!x;try{be.volume(st.muted?0:st.vol)}catch{}fire(v,'volumechange')});
 def('playbackRate',()=>st.rate,x=>{st.rate=+x||1;try{be.rate(st.rate)}catch{}});
 def('error',()=>st.err?{code:/decod|format|codec|unsupported|MediaCodec|not supported|unrecognized/i.test(st.e)?3:4,message:(be.label||be.name)+': '+st.e}:null);
 def('textTracks',()=>st.t.map((x,i)=>({label:x.n,get mode(){return x.on?'showing':'hidden'},set mode(m){if(m==='showing'){try{be.text(i)}catch{}x.on=true}else if(x.on){try{be.text(-1)}catch{}x.on=false}}})));
 v.kAudio=()=>st.a.map(x=>({n:x.n,on:x.on}));
 v.kAudioSet=i=>{try{be.audio(i)}catch{}st.a.forEach((x,k)=>x.on=k===i)};
 v.kStat=()=>st.raw||null;
 v.kBackend=be.name;
 v.play=()=>{try{be.play()}catch{}st.pw=true;return Promise.resolve()};
 v.pause=()=>{try{be.pause()}catch{}st.pw=false};
 v.load=()=>{};
 const prog=ctx&&cfg().resume&&!window.START0?(LS.get('prog',{})[ctx.vid||ctx.id]||{}):{};
 const start=Math.round(1000*(t0||(prog.t>30&&prog.d&&prog.t<prog.d-60?prog.t:0)));
 const hd=(s.behaviorHints&&s.behaviorHints.proxyHeaders&&s.behaviorHints.proxyHeaders.request)||s.headers||{};
 const kind=detect(s);
 let opened;
 try{opened=be.open({url:s.url,headers:hd,start,rate:cfg().speed||1,mime:kind.mime||'',volume:1})}
 catch(e){st.err=true;st.e=String(e);setTimeout(()=>fire(v,'error'),0);return{stop(){}}}
 if(opened&&opened.catch)opened.catch(e=>fail((e&&e.message)||e));
 fire(v,'loadstart');
 try{if(window.KRuntimeOf&&ctx)KRuntimeOf(ctx).then(r=>{if(r&&current===h){st.rt=r;fire(v,'durationchange')}}).catch(()=>{})}catch{}
 const h={be,st,v,tmr:0};
 h.tmr=setInterval(()=>{
  if(current!==h)return;
  let j;try{j=be.state()}catch{return}
  if(!j)return;
  const was={s:st.s,pw:st.pw,play:st.play};st.raw=j;
  st.s=j.s;st.d=j.d>0?j.d:0;st.b=j.b||0;st.ns=!!j.ns;st.a=j.a||st.a;st.t=(j.t||[]).map(x=>({...x,on:!!x.on}));
  st.pw=!!j.pw;
  if(j.p!=null&&!(v._seekHold>Date.now()))st.p=j.p;
  if(j.e&&!st.err){fail(j.e);return}
  if(!st.meta&&(st.d>0||st.rt)){st.meta=true;fire(v,'loadedmetadata');fire(v,'loadeddata')}
  if(st.s===3&&!st.can){st.can=true;fire(v,'canplay')}
  const playingNow=st.s===3&&st.pw;
  if(playingNow&&!st.play){st.play=true;fire(v,'play');fire(v,'playing');try{opt.onFirstPlay&&opt.onFirstPlay()}catch{}}
  else if(!playingNow&&st.play){st.play=false;if(st.s===2)fire(v,'waiting');else fire(v,'pause')}
  else if(st.s===2&&was.s!==2&&st.meta)fire(v,'waiting');
  fire(v,'timeupdate');fire(v,'progress');
  if(st.s===4&&!st.ended){st.ended=true;fire(v,'ended')}
 },250);
 current=h;
 return h;
}
function detach(){
 const h=current;if(!h)return;
 current=null;clearInterval(h.tmr);
 try{h.be.stop()}catch{}
}

/* a short, honest line about what is really playing: read from the engine (ExoPlayer or mpv), never guessed from the file name */
const VC={hevc:'HEVC',h265:'HEVC',avc:'H.264',h264:'H.264',av01:'AV1',av1:'AV1',vp9:'VP9',vp8:'VP8',mpeg2video:'MPEG-2',mpeg4:'MPEG-4'};
const AC={eac3:'E-AC-3 (Dolby Digital Plus)','ec-3':'E-AC-3 (Dolby Digital Plus)',ac3:'AC-3 (Dolby Digital)','true-hd':'TrueHD',truehd:'TrueHD','vnd.dts':'DTS',dts:'DTS',dtshd:'DTS-HD',aac:'AAC','mp4a-latm':'AAC',opus:'Opus',mp3:'MP3',mpeg:'MP3',flac:'FLAC',vorbis:'Vorbis'};
function tech(v){
 try{
  const j=v&&v.kStat&&v.kStat();if(!j)return'';
  const f=j.vf||{},a=j.af||{},out=[];
  const vc=String(f.codec||f.mime||'').toLowerCase().replace(/^video\//,'');
  if(vc)out.push((VC[vc]||vc.toUpperCase())+(f.bits>8?' '+f.bits+'-bit':''));
  if(f.w&&f.h)out.push(f.w+'\u00d7'+f.h);
  if(f.hdr==='pq'||f.tr===6)out.push('HDR (PQ)');else if(f.hdr==='hlg'||f.tr===7)out.push('HDR (HLG)');
  if(f.hw)out.push(/^(no|none|software)$/i.test(f.hw)?'software decoding':'hardware decoding'+(f.hw==='yes'?'':' ('+f.hw+')'));
  const ac=String(a.codec||a.mime||'').toLowerCase().replace(/^audio\//,'');
  if(ac)out.push((AC[ac]||ac.toUpperCase())+(a.ch>2?' '+(a.ch===6?'5.1':a.ch===8?'7.1':a.ch+'ch'):''));
  return out.join(' \u00b7 ');
 }catch{return''}
}
window.KTech=tech;

/* what a first-bytes check really tells. Only a clear answer condemns a link: the file is gone (404/410), the host does not exist or refuses connections,
   or it answered with a web page or JSON instead of a video. No answer in time (slow hosts are normal), 403/400/5xx and the like prove nothing about the real
   request, so the source stays in the running and is only given more time. */
function judge(r){
 r=r||{};
 const err=String(r.err||''),type=String(r.type||'').toLowerCase(),code=+r.code||0;
 const slow=!code&&(!!r.timeout||/timeout|timed out|reset|abort/i.test(err)||!err);
 const gone=code===404||code===410||/UnknownHost|refused|unreachable|CertPath|certificate|SSLHandshake/i.test(err);
 const page=/html|json/.test(type)&&code>=200&&code<300;
 return{...r,ok:!(gone||page),slow:!!slow};
}

window.KPlayback={
 detect,sniff,judge,
 mimeOf:k=>MIME[k]||'',
 register(be){B[be.name]=be},
 backends:()=>B,
 /* the first engine that is ready and wants this source */
 pick(s){for(const k of ORDER){const be=B[k];if(be&&be.ready()&&be.can(s))return be}return null},
 attach,detach,
 active:()=>current&&current.be.name||''
};
})();
