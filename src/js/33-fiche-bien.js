/* ---------- fiche complète d'un de nos biens (panneau de droite / feuille du bas) ---------- */
function bienSuf(b){return (b.url||"").startsWith(VTURL)?b.url.slice(VTURL.length).split("?")[0]:null;}
function bienPhoto(b,w,h){const s=bienSuf(b); if(!s) return ""; const a=findAd("v",b.ville,s); const p=a?a[4]:(HIST[b.ville]&&HIST[b.ville].v&&HIST[b.ville].v[s]?HIST[b.ville].v[s].m[2]:""); return p?photoUrl(s,p,w,h):"";}

/* retirer / remettre dans la shortlist (sans changer le statut) */
document.addEventListener("click",e=>{const u=e.target.closest&&e.target.closest("[data-unshort],[data-reshort]"); if(!u) return; e.preventDefault();
 const id=u.dataset.unshort||u.dataset.reshort, b=BIENS.find(x=>x.id===id); if(!b) return;
 const prev=b.statut||"à voir";
 if(u.dataset.unshort){retirer(b); return;}
 else {updBien(id,{statut:prev==="écarté"?"à voir":prev,short:true}); toast("Suivi à nouveau : il est dans Nos biens.");}});
const isOut=b=>b.statut==="écarté"||b.short===false;
/* retirer de la shortlist : un bien venu d'une annonce est caché (l'annonce revient dans la liste, et ses notes reviennent si on la rajoute) ;
   un bien saisi à la main, qui n'a pas d'annonce où revenir, est supprimé. Les deux s'annulent depuis le message. */
async function retirer(b){const prev=b.statut||"à voir", t=b.titre||"Bien";
 if(b.url){await updBien(b.id,{statut:"écarté",short:true}); toast(`« ${t} » retiré : l'annonce revient dans la liste des annonces.`,{label:"Annuler",fn:()=>updBien(b.id,{statut:prev})}); return;}
 const keep={...b}; delete keep.id;
 try{await DB.collection("biens").doc(b.id).delete(); toast(`« ${t} » supprimé.`,{label:"Annuler",fn:async()=>{try{await DB.collection("biens").add(keep); toast("Bien restauré.");}catch(_){toast("Restauration impossible.");}}});}catch(err){toast("Suppression refusée ("+(err&&err.code||"erreur")+").");}}
