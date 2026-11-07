/* ---------- visites : checklist, avis à deux, offre simulée, questions, fiche à emporter ---------- */
const CRIT=[["cuisine","Cuisine"],["sdb","Salle de bain, WC"],["fenetres","Fenêtres, isolation"],["bruit","Calme"],["lumiere","Luminosité"],["etage","Étage, ascenseur"],["transports","Transports à pied"],["impression","Impression générale"]];
const CHECK=[
 ["L'immeuble",[["fac","Façade et cage d'escalier en bon état"],["humid","Aucune trace d'humidité ni de fissure"],["rdc","Pas de nuisance au rez-de-chaussée (bar, restaurant)"],["communs","Interphone, boîtes aux lettres, local vélo"]]],
 ["Le logement",[["chauf","Chauffage récent (type et âge notés)"],["ecs","Eau chaude correcte (ballon, débit)"],["elec","Électricité aux normes (tableau, prises)"],["vitrage","Double vitrage"],["surf","Surface réelle conforme à l'annonce"],["range","Rangements suffisants"]]],
 ["Location meublée",[["mobilier","Place pour le mobilier obligatoire (lit, plaques, frigo, rangements…)"],["lit","Un vrai lit tient, pas seulement un canapé"],["cible","Cible claire : étudiant ou jeune actif"]]],
 ["Documents à obtenir",[["pv","3 derniers PV d'assemblée générale"],["charges","Relevé des charges de copropriété"],["fonds","Fonds de travaux et travaux votés"],["diag","Diagnostics (DPE, électricité, amiante…)"],["tfavis","Dernier avis de taxe foncière"]]]];
const VERD={go:["On fonce","p-ok"],prix:["Oui, au bon prix","p-warn"],non:["Non","p-bad"]};
const meV=()=>(myName()||H.nomA||"Moi").trim();
function visitScore(b){const av=(b.visite&&b.visite.avis)||{}, v=Object.values(av).flatMap(a=>CRIT.map(([k])=>+a[k]).filter(n=>n>0)); return v.length?v.reduce((s,n)=>s+n,0)/v.length:null;}
function visitFlags(b){const c=(b.visite&&b.visite.check)||{}; return Object.values(c).filter(v=>v==="non").length;}
function beforeAfter(b){const pre=Object.assign({},b,{copro:0,tf:0,travaux:0}), x0=calcBien(pre).x, x1=calcBien(b).x, g0=targetsFor(pre), g1=targetsFor(b); return {x0,x1,g0,g1};}
// les 3 prix de la négociation
function priceLevels(b){const g=targetsFor(b), pr=+b.prix, v=[g.cf,g.r7].filter(p=>p!=null); if(!v.length) return null;
 const cible=Math.min(...v), max=Math.min(pr,Math.max(...v)), ouv=Math.floor(cible*0.95/500)*500; return {ouv:Math.min(ouv,pr),cible:Math.min(cible,pr),max,pr};}
// questions à poser à l'agent, d'après ce qu'on sait du bien
function agentQuestions(b){const s=bienSuf(b), v=s?vu("v",b.ville,s):null, Q=["Pourquoi le propriétaire vend-il, et depuis quand le bien est-il en vente ?","Des offres ont-elles déjà été faites ? À quel prix ?"];
 if(v&&v.days>=30) Q.push(`L'annonce est en ligne depuis ${v.days} jours : le vendeur est-il pressé ?`);
 if(v&&v.drops) Q.push("Le prix a déjà baissé : jusqu'où le vendeur est-il prêt à descendre ?");
 if(!(+b.copro)) Q.push("Combien coûtent les charges de copropriété et que comprennent-elles ?");
 Q.push("Des travaux sont-ils votés ou envisagés en copropriété (ravalement, toiture, ascenseur) ?");
 if(/[EFG]/.test(b.dpe||"")) Q.push(`Le DPE est ${b.dpe} : quels travaux pour en sortir ? Existe-t-il des devis ?`); else if(!b.dpe) Q.push("Quelle est la classe du DPE, et de quand date le diagnostic ?");
 if(!(+b.tf)) Q.push("Quel est le montant exact de la taxe foncière ?");
 Q.push("Le logement est-il loué en ce moment ? Si oui : bail, loyer, date de fin.","Le mobilier ou l'électroménager sont-ils inclus dans le prix ?");
 return Q;}

