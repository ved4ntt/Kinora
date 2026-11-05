/* Kinora desktop dock (Windows app and desktop browsers): two small floating pills.
   Left: Home, Movies, Series, Anime, Live TV, Library.
   Right: search (opens in place, you type right there), watch together, settings, profile.
   Compact = icons only, the open tab shows its name. Expanded = every name. Phones keep the bottom dock from dock.js.
   Profile and Settings are two separate popups. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const AND=!!((window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())||window.KinoraNative);
const APP=AND||!!window.kinoraWin;
const say=m=>{try{toast(m)}catch{}};
const P={
 home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 movie:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',
 tv:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
 anime:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
 live:'<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
 lib:'<path d="M4 8h16l-1.5 11a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7z"/><path d="M6 8l1.2-3.5h9.6L18 8"/><path d="M9.5 13h5"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
 down:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
 people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c2.6 0 4.5 1.6 4.5 4.2"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 swap:'<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
 out:'<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9"/>',
 in:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h11" transform="scale(-1 1) translate(-24 0)"/>',
 all:'<path d="M5 12h14M13 6l6 6-6 6"/>'
};
const svg=k=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+P[k]+'</svg>';
const NAV=[['','home','Home'],['discover/movie','movie','Movies'],['discover/series','tv','Series'],['discover/anime','anime','Anime'],['live','live','Live TV'],['library','lib','Library']];

const root=D.createElement('div');root.id='kdn';
root.innerHTML='<nav class="kdp" id="kdl2" aria-label="Main">'+NAV.map(([r,i,t])=>'<a class="kdi" href="#/'+r+'" data-r="'+r+'" aria-label="'+t+'" title="'+t+'">'+svg(i)+'<span>'+t+'</span></a>').join('')+'</nav>'+
 '<div class="kdp" id="kdr2">'+
  '<div class="kds" id="kds"><button type="button" class="kdi" id="kds-b" aria-label="Search" title="Search">'+svg('search')+'</button><input id="kds-i" type="text" placeholder="Search movies, series, anime" autocomplete="off" spellcheck="false" aria-label="Search" tabindex="-1"><button type="button" class="kds-x" id="kds-x" aria-label="Clear search" hidden>'+svg('x')+'</button></div>'+
  '<button type="button" class="kdi" id="kdw" aria-label="Watch together" title="Watch together">'+svg('people')+'</button>'+
  '<button type="button" class="kdi" id="kdg" aria-label="Settings" title="Settings">'+svg('gear')+'</button>'+
  (APP?'':'<button type="button" class="kdi" id="kdl-b" aria-label="Get the app" title="Get the app">'+svg('down')+'</button>')+
  '<button type="button" class="kdi kav" id="kda" aria-label="Profile" title="Profile"><em></em></button>'+
 '</div>';
D.body.append(root);

/* ---------- compact or expanded ---------- */
const apply=()=>root.classList.toggle('exp',CFG().dockMode==='exp');
apply();
{const d0=window.KDockMode;window.KDockMode=function(){try{d0&&d0.apply(this,arguments)}catch{}apply()}}

/* ---------- which tab is open ---------- */
function mark(){
 const p=location.hash.replace(/^#\/?/,'').split('/'),a=p[0]||'',b=p[1]||'';
 const cur=a===''?'':a==='discover'||a==='title'?(b==='movie'?'discover/movie':b==='series'?'discover/series':b==='anime'?'discover/anime':null):a==='live'||a==='tv'?'live':a==='library'?'library':null;
 QA('#kdl2 a',root).forEach(x=>x.classList.toggle('on',cur!==null&&x.dataset.r===cur));
 root.classList.toggle('hide',/^(watch|profiles)$/.test(a));
 if(!/^search$/.test(a)&&D.activeElement!==si){si.value='';sx.hidden=true;box.classList.remove('open')}
 closePop();
}
const avDraw=()=>{try{const e=Q('#kda em',root),s=avatarSvg(+LS.get('av',0));if(e&&e.innerHTML!==s)e.innerHTML=s}catch{}};

/* ---------- search: the icon opens a bar right here, nothing else opens ---------- */
const box=Q('#kds',root),sb=Q('#kds-b',root),si=Q('#kds-i',root),sx=Q('#kds-x',root);
let st=0;
const go=(q,now)=>{
 q=q.trim();if(!q)return;
 const h='#/search/'+encodeURIComponent(q);if(location.hash===h)return;
 if(/^#\/search\//.test(location.hash))location.replace(h);else location.hash=h;
};
const openS=()=>{box.classList.add('open');si.tabIndex=0;setTimeout(()=>si.focus(),30)};
const closeS=()=>{if(si.value.trim())return;box.classList.remove('open');si.tabIndex=-1};
sb.onclick=()=>{box.classList.contains('open')?(si.value.trim()?go(si.value,true):(si.focus()||0)):openS()};
si.oninput=()=>{sx.hidden=!si.value;clearTimeout(st);st=setTimeout(()=>go(si.value),450)};
si.onkeydown=e=>{
 if(e.key==='Enter'){clearTimeout(st);go(si.value,true)}
 else if(e.key==='Escape'){si.value='';sx.hidden=true;si.blur();box.classList.remove('open');si.tabIndex=-1}
};
si.onblur=()=>setTimeout(closeS,160);
sx.onclick=()=>{si.value='';sx.hidden=true;si.focus()};
D.addEventListener('keydown',e=>{
 if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey)return;
 const a=D.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||Q('#pl'))return;
 if(getComputedStyle(root).display==='none')return;
 e.preventDefault();openS();
});

