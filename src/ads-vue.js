/* annonces du type choisi : ADSRAW[ville] = {ads, ventes (studios), map, t:{t2:{ads, ventes}, t3:{...}}} ; ADS[ville] = la vue du type courant (même forme pour tous les types) */
/* chambres en colocation (d'après la fiche de l'annonce) écartées des loyers de comparaison */
function adsPrep(){Object.values(ADSRAW).forEach(v=>{if(!v||typeof v!=="object"||!v.map) return; const keep=L=>(L||[]).filter(a=>!(FICX[String(a[4]||"").split("/").pop()]||{}).coloc);
 if(v.ads) v.ads=keep(v.ads); if(v.t) Object.values(v.t).forEach(x=>{if(x&&x.ads) x.ads=keep(x.ads);});});}
adsPrep();
const ADSV={};
const ADS=new Proxy(ADSRAW,{get(o,k){const v=o[k]; if(!v||typeof v!=="object"||!v.map) return v; const ty=H.type||"studio"; if(ty==="studio") return v;
 const key=k+"|"+ty; if(!ADSV[key]){const x=v.t&&v.t[ty]||{}; ADSV[key]={map:v.map,ads:x.ads||[],ventes:x.ventes||[]};} return ADSV[key];}});

/* loyer de la ville recalé sur les annonces de location : par ville et par type, médiane de (loyer demandé ÷ loyer du modèle à la même surface)
   dès 15 annonces (colocations exclues), bornée 0,7–1,2 ; une ville sans annonces prend la médiane des villes relevées.
   Le calcul suppose un meublé : une location vide compte pour son loyer × l'écart meublé / vide du type
   (médiane, sur les villes qui ont au moins 5 annonces de chaque, du rapport des deux médianes ; 1,1 à défaut). */
let LRC={};
function loyerRecal(){const out={}, med=a=>{const b=[...a].sort((x,y)=>x-y), m=b.length>>1; return b.length?(b.length%2?b[m]:(b[m-1]+b[m])/2):null;};
 for(const ty of ["studio","t2","t3"]){const T=tyOf(ty), v={}, n={}, R={};
  Object.entries(ADSRAW).forEach(([ck,V])=>{if(!V||typeof V!=="object"||!V.map) return; const c=C.find(x=>x.k===ck); if(!c) return; const L=ty==="studio"?V.ads:((V.t||{})[ty]||{}).ads;
   R[ck]=(L||[]).filter(a=>a[0]>0&&a[2]>0).map(a=>[!!a[3],a[2]/(c.rent*Math.pow(T.surf/c.rentM2,rentExp(ck))*Math.pow(a[0]/T.surf,expT(ty)))]);});
  const pm=[]; Object.values(R).forEach(r=>{const m=r.filter(x=>x[0]).map(x=>x[1]), w=r.filter(x=>!x[0]).map(x=>x[1]); if(m.length>=5&&w.length>=5) pm.push(med(m)/med(w));});
  const prime=pm.length?Math.round(med(pm)*1000)/1000:1.1;
  Object.entries(R).forEach(([ck,r])=>{if(r.length>=15){v[ck]=Math.round(Math.min(1.2,Math.max(0.7,med(r.map(x=>x[0]?x[1]:x[1]*prime))))*1000)/1000; n[ck]=r.length;}});
  const all=Object.values(v); out[ty]={v,n,prime,tous:all.length?Math.round(med(all)*1000)/1000:1};}
 /* page publique sans annonces : facteurs calculés au build (LRC0) */
 if(!Object.values(out).some(o=>Object.keys(o.v).length)&&typeof LRC0!=="undefined") Object.assign(out,LRC0);
 LRC=out; if(typeof CALCC!=="undefined") CALCC.clear();}
loyerRecal();
