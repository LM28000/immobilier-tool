/* ================= accueil « Où on en est » et suivi de l'achat (maquettes de novembre 2026) =================
   Le parcours : choisir la ville → trouver le bien → visiter → offre → compromis et prêt → acte.
   L'étape se lit dans « Nos biens » (statuts, rendez-vous de visite, dates du suivi) : rien à saisir en plus.
   Délais affichés : rétractation de 10 jours après le compromis (acquéreur particulier) ; condition de prêt et acte :
   valeurs habituelles (45 et 90 jours) tant que vous n'avez pas saisi les dates de votre compromis. */
const ETAPES=["Choisir la ville","Trouver le bien","Visiter","Faire une offre","Compromis et prêt","Signer et louer"];
const MAIN_ST=["à voir","visité","offre faite","compromis","acheté"];
const nextStatut=s=>{const i=MAIN_ST.indexOf(s); return i<0?"à voir":MAIN_ST[Math.min(i+1,MAIN_ST.length-1)];};
const dIso=d=>d.toISOString().slice(0,10), addD=(iso,n)=>{const d=new Date(iso+"T12:00:00"); d.setDate(d.getDate()+n); return dIso(d);};
const jourIso=()=>{const d=new Date(); return dIso(new Date(d.getTime()-d.getTimezoneOffset()*6e4));};
const JOURS=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."], MOISL=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function dateTxt(s,heure){if(!s) return ""; const d=new Date(s.length<=10?s+"T12:00:00":s); if(isNaN(d)) return ""; return `${JOURS[d.getDay()]} ${d.getDate()} ${MOISL[d.getMonth()]}`+(heure&&s.length>10?` · ${d.getHours()} h${d.getMinutes()?String(d.getMinutes()).padStart(2,"0"):""}`:"");}

/* étapes datées de l'achat d'un bien */
function suiviSteps(b){const s=b.suivi||{}, st=b.statut, i=MAIN_ST.indexOf(st), off=s.offre||null, comp=s.compromis||null;
 return [["offre","Offre envoyée",off,"date d'envoi de l'offre",i>=2],
  ["reponse","Réponse du vendeur",s.reponse||(off?addD(off,7):null),"date limite de l'offre (7 jours si rien n'est saisi)",i>=3],
  ["compromis","Compromis de vente",comp,"date de signature",i>=3&&!!comp],
  ["retract","Fin du délai de rétractation",comp?addD(comp,10):null,"10 jours après le compromis",i>=4||(comp&&addD(comp,10)<jourIso())],
  ["pret","Accord de prêt",s.pret||(comp?addD(comp,45):null),"date limite de la condition suspensive (45 jours si rien n'est saisi)",i>=4||!!s.pretOk],
  ["acte","Acte chez le notaire",s.acte||(comp?addD(comp,90):null),"date prévue (environ 3 mois après le compromis)",i>=4]]
  .map(([k,l,d,aide,done])=>({k,l,d,aide,done:!!done,saisie:["offre","reponse","compromis","pret","acte"].includes(k)}));}
function suiviNext(b){return suiviSteps(b).find(x=>!x.done&&x.d)||null;}
/* rubrique « Suivi de l'achat » des fiches de bien */
function suiviSec(b){if(!b.id||!["offre faite","compromis","acheté"].includes(b.statut)) return ["",""];
 const L=suiviSteps(b), nx=L.find(x=>!x.done&&x.d), off=+((b.visite||{}).offre)||0;
 const html=`<ol class="suivi">${L.map(x=>`<li class="${x.done?"done":nx&&nx.k===x.k?"next":""}"><i aria-hidden="true"></i><div><b>${x.l}</b>${x.d?` <span class="mono">${dateTxt(x.d)}</span>`:""}<small>${x.aide}</small>${x.saisie?`<label class="sdate">Date <input type="date" data-suivi="${b.id}|${x.k}" value="${esc((b.suivi||{})[x.k]||"")}"></label>`:""}${x.k==="pret"?`<label class="sdate"><input type="checkbox" data-suivi="${b.id}|pretOk"${(b.suivi||{}).pretOk?" checked":""}> prêt accordé</label>`:""}</div></li>`).join("")}</ol>
  ${off?`<p class="sub" style="margin:6px 0 0">Offre de <b class="mono">${eur(off)}</b> pour ${eur(+b.prix)} affichés.</p>`:`<p class="sub" style="margin:6px 0 0">Le montant de l'offre se saisit dans la visite.</p>`}
  <p class="sub" style="margin:4px 0 0">À réunir pour la banque : offre signée, 3 derniers bulletins de salaire, avis d'imposition, relevés de compte, plan de financement.</p>`;
 return [nx?`${nx.l} · ${dateTxt(nx.d)}`:"dates à saisir",html];}
