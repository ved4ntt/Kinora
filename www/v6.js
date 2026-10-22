/* Kinora v6: grouped settings hub, landscape player, gestures, empty-state helper */
(()=>{
const D=document,root=D.documentElement,Q=s=>D.querySelector(s),A=()=>D.getElementById('app');
const MOB=matchMedia('(max-width:820px)').matches||matchMedia('(pointer:coarse)').matches;
const S=()=>LS.get('cfg',{});
const say=m=>{try{toast(m)}catch{}};
const q4=n=>n>=2160?'4K':n+'p';
const BUNDLED=['https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json','https://cyberflix.elfhosted.com/manifest.json','https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json'];
async function install(){for(const u of BUNDLED){if(addons.some(a=>a.url===u))continue;await addAddon(u).catch(()=>{})}}
function look(){const c=S();root.style.setProperty('--bl',(c.glass??30)+'px');root.classList.toggle('calm',!!c.calm)}
const set=(k,v)=>{LS.set('cfg',{...S(),[k]:v});try{applyCfg()}catch{}look()};
look();

/* ---- settings hub ---- */
const P={user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',plug:'<path d="M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3"/>',play:'<path d="M8 5l11 7-11 7z"/>',phone:'<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',all:'<path d="M4 7h16M4 12h16M4 17h10"/>'};
const ic=n=>`<svg viewBox="0 0 24 24">${P[n]}</svg>`,CV='<svg class="cv" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
const row=(i,t,s,go)=>`<button class="k6r" data-go="${go}"><i>${ic(i)}</i><span><b>${t}</b><small>${s}</small></span>${CV}</button>`;
const sec=(h,r)=>`<h4 class="k6h">${h}</h4><div class="k6c">${r}</div>`;
const chips=(k,o,cur)=>`<div class="k6ch">${o.map(([v,t])=>`<button class="ch${String(cur)===String(v)?' on':''}" data-set="${k}" data-v="${v}">${t}</button>`).join('')}</div>`;
const opt=(t,s,c)=>`<div class="k6o"><span><b>${t}</b><small>${s}</small></span>${c}</div>`;
const tg=(k,on)=>`<button class="k6t${on?' on':''}" data-tg="${k}" aria-label="toggle"></button>`;
const shell=(t,b,back)=>{A().innerHTML=`<div class="page k6">${back?'<button class="k6bk" data-go="hub"><svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M15 5l-7 7 7 7"/></svg>Settings</button>':''}<h1>${t}</h1>${b}</div>`;scrollTo(0,0)};
const mx=()=>LS.get('maxq',0);
const RECS=[['The Movie Database','Metadata, catalogs and search from TMDB','https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json'],['TMDB Collections','Movie series grouped together','https://61ab9c85a149-tmdb-collections.baby-beamup.club/manifest.json'],['Cinemeta','Official Stremio catalogs and metadata','https://v3-cinemeta.strem.io/manifest.json'],['OpenSubtitles','Subtitles in many languages','https://opensubtitles-v3.strem.io/manifest.json']];
const has=u=>addons.some(a=>a.url===u);
const PAGES={
 hub:()=>shell('Settings',
  sec('Account',row('user','Profile & account','Sign in, cloud sync, avatar and add-ons','classic'))+
  sec('General',row('grid','Look & feel','Glass intensity and motion','look')+row('plug','Content & discovery','Plugins, add-ons and sources','content')+row('play','Playback','Quality, subtitles, gestures and speed','play')+row('phone','This device','Detected quality, resets and history','dev'))+
  sec('More',row('all','All settings','The full classic settings list','classic')+row('info','About Kinora','Version and tips','about')),0),
 look:()=>{const c=S();shell('Look & feel',sec('Glass',opt('Glass intensity','How strong the blur behind panels is',chips('glass',[[14,'Soft'],[30,'Normal'],[46,'Rich']],c.glass??30)))+sec('Motion',opt('Calm mode','Turns off animations and transitions',tg('calm',c.calm))),1)},
 content:()=>{const l=addons.map(a=>`<div class="k6o"><span><b>${(a.name||(a.manifest&&a.manifest.name)||'Add-on').toString().replace(/</g,'')}</b><small>${String(a.url||'').replace(/</g,'')}</small></span></div>`).join('')||opt('Nothing installed yet','Install the bundled plugins or paste your own link','');
  shell('Content & discovery',sec('Bundled',opt('Pre-installed plugins','Adds the catalogs and sources that ship with Kinora','<button class="btn p" data-act="inst">Install</button>'))+sec('Recommended',RECS.map((r,i)=>`<div class="k6o"><span><b>${r[0]}</b><small>${r[1]}</small></span>${has(r[2])?'<small>Installed</small>':`<button class="btn" data-rec="${i}">Install</button>`}</div>`).join(''))+sec('Add your own',`<div class="k6in"><input id="k6u" placeholder="Paste a manifest link" autocapitalize="off" spellcheck="false"><button class="btn p" data-act="add">Add</button></div>`)+sec('Installed',l),1)},
 play:()=>{const c=S();shell('Playback',
  sec('Quality',opt('Preferred quality',mx()?`This device plays up to ${q4(mx())} smoothly`:'Used when picking a source automatically',chips('quality',[['best','Best'],[2160,'4K'],[1080,'1080p'],[720,'720p'],[480,'480p']],c.quality||'best')))+
  sec('Starting',opt('Auto-pick a source','Play opens the player straight away',tg('autoPlay',c.autoPlay!==false))+opt('Subtitles on by default','',tg('autosub',!!c.autosub))+opt('Peer-to-peer streaming','Allow torrent streams. Turn off to hide them from source lists',tg('p2p',c.p2p!==false)))+
  sec('Controls',opt('Double-tap skip','Double-tap the left or right side of the video',chips('skip',[[5,'5s'],[10,'10s'],[15,'15s'],[30,'30s']],c.skip||10))+opt('Hold for 2× speed','Press and hold on the video (touch screens)',tg('hold2x',c.hold2x!==false))),1)},
 dev:()=>shell('This device',sec('Detected',opt('Smooth playback up to',mx()?q4(mx()):'Not measured yet','')+opt('Settings on this device','Quality and play choices are stored per device',''))+sec('Reset',`<button class="k6r" data-act="onb"><span><b>Show the welcome popup again</b><small>Re-choose quality and plugins</small></span></button><button class="k6r" data-act="prog"><span><b>Clear continue watching</b><small>Removes saved watch progress on this device</small></span></button>`),1),
 about:()=>shell('About',sec('Kinora',opt('Tips','Double-tap the video to skip, hold to speed up, and press back to close panels step by step.','')+opt('Streams','Playing needs at least one add-on that provides streams. Add one under Content & discovery.','')),1)
};
window.K6={PAGES,shell,sec,opt,row,chips,tg,P,RECS,has,addons:()=>addons};
const classic=V.settings;
function open(n,push){
 if(n==='classic'){push&&history.pushState({k6:n},'');classic.call(V);return}
 push&&history.pushState({k6:n},'');(PAGES[n]||PAGES.hub)();
}
V.settings=function(){PAGES.hub()};
addEventListener('popstate',e=>{if(/settings/.test(location.hash)){const n=e.state&&e.state.k6;n&&n!=='hub'?open(n,0):PAGES.hub()}});
D.addEventListener('click',async e=>{
 const g=e.target.closest('[data-go]');
 if(g&&g.closest('.k6')){const n=g.dataset.go;if(n==='hub'){history.back();return}open(n,1);return}
 const s=e.target.closest('[data-set]');
 if(s&&s.closest('.k6')){const v=s.dataset.v;set(s.dataset.set,isNaN(v)?v:+v);s.parentNode.querySelectorAll('.ch').forEach(x=>x.classList.toggle('on',x===s));
  if(s.dataset.set==='quality'&&mx()&&+v>mx())say(`This device plays up to ${q4(mx())} smoothly. Higher may stutter.`);return}
 const t=e.target.closest('[data-tg]');
 if(t&&t.closest('.k6')){const on=!t.classList.contains('on');t.classList.toggle('on',on);set(t.dataset.tg,on);return}
 const a=e.target.closest('[data-act]');
 if(a&&a.closest('.k6')){
  const k=a.dataset.act;
  if(k==='inst'){a.textContent='Installing…';await install();say('Plugins installed');PAGES.content()}
  if(k==='add'){const u=(Q('#k6u').value||'').trim();if(!u)return;a.textContent='Adding…';try{await addAddon(u);say('Add-on added')}catch{say('Could not add that link')}PAGES.content()}
  if(k==='onb'){LS.set('onb',0);say('The welcome popup will show next time you open Kinora')}
  if(k==='prog'){LS.set('prog',{});say('Continue watching cleared')}
  return;
 }
 const r=e.target.closest('[data-rec]');
 if(r&&r.closest('.k6')){r.textContent='Adding…';try{await addAddon(RECS[+r.dataset.rec][2]);say('Add-on installed')}catch{say('Could not install that add-on')}PAGES.content();return}
 const f=e.target.closest('[data-k6]');
 if(f){if(f.dataset.k6==='inst'){f.textContent='Installing…';await install();say('Installed. Go back and press Play again.');f.textContent='Installed'}else location.hash='#/settings'}
});

/* ---- player: landscape on phones, gestures, helpful empty state ---- */
const nat=window.KinoraNative;
function orient(on){try{if(nat)nat.orient(on?'land':'auto');else if(screen.orientation&&screen.orientation.lock){on?screen.orientation.lock('landscape').catch(()=>{}):screen.orientation.unlock()}}catch{}}
function wire(pl){
 pl.insertAdjacentHTML('beforeend','<div id="k6s"></div><div id="k6x">2× speed</div>');
 const vid=()=>Q('#pl video'),flash=(t,side)=>{const s=Q('#k6s');s.className=side;s.textContent=t;void s.offsetWidth;s.classList.add('go')};
 let lt=0,lx=0,ht=null,was=1;
 pl.addEventListener('touchend',e=>{
  clearTimeout(ht);const x=Q('#k6x'),v=vid();
  if(x&&x.classList.contains('on')&&v){v.playbackRate=was;x.classList.remove('on')}
  if(e.target.closest('button,#sk,#mn,input,.k6fix'))return;
  const t=e.changedTouches[0],now=Date.now(),f=t.clientX/innerWidth;
  if(now-lt<300&&Math.abs(t.clientX-lx)<90&&v){
   const k=+S().skip||10;
   if(f<.35){v.currentTime=Math.max(0,v.currentTime-k);flash('−'+k+'s','l')}
   else if(f>.65){v.currentTime=Math.min(v.duration||1e9,v.currentTime+k);flash('+'+k+'s','r')}
   else v.paused?v.play():v.pause();
   lt=0;e.preventDefault();return;
  }
  lt=now;lx=t.clientX;
 },{passive:false});
 pl.addEventListener('touchstart',e=>{
  if(S().hold2x===false||e.target.closest('button,#sk,#mn,input,.k6fix'))return;
  ht=setTimeout(()=>{const v=vid();if(v&&!v.paused){was=v.playbackRate;v.playbackRate=2;Q('#k6x').classList.add('on')}},450);
 },{passive:true});
 pl.addEventListener('touchmove',()=>clearTimeout(ht),{passive:true});
}
function empty(pl){
 if(pl.querySelector('.k6fix'))return;
 const el=[...pl.querySelectorAll('*')].find(n=>!n.children.length&&/No source can provide streams/i.test(n.textContent));
 if(el)el.insertAdjacentHTML('afterend','<div class="k6fix"><button class="btn p" data-k6="inst">Install bundled plugins</button><button class="btn" data-k6="set">Open settings</button></div>');
}
let inPl=false;
new MutationObserver(()=>{
 const pl=Q('#pl'),has=!!pl;
 if(has!==inPl){inPl=has;if(MOB)orient(has)}
 if(pl){if(!pl.dataset.g){pl.dataset.g=1;if(MOB)wire(pl)}empty(pl)}
}).observe(A(),{childList:true,subtree:true});
})();
