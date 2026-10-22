/* Kinora v7: P2P switch, tidier banner/details, sliding mobile dock, ambient mobile background */
(()=>{
const D=document,Q=s=>D.querySelector(s),A=()=>D.getElementById('app');
const MOB=matchMedia('(max-width:820px)').matches||matchMedia('(pointer:coarse)').matches;
const S=()=>LS.get('cfg',{});

/* Peer-to-peer off: hide torrent-only streams from any add-on answer */
const f0=window.fetch.bind(window);
window.fetch=async function(i,o){
 const r=await f0(i,o);
 try{
  const u=decodeURIComponent(i&&i.url?i.url:String(i));
  if(S().p2p===false&&/\/stream\//.test(u)){
   const j=await r.clone().json();
   if(j&&Array.isArray(j.streams)){
    j.streams=j.streams.filter(s=>!(s.infoHash&&!s.url));
    return new Response(JSON.stringify(j),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'application/json'}});
   }
  }
 }catch{}
 return r;
};

const leafs=(root,re)=>[...root.querySelectorAll('*')].filter(e=>!e.children.length&&re.test(e.textContent.trim()));
const home=()=>/^#?\/?(home|movies|series)?\/?$/.test(location.hash);

function tidy(){
 const a=A();if(!a)return;
 const hero=a.querySelector('.hero');
 if(hero){
  if(home())leafs(hero,/^more$/i).forEach(e=>{(e.closest('a,button')||e).style.display='none'});
  [...hero.querySelectorAll('p,div,span')].filter(e=>!e.children.length&&e.textContent.trim().length>70).forEach(e=>e.classList.add('k7desc'));
 }
 const pl=[...a.querySelectorAll('button,a')].find(b=>/^(play|resume|continue)\b/i.test(b.textContent.trim()));
 if(pl&&pl.parentElement&&pl.parentElement.children.length>=4){
  const row=pl.parentElement;row.classList.add('k7acts');pl.classList.add('k7play');row.style.setProperty('--n',row.children.length-1);
 }
 const h=leafs(a,/^details$/i)[0];
 if(h&&h.nextElementSibling&&h.nextElementSibling.children.length>=2)h.nextElementSibling.classList.add('k7card');
 D.querySelectorAll('iframe[src*="youtube"]').forEach(f=>{f.classList.add('k7yt');if(f.parentElement)f.parentElement.classList.add('k7ytp')});
 if(!Q('.k6fix')){
  const el=leafs(D.body,/No source can provide streams/i)[0];
  if(el)el.insertAdjacentHTML('afterend','<div class="k6fix"><button class="btn p" data-k6="inst">Install bundled plugins</button><button class="btn" data-k6="set">Open settings</button></div>');
 }
}

/* sliding indicator for the phone dock */
function dock(){
 const d=Q('#dock');if(!d||!MOB)return;
 d.querySelectorAll('.grp').forEach(g=>{
  if(g.dataset.k7)return;
  const items=()=>[...g.querySelectorAll('button,a')];
  const act=()=>items().find(b=>b.matches('.on,.act,.active,[aria-current],[aria-selected="true"]'));
  if(!act())return;
  g.dataset.k7=1;d.classList.add('k7');g.style.position='relative';
  const ind=D.createElement('i');ind.className='k7ind';g.prepend(ind);
  const mv=()=>{
   if(!ind.isConnected)g.prepend(ind);
   const b=act();if(!b){ind.style.opacity=0;return}
   const r=b.getBoundingClientRect(),p=g.getBoundingClientRect();
   ind.style.opacity=1;ind.style.width=r.width+'px';ind.style.height=r.height+'px';
   ind.style.transform=`translate(${r.left-p.left-g.clientLeft}px,${r.top-p.top-g.clientTop}px)`;
  };
  new MutationObserver(mv).observe(g,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-current','aria-selected']});
  addEventListener('resize',mv);mv();setTimeout(mv,400);
 });
}

/* ambient colour behind the page on phones, taken from the banner image */
let amb='';
function ambient(){
 if(!MOB)return;
 const a=A();if(!a)return;
 const scope=a.querySelector('.hero')||a.firstElementChild;if(!scope)return;
 let url='';
 for(const e of [scope,...[...scope.querySelectorAll('*')].slice(0,80)]){
  const r=e.getBoundingClientRect();if(r.width<innerWidth*.6||r.height<120)continue;
  if(e.tagName==='IMG'&&(e.currentSrc||e.src)){url=e.currentSrc||e.src;break}
  const m=getComputedStyle(e).backgroundImage.match(/url\(["']?([^"')]+)/);
  if(m){url=m[1];break}
 }
 let bg=Q('#k7bg');if(!bg){bg=D.createElement('div');bg.id='k7bg';D.body.prepend(bg)}
 if(url&&url!==amb){amb=url;bg.style.backgroundImage=`url("${url}")`}
 bg.classList.toggle('on',!!url);
}

let t;
const kick=()=>{clearTimeout(t);t=setTimeout(()=>{try{tidy();dock();ambient()}catch{}},180)};
new MutationObserver(kick).observe(A(),{childList:true,subtree:true});
D.addEventListener('DOMContentLoaded',kick);addEventListener('hashchange',kick);kick();
})();
