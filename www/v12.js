/* Kinora v12: separate glass/gradient switches, one-tap player buttons, lock mode, double-tap seek, S1E1 play label, one refresh for all add-ons, dock hides for keyboard/settings, profile chooser on open */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const say=m=>{try{toast(m)}catch{}};
const COARSE=matchMedia('(pointer:coarse)').matches,MOB=COARSE||matchMedia('(max-width:820px)').matches;
const B=D.body,fx=()=>B.classList.toggle('noglass',CFG().glassOn===false);fx();
const tgl=(a,on)=>`<button class="k6t${on?' on':''}" ${a} role="switch" aria-checked="${!!on}" aria-label="toggle"></button>`;

/* profile chooser every time the app opens (setting is stored on the device, not per profile) */
if(localStorage.getItem('kask')&&!sessionStorage.getItem('kasked')&&!/^#\/(profiles|watch)/.test(location.hash)){sessionStorage.setItem('kasked','1');location.hash='#/profiles'}

/* settings: glass has its own switch, gradients their own */
if(window.K6){
 const lk=K6.PAGES.look;
 K6.PAGES.look=()=>{lk();const g=Q('[data-tg=nograd]'),o=g&&g.closest('.k6o');
  if(o){Q('small',o).textContent='Removes the colour glow and gradients. Glass stays as it is.';
   o.insertAdjacentHTML('afterend',`<div class="k6o"><span><b>Glass effect</b><small>Frosted blur behind panels. Off gives solid panels.</small></span>${tgl('data-tg="glassOn"',CFG().glassOn!==false)}</div><div class="k6o"><span><b>Ask who's watching</b><small>Show the profile chooser every time Kinora opens</small></span>${tgl('data-k12="ask"',!!localStorage.getItem('kask'))}</div>`)}};
 const hb=K6.PAGES.hub;
 K6.PAGES.hub=()=>{hb();if(MOB&&!Q('.k6bk'))Q('.k6 h1').insertAdjacentHTML('beforebegin','<button class="k6bk" data-go="hub"><svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M15 5l-7 7 7 7"/></svg>Back</button>')};
 const ad=K6.PAGES.addons;
 K6.PAGES.addons=()=>{ad();QA('[data-v6=rf]').forEach(b=>b.remove());const h4=Q('.k6 .k6h');if(h4)h4.insertAdjacentHTML('beforebegin','<button class="btn p k12rf" id="k12rf">Refresh all add-ons</button>')};
}
async function refreshAll(b){
 b.disabled=true;b.textContent='Refreshing…';cache.clear();
 Object.keys(localStorage).filter(k=>k.startsWith('c:')).forEach(k=>localStorage.removeItem(k));
 let n=0;await Promise.all(addons.map(async a=>{try{const m=await getJSON(a.url);if(m&&m.id){a.manifest=m;n++}}catch{}}));
 LS.set('addons',addons);cache.clear();say(n+' of '+addons.length+' add-ons refreshed');K6.PAGES.addons();
}
D.addEventListener('click',e=>{
 const t=e.target.closest('[data-k12=ask]');
 if(t){const on=!t.classList.contains('on');t.classList.toggle('on',on);localStorage.setItem('kask',on?'1':'');return}
 if(e.target.closest('[data-tg=glassOn]'))setTimeout(fx,50);
 const r=e.target.closest('#k12rf');if(r)refreshAll(r);
});

/* dock steps aside for the keyboard, and for Settings on phones */
const kb=()=>{const a=D.activeElement,t=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&!/checkbox|radio/.test(a.type||''),vv=window.visualViewport;B.classList.toggle('k12kb',!!((t&&COARSE)||(vv&&vv.height<innerHeight*.78)))};
D.addEventListener('focusin',kb);D.addEventListener('focusout',()=>setTimeout(kb,80));
if(window.visualViewport)visualViewport.addEventListener('resize',kb);
const st=()=>B.classList.toggle('k12set',/^#\/settings/.test(location.hash));st();addEventListener('hashchange',st);

/* player: HUD, double-tap seek, one-tap speed and picture size, lock mode, wheel volume */
const hud=(t,side)=>{const pl=Q('#pl');if(!pl)return;let e=Q('#khud');if(!e){e=D.createElement('div');e.id='khud';pl.append(e)}e.textContent=t;e.className='on'+(side?' '+side:'');clearTimeout(hud.t);hud.t=setTimeout(()=>e.classList.remove('on'),side?650:900)};
const LK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const peek=()=>{const b=Q('#klockb');if(!b)return;b.classList.add('on');clearTimeout(peek.t);peek.t=setTimeout(()=>b.classList.remove('on'),2600)};
function lock(){
 const pl=Q('#pl');if(!pl)return;pl.classList.add('klocked');
 let b=Q('#klockb');if(!b){b=D.createElement('button');b.id='klockb';b.setAttribute('aria-label','Unlock');b.innerHTML=LK;b.onclick=()=>{pl.classList.remove('klocked');b.remove();hud('Unlocked')};pl.append(b)}
 hud('Controls locked');peek();
}
['pointerdown','pointerup','click','dblclick','touchstart','touchend'].forEach(t=>D.addEventListener(t,e=>{
 const pl=e.target.closest&&e.target.closest('#pl.klocked');if(!pl||e.target.closest('#klockb'))return;
 e.stopImmediatePropagation();if(t==='pointerup')peek();if(t==='click'||t==='dblclick')e.preventDefault();
},true));
let lt=0,lx=0;
D.addEventListener('pointerup',e=>{
 const pl=e.target.closest&&e.target.closest('#pl');
 if(!pl||e.button>0||pl.classList.contains('klocked')||e.target.closest('button,input,a,#mn,#kpe,#kne,#ctl,.msg'))return;
 if(e.pointerType==='touch'&&e.target.closest('#vw'))return; /* touch on the video is handled by the gesture layer */
 const v=Q('#vw video');if(!v)return;const n=Date.now();
 if(n-lt<320&&Math.abs(e.clientX-lx)<120){
  lt=0;const w=innerWidth,x=e.clientX,s=CFG().skip||10;
  if(x<w*.4||x>w*.6){const back=x<w/2;v.currentTime=Math.max(0,Math.min(v.duration||1e9,v.currentTime+(back?-s:s)));hud((back?'−':'+')+s+' s',back?'l':'r')}
 }else{lt=n;lx=e.clientX}
},true);
const SP=[1,1.25,1.5,2,.75],FT=['contain','cover','fill'],FN={contain:'Fit',cover:'Fill',fill:'Stretch'};
D.addEventListener('click',e=>{
 const t=e.target.closest&&e.target.closest('#sd,#k9z,#klock');if(!t)return;
 if(t.id==='sd'&&e.shiftKey)return; /* shift-click still opens the full playback menu (volume, loop) */
 e.stopImmediatePropagation();e.preventDefault();
 const v=Q('#vw video');if(!v)return;
 if(t.id==='sd'){const r=SP[(Math.max(0,SP.indexOf(v.playbackRate))+1)%SP.length];v.playbackRate=r;hud(r+'× speed')}
 else if(t.id==='k9z'){const f=FT[(Math.max(0,FT.indexOf(v.style.objectFit||'contain'))+1)%FT.length];v.style.objectFit=f;hud(FN[f])}
 else lock();
},true);
D.addEventListener('wheel',e=>{
 if(!e.target.closest||!e.target.closest('#pl')||e.target.closest('#mn,#kpe'))return;
 const v=Q('#vw video');if(!v)return;const x=Math.max(0,Math.min(1,v.volume-Math.sign(e.deltaY)*.05));v.muted=false;v.volume=x;hud('Volume '+Math.round(x*100)+'%');
},{passive:true});
new MutationObserver(()=>{if(Q('#pl')&&Q('#k9z')&&!Q('#klock'))Q('#k9z').insertAdjacentHTML('afterend',`<button class="cb" id="klock" title="Lock controls" aria-label="Lock controls">${LK}</button>`)}).observe(D.getElementById('app'),{childList:true,subtree:true});

/* series page: say which episode Play will start (first unwatched, or the one in progress) */
function epLabel(){
 const m=/^#\/title\/series\/([^/]+)/.exec(location.hash),b=Q('#pl1');if(!m||!b)return;
 const id=decodeURIComponent(m[1]),meta=M['series|'+id],vs=((meta&&meta.videos)||[]).filter(v=>v.season>0).sort((a,c)=>a.season-c.season||a.episode-c.episode);
 if(!vs.length)return;
 const w=EW(),i=vs.findIndex(v=>!w[v.id]),v=vs[i<0?0:i];let rs=false;try{rs=!!progFor(meta)}catch{}
 b.dataset.k12v=v.id;const html=ic('play')+(rs?'Resume':'Play')+' S'+v.season+' E'+v.episode;if(b.innerHTML!==html)b.innerHTML=html;
}
D.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('#pl1[data-k12v]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();
 const id=decodeURIComponent(location.hash.split('/')[3]||''),vid=b.dataset.k12v;
 if(CFG().autoPlay===false&&M['series|'+id])openSrc(M['series|'+id],'series',id,vid);else location.hash=watchUrl('series',id,vid);
},true);
let lt2;const kick=()=>{clearTimeout(lt2);lt2=setTimeout(()=>{try{epLabel()}catch{}},160)};
new MutationObserver(kick).observe(D.getElementById('app'),{childList:true,subtree:true});addEventListener('hashchange',kick);kick();
})();
