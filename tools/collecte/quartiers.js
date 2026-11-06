/* Trajets, risques et commerces par quartier : même règle pour toutes les villes.
   À exécuter dans la page publique de l'app (IR, irisLL et REPQ y sont disponibles ; ces API acceptent les appels depuis le navigateur).
   Point de départ : le centre de la plus grande partie du quartier (comme écoles, urbanisme et quartiers prioritaires).
   - trajets (tous les quartiers) : OSRM (routing.openstreetmap.de), à pied et à vélo, vers chaque repère de data/reperes.json
       → data/temps-trajets.json : {ville:{marks, foot:{code:[min]}, bike:{code:[min]}, dist:{code:[km à pied]}}}
   - risques (quartiers d'habitat) : Géorisques au centre du quartier
       a : retrait-gonflement des argiles (0 à 3) · t : dans une zone inondable cartographiée d'un TRI · s : secteurs d'information sur les sols à 300 m
       v : site Seveso à 500 m · c : anciens sites industriels (CASIAS) à 300 m        → data/risques-quartiers.json
   - commerces (quartiers d'habitat) : OpenStreetMap (Overpass), distance à vol d'oiseau du centre du quartier
       [note, supermarché, supérette, boulangerie, pharmacie, cafés-restos-bars à 500 m, laverie, salle de sport] (9999 : rien à 1,2 km)
       note /10 : supermarché ou supérette ×3, boulangerie ×1,5, pharmacie ×1, laverie ×1, salle de sport ×0,5 (plein à 250 m, zéro à 1,2 km)
       et cafés-restos-bars ×2 (plein à 10)                                              → data/commerces.json */
async function collecteQuartiers(VILLES,QUOI){QUOI=QUOI||["trajets","risques","commerces"];
 const hv=(a,b,c,d)=>{const R=6371000,r=Math.PI/180,x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
 const cen=ring=>{let la=0,lo=0;ring.forEach(p=>{la+=p[0];lo+=p[1];});return [la/ring.length,lo/ring.length];};
 const J=async(u,n=3)=>{for(let k=0;k<n;k++){try{const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),60000);const r=await fetch(u,{signal:ac.signal});clearTimeout(tm);if(r.ok) return await r.json();}catch(e){} await new Promise(r=>setTimeout(r,3000*(k+1)));} return null;};
 const out={trajets:{},risques:{},commerces:{}};
 for(const ck of VILLES){const ll=irisLL(ck), Q=IR[ck].list.map(t=>{const r=ll[t.i]&&ll[t.i].length?ll[t.i].reduce((a,b)=>b.length>a.length?b:a):null; return r?{t,p:cen(r)}:null;}).filter(Boolean);
  if(QUOI.includes("trajets")&&REPQ[ck]){const M=Object.entries(REPQ[ck]), o={marks:M.map(m=>m[0]),foot:{},bike:{},dist:{}};
   for(const [mode,key] of [["foot","foot"],["bike","bike"]]) for(let i=0;i<Q.length;i+=40){const S=Q.slice(i,i+40), pts=[...S.map(q=>q.p),...M.map(m=>m[1])].map(([la,lo])=>lo.toFixed(5)+","+la.toFixed(5)).join(";");
    const j=await J(`https://routing.openstreetmap.de/routed-${mode}/table/v1/driving/${pts}?sources=${S.map((_,k)=>k).join(";")}&destinations=${M.map((_,k)=>S.length+k).join(";")}&annotations=duration,distance`);
    if(!j) continue; S.forEach((q,k)=>{o[key][q.t.code]=j.durations[k].map(s=>Math.max(1,Math.round(s/60))); if(mode==="foot") o.dist[q.t.code]=j.distances[k].map(m=>Math.round(m/10)/100);});}
   out.trajets[ck]=o;}
  const H=Q.filter(q=>q.t.type==="H");
  if(QUOI.includes("risques")){const o={}, G=p=>J("https://www.georisques.gouv.fr/api/v1/"+p);
   for(const {t,p:[la,lo]} of H){const L=`latlon=${lo},${la}`, [rga,tz,sis,cas,ic]=await Promise.all([G("rga?"+L),G("tri_zonage?"+L),G(`ssp/conclusions_sis?${L}&rayon=300&page_size=1`),G(`ssp/casias?${L}&rayon=300&page_size=1`),G(`installations_classees?${L}&rayon=500&page_size=100`)]);
    const r={}, a=rga&&+rga.codeExposition||0; if(a) r.a=a; if(tz&&tz.results) r.t=1; if(sis&&sis.results) r.s=sis.results; if(ic&&(ic.data||[]).some(x=>/seveso/i.test(x.statutSeveso||""))) r.v=1; if(cas&&cas.results) r.c=cas.results; o[t.code]=r;}
   out.risques[ck]=o;}
  if(QUOI.includes("commerces")&&H.length){const la0=Math.min(...H.map(q=>q.p[0]))-0.012, la1=Math.max(...H.map(q=>q.p[0]))+0.012, lo0=Math.min(...H.map(q=>q.p[1]))-0.018, lo1=Math.max(...H.map(q=>q.p[1]))+0.018, bb=`(${la0},${lo0},${la1},${lo1})`;
   const sel=["shop=supermarket","shop=convenience","shop=bakery","amenity=pharmacy","amenity~\"^(cafe|restaurant|bar|pub)$\"","shop=laundry","leisure=fitness_centre"];
   const q=`[out:json][timeout:90];(${sel.map(s=>`nwr[${s}]${bb};`).join("")});out center;`;
   let j=null; for(const u of ["https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter","https://maps.mail.ru/osm/tools/overpass/api/interpreter"]){j=await J(u+"?data="+encodeURIComponent(q),2); if(j) break;}
   if(j){const E=j.elements.map(e=>({la:e.lat??(e.center&&e.center.lat),lo:e.lon??(e.center&&e.center.lon),g:e.tags||{}})).filter(e=>e.la), cat=[g=>g.shop==="supermarket",g=>g.shop==="convenience",g=>g.shop==="bakery",g=>g.amenity==="pharmacy",g=>/^(cafe|restaurant|bar|pub)$/.test(g.amenity||""),g=>g.shop==="laundry",g=>g.leisure==="fitness_centre"].map(f=>E.filter(e=>f(e.g)));
    const o={}, sc=d=>d<=250?1:d>=1200?0:(1200-d)/950;
    H.forEach(({t,p:[la,lo]})=>{const d=cat.map(L=>{const m=L.length?Math.min(...L.map(e=>hv(la,lo,e.la,e.lo))):1e9; return m>1200?9999:Math.round(m);}), n=cat[4].filter(e=>hv(la,lo,e.la,e.lo)<=500).length;
     const s=3*sc(Math.min(d[0],d[1]))+1.5*sc(d[2])+sc(d[3])+sc(d[5])+0.5*sc(d[6])+2*Math.min(1,n/10); o[t.code]=[Math.round(s/9*100)/10,d[0],d[1],d[2],d[3],n,d[5],d[6]];});
    out.commerces[ck]=o;}}}
 return out;}