document.addEventListener("change",e=>{const f=e.target.closest&&e.target.closest("[data-suivi]"); if(!f) return; const [id,k]=f.dataset.suivi.split("|"), b=BIENS.find(x=>x.id===id); if(!b) return;
 const s=Object.assign({},b.suivi||{}); if(f.type==="checkbox") s[k]=f.checked; else if(/^\d{4}-\d{2}-\d{2}$/.test(f.value)) s[k]=f.value; else delete s[k];
 const patch={suivi:s}; if(k==="compromis"&&s.compromis&&b.statut==="offre faite") patch.statut="compromis"; updBien(id,patch);});

/* nouveautés du dernier relevé, pour le type de bien choisi */
function nouveautes(){const iso=ADS.iso, ty=H.type, nw=[], dr=[], sold=[];
 Object.entries(HIST||{}).forEach(([ck,h])=>Object.entries((h&&h.v)||{}).forEach(([suf,e])=>{if(!e||((e.m&&e.m[3])||"studio")!==ty) return; const p=e.p||[];
  if(e.f===iso&&!e.g) nw.push({ck,suf,e}); if(p.length>1&&p[p.length-1][0]===iso&&p[p.length-1][1]<p[p.length-2][1]&&!e.g) dr.push({ck,suf,e}); if(e.g===iso) sold.push({ck,suf,e});}));
 return {nw,dr,sold};}

