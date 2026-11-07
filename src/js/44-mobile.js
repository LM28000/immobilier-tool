/* ================= appli téléphone (≤ 760 px) =================
   Écrans propres au téléphone, construits avec les mêmes calculs et données que la version ordinateur.
   Les blocs de la version ordinateur (carte, classement, nos biens…) sont déplacés dans l'appli quand on en a besoin. */
const MOBQ=matchMedia("(max-width:760px)");
let MOBON=false, MS="carte";
const MSCROLL={};
const MF={ck:"",sort:"irr",bank:false,nw:false,drop:false,sec:"",n:20};   // filtres du fil d'annonces
const MSF={st:"tous"};                                                   // filtre de la shortlist
const SORTS=[["irr","Rendement"],["cf","Cash-flow"],["prix","Prix"],["new","Nouveauté"]];
const I=(d,f)=>`<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${f?`<g fill="currentColor">${d}</g>`:`<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</g>`}</svg>`;
const MICO={
 carte:[`<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>`,`<path d="M3 6.5 9 4v13.5L3 20zM10.5 4.3l3 1.3v13.8l-3-1.3zM15 6.5 21 4v13.5L15 20z"/>`],
 annonces:[`<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/>`,`<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/>`],
 short:[`<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>`,`<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>`],
 budget:[`<path d="M17.5 6.5A7 7 0 1 0 17.5 17.5M4 10.5h9M4 13.5h9"/>`,null],
 plus:[`<circle cx="5.5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.5" cy="12" r="1.7"/>`,`<circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/>`]};
const MTABS=[["carte","Carte"],["annonces","Annonces"],["short","Shortlist"],["budget","Budget"],["plus","Plus"]];
const icoTab=(k,on)=>{const [o,f]=MICO[k]; return on&&f?I(f,true):(k==="plus"?I(o,true):I(o));};
const chev=`<span class="mchev" aria-hidden="true">›</span>`;
const mEsc=s=>esc(s==null?"":String(s));
const cityName=k=>(C.find(c=>c.k===k)||{}).name||k;

/* ---------- squelette ---------- */
const mApp=document.createElement("div"); mApp.id="mApp";
mApp.innerHTML=`
<section class="mscr" id="ms-carte" data-ms="carte">
 <div class="mmap" id="mMap"></div>
 <div class="mmtop"><button type="button" class="msearch" data-msearch>${I('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>')}<span>Ville ou quartier</span></button><div class="mmrow" id="mModeHost"></div></div>
 <div class="msheet" id="mSheet" data-snap="1"><div class="mgrab" id="mGrab"><i></i></div><div class="msheetin" id="mSheetIn"></div></div>
</section>
<section class="mscr" id="ms-annonces" data-ms="annonces"><header class="mhd"><h1>Annonces</h1><p id="mACount"></p></header><div class="mchips" id="mACity"></div><div class="mchips" id="mAFil"></div><div class="mfeed" id="mFeed"></div></section>
<section class="mscr" id="ms-short" data-ms="short"><header class="mhd"><h1>Shortlist</h1><p id="mSCount"></p></header><div class="mchips" id="mSFil"></div><div class="mpad" id="mShort"></div></section>
<section class="mscr" id="ms-budget" data-ms="budget"><header class="mhd"><h1>Budget</h1></header><div class="mpad" id="mBudget"></div></section>
<section class="mscr" id="ms-plus" data-ms="plus"><header class="mhd"><h1>Plus</h1></header><div class="mpad" id="mPlus"></div></section>
<div class="mbar" id="mBar" aria-hidden="true"><b id="mBarT"></b></div>
<nav class="mtab" id="mTab" aria-label="Écrans">${MTABS.map(([k,l])=>`<button type="button" data-mtab="${k}" aria-current="false"><span class="mti">${icoTab(k,false)}</span><span>${l}</span><b class="mbadge" hidden></b></button>`).join("")}</nav>
<div id="mStack"></div>`;

/* ---------- déplacer des blocs de la version ordinateur ---------- */
const MPL=new Map();
function mTake(el,to){if(!el) return; if(!MPL.has(el)){const c=document.createComment("m"); el.before(c); MPL.set(el,{c,hidden:el.hidden});} to.appendChild(el);}
function mGive(el){const p=MPL.get(el); if(!p) return; p.c.after(el); el.hidden=p.hidden; p.c.remove(); MPL.delete(el);}

/* ---------- écrans empilés (fiche, sous-pages) ---------- */
const STACK=[];
function mPush(title,html,opt){opt=opt||{}; const s=document.createElement("section"); s.className="mpush"+(opt.hero?" hero":"");
 s.innerHTML=`${opt.hero?"":`<div class="mpbar"><button type="button" class="mpback" data-mpop>${I('<path d="M15 5l-7 7 7 7"/>')}<span>${mEsc(opt.back||"Retour")}</span></button><b>${mEsc(title)}</b><span class="mpr">${opt.right||""}</span></div>`}<div class="mpin">${html||""}</div>${opt.cta?`<div class="mcta">${opt.cta}</div>`:""}`;
 document.getElementById("mStack").appendChild(s); STACK.push({s,els:[],onpop:opt.onpop,key:opt.key});
 navPush({t:"push"});
 requestAnimationFrame(()=>s.classList.add("in")); document.body.classList.add("mstack"); return s;}
function mPushEl(title,el,opt){const s=mPush(title,"",opt); const box=s.querySelector(".mpin"); mTake(el,box); el.hidden=false; STACK[STACK.length-1].els.push(el); return s;}
/* historique : chaque changement d'onglet et chaque écran ouvert ajoute une entrée,
   le bouton ou geste retour revient d'un cran ; à la racine, il faut faire retour deux fois pour quitter */
const NAV=[]; let EXITT=0, NAVINIT=false;
function navPush(e){NAV.push(e); try{history.pushState({mnav:NAV.length},"");}catch(_){}}
function navInit(){if(NAVINIT) return; NAVINIT=true; try{history.replaceState({mnav:0,mroot:1},""); history.pushState({mnav:0,mguard:1},"");}catch(_){}}
function mPop(){if(NAV.length&&NAV[NAV.length-1].t==="push"){try{history.back(); return;}catch(_){}} mPopNow();}
function mBack(){try{history.back();}catch(_){}}
addEventListener("popstate",e=>{if(!MOBON) return; const st=e.state||{};
 if(st.mroot){if(Date.now()-EXITT<2200){try{history.back();}catch(_){} return;} EXITT=Date.now(); toast("Faites retour encore une fois pour quitter l'appli"); try{history.pushState({mnav:0,mguard:1},"");}catch(_){} return;}
 const d=st.mnav||0; let undone=0; while(NAV.length>d){const n=NAV.pop(); undone++; if(n.t==="push") mPopNow(); else mShowNow(n.from,{back:true});}
 if(!undone&&d>0){try{history.back();}catch(_){}}});
function mPopNow(){const top=STACK.pop(); if(!top) return; top.els.forEach(mGive); top.onpop&&top.onpop(); top.s.style.transform=""; top.s.classList.remove("in"); top.s.classList.add("out"); setTimeout(()=>top.s.remove(),260);
 if(!STACK.length) document.body.classList.remove("mstack");}
function mPopAll(){while(STACK.length) mPopNow(); while(NAV.length&&NAV[NAV.length-1].t==="push") NAV.pop();}
function mRefreshTop(){const t=STACK[STACK.length-1]; if(t&&t.key&&t.key.refresh) t.key.refresh(t.s);}

/* ---------- chiffres communs ---------- */
const irrTxt=x=>x.irr==null?"n.d.":pct(x.irr);
const mcfc=v=>v>=0?"pos":"neg";
let MSEEN=null;           // date de la visite précédente (pour « nouveau »)
(function(){try{const today=new Date().toISOString().slice(0,10), s=JSON.parse(localStorage.getItem("mvisit")||"null");
 if(!s){MSEEN=null; localStorage.setItem("mvisit",JSON.stringify({last:today,prev:null}));}
 else if(s.last!==today){MSEEN=s.last; localStorage.setItem("mvisit",JSON.stringify({last:today,prev:s.last}));}
 else MSEEN=s.prev;}catch(_){}})();
