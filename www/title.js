/* Kinora Details page: clean rebuild of V.title. Uses the app's own helpers (call, progFor, playTitle, openSrc, setSt, EW) and its own kt-/kh- classes. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const tile=window.KTile||(()=>'');
const sec=(t,b)=>'<section class="kt-s"><h2>'+h(t)+'</h2>'+b+'</section>';

V.title=async function(type,id){
 id=decodeURIComponent(id);
 const app=D.getElementById('app');app.innerHTML=LD;
 const a=addons.find(a=>has(a,'meta',type,id));if(!a)throw Error('No source can describe this title');
 const m=(await call(a,'meta',type,id)).meta;m.type=m.type||type;M[m.type+'|'+m.id]=m;
 const vids=(m.videos||[]).filter(v=>v.season>0||type!=='series').sort((x,y)=>x.season-y.season||x.episode-y.episode);
 const seasons=[...new Set(vids.map(v=>v.season))],w0=EW(),pr=progFor(m)||{};
 let sel=pr.vid||(vids.find(v=>!w0[v.id])||vids[0]||{}).id||'';
 const cur=()=>vids.find(v=>v.id===sel)||{};
 let season=cur().season||seasons[0]||0;
 let cast=(m.app_extras&&m.app_extras.cast)||(m.cast||[]).map(name=>({name}));
 {const have=new Set(cast.map(c=>c.name));[['director','Director'],['writer','Writer']].forEach(([k,r])=>[].concat(m[k]||[]).forEach(n=>{if(!have.has(n)){have.add(n);cast.push({name:n,character:r})}}))}
 const trl=[...(m.trailerStreams||[]).map(t=>t.ytId),...(m.trailers||[]).map(t=>t.source)].filter(Boolean).slice(0,4);
 const rel=m.released?new Date(m.released).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}):(m.releaseInfo||m.year);
 const info=[['Released',rel],['Language',m.language],['Country',m.country],['Director',[].concat(m.director||[]).join(', ')],['Writers',[].concat(m.writer||[]).join(', ')],['Awards',m.awards],['IMDb rating',m.imdbRating&&m.imdbRating+' / 10']].filter(x=>x[1]);
 const label=()=>{const c=cur(),p=progFor(m),res=p&&(type!=='series'||p.vid===sel);return ic('play')+(res?'Resume':'Play')+(type==='series'&&c.season!=null?' S'+c.season+' E'+c.episode:'')};
 const s0=stOf(m),saved=inLib(m),RXK=['love','like','dislike'];
 const ep=v=>'<div class="kt-ep'+(v.id===sel?' on':'')+(EW()[v.id]?' wtd':'')+'" data-v="'+h(v.id)+'"><img loading="lazy" src="'+h(v.thumbnail||'')+'" alt=""><div><b>'+v.episode+'. '+h(v.title||v.name||'Episode '+v.episode)+'</b><small>'+(v.released?new Date(v.released).toLocaleDateString():'')+'</small><p>'+h((v.overview||v.description||'').slice(0,160))+'</p></div><button class="kt-w'+(EW()[v.id]?' on':'')+'" data-w="'+h(v.id)+'" aria-label="Mark as watched">'+ic('check')+'</button></div>';
 const epList=s=>vids.filter(v=>v.season===s).map(ep).join('');
 const pc=c=>'<div class="kt-pc" data-n="'+h(c.name)+'">'+(c.photo?'<img referrerpolicy="no-referrer" src="'+h(c.photo)+'" alt="">':'<span>'+h((c.name||'?')[0])+'</span>')+'<b>'+h(c.name)+'</b><small>'+h(c.character||'')+'</small></div>';

 app.innerHTML='<div class="kt"><section class="kt-hero"><div class="kt-bg" style="background-image:url(\''+h(m.background||m.poster||'')+'\')"></div><div class="kt-in kh-fade">'+
  (m.logo?'<img class="kh-logo" src="'+h(m.logo)+'" alt="'+h(m.name)+'">':'<h1 class="kh-h">'+h(m.name)+'</h1>')+
  '<div class="kh-meta">'+(m.imdbRating?'<b>\u2605 '+h(m.imdbRating)+'</b>':'')+[m.releaseInfo||m.year,m.runtime].filter(Boolean).map(x=>'<span>'+h(String(x))+'</span>').join('')+(m.genres||[]).slice(0,3).map(g=>'<span>'+h(g)+'</span>').join('')+(adult(m)?'<span>E \u00b7 Adult content</span>':'')+'</div>'+
  '<p class="kh-d kt-d" id="kt-d">'+h(m.description||'')+'</p>'+
  '<div class="kt-ac"><button class="kh-btn" id="kt-play">'+label()+'</button><button class="kt-b" id="kt-src">Sources</button><button class="kt-b'+(saved?' on':'')+'" id="kt-lib">'+(saved?'In my list':'My list')+'</button><button class="kt-b'+(s0.l?' on':'')+'" id="kt-wl">Watch later</button><button class="kt-b'+(s0.w?' on':'')+'" id="kt-wd">Watched</button>'+
  '<span class="kt-rx">'+RXK.map(r=>'<button data-r="'+r+'" class="'+(s0.r===r?'on '+r:'')+'" aria-label="'+r+'">'+ic(RX[r])+'</button>').join('')+'</span></div></div></section>'+
  (type==='series'&&vids.length?sec('Episodes','<div class="kt-tabs" id="kt-st">'+seasons.map(s=>'<button class="'+(s===season?'on':'')+'" data-s="'+s+'">'+(s?'Season '+s:'Specials')+'</button>').join('')+'</div><div id="kt-el">'+epList(season)+'</div>'):'')+
  (cast.length?sec('Cast','<div class="kh-sc kt-cast" id="kt-cast">'+cast.map(pc).join('')+'</div>'):'')+
  (trl.length?sec('Trailers','<div class="kh-sc">'+trl.map(y=>'<div class="kt-tr" data-y="'+h(y)+'" style="background-image:url(\'https://img.youtube.com/vi/'+h(y)+'/hqdefault.jpg\')">'+ic('play')+'</div>').join('')+'</div>'):'')+
  (info.length?sec('Details','<div class="kt-dg">'+info.map(x=>'<div><small>'+h(x[0])+'</small>'+h(x[1])+'</div>').join('')+'</div>'):'')+
  '<div id="kt-more"></div></div>';

 setAmb(m.background||m.poster);scrollTo(0,0);
 const $=s=>Q(s,app),play=()=>playTitle(m,type,id,sel),paintPlay=()=>{$('#kt-play').innerHTML=label()};
 $('#kt-play').onclick=play;$('#kt-src').onclick=()=>openSrc(m,type,id,sel);
 $('#kt-d').onclick=e=>e.currentTarget.classList.toggle('open');
 $('#kt-lib').onclick=e=>{const on=toggleLib(m);e.currentTarget.classList.toggle('on',on);e.currentTarget.textContent=on?'In my list':'My list'};
 const flag=(id2,k,on,off)=>{$(id2).onclick=e=>{const v=!stOf(m)[k];setSt(m,{[k]:v});e.currentTarget.classList.toggle('on',v);toast(v?on:off)}};
 flag('#kt-wl','l','Added to watch later','Removed from watch later');flag('#kt-wd','w','Marked as watched','Marked as unwatched');
 QA('.kt-rx button',app).forEach(b=>b.onclick=()=>{const r=b.dataset.r,v=stOf(m).r===r?'':r;setSt(m,{r:v});QA('.kt-rx button',app).forEach(x=>{x.className=x.dataset.r===v?'on '+v:''});if(v)burst(b,v);else toast('Reaction removed')});
 QA('.kt-tr',app).forEach(t=>t.onclick=()=>openTrailer(t.dataset.y));

 const bindCast=()=>QA('.kt-pc',app).forEach(p=>{
  p.onclick=()=>{const i=p.querySelector('img');openPerson(p.dataset.n,i?i.src:'')};
  const im=p.querySelector('img'),fb=()=>wiki(p.dataset.n).then(u=>{if(u)p.firstElementChild.outerHTML='<img referrerpolicy="no-referrer" src="'+h(u)+'" alt="">'});
  if(im)im.onerror=fb;else fb();
 });
 bindCast();
 if(window.KCredits&&LS.get('tmdbKey','')&&cast.length<20)KCredits(type,id).then(l=>{const b=$('#kt-cast');if(b&&l.length>cast.length){b.innerHTML=l.map(pc).join('');bindCast()}}).catch(()=>{});

 if(type==='series'&&vids.length){
  const bind=()=>QA('.kt-ep',app).forEach(e=>e.onclick=ev=>{
   const w=ev.target.closest('.kt-w');
   if(w){const x=EW();if(x[w.dataset.w])delete x[w.dataset.w];else x[w.dataset.w]=1;LS.set('ew',x);w.classList.toggle('on');e.classList.toggle('wtd');return}
   sel=e.dataset.v;QA('.kt-ep',app).forEach(y=>y.classList.toggle('on',y===e));paintPlay();play();
  });
  $('#kt-st').onclick=e=>{const b=e.target.closest('button');if(!b)return;QA('#kt-st button',app).forEach(x=>x.classList.toggle('on',x===b));season=+b.dataset.s;$('#kt-el').innerHTML=epList(season);bind()};
  bind();
 }
 const cm=addons.find(x=>x.core),g=(m.genres||[])[0];
 if(cm&&g)call(cm,'catalog',type,'top','genre='+encodeURIComponent(g)).then(r=>{const l=(r.metas||[]).filter(x=>x.id!==id).slice(0,16),b=$('#kt-more');if(b&&l.length)b.innerHTML=sec('More like this','<div class="kh-sc">'+l.map(tile).join('')+'</div>')}).catch(()=>{});
};
})();
