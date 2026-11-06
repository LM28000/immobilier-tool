/* Repères de chaque ville, même règle partout. À exécuter dans la page publique de l'app (C y est disponible).
   gare   : la gare de voyageurs de la commune la plus fréquentée (SNCF, fréquentation annuelle)
   campus : sites du supérieur public à moins de 8 km du centre, regroupés à 800 m ; on garde les groupes
            d'au moins 1 500 inscrits et d'au moins un quart du plus gros (3 au plus) ; à défaut, le plus gros
   centre : la mairie principale de la commune (lieux de l'IGN, catégorie « mairie », hors mairies annexes ou déléguées)
   Sortie : {ville:{gare:[lat,lon], univ:[lat,lon], univ2:…, centre:[lat,lon]}} */
async function collecteReperes(VILLES){
 const hv=(a,b,c,d)=>{const R=6371000,r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
 const BAD=/SERVICE|BIBLIOTH|DOCUMENTATION|COMMUNAUT|PRIMAIRE|CARRE INTERNATIONAL|DIRECTION|SUIO|PREVENTIVE|PRÉVENTIVE|RECHERCHE SUR|^OBS |AFFAIRES INTERNATIONALES|CENTRE DE SANT|FORMATION CONTINUE|FORM CONTINUE|ÉDUCATION PERMANENTE|DPT MGT|CENTRE DE FORMATION AUX/i;
 const SN="https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/", J=async u=>(await fetch(u)).json(), r5=v=>+(+v).toFixed(5), out={}, info={};
 for(const [ck,ins] of Object.entries(VILLES)){const c=C.find(v=>v.k===ck), o={}, I={};
  /* gare */
  const G=(await J(SN+`gares-de-voyageurs/records?limit=50&where=${encodeURIComponent(`codeinsee="${ins}"`)}`)).results||[];
  if(G.length){const F=(await J(SN+`frequentation-gares/records?limit=50&where=${encodeURIComponent(G.map(g=>`code_uic_complet="${g.codes_uic}"`).join(" or "))}`)).results||[];
   const fq=u=>{const f=F.find(x=>x.code_uic_complet===u); return f?Math.max(f.total_voyageurs_2024||0,f.total_voyageurs_2023||0):0;};
   const g=G.map(g=>({g,n:fq(g.codes_uic)})).sort((a,b)=>b.n-a.n)[0].g; o.gare=[r5(g.position_geographique.lat),r5(g.position_geographique.lon)]; I.gare=g.nom;}
  /* campus */
  const S=((await J(`https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-implantations_etablissements_d_enseignement_superieur_publics/exports/json?select=implantation_lib,coordonnees,effectif&where=${encodeURIComponent(`within_distance(coordonnees, GEOM'POINT(${c.lon} ${c.lat})', 8km)`)}`))||[]).filter(s=>s.coordonnees&&!BAD.test(s.implantation_lib)).map(s=>({n:s.implantation_lib,lat:s.coordonnees.lat,lon:s.coordonnees.lon,e:s.effectif||0}));
  const K=[]; S.sort((a,b)=>b.e-a.e).forEach(s=>{const k=K.find(k=>hv(k.lat,k.lon,s.lat,s.lon)<=800); if(k){k.e+=s.e; k.m.push(s);} else K.push({lat:s.lat,lon:s.lon,e:s.e,m:[s]});});
  K.forEach(k=>{const w=k.m.reduce((a,s)=>a+(s.e||1),0); k.lat=k.m.reduce((a,s)=>a+s.lat*(s.e||1),0)/w; k.lon=k.m.reduce((a,s)=>a+s.lon*(s.e||1),0)/w;});
  K.sort((a,b)=>b.e-a.e); let keep=K.filter(k=>k.e>=1500&&k.e>=K[0].e/4).slice(0,3); if(!keep.length&&K.length) keep=[K[0]];
  keep.forEach((k,i)=>{o[i?"univ"+(i+1):"univ"]=[r5(k.lat),r5(k.lon)]; I[i?"univ"+(i+1):"univ"]=`${k.m[0].n} (+${k.m.length-1}) · ${k.e} inscrits`;});
  /* centre = mairie */
  const P=((await J(`https://data.geopf.fr/geocodage/search?q=mairie&index=poi&citycode=${ins}&limit=10`)).features||[]).filter(f=>(f.properties.category||[]).includes("mairie"));
  const m=P.find(f=>!/associ|annexe|délégu|quartier|proximit/i.test([].concat(f.properties.name).join(" ")))||P[0]; if(m){o.centre=[r5(m.geometry.coordinates[1]),r5(m.geometry.coordinates[0])]; I.centre=[].concat(m.properties.name)[0];}
  out[ck]=o; info[ck]=I;}
 return {reperes:out,info};}
