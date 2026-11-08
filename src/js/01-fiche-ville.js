/* ---------- carte ---------- */
const MP={lon0:-4.85,lat1:49.8,k:Math.cos(47.7*Math.PI/180)};   /* emprise de data/mapdata.js (tools/archive/mkmap.py) */
const pxy=(lat,lon)=>[(lon-MP.lon0)*MP.k*MAP.S,(MP.lat1-lat)*MAP.S];

const DPE_COL=["#2e8b57","#58b947","#b8d433","#f5e33a","#f4b432","#ec7a2c","#d7262e"];
function dpeBar(d,w){const tot=d.reduce((a,b)=>a+b,0)||1; let x=0, s=`<svg viewBox="0 0 ${w} 16" width="${w}" height="16" style="display:inline-block;vertical-align:middle" role="img" aria-label="Répartition DPE">`;
 d.forEach((v,i)=>{const ww=v/tot*w; if(ww>0){s+=`<rect x="${x}" y="2" width="${ww}" height="12" fill="${DPE_COL[i]}"><title>${"ABCDEFG"[i]} : ${v} (${fr(v/tot*100,0)} %)</title></rect>`; if(ww>13) s+=`<text x="${x+ww/2}" y="11.5" text-anchor="middle" font-size="9" font-weight="700" fill="#1b1b1b">${"ABCDEFG"[i]}</text>`;} x+=ww;});
 return s+`</svg>`;}

/* ---------- risques ---------- */
const RISK={lemans:[0.4,9.5,15.7],angers:[0.6,5.9,15.4],tours:[0.4,11.2,null],poitiers:[0.3,9.2,null],laval:[-0.1,9.3,12.4],orleans:[-0.05,10.3,14.6],chartres:[-0.1,10.9,12.5],
 stnazaire:[1.1,7.1,13.0],rennes:[1.1,6.5,13.8],blois:[0.4,11.6,17.6],caen:[0.6,8.9,15.0],cholet:[0.1,5.9,12.2],laroche:[0.1,6.6,11.3],
 evreux:[0.6,9.5,null],bourges:[-0.1,11.6,null],niort:[0.3,8.0,null],limoges:[-0.3,9.2,null],brest:[0.3,6.5,null],alencon:[-0.2,10.0,null],cherbourg:[-0.2,5.9,null]};  /* population : évolution annuelle 2017-2023, logements vides 2023 (Insee, comparateur de territoires) ; chômage n.d. pour les villes ajoutées */
const fr=(v,d=1)=>v.toFixed(d).replace(".",",");
const rPop=v=>v>=0.5?"p-ok":v>=0?"p-n":"p-warn", rVac=v=>v<7?"p-ok":v<=10?"p-n":"p-warn", rCho=v=>v==null?"p-n":v<13?"p-ok":v<=16?"p-n":"p-warn";

