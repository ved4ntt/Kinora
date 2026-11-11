/* Kinora kx: newest layer (loaded last). Avatars + profiles, streaming-service buttons, Explore, phone dock, details-page actions, rating stars. */
(()=>{
'use strict';
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const say=m=>{try{toast(m)}catch{}};
const APP=()=>D.getElementById('app');
const J=(s,d)=>{try{const v=JSON.parse(s);return v==null?d:v}catch{return d}};
const raw=k=>{try{return window.__kRaw?__kRaw.get(k):localStorage.getItem(k)}catch{return null}};
const svg=p=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const PH=()=>matchMedia('(max-width:760px)').matches;
const IC={
 home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 explore:'<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2 5.2-5.2 2 2-5.2z"/>',
 lib:'<path d="M5 4v16M9 4v16M13.5 5l5 14"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 down:'<path d="M6 9l6 6 6-6"/>',
 edit:'<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 6.5l3 3"/>',
 swap:'<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
 people:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.6 3-5.4 6-5.4s5.4 1.8 6 5.4"/><path d="M16 5a3.2 3.2 0 0 1 0 6M17.6 14.8c2 .6 3.1 2.2 3.4 5.2"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
 out:'<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 more:'<circle cx="5.5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor"/>',
 heart:'<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
 up:'<path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.4 1 2.1 2.6L12.6 10H19a1.8 1.8 0 0 1 1.8 2.2l-1.5 6.2A2 2 0 0 1 17.4 20H7"/>',
 dn:'<path d="M7 13V4H4v9zM7 13l4 7c1.5 0 2.4-1 2.1-2.6L12.6 14H19a1.8 1.8 0 0 0 1.8-2.2l-1.5-6.2A2 2 0 0 0 17.4 4H7"/>',
 plus2:'<path d="M12 5v14M5 12h14"/>'
};
const ico=n=>svg(IC[n]||'');
const STAR='<svg class="ks-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.75 5.78 6.35.82-4.67 4.36 1.2 6.3L12 16.78 6.37 19.86l1.2-6.3L2.9 9.2l6.35-.82z"/></svg>';
window.KSTAR=STAR;

/* =================================================================== AVATARS =================================================================== */
const BG=[['#6d5dfc','#2b1f6b'],['#ff7a59','#a1304a'],['#16c79a','#0b5d6b'],['#f9c74f','#d9691f'],['#4cc9f0','#27408b'],['#f72585','#5a0f55'],['#80ed99','#1b6b4a'],['#b8c0ff','#5b5f97'],['#ffafcc','#a2678a'],['#2d3142','#0d0f18'],['#ffd6a5','#e07a5f'],['#90e0ef','#0077b6'],['#e0aaff','#5a189a'],['#caffbf','#2a9d8f'],['#fdffb6','#bc6c25'],['#e5e5e5','#6c757d']];
const SK=['#ffdbc4','#f6c9a6','#e9b98f','#d49a6a','#b97a4b','#955a35','#6f3f25','#4a2a1a'];
const HC=['#1b1b1f','#3b2a20','#6b4226','#a0673a','#d8a657','#ece0a8','#b5381d','#7a7a85','#ececf1','#2b6cb0','#7b3fe4','#e0407f'];
const CL=['#2f3a4f','#e63946','#2a9d8f','#f4a261','#6a4c93','#1d3557','#f1efea','#ff6b9d','#3a3a3a','#52b788'];
const SZ=[16,8,14,12,8,5,8,8,4,10],KEY=['bg','skin','hair','hc','eyes','brow','mouth','acc','beard','cloth'];
const enc=c=>1000+KEY.reduce((n,k,i)=>n*SZ[i]+((c[k]|0)%SZ[i]),0);
const dec=n=>{let v=Math.max(0,Math.floor(n)-1000);const c={};for(let i=KEY.length-1;i>=0;i--){c[KEY[i]]=v%SZ[i];v=Math.floor(v/SZ[i])}return c};
const rnd=()=>{const c={};KEY.forEach((k,i)=>c[k]=Math.floor(Math.random()*SZ[i]));if(Math.random()<.45)c.acc=0;if(Math.random()<.6)c.beard=0;if(Math.random()<.5)c.brow=1+Math.floor(Math.random()*4);return c};
const shade=(hex,p)=>{const n=parseInt(hex.slice(1),16),f=v=>Math.max(0,Math.min(255,v+p));return '#'+[(n>>16)&255,(n>>8)&255,n&255].map(v=>f(v).toString(16).padStart(2,'0')).join('')};
let uid=0;
function art(c){
 const id='kxg'+(++uid),b=BG[c.bg],sk=SK[c.skin],skd=shade(sk,-22),hc=HC[c.hc],hcd=shade(hc,-26),cl=CL[c.cloth],st=c.cloth%3,dk='#1a1a1f',mo='#7a2e2e';
 const back={6:'<ellipse cx="32" cy="23" rx="19" ry="17" fill="'+hc+'"/>',7:'<circle cx="32" cy="9.5" r="6.5" fill="'+hc+'"/>',8:'<path d="M44 22c11 2 12 16 5 25 2-9-1-16-5-19z" fill="'+hcd+'"/>',9:'<path d="M17 25c-4 18-1 29 6 30h18c7-1 10-12 6-30z" fill="'+hc+'"/>',10:'<path d="M17 27c-2 12 0 17 5 17h20c5 0 7-5 5-17z" fill="'+hc+'"/>',13:'<path d="M17 25c-5 10 2 14-1 22 8 2 9-5 7-11h18c-2 6-1 13 7 11-3-8 4-12-1-22z" fill="'+hc+'"/>'}[c.hair]||'';
 const short='<path d="M18.5 28C16 11 48 11 45.5 28c-1.5-7-7.5-10-13.5-10S20 21 18.5 28z" fill="'+hc+'"/>';
 const front={1:'<path d="M19.5 25c-.5-11 25.5-11 25 0-4-5-21-5-25 0z" fill="'+hc+'"/>',2:short,3:'<path d="M18.5 29C15 10 49 9 45.5 29c-.6-6-4-10-9-11-7 3-14 4-17 11z" fill="'+hc+'"/>',4:'<path d="M18.5 28C15 15 23 7 33 8c10 0 16 8 12.5 20-1.5-7-7.5-10-13.5-10S20 21 18.5 28z" fill="'+hc+'"/>',5:'<g fill="'+hc+'"><circle cx="21" cy="21" r="5.2"/><circle cx="27" cy="16.5" r="5.6"/><circle cx="33.5" cy="15.5" r="5.8"/><circle cx="40" cy="17" r="5.6"/><circle cx="44.5" cy="22" r="5"/><circle cx="18.5" cy="27" r="3.6"/><circle cx="45.5" cy="27" r="3.6"/></g>',6:'<path d="M20 25c2-6 22-6 24 0-4-3-20-3-24 0z" fill="'+hc+'"/>',7:short,8:short,9:'<path d="M18 30C15 9 49 9 46 30c-1-8-7-12-14-12s-13 4-14 12z" fill="'+hc+'"/>',10:'<path d="M18 28C17 10 47 10 46 28c-3-5-8-8-14-8s-11 3-14 8z" fill="'+hc+'"/>',11:'<path d="M29.5 7.5h5L36 21h-8z" fill="'+hc+'"/>',12:'<path d="M19 27l-.5-10 5.5 4 2-11 5.5 8 3.5-9 3 8 5-5 .5 9.5 2 6c-3-6-9-8-13.5-8S22 21 19 27z" fill="'+hc+'"/>',13:'<path d="M18.5 28C16.5 10 47.500 10 45.500 28c-1.500-7-7.500-10-13.500-10S20 21 18.500 28z" fill="'+hc+'"/>'}[c.hair]||'';
 const dot=(x,y)=>'<circle cx="'+x+'" cy="'+y+'" r="1.9" fill="'+dk+'"/>';
 const arc=(x,y)=>'<path d="M'+(x-2.6)+' '+(y+1)+'c1-3.2 4.600-3.200 5.200 0" stroke="'+dk+'" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
 const anime=x=>'<ellipse cx="'+x+'" cy="29" rx="2.9" ry="3.5" fill="#fff"/><ellipse cx="'+x+'" cy="29.4" rx="1.9" ry="2.6" fill="#2b3a67"/><circle cx="'+(x-.8)+'" cy="28.2" r=".8" fill="#fff"/>';
 const eyes=[dot(26.2,29)+dot(37.8,29),arc(26.2,29)+arc(37.8,29),'<path d="M24 29q2.300 2.600 4.600 0M35.400 29q2.300 2.600 4.600 0" stroke="'+dk+'" stroke-width="1.8" fill="none" stroke-linecap="round"/>',dot(26.2,29)+arc(37.8,29),anime(26.2)+anime(37.8),'<path d="M23.800 29h5M35.200 29h5" stroke="'+dk+'" stroke-width="2" stroke-linecap="round"/>',dot(26.2,29.4)+dot(37.8,29.4)+'<path d="M23.800 27.600l-1.400-1M28.600 27.600l1.400-1M35.400 27.600L34 26.600M40.200 27.600l1.400-1" stroke="'+dk+'" stroke-width="1" stroke-linecap="round"/>','<circle cx="26.2" cy="29" r="2.8" fill="#fff"/><circle cx="37.8" cy="29" r="2.8" fill="#fff"/><circle cx="26.2" cy="29" r="1.3" fill="'+dk+'"/><circle cx="37.8" cy="29" r="1.3" fill="'+dk+'"/>'][c.eyes];
 const bs='stroke="'+hcd+'" fill="none" stroke-linecap="round"';
 const brow=['','<path d="M23.400 24.600h5.600M35 24.600h5.600" stroke-width="1.7" '+bs+'/>','<path d="M23.400 25.600q2.800-3 5.600-.6M35 25q2.800-2.400 5.600.6" stroke-width="1.7" '+bs+'/>','<path d="M23.200 24.800h6M34.800 24.800h6" stroke-width="2.700" '+bs+'/>','<path d="M23.400 25h5.600M35 24q2.800-2.800 5.600-.4" stroke-width="1.700" '+bs+'/>'][c.brow];
 const ms='stroke="'+mo+'" fill="none" stroke-linecap="round" stroke-width="1.8"';
 const mouth=['<path d="M27.600 36.800q4.400 4.600 8.800 0" '+ms+'/>','<path d="M27 36h10c0 4.200-2.200 6-5 6s-5-1.800-5-6z" fill="#fff" stroke="'+mo+'" stroke-width="1.300"/>','<path d="M27.400 36.200h9.200c.4 5-2 7.600-4.600 7.600s-5-2.600-4.600-7.600z" fill="'+mo+'"/><path d="M29.400 41.600q2.600-2 5.200 0" fill="#e86a7a"/>','<path d="M28 38q4 2.400 8.200-1.600" '+ms+'/>','<path d="M28.600 38.600h6.800" '+ms+'/>','<ellipse cx="32" cy="38.600" rx="2.100" ry="2.700" fill="'+mo+'"/>','<path d="M28 40q4-3.600 8 0" '+ms+'/>','<path d="M27.600 36.800q4.400 4.600 8.800 0" '+ms+'/><path d="M30 39.600q2 4.400 4 0z" fill="#e86a7a"/>'][c.mouth];
 const beard=['','<path d="M20 33c1 9 6 12 12 12s11-3 12-12c-3 5-7 6-12 6s-9-1-12-6z" fill="'+hc+'" opacity=".3"/>','<path d="M25.500 35.200q3.200-2 6.500-.2 3.300-1.800 6.500.2-3 2.600-6.500 1.200-3.500 1.400-6.500-1.200z" fill="'+hc+'"/>','<path d="M19.600 31c-.4 12 5.400 17.500 12.400 17.500s12.800-5.500 12.400-17.500c-1.600 4-3.800 5.600-6.400 5.600H26c-2.600 0-4.800-1.600-6.400-5.600z" fill="'+hc+'"/>'][c.beard];
 const gl='fill="none" stroke="#2a2a30" stroke-width="1.5"';
 const acc=['','<g '+gl+'><circle cx="26.200" cy="29" r="5"/><circle cx="37.800" cy="29" r="5"/><path d="M31.200 29h1.600"/></g>','<g '+gl+'><rect x="21.200" y="25" width="10" height="8" rx="2.400"/><rect x="32.800" y="25" width="10" height="8" rx="2.400"/><path d="M31.200 28.600h1.600"/></g>','<path d="M20.500 26h23v3.600c0 3-2.200 4.400-5 4.400s-4.400-1.600-5.200-3.800h-2.600c-.8 2.200-2.400 3.800-5.200 3.800s-5-1.400-5-4.400z" fill="#15151a"/>','<path d="M17.500 30c-2-17 27-17 29 0" stroke="#2a2d3a" stroke-width="3" fill="none"/><rect x="14.600" y="28" width="5.200" height="9" rx="2.400" fill="#e63946"/><rect x="44.200" y="28" width="5.200" height="9" rx="2.400" fill="#e63946"/>','<circle cx="19" cy="34.600" r="1.500" fill="#ffd24d"/>','<path d="M17.600 25C17 8 47 8 46.400 25z" fill="#e63946"/><rect x="13" y="23.500" width="23" height="3.300" rx="1.600" fill="#b92d38"/>','<path d="M17.800 25C16 7 48 7 46.200 25z" fill="#2a9d8f"/><rect x="17" y="22.600" width="30" height="4.400" rx="2" fill="#238a7e"/><circle cx="32" cy="8" r="3" fill="#2a9d8f"/>'][c.acc];
 const collar=st===0?'<path d="M25 47c1.500 5 12.500 5 14 0" stroke="'+shade(cl,-34)+'" fill="none" stroke-width="1.600"/>':st===1?'<path d="M26 47l6 8 6-8z" fill="'+skd+'"/>':'<path d="M26 48c0 6 2 9 2 9M38 48c0 6-2 9-2 9" stroke="#fff" opacity=".75" stroke-width="1.300" fill="none"/>';
 const hood=st===2?'<path d="M19 51c1-9 8-12 13-12s12 3 13 12z" fill="'+shade(cl,-16)+'"/>':'';
 return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+b[0]+'"/><stop offset="1" stop-color="'+b[1]+'"/></linearGradient></defs><rect width="64" height="64" fill="url(#'+id+')"/><circle cx="50" cy="12" r="22" fill="#fff" opacity=".08"/>'+back+hood+'<path d="M8 66C8 51 19 46 32 46s24 5 24 20z" fill="'+cl+'"/>'+collar+'<rect x="27" y="38" width="10" height="10" rx="4" fill="'+skd+'"/><ellipse cx="32" cy="29" rx="13.200" ry="15.200" fill="'+sk+'"/><circle cx="19" cy="30" r="3" fill="'+sk+'"/><circle cx="45" cy="30" r="3" fill="'+sk+'"/><circle cx="24" cy="35" r="2.600" fill="#ff7a8a" opacity=".2"/><circle cx="40" cy="35" r="2.600" fill="#ff7a8a" opacity=".2"/>'+eyes+brow+beard+mouth+front+acc+'</svg>';
}
const avatarSvg0=window.avatarSvg;
window.avatarSvg=function(n){n=+n||0;if(n>=1000)return art(dec(n));return avatarSvg0?avatarSvg0(n):art(dec(1000+n*977))};
const AV=n=>window.avatarSvg(n);
const myAv=()=>+(raw('av')?J(raw('av'),0):0)||0;

/* ---- avatar builder ---- */
const TABS=[['Hair',[['hair','Style','g'],['hc','Colour','s',HC]]],['Face',[['skin','Skin','s',SK],['beard','Facial hair','g'],['brow','Brows','g']]],['Eyes',[['eyes','Eyes','g']]],['Mouth',[['mouth','Mouth','g']]],['Extras',[['acc','Accessory','g']]],['Outfit',[['cloth','Outfit','g']]],['Background',[['bg','Background','sg']]]];
function openBuilder(start,done){
 let c=start>=1000?dec(start):rnd(),tab=0;
 const o=D.createElement('div');o.className='kxo';
 o.innerHTML='<div class="kxb" role="dialog" aria-label="Avatar"><div class="kxb-h"><h3>Design your avatar</h3><button class="kxb-x" aria-label="Close">\u2715</button></div><div class="kxb-m"><div class="kxb-pv"><div class="kxa" id="kxpv"></div><button class="btn" id="kxrd" type="button">Surprise me</button></div><div class="kxb-r"><div class="kxb-tabs" id="kxtb"></div><div class="kxb-body" id="kxbd"></div></div></div><div class="kxb-f"><button class="btn" id="kxcn" type="button">Cancel</button><button class="btn p" id="kxsv" type="button">Save avatar</button></div></div>';
 D.body.append(o);requestAnimationFrame(()=>o.classList.add('on'));
 const close=()=>{o.classList.remove('on');setTimeout(()=>o.remove(),220)};
 const prev=()=>{Q('#kxpv',o).innerHTML=AV(enc(c))};
 const body=()=>{
  Q('#kxtb',o).innerHTML=TABS.map((t,i)=>'<button type="button" data-t="'+i+'" class="'+(i===tab?'on':'')+'">'+t[0]+'</button>').join('');
  Q('#kxbd',o).innerHTML=TABS[tab][1].map(([k,label,kind,pal])=>{
   let items;
   if(kind==='g')items=Array.from({length:SZ[KEY.indexOf(k)]},(_,i)=>'<button type="button" data-k="'+k+'" data-i="'+i+'" class="'+(c[k]===i?'on':'')+'" aria-label="'+label+' '+(i+1)+'">'+AV(enc({...c,[k]:i}))+'</button>').join('');
   else if(kind==='s')items=pal.map((col,i)=>'<button type="button" data-k="'+k+'" data-i="'+i+'" class="'+(c[k]===i?'on':'')+'" style="background:'+col+'" aria-label="'+label+' '+(i+1)+'"></button>').join('');
   else items=BG.map((g,i)=>'<button type="button" data-k="'+k+'" data-i="'+i+'" class="'+(c[k]===i?'on':'')+'" style="background:linear-gradient(135deg,'+g[0]+','+g[1]+')" aria-label="Background '+(i+1)+'"></button>').join('');
   return '<h4>'+label+'</h4><div class="kxb-gr'+(kind==='g'?'':' sw')+'">'+items+'</div>';
  }).join('');
 };
 o.addEventListener('click',e=>{
  const t=e.target.closest('[data-t]'),g=e.target.closest('[data-k]');
  if(t){tab=+t.dataset.t;body();return}
  if(g){c[g.dataset.k]=+g.dataset.i;prev();QA('[data-k="'+g.dataset.k+'"]',o).forEach(b=>b.classList.toggle('on',b===g));
   if(TABS[tab][1].some(x=>x[2]==='s'&&(x[0]==='hc'||x[0]==='skin'))&&(g.dataset.k==='hc'||g.dataset.k==='skin'))body();return}
  if(e.target===o||e.target.closest('.kxb-x')||e.target.closest('#kxcn'))return close();
  if(e.target.closest('#kxrd')){c=rnd();prev();body();return}
  if(e.target.closest('#kxsv')){const n=enc(c);close();done&&done(n)}
 });
 prev();body();
}
window.KAvatarBuilder=openBuilder;

/* ---- username + cloud ---- */
const cleanUn=s=>String(s||'').toLowerCase().replace(/[^a-z0-9_.]/g,'').slice(0,20);
const myUn=()=>J(raw('un'),'')||'';
function saveUn(v){
 v=cleanUn(v);LS.set('un',v);
 try{if(window.SB&&window.USER&&SB.auth&&SB.auth.updateUser)SB.auth.updateUser({data:{username:v}}).catch(()=>{})}catch{}
 return v;
}

/* ---- profile page (Edit profile): username field, avatar designer ---- */
function patchProfile(){
 const pg=Q('.page',APP());if(!pg||pg.dataset.kx)return;pg.dataset.kx=1;
 const pf=Q('.pe .pf',pg),pe=Q('.pe',pg);
 if(pf&&!Q('#kxun',pf)){
  const lab=D.createElement('label');lab.className='lbl';
  lab.innerHTML='Username<div class="kxun"><input id="kxun" class="t" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="yourname" value="'+esc(myUn())+'"></div><small>Letters, numbers, dot and underscore.</small>';
  pf.append(lab);
  Q('#kxun',lab).oninput=e=>{const v=cleanUn(e.target.value);if(v!==e.target.value)e.target.value=v;clearTimeout(patchProfile.t);patchProfile.t=setTimeout(()=>{saveUn(v);try{renderPm()}catch{}},350)};
 }
 const hs=QA('h2',pg).find(h=>/avatar/i.test(h.textContent)),grid=Q('.avg',pg);
 if(hs&&grid){
  hs.textContent='Avatar';
  const bar=D.createElement('div');bar.className='kxav';
  bar.innerHTML='<div class="kxa" id="kxcur">'+AV(myAv())+'</div><button class="btn p" id="kxcust" type="button">Customize avatar</button><button class="btn" id="kxsur" type="button">Surprise me</button>';
  hs.after(bar);
  const apply=n=>{LS.set('av',n);const ab=Q('.pe .avb',pg);if(ab)ab.innerHTML=AV(n);Q('#kxcur',bar).innerHTML=AV(n);try{renderPm()}catch{}try{window.KDock&&KDock.refresh&&KDock.refresh()}catch{}};
  Q('#kxcust',bar).onclick=()=>openBuilder(myAv(),apply);
  Q('#kxsur',bar).onclick=()=>apply(enc(rnd()));
  const cap=D.createElement('h2');cap.textContent='Quick picks';cap.style.marginTop='18px';grid.before(cap);
  grid.addEventListener('click',()=>setTimeout(()=>{const n=myAv();const cur=Q('#kxcur',bar);if(cur)cur.innerHTML=AV(n)},60));
 }
}
{const vp=V.profile;if(typeof vp==='function')V.profile=function(){const r=vp.apply(this,arguments);try{patchProfile()}catch{}return r}}

/* ---- who is watching ---- */
const ACT=()=>localStorage.getItem('kprof')||'main';
const profs=()=>J(localStorage.getItem('kprofs'),[]);
const saveProfs=l=>localStorage.setItem('kprofs',JSON.stringify(l));
const mainInfo=()=>({id:'main',name:J(raw('me'),'')||'Main',av:myAv(),un:myUn()});
function switchTo(id){localStorage.setItem('kprof',id);location.hash='#/';setTimeout(()=>location.reload(),30)}
function profModal(p,after){
 const isNew=!p;p=p||{id:'p'+Date.now().toString(36),name:'',av:enc(rnd()),un:'',kids:false};
 const o=D.createElement('div');o.className='kxo';
 o.innerHTML='<div class="kxb" style="width:min(520px,100%)"><div class="kxb-h"><h3>'+(isNew?'New profile':'Edit profile')+'</h3><button class="kxb-x" aria-label="Close">\u2715</button></div><div class="kxf"><div class="kxavrow"><div class="kxa" id="kxpa">'+AV(p.av)+'</div><div><button class="btn p" id="kxpc" type="button">Customize avatar</button></div></div><label>Name<input id="kxpn" class="t" maxlength="24" placeholder="Name" value="'+esc(p.name)+'"></label><label>Username<div class="kxun"><input id="kxpu" class="t" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="username" value="'+esc(p.un||'')+'"></div></label><div class="kxtg"><div><b>Kids profile</b><small>Hides adult titles</small></div><input type="checkbox" id="kxpk"'+(p.kids?' checked':'')+'></div></div><div class="kxb-f">'+(isNew?'<span></span>':'<button class="btn" id="kxpd" type="button" style="color:#ff7b8b">Delete</button>')+'<span style="display:flex;gap:10px"><button class="btn" id="kxpx" type="button">Cancel</button><button class="btn p" id="kxps" type="button">Save</button></span></div></div>';
 D.body.append(o);requestAnimationFrame(()=>o.classList.add('on'));
 const close=()=>{o.classList.remove('on');setTimeout(()=>o.remove(),220)};
 Q('#kxpu',o).oninput=e=>{e.target.value=cleanUn(e.target.value)};
 Q('#kxpc',o).onclick=()=>openBuilder(p.av,n=>{p.av=n;Q('#kxpa',o).innerHTML=AV(n)});
 o.onclick=e=>{if(e.target===o||e.target.closest('.kxb-x')||e.target.closest('#kxpx'))close()};
 Q('#kxps',o).onclick=()=>{
  const name=Q('#kxpn',o).value.trim();if(!name){say('Give the profile a name');return}
  p.name=name;p.un=cleanUn(Q('#kxpu',o).value);p.kids=Q('#kxpk',o).checked;
  const l=profs(),i=l.findIndex(x=>x.id===p.id);if(i<0)l.push({id:p.id,name:p.name,av:p.av,un:p.un,kids:p.kids});else l[i]={...l[i],name:p.name,av:p.av,un:p.un,kids:p.kids};
  saveProfs(l);
  localStorage.setItem('kp:'+p.id+':me',JSON.stringify(p.name));localStorage.setItem('kp:'+p.id+':av',JSON.stringify(p.av));localStorage.setItem('kp:'+p.id+':un',JSON.stringify(p.un));
  try{const k='kp:'+p.id+':cfg',cf=J(localStorage.getItem(k),{});cf.hideAdult=!!p.kids;localStorage.setItem(k,JSON.stringify(cf))}catch{}
  close();after&&after();
 };
 const d=Q('#kxpd',o);if(d)d.onclick=()=>{if(!confirm('Delete this profile and everything saved in it?'))return;
  saveProfs(profs().filter(x=>x.id!==p.id));Object.keys(localStorage).filter(k=>k.startsWith('kp:'+p.id+':')).forEach(k=>localStorage.removeItem(k));
  if(ACT()===p.id)localStorage.setItem('kprof','main');close();after&&after()};
}
V.profiles=function(){
 const app=APP(),cur=ACT();let manage=false;
 const draw=()=>{
  const all=[mainInfo(),...profs()];
  app.innerHTML='<div class="page kpp kxpp"><h1>'+(manage?'Manage profiles':'Who\u2019s watching?')+'</h1><div class="kxpp-g'+'" id="kxpg">'+all.map(p=>'<button type="button" class="kxpt'+(p.id===cur?' on':'')+'" data-id="'+esc(p.id)+'"><span class="kxa">'+AV(p.av)+'<span class="kxe2">'+ico('edit')+'</span></span><span>'+esc(p.name)+'</span>'+(p.un?'<small>@'+esc(p.un)+'</small>':'')+(p.kids?'<i>Kids</i>':'')+'</button>').join('')+(all.length<6?'<button type="button" class="kxpt add" data-add="1"><span class="kxa">'+ico('plus')+'</span><span>Add profile</span></button>':'')+'</div><button class="kxlink" id="kxmg" type="button">'+(manage?'Done':'Manage profiles')+'</button></div>';
  const g=Q('#kxpg');g.classList.toggle('manage',manage);g.className='kxpp-g kxpg'+(manage?' manage':'');
  Q('#kxmg').onclick=()=>{manage=!manage;draw()};
  QA('.kxpt',app).forEach(b=>b.onclick=()=>{
   if(b.dataset.add)return profModal(null,draw);
   const id=b.dataset.id;
   if(manage){if(id==='main'){location.hash='#/profile';return}return profModal(profs().find(x=>x.id===id),draw)}
   if(id===cur){location.hash='#/';return}
   switchTo(id);
  });
 };
 draw();
};

/* =================================================================== STREAMING SERVICES =================================================================== */
const SV=[
 ['netflix','Netflix',/netflix|\bnfx\b/i,'#e50914','#6b0007','netflix','#fff'],
 ['prime','Prime Video',/prime|amazon|\bamp\b/i,'#00a8e1','#0b3d63','primevideo','#fff'],
 ['disney','Disney+',/disney|\bdnp\b/i,'#1b3fb5','#0a1b4f','disneyplus','#fff'],
 ['max','HBO Max',/\bhbo|\bmax\b|\bhbm\b/i,'#6a35d9','#1a0b4b','hbomax','#fff'],
 ['hulu','Hulu',/hulu|\bhlu\b/i,'#1ce783','#0b6b3f','hulu','#06210f'],
 ['apple','Apple TV+',/apple|\batp\b/i,'#3a3a3c','#0a0a0b','appletv','#fff'],
 ['paramount','Paramount+',/paramount|\bpmp\b/i,'#0064ff','#00257a','paramountplus','#fff'],
 ['peacock','Peacock',/peacock|\bpcp\b/i,'#222','#050505','peacock','#fff'],
 ['crunchyroll','Crunchyroll',/crunchyroll|\bcru\b/i,'#f47521','#8a2f00','crunchyroll','#fff'],
 ['hotstar','Hotstar',/hotstar|jio|\bjhs\b/i,'#1f80e0','#0a2a63','','#fff'],
 ['zee5','ZEE5',/zee5?/i,'#8230c6','#2e0a52','','#fff'],
 ['sony','SonyLIV',/sony|\bsliv\b/i,'#222','#050505','','#fff']
];
const isSvcAddon=a=>/cyberflix|netflix-catalog|streaming-catalog/i.test((a.url||'')+' '+((a.manifest&&a.manifest.id)||''))||/streaming catalogs|cyberflix/i.test((a.manifest&&a.manifest.name)||'');
const svcMatch=(a,c)=>{if(!isSvcAddon(a))return null;const t=(c.name||'')+' '+(c.id||'');const s=SV.find(x=>x[2].test(t));return s?s[0]:null};
window.KSvcOf=x=>svcMatch(x.a,x.c);
const svcCats=key=>{const out=[];(window.addons||[]).forEach(a=>{if(a.off)return;((a.manifest&&a.manifest.catalogs)||[]).forEach(c0=>{
 const c=Object.assign({},c0,{name:c0.name||c0.id,type:c0.type==='tv'?'series':c0.type});
 if(!/^(movie|series)$/.test(c.type))return;if(svcMatch(a,c)!==key)return;
 const req=(c0.extra||[]).some(e=>(typeof e==='object')&&e.isRequired&&e.name!=='genre');if(req)return;
 out.push({a,c})})});return out};
const svcLogo=s=>s[5]?'<img class="ksv-l" alt="'+esc(s[1])+'" src="https://cdn.simpleicons.org/'+s[5]+'/'+(s[6]==='#fff'?'ffffff':'06210f')+'" loading="lazy">':'<span class="ksv-t" style="--tx:'+s[6]+'">'+esc(s[1])+'</span>';
D.addEventListener('error',e=>{const t=e.target;if(t&&t.classList&&t.classList.contains('ksv-l')){const s=SV.find(x=>x[1]===t.alt);const sp=D.createElement('span');sp.className='ksv-t';sp.style.setProperty('--tx',s?s[6]:'#fff');sp.textContent=t.alt;t.replaceWith(sp)}},true);
window.KSvcRow=()=>{
 let list;try{list=SV.filter(s=>svcCats(s[0]).length)}catch{list=[]}
 if(!list.length)return '';
 return '<div class="ksv-w"><h2>Streaming services</h2><div class="ksv-r">'+list.map(s=>'<a class="ksv" href="#/streaming/'+s[0]+'" style="--c1:'+s[3]+';--c2:'+s[4]+'" aria-label="'+esc(s[1])+'">'+svcLogo(s)+'</a>').join('')+'</div></div>';
};

/* ---- shared: our own picker, infinite grid ---- */
let pickEl=null;
function closePick(){if(!pickEl)return;const[e,b]=pickEl;e.classList.remove('on');b.classList.remove('on');setTimeout(()=>{e.remove();b.remove()},200);pickEl=null}
function pick(btn,opts,cur,cb,title){
 closePick();
 const ph=PH(),el=D.createElement('div'),bd=D.createElement('div');
 el.className='kxp'+(ph?' sheet':'');bd.className='kxp-bd';
 el.innerHTML=(ph?'<i class="kxp-g"></i>':'')+(title?'<h5>'+esc(title)+'</h5>':'')+'<div class="kxp-l">'+opts.map(o=>'<button type="button" data-v="'+esc(o[0])+'" class="'+(o[0]===cur?'on':'')+'"><span>'+esc(o[1])+'</span>'+(o[0]===cur?ico('check'):'')+'</button>').join('')+'</div>';
 D.body.append(bd,el);pickEl=[el,bd];
 if(!ph){const r=btn.getBoundingClientRect();el.style.left=Math.max(12,Math.min(innerWidth-el.offsetWidth-12,r.left))+'px';el.style.top=Math.min(innerHeight-el.offsetHeight-12,r.bottom+8)+'px'}
 requestAnimationFrame(()=>{el.classList.add('on');bd.classList.add('on')});
 const fin=v=>{closePick();D.removeEventListener('keydown',kk);if(v!=null)cb(v)};
 const kk=e=>{if(e.key==='Escape')fin()};D.addEventListener('keydown',kk);
 el.onclick=e=>{const b=e.target.closest('button[data-v]');if(b)fin(b.dataset.v)};bd.onclick=()=>fin();
}
function feed(box,page){
 let n=0,busy=0,end=0,empty=0;const seen=new Set();
 const sent=D.createElement('div');sent.className='kxsent';box.after(sent);
 const io=new IntersectionObserver(es=>{if(es[0].isIntersecting)more()},{rootMargin:'1100px'});
 async function more(){
  if(busy||end)return;busy=1;
  try{
   const ms=(await page(n))||[];
   const fresh=ms.filter(m=>m&&m.id&&!seen.has((m.type||'')+m.id));
   fresh.forEach(m=>seen.add((m.type||'')+m.id));
   box.insertAdjacentHTML('beforeend',fresh.map((m,i)=>card(m,box.children.length+i)).join(''));
   n+=ms.length;
   if(!ms.length)end=1;else if(!fresh.length&&++empty>2)end=1;
   if(!box.children.length)box.innerHTML='<div class="msg">Nothing here yet.</div>';
  }catch{end=1;if(!box.children.length)box.innerHTML='<div class="msg">Could not load this list. Try another one.</div>'}
  busy=0;
  if(!end&&sent.getBoundingClientRect().top<innerHeight+900)setTimeout(more,60);
 }
 io.observe(sent);more();
 return()=>{end=1;io.disconnect();sent.remove()};
}
const extraStr=(g,skip)=>[g?'genre='+encodeURIComponent(g):'',skip?'skip='+skip:''].filter(Boolean).join('&');
const genreOf=c=>(c.extra||[]).find(e=>e&&e.name==='genre');

/* ---- a streaming service page ---- */
V.streaming=async function(key){
 const app=APP(),s=SV.find(x=>x[0]===key);
 if(!s){app.innerHTML='<div class="page"><div class="msg">Unknown service.</div></div>';return}
 const all=svcCats(key);
 const types=['movie','series'].filter(t=>all.some(x=>x.c.type===t));
 let type=LS.get('kxs:'+key,types[0])||types[0],stop=null;
 if(!types.includes(type))type=types[0];
 app.innerHTML='<div class="page kxe"><div class="ksp-hero" style="--c1:'+s[3]+';--c2:'+s[4]+'">'+svcLogo(s)+'</div><div class="kxe-pills" id="kxst"></div><div class="kxg" id="kxgr"></div></div>';
 const draw=()=>{
  Q('#kxst').innerHTML=types.map(t=>'<button type="button" data-t="'+t+'" class="'+(t===type?'on':'')+'">'+(t==='movie'?'Movies':'Series')+'</button>').join('');
  QA('#kxst button').forEach(b=>b.onclick=()=>{type=b.dataset.t;LS.set('kxs:'+key,type);draw()});
  stop&&stop();const box=Q('#kxgr');box.innerHTML='';
  const srcs=all.filter(x=>x.c.type===type);
  const g=genreOf(srcs[0].c);
  stop=feed(box,async n=>{
   const out=[];
   for(const x of srcs){try{const r=await call(x.a,'catalog',x.c.type,x.c.id,extraStr(g&&g.isRequired&&g.options?g.options[0]:'',n));(r.metas||[]).forEach(m=>{m.type=m.type||x.c.type;out.push(m)})}catch{}
    if(out.length)break}
   return out;
  });
 };
 if(!types.length){Q('#kxgr').innerHTML='<div class="msg">This service has no lists yet. Open the add-ons page once so they can load.</div>';return}
 draw();
};

/* =================================================================== EXPLORE =================================================================== */
const KINDS=[['movie','Movies'],['series','Series'],['anime','Anime'],['sports','Sports'],['tv','Live TV']];
const SORTS=[['popular','Popular'],['trending','Trending'],['all','All']];
const RXS={popular:/popular|featured|hot|most/i,trending:/trend|airing|week|today|now|latest|new/i,all:/\ball\b|discover|top rated|browse|top\b/i};
const pickCat=(list,sort,wantGenre)=>{let L=list;if(wantGenre){const g=list.filter(x=>genreOf(x.c));if(g.length)L=g}
 return L.find(x=>RXS[sort].test(x.c.name+' '+x.c.id))||L[0]};
function plan(S){
 const cs=cats();
 if(S.k==='movie'||S.k==='series'){const L=cs.filter(x=>x.c.type===S.k),x=pickCat(L,S.s,!!S.g);return x?{src:[x],genres:optsOf(x)}:{src:[],genres:[]}}
 if(S.k==='anime'){const L=cs.filter(x=>x.c.type==='anime'),x=pickCat(L,S.s==='all'?'all':S.s,!!S.g);return x?{src:[x],genres:optsOf(x)}:{src:[],genres:[]}}
 if(S.k==='sports'){
  const src=[];['movie','series'].forEach(t=>{const L=cs.filter(x=>x.c.type===t&&(optsOf(x).some(o=>/^sport/i.test(o))));const x=pickCat(L,S.s,false);if(x)src.push(x)});
  return {src,genres:[],fixed:'Sport'};
 }
 return {src:[],genres:[]};
}
const optsOf=x=>{const g=genreOf(x.c);return g&&Array.isArray(g.options)?g.options:[]};
V.explore=async function(){
 const app=APP();
 const S=Object.assign({k:'movie',s:'popular',g:''},LS.get('kxe',{}));
 let stop=null;
 const save=()=>LS.set('kxe',S);
 const head=(live)=>'<h1 class="kxe-h">Explore</h1><form class="kxs" id="kxsf" autocomplete="off">'+ico('search')+'<input id="kxsi" type="search" placeholder="Search movies, series, anime" enterkeyhint="search"></form><div class="kxe-pills" id="kxpl">'+KINDS.map(k=>'<button type="button" data-k="'+k[0]+'" class="'+(k[0]===S.k?'on':'')+'">'+k[1]+'</button>').join('')+'</div>'+(live?'':'<div class="kxe-pk"><button type="button" class="kxpk" id="kxb1"></button><button type="button" class="kxpk" id="kxb2"></button></div>');
 const bindHead=()=>{
  Q('#kxsf').onsubmit=e=>{e.preventDefault();const q=Q('#kxsi').value.trim();if(q)location.hash='#/search/'+encodeURIComponent(q)};
  QA('#kxpl button').forEach(b=>b.onclick=()=>{S.k=b.dataset.k;S.g='';save();stop&&stop();V.explore()});
 };
 const render=()=>{
  stop&&stop();
  const P=plan(S),b1=Q('#kxb1'),b2=Q('#kxb2'),box=Q('#kxgr');
  b1.innerHTML='<small>Show</small><span>'+esc((SORTS.find(x=>x[0]===S.s)||SORTS[0])[1])+'</span>'+ico('down');
  const gl=P.fixed?[]:P.genres;
  b2.innerHTML='<small>Genre</small><span>'+esc(P.fixed||S.g||'All genres')+'</span>'+ico('down');
  b2.disabled=!gl.length;
  b1.onclick=()=>pick(b1,SORTS,S.s,v=>{S.s=v;save();render()},'Show');
  b2.onclick=()=>pick(b2,[['','All genres'],...gl.map(x=>[x,x])],S.g,v=>{S.g=v;save();render()},'Genre');
  box.innerHTML='';
  if(!P.src.length){box.innerHTML='<div class="msg">Nothing to show here yet. Add a catalog add-on in Settings.</div>';return}
  const first=P.src[0],req=genreOf(first.c)&&genreOf(first.c).isRequired;
  stop=feed(box,async n=>{
   const out=[];
   for(const x of P.src){
    let g=P.fixed?optsOf(x).find(o=>/^sport/i.test(o)):S.g;
    if(!g&&genreOf(x.c)&&genreOf(x.c).isRequired)g=optsOf(x)[0]||'';
    try{const r=await call(x.a,'catalog',x.c.type,x.c.id,extraStr(g,n));(r.metas||[]).forEach(m=>{m.type=m.type||x.c.type;out.push(m)})}catch{}
   }
   if(P.src.length>1){const a=out.filter(m=>m.type==='movie'),b=out.filter(m=>m.type!=='movie'),mix=[];for(let i=0;i<Math.max(a.length,b.length);i++){if(a[i])mix.push(a[i]);if(b[i])mix.push(b[i])}return mix}
   return out;
  });
 };
 if(S.k==='tv'&&typeof V.live==='function'){
  await V.live();
  app.insertAdjacentHTML('afterbegin','<div class="page kxe" style="padding-bottom:0">'+head(true)+'</div>');
  bindHead();return;
 }
 app.innerHTML='<div class="page kxe">'+head(false)+'<div class="kxg" id="kxgr"></div></div>';
 bindHead();render();
};

/* =================================================================== PHONE DOCK + PROFILE SHEET =================================================================== */
function buildDock(){
 if(Q('#kxm'))return;
 const dk=D.createElement('nav');dk.id='kxm';dk.setAttribute('aria-label','Main');
 dk.innerHTML='<i class="kxm-b"></i><a class="kxm-i" data-n="home" href="#/">'+ico('home')+'<b>Home</b></a><a class="kxm-i" data-n="explore" href="#/explore">'+ico('explore')+'<b>Explore</b></a><a class="kxm-i" data-n="lib" href="#/library">'+ico('lib')+'<b>Library</b></a><button class="kxm-i" data-n="prof" type="button"><span class="kxm-av" id="kxmav"></span><b>Profile</b></button>';
 D.body.append(dk);D.body.classList.add('kxm-pad');
 const which=()=>{const h=location.hash||'#/';if(/^#\/?$/.test(h)||/^#\/streaming/.test(h))return 'home';if(/^#\/(explore|discover|anime|live|search)/.test(h))return 'explore';if(/^#\/library/.test(h))return 'lib';if(/^#\/(profile|profiles|settings)/.test(h))return 'prof';return ''};
 const sync=()=>{
  const w=which();QA('.kxm-i',dk).forEach(b=>b.classList.toggle('on',b.dataset.n===w));
  const a=Q('.kxm-i.on',dk),bar=Q('.kxm-b',dk);
  if(a){bar.style.opacity=1;bar.style.width=a.offsetWidth+'px';bar.style.transform='translateX('+a.offsetLeft+'px)'}else bar.style.opacity=0;
  const av=Q('#kxmav');if(av)av.innerHTML=AV(myAv());
 };
 addEventListener('hashchange',()=>setTimeout(sync,30));addEventListener('resize',sync);
 new MutationObserver(()=>{if(dk.offsetWidth)sync()}).observe(APP()||D.body,{childList:true});
 setTimeout(sync,60);setTimeout(sync,600);
 Q('[data-n=prof]',dk).onclick=()=>openSheet();
 window.KxDock={sync};
}
function openSheet(){
 if(Q('.kxsh'))return;
 const nm=J(raw('me'),'')||'Main',un=myUn(),bd=D.createElement('div'),sh=D.createElement('div');
 bd.className='kxsh-bd';sh.className='kxsh';
 sh.innerHTML='<i class="g"></i><div class="kxsh-u"><div class="kxa">'+AV(myAv())+'</div><div><b>'+esc(nm)+'</b>'+(un?'<small>@'+esc(un)+'</small>':'<small>'+(window.USER?esc(USER.email||'Signed in'):'Not signed in')+'</small>')+'</div></div><a href="#/profile">'+ico('edit')+'Edit profile</a><a href="#/profiles">'+ico('swap')+'Switch profile</a><button class="it" data-a="party" type="button">'+ico('people')+'Watch together</button><a href="#/settings">'+ico('gear')+'Settings</a>'+(window.USER?'<hr><button class="it" data-a="out" type="button">'+ico('out')+'Sign out</button>':'');
 D.body.append(bd,sh);requestAnimationFrame(()=>{bd.classList.add('on');sh.classList.add('on')});
 const close=()=>{bd.classList.remove('on');sh.classList.remove('on');setTimeout(()=>{bd.remove();sh.remove()},350)};
 bd.onclick=close;
 sh.onclick=e=>{const a=e.target.closest('a'),b=e.target.closest('button.it');if(a){close();return}if(b){close();if(b.dataset.a==='party'){try{KParty.open()}catch{say('Watch together is not available right now')}}if(b.dataset.a==='out'){try{signOut()}catch{}}}};
}

/* =================================================================== DETAILS PAGE: ACTIONS =================================================================== */
function fixTitle(){
 const ac=Q('.kt-ac');if(!ac||ac.dataset.kx)return;ac.dataset.kx=1;
 if(!PH())return;
 ac.classList.add('kx-ph');
 const lib=Q('#kt-lib',ac),wd=Q('#kt-wd',ac),src=Q('#kt-src',ac),rx=Q('.kt-rx',ac),play=Q('#kt-play',ac);
 const opts=D.createElement('div');opts.className='kx-opts';
 [lib,wd,src].forEach(b=>{if(b)opts.append(b)});
 const cur=()=>{const b=rx&&Q('button.on',rx);return b?b.dataset.r:''};
 const react=D.createElement('button');react.type='button';react.className='kx-react';react.setAttribute('aria-label','React');
 const paint=()=>{const r=cur();react.innerHTML=ico(r==='like'?'up':r==='dislike'?'dn':'heart');react.classList.toggle('on',r==='love')};
 paint();opts.append(react);
 const more=D.createElement('button');more.type='button';more.className='kx-more';more.setAttribute('aria-label','More');more.innerHTML=ico('more');
 play.after(more);more.after(opts);
 more.onclick=()=>ac.classList.toggle('kx-open');
 react.onclick=e=>{
  e.stopPropagation();Q('.kx-rp')&&Q('.kx-rp').remove();
  const p=D.createElement('div');p.className='kx-rp';
  p.innerHTML=[['love','heart'],['like','up'],['dislike','dn']].map(([r,i])=>'<button type="button" data-r="'+r+'" class="'+(cur()===r?'on':'')+'" aria-label="'+r+'">'+ico(i)+'</button>').join('');
  D.body.append(p);
  const r=react.getBoundingClientRect();p.style.left=Math.max(10,Math.min(innerWidth-p.offsetWidth-10,r.left+r.width/2-p.offsetWidth/2))+'px';p.style.top=(r.top-p.offsetHeight-10)+'px';
  requestAnimationFrame(()=>p.classList.add('on'));
  const end=()=>{p.classList.remove('on');setTimeout(()=>p.remove(),200);D.removeEventListener('pointerdown',away,true)};
  const away=ev=>{if(!p.contains(ev.target))end()};setTimeout(()=>D.addEventListener('pointerdown',away,true),0);
  p.onclick=ev=>{const b=ev.target.closest('button[data-r]');if(!b)return;const o=rx&&Q('button[data-r="'+b.dataset.r+'"]',rx);if(o)o.click();setTimeout(paint,80);end()};
 };
}

/* =================================================================== RATING STARS + OBSERVER =================================================================== */
function stars(){
 QA('.kh-r:not([data-ks]),.card .kr:not([data-ks])').forEach(e=>{e.dataset.ks=1;if(!e.querySelector('svg'))e.insertAdjacentHTML('afterbegin',STAR)});
 QA('.khp-rt:not([data-ks])').forEach(e=>{e.dataset.ks=1;if(!e.querySelector('svg')){e.innerHTML=STAR+esc(e.textContent.replace(/[\u2605\u2606\s]/g,''))}});
}
let tm=0;
const obs=new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(()=>{try{stars();fixTitle()}catch{}},40)});
obs.observe(D.body,{childList:true,subtree:true});
buildDock();stars();fixTitle();
})();
