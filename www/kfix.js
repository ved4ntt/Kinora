/* Kinora fixes and extras:
   - built-in sources: CNCVerse (it carries 4KHDHub, tried first), HdHub and PenguPlay. They are installed instantly (the last answer of each is remembered)
     and refreshed in the background, so opening the app never waits for them.
   - lets you switch any add-on off
   - Explore page (phones), custom dropdowns instead of the default ones, the Download popup on the website
   The dock is in kdock.js, the player is in kplay.js. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const AND=!!((window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())||window.KinoraNative);
const WINAPP=!!window.kinoraWin,APP=AND||WINAPP;
const REPO='ved4ntt/Kinora';
const CNC='https://cncverse.dpdns.org/u/p_w0jrtfw7ec3d/manifest.json';
const HDHUB='https://hdhub.thevolecitor.qzz.io/eyJ0b3Jib3giOiJ1bnNldCIsInF1YWxpdGllcyI6IjIxNjBwLDEwODBwLDcyMHAiLCJzb3J0IjoiZGVzYyIsImNhdGFsb2dzIjoiZmVhdHVyZWQscG9wdWxhciJ9/manifest.json';
const PENGU='https://pengu.uk/%7B%22auth_token%22%3A%226n1cvjm-3s2k6ZUZw2xbdmX6WP_7QnmOQ8KJSuFbic8%22%7D/manifest.json';
const SRC=[[CNC,'cncverse','CNCVerse'],[HDHUB,'hdhub','HdHub'],[PENGU,'pengu','PenguPlay']];
const STUB=(id,name)=>({id,version:'1.0.0',name,description:name+' streams',resources:['stream','subtitles'],types:['movie','series'],idPrefixes:['tt','tmdb:']});
const withT=(p,ms)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(Error('timeout')),ms))]);

/* ================= built-in sources ================= */
function ensure(url,id,name){
 let a=addons.find(x=>x.url===url);
 if(!a){a={url,manifest:LS.get('kman:'+url,null)||STUB(id,name),core:1,kin:1};addons.push(a)}
 a.core=1;a.kin=1;
 return a;
}
function refresh(a){
 withT(getJSON(a.url),12000).then(m=>{
  if(m&&m.name&&m.resources){a.manifest=m;try{LS.set('kman:'+a.url,m)}catch{}LS.set('addons',addons)}
 }).catch(()=>{});
}
function installSources(){
 try{
  const mine=SRC.map(([u,i,n])=>ensure(u,i,n));
  /* all three are used. They are switched on once (you can still switch any of them off in Settings > Add-ons). */
  if(!LS.get('khd3',0)){mine.forEach(a=>{a.off=false});LS.set('khd3',1)}
  addons=addons.filter(a=>!mine.includes(a));
  /* CNCVerse (4KHDHub) first, then HdHub, then PenguPlay, in front of every other source */
  const at=addons.findIndex(a=>(a.manifest&&(a.manifest.resources||[]).some(r=>(r.name||r)==='stream')));
  addons.splice(at<0?addons.length:at,0,...mine);
  LS.set('addons',addons);
  setTimeout(()=>mine.forEach(refresh),1500);
 }catch{}
}
{const b0=window.boot;window.boot=async()=>{installSources();return b0()}}

/* ================= switch add-ons on and off ================= */
if(window.K6&&K6.PAGES&&K6.PAGES.addons){
 const pa=K6.PAGES.addons;
 K6.PAGES.addons=()=>{
  pa();
  QA('.k8b').forEach(b=>{
   const up=Q('[data-v6="up"]',b);if(!up)return;
   const i=+up.dataset.i,a=addons[i];if(!a)return;
   b.insertAdjacentHTML('afterbegin','<button class="k6t'+(a.off?'':' on')+'" data-ktg="'+i+'" role="switch" aria-checked="'+(!a.off)+'" aria-label="Switch on or off"></button>');
   if(a.off){const r=b.closest('.k6o');if(r)r.classList.add('koff')}
  });
 };
}
D.addEventListener('click',e=>{
 const b=e.target.closest&&e.target.closest('[data-ktg]');if(!b)return;
 const a=addons[+b.dataset.ktg];if(!a)return;
 a.off=!a.off;LS.set('addons',addons);try{cache.clear()}catch{}
 if(window.K6&&K6.PAGES.addons)K6.PAGES.addons();
});

