/* ---------- données réelles par quartier : ventes DVF, trajets à pied / vélo, risques Géorisques ---------- */
const MKFULL={gare:"la gare",univ:"l'université",univ2:"l'université (Belle-Beille / Saint-Serge)",centre:"le centre"};
const mois=s=>{const [y,m]=s.split("-"); return ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."][+m-1]+" "+y;};
const minTxt=m=>m>=60?`${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`:`${m} min`;
function dvfOf(t){return typeof DVFQ!=="undefined"&&DVFQ[t.ck]?DVFQ[t.ck].q[t.code]||null:null;}
function risqOf(t){return typeof RISQ!=="undefined"&&RISQ[t.ck]?RISQ[t.ck][t.code]||null:null;}
function trajOf(t){const T=typeof TTQ!=="undefined"&&TTQ[t.ck]; if(!T||!T.foot[t.code]) return null; const X=typeof TCQ!=="undefined"&&TCQ[t.ck], xq=X&&X.q[t.code];
 return T.marks.map((k,i)=>{const j=X?X.marks.indexOf(k==="univ2"?"univ2":k):-1, tc=xq&&j>=0?xq[j]:null; const foot=T.foot[t.code][i];
  return {k,foot,bike:T.bike[t.code][i],km:T.dist[t.code][i],tc:tc!=null&&tc<foot-2?tc:null,best:tc!=null&&tc<foot-2?tc:foot,mode:tc!=null&&tc<foot-2?"tc":"foot"};});}
const stopOf=t=>{const X=typeof TCQ!=="undefined"&&TCQ[t.ck]; return X&&X.stop?X.stop[t.code]:null;};
const hasTC=ck=>typeof TCQ!=="undefined"&&!!TCQ[ck];

/* lignes « libellé → valeur » : garder les chiffres précis sans paragraphes */
function fRows(rows){const R=rows.filter(Boolean); return R.length?`<dl class="frows">${R.map(([k,v,n])=>`<div><dt>${k}</dt><dd>${v}${n?`<small>${n}</small>`:""}</dd></div>`).join("")}</dl>`:"";}
function fNote(t){return t?`<p class="fnote">${t}</p>`:"";}
const fPct=(a,b,ref)=>{const d=(a/b-1)*100; return Math.abs(d)<0.5?`= ${ref}`:`${d>=0?"+":"−"}${fr(Math.abs(d),0)} % vs ${ref}`;};
/* ventes réelles de studios (12-35 m²) dans le quartier */
function dvfBlock(t,compact){const D=typeof DVFQ!=="undefined"&&DVFQ[t.ck]; if(!D) return "";
 const q=dvfOf(t), est=studioPm2(t.ck,t), city=C.find(v=>v.k===t.ck).name, dv=fPct(est,studioPm2(t.ck),"ville");
 if(!q||!q.n) return fRows([["Ventes réelles","aucun studio vendu en 2023-2025"],["Prix retenu",`<b class="mono">${eur(est)}/m²</b>`,`médiane de ${city} (${eur(D.med)}/m²) ajustée au quartier · ${dv}`]]);
 return `<div class="dvfb">${fRows([["Studios vendus",`<b>${q.n}</b> en 2023-2025 · médiane <b class="mono">${eur(q.med)}/m²</b>`,q.n<5?"peu de ventes : à prendre avec prudence":""],["Ville",`${eur(D.med)}/m²`],["Retenu dans le calcul",`<b class="mono">${eur(est)}/m²</b>`,dv+(H.dvf?"":" · option ventes réelles désactivée")]])}
  ${compact?"":`<table class="ftab dvft"><thead><tr><th>Vendu</th><th class="r">Surface</th><th class="r">Prix</th><th class="r">€/m²</th></tr></thead><tbody>${q.last.map(([m,p,s])=>`<tr><td>${mois(m)}</td><td class="r mono">${s} m²</td><td class="r mono">${keur(p)}</td><td class="r mono">${eur(p/s)}</td></tr>`).join("")}</tbody></table>`}</div>`;}
/* temps de trajet réels (OpenStreetMap, à pied et à vélo) */
function trajBlock(t){const r=trajOf(t); if(!r) return ""; const sp=stopOf(t);
 return `<div class="trajb">${r.map(o=>`<span class="traj"><b>${MARKTXT[o.k]}</b> ${minTxt(o.foot)} à pied · ${minTxt(o.bike)} à vélo${o.tc!=null?` · <b class="tc">${minTxt(o.tc)} en bus/tram</b>`:hasTC(t.ck)?" · bus pas plus rapide":""}</span>`).join("")}</div>${fNote(`${sp!=null?`Arrêt le plus proche à ${sp<1000?Math.round(sp/10)*10+" m":fr(sp/1000,1)+" km"}. `:""}${hasTC(t.ck)?"Bus et tram : un mardi vers 8 h, attente comprise.":""}`)}`;}
/* risques (Géorisques) */
const ARG=["","faible","moyen","fort"];
function risqPills(t){return risqPillsR(risqOf(t));}
function risqPillsR(r){if(!r) return "";
 const P=[];
 if(r.t) P.push(["p-bad","Zone inondable (TRI)","Le centre du quartier est dans un territoire à risque important d'inondation : regardez le plan de prévention (PPRI) et l'étage du bien."]);
 if(r.a>=3) P.push(["p-n","Argile : aléa fort","Sols argileux qui gonflent et se rétractent : fissures possibles, surtout pour les maisons. Moins sensible pour un appartement en immeuble."]);
 else if(r.a) P.push(["p-n",`Argile : aléa ${ARG[r.a]}`,""]);
 if(r.s) P.push(["p-warn",`Sol pollué connu à moins de 300 m`,"Un secteur d'information sur les sols (SIS) est recensé à proximité."]);
 if(r.v) P.push(["p-bad","Site Seveso à moins de 500 m",""]);
 if(r.c>=5) P.push(["p-n",`${r.c} anciens sites industriels à 300 m`,"Inventaire CASIAS (anciennes stations-service, garages, ateliers) : courant en ville, rarement un problème pour un appartement."]);
 if(!r.t&&!r.s&&!r.v) P.unshift(["p-ok","Pas de risque majeur repéré",""]);
 return `<div class="risqb">${P.map(([c,l,tip])=>`<span class="pill ${c}"${tip?` title="${esc(tip)}"`:""}>${l}</span>`).join("")}</div>`;}

/* bloc complet pour la fiche quartier */
function quartierReal(t){const a=dvfBlock(t), b=trajBlock(t), c=risqPills(t), d=poiBlock(t); if(!a&&!b&&!c&&!d) return "";
 return `<div class="qreal">${a?`<h4>Ventes réelles (DVF)</h4>${a}`:""}${b?`<h4>Trajets réels</h4>${b}`:""}${d?`<h4>À pied autour du centre du quartier</h4>${d}`:""}${c?`<h4>Risques</h4>${c}`:""}</div>`;}

document.getElementById("f-dvf").addEventListener("change",e=>{H.dvf=e.target.checked; try{localStorage.setItem("dvf",H.dvf?"1":"0");}catch(_){} render();});
(function(){try{const v=localStorage.getItem("dvf"); if(v!=null){H.dvf=v==="1"; document.getElementById("f-dvf").checked=H.dvf;}}catch(_){}})();

/* vie de quartier : commerces et services à pied (OpenStreetMap) */
function poiOf(t){return typeof POIQ!=="undefined"&&POIQ[t.ck]?POIQ[t.ck][t.code]||null:null;}
const dTxt=m=>m>=9999?"aucun à 1 km":m>=1000?fr(m/1000,1)+" km":Math.round(m/10)*10+" m";
function poiItems(p){const sup=Math.min(p[1],p[2]); return [["Supermarché ou supérette",dTxt(sup)],["Boulangerie",dTxt(p[3])],["Pharmacie",dTxt(p[4])],["Cafés, restos, bars à 500 m",String(p[5])],["Laverie",dTxt(p[6])],["Salle de sport",dTxt(p[7])]];}
const poiCls=s=>s>=8?"p-ok":s>=5?"p-n":"p-warn";
function poiBlock(t){const p=poiOf(t); if(!p) return "";
 return `<div class="poib"><span class="pill ${poiCls(p[0])}">Vie de quartier ${fr(p[0],1)}/10</span> ${poiItems(p).map(([l,v])=>`<span class="traj"><b>${l}</b> ${v}</span>`).join("")}</div>`;}
