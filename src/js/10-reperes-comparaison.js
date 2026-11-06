/* ---------- repères, demande locative, annonces ---------- */
const MARK={
 lemans:{gare:[47.9953,0.1923],univ:[48.0153,0.1655],centre:[48.0058,0.1983]},
 stnazaire:{gare:[47.2851,-2.2112],univ:[47.2547,-2.2677],centre:[47.2735,-2.2138]},
 angers:{gare:[47.4643,-0.5566],univ:[47.4805,-0.5933],univ2:[47.4790,-0.5470],centre:[47.4710,-0.5500]},
 caen:{gare:[49.1765,-0.3487],univ:[49.1880,-0.3640],centre:[49.1829,-0.3622]},
 orleans:{gare:[47.9078,1.9045],univ:[47.8450,1.9370],centre:[47.9025,1.9050]}};
/* repères : un type par clé (gare, univ, centre), autant de repères du même type que nécessaire (univ, univ2, univ3…) */
const mkT=k=>String(k).replace(/\d+$/,"");
const mkMap=o=>new Proxy(o,{get:(t,k)=>typeof k==="string"?t[mkT(k)]:t[k]});
const MARKTXT=mkMap({gare:"Gare",univ:"Université",centre:"Centre"});
const MKDE=mkMap({gare:"de la gare",univ:"de la fac",centre:"du centre"});
const MKSH=mkMap({gare:"gare",univ:"fac",centre:"centre"});
const unproj=(x,y)=>[MP.lat1-y/MAP.S, x/(MP.k*MAP.S)+MP.lon0];
function demandOf(t){const m=MARK[t.ck]; if(!m) return null;
 const T=typeof TTQ!=="undefined"&&TTQ[t.ck], f=T&&T.foot[t.code];
 if(f){const tr=typeof trajOf==="function"?trajOf(t):null, e=tr?tr.map(o=>o.best):f, i=e.indexOf(Math.min(...e)), mn=e[i], sc=Math.min(1,Math.max(0,1-(mn-10)/40)); return {d:T.dist[t.code][i],min:mn,foot:f[i],bike:T.bike[t.code][i],mk:T.marks[i],mode:tr?tr[i].mode:"foot",real:true,sc,vac:1+1.5*(1-sc)};}
 const [la,lo]=unproj(t.cx,t.cy);
 const d=Math.min(...Object.values(m).map(p=>hav(la,lo,p[0],p[1]))); const sc=Math.min(1,Math.max(0,1-(d-0.6)/2.4));
 return {d,sc,vac:1+1.5*(1-sc)};}
function adsPins(ck){const A=ADS[ck], z=IR[ck]; if(!A||!z) return [];
 return Object.entries(A.map).map(([d,codes])=>{const ts=z.list.filter(t=>codes.includes(t.code)); if(!ts.length) return null;
  const st=adsStats(A.ads.filter(a=>a[1]===d)); if(!st) return null;
  return {ck,d,n:st.n,med:st.med,x:ts.reduce((s,t)=>s+t.cx,0)/ts.length,y:ts.reduce((s,t)=>s+t.cy,0)/ts.length};}).filter(Boolean);}

let OPENADS=null;
function openAds(key){const [ck,d]=key.split("|"), z=IR[ck], codes=ADS[ck].map[d]; if(!z||!codes) return;
 const ts=z.list.filter(t=>codes.includes(t.code)).sort((a,b)=>(b.dpe.reduce((x,y)=>x+y,0))-(a.dpe.reduce((x,y)=>x+y,0)));
 const t=ts.find(t=>QX[t.ck+t.i])||ts[0]; if(!t) return; OPENADS=d; QSEL=t; QC=ck; if(SEL!==ck){SEL=ck; render();} else {draw(); renderQBox();} OPENADS=null;
 const det=document.querySelector("#qCard details.ads[open]"); if(det&&!document.getElementById("mapSec").classList.contains("mapfull")) det.scrollIntoView({behavior:"smooth",block:"nearest"});}
document.getElementById("map").addEventListener("keydown",e=>{const p=e.target.closest&&e.target.closest("[data-ads]"); if(p&&(e.key==="Enter"||e.key===" ")){e.preventDefault(); openAds(p.dataset.ads);}});

