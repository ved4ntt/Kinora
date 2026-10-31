/* Kinora Home: one clean screen that replaces the old stacked banner, hover and resume patches.
   Uses the app's data layer (cats, call, LS, M) and its own kh- classes, so the old patches cannot touch it. */
(()=>{
const D=document,A=()=>D.getElementById('app');
const mins=s=>{const m=Math.max(1,Math.round(s/60));return m>=60?Math.floor(m/60)+'h '+(m%60)+'m':m+'m'};
const yr=m=>String(m.releaseInfo||m.year||'');

const tile=m=>{
 if(CFG().hideAdult&&adult(m))return'';
 M[m.type+'|'+m.id]=m;
 return'<a class="kh-c" href="'+dt(m)+'"><div class="kh-i"><img loading="lazy" decoding="async" src="'+h(poster(m))+'" alt="">'+(m.imdbRating?'<em class="kh-r">\u2605 '+h(m.imdbRating)+'</em>':'')+'</div><span>'+h(m.name)+'</span><small>'+h(yr(m))+'</small></a>';
};

const cont=()=>{
 const l=Object.values(LS.get('prog',{})).filter(p=>p&&p.id&&p.name).sort((a,b)=>b.at-a.at).slice(0,14);
 if(!l.length)return'';
 return'<section class="kh-row"><h2>Continue watching</h2><div class="kh-sc">'+l.map(p=>{
  const f=p.d?Math.min(100,100*p.t/p.d):0;
  return'<a class="kh-c" href="#/title/'+p.type+'/'+encodeURIComponent(p.id)+'"><div class="kh-i"><img loading="lazy" src="'+h(poster(p))+'" alt="">'+(p.d?'<em class="kh-r">'+mins(p.d-p.t)+' left</em>':'')+'<div class="kh-b"><i style="width:'+f+'%"></i></div></div><span>'+h(p.name)+'</span></a>';
 }).join('')+'</div></section>';
};

function hero(it){
 const el=D.getElementById('kh-hero');if(!el)return;
 if(!it.length){el.remove();const k=Q1('.kh');if(k)k.classList.add('nohero');return}
 el.innerHTML='';
 const bgs=it.map(m=>{const b=D.createElement('div');b.className='kh-bg';b.style.backgroundImage='url('+JSON.stringify(m.background)+')';el.append(b);return b});
 const inn=D.createElement('div');inn.className='kh-in';el.append(inn);
 const dw=D.createElement('div');dw.className='kh-dots';el.append(dw);
 const dots=it.map((_,k)=>{const d=D.createElement('i');d.onclick=()=>{show(k);start()};dw.append(d);return d});
 let i=0,t;
 function show(k){
  i=(k+it.length)%it.length;const m=it[i];
  bgs.forEach((b,j)=>b.classList.toggle('on',j===i));dots.forEach((d,j)=>d.classList.toggle('on',j===i));
  inn.innerHTML=(m.logo?'<img class="kh-logo" src="'+h(m.logo)+'" alt="'+h(m.name)+'">':'<h1 class="kh-h">'+h(m.name)+'</h1>')+
   '<div class="kh-meta">'+(m.imdbRating?'<b>\u2605 '+h(m.imdbRating)+'</b>':'')+'<span>'+h(typeLabel(m.type))+'</span>'+(yr(m)?'<span>'+h(yr(m))+'</span>':'')+(m.genres||[]).slice(0,3).map(g=>'<span>'+h(g)+'</span>').join('')+'</div>'+
   '<p class="kh-d">'+h(m.description||'')+'</p><a class="kh-btn" href="'+dt(m)+'">'+ic('play')+'Play</a>';
  inn.classList.remove('kh-fade');void inn.offsetWidth;inn.classList.add('kh-fade');
 }
 function start(){clearInterval(t);t=setInterval(()=>{if(!el.isConnected){clearInterval(t);return}show(i+1)},8000)}
 show(0);start();
}
const Q1=s=>D.querySelector(s);

window.KTile=tile;
V.home=async function(){
 const app=A();
 if(!addons.length)return app.innerHTML='<div class="msg">Could not load the default catalog. Check your connection and reload.</div>';
 const cs=cats().filter(x=>/^(movie|series)$/.test(x.c.type)).slice(0,40);
 const P=cs.map(({a,c})=>call(a,'catalog',c.type,c.id).then(r=>r.metas||[]).catch(()=>[]));
 app.innerHTML='<div class="kh"><section class="kh-hero" id="kh-hero">'+LD+'</section>'+cont()+
  cs.map((x,i)=>'<section class="kh-row" id="khr'+i+'"><h2>'+h((x.c.name||x.c.id)+' '+typeLabel(x.c.type).toLowerCase())+'</h2><div class="kh-sc">'+'<i class="kh-ph"></i>'.repeat(9)+'</div></section>').join('')+'</div>';
 P.forEach((p,i)=>p.then(m=>{const s=Q1('#khr'+i+' .kh-sc');if(!s)return;const t=m.slice(0,30).map(tile).join('');t?s.innerHTML=t:s.parentNode.remove()}));
 const [a=[],b=[]]=await Promise.all([P[0],P[1]]);
 const pool=[],A1=a.filter(m=>m.background).slice(0,24),B1=b.filter(m=>m.background).slice(0,24);
 for(let k=0;k<24;k++){if(A1[k])pool.push(A1[k]);if(B1[k])pool.push(B1[k])}
 const good=pool.filter(m=>+m.imdbRating>=7);
 hero((good.length>=4?good:pool).slice(0,8));
};
})();