function hEntry(ck,suf){return HIST[ck]&&HIST[ck].v&&HIST[ck].v[suf];}
function isNewAd(ck,suf){const e=hEntry(ck,suf); if(!e) return false; if(MSEEN) return e.f>MSEEN; const v=vu("v",ck,suf); return !!(v&&v.isNew);}
function adInfo(ck,a){const r=venteCalc(ck,a), v=vu("v",ck,a[3]), t=venteIrisA(ck,a), d=t?demandOf(t):null; return {ck,a,r,x:r.x,v,t,d,nw:isNewAd(ck,a[3]),url:VTURL+a[3]};}
function bienOf(url){return BIENS.find(b=>b.url===url)||null;}
function mPhoto(ck,a,w,h){return a[4]?photoUrl(a[3],a[4],w,h):"";}
function imgTag(src,cls){return src?`<img class="${cls}" src="${mEsc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:"";}
function tripTxt(d){return d&&d.real?`${minTxt(d.min)} ${MKSH[d.mk]||""}`:"";}

/* ---------- carte ---------- */
let SNAP=1; // 0 : replié · 1 : moitié · 2 : plein
function setSnap(n){SNAP=Math.max(0,Math.min(2,n)); const sh=document.getElementById("mSheet"); sh.dataset.snap=SNAP; sh.style.transform=""; if(SNAP<2) document.getElementById("mSheetIn").scrollTop=0;}
function topAds(ck,sec,n){const A=ADS[ck]; if(!A||!A.ventes) return []; return A.ventes.filter(a=>!sec||a[1]===sec).map(a=>adInfo(ck,a)).sort((p,q)=>(q.x.irr??-99)-(p.x.irr??-99)).slice(0,n);}
function miniAd(o){const p=mPhoto(o.ck,o.a,320,200); return `<button type="button" class="mmini" data-mad="v|${o.ck}|${mEsc(o.a[3])}"><span class="mmimg">${imgTag(p,"")}${o.nw?`<i class="mbdg nw">Nouveau</i>`:o.v&&o.v.last?`<i class="mbdg dr">↓ ${keur(o.v.last.amt)}</i>`:""}</span><span class="mmt"><b style="color:${colIrr(o.x.irr)}">${irrTxt(o.x)}</b> · ${keur(o.a[2])}</span><span class="mms">${mEsc(o.a[1]||"secteur ?")} · ${String(o.a[0]).replace(".",",")} m²</span></button>`;}
function kp(label,val,cls,sub){return `<div class="mk"><small>${label}</small><b class="${cls||""}">${val}</b>${sub?`<em>${sub}</em>`:""}</div>`;}
function mSheetRender(){if(!MOBON) return; const box=document.getElementById("mSheetIn"); if(!box) return;
 const t=QSEL&&QSEL.ck===SEL?QSEL:null, c=C.find(v=>v.k===SEL); if(!c){box.innerHTML=""; return;}
 if(t){const x=QX[t.ck+t.i], sec=sectorOf(t), A=ADS[t.ck], nv=A&&sec?(A.ventes||[]).filter(a=>a[1]===sec).length:0, ta=sec?topAds(t.ck,sec,6):[];
  box.innerHTML=`<div class="msh"><div><h2>${mEsc(t.name)}</h2><p>Quartier · ${mEsc(c.name)}</p></div><button type="button" class="mx" data-mqclose aria-label="Revenir à la ville">×</button></div>
   ${x?`<div class="mkrow">${kp("15 ans "+mlab(),irrTxt(x),"",x.irr!=null?"":"")}${kp("Cash-flow",sgn(x.cf),mcfc(x.cf),"par mois")}${kp("Budget",keur(x.cost),"","tout compris")}</div>`:`<p class="msub">Pas d'estimation de prix pour ce secteur.</p>`}
   ${ta.length?`<div class="mhs"><h3>À vendre ici</h3>${nv>ta.length?`<button type="button" class="mlink" data-mfeed="${t.ck}|${mEsc(sec)}">Voir les ${nv} ›</button>`:""}</div><div class="mminis">${ta.map(miniAd).join("")}</div>`:sec?`<p class="msub">Aucun ${tyLow()} à vendre en ce moment dans ce secteur.</p>`:""}
   <div class="mfs">${quartierFiche(t,true)}</div>
   ${x?`<div class="mgroup"><button type="button" class="mrow" data-msim="${t.ck}|${t.code}">Simuler un bien ici${chev}</button></div>`:""}`;}
 else{const x=calc(c), A=ADS[c.k], nv=A&&A.ventes?A.ventes.length:0, ta=topAds(c.k,"",6), [bc,bt]=bank(x.ratio);
  box.innerHTML=`<div class="msh"><div><h2>${mEsc(c.name)}</h2><p>Moyenne de la ville · ${tyLow()} de ${H.surface} m²</p></div></div>
   <div class="mkrow">${kp("15 ans "+mlab(),irrTxt(x),"")}${kp("Cash-flow",sgn(x.cf),mcfc(x.cf),"par mois")}${kp("Banque",pct(x.ratio*100,0),bc==="p-ok"?"pos":bc==="p-bad"?"neg":"",bt)}</div>
   ${ta.length?`<div class="mhs"><h3>Meilleures annonces</h3><button type="button" class="mlink" data-mfeed="${c.k}|">Voir les ${nv} ›</button></div><div class="mminis">${ta.map(miniAd).join("")}</div>`:`<p class="msub">${IR[c.k]?"":"Pas d'annonces suivies pour cette ville. "}Zoomez sur Le Mans, Saint-Nazaire, Angers, Caen ou Orléans pour voir les quartiers.</p>`}
   <div class="mgroup">${IR[c.k]?`<button type="button" class="mrow" data-mzoom="${c.k}">Voir les quartiers${chev}</button>`:""}<button type="button" class="mrow" data-mcity>Fiche complète de la ville${chev}</button></div>`;}
 const ic=document.querySelector("#mSheet .mx"); if(ic) ic.blur();}

/* glisser la feuille */
(function(){let y0=null,t0=0,h0=0,sh=null,moved=false;
 const start=e=>{sh=document.getElementById("mSheet"); const inner=document.getElementById("mSheetIn"); const onGrab=e.target.closest("#mGrab,.msh");
  if(!onGrab&&!(SNAP<2&&inner.scrollTop<=0)) return; y0=e.touches?e.touches[0].clientY:e.clientY; t0=Date.now(); h0=sh.getBoundingClientRect().top; moved=false;};
 const move=e=>{if(y0==null) return; const y=e.touches?e.touches[0].clientY:e.clientY, dy=y-y0; const inner=document.getElementById("mSheetIn");
  if(!moved&&Math.abs(dy)<6) return; if(SNAP===2&&dy<0) {y0=null; return;} if(SNAP===2&&inner.scrollTop>0){y0=null; return;}
  moved=true; e.cancelable&&e.preventDefault(); sh.style.transition="none"; sh.style.transform=`translateY(${Math.max(-h0+60,dy)}px)`;};
 const end=e=>{if(y0==null) return; const y=(e.changedTouches?e.changedTouches[0].clientY:e.clientY), dy=y-y0, v=dy/Math.max(1,Date.now()-t0); sh.style.transition="";
  if(moved){if(dy<-50||v<-0.5) setSnap(SNAP+1); else if(dy>50||v>0.5) setSnap(SNAP-1); else setSnap(SNAP);} y0=null;};
 const sh0=()=>document.getElementById("mSheet");
 setTimeout(()=>{const el=sh0(); if(!el) return; el.addEventListener("touchstart",e=>{if(MOBON) start(e);},{passive:true}); el.addEventListener("touchmove",e=>{if(MOBON) move(e);},{passive:false}); el.addEventListener("touchend",e=>{if(MOBON) end(e);},{passive:true});},0);
 document.addEventListener("click",e=>{if(MOBON&&e.target.closest&&e.target.closest("#mGrab")) setSnap(SNAP===2?1:SNAP+1);});})();

/* recherche ville / quartier */
function mSearch(){const s=mPush("Rechercher",`<div class="msrch"><input type="search" id="mQ" placeholder="Le Mans, Jacobins, Gare Sud…" autocomplete="off" enterkeyhint="search"></div><div class="mgroup" id="mQRes"></div>`,{back:"Carte"});
 const inp=s.querySelector("#mQ"), res=s.querySelector("#mQRes");
 const run=()=>{const q=nrm(inp.value||""); const cities=C.filter(c=>!q||nrm(c.name).includes(q)).map(c=>({k:"c",c})); const qs=q.length<2?[]:Object.entries(IR).flatMap(([ck,z])=>z.list.filter(t=>nrm(t.name).includes(q)).map(t=>({k:"q",t})));
  const secs=q.length<2?[]:Object.entries(ADS).flatMap(([ck,A])=>Object.keys(A.map||{}).filter(d=>nrm(d).includes(q)).map(d=>({k:"s",ck,d})));
  const L=[...cities,...secs,...qs].slice(0,40);
  res.innerHTML=L.length?L.map(o=>o.k==="c"?`<button type="button" class="mrow" data-mgoc="${o.c.k}"><span><b>${mEsc(o.c.name)}</b><small>Ville${IR[o.c.k]?" · quartiers détaillés":""}</small></span>${chev}</button>`:o.k==="s"?`<button type="button" class="mrow" data-mfeed="${o.ck}|${mEsc(o.d)}"><span><b>${mEsc(o.d)}</b><small>Secteur des annonces · ${mEsc(cityName(o.ck))}</small></span>${chev}</button>`:`<button type="button" class="mrow" data-mgoq="${o.t.ck}|${o.t.code}"><span><b>${mEsc(o.t.name)}</b><small>Quartier · ${mEsc(cityName(o.t.ck))}</small></span>${chev}</button>`).join(""):`<p class="msub" style="padding:12px 16px">Aucun résultat.</p>`;};
 inp.addEventListener("input",run); run(); setTimeout(()=>inp.focus(),300);}

/* ---------- fil d'annonces ---------- */
function feedList(F){F=F||MF; const out=[]; Object.entries(ADS).forEach(([ck,A])=>{if(!A||!A.ventes) return; if(F.ck&&F.ck!==ck) return; A.ventes.forEach(a=>{if(F.sec&&a[1]!==F.sec) return; out.push(adInfo(ck,a));});});
 return out;}
function feedSorted(L,F){F=F||MF; const f=L.filter(o=>(!F.bank||bankOk(o.x.ratio))&&(!F.nw||o.nw)&&(!F.drop||(o.v&&o.v.last)));
 const k=F.sort, by={irr:(p,q)=>(q.x.irr??-99)-(p.x.irr??-99),cf:(p,q)=>q.x.cf-p.x.cf,prix:(p,q)=>p.a[2]-q.a[2],new:(p,q)=>((hEntry(q.ck,q.a[3])||{}).f||"").localeCompare((hEntry(p.ck,p.a[3])||{}).f||"")||(q.x.irr??-99)-(p.x.irr??-99)};
 return f.sort(by[k]||by.irr);}
function adCard(o,rank){const b=bienOf(o.url), on=b&&!isOut(b), p=mPhoto(o.ck,o.a,720,440), [bc]=bank(o.x.ratio);
 const badge=o.nw?`<i class="mbdg nw">Nouveau</i>`:o.v&&o.v.last?`<i class="mbdg dr">↓ ${keur(o.v.last.amt)} le ${dm(o.v.last.d)}</i>`:o.v&&o.v.days>=30?`<i class="mbdg old">${o.v.days} j en ligne</i>`:"";
 return `<article class="mcard" data-mad="v|${o.ck}|${mEsc(o.a[3])}"><div class="mcimg">${imgTag(p,"")}${badge}<span class="mrank">${rank}</span><button type="button" class="mstar${on?" on":""}" data-mstar="${o.ck}|${mEsc(o.a[3])}" aria-label="${on?"Retirer de la shortlist":"Ajouter à la shortlist"}">${on?"★":"☆"}</button></div>
  <div class="mcb"><div class="mcr"><span class="mcp">${eur(o.a[2])}</span><span class="mci" style="color:${colIrr(o.x.irr)}">${irrTxt(o.x)}<small>15 ans</small></span></div>
  <p class="mcs">${mEsc(o.a[1]||"secteur ?")} · ${mEsc(cityName(o.ck))} · ${String(o.a[0]).replace(".",",")} m² · ${eur(o.a[2]/o.a[0])}/m²</p>
  <div class="mkrow sm">${kp("Cash-flow",sgn(o.x.cf),mcfc(o.x.cf))}${kp("Banque",pct(o.x.ratio*100,0),bc==="p-ok"?"pos":bc==="p-bad"?"neg":"")}${o.d&&o.d.real?kp(o.d.mode==="tc"?"En bus/tram":"À pied",minTxt(o.d.min),"",MKSH[o.d.mk]):kp("Budget",keur(o.x.cost),"","tout compris")}</div></div></article>`;}
function mFeedRender(){if(!MOBON) return; const all=feedList(), L=feedSorted(all), nNew=all.filter(o=>o.nw).length, nDrop=all.filter(o=>o.v&&o.v.last).length;
 const cities=Object.keys(ADS).filter(k=>ADS[k]&&ADS[k].ventes);
 document.getElementById("mACity").innerHTML=[`<button type="button" class="mchip${!MF.ck?" on":""}" data-mfc="">Toutes <small>${cities.reduce((s,k)=>s+ADS[k].ventes.length,0)}</small></button>`,...cities.map(k=>`<button type="button" class="mchip${MF.ck===k?" on":""}" data-mfc="${k}">${mEsc(cityName(k))} <small>${ADS[k].ventes.length}</small></button>`)].join("");
 document.getElementById("mAFil").innerHTML=`<button type="button" class="mchip sel" data-mfsort>Tri : ${SORTS.find(s=>s[0]===MF.sort)[1]} ▾</button>${MF.sec?`<button type="button" class="mchip on" data-mfsec>${mEsc(MF.sec)} ×</button>`:""}<button type="button" class="mchip${MF.nw?" on":""}" data-mff="nw">Nouvelles <small>${nNew}</small></button><button type="button" class="mchip${MF.drop?" on":""}" data-mff="drop">↓ Baisses <small>${nDrop}</small></button><button type="button" class="mchip${MF.bank?" on":""}" data-mff="bank">Banque OK</button>`;
 document.getElementById("mACount").textContent=`${tyN(L.length)} à vendre${MSEEN&&nNew?` · ${nNew} nouveau${nNew>1?"x":""} depuis le ${dm(MSEEN)}`:""}`;
 document.getElementById("mFeed").innerHTML=L.length?L.slice(0,MF.n).map((o,i)=>adCard(o,i+1)).join("")+(L.length>MF.n?`<button type="button" class="mmorebtn" data-mfmore>Afficher ${Math.min(20,L.length-MF.n)} de plus</button>`:""):`<div class="mempty">Aucune annonce avec ces filtres.</div>`;}

/* ---------- fiche plein écran ---------- */
function mDetail(kind,ck,suf){if(kind==="l"){const ad={kind,ck,suf}; mPush("Location",`<div class="mfull">${adFiche(ad)}</div>`,{back:"Retour"}); return;}
 if(kind==="b"){mBienDetail(suf); return;}
 const a=findAd("v",ck,suf); if(!a) return; const o=adInfo(ck,a);
 const s=mPush("",mAdHtml(o),{hero:true,cta:mAdCta(o),key:{refresh:sc=>{const a2=findAd("v",ck,suf); if(!a2) return; const o2=adInfo(ck,a2); const st=sc.querySelector(".mpin").scrollTop; sc.querySelector(".mpin").innerHTML=mAdHtml(o2); sc.querySelector(".mcta").innerHTML=mAdCta(o2); mFillLazy(sc); sc.querySelector(".mpin").scrollTop=st;}}});
 s.dataset.ad=`v|${ck}|${suf}`; setTimeout(()=>mFillLazy(s),300);}
function heroHtml(src,starAttr,starOn){return `<div class="mhero">${imgTag(src,"")}<div class="mhnav"><button type="button" class="mround" data-mpop aria-label="Retour">${I('<path d="M15 5l-7 7 7 7"/>')}</button>${starAttr?`<button type="button" class="mround${starOn?" on":""}" ${starAttr} aria-label="Shortlist">${starOn?"★":"☆"}</button>`:""}</div></div>`;}
function mLevels(b){let lv=null; try{lv=priceLevels(b);}catch(_){} if(!lv) return `<p class="msub">Aucun prix ne permet d'atteindre nos objectifs avec ces réglages.</p>`;
 const r=(l,p,strong)=>`<div class="mli"><span>${l}</span>${strong?`<b>${keur(p)}</b>`:`<span>${keur(p)}</span>`}<small>${p<lv.pr?"−"+fr((1-p/lv.pr)*100,0)+" %":"prix affiché"}</small></div>`;
 return `<div class="mlist">${r("Ouverture",lv.ouv)}${r("Cible",lv.cible,true)}${r("Maximum",lv.max)}</div><p class="mfoot">Cible : le plus bas des prix « autofinancé » et « 7 % par an ». Maximum : le plus haut.</p>`;}
