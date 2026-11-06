/* ---------- version téléphone : 5 écrans et une barre d'onglets en bas ---------- */
const MOBQ=matchMedia("(max-width:760px)");
const MICO={
 carte:'<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z M9 4v13.5 M15 6.5V20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
 annonces:'<path d="M4 5h16M4 10h16M4 15h10M4 20h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
 short:'<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
 fin:'<path d="M17.5 6.5A7 7 0 1 0 17.5 17.5M4 10.5h9M4 13.5h9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
 plus:'<circle cx="5.5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor"/>'};
const MSCR=[["carte","Carte"],["annonces","Annonces"],["short","Shortlist"],["fin","Financement"],["plus","Plus"]];
let MS="carte", MOBON=false;
const MPLACE={}; // emplacement d'origine des blocs déplacés
function mMove(el,to,before){if(!el) return; if(!MPLACE[el.id]){const c=document.createComment("m:"+el.id); el.before(c); MPLACE[el.id]=c;} before?to.insertBefore(el,before):to.appendChild(el);}
function mBack(){Object.entries(MPLACE).forEach(([id,c])=>{const el=document.getElementById(id); if(el) c.after(el);});}

/* éléments créés une fois */
const mNav=document.createElement("nav"); mNav.className="mnav"; mNav.setAttribute("aria-label","Écrans");
mNav.innerHTML=MSCR.map(([k,l])=>`<button type="button" data-ms="${k}" aria-current="false"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${MICO[k]}</svg><span>${l}</span><b class="mbadge" hidden></b></button>`).join("");
const mAnn=document.createElement("section"); mAnn.className="panel mscreen"; mAnn.id="mAnn";
mAnn.innerHTML=`<h2 class="mh">Annonces</h2><div class="mcities" id="mCities" role="group" aria-label="Ville"></div><div id="mAnnTop"></div><div id="mAnnBody"></div>`;
const mDet=document.createElement("div"); mDet.className="mdet"; mDet.id="mDet"; mDet.hidden=true;
mDet.innerHTML=`<div class="mdetbar"><button type="button" class="mback" data-mdetclose><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>Carte</button><b id="mDetT"></b></div><div class="mdetin" id="mDetIn"></div>`;
const mPlusNav=document.createElement("div"); mPlusNav.id="mShortMore"; mPlusNav.className="mmore";
mPlusNav.innerHTML=`<button type="button" class="btn ghost" data-mgo="tab-biens">Tous nos biens · ajouter un bien</button>`;

function mCities(){const box=document.getElementById("mCities"); if(!box) return;
 const ks=C.filter(c=>ADS[c.k]).map(c=>c.k);
 box.innerHTML=ks.map(k=>{const c=C.find(v=>v.k===k), n=(ADS[k].ventes||[]).length; return `<button type="button" class="chip" data-mcity="${k}" aria-pressed="${SEL===k}">${c.name}<small>${n}</small></button>`;}).join("");
 const top=document.getElementById("mAnnTop");
 top.innerHTML=QSEL&&QSEL.ck===SEL?`<p class="mcrumb"><button type="button" class="lnk" data-mcity="${SEL}">← Tout ${esc(C.find(c=>c.k===SEL).name)}</button> · quartier ${esc(QSEL.name)}</p>`:IR[SEL]?"":`<p class="sub">Pas d'annonces suivies pour ${esc(C.find(c=>c.k===SEL).name)} : choisissez une des villes ci-dessus.</p>`;}

function mBadges(){const n=BIENS?BIENS.filter(b=>!isOut(b)).length:0, b=mNav.querySelector('[data-ms="short"] .mbadge'); b.hidden=!n; b.textContent=n;}

function mShow(k,opt){opt=opt||{}; MS=k; try{localStorage.setItem("mscreen",k);}catch(_){}
 document.body.dataset.ms=k; document.body.classList.toggle("mcarte",k==="carte");
 mNav.querySelectorAll("[data-ms]").forEach(b=>b.setAttribute("aria-current",b.dataset.ms===k?"page":"false"));
 if(k!=="carte") mDetClose();
 if(k==="annonces") mCities();
 if(k==="fin"){const f=document.getElementById("finBox"); if(f) f.open=true;}
 if(!opt.keep) scrollTo({top:0,behavior:"instant"});
 mSheet(); mTop(); requestAnimationFrame(()=>{mTop(); draw.vw=0; fitVH(); rowArrows&&rowArrows();});}