let VISIT=null;
let VOPENER=null, FOPENER=null;
function openVisit(id){if(!VISIT) VOPENER=document.activeElement; VISIT=id; renderVisit(); document.getElementById("visitPanel").hidden=false; document.body.classList.add("noscroll"); setTimeout(()=>document.querySelector("#visitPanel .vclose").focus(),50);}
function closeVisit(){VISIT=null; document.getElementById("visitPanel").hidden=true; document.body.classList.remove("noscroll"); if(VOPENER&&VOPENER.isConnected) try{VOPENER.focus();}catch(_){} VOPENER=null;}
function renderVisit(){const el=document.getElementById("visitBody"), b=BIENS.find(x=>x.id===VISIT); if(!el) return; if(!b){closeVisit(); return;}
 const sc0=el.closest(".vsheet")?el.closest(".vsheet").scrollTop:0;
 const v=b.visite||{}, av=v.avis||{}, me=meV(), others=Object.keys(av).filter(n=>n!==me), {x0,x1,g0,g1}=beforeAfter(b), sc=visitScore(b), ck=v.check||{}, my=av[me]||{};
 const stars=(who,k,edit)=>{const n=+((av[who]||{})[k])||0; return `<span class="stars${edit?"":" ro"}">${[1,2,3,4,5].map(i=>edit?`<button type="button" data-vk="${k}" data-vn="${i}" aria-label="${i} sur 5" class="${i<=n?"on":""}">★</button>`:`<i class="${i<=n?"on":""}">★</i>`).join("")}</span>`;};
 const cmp=(l,f)=>`<tr><td>${l}</td><td class="r mono">${f(x0,g0)}</td><td class="r mono">${f(x1,g1)}</td></tr>`;
 const tri=k=>`<span class="tri" role="group">${[["oui","Oui"],["non","Non"],["?","?"]].map(([val,l])=>`<button type="button" data-vck="${k}|${val}" aria-pressed="${ck[k]===val}" class="t-${val==="?"?"q":val}">${l}</button>`).join("")}</span>`;
 const off=+v.offre||0, xo=off?calcBien(Object.assign({},b,{prix:off})).x:null, nFl=visitFlags(b), lv=priceLevels(b);
 const lines=s=>(s||"").split("\n").map(t=>t.trim()).filter(Boolean);
 el.innerHTML=`<div class="dh"><h3 style="margin:0">${esc(b.titre||"Bien")}</h3><span style="display:flex;gap:6px;flex-wrap:wrap">${sc!=null?`<span class="pill p-n">note ${fr(sc,1)}/5</span>`:""}${nFl?`<span class="pill p-bad">${nFl} point${nFl>1?"s":""} à problème</span>`:""}</span></div>
 <p class="sub" style="margin:2px 0 12px">${C.find(c=>c.k===b.ville).name}${b.quartier?" · "+esc(b.quartier):""} · ${b.surface} m² · ${keur(+b.prix)} affiché</p>
 <nav class="vnav">${["Chiffres","Checklist","Avis","Offre","Questions"].map((t,i)=>`<a href="#vs${i}">${t}</a>`).join("")}</nav>
 <h2 class="psec" id="vs0">Les chiffres réels</h2>
 <div class="fields vf">
  <label class="f">DPE réel<span class="inp"><select data-vf="dpe"><option value="">?</option>${"ABCDEFG".split("").map(l=>`<option${b.dpe===l?" selected":""}>${l}</option>`).join("")}</select></span></label>
  <label class="f">Charges copro (part proprio)<span class="inp"><input data-vf="copro" type="number" min="0" step="5" value="${+b.copro||""}" placeholder="estimées"><span>€/mois</span></span></label>
  <label class="f">Taxe foncière<span class="inp"><input data-vf="tf" type="number" min="0" step="10" value="${+b.tf||""}" placeholder="estimée"><span>€/an</span></span></label>
  <label class="f">Travaux à prévoir<span class="inp"><input data-vf="travaux" type="number" min="0" step="500" value="${+b.travaux||""}" placeholder="${H.travaux}"><span>€</span></span></label>
  <label class="f wide">Travaux votés en copropriété<span class="inp"><input data-vf="votes" maxlength="200" value="${esc(v.votes||"")}" placeholder="ravalement 2027, toiture…"></span></label>
 </div>
 ${/[FG]/.test(b.dpe||"")?`<p class="warnline">DPE ${b.dpe} : ${b.dpe==="G"?"location déjà interdite":"location interdite à partir de 2028"} sans travaux de rénovation. Chiffrez-les et intégrez-les dans « Travaux à prévoir ».</p>`:""}
 <table class="scnt"><thead><tr><th></th><th class="r">Estimé</th><th class="r">Après visite</th></tr></thead><tbody>
  ${cmp("Budget tout compris",x=>keur(x.cost))}
  ${cmp(`Cash-flow ${mlab()} / mois`,x=>`<span class="${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}</span>`)}
  ${cmp(`Rendement 15 ans ${mlab()}`,x=>x.irr==null?"n.d.":`<b style="color:${colIrr(x.irr)}">${pct(x.irr)}</b>`)}
  ${cmp("Prix max. autofinancé",(x,g)=>g.cf==null?"—":"≤ "+keur(g.cf))}
  ${cmp("Prix max. 7 %/an",(x,g)=>g.r7==null?"—":"≤ "+keur(g.r7))}
 </tbody></table>
 <h2 class="psec" id="vs1">Checklist de visite</h2>
 <p class="sub" style="margin:0 0 6px">Une réponse commune. Chaque « non » apparaît en rouge sur la fiche du bien.</p>
 ${CHECK.map(([t,items])=>`<div class="ckgrp"><h4>${t}</h4>${items.map(([k,l])=>`<div class="ckrow${ck[k]==="non"?" bad":""}"><span>${l}</span>${tri(k)}</div>`).join("")}</div>`).join("")}
 <h2 class="psec" id="vs2">Nos avis</h2>
 <p class="sub" style="margin:0 0 6px">Vous notez sous le nom « ${esc(me)} »${myName()?"":" (changez-le dans « Partager la liste »)"}.${others.length?"":" L'autre avis apparaîtra ici quand il sera saisi."}</p>
 <table class="scnt vnotes"><thead><tr><th></th><th>${esc(me)}</th>${others.map(n=>`<th>${esc(n)}</th>`).join("")}</tr></thead><tbody>
  ${CRIT.map(([k,l])=>`<tr><td>${l}</td><td>${stars(me,k,true)}</td>${others.map(n=>`<td>${stars(n,k,false)}</td>`).join("")}</tr>`).join("")}
 </tbody></table>
 <div class="fields vf" style="margin-top:10px">
  <label class="f">Ce qui m'a plu<span class="inp"><textarea data-va="plus" rows="3" maxlength="600" placeholder="Une idée par ligne">${esc(my.plus||"")}</textarea></span></label>
  <label class="f">Ce qui m'inquiète<span class="inp"><textarea data-va="moins" rows="3" maxlength="600" placeholder="Une idée par ligne">${esc(my.moins||"")}</textarea></span></label>
 </div>
 <div class="verd"><span class="sub" style="margin:0">Mon verdict :</span>${Object.entries(VERD).map(([k,[l]])=>`<button type="button" class="chip${my.verdict===k?" on":""}" data-vv="${k}" aria-pressed="${my.verdict===k}">${l}</button>`).join("")}
  ${my.verdict==="prix"?`<label class="f inl">à<span class="inp"><input data-va="vprix" type="number" step="500" value="${+my.vprix||""}" placeholder="${lv?lv.cible:""}"><span>€</span></span></label>`:""}</div>
 <label class="f wide" style="margin-top:8px">Commentaire libre<span class="inp"><textarea data-va="com" rows="2" maxlength="600">${esc(my.com||"")}</textarea></span></label>
 ${others.map(n=>{const a=av[n]||{}; return `<div class="vother"><b>${esc(n)}</b>${a.verdict?` <span class="pill ${VERD[a.verdict][1]}">${VERD[a.verdict][0]}${a.verdict==="prix"&&a.vprix?" "+keur(+a.vprix):""}</span>`:""}
  ${lines(a.plus).length?`<p class="vl plus">${lines(a.plus).map(esc).join(" · ")}</p>`:""}${lines(a.moins).length?`<p class="vl moins">${lines(a.moins).map(esc).join(" · ")}</p>`:""}${a.com?`<p class="vcom">${esc(a.com)}</p>`:""}</div>`;}).join("")}
 <h2 class="psec" id="vs3">Simuler une offre</h2>
 ${lv?`<p class="sub" style="margin:0 0 6px">Repères : ouverture <b>${keur(lv.ouv)}</b> · cible <b>${keur(lv.cible)}</b> · maximum <b>${keur(lv.max)}</b> (prix affiché ${keur(lv.pr)}).</p>`:""}
 <div class="fields vf"><label class="f">Prix proposé<span class="inp"><input data-vf2="offre" type="number" step="500" value="${off||""}" placeholder="${lv?lv.cible:""}"><span>€</span></span></label></div>
 ${xo?`<table class="scnt"><thead><tr><th></th><th class="r">Prix affiché</th><th class="r">Offre ${keur(off)}</th></tr></thead><tbody>
  <tr><td>Budget tout compris</td><td class="r mono">${keur(x1.cost)}</td><td class="r mono">${keur(xo.cost)}</td></tr>
  <tr><td>Cash-flow ${mlab()} / mois</td><td class="r mono ${x1.cf>=0?"pos":"neg"}">${sgn(x1.cf)}</td><td class="r mono ${xo.cf>=0?"pos":"neg"}">${sgn(xo.cf)}</td></tr>
  <tr><td>Rendement 15 ans ${mlab()}</td><td class="r mono">${x1.irr==null?"n.d.":pct(x1.irr)}</td><td class="r mono"><b style="color:${colIrr(xo.irr)}">${xo.irr==null?"n.d.":pct(xo.irr)}</b></td></tr>
  <tr><td>Banque</td><td class="r">${(()=>{const [c,t]=bank(x1.ratio);return `<span class="pill ${c}">${t}</span>`;})()}</td><td class="r">${(()=>{const [c,t]=bank(xo.ratio);return `<span class="pill ${c}">${t}</span>`;})()}</td></tr>
  <tr><td>Remise demandée</td><td></td><td class="r mono">−${fr((1-off/+b.prix)*100,0)} %</td></tr></tbody></table>`:`<p class="sub" style="margin:0">Entrez un prix pour voir son effet.</p>`}
 <h2 class="psec" id="vs4">Questions à poser</h2>
 <ol class="vq">${agentQuestions(b).map(q=>`<li>${esc(q)}</li>`).join("")}</ol>
 <div class="vfoot"><button type="button" class="btn ghost" data-fiche="${b.id}">Fiche à emporter</button><button type="button" class="btn vclose2">Terminer</button></div>`;
 if(el.closest(".vsheet")) el.closest(".vsheet").scrollTop=sc0;}

async function saveVisit(patch){const b=BIENS.find(x=>x.id===VISIT); if(!b) return; try{await DB.collection("biens").doc(b.id).update(patch);}catch(e){toast("Enregistrement refusé ("+(e&&e.code||"erreur")+").");}}
const visCopy=b=>JSON.parse(JSON.stringify(b.visite||{}));
function avisPatch(b,me,k,val){const v=visCopy(b); v.avis=v.avis||{}; v.avis[me]=Object.assign({},v.avis[me],{[k]:val}); return {visite:v};}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-visit],[data-vk],[data-vck],[data-vv],.vclose,.vclose2,[data-fiche],#visitPanel,.vnav a"); if(!t) return;
 if(t.dataset.visit){e.preventDefault(); openVisit(t.dataset.visit); return;}
 if(t.dataset.fiche){e.preventDefault(); openFiche(t.dataset.fiche); return;}
 if(t.classList.contains("vclose")||t.classList.contains("vclose2")){closeVisit(); return;}
 if(t.matches(".vnav a")){e.preventDefault(); const s=document.getElementById(t.getAttribute("href").slice(1)); if(s) s.scrollIntoView({behavior:"smooth",block:"start"}); return;}
 const b=BIENS.find(x=>x.id===VISIT); if(!b&&t.id!=="visitPanel") return;
 if(t.dataset.vk){const cur=+(((b.visite||{}).avis||{})[meV()]||{})[t.dataset.vk]||0, n=+t.dataset.vn; saveVisit(avisPatch(b,meV(),t.dataset.vk,cur===n?0:n)); return;}
 if(t.dataset.vck){const [k,val]=t.dataset.vck.split("|"), v=visCopy(b); v.check=v.check||{}; v.check[k]=v.check[k]===val?null:val; saveVisit({visite:v}); return;}
 if(t.dataset.vv){const cur=(((b.visite||{}).avis||{})[meV()]||{}).verdict; saveVisit(avisPatch(b,meV(),"verdict",cur===t.dataset.vv?null:t.dataset.vv)); return;}
 if(t.id==="visitPanel"&&e.target===t) closeVisit();});
document.addEventListener("change",e=>{if(!VISIT) return; const f=e.target.closest&&e.target.closest("[data-vf],[data-va],[data-vf2]"); if(!f) return; const b=BIENS.find(x=>x.id===VISIT); if(!b) return;
 if(f.dataset.va){saveVisit(avisPatch(b,meV(),f.dataset.va,f.dataset.va==="vprix"?Math.min(Math.max(+f.value||0,0),(+b.prix||0)*3):f.value.trim())); return;}
 if(f.dataset.vf2){const v=visCopy(b), o=+f.value||0; if(o&&(o<1000||o>(+b.prix||0)*3)){toast("Prix proposé hors de portée : entre 1 000 € et 3 fois le prix affiché."); f.value=v.offre||""; return;} v.offre=o; saveVisit({visite:v}); return;}
 const k=f.dataset.vf; if(k==="votes"){const v=visCopy(b); v.votes=f.value.trim(); saveVisit({visite:v}); return;}
 saveVisit({[k]:k==="dpe"?f.value:(+f.value||0)});});
addEventListener("keydown",e=>{if(e.key==="Escape"&&VISIT&&document.getElementById("fichePanel").hidden){e.stopImmediatePropagation(); closeVisit();}},true);   /* la fiche à emporter, au-dessus, se ferme d'abord */

/* ---------- fiche à emporter (imprimable) ---------- */
function negoArgs(b,x,g,t){const A=[], pm2=+b.prix/(+b.surface||22);
 if(g.cf!=null&&g.cf<+b.prix) A.push(`À <b>${keur(g.cf)}</b>, le loyer paie tout : crédit, charges${H.net?", impôts":""}. Au-delà, il faut remettre de l'argent chaque mois.`);
 if(t&&t.price){const qs=studioPm2(b.ville,t,b.type||typeFor(b.surface,b.pieces)), d=(pm2/qs-1)*100; if(d>3) A.push(`Le prix demandé (${eur(pm2)}/m²) est <b>${fr(d,0)} % au-dessus</b> du prix d'${TY().un} comparable dans le quartier (${eur(qs)}/m², ${hasDVF(b.ville)?"d'après les ventes réelles":"surcote petite surface comprise"}).`);}
 if(/[EFG]/.test(b.dpe||"")) A.push(`DPE <b>${b.dpe}</b> : ${b.dpe==="E"?"location interdite en 2034":b.dpe==="F"?"location interdite en 2028":"location déjà interdite"} sans rénovation. Le coût des travaux est à déduire du prix.`);
 if(+b.travaux>H.travaux) A.push(`<b>${eur(+b.travaux)}</b> de travaux à prévoir d'après la visite.`);
 if(b.visite&&b.visite.votes) A.push(`Travaux votés en copropriété : ${esc(b.visite.votes)}.`);
 if(b.vu&&b.vu.days>=45) A.push(`Annonce en ligne depuis <b>${b.vu.days} jours</b> : le vendeur peut être ouvert à la négociation.`);
 if(b.vu&&b.vu.drops) A.push(`Le prix a déjà baissé ${b.vu.drops} fois.`);
 const fl=visitFlags(b); if(fl) A.push(`${fl} point${fl>1?"s":""} négatif${fl>1?"s":""} relevé${fl>1?"s":""} pendant la visite.`);
 return A.slice(0,5);}
