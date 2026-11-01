/* Kinora dock: iOS-style floating pills with a sliding highlight.
   Desktop: navigation pill (left) and tools pill (right, search expands in place). Phone: one bottom bar. */
(()=>{
const D=document,Q=(s,r=D)=>r.querySelector(s),QA=(s,r=D)=>[...r.querySelectorAll(s)];
I.livetv='<circle cx="12" cy="12" r="1.8"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.4 4.6a10.5 10.5 0 0 1 0 14.8M4.6 19.4a10.5 10.5 0 0 1 0-14.8"/>';
I.explore='<circle cx="12" cy="12" r="9"/><path d="M15.8 8.2l-2.1 5.5-5.5 2.1 2.1-5.5z"/>';
I.chev=I.chev||'<path d="M9 5l7 7-7 7"/>';I.chevl=I.chevl||'<path d="M15 5l-7 7 7 7"/>';
const av=()=>'<b class="av">'+(typeof avatarSvg==='function'?avatarSvg(+LS.get('av',0)||0):ini(LS.get('me','')))+'</b>';
const lk=(r,i,t)=>'<a class="kd-i" data-r="'+r+'" href="#/'+r+'">'+ic(i)+'<span>'+t+'</span></a>';

const el=D.createElement('div');el.id='kd';
el.innerHTML=
 '<nav class="kd-p kd-n" aria-label="Main"><i class="kd-ind"></i>'+[['','home','Home'],['discover/movie','film','Movies'],['discover/series','tv','Series'],['live','livetv','Live TV'],['library','lib','Library']].map(x=>lk(...x)).join('')+'</nav>'+
 '<div class="kd-p kd-u"><i class="kd-ind"></i><form class="kd-s" id="kd-sf"><button type="button" class="kd-i" id="kd-sb" aria-label="Search">'+ic('search')+'</button><input type="search" placeholder="Search movies and series" aria-label="Search" autocomplete="off"></form>'+lk('settings','gear','Settings')+'<button type="button" class="kd-i kd-pb" aria-label="Profile">'+av()+'</button></div>'+
 '<nav class="kd-p kd-m" aria-label="Main"><i class="kd-ind"></i>'+lk('','home','Home')+lk('search','search','Search')+lk('explore','explore','Explore')+lk('library','lib','Library')+'<button type="button" class="kd-i kd-pb" aria-label="Profile">'+av()+'<span>Profile</span></button></nav>';
D.body.append(el);

/* the highlight slides to the open tab (it follows the tab while the label grows) */
function place(p){
 const ind=Q('.kd-ind',p),a=Q('.kd-i.on',p);
 if(!a||!p.offsetParent){ind.style.opacity=0;return}
 const first=ind.dataset.s!=='1';
 if(first)ind.style.transition='none';
 ind.style.opacity=1;ind.style.width=a.offsetWidth+'px';ind.style.height=a.offsetHeight+'px';ind.style.transform='translate('+a.offsetLeft+'px,'+a.offsetTop+'px)';
 if(first){void ind.offsetWidth;ind.style.transition='';ind.dataset.s='1'}
}
function track(){const t0=performance.now();(function f(){QA('.kd-p',el).forEach(place);if(performance.now()-t0<700)requestAnimationFrame(f)})()}

function sync(){
 const p=location.hash.replace(/^#\/?/,'');
 const k=/^title\/movie/.test(p)?'discover/movie':/^title\/series/.test(p)?'discover/series':p;
 QA('.kd-n .kd-i,.kd-u a.kd-i').forEach(a=>{const r=a.dataset.r;a.classList.toggle('on',r===''?k==='':k.startsWith(r))});
 const m=p===''||/^title\//.test(p)?'':/^search/.test(p)?'search':/^(explore|discover|live|calendar)/.test(p)?'explore':p==='library'?'library':'x';
 QA('.kd-m a.kd-i').forEach(a=>a.classList.toggle('on',a.dataset.r===m));
 D.body.classList.toggle('kd-hide',/^watch\//.test(p));
 QA('.kd-pb b.av',el).forEach(b=>{b.outerHTML=av()});
 if(!/^search/.test(p)){Q('#kd-sf input').value='';Q('.kd-u').classList.remove('so');Q('#kd-sb').classList.remove('on')}
 track();
}

/* search expands inside the dock; results update in place */
const u=Q('.kd-u'),sf=Q('#kd-sf'),inp=Q('input',sf),sb=Q('#kd-sb');
const go=()=>{const q=inp.value.trim();if(q.length<2)return;if(window.KSearch&&/^#\/search/.test(location.hash))KSearch.set(q);else location.hash='#/search/'+encodeURIComponent(q)};
sb.onclick=()=>{if(u.classList.contains('so')&&inp.value.trim())return go();u.classList.add('so');sb.classList.add('on');track();setTimeout(()=>inp.focus(),40)};
inp.onblur=()=>setTimeout(()=>{if(!inp.value.trim()){u.classList.remove('so');sb.classList.remove('on');track()}},160);
let st;inp.oninput=()=>{clearTimeout(st);st=setTimeout(go,450)};
sf.onsubmit=e=>{e.preventDefault();clearTimeout(st);go()};

/* profile menu (the old handler closed it the instant it opened) */
QA('.kd-pb',el).forEach(b=>b.onclick=e=>{
 e.stopPropagation();const pm=D.getElementById('pm');if(!pm)return;
 if(!pm.classList.contains('on')){try{renderPm()}catch{}}
 pm.classList.toggle('on');
});

/* compact or expanded dock (Settings > Look & feel) */
const mode=()=>D.body.classList.toggle('kd-exp',CFG().dockMode==='exp');
window.KDockMode=()=>{mode();track()};
mode();
addEventListener('hashchange',sync);addEventListener('resize',track);
if(D.fonts&&D.fonts.ready)D.fonts.ready.then(track);
sync();
})();
