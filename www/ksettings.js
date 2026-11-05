/* Kinora settings: only what matters.
   The player now decides on its own what the old switches used to control (native player, source choice, buffering, HDR, torrents...),
   so those rows are removed from Settings. The features stay, they are simply always on or automatic. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const P=window.K6&&K6.PAGES;if(!P)return;

/* one time: make the removed switches behave the way the app now always works */
try{
 if(!LS.get('kmig4',0)){
  setCfg({hdr:false,p2p:false,autoPlay:true,autoSwitch:true,langOnly:false,qOnly:false,srcMode:'fast',mainSrc:'',native:true,extPlayer:'needed'});
  LS.set('kmig4',1);
 }
}catch{}

const kill=(root,titles,sels)=>{
 if(!root)return;
 const T=new Set(titles||[]);
 QA('.k6o,.k6r',root).forEach(r=>{const b=Q('b',r),t=b?b.textContent.trim():'';if(T.has(t))r.remove()});
 (sels||[]).forEach(s=>QA(s,root).forEach(el=>{const r=el.closest('.k6o,.k6r');(r||el).remove()}));
 QA('.k6c',root).forEach(c=>{
  if(!Q('.k6o,.k6r,button,a,input,select',c)){const h=c.previousElementSibling;if(h&&h.classList.contains('k6h'))h.remove();c.remove()}
 });
 QA('h4.k6h',root).forEach(h=>{const n=h.nextElementSibling;if(!n||!n.classList.contains('k6c'))h.remove()});
};
const wrap=(name,titles,sels)=>{
 const o=P[name];if(!o)return;
 P[name]=function(){const r=o.apply(this,arguments);try{kill(Q('.k6'),titles,sels)}catch{}return r};
};

/* Settings home: no Stream options, no Integrations, no Explore */
wrap('hub',['Stream options','Integrations','Connections','Explore']);
/* Look & feel */
wrap('look',['Preview delay','Glass strength'],['[data-tg=nograd]']);
/* Playback */
wrap('play',[
 'Buffer size','Switch source if it keeps stalling','Play without choosing a source','Default speed','Show time remaining','Hold for 2\u00d7 speed','Allow torrent streams',
 'Native player (ExoPlayer)','mpv or VLC','Use the embed player','HDR','Only show preferred languages','Only show preferred quality',
 'How Kinora picks a source','Learned so far','Main source','Stream report'
],['[data-pq]','[data-knat]','[data-kex]','[data-tg=hdr]','[data-tg=embed]','[data-tg=p2p]','[data-tg=langOnly]','[data-tg=qOnly]','[data-tg=autoSwitch]','[data-tg=autoPlay]','[data-ksrc]','#kspf','#krep']);
/* Data and device */
wrap('data',['Smooth playback up to','Settings','Show the welcome popup again','Playback server']);
})();
