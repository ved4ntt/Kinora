/* Kinora subtitles: OpenSubtitles is built in. It is used even when no subtitle add-on is installed (an installed OpenSubtitles add-on is used
   instead, never both). Your subtitle language comes first, then English, at most 3 per language. All lists and files load at the same time,
   and the text is decoded with the right character set for the language (Arabic, Cyrillic, Greek, Hebrew, Turkish, Thai, Central European). */
(()=>{
'use strict';
const OS='https://opensubtitles-v3.strem.io';
const tmo=(p,ms)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(Error('timeout')),ms))]);
const CS={ara:'windows-1256',fas:'windows-1256',per:'windows-1256',urd:'windows-1256',rus:'windows-1251',ukr:'windows-1251',bul:'windows-1251',srp:'windows-1251',mkd:'windows-1251',
 ell:'windows-1253',gre:'windows-1253',heb:'windows-1255',tur:'windows-1254',pol:'windows-1250',ces:'windows-1250',cze:'windows-1250',slk:'windows-1250',slo:'windows-1250',
 hun:'windows-1250',ron:'windows-1250',rum:'windows-1250',hrv:'windows-1250',slv:'windows-1250',tha:'windows-874'};
function decode(buf,lang){
 try{return new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch{}
 try{return new TextDecoder(CS[String(lang||'').toLowerCase()]||'windows-1252').decode(buf)}catch{}
 return new TextDecoder('utf-8').decode(buf);
}
function toVtt(t){
 t=String(t).replace(/^\uFEFF/,'').replace(/\r/g,'');
 if(t.startsWith('WEBVTT'))return t;
 t=t.replace(/(\d+:\d+:\d+),(\d+)/g,'$1.$2').replace(/\{\\[^}]*\}/g,'').replace(/<\/?font[^>]*>/gi,'');
 return'WEBVTT\n\n'+t;
}
const hasOS=()=>{try{return addons.some(a=>/opensubtitles/i.test((a.url||'')+(a.manifest&&a.manifest.id||'')))}catch{return false}};
async function fromOS(type,sid){
 const id=encodeURIComponent(sid).replace(/%3A/g,':');
 const r=await tmo(fetch(OS+'/subtitles/'+type+'/'+id+'.json'),9000);
 const j=await r.json();
 return(j&&j.subtitles)||[];
}
const prefOrder=()=>{
 const c=(()=>{try{return CFG()}catch{return{}}})(),a=[c.sublang].concat(c.prefLangs||[]).filter(Boolean).map(x=>String(x).toLowerCase());
 return a.concat('english');
};

addSubs=async function(v,ctx){
 try{applySub()}catch{}
 const sid=ctx.vid||ctx.id,type=ctx.type;
 let lists=[];
 try{
  lists=await Promise.all(addons.filter(a=>has(a,'subtitles',type,sid)).map(a=>tmo(call(a,'subtitles',type,sid),12000).then(r=>(r&&r.subtitles)||[]).catch(()=>[])).concat(hasOS()?[]:[fromOS(type,sid).catch(()=>[])]));
 }catch{}
 const seen=new Set(),flat=[];
 lists.forEach(l=>l.forEach(s=>{if(s&&s.url&&!seen.has(s.url)){seen.add(s.url);flat.push(s)}}));
 if(!flat.length)return;
 const pref=prefOrder(),rankOf=s=>{const n=String(langName(s.lang)).toLowerCase();const i=pref.findIndex(p=>n.startsWith(p));return i<0?99:i};
 flat.forEach((s,i)=>{s._i=i;s._n=langName(s.lang)});
 flat.sort((a,b)=>rankOf(a)-rankOf(b)||(a._n<b._n?-1:a._n>b._n?1:0)||a._i-b._i);
 const per={},pick=[];
 for(const s of flat){const k=s._n;per[k]=(per[k]||0)+1;if(per[k]<=3&&pick.length<36)pick.push(s)}
 const cnt={};
 /* the tracks keep the sorted order even though they download at the same time; a failed download (false) never holds the others back */
 const slots=pick.map(()=>null);
 let n=0,added=0;
 function flush(){
  while(added<slots.length&&slots[added]!==null){
   const x=slots[added];added++;
   if(!x||!v.isConnected)continue;
   const nme=x.s._n;cnt[nme]=(cnt[nme]||0)+1;
   const tr=document.createElement('track');
   tr.kind='subtitles';tr.label=cnt[nme]>1?nme+' '+cnt[nme]:nme;tr.src=x.url;tr.onload=applySub;
   v.append(tr);tr.track.mode='hidden';
   try{if(CFG().autosub&&!v._sub&&nme.toLowerCase().startsWith(String(CFG().sublang||'').toLowerCase())){tr.track.mode='showing';v._sub=1}}catch{}
  }
 }
 const work=async()=>{
  while(n<pick.length){
   const i=n++,s=pick[i];
   try{
    if(!v.isConnected){slots[i]=false;continue}
    const r=await tmo(fetch(s.url),14000);
    const t=toVtt(decode(await r.arrayBuffer(),s.lang));
    slots[i]=(!v.isConnected||t.length<30)?false:{s,url:URL.createObjectURL(new Blob([t],{type:'text/vtt'}))};
   }catch{slots[i]=false}
   flush();
  }
 };
 await Promise.all([work(),work(),work(),work(),work()]);
 flush();
};
})();
