/* Kinora v11: calmer popups, touch feedback, profiles, Live TV and the animated splash handoff. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const say=m=>{try{toast(m)}catch{}};
const COARSE=matchMedia('(pointer:coarse)').matches;
const on=k=>CFG()[k]!==false;
Object.assign(I,{
 live:'<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 3l4 4 4-4"/>',
 swap:'<path d="M7 7h12l-3-3M17 17H5l3 3"/>'
});
const rawName=id=>{try{return JSON.parse((id==='main'?(window.__kRaw?window.__kRaw.get('me'):localStorage.getItem('me')):localStorage.getItem('kp:'+id+':me'))||'""')}catch{return''}};
const rawAv=id=>{try{return +JSON.parse((id==='main'?(window.__kRaw?window.__kRaw.get('av'):localStorage.getItem('av')):localStorage.getItem('kp:'+id+':av'))||'0')||0}catch{return 0}};

/* ================= popups: the profile menu hides the floating pills ================= */
const pm=Q('#pm');
if(pm)new MutationObserver(()=>D.body.classList.toggle('pm-open',pm.classList.contains('on'))).observe(pm,{attributes:true,attributeFilter:['class']});

/* ================= touch feedback ================= */
const buzz=ms=>{if(!COARSE||!on('haptics'))return;try{navigator.vibrate&&navigator.vibrate(ms||6)}catch{}};
D.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.target.closest&&e.target.closest('.btn,.rb,.pill,.cb,.grp a,.k6r,.k6t,.seg button,.tabs button,#rd,#kj,.kpt,.ktv,.ktvc'))buzz(6)},{passive:true});

