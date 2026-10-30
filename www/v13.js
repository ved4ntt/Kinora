/* Kinora v13: web-only "Get the app", hidden admin entry, Apple-style emoji, glass dropdowns */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const web=!D.documentElement.classList.contains('app')&&!window.kinoraWin&&!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const st=D.createElement('style');
st.textContent=`.k13dl{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:99px;background:#f1efea;color:#0a0b0e;font:600 13.5px Manrope,sans-serif;white-space:nowrap;transition:transform .35s var(--spring)}.k13dl:hover{transform:scale(1.04)}.k13dl svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#ft .k13dl{height:34px;margin-left:14px;font-size:12.5px}
@media(max-width:820px){#dock .k13dl{display:none}}
.k13e{height:1.2em;width:1.2em;vertical-align:-.22em;display:inline-block}
.k13hs{display:none!important}
.k13sel{display:inline-flex;align-items:center;justify-content:space-between;gap:12px;min-width:130px;padding:10px 16px;border-radius:99px;background:var(--glass),rgba(16,18,24,.5);border:1px solid rgba(255,255,255,.12);color:inherit;font:inherit;cursor:pointer;box-shadow:var(--rim)}
.k13sel svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;opacity:.6}
.k13m{position:fixed;z-index:400;min-width:190px;max-width:min(300px,92vw);max-height:min(52vh,420px);overflow:auto;padding:6px;border-radius:18px;background:var(--glass),rgba(14,16,22,.9);-webkit-backdrop-filter:blur(26px) saturate(160%);backdrop-filter:blur(26px) saturate(160%);border:1px solid rgba(255,255,255,.12);box-shadow:var(--rim),0 22px 60px rgba(0,0,0,.55);scrollbar-width:none;animation:krise .25s var(--e) both}
.k13m button{display:block;width:100%;text-align:left;padding:10px 14px;border:0;border-radius:12px;background:none;color:inherit;font:inherit;font-size:14px;cursor:pointer}
.k13m button:hover{background:rgba(255,255,255,.1)}.k13m button.on{background:#f1efea;color:#0a0b0e}
#mn{max-height:calc(100dvh - 150px);overflow-y:auto;scrollbar-width:none}#mn::-webkit-scrollbar{display:none}`;
D.head.append(st);

/* web only: a Get the app button in the dock, the footer and the profile menu */
Object.assign(I,{dl:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'});
const btn=()=>`<a class="k13dl" href="/download">${ic('dl')}Get the app</a>`;
if(web){
 const put=()=>{
  const g=Q('#dock .grp:last-child');if(g&&!Q('.k13dl',g))g.insertAdjacentHTML('afterbegin',btn());
  const f=Q('#ft');if(f&&!Q('.k13dl',f))f.insertAdjacentHTML('beforeend',btn());
  const p=Q('#pm');if(p&&!Q('.k13dl',p))p.insertAdjacentHTML('beforeend',btn().replace('class="k13dl"','class="k13dl" style="display:flex;justify-content:center;width:100%;margin-top:8px"'));
 };
 new MutationObserver(put).observe(D.body,{childList:true,subtree:true});put();
}

/* hidden admin entry: tap the footer sentence five times (the page itself asks for the admin password) */
let n=0,nt;
D.addEventListener('click',e=>{
 if(!e.target.closest('#ft span'))return;
 n++;clearTimeout(nt);nt=setTimeout(()=>n=0,4000);
 if(n>=5){n=0;location.href='/veduhuuu'}
});

/* iOS-style emoji everywhere (Apple artwork), falling back to the plain character */
const RE=/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?|[\u{1F3FB}-\u{1F3FF}])*/gu,CDN='https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/';
const code=s=>[...s].map(c=>c.codePointAt(0).toString(16)).join('-');
function emo(root){
 const w=D.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:t=>/SCRIPT|STYLE|TEXTAREA|INPUT/.test(t.parentNode.nodeName)||(t.parentNode.dataset&&t.parentNode.dataset.k13)||!/\p{Extended_Pictographic}/u.test(t.nodeValue)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}),L=[];
 while(w.nextNode())L.push(w.currentNode);
 L.forEach(t=>{
  const f=D.createDocumentFragment();let i=0,s=t.nodeValue,m;RE.lastIndex=0;
  while((m=RE.exec(s))){
   if(m.index>i)f.append(s.slice(i,m.index));
   const im=D.createElement('img');im.className='k13e';im.alt=m[0];im.draggable=false;im.src=CDN+code(m[0])+'.png';
   im.onerror=()=>{const a=code(m[0].replace(/\uFE0F/g,''));if(im.src.endsWith('/'+a+'.png')){const sp=D.createElement('span');sp.dataset.k13=1;sp.textContent=m[0];im.replaceWith(sp)}else im.src=CDN+a+'.png'};
   f.append(im);i=m.index+m[0].length;
  }
  f.append(s.slice(i));t.replaceWith(f);
 });
}
let et;const q=new Set();
new MutationObserver(ms=>{ms.forEach(m=>m.addedNodes.forEach(x=>{if(x.nodeType===1&&!x.classList.contains('k13e'))q.add(x);else if(x.nodeType===3&&x.parentNode)q.add(x.parentNode)}));clearTimeout(et);et=setTimeout(()=>{[...q].forEach(x=>{if(x.isConnected)emo(x)});q.clear()},120)}).observe(D.body,{childList:true,subtree:true});

