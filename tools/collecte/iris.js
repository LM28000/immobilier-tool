/* Contours des quartiers IRIS (IGN) et DPE des petits appartements (ADEME), même règle pour toutes les villes.
   À exécuter dans la page publique de l'app (ces API acceptent les appels depuis le navigateur).
   Contours : IRIS de la commune, coordonnées arrondies au 1/10 000 de degré, simplifiées à 2,5 unités (≈ 25 m, Douglas-Peucker).
   DPE : appartements de 30 m² ou moins (base DPE depuis 2021), rattachés au quartier par leur adresse.
   Sortie : {ville:{txt, dpe:{code:[A,B,C,D,E,F,G]}}} → python3 tools/iris_fusion.py sortie.json */
async function collecteIris(VILLES){
 const l93=(x,y)=>{const n=0.7256077650,c=11754255.426,xs=700000,ys=12655612.050,e=0.08181919104281579,l0=3*Math.PI/180;const dx=x-xs,dy=y-ys,R=Math.hypot(dx,dy),g=Math.atan2(dx,-dy),lon=l0+g/n,L=-Math.log(Math.abs(R/c))/n;let p=2*Math.atan(Math.exp(L))-Math.PI/2;for(let i=0;i<10;i++){const es=e*Math.sin(p);p=2*Math.atan(Math.pow((1+es)/(1-es),e/2)*Math.exp(L))-Math.PI/2;}return [p*180/Math.PI,lon*180/Math.PI];};
 const dp=(P,eps)=>{if(P.length<4) return P;const keep=new Uint8Array(P.length);keep[0]=keep[P.length-1]=1;const st=[[0,P.length-1]];while(st.length){const [a,b]=st.pop();let md=0,mi=-1;const [ax,ay]=P[a],[bx,by]=P[b],L=Math.hypot(bx-ax,by-ay);for(let i=a+1;i<b;i++){const d=L?Math.abs((bx-ax)*(ay-P[i][1])-(ax-P[i][0])*(by-ay))/L:Math.hypot(P[i][0]-ax,P[i][1]-ay);if(d>md){md=d;mi=i;}}if(md>eps){keep[mi]=1;st.push([a,mi],[mi,b]);}}return P.filter((_,i)=>keep[i]);};
 const inR=(la,lo,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if(((yi>la)!==(yj>la))&&(lo<(xj-xi)*(la-yi)/(yj-yi)+xi))c=!c;}return c;};
 const out={};
 for(const [ck,ins] of Object.entries(VILLES)){
  const F=(await (await fetch("https://data.geopf.fr/wfs/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=STATISTICALUNITS.IRISGE:iris_ge&outputFormat=application/json&count=500&cql_filter="+encodeURIComponent(`code_insee='${ins}'`))).json()).features;
  const polys=[], lines=[];
  F.forEach(f=>{const p=f.properties, M=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates, outer=M.map(pg=>pg[0]); polys.push({code:p.iris,rings:outer});
   const enc=outer.map(r=>{let P=r.map(([lo,la])=>[Math.round(lo*1e4),Math.round(la*1e4)]); P=P.filter((q,i)=>!i||q[0]!==P[i-1][0]||q[1]!==P[i-1][1]); while(P.length>1&&P[0][0]===P[P.length-1][0]&&P[0][1]===P[P.length-1][1]) P.pop(); P.push(P[0]); P=dp(P,2.5); P.pop(); return P;}).filter(P=>P.length>=3);
   lines.push([p.nom_iris,p.iris,p.type_iris,enc.map(P=>{let X=0,Y=0;return P.map(([x,y])=>{const o=(x-X)+","+(y-Y);X=x;Y=y;return o;}).join(" ");}).join(";")].join("|"));});
  const dpe={}; let url="https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines?size=10000&select=etiquette_dpe,coordonnee_cartographique_x_ban,coordonnee_cartographique_y_ban&qs="+encodeURIComponent(`code_insee_ban:"${ins}" AND type_batiment:"appartement" AND surface_habitable_logement:<=30`), k=0;
  while(url&&k++<30){const j=await (await fetch(url)).json(); (j.results||[]).forEach(r=>{const L="ABCDEFG".indexOf(r.etiquette_dpe); if(L<0||!r.coordonnee_cartographique_x_ban) return; const [la,lo]=l93(r.coordonnee_cartographique_x_ban,r.coordonnee_cartographique_y_ban); const pg=polys.find(q=>q.rings.some(rg=>inR(la,lo,rg))); if(pg) (dpe[pg.code]=dpe[pg.code]||[0,0,0,0,0,0,0])[L]++;}); url=j.results&&j.results.length?j.next:null;}
  out[ck]={txt:lines.join("\n"),dpe};}
 return out;}