/* ================= profiles ================= */
/* The page keeps a profile's own library, history, ratings and settings under its own keys (see the small script at the top of index.html). */
const ACT=window.__kProf||'main';
const profs=()=>{try{return JSON.parse(localStorage.getItem('kprofs')||'[]')}catch{return[]}};
if(ACT!=='main'){
 /* only the main profile talks to the cloud, so a family profile can never overwrite your synced data */
 try{pull=async()=>{}}catch{}
 try{pushSoon=()=>{}}catch{}
 try{if(typeof push==='function')push=async()=>{}}catch{}
}
const activeName=()=>ACT==='main'?(rawName('main')||'Main'):((profs().find(p=>p.id===ACT)||{}).name||'Profile');
function tile(p){return`<button class="kpt${p.id===ACT?' on':''}" data-id="${h(p.id)}"><span class="avb">${avatarSvg(p.av)}</span><b>${h(p.name||'Profile')}</b>${p.kids?'<i>Kids</i>':''}</button>`}
V.profiles=function(){
 const list=[{id:'main',name:rawName('main')||'Main',av:rawAv('main')},...profs()];
 let manage=false;
 const draw=()=>{
  app.innerHTML=`<div class="page kpp"><h1>${manage?'Manage profiles':"Who's watching?"}</h1><div class="kpg">${list.map(tile).join('')}${list.length<6?`<button class="kpt kadd" data-id="+"><span class="avb">${ic('plus')}</span><b>Add profile</b></button>`:''}</div><button class="klink" id="kpm">${manage?'Done':'Manage profiles'}</button></div>`;
  $('#kpm').onclick=()=>{manage=!manage;draw()};
  QA('.kpt').forEach(b=>b.onclick=()=>{
   const id=b.dataset.id;
   if(id==='+')return editProfile(null);
   if(manage){if(id==='main'){location.hash='#/profile';return}return editProfile(profs().find(p=>p.id===id))}
   if(id===ACT){location.hash='#/';return}
   localStorage.setItem('kprof',id);location.hash='#/';setTimeout(()=>location.reload(),30);
  });
 };
 draw();
};
function editProfile(p){
 const nw=!p,st={name:p?p.name:'',av:p?p.av:Math.floor(Math.random()*12),kids:!!(p&&p.kids)};
 const d=D.createElement('div');d.className='dmod';
 d.innerHTML=`<div class="dcard obc"><h2>${nw?'New profile':'Edit profile'}</h2><div class="kpe2"><div class="avb" id="kpv">${avatarSvg(st.av)}</div><input class="t" id="kpn" maxlength="24" placeholder="Name" value="${h(st.name)}"></div><div class="avg kpa">${Array.from({length:12},(_,i)=>`<button class="avs${i===st.av?' on':''}" data-a="${i}" aria-label="Avatar ${i+1}">${avatarSvg(i)}</button>`).join('')}</div><div class="k6o2" style="padding:12px 2px 4px"><span><b>Kids profile</b><small>Hides adult titles.</small></span><button class="k6t${st.kids?' on':''}" id="kpk" role="switch" aria-checked="${st.kids}" aria-label="Kids profile"></button></div><div class="acts" style="justify-content:space-between;margin-top:14px">${nw?'<span></span>':'<button class="btn kdanger" id="kpd">Delete</button>'}<span style="display:flex;gap:8px"><button class="btn" id="kpc">Cancel</button><button class="btn p" id="kps">Save</button></span></div></div>`;
 D.body.append(d);d.onclick=e=>{if(e.target===d)d.remove()};
 QA('.kpa .avs',d).forEach(b=>b.onclick=()=>{st.av=+b.dataset.a;QA('.kpa .avs',d).forEach(x=>x.classList.toggle('on',x===b));Q('#kpv',d).innerHTML=avatarSvg(st.av)});
 Q('#kpk',d).onclick=e=>{st.kids=!st.kids;e.currentTarget.classList.toggle('on',st.kids)};
 Q('#kpc',d).onclick=()=>d.remove();
 Q('#kps',d).onclick=()=>{
  const name=Q('#kpn',d).value.trim();if(!name)return say('Give the profile a name');
  const list=profs();
  if(nw){
   const id='p'+Date.now().toString(36);list.push({id,name,av:st.av,kids:st.kids});
   localStorage.setItem('kp:'+id+':me',JSON.stringify(name));localStorage.setItem('kp:'+id+':av',JSON.stringify(st.av));
   if(st.kids)localStorage.setItem('kp:'+id+':cfg',JSON.stringify({hideAdult:true}));
  }else{
   const was=!!p.kids;
   Object.assign(p,{name,av:st.av,kids:st.kids});const i=list.findIndex(x=>x.id===p.id);list[i]=p;
   localStorage.setItem('kp:'+p.id+':me',JSON.stringify(name));localStorage.setItem('kp:'+p.id+':av',JSON.stringify(st.av));
   try{const c=JSON.parse(localStorage.getItem('kp:'+p.id+':cfg')||'{}');if(st.kids)c.hideAdult=true;else if(was)c.hideAdult=false;localStorage.setItem('kp:'+p.id+':cfg',JSON.stringify(c))}catch{}
  }
  localStorage.setItem('kprofs',JSON.stringify(list));d.remove();V.profiles();
 };
 const del=Q('#kpd',d);
 if(del)del.onclick=()=>{
  if(!confirm('Delete "'+p.name+'" and everything saved in it?'))return;
  Object.keys(localStorage).filter(k=>k.startsWith('kp:'+p.id+':')).forEach(k=>localStorage.removeItem(k));
  localStorage.setItem('kprofs',JSON.stringify(profs().filter(x=>x.id!==p.id)));
  if(ACT===p.id){localStorage.setItem('kprof','main');location.reload();return}
  d.remove();V.profiles();
 };
}
{const r0=renderPm;renderPm=function(){
 r0.apply(this,arguments);
 if(!Q('#kpsw')){pm.insertAdjacentHTML('beforeend',`<a class="btn" id="kpsw" href="#/profiles" style="display:block;width:100%;margin-top:8px;text-align:center">Switch profile${ACT!=='main'?' · '+h(activeName()):''}</a>`);Q('#kpsw').onclick=()=>pm.classList.remove('on')}
}}
renderPm();
if(window.K6){
 const hub=K6.PAGES.hub;
 K6.PAGES.hub=()=>{hub();const c=Q('.k6 .k6c');if(c)c.insertAdjacentHTML('afterbegin',`<a class="k6r" href="#/profiles"><i><svg viewBox="0 0 24 24">${I.swap}</svg></i><span><b>Switch profile</b><small>${h(activeName())} · change to a different profile</small></span><svg class="cv" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></a>`)};
 const lk=K6.PAGES.look;
 K6.PAGES.look=()=>{lk();if(!COARSE)return;const p=Q('.k6');if(p)p.insertAdjacentHTML('beforeend',`<h4 class="k6h">Touch</h4><div class="k6c"><div class="k6o"><span><b>Haptic feedback</b><small>A light tap when you press buttons</small></span><button class="k6t${on('haptics')?' on':''}" data-tg="haptics" role="switch" aria-checked="${on('haptics')}" aria-label="Haptic feedback"></button></div></div>`)};
}

