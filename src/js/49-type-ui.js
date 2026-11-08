/* ---------- choix du type de bien (ordinateur et téléphone) ---------- */
function typeSeg(){return `<span class="seg2 typeseg" role="group" aria-label="Type de bien">${Object.entries(TYPES).map(([k,T])=>`<button type="button" data-type="${k}" aria-pressed="${H.type===k}" title="${esc(T.un)}">${T.lab}</button>`).join("")}</span>`;}
function setType(k,quiet){if(!TYPES[k]) k="studio"; Object.assign(H,{type:k},typeVals(k));
 ["surface","meubles","travaux","copro"].forEach(f=>{const el=document.getElementById("f-"+f); if(el) el.value=H[f];});
 try{localStorage.setItem("type",k);}catch(_){}
 if(typeof RBL!=="undefined") RBL.clear(); if(typeof VC!=="undefined") VC.clear(); if(typeof QBOXK!=="undefined") QBOXK=null;
 document.querySelectorAll("[data-type]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.type===k)));
 const n=document.getElementById("typeNote"); if(n) n.textContent=`${TYPES[k].un[0].toUpperCase()+TYPES[k].un.slice(1)} · ${H.surface} m² · meubles ${eur(H.meubles)} · travaux ${eur(H.travaux)} · copro ${eur(H.copro)}/mois.`;
 const ht=document.getElementById("heroTxt"); if(ht) ht.textContent=`Le même ${tyLow(k)} meublé de ${H.surface} m², ${eur(H.apport)} d'apport et le même crédit, simulé dans ${C.length} villes de l'Ouest avec leurs prix de vente réels, leurs loyers et leur taxe foncière. Clique une ville sur la carte, le graphique ou le classement : tout se met à jour.`;
 if(!quiet) render();}
(function(){const row=document.querySelector("header .hrow"); if(row) row.insertAdjacentHTML("afterend",`<div class="typerow"><span class="lab">Type de bien</span>${typeSeg()}<small id="typeNote" class="sub"></small></div>`);
 let k="studio"; try{k=localStorage.getItem("type")||"studio";}catch(_){} setType(k,true);})();
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-type]"); if(!b) return; e.preventDefault(); setType(b.dataset.type); if(typeof mBudgetRender==="function") mBudgetRender();});
