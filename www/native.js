/* Kinora native feel: edge-swipe back, swipe the Home banner, haptic ticks, no long-press menus. */
(()=>{
const D=document,app=()=>D.getElementById('app');
const buzz=()=>{try{navigator.vibrate&&navigator.vibrate(6)}catch{}};
/* a light tick when a finger presses something tappable */
D.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.target.closest('.tv-i,.kh-btn,.kt-b,.kg-chips button,.kh-c,.k6r,.k6t,.kt-ep,.kt-rx button'))buzz()},{passive:true});
/* no long-press menu on posters, links or images (text fields keep theirs) */
D.addEventListener('contextmenu',e=>{if(!e.target.closest('input,textarea'))e.preventDefault()});

let sx=0,sy=0,dx=0,mode='';
const canBack=()=>location.hash.replace(/^#\/?/,'')!==''&&!D.querySelector('#pl')&&!D.body.classList.contains('tv-hide');
D.addEventListener('touchstart',e=>{
 const t=e.touches[0];sx=t.clientX;sy=t.clientY;dx=0;
 mode=sx<24&&canBack()?'back':e.target.closest('.kh-hero')?'hero':'';
},{passive:true});
D.addEventListener('touchmove',e=>{
 if(!mode)return;const t=e.touches[0],dy=t.clientY-sy;dx=t.clientX-sx;
 if(Math.abs(dy)>Math.abs(dx)*1.2&&Math.abs(dy)>12){if(mode==='back')reset(app());mode='';return}
 if(mode==='back'){const a=app();a.style.transition='none';a.style.transform='translateX('+Math.max(0,dx*.55)+'px)';a.style.opacity=1-Math.min(.35,Math.max(0,dx)/700)}
},{passive:true});
function reset(a){a.style.transition='transform .35s var(--e),opacity .35s';a.style.transform='';a.style.opacity='';setTimeout(()=>{a.style.transition=''},380)}
D.addEventListener('touchend',()=>{
 const a=app();
 if(mode==='back'){
  if(dx>90){a.style.transition='transform .2s ease-in,opacity .2s';a.style.transform='translateX(100vw)';a.style.opacity=0;setTimeout(()=>{a.style.transition='';a.style.transform='';a.style.opacity='';history.back()},190)}
  else reset(a);
 }else if(mode==='hero'&&Math.abs(dx)>46){
  const d=[...D.querySelectorAll('.kh-dots i')],i=d.findIndex(x=>x.classList.contains('on')),n=d[i+(dx<0?1:-1)]||d[dx<0?0:d.length-1];
  if(n)n.click();
 }
 mode='';
});
})();
