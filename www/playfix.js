/* Kinora playback fixes (Windows app): direct streams go through the fast proxy, formats the player cannot hear or see
   go through the converter, and clicking the seek bar waits for the converter instead of snapping back. */
(()=>{
const D=document,Q=s=>D.querySelector(s);
const WIN=/Electron/.test(navigator.userAgent);
const say=m=>{try{toast(m)}catch{}};
const AUD=/\bdts\b|dts-?hd|truehd|e-?ac-?3|\bac-?3\b|\bddp|dd\+|atmos/i;
const HEV=/hevc|x265|h\.?265/i;

if(WIN){
 /* tell the server whether this PC can decode HEVC (then it copies the video instead of re-encoding it) */
 let hevc=false;try{hevc=MediaSource.isTypeSupported('video/mp4; codecs="hvc1.1.6.L93.B0"')}catch{}
 const sync=()=>{try{if(SRVOK()){const c=srvCfg();fetch(c.url.replace(/\/$/,'')+'/cfg?k='+encodeURIComponent(c.key)+'&hevc='+(hevc?1:0)).catch(()=>{})}}catch{}};
 setTimeout(sync,1200);setTimeout(sync,5000);

 const proxied=s=>{
  const c=srvCfg(),hd=s.behaviorHints&&s.behaviorHints.proxyHeaders&&s.behaviorHints.proxyHeaders.request,bh={...(s.behaviorHints||{})};
  delete bh.proxyHeaders;
  return{...s,_kp:1,behaviorHints:bh,url:c.url.replace(/\/$/,'')+'/proxy?k='+encodeURIComponent(c.key)+'&u='+encodeURIComponent(s.url)+(hd?'&h='+encodeURIComponent(btoa(JSON.stringify(hd))):'')};
 };
 {const p0=play;play=function(s,ctx,t0){
  if(s&&s.url&&!s._srv&&!s._kp&&/^https?:/i.test(s.url)&&!/\.m3u8(\?|$)/i.test(s.url)&&!/^https?:\/\/127\.0\.0\.1/.test(s.url)&&(()=>{try{return SRVOK()}catch{return false}})()){
   const t=(s.name||'')+' '+(s.title||s.description||'')+' '+s.url;
   if(AUD.test(t)||(HEV.test(t)&&typeof HEVC_OK!=='undefined'&&!HEVC_OK))return p0.call(this,srvStream(s),ctx,t0);
   return p0.call(this,proxied(s),ctx,t0);
  }
  return p0.apply(this,arguments);
 }}
}

/* clicking the seek bar past what the converter has made so far: wait for it, then jump */
let pt=0;
D.addEventListener('pointerdown',e=>{
 const sk=e.target.closest&&e.target.closest('#sk');if(!sk)return;
 const v=Q('#vw video'),hl=typeof HL!=='undefined'&&HL;if(!v||!hl)return;
 const r=sk.getBoundingClientRect(),d=v.duration;if(!d||!isFinite(d))return;
 const tgt=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width))*d;
 const end=()=>v.seekable.length?v.seekable.end(v.seekable.length-1):0;
 if(tgt<=end()+2)return;
 e.stopImmediatePropagation();e.preventDefault();
 clearInterval(pt);say('Getting that part ready…');
 const pl=Q('#pl');pl&&pl.classList.add('buf');
 const t0=Date.now();
 pt=setInterval(()=>{
  if(!v.isConnected||Date.now()-t0>15*60000){clearInterval(pt);return}
  if(end()>=tgt-1){clearInterval(pt);v.currentTime=tgt}else{const p=Q('#pl');p&&p.classList.add('buf')}
 },600);
},true);
})();