/* ---------- the profile and settings popups ---------- */
let pop=null;
function closePop(){
 if(!pop)return;pop.remove();pop=null;
 QA('#kdw,#kdg,#kda',root).forEach(b=>b.classList.remove('on'));
}
function openPop(kind,btn,html,wire){
 if(pop&&pop.dataset.k===kind){closePop();return}
 closePop();
 const p=D.createElement('div');p.className='kpop2';p.dataset.k=kind;p.innerHTML=html;
 D.body.append(p);pop=p;btn.classList.add('on');
 const r=btn.getBoundingClientRect(),w=p.offsetWidth;
 p.style.top=Math.round(r.bottom+10)+'px';
 p.style.left=Math.round(Math.max(12,Math.min(innerWidth-w-12,r.right-w)))+'px';
 requestAnimationFrame(()=>p.classList.add('on'));
 if(wire)wire(p);
}
D.addEventListener('pointerdown',e=>{if(pop&&!e.target.closest('.kpop2,#kdw,#kdg,#kda'))closePop()},true);
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&pop)closePop()});
{const b0=window.__kBack;window.__kBack=function(){if(pop){closePop();return 1}return b0?b0():0}}

const U=()=>{try{return typeof USER!=='undefined'?USER:null}catch{return null}};
function profHtml(){
 const u=U(),me=String(LS.get('me','')||'').trim();
 const nm=me||(u&&((u.user_metadata&&(u.user_metadata.full_name||u.user_metadata.name))||String(u.email||'').split('@')[0]))||'Guest';
 let av='';try{av=avatarSvg(+LS.get('av',0))}catch{}
 const row=(i,t,a)=>(a.href?'<a class="kpr2" href="'+a.href+'">':'<button type="button" class="kpr2" data-a="'+a.act+'">')+svg(i)+'<span>'+t+'</span>'+(a.href?'</a>':'</button>');
 return '<div class="kph"><span class="kpa">'+av+'</span><div><b>'+h(nm)+'</b><small>'+(u?h(u.email||''):'Saved on this device')+'</small></div></div><div class="kpl">'+
  row('swap','Switch profile',{href:'#/profiles'})+row('edit','Edit profile',{href:'#/profile'})+row('people','Watch together',{act:'party'})+
  (u?row('out','Sign out',{act:'out'}):row('in','Sign in to sync',{href:'#/profile'}))+'</div>';
}
Q('#kda',root).onclick=e=>{
 e.stopPropagation();
 openPop('prof',e.currentTarget,profHtml(),p=>{
  p.onclick=ev=>{
   const b=ev.target.closest('[data-a]'),a=ev.target.closest('a');
   if(a){closePop();return}
   if(!b)return;
   closePop();
   if(b.dataset.a==='party'){try{KParty.open()}catch{say('Watch together is not available right now')}}
   else if(b.dataset.a==='out'){try{signOut()}catch{}}
  };
 });
};
Q('#kdw',root).onclick=e=>{e.stopPropagation();closePop();try{KParty.open()}catch{say('Watch together is not available right now')}};

const tg=(k,t,s,on)=>'<div class="kst"><span><b>'+t+'</b><small>'+s+'</small></span><button type="button" class="k6t'+(on?' on':'')+'" data-k="'+k+'" role="switch" aria-checked="'+!!on+'" aria-label="'+t+'"></button></div>';
function setHtml(){
 const c=CFG(),x=c.dockMode==='exp';
 return '<h4>Quick settings</h4>'+
  '<div class="kst"><span><b>Dock style</b><small>Compact shows a name on the open tab only</small></span><div class="kseg"><button type="button" data-dm="cmp" class="'+(x?'':'on')+'">Compact</button><button type="button" data-dm="exp" class="'+(x?'on':'')+'">Expanded</button></div></div>'+
  tg('glassOn','Glass effect','Frosted panels. Off gives solid ones',c.glassOn!==false)+
  tg('autonext','Next episode','Start the next episode by itself',!!c.autonext)+
  tg('autosub','Subtitles','Switch subtitles on when your language is found',!!c.autosub)+
  '<a class="kall" href="#/settings">All settings'+svg('all')+'</a>';
}
Q('#kdg',root).onclick=e=>{
 e.stopPropagation();
 openPop('set',e.currentTarget,setHtml(),p=>{
  p.onclick=ev=>{
   if(ev.target.closest('a')){closePop();return}
   const d=ev.target.closest('[data-dm]');
   if(d){setCfg({dockMode:d.dataset.dm});apply();try{window.KDockMode&&0}catch{}QA('[data-dm]',p).forEach(b=>b.classList.toggle('on',b===d));return}
   const t=ev.target.closest('[data-k]');
   if(t){
    const k=t.dataset.k,on=!t.classList.contains('on');
    setCfg({[k]:on});t.classList.toggle('on',on);t.setAttribute('aria-checked',String(on));
    if(k==='glassOn')D.body.classList.toggle('noglass',!on);
   }
  };
 });
};

/* ---------- Get the app (website only) is handled in kfix.js through #kdl-b ---------- */

mark();avDraw();
addEventListener('hashchange',()=>{mark();avDraw()});
setInterval(avDraw,2500);
})();
