/* Kinora sign-in. Google on the web uses Google's own button (ID token, shows your site name, no Supabase address).
   In the Windows and Android apps it opens the system browser and returns through kinora://auth. Email and password work everywhere. */
(()=>{
const D=document,Q=s=>D.querySelector(s),say=m=>{try{toast(m)}catch{}};
const CF=()=>window.KINORA_CONFIG||{};
const EL=!!(window.kinoraWin&&window.kinoraWin.openExternal);
const AN=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const NATIVE=EL||AN;
const base=()=>NATIVE?(CF().siteUrl||'https://kinor4.vercel.app').replace(/\/?$/,'/'):location.origin+location.pathname;
const DEEP=()=>CF().deepLink||'kinora://auth';
const mode=()=>NATIVE?'native':CF().googleClientId?'gis':'redirect';
const GLOGO='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9a6.1 6.1 0 1 1 0-12.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6A9.9 9.9 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-2z"/></svg>';
const nice=e=>{const m=String((e&&e.message)||e||'');return/provider is not enabled|Unsupported provider/i.test(m)?'Google sign-in is not turned on for this project yet.':/Invalid login/i.test(m)?'That email or password is not right.':/already registered/i.test(m)?'That email already has an account. Try signing in.':/rate limit/i.test(m)?'Too many tries. Please wait a minute.':m||'Something went wrong.'};

/* ---------- Google ---------- */
let gisP=null;
const gis=()=>gisP||(gisP=new Promise((res,rej)=>{
 if(window.google&&google.accounts&&google.accounts.id)return res();
 const s=D.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=res;s.onerror=()=>{gisP=null;rej(new Error('Google sign-in could not load'))};D.head.append(s);
}));
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
async function googleButton(host){
 await gis();
 const raw=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),hashed=await sha(raw);
 google.accounts.id.initialize({client_id:CF().googleClientId,nonce:hashed,use_fedcm_for_prompt:true,cancel_on_tap_outside:true,callback:async r=>{
  try{const sb=sbInit(),{error}=await sb.auth.signInWithIdToken({provider:'google',token:r.credential,nonce:raw});if(error)throw error}
  catch(e){say(nice(e))}
 }});
 host.innerHTML='';
 google.accounts.id.renderButton(host,{type:'standard',theme:'filled_black',size:'large',shape:'pill',text:'continue_with',logo_alignment:'left',width:Math.min(host.clientWidth||340,400)});
}
async function googleRedirect(){
 const sb=sbInit(),{error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:base(),queryParams:{prompt:'select_account'}}});
 if(error)throw error;
}
async function googleNative(){
 const sb=sbInit(),{data,error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:DEEP(),skipBrowserRedirect:true,queryParams:{prompt:'select_account'}}});
 if(error)throw error;
 if(EL)kinoraWin.openExternal(data.url);
 else{const B=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.Browser;if(B)await B.open({url:data.url});else window.open(data.url,'_system')}
 say('Finish signing in in your browser');
}
async function onAuthUrl(u){
 if(!/^kinora:\/\/auth/i.test(u||''))return;
 try{
  const url=new URL(u.replace(/^kinora:\/\//i,'https://kinora.invalid/')),q=url.searchParams,hs=new URLSearchParams(url.hash.slice(1));
  const err=q.get('error_description')||hs.get('error_description');if(err)return say(err);
  const sb=sbInit(),code=q.get('code');
  if(code){const {error}=await sb.auth.exchangeCodeForSession(code);if(error)throw error}
  else if(hs.get('access_token')){const {error}=await sb.auth.setSession({access_token:hs.get('access_token'),refresh_token:hs.get('refresh_token')});if(error)throw error}
  else return;
  try{Capacitor.Plugins.Browser.close()}catch{}
 }catch(e){say(nice(e))}
}
if(EL&&kinoraWin.onAuth)kinoraWin.onAuth(onAuthUrl);
if(AN&&Capacitor.Plugins&&Capacitor.Plugins.App)Capacitor.Plugins.App.addListener('appUrlOpen',e=>onAuthUrl(e&&e.url));
window.googleIn=()=>NATIVE?googleNative():googleRedirect();

/* ---------- email ---------- */
async function emailIn(e,p){const {error}=await sbInit().auth.signInWithPassword({email:e,password:p});if(error)throw error}
async function emailUp(e,p){
 const {data,error}=await sbInit().auth.signUp({email:e,password:p,options:{emailRedirectTo:base()}});
 if(error)throw error;
 if(!data.session)say('Check your email to confirm your account, then sign in');
}
async function forgot(e){
 if(!/.+@.+\..+/.test(e))return say('Type your email above first');
 const {error}=await sbInit().auth.resetPasswordForEmail(e,{redirectTo:base()});
 say(error?nice(error):'Check your email for a reset link');
}
function resetModal(){
 if(Q('#kreset'))return;
 const d=D.createElement('div');d.className='dmod';d.id='kreset';
 d.innerHTML='<div class="dcard obc"><h2>Choose a new password</h2><p class="sub" style="margin:6px 0 14px">Use at least 6 characters.</p><form class="auth" style="max-width:none"><input class="t" type="password" minlength="6" placeholder="New password" autocomplete="new-password" required><div class="acts"><button class="btn p">Save password</button></div></form></div>';
 D.body.append(d);
 d.querySelector('form').onsubmit=async ev=>{ev.preventDefault();const {error}=await sbInit().auth.updateUser({password:d.querySelector('input').value});if(error)return say(nice(error));say('Password updated');d.remove()};
}
setTimeout(()=>{const sb=sbInit();if(sb)sb.auth.onAuthStateChange((ev)=>{
 if(ev==='PASSWORD_RECOVERY')resetModal();
})},0);

/* ---------- profile page ---------- */
V.profile=function(){
 const c=CL(),n=LS.get('me',''),av=LS.get('av',0),ready=!!(c.url&&c.key),last=LS.get('lastsync',0),md=mode();
 const prov=USER&&((USER.app_metadata||{}).provider||'email');
 const guestBlock=!ready?`<p class="note">Cloud sync is not connected yet. Add your Supabase project URL and key in <a href="#/settings"><u>Settings</u></a> to turn on accounts.</p>`
 :USER?`<div class="kacct"><span class="avb sm">${avatarSvg(av)}</span><div class="kai"><b>${h(USER.email||'Signed in')}</b><small>${prov==='google'?'Google account':'Email account'} · ${last?'Synced '+new Date(last).toLocaleString():'Not synced yet'}</small></div><div class="kab"><button class="btn" id="sy">Sync now</button><button class="btn" id="so2">Sign out</button></div></div>`
 :`<div class="kauth">
    <div class="kah"><h3>Take Kinora with you</h3><p>Sign in to keep your library, progress, reactions and sources on every device.</p></div>
    ${md==='gis'?'<div class="kgh" id="ggh"><div class="ksk"></div></div>':`<button class="gbtn kgb" id="gg">${GLOGO}<span>Continue with Google</span></button>`}
    <div class="or"><span>or use email</span></div>
    <form id="af2" class="auth"><input class="t" id="ae" type="email" placeholder="Email" autocomplete="email" required><input class="t" id="ap" type="password" placeholder="Password (6+ characters)" autocomplete="current-password" minlength="6" required><div class="acts"><button class="btn p" id="si">Sign in</button><button class="btn" type="button" id="su">Create account</button></div><button class="klink" type="button" id="fp">Forgot password?</button></form>
   </div>`;
 app.innerHTML=`<div class="page"><h1>Edit profile</h1><div class="pe"><div class="avb">${avatarSvg(av)}</div><div class="pf"><label class="lbl">Name<input class="t" id="pn" value="${h(n)}" maxlength="30" placeholder="Your name"></label><label class="lbl">Email<input class="t" value="${h(USER?USER.email:'')}" placeholder="Guest · sign in to add an email" disabled></label></div></div>
  <h2>Choose an avatar</h2><div class="avg">${Array.from({length:12},(_,i)=>`<button class="avs${i===av?' on':''}" data-a="${i}" aria-label="Avatar ${i+1}">${avatarSvg(i)}</button>`).join('')}</div>
  <h2>Account and sync</h2>${guestBlock}</div>`;
 $('#pn').oninput=e=>{LS.set('me',e.target.value.trim());renderPm()};
 app.querySelectorAll('.avs').forEach(b=>b.onclick=()=>{LS.set('av',+b.dataset.a);app.querySelectorAll('.avs').forEach(x=>x.classList.toggle('on',x===b));$('.pe .avb').innerHTML=avatarSvg(+b.dataset.a);renderPm()});
 if(!ready)return;
 sbInit();
 if(USER){$('#sy').onclick=async()=>{await pull();V.profile()};$('#so2').onclick=signOut;return}
 const run=async f=>{try{await f($('#ae').value.trim(),$('#ap').value)}catch(e){say(nice(e))}};
 $('#af2').onsubmit=e=>{e.preventDefault();run(emailIn)};$('#su').onclick=()=>{if($('#af2').reportValidity())run(emailUp)};
 $('#fp').onclick=()=>forgot($('#ae').value.trim());
 const fallback=()=>{const h2=$('#ggh');if(h2)h2.outerHTML=`<button class="gbtn kgb" id="gg">${GLOGO}<span>Continue with Google</span></button>`;const g=$('#gg');if(g)g.onclick=()=>window.googleIn().catch(e=>say(nice(e)))};
 if(md==='gis')googleButton($('#ggh')).catch(fallback);
 else $('#gg').onclick=async()=>{try{await window.googleIn()}catch(e){say(nice(e))}};
};
})();
