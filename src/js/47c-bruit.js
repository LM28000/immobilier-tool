/* ---------- bruit : grands axes, voies ferrées et aéroports, au centre du quartier ou à l'adresse ----------
   Quartier (sa fiche) : distance du centre du quartier à la voie rapide, au grand axe (route primaire ou secondaire : selon les villes, OpenStreetMap
   range les grands boulevards dans l'une ou l'autre) et à la voie ferrée les plus proches (OpenStreetMap ; tools/bruit_expo.py → data/bruit-quartiers.json, BRUITQ). Adresse d'un bien : la même mesure autour de l'adresse (Overpass, 1,5 km),
   gardée dans le bien (geo.bruit). Annonce placée à 100 m près ou mieux : la même mesure autour de sa position. Les deux se font sur les voies
   de la ville (data/bruit/<ville>.js, chargé avec la fiche) ; Overpass en direct seulement hors de leur emprise. Annonce plus floue, ou bien sans adresse : pas de distances (le centre du quartier ne dit rien
   d'un appartement précis), seulement les zones des aéroports. Aéroports : zone A, B, C ou D du plan d'exposition au bruit au point (DGAC ; tools/bruit_aeroports.py → data/peb.json, PEBQ).
   Ce sont des repères de distance, pas des mesures : le classement sonore des voies (arrêté du 30 mai 1996) compte comme exposés au bruit
   jusqu'à 300 m d'une autoroute, 100 à 250 m d'un grand axe et 100 à 300 m d'une voie ferrée selon leur trafic. */
/* part du quartier exposée au bruit (tools/bruit_expo.py → data/bruit-expo.json, BRUITX) : grille de points du quartier, à 300 m d'une voie rapide,
   50 m d'un grand axe (route primaire ou secondaire), 100 m d'une voie ferrée, ou en zone A à C d'un aéroport ; la vue « Bruit » de la carte */
const bruitExpo=t=>{const V=t&&typeof BRUITX!=="undefined"&&BRUITX&&BRUITX.villes&&BRUITX.villes[t.ck]; const v=V?V[t.code]:null; return typeof v==="number"?v:null;};
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
async function adrBruit(lat,lon){const q=`[out:json][timeout:40];(way(around:${BRA},${lat},${lon})["highway"~"^(motorway|trunk)(_link)?$"];way(around:${BRA},${lat},${lon})["highway"~"^(primary|secondary)(_link)?$"];way(around:${BRA},${lat},${lon})["railway"="rail"][!"service"];);out tags geom;`;
 for(const u of ["https://overpass-api.de/api/interpreter","https://maps.mail.ru/osm/tools/overpass/api/interpreter","https://overpass.private.coffee/api/interpreter"]){
  try{const ac=typeof AbortController!=="undefined"?new AbortController():null, tm=ac?setTimeout(()=>ac.abort(),25000):0; const r=await fetch(u+"?data="+encodeURIComponent(q),ac?{signal:ac.signal}:{}); clearTimeout(tm); if(!r.ok) continue;   /* 25 s au plus par serveur (OpenStreetMap parfois saturé) */ const j=await r.json(), kx=111320*Math.cos(lat*Math.PI/180), ky=110540, b=[null,null,null];
   (j.elements||[]).forEach(e=>{const G=e.geometry; if(!G||G.length<2) return; const h=(e.tags||{}).highway||"", c=/^(motorway|trunk)/.test(h)?0:h?1:2; let m=1e12;
    for(let i=0;i+1<G.length;i++){const ax=(G[i].lon-lon)*kx, ay=(G[i].lat-lat)*ky, bx=(G[i+1].lon-lon)*kx, by=(G[i+1].lat-lat)*ky, dx=bx-ax, dy=by-ay, L=dx*dx+dy*dy, t=L?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/L)):0, x=ax+t*dx, y=ay+t*dy; m=Math.min(m,x*x+y*y);}
    const d=Math.round(Math.sqrt(m)); if(d<=BRA&&(!b[c]||d<b[c][0])) b[c]=[d,String(c===0?(e.tags||{}).ref||(e.tags||{}).name||"":c===1?(e.tags||{}).name||(e.tags||{}).ref||"":(e.tags||{}).name||"").slice(0,40)];   /* voie ferrée : son nom, pas le numéro de ligne SNCF */});
   return b;}catch(_){}}
 return undefined;}
