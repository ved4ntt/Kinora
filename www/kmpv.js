/* Kinora mpv engine (Windows app, beta).
   mpv (FFmpeg demuxing and decoding, hardware decoding with fallback) renders into a native window that sits behind the Kinora window; the page
   is see-through while a video plays and the existing controls, subtitles, watch party and progress saving work on top of it.
   Off by default. Settings > Playback > Windows video engine switches it on (Kinora restarts once). If mpv cannot start, or fails on a file it should be able to
   open, the player falls back to the built-in engine by itself, so nothing that worked before stops working.
   This file only talks to electron/mpv.js through window.kinoraWin.mpv and registers itself as a Backend (see kcore.js). */
(()=>{
'use strict';
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const W=window.kinoraWin,M=W&&W.mpv;
if(!M||!window.KPlayback)return;
const say=m=>{try{toast(m)}catch{}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const IDLE={s:1,pw:false,p:0,d:0,b:0,e:'',a:[],t:[]};
let info=null,latest=IDLE,bad=false;

M.info().then(i=>{info=i;if(i&&i.enabled)D.documentElement.classList.add('kmpv')}).catch(()=>{});
M.onState(s=>{try{latest=typeof s==='string'?JSON.parse(s):s}catch{}});

const be={
 name:'mpv',label:'mpv',
 ready:()=>!!(info&&info.enabled&&info.ready&&!bad),
 /* direct links, playlists and manifests: mpv opens them itself (redirects, byte ranges and the headers an add-on asks for included) */
 can:s=>!!(s&&/^https?:/i.test(s.url||'')&&!s._srv&&!s._nompv&&!/^https?:\/\/(127\.|localhost)/i.test(s.url)),
 open(o){
  latest=IDLE;
  return M.load({url:o.url,headers:o.headers||{},start:Math.max(0,(o.start||0)/1000),rate:o.rate||1,volume:o.volume==null?1:o.volume,lang:(()=>{try{return(LS.get('kpick',{})||{}).lang||''}catch{return''}})()})
   .then(r=>{if(!r||!r.ok){bad=true;throw new Error('engine not supported here: '+((r&&r.error)||'mpv could not start'))}});
 },
 play:()=>M.cmd('play'),
 pause:()=>M.cmd('pause'),
 seek:ms=>M.cmd('seek',ms/1000),
 rate:x=>M.cmd('rate',x),
 volume:x=>M.cmd('volume',x),
 stop:()=>M.stop(),
 audio:i=>M.cmd('audio',i),
 text:i=>M.cmd('text',i),
 state:()=>latest
};
KPlayback.register(be);
window.KMpv={ready:()=>be.ready(),wants:s=>be.ready()&&be.can(s),info:()=>info,state:()=>latest};

/* ---- Settings > Playback: the engine switch ---- */
const P=window.K6&&K6.PAGES;
if(P&&typeof P.play==='function'){
 const pp=P.play;
 P.play=function(){
  const r=pp.apply(this,arguments);
  try{
   const root=Q('.k7m')||Q('.k6');if(!root||Q('#kmpvset',root))return r;
   const draw=()=>M.engine().then(e=>{
    const box=Q('#kmpvset');if(!box)return;
    const cur=e.engine,found=e.mpv,pend=e.pending&&e.pending!==cur;
    box.innerHTML='<div class="k6o col"><span><b>Windows video engine</b><small>'+(found?'mpv is available ('+esc(e.where)+'). Beta: it decodes in hardware, plays HEVC, 10-bit, HDR10 and Dolby Digital Plus, DTS and TrueHD sound as they are, and seeks without a converter.':'mpv was not found in this install, so only the built-in engine can be used.')+'</small></span><div class="k6ch wrap"><button class="ch'+(cur==='builtin'?' on':'')+'" data-kmpv="builtin">Built-in</button><button class="ch'+(cur==='mpv'?' on':'')+'" data-kmpv="mpv"'+(found?'':' disabled')+'>mpv (beta)</button></div></div>'+
     (pend?'<div class="k6o"><span><b>Restart needed</b><small>Kinora restarts once to switch the engine.</small></span><button class="btn p" id="kmpv-r" type="button">Restart now</button></div>':'');
   }).catch(()=>{});
   root.insertAdjacentHTML('beforeend','<h4 class="k6h">Video engine</h4><div class="k6c" id="kmpvset"></div>');
   draw();
   Q('#kmpvset',root).addEventListener('click',e=>{
    const b=e.target.closest('[data-kmpv]'),r2=e.target.closest('#kmpv-r');
    if(b&&!b.disabled)M.setEngine(b.dataset.kmpv).then(draw);
    if(r2)M.relaunch();
   });
  }catch{}
  return r;
 };
}
/* the device check mentions the engine too */
if(window.KCaps&&KCaps.rows){
 const r0=KCaps.rows;
 KCaps.rows=()=>{const R=r0();if(info&&info.enabled)R.unshift(['Windows video engine',info.ready?'mpv (FFmpeg decoding, hardware decoding when the graphics driver allows it)':'mpv selected, but not available: using the built-in engine']);return R};
}
})();
