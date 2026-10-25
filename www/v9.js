/* Kinora v9: default source, top search on phones, single buffering screen, right-click watched, episode sources, gradient switch, watch together */
(()=>{
const D=document,Q=s=>D.querySelector(s),MOB=matchMedia('(max-width:820px)').matches||matchMedia('(pointer:coarse)').matches;
const say=m=>{try{toast(m)}catch{}};
const K={started:false};
let defP=null;
addEventListener('hashchange',()=>{K.started=false;defP=null});

/* ---------- gradient switch ---------- */
const grad=()=>D.body.classList.toggle('nograd',!!LS.get('cfg',{}).nograd);grad();
const lk=K6.PAGES.look;
K6.PAGES.look=()=>{lk();const c=Q('.k6 .k6c');if(c)c.insertAdjacentHTML('beforeend',`<div class="k6o"><span><b>Disable gradients</b><small>Turn off the colour glow and gradient glass</small></span><button class="k6t${LS.get('cfg',{}).nograd?' on':''}" data-tg="nograd" role="switch" aria-label="toggle"></button></div>`)};
D.addEventListener('click',e=>{if(e.target.closest('[data-tg=nograd]'))setTimeout(grad,50)});

/* ---------- default source: asked first, the rest wait a moment ---------- */
const f9=window.fetch.bind(window);
const slp=ms=>new Promise(r=>setTimeout(r,ms));
window.fetch=async function(i,o){
 let u='';try{u=decodeURIComponent(i&&i.url?i.url:String(i))}catch{}
 const n=LS.get('cfg',{}).defSrc;
 if(n&&/\/stream\/(movie|series)\//.test(u)&&/^#\/watch/.test(location.hash)){
  const a=addons.find(x=>x.manifest&&x.manifest.name===n);
  if(a){
   if(u.startsWith(bs(a.url)+'/')){const p=f9(i,o);defP=p.catch(()=>{});return p}
   const t0=Date.now();while(!defP&&Date.now()-t0<900)await slp(60);
   if(defP)await Promise.race([defP,slp(8000)]);
  }
 }
 return f9(i,o);
};
function setDef(n){
 setCfg({defSrc:n});
 D.querySelectorAll('.k9s').forEach(b=>{const on=b.dataset.n===n;b.classList.toggle('on',on);b.textContent=on?'Default':'Make default'});
 say(n?n+' is now your default source':'Default source cleared');
}
function stars(){
 const d=LS.get('cfg',{}).defSrc;
 D.querySelectorAll('#sbx .sg h3').forEach(h3=>{
  if(h3.querySelector('.k9s'))return;
  const n=h3.textContent,b=D.createElement('button');
  b.className='k9s'+(n===d?' on':'');b.dataset.n=n;b.textContent=n===d?'Default':'Make default';
  b.onclick=e=>{e.stopPropagation();setDef(n===LS.get('cfg',{}).defSrc?'':n)};
  h3.append(b);
 });
}
{const o0=openSrc;openSrc=function(){
 o0.apply(this,arguments);
 const bx=Q('#sbx');if(!bx)return;
 new MutationObserver(stars).observe(bx,{childList:true});stars();
}}

/* ---------- buffering screen only once; later stalls show just a spinner ---------- */
{const p0=play;play=function(){
 p0.apply(this,arguments);
 const v=Q('#vw video');if(!v)return;
 if(K.started){const l=Q('#ld'),p=Q('#pl');l&&l.classList.remove('on');p&&p.classList.add('buf')}
 v.addEventListener('playing',()=>{K.started=true},{once:true});
 const ow=v.onwaiting;
 v.onwaiting=function(e){ow&&ow.call(this,e);if(K.started){const l=Q('#ld'),p=Q('#pl');l&&l.classList.remove('on');p&&p.classList.add('buf')}};
}}

/* ---------- phone search: opens at the top and stays there ---------- */
let KS=null;
function mkS(){
 if(KS)return KS;
 KS=D.createElement('div');KS.id='ks';
 KS.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" placeholder="Search movies and series" aria-label="Search" enterkeyhint="search"><button aria-label="Close search">✕</button>';
 D.body.append(KS);
 const i=KS.querySelector('input');let t;
 const go=()=>{const q=i.value.trim();if(q.length<2)return;const h='#/search/'+encodeURIComponent(q);/^#\/search/.test(location.hash)?location.replace(h):location.hash=h};
 i.oninput=()=>{clearTimeout(t);t=setTimeout(go,420)};
 i.onkeydown=e=>{if(e.key==='Enter'){clearTimeout(t);go();i.blur()}};
 KS.querySelector('button').onclick=()=>{closeS();if(/^#\/search/.test(location.hash))location.hash='#/'};
 return KS;
}
function openS(focus){
 const k=mkS(),i=k.querySelector('input'),m=/^#\/search\/(.*)/.exec(location.hash);
 D.body.classList.add('ks-on');k.classList.add('on');
 if(m&&!i.value)try{i.value=decodeURIComponent(m[1])}catch{}
 if(focus)setTimeout(()=>i.focus(),80);
}
function closeS(){D.body.classList.remove('ks-on');KS&&KS.classList.remove('on')}
D.addEventListener('click',e=>{if(MOB&&e.target.closest('#sf svg')){e.stopPropagation();e.preventDefault();openS(true)}},true);
addEventListener('hashchange',()=>{if(!MOB)return;if(/^#\/search/.test(location.hash)){if(!(KS&&KS.classList.contains('on')))openS(false)}else closeS()});
if(MOB&&/^#\/search/.test(location.hash))openS(false);

/* ---------- right-click: mark watched / unwatched, library ---------- */
function menu(x,y,items){
 const o=Q('#k9m');o&&o.remove();
 const m=D.createElement('div');m.id='k9m';
 m.innerHTML=items.map((it,i)=>`<button data-i="${i}">${it[0]}</button>`).join('');
 m.style.left=Math.min(x,innerWidth-205)+'px';m.style.top=Math.min(y,innerHeight-items.length*42-12)+'px';
 m.onclick=e=>{const b=e.target.closest('button');if(b){items[+b.dataset.i][1]();m.remove()}};
 D.body.append(m);
 setTimeout(()=>addEventListener('pointerdown',function f(ev){if(!m.contains(ev.target))m.remove();removeEventListener('pointerdown',f,true)},true),0);
}
D.addEventListener('contextmenu',e=>{
 const c=e.target.closest('.card[data-k]'),ep=e.target.closest('.ep[data-v]');
 if(!c&&!ep)return;e.preventDefault();
 if(c){
  const m=M[c.dataset.k];if(!m)return;
  const w=!!stOf(m).w,l=inLib(m);
  menu(e.clientX,e.clientY,[
   [w?'Mark as unwatched':'Mark as watched',()=>{setSt(m,{w:!w});say(w?'Marked as unwatched':'Marked as watched');if(/library/.test(location.hash))V.library()}],
   [l?'Remove from library':'Add to library',()=>{toggleLib(m);if(/library/.test(location.hash))V.library()}]
  ]);
 }else{
  const id=ep.dataset.v,w=!!EW()[id];
  menu(e.clientX,e.clientY,[[w?'Mark as unwatched':'Mark as watched',()=>{
   const x=EW();w?delete x[id]:x[id]=1;LS.set('ew',x);
   ep.classList.toggle('wtd',!w);const b=ep.querySelector('.ewb');b&&b.classList.toggle('on',!w);
   say(w?'Marked as unwatched':'Marked as watched');
  }]]);
 }
});

/* ---------- episodes: choose a source for any episode ---------- */
D.addEventListener('click',e=>{
 const b=e.target.closest('.k9src');if(!b)return;
 e.stopPropagation();e.preventDefault();
 const p=location.hash.split('/'),type=p[2],id=decodeURIComponent(p[3]||''),m=M[type+'|'+id];
 if(m)openSrc(m,type,id,b.closest('.ep').dataset.v);
},true);

/* ---------- Windows: full-screen button next to the window controls ---------- */
const wc=Q('#wc');
if(wc&&!wc.querySelector('[data-w=full]'))wc.querySelector('[data-w=max]').insertAdjacentHTML('beforebegin','<button data-w="full" aria-label="Full screen"><svg viewBox="0 0 12 12"><path d="M2 4.5V2h2.5M7.5 2H10v2.5M10 7.5V10H7.5M4.5 10H2V7.5"/></svg></button>');

/* ---------- player: picture size has its own button, apart from speed ---------- */
const PZ='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 10V8h2M16 10V8h-2M8 14v2h2M16 14v2h-2"/></svg>';
const PW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 1.7 6 5"/></svg>';
function player(){
 const pl=Q('#pl');if(!pl||pl.dataset.k9)return;pl.dataset.k9=1;
 const sd=Q('#sd'),mn=Q('#mn'),top=Q('#top');
 if(sd){
  sd.insertAdjacentHTML('afterend',`<button class="cb" id="k9z" title="Picture size" aria-label="Picture size">${PZ}</button>`);
  Q('#k9z').onclick=e=>{
   e.stopPropagation();const v=Q('#vw video'),f=(v&&v.style.objectFit)||'contain';
   mn.className='on sm';
   mn.innerHTML='<h3>Picture size</h3><div class="sw">'+[['contain','Fit'],['cover','Fill'],['fill','Stretch']].map(x=>`<button class="ch${f===x[0]?' on':''}" data-z="${x[0]}">${x[1]}</button>`).join('')+'</div>';
  };
  new MutationObserver(()=>{
   mn.querySelectorAll('h3').forEach(h3=>{if(/^picture$/i.test(h3.textContent.trim())){const n=h3.nextElementSibling;n&&n.remove();h3.remove()}});
  }).observe(mn,{childList:true});
  mn.addEventListener('click',e=>{const b=e.target.closest('[data-z]'),v=Q('#vw video');if(!b||!v)return;v.style.objectFit=b.dataset.z;mn.querySelectorAll('[data-z]').forEach(x=>x.classList.toggle('on',x===b))});
 }
 if(top&&top.lastElementChild){
  top.lastElementChild.insertAdjacentHTML('beforebegin',`<button class="rb" id="k9pb" title="Watch together" aria-label="Watch together">${PW}</button>`);
  Q('#k9pb').onclick=panel;
 }
 if(PA.host)announce();
}

/* ---------- watch together: PIN rooms with sync, chat and reactions ---------- */
const PA={ctl:true,log:[]};
const snd=p=>PA.ch&&PA.ch.send({type:'broadcast',event:'k',payload:p});
const pin4=()=>String(1000+Math.floor(Math.random()*9000));
function announce(){if(PA.host&&/^#\/watch/.test(location.hash))snd({t:'go',u:location.hash,ctl:PA.ctl})}
function applyV(p){
 const v=Q('#vw video');if(!v)return;
 PA.m=Date.now()+900;
 if(Math.abs(v.currentTime-p.c)>1.5)v.currentTime=p.c;
 if(p.p&&!v.paused)v.pause();
 if(!p.p&&v.paused)v.play().catch(()=>{});
}
function fxe(em){
 const s=D.createElement('span');s.className='fx';s.textContent=em;
 s.style.cssText=`left:${15+Math.random()*70}vw;top:72vh;--dx:${(Math.random()-.5)*90}px;--dy:-170px;--r:0deg`;
 D.body.append(s);setTimeout(()=>s.remove(),1500);
}
function onP(p){
 if(p.t==='hi'&&PA.host)announce();
 else if(p.t==='go'&&!PA.host){PA.ctl=p.ctl;if(location.hash!==p.u)location.hash=p.u}
 else if(p.t==='s'&&(!PA.host||PA.ctl))applyV(p);
 else if(p.t==='c'){PA.log.push(p);drawLog()}
 else if(p.t==='r')fxe(p.e);
}
function leave(){if(PA.ch){try{PA.ch.unsubscribe()}catch{}}PA.ch=null;PA.pin='';PA.host=false;PA.log=[]}
function join(pin,host){
 const sb=sbInit();if(!sb){say('Cloud is not set up, so rooms are unavailable');return false}
 leave();PA.pin=pin;PA.host=host;PA.ctl=true;
 PA.ch=sb.channel('kinora-'+pin,{config:{broadcast:{self:false}}});
 PA.ch.on('broadcast',{event:'k'},({payload})=>onP(payload)).subscribe(s=>{if(s==='SUBSCRIBED'){say(host?'Room '+pin+' is live':'Joined room '+pin);host?announce():snd({t:'hi'})}});
 return true;
}
['play','pause','seeked'].forEach(ev=>D.addEventListener(ev,e=>{
 const v=e.target;if(!PA.ch||!v.matches||!v.matches('#vw video')||Date.now()<(PA.m||0))return;
 if(!PA.host&&!PA.ctl)return;
 snd({t:'s',p:v.paused,c:v.currentTime});
},true));
addEventListener('hashchange',announce);
function drawLog(){const l=Q('#k9log');if(!l)return;l.innerHTML=PA.log.slice(-60).map(x=>`<p><b>${h(x.n)}</b>${h(x.x)}</p>`).join('');l.scrollTop=l.scrollHeight}
function panel(){
 let m=Q('#k9p');
 if(!m){m=D.createElement('div');m.id='k9p';m.className='dmod';D.body.append(m);
  m.onclick=e=>{
   const b=e.target.closest('[data-a],[data-e]');
   if(e.target===m)return m.remove();
   if(!b)return;
   const a=b.dataset.a;
   if(b.dataset.e){snd({t:'r',e:b.dataset.e});fxe(b.dataset.e)}
   else if(a==='host'){if(join(pin4(),true))panel()}
   else if(a==='leave'){leave();panel()}
   else if(a==='ctl'){PA.ctl=!PA.ctl;announce();panel()}
   else if(a==='copy')navigator.clipboard.writeText(location.origin+location.pathname+'#/party/'+PA.pin).then(()=>say('Invite link copied')).catch(()=>say('Could not copy'));
  };
  m.onsubmit=e=>{
   e.preventDefault();
   if(e.target.id==='k9j'){const p=e.target.querySelector('input').value.trim();if(/^\d{4}$/.test(p)){if(join(p,false))panel()}else say('Enter the 4 digit PIN')}
   else{const i=e.target.querySelector('input'),x=i.value.trim();if(!x)return;const p={t:'c',n:LS.get('me','')||'Me',x};PA.log.push(p);snd(p);i.value='';drawLog()}
  };
 }
 m.innerHTML=`<div class="dcard obc k9pc"><h1>Watch together</h1>`+(PA.ch
  ?`<p class="sub">Room PIN</p><div class="k9pin">${h(PA.pin)}</div><div class="sw" style="padding:0"><button class="ch" data-a="copy">Copy invite link</button>${PA.host?`<button class="ch${PA.ctl?' on':''}" data-a="ctl">Guests can control</button>`:''}<button class="ch" data-a="leave">Leave</button></div><div class="k9log" id="k9log"></div><form id="k9f"><input class="t" placeholder="Message" maxlength="200" autocomplete="off"></form><div class="sw" style="padding:0">${['❤️','😂','😮','👏','🔥'].map(x=>`<button class="ch" data-e="${x}">${x}</button>`).join('')}</div>`
  :`<p class="sub">Watch at the same time. Start a room and share the PIN, or enter a friend's PIN.</p><div class="acts"><button class="pill" data-a="host">Start a room</button></div><div class="or"><span>or</span></div><form id="k9j" class="k6in" style="padding:0"><input class="t" placeholder="PIN" inputmode="numeric" maxlength="4" autocomplete="off"><button class="btn p">Join</button></form>`)+'</div>';
 drawLog();
}
V.party=pin=>{join(String(pin||'').replace(/\D/g,'').slice(0,4),false);location.replace('#/')};
{const r0=renderPm;renderPm=function(){
 r0.apply(this,arguments);
 pm.insertAdjacentHTML('beforeend','<button class="btn" id="k9w" style="display:block;width:100%;margin-top:8px">Watch together</button>');
 const b=Q('#k9w');if(b)b.onclick=()=>{pm.classList.remove('on');panel()};
}}
renderPm();

new MutationObserver(()=>{
 player();
 D.querySelectorAll('.ep[data-v]:not([data-k9])').forEach(e=>{
  e.dataset.k9=1;const w=e.querySelector('.ewb');
  const html=`<button class="k9src" title="Choose source" aria-label="Choose source">${ic('cloud')}</button>`;
  w?w.insertAdjacentHTML('beforebegin',html):e.insertAdjacentHTML('beforeend',html);
 });
}).observe(D.getElementById('app'),{childList:true,subtree:true});
})();
