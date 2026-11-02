/* Kinora TMDB: the built-in source for catalogs, search and title details.
   It looks like a normal add-on to the rest of the app (a virtual add-on), so every screen keeps working.
   If TMDB cannot answer, Cinemeta (kept installed, hidden) answers instead.
   The TMDB key comes from config.js (tmdbKey) or Settings > Integrations, and is stored on this device. */
(()=>{
const f0=window.fetch.bind(window);
const URL0='https://kinora-tmdb.local/manifest.json',CINE='https://v3-cinemeta.strem.io';
try{const k=(window.KINORA_CONFIG||{}).tmdbKey;if(k&&!String(LS.get('tmdbKey','')||'').trim())LS.set('tmdbKey',k)}catch{}
const KEY=()=>String(LS.get('tmdbKey','')||'').trim();

const MG={28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Science Fiction',10770:'TV Movie',53:'Thriller',10752:'War',37:'Western',10759:'Action & Adventure',10762:'Kids',10763:'News',10764:'Reality',10765:'Sci-Fi & Fantasy',10766:'Soap',10767:'Talk',10768:'War & Politics'};
const GM=['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Family','Fantasy','History','Horror','Music','Mystery','Romance','Science Fiction','Thriller','War','Western'];
const GT=['Action & Adventure','Animation','Comedy','Crime','Documentary','Drama','Family','Kids','Mystery','Reality','Sci-Fi & Fantasy','War & Politics','Western'];
const gid=n=>+Object.keys(MG).find(k=>MG[k]===n)||0;
const gopt=a=>({name:'genre',options:a});
const MAN={id:'kinora.tmdb',version:'1.0.0',name:'TMDB',description:'Movies and series from TMDB. Cinemeta is the fallback.',logo:'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg',
 resources:[{name:'catalog',types:['movie','series']},{name:'meta',types:['movie','series'],idPrefixes:['tmdb:','tt']}],types:['movie','series'],idPrefixes:['tmdb:','tt'],
 catalogs:[
  {type:'movie',id:'trending',name:'Trending',extra:[{name:'skip'}]},
  {type:'series',id:'trending',name:'Trending',extra:[{name:'skip'}]},
  {type:'movie',id:'top',name:'Popular',extra:[gopt(GM),{name:'search'},{name:'skip'}]},
  {type:'series',id:'top',name:'Popular',extra:[gopt(GT),{name:'search'},{name:'skip'}]},
  {type:'movie',id:'rated',name:'Top rated',extra:[{name:'skip'}]},
  {type:'series',id:'rated',name:'Top rated',extra:[{name:'skip'}]},
  {type:'movie',id:'playing',name:'In theatres',extra:[{name:'skip'}]},
  {type:'series',id:'airing',name:'On the air',extra:[{name:'skip'}]},
  {type:'movie',id:'soon',name:'Coming soon',extra:[{name:'skip'}]}
 ]};

/* ---------- TMDB calls ---------- */
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(Error('timeout')),ms))]);
async function api(path,q){
 const k=KEY();if(!k)throw Error('No TMDB key');
 const u=new URL('https://api.themoviedb.org/3/'+path);
 Object.entries({language:'en-US',...(q||{})}).forEach(([a,b])=>{if(b!=null&&b!=='')u.searchParams.set(a,b)});
 const bearer=k.length>60;if(!bearer)u.searchParams.set('api_key',k);
 const r=await withTimeout(f0(u.toString(),bearer?{headers:{Authorization:'Bearer '+k}}:undefined),12000);
 if(!r.ok)throw Error('TMDB '+r.status);
 return r.json();
}
const img=(p,s)=>p?'https://image.tmdb.org/t/p/'+s+p:undefined;
const yr=d=>String(d||'').slice(0,4);
const brief=(x,type)=>({id:'tmdb:'+x.id,type,name:x.title||x.name||'',poster:img(x.poster_path,'w342'),background:img(x.backdrop_path,'w1280'),description:x.overview||'',releaseInfo:yr(x.release_date||x.first_air_date),year:yr(x.release_date||x.first_air_date),imdbRating:x.vote_average?x.vote_average.toFixed(1):undefined,genres:(x.genre_ids||[]).map(i=>MG[i]).filter(Boolean)});

async function catalog(type,id,extra){
 const x=new URLSearchParams(extra||''),skip=+x.get('skip')||0,page=Math.floor(skip/20)+1,g=x.get('genre'),s=x.get('search'),kind=type==='movie'?'movie':'tv';
 let j;
 if(s)j=await api('search/'+kind,{query:s,page,include_adult:'false'});
 else if(g)j=await api('discover/'+kind,{with_genres:gid(g)||'',sort_by:'popularity.desc','vote_count.gte':kind==='movie'?100:50,page,include_adult:'false'});
 else{
  const P={trending:'trending/'+kind+'/week',top:kind+'/popular',rated:kind+'/top_rated',playing:'movie/now_playing',soon:'movie/upcoming',airing:'tv/on_the_air'}[id]||kind+'/popular';
  j=await api(P,{page});
 }
 return{metas:(j.results||[]).map(r=>brief(r,type))};
}

