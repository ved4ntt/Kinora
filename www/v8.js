/* Kinora plugin runtime: sandboxed plugin providers, stream filters, TMDB cast lookup */
(()=>{
const D=document;
const S=()=>CFG();
const VURL='https://kinora-plugins.local/manifest.json';
const VMAN={id:'kinora.plugins',version:'1.0.0',name:'Kinora Plugins',description:'Streams from the plugins you installed',resources:['stream'],types:['movie','series'],idPrefixes:['tt','tmdb:'],catalogs:[]};
const PL=()=>LS.get('plug',{repos:[]}),SP=p=>LS.set('plug',p);
const f1=window.fetch.bind(window);
const last={noKey:false,tried:0,ok:0,failed:0,running:false};

/* ---------- network helper (native HTTP on Android, normal fetch elsewhere) ---------- */
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

/* ---------- sandbox: each provider runs in an isolated iframe with no access to the app ---------- */
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
function runScraper(code,args,stop){
 return new Promise(res=>{
  const fr=D.createElement('iframe');fr.sandbox='allow-scripts';fr.style.display='none';
  let over=false;
  const end=(v,ok)=>{if(over)return;over=true;clearTimeout(to);clearInterval(poll);removeEventListener('message',on);fr.remove();res({v,ok})};
  const to=setTimeout(()=>end([],false),14000);
  const poll=setInterval(()=>{if(stop())end([],false)},400);
  const on=async e=>{
   if(e.source!==fr.contentWindow)return;
   const d=e.data||{};
   if(d.t==='fetch'){let out;try{out=await hostFetch(d.req)}catch(x){out={error:String(x&&x.message||x)}}if(!over&&fr.contentWindow)fr.contentWindow.postMessage({t:'fetched',n:d.n,out},'*')}
   else if(d.t==='done')end(d.streams,true);
   else if(d.t==='err')end([],false);
  };
  addEventListener('message',on);
  fr.srcdoc=SANDBOX(code,args);D.body.append(fr);
 });
}
const CODE=new Map();
async function codeOf(u){if(!CODE.has(u)){const r=await hostFetch({url:u});if(r.status>=400)throw new Error('HTTP '+r.status);CODE.set(u,r.text)}return CODE.get(u)}

/* ---------- title lookup: Stremio ids -> TMDB ids (needs the user's free TMDB key) ---------- */
const tmdbKey=()=>(LS.get('tmdbKey','')||'').trim();
async function tmdbGet(path){
 const key=tmdbKey(),bearer=key.length>60;
 const r=await f1(`https://api.themoviedb.org/3/${path}${bearer?'':(path.includes('?')?'&':'?')+'api_key='+encodeURIComponent(key)}`,bearer?{headers:{Authorization:'Bearer '+key}}:undefined);
 if(!r.ok)throw new Error('TMDB '+r.status);
 return r.json();
}
async function tmdbOf(type,id){
 const p=id.split(':');
 if(id.startsWith('tmdb:'))return {tmdb:p[1],s:p[2]||null,e:p[3]||null};
 if(!tmdbKey())return null;
 const j=await tmdbGet(`find/${p[0]}?external_source=imdb_id`),hit=(type==='movie'?j.movie_results:j.tv_results||[])[0];
 return hit?{tmdb:hit.id,s:p[1]||null,e:p[2]||null}:null;
}
const emit=(d)=>dispatchEvent(new CustomEvent('k-plug',{detail:d}));
async function run(type,id){
 last.noKey=false;last.tried=0;last.ok=0;last.failed=0;
 const want=type==='movie'?'movie':'tv',jobs=[];
 PL().repos.forEach(r=>r.scrapers.forEach(s=>{if(s.on&&s.file&&(s.types||[]).includes(want))jobs.push({r,s})}));
 if(!jobs.length)return [];
 let ids=null;
 try{ids=await tmdbOf(type,id)}catch{}
 if(!ids){last.noKey=!tmdbKey()&&!id.startsWith('tmdb:');emit({done:jobs.length,total:jobs.length,found:0});return []}
 const out=[],total=jobs.length;let k=0,done=0;
 const t0=Date.now(),stop=()=>Date.now()-t0>22000;
 const worker=async()=>{while(k<jobs.length&&!stop()){const {r,s}=jobs[k++];
  try{
   const code=await codeOf(new URL(s.file,r.url).href);
   const res=await runScraper(code,{tmdb:ids.tmdb,type:want,s:ids.s?+ids.s:null,e:ids.e?+ids.e:null},stop);
   last.tried++;res.ok?last.ok++:last.failed++;
   res.v.forEach(x=>{if(!x||!x.url)return;
    const h=x.headers&&Object.keys(x.headers).length?x.headers:null;
    out.push({name:s.name+(x.quality?' '+x.quality:''),title:[x.title||x.name,x.size].filter(Boolean).join('\n'),url:x.url,
     behaviorHints:Object.assign({notWebReady:!/\.(mp4|m3u8)(\?|$)/i.test(x.url)},h?{proxyHeaders:{request:h}}:{})});
   });
  }catch{last.tried++;last.failed++}
  done++;emit({done,total,found:out.length});
 }};
 await Promise.all(Array.from({length:Math.min(8,jobs.length)},worker));
 emit({done:total,total,found:out.length});
 return out;
}

/* ---------- stream options: applied to every add-on answer ---------- */
function shape(streams){
 const c=S(),qf=t=>/2160|4k|uhd/i.test(t)?2160:/1080/.test(t)?1080:/720/.test(t)?720:/480/.test(t)?480:0;
 let o=streams.map(s=>({s,t:`${s.name||''} ${s.title||s.description||''}`}));
 if(c.p2p===false)o=o.filter(x=>!(x.s.infoHash&&!x.s.url));
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
 if(!addons.some(a=>a.url===VURL))await addAddon(VURL).catch(()=>{});
 cache.clear();
}
window.KPlug={load:PL,save:SP,add:addRepo,VURL};
window.KPlugHint=()=>{
 if(!PL().repos.length)return '';
 if(last.noKey)return 'Plugins need a TMDB key to find this title. Add one in Settings > Integrations.';
 if(last.tried)return `Plugins tried ${last.tried} providers: ${last.ok} answered, ${last.failed} failed or timed out.`;
 return '';
};

/* ---------- TMDB cast: fuller cast row on the detail page when a key is set ---------- */
const CRED=new Map();
async function credits(type,id){
 const k=type+id;if(CRED.has(k))return CRED.get(k);
 let out=[];
 try{
  const ids=await tmdbOf(type,id);
  if(ids){
   const j=await tmdbGet(`${type==='movie'?'movie':'tv'}/${ids.tmdb}/credits`);
   out=(j.cast||[]).slice(0,30).map(c=>({name:c.name,character:c.character,photo:c.profile_path?'https://image.tmdb.org/t/p/w185'+c.profile_path:''}));
   const crew=(j.crew||[]).filter(c=>/^(Director|Writer|Screenplay|Creator)$/.test(c.job)).slice(0,4).map(c=>({name:c.name,character:c.job,photo:c.profile_path?'https://image.tmdb.org/t/p/w185'+c.profile_path:''}));
   out=out.concat(crew);
  }
 }catch{}
 CRED.set(k,out);return out;
}
window.KCredits=credits;
})();
