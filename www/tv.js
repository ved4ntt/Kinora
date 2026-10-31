/* Kinora TV shell: navigation rail + D-pad / keyboard spatial navigation (arrows, Enter, Esc/Backspace = back). */
(()=>{
const D=document,Q=s=>D.querySelector(s);
const nav=D.createElement('nav');nav.className='tv-rail';nav.setAttribute('aria-label','Main');
const items=[['','home','Home'],['discover/movie','film','Movies'],['discover/series','tv','Series'],['library','lib','Library']];
nav.innerHTML='<a class="tv-logo" href="#/" aria-label="Kinora">'+LOGO+'</a><form class="tv-s" id="tv-sf">'+ic('search')+'<input type="search" placeholder="Search" aria-label="Search"></form><button class="tv-i tv-sb" id="tv-sb" type="button" aria-label="Search">'+ic('search')+'<span>Search</span></button>'+
 items.map(([r,i,t])=>'<a class="tv-i" data-r="'+r+'" href="#/'+r+'">'+ic(i)+'<span>'+t+'</span></a>').join('')+
 '<a class="tv-i" data-r="settings" href="#/settings">'+ic('gear')+'<span>Settings</span></a><button class="tv-i" id="tv-pb" type="button" aria-label="Profile"><b class="av">'+ini(LS.get('me',''))+'</b><span>Profile</span></button>';
D.body.append(nav);
nav.querySelector('#tv-sf').onsubmit=e=>{e.preventDefault();const q=e.target.querySelector('input').value.trim();if(q)location.hash='#/search/'+encodeURIComponent(q)};
nav.querySelector('#tv-sb').onclick=()=>{D.body.classList.toggle('tv-sopen');if(D.body.classList.contains('tv-sopen'))setTimeout(()=>nav.querySelector('#tv-sf input').focus(),60)};
nav.querySelector('#tv-pb').onclick=e=>{const b=Q('#pb');if(b)b.click()};

function sync(){
 const p=location.hash.replace(/^#\/?/,'');
 const k=/^title\/movie/.test(p)?'discover/movie':/^title\/series/.test(p)?'discover/series':p;
 nav.querySelectorAll('[data-r]').forEach(a=>{const r=a.dataset.r;a.classList.toggle('on',r===''?k==='':k.startsWith(r))});
 D.body.classList.toggle('tv-hide',/^watch\//.test(p));D.body.classList.remove('tv-sopen');
}
addEventListener('hashchange',sync);sync();

/* ---- spatial navigation ---- */
const SEL='a[href],button:not([disabled]),input,.kt-ep,.kt-pc,.kt-tr,.kt-d';
let kb=false;
const ctr=e=>{const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}};
function go(dir){
 const all=[...D.querySelectorAll(SEL)].filter(e=>e.getClientRects().length&&!e.closest('#dock'));
 let cur=D.activeElement;if(!cur||cur===D.body||!all.includes(cur))cur=null;
 if(!cur){const f=Q('#kt-play')||Q('.kh-btn')||Q('.kh-c')||Q('.tv-i');if(f)f.focus();return}
 const c=ctr(cur),H=dir==='L'||dir==='R';let best=null,bs=1e9;
 for(const e of all){
  if(e===cur||cur.contains(e)||e.contains(cur))continue;
  const p=ctr(e),dx=p.x-c.x,dy=p.y-c.y;
  if(!(dir==='R'?dx>8:dir==='L'?dx<-8:dir==='D'?dy>8:dy<-8))continue;
  const s=(H?Math.abs(dx):Math.abs(dy))+(H?Math.abs(dy):Math.abs(dx))*2.5;
  if(s<bs){bs=s;best=e}
 }
 if(!best)return;
 if(!best.matches('a,button,input'))best.tabIndex=-1;
 best.focus({preventScroll:true});
 best.scrollIntoView({block:H?'nearest':'center',inline:H?'center':'nearest',behavior:'smooth'});
}
const KEY={ArrowRight:'R',ArrowLeft:'L',ArrowDown:'D',ArrowUp:'U'};
D.addEventListener('keydown',e=>{
 if(Q('#pl')||e.ctrlKey||e.altKey||e.metaKey)return; /* the player keeps its own keys */
 const t=e.target,inp=t.tagName==='INPUT';
 if(KEY[e.key]){if(inp&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))return;kb=true;e.preventDefault();go(KEY[e.key])}
 else if(e.key==='Enter'&&t&&!t.matches('a,button,input,textarea,select'))t.click();
 else if((e.key==='Escape'||e.key==='Backspace')&&!inp){if(location.hash.replace(/^#\/?/,''))history.back()}
});
D.addEventListener('mousedown',()=>kb=false);

/* after a page loads, put focus on its main button when the user is driving with keys */
let tm;
new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(()=>{
 if(!kb||Q('#pl'))return;const a=D.activeElement;
 if(a&&a!==D.body&&D.body.contains(a)&&!a.closest('#app'))return;
 const f=Q('#kt-play')||Q('.kh-btn')||Q('.kh-c');if(f)f.focus({preventScroll:true});
},450)}).observe(D.getElementById('app'),{childList:true});
})();