/* ================= Live TV (your own M3U playlists) ================= */
const PRE=[['India','https://iptv-org.github.io/iptv/countries/in.m3u'],['United States','https://iptv-org.github.io/iptv/countries/us.m3u'],['United Kingdom','https://iptv-org.github.io/iptv/countries/uk.m3u']];
const TV={ch:[],ld:0};
const tvList=()=>LS.get('tvpl',[]);
async function tvText(u){
 try{const r=await fetch(u);if(!r.ok)throw new Error('http '+r.status);return await r.text()}
 catch(e){
  const C=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.CapacitorHttp;
  if(C){const r=await C.get({url:u,responseType:'text'});return typeof r.data==='string'?r.data:JSON.stringify(r.data)}
  throw e;
 }
}
function parseM3U(t){
 const out=[];let cur=null;
 for(const raw of String(t).split(/\r?\n/)){
  const l=raw.trim();if(!l)continue;
  if(l.startsWith('#EXTINF')){
   const m=/#EXTINF:[^,]*,(.*)$/.exec(l),a=k=>{const r=new RegExp(k+'="([^"]*)"','i').exec(l);return r?r[1]:''};
   cur={name:((m&&m[1])||a('tvg-name')||'Channel').trim(),logo:a('tvg-logo'),group:a('group-title')||'Other'};
  }else if(l.startsWith('#EXTGRP:')&&cur)cur.group=l.slice(8).trim()||cur.group;
  else if(!l.startsWith('#')&&cur&&/^https?:\/\//i.test(l)){cur.url=l;out.push(cur);cur=null}
 }
 return out;
}
async function tvLoad(force){
 if(TV.ld&&!force)return TV.ch;
 const seen=new Set(),all=[];
 await Promise.all(tvList().map(async p=>{try{parseM3U(await tvText(p.url)).forEach(c=>{if(!seen.has(c.url)){seen.add(c.url);all.push(c)}})}catch{}}));
 TV.ch=all;TV.ld=1;return all;
}
function playCh(ch){
 const rec=[ch,...LS.get('tvrecent',[]).filter(x=>x.url!==ch.url)].slice(0,12).map(x=>({name:x.name,logo:x.logo,group:x.group,url:x.url}));
 LS.set('tvrecent',rec);
 PICK={url:ch.url,name:ch.name,title:ch.group,_a:'Live TV'};
 const to=watchUrl('tv',ch.name,'');
 if(location.hash===to)route();else location.hash=to;
}
const chTile=(c,i)=>`<button class="ktv" data-u="${h(c.url)}" data-i="${i}"><span class="ktl">${c.logo?`<img loading="lazy" referrerpolicy="no-referrer" src="${h(c.logo)}" alt="" onerror="this.remove()">`:''}<em>${h((c.name||'?').slice(0,2).toUpperCase())}</em></span><b>${h(c.name)}</b><small>${h(c.group)}</small></button>`;
V.live=async function(){
 const pls=tvList();
 app.innerHTML=`<div class="page"><h1>Live TV</h1><div id="tvh">${pls.length?LDS:''}</div></div>`;
 if(!pls.length)return tvEmpty();
 const chs=await tvLoad();if(!Q('#tvh'))return;
 if(!chs.length)return tvEmpty('We could not load any channels from your playlists.');
 const groups=[...new Set(chs.map(c=>c.group))].sort((a,b)=>a.localeCompare(b));
 let g='',q='',n=72;
 Q('#tvh').innerHTML=`<div class="ktb"><input class="t" id="tvq" type="search" placeholder="Search channels" aria-label="Search channels"><button class="btn" id="tvm">Playlists</button></div><div class="ktvcs" id="tvg"></div><div id="tvr"></div><div class="ktvg" id="tvl"></div><div class="kmore" id="tvmo"></div>`;
 const rec=LS.get('tvrecent',[]);
 const draw=()=>{
  const f=chs.filter(c=>(!g||c.group===g)&&(!q||c.name.toLowerCase().includes(q)));
  Q('#tvg').innerHTML=['',...groups.slice(0,60)].map(x=>`<button class="ktvc${x===g?' on':''}" data-g="${h(x)}">${x?h(x):'All'}</button>`).join('');
  Q('#tvr').innerHTML=!g&&!q&&rec.length?`<h2>Recently watched</h2><div class="ktvg kr2">${rec.map(chTile).join('')}</div><h2>All channels</h2>`:'';
  Q('#tvl').innerHTML=f.slice(0,n).map(chTile).join('')||'<p class="sub">No channels match.</p>';
  Q('#tvmo').innerHTML=f.length>n?`<button class="btn" id="tvmore">Show more (${f.length-n})</button>`:'';
  const mb=Q('#tvmore');if(mb)mb.onclick=()=>{n+=96;draw()};
  QA('.ktv',Q('#tvh')).forEach(b=>b.onclick=()=>{const c=chs.find(x=>x.url===b.dataset.u)||rec.find(x=>x.url===b.dataset.u);if(c)playCh(c)});
  QA('.ktvc',Q('#tvh')).forEach(b=>b.onclick=()=>{g=b.dataset.g;n=72;draw()});
 };
 let t;Q('#tvq').oninput=e=>{clearTimeout(t);t=setTimeout(()=>{q=e.target.value.trim().toLowerCase();n=72;draw()},180)};
 Q('#tvm').onclick=playlistsModal;
 draw();
};
function tvEmpty(msg){
 const box=Q('#tvh');if(!box)return;
 box.innerHTML=`<div class="ktve"><i>${ic('live')}</i><h3>Watch live TV</h3><p>${h(msg||'Add a playlist (M3U) and your channels show up here. Kinora does not provide any channels itself.')}</p><div class="ktvp">${PRE.map(([n,u])=>`<button class="btn" data-u="${h(u)}" data-n="${h(n)}">Free channels · ${h(n)}</button>`).join('')}</div><button class="btn p" id="tvc">Add your own playlist</button></div>`;
 QA('.ktvp .btn',box).forEach(b=>b.onclick=()=>addPlaylist(b.dataset.n,b.dataset.u,true));
 Q('#tvc',box).onclick=playlistsModal;
}
async function addPlaylist(name,url,reload){
 url=String(url||'').trim();
 if(!/^https?:\/\//i.test(url))return say('Enter a link that starts with http');
 say('Checking the playlist…');
 try{
  const chs=parseM3U(await tvText(url));
  if(!chs.length)return say('That link has no channels in it');
  LS.set('tvpl',[...tvList().filter(p=>p.url!==url),{id:'t'+Date.now().toString(36),name:name||'Playlist',url}]);
  TV.ld=0;say(chs.length+' channels added');if(reload)V.live();
  return true;
 }catch{say("Couldn't open that playlist. Check the link.")}
}
function playlistsModal(){
 const d=D.createElement('div');d.className='dmod';
 const draw=()=>{
  const l=tvList();
  d.innerHTML=`<div class="dcard obc"><h2>Playlists</h2><div class="ktpl">${l.map(p=>`<div class="ktp"><div><b>${h(p.name)}</b><small>${h(p.url)}</small></div><button class="rb" data-r="${h(p.id)}" aria-label="Remove">${ic('x')}</button></div>`).join('')||'<p class="sub">No playlists yet.</p>'}</div><form class="auth" style="max-width:none;margin-top:12px"><input class="t" id="tpn" placeholder="Name (optional)"><input class="t" id="tpu" type="url" placeholder="https://… .m3u" required><div class="acts"><button class="btn p">Add playlist</button></div></form><div class="ktvp" style="margin-top:12px">${PRE.map(([n,u])=>`<button class="btn" data-u="${h(u)}" data-n="${h(n)}">+ ${h(n)}</button>`).join('')}</div><div class="acts" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="tpx">Done</button></div></div>`;
  QA('[data-r]',d).forEach(b=>b.onclick=()=>{LS.set('tvpl',tvList().filter(p=>p.id!==b.dataset.r));TV.ld=0;draw()});
  QA('.ktvp .btn',d).forEach(b=>b.onclick=async()=>{if(await addPlaylist(b.dataset.n,b.dataset.u))draw()});
  Q('form',d).onsubmit=async e=>{e.preventDefault();if(await addPlaylist(Q('#tpn',d).value.trim(),Q('#tpu',d).value))draw()};
  Q('#tpx',d).onclick=()=>{d.remove();if(/^#\/live/.test(location.hash))V.live()};
 };
 draw();D.body.append(d);d.onclick=e=>{if(e.target===d){d.remove();if(/^#\/live/.test(location.hash))V.live()}};
}
/* a live channel is not a title: no "continue watching", and the back button returns to the channel list */
{const s0=LS.set;LS.set=function(k,v){if(k==='prog'&&v&&typeof v==='object'){for(const x in v)if(v[x]&&v[x].type==='tv')delete v[x]}return s0.call(LS,k,v)}}
function liveMode(){
 const live=/^#\/watch\/tv\//.test(location.hash);
 D.body.classList.toggle('klive',live);
 if(live){const a=Q('#top a.rb');if(a)a.setAttribute('href','#/live')}
}
addEventListener('hashchange',liveMode);
new MutationObserver(()=>{if(/^#\/watch\/tv\//.test(location.hash))liveMode()}).observe(D.getElementById('app'),{childList:true,subtree:true});
{const d0=dock;dock=function(){d0.apply(this,arguments);const lib=Q('#dock a[data-r="library"]');if(lib&&!Q('#dock a[data-r="live"]'))lib.insertAdjacentHTML('beforebegin',nl('live','live','Live TV'));try{slide()}catch{}}}
try{dock();syncNav()}catch{}
liveMode();

/* ================= animated splash handoff ================= */
addEventListener('load',()=>setTimeout(()=>{window.__kSplash&&window.__kSplash()},60));
})();