function homeHtml(){const mob=typeof MOBON!=="undefined"&&MOBON, L=BIENS.filter(b=>!isOut(b)), n=s=>L.filter(b=>b.statut===s);
 const now=new Date().toISOString().slice(0,16), rdv=L.filter(b=>b.visite&&b.visite.rdv&&b.visite.rdv>=now).sort((a,b)=>a.visite.rdv.localeCompare(b.visite.rdv));
 const enCours=[...n("acheté"),...n("compromis"),...n("offre faite")][0];
 let step, title, card="", cta="";
 const lv=b=>{try{return priceLevels(b);}catch(_){return null;}};
 const bienLine=b=>`<span class="hcb"><b>${esc(b.titre||"Bien")}</b><span>${esc(cityName(b.ville))} · <span class="mono">${eur(+b.prix)}</span> affiché${lv(b)&&lv(b).cible?` · viser <span class="mono">${eur(lv(b).cible)}</span>`:""}</span></span>`;
 const open=b=>mob?`data-mad="b|${b.ville}|${b.id}"`:`data-openad="b|${b.ville}|${b.id}"`;
 if(enCours){const nx=suiviNext(enCours); step=enCours.statut==="acheté"?5:enCours.statut==="compromis"?4:3; title=nx?`${nx.l} : ${dateTxt(nx.d)}`:"Saisissez les dates de l'achat";
  card=bienLine(enCours); cta=`<button type="button" class="hbtn" ${open(enCours)}>Suivi de l'achat</button>`;}
 else if(n("visité").length){const b=n("visité").sort((a,c)=>(visitScore(c)??0)-(visitScore(a)??0))[0]; step=3; title=`${n("visité").length} bien${n("visité").length>1?"s":""} visité${n("visité").length>1?"s":""} : faire une offre ?`;
  card=bienLine(b); cta=`<button type="button" class="hbtn" data-visit="${b.id}">Préparer l'offre</button>`;}
 else if(rdv.length){step=2; const b=rdv[0]; title=`${rdv.length} visite${rdv.length>1?"s":""} prévue${rdv.length>1?"s":""}`;
  card=`<span class="hcd">${dateTxt(b.visite.rdv,true)}</span>${bienLine(b)}`; cta=`<button type="button" class="hbtn" data-visit="${b.id}">Préparer la visite</button>`;}
 else if(L.length){step=2; const b=L.map(b=>({b,r:calcBien(b)})).sort((p,q)=>(q.r.x.irr??-99)-(p.r.x.irr??-99))[0].b; title=`${L.length} bien${L.length>1?"s":""} à visiter`;
  card=bienLine(b); cta=`<button type="button" class="hbtn" data-visit="${b.id}">Fixer la visite</button>`;}
 else {step=1; title="Repérez un premier bien"; card=`<span class="hcb"><span>Les annonces relevées chaque soir sont classées par rendement, résidences gérées à part.</span></span>`;
  cta=mob?`<button type="button" class="hbtn" data-mtab="annonces">Voir les annonces</button>`:`<button type="button" class="hbtn" data-gotab="tab-ann">Voir les annonces</button>`;}
 const N=nouveautes(), rowsN=[];
 if(N.nw.length) rowsN.push(`<button type="button" class="hrow" data-hnew="nw"><span class="hic n">${N.nw.length}</span><span class="hct"><b>Nouvelle${N.nw.length>1?"s":""} annonce${N.nw.length>1?"s":""}</b><small>${[...new Set(N.nw.map(o=>cityName(o.ck)))].join(", ")}</small></span>${chevH}</button>`);
 N.dr.slice(0,2).forEach(o=>{const p=o.e.p, a=p[p.length-2][1], z=p[p.length-1][1]; rowsN.push(`<button type="button" class="hrow" ${mob?`data-mad="v|${o.ck}|${esc(o.suf)}"`:`data-hopen="${o.ck}|${esc(o.suf)}"`}><span class="hic d">↓</span><span class="hct"><b>Baisse de prix · −${keur(a-z)}</b><small>${esc(o.e.m[1]||cityName(o.ck))}, ${esc(cityName(o.ck))} · <span class="mono">${eur(a)} → ${eur(z)}</span></small></span>${chevH}</button>`);});
 if(N.sold.length) rowsN.push(`<div class="hrow"><span class="hic s">✓</span><span class="hct"><b>${N.sold.length} vendue${N.sold.length>1?"s":""} ou retirée${N.sold.length>1?"s":""}</b><small>disparues de 2 relevés de suite</small></span></div>`);
 const top=all().filter(r=>r.x.irr!=null).sort((p,q)=>q.x.irr-p.x.irr).slice(0,3);
 const villes=top.map(r=>{const has=ADS[r.c.k]&&ADS[r.c.k].ventes; return `<button type="button" class="hcity${r.c.k===SEL?" on":""}" ${mob?`data-mgoc="${r.c.k}"`:`data-hcity="${r.c.k}"`}><span>${esc(r.c.name)}</span><b class="mono" style="color:${colIrr(r.x.irr)}">${pct(r.x.irr)}</b><small>${has?`${ADS[r.c.k].ventes.length} à vendre`:"sans annonces"}</small></button>`;}).join("");
 return `<div class="hstep"><div class="hst"><span>Étape ${step+1} sur 6 · ${ETAPES[step]}</span></div><div class="hbar" aria-hidden="true">${ETAPES.map((_,i)=>`<i class="${i<=step?"on":""}"></i>`).join("")}</div><h2 class="htitle">${title}</h2><div class="hcard">${card}</div>${cta}</div>
  ${rowsN.length?`<h3 class="hh">Depuis le dernier relevé <small>${esc(ADS.date||"")}</small></h3><div class="hlist">${rowsN.join("")}</div>`:""}
  <h3 class="hh">Les 3 villes en tête <small>${tyLow()} de ${H.surface} m²</small></h3><div class="hcities">${villes}</div>
  ${mob?`<div class="mgroup" style="margin-top:14px"><button type="button" class="mrow" data-mtab="plus">Classement, comparateur, réglages et sources${chev}</button></div>`:""}`;}
const chevH=`<span class="hch" aria-hidden="true">›</span>`;