/* voies de la ville (tools/bruit_expo.py → data/bruit/<ville>.js, BRUITV), chargées avec la fiche comme le registre des copropriétés :
   la mesure se fait sur place, tout de suite, sans interroger OpenStreetMap ; Overpass en direct seulement hors de leur emprise */
const BVQ=typeof window!=="undefined"?(window.BRUITV=window.BRUITV||{}):{}, BVL={};
function brVoies(ck){if(!ck) return null; if(BVQ[ck]) return BVQ[ck]; if(typeof BRUITVV==="undefined"||!BRUITVV||typeof document==="undefined"||BVL[ck]===2) return null;
 if(!BVL[ck]){BVL[ck]=1; const sc=document.createElement("script"); sc.src=(/\/dist\//.test(location.pathname)?"../":"")+"data/bruit/"+encodeURIComponent(ck)+".js?v="+BRUITVV;
  sc.onload=()=>{if(!BVQ[ck]) BVL[ck]=2; brFill(ck);}; sc.onerror=()=>{BVL[ck]=2; brFill(ck);}; document.head.appendChild(sc);}
 return undefined;}
function brFill(ck){if(typeof document!=="undefined"&&document.querySelector("[data-brw]")) document.dispatchEvent(new CustomEvent("v2fiche-maj",{detail:{ck}}));}
function brDec(p){const o=[]; let i=0,la=0,lo=0; while(i<p.length){for(let k=0;k<2;k++){let r=0,sh=0,c; do{c=p.charCodeAt(i++)-63; r|=(c&31)<<sh; sh+=5;}while(c>=32); const d=r&1?~(r>>1):r>>1; if(k) lo+=d; else la+=d;} o.push([la/1e5,lo/1e5]);} return o;}
/* distances à partir des voies de la ville : [[m, nom] | null] × 3 comme adrBruit, undefined hors de leur emprise */
function brLocal(J,lat,lon){if(!J||!J.bb||lon<J.bb[0]||lon>J.bb[2]||lat<J.bb[1]||lat>J.bb[3]) return undefined;
 if(!J._d) Object.defineProperty(J,"_d",{value:J.w.map(([c,n,p])=>{const G=brDec(p); let a=1e9,b=-1e9,e=1e9,f=-1e9; G.forEach(([y,x])=>{a=Math.min(a,x); b=Math.max(b,x); e=Math.min(e,y); f=Math.max(f,y);}); return [c,n,G,[a,b,e,f]];})});
 const kx=111320*Math.cos(lat*Math.PI/180), ky=110540, dLo=BRA/kx, dLa=BRA/ky, out=[null,null,null];
 J._d.forEach(([c,n,G,B])=>{if(lon<B[0]-dLo||lon>B[1]+dLo||lat<B[2]-dLa||lat>B[3]+dLa) return; let m=1e18;
  for(let i=0;i+1<G.length;i++){const ax=(G[i][1]-lon)*kx, ay=(G[i][0]-lat)*ky, bx=(G[i+1][1]-lon)*kx, by=(G[i+1][0]-lat)*ky, dx=bx-ax, dy=by-ay, L=dx*dx+dy*dy, t=L?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/L)):0, x=ax+t*dx, y=ay+t*dy; m=Math.min(m,x*x+y*y);}
  const d=Math.round(Math.sqrt(m)); if(d<=BRA&&(!out[c]||d<out[c][0])) out[c]=[d,n];});
 return out;}
const BRTRY=new Set();
/* un bien de notre liste saisi à son adresse avant cette rubrique : mesure faite une fois (voies de la ville, sinon OpenStreetMap), enregistrée dans le bien */
function adrBruitFill(b){if(!b||!b.id||!b.adresse||b.lat==null||BRTRY.has(b.id)) return; const g=b.geo||{}; if(g.bruit!==undefined) return;
 const J=brVoies(b.ville); if(J===undefined) return;   /* voies en cours de chargement : la fiche se redessine à leur arrivée */
 BRTRY.add(b.id); const loc=J?brLocal(J,+b.lat,+b.lon):undefined;
 (loc!==undefined?Promise.resolve(loc):adrBruit(b.lat,b.lon)).then(v=>{if(v!==undefined&&typeof updBien==="function") updBien(b.id,{geo:Object.assign({},b.geo||{},{bruit:v})});}).catch(()=>{});}
