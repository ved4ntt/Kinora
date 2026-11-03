/* Kinora embed player (vidly).
   Browser: always on. Windows / Android apps: Settings > Playback > "Embed player" (off by default, the apps use their own player).
   Anime always uses the embed player. The links are built in; nothing to fill in. */
(()=>{
const D=document,Q=s=>D.querySelector(s);
const APP=!!(window.kinoraWin||(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()));
const LINK={
 movie:'https://vidly.pro/movie/{tmdb}?autoplay=1&audioPicker=1',
 tv:'https://vidly.pro/tv/{tmdb}/{season}/{episode}?autoplay=1&audioPicker=1',
 anime:'https://vidly.pro/anime/mal/{mal_id}/{episode}/sub?autoplay=1&audioPicker=1'
};
const fill=(t,o)=>t.replace(/\{(\w+)\}/g,(_,k)=>encodeURIComponent(o[k]));
const on=()=>!APP||(typeof CFG==='function'&&CFG().embed===true);
const should=(type)=>type==='anime'||on();
const sayE=m=>{try{toast(m)}catch{}};

async function metaOf(type,id){
 try{const a=addons.find(x=>has(x,'meta',type,id));if(a)return((await call(a,'meta',type,id)).meta)||{}}catch{}
 return{};
}
async function tmdbOf(type,id,m){
 if(m&&m.moviedb_id)return m.moviedb_id;
 if(/^tmdb:/.test(id))return id.split(':')[1];
 const imdb=(m&&m.imdb_id)||(/^tt\d+/.test(id)?id.split(':')[0]:'');
 if(imdb&&window.KTmdb){
  try{const f=await KTmdb.api('find/'+imdb,{external_source:'imdb_id'}),h=((type==='movie'?f.movie_results:f.tv_results)||[])[0];if(h)return h.id}catch{}
 }
 return '';
}
async function open(type,id,vid,m){
 id=decodeURIComponent(id);vid=vid?decodeURIComponent(vid):'';
 m=m&&m.name?m:await metaOf(type,id);
 const ep=/:(\d+):(\d+)$/.exec(vid||''),season=ep?ep[1]:1,episode=ep?ep[2]:1;
 let u='';
 if(type==='anime'){
  u=fill(LINK.anime,{mal_id:id.split(':')[1],episode});
 }else{
  const tmdb=await tmdbOf(type,id,m);
  if(!tmdb){sayE('Could not find this title for the embed player');return false}
  u=type==='movie'?fill(LINK.movie,{tmdb}):fill(LINK.tv,{tmdb,season,episode});
 }
 show(u,(m&&m.name)||'',type,id);
 return true;
}
function close(){
 const e=Q('#kemb');if(!e)return;
 e.remove();
 if(/^#\/watch\/anime/.test(location.hash))history.back();
}
function show(u,name,type,id){
 const old=Q('#kemb');if(old)old.remove();
 const e=D.createElement('div');e.id='kemb';
 e.innerHTML='<iframe src="'+u+'" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe><button class="rb" id="kemb-x" aria-label="Back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>';
 D.body.append(e);
 Q('#kemb-x').onclick=()=>{close();if(!/^#\/watch\//.test(location.hash)&&history.state&&history.state.kemb)history.back()};
 try{history.pushState({kemb:1},'')}catch{}
}
addEventListener('popstate',()=>{const e=Q('#kemb');if(e&&!(history.state&&history.state.kemb)){e.remove();}});
{const b0=window.__kBack;window.__kBack=function(){if(Q('#kemb')){close();return 1}return b0?b0():0}}
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&Q('#kemb'))close()});

const st=D.createElement('style');
st.textContent='#kemb{position:fixed;inset:0;z-index:70;background:#000}#kemb iframe{position:absolute;inset:0;width:100%;height:100%;border:0}#kemb .rb{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));left:12px;width:42px;height:42px;display:grid;place-items:center;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;cursor:pointer;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}#kemb .rb svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}html.win #kemb .rb{top:44px}';
D.head.append(st);

/* the setting only exists in the apps */
if(APP&&window.K6&&K6.PAGES&&K6.PAGES.play){
 const pp=K6.PAGES.play;
 K6.PAGES.play=()=>{
  pp();const p=Q('.k6');if(!p)return;
  const c=CFG().embed===true;
  p.insertAdjacentHTML('beforeend','<h4 class="k6h">Embed player</h4><div class="k6c"><div class="k6o"><span><b>Use the embed player</b><small>Plays from the embed provider instead of your add-ons. Off uses the Kinora player with your add-ons.</small></span><button class="k6t'+(c?' on':'')+'" data-tg="embed" role="switch" aria-checked="'+c+'" aria-label="Embed player"></button></div></div>');
 };
}
window.KEmbed={open,should,on,close,links:LINK};
})();
