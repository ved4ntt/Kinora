/* Kinora app feel: inside the Windows and Android apps there is no browser menu, no text selection on the interface, no dragging of pictures, no page zoom. */
(()=>{
'use strict';
const UA=navigator.userAgent||'';
const APP=/Electron/.test(UA)||!!window.KinoraDevice||!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
if(!APP)return;
const R=document.documentElement;
R.classList.add('kapp');
document.addEventListener('contextmenu',e=>{if(!(e.target.closest&&e.target.closest('input,textarea,[contenteditable="true"]')))e.preventDefault()});
document.addEventListener('dragstart',e=>{const t=e.target;if(t&&(t.tagName==='IMG'||t.tagName==='A'))e.preventDefault()});
document.addEventListener('wheel',e=>{if(e.ctrlKey)e.preventDefault()},{passive:false});
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['+','-','=','0'].includes(e.key))e.preventDefault()});
})();