// mini-carte du quartier : contour, quartiers voisins, gare, université, centre
function quartierMap(b,t){if(!t||!IR[b.ville]) return ""; const bb=t.bb, w=bb[2]-bb[0], h=bb[3]-bb[1], m=Math.max(w,h)*1.6, cx=(bb[0]+bb[2])/2, cy=(bb[1]+bb[3])/2, vb=[cx-m,cy-m*0.62,m*2,m*1.24];
 const others=IR[b.ville].list.filter(o=>o!==t&&!(o.bb[2]<vb[0]||o.bb[0]>vb[0]+vb[2]||o.bb[3]<vb[1]||o.bb[1]>vb[1]+vb[3]));
 const mk=Object.entries(MARK[b.ville]||{}).map(([k,p])=>{const [x,y]=pxy(p[0],p[1]); return `<g><circle cx="${x}" cy="${y}" r="${m*0.025}" fill="#18202c"/><text x="${x+m*0.04}" y="${y+m*0.015}" font-size="${m*0.055}" font-weight="700" fill="#18202c" paint-order="stroke" stroke="#fff" stroke-width="${m*0.012}">${MARKTXT[k]}</text></g>`;}).join("");
 return `<svg class="fqmap" viewBox="${vb.join(" ")}" role="img" aria-label="Carte du quartier"><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="#eef2f6"/>${others.map(o=>`<path d="${o.d}" fill="#fff" stroke="#c9d1db" stroke-width="${m*0.004}"/>`).join("")}<path d="${t.d}" fill="#2f47b3" fill-opacity=".22" stroke="#2f47b3" stroke-width="${m*0.01}"/>${mk}</svg>`;}
