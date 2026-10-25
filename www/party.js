/* Kinora watch party: rooms with a code, seats, live sync, chat and floating reactions.
   Backend: the kinora_party_* functions in Supabase (see supabase/watch_party.sql). Realtime broadcast + presence carry the live events. */
(()=>{
const D=document,Q=s=>D.querySelector(s),say=m=>{try{toast(m)}catch{}};
const on=k=>CFG()[k]!==false;
Object.assign(I,{
 people:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 1.7 6 5"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14.5a4.5 4.5 0 0 0 8 0M9 9.5h.01M15 9.5h.01"/>',
 send:'<path d="M12 19V5M5 12l7-7 7 7"/>',
 copy:'<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
 crown:'<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
 share:'<path d="M12 15V3M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'
});
const ERR={party_not_found:'No watch party found with that code.',party_full:'This watch party is full.',removed:"You can't join this watch party.",party_ended:'This watch party has ended.',rate_limited:'Too many attempts. Try again in a few minutes.',not_host:'Only the host can do that.',bad_request:'That did not work. Please try again.',unavailable:'Watch parties are unavailable right now.'};
const EMO=['❤️','😂','😮','😢','👏','🔥'],MORE=['🤯','😱','🥹','💀','👀','🙌','🤣','🍿'];
const STAT={ready:'Watching',buffering:'Buffering',loading:'Loading',choosing:'Choosing a source',elsewhere:'Watching something else',browsing:'Browsing',behind:'Behind',offline:'Offline'};
const rnd=()=>Math.random().toString(36).slice(2,12);
const norm=s=>String(s||'').toUpperCase().replace(/[^A-HJKMNP-Z2-9]/g,'').slice(0,6);
const dev=()=>{let d=localStorage.getItem('kdev');if(!d||d.length<16){d=(window.crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+rnd()+rnd());localStorage.setItem('kdev',d)}return d};
const who=()=>({n:LS.get('me','')||(typeof USER!=='undefined'&&USER&&((USER.user_metadata||{}).full_name||(USER.email||'').split('@')[0]))||'Guest',a:LS.get('av',0)});
const vid=()=>Q('#vw video');
const MOB=matchMedia('(max-width:820px)').matches||matchMedia('(pointer:coarse)').matches;

/* ---------- pure sync maths (kept free of the DOM so it can be tested) ---------- */
const SYNC={SEEK:1.5,NUDGE_ON:.25,NUDGE_OFF:.08,NUDGE:.05,PAUSED_TOL:.5,REJOIN:2};
const expected=(pb,now,dur)=>{let p=pb.paused?pb.position_ms:pb.position_ms+Math.max(0,now-pb.at)*(pb.rate||1);p=Math.max(0,p);return dur?Math.min(p,dur*1000):p};
const newer=(c,cur)=>!cur||c.seq>cur.seq||(c.seq===cur.seq&&(c.member_id||'')>(cur.member_id||''));
const fix=(local,exp,pb,nudging)=>{ /* seconds in, decision out */
 const d=local-exp,a=Math.abs(d);
 if(pb.paused)return a>SYNC.PAUSED_TOL?{seek:exp}:{};
 if(a>SYNC.SEEK)return{seek:exp};
 if(a>(nudging?SYNC.NUDGE_OFF:SYNC.NUDGE_ON))return{rate:(pb.rate||1)*(d>0?1-SYNC.NUDGE:1+SYNC.NUDGE)};
 return{rate:pb.rate||1,calm:1};
};
window.KPartyCore={expected,newer,fix,norm};

/* ---------- state ---------- */
let P=null,OFF=0,BEST=1e9;
const sNow=()=>Date.now()+OFF;
const nm=id=>((P&&P.members.find(m=>m.id===id))||{}).name||'Someone';
const isHost=()=>P&&P.host===P.me;
const canCtl=()=>P&&(!P.hostOnly||isHost());
const title=m=>m?m.name+(m.season?` · S${m.season} E${m.episode}`:''):'';
const mkey=(type,id,vid2)=>type+'|'+(vid2||id);
function curMedia(){
 const m=/^#\/watch\/([^/]+)\/([^/?]+)(?:\/([^/?]+))?/.exec(location.hash);if(!m)return null;
 const id=decodeURIComponent(m[2]),v=m[3]?decodeURIComponent(m[3]):'';
 return{type:m[1],id,vid:v,key:mkey(m[1],id,v)};
}
async function mediaOf(c){
 let m=M[c.type+'|'+c.id];
 if(!m||!m.videos){const a=addons.find(x=>has(x,'meta',c.type,c.id));if(a)m=(await call(a,'meta',c.type,c.id).catch(()=>({}))).meta||m}
 m=m||{};
 const ep=(m.videos||[]).find(v=>v.id===c.vid);
 return{type:c.type,id:c.id,vid:c.vid,key:c.key,name:m.name||c.id,poster:m.poster||'',background:m.background||'',logo:m.logo||'',season:ep?ep.season:null,episode:ep?ep.episode:null,etitle:ep?String(ep.title||ep.name||''):''};
}
const rpc=async(fn,args)=>{
 const sb=sbInit();if(!sb)throw Object.assign(new Error('cloud'),{nocloud:1});
 const t0=Date.now(),{data,error}=await sb.rpc(fn,args);if(error)throw error;
 if(data&&data.server_time_ms){const rtt=Date.now()-t0;if(rtt<=BEST+40){BEST=Math.min(BEST,rtt);OFF=data.server_time_ms-(t0+rtt/2)}}
 return data||{};
};
const bc=(event,payload)=>{try{P&&P.ch&&P.ch.send({type:'broadcast',event,payload}).catch(()=>{})}catch{}};
const fail=e=>say(e&&e.nocloud?'Cloud is not available. Check your connection.':"Couldn't reach the watch party. Check your connection.");

/* ---------- small UI helpers ---------- */
function modal(html,cls){
 const d=D.createElement('div');d.className='dmod kpm';d.innerHTML=`<div class="dcard ${cls||'obc'}">${html}</div>`;
 d.onclick=e=>{if(e.target===d)d.remove()};D.body.append(d);return d;
}
function ask(t,msg,okTxt){
 return new Promise(res=>{
  const d=modal(`<h2>${h(t)}</h2><p class="sub" style="margin:8px 0 18px">${h(msg)}</p><div class="acts" style="justify-content:flex-end"><button class="btn" data-c="0">Cancel</button><button class="btn p" data-c="1">${h(okTxt||'Continue')}</button></div>`,'obc qd2');
  d.style.zIndex=320;d.onclick=e=>{const b=e.target.closest('[data-c]');if(b||e.target===d){d.remove();res(!!b&&b.dataset.c==='1')}};
 });
}
function note(t){
 if(!on('pNotices'))return;
 let s=Q('#kn');if(!s){s=D.createElement('div');s.id='kn';D.body.append(s)}
 const e=D.createElement('div');e.className='kno';e.textContent=t;s.append(e);while(s.children.length>3)s.firstChild.remove();
 setTimeout(()=>e.remove(),3800);
}
const slots=(c='')=>`<div class="kc">${Array.from({length:6},(_,i)=>`<span class="${i===c.length?'cur':''}">${h(c[i]||'')}</span>`).join('')}</div>`;
function bindCode(root,done){
 const i=root.querySelector('.kci');if(!i)return;
 i.oninput=()=>{const v=norm(i.value);i.value=v;root.querySelector('.kc').outerHTML=slots(v);if(v.length===6)done(v)};
 i.onkeydown=e=>{if(e.key==='Enter'&&norm(i.value).length===6)done(norm(i.value))};
}
const codeField=()=>`<label class="kcf">${slots('')}<input class="kci" maxlength="8" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Party code"></label>`;

/* ---------- join flow (preview first, like seeing who is in the room) ---------- */
async function previewJoin(code){
 code=norm(code);if(code.length!==6)return say('Enter the 6-character code');
 const d=modal(`<h2>Join watch party</h2>${LDS}`,'obc kpv');
 try{
  const r=await rpc('kinora_party_preview',{p_code:code,p_device_id:dev()});
  if(!d.isConnected)return;
  const box=d.querySelector('.dcard');
  if(r.error){box.innerHTML=`<h2>Join watch party</h2><p class="sub" style="margin:10px 0 18px">${h(ERR[r.error]||ERR.bad_request)}</p><div class="acts" style="justify-content:flex-end"><button class="btn" data-x>Close</button></div>`;box.querySelector('[data-x]').onclick=()=>d.remove();return}
  const m=r.media||{},full=r.members>=r.max_members;
  box.innerHTML=`<h2>Join watch party</h2><div class="kpvc"><img src="${h(m.poster||'')}" alt=""><div><small>The party is watching</small><b>${h(title(m))}</b><small>${r.host?'Hosted by '+h(r.host.name)+' · ':''}${r.members} of ${r.max_members} seats</small></div></div><div class="acts" style="justify-content:flex-end"><button class="btn" data-x>Cancel</button><button class="btn p" data-j ${full?'disabled':''}>${full?'Party is full':'Join'}</button></div>`;
  box.querySelector('[data-x]').onclick=()=>d.remove();
  box.querySelector('[data-j]').onclick=async()=>{d.remove();await joinCode(code)};
 }catch(e){d.remove();fail(e)}
}
async function joinCode(code,quiet){
 try{
  if(P)await leave(true);
  const w=who(),s=await rpc('kinora_party_join',{p_code:code,p_device_id:dev(),p_name:w.n,p_avatar:w.a});
  if(s.error){if(!quiet)say(ERR[s.error]||ERR.bad_request);return false}
  start(s,false,quiet);
  if(!quiet){const c=curMedia();if(!c||c.key!==P.media.key)follow(P.media)}
  return true;
 }catch(e){if(!quiet)fail(e);return false}
}
async function create(){
 const c=curMedia();
 if(!c)return say('Open a title and press play, then start the party from the player.');
 try{
  if(P)await leave(true);
  const media=await mediaOf(c),v=vid(),w=who();
  const s=await rpc('kinora_party_create',{p_device_id:dev(),p_name:w.n,p_avatar:w.a,p_media:media,p_playback:{paused:v?v.paused:true,position_ms:v?Math.round(v.currentTime*1000):0}});
  if(s.error)return say(ERR[s.error]||ERR.bad_request);
  start(s,true);openPanel('party');
 }catch(e){fail(e)}
}

/* ---------- session ---------- */
function start(s,host,quiet){
 P={id:'',code:'',me:'',host:null,hostOnly:false,max:8,media:null,stream:null,pb:null,members:[],pres:{},msgs:[],unread:0,connected:true,fails:0,n:0,synced:!!host&&!!vid(),leading:false,detached:null,tab:'party',lastId:0,seen:new Set()};
 applySnap(s,true);
 D.body.classList.add('kparty');
 LS.set('kparty',{code:P.code,at:Date.now()});
 openChannel();
 P.hb=setInterval(beat,4000);P.tk=setInterval(tick,400);
 pullChat();render();
 if(!quiet)say(host?'Party '+P.code+' is live':"You're in the party");
}
function teardown(){
 if(!P)return;
 clearInterval(P.hb);clearInterval(P.tk);
 try{const sb=sbInit();P.ch&&sb&&sb.removeChannel(P.ch)}catch{}
 const v=vid();if(v&&v.playbackRate!==1&&P.setRate){v.playbackRate=1}
 P=null;LS.set('kparty',null);D.body.classList.remove('kparty','kj-on');
 ['#kw','#kcu','#kj','#kch'].forEach(s=>{const e=Q(s);e&&e.remove()});
 render();
}
async function leave(silent){
 if(!P)return;const id=P.id;teardown();
 try{await rpc('kinora_party_leave',{p_party_id:id,p_device_id:dev()})}catch{}
 if(!silent)say('You left the watch party');
}
async function endAll(){
 if(!P||!isHost())return;
 if(!await ask('End the watch party?','Everyone will be disconnected from the party.','End for everyone'))return;
 const id=P.id;
 try{await rpc('kinora_party_end',{p_party_id:id,p_device_id:dev()});bc('ctl',{t:'ended'})}catch(e){return fail(e)}
 teardown();say('The watch party has ended');
}
function end(msg){teardown();if(msg)say(msg)}

/* ---------- snapshots from the server ---------- */
function applySnap(s,first){
 if(!s||s.error||!P)return;
 const p=s.party,old=P.members,pHost=P.host,pHO=P.hostOnly,pKey=P.media&&P.media.key;
 P.me=s.member_id||P.me;P.id=p.id;P.code=p.code;P.max=p.max_members;P.host=p.host_member;P.hostOnly=p.host_only;P.stream=p.stream;P.members=s.members||[];P.media=p.media;
 if(p.playback&&newer(p.playback,P.pb))adoptPb(p.playback,false,first);
 if(!first){
  P.members.forEach(m=>{if(m.id!==P.me&&!old.some(o=>o.id===m.id))note(m.name+' joined the watch party')});
  old.forEach(o=>{if(o.id!==P.me&&!P.members.some(m=>m.id===o.id))note(o.name+' left the watch party')});
  if(pHost&&P.host&&pHost!==P.host)note((P.host===P.me?'You are':nm(P.host)+' is')+' now the host');
  if(pHO!==undefined&&pHO!==P.hostOnly)note(P.hostOnly?'Only the host can control playback now':'Everyone can control playback now');
  if(pKey&&pKey!==P.media.key)onMedia(pKey);
 }
 render();
}
function adoptPb(pb,local,quiet){
 const prev=P.pb;P.pb=pb;
 if(!local&&!quiet&&prev&&pb.member_id&&pb.member_id!==P.me&&prev.media_key===pb.media_key){
  const w=nm(pb.member_id);
  if(prev.paused!==pb.paused)note(w+(pb.paused?' paused':' resumed'));
  else if(Math.abs((prev.rate||1)-(pb.rate||1))>.01)note(w+' changed the speed to '+pb.rate+'×');
  else if(Math.abs(pb.position_ms-expected(prev,pb.at))>2000)note(w+' skipped to '+ft(pb.position_ms/1000));
 }
 if(!local&&canCtl())P.detached=null;
}
async function beat(){
 if(!P)return;
 try{
  const s=await rpc('kinora_party_heartbeat',{p_party_id:P.id,p_device_id:dev()});
  if(!P)return;
  if(s.error){
   if(s.error==='removed')return end('You were removed from the watch party');
   if(s.error==='party_ended')return end('The watch party has ended');
   return end('The watch party is no longer available');
  }
  P.fails=0;if(!P.connected){P.connected=true;pullChat();render()}
  applySnap(s);
  if(++P.n%3===0)pullChat();
 }catch(e){if(P&&++P.fails>=2&&P.connected){P.connected=false;render()}}
}
D.addEventListener('visibilitychange',()=>{if(!D.hidden&&P)beat()});

/* ---------- realtime channel: playback, chat, reactions, presence ---------- */
function openChannel(){
 const sb=sbInit();if(!sb)return;
 const ch=sb.channel('kparty:'+P.id,{config:{broadcast:{self:false},presence:{key:P.me}}});
 ch.on('broadcast',{event:'state'},({payload})=>{if(P&&payload&&newer(payload,P.pb)&&payload.member_id!==P.me)adoptPb(payload)})
  .on('broadcast',{event:'chat'},({payload})=>onChat(payload))
  .on('broadcast',{event:'react'},({payload})=>{if(payload&&EMO.concat(MORE).includes(payload.e))floatR(payload.e,payload.m)})
  .on('broadcast',{event:'ctl'},({payload})=>{
   if(!P||!payload)return;
   if(payload.t==='ended')return end('The watch party has ended');
   if(payload.t==='kicked'&&payload.m===P.me)return end('You were removed from the watch party');
   if(payload.t==='sync')beat();
  })
  .on('presence',{event:'sync'},()=>{if(!P)return;const st=ch.presenceState(),o={};for(const k in st){const a=st[k];if(a&&a.length)o[k]=a[a.length-1]}
   const now=Date.now();for(const k in o){const w=o[k].st==='loading'||o[k].st==='buffering';if(w&&!(P.pres[k]&&P.pres[k].w))o[k].w=now;else if(w)o[k].w=P.pres[k].w}
   P.pres=o;render()})
  .subscribe(s=>{
   if(!P||P.ch!==ch)return;
   if(s==='SUBSCRIBED'){P.connected=true;lastPres='';pushPresence();bc('ctl',{t:'sync'});render()}
   else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){P.connected=false;render()}
  });
 P.ch=ch;
}
let lastPres='';
function status(){
 const c=curMedia();
 if(!P||!c||c.key!==P.media.key)return Q('#so')?'choosing':(c?'elsewhere':'browsing');
 const v=vid();
 if(!v||Q('#ld.on'))return'loading';
 if((v.readyState<3&&!v.paused&&!v.ended)||Q('#pl.buf'))return'buffering';
 return P.detached?'behind':'ready';
}
function pushPresence(){
 if(!P||!P.ch||!P.connected)return;
 const c=curMedia(),o={st:status(),k:c?c.key:'',b:P.behind||0},j=JSON.stringify(o);
 if(j===lastPres)return;lastPres=j;
 P.ch.track(o).catch(()=>{});
}
function statusOf(m){
 if(m.id===P.me){const s=status();return P.connected?s:'offline'}
 const p=P.pres[m.id];
 if(!p)return m.online?'ready':'offline';
 if(p.k&&p.k!==P.media.key&&p.st!=='choosing')return'elsewhere';
 return p.st||'ready';
}

/* ---------- following the party's title ---------- */
function follow(m){
 if(!m||!m.id)return;
 P.followed=Date.now();
 location.hash=watchUrl(m.type,m.id,m.vid);
}
function onMedia(prevKey){
 P.synced=false;P.detached=null;P.autoPaused=false;
 const c=curMedia();
 if(c&&c.key===P.media.key)return;
 if(c&&c.key===prevKey){note('The party moved on to '+title(P.media));follow(P.media)}
}
async function announce(c){
 if(!P||!canCtl())return;
 const media=await mediaOf(c);if(!P)return;
 P.leading=true;P.synced=false;
 const pb={seq:(P.pb?P.pb.seq:0)+1,paused:true,position_ms:0,rate:1,at:Math.round(sNow()),media_key:media.key,member_id:P.me};
 P.media=media;P.pb=pb;
 try{
  const s=await rpc('kinora_party_update',{p_party_id:P.id,p_device_id:dev(),p_media:media,p_playback:pb});
  applySnap(s);bc('ctl',{t:'sync'});
 }catch{}
}
addEventListener('hashchange',()=>{
 if(!P)return;
 const c=curMedia();
 P.synced=false;lastPres='';
 if(c&&c.key!==P.media.key&&canCtl()&&Date.now()-(P.followed||0)>2500)announce(c);
 pushPresence();render();
});

/* ---------- keeping everyone in sync ---------- */
function mute(ms){P.mute=Date.now()+(ms||900)}
function setRate(v,r){if(Math.abs(v.playbackRate-r)<1e-4)return;P.setRate=r;v.playbackRate=r}
function hardSync(v,exp){
 mute(1600);
 if(Math.abs(v.currentTime-exp)>.8)v.currentTime=exp;
 setRate(v,P.pb.rate||1);
 if(P.pb.paused)v.pause();else v.play().catch(()=>chip('kcu','Tap to join the playback','Play',()=>{mute();v.play().catch(()=>{});hideChip('kcu')}));
}
function waiters(){
 if(!P||P.members.length<2)return[];
 const now=Date.now();
 return P.members.filter(m=>m.id!==P.me&&m.online!==false).filter(m=>{const p=P.pres[m.id];return p&&p.k===P.media.key&&(p.st==='loading'||p.st==='buffering')&&p.w&&now-p.w<25000}).map(m=>m.name);
}
function tick(){
 if(!P)return;
 pushPresence();
 const c=curMedia(),v=vid();
 joinPill(c);
 if(!c||c.key!==P.media.key||!v||!P.pb){hideChip('kw');hideChip('kcu');return}
 if(v.readyState<2)return;
 if(P.leading){ /* I changed the title: my player leads once it has started */
  if(v.readyState>=3){P.leading=false;P.synced=true;sendPb(v)}
  return;
 }
 if(P.pb.media_key!==P.media.key)return;
 const exp=expected(P.pb,sNow(),v.duration)/1000;
 if(!P.synced){hardSync(v,exp);P.synced=true;return}
 if(P.detached){
  const gap=exp-v.currentTime;P.behind=Math.max(0,Math.round(gap));
  if(!P.pb.paused&&!v.paused&&Math.abs(gap)<=SYNC.REJOIN){P.detached=null;P.behind=0;hideChip('kcu');note('Back in sync with the party')}
  else chip('kcu',gap>1?`You're ${ft(gap)} behind the party`:'You are watching on your own','Catch up',()=>{P.detached=null;P.behind=0;hardSync(v,expected(P.pb,sNow(),v.duration)/1000);hideChip('kcu')});
  return;
 }
 const w=on('pWait')?waiters():[];
 if(w.length&&!P.pb.paused){
  if(!v.paused){mute();v.pause();P.autoPaused=true}
  chip('kw','Waiting for '+w.slice(0,2).join(' and ')+(w.length>2?' +'+(w.length-2):''),'',null,1);return;
 }
 hideChip('kw');
 if(P.autoPaused){P.autoPaused=false;if(!P.pb.paused){mute();v.play().catch(()=>{})}}
 if(P.pb.paused){
  if(!v.paused){mute();v.pause()}
  const r=fix(v.currentTime,exp,P.pb,false);if(r.seek!=null){mute();v.currentTime=r.seek}
  setRate(v,P.pb.rate||1);return;
 }
 if(v.paused&&!v.ended&&!P.autoPaused){mute();v.play().catch(()=>chip('kcu','Tap to join the playback','Play',()=>{mute();v.play().catch(()=>{});hideChip('kcu')}))}
 const r=fix(v.currentTime,exp,P.pb,!!P.nudging);
 if(r.seek!=null){mute();v.currentTime=r.seek;P.nudging=false;setRate(v,P.pb.rate||1)}
 else if(r.calm){P.nudging=false;setRate(v,r.rate)}
 else{P.nudging=true;setRate(v,r.rate)}
}
function sendPb(v){
 const pb={seq:(P.pb?P.pb.seq:0)+1,paused:P.autoPaused&&P.pb?P.pb.paused:v.paused,position_ms:Math.round(v.currentTime*1000),rate:P.nudging&&P.pb?(P.pb.rate||1):v.playbackRate,at:Math.round(sNow()),media_key:P.media.key,member_id:P.me};
 adoptPb(pb,true);bc('state',pb);
 rpc('kinora_party_update',{p_party_id:P.id,p_device_id:dev(),p_playback:pb}).then(s=>{if(P)applySnap(s)}).catch(()=>{});
}
let sendT;
function onVid(e){
 if(!P||!P.synced||P.leading)return;
 const v=e.target;if(!v||!v.matches||!v.matches('#vw video'))return;
 const c=curMedia();if(!c||c.key!==P.media.key)return;
 if(Date.now()<(P.mute||0))return;
 if(e.type==='ratechange'&&Math.abs(v.playbackRate-(P.setRate||1))<1e-4)return;
 if(canCtl()){clearTimeout(sendT);sendT=setTimeout(()=>{if(P&&vid()===v)sendPb(v)},80)}
 else if(!P.detached&&P.pb){P.detached={at:Date.now()};tick()}
}
['play','pause','seeked','ratechange'].forEach(t=>D.addEventListener(t,onVid,true));

/* ---------- chips: waiting, catch up, join ---------- */
function chip(id,text,btn,fn,spin){
 let e=Q('#'+id);
 if(!e){e=D.createElement('div');e.id=id;e.className='kchip';D.body.append(e)}
 const key=text+'|'+btn;
 if(e._k!==key){e._k=key;e.innerHTML=`${spin?'<i class="ksp"></i>':''}<span>${h(text)}</span>${btn?`<button class="btn p">${h(btn)}</button>`:''}`;const b=e.querySelector('button');if(b)b.onclick=fn}
 else if(btn){const b=e.querySelector('button');if(b)b.onclick=fn}
 e.classList.add('on');
}
function hideChip(id){const e=Q('#'+id);if(e){e.classList.remove('on');e._k=''}}
function joinPill(c){
 const need=P&&P.media&&(!c||c.key!==P.media.key);
 let e=Q('#kj');
 if(!need){if(e){e.remove();D.body.classList.remove('kj-on')}return}
 if(e&&e._k===P.media.key){return}
 if(e)e.remove();
 e=D.createElement('div');e.id='kj';e._k=P.media.key;
 e.innerHTML=`<img src="${h(P.media.poster||'')}" alt=""><div class="ri"><small>Watch party · ${h(P.code)}</small><b>${h(title(P.media))}</b></div><button class="btn p">Watch with the party</button>`;
 e.querySelector('button').onclick=()=>follow(P.media);
 D.body.append(e);D.body.classList.add('kj-on');setTimeout(()=>e.classList.add('on'),30);
}

/* ---------- chat ---------- */
async function pullChat(){
 if(!P)return;
 try{
  const r=await rpc('kinora_party_list_messages',{p_party_id:P.id,p_device_id:dev(),p_after:P.lastId||null});
  if(!P||!r.messages)return;
  let added=0;
  r.messages.forEach(m=>{if(!P.seen.has(m.id)){P.seen.add(m.id);P.msgs.push({...m,mine:m.member_id===P.me});P.lastId=Math.max(P.lastId,m.id);added++}});
  if(added){P.msgs.sort((a,b)=>a.id-b.id);drawChat()}
 }catch{}
}
function onChat(m){
 if(!P||!m||!m.id||m.member_id===P.me||P.seen.has(m.id))return;
 P.seen.add(m.id);P.lastId=Math.max(P.lastId,m.id);
 P.msgs.push({...m,mine:false});
 if(!(Q('#kp.on')&&P.tab==='chat')){P.unread++;ovMsg(m)}
 render();drawChat();
}
async function sendChat(text){
 text=String(text||'').trim().slice(0,500);if(!text||!P)return;
 const w=who(),m={id:0,cid:rnd(),member_id:P.me,name:w.n,avatar:w.a,body:text,sent_at:Date.now(),mine:true,pending:true};
 P.msgs.push(m);drawChat();
 try{
  const r=await rpc('kinora_party_send_message',{p_party_id:P.id,p_device_id:dev(),p_body:text,p_client_id:m.cid});
  if(r.message){P.seen.add(r.message.id);P.lastId=Math.max(P.lastId,r.message.id);Object.assign(m,r.message,{mine:true,pending:false});bc('chat',r.message)}
  else{m.pending=false;m.failed=r.error==='rate_limited'?'Slow down a little':'Not sent'}
 }catch{m.pending=false;m.failed='Not sent'}
 drawChat();
}
function ovMsg(m){
 if(!on('pChatOv')||!D.getElementById('pl'))return;
 let s=Q('#kch');if(!s){s=D.createElement('div');s.id='kch';D.body.append(s)}
 const e=D.createElement('div');e.className='kco';e.innerHTML=`<span class="avb sm">${avatarSvg(m.avatar)}</span><div><b>${h(m.name)}</b><span>${h(m.body)}</span></div>`;
 s.append(e);while(s.children.length>3)s.firstChild.remove();
 setTimeout(()=>e.remove(),7200);
}
const clock=t=>new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}).toLowerCase();
function drawChat(){
 const l=Q('#kmsgs');if(!l||!P)return;
 const near=l.scrollHeight-l.scrollTop-l.clientHeight<80;
 l.innerHTML=P.msgs.length?P.msgs.slice(-150).map((m,i,a)=>{
  const first=!a[i-1]||a[i-1].member_id!==m.member_id;
  return`<div class="kmg${m.mine?' me':''}${first?' f':''}" ${m.failed?`data-retry="${h(m.cid)}"`:''}>${m.mine?'':`<span class="avb sm">${first?avatarSvg(m.avatar):''}</span>`}<div>${first&&!m.mine?`<small>${h(m.name)}</small>`:''}<p>${h(m.body)}</p>${m.failed?`<em>${h(m.failed)} · tap to retry</em>`:m.pending?'<em>Sending…</em>':''}</div></div>`}).join('')
  :`<div class="kmt"><i>${ic('smile')}</i><b>No messages yet</b><small>Only people in this party can see the chat.</small></div>`;
 if(near||P.msgs[P.msgs.length-1].mine)l.scrollTop=l.scrollHeight;
}

