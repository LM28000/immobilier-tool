/* ---------- feuille du bas (téléphone) : glisser ---------- */
(function(){const sd=document.getElementById("qDetail"); if(!sd) return; let s=null;
 const sheet=()=>getComputedStyle(sd).position==="fixed"&&!wide();
 sd.addEventListener("touchstart",e=>{if(e.touches.length!==1||!sheet()) {s=null; return;} const t=e.touches[0], top=sd.getBoundingClientRect().top;
  s={x:t.clientX,y:t.clientY,h:t.clientY-top<48,sc:sd.scrollTop,t:e.timeStamp};},{passive:true});
 sd.addEventListener("touchmove",e=>{if(!s||!s.h) return; const dy=e.touches[0].clientY-s.y; if(dy>0&&!sd.classList.contains("full")) sd.style.transform=`translateY(${dy}px)`;},{passive:true});
 sd.addEventListener("touchend",e=>{if(!s) return; const t=e.changedTouches[0], dx=t.clientX-s.x, dy=t.clientY-s.y; sd.style.transform="";
  if(s.h&&Math.abs(dy)<8&&Math.abs(dx)<8){sd.classList.toggle("full");}
  else if(s.h&&dy<-40){sd.classList.add("full");}
  else if(s.h&&dy>50){if(sd.classList.contains("full")) sd.classList.remove("full"); else {sd.classList.remove("full"); if(AD) AD=null; else QSEL=null; draw(); renderQBox();}}
  else if(AD&&Math.abs(dx)>60&&Math.abs(dx)>1.6*Math.abs(dy)&&!e.target.closest("input,select,.scrollbox,.tablewrap")) adStep(dx<0?1:-1);
  s=null;});})();

/* ---------- raccourcis clavier ---------- */
addEventListener("keydown",e=>{if(e.metaKey||e.ctrlKey||e.altKey) return; const tg=e.target; if(tg&&(tg.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
 const k=e.key, mid=[VW/2,VH/2];
 if(k==="ArrowRight"&&AD){e.preventDefault(); adStep(1);}
 else if(k==="ArrowLeft"&&AD){e.preventDefault(); adStep(-1);}
 else if(k==="f"||k==="F"){setFull(!document.getElementById("mapSec").classList.contains("mapfull"));}
 else if(k==="+"||k==="="){flyZoom(...mid,2);}
 else if(k==="-"||k==="_"){flyZoom(...mid,.5);}
 else if(k==="0"){QSEL=null; AD=null; flyTo([0,0,WW,MAP.H],1);}
 else if((k==="a"||k==="A")&&AD){const b=document.querySelector("#qDetailBody [data-addv]"); if(b) b.click();}
 else if((k==="c"||k==="C")&&AD&&AD.kind==="v"){toggleCmp({kind:"v",id:AD.ck+"|"+AD.suf});}
 else if(k==="?"){toast("Raccourcis : ← → annonces · A ajouter · C comparer · F plein écran · + − zoom · 0 tout voir · Échap fermer");}});

/* ---------- listes vides ---------- */
function emptyNote(host,show,txt){if(!host) return; let p=host.querySelector(":scope > .empty"); if(!p){p=document.createElement("p"); p.className="empty"; host.appendChild(p);} p.textContent=txt; p.hidden=!show;}
const _adFilter=adFilter; adFilter=function(w){_adFilter(w); const n=[...w.querySelectorAll("tbody tr")].filter(tr=>!tr.hidden).length; emptyNote(w,n===0,"Aucune annonce avec ces filtres. Essayez « Tout » ou un autre secteur.");};
document.getElementById("qSearch").addEventListener("input",function(){const n=[...document.querySelectorAll("#zBody tr")].filter(tr=>!tr.hidden).length, q=document.getElementById("qSearch"); emptyNote(q.closest(".qall"),n===0,`Aucun quartier ne contient « ${q.value} ».`);});

/* ---------- défilement : molette sur la carte, listes repliées ---------- */
function wheelHint(){const w=document.getElementById("wheelHint"); if(!w) return; w.classList.add("on"); clearTimeout(wheelHint.t); wheelHint.t=setTimeout(()=>w.classList.remove("on"),1100);}
const CLIPN=8;
function clipBox(sb){const N=CLIPN, rows=[...sb.querySelectorAll("tbody tr")], vis=rows.filter(tr=>!tr.hidden), open=sb.dataset.open==="1";
 vis.forEach((tr,i)=>{const m=!open&&i>=N&&!tr.classList.contains("sel"); if(tr.classList.contains("more")!==m) tr.classList.toggle("more",m);});
 rows.filter(tr=>tr.hidden&&tr.classList.contains("more")).forEach(tr=>tr.classList.remove("more"));
 let b=sb.nextElementSibling; if(!b||!b.classList.contains("morebtn")){b=document.createElement("button"); b.type="button"; b.className="morebtn"; sb.after(b);
  b.addEventListener("click",()=>{const was=sb.dataset.open==="1"; sb.dataset.open=was?"":"1"; clipBox(sb); if(was) sb.scrollIntoView({block:"nearest"});});}
 const extra=vis.length-N, txt=open?"Replier la liste":`Afficher les ${extra} autres`, hide=extra<=0;
 if(b.textContent!==txt) b.textContent=txt; if(b.hidden!==hide) b.hidden=hide;}
let clipQ=false; const clipAll=()=>{clipQ=false; document.querySelectorAll(".scrollbox").forEach(clipBox);};
new MutationObserver(()=>{if(!clipQ){clipQ=true; requestAnimationFrame(clipAll);}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
clipAll();

/* ---------- onglets du panneau ---------- */
const PT={};
function ptabs(id,list){return list.map(([l,c])=>`<h2 class="psec">${l}</h2>${c}`).join("");}
function ptabsTabs(id,list){const cur=Math.min(PT[id]||0,list.length-1);
 return `<div class="ptabs" role="group">${list.map(([l],i)=>`<button type="button" aria-pressed="${i===cur}" data-pt="${id}|${i}">${l}</button>`).join("")}</div>${list.map(([,c],i)=>`<div class="ptab" data-ptp="${id}|${i}"${i===cur?"":" hidden"}>${c}</div>`).join("")}`;}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-pt]"); if(!b) return; e.preventDefault(); const [id,i]=b.dataset.pt.split("|"); PT[id]=+i;
 const host=b.parentElement.parentElement; host.querySelectorAll(`:scope > .ptabs [data-pt^="${id}|"]`).forEach(x=>x.setAttribute("aria-pressed",x===b)); host.querySelectorAll(`:scope > [data-ptp^="${id}|"]`).forEach(p=>p.hidden=p.dataset.ptp!==`${id}|${i}`);});

