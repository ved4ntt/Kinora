/* Kinora anime: a built-in source for the Anime tab, using MyAnimeList data (through the Jikan API).
   Anime titles use ids like  mal:1535  and the type "anime". Playing them opens the embed player (see embed.js). */
(()=>{
const f0=window.fetch.bind(window);
const URLA='https://kinora-anime.local/manifest.json',JK='https://api.jikan.moe/v4';
const GEN={Action:1,Adventure:2,Comedy:4,Drama:8,Fantasy:10,Horror:14,Mystery:7,Romance:22,'Sci-Fi':24,'Slice of Life':36,Sports:30,Supernatural:37,Suspense:41,Ecchi:9,Shounen:27,Seinen:42,Shoujo:25,Josei:43};
const MAN={id:'kinora.anime',version:'1.0.0',name:'Anime (MyAnimeList)',description:'Anime from MyAnimeList',
 resources:[{name:'catalog',types:['anime']},{name:'meta',types:['anime'],idPrefixes:['mal:']}],types:['anime'],idPrefixes:['mal:'],
 catalogs:[
  {type:'anime',id:'airing',name:'Airing now',extra:[{name:'skip'}]},
  {type:'anime',id:'popular',name:'Popular',extra:[{name:'genre',options:Object.keys(GEN)},{name:'search'},{name:'skip'}]},
  {type:'anime',id:'top',name:'Top rated',extra:[{name:'skip'}]},
  {type:'anime',id:'movies',name:'Anime movies',extra:[{name:'skip'}]},
  {type:'anime',id:'upcoming',name:'Coming soon',extra:[{name:'skip'}]}
 ]};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function jk(path){
 for(let i=0;i<3;i++){
  const r=await Promise.race([f0(JK+path),new Promise((_,no)=>setTimeout(()=>no(Error('timeout')),12000))]);
  if(r.status===429){await wait(900*(i+1));continue}
  if(!r.ok)throw Error('Jikan '+r.status);
  return r.json();
 }
 throw Error('Jikan is busy');
}
const img=a=>{const j=(a.images||{}).jpg||{},w=(a.images||{}).webp||{};return w.large_image_url||j.large_image_url||j.image_url};
const brief=a=>({id:'mal:'+a.mal_id,type:'anime',name:a.title_english||a.title||'',poster:img(a),background:(a.trailer&&a.trailer.images&&(a.trailer.images.maximum_image_url||a.trailer.images.large_image_url))||img(a),
 description:a.synopsis||'',releaseInfo:String(a.year||(a.aired&&a.aired.prop&&a.aired.prop.from&&a.aired.prop.from.year)||''),imdbRating:a.score?a.score.toFixed(1):undefined,genres:(a.genres||[]).map(g=>g.name)});
async function catalog(id,extra){
 const x=new URLSearchParams(extra||''),skip=+x.get('skip')||0,page=Math.floor(skip/25)+1,g=x.get('genre'),s=x.get('search'),b='&sfw=true&limit=25&page='+page;
 let j;
 if(s)j=await jk('/anime?q='+encodeURIComponent(s)+'&order_by=popularity'+b);
 else if(g)j=await jk('/anime?genres='+(GEN[g]||1)+'&order_by=popularity'+b);
 else j=await jk({airing:'/top/anime?filter=airing',popular:'/top/anime?filter=bypopularity',top:'/top/anime?',movies:'/top/anime?type=movie',upcoming:'/top/anime?filter=upcoming'}[id]+b);
 const seen=new Set();
 return{metas:(j.data||[]).filter(a=>!seen.has(a.mal_id)&&seen.add(a.mal_id)).map(brief)};
}
async function meta(id0){
 const mid=id0.split(':')[1];
 const d=(await jk('/anime/'+mid+'/full')).data,m=brief(d);
 m.id=id0;m.runtime=d.duration?String(d.duration).replace(/ per ep.*/i,''):undefined;
 m.country='Japan';m.language='Japanese';
 m.director=[];m.writer=[];
 const t=d.trailer&&d.trailer.youtube_id;m.trailers=t?[{source:t,type:'Trailer'}]:[];
 m.app_extras={cast:[]};
 let eps=[];
 try{
  for(let p=1;p<=4;p++){
   const r=await jk('/anime/'+mid+'/episodes?page='+p);
   eps=eps.concat((r.data||[]).map(e=>({n:e.mal_id,t:e.title,a:e.aired})));
   if(!(r.pagination&&r.pagination.has_next_page))break;
   await wait(450);
  }
 }catch{}
 const total=d.episodes||(d.type==='Movie'?1:0);
 const vids=[];
 if(eps.length)eps.forEach(e=>vids.push({id:id0+':1:'+e.n,season:1,episode:e.n,title:e.t||'Episode '+e.n,name:e.t,released:e.a?new Date(e.a).toISOString():undefined,thumbnail:m.poster}));
 else for(let n=1;n<=Math.max(1,total||12);n++)vids.push({id:id0+':1:'+n,season:1,episode:n,title:'Episode '+n,thumbnail:m.poster});
 m.videos=vids;
 return{meta:m};
}
const J=(x,st)=>new Response(JSON.stringify(x),{status:st||200,headers:{'Content-Type':'application/json'}});
const prev=window.fetch;
window.fetch=async function(i,o){
 const raw=i&&i.url?i.url:String(i),m=/kinora-anime\.local\/([^?#]*)/.exec(raw);
 if(!m)return prev.call(window,i,o);
 const p=m[1].replace(/\.json$/,'');
 if(p==='manifest')return J(MAN);
 const c=p.match(/^catalog\/anime\/([^/]+)(?:\/(.*))?$/);
 if(c){try{return J(await catalog(decodeURIComponent(c[1]),c[2]||''))}catch{return J({metas:[]})}}
 const t=p.match(/^meta\/anime\/(.+)$/);
 if(t){try{return J(await meta(decodeURIComponent(t[1])))}catch(e){return J({err:String(e&&e.message||e)},502)}}
 return J({});
};
async function install(){
 try{
  addons=addons.filter(a=>a.url!==URLA);
  const i=addons.findIndex(a=>a.tmdb);
  addons.splice(i<0?0:i+1,0,{url:URLA,manifest:MAN,core:1,anime:1});
  LS.set('addons',addons);
 }catch{}
}
const b0=window.boot;
window.boot=async()=>{await install();return b0()};
window.KAnime={api:jk};
})();
