/* ---------- type de bien choisi (studio, T2, T3) : gardé d'une ouverture à l'autre ---------- */
function setType(k,quiet){if(!TYPES[k]) k="studio"; Object.assign(H,{type:k},typeVals(k));
 try{localStorage.setItem("type",k);}catch(_){}
 if(typeof RBL!=="undefined") RBL.clear(); if(typeof VC!=="undefined") VC.clear(); if(typeof QBOXK!=="undefined") QBOXK=null;
 if(quiet) return; document.querySelectorAll("[data-type]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.type===k)));
 render();}
(function(){let k="studio"; try{k=localStorage.getItem("type")||"studio";}catch(_){} setType(k,true);})();
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-type]"); if(!b) return; e.preventDefault(); setType(b.dataset.type);});