/* ordinateur : bloc en tête de page */
function homeRender(){if(typeof MOBON!=="undefined"&&MOBON) return; const el=document.getElementById("homePanel"); if(!el) return; try{el.innerHTML=`<h2 class="hh0">Où on en est</h2>${homeHtml()}`;}catch(err){el.innerHTML="";}}
/* téléphone : écran Accueil */
function mAccRender(){if(typeof MOBON==="undefined"||!MOBON) return; const el=document.getElementById("mAcc"); if(!el) return; try{el.innerHTML=homeHtml();}catch(err){el.innerHTML=`<p class="msub">Accueil indisponible.</p>`;}}
const _renderH=render; render=function(){_renderH.apply(this,arguments); homeRender(); if(typeof MOBON!=="undefined"&&MOBON&&MS==="accueil") mAccRender();};
const _renderShortH=renderShort; renderShort=function(){_renderShortH.apply(this,arguments); homeRender(); if(typeof MOBON!=="undefined"&&MOBON&&MS==="accueil") mAccRender();};
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-hopen],[data-hcity],[data-hnew]"); if(!t) return;
 if(t.dataset.hopen){const [ck,...r]=t.dataset.hopen.split("|"); openAd("v",ck,r.join("|")); const s=document.getElementById("mapSec"); if(s) s.scrollIntoView({behavior:"smooth"}); return;}
 if(t.dataset.hcity){SEL=t.dataset.hcity; QSEL=null; AD=null; render(); if(IR[SEL]) flyTo(IR[SEL].bb); const s=document.getElementById("mapSec"); if(s) s.scrollIntoView({behavior:"smooth"}); return;}
 if(t.dataset.hnew){if(typeof MOBON!=="undefined"&&MOBON){MF.nw=true; MF.ck=""; mShow("annonces");} else {DF.nw=true; DF.ck=""; showTab("tab-ann"); renderAnn(); document.getElementById("tabsSec").scrollIntoView({behavior:"smooth"});}}});
/* rendez-vous de visite (panneau de visite) */
document.addEventListener("change",e=>{const f=e.target.closest&&e.target.closest("[data-vrdv]"); if(!f) return; const b=BIENS.find(x=>x.id===f.dataset.vrdv); if(!b) return; const v=Object.assign({},b.visite||{}); if(f.value) v.rdv=f.value; else delete v.rdv; updBien(b.id,{visite:v});});

/* ordinateur large (maquettes) : barre latérale avec les 5 rubriques, la rubrique visible est surlignée */
(function sideNav(){const N=[["homePanel","Où on en est",`<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z"/>`],
  ["mapSec","Explorer",`<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>`],
  ["tab-ann","Annonces",`<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/>`],
  ["tab-biens","Nos biens",`<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>`],
  ["setPanel","Budget",`<path d="M17.5 6.5A7 7 0 1 0 17.5 17.5M4 10.5h9M4 13.5h9"/>`]];
 const nav=document.createElement("nav"); nav.id="sideNav"; nav.setAttribute("aria-label","Rubriques");
 nav.innerHTML=`<b class="snt">Notre studio</b>`+N.map(([id,l,ic])=>`<a href="#" data-side="${id}"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ic}</g></svg>${l}</a>`).join("")+`<small class="snf" id="sideFresh"></small>`;
 document.body.prepend(nav);
 const target=id=>id.startsWith("tab-")?document.getElementById("tabsSec"):document.getElementById(id);
 nav.addEventListener("click",e=>{const a=e.target.closest("[data-side]"); if(!a) return; e.preventDefault(); const id=a.dataset.side;
  if(id.startsWith("tab-")){showTab(id); if(id==="tab-ann"&&typeof renderAnn==="function") renderAnn();}
  const el=target(id); if(el) el.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});});
 const mark=()=>{let cur=null, best=-1e9; for(const [id] of N){const el=target(id); if(!el) continue; const t=el.getBoundingClientRect().top; if(t<innerHeight*0.4&&t>best){best=t; cur=id;}}   /* la rubrique dont le haut est passé le plus récemment */
  if(cur==="tabsSec"||(cur&&cur.startsWith("tab-"))){const sel=document.querySelector('[role="tab"][aria-selected="true"]'); cur=sel&&sel.id==="tab-biens"?"tab-biens":"tab-ann";}
  nav.querySelectorAll("[data-side]").forEach(a=>a.setAttribute("aria-current",a.dataset.side===(cur||"homePanel")?"location":"false"));};
 addEventListener("scroll",()=>requestAnimationFrame(mark),{passive:true}); setTimeout(mark,500);
 setTimeout(()=>{const f=document.getElementById("sideFresh"); if(f) f.textContent=ADS.date?`Annonces relevées le ${ADS.date} · 5 villes sur 13`:"";},600);})();
