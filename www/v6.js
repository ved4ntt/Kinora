/* Kinora settings: grouped pages, add-on manager, plugins, stream options, data */
(()=>{
const D=document,Q=s=>D.querySelector(s),A=()=>D.getElementById('app');
const say=m=>{try{toast(m)}catch{}};
const q4=n=>n>=2160?'4K':n+'p';
const mx=()=>LS.get('maxq',0);
const MOB=matchMedia('(max-width:820px)').matches||matchMedia('(pointer:coarse)').matches;

/* ---------- small UI helpers ---------- */
const IC={
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 plug:'<path d="M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3"/>',
 play:'<path d="M8 5l11 7-11 7z"/>',
 cc:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 phone:'<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
 srv:'<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>'
};
const ic=n=>`<svg viewBox="0 0 24 24">${IC[n]}</svg>`;
const CV='<svg class="cv" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
const row=(i,t,s,go)=>`<button class="k6r" data-go="${go}"><i>${ic(i)}</i><span><b>${t}</b><small>${s}</small></span>${CV}</button>`;
const sec=(hd,r)=>`<h4 class="k6h">${hd}</h4><div class="k6c">${r}</div>`;
const chips=(k,o,cur)=>`<div class="k6ch">${o.map(([v,t])=>`<button class="ch${String(cur)===String(v)?' on':''}" data-set="${k}" data-v="${v}">${t}</button>`).join('')}</div>`;
const opt=(t,s,c)=>`<div class="k6o"><span><b>${t}</b><small>${s||''}</small></span>${c||''}</div>`;
const tg=(k,on)=>`<button class="k6t${on?' on':''}" data-tg="${k}" role="switch" aria-checked="${!!on}" aria-label="toggle"></button>`;
const note=t=>`<div class="k8n">${t}</div>`;
const inp=(id,ph,btn,act,type)=>`<div class="k6in"><input id="${id}" type="${type||'text'}" placeholder="${ph}" autocapitalize="off" autocomplete="off" spellcheck="false"><button class="btn p" data-v6="${act}">${btn}</button></div>`;
const shell=(t,b,back)=>{A().innerHTML=`<div class="page k6">${back?'<button class="k6bk" data-go="hub"><svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M15 5l-7 7 7 7"/></svg>Settings</button>':''}<h1>${t}</h1>${b}</div>`;scrollTo(0,0)};
const look=()=>{const c=CFG();document.documentElement.style.setProperty('--bl',(c.glass||30)+'px')};
const set=(k,v)=>{setCfg({[k]:v});look()};
look();
const touch=()=>{LS.set('addons',addons);cache.clear()};
const RECS=[
 ['The Movie Database','Metadata, catalogs and search from TMDB','https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json'],
 ['TMDB Collections','Movie series grouped together','https://61ab9c85a149-tmdb-collections.baby-beamup.club/manifest.json'],
 ['OpenSubtitles','Subtitles in many languages','https://opensubtitles-v3.strem.io/manifest.json'],
 ['Cyberflix Catalog','Streaming-service catalogs (titles only)','https://cyberflix.elfhosted.com/manifest.json'],
 ['Streaming Catalogs','Trending on streaming services (titles only)','https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json']
];
const has2=u=>addons.some(a=>a.url===u);
const errMsg=x=>/already|valid|http|Enter/.test(x.message||'')?x.message:'Could not reach this add-on right now';
const APP=document.documentElement.classList.contains('app');
const LANGS=['English','Hindi','Spanish','French','German','Portuguese','Italian','Arabic','Japanese','Korean','Chinese','Russian','Turkish'];

/* ---------- pages ---------- */
const PAGES={
 hub:()=>shell('Settings',
  sec('Account',row('user','Edit profile',h(LS.get('me','')||'Name, avatar, sign in and cloud sync'),'profile'))+
  sec('General',row('grid','Look & feel','Banner, previews and glass','look')+row('plug','Content & discovery','Add-ons'+(APP?' and plugins':''),'content')+row('play','Playback','Quality, speed, buffering and controls','play')+row('cc','Subtitles','Language and style','subs')+row('list','Stream options','Filter and sort the sources you see','streams')+row('link','Integrations','TMDB key for cast and plugins','integ')+row('phone','Data & device','Backup, history and playback server','data'))+
  sec('More',row('info','About & licenses','Credits and attribution','about')),0),

 look:()=>{const c=CFG();shell('Look & feel',
  sec('Home',opt('Auto-change banner','Rotate the home banner automatically',tg('hero',c.hero))+opt('Hide adult titles','Remove titles marked E from posters and the banner',tg('hideAdult',c.hideAdult)))+
  sec('Posters',opt('Hover previews','Show a larger preview when you hold the pointer on a poster',tg('hover',c.hover))+opt('Preview delay','How long to hold before the preview opens',chips('hdelay',[[400,'Fast'],[650,'Normal'],[1000,'Slow']],c.hdelay)))+
  sec('Style',opt('Glass strength','How strong the blur behind panels is',chips('glass',[[14,'Soft'],[30,'Normal'],[46,'Rich']],c.glass||30))+opt('Reduce animations','Turn off most motion effects',tg('reduce',c.reduce))),1)},

 content:()=>shell('Content & discovery',sec('Sources',row('plug','Add-ons','Install, remove, refresh, configure and sort your sources','addons')+(APP?row('grid','Plugins','Add plugin repositories and choose providers','plugins'):'')),1),

 addons:()=>{
  const rows=addons.map((a,i)=>{
   const m=a.manifest||{},res=[...new Set((m.resources||[]).map(r=>r.name||r))].join(', ');
   const cfgb=m.behaviorHints&&m.behaviorHints.configurable?`<button class="btn" data-v6="cfg" data-i="${i}">Configure</button>`:'';
   return `<div class="k6o">${m.logo?`<img class="k8l" loading="lazy" referrerpolicy="no-referrer" src="${h(m.logo)}" alt="">`:''}<span><b>${h(m.name||'Add-on')}</b><small>v${h(m.version||'')} · ${h(res)}</small><small>${h((m.description||'').slice(0,140))}</small></span><div class="k8b"><button class="btn" data-v6="up" data-i="${i}" aria-label="Move up">↑</button><button class="btn" data-v6="dn" data-i="${i}" aria-label="Move down">↓</button>${cfgb}<button class="btn" data-v6="rf" data-i="${i}">Refresh</button>${a.core?'<small>Built in</small>':`<button class="btn" data-v6="rm" data-i="${i}">Remove</button>`}</div></div>`;
  }).join('');
  const rec=RECS.map((r,i)=>`<div class="k6o"><span><b>${h(r[0])}</b><small>${h(r[1])}</small></span>${has2(r[2])?'<small>Installed</small>':`<button class="btn" data-v6="arec" data-i="${i}">Install</button>`}</div>`).join('');
  shell('Add-ons',sec(`Installed (${addons.length})`,rows)+sec('Add an add-on',inp('k6a','Paste an add-on link','Install','aadd')+note('Sources are add-ons that provide streams, subtitles and catalogs. Only add sources for content you have the right to watch.'))+sec('Recommended',rec),1);
 },

 plugins:()=>{
  const P=KPlug.load();
  const repos=P.repos.map((r,i)=>`<div class="k6o"><span><b>${h(r.name)}</b><small>${r.scrapers.filter(s=>s.on).length} of ${r.scrapers.length} providers on</small></span><div class="k8b"><button class="btn" data-v6="ron" data-r="${i}">All on</button><button class="btn" data-v6="roff" data-r="${i}">All off</button><button class="btn" data-v6="rrf" data-r="${i}">Refresh</button><button class="btn" data-v6="rrm" data-r="${i}">Remove</button></div></div>`).join('')||opt('No repositories yet','Paste a repository link below');
  const list=P.repos.map((r,i)=>r.scrapers.map((s,j)=>`<div class="k6o k8s${s.on?'':' off'}" data-q="${h((s.name+' '+s.desc+' '+(s.langs||[]).join(' ')).toLowerCase())}">${s.logo?`<img class="k8l" loading="lazy" referrerpolicy="no-referrer" src="${h(s.logo)}" alt="">`:''}<span><b>${h(s.name)}</b><small>${h(s.desc)}${s.langs&&s.langs.length?' · '+h(s.langs.join(', ')):''}</small></span><button class="k6t${s.on?' on':''}" data-v6="stg" data-r="${i}" data-s="${j}" aria-label="toggle"></button></div>`).join('')).join('');
  shell('Plugins',
   note('Plugins are code written by other people. They run on your device in an isolated sandbox and need a free TMDB key (Settings > Integrations). Only add repositories you trust, and only use them for content you have the right to watch.')+
   sec('Repositories',repos)+sec('Add a repository',inp('k6r','Paste a repository link','Add','radd'))+
   (list?sec('Providers',`<div class="k6in"><input id="k6q" placeholder="Search providers" autocapitalize="off" spellcheck="false"></div>${list}`):''),1);
 },

 play:()=>{const c=CFG();shell('Playback',
  sec('Quality',opt('Preferred quality',mx()?`This device plays up to ${q4(mx())} smoothly`:'Used when a source is picked for you',chips('quality',[['best','Best'],[2160,'4K'],[1080,'1080p'],[720,'720p'],[480,'480p']],c.quality))+opt('Buffer size','Bigger buffers play more smoothly on slow or unstable connections',chips('buf',[[30,'Normal'],[60,'Large'],[120,'Max']],c.buf||60))+opt('Switch source if it keeps stalling','Moves to the next source after a long stall and keeps your place',tg('autoSwitch',c.autoSwitch!==false)))+
  sec('Starting',opt('Play without choosing a source','Start straight away with the best matching source',tg('autoPlay',c.autoPlay))+opt('Resume where you left off','Start from your last position',tg('resume',c.resume))+opt('Play next episode automatically','Continue to the next episode when one ends',tg('autonext',c.autonext)))+
  sec('Controls',opt('Skip length','Seconds for the skip buttons and double-tap',chips('skip',[[5,'5s'],[10,'10s'],[15,'15s'],[30,'30s']],c.skip))+opt('Default speed','Playback speed when a video starts',chips('speed',[[.75,'0.75×'],[1,'1×'],[1.25,'1.25×'],[1.5,'1.5×']],c.speed))+opt('Show time remaining','Show the time left instead of the time played',tg('rem',c.rem))+(MOB?opt('Hold for 2× speed','Press and hold on the video',tg('hold2x',c.hold2x!==false)):''))+
  sec('Peer-to-peer',opt('Allow torrent streams','Turn off to hide torrent-only sources from every list',tg('p2p',c.p2p!==false))),1)},

 subs:()=>{const c=CFG();shell('Subtitles',
  sec('Language',opt('Turn on subtitles automatically','Pick a track in your preferred language when one is available',tg('autosub',c.autosub))+opt('Preferred language','',`<select class="k6s" id="k6sl">${LANGS.map(x=>`<option${c.sublang===x?' selected':''}>${x}</option>`).join('')}</select>`))+
  sec('Style',`<button class="k6r" data-v6="subreset"><span><b>Reset subtitle style</b><small>Size, colour and font go back to the defaults</small></span></button>`),1)},

 streams:()=>{const c=CFG();shell('Stream options',
  sec('Hide',opt('Minimum quality','Streams below this are hidden (unknown quality stays)',chips('sMin',[[0,'Any'],[480,'480p'],[720,'720p'],[1080,'1080p'],[2160,'4K']],c.sMin||0))+opt('Hide cam and telesync','Removes low-quality theatre recordings',tg('sNoCam',c.sNoCam!==false)))+
  sec('Order',opt('Preferred language','Streams mentioning it come first',chips('sLang',[['any','Any'],['english','English'],['hindi','Hindi'],['tamil','Tamil'],['telugu','Telugu'],['french','French'],['japanese','Japanese']],c.sLang||'any'))+opt('Direct links first','Puts torrent streams after direct ones',tg('sDirect',!!c.sDirect)))+
  sec('Limit',opt('Most sources shown per add-on','Keeps long lists short',chips('sMax',[[10,'10'],[25,'25'],[50,'50'],[0,'All']],c.sMax||0))),1)},

 integ:()=>{const k=LS.get('tmdbKey','');shell('Integrations',
  sec('TMDB',note('Used for a fuller cast list on title pages and by plugins to find your title. Get a free key at themoviedb.org (Settings > API).')+inp('k6k',k?'Key saved. Paste a new one to replace it':'Paste your TMDB API key','Save','key','password')+(k?`<button class="k6r" data-v6="keyrm"><span><b>Remove saved key</b><small>Plugins and the extra cast will stop working</small></span></button>`:'')),1)},

 data:()=>shell('Data & device',
  sec('This device',opt('Smooth playback up to',mx()?q4(mx()):'Not measured yet')+opt('Settings','Quality and play choices are stored on this device only')+`<button class="k6r" data-v6="onb"><span><b>Show the welcome popup again</b><small>Re-choose quality and add-ons</small></span></button>`)+
  sec('Backup',`<button class="k6r" data-v6="ex"><span><b>Export backup</b><small>Add-ons, library, reactions, history and settings</small></span></button><label class="k6r"><span><b>Import backup</b><small>Restore from a backup file</small></span><input type="file" id="k6im" accept=".json" hidden></label>`)+
  sec('Clean up',`<button class="k6r" data-v6="clh"><span><b>Clear watch history</b><small>Removes saved watch progress</small></span></button><button class="k6r" data-v6="clc"><span><b>Clear cached catalogs</b><small>Reloads home rows next time</small></span></button>`)+
  sec('Advanced',row('srv','Playback server','Optional server that makes more streams playable','server')),1),

 server:()=>{const s=srvCfg();shell('Playback server',
  note('Optional. A small server that makes streams playable (fixes many "cannot play" errors). The Windows app has one built in.')+
  sec('Server',`<div class="k6in"><input id="k6su" placeholder="https://your-server.example.com" value="${h(s.url||'')}" autocapitalize="off" spellcheck="false"></div><div class="k6in"><input id="k6sk" type="password" placeholder="Server key" value="${h(s.key||'')}"></div><div class="k6in"><button class="btn p" data-v6="srvsave">Save</button><button class="btn" data-v6="srvtest">Test connection</button></div>`),1)},

 about:()=>shell('About & licenses',
  sec('Kinora',opt('Add-ons and plugins','Third-party add-ons and plugins are made by other people. Kinora does not host or control what they offer.'))+
  sec('Data & services',opt('The Movie Database (TMDB)','This product uses the TMDB API but is not endorsed or certified by TMDB. https://www.themoviedb.org')),1)
};
window.K6={PAGES};
V.settings=function(){PAGES.hub()};

/* ---------- navigation: sub pages are history entries, so back goes up one level ---------- */
function open(n,push){
 if(n==='profile'){location.hash='#/profile';return}
 if(push)history.pushState({k6:n},'');
 (PAGES[n]||PAGES.hub)();
}
addEventListener('popstate',e=>{if(/settings/.test(location.hash)){const n=e.state&&e.state.k6;n&&n!=='hub'?open(n,0):PAGES.hub()}});

/* ---------- actions ---------- */
D.addEventListener('input',e=>{
 if(e.target.id!=='k6q')return;
 const q=e.target.value.trim().toLowerCase();
 D.querySelectorAll('.k8s').forEach(r=>{r.style.display=!q||r.dataset.q.includes(q)?'':'none'});
});
D.addEventListener('change',async e=>{
 if(e.target.id==='k6sl'){setCfg({sublang:e.target.value});return}
 if(e.target.id==='k6im'){
  try{const d=JSON.parse(await e.target.files[0].text());for(const u of d.addons||[])await addAddon(u).catch(()=>{});['lib','st','ew','cfg','sub','prog'].forEach(k=>{if(d[k])LS.set(k,d[k])});applyCfg();look();cache.clear();say('Backup restored');PAGES.data()}catch{say('That file is not a valid backup')}
 }
});
D.addEventListener('click',async e=>{
 const g=e.target.closest('[data-go]');
 if(g&&g.closest('.k6')){const n=g.dataset.go;if(n==='hub'){history.back();return}open(n,1);return}
 const s=e.target.closest('[data-set]');
 if(s&&s.closest('.k6')){const v=s.dataset.v;set(s.dataset.set,isNaN(v)||v===''?v:+v);s.parentNode.querySelectorAll('.ch').forEach(x=>x.classList.toggle('on',x===s));
  if(s.dataset.set==='quality'&&mx()&&+v>mx())say(`This device plays up to ${q4(mx())} smoothly. Higher may stutter.`);return}
 const t=e.target.closest('[data-tg]');
 if(t&&t.closest('.k6')){const on=!t.classList.contains('on');t.classList.toggle('on',on);t.setAttribute('aria-checked',on);set(t.dataset.tg,on);return}
 const b=e.target.closest('[data-v6]');
 if(!b||!b.closest('.k6'))return;
 const a=b.dataset.v6,i=+b.dataset.i,n=addons.length;
 try{
  if(a==='up'||a==='dn'){const j=a==='up'?i-1:i+1;if(j<0||j>=n)return;[addons[i],addons[j]]=[addons[j],addons[i]];touch();PAGES.addons()}
  else if(a==='rm'){addons.splice(i,1);touch();PAGES.addons()}
  else if(a==='rf'){const x=addons[i];cache.delete(x.url);x.manifest=await getJSON(x.url);touch();say('Refreshed');PAGES.addons()}
  else if(a==='cfg'){open_(bs(addons[i].url)+'/configure')}
  else if(a==='aadd'){const u=(Q('#k6a').value||'').trim();if(!u)return;b.textContent='Installing…';try{const m=await addAddon(u);cache.clear();say('Installed '+m.name)}catch(x){say(errMsg(x))}PAGES.addons()}
  else if(a==='arec'){b.textContent='Installing…';try{const m=await addAddon(RECS[i][2]);cache.clear();say('Installed '+m.name)}catch(x){say(errMsg(x))}PAGES.addons()}
  else if(a==='radd'){const u=(Q('#k6r').value||'').trim();if(!u)return;b.textContent='Adding…';try{await KPlug.add(u);say('Repository added')}catch(x){say(x.message||'Could not add that link')}PAGES.plugins()}
  else if(a==='rrf'){try{await KPlug.add(KPlug.load().repos[+b.dataset.r].url);say('Repository refreshed')}catch{say('Could not refresh')}PAGES.plugins()}
  else if(a==='rrm'){const P=KPlug.load();P.repos.splice(+b.dataset.r,1);KPlug.save(P);if(!P.repos.length){const k=addons.findIndex(x=>x.url===KPlug.VURL);if(k>=0){addons.splice(k,1);touch()}}PAGES.plugins()}
  else if(a==='ron'||a==='roff'){const P=KPlug.load();P.repos[+b.dataset.r].scrapers.forEach(s=>s.on=a==='ron');KPlug.save(P);PAGES.plugins()}
  else if(a==='stg'){const P=KPlug.load(),s=P.repos[+b.dataset.r].scrapers[+b.dataset.s];s.on=!s.on;KPlug.save(P);b.classList.toggle('on',s.on);b.closest('.k8s').classList.toggle('off',!s.on)}
  else if(a==='key'){const v=(Q('#k6k').value||'').trim();if(!v)return;LS.set('tmdbKey',v);say('TMDB key saved');PAGES.integ()}
  else if(a==='keyrm'){LS.set('tmdbKey','');say('TMDB key removed');PAGES.integ()}
  else if(a==='subreset'){LS.set('sub',{});say('Subtitle style reset')}
  else if(a==='onb'){LS.set('onb',0);say('The welcome popup will show next time you open Kinora')}
  else if(a==='clh'){LS.set('prog',{});say('Watch history cleared')}
  else if(a==='clc'){Object.keys(localStorage).filter(x=>x.startsWith('c:')).forEach(x=>localStorage.removeItem(x));cache.clear();say('Catalog cache cleared')}
  else if(a==='ex'){const bl=new Blob([JSON.stringify({addons:addons.filter(x=>!x.core).map(x=>x.url),lib:LS.get('lib',{}),st:ST(),ew:EW(),cfg:LS.get('cfg',{}),sub:LS.get('sub',{}),prog:LS.get('prog',{})})],{type:'application/json'});const l=D.createElement('a');l.href=URL.createObjectURL(bl);l.download='kinora-backup.json';l.click()}
  else if(a==='srvsave'){LS.set('srv',{url:Q('#k6su').value.trim().replace(/\/$/,''),key:Q('#k6sk').value.trim()});say('Playback server saved')}
  else if(a==='srvtest'){const u=Q('#k6su').value.trim().replace(/\/$/,''),k=Q('#k6sk').value.trim();try{const r=await fetch(`${u}/health?k=${encodeURIComponent(k)}`);say(r.ok?'Server is working':r.status===401?'Wrong server key':'Server answered with an error')}catch{say('Could not reach the server')}}
 }catch(x){say('Something went wrong')}
});
const open_=u=>window.open(u,'_blank','noopener');
})();
