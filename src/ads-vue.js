/* annonces du type choisi : ADSRAW[ville] = {ads, ventes (studios), map, t:{t2:{ads, ventes}, t3:{...}}} ; ADS[ville] = la vue du type courant (même forme pour tous les types) */
const ADSV={};
const ADS=new Proxy(ADSRAW,{get(o,k){const v=o[k]; if(!v||typeof v!=="object"||!v.map) return v; const ty=H.type||"studio"; if(ty==="studio") return v;
 const key=k+"|"+ty; if(!ADSV[key]){const x=v.t&&v.t[ty]||{}; ADSV[key]={map:v.map,ads:x.ads||[],ventes:x.ventes||[]};} return ADSV[key];}});