/* ---------- reactions ---------- */
let lastR=0;
function react(e){
 if(!P)return;const n=Date.now();if(n-lastR<160)return;lastR=n;
 floatR(e,P.me);bc('react',{m:P.me,e});
}
function floatR(e,mid){
 if(!on('pReact')||D.querySelectorAll('.kfl').length>36)return;
 const s=D.createElement('div'),m=P&&P.members.find(x=>x.id===mid),w=innerWidth;
 s.className='kfl';s.innerHTML=`<span>${e}</span>${m?`<i>${avatarSvg(m.avatar)}</i>`:''}`;
 s.style.left=Math.max(10,w-(70+Math.random()*Math.min(240,w*.32)))+'px';
 s.style.setProperty('--x',(Math.random()*130-65)+'px');s.style.setProperty('--d',(2.3+Math.random()*.9)+'s');s.style.setProperty('--r',(Math.random()*30-15)+'deg');
 D.body.append(s);setTimeout(()=>s.remove(),3500);
}
function reactPop(btn){
 let p=Q('#krp');if(p){p.remove();return}
 p=D.createElement('div');p.id='krp';
 p.innerHTML=`<div>${EMO.map(e=>`<button data-e="${e}">${e}</button>`).join('')}<button class="kmore" aria-label="More">${ic('plus')}</button></div><div class="kmr">${MORE.map(e=>`<button data-e="${e}">${e}</button>`).join('')}</div>`;
 D.body.append(p);
 const r=btn.getBoundingClientRect();
 p.style.left=Math.min(Math.max(12,r.left+r.width/2-p.offsetWidth/2),innerWidth-p.offsetWidth-12)+'px';
 p.style.bottom=(innerHeight-r.top+10)+'px';
 p.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.classList.contains('kmore')){p.classList.toggle('more');return}if(b.dataset.e)react(b.dataset.e)};
 setTimeout(()=>addEventListener('pointerdown',function f(ev){if(!p.contains(ev.target)&&!ev.target.closest('#krb')){p.remove();removeEventListener('pointerdown',f,true)}else if(!p.isConnected)removeEventListener('pointerdown',f,true)},true),0);
}
D.addEventListener('keydown',e=>{
 if(!P||e.target.matches('input,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
 const n=+e.key;if(n>=1&&n<=6&&D.getElementById('pl')){react(EMO[n-1])}
});

/* ---------- the panel ---------- */
let kp=null;
function ensurePanel(){
 if(kp)return kp;
 kp=D.createElement('aside');kp.id='kp';kp.setAttribute('aria-label','Watch party');
 kp.innerHTML=`<header><h2>Watch party</h2><span class="kst2" id="kcn"></span><button class="rb" data-a="close" aria-label="Close">${ic('x')}</button></header><nav class="seg kt" id="ktab"><button data-t="party" class="on">Party</button><button data-t="chat">Chat<i class="kdot"></i></button></nav><div class="kv" id="kvp"></div><div class="kv" id="kvc" hidden><div class="kmsgs" id="kmsgs"></div><div class="krow">${EMO.map(e=>`<button data-e="${e}" aria-label="React ${e}">${e}</button>`).join('')}</div><form id="kcf"><input maxlength="500" placeholder="Message" autocomplete="off" enterkeyhint="send" aria-label="Message"><button class="rb" aria-label="Send">${ic('send')}</button></form></div>`;
 D.body.append(kp);
 kp.onclick=async e=>{
  const t=e.target.closest('#ktab button');
  if(t){P&&(P.tab=t.dataset.t);tabs();return}
  const em=e.target.closest('[data-e]');if(em&&P){react(em.dataset.e);return}
  const rt=e.target.closest('[data-retry]');if(rt&&P){const m=P.msgs.find(x=>x.cid===rt.dataset.retry);if(m){P.msgs=P.msgs.filter(x=>x!==m);sendChat(m.body)}return}
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a;
  try{
   if(a==='close')closePanel();
   else if(a==='start')await create();
   else if(a==='join'){const i=kp.querySelector('.kci');previewJoin(i?i.value:'')}
   else if(a==='copy'){await navigator.clipboard.writeText(P.code);say('Code '+P.code+' copied')}
   else if(a==='invite')invite();
   else if(a==='leave'){await leave()}
   else if(a==='end')await endAll();
   else if(a==='kick'){const id=b.dataset.m;if(await ask('Remove '+nm(id)+'?',"They won't be able to join this party again.",'Remove')){await rpc('kinora_party_remove_member',{p_party_id:P.id,p_device_id:dev(),p_member_id:id});bc('ctl',{t:'kicked',m:id});beat()}}
   else if(a==='ho'){const v=!P.hostOnly;const s=await rpc('kinora_party_set_host_only',{p_party_id:P.id,p_device_id:dev(),p_host_only:v});applySnap(s);bc('ctl',{t:'sync'})}
   else if(a==='share')await toggleShare();
   else if(a==='usestream')useShared();
   else if(a==='follow')follow(P.media);
  }catch(x){fail(x)}
 };
 kp.querySelector('#kcf').onsubmit=e=>{e.preventDefault();const i=e.target.querySelector('input');sendChat(i.value);i.value=''};
 kp.querySelector('#kcf input').addEventListener('focus',()=>{if(P){P.unread=0;render()}});
 return kp;
}
function tabs(){
 if(!kp)return;const t=P?P.tab:'party';
 kp.querySelectorAll('#ktab button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
 Q('#kvp').hidden=t!=='party';Q('#kvc').hidden=t!=='chat';
 if(t==='chat'&&P){P.unread=0;drawChat();render();setTimeout(()=>{const l=Q('#kmsgs');if(l)l.scrollTop=l.scrollHeight},30)}
}
function openPanel(tab){
 ensurePanel();if(P&&tab)P.tab=tab;
 kp.classList.add('on');D.body.classList.add('kp-on');render();tabs();
 if(!P)setTimeout(()=>{const i=kp.querySelector('.kci');i&&!MOB&&i.focus()},350);
}
function closePanel(){kp&&kp.classList.remove('on');D.body.classList.remove('kp-on')}
async function invite(){
 const url=siteUrl()+'#/party/'+P.code,msg=`Join my Kinora watch party with code ${P.code}\n${url}`;
 try{if(navigator.share&&MOB){await navigator.share({title:'Kinora watch party',text:msg});return}}catch(e){if(e&&e.name==='AbortError')return}
 try{await navigator.clipboard.writeText(msg);say('Invite copied')}catch{say('Could not copy the invite')}
}
function siteUrl(){
 const o=location.origin,cfg=(window.KINORA_CONFIG||{}).siteUrl;
 if(cfg&&(/^(http:\/\/(127\.|localhost)|capacitor|file)/.test(o)||typeof IS_APP!=='undefined'&&IS_APP))return cfg.replace(/\/?$/,'/');
 return o+location.pathname;
}

/* sharing the host's own stream link (off by default) */
let CUR=null;
{const p0=play;play=function(s){CUR=s;return p0.apply(this,arguments)}}
const shareable=s=>s&&s.url&&/^https?:\/\/(?!localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(s.url)&&!/^http:\/\/(10\.|192\.168\.)/.test(s.url);
async function toggleShare(){
 if(P.stream){const s=await rpc('kinora_party_update',{p_party_id:P.id,p_device_id:dev(),p_share:false});applySnap(s);bc('ctl',{t:'sync'});return}
 const s0=CUR;
 if(!shareable(s0))return say("This stream can't be shared.");
 if(!await ask('Share your stream?','Friends will play your link instead of picking their own. The link can include your debrid key, so only share with people you trust.','Share'))return;
 const hd=s0.behaviorHints&&s0.behaviorHints.proxyHeaders&&s0.behaviorHints.proxyHeaders.request;
 const st={url:s0.url,name:String(s0.name||'Stream').slice(0,120),title:String(s0.title||s0.description||'').slice(0,200),from:String(s0._a||'').slice(0,60),headers:hd||null};
 const s=await rpc('kinora_party_update',{p_party_id:P.id,p_device_id:dev(),p_share:true,p_stream:st});
 applySnap(s);bc('ctl',{t:'sync'});
}
function useShared(){
 const s=P&&P.stream;if(!s)return;
 PICK={url:s.url,name:s.name,title:s.title,_a:'Shared by '+nm(P.host),behaviorHints:s.headers?{proxyHeaders:{request:s.headers}}:undefined};
 const c=curMedia();
 if(c&&c.key===P.media.key){P.synced=false;route()}else follow(P.media);
}

/* ---------- rendering ---------- */
let rq=0;
function render(){if(rq)return;rq=requestAnimationFrame(()=>{rq=0;paint()})}
function paint(){
 const b=Q('#kpb');
 if(b){b.classList.toggle('on',!!P);const n=b.querySelector('b');if(P){if(n)n.textContent=P.members.length;else b.insertAdjacentHTML('beforeend',`<b>${P.members.length}</b>`)}else n&&n.remove()}
 if(!kp)return;
 const cn=Q('#kcn');if(cn)cn.textContent=P&&!P.connected?'Reconnecting…':'';
 const nav=Q('#ktab');nav.style.display=P?'':'none';
 const dot=nav.querySelector('.kdot');if(dot)dot.style.display=P&&P.unread&&P.tab!=='chat'?'inline-block':'none';
 if(!P){Q('#kvc').hidden=true;Q('#kvp').hidden=false;Q('#kvp').innerHTML=viewIdle();bindCode(Q('#kvp'),c=>previewJoin(c));return}
 tabs();
 const vp=Q('#kvp'),keep=vp.scrollTop;
 vp.innerHTML=viewParty();vp.scrollTop=keep;
}
function viewIdle(){
 const c=curMedia();
 return`<div class="kh"><h3>Watch together</h3><p>Invite your friends. Everyone plays from their own sources and stays in sync.</p></div>
 <button class="pill kbig" data-a="start" ${c?'':'disabled'}>${ic('people')}Start watch party</button>
 ${c?'':'<p class="khint">To host, open a title and press play, then start the party from the player.</p>'}
 <div class="kor"><span>or join with a code</span></div>${codeField()}
 <button class="btn kbig2" data-a="join">Join</button>`;
}
function viewParty(){
 const me=P.members.find(m=>m.id===P.me),seats=P.max,ph=isHost();
 const rows=P.members.map(m=>{
  const s=statusOf(m),lab=STAT[s]||s,host=m.id===P.host;
  const p=P.pres[m.id],beh=s==='behind'&&p&&p.b?` · ${ft(p.b)} behind`:'';
  return`<div class="km"><span class="avb sm">${avatarSvg(m.avatar)}</span><div class="kmi"><b>${h(m.name)}${m.id===P.me?' <em>You</em>':''}${host?`<u>${ic('crown')}Host</u>`:''}</b><small><i class="kd ${s}"></i>${h(lab)}${beh}</small></div>${ph&&m.id!==P.me?`<button class="rb kx" data-a="kick" data-m="${m.id}" aria-label="Remove ${h(m.name)}">${ic('x')}</button>`:''}</div>`}).join('');
 const open=Math.min(seats-P.members.length,2);
 const m=P.media||{};
 const watching=curMedia()&&curMedia().key===P.media.key;
 return`<div class="kcode"><small>Party code</small>${slots(P.code)}<div class="kca"><button class="btn" data-a="copy">${ic('copy')}Copy</button><button class="btn p" data-a="invite">${ic('share')}Invite</button></div></div>
 <div class="kseat"><b>${P.members.length} of ${seats} seats</b><div class="ksb">${Array.from({length:seats},(_,i)=>`<i class="${i<P.members.length?'on':''}"></i>`).join('')}</div></div>
 <div class="kml">${rows}${Array.from({length:open},()=>`<button class="km kopen" data-a="invite"><span class="avb sm kemp">${ic('plus')}</span><div class="kmi"><b>Invite a friend</b></div></button>`).join('')}</div>
 <div class="kmed"><img src="${h(m.poster||'')}" alt=""><div><small>${watching?'Now watching together':'The party is watching'}</small><b>${h(title(m))}</b>${watching?'':'<button class="btn p" data-a="follow">Watch with the party</button>'}</div></div>
 ${P.stream&&!ph?`<div class="kmed kshare"><div><small>Shared by ${h(nm(P.host))}</small><b>${h(P.stream.name||'Stream')}</b><button class="btn" data-a="usestream">Play their source</button></div></div>`:''}
 ${ph?`<div class="kset"><div class="k6o2"><span><b>Only I can control playback</b><small>Others can still pause or rewind for themselves.</small></span><button class="k6t${P.hostOnly?' on':''}" data-a="ho" role="switch" aria-checked="${!!P.hostOnly}" aria-label="Only I can control playback"></button></div><div class="k6o2"><span><b>Share my stream</b><small>Friends can play your link instead of picking their own. It can include your debrid key.</small></span><button class="k6t${P.stream?' on':''}" data-a="share" role="switch" aria-checked="${!!P.stream}" aria-label="Share my stream"></button></div></div>`
  :`<p class="khint">${P.hostOnly?'Only the host can control playback.':'Everyone can control playback.'}</p>`}
 <div class="kfoot"><button class="btn" data-a="leave">Leave party</button>${ph?'<button class="btn kdanger" data-a="end">End for everyone</button>':''}</div>`;
}

/* ---------- player button, reactions button, invite links ---------- */
function inject(){
 const pl=D.getElementById('pl');if(!pl)return;
 const top=Q('#top');
 if(top&&!Q('#kpb')){
  const b=D.createElement('button');b.className='rb';b.id='kpb';b.title='Watch party';b.setAttribute('aria-label','Watch party');b.innerHTML=ic('people');
  const ref=Q('#clk',top);ref?top.insertBefore(b,ref):top.append(b);
  b.onclick=e=>{e.stopPropagation();kp&&kp.classList.contains('on')?closePanel():openPanel(P?P.tab:'party')};
  render();
 }
 const cc=Q('#cc');
 if(cc&&!Q('#krb')){
  cc.insertAdjacentHTML('beforebegin',`<button class="cb" id="krb" title="Send a reaction" aria-label="Send a reaction">${ic('smile')}</button>`);
  Q('#krb').onclick=e=>{e.stopPropagation();reactPop(e.currentTarget)};
 }
}
new MutationObserver(inject).observe(D.getElementById('app'),{childList:true,subtree:true});
inject();
V.party=code=>{location.replace('#/');setTimeout(()=>{if(P&&P.code===norm(code))return openPanel('party');previewJoin(code)},120)};
{const r0=renderPm;renderPm=function(){
 r0.apply(this,arguments);
 pm.insertAdjacentHTML('beforeend','<button class="btn" id="kpw" style="display:block;width:100%;margin-top:8px">Watch party</button>');
 const b=Q('#kpw');if(b)b.onclick=()=>{pm.classList.remove('on');openPanel(P?P.tab:'party')};
}}
renderPm();
{const b0=window.__kBack;window.__kBack=function(){if(Q('#kp.on')){closePanel();return 1}if(Q('#krp')){Q('#krp').remove();return 1}return b0?b0():0}}
D.addEventListener('keydown',e=>{if(e.key==='Escape'){if(Q('#kp.on'))closePanel();const r=Q('#krp');if(r)r.remove()}});
window.KParty={open:openPanel,join:previewJoin,active:()=>!!P,code:()=>P&&P.code};

/* settings page */
if(window.K6){
 const hub=K6.PAGES.hub;
 K6.PAGES.hub=()=>{hub();const c=Q('.k6 .k6c');if(c)c.insertAdjacentHTML('beforeend',`<button class="k6r" data-go="party"><i><svg viewBox="0 0 24 24">${I.people}</svg></i><span><b>Watch party</b><small>Join friends with a party code</small></span><svg class="cv" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>`)};
 K6.PAGES.party=()=>{
  const c=CFG(),t=(k,l,d)=>`<div class="k6o"><span><b>${l}</b><small>${d}</small></span><button class="k6t${c[k]!==false?' on':''}" data-tg="${k}" role="switch" aria-checked="${c[k]!==false}" aria-label="${l}"></button></div>`;
  const A=document.getElementById('app');
  A.innerHTML=`<div class="page k6"><button class="k6bk" data-go="hub"><svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M15 5l-7 7 7 7"/></svg>Settings</button><h1>Watch party</h1><p class="sub">Watch together with friends. Everyone plays from their own sources and stays in sync.</p>
   <h4 class="k6h">Join</h4><div class="k6c"><div class="k6in kjoin"><button class="btn p" id="kopen">${P?'Open the party':'Start or join a party'}</button></div></div>
   <h4 class="k6h">During a party</h4><div class="k6c">${t('pReact','Floating reactions','Show emoji reactions from friends over the video')}${t('pChatOv','Chat on the video','Show new messages for a few seconds while you watch')}${t('pNotices','Activity notices','Tell me when someone pauses, skips or joins')}${t('pWait','Wait for friends who are buffering','Pause for everyone while someone catches up')}</div></div>`;
  scrollTo(0,0);Q('#kopen').onclick=()=>openPanel(P?P.tab:'party');
 };
}

/* come back to the party after a refresh */
setTimeout(async()=>{
 const s=LS.get('kparty',null);if(P||!s||Date.now()-s.at>6*36e5)return;
 if(!(await joinCode(s.code,true)))LS.set('kparty',null);
},1800);
})();
