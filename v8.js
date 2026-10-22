/* Kinora v8: add-on manager, plugin repositories (sandboxed), stream options, TMDB key */
(()=>{
const D=document,Q=s=>D.querySelector(s),K=window.K6;
if(!K)return;
const {PAGES,shell,sec,opt,row,chips,tg}=K;
const S=()=>LS.get('cfg',{}),say=m=>{try{toast(m)}catch{}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
Object.assign(K.P,{
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
});
const VURL='https://kinora-plugins.local/manifest.json';
const VMAN={id:'kinora.plugins',version:'1.0.0',name:'Kinora Plugins',description:'Streams from the plugins you installed',resources:['stream'],types:['movie','series'],idPrefixes:['tt','tmdb:'],catalogs:[]};
const PL=()=>LS.get('plug',{repos:[]}),SP=p=>LS.set('plug',p);

/* ---------- network helper (native HTTP on Android, normal fetch elsewhere) ---------- */
const f1=window.fetch.bind(window);
async function hostFetch(q){
 const C=window.Capacitor,H=C&&C.Plugins&&C.Plugins.CapacitorHttp;
 if(H&&C.isNativePlatform&&C.isNativePlatform()){
  const r=await H.request({url:q.url,method:q.method||'GET',headers:q.headers||{},data:q.body||undefined,responseType:'text'});
  const h={};Object.entries(r.headers||{}).forEach(([k,v])=>h[k.toLowerCase()]=v);
  return {status:r.status,url:r.url||q.url,headers:h,text:typeof r.data==='string'?r.data:JSON.stringify(r.data)};
 }
 const r=await f1(q.url,{method:q.method||'GET',headers:q.headers||{},body:q.body||undefined});
 const h={};r.headers.forEach((v,k)=>h[k]=v);
 return {status:r.status,url:r.url,headers:h,text:await r.text()};
}

/* ---------- plugin sandbox: each scraper runs in an isolated iframe with no access to the app ---------- */
const SANDBOX=(code,a)=>`<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js"><\/script><script>
const __K=parent,__p={};let __n=0;
const __h=h=>({get:k=>h[String(k).toLowerCase()]||null,has:k=>String(k).toLowerCase() in h});
window.fetch=(u,o)=>new Promise((ok,no)=>{o=o||{};const id=++__n;__p[id]=[ok,no];__K.postMessage({t:'fetch',n:id,req:{url:String(u),method:o.method||'GET',headers:o.headers||{},body:o.body==null?null:String(o.body)}},'*')});
addEventListener('message',e=>{const d=e.data;if(d&&d.t==='fetched'){const [ok,no]=__p[d.n];delete __p[d.n];const o=d.out;if(o.error)return no(new TypeError(o.error));ok({ok:o.status>=200&&o.status<300,status:o.status,url:o.url,headers:__h(o.headers||{}),text:async()=>o.text,json:async()=>JSON.parse(o.text),arrayBuffer:async()=>new TextEncoder().encode(o.text).buffer})}});
window.require=m=>{if(/crypto-js/.test(m))return window.CryptoJS;throw new Error('Module not available: '+m)};
window.module={exports:{}};window.exports=module.exports;
(async()=>{try{
${code}
;const g=(typeof getStreams==='function'?getStreams:(module.exports&&module.exports.getStreams)||window.getStreams);
if(!g)throw new Error('no getStreams');
const r=await g(${JSON.stringify(a.tmdb)},${JSON.stringify(a.type)},${JSON.stringify(a.s)},${JSON.stringify(a.e)});
__K.postMessage({t:'done',streams:Array.isArray(r)?r:[]},'*')
}catch(x){__K.postMessage({t:'err',msg:String(x)},'*')}})();
<\/script>`;
function runScraper(code,args){
 return new Promise(res=>{
  const fr=D.createElement('iframe');fr.sandbox='allow-scripts';fr.style.display='none';
  const end=v=>{clearTimeout(to);removeEventListener('message',on);fr.remove();res(v)};
  const to=setTimeout(()=>end([]),12000);
  const on=async e=>{
   if(e.source!==fr.contentWindow)return;
   const d=e.data||{};
   if(d.t==='fetch'){let out;try{out=await hostFetch(d.req)}catch(x){out={error:String(x&&x.message||x)}}fr.contentWindow&&fr.contentWindow.postMessage({t:'fetched',n:d.n,out},'*')}
   else if(d.t==='done')end(d.streams);
   else if(d.t==='err')end([]);
  };
  addEventListener('message',on);
  fr.srcdoc=SANDBOX(code,args);D.body.append(fr);
 });
}
const CODE=new Map();
async function codeOf(u){if(!CODE.has(u)){const r=await hostFetch({url:u});if(r.status>=400)throw new Error('HTTP '+r.status);CODE.set(u,r.text)}return CODE.get(u)}

/* ---------- title lookup: Stremio ids -> TMDB ids ---------- */
let warned=false;
async function tmdbOf(type,id){
 const [a,s,e]=id.split(':');
 if(id.startsWith('tmdb:')){const p=id.split(':');return {tmdb:p[1],s:p[2]||null,e:p[3]||null}}
 const key=LS.get('tmdbKey','');
 if(!key){if(!warned){warned=true;say('Add a TMDB API key in Settings > Integrations so plugins can find titles')}return null}
 const bearer=key.length>60;
 const r=await f1(`https://api.themoviedb.org/3/find/${a}?external_source=imdb_id${bearer?'':'&api_key='+encodeURIComponent(key)}`,bearer?{headers:{Authorization:'Bearer '+key}}:undefined);
 const j=await r.json(),hit=(type==='movie'?j.movie_results:j.tv_results||[])[0];
 return hit?{tmdb:hit.id,s:s||null,e:e||null}:null;
}
async function run(type,id){
 const ids=await tmdbOf(type,id);if(!ids)return [];
 const want=type==='movie'?'movie':'tv',jobs=[];
 PL().repos.forEach(r=>r.scrapers.forEach(s=>{if(s.on&&s.file&&(s.types||[]).includes(want))jobs.push({r,s})}));
 const out=[];let k=0;
 const worker=async()=>{while(k<jobs.length){const {r,s}=jobs[k++];
  try{
   const code=await codeOf(new URL(s.file,r.url).href);
   const list=await runScraper(code,{tmdb:ids.tmdb,type:want,s:ids.s?+ids.s:null,e:ids.e?+ids.e:null});
   list.forEach(x=>{if(!x||!x.url)return;
    const h=x.headers&&Object.keys(x.headers).length?x.headers:null;
    out.push({name:s.name+(x.quality?' '+x.quality:''),title:[x.title||x.name,x.size].filter(Boolean).join('\n'),url:x.url,
     behaviorHints:Object.assign({notWebReady:!/\.(mp4|m3u8)(\?|$)/i.test(x.url)},h?{proxyHeaders:{request:h}}:{})});
   });
  }catch{}
 }};
 await Promise.all(Array.from({length:Math.min(6,jobs.length)},worker));
 return out;
}

/* ---------- stream options: applied to every add-on answer ---------- */
function shape(streams){
 const c=S(),qf=t=>/2160|4k|uhd/i.test(t)?2160:/1080/.test(t)?1080:/720/.test(t)?720:/480/.test(t)?480:0;
 let o=streams.map(s=>({s,t:`${s.name||''} ${s.title||s.description||''}`}));
 if(c.sNoCam!==false)o=o.filter(x=>!/\b(cam|hdcam|camrip|ts|hdts|telesync|tc|telecine)\b/i.test(x.t));
 if(c.sMin)o=o.filter(x=>!qf(x.t)||qf(x.t)>=c.sMin);
 if(c.sLang&&c.sLang!=='any'){const re=new RegExp(c.sLang,'i');o.sort((a,b)=>re.test(b.t)-re.test(a.t))}
 if(c.sDirect)o.sort((a,b)=>(!!a.s.infoHash&&!a.s.url)-(!!b.s.infoHash&&!b.s.url));
 if(c.sMax)o=o.slice(0,c.sMax);
 return o.map(x=>x.s);
}
const J=x=>new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
window.fetch=async function(i,o){
 let u='';try{u=decodeURIComponent(i&&i.url?i.url:String(i))}catch{}
 const m=/kinora-plugins\.local\/([^?#]*)/.exec(u);
 if(m){
  const p=m[1];
  if(p==='manifest.json')return J(VMAN);
  const s=p.match(/^stream\/(movie|series)\/(.+)\.json$/);
  if(s){let st=[];try{st=await run(s[1],s[2])}catch{}return J({streams:shape(st)})}
  return J({});
 }
 const r=await f1(i,o);
 if(/\/stream\/(movie|series)\//.test(u)){
  try{const j=await r.clone().json();if(j&&Array.isArray(j.streams)){j.streams=shape(j.streams);return new Response(JSON.stringify(j),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'application/json'}})}}catch{}
 }
 return r;
};

/* ---------- repositories ---------- */
async function addRepo(url){
 const r=await hostFetch({url});
 let j;try{j=JSON.parse(r.text)}catch{}
 if(!j||!Array.isArray(j.scrapers))throw new Error('That is not a plugin repository');
 const P=PL(),old=P.repos.find(x=>x.url===url),prev={};
 ((old&&old.scrapers)||[]).forEach(s=>prev[s.id]=s.on);
 const rep={url,name:j.name||url,version:j.version||'',scrapers:j.scrapers.map(s=>({id:String(s.id),name:s.name||String(s.id),desc:s.description||'',ver:s.version||'',types:s.supportedTypes||['movie','tv'],file:s.filename,logo:s.logo||'',langs:s.contentLanguage||[],on:prev[s.id]!==undefined?prev[s.id]:s.enabled!==false}))};
 P.repos=P.repos.filter(x=>x.url!==url).concat(rep);SP(P);
 if(!K.addons().some(a=>a.url===VURL))await addAddon(VURL).catch(()=>{});
}
function persist(prevLen){
 const L=K.addons();
 for(const k of ['addons','ads','myAddons']){
  const v=LS.get(k,null);
  if(Array.isArray(v)&&v.length===prevLen&&prevLen>0){LS.set(k,typeof v[0]==='string'?L.map(a=>a.url):L);return true}
 }
 say('Saved for this session. Use All settings (classic) to make removals permanent.');return false;
}

/* ---------- pages ---------- */
const input=(id,ph,btn,act)=>`<div class="k6in"><input id="${id}" placeholder="${ph}" autocapitalize="off" spellcheck="false"><button class="btn p" data-v8="${act}">${btn}</button></div>`;
PAGES.hub=()=>shell('Settings',
 sec('Account',row('user','Profile & account','Sign in, cloud sync, avatar and add-ons','classic'))+
 sec('General',row('grid','Look & feel','Glass intensity and motion','look')+row('plug','Content & discovery','Add-ons and plugins','content')+row('play','Playback','Quality, subtitles, gestures and speed','play')+row('list','Stream options','Filter and sort the sources you see','streams')+row('link','Integrations','TMDB key and data services','integ')+row('phone','This device','Detected quality, resets and history','dev'))+
 sec('More',row('all','All settings','The full classic settings list','classic')+row('info','About & licenses','Version, credits and attribution','about')),0);
PAGES.content=()=>shell('Content & discovery',sec('Sources',row('plug','Add-ons','Install, remove, refresh and sort your content sources','addons')+row('grid','Plugins','Add plugin repositories and choose providers','plugins')),1);
PAGES.addons=()=>{
 const L=K.addons();
 const rows=L.map((a,i)=>`<div class="k6o"><span><b>${esc(a.name||(a.manifest&&a.manifest.name)||'Add-on')}</b><small>${esc((a.manifest&&a.manifest.version?'v'+a.manifest.version+'  ':'')+(a.url||''))}</small></span><div class="k8b"><button class="btn" data-v8="up" data-i="${i}" aria-label="Move up">↑</button><button class="btn" data-v8="dn" data-i="${i}" aria-label="Move down">↓</button><button class="btn" data-v8="rf" data-i="${i}">Refresh</button><button class="btn" data-v8="rm" data-i="${i}">Remove</button></div></div>`).join('')||opt('Nothing installed yet','Add one below or pick a recommended one','');
 const rec=K.RECS.map((r,i)=>`<div class="k6o"><span><b>${esc(r[0])}</b><small>${esc(r[1])}</small></span>${K.has(r[2])?'<small>Installed</small>':`<button class="btn" data-v8="arec" data-i="${i}">Install</button>`}</div>`).join('');
 shell('Add-ons',sec(`Installed (${L.length})`,rows)+sec('Add an add-on',input('k8a','Paste a manifest link','Add','aadd'))+sec('Recommended',rec),1);
};
PAGES.plugins=()=>{
 const P=PL();
 const repos=P.repos.map((r,i)=>`<div class="k6o"><span><b>${esc(r.name)}</b><small>${r.scrapers.filter(s=>s.on).length} of ${r.scrapers.length} providers on</small></span><div class="k8b"><button class="btn" data-v8="ron" data-r="${i}">All on</button><button class="btn" data-v8="roff" data-r="${i}">All off</button><button class="btn" data-v8="rrf" data-r="${i}">Refresh</button><button class="btn" data-v8="rrm" data-r="${i}">Remove</button></div></div>`).join('')||opt('No repositories yet','Paste a repository link below','');
 const list=P.repos.map((r,i)=>r.scrapers.map((s,j)=>`<div class="k6o k8s${s.on?'':' off'}" data-q="${esc((s.name+' '+s.desc+' '+(s.langs||[]).join(' ')).toLowerCase())}">${s.logo?`<img class="k8l" loading="lazy" referrerpolicy="no-referrer" src="${esc(s.logo)}" alt="">`:''}<span><b>${esc(s.name)}</b><small>${esc(s.desc)}${s.langs&&s.langs.length?' • '+esc(s.langs.join(', ')):''}</small></span><button class="k6t${s.on?' on':''}" data-v8="stg" data-r="${i}" data-s="${j}" aria-label="toggle"></button></div>`).join('')).join('');
 shell('Plugins',
  `<div class="k8n">Plugins are code written by other people and run on your device in an isolated sandbox. Only add repositories you trust. They need a TMDB key (Settings > Integrations) and work best in the Windows and Android apps, because browsers block most of their requests.</div>`+
  sec('Repositories',repos)+sec('Add a repository',input('k8r','Paste a repository manifest link','Add','radd'))+
  (list?sec('Providers',`<div class="k6in"><input id="k8q" placeholder="Search providers" autocapitalize="off" spellcheck="false"></div>${list}`):''),1);
};
PAGES.streams=()=>{const c=S();shell('Stream options',
 sec('Hide',opt('Minimum quality','Streams below this are hidden (unknown quality stays)',chips('sMin',[[0,'Any'],[480,'480p'],[720,'720p'],[1080,'1080p'],[2160,'4K']],c.sMin||0))+opt('Hide cam and telesync','Removes low-quality theatre recordings',tg('sNoCam',c.sNoCam!==false)))+
 sec('Order',opt('Preferred language','Streams mentioning it come first',chips('sLang',[['any','Any'],['english','English'],['hindi','Hindi'],['tamil','Tamil'],['telugu','Telugu'],['french','French'],['japanese','Japanese']],c.sLang||'any'))+opt('Direct links first','Puts torrent streams after direct ones',tg('sDirect',!!c.sDirect)))+
 sec('Limit',opt('Most sources shown per add-on','Keeps long lists short',chips('sMax',[[10,'10'],[25,'25'],[50,'50'],[0,'All']],c.sMax||0))),1)};
PAGES.integ=()=>{const k=LS.get('tmdbKey','');shell('Integrations',
 sec('TMDB',`<div class="k8n">Plugins use TMDB to find which title you picked. Get a free key at themoviedb.org (Settings > API).</div>`+input('k8k',k?'Key saved. Paste a new one to replace it':'Paste your TMDB API key','Save','key')),1)};
PAGES.about=()=>shell('About & licenses',
 sec('Kinora',opt('Add-ons and plugins','Third-party add-ons and plugins are made by other people. Kinora does not host or control what they offer.',''))+
 sec('Data & services',opt('The Movie Database (TMDB)','This product uses the TMDB API but is not endorsed or certified by TMDB. https://www.themoviedb.org','')),1);

/* ---------- actions ---------- */
D.addEventListener('input',e=>{
 if(e.target.id!=='k8q')return;
 const q=e.target.value.trim().toLowerCase();
 D.querySelectorAll('.k8s').forEach(r=>{r.style.display=!q||r.dataset.q.includes(q)?'':'none'});
});
D.addEventListener('click',async e=>{
 const b=e.target.closest('[data-v8]');if(!b||!b.closest('.k6'))return;
 const a=b.dataset.v8,i=+b.dataset.i,L=K.addons(),n=L.length;
 try{
  if(a==='up'||a==='dn'){const j=a==='up'?i-1:i+1;if(j<0||j>=n)return;[L[i],L[j]]=[L[j],L[i]];persist(n);PAGES.addons()}
  else if(a==='rm'){L.splice(i,1);persist(n);PAGES.addons()}
  else if(a==='rf'){const old=L[i];L.splice(i,1);try{await addAddon(old.url);const x=L.pop();L.splice(i,0,x);say('Refreshed')}catch{L.splice(i,0,old);say('Could not refresh that add-on')}PAGES.addons()}
  else if(a==='aadd'){const u=(Q('#k8a').value||'').trim();if(!u)return;b.textContent='Adding…';try{await addAddon(u);say('Add-on added')}catch{say('Could not add that link')}PAGES.addons()}
  else if(a==='arec'){b.textContent='Adding…';try{await addAddon(K.RECS[i][2]);say('Add-on installed')}catch{say('Could not install that add-on')}PAGES.addons()}
  else if(a==='radd'){const u=(Q('#k8r').value||'').trim();if(!u)return;b.textContent='Adding…';try{await addRepo(u);say('Repository added')}catch(x){say(x.message||'Could not add that link')}PAGES.plugins()}
  else if(a==='rrf'){try{await addRepo(PL().repos[+b.dataset.r].url);say('Repository refreshed')}catch{say('Could not refresh')}PAGES.plugins()}
  else if(a==='rrm'){const P=PL();P.repos.splice(+b.dataset.r,1);SP(P);PAGES.plugins()}
  else if(a==='ron'||a==='roff'){const P=PL();P.repos[+b.dataset.r].scrapers.forEach(s=>s.on=a==='ron');SP(P);PAGES.plugins()}
  else if(a==='stg'){const P=PL(),s=P.repos[+b.dataset.r].scrapers[+b.dataset.s];s.on=!s.on;SP(P);b.classList.toggle('on',s.on);b.closest('.k8s').classList.toggle('off',!s.on)}
  else if(a==='key'){const v=(Q('#k8k').value||'').trim();if(!v)return;LS.set('tmdbKey',v);say('TMDB key saved');PAGES.integ()}
 }catch(x){say('Something went wrong')}
});
})();