/* ---------- couleur et filtre banque ---------- */
let CMODE="irr", BANKOK=false;
const CLS_CF=[{t:"moins de −50 €",c:"var(--bad)",o:.55},{t:"−50 à −10 €",c:"var(--warn)",o:.5},{t:"−10 à +10 €",c:"var(--ok)",o:.2},{t:"+10 à +40 €",c:"var(--ok)",o:.42},{t:"+40 € et plus",c:"var(--ok)",o:.68}];
const cfCls=cf=>cf<-50?0:cf<-10?1:cf<10?2:cf<40?3:4;
const CLS=()=>CMODE==="cf"?CLS_CF:QCLS;
const clsFor=x=>CMODE==="cf"?CLS_CF[cfCls(x.cf)]:QCLS[qCls(x.irr)];
const colCity=x=>CMODE==="cf"?(x.cf<-50?"var(--bad)":x.cf<0?"var(--warn)":"var(--ok)"):colIrr(x.irr);
const bankFail=x=>BANKOK&&!bankOk(x.ratio);

/* ---------- comparaison ---------- */
let CMP=[];
const CMPCOL=["var(--accent)","var(--c2)","var(--c3)"];
function cmpKey(it){return it.kind+":"+(it.kind==="c"?it.k:it.kind==="q"?it.ck+"-"+it.code:it.id);}
function cmpTb(it){if(it.kind==="b") return BIENS.find(v=>v.id===it.id)||null; if(it.kind==="v"){const [ck,...r]=it.id.split("|"), a=findAd("v",ck,r.join("|")); return a?venteBien(ck,a):null;} return null;}
function cmpResolve(it){
 if(it.kind==="c"){const c=C.find(v=>v.k===it.k); return {name:c.name,sub:"moyenne de la ville",x:calc(c),fg:fgOf(DPECITY[c.k]),vac:H.vacance};}
 if(it.kind==="q"){const z=IR[it.ck]; if(!z) return null; const t=z.list.find(v=>v.code===it.code); const x=t&&QX[t.ck+t.i]; if(!x) return null;
  return {name:t.name,sub:C.find(v=>v.k===it.ck).name,x,fg:fgPct(t.dpe),n:t.dpe.reduce((a,b)=>a+b,0),vac:H.vacQ?(demandOf(t)||{}).vac:H.vacance,go:()=>{SEL=it.ck;QSEL=t;render();flyTo(t.bb,3.2);}};}
 if(it.kind==="b"||it.kind==="v"){const b=cmpTb(it); if(!b) return null; const r=calcBien(b); return {name:(it.kind==="b"?"★ ":"")+(b.titre||"Bien sans nom"),sub:C.find(v=>v.k===b.ville).name+(b.quartier?" · "+b.quartier:"")+(it.kind==="v"?" · annonce":""),x:r.x,vac:r.vac,dpeL:b.dpe,tb:b,go:it.kind==="v"?()=>{const [ck,...q]=it.id.split("|"); openAd("v",ck,q.join("|"));}:null};}
 return null;}
function toggleCmp(it){const k=cmpKey(it), i=CMP.findIndex(v=>cmpKey(v)===k); if(i>=0) CMP.splice(i,1); else {CMP.push(it); if(CMP.length>3) CMP.shift();}
 renderCompare(); updateCmpButtons(); saveLocal();}
const inCmp=it=>CMP.some(v=>cmpKey(v)===cmpKey(it));
function cmpBtn(it){return `<button type="button" class="cmpb${inCmp(it)?" on":""}" data-cmp='${JSON.stringify(it)}'>${inCmp(it)?"Comparé ✓":"+ Comparer"}</button>`;}
function updateCmpButtons(){document.querySelectorAll(".cmpb[data-cmp]").forEach(b=>{const it=JSON.parse(b.dataset.cmp); b.classList.toggle("on",inCmp(it)); b.textContent=inCmp(it)?"Comparé ✓":"+ Comparer";});
 document.getElementById("tab-cmp").textContent=`Comparer (${CMP.length})`; const cg=document.getElementById("cmpGo"); if(cg){cg.hidden=CMP.length<2; cg.textContent=`Comparer les ${CMP.length} sélectionnés →`;}}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".cmpb[data-cmp]"); if(b){e.preventDefault(); toggleCmp(JSON.parse(b.dataset.cmp));}});
