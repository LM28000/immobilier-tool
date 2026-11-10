/* ---------- bruit : grands axes, voies ferrées et aéroports, au centre du quartier ou à l'adresse ----------
   Quartier : distance du centre du quartier à la voie rapide, au grand axe et à la voie ferrée les plus proches (OpenStreetMap ;
   tools/collecte/quartiers.js → data/bruit-quartiers.json, BRUITQ). Adresse d'un bien : la même mesure autour de l'adresse (Overpass, 1,5 km),
   gardée dans le bien (geo.bruit). Aéroports : zone A, B, C ou D du plan d'exposition au bruit au point (DGAC ; tools/bruit_aeroports.py → data/peb.json, PEBQ).
   Ce sont des repères de distance, pas des mesures : le classement sonore des voies (arrêté du 30 mai 1996) compte comme exposés au bruit
   jusqu'à 300 m d'une autoroute, 100 à 250 m d'un grand axe et 100 à 300 m d'une voie ferrée selon leur trafic. */
const BRK=["Voie rapide","Grand axe","Voie ferrée"], BRZ={A:"A, bruit très fort",B:"B, bruit fort",C:"C, bruit modéré",D:"D, bruit faible"}, BRA=1500;
const brM=d=>d<950?`${Math.round(d/10)*10} m`:`${fr(d/1000,1)} km`;
let PEBB=null;
/* zone de bruit d'aéroport au point (la plus forte si plusieurs), ou null */
function pebAt(lat,lon){if(typeof PEBQ==="undefined"||!PEBQ||!PEBQ.z||lat==null||lon==null) return null;
 if(!PEBB) PEBB=PEBQ.z.map(z=>{let a=1e9,b=-1e9,c=1e9,d=-1e9; z.g.forEach(r=>r.forEach(([x,y])=>{a=Math.min(a,x); b=Math.max(b,x); c=Math.min(c,y); d=Math.max(d,y);})); return [a,b,c,d];});
 let best=null;
 PEBQ.z.forEach((z,k)=>{const B=PEBB[k]; if(lon<B[0]||lon>B[1]||lat<B[2]||lat>B[3]) return; let ins=false;
  z.g.forEach(r=>{for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j]; if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)) ins=!ins;}});
  if(ins&&(!best||String(z.zone)<String(best.zone))) best=z;});
 if(!best) return null; const a=PEBQ.aero.find(x=>x.oaci===best.oaci)||{}; return {zone:best.zone,oaci:best.oaci,nom:a.nom||best.oaci,date:a.date||null};}
/* distances autour d'une adresse : [[m, nom] | null] pour voie rapide, grand axe, voie ferrée (null au-delà de 1,5 km) */
async function adrBruit(lat,lon){const q=`[out:json][timeout:40];(way(around:${BRA},${lat},${lon})["highway"~"^(motorway|trunk)(_link)?$"];way(around:${BRA},${lat},${lon})["highway"~"^primary(_link)?$"];way(around:${BRA},${lat},${lon})["railway"="rail"][!"service"];);out tags geom;`;
 for(const u of ["https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter"]){
  try{const r=await fetch(u+"?data="+encodeURIComponent(q)); if(!r.ok) continue; const j=await r.json(), kx=111320*Math.cos(lat*Math.PI/180), ky=110540, b=[null,null,null];
   (j.elements||[]).forEach(e=>{const G=e.geometry; if(!G||G.length<2) return; const h=(e.tags||{}).highway||"", c=/^(motorway|trunk)/.test(h)?0:h?1:2; let m=1e12;
    for(let i=0;i+1<G.length;i++){const ax=(G[i].lon-lon)*kx, ay=(G[i].lat-lat)*ky, bx=(G[i+1].lon-lon)*kx, by=(G[i+1].lat-lat)*ky, dx=bx-ax, dy=by-ay, L=dx*dx+dy*dy, t=L?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/L)):0, x=ax+t*dx, y=ay+t*dy; m=Math.min(m,x*x+y*y);}
    const d=Math.round(Math.sqrt(m)); if(d<=BRA&&(!b[c]||d<b[c][0])) b[c]=[d,String(h?(e.tags||{}).ref||(e.tags||{}).name||"":(e.tags||{}).name||"").slice(0,40)];});
   return b;}catch(_){}}
 return undefined;}