function openFiche(id){const b0=BIENS.find(x=>x.id===id); if(!b0) return; if(document.getElementById("fichePanel").hidden) FOPENER=document.activeElement; const sf=bienSuf(b0), b=Object.assign({},b0,{vu:sf?vu("v",b0.ville,sf):null}); const r=calcBien(b), x=r.x, g=targetsFor(b), [bc,bt]=bank(x.ratio), c=C.find(v=>v.k===b.ville), t=r.t, lv=priceLevels(b), ph=bienPhoto(b,720,400), V=b.visite||{}, ck=V.check||{};
 const A=ADS[b.ville], sec=t?sectorOf(t):(sf&&findAd("v",b.ville,sf)||[])[1], d=t?demandOf(t):null;
 const rents=A&&sec?A.ads.filter(a=>a[1]===sec).sort((p,q)=>r22(p)-r22(q)).slice(0,5):[], sales=A&&sec?(A.ventes||[]).filter(a=>a[1]===sec&&a[3]!==sf).sort((p,q)=>p[2]/p[0]-q[2]/q[0]).slice(0,5):[], sold=sec?soldList(b.ville,sec).slice(0,3):[];
 const qp=t&&t.price?studioPm2(b.ville,t,b.type||typeFor(b.surface,b.pieces)):null, fg=t?fgPct(t.dpe):null, nd=t?t.dpe.reduce((a,z)=>a+z,0):0;
 const el=document.getElementById("ficheBody");
 el.innerHTML=`<header class="fh">${ph?`<img class="fph" src="${esc(ph)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:""}<div class="fht"><h1>${esc(b.titre||"Bien")}</h1><p>${c.name}${b.quartier?" · "+esc(b.quartier):""} · ${b.surface} m² · ${keur(+b.prix)} affiché (${eur(r.pm2)}/m²)${b.dpe?" · DPE "+b.dpe:""}</p><p class="fdate">Fiche du ${new Date().toLocaleDateString("fr-FR")}${b.vu?` · annonce vue pour la première fois le ${new Date(HIST[b.ville].v[sf].f+"T12:00:00").toLocaleDateString("fr-FR")}`:""}</p></div></header>
 <div class="fgrid">
  <div class="fbox"><h2>Les chiffres</h2>
   <div class="trow"><span>Budget tout compris</span><b>${keur(x.cost)}</b></div>
   <div class="trow"><span>Loyer hors charges</span><b>${eur(x.rentHC)}</b></div>
   <div class="trow"><span>Cash-flow net / brut</span><b>${sgn(x.cfNet)} / ${sgn(x.cfBrut)} par mois</b></div>
   <div class="trow"><span>Rendement 15 ans net / brut</span><b>${x.irrNet==null?"n.d.":pct(x.irrNet)} / ${x.irrBrut==null?"n.d.":pct(x.irrBrut)}</b></div>
   <div class="trow"><span>Rendement locatif brut</span><b>${pct(x.brut)}</b></div>
   <div class="trow"><span>Banque</span><b>${bt} (${pct(x.ratio*100,0)})</b></div></div>
  <div class="fbox"><h2>Nos prix pour négocier</h2>${lv?`
   <div class="plv"><div><span>Ouverture</span><b>${keur(lv.ouv)}</b><small>−${fr((1-lv.ouv/lv.pr)*100,0)} %</small></div><div class="tg"><span>Cible</span><b>${keur(lv.cible)}</b><small>−${fr((1-lv.cible/lv.pr)*100,0)} %</small></div><div><span>Maximum</span><b>${keur(lv.max)}</b><small>−${fr((1-lv.max/lv.pr)*100,0)} %</small></div></div>
   <p class="fnote">Cible : le plus bas des deux prix « autofinancé » (${g.cf==null?"—":keur(g.cf)}) et « 7 %/an » (${g.r7==null?"—":keur(g.r7)}). Maximum : le plus haut des deux. Ouverture : 5 % sous la cible.</p>`:`<p>Aucun prix ne permet d'atteindre nos objectifs avec ces réglages.</p>`}</div>
 </div>
 <div class="fbox"><h2>Arguments pour négocier</h2>${(()=>{const a=negoArgs(b,x,g,t); return a.length?`<ol>${a.map(s=>`<li>${s}</li>`).join("")}</ol>`:`<p>Le prix affiché est déjà cohérent avec nos objectifs.</p>`;})()}</div>
 <div class="fbox fq"><h2>Le quartier${t?" : "+esc(t.name):""}</h2><div class="fqgrid">${quartierMap(b,t)}<div>
   ${qp?`<div class="trow"><span>Prix d'un ${tyLow(b.type||typeFor(b.surface,b.pieces))} du quartier</span><b>${eur(qp)}/m²</b></div><div class="trow"><span>Ce bien</span><b>${eur(r.pm2)}/m² (${r.pm2>=qp?"+":"−"}${fr(Math.abs(r.pm2/qp-1)*100,0)} %)</b></div>`:""}
   ${t&&trajOf(t)?trajOf(t).map(o=>`<div class="trow"><span>${MARKTXT[o.k]} (${fr(o.km,1)} km)</span><b>${minTxt(o.foot)} à pied · ${minTxt(o.bike)} à vélo${o.tc!=null?" · "+minTxt(o.tc)+" bus/tram":""}</b></div>`).join(""):d?`<div class="trow"><span>Distance gare, université ou centre</span><b>${fr(d.d,1)} km</b></div>`:""}
   <div class="trow"><span>Mois vides par an retenus</span><b>${fr(r.vac,1)}</b></div>
   ${fg!=null&&nd>=15?`<div class="trow"><span>Petits appartements en DPE F ou G</span><b>${fr(fg,0)} %</b></div>`:""}
   ${t&&poiOf(t)?`<div class="trow"><span>Vie de quartier</span><b>${fr(poiOf(t)[0],1)}/10 · supermarché ${dTxt(Math.min(poiOf(t)[1],poiOf(t)[2]))}</b></div>`:""}
   ${t&&risqOf(t)?`<div class="trow"><span>Risques</span>${risqPills(t)}</div>`:""}
   ${b.vu?`<div class="trow"><span>Annonce en ligne depuis</span><b>${b.vu.days} jours${b.vu.drops?` · ${b.vu.drops} baisse${b.vu.drops>1?"s":""}`:""}</b></div>`:""}</div></div></div>
 ${t&&dvfOf(t)&&dvfOf(t).n?`<div class="fbox"><h2>Studios réellement vendus dans le quartier</h2>${dvfBlock(t)}<p class="fnote">Source : DVF (Cerema), ventes d'un seul appartement du même nombre de pièces, 2023-2025. Prix nets vendeur, hors frais de notaire.</p></div>`:""}
 ${rents.length?`<div class="fbox"><h2>Locations concurrentes${sec?" · secteur « "+esc(sec)+" »":""}</h2><table class="ftab"><thead><tr><th>Surface</th><th>Type</th><th>Loyer CC</th><th>Ramené à ${H.surface} m²</th></tr></thead><tbody>${rents.map(a=>`<tr><td>${String(a[0]).replace(".",",")} m²</td><td>${a[3]?"meublé":"vide"}</td><td>${eur(a[2])}</td><td>${eur(r22(a))}</td></tr>`).join("")}</tbody></table><p class="fnote">Notre calcul retient ${eur(x.rentHC+H.chLoc)} charges comprises pour ce bien. Loyers demandés, pas forcément signés.</p></div>`:""}
 ${sales.length||sold.length?`<div class="fbox"><h2>Ventes comparables${sec?" · secteur « "+esc(sec)+" »":""}</h2><table class="ftab"><thead><tr><th>Surface</th><th>Prix</th><th>€/m²</th><th>État</th></tr></thead><tbody>${sales.map(a=>`<tr><td>${String(a[0]).replace(".",",")} m²</td><td>${keur(a[2])}</td><td>${eur(a[2]/a[0])}</td><td>en vente</td></tr>`).join("")}${sold.map(({e})=>{const p=e.p[e.p.length-1][1]; return `<tr><td>${String(e.m[0]).replace(".",",")} m²</td><td>${keur(p)}</td><td>${eur(p/e.m[0])}</td><td>parti le ${dm(e.g)}</td></tr>`;}).join("")}</tbody></table></div>`:""}
 <div class="fbox fbreak"><h2>Checklist de visite</h2>${CHECK.map(([gt,items])=>`<h3>${gt}</h3><ul class="fcheck">${items.map(([k,l])=>`<li><span class="cb${ck[k]==="oui"?" ok":ck[k]==="non"?" ko":""}">${ck[k]==="oui"?"✓":ck[k]==="non"?"✗":""}</span>${l}</li>`).join("")}</ul>`).join("")}</div>
 <div class="fbox"><h2>Questions à poser</h2><ol>${agentQuestions(b).map(q=>`<li>${esc(q)}</li>`).join("")}</ol></div>
 <div class="fbox"><h2>Notes</h2><div class="flines"><span></span><span></span><span></span><span></span><span></span><span></span></div></div>
 <p class="fsrc">Estimations calculées par « Où acheter notre studio ? » avec nos réglages (apport ${eur(H.apport)}, taux ${pct(H.taux,2)} sur ${H.duree} ans, ${REG[x.regime]}). Pas un conseil financier.</p>`;
 document.getElementById("fichePanel").hidden=false; document.body.classList.add("noscroll","fiche-on"); document.getElementById("fichePanel").scrollTop=0;}
function closeFiche(){const op=FOPENER; FOPENER=null; setTimeout(()=>{if(op&&op.isConnected) try{op.focus();}catch(_){}},0); document.getElementById("fichePanel").hidden=true; document.body.classList.remove("fiche-on"); if(!VISIT) document.body.classList.remove("noscroll");}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest(".fclose,.fprint"); if(!t) return; if(t.classList.contains("fclose")) closeFiche(); else {try{window.print();}catch(_){} setTimeout(()=>toast("Si rien ne s'ouvre (version Claude), utilisez la page GitHub pour imprimer ou enregistrer en PDF."),400);}});
addEventListener("keydown",e=>{if(e.key==="Escape"&&!document.getElementById("fichePanel").hidden){e.stopImmediatePropagation(); closeFiche();}},true);

/* fenêtres (visite, fiche à emporter) : la touche Tab reste dans la fenêtre du dessus */
addEventListener("keydown",e=>{if(e.key!=="Tab") return; const top=["fichePanel","visitPanel"].map(i=>document.getElementById(i)).find(d=>d&&!d.hidden); if(!top) return;
 const f=[...top.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,summary,[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null); if(!f.length) return;
 const a=f[0], z=f[f.length-1], cur=document.activeElement;
 if(!top.contains(cur)){e.preventDefault(); a.focus();} else if(e.shiftKey&&cur===a){e.preventDefault(); z.focus();} else if(!e.shiftKey&&cur===z){e.preventDefault(); a.focus();}},true);
