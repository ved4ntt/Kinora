/* Kinora shell: instant page with placeholders (no logo splash), profile picker first, plain names, stream filters and extra settings. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s);
if(/Electron/.test(navigator.userAgent))D.documentElement.classList.add('win');

/* the page appears straight away, with placeholders where the content will load */
const a=D.getElementById('app');
if(a&&!a.children.length&&/^(#|#\/)?$/.test(location.hash))a.innerHTML='<div class="kh"><section class="kh-hero"><div class="kh-sk"></div></section>'+Array(3).fill('<section class="kh-row"><div class="kh-sc">'+'<i class="kh-ph"></i>'.repeat(9)+'</div></section>').join('')+'</div>';

/* "Who's watching?" first, whenever this device has more than one profile */
try{if(JSON.parse(localStorage.getItem('kprofs')||'[]').length&&!sessionStorage.getItem('kpick')&&typeof V.profiles==='function'){sessionStorage.setItem('kpick','1');location.hash='#/profiles'}}catch{}

/* one-time defaults: no torrent streams, nothing below 720p */
try{if(!LS.get('kdef2',0)){setCfg({p2p:false,sMin:720});LS.set('kdef2',1)}}catch{}

/* plain names for a few settings, and plugins are called add-ons */
const RN={'Watch party':'Watch together','Content & Discovery':'Add-ons & Catalogs','Layout':'Look & feel','Integrations':'Connections','Tracking':'Trackers','Licenses & Attribution':'Credits','Plugins':'Kinora add-ons'};
const rn=()=>{
 const w=D.createTreeWalker(a,NodeFilter.SHOW_TEXT);let n;
 while(n=w.nextNode()){
  const t=n.nodeValue,k=t.trim();
  let v=RN[k]?t.replace(k,RN[k]):t;
  v=v.replace(/\bplugin repositories\b/gi,'add-on sources').replace(/\bplugins\b/gi,'add-ons').replace(/\bplugin\b/gi,'add-on');
  if(v!==t)n.nodeValue=v;
 }
};
let rt=0;new MutationObserver(()=>{clearTimeout(rt);rt=setTimeout(rn,120)}).observe(a,{childList:true,subtree:true});

/* ---- stream filters: only the languages and qualities you picked ---- */
const LG=[['Hindi',/hindi|\bhin\b/i],['English',/english|\beng\b/i],['Tamil',/tamil/i],['Telugu',/telugu/i],['Malayalam',/malayalam/i],['Kannada',/kannada/i],['Bengali',/bengali|bangla/i],['Marathi',/marathi/i],['Punjabi',/punjabi/i],['Gujarati',/gujarati/i],['Urdu',/urdu/i],['Spanish',/spanish|espa[n\u00f1]ol|\bspa\b|latino/i],['French',/french|fran[c\u00e7]ais|\bfre\b/i],['German',/german|deutsch|\bger\b/i],['Italian',/italian|italiano/i],['Portuguese',/portugu[e\u00ea]s|portuguese/i],['Russian',/russian|\brus\b/i],['Arabic',/arabic/i],['Turkish',/turkish/i],['Japanese',/japanese|\bjpn\b/i],['Korean',/korean|\bkor\b/i],['Chinese',/chinese|mandarin|cantonese/i]];
const QS=[['2160','4K'],['1080','1080p'],['720','720p'],['480','480p or lower']];
const qOf=t=>/2160|\b4k\b|uhd/i.test(t)?2160:/1080/.test(t)?1080:/720/.test(t)?720:/480|360|240|\bcam\b|hdts/i.test(t)?480:0;
const f0=window.fetch.bind(window);
window.fetch=async function(i,o){
 const r=await f0(i,o);
 try{
  const u=decodeURIComponent(typeof i==='string'?i:(i&&i.url)||'');
  if(!/\/stream\/(movie|series)\//.test(u))return r;
  const c=CFG(),pl=c.prefLangs||[],pq=(c.prefQ||[]).map(Number),lo=c.langOnly&&pl.length,qo=c.qOnly&&pq.length;
  if(!lo&&!qo)return r;
  const j=await r.clone().json();
  if(!j||!Array.isArray(j.streams))return r;
  j.streams=j.streams.filter(s=>{
   const t=(s.name||'')+' '+(s.title||s.description||'')+' '+(s.url||'');
   if(qo&&!pq.includes(qOf(t)))return false;
   if(lo){const tags=LG.filter(x=>x[1].test(t)).map(x=>x[0]);if(tags.length?!tags.some(x=>pl.includes(x)):!pl.includes('English'))return false}
   return true;
  });
  return new Response(JSON.stringify(j),{status:r.status,statusText:r.statusText,headers:{'Content-Type':'application/json'}});
 }catch{return r}
};

/* ---- extra settings: dock style, languages and quality ---- */
if(window.K6){
 const row=(k,t,s)=>'<div class="k6o"><span><b>'+t+'</b><small>'+s+'</small></span><button class="k6t'+(CFG()[k]?' on':'')+'" data-tg="'+k+'" role="switch" aria-checked="'+!!CFG()[k]+'" aria-label="'+t+'"></button></div>';
 const lk=K6.PAGES.look;
 if(lk)K6.PAGES.look=()=>{lk();const c=Q('.k6 .k6c'),x=CFG().dockMode==='exp';if(c)c.insertAdjacentHTML('beforeend','<div class="k6o"><span><b>Dock style</b><small>Compact shows a name on the open tab only. Expanded shows every name.</small></span><div class="k6ch"><button class="ch'+(x?'':' on')+'" data-set="dockMode" data-v="cmp">Compact</button><button class="ch'+(x?' on':'')+'" data-set="dockMode" data-v="exp">Expanded</button></div></div>')};
 const pp=K6.PAGES.play;
 if(pp)K6.PAGES.play=()=>{
  pp();const p=Q('.k6');if(!p)return;
  const c=CFG(),pl=new Set(c.prefLangs||[]),pq=new Set((c.prefQ||[]).map(String));
  p.insertAdjacentHTML('beforeend','<h4 class="k6h">Languages and quality</h4><div class="k6c"><div class="k6o col"><span><b>Preferred languages</b><small>Pick as many as you like.</small></span><div class="k6ch wrap">'+LG.map(x=>'<button class="ch'+(pl.has(x[0])?' on':'')+'" data-pl="'+x[0]+'">'+x[0]+'</button>').join('')+'</div></div>'+row('langOnly','Only show preferred languages','Hide every stream that is not in a language you picked')+'<div class="k6o col"><span><b>Preferred quality</b><small>Pick one or more.</small></span><div class="k6ch wrap">'+QS.map(x=>'<button class="ch'+(pq.has(x[0])?' on':'')+'" data-pq="'+x[0]+'">'+x[1]+'</button>').join('')+'</div></div>'+row('qOnly','Only show preferred quality','Hide every stream that is not in a quality you picked')+'</div>');
 };
}
D.addEventListener('click',e=>{
 const b=e.target.closest('[data-pl],[data-pq]');
 if(b){const k=b.dataset.pl?'prefLangs':'prefQ',v=b.dataset.pl||b.dataset.pq,s=new Set((CFG()[k]||[]).map(String));s.has(v)?s.delete(v):s.add(v);setCfg({[k]:[...s]});b.classList.toggle('on',s.has(v));return}
 if(e.target.closest('[data-set=dockMode]'))setTimeout(()=>window.KDockMode&&KDockMode(),80);
});
})();
