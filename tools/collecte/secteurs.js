/* Secteurs Bien'ici → quartiers IRIS, déduits des positions lues dans les fiches des annonces : même règle pour toutes les villes.
   À exécuter dans la page de test (dist/test.html : annonces et fiches incluses ; IR et irisLL y sont disponibles).
   Règle : un secteur couvre les quartiers IRIS où se trouve au moins une de ses annonces (ventes et locations, tous types) dont la fiche donne la position.
   Sert aux annonces dont la fiche n'est pas encore lue et aux loyers des locations par quartier.
   Sortie : {ville:{secteur:[codes IRIS]}} → à fusionner dans data/secteurs-nouvelles-villes.json (sans écraser les villes déjà présentes). */
function collecteSecteurs(VILLES){
 const inRing=(p,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [yi,xi]=r[i],[yj,xj]=r[j];if(((yi>p[0])!==(yj>p[0]))&&(p[1]<(xj-xi)*(p[0]-yi)/(yj-yi)+xi))c=!c;}return c;};
 const rings=g=>Array.isArray(g&&g[0]&&g[0][0])?g:[g];
 const out={};
 for(const ck of VILLES){const A=ADSRAW[ck]; if(!A||!IR[ck]) continue; const ll=irisLL(ck), o={};
  const where=(la,lo)=>{const t=IR[ck].list.find(t=>ll[t.i]&&rings(ll[t.i]).some(r=>inRing([la,lo],r))); return t?t.code:null;};
  const lists=[[A.ventes,3],[A.ads,4],...["t2","t3"].flatMap(ty=>A.t&&A.t[ty]?[[A.t[ty].ventes,3],[A.t[ty].ads,4]]:[])];
  lists.forEach(([L,col])=>(L||[]).forEach(a=>{const sec=a[1]; if(!sec) return; const f=ficx(String(a[col]||"")); if(!f||!f.la) return;
   const code=where(f.la,f.lo); if(code) (o[sec]=o[sec]||new Set()).add(code);}));
  out[ck]=Object.fromEntries(Object.entries(o).map(([s,v])=>[s,[...v].sort()]));}
 return out;}
