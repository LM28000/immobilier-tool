/* annonces du type choisi : ADSRAW[ville] = {ads, ventes (studios), map, t:{t2:{ads, ventes}, t3:{...}}} ; ADS[ville] = la vue du type courant (même forme pour tous les types) */
/* chambres en colocation (d'après la fiche de l'annonce) écartées des loyers de comparaison */
function adsPrep(){Object.values(ADSRAW).forEach(v=>{if(!v||typeof v!=="object"||!v.map) return; const keep=L=>(L||[]).filter(a=>!(FICX[String(a[4]||"").split("/").pop()]||{}).coloc);
 if(v.ads) v.ads=keep(v.ads); if(v.t) Object.values(v.t).forEach(x=>{if(x&&x.ads) x.ads=keep(x.ads);});});}
adsPrep();
const ADSV={};
const ADS=new Proxy(ADSRAW,{get(o,k){const v=o[k]; if(!v||typeof v!=="object"||!v.map) return v; const ty=H.type||"studio"; if(ty==="studio") return v;
 const key=k+"|"+ty; if(!ADSV[key]){const x=v.t&&v.t[ty]||{}; ADSV[key]={map:v.map,ads:x.ads||[],ventes:x.ventes||[]};} return ADSV[key];}});