/* ---------- quartiers ---------- */
const Q={
 lemans:{name:"Le Mans",src:"https://realadvisor.fr/fr/prix-m2-immobilier/ville-le-mans",tags:{"Gare":"gare","Leclerc":"gare","Jacobins-République":"centre","Vieux Mans":"centre","Jardin des plantes":"centre","Hôpital-Chanzy":"centre","Tessé":"centre","Sainte-Croix":"bollee","Mutuelles":"bollee","Nationale":"bollee","Cadran":"bollee","Université":"univ"},
  q:{"Ardriers":2186,"Banjan-Croix de Pierre":2056,"Bas de Gazonfier":1716,"Batignolles":1786,"Bellevue":2286,"Boussinière":2122,"Bruyères":1354,"Cadran":2592,"Carnot":1941,"Chasse Royale":2035,"Christ Sauveur":1197,"Circuit":1727,"Cité des Pins":1517,"Clairfontaine":2082,"Courboulay":2263,"Epau":1295,"Epine":3442,"Etangs Chauds":1476,"Fontenelles":1598,"Funay":1311,"Gallière":1793,"Gare":2153,"Glonnières":1794,"Gué Bernisson":1287,"Haut de Gazonfier":1917,"Hôpital-Chanzy":2286,"Jacobins-République":2381,"Jardin des plantes":2187,"Jaurès Bertinière":1966,"Jaurès Crétois":1825,"La Butte":1886,"Leclerc":2225,"Maillets-Isaac":1908,"Marcel Paul":1459,"Maroc":1623,"Meslier":2363,"Michel Ange":1376,"Miroir":2077,"Mission":1845,"Monthéard":1923,"Mutuelles":2169,"Nationale":2018,"Newton":1108,"Oasis":1585,"Olivier Heuzé":1522,"Patis-Saint-Lazare":2043,"Pavoine":1386,"Petit Louvre":1280,"Pontlieue":1384,"Pré":2088,"Riffaudières":1592,"Ronceray":1374,"Sables d'Or":2005,"Sablonnière":1329,"Sablons centre":1385,"Saint-Georges":1556,"Saint-Pavin":1892,"Sainte-Croix":1931,"Sources":1452,"Tessé":2301,"Université":2527,"Vallée Saint-Blaise":2149,"Vert Galant":1524,"Vieux Mans":2391,"Villaret":2114,"Yzeuville":2040,"ZA Nord":1898,"ZA Zone industrielle sud":1609}},
 stnazaire:{name:"Saint-Nazaire",src:"https://realadvisor.fr/fr/prix-m2-immobilier/44600-saint-nazaire",tags:{"Herbins Gare":"gare","Centre Halles":"centre","Hyper Centre":"centre","Hôtel de ville":"centre","Le Port":"centre","Ville Port":"centre","Méan Penhöet":"chantiers","Gavy Océanis":"univ","Saint-Marc Est":"plage","Saint-Marc Ouest":"plage"},
  q:{"Brais":3609,"Centre Halles":2661,"Cité scolaire":2972,"Gambetta":2893,"Gavy Océanis":3418,"Herbins Gare":2624,"Hôtel de ville":3121,"Hyper Centre":2800,"Immaculée Bourg":3232,"Immaculée Campagne":3270,"Jardin des Plantes":3392,"Kerledé":3436,"Landettes-Avalix":2540,"Le Port":3197,"Méan Penhöet":2368,"Parc paysager":3199,"Pertuischaud":2811,"Petit Caporal":2709,"Porcé":3142,"Prézégat-Berthauderie":2833,"Québrais":3189,"Reton-Plaisance":2694,"Richarderie-Côte d'Amour":3190,"Saint-Marc Est":4714,"Saint-Marc Ouest":4630,"Trébale":3046,"Ville ès Martin":3761,"Ville Port":3013,"Villeneuve":2990}}};

function median(a){const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;}

/* loyer de référence de l'État (Carte des loyers), en contrôle du loyer retenu */
function loyEtat(c,x){const T=TY(), big=T.p>=3, src=big?LOYQ&&LOYQ.c3:LOYQ&&LOYQ.c; if(typeof LOYQ==="undefined"||!src||!src[c.k]) return "";
 const s=(LOYQ.sref||[37,72])[big?1:0], et=v=>{const a=big?LOYQ.c3[v.k]:LOYQ.c[v.k][0]; return a*Math.pow(H.surface/s,rentExp(v.k)-1);};
 const per=v=>{const y=calc(v); return (y.rentHC+H.chLoc)/H.surface;}, ours=per(c), rs=C.filter(v=>(big?LOYQ.c3:LOYQ.c)[v.k]).map(v=>per(v)/et(v)).sort((a,b)=>a-b), med=rs[Math.floor(rs.length/2)], r=ours/et(c), d=(r/med-1)*100;
 const verdict=d>7?`plutôt <b>optimiste</b> (+${fr(d,0)} %)`:d<-7?`plutôt <b>prudent</b> (−${fr(-d,0)} %)`:"dans la norme", L=LOYQ.c[c.k];
 return fRows([["Référence de l'État",`<b class="mono">${fr(et(c),1)} €/m²</b> CC`,`${big?"3 pièces et plus":"1-2 pièces"}, ramené à ${H.surface} m² (carte des loyers 2025${big?"":`, ${L[3].toLocaleString("fr-FR")} annonces`})`],["Notre calcul",`<b class="mono">${fr(ours,1)} €/m²</b> CC · ×${fr(r,2)}`,`meublé : ×${fr(med,2)} en moyenne sur les ${rs.length} villes`],["Verdict",verdict]]);}
