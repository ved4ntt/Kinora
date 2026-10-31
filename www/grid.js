/* Kinora grid screens rebuilt: Movies / Series (discover), Search and Library. Same data logic as before, new markup (kg-*) and the shared poster tile. */
(()=>{
const D=document,Q=s=>D.querySelector(s),app=()=>D.getElementById('app');
const tile=m=>window.KTile?KTile(m):'';
const head=t=>'<header class="kg-h"><h1>'+h(t)+'</h1></header>';
const chips=(id,arr,cls)=>'<div class="kg-chips'+(cls||'')+'" id="'+id+'">'+arr.map((x,i)=>'<button class="'+(i?'':'on')+'" data-i="'+i+'">'+h(x)+'</button>').join('')+'</div>';
const pick=(box,b)=>box.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));

V.discover=async function(type='movie'){
 const list=cats().filter(x=>x.c.type===type);
 if(!list.length)return app().innerHTML='<div class="msg">No catalogs available for this type.</div>';
 let ci=0,genre='',skip=0,busy=0,end=0,tok=0;
 const gopts=()=>((list[ci].c.extra||[]).find(e=>e.name==='genre')||{}).options||[];
 app().innerHTML='<div class="kg">'+head(typeLabel(type))+chips('ct',list.map(x=>x.c.name||x.c.id))+'<div class="kg-chips sm" id="gt"></div><div class="kg-grid" id="g"></div><div id="sn" class="kg-sn">'+LDS+'</div></div>';
 const tabs=()=>{const g=gopts();Q('#gt').innerHTML=g.length?['All',...g].map((x,i)=>'<button class="'+(i?'':'on')+'" data-g="'+(i?h(x):'')+'">'+h(x)+'</button>').join(''):''};
 const load=async()=>{
  if(busy||end||!Q('#g'))return;busy=1;const my=tok,{a,c}=list[ci];
  const r=await call(a,'catalog',c.type,c.id,[genre&&'genre='+encodeURIComponent(genre),skip&&'skip='+skip].filter(Boolean).join('&')).catch(()=>({}));
  busy=0;if(my!==tok||!Q('#g'))return;
  const m=r.metas||[];if(!m.length)end=1;
  Q('#g').insertAdjacentHTML('beforeend',m.map(tile).join(''));skip+=m.length;
  Q('#sn').style.visibility=end?'hidden':'visible';
  if(!end&&Q('#sn').getBoundingClientRect().top<innerHeight+600)setTimeout(load,60);
 };
 const reset=()=>{tok++;skip=0;end=0;busy=0;Q('#g').innerHTML='';Q('#sn').style.visibility='visible';load()};
 Q('#ct').onclick=e=>{const b=e.target.closest('button');if(!b)return;ci=+b.dataset.i;genre='';pick(Q('#ct'),b);tabs();reset()};
 Q('#gt').onclick=e=>{const b=e.target.closest('button');if(!b)return;genre=b.dataset.g;pick(Q('#gt'),b);reset()};
 tabs();
 new IntersectionObserver(es=>es[0].isIntersecting&&load(),{rootMargin:'600px'}).observe(Q('#sn'));
 load();
};

V.search=async function(q=''){
 q=decodeURIComponent(q);const ql=q.toLowerCase();
 app().innerHTML='<div class="kg">'+head('Results for \u201c'+q+'\u201d')+'<div id="sr"></div><div id="sl" class="kg-sn">'+LDS+'</div></div>';
 const seen=new Set(),res={movie:[],series:[]},srcs=cats().filter(x=>(x.c.extra||[]).some(e=>e.name==='search'));
 const sc=m=>{const n=(m.name||'').toLowerCase();return n===ql?0:n.startsWith(ql)?1:n.includes(ql)?2:3},rt=m=>parseFloat(m.imdbRating)||0;
 const draw=fin=>{
  const s=Q('#sr');if(!s)return;
  s.innerHTML=['movie','series'].map(t=>res[t]&&res[t].length?'<h2 class="kg-t">'+typeLabel(t)+'</h2><div class="kg-grid">'+res[t].slice().sort((a,b)=>sc(a)-sc(b)||rt(b)-rt(a)).map(tile).join('')+'</div>':'').join('');
  if(fin){const l=Q('#sl');if(l)l.remove();if(!s.innerHTML)s.innerHTML='<p class="kg-e">No results. Try a different spelling.</p>'}
 };
 await Promise.all(srcs.flatMap(({a,c})=>['','&skip=25'].map(async x=>{
  const r=await call(a,'catalog',c.type,c.id,'search='+encodeURIComponent(q)+x).catch(()=>({}));
  for(const m of r.metas||[])if(!seen.has(m.type+m.id)){seen.add(m.type+m.id);(res[m.type]||(res[m.type]=[])).push(m)}
  draw();
 })));
 draw(1);
};

V.library=function(){
 const map={},get=(k,m)=>map[k]||(map[k]={m,f:new Set()});
 Object.entries(LS.get('lib',{})).forEach(([k,m])=>get(k,m).f.add('Saved'));
 Object.entries(ST()).forEach(([k,m])=>{const e=get(k,m);if(m.r)e.f.add({love:'Loved',like:'Liked',dislike:'Disliked'}[m.r]);if(m.w)e.f.add('Watched');if(m.l)e.f.add('Watch later')});
 const items=Object.values(map),T={All:()=>true,Saved:e=>e.f.has('Saved'),'Watch later':e=>e.f.has('Watch later'),Watched:e=>e.f.has('Watched'),Liked:e=>e.f.has('Liked')||e.f.has('Loved'),Disliked:e=>e.f.has('Disliked')};
 const keys=Object.keys(T);let tab='All';
 app().innerHTML='<div class="kg">'+head('Library')+chips('lt',keys)+'<div id="lg"></div></div>';
 const draw=()=>{
  const l=items.filter(T[tab]);
  Q('#lg').innerHTML=l.length?['movie','series'].map(t=>{const x=l.filter(e=>e.m.type===t);return x.length?'<h2 class="kg-t">'+typeLabel(t)+'</h2><div class="kg-grid">'+x.map(e=>'<div class="kg-lc">'+tile(e.m)+'<div class="kg-st">'+[...e.f].map(f=>'<span>'+h(f)+'</span>').join('')+'</div></div>').join('')+'</div>':''}).join(''):'<p class="kg-e">Nothing here yet.</p>';
 };
 Q('#lt').onclick=e=>{const b=e.target.closest('button');if(!b)return;tab=b.textContent;pick(Q('#lt'),b);draw()};
 draw();
};
})();