/* position d'une annonce assez précise pour mesurer le bruit (fiche Bien'ici : rayon de flou connu, 100 m au plus) */
const BR_POS=100, BRAN=new Map(), BRANW=new Set();
function brPos(b){const s=b?(b.kind==="v"?b.suf:(typeof bienSuf==="function"?bienSuf(b):null)):null, fx=s&&typeof ficx==="function"?ficx(s):null;
 return fx&&fx.la!=null&&fx.lo!=null&&fx.r!=null&&fx.r<=BR_POS?{s,la:fx.la,lo:fx.lo,r:fx.r}:null;}
/* mesure autour de la position de l'annonce par OpenStreetMap en direct, une fois, quand elle est hors de l'emprise des voies de la ville ;
   la fiche ouverte se remplit à l'arrivée (échec : pas de nouvel essai avant le rechargement) */
function annBruitFill(b,P){if(!P||BRAN.has(P.s)||BRANW.has(P.s)||typeof fetch==="undefined") return; BRANW.add(P.s);
 adrBruit(P.la,P.lo).then(v=>{BRANW.delete(P.s); BRAN.set(P.s,v===undefined?null:v); if(typeof document!=="undefined"&&document.querySelector(`[data-brw="${CSS.escape(P.s)}"]`)) document.dispatchEvent(new CustomEvent("v2fiche-maj",{detail:{ck:b.ville}}));})
  .catch(()=>{BRANW.delete(P.s); BRAN.set(P.s,null);});}
/* mesure retenue : adresse du bien, sinon position de l'annonce (100 m près), sinon rien pour un bien ou une annonce ; centre du quartier pour la fiche d'un quartier.
   Aéroports : au point du bien (adresse, position de l'annonce, centre du quartier). */
function bruitOf(b,t){const g=b&&b.geo||{}, adr=!!(b&&b.id&&b.adresse&&b.lat!=null&&Array.isArray(g.bruit)), adrW=!!(b&&b.id&&b.adresse&&b.lat!=null&&g.bruit===undefined), P=b&&!adr&&!adrW?brPos(b):null;
 let v=null, how="", r=0, wait=false, fail=false, J=null;
 if(adr){v=g.bruit; how="adresse";}
 else if(adrW) wait=true;   /* adresse saisie, mesure pas encore faite (adrBruitFill) */
 else if(P&&(J=brVoies(b.ville))===undefined) wait=true;   /* voies de la ville en cours de chargement */
 else if(P){const loc=J?brLocal(J,P.la,P.lo):undefined;
  if(loc!==undefined){v=loc; how="position"; r=P.r;}
  else if(BRAN.has(P.s)){v=BRAN.get(P.s); how="position"; r=P.r; fail=v===null;} else {wait=true; annBruitFill(b,P);}}
 else if(!b&&t&&typeof BRUITQ!=="undefined"&&BRUITQ&&BRUITQ[t.ck]){v=BRUITQ[t.ck][t.code]||null; how="quartier";}
 const pt=typeof concPoint==="function"?concPoint(b,t):null;
 return {v,adr,how,r,P,wait,fail,far:how==="quartier"?3000:BRA,peb:pt?pebAt(pt.lat,pt.lon):null,pebHow:pt?pt.how:""};}
