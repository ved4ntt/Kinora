/* Kinora embed player (optional, off by default).
   Plays a title inside an iframe from a provider you are authorized to use.
   It changes no other code: it only listens for the Play button and episode taps on the details page.
   Turn it on in Settings > Playback > Embed player. Turn it off and your add-on player works exactly as before. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s);
const KEY='kembed',IDS='kembed-ids';
const DEF={on:false,movie:'',tv:'',sandbox:true}; /* sandbox:true blocks pop-ups and redirects. If a player stays blank, set it to false. */
const cfg=()=>{try{return{...DEF,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return{...DEF}}};
const save=p=>localStorage.setItem(KEY,JSON.stringify({...cfg(),...p}));

/* find the TMDB id automatically: catalog data first, then the catalog add-on, then TMDB (only if you added a key) */
async function tmdbId(id,kind){
 let c={};try{c=JSON.parse(localStorage.getItem(IDS)||'{}')}catch{}
 const k=kind+':'+id;if(c[k])return c[k];
 const keep=v=>{if(v){c[k]=v;localStorage.setItem(IDS,JSON.stringify(c))}return v||''};
 const pick=m=>m&&(m.moviedb_id||m.tmdb_id||m.tmdbId||'');
 let v=pick(M[kind+'|'+id]);                         /* already loaded by the details page */
 if(v)return keep(v);
 try{                                                /* ask the add-on that knows this title */
  const a=addons.find(x=>has(x,'meta',kind,id));
  if(a){const r=await call(a,'meta',kind,id);v=pick(r&&r.meta);if(v)return keep(v)}
 }catch{}
 const key=LS.get('tmdbKey','');if(!key)return '';   /* last resort: look it up on TMDB */
 const r=await fetch('https://api.themoviedb.org/3/find/'+encodeURIComponent(id)+'?external_source=imdb_id&api_key='+encodeURIComponent(key)).then(x=>x.json()).catch(()=>null);
 const hit=r&&((kind==='movie'?r.movie_results:r.tv_results)||[])[0];
 return keep(hit&&hit.id);
}
const fill=(t,v)=>t.replace(/\{(imdb|tmdb|season|episode)\}/g,(_,k)=>encodeURIComponent(v[k]==null?'':v[k]));

async function openEmbed(type,id,s,e,kind){
 const c=cfg(),tpl=type==='movie'?c.movie:c.tv;
 if(!tpl){toast('Add your embed address in Settings > Playback first');return}
 let tmdb='';
 if(/^tmdb:(\d+)/.test(id))tmdb=RegExp.$1;
 else if(/\{tmdb\}/.test(tpl)){tmdb=await tmdbId(id,kind);if(!tmdb){toast('Could not find the TMDB id for this title. Use {imdb} in your address instead.');return}}
 const url=fill(tpl,{imdb:id,tmdb,season:s,episode:e});
 if(!/^https:\/\//i.test(url)){toast('The embed address must start with https://');return}
 show(url);
}

/* full-screen overlay with the iframe */
const st=D.createElement('style');
st.textContent='#kemb{position:fixed;inset:0;z-index:500;background:#000}#kemb iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.kemb-x{position:absolute;top:calc(12px + env(safe-area-inset-top,0px));left:12px;z-index:2;display:grid;place-items:center;width:46px;height:46px;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;cursor:pointer}.kemb-x svg{width:22px;height:22px}.kemb-in{width:100%;height:46px;margin-top:10px;padding:0 16px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.06);color:var(--tx);font:500 14px Manrope,sans-serif;outline:0}';
D.head.append(st);
function close(){const o=Q('#kemb');if(o)o.remove()}
function show(url){
 close();
 const o=D.createElement('div');o.id='kemb';
 o.innerHTML='<button class="kemb-x" aria-label="Close">'+ic('back')+'</button><iframe src="'+h(url)+'" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="origin"'+(cfg().sandbox?' sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"':'')+'></iframe>';
 D.body.append(o);
 history.pushState({kemb:1},''); /* the phone's Back button closes the player */
 Q('.kemb-x',o).onclick=()=>history.back();
}
addEventListener('popstate',close);
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&Q('#kemb')){e.preventDefault();history.back()}});

/* Play button and episode taps on the details page */
D.addEventListener('click',e=>{
 if(!cfg().on)return;
 const m=location.hash.match(/^#\/title\/(movie|series)\/([^/?]+)/);if(!m)return;
 const hit=e.target.closest('#kt-play,.kt-ep');if(!hit||e.target.closest('.kt-w'))return;
 const type=m[1]==='movie'?'movie':'tv',id=decodeURIComponent(m[2]);
 let s=1,ep=1;
 if(type==='tv'){
  const el=e.target.closest('.kt-ep'),vid=el?el.dataset.v:'',p=vid.split(':');
  if(p.length>=3){s=+p[p.length-2];ep=+p[p.length-1]}
  else{const x=/S(\d+)\s*E(\d+)/i.exec((Q('#kt-play')||{}).textContent||'');if(x){s=+x[1];ep=+x[2]}}
 }
 e.preventDefault();e.stopImmediatePropagation();
 openEmbed(type,id,s,ep,m[1]);
},true);

/* settings: Settings > Playback > Embed player */
if(window.K6&&K6.PAGES.play){
 const pp=K6.PAGES.play;
 K6.PAGES.play=()=>{
  pp();const p=Q('.k6');if(!p)return;const c=cfg();
  p.insertAdjacentHTML('beforeend','<h4 class="k6h">Embed player</h4><div class="k6c"><div class="k6o"><span><b>Use embed player</b><small>Play titles in a player from a provider you are authorized to use. Turn off to use your add-ons.</small></span><button class="k6t'+(c.on?' on':'')+'" id="kemb-on" role="switch" aria-checked="'+c.on+'" aria-label="Use embed player"></button></div><div class="k6o col"><span><b>Movie address</b><small>Use {tmdb} or {imdb}. TMDB ids are found automatically. It must start with https://</small></span><input class="kemb-in" id="kemb-m" value="'+h(c.movie)+'" placeholder="https://your-provider/movie/{tmdb}" autocapitalize="off" spellcheck="false"></div><div class="k6o col"><span><b>Series address</b><small>Use {tmdb} or {imdb}, plus {season} and {episode}</small></span><input class="kemb-in" id="kemb-t" value="'+h(c.tv)+'" placeholder="https://your-provider/tv/{tmdb}/{season}/{episode}" autocapitalize="off" spellcheck="false"></div></div>');
 };
}
D.addEventListener('click',e=>{
 const b=e.target.closest('#kemb-on');if(!b)return;
 const on=!cfg().on;save({on});b.classList.toggle('on',on);b.setAttribute('aria-checked',on);
});
D.addEventListener('input',e=>{
 if(e.target.id==='kemb-m')save({movie:e.target.value.trim()});
 if(e.target.id==='kemb-t')save({tv:e.target.value.trim()});
});
})();
