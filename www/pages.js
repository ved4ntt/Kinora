/* Kinora pages: a stable Search page (no reload flicker, no reshuffling) and Movies/Series with built-in catalog and genre pickers. */
(()=>{
const D=document,Q=s=>D.querySelector(s),app=()=>D.getElementById('app');
const tile=m=>window.KTile?KTile(m):'';
const head=t=>'<header class="kg-h"><h1>'+h(t)+'</h1></header>';
const un=s=>{try{return decodeURIComponent(s||'')}catch{return s||''}};

/* ---------------- search ---------------- */
let tok=0;
const recent=()=>LS.get('recent',[]);
function suggestions(){
 const box=Q('#sr');if(!box)return;const r=recent();
 box.classList.remove('ld');
 box.innerHTML=r.length?'<h2 class="kg-t">Recent searches</h2><div class="ks-r">'+r.map(x=>'<a href="#/search/'+encodeURIComponent(x)+'">'+h(x)+'</a>').join('')+'</div>':'<p class="kg-e">Type a movie or series name to search.</p>';
}
async function run(q){
 const my=++tok;if(!Q('#sr'))return;
 Q('#sr').classList.add('ld');
 const ql=q.toLowerCase(),seen=new Set(),res={movie:[],series:[]};
 const srcs=cats().filter(x=>(x.c.extra||[]).some(e=>e.name==='search'));
 const one=(a,c,x)=>Promise.race([call(a,'catalog',c.type,c.id,'search='+encodeURIComponent(q)+x),new Promise(r=>setTimeout(()=>r({}),9000))]).catch(()=>({}));
 const out=await Promise.all(srcs.flatMap(({a,c})=>['','&skip=25'].map(x=>one(a,c,x))));
 if(my!==tok||!Q('#sr'))return; /* a newer search took over */
 const sc=m=>{const n=(m.name||'').toLowerCase();return n===ql?0:n.startsWith(ql)?1:n.includes(ql)?2:3},rt=m=>parseFloat(m.imdbRating)||0;
 out.forEach(r=>(r.metas||[]).forEach(m=>{if(!seen.has(m.type+m.id)){seen.add(m.type+m.id);(res[m.type]||(res[m.type]=[])).push(m)}}));
 const b=Q('#sr');b.classList.remove('ld');
 b.innerHTML=['movie','series'].map(t=>res[t]&&res[t].length?'<h2 class="kg-t">'+typeLabel(t)+'</h2><div class="kg-grid">'+res[t].sort((a,b)=>sc(a)-sc(b)||rt(b)-rt(a)).map(tile).join('')+'</div>':'').join('')||'<p class="kg-e">No results for \u201c'+h(q)+'\u201d. Try another spelling.</p>';
 LS.set('recent',[q,...recent().filter(x=>x.toLowerCase()!==ql)].slice(0,8));
}
V.search=function(q=''){
 q=un(q).trim();
 app().innerHTML='<div class="kg">'+head('Search')+'<form class="ks-f" id="ks-f">'+ic('search')+'<input type="search" id="ks-i" placeholder="Search movies and series" autocomplete="off" enterkeyhint="search" value="'+h(q)+'"></form><div id="sr"></div></div>';
 const i=Q('#ks-i');let t;
 const go=v=>{v=v.trim();if(v.length<2){tok++;suggestions();return}history.replaceState(null,'','#/search/'+encodeURIComponent(v));run(v)};
 i.oninput=()=>{clearTimeout(t);t=setTimeout(()=>go(i.value),450)};
 Q('#ks-f').onsubmit=e=>{e.preventDefault();clearTimeout(t);go(i.value);i.blur()};
 window.KSearch={set:v=>{i.value=v;go(v)}};
 if(q.length>=2)run(q);else{suggestions();if(matchMedia('(max-width:760px)').matches)setTimeout(()=>i.focus(),300)}
};

/* ---------------- Movies / Series ---------------- */
const dd=(id,items,sel)=>'<div class="kdd" id="'+id+'"><button class="kdd-b" type="button"><span>'+h(items[sel]||'')+'</span>'+ic('chev')+'</button><div class="kdd-l">'+items.map((x,i)=>'<button type="button" data-i="'+i+'" class="'+(i===sel?'on':'')+'">'+h(x)+'</button>').join('')+'</div></div>';
D.addEventListener('click',e=>{
 const b=e.target.closest('.kdd-b');
 D.querySelectorAll('.kdd.open').forEach(x=>{if(!b||x!==b.parentNode)x.classList.remove('open')});
 if(b)b.parentNode.classList.toggle('open');
});
V.discover=async function(type='movie',ci0){
 const list=cats().filter(x=>x.c.type===type);
 if(!list.length)return app().innerHTML='<div class="msg">No catalogs available for this type.</div>';
 let ci=Math.max(0,Math.min(list.length-1,parseInt(ci0)||0)),genre='',skip=0,busy=0,end=0,tk=0;
 const gl=()=>((list[ci].c.extra||[]).find(e=>e.name==='genre')||{}).options||[];
 app().innerHTML='<div class="kg">'+head(typeLabel(type))+'<div class="kg-bar"><div id="dc"></div><div id="dg"></div></div><div class="kg-grid" id="g"></div><div id="sn" class="kg-sn">'+LDS+'</div></div>';
 const bar=()=>{Q('#dc').innerHTML=dd('ddc',list.map(x=>x.c.name||x.c.id),ci);const g=gl();Q('#dg').innerHTML=g.length?dd('ddg',['All genres',...g],genre?g.indexOf(genre)+1:0):''};
 const load=async()=>{
  if(busy||end||!Q('#g'))return;busy=1;const my=tk,{a,c}=list[ci];
  const r=await call(a,'catalog',c.type,c.id,[genre&&'genre='+encodeURIComponent(genre),skip&&'skip='+skip].filter(Boolean).join('&')).catch(()=>({}));
  busy=0;if(my!==tk||!Q('#g'))return;
  const m=r.metas||[];if(!m.length)end=1;
  Q('#g').insertAdjacentHTML('beforeend',m.map(tile).join(''));skip+=m.length;
  Q('#sn').style.visibility=end?'hidden':'visible';
  if(!end&&Q('#sn').getBoundingClientRect().top<innerHeight+600)setTimeout(load,60);
 };
 const reset=()=>{tk++;skip=0;end=0;busy=0;Q('#g').innerHTML='';Q('#sn').style.visibility='visible';load()};
 Q('.kg-bar').onclick=e=>{
  const b=e.target.closest('.kdd-l button');if(!b)return;const i=+b.dataset.i;
  if(b.closest('#ddc')){ci=i;genre=''}else genre=i?gl()[i-1]:'';
  bar();reset();
 };
 bar();
 new IntersectionObserver(es=>es[0].isIntersecting&&load(),{rootMargin:'600px'}).observe(Q('#sn'));
 load();
};
})();