/* ================= Explore (phones) and the tiles on the Search page ================= */
const TI={movie:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/>',tv:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',anime:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',live:'<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>'};
window.KExploreTiles=()=>'<h2 class="kg-t" style="margin-top:22px">Browse</h2><div class="kxg">'+[['discover/movie','movie','Movies','Films from every genre'],['discover/series','tv','Series','Shows and seasons'],['discover/anime','anime','Anime','Airing now and all-time favourites'],['live','live','Live TV','Channels from your sources']].map(t=>'<a class="kxt" href="#/'+t[0]+'"><i><svg viewBox="0 0 24 24">'+TI[t[1]]+'</svg></i><b>'+t[2]+'</b><small>'+t[3]+'</small></a>').join('')+'</div>';
V.explore=async function(){
 app.innerHTML='<div class="page kxp2"><h1>Explore</h1><a class="kxs" href="#/search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>Search movies, series and anime</a>'+KExploreTiles()+'</div>';
};

/* ================= custom dropdowns (instead of the default ones) ================= */
function sheet(sel){
 const old=Q('#kdsheet');if(old)old.remove();
 const w=D.createElement('div');w.id='kdsheet';
 const opts=[...sel.options];
 w.innerHTML='<div class="kdbg"></div><div class="kdbox"><div class="kdlist">'+opts.map((o,i)=>'<button type="button" class="kdo'+(o.selected?' on':'')+'" data-i="'+i+'">'+h(o.text)+'</button>').join('')+'</div></div>';
 D.body.append(w);
 requestAnimationFrame(()=>w.classList.add('on'));
 const close=()=>{w.classList.remove('on');setTimeout(()=>w.remove(),200)};
 w.onclick=e=>{
  const o=e.target.closest('.kdo');
  if(o){sel.selectedIndex=+o.dataset.i;sel.dispatchEvent(new Event('change',{bubbles:true}));const b=sel.nextElementSibling;if(b&&b.classList.contains('kdsel'))b.querySelector('span').textContent=sel.options[sel.selectedIndex].text;close()}
  else if(e.target.classList.contains('kdbg'))close();
 };
 const on=Q('.kdo.on',w);if(on)setTimeout(()=>on.scrollIntoView({block:'center'}),30);
}
function enhance(){
 QA('select:not([data-kd])').forEach(s=>{
  if(s.closest('.kdd')||s.multiple)return;
  s.dataset.kd=1;s.style.display='none';
  const b=D.createElement('button');b.type='button';b.className='kdsel';
  b.innerHTML='<span>'+h((s.options[s.selectedIndex]||{}).text||'')+'</span><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
  b.onclick=()=>sheet(s);
  s.after(b);
 });
}
let rq=0;new MutationObserver(()=>{cancelAnimationFrame(rq);rq=requestAnimationFrame(enhance)}).observe(D.body,{childList:true,subtree:true});

/* ================= Download the apps (website only), straight from GitHub ================= */
const DLI='<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>';
let REL=null;
async function releases(){
 if(REL)return REL;
 try{
  const r=await withT(fetch('https://api.github.com/repos/'+REPO+'/releases?per_page=8'),9000);
  const j=await r.json(),out={};
  (Array.isArray(j)?j:[]).filter(x=>!x.draft).forEach(rel=>(rel.assets||[]).forEach(a=>{
   const k=/\.exe$/i.test(a.name)?'win':/\.apk$/i.test(a.name)?'and':'';
   if(k&&!out[k])out[k]={v:String(rel.tag_name).replace(/^v/,''),url:a.browser_download_url,mb:(a.size/1048576).toFixed(0),date:rel.published_at};
  }));
  return REL=out;
 }catch{return REL={}}
}
function dlPop(){
 const old=Q('#kdl');if(old){old.remove();return}
 const p=D.createElement('div');p.id='kdl';
 p.innerHTML='<h3>Get Kinora</h3><p class="kdn">Finding the latest version\u2026</p>';
 D.body.append(p);
 releases().then(R=>{
  if(!Q('#kdl'))return;
  const row=(k,t,sub,svg)=>R[k]?'<a class="kdr" href="'+R[k].url+'" rel="noopener"><i><svg viewBox="0 0 24 24">'+svg+'</svg></i><span><b>'+t+'</b><small>Version '+h(R[k].v)+' \u00b7 '+R[k].mb+' MB \u00b7 '+sub+'</small></span><em><svg viewBox="0 0 24 24">'+DLI+'</svg></em></a>':'<div class="kdr off"><i><svg viewBox="0 0 24 24">'+svg+'</svg></i><span><b>'+t+'</b><small>Not published yet</small></span></div>';
  p.innerHTML='<h3>Get Kinora</h3>'+row('win','Windows','Installer (.exe)','<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>')+row('and','Android','APK','<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>')+'<p class="kdn">Downloaded from the Kinora releases on GitHub. The apps update themselves.</p>';
 });
 setTimeout(()=>addEventListener('pointerdown',function f(e){if(!p.contains(e.target)&&!e.target.closest('[data-kdl]')){p.remove();removeEventListener('pointerdown',f,true)}else if(!p.isConnected)removeEventListener('pointerdown',f,true)},true),0);
}
D.addEventListener('click',e=>{if(e.target.closest('#kdl-b,[data-kdl]')){e.preventDefault();dlPop()}});
if(!APP)releases();
if(!APP&&window.K6&&K6.PAGES&&K6.PAGES.hub){
 const hub=K6.PAGES.hub;
 K6.PAGES.hub=()=>{hub();const g=QA('.k6c'),l=g[g.length-1];if(l)l.insertAdjacentHTML('afterbegin','<button class="k6r" data-kdl><i><svg viewBox="0 0 24 24">'+DLI+'</svg></i><span><b>Download the apps</b><small>Windows and Android, latest version</small></span></button>')};
}
})();
