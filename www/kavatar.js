/* Kinora avatars: 24 hand-drawn characters (16 people, 8 mascots). Replaces the old 12 simple faces.
   Saved choices keep working: the old numbers 0-11 simply show the new characters. Drawn in code, no image files. */
(()=>{
'use strict';
const BG=[['#ff9a62','#ffd36b'],['#4cc3ae','#3b82f6'],['#8b6cff','#5aa2ff'],['#ff6f91','#ffa96b'],['#41c98a','#a6e35b'],['#5b8def','#35d4c3'],['#f06bbf','#8f6bff'],['#ffb347','#ff6b6b']];
const SK=['#fddcc0','#f3c49b','#d9a073','#b5784f','#8a5535','#5e3a24'];
const shade=(hex,k)=>{const n=parseInt(hex.slice(1),16),f=c=>Math.max(0,Math.min(255,Math.round(c*k)));return'#'+[16,8,0].map(s=>f((n>>s)&255).toString(16).padStart(2,'0')).join('')};
const HC=['#1b1b22','#3a2a1e','#6a4426','#b8793a','#dcb862','#8d93a1','#c2475a','#4a63d6'];
const CL=['#2d3142','#eceef3','#ef5d60','#3d7cf2','#2fb58a','#f5b942','#8b6cff','#ff8a4c'];

/* ---- hair, back layer (behind the head) and front layer (on top) ---- */
const HAIR={
 crop:{b:()=>'',f:c=>`<path d="M17 31c-1-12 7-19 15-19s16 7 15 19c-3-6-7-9-15-9s-12 3-15 9z" fill="${c}"/>`},
 quiff:{b:()=>'',f:c=>`<path d="M16 32c-2-14 6-22 17-21 8 0 14 6 14 14 0 3-1 5-2 7-1-6-5-10-11-10-7 0-13 3-18 10z" fill="${c}"/><path d="M22 14c3-6 11-8 17-4-5 0-9 1-12 4z" fill="${c}"/>`},
 wavy:{b:c=>`<path d="M14 36c-2 10 0 17 5 20l6-6-1-24z M50 36c2 10 0 17-5 20l-6-6 1-24z" fill="${c}"/>`,f:c=>`<path d="M15 33c-3-15 6-23 17-23s20 8 17 23c-2-7-7-12-12-13-3 3-9 4-14 2-4 2-6 6-8 11z" fill="${c}"/>`},
 long:{b:c=>`<path d="M13 34c-2 14 0 22 4 26h30c4-4 6-12 4-26L32 22z" fill="${c}"/>`,f:c=>`<path d="M15 33c-2-15 6-22 17-22s19 7 17 22c-2-7-6-11-10-12-5 3-14 3-18 0-3 2-4 6-6 12z" fill="${c}"/>`},
 afro:{b:c=>`<circle cx="32" cy="26" r="21" fill="${c}"/>`,f:c=>`<path d="M17 32c-1-7 3-12 8-13 4 2 10 2 14 0 5 1 9 6 8 13-3-4-7-6-15-6s-12 2-15 6z" fill="${c}"/>`},
 bun:{b:c=>`<circle cx="32" cy="8.5" r="6.5" fill="${c}"/>`,f:c=>`<path d="M15 33c-2-14 6-21 17-21s19 7 17 21c-3-6-6-10-10-11-5 2-12 2-16 0-4 2-6 5-8 11z" fill="${c}"/>`},
 bob:{b:c=>`<path d="M14 30c-2 12 0 20 4 22 3-1 4-5 4-9l-3-14z M50 30c2 12 0 20-4 22-3-1-4-5-4-9l3-14z" fill="${c}"/>`,f:c=>`<path d="M14 32c-2-15 6-21 18-21s20 6 18 21c-3-5-6-8-9-9-6 3-12 3-18 0-3 1-6 4-9 9z" fill="${c}"/>`},
 curly:{b:()=>'',f:c=>`<g fill="${c}"><circle cx="21" cy="20" r="6.5"/><circle cx="28.5" cy="14.5" r="6.5"/><circle cx="36" cy="14.5" r="6.5"/><circle cx="43.5" cy="20" r="6.5"/><circle cx="32" cy="19" r="7.5"/><circle cx="17.5" cy="27" r="4.5"/><circle cx="46.5" cy="27" r="4.5"/></g>`}
};
const ACC={
 none:()=>'',
 glasses:()=>`<g fill="rgba(255,255,255,.18)" stroke="#20222b" stroke-width="2"><rect x="17.5" y="29" width="12" height="9.5" rx="4.5"/><rect x="34.5" y="29" width="12" height="9.5" rx="4.5"/></g><path d="M29.5 33h5" stroke="#20222b" stroke-width="2"/>`,
 round:()=>`<g fill="rgba(255,255,255,.16)" stroke="#8a5a2b" stroke-width="1.8"><circle cx="23.5" cy="33.5" r="6"/><circle cx="40.5" cy="33.5" r="6"/></g><path d="M29.5 33h5" stroke="#8a5a2b" stroke-width="1.8"/>`,
 phones:()=>`<path d="M13 32c-1-13 7-21 19-21s20 8 19 21" fill="none" stroke="#252833" stroke-width="3.2" stroke-linecap="round"/><rect x="9.5" y="29" width="7" height="12" rx="3.4" fill="#252833"/><rect x="47.5" y="29" width="7" height="12" rx="3.4" fill="#252833"/><rect x="11" y="31" width="3" height="8" rx="1.5" fill="#ef5d60"/><rect x="50" y="31" width="3" height="8" rx="1.5" fill="#ef5d60"/>`,
 beanie:c=>`<path d="M14.5 24c-1-13 7-19 17.5-19S50 11 49.5 24z" fill="${c}"/><rect x="13" y="21" width="38" height="7" rx="3.5" fill="${shade(c,.82)}"/><circle cx="32" cy="4.5" r="3.4" fill="${shade(c,.9)}"/>`,
 cap:c=>`<path d="M15 29c-1-13 7-20 17-20s18 7 17 20z" fill="${c}"/><path d="M14 29h36c4 0 7 1 9 4-7 0-13-1-18-1H14z" fill="${shade(c,.8)}"/>`,
 beard:c=>`<path d="M18 38c0 11 6 16 14 16s14-5 14-16c-3 4-6 5-14 5s-11-1-14-5z" fill="${c}"/>`,
 freckles:()=>`<g fill="#b9643a" opacity=".55"><circle cx="22" cy="40" r=".9"/><circle cx="25" cy="42" r=".9"/><circle cx="20.5" cy="43" r=".9"/><circle cx="42" cy="40" r=".9"/><circle cx="39" cy="42" r=".9"/><circle cx="43.5" cy="43" r=".9"/></g>`
};
/* the 16 people: background, skin, hair colour, hair style, shirt, accessory, accessory colour, mood */
const P=[
 [0,1,1,'crop',3,'none','',0],[1,3,0,'afro',5,'glasses','',1],[2,0,5,'bob',2,'none','',1],[3,2,6,'long',7,'none','',0],
 [4,1,2,'quiff',4,'beard','#3a2a1e',0],[5,4,0,'curly',1,'phones','',1],[6,0,7,'wavy',6,'none','',2],[7,2,3,'bun',0,'round','',0],
 [1,5,0,'crop',2,'beanie','#ef5d60',0],[0,2,1,'wavy',3,'glasses','',2],[2,1,4,'long',5,'freckles','',1],[3,3,0,'quiff',4,'cap','#3d7cf2',0],
 [4,0,2,'bob',7,'round','',1],[5,4,1,'afro',6,'none','',2],[6,2,5,'crop',0,'beard','#8d93a1',0],[7,1,6,'bun',1,'freckles','',1]
];
const eyes=m=>m===1?`<path d="M21.5 34.5q3.5-4 7 0M35.5 34.5q3.5-4 7 0" stroke="#1d1d24" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
 :`<g fill="#1d1d24"><ellipse cx="25" cy="34" rx="2.5" ry="3"/><ellipse cx="39" cy="34" rx="2.5" ry="3"/></g><g fill="#fff"><circle cx="25.9" cy="32.9" r=".9"/><circle cx="39.9" cy="32.9" r=".9"/></g>`;
const mouth=m=>m===2?`<path d="M26 44q6 7 12 0z" fill="#7a2e2e"/><path d="M27.5 44.8q4.5 2.4 9 0" stroke="#fff" stroke-width="1.3" fill="none"/>`
 :m===1?`<path d="M27 44q5 4 10 0" stroke="#7a2e2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
 :`<path d="M26.5 43.5q5.5 5.5 11 0" stroke="#7a2e2e" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;

function person(i){
 const [bg,sk,hc,hs,cl,ac,acc,m]=P[i],[a,b]=BG[bg],skin=SK[sk],skd=shade(skin,.86),hair=HC[hc],shirt=CL[cl],H=HAIR[hs];
 const accCol=acc||hair;
 const behind=(hs==='long'||hs==='bob'||hs==='wavy'||hs==='afro'||hs==='bun')?H.b(hair):'';
 const isCap=ac==='cap'||ac==='beanie';
 const front=isCap?'':H.f(hair);
 const beard=ac==='beard'?ACC.beard(accCol):'';
 const top=ac!=='none'&&ac!=='beard'?ACC[ac](accCol):'';
 const hairUnderCap=isCap?H.f(hair):'';
 return`<defs><linearGradient id="kb${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><radialGradient id="kh${i}" cx=".3" cy=".18" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<rect width="64" height="64" fill="url(#kb${i})"/><rect width="64" height="64" fill="url(#kh${i})"/>
${behind}
<path d="M8 66c0-11 8-17 17-18.5h14C48 49 56 55 56 66z" fill="${shirt}"/><path d="M25 48.5c1.5 5 4.5 7.5 7 7.5s5.5-2.5 7-7.5z" fill="${shade(shirt,.78)}"/>
<path d="M26.5 42h11v8.5c0 3-2.5 5-5.5 5s-5.5-2-5.5-5z" fill="${skd}"/>
<ellipse cx="14.5" cy="35" rx="3" ry="4.2" fill="${skin}"/><ellipse cx="49.5" cy="35" rx="3" ry="4.2" fill="${skin}"/>
<path d="M32 12.5c10.5 0 16.5 8 16.5 19.5 0 11.5-6.5 20-16.5 20S15.5 43.5 15.5 32C15.5 20.5 21.5 12.5 32 12.5z" fill="${skin}"/>
${hairUnderCap}${front}
<g opacity=".5" fill="#ff7a8a"><ellipse cx="21.5" cy="41" rx="3.4" ry="2"/><ellipse cx="42.5" cy="41" rx="3.4" ry="2"/></g>
<path d="M21 28.5q3.5-2.2 7-.5M36 28q3.5-1.7 7 .5" stroke="${shade(hair,.9)}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>
${eyes(m)}
<path d="M32 36.5v4.5q-1.5 1-3 .3" stroke="${shade(skin,.7)}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
${beard?'':mouth(m)}${beard}${beard?mouth(m).replace('#7a2e2e','#4a1d1d'):''}
${top}`;
}

/* ---- 8 mascots ---- */
const M=[
 /* cat */ i=>`<g><path d="M14 30L12 9l15 9zM50 30l2-21-15 9z" fill="#f08a3c"/><path d="M16 26l-1-11 8 5zM48 26l1-11-8 5z" fill="#ffb3a3"/><circle cx="32" cy="36" r="20" fill="#f6a04d"/><path d="M32 16v8M24 18l2 6M40 18l-2 6" stroke="#d9761f" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="32" cy="43" rx="9" ry="7" fill="#fff0e0"/><g fill="#1d1d24"><ellipse cx="24" cy="34" rx="2.8" ry="3.4"/><ellipse cx="40" cy="34" rx="2.8" ry="3.4"/></g><g fill="#fff"><circle cx="25" cy="32.8" r="1"/><circle cx="41" cy="32.8" r="1"/></g><path d="M29.5 39.5h5l-2.5 3z" fill="#e0607a"/><path d="M32 42.5v2.5m0 0q-2.5 2-5 .5m5-.5q2.5 2 5 .5" stroke="#7a3b2a" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M8 38l9 1.5M8 44l9-1M56 38l-9 1.5M56 44l-9-1" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/></g>`,
 /* fox */ i=>`<g><path d="M10 28L9 6l17 12zM54 28l1-22-17 12z" fill="#e8622c"/><path d="M13 24l-1-11 8 6zM51 24l1-11-8 6z" fill="#2d2420"/><path d="M12 30c0-10 9-15 20-15s20 5 20 15c0 12-8 24-20 24S12 42 12 30z" fill="#f2793a"/><path d="M12 36c8 1 14 6 20 18-12 0-20-10-20-18zM52 36c-8 1-14 6-20 18 12 0 20-10 20-18z" fill="#fff3e6"/><g fill="#1d1d24"><ellipse cx="23.5" cy="31" rx="2.6" ry="3.2"/><ellipse cx="40.5" cy="31" rx="2.6" ry="3.2"/></g><g fill="#fff"><circle cx="24.4" cy="29.9" r=".9"/><circle cx="41.4" cy="29.9" r=".9"/></g><ellipse cx="32" cy="46" rx="3.2" ry="2.4" fill="#2d2420"/><path d="M32 48.2v2.3m0 0q-2.2 1.8-4.5.3m4.5-.3q2.2 1.8 4.5.3" stroke="#7a3b2a" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>`,
 /* panda */ i=>`<g><circle cx="15" cy="15" r="8" fill="#26262e"/><circle cx="49" cy="15" r="8" fill="#26262e"/><circle cx="32" cy="35" r="21" fill="#f6f6f8"/><ellipse cx="23" cy="33" rx="6.5" ry="8" fill="#26262e" transform="rotate(18 23 33)"/><ellipse cx="41" cy="33" rx="6.5" ry="8" fill="#26262e" transform="rotate(-18 41 33)"/><g fill="#fff"><circle cx="23.5" cy="32" r="2.8"/><circle cx="40.5" cy="32" r="2.8"/></g><g fill="#1d1d24"><circle cx="24" cy="32.3" r="1.5"/><circle cx="40" cy="32.3" r="1.5"/></g><ellipse cx="32" cy="42" rx="4.2" ry="3" fill="#26262e"/><path d="M32 45v2m0 0q-2.5 2.2-5 .2m5-.2q2.5 2.2 5 .2" stroke="#26262e" stroke-width="1.7" fill="none" stroke-linecap="round"/></g>`,
 /* robot */ i=>`<g><path d="M32 6v7" stroke="#cfd6e4" stroke-width="2.6" stroke-linecap="round"/><circle cx="32" cy="6" r="3.2" fill="#ff5d73"/><rect x="11" y="26" width="5" height="12" rx="2.5" fill="#aeb8cc"/><rect x="48" y="26" width="5" height="12" rx="2.5" fill="#aeb8cc"/><rect x="14" y="13" width="36" height="34" rx="11" fill="#e8edf6"/><rect x="14" y="13" width="36" height="34" rx="11" fill="none" stroke="#c4cddd" stroke-width="1.5"/><rect x="19" y="23" width="26" height="14" rx="7" fill="#1e2430"/><g fill="#5cf2d6"><circle cx="26.5" cy="30" r="3.2"/><circle cx="37.5" cy="30" r="3.2"/></g><path d="M27 41.5h10" stroke="#9aa6bd" stroke-width="2.2" stroke-linecap="round"/><rect x="20" y="49" width="24" height="12" rx="5" fill="#cfd6e4"/></g>`,
 /* astronaut */ i=>`<g><rect x="12" y="46" width="40" height="22" rx="10" fill="#e9ecf2"/><circle cx="32" cy="31" r="21" fill="#f1f3f8"/><circle cx="32" cy="31" r="21" fill="none" stroke="#cdd4e2" stroke-width="1.6"/><rect x="16" y="20" width="32" height="22" rx="11" fill="#1f2a44"/><path d="M20 25c3-3 9-4 14-3" stroke="#8fb4ff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".8"/><circle cx="40" cy="36" r="2.2" fill="#8fb4ff" opacity=".5"/><rect x="26" y="50" width="12" height="7" rx="2" fill="#ef5d60"/><circle cx="11" cy="31" r="3.6" fill="#cdd4e2"/><circle cx="53" cy="31" r="3.6" fill="#cdd4e2"/></g>`,
 /* owl */ i=>`<g><path d="M14 22l-3-12 12 6zM50 22l3-12-12 6z" fill="#7a5238"/><path d="M12 36c0-14 8-22 20-22s20 8 20 22c0 12-8 21-20 21S12 48 12 36z" fill="#9b6b47"/><path d="M20 49c3 4 7 6 12 6s9-2 12-6c-3-2-7-3-12-3s-9 1-12 3z" fill="#e8c9a0"/><circle cx="24" cy="32" r="9" fill="#fff3df"/><circle cx="40" cy="32" r="9" fill="#fff3df"/><g fill="#2b2118"><circle cx="24.5" cy="32.5" r="4.6"/><circle cx="39.5" cy="32.5" r="4.6"/></g><g fill="#fff"><circle cx="26" cy="30.8" r="1.6"/><circle cx="41" cy="30.8" r="1.6"/></g><path d="M29 38.5h6l-3 6z" fill="#f2a93b"/></g>`,
 /* bear */ i=>`<g><circle cx="15" cy="17" r="8" fill="#7a4e2f"/><circle cx="49" cy="17" r="8" fill="#7a4e2f"/><circle cx="15" cy="17" r="4" fill="#d9a77a"/><circle cx="49" cy="17" r="4" fill="#d9a77a"/><circle cx="32" cy="35" r="21" fill="#94613b"/><ellipse cx="32" cy="42" rx="10" ry="8" fill="#e8c9a0"/><g fill="#1d1d24"><circle cx="23.5" cy="31.5" r="2.6"/><circle cx="40.5" cy="31.5" r="2.6"/></g><g fill="#fff"><circle cx="24.4" cy="30.6" r=".9"/><circle cx="41.4" cy="30.6" r=".9"/></g><ellipse cx="32" cy="39" rx="4" ry="3" fill="#2b2118"/><path d="M32 42v3m0 0q-3 2.5-6 .3m6-.3q3 2.5 6 .3" stroke="#6a3b24" stroke-width="1.7" fill="none" stroke-linecap="round"/></g>`,
 /* alien */ i=>`<g><path d="M32 4v8" stroke="#9be07a" stroke-width="2.4" stroke-linecap="round"/><circle cx="32" cy="4.5" r="3" fill="#ffd34d"/><path d="M32 12c12 0 19 9 19 20 0 12-8 20-19 20S13 44 13 32c0-11 7-20 19-20z" fill="#8be06c"/><path d="M32 12c-8 1-14 8-15 17 4-6 10-9 15-9z" fill="#fff" opacity=".18"/><ellipse cx="23" cy="32" rx="6" ry="8.5" fill="#1d1d24" transform="rotate(16 23 32)"/><ellipse cx="41" cy="32" rx="6" ry="8.5" fill="#1d1d24" transform="rotate(-16 41 32)"/><g fill="#fff"><circle cx="21.5" cy="29" r="1.8"/><circle cx="39.5" cy="29" r="1.8"/></g><path d="M27.5 46q4.5 3.5 9 0" stroke="#3d7a2a" stroke-width="2" fill="none" stroke-linecap="round"/></g>`
];
const MBG=[[1,0],[7,3],[5,2],[2,1],[6,5],[4,7],[3,0],[0,4]];

function avatarSvg(i){
 i=((+i||0)%24+24)%24;
 let inner;
 if(i<16)inner=person(i);
 else{
  const k=i-16,[a,b]=BG[MBG[k][0]];
  inner=`<defs><linearGradient id="kb${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><radialGradient id="kh${i}" cx=".3" cy=".18" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="64" height="64" fill="url(#kb${i})"/><rect width="64" height="64" fill="url(#kh${i})"/>${M[k](i)}`;
 }
 return'<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">'+inner+'</svg>';
}
window.AV_COUNT=24;
window.avatarSvg=avatarSvg;
/* the avatar already on screen (profile button, popup) is redrawn with the new set */
try{if(typeof refreshAv==='function')refreshAv()}catch{}
})();