const BRTRY=new Set();
/* un bien de notre liste saisi à son adresse avant cette rubrique : mesure faite une fois, enregistrée dans le bien */
function adrBruitFill(b){if(!b||!b.id||!b.adresse||b.lat==null||BRTRY.has(b.id)) return; const g=b.geo||{}; if(g.bruit!==undefined) return; BRTRY.add(b.id);
 adrBruit(b.lat,b.lon).then(v=>{if(v!==undefined&&typeof updBien==="function") updBien(b.id,{geo:Object.assign({},b.geo||{},{bruit:v})});}).catch(()=>{});}
/* mesure retenue : à l'adresse du bien, sinon au centre du quartier ; et le point pour l'aéroport (adresse, position de l'annonce, centre du quartier) */
function bruitOf(b,t){const g=b&&b.geo||{}, adr=!!(b&&b.id&&b.adresse&&b.lat!=null&&Array.isArray(g.bruit));
 const v=adr?g.bruit:t&&typeof BRUITQ!=="undefined"&&BRUITQ&&BRUITQ[t.ck]?BRUITQ[t.ck][t.code]||null:null;
 const pt=typeof concPoint==="function"?concPoint(b,t):null;
 return {v,adr,far:adr?BRA:3000,peb:pt?pebAt(pt.lat,pt.lon):null,pebHow:pt?pt.how:""};}
function bruitBlock(b,t){const B=bruitOf(b,t); if(!B.v&&!B.peb&&typeof PEBQ==="undefined") return "";
 const rows=(B.v?BRK.map((k,i)=>{const x=B.v[i]; return [k,x?`à <b>${brM(x[0])}</b>${x[1]?` <span class="v2sub">(${esc(x[1])})</span>`:""}`:`à plus de ${brM(B.far)}`,i===0?"bruit sensible jusqu'à 300 m environ":i===1?"jusqu'à 100 à 250 m selon le trafic":"jusqu'à 100 à 300 m selon le trafic"];}):[])
  .concat([["Aéroport",B.peb?`zone <b>${BRZ[B.peb.zone]||B.peb.zone}</b>, ${esc(B.peb.nom)}`:"hors des zones de bruit des aéroports",B.peb?`plan d'exposition au bruit${B.peb.date?` du ${frD(String(B.peb.date).slice(0,10))}`:""} ; mesuré ${B.pebHow.replace(/^autour d[eu] /,"")}`:""]]);
 return `<h4 class="fh4">Bruit</h4>${fRows(rows)}${fNote(`${B.v?(B.adr?"Distances mesurées à l'adresse":"Distances mesurées au centre du quartier")+" (OpenStreetMap) : un repère, pas une mesure du bruit ; le trafic réel et l'orientation (rue ou cour) comptent. ":""}Aéroports : plans d'exposition au bruit de la DGAC (Géoplateforme de l'IGN).`)}`;}
/* points d'attention : à l'adresse d'un bien seulement pour les routes et le train ; partout pour les aéroports */
function bruitAttn(b,t){const B=bruitOf(b,t), out=[];
 if(B.adr&&B.v){const [r,a,f]=B.v;
  if(r&&r[0]<=150) out.push(["warn",`À ${brM(r[0])} d'une voie rapide${r[1]?" ("+esc(r[1])+")":""} : bruit probable. Demandez l'orientation des fenêtres et le type de vitrage.`]);
  if(a&&a[0]<=25) out.push(["warn",`Sur un grand axe${a[1]?" ("+esc(a[1])+")":""} : demandez si le logement donne sur la rue ou sur cour, et le vitrage.`]);
  if(f&&f[0]<=100) out.push(["warn",`À ${brM(f[0])} d'une voie ferrée : bruit et vibrations possibles, à vérifier sur place.`]);}
 if(B.peb&&/^[ABC]$/.test(B.peb.zone)) out.push(["warn",`Zone ${BRZ[B.peb.zone]} du plan d'exposition au bruit de l'aéroport ${esc(B.peb.nom)} : à vérifier sur place, et à mentionner par le vendeur.`]);
 else if(B.peb) out.push(["info",`Zone D (bruit faible) de l'aéroport ${esc(B.peb.nom)} : survols possibles, à écouter lors de la visite.`]);
 return out;}