function renderCompare(){const box=document.getElementById("cmpBox"); const items=CMP.map(cmpResolve).map((r,i)=>r&&Object.assign(r,{it:CMP[i],col:CMPCOL[i]})).filter(Boolean);
 if(!items.length){box.innerHTML=`<p class="sub">Ajoutez jusqu'à trois villes, quartiers, biens ou annonces avec le bouton « + Comparer » de leur fiche.</p>`; return;}
 const rows=[["Budget tout compris",r=>keur(r.x.cost)],["Loyer hors charges",r=>eur(r.x.rentHC)],["Cash-flow à deux",r=>`<span class="${r.x.cf>=0?"pos":"neg"}">${sgn(r.x.cf)}/mois</span>`],
  ["Rendement 15 ans",r=>`<b style="color:${colIrr(r.x.irr)}">${r.x.irr==null?"n.d.":pct(r.x.irr)}</b>`],["Banque",r=>{const [bc,bt]=bank(r.x.ratio);return `<span class="pill ${bc}">${bt} · ${pct(r.x.ratio*100,0)}</span>`;}],
  ...(items.some(r=>r.tb)?[["Prix affiché",r=>r.tb?keur(+r.tb.prix):"—"],["À viser : autofinancé",r=>{if(!r.tb) return "—"; const g=targetsFor(r.tb); return `${g.cf==null?"—":"≤ "+keur(g.cf)} ${tgtChip(g.cf,g.ref,1)}`;}],["À viser : 7 %/an",r=>{if(!r.tb) return "—"; const g=targetsFor(r.tb); return `${g.r7==null?"—":"≤ "+keur(g.r7)} ${tgtChip(g.r7,g.ref,1)}`;}]]:[]),["Gain à 25 ans",r=>(r.x.gains[25]>=0?"+":"")+keur(r.x.gains[25])],["Mois vides par an",r=>r.vac==null?"—":fr(r.vac,1)],["DPE",r=>r.dpeL?`classe ${r.dpeL}`:r.fg==null?"—":`F-G ${fr(r.fg,0)} %${r.n!=null&&r.n<15?" (peu de DPE)":""}`]];
 let h=`<div class="tablewrap"><table class="cmpt"><thead><tr><th></th>${items.map(r=>`<th><span class="dot" style="background:${r.col}"></span>${r.name}<div class="sub" style="margin:0;font-weight:500">${r.sub}</div><button type="button" class="lnk" data-rm="${CMP.indexOf(r.it)}">retirer</button>${r.go?` · <button type="button" class="lnk" data-go="${CMP.indexOf(r.it)}">voir sur la carte</button>`:""}</th>`).join("")}</tr></thead><tbody>`;
 rows.forEach(([l,f])=>{h+=`<tr><td>${l}</td>${items.map(r=>`<td class="mono">${f(r)}</td>`).join("")}</tr>`;});
 h+=`</tbody></table></div>`;
 // courbes de gain superposées
 const gw=760, gh=190, L=52, B=22, all=items.flatMap(r=>r.x.gains), lo=Math.min(0,...all), hi=Math.max(0,...all), X=i=>L+(gw-L-20)*i/25, Y=v=>10+(gh-10-B)*(hi-v)/((hi-lo)||1), st=(hi-lo)>60000?20000:(hi-lo)>30000?10000:5000;
 let cv=`<svg viewBox="0 0 ${gw} ${gh}" role="img" aria-label="Gain ou perte si on revend, comparés">`;
 for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st) cv+=`<line x1="${L}" x2="${gw-20}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v===0?"var(--muted)":"var(--line)"}" ${v===0?'stroke-dasharray="4 3"':""}/><text x="${L-6}" y="${Y(v)+4}" text-anchor="end" font-size="11" class="mono" fill="var(--muted)">${keur(v)}</text>`;
 [0,5,10,15,20,25].forEach(i=>{cv+=`<text x="${X(i)}" y="${gh-5}" text-anchor="middle" font-size="11" class="mono" fill="var(--muted)">${i} ans</text>`;});
 items.forEach(r=>{cv+=`<path d="${r.x.gains.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)).join(" ")}" fill="none" stroke="${r.col}" stroke-width="2.4"/><circle cx="${X(25)}" cy="${Y(r.x.gains[25])}" r="4" fill="${r.col}"/>`;});
 cv+=`</svg>`;
 box.innerHTML=h+`<h2 style="margin:16px 0 4px">Gain ou perte à deux si on revend</h2>`+cv;
 box.querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",()=>{CMP.splice(+b.dataset.rm,1);renderCompare();updateCmpButtons();saveLocal();}));
 box.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>{const r=cmpResolve(CMP[+b.dataset.go]); r&&r.go&&r.go(); document.querySelector(".main").scrollIntoView({behavior:"smooth"});}));}