function calcList(x,vac){const [bc,bt]=bank(x.ratio);
 return `<div class="mlist"><div class="mli"><span>Budget tout compris</span><b>${keur(x.cost)}</b></div><div class="mli"><span>Loyer hors charges</span><b>${eur(x.rentHC)}</b></div><div class="mli"><span>Mensualité du prêt</span><b>${eur(x.mens)}</b></div><div class="mli"><span>Mois vides par an</span><b>${fr(vac,1)}</b></div><div class="mli"><span>Banque</span><span class="pill ${bc}">${bt} · ${pct(x.ratio*100,0)}</span></div></div>`;}
function quartierList(t){if(!t) return ""; const q=dvfOf(t), tr=trajOf(t), rk=risqPills(t);
 return `<h3 class="msec">Quartier · ${mEsc(t.name)}</h3><div class="mlist">${q&&q.n?`<div class="mli"><span>Studios vendus (2023-2025)</span><b>${q.n} · ${eur(q.med)}/m²</b></div>`:""}<div class="mli"><span>Prix retenu d'un studio</span><b>${eur(studioPm2(t.ck,t))}/m²</b></div>${tr?tr.map(o=>`<div class="mli"><span>${MARKTXT[o.k]}</span><span>${minTxt(o.foot)} à pied${o.tc!=null?" · <b>"+minTxt(o.tc)+" bus</b>":""} · ${minTxt(o.bike)} vélo</span></div>`).join(""):""}${stopOf(t)!=null?`<div class="mli"><span>Arrêt le plus proche</span><span>${Math.round(stopOf(t)/10)*10} m</span></div>`:""}</div>${poiOf(t)?`<h3 class="msec">Vie de quartier · ${fr(poiOf(t)[0],1)}/10</h3><div class="mlist">${poiItems(poiOf(t)).map(([l,v])=>`<div class="mli"><span>${l}</span><span>${v}</span></div>`).join("")}</div>`:""}${rk?`<div class="mrisq">${rk}</div>`:""}<div class="mgroup"><button type="button" class="mrow" data-mgoq="${t.ck}|${t.code}">Voir le quartier sur la carte${chev}</button></div>`;}
