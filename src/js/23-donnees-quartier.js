/* ---------- données réelles par quartier : ventes DVF, trajets à pied / vélo, risques Géorisques ---------- */
const MKFULL={gare:"la gare",univ:"l'université",univ2:"l'université (Belle-Beille / Saint-Serge)",centre:"le centre"};
const mois=s=>{const [y,m]=s.split("-"); return ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."][+m-1]+" "+y;};
const minTxt=m=>m>=60?`${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`:`${m} min`;
function dvfOf(t){return typeof DVFQ!=="undefined"&&DVFQ[t.ck]?DVFQ[t.ck].q[t.code]||null:null;}
function risqOf(t){return typeof RISQ!=="undefined"&&RISQ[t.ck]?RISQ[t.ck][t.code]||null:null;}
function trajOf(t){const T=typeof TTQ!=="undefined"&&TTQ[t.ck]; if(!T||!T.foot[t.code]) return null; return T.marks.map((k,i)=>({k,foot:T.foot[t.code][i],bike:T.bike[t.code][i],km:T.dist[t.code][i]}));}

/* ventes réelles de studios (12-35 m²) dans le quartier */
function dvfBlock(t,compact){const D=typeof DVFQ!=="undefined"&&DVFQ[t.ck]; if(!D) return "";
 const q=dvfOf(t), est=studioPm2(t.ck,t), city=C.find(v=>v.k===t.ck).name;
 if(!q||!q.n) return `<p class="sub" style="margin:0 0 6px">Ventes réelles : aucun studio vendu dans ce quartier entre 2023 et 2025 (DVF). Prix retenu : ${eur(est)}/m², d'après la médiane de ${city} (${eur(D.med)}/m²) ajustée au niveau de prix du quartier.</p>`;
 const few=q.n<5;
 return `<div class="dvfb"><p class="sub" style="margin:0 0 4px"><b>${q.n} studio${q.n>1?"s":""} vendu${q.n>1?"s":""}</b> dans le quartier en 2023-2025, médiane <b class="mono">${eur(q.med)}/m²</b> (ville : ${eur(D.med)}/m²)${few?" · peu de ventes, à prendre avec prudence":""}. Prix retenu dans le calcul : <b class="mono">${eur(est)}/m²</b>${H.dvf?"":" (option ventes réelles désactivée)"}.</p>
  ${compact?"":`<table class="ftab dvft"><thead><tr><th>Vendu</th><th class="r">Surface</th><th class="r">Prix</th><th class="r">€/m²</th></tr></thead><tbody>${q.last.map(([m,p,s])=>`<tr><td>${mois(m)}</td><td class="r mono">${s} m²</td><td class="r mono">${keur(p)}</td><td class="r mono">${eur(p/s)}</td></tr>`).join("")}</tbody></table>`}</div>`;}

/* temps de trajet réels (OpenStreetMap, à pied et à vélo) */
function trajBlock(t){const r=trajOf(t); if(!r) return "";
 return `<div class="trajb">${r.map(o=>`<span class="traj"><b>${MARKTXT[o.k]}</b> ${minTxt(o.foot)} à pied · ${minTxt(o.bike)} à vélo</span>`).join("")}</div>`;}

/* risques (Géorisques) */
const ARG=["","faible","moyen","fort"];
function risqPills(t){const r=risqOf(t); if(!r) return "";
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
function quartierReal(t){const a=dvfBlock(t), b=trajBlock(t), c=risqPills(t); if(!a&&!b&&!c) return "";
 return `<div class="qreal">${a?`<h4>Ventes réelles (DVF)</h4>${a}`:""}${b?`<h4>Trajets réels</h4>${b}`:""}${c?`<h4>Risques</h4>${c}`:""}</div>`;}

document.getElementById("f-dvf").addEventListener("change",e=>{H.dvf=e.target.checked; try{localStorage.setItem("dvf",H.dvf?"1":"0");}catch(_){} render();});
(function(){try{const v=localStorage.getItem("dvf"); if(v!=null){H.dvf=v==="1"; document.getElementById("f-dvf").checked=H.dvf;}}catch(_){}})();
