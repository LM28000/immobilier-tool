/* ---------- visites : checklist, notes à deux, recalcul, fiche à emporter ---------- */
const CRIT=[["cuisine","Cuisine"],["sdb","Salle de bain, WC"],["fenetres","Fenêtres, isolation"],["bruit","Calme"],["lumiere","Luminosité"],["etage","Étage, ascenseur"],["transports","Transports à pied"],["impression","Impression générale"]];
const meV=()=>(myName()||H.nomA||"Moi").trim();
function visitScore(b){const av=(b.visite&&b.visite.avis)||{}, v=Object.values(av).flatMap(a=>CRIT.map(([k])=>+a[k]).filter(n=>n>0)); return v.length?v.reduce((s,n)=>s+n,0)/v.length:null;}
// avant visite = estimations ; après = chiffres réels saisis
function beforeAfter(b){const pre=Object.assign({},b,{copro:0,tf:0,travaux:0}), x0=calcBien(pre).x, x1=calcBien(b).x, g0=targetsFor(pre), g1=targetsFor(b); return {x0,x1,g0,g1};}

let VISIT=null;
function openVisit(id){VISIT=id; renderVisit(); document.getElementById("visitPanel").hidden=false; document.body.classList.add("noscroll"); setTimeout(()=>document.querySelector("#visitPanel .vclose").focus(),50);}
function closeVisit(){VISIT=null; document.getElementById("visitPanel").hidden=true; document.body.classList.remove("noscroll");}
function renderVisit(){const el=document.getElementById("visitBody"), b=BIENS.find(x=>x.id===VISIT); if(!el) return; if(!b){closeVisit(); return;}
 const v=b.visite||{}, av=v.avis||{}, me=meV(), others=Object.keys(av).filter(n=>n!==me), {x0,x1,g0,g1}=beforeAfter(b), sc=visitScore(b);
 const stars=(who,k,edit)=>{const n=+((av[who]||{})[k])||0; return `<span class="stars${edit?"":" ro"}">${[1,2,3,4,5].map(i=>edit?`<button type="button" data-vk="${k}" data-vn="${i}" aria-label="${i} sur 5" class="${i<=n?"on":""}">★</button>`:`<i class="${i<=n?"on":""}">★</i>`).join("")}</span>`;};
 const cmp=(l,f,good)=>{const a=f(x0,g0), z=f(x1,g1); return `<tr><td>${l}</td><td class="r mono">${a}</td><td class="r mono">${z}</td></tr>`;};
 el.innerHTML=`<div class="dh"><h3 style="margin:0">${esc(b.titre||"Bien")}</h3>${sc!=null?`<span class="pill p-n">note ${fr(sc,1)}/5</span>`:""}</div>
 <p class="sub" style="margin:2px 0 12px">${C.find(c=>c.k===b.ville).name}${b.quartier?" · "+esc(b.quartier):""} · ${b.surface} m² · ${keur(+b.prix)} affiché</p>
 <h2 class="psec">Les chiffres réels</h2>
 <div class="fields vf">
  <label class="f">DPE réel<span class="inp"><select data-vf="dpe"><option value="">?</option>${"ABCDEFG".split("").map(l=>`<option${b.dpe===l?" selected":""}>${l}</option>`).join("")}</select></span></label>
  <label class="f">Charges copro (part proprio)<span class="inp"><input data-vf="copro" type="number" min="0" step="5" value="${+b.copro||""}" placeholder="estimées"><span>€/mois</span></span></label>
  <label class="f">Taxe foncière<span class="inp"><input data-vf="tf" type="number" min="0" step="10" value="${+b.tf||""}" placeholder="estimée"><span>€/an</span></span></label>
  <label class="f">Travaux à prévoir<span class="inp"><input data-vf="travaux" type="number" min="0" step="500" value="${+b.travaux||""}" placeholder="${H.travaux}"><span>€</span></span></label>
  <label class="f wide">Travaux votés en copropriété<span class="inp"><input data-vf="votes" maxlength="200" value="${esc(v.votes||"")}" placeholder="ravalement 2027, toiture…"></span></label>
 </div>
 ${/[FG]/.test(b.dpe||"")?`<p class="warnline">DPE ${b.dpe} : ${b.dpe==="G"?"location déjà interdite":"location interdite à partir de 2028"} sans travaux de rénovation. Chiffrez-les et intégrez-les dans « Travaux à prévoir ».</p>`:""}
 <h2 class="psec">Avant et après la visite</h2>
 <table class="scnt"><thead><tr><th></th><th class="r">Estimé</th><th class="r">Après visite</th></tr></thead><tbody>
  ${cmp("Budget tout compris",x=>keur(x.cost))}
  ${cmp("Cash-flow / mois",x=>`<span class="${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}</span>`)}
  ${cmp("Rendement 15 ans",x=>x.irr==null?"n.d.":`<b style="color:${colIrr(x.irr)}">${pct(x.irr)}</b>`)}
  ${cmp("Prix max. autofinancé",(x,g)=>g.cf==null?"—":"≤ "+keur(g.cf))}
  ${cmp("Prix max. 7 %/an",(x,g)=>g.r7==null?"—":"≤ "+keur(g.r7))}
 </tbody></table>
 <h2 class="psec">Nos notes</h2>
 <p class="sub" style="margin:0 0 6px">Vous notez sous le nom « ${esc(me)} »${myName()?"":" (changez-le dans « Partager la liste »)"}.${others.length?"":" L'autre avis apparaîtra ici quand il sera saisi."}</p>
 <table class="scnt vnotes"><thead><tr><th></th><th>${esc(me)}</th>${others.map(n=>`<th>${esc(n)}</th>`).join("")}</tr></thead><tbody>
  ${CRIT.map(([k,l])=>`<tr><td>${l}</td><td>${stars(me,k,true)}</td>${others.map(n=>`<td>${stars(n,k,false)}</td>`).join("")}</tr>`).join("")}
 </tbody></table>
 <label class="f wide" style="margin-top:8px">Mon commentaire<span class="inp"><textarea data-vc rows="3" maxlength="600" placeholder="Ce qui nous a plu, ce qui inquiète…">${esc((av[me]||{}).com||"")}</textarea></span></label>
 ${others.filter(n=>(av[n]||{}).com).map(n=>`<p class="vcom"><b>${esc(n)} :</b> ${esc(av[n].com)}</p>`).join("")}
 <div class="vfoot"><button type="button" class="btn ghost" data-fiche="${b.id}">Fiche à emporter</button><button type="button" class="btn vclose2">Terminer</button></div>`;}

async function saveVisit(patch){const b=BIENS.find(x=>x.id===VISIT); if(!b) return; try{await DB.collection("biens").doc(b.id).update(patch);}catch(e){toast("Enregistrement refusé ("+(e&&e.code||"erreur")+").");}}
function avisPatch(b,me,k,val){const v=JSON.parse(JSON.stringify(b.visite||{})); v.avis=v.avis||{}; v.avis[me]=Object.assign({},v.avis[me],{[k]:val}); return {visite:v};}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-visit],[data-vk],.vclose,.vclose2,[data-fiche],#visitPanel"); if(!t) return;
 if(t.dataset.visit){e.preventDefault(); openVisit(t.dataset.visit); return;}
 if(t.dataset.fiche){e.preventDefault(); openFiche(t.dataset.fiche); return;}
 if(t.classList.contains("vclose")||t.classList.contains("vclose2")){closeVisit(); return;}
 if(t.dataset.vk){const b=BIENS.find(x=>x.id===VISIT); if(!b) return; const cur=+(((b.visite||{}).avis||{})[meV()]||{})[t.dataset.vk]||0, n=+t.dataset.vn;
  saveVisit(avisPatch(b,meV(),t.dataset.vk,cur===n?0:n)); return;}
 if(t.id==="visitPanel"&&e.target===t) closeVisit();});
document.addEventListener("change",e=>{if(!VISIT) return; const f=e.target.closest&&e.target.closest("[data-vf],[data-vc]"); if(!f) return; const b=BIENS.find(x=>x.id===VISIT); if(!b) return;
 if(f.dataset.vc!==undefined){saveVisit(avisPatch(b,meV(),"com",f.value.trim())); return;}
 const k=f.dataset.vf; if(k==="votes"){const v=Object.assign({},b.visite,{votes:f.value.trim()}); saveVisit({visite:v}); return;}
 saveVisit({[k]:k==="dpe"?f.value:(+f.value||0)});});
addEventListener("keydown",e=>{if(e.key==="Escape"&&VISIT){e.stopImmediatePropagation(); closeVisit();}},true);

/* ---------- fiche à emporter (imprimable) ---------- */
function negoArgs(b,x,g,t){const A=[], pm2=+b.prix/(+b.surface||22);
 if(g.cf!=null&&g.cf<+b.prix) A.push(`À <b>${keur(g.cf)}</b>, le loyer paie tout : crédit, charges, impôts. Au-delà, il faut remettre de l'argent chaque mois.`);
 if(t&&t.price){const d=(pm2/(t.price*(1+H.surcote/100))-1)*100; if(d>3) A.push(`Le prix demandé (${eur(pm2)}/m²) est <b>${fr(d,0)} % au-dessus</b> du prix d'un studio comparable dans le quartier (${eur(t.price*(1+H.surcote/100))}/m², surcote petite surface comprise).`);}
 if(/[EFG]/.test(b.dpe||"")) A.push(`DPE <b>${b.dpe}</b> : ${b.dpe==="E"?"location interdite en 2034":b.dpe==="F"?"location interdite en 2028":"location déjà interdite"} sans rénovation. Le coût des travaux est à déduire du prix.`);
 if(+b.travaux>H.travaux) A.push(`<b>${eur(+b.travaux)}</b> de travaux à prévoir d'après la visite.`);
 if(b.visite&&b.visite.votes) A.push(`Travaux votés en copropriété : ${esc(b.visite.votes)}.`);
 if(b.vu&&b.vu.days>=45) A.push(`Annonce en ligne depuis <b>${b.vu.days} jours</b> : le vendeur peut être ouvert à la négociation.`);
 if(b.vu&&b.vu.drops) A.push(`Le prix a déjà baissé ${b.vu.drops} fois.`);
 return A.slice(0,4);}
