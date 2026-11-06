let LASTUSER=0; ["pointerdown","keydown"].forEach(ev=>addEventListener(ev,()=>{LASTUSER=Date.now();},true));
/* ---------- panneau de droite : ville / quartier / annonce ---------- */
const wide=()=>matchMedia("(min-width:941px)").matches;
function renderSide(){const sd=document.getElementById("qDetail"), det=document.getElementById("detail"); if(!sd) return;
 const showQ=QSEL&&QSEL.ck===SEL&&IR[SEL];
 if(!showQ&&!AD){sd.hidden=true; det.hidden=false; document.body.classList.remove("sheet-on"); renderSide.open=false; return;}
 const c=C.find(v=>v.k===SEL);
 const cr=[`<button type="button" class="lnk" data-crumb="city">← ${c.name}</button>`];
 const tq=AD&&typeof adQuart==="function"?adQuart(AD):null;
 if(tq) cr.push(`<button type="button" class="lnk" data-fgo="q|${tq.ck}|${tq.code}">${esc(tq.name)}</button>`);
 else if(showQ) cr.push(AD?`<button type="button" class="lnk" data-crumb="q">${esc(QSEL.name)}</button>`:`<b>${esc(QSEL.name)}</b>`);
 if(AD) cr.push(`<b>${AD.kind==="v"?"Studio à vendre":AD.kind==="b"?"Notre bien":"Studio à louer"}</b>`);
 document.getElementById("crumbs").innerHTML=cr.join('<span class="sep">›</span>')+`<button type="button" class="sheetx" data-crumb="${AD?"q":"city"}" aria-label="Fermer">×</button>`;
 document.getElementById("qDetailBody").innerHTML=AD?adFiche(AD):qCard(QSEL);
 sd.hidden=false; det.hidden=wide(); document.body.classList.toggle("sheet-on",!wide()||document.getElementById("mapSec").classList.contains("mapfull"));
 sd.scrollTop=0;
 const byUser=Date.now()-LASTUSER<1500; // ne défile jamais tout seul (chargement, relevé, synchronisation)
 if(byUser&&!wide()&&!document.getElementById("mapSec").classList.contains("mapfull")&&!renderSide.open){const m=document.querySelector("#mapSec .mapbox").getBoundingClientRect(); if(m.top<0||m.bottom>innerHeight*0.48) scrollBy({top:m.top-8,behavior:"smooth"});}
 renderSide.open=true;
 if(byUser&&wide()){const r=sd.getBoundingClientRect(); if(r.top<0||r.top>innerHeight-120) sd.scrollIntoView({behavior:"smooth",block:"nearest"});}
 updateCmpButtons();}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-crumb]"); if(!b) return; e.preventDefault();
 if(b.dataset.crumb==="city"){AD=null; QSEL=null;} else AD=null; draw(); renderQBox();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&(AD||QSEL)&&!document.getElementById("mapSec").classList.contains("mapfull")){if(AD) AD=null; else QSEL=null; draw(); renderQBox();}});
addEventListener("resize",()=>{clearTimeout(renderSide.t); renderSide.t=setTimeout(renderSide,200);});

/* ---------- résumé de la ville sur la carte (téléphone) ---------- */
function renderChip(){const ch=document.getElementById("mapChip"); if(!ch) return; const c=C.find(v=>v.k===SEL), x=calc(c);
 ch.innerHTML=`<b>${c.name}</b> <small style="color:var(--muted)">moy.</small> <span class="mono" style="color:${colIrr(x.irr)}">${x.irr==null?"n.d.":pct(x.irr)}</span> · <span class="mono">${sgn(x.cf)}/m</span><span class="go">Fiche ↓</span>`;}
document.getElementById("mapChip").addEventListener("click",()=>document.getElementById("detail").scrollIntoView({behavior:"smooth",block:"start"}));
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-zq]"); if(!b) return; e.preventDefault(); const k=b.dataset.zq; if(SEL!==k){SEL=k; render();}
 if(IR[k]) flyTo(IR[k].bb); if(!wide()) document.getElementById("mapSec").scrollIntoView({behavior:"smooth",block:"start"});});

/* ---------- thème clair / sombre ---------- */
(function(){const b=document.getElementById("themeBtn"); if(!b) return;
 const cur=()=>document.documentElement.getAttribute("data-theme")==="dark"?"dark":"light";
 const lab=()=>{b.textContent=cur()==="dark"?"☀ Clair":"☾ Sombre"; b.setAttribute("aria-label",cur()==="dark"?"Passer en thème clair":"Passer en thème sombre");};
 b.addEventListener("click",()=>{const t=cur()==="dark"?"light":"dark"; document.documentElement.setAttribute("data-theme",t); try{localStorage.setItem("theme",t);}catch(_){} lab(); render();});
 lab();})();

document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-openad]"); if(!b) return; e.preventDefault(); const [kind,ck,...r]=b.dataset.openad.split("|"); openAd(kind,ck,r.join("|"));
 if(kind==="b"&&QSEL&&QSEL.ck===ck&&!document.getElementById("mapSec").classList.contains("mapfull")){flyTo(QSEL.bb,3.2); if(!wide()) document.getElementById("mapSec").scrollIntoView({behavior:"smooth",block:"start"});}
 const t=wide()?document.getElementById("side"):null; if(t) t.scrollIntoView({behavior:"smooth",block:"start"});});

