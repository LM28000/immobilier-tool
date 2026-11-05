/* ---------- carte ---------- */
const MP={lon0:-2.9,lat1:49.45,k:Math.cos(47.7*Math.PI/180)};
const pxy=(lat,lon)=>[(lon-MP.lon0)*MP.k*MAP.S,(MP.lat1-lat)*MAP.S];
const pline=pts=>pts.map((p,i)=>(i?"L":"M")+pxy(p[0],p[1]).map(v=>v.toFixed(1)).join(" ")).join(" ");
const DPE_COL=["#2e8b57","#58b947","#b8d433","#f5e33a","#f4b432","#ec7a2c","#d7262e"];
function dpeBar(d,w){const tot=d.reduce((a,b)=>a+b,0)||1; let x=0, s=`<svg viewBox="0 0 ${w} 16" width="${w}" height="16" style="display:inline-block;vertical-align:middle" role="img" aria-label="Répartition DPE">`;
 d.forEach((v,i)=>{const ww=v/tot*w; if(ww>0){s+=`<rect x="${x}" y="2" width="${ww}" height="12" fill="${DPE_COL[i]}"><title>${"ABCDEFG"[i]} : ${v} (${fr(v/tot*100,0)} %)</title></rect>`; if(ww>13) s+=`<text x="${x+ww/2}" y="11.5" text-anchor="middle" font-size="9" font-weight="700" fill="#1b1b1b">${"ABCDEFG"[i]}</text>`;} x+=ww;});
 return s+`</svg>`;}
function bindCities(svg){svg.querySelectorAll(".city").forEach(g=>{g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();SEL=g.dataset.k;QSEL=null;AD=null;render();}});});}