/* médiane des quartiers d'une ville, pour comparer */
const CEXPO={};
function cityExpo(ck){if(ck in CEXPO) return CEXPO[ck]; const V=typeof BRUITX!=="undefined"&&BRUITX&&BRUITX.villes&&BRUITX.villes[ck], a=V?Object.values(V).sort((x,y)=>x-y):[]; return CEXPO[ck]=a.length?a[a.length>>1]:null;}
function bruitBlock(b,t){const B=bruitOf(b,t); if(!B.v&&!B.peb&&!B.wait&&typeof PEBQ==="undefined") return "";
 const rows=(B.v?BRK.map((k,i)=>{const x=B.v[i]; return [k,x?`à <b>${brM(x[0])}</b>${x[1]?` <span class="v2sub">(${esc(x[1])})</span>`:""}`:`à plus de ${brM(B.far)}`,i===0?"bruit sensible jusqu'à 300 m environ":i===1?"jusqu'à 100 à 250 m selon le trafic":"jusqu'à 100 à 300 m selon le trafic"];}):[])
  .concat(B.wait?[["Routes et train",`<span data-brw="${esc(B.P?B.P.s:"adresse")}">mesure en cours ${B.P?"autour de la position de l'annonce":"à l'adresse"}…</span>`,""]]:[])
  .concat(t&&bruitExpo(t)!=null?[[b?"Le quartier":"Quartier exposé",`<b>${fr(bruitExpo(t),0)} %</b> de sa surface exposée${(()=>{const c=cityExpo(t.ck); return c!=null?` <span class="v2sub">(ville : ${fr(c,0)} %)</span>`:"";})()}`,"à 300 m au plus d'une voie rapide, 50 m d'un grand axe, 100 m d'une voie ferrée, ou en zone A à C d'un aéroport"]]:[])
  .concat([["Aéroport",B.peb?`zone <b>${BRZ[B.peb.zone]||B.peb.zone}</b>, ${esc(B.peb.nom)}`:"hors des zones de bruit des aéroports",B.peb?`plan d'exposition au bruit${B.peb.date?` du ${frD(String(B.peb.date).slice(0,10))}`:""} ; mesuré ${B.pebHow.replace(/^autour d[eu] /,"")}`:""]]);
 const where=B.how==="adresse"?"Distances mesurées à l'adresse":B.how==="position"?`Distances mesurées autour de la position de l'annonce (à ${B.r} m près)`:"Distances mesurées au centre du quartier";
 const none=b&&!B.v&&!B.wait?(B.fail?"Routes et train : la mesure n'a pas abouti (OpenStreetMap indisponible), elle sera refaite au prochain chargement de la page. ":"Routes et train : mesurés à l'adresse exacte (saisie dans Nos biens) ou à la position de l'annonce quand elle est donnée à 100 m près ; ici, la position est trop approximative. "):"";
 return `<h4 class="fh4">Bruit</h4>${fRows(rows)}${fNote(`${B.v?where+" (OpenStreetMap) : un repère, pas une mesure du bruit ; le trafic réel et l'orientation (rue ou cour) comptent. ":none}Aéroports : plans d'exposition au bruit de la DGAC (Géoplateforme de l'IGN).`)}`;}
/* points d'attention : à l'adresse d'un bien ou à la position d'une annonce (seuil atteint même au plus loin que permet le flou) ; partout pour les aéroports */
function bruitAttn(b,t){const B=bruitOf(b,t), out=[];
 if(b&&B.v){const [r,a,f]=B.v, e=B.r||0, ou=B.how==="position"?" (position de l'annonce)":"";
  if(r&&r[0]+e<=150) out.push(["warn",`À ${brM(r[0])} d'une voie rapide${r[1]?" ("+esc(r[1])+")":""}${ou} : bruit probable. Demandez l'orientation des fenêtres et le type de vitrage.`]);
  if(a&&a[0]+e<=25) out.push(["warn",`Sur un grand axe${a[1]?" ("+esc(a[1])+")":""} : demandez si le logement donne sur la rue ou sur cour, et le vitrage.`]);
  if(f&&f[0]+e<=100) out.push(["warn",`À ${brM(f[0])} d'une voie ferrée${ou} : bruit et vibrations possibles, à vérifier sur place.`]);}
 if(B.peb&&/^[ABC]$/.test(B.peb.zone)) out.push(["warn",`Zone ${BRZ[B.peb.zone]} du plan d'exposition au bruit de l'aéroport ${esc(B.peb.nom)} : à vérifier sur place, et à mentionner par le vendeur.`]);
 else if(B.peb) out.push(["info",`Zone D (bruit faible) de l'aéroport ${esc(B.peb.nom)} : survols possibles, à écouter lors de la visite.`]);
 return out;}
