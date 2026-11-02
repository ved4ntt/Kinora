/* Kinora Explore: a clean replacement for the Explore page, built for phones first.
   Copy this file to www/explore.js and add <script src="explore.js"></script> after shell.js in index.html. */
(()=>{
const D=document;

const css=`
.kxp{padding:calc(env(safe-area-inset-top,0px) + 26px) 18px 150px}
@media(min-width:761px){.kxp{padding:112px clamp(18px,3vw,40px) 150px;max-width:1100px}}
.kxp h1{margin:0 0 20px;font:800 clamp(32px,7vw,46px) Manrope,sans-serif;letter-spacing:-.03em}
.kxg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media(min-width:761px){.kxg{grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}}
.kxc{display:flex;flex-direction:column;justify-content:space-between;gap:28px;min-height:136px;padding:18px;border:1px solid rgba(255,255,255,.07);border-radius:24px;background:rgba(255,255,255,.055);color:var(--tx);font:inherit;text-align:left;text-decoration:none;cursor:pointer;transition:transform .25s var(--e),background .25s}
.kxc:active{transform:scale(.97)}
.kxc:focus-visible{outline:0;box-shadow:0 0 0 3px #f1efea}
.kxc i{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.08)}
.kxc svg{width:22px;height:22px}
.kxc b{display:block;font:700 17px Manrope,sans-serif}
.kxc small{display:block;margin-top:3px;color:var(--mu);font:500 12.5px/1.4 Manrope,sans-serif}
.kxp h2{margin:32px 4px 12px;font:700 17px Manrope,sans-serif;letter-spacing:-.01em}
.kxl{overflow:hidden;border:1px solid rgba(255,255,255,.06);border-radius:24px;background:rgba(255,255,255,.045)}
.kxl a{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:58px;padding:0 20px;color:var(--tx);font:600 15px Manrope,sans-serif;text-decoration:none;transition:background .2s}
.kxl a+a{border-top:1px solid rgba(255,255,255,.06)}
.kxl a:active{background:rgba(255,255,255,.08)}
.kxl a:focus-visible{outline:0;box-shadow:inset 0 0 0 3px #f1efea}
.kxl small{color:var(--mu);font-weight:500}
`;
if(!D.getElementById('kx-css')){const s=D.createElement('style');s.id='kx-css';s.textContent=css;D.head.append(s)}

const tile=(href,icon,title,sub,id)=>'<a class="kxc" href="'+href+'"'+(id?' id="'+id+'"':'')+'><i>'+ic(icon)+'</i><span><b>'+h(title)+'</b><small>'+h(sub)+'</small></span></a>';

V.explore=function(){
 const L=cats(),of=t=>L.filter(x=>x.c.type===t);
 const tiles=[
  tile('#/discover/movie','film','Movies',of('movie').length+' catalogs'),
  tile('#/discover/series','tv','Series',of('series').length+' catalogs')
 ];
 if(typeof V.live==='function')tiles.push(tile('#/live','livetv','Live TV','Channels you can watch now'));
 if(typeof V.calendar==='function')tiles.push(tile('#/calendar','cal','Calendar','New episodes coming up'));
 tiles.push(tile('#/explore','shuffle','Surprise me','Open a random popular movie','kx-r'));

 const rows=['movie','series'].flatMap(t=>of(t).map((x,i)=>'<a href="#/discover/'+t+'/'+i+'"><span>'+h(x.c.name||x.c.id)+'</span><small>'+h(typeLabel(t))+'</small></a>')).join('');

 D.getElementById('app').innerHTML='<div class="kxp"><h1>Explore</h1><div class="kxg">'+tiles.join('')+'</div>'+(rows?'<h2>All catalogs</h2><div class="kxl">'+rows+'</div>':'')+'</div>';

 const r=D.getElementById('kx-r');
 if(r)r.onclick=async e=>{
  e.preventDefault();
  const x=of('movie')[0];if(!x)return;
  const res=await call(x.a,'catalog',x.c.type,x.c.id).catch(()=>({})),m=(res.metas||[]).filter(p=>!(CFG().hideAdult&&adult(p)));
  if(!m.length)return;
  const p=m[Math.floor(Math.random()*m.length)];
  M[p.type+'|'+p.id]=p;location.hash=dt(p);
 };
};
})();