/* glass dropdowns instead of the system list (Explore filters, settings) */
const CH='<svg viewBox="0 0 12 8"><path d="M1 1.5l5 5 5-5"/></svg>';
function pick(s){
 if(s.dataset.k13)return;s.dataset.k13=1;
 const b=D.createElement('button');b.type='button';b.className='k13sel';s.classList.add('k13hs');s.after(b);
 const sync=()=>{const o=s.options[s.selectedIndex];b.innerHTML=`<span>${o?o.textContent.replace(/[&<]/g,'')||'Select':'Select'}</span>${CH}`;b.style.display=s.style.display==='none'?'none':''};
 new MutationObserver(sync).observe(s,{childList:true,attributes:true,attributeFilter:['style']});s.addEventListener('change',sync);sync();
 b.onclick=e=>{
  e.stopPropagation();QA('.k13m').forEach(x=>x.remove());
  const m=D.createElement('div');m.className='k13m';
  m.innerHTML=[...s.options].map((o,i)=>`<button data-i="${i}" class="${i===s.selectedIndex?'on':''}">${o.textContent.replace(/[&<]/g,'')}</button>`).join('');
  const r=b.getBoundingClientRect();m.style.left=Math.max(8,Math.min(r.left,innerWidth-250))+'px';m.style.top=Math.min(r.bottom+6,innerHeight-240)+'px';
  m.onclick=ev=>{const x=ev.target.closest('button');if(!x)return;s.selectedIndex=+x.dataset.i;s.dispatchEvent(new Event('change',{bubbles:true}));m.remove();sync()};
  D.body.append(m);const c=Q('.on',m);if(c)c.scrollIntoView({block:'center'});
  setTimeout(()=>addEventListener('pointerdown',function f(ev){if(!m.contains(ev.target))m.remove();removeEventListener('pointerdown',f,true)},true),0);
 };
}
const scan=()=>QA('.kdisc select,.k6s').forEach(pick);
new MutationObserver(()=>scan()).observe(D.getElementById('app'),{childList:true,subtree:true});scan();

/* phones: each catalogue row's cards rise in one after another as the row scrolls into view */
if(matchMedia('(pointer:coarse)').matches&&'IntersectionObserver' in window){
 const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting)return;io.unobserve(e.target);const r=e.target;
  [...r.children].slice(0,9).forEach((c,i)=>c.style.setProperty('--i',i));
  requestAnimationFrame(()=>r.classList.add('k13in'));
  setTimeout(()=>{r.classList.remove('k13p','k13in');[...r.children].forEach(c=>c.style.removeProperty('--i'))},1300);
 },{threshold:.15});
 const rows=()=>QA('.row:not([data-k13r])').forEach(r=>{r.dataset.k13r=1;if(r.children.length<4)return;const b=r.getBoundingClientRect();if(b.top<innerHeight&&b.bottom>0&&!Q('#pl'))return;r.classList.add('k13p');io.observe(r)});
 new MutationObserver(rows).observe(D.getElementById('app'),{childList:true,subtree:true});rows();
}
})();