function mTop(){const h=document.querySelector(".wrap>header"); if(h) document.documentElement.style.setProperty("--mtop",Math.round(h.getBoundingClientRect().bottom)+"px");}
function mSheet(){document.body.classList.toggle("mnoq",MOBON&&MS!=="carte"&&!AD);}
addEventListener("resize",()=>{if(MOBON) mTop();});

function mApply(on){if(on===MOBON) return; MOBON=on; document.body.classList.toggle("mob",on);
 document.querySelectorAll("#netSeg button").forEach(b=>{if(!b.dataset.full) b.dataset.full=b.textContent; b.textContent=on?(b.dataset.net==="1"?"Net":"Brut"):b.dataset.full;});
 if(on){
  document.body.appendChild(mNav);
  const wrap=document.querySelector(".wrap"), main=document.querySelector(".main");
  main.before(mAnn);
  mMove(document.getElementById("dealsH"),document.getElementById("mAnnTop").parentNode,document.getElementById("mAnnBody"));
  mMove(document.getElementById("dealsWrap"),mAnn,document.getElementById("mAnnBody"));
  mMove(document.getElementById("qBox"),document.getElementById("mAnnBody"));
  document.getElementById("shortPanel").appendChild(mPlusNav);
  document.body.appendChild(mDet); mMove(document.getElementById("detail"),document.getElementById("mDetIn"));
  let k="carte"; try{k=localStorage.getItem("mscreen")||"carte";}catch(_){} if(!MSCR.some(s=>s[0]===k)) k="carte";
  mShow(k,{keep:true});
 } else {
  mBack(); mNav.remove(); mAnn.remove(); mDet.remove(); mPlusNav.remove();
  delete document.body.dataset.ms; document.body.classList.remove("mcarte","mdet-on");
  requestAnimationFrame(()=>{draw.vw=0; fitVH();});}}

/* fiche de la ville en plein écran (depuis la pastille sous la carte) */
function mDetOpen(){mDet.hidden=false; document.body.classList.add("mdet-on"); const c=C.find(v=>v.k===SEL); document.getElementById("mDetT").textContent=c?c.name:""; document.getElementById("mDetIn").scrollTop=0;}
function mDetClose(){if(mDet.hidden) return; mDet.hidden=true; document.body.classList.remove("mdet-on");}

document.addEventListener("click",e=>{if(!MOBON) return;
 const t=e.target.closest&&e.target.closest("[data-ms],[data-mcity],[data-mdetclose],[data-mgo],#mapChip,[data-gotab],#cmpGo,[data-sim]");
 if(!t) return;
 if(t.matches("#mapChip")){e.stopImmediatePropagation(); mDetOpen(); return;}
 if(t.dataset.mdetclose!==undefined){mDetClose(); return;}
 if(t.dataset.ms&&t.closest(".mnav")){if(t.dataset.ms===MS) scrollTo({top:0,behavior:"smooth"}); else mShow(t.dataset.ms); return;}
 if(t.dataset.mcity){const k=t.dataset.mcity; SEL=k; QSEL=null; render(); if(IR[k]) flyTo(IR[k].bb); mCities(); return;}
 if(t.dataset.mgo){showTab(t.dataset.mgo); mShow("plus"); return;}
 // actions qui menaient à un autre endroit de la page : on change d'écran d'abord
 if(t.dataset.gotab||t.id==="cmpGo"||t.dataset.sim) mShow("plus",{keep:true});},true);

/* un clic sur la carte qui sélectionne une ville ou un quartier garde l'écran Carte ; les annonces suivent */
const _render=render; render=function(){_render.apply(this,arguments); if(MOBON){mBadges(); if(MS==="annonces") mCities(); const c=C.find(v=>v.k===SEL); if(c&&!mDet.hidden) document.getElementById("mDetT").textContent=c.name;}};
const _showTab=showTab; showTab=function(id){_showTab(id); if(MOBON&&MS!=="plus"&&LASTUSER&&Date.now()-LASTUSER<1500) mShow("plus",{keep:true});};
addEventListener("keydown",e=>{if(e.key==="Escape"&&MOBON&&!mDet.hidden) mDetClose();});
const _renderSide=renderSide; renderSide=function(){_renderSide.apply(this,arguments); if(MOBON) mSheet();};

MOBQ.addEventListener?MOBQ.addEventListener("change",e=>mApply(e.matches)):MOBQ.addListener(e=>mApply(e.matches));
mApply(MOBQ.matches);