async function meta(type,id0){
 const kind=type==='movie'?'movie':'tv',base=id0.split(':').slice(0,id0.startsWith('tmdb:')?2:1).join(':');
 let tid,imdb='';
 if(id0.startsWith('tmdb:'))tid=id0.split(':')[1];
 else{
  imdb=id0.split(':')[0];
  const f=await api('find/'+imdb,{external_source:'imdb_id'}),hit=((kind==='movie'?f.movie_results:f.tv_results)||[])[0];
  if(!hit)throw Error('Not on TMDB');tid=hit.id;
 }
 const d=await api(kind+'/'+tid,{append_to_response:'credits,external_ids,videos,images',include_image_language:'en,null'});
 imdb=imdb||(d.external_ids&&d.external_ids.imdb_id)||d.imdb_id||'';
 const logos=((d.images&&d.images.logos)||[]).filter(l=>!l.iso_639_1||l.iso_639_1==='en').sort((a,b)=>(b.vote_average||0)-(a.vote_average||0)),
  trailers=((d.videos&&d.videos.results)||[]).filter(v=>v.site==='YouTube'&&/Trailer|Teaser/.test(v.type)).sort((a,b)=>(b.type==='Trailer')-(a.type==='Trailer')).slice(0,4).map(v=>({source:v.key,type:'Trailer'})),
  cr=d.credits||{},crew=cr.crew||[],
  m={id:id0,type,name:d.title||d.name||'',poster:img(d.poster_path,'w500'),background:img(d.backdrop_path,'w1280'),logo:logos[0]?img(logos[0].file_path,'w500'):undefined,
   description:d.overview||'',releaseInfo:yr(d.release_date||d.first_air_date),year:yr(d.release_date||d.first_air_date),released:d.release_date||d.first_air_date||undefined,
   imdbRating:d.vote_average?d.vote_average.toFixed(1):undefined,genres:(d.genres||[]).map(g=>g.name),
   runtime:type==='movie'?(d.runtime?d.runtime+' min':undefined):((d.episode_run_time||[])[0]||(d.last_episode_to_air&&d.last_episode_to_air.runtime)||0)+' min',
   language:(d.spoken_languages&&d.spoken_languages[0]&&(d.spoken_languages[0].english_name||d.spoken_languages[0].name))||undefined,
   country:(d.production_countries||[]).map(c=>c.name).join(', ')||undefined,
   director:type==='movie'?crew.filter(c=>c.job==='Director').map(c=>c.name).slice(0,2):(d.created_by||[]).map(c=>c.name).slice(0,3),
   writer:crew.filter(c=>/^(Screenplay|Writer)$/.test(c.job)).map(c=>c.name).slice(0,3),
   trailers,imdb_id:imdb||undefined,moviedb_id:tid,
   app_extras:{cast:(cr.cast||[]).slice(0,30).map(c=>({name:c.name,character:c.character,photo:img(c.profile_path,'w185')}))}};
 if(m.runtime==='0 min')m.runtime=undefined;
 if(type==='series'){
  const nums=(d.seasons||[]).map(s=>s.season_number).filter(n=>n>0),vids=[];
  for(let i=0;i<nums.length;i+=18){
   const part=nums.slice(i,i+18);
   try{
    const r=await api('tv/'+tid,{append_to_response:part.map(n=>'season/'+n).join(',')});
    part.forEach(n=>((r['season/'+n]||{}).episodes||[]).forEach(e=>vids.push({id:base+':'+n+':'+e.episode_number,season:n,episode:e.episode_number,title:e.name||'Episode '+e.episode_number,name:e.name,overview:e.overview||'',thumbnail:img(e.still_path,'w300'),released:e.air_date?new Date(e.air_date).toISOString():undefined})));
   }catch{}
  }
  m.videos=vids;
 }
 return{meta:m};
}

/* ---------- Cinemeta fallback ---------- */
async function cine(p){const r=await withTimeout(f0(CINE+p),12000);if(!r.ok)throw Error('Cinemeta '+r.status);return r.json()}

/* ---------- the virtual add-on ---------- */
const J=(x,st)=>new Response(JSON.stringify(x),{status:st||200,headers:{'Content-Type':'application/json'}});
window.fetch=async function(i,o){
 const raw=i&&i.url?i.url:String(i);
 const m=/kinora-tmdb\.local\/([^?#]*)/.exec(raw);
 if(!m)return f0(i,o);
 const p=m[1].replace(/\.json$/,'');
 if(p==='manifest')return J(MAN);
 const c=p.match(/^catalog\/(movie|series)\/([^/]+)(?:\/(.*))?$/);
 if(c){
  const type=c[1],id=decodeURIComponent(c[2]),extra=c[3]||'';
  try{return J(await catalog(type,id,extra))}
  catch{
   try{return J(await cine('/catalog/'+type+'/top'+(extra?'/'+extra:'')+'.json'))}catch{return J({metas:[]})}
  }
 }
 const t=p.match(/^meta\/(movie|series)\/(.+)$/);
 if(t){
  const type=t[1],id=decodeURIComponent(t[2]);
  try{return J(await meta(type,id))}
  catch(e){
   if(/^tt\d+/.test(id)){try{return J(await cine('/meta/'+type+'/'+encodeURIComponent(id)+'.json'))}catch{}}
   return J({err:String(e&&e.message||e)},502);
  }
 }
 return J({});
};

/* ---------- install it as the first built-in source; Cinemeta stays as the hidden fallback ---------- */
async function install(){
 try{
  const tm={url:URL0,manifest:MAN,core:1,tmdb:1};
  addons=addons.filter(a=>a.url!==URL0);
  const hasKey=!!KEY();
  const ci=addons.find(a=>a.url===CINEMETA);
  if(ci){ci.fb=hasKey?1:0;ci.core=1;addons=addons.filter(a=>a!==ci)}
  const cin=ci||{url:CINEMETA,manifest:await getJSON(CINEMETA),core:1};cin.fb=hasKey?1:0;
  /* TMDB first when there is a key, otherwise Cinemeta stays the main source */
  addons=hasKey?[tm,cin,...addons]:[cin,...addons];
  LS.set('addons',addons);
 }catch{}
}
const b0=window.boot;
window.boot=async()=>{await install();return b0()};
window.KTmdb={key:KEY,api,install};
})();