/* ---------- fiche ---------- */
function renderDetail(rows){
 const r=rows.find(z=>z.c.k===SEL), c=r.c, x=r.x, [bc,bt]=bank(x.ratio), d=document.getElementById("detail");
 const W=460, imp=(x.imp1+x.fees1)/12, out=x.mens+x.charges+imp, maxv=Math.max(x.rentEff,out)*1.05, sc=v=>v/maxv*(W-200);
 const bar=`<svg viewBox="0 0 ${W} 108" role="img" aria-label="Le mois type"><text x="0" y="20" font-size="12" fill="var(--muted)">Ce qui rentre</text>
  <rect x="110" y="8" width="${sc(x.rentEff)}" height="18" rx="4" fill="var(--ok)" fill-opacity=".8"/><text x="${116+sc(x.rentEff)}" y="21" font-size="12" class="mono" fill="var(--fg)">${eur(x.rentEff)}</text>
  <text x="0" y="52" font-size="12" fill="var(--muted)">Ce qui sort</text>
  <rect x="110" y="40" width="${sc(x.mens)}" height="18" rx="4" fill="var(--accent)" fill-opacity=".85"/><rect x="${110+sc(x.mens)}" y="40" width="${sc(x.charges)}" height="18" rx="4" fill="var(--accent)" fill-opacity=".4"/><rect x="${110+sc(x.mens+x.charges)}" y="40" width="${sc(imp)}" height="18" rx="4" fill="var(--warn)" fill-opacity=".55"/>
  <text x="${116+sc(out)}" y="53" font-size="12" class="mono" fill="var(--fg)">${eur(out)}</text>
  <text x="110" y="78" font-size="11" fill="var(--muted)">crédit ${eur(x.mens)} · charges ${eur(x.charges)} (dont taxe foncière ${eur(x.tf)})</text><text x="110" y="96" font-size="11" fill="var(--muted)">impôts et frais ${eur(imp)} (${REG[x.regime]})</text></svg>`;
 const G=x.gains, gw=460, gh=150, L=46, B=22, lo=Math.min(0,...G), hi=Math.max(0,...G);
 const X=i=>L+(gw-L-28)*i/25, Y=v=>8+(gh-8-B)*(hi-v)/((hi-lo)||1);
 const st=(hi-lo)>60000?20000:(hi-lo)>30000?10000:5000;
 let cv=`<svg viewBox="0 0 ${gw} ${gh}" role="img" aria-label="Gain ou perte si on revend">`;
 for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st) cv+=`<line x1="${L}" x2="${gw-28}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v===0?"var(--muted)":"var(--line)"}" ${v===0?'stroke-dasharray="4 3"':""}/><text x="${L-6}" y="${Y(v)+4}" text-anchor="end" font-size="10.5" class="mono" fill="var(--muted)">${keur(v)}</text>`;
 [0,5,10,15,20,25].forEach(i=>{cv+=`<text x="${X(i)}" y="${gh-6}" text-anchor="middle" font-size="10.5" class="mono" fill="var(--muted)">${i} ans</text>`;});
 const dl=G.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)).join(" ");
 cv+=`<path d="${dl} L${X(25)} ${Y(0)} L${X(0)} ${Y(0)} Z" fill="var(--accent-soft)"/><path d="${dl}" fill="none" stroke="var(--accent)" stroke-width="2.2"/>`;
 const be=G.findIndex(v=>v>=0);
 if(be>0) cv+=`<circle cx="${X(be)}" cy="${Y(G[be])}" r="4" fill="var(--accent)"/><text x="${X(be)+6}" y="${Y(G[be])-6}" font-size="11" fill="var(--fg)">gagnant après ${be} ans</text>`;
 else if(be<0) cv+=`<text x="${L+8}" y="20" font-size="11" fill="var(--bad)">jamais gagnant sur 25 ans</text>`;
 cv+=`<circle cx="${X(25)}" cy="${Y(G[25])}" r="4" fill="var(--accent)"/><text x="${X(25)-6}" y="${Y(G[25])-8}" text-anchor="end" font-size="11.5" font-weight="700" class="mono" fill="var(--fg)">${(G[25]>=0?"+":"")+keur(G[25])}</text></svg>`;
 const trips=["laval","nantes","paris"].map(o=>`${ORIG[o].name} ${hm(trip(c,o))}`).join(" · ");
 d.innerHTML=`<div class="dh"><h3>${c.name}</h3><span style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="pill ${bc}">Banque : ${bt} · ${pct(x.ratio*100,0)}</span>${cmpBtn({kind:"c",k:c.k})}${IR[c.k]?`<button type="button" class="cmpb" data-zq="${c.k}">Voir les quartiers</button>`:""}</span></div>
  <p class="avg" title="Prix et loyers médians, tous quartiers confondus.${IR[c.k]?" Les quartiers peuvent être nettement au-dessus ou en dessous.":""}">Moyenne de la ville · studio de ${H.surface} m²${IR[c.k]?" · les quartiers varient":""}</p>
  <div class="big4">
   <div><span>Loyer HC</span><b>${eur(x.rentHC)}</b></div>
   <div><span>Budget</span><b>${keur(x.cost)}</b></div>
   <div><span>Cash-flow ${mlab()}</span><b class="${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}</b>${altCf(x)}</div>
   <div><span>15 ans ${mlab()}</span><b style="color:${colIrr(x.irr)}">${x.irr==null?"n.d.":pct(x.irr)}</b>${altIrr(x)}</div></div>
  ${taxLine(x)}
  ${ptabs("city",[["Le mois type",`<p class="sub" style="margin:0 0 6px">Ce qui entre et sort chaque mois, à deux.</p>${bar}`],["Sur 25 ans",`<p class="sub" style="margin:0 0 6px">Gain ou perte à deux si on revend.</p>${cv}`],["Et si…",scnBox("city",scnCity(c))],["La ville",`<p class="sub" style="margin-top:0">Demande locative <b>${c.tensionTxt.toLowerCase()}</b> · ${c.students.toLocaleString("fr-FR")} étudiants · loyer hors charges ${eur(x.rentHC)} · studios vendus ${c.pm2.toLocaleString("fr-FR")} €/m²${c.evol!=null?` (${c.evol>0?"+":""}${String(c.evol).replace(".",",")} % sur un an)`:""} · taxe foncière ${String(c.tf).replace(".",",")} %</p>
  <p class="sub">Trajets : ${trips}</p>
  <h2 style="margin:14px 0 6px">Risques à long terme</h2>
  <div style="display:flex;flex-wrap:wrap;gap:6px">${riskPills(c)}</div>
  <div style="margin-top:10px">${dpeBar(DPECITY[c.k],360)}</div>
  <p class="sub" style="margin-top:4px">DPE des ${DPECITY[c.k].reduce((a,b)=>a+b,0).toLocaleString("fr-FR")} appartements de 30 m² ou moins diagnostiqués depuis 2021 (ADEME). F : location interdite en 2028, G : déjà interdite.</p>
  <p class="sub" style="margin-top:6px">Population qui baisse ou beaucoup de logements vides = moins de locataires demain et une revente plus lente. Le chômage pèse sur la solvabilité des candidats.</p>
  ${c.note?`<div class="note">${c.note}</div>`:""}
  <div class="srcs">Sources : <a href="${c.src[0]}" target="_blank" rel="noopener">Prix</a> · <a href="${c.src[1]}" target="_blank" rel="noopener">Loyer</a> · <a href="${c.src[2]}" target="_blank" rel="noopener">Taxe foncière</a></div>`]])}`;
}

/* ---------- risques ---------- */
const RISK={lemans:[0.4,9.5,15.7],angers:[0.6,5.9,15.4],tours:[0.4,11.2,null],poitiers:[0.3,9.2,null],laval:[-0.1,9.3,12.4],orleans:[-0.05,10.3,14.6],chartres:[-0.1,10.9,12.5],
 stnazaire:[1.1,7.1,13.0],rennes:[1.1,6.5,13.8],blois:[0.4,11.6,17.6],caen:[0.6,8.9,15.0],cholet:[0.1,5.9,12.2],laroche:[0.1,6.6,11.3]};
