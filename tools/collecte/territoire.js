/* Écoles et campus, catastrophes naturelles, zone du PLU et quartiers prioritaires : même règle pour toutes les villes.
   À exécuter dans la page publique de l'app (IR, irisLL et C y sont disponibles ; ces API acceptent les appels depuis le navigateur).
   Sortie : le contenu de data/territoire.json. */
async function collecteTerritoire(VILLES){
 const hv=(a,b,c,d)=>{const R=6371000,r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
 const cen=ring=>{let la=0,lo=0;ring.forEach(p=>{la+=p[0];lo+=p[1];});return [la/ring.length,lo/ring.length];};
 const inR=(p,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if(((yi>p[1])!==(yj>p[1]))&&(p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi))c=!c;}return c;};
 const centres=ck=>{const ll=irisLL(ck), o={}; IR[ck].list.forEach(t=>{const r=ll[t.i]; if(r&&r.length) o[t.code]=cen(r.reduce((a,b)=>b.length>a.length?b:a));}); return o;};
 /* règle « lieu d'enseignement supérieur » : implantations publiques, hors services (bibliothèque, médecine préventive, formation continue…) */
 const BAD=/SERVICE|BIBLIOTH|DOCUMENTATION|COMMUNAUT|PRIMAIRE|CARRE INTERNATIONAL|DIRECTION|SUIO|PREVENTIVE|PRÉVENTIVE|RECHERCHE SUR|^OBS |AFFAIRES INTERNATIONALES|CENTRE DE SANT|^UNIVERSIT|FORMATION CONTINUE|FORM CONTINUE|ÉDUCATION PERMANENTE|^ANNEXE|DPT MGT|COLLEGIUM|CENTRE DE FORMATION AUX/i;
 const out={date:new Date().toISOString().slice(0,10),ecoles:{q:{},n:{},sup:{}},catnat:{},urba:{},qpv:{}};
 const QPVURL="https://opendata.caissedesdepots.fr/api/explore/v2.1/catalog/datasets/quartiers-prioritaires-de-la-politique-de-la-ville-au-1er-janvier-2024/exports/json";
 for(const [ck,ins] of Object.entries(VILLES)){const c=C.find(v=>v.k===ck), g=`GEOM'POINT(${c.lon} ${c.lat})'`;
  /* catastrophes naturelles (toute la commune) */
  let all=[],p=1,tp=1; do{const j=await (await fetch(`https://www.georisques.gouv.fr/api/v1/gaspar/catnat?code_insee=${ins}&page_size=100&page=${p}`)).json(); all=all.concat(j.data||[]); tp=j.total_pages||1; p++;}while(p<=tp&&p<6);
  const L=all.map(a=>{const [d,m,y]=a.date_debut_evt.split("/"); return [y+"-"+m+"-"+d,a.libelle_risque_jo];}).sort((a,b)=>b[0].localeCompare(a[0])), ty={};
  L.filter(a=>a[0]>="2000").forEach(a=>{ty[a[1]]=(ty[a[1]]||0)+1;});
  out.catnat[ck]={n:L.length,n2000:L.filter(a=>a[0]>="2000").length,ty,last:L.slice(0,3)};
  if(typeof IR==="undefined"||!IR[ck]) continue;   /* le reste est par quartier */
  const Q=centres(ck);
  /* écoles (9 km autour du centre) et supérieur public */
  const ed=await (await fetch(`https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/exports/json?select=type_etablissement,latitude,longitude,post_bac&where=${encodeURIComponent(`within_distance(position, ${g}, 9km) and etat="OUVERT"`)}`)).json();
  const su=await (await fetch(`https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-implantations_etablissements_d_enseignement_superieur_publics/exports/json?select=implantation_lib,coordonnees,effectif&where=${encodeURIComponent(`within_distance(coordonnees, ${g}, 9km)`)}`)).json();
  const E=ed.filter(e=>e.latitude), sch=E.filter(e=>/cole/.test(e.type_etablissement)), col=E.filter(e=>e.type_etablissement==="Collège"), ly=E.filter(e=>/Lyc/.test(e.type_etablissement)), pb=ly.filter(e=>e.post_bac==="1"||e.post_bac===1);
  const S=su.filter(s=>s.coordonnees&&!BAD.test(s.implantation_lib)).map(s=>({n:s.implantation_lib,lat:s.coordonnees.lat,lon:s.coordonnees.lon,e:s.effectif||0}));
  out.ecoles.n[ck]={ecoles:sch.length,colleges:col.length,lycees:ly.length,postbac:pb.length,sup:S.length}; out.ecoles.sup[ck]=S.map(s=>[s.n,s.e]); out.ecoles.q[ck]={};
  const near=(la,lo,L)=>L.length?Math.round(Math.min(...L.map(e=>hv(la,lo,e.latitude,e.longitude)))):99999;
  for(const [code,[la,lo]] of Object.entries(Q)){const ds=S.map((s,i)=>[hv(la,lo,s.lat,s.lon),i]).sort((a,b)=>a[0]-b[0]), w=ds.filter(d=>d[0]<=1500);
   out.ecoles.q[ck][code]=[near(la,lo,sch),near(la,lo,col),near(la,lo,ly),near(la,lo,pb),w.length,w.reduce((a,d)=>a+S[d[1]].e,0),ds.length?Math.round(ds[0][0]):99999,ds.length?ds[0][1]:-1];}
  /* zone du PLU au centre de chaque quartier (Géoportail de l'urbanisme) */
  const Z=[],idx={},uq={};
  for(const [code,[la,lo]] of Object.entries(Q)){let f=null; for(let k=0;k<3&&!f;k++){try{const j=await (await fetch(`https://apicarto.ign.fr/api/gpu/zone-urba?geom=${encodeURIComponent(JSON.stringify({type:"Point",coordinates:[+lo.toFixed(6),+la.toFixed(6)]}))}`)).json(); f=(j.features||[])[0]||false;}catch(_){await new Promise(r=>setTimeout(r,800));}}
   if(!f){uq[code]=-1; continue;} const v=[f.properties.libelle,f.properties.typezone,(f.properties.libelong||"").replace(/\s+/g," ").slice(0,90)], key=v.join("|"); if(idx[key]==null){idx[key]=Z.length; Z.push(v);} uq[code]=idx[key];}
  out.urba[ck]={z:Z,q:uq};
  /* quartiers prioritaires 2024 : dedans (0) ou distance au plus proche */
  const P=(await (await fetch(QPVURL+`?where=${encodeURIComponent(`within_distance(geo_point_2d, ${g}, 10km)`)}`)).json()).map(f=>{const gg=f.geo_shape.geometry||f.geo_shape; return {n:f.nom_quartier,polys:gg.type==="Polygon"?[gg.coordinates]:gg.coordinates};});
  const qq={}; for(const [code,[la,lo]] of Object.entries(Q)){let best=[1e9,-1]; P.forEach((pq,i)=>pq.polys.forEach(poly=>{if(inR([lo,la],poly[0])) best=[0,i]; else poly[0].forEach(v=>{const d=hv(la,lo,v[1],v[0]); if(d<best[0]) best=[d,i];});})); qq[code]=best[1]>=0?[Math.round(best[0]),best[1]]:null;}
  out.qpv[ck]={names:P.map(p=>p.n),q:qq};}
 return out;}