/* ---------- onglets ---------- */
function showTab(id){document.querySelectorAll('[role="tab"]').forEach(t=>{const on=t.id===id; t.setAttribute("aria-selected",on); t.tabIndex=on?0:-1; document.getElementById(t.getAttribute("aria-controls")).hidden=!on;}); saveLocal();}
document.querySelectorAll('[role="tab"]').forEach(t=>{t.addEventListener("click",()=>showTab(t.id));
 t.addEventListener("keydown",e=>{const ts=[...document.querySelectorAll('[role="tab"]')], i=ts.indexOf(t); if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault(); const n=ts[(i+(e.key==="ArrowRight"?1:ts.length-1))%ts.length]; showTab(n.id); n.focus();}});});

/* ---------- préférences locales (onglet, comparaison) ---------- */
function saveLocal(){try{localStorage.setItem("cmpv",JSON.stringify({cmp:CMP,tab:(document.querySelector('[role="tab"][aria-selected="true"]')||{}).id}));}catch(_){}}
function loadLocal(){try{const s=JSON.parse(localStorage.getItem("cmpv")||"null"); if(s){CMP=Array.isArray(s.cmp)?s.cmp.slice(0,3):[]; if(s.tab&&document.getElementById(s.tab)) showTab(s.tab);}}catch(_){}}

/* ---------- lien partageable (#ville ou #ville-codeIRIS) ---------- */
function setHash(){const h=SEL+(QSEL&&QSEL.ck===SEL&&V.k>=KQ?"-"+QSEL.code:""); if(location.hash.slice(1)!==h){try{history.replaceState(null,"","#"+h);}catch(_){}}}
function readHash(){const h=location.hash.slice(1); if(!h) return false; const [ck,code]=h.split("-"); if(!C.find(c=>c.k===ck)) return false;
 SEL=ck; render(); if(IR[ck]){const t=code&&IR[ck].list.find(v=>v.code===code); if(t){QSEL=t; flyTo(t.bb,3.2);} else flyTo(IR[ck].bb);} return true;}
addEventListener("hashchange",()=>{if(location.hash.slice(1)!==SEL+(QSEL?"-"+QSEL.code:"")) readHash();});

/* ---------- plein écran ---------- */
function fitVH(){const sec=document.getElementById("mapSec"), on=sec.classList.contains("mapfull")||document.body.classList.contains("mcarte"), cx=(VW/2-V.x)/V.k, cy=(VH/2-V.y)/V.k;
 cancelAnimationFrame(anim); const f=VW/WW;
 const r=document.querySelector(".mapbox").getBoundingClientRect();
 if(on){VW=Math.max(300,Math.round(r.width)); VH=Math.max(200,Math.round(r.height));}
 else {VW=Math.round(Math.min(WW,Math.max(460,r.width||WW))); VH=Math.round(VW*MAP.H/WW);}
 if(VW===draw.vw&&VH===draw.vh&&draw.rows) return; draw.vw=VW; draw.vh=VH;
 V.k=V.k*(VW/WW)/f; V.x=VW/2-cx*V.k; V.y=VH/2-cy*V.k; clampV(); renderMap(draw.rows||all());}
function setFull(on){const sec=document.getElementById("mapSec"); sec.classList.toggle("mapfull",on); document.body.classList.toggle("noscroll",on);
 const b=document.getElementById("zFull"); b.setAttribute("aria-pressed",on); b.setAttribute("aria-label",on?"Quitter le plein écran":"Plein écran"); b.title=on?"Quitter le plein écran (Échap)":"Plein écran (F)"; fitVH();}
let rsz=null; addEventListener("resize",()=>{clearTimeout(rsz); rsz=setTimeout(fitVH,150);});
document.getElementById("zFull").addEventListener("click",()=>setFull(!document.getElementById("mapSec").classList.contains("mapfull")));
addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("mapSec").classList.contains("mapfull")) setFull(false);});
document.querySelectorAll('#cmode button').forEach(b=>b.addEventListener("click",()=>{CMODE=b.dataset.m; document.querySelectorAll('#cmode button').forEach(x=>x.setAttribute("aria-pressed",x===b)); render();}));
document.getElementById("f-bank").addEventListener("change",e=>{BANKOK=e.target.checked; render();});
document.getElementById("qSearch").addEventListener("input",qFilter);
document.getElementById("f-vacq").addEventListener("change",e=>{H.vacQ=e.target.checked; render();});