function mAdHtml(o){const b=bienOf(o.url), on=b&&!isOut(b), vb=venteBien(o.ck,o.a);
 return `${heroHtml(mPhoto(o.ck,o.a,900,640),`data-mstar="${o.ck}|${mEsc(o.a[3])}"`,on)}
 <div class="mdc"><div class="mdh"><div class="mdp">${eur(o.a[2])}</div><div class="mds">Studio ${String(o.a[0]).replace(".",",")} m² · ${mEsc(o.a[1]||"secteur ?")}, ${mEsc(cityName(o.ck))} · ${eur(o.a[2]/o.a[0])}/m²</div><div class="mdbs">${vuBadges("v",o.ck,o.a[3])}${o.nw?`<span class="hb new">nouveau depuis ta dernière visite</span>`:""}</div></div>
 <div class="mtiles">${kp("15 ans "+mlab(),irrTxt(o.x),"",(H.net?"brut ":"net ")+(H.net?(o.x.irrBrut==null?"n.d.":pct(o.x.irrBrut)):(o.x.irrNet==null?"n.d.":pct(o.x.irrNet))))}${kp("Cash-flow "+mlab(),sgn(o.x.cf),mcfc(o.x.cf),"par mois à deux")}</div>
 <div class="mlazy" data-lazy="v|${o.ck}|${mEsc(o.a[3])}"><div class="mskel"></div><div class="mskel"></div></div></div>`;}
function mAdHeavy(o){const vb=venteBien(o.ck,o.a);
 return `<h3 class="msec">Négocier</h3>${mLevels(vb)}<div class="mnego">${negoBlock(vb)}</div>
 <h3 class="msec">Le calcul</h3>${calcList(o.x,o.r.vac)}<div class="mtax">${taxLine(o.x)}</div>
 ${o.v&&o.v.p&&o.v.p.length>1?`<h3 class="msec">Prix dans le temps</h3><div class="mcurve">${priceCurve(o.v)}</div>`:""}
 <h3 class="msec">Et si…</h3><div class="mscn">${scnBox("ad",scnBien(vb))}</div>
 ${quartierList(o.t)}
 <div class="mgroup">${cmpBtn({kind:"v",id:o.ck+"|"+o.a[3]}).replace('class="cmpb','class="mrow cmprow cmpb')}<a class="mrow" href="${mEsc(o.url)}" target="_blank" rel="noopener">Voir l'annonce sur Bien'ici<span class="mchev">↗</span></a></div>
 <p class="mfoot">Calcul avec notaire, meubles, petits travaux, le loyer et la vacance du quartier, et vos réglages. Charges de copropriété et taxe foncière estimées : corrigez-les après la visite.</p>`;}
function mAdCta(o){const b=bienOf(o.url);
 if(b&&!isOut(b)) return `<button type="button" class="mbtn soft" data-visit="${b.id}">Visite</button><button type="button" class="mbtn" data-mad="b|${o.ck}|${b.id}">Voir dans la shortlist</button>`;
 return `<a class="mbtn soft" href="${mEsc(o.url)}" target="_blank" rel="noopener">Annonce ↗</a><button type="button" class="mbtn" data-mstar="${o.ck}|${mEsc(o.a[3])}">${b?"Remettre dans la shortlist":"Ajouter à la shortlist"}</button>`;}