const fr=(v,d=1)=>v.toFixed(d).replace(".",",");
const rPop=v=>v>=0.5?"p-ok":v>=0?"p-n":"p-warn", rVac=v=>v<7?"p-ok":v<=10?"p-n":"p-warn", rCho=v=>v==null?"p-n":v<13?"p-ok":v<=16?"p-n":"p-warn";
function riskPills(c){const [p,v,ch]=RISK[c.k];
 return `<span class="pill ${rPop(p)}">Population ${p>0?"+":""}${fr(p)} %/an</span><span class="pill ${rVac(v)}">${fr(v)} % de logements vides</span><span class="pill ${rCho(ch)}">Chômage ${ch==null?"n.d.":fr(ch)+" %"}</span><span class="pill ${rFG(fgOf(DPECITY[c.k]))}">${fr(fgOf(DPECITY[c.k]))} % de petits appartements classés F ou G</span>`;}

/* ---------- quartiers ---------- */
const Q={
 lemans:{name:"Le Mans",src:"https://realadvisor.fr/fr/prix-m2-immobilier/ville-le-mans",tags:{"Gare":"gare","Leclerc":"gare","Jacobins-République":"centre","Vieux Mans":"centre","Jardin des plantes":"centre","Hôpital-Chanzy":"centre","Tessé":"centre","Sainte-Croix":"bollee","Mutuelles":"bollee","Nationale":"bollee","Cadran":"bollee","Université":"univ"},
  q:{"Ardriers":2186,"Banjan-Croix de Pierre":2056,"Bas de Gazonfier":1716,"Batignolles":1786,"Bellevue":2286,"Boussinière":2122,"Bruyères":1354,"Cadran":2592,"Carnot":1941,"Chasse Royale":2035,"Christ Sauveur":1197,"Circuit":1727,"Cité des Pins":1517,"Clairfontaine":2082,"Courboulay":2263,"Epau":1295,"Epine":3442,"Etangs Chauds":1476,"Fontenelles":1598,"Funay":1311,"Gallière":1793,"Gare":2153,"Glonnières":1794,"Gué Bernisson":1287,"Haut de Gazonfier":1917,"Hôpital-Chanzy":2286,"Jacobins-République":2381,"Jardin des plantes":2187,"Jaurès Bertinière":1966,"Jaurès Crétois":1825,"La Butte":1886,"Leclerc":2225,"Maillets-Isaac":1908,"Marcel Paul":1459,"Maroc":1623,"Meslier":2363,"Michel Ange":1376,"Miroir":2077,"Mission":1845,"Monthéard":1923,"Mutuelles":2169,"Nationale":2018,"Newton":1108,"Oasis":1585,"Olivier Heuzé":1522,"Patis-Saint-Lazare":2043,"Pavoine":1386,"Petit Louvre":1280,"Pontlieue":1384,"Pré":2088,"Riffaudières":1592,"Ronceray":1374,"Sables d'Or":2005,"Sablonnière":1329,"Sablons centre":1385,"Saint-Georges":1556,"Saint-Pavin":1892,"Sainte-Croix":1931,"Sources":1452,"Tessé":2301,"Université":2527,"Vallée Saint-Blaise":2149,"Vert Galant":1524,"Vieux Mans":2391,"Villaret":2114,"Yzeuville":2040,"ZA Nord":1898,"ZA Zone industrielle sud":1609}},
 stnazaire:{name:"Saint-Nazaire",src:"https://realadvisor.fr/fr/prix-m2-immobilier/44600-saint-nazaire",tags:{"Herbins Gare":"gare","Centre Halles":"centre","Hyper Centre":"centre","Hôtel de ville":"centre","Le Port":"centre","Ville Port":"centre","Méan Penhöet":"chantiers","Gavy Océanis":"univ","Saint-Marc Est":"plage","Saint-Marc Ouest":"plage"},
  q:{"Brais":3609,"Centre Halles":2661,"Cité scolaire":2972,"Gambetta":2893,"Gavy Océanis":3418,"Herbins Gare":2624,"Hôtel de ville":3121,"Hyper Centre":2800,"Immaculée Bourg":3232,"Immaculée Campagne":3270,"Jardin des Plantes":3392,"Kerledé":3436,"Landettes-Avalix":2540,"Le Port":3197,"Méan Penhöet":2368,"Parc paysager":3199,"Pertuischaud":2811,"Petit Caporal":2709,"Porcé":3142,"Prézégat-Berthauderie":2833,"Québrais":3189,"Reton-Plaisance":2694,"Richarderie-Côte d'Amour":3190,"Saint-Marc Est":4714,"Saint-Marc Ouest":4630,"Trébale":3046,"Ville ès Martin":3761,"Ville Port":3013,"Villeneuve":2990}}};
const TAG={gare:["Près de la gare","var(--accent)"],centre:["Centre-ville","var(--ok)"],bollee:["Bollée · Sainte-Croix","var(--warn)"],univ:["Université","var(--bad)"],chantiers:["Chantiers navals","var(--warn)"],plage:["Bord de mer","var(--muted)"]};
function median(a){const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;}
