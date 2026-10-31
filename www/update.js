/* Kinora updates: version check, optional auto-download (Windows), one-tap download (Android). Settings > App updates. */
(()=>{
const D=document,Q=s=>D.querySelector(s),REPO='vedantt/Kinora';
const W=window.kinoraWin&&window.kinoraWin.upd,CAP=window.Capacitor,AND=!!(CAP&&CAP.isNativePlatform&&CAP.isNativePlatform());
const KIND=W?'win':AND?'and':'web';
const S={s:KIND==='web'?'web':'idle',cur:'',v:'',notes:'',p:0,url:'',m:'',at:0};
let later=0,last='';
const cfg=()=>{try{return CFG()}catch{return{}}};
const num=v=>String(v).replace(/^v/,'').split('.').map(n=>parseInt(n)||0);
const newer=(a,b)=>{const x=num(a),y=num(b);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return(x[i]||0)>(y[i]||0)}return false};
const ago=t=>{const m=Math.round((Date.now()-t)/6e4);return m<1?'just now':m<60?m+' min ago':Math.round(m/60)+' h ago'};
const CV='<svg class="cv" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';
const opt=(t,s,c)=>'<div class="k6o"><span><b>'+t+'</b><small>'+s+'</small></span>'+c+'</div>';
const tg=(k,on)=>'<button class="k6t'+(on?' on':'')+'" data-tg="'+k+'" role="switch" aria-checked="'+on+'" aria-label="toggle"></button>';

(async()=>{try{S.cur=W?await W.version():AND?(await CAP.Plugins.App.getInfo()).version:''}catch{}render()})();

/* ---- checking, downloading, installing ---- */
async function check(){
 if(KIND==='web'||S.s==='checking'||S.s==='downloading')return;
 S.s='checking';S.m='';later=0;render();
 try{
  if(W){await W.check();S.at=Date.now();return} /* Windows answers through events */
  const r=await fetch('https://api.github.com/repos/'+REPO+'/releases/latest');
  if(!r.ok)throw 0;
  const j=await r.json(),a=(j.assets||[]).find(x=>/\.apk$/i.test(x.name));
  if(a&&newer(j.tag_name,S.cur)){
   Object.assign(S,{s:'available',v:String(j.tag_name).replace(/^v/,''),notes:j.body||'',url:a.browser_download_url});
   if(cfg().updAuto===true)act();
  }else S.s='uptodate';
 }catch{S.s='error';S.m='Could not reach the update server'}
 S.at=Date.now();render();
}
function act(){
 if(S.s==='available'){
  if(W){S.s='downloading';S.p=0;render();W.download()}
  else{try{CAP.Plugins.Browser.open({url:S.url})}catch{window.open(S.url,'_blank')}}
 }else if(S.s==='ready'&&W)W.install();
 else check();
}
if(W)W.on(e=>{
 S.s=e.s;S.m=e.m||'';S.at=Date.now();
 if(e.v)S.v=e.v;if(e.notes)S.notes=e.notes;if(e.p!=null)S.p=e.p;
 if(e.s==='available'&&cfg().updAuto===true)act();
 render();
});

/* ---- settings page ---- */
const title=()=>({web:'You are on the newest version',idle:'Not checked yet',checking:'Checking for updates…',uptodate:'Kinora is up to date',available:'Version '+S.v+' is available',downloading:'Downloading version '+S.v+'… '+S.p+'%',ready:'Version '+S.v+' is ready to install',error:S.m||'Could not check for updates'})[S.s];
function card(){
 const b=S.s==='available'?(W?'Download update':'Get update'):S.s==='ready'?'Restart to update':'Check for updates',dis=S.s==='checking'||S.s==='downloading';
 return opt(h(title()),KIND==='web'?'Kinora on the web':'Kinora '+h(S.cur||'')+' · '+(S.at?'checked '+ago(S.at):'not checked yet'),KIND==='web'?'':'<button class="btn p" data-upd="act"'+(dis?' disabled':'')+'>'+b+'</button>')+
  (S.s==='downloading'?'<div style="height:4px;border-radius:9px;background:rgba(255,255,255,.12);overflow:hidden;margin:6px 4px"><i style="display:block;height:100%;width:'+S.p+'%;background:#f1efea;transition:width .3s"></i></div>':'');
}
function page(){
 const c=cfg(),n=S.notes.replace(/<[^>]+>/g,'').replace(/[#*`]/g,'').trim().slice(0,700);
 D.getElementById('app').innerHTML='<div class="page k6"><button class="k6bk" data-go="hub"><svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M15 5l-7 7 7 7"/></svg>Settings</button><h1>App updates</h1>'+
  '<h4 class="k6h">Version</h4><div class="k6c" id="kupd-card">'+card()+'</div>'+
  (KIND==='web'?'':'<h4 class="k6h">Automatic</h4><div class="k6c">'+
   opt('Check for updates automatically','Looks for a new version when Kinora opens and every few hours',tg('updCheck',c.updCheck!==false))+
   opt('Download updates automatically',KIND==='win'?'Downloads in the background and installs when you close Kinora':'Starts the download as soon as a new version is found',tg('updAuto',c.updAuto===true))+'</div>')+
  (n&&/available|ready|downloading/.test(S.s)?'<h4 class="k6h">What\u2019s new</h4><div class="k6c"><div class="k8n" style="white-space:pre-wrap">'+h(n)+'</div></div>':'')+'</div>';
 scrollTo(0,0);
}
if(window.K6){
 K6.PAGES.updates=page;
 const hub=K6.PAGES.hub;
 K6.PAGES.hub=()=>{hub();const g=D.querySelectorAll('.k6c'),l=g[g.length-1];
  if(l)l.insertAdjacentHTML('afterbegin','<button class="k6r" data-go="updates"><i><svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg></i><span><b>App updates</b><small>'+(S.s==='available'?'Version '+h(S.v)+' is available':KIND==='web'?'Always the newest version':'Version '+h(S.cur||'')+' \u00b7 check for updates')+'</small></span>'+CV+'</button>')};
}

/* ---- small "update available" pill ---- */
const st=D.createElement('style');
st.textContent='#kupdp{position:fixed;left:0;right:0;margin:auto;width:max-content;max-width:92vw;bottom:calc(92px + env(safe-area-inset-bottom,0px));z-index:350;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 18px;border-radius:99px;background:rgba(14,16,22,.82);-webkit-backdrop-filter:blur(26px) saturate(160%);backdrop-filter:blur(26px) saturate(160%);border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 50px rgba(0,0,0,.5);font:600 13.5px Manrope,sans-serif;color:#f1efea;white-space:nowrap}#kupdp button{height:34px;padding:0 16px;border:0;border-radius:99px;background:#f1efea;color:#0a0b0e;font:inherit;cursor:pointer}#kupdp button[data-upd=later]{width:34px;padding:0;background:rgba(255,255,255,.1);color:inherit}';
D.head.append(st);
function pill(){
 let p=Q('#kupdp');
 const on=/available|ready/.test(S.s)&&!later&&!Q('#pl')&&!/^#\/settings/.test(location.hash);
 if(!on){if(p)p.remove();return}
 if(!p){p=D.createElement('div');p.id='kupdp';D.body.append(p)}
 p.innerHTML='<span>'+(S.s==='ready'?'Update ready':'Kinora '+h(S.v)+' is available')+'</span><button data-upd="act">'+(S.s==='ready'?'Restart':'Update')+'</button><button data-upd="later" aria-label="Later">\u00d7</button>';
}
function render(){
 const c=Q('#kupd-card');
 if(c){if(last!==S.s){const y=scrollY;page();scrollTo(0,y)}else c.innerHTML=card()}
 last=S.s;pill();
}
D.addEventListener('click',e=>{const b=e.target.closest('[data-upd]');if(!b)return;if(b.dataset.upd==='later'){later=1;pill()}else act()});
addEventListener('hashchange',pill);

/* ---- automatic checks ---- */
const auto=()=>{if(KIND!=='web'&&cfg().updCheck!==false)check()};
setTimeout(auto,7000);setInterval(auto,6*36e5);
})();