function openFiche(id){const b0=BIENS.find(x=>x.id===id); if(!b0) return; const sf=(b0.url||"").startsWith(VTURL)?b0.url.slice(VTURL.length):null, b=Object.assign({},b0,{vu:sf?vu("v",b0.ville,sf):null}); const r=calcBien(b), x=r.x, g=targetsFor(b), [bc,bt]=bank(x.ratio), c=C.find(v=>v.k===b.ville);
 const el=document.getElementById("ficheBody");
 el.innerHTML=`<header class="fh"><div><h1>${esc(b.titre||"Bien")}</h1><p>${c.name}${b.quartier?" · "+esc(b.quartier):""} · ${b.surface} m² · ${keur(+b.prix)} affiché (${eur(+b.prix/(+b.surface||22))}/m²)${b.dpe?" · DPE "+b.dpe:""}</p></div><p class="fdate">Fiche du ${new Date().toLocaleDateString("fr-FR")}</p></header>
 <div class="fgrid">
  <div class="fbox"><h2>Les chiffres</h2>
   <div class="trow"><span>Budget tout compris</span><b>${keur(x.cost)}</b></div>
   <div class="trow"><span>Loyer hors charges</span><b>${eur(x.rentHC)}</b></div>
   <div class="trow"><span>Cash-flow à deux</span><b>${sgn(x.cf)}/mois</b></div>
   <div class="trow"><span>Rendement 15 ans</span><b>${x.irr==null?"n.d.":pct(x.irr)}</b></div>
   <div class="trow"><span>Banque</span><b>${bt} (${pct(x.ratio*100,0)})</b></div></div>
  <div class="fbox"><h2>Prix à viser</h2>
   <div class="trow"><span>Autofinancé</span><b>${g.cf==null?"—":"≤ "+keur(g.cf)}</b></div>
   <div class="trow"><span>7 % par an</span><b>${g.r7==null?"—":"≤ "+keur(g.r7)}</b></div>
   <div class="trow"><span>Prix affiché</span><b>${keur(+b.prix)}</b></div></div>
 </div>
 <div class="fbox"><h2>Arguments pour négocier</h2>${(()=>{const a=negoArgs(b,x,g,r.t); return a.length?`<ol>${a.map(s=>`<li>${s}</li>`).join("")}</ol>`:`<p>Le prix affiché est déjà cohérent avec nos objectifs.</p>`;})()}</div>
 <div class="fbox"><h2>Pendant la visite</h2><ul class="fcheck">
  ${["DPE et date du diagnostic","Charges de copro (3 derniers PV d'AG)","Taxe foncière (dernier avis)","Travaux votés ou prévus en copro","État cuisine, salle de bain, fenêtres","Chauffage et eau chaude (type, âge)","Bruit (rue, voisins) et luminosité","Étage, ascenseur, cave, local vélo","Transports et commerces à pied","Pourquoi le vendeur vend, depuis quand"].map(s=>`<li><span class="cb"></span>${s}</li>`).join("")}</ul>
  <div class="flines"><span></span><span></span><span></span><span></span></div></div>
 <p class="fsrc">Estimations calculées par « Où acheter notre studio ? » avec nos réglages (apport ${eur(H.apport)}, taux ${pct(H.taux,2)} sur ${H.duree} ans). Pas un conseil financier.</p>`;
 document.getElementById("fichePanel").hidden=false; document.body.classList.add("noscroll","fiche-on");}
function closeFiche(){document.getElementById("fichePanel").hidden=true; document.body.classList.remove("fiche-on"); if(!VISIT) document.body.classList.remove("noscroll");}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest(".fclose,.fprint"); if(!t) return; if(t.classList.contains("fclose")) closeFiche(); else {try{window.print();}catch(_){} setTimeout(()=>toast("Si rien ne s'ouvre (version Claude), utilisez la page GitHub pour imprimer ou enregistrer en PDF."),400);}});
addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.getElementById("fichePanel").hidden){e.stopImmediatePropagation(); closeFiche();}},true);