function mBienHtml(b){const r=calcBien(b), x=r.x, s=bienSuf(b), v=s?vu("v",b.ville,s):null, sc=visitScore(b), V=b.visite||{}, av=V.avis||{};
 return `${heroHtml(bienPhoto(b,900,640),`data-mfav="${b.id}"`,b.fav)}
 <div class="mdc"><div class="mdh"><div class="mdp">${eur(+b.prix)}</div><div class="mds">${mEsc(b.titre||"Bien")} · ${mEsc(cityName(b.ville))}${b.quartier?" · "+mEsc(b.quartier):""}</div><div class="mdbs">${stPill(b)}${s?vuBadges("v",b.ville,s):""}${sc!=null?`<span class="pill p-n">note ${fr(sc,1)}/5</span>`:""}</div></div>
 <div class="mtiles">${kp("15 ans "+mlab(),irrTxt(x),"",(H.net?"brut ":"net ")+(H.net?(x.irrBrut==null?"n.d.":pct(x.irrBrut)):(x.irrNet==null?"n.d.":pct(x.irrNet))))}${kp("Cash-flow "+mlab(),sgn(x.cf),mcfc(x.cf),"par mois à deux")}</div>
 <div class="mlazy" data-lazy="b|${b.ville}|${b.id}"><div class="mskel"></div><div class="mskel"></div></div>
 <div class="mgroup">${cmpBtn({kind:"b",id:b.id}).replace('class="cmpb','class="mrow cmprow cmpb')}<button type="button" class="mrow" data-fiche="${b.id}">Fiche à emporter${chev}</button>${b.url?`<a class="mrow" href="${mEsc(b.url)}" target="_blank" rel="noopener">Voir l'annonce<span class="mchev">↗</span></a>`:""}${isOut(b)?`<button type="button" class="mrow" data-reshort="${b.id}">Remettre dans la shortlist${chev}</button>`:`<button type="button" class="mrow red" data-unshort="${b.id}">Écarter ce bien</button>`}</div></div>`;}
function mBienHeavy(b){const r=calcBien(b), x=r.x, s=bienSuf(b), v=s?vu("v",b.ville,s):null;
 return `<h3 class="msec">Négocier</h3>${mLevels(b)}<div class="mnego">${negoBlock(b)}</div>
 <h3 class="msec">Le calcul</h3>${calcList(x,r.vac)}<div class="mtax">${taxLine(x)}</div>
 ${v&&v.p&&v.p.length>1?`<h3 class="msec">Prix dans le temps</h3><div class="mcurve">${priceCurve(v)}</div>`:""}
 <h3 class="msec">Et si…</h3><div class="mscn">${scnBox("bien",scnBien(b))}</div>`;}
function mFillLazy(sc){const z=sc&&sc.querySelector(".mlazy[data-lazy]"); if(!z) return; const [kind,ck,...r]=z.dataset.lazy.split("|"), suf=r.join("|");
 let h=""; if(kind==="v"){const a=findAd("v",ck,suf); if(a) h=mAdHeavy(adInfo(ck,a));} else {const b=BIENS.find(x=>x.id===suf); if(b) h=mBienHeavy(b);}
 z.innerHTML=h; z.removeAttribute("data-lazy");}
function mBienDetail(id){const b=BIENS.find(x=>x.id===id); if(!b) return;
 mPush("",mBienHtml(b),{hero:true,cta:`<button type="button" class="mbtn soft" data-fiche="${b.id}">Fiche à emporter</button><button type="button" class="mbtn" data-visit="${b.id}">Visite</button>`,key:{refresh:sc=>{const b2=BIENS.find(x=>x.id===id); if(!b2) return; const st=sc.querySelector(".mpin").scrollTop; sc.querySelector(".mpin").innerHTML=mBienHtml(b2); mFillLazy(sc); sc.querySelector(".mpin").scrollTop=st;}}}); setTimeout(()=>mFillLazy(STACK[STACK.length-1].s),300);}

/* ajouter / retirer de la shortlist */
async function mStar(ck,suf){const a=(ADS[ck].ventes||[]).find(v=>v[3]===suf); if(!a||!DB) return; const url=VTURL+suf, b=bienOf(url);
 if(b&&!isOut(b)){const prev=b.statut||"à voir"; await updBien(b.id,{statut:"écarté"}); toast("Retiré de la shortlist.",{label:"Annuler",fn:()=>updBien(b.id,{statut:prev})}); return;}
 if(b){await updBien(b.id,{statut:"à voir",short:true}); toast("Remis dans la shortlist."); return;}
 const vb=venteBien(ck,a), bien={titre:vb.titre,url:vb.url,ville:ck,quartier:vb.quartier,type:vb.type,prix:a[2],surface:a[0],copro:vb.copro||0,tf:0,loyer:0,dpe:vb.dpe||"",notes:"",statut:"à voir",fav:false,par:myName(),ts:Date.now()};
 try{await DB.collection("biens").add(bien); toast("Ajouté à la shortlist ★");}catch(err){toast("Ajout impossible ("+(err&&err.code||"erreur")+").");}}

/* ---------- shortlist ---------- */
const MST=[["tous","Tous"],["à voir","À voir"],["visité","Visité"],["offre faite","Offre"]];
const tgReady=b=>!!TGC[JSON.stringify([b.ville,b.quartier,b.surface,b.prix,b.loyer,b.copro,b.tf,H])];
let MSLATE=[], MSLT=null;
function mShortRender(){if(!MOBON) return; MSLATE=[]; const all=BIENS.filter(b=>!isOut(b)), out=BIENS.filter(isOut);
 const L=all.filter(b=>MSF.st==="tous"||(b.statut||"à voir")===MSF.st).map(b=>({b,r:calcBien(b)})).sort((p,q)=>(q.b.fav-p.b.fav)||((q.r.x.irr??-99)-(p.r.x.irr??-99)));
 document.getElementById("mSCount").textContent=all.length?`${all.length} bien${all.length>1?"s":""} · glisser une ligne vers la gauche pour changer son statut`:"";
 document.getElementById("mSFil").innerHTML=MST.map(([k,l])=>{const n=k==="tous"?all.length:all.filter(b=>(b.statut||"à voir")===k).length; return `<button type="button" class="mchip${MSF.st===k?" on":""}" data-msf="${k}">${l} <small>${n}</small></button>`;}).join("");
 const row=({b,r})=>{const x=r.x, ph=bienPhoto(b,200,200), lv=tgReady(b)?(()=>{try{return priceLevels(b);}catch(_){return null;}})():(MSLATE.push(b),null), st=b.statut||"à voir", nx=STATUTS[(STATUTS.indexOf(st)+1)%3];
  return `<div class="msw" data-mswid="${b.id}"><div class="mswa"><button type="button" class="mswb next" data-stset="${b.id}|${nx}">${nx==="offre faite"?"Offre":nx[0].toUpperCase()+nx.slice(1)}</button><button type="button" class="mswb red" data-unshort="${b.id}">Écarter</button></div>
   <div class="mswc" data-mad="b|${b.ville}|${b.id}"><span class="mth">${imgTag(ph,"")}</span><span class="mst"><b>${b.fav?"★ ":""}${mEsc(b.titre||"Bien")}</b><small>${mEsc(cityName(b.ville))} · ${keur(+b.prix)}${lv?` · cible ${keur(lv.cible)}`:""}</small><small><b style="color:${colIrr(x.irr)}">${irrTxt(x)}</b> · <span class="${mcfc(x.cf)}">${sgn(x.cf)}/mois</span> · <i class="mdot ${STC[st]||"st0"}"></i>${st}</small></span>${chev}</div></div>`;};
 document.getElementById("mShort").innerHTML=(L.length?`<div class="mgroup mswl">${L.map(row).join("")}</div>`:`<div class="mempty">${all.length?"Aucun bien avec ce statut.":"Aucun bien pour l'instant.<br>Touchez ☆ sur une annonce pour l'ajouter."}</div>`)
  +`<div class="mgroup"><button type="button" class="mrow" data-mgo="addbien">Ajouter un bien à la main${chev}</button>${out.length?`<button type="button" class="mrow" data-mgo="out"><span>Biens écartés</span><span class="mval">${out.length}</span>${chev}</button>`:""}<button type="button" class="mrow" data-mgo="share">Liste commune et partage${chev}</button>${CMP.length?`<button type="button" class="mrow" data-mgo="cmp"><span>Comparer</span><span class="mval">${CMP.length}</span>${chev}</button>`:""}</div>`; if(MSLATE.length){clearTimeout(MSLT); const L=MSLATE.slice(); MSLT=setTimeout(()=>{let k=0; const step=()=>{if(k<L.length){try{targetsFor(L[k]);}catch(_){} k++; setTimeout(step,0);} else if(MS==="short") mShortRender();}; step();},60);}}
/* glisser pour agir */
(function(){let row=null,x0=0,y0=0,dx=0,dir=null,open=null;
 const W=172, close=r=>{if(r){r.querySelector(".mswc").style.transform=""; r.classList.remove("open");} if(open===r) open=null;};
 const SWH=()=>document.getElementById("mShort");
 setTimeout(()=>{const H0=SWH(); if(!H0) return; H0.addEventListener("touchstart",e=>{if(!MOBON) return; const r=e.target.closest&&e.target.closest(".msw"); if(open&&open!==r) close(open); if(!r||e.target.closest(".mswa")) {row=null; return;} row=r; x0=e.touches[0].clientX; y0=e.touches[0].clientY; dx=0; dir=null;},{passive:true});
 H0.addEventListener("touchmove",e=>{if(!row) return; const mx=e.touches[0].clientX-x0, my=e.touches[0].clientY-y0; if(!dir){if(Math.abs(mx)<8&&Math.abs(my)<8) return; dir=Math.abs(mx)>Math.abs(my)?"h":"v";}
  if(dir!=="h") return; const base=row.classList.contains("open")?-W:0; dx=Math.min(0,Math.max(-W-30,base+mx)); const c=row.querySelector(".mswc"); c.style.transition="none"; c.style.transform=`translateX(${dx}px)`;},{passive:true});
 H0.addEventListener("touchend",()=>{if(!row||dir!=="h"){row=null; return;} const c=row.querySelector(".mswc"); c.style.transition=""; if(dx<-W/2){c.style.transform=`translateX(${-W}px)`; row.classList.add("open"); open=row;} else close(row); row.dataset.swiped=Date.now(); row=null;},{passive:true});},0);
 document.addEventListener("click",e=>{const r=e.target.closest&&e.target.closest(".msw"); if(r&&r.dataset.swiped&&Date.now()-r.dataset.swiped<350){e.stopImmediatePropagation(); e.preventDefault();} else if(r&&r.classList.contains("open")&&!e.target.closest(".mswa")){e.stopImmediatePropagation(); e.preventDefault(); close(r);}},true);})();

/* ---------- budget ---------- */
const STEP={apport:["f-apport",500,0,100000,0,v=>eur(v)],taux:["s-taux",0.05,1,8,2,v=>pct(v,2)],surcote:["s-surcote",5,-10,40,0,v=>(v>0?"+":"")+v+" %"],loyerAdj:["s-loyer",5,-20,20,0,v=>(v>0?"+":"")+v+" %"],surface:["f-surface",1,10,40,0,v=>v+" m²"]};
function stepper(k,label,sub){const [,,,,,f]=STEP[k]; return `<div class="mli"><span>${label}${sub?`<small>${sub}</small>`:""}</span><span class="mstep"><button type="button" data-mstep="${k}|-1" aria-label="Moins">−</button><b>${f(H[k])}</b><button type="button" data-mstep="${k}|1" aria-label="Plus">+</button></span></div>`;}
function tgl(id,label,on,sub){return `<label class="mli mtg"><span>${label}${sub?`<small>${sub}</small>`:""}</span><input type="checkbox" role="switch" data-mtgl="${id}"${on?" checked":""}><i></i></label>`;}
function selRow(id,label){const el=document.getElementById(id); if(!el) return ""; return `<label class="mli msel"><span>${label}</span><span class="mselv"><select data-msel="${id}">${[...el.options].map(o=>`<option value="${mEsc(o.value)}"${o.value===el.value?" selected":""}>${mEsc(o.textContent)}</option>`).join("")}</select>${chev}</span></label>`;}
function mBudgetRender(){if(!MOBON) return; const c=C.find(v=>v.k===SEL)||C[0], x=calc(c), [bc,bt]=bank(x.ratio);
 document.getElementById("mBudget").innerHTML=`<div class="msum"><small>${TY().lab} moyen à ${mEsc(c.name)} · ${keur(x.cost)} tout compris</small><b>${eur(x.mens)}<span>/mois</span></b><div><span>${H.duree} ans · ${pct(H.taux,2)}</span><span>Banque ${pct(x.ratio*100,0)} · ${bt}</span><span>Cash-flow ${sgn(x.cf)}</span></div></div>
 <h3 class="msec">Chiffres affichés</h3><div class="mlist"><div class="mli"><span>Net ou brut</span><span class="mseg"><button type="button" data-net="1" aria-pressed="${!!H.net}">Net</button><button type="button" data-net="0" aria-pressed="${!H.net}">Brut</button></span></div></div>
 <h3 class="msec">Crédit</h3><div class="mlist">${stepper("apport","Apport","à deux")}${stepper("taux","Taux","hors assurance")}<div class="mli"><span>Durée</span><span class="mseg">${[15,20,25].map(d=>`<button type="button" data-mdur="${d}" aria-pressed="${H.duree===d}">${d} ans</button>`).join("")}</span></div></div>
 <h3 class="msec">Le bien</h3><div class="mlist"><div class="mli"><span>Type</span>${typeSeg().replace("seg2 typeseg","mseg")}</div>${stepper("surface","Surface")}${stepper("surcote","Prix payé vs studios vendus",hasDVF(c.k)?"sans effet ici : prix réels DVF":"")}${stepper("loyerAdj","Loyer vs loyer médian")}</div>
 <h3 class="msec">Hypothèses</h3><div class="mlist">${tgl("f-pess","Scénario pessimiste",H.pess,"loyer −5 %, ½ mois vide de plus")}${tgl("f-vacq","Vacance selon l'emplacement",H.vacQ,"selon le temps à pied")}${tgl("f-dvf","Prix réels des studios (DVF)",H.dvf)}${tgl("f-bank","Seulement si la banque suit",BANKOK,"sur la carte")}</div>
 <h3 class="msec">Impôts</h3><div class="mlist">${selRow("fin-regime","Régime")}${selRow("fin-tmiA",(H.nomA||"Personne A")+" · tranche")}${selRow("fin-tmiB",(H.nomB||"Personne B")+" · tranche")}</div>
 <div class="mgroup"><button type="button" class="mrow" data-mgo="hyp">Toutes les hypothèses${chev}</button><button type="button" class="mrow" data-mgo="fin">Prêt, assurance et impôts en détail${chev}</button></div>`;}
function mSet(id,val){const el=document.getElementById(id); if(!el) return; if(el.type==="checkbox"){el.checked=!!val; el.dispatchEvent(new Event("change",{bubbles:true}));} else {el.value=val; el.dispatchEvent(new Event(el.tagName==="SELECT"?"change":"input",{bubbles:true})); if(el.tagName!=="SELECT") el.dispatchEvent(new Event("change",{bubbles:true}));}}

/* ---------- plus ---------- */
function mPlusRender(){if(!MOBON) return; const dark=document.documentElement.getAttribute("data-theme")==="dark";
 document.getElementById("mPlus").innerHTML=`<div class="mgroup"><button type="button" class="mrow" data-mgo="rank"><span>Classement des villes</span>${chev}</button><button type="button" class="mrow" data-mgo="sc"><span>Prix contre loyer</span>${chev}</button><button type="button" class="mrow" data-mgo="cmp"><span>Comparer</span><span class="mval">${CMP.length||""}</span>${chev}</button><button type="button" class="mrow" data-mgo="biens"><span>Tous nos biens</span><span class="mval">${BIENS.length||""}</span>${chev}</button></div>
 <div class="mgroup"><button type="button" class="mrow" data-mgo="meth">Comment c'est calculé${chev}</button><button type="button" class="mrow" data-mgo="src"><span>Sources et fraîcheur</span><span class="mval">${mEsc(ADS.date||"")}</span>${chev}</button></div>
 <div class="mgroup"><div class="mli"><span>Thème</span><span class="mseg"><button type="button" data-mtheme="light" aria-pressed="${!dark}">Clair</button><button type="button" data-mtheme="dark" aria-pressed="${dark}">Sombre</button></span></div></div>
 <p class="mfoot">Où acheter notre studio ? · estimations, pas un conseil. Sur iPhone : Partager → « Sur l'écran d'accueil » pour l'installer comme une appli.</p>`;}
function mGo(k){const tb=id=>document.getElementById(id);
 if(k==="rank"){showTab("tab-rank"); mPushEl("Classement des villes",tb("p-rank"),{back:"Plus"}); mDraw("renderTable");}
 else if(k==="sc"){showTab("tab-sc"); mPushEl("Prix contre loyer",tb("p-sc"),{back:"Plus"}); mDraw("renderScatter");}
 else if(k==="cmp"){showTab("tab-cmp"); mPushEl("Comparer",tb("p-cmp"),{back:"Retour"}); mDraw("renderCompare");}
 else if(k==="biens"){showTab("tab-biens"); mPushEl("Tous nos biens",tb("p-biens"),{back:"Retour"}); mDraw("renderBiens");}
 else if(k==="addbien"){showTab("tab-biens"); mPushEl("Ajouter un bien",tb("biensForm"),{back:"Shortlist"});}
 else if(k==="share"){mPushEl("Liste commune",tb("shareBox"),{back:"Shortlist"}); const s=STACK[STACK.length-1].s.querySelector(".mpin"); const xf=document.querySelector("details.xfer"); if(xf){mTake(xf,s); STACK[STACK.length-1].els.push(xf);}}
 else if(k==="out"){SHOWOUT=true; showTab("tab-biens"); mPushEl("Biens écartés",tb("biensList"),{back:"Shortlist",onpop:()=>{SHOWOUT=false;}}); mDraw("renderBiens");}
 else if(k==="meth"){mPushEl("Comment c'est calculé",document.querySelector("dl.fmeth"),{back:"Plus"});}
 else if(k==="src"){renderFresh(); mPushEl("Sources",tb("freshBox"),{back:"Plus"});}
 else if(k==="hyp"){mPushEl("Hypothèses",tb("hypFields"),{back:"Budget",onpop:mBudgetRender});}
 else if(k==="fin"){const s=mPushEl("Prêt et impôts",tb("finFields"),{back:"Budget",onpop:mBudgetRender}); const d=tb("finDetail"); mTake(d,s.querySelector(".mpin")); STACK[STACK.length-1].els.push(d);}}

/* ---------- navigation entre écrans ---------- */
function mBadges(){const n=BIENS.filter(b=>!isOut(b)).length, el=document.querySelector('#mTab [data-mtab="short"] .mbadge'); if(el){el.hidden=!n; el.textContent=n;}}
function mShow(k){if(!MOBON) return; if(MS&&k!==MS&&!STACK.length) navPush({t:"tab",from:MS}); mShowNow(k);}
function mShowNow(k,opt){if(!MOBON) return; if(MS!=="carte") MSCROLL[MS]=scrollY; MS=k; try{localStorage.setItem("mscreen",k);}catch(_){}
 document.body.dataset.ms=k; document.body.classList.toggle("mcarte",k==="carte");
 document.querySelectorAll("#mTab [data-mtab]").forEach(b=>{const on=b.dataset.mtab===k; b.setAttribute("aria-current",on?"page":"false"); b.querySelector(".mti").innerHTML=icoTab(b.dataset.mtab,on);});
 if(k==="annonces") mFeedRender(); if(k==="short") mShortRender(); if(k==="budget") mBudgetRender(); if(k==="plus") mPlusRender(); if(k==="carte") mSheetRender();
 requestAnimationFrame(()=>{scrollTo(0,k==="carte"?0:(MSCROLL[k]||0)); mBarUpdate(); if(k==="carte"){draw.vw=0; fitVH();}});}
function mBarUpdate(){const bar=document.getElementById("mBar"); if(!bar) return; const on=MS!=="carte"&&scrollY>44; bar.classList.toggle("on",on); document.getElementById("mBarT").textContent=(MTABS.find(t=>t[0]===MS)||[,""])[1];}
addEventListener("scroll",()=>{if(MOBON) mBarUpdate();},{passive:true});

function mApply(on){if(on===MOBON) return; MOBON=on; document.body.classList.toggle("mob",on);
 if(on){document.getElementById("mapSec").classList.add("mapfull"); document.body.appendChild(mApp); mTake(document.querySelector("#mapSec .mapbox"),document.getElementById("mMap")); mTake(document.getElementById("cmode"),document.getElementById("mModeHost"));
  let k="carte"; try{k=localStorage.getItem("mscreen")||"carte";}catch(_){} if(!MTABS.some(t=>t[0]===k)) k="carte"; MS=""; navInit(); mShowNow(k); mBadges(); setTimeout(()=>{if(V.k<KQ) mHome();},80);}
 else{document.getElementById("mapSec").classList.remove("mapfull"); mPopAll(); [...MPL.keys()].forEach(mGive); mApp.remove(); delete document.body.dataset.ms; document.body.classList.remove("mcarte","mstack"); requestAnimationFrame(()=>{draw.vw=0; fitVH();});}}

/* ---------- clics ---------- */
document.addEventListener("click",e=>{if(!MOBON) return; const t=e.target.closest&&e.target.closest("[data-mtab],[data-mpop],[data-mad],[data-mstar],[data-mfav],[data-mfullad],[data-mfeed],[data-mfc],[data-mff],[data-mfsort],[data-mfsec],[data-mfmore],[data-msf],[data-mgo],[data-mgoc],[data-mgoq],[data-mzoom],[data-mcity],[data-mqclose],[data-msearch],[data-mstep],[data-mdur],[data-mtheme],[data-msim],#mapChip");
 if(!t) return;
 const d=t.dataset;
 if(t.id==="mapChip"){e.stopImmediatePropagation(); setSnap(1); return;}
 if(d.mtab){const had=STACK.length; mPopAll(); if(d.mtab===MS){if(!had) scrollTo({top:0,behavior:"smooth"});} else mShow(d.mtab); return;}
 if(d.mpop!==undefined){mPop(); return;}
 if(d.mstar){e.stopPropagation(); const [ck,...r]=d.mstar.split("|"); mStar(ck,r.join("|")); return;}
 if(d.mfav){const b=BIENS.find(x=>x.id===d.mfav); if(b) updBien(b.id,{fav:!b.fav}); return;}
 if(d.mad){if(e.target.closest("a,[data-stmenu],.stmenu")) return; const [kind,ck,...r]=d.mad.split("|"); mDetail(kind,ck,r.join("|")); return;}
 if(d.mfullad){const [kind,ck,...r]=d.mfullad.split("|"), suf=r.join("|"); AD={kind,ck,suf}; mPush("Détail complet",`<div class="mfull">${adFiche({kind,ck,suf})}</div>`,{back:"Fiche"}); return;}
 if(d.mfeed!==undefined){const [ck,...r]=d.mfeed.split("|"); MF.ck=ck; MF.sec=r.join("|"); MF.n=20; MSCROLL.annonces=0; mPopAll(); mShow("annonces"); return;}
 if(d.mfc!==undefined){MF.ck=d.mfc; MF.sec=""; MF.n=20; mFeedRender(); return;}
 if(d.mff){MF[d.mff]=!MF[d.mff]; MF.n=20; mFeedRender(); return;}
 if(d.mfsort!==undefined){const i=SORTS.findIndex(s=>s[0]===MF.sort); MF.sort=SORTS[(i+1)%SORTS.length][0]; MF.n=20; mFeedRender(); return;}
 if(d.mfsec!==undefined){MF.sec=""; mFeedRender(); return;}
 if(d.mfmore!==undefined){MF.n+=20; mFeedRender(); return;}
 if(d.msf){MSF.st=d.msf; mShortRender(); return;}
 if(d.mgo){mGo(d.mgo); return;}
 if(d.mgoc){mPopAll(); SEL=d.mgoc; QSEL=null; AD=null; render(); if(IR[SEL]) flyTo(IR[SEL].bb); else document.getElementById("zHome").click(); mShow("carte"); setSnap(1); return;}
 if(d.mgoq){const [ck,code]=d.mgoq.split("|"), q=IR[ck]&&IR[ck].list.find(v=>v.code===code); if(!q) return; mPopAll(); SEL=ck; QSEL=q; AD=null; render(); flyTo(q.bb,3.2); mShow("carte"); setSnap(1); return;}
 if(d.mzoom){flyTo(IR[d.mzoom].bb); setSnap(0); return;}
 if(d.mqclose!==undefined){QSEL=null; AD=null; draw(); renderQBox(); mSheetRender(); return;}
 if(d.mcity!==undefined){mPushEl(cityName(SEL),document.getElementById("detail"),{back:"Carte"}); mDraw("renderDetail"); return;}
 if(d.msearch!==undefined){mSearch(); return;}
 if(d.msim){const [ck,code]=d.msim.split("|"); simHere(ck,code); mGo("addbien"); return;}
 if(d.mstep){const [k,s]=d.mstep.split("|"), [id,st,lo,hi,dec]=STEP[k]; const v=Math.round(Math.min(hi,Math.max(lo,H[k]+st*(+s)))*Math.pow(10,dec))/Math.pow(10,dec); H[k]=v; const el=document.getElementById(id); if(el) el.value=v; render(); return;}
 if(d.mdur){mSet("f-duree",+d.mdur); H.duree=+d.mdur; render(); return;}
 if(d.mtheme){const cur=document.documentElement.getAttribute("data-theme"); if(cur!==d.mtheme) document.getElementById("themeBtn").click(); mPlusRender(); return;}},true);
document.addEventListener("change",e=>{if(!MOBON) return; const t=e.target;
 if(t.dataset&&t.dataset.mtgl){mSet(t.dataset.mtgl,t.checked); return;}
 if(t.dataset&&t.dataset.msel){mSet(t.dataset.msel,t.value); setTimeout(mBudgetRender,50);}});
addEventListener("keydown",e=>{if(MOBON&&e.key==="Escape"&&STACK.length) mPop();});
/* retour : glisser vers la droite (écran empilé : n'importe où ; onglet : revient à l'onglet précédent ; carte : depuis le bord) */
(function(){let x0=null,y0=0,t0=0,s=null,dir=null,dx=0,under=null,mode="";
 const blocked=el=>el.closest&&el.closest(".mminis,.mchips,.tablewrap,.scrollbox,.scnt,input,textarea,select,.mseg,.mstep,.ngr,svg.fqmap,.cards.row,.msw,#mSheet,.leaflet-container,.mmap");
 const startG=e=>{if(!MOBON||e.touches.length>1) return; const x=e.touches[0].clientX, edge=x<26;
  if(STACK.length){s=STACK[STACK.length-1].s; if(!s.contains(e.target)){s=null; return;} if(blocked(e.target)&&!edge) return; mode="push"; under=STACK.length>1?STACK[STACK.length-2].s:document.querySelector(".mscr[data-ms='"+MS+"']");}
  else {if(!NAV.length&&!edge) return; s=document.querySelector(".mscr[data-ms='"+MS+"']"); if(!s) return; if(MS==="carte"&&!edge) return; if(blocked(e.target)&&!edge) return; mode="tab"; under=null;}
  x0=x; y0=e.touches[0].clientY; t0=Date.now(); dir=null; dx=0;};
 const moveG=e=>{if(x0==null) return; const mx=e.touches[0].clientX-x0, my=e.touches[0].clientY-y0;
  if(!dir){if(Math.abs(mx)<10&&Math.abs(my)<10) return; dir=(mx>0&&Math.abs(mx)>Math.abs(my)*1.3)?"h":"v"; if(dir==="h"){s.style.transition="none"; if(under) under.style.transition="none";}}
  if(dir!=="h"){x0=null; return;} dx=Math.max(0,mx); s.style.transform=`translateX(${mode==="tab"?dx*0.5:dx}px)`; if(mode==="tab") s.style.opacity=String(1-Math.min(.5,dx/innerWidth)); if(under) under.style.transform=`translateX(${(dx-innerWidth)*0.25}px)`;};
 const endG=()=>{if(x0==null||dir!=="h"){x0=null; return;} const v=dx/Math.max(1,Date.now()-t0), go=dx>innerWidth*0.28||v>0.45; x0=null;
  s.style.transition="transform .22s ease,opacity .22s ease"; if(under){under.style.transition="transform .28s cubic-bezier(.2,.8,.2,1)"; under.style.transform="";}
  const el=s;
  if(mode==="push"){el.style.transform=go?"translateX(100%)":""; if(go) setTimeout(()=>mPop(),170);}
  else {el.style.transform=""; el.style.opacity=""; if(go) mBack();}
  setTimeout(()=>{el.style.transition=""; if(under) under.style.transition="";},320);};
 document.addEventListener("touchstart",startG,{passive:true}); document.addEventListener("touchmove",moveG,{passive:true}); document.addEventListener("touchend",endG,{passive:true});})();

/* ---------- branchements sur le reste de l'outil ---------- */
(function(){const rs=history.replaceState.bind(history); history.replaceState=function(st,t,u){return rs(st==null?history.state:st,t,u);};})();
const _openAd=openAd; openAd=function(kind,ck,suf){_openAd(kind,ck,suf); if(MOBON&&!(STACK.length&&STACK[STACK.length-1].s.dataset.ad===`${kind}|${ck}|${suf}`)) mDetail(kind,ck,suf);};
let MHK=""; const inStack=id=>{const el=document.getElementById(id); return !!(el&&el.closest("#mStack"));};
[["renderScatter","p-sc"],["renderTable","p-rank"],["renderCompare","p-cmp"],["renderBiens","biensList"],["renderDetail","detail"]].forEach(([fn,id])=>{const orig=window[fn]; if(typeof orig!=="function") return; window[fn]=function(){if(MOBON&&!inStack(id)){window[fn].dirty=arguments; return;} return window[fn].orig.apply(this,arguments);}; window[fn].orig=orig;});
function mDraw(fn){const f=window[fn]; f.orig&&f.orig.apply(null,fn==="renderBiens"||fn==="renderCompare"?[]:[all()]);}
const _render2=render; render=function(){_render2.apply(this,arguments); if(!MOBON) return; const hk=JSON.stringify(H); if(hk!==MHK){VC.clear(); MHK=hk;} mBadges(); if(MS==="carte") mSheetRender(); if(MS==="annonces") mFeedRender(); if(MS==="budget") mBudgetRender(); if(MS==="short") mShortRender(); mRefreshTop();};

const _renderSide=renderSide; renderSide=function(){_renderSide.apply(this,arguments); if(MOBON&&MS==="carte") mSheetRender();};
const _renderShort=renderShort; renderShort=function(){if(!MOBON){_renderShort.apply(this,arguments); return;} mBadges(); if(MS==="short") mShortRender(); if(MS==="annonces") mFeedRender(); if(MS==="carte") mSheetRender(); mRefreshTop();};
function mHome(){const bs=Object.values(IR).map(z=>z.bb); if(!bs.length) return; const u=[Math.min(...bs.map(b=>b[0])),Math.min(...bs.map(b=>b[1])),Math.max(...bs.map(b=>b[2])),Math.max(...bs.map(b=>b[3]))]; flyTo(u);}
const _flyTo=flyTo; flyTo=function(bb,pad){if(MOBON&&MS==="carte"&&SNAP>0&&bb){const h=bb[3]-bb[1]; bb=[bb[0],bb[1],bb[2],bb[3]+h*(SNAP===1?1:0.25)];} return _flyTo(bb,pad);};
MOBQ.addEventListener?MOBQ.addEventListener("change",e=>mApply(e.matches)):MOBQ.addListener(e=>mApply(e.matches));
mApply(MOBQ.matches);
