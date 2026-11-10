/* ---------- copropriété de l'immeuble : registre national d'immatriculation des copropriétés (Anah, Licence Ouverte 2.0) ----------
   data/copro/<ville>.js (tools/copro_rnic.py), chargé à la demande, ville par ville, comme data/lignes.js.
   Ligne : [lon, lat, immatriculation, lots, lots principaux, logements, parkings, période, syndic, mandat, nom du syndic, drapeaux, parcelles, adresse].
   Rapprochement :
   - bien de notre liste avec son adresse : la copropriété de sa parcelle cadastrale (sûr) ; sinon, parmi les copropriétés dont le registre
     ne donne pas la parcelle, la plus proche à 25 m au plus (probable) ;
   - annonce (position floutée par Bien'ici) : la seule copropriété à moins de (flou + 40 m) qui a le nombre de lots annoncé (lots, lots principaux
     ou logements) et, quand les deux sont connus, construite à l'époque annoncée (à 3 ans près) ; position à 125 m près au plus,
     ou jusqu'à 300 m quand l'année est connue des deux côtés.
     Mesuré le 10 novembre 2026 sur 7 137 ventes en remplaçant le nombre de lots annoncé par un nombre tiré au hasard :
     environ 85 à 90 % des rapprochements sont justes, d'où « probable ».
   Le registre ouvert ne donne ni les charges, ni les impayés, ni les procédures. */
const CPQ=(typeof window!=="undefined"?(window.COPROQ=window.COPROQ||{}):{}), CPL={};
const CPMAN=["mandat en cours","aucun mandat déclaré","mandat expiré sans successeur déclaré","mandat expiré, successeur déclaré"];
/* le registre d'une ville : objet, undefined pendant le chargement, null s'il n'existe pas ou ne se charge pas (nouvel essai une minute plus tard) */
function coproData(ck){if(!ck) return null; if(CPQ[ck]) return CPQ[ck]; if(typeof COPROV==="undefined"||!COPROV) return null; if(CPL[ck]===2) return null;
 if(!CPL[ck]){CPL[ck]=1; const sc=document.createElement("script"); sc.src=(/\/dist\//.test(location.pathname)?"../":"")+"data/copro/"+encodeURIComponent(ck)+".js?v="+COPROV;
  sc.onload=()=>{if(!CPQ[ck]) CPL[ck]=2; coproFill(ck);}; sc.onerror=()=>{CPL[ck]=2; setTimeout(()=>{delete CPL[ck];},60000); coproFill(ck);}; document.head.appendChild(sc);}
 return undefined;}
/* adresse « 1-3 r du marechal x » ou « 10 Rue Gougeard 72000 Le Mans » → {numéros, mots de la voie}, abréviations du registre développées */
function cpAdr(s){if(!s) return null; const AB={r:"rue",av:"avenue",ave:"avenue",bd:"boulevard",bld:"boulevard",pl:"place",all:"allee",imp:"impasse",che:"chemin",chem:"chemin",rte:"route",sq:"square",crs:"cours",qu:"quai",fg:"faubourg",pas:"passage",res:"residence",mal:"marechal",gen:"general",st:"saint",ste:"sainte",pte:"porte",prom:"promenade"},
  STOP=new Set(["rue","avenue","boulevard","place","allee","impasse","chemin","route","square","cours","quai","faubourg","passage","residence","de","du","des","la","le","les","et","aux","au","sur"]);
 const t=String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b\d{5}\b.*$/,""), m=t.match(/^\s*(\d[\d\s,\-–\/]*)(?:\s*(?:bis|ter|[a-d])\b)?\s+(.*)$/); if(!m) return null;
 const nums=new Set((m[1].match(/\d+/g)||[]).map(Number)), w=m[2].split(/[^a-z0-9]+/).map(x=>AB[x]||x).filter(x=>x.length>1&&!STOP.has(x));
 return nums.size&&w.length?{nums,w}:null;}
/* même adresse : un numéro commun et les mots de la voie la plus courte tous dans l'autre */
function cpAdrEq(a,b){if(!a||!b||![...a.nums].some(n=>b.nums.has(n))) return false; const A=new Set(a.w), B=new Set(b.w), n=[...A].filter(x=>B.has(x)).length; return n>0&&n>=Math.min(A.size,B.size);}
/* o : {lat, lon} et soit {exact: true, cad: [section, numéro], adr} (adresse saisie), soit {r: flou en m, lots, an} (annonce) */
function coproMatch(J,o){if(!J||!o||o.lat==null||o.lon==null) return null;
 const near=m=>J.c.filter(x=>Math.abs(x[1]-o.lat)<m/111000&&Math.abs(x[0]-o.lon)<m/70000).map(x=>[hav(o.lat,o.lon,x[1],x[0])*1000,x]).filter(z=>z[0]<=m).sort((a,b)=>a[0]-b[0]);
 if(o.exact){const sec=o.cad&&o.cad[0]?String(o.cad[0]).trim().toUpperCase():"", k=sec&&o.cad[1]?(sec.length===1?"0"+sec:sec)+String(o.cad[1]).trim().padStart(4,"0"):"";   /* sections d'une lettre : « 0A », comme au cadastre */
  const A=cpAdr(o.adr), same=z=>cpAdrEq(A,cpAdr(z[1][13]));
  /* la parcelle de l'adresse ; plusieurs copropriétés sur la parcelle (plusieurs immeubles) : celle de la même adresse, sinon la plus proche (probable) */
  if(k){const P=near(400).filter(z=>z[1][12]&&z[1][12].split(" ").some(p=>p===k||p.endsWith(k)));
   if(P.length===1) return {x:P[0][1],how:"parcelle",d:P[0][0],k};
   if(P.length){const Q=P.filter(same); return Q.length===1?{x:Q[0][1],how:"parcelle",d:Q[0][0],k,n:P.length}:{x:(Q[0]||P[0])[1],how:"parcelle?",d:(Q[0]||P[0])[0],k,n:P.length};}}
  /* sinon : la même adresse à 80 m au plus (sûr), ou la plus proche à 25 m parmi les copropriétés dont le registre ne donne pas la parcelle (probable) */
  const S=near(80).filter(same); if(S.length===1) return {x:S[0][1],how:"meme-adresse",d:S[0][0],k};
  const Z=near(25).filter(z=>!z[1][12]); return Z.length?{x:Z[0][1],how:"adresse",d:Z[0][0]}:{none:"adresse",k};}
 const N=+o.lots, r=o.r; if(!(N>0)) return {none:"lots"}; if(r==null||r>300) return {none:"position",r};
 const an=o.an>1500&&o.an<2100?+o.an:null, per=x=>x[7]>=0&&J.per[x[7]]?J.per[x[7]]:null, okA=x=>{const p=per(x); return an==null||!p||(an>=p[1]-3&&an<=p[2]+3);};
 const M=near(r+40).filter(z=>(z[1][3]===N||z[1][4]===N||z[1][5]===N)&&okA(z[1]));
 if(M.length!==1) return {none:M.length?"plusieurs":"aucune",n:M.length,N,r};
 const both=an!=null&&!!per(M[0][1]); if(r>125&&!both) return {none:"floue",r,N};
 return {x:M[0][1],how:"lots",d:M[0][0],r,N,both};}
/* ce qu'il faut pour rapprocher un bien : undefined tant que la fiche de l'annonce se charge, null sans adresse ni annonce */
function coproInput(b){if(!b) return null;
 if(b.id&&b.adresse&&b.lat!=null&&b.lon!=null) return {exact:true,lat:+b.lat,lon:+b.lon,cad:(b.geo||{}).cad||null,adr:b.adresse};
 const s=b.kind==="v"?b.suf:(typeof bienSuf==="function"?bienSuf(b):null); if(!s) return null;
 const fx=ficx(s)||{}, f=ficheOf(b.ville,s); if(f===undefined) return undefined;
 const la=fx.la!=null?fx.la:f&&f.la, lo=fx.lo!=null?fx.lo:f&&f.lo, r=fx.r!=null?fx.r:f&&f.r; if(la==null||lo==null) return {none:true};
 return {lat:la,lon:lo,r,lots:f&&f.lots,an:f&&f.an};}
/* état pour un bien : {wait} pendant un chargement, null si rien à dire, sinon {J, m} */
function coproOf(b){if(!b||!b.ville||typeof COPROV==="undefined"||!COPROV) return null; const J=coproData(b.ville); if(J===null) return null;
 const o=coproInput(b); if(o===null) return null; if(J===undefined||o===undefined) return {wait:true};
 return {J,m:o.none?{none:"position"}:coproMatch(J,o),bien:!!o.exact};}
const cpS=n=>n>1?"s":"";
function coproSyn(J,x){const nom=x[10]>=0?J.noms[x[10]]:"";
 if(x[9]===1||x[9]===2){const pt=(x[5]!=null?x[5]:x[3])!=null&&(x[5]!=null?x[5]:x[3])<=10;   /* petite copropriété : souvent gérée entre voisins, sans syndic déclaré */
  return [`<b>aucun syndic${x[9]===2?" en mandat":" déclaré"}</b>`,`${x[9]===2?CPMAN[2]+" ; ":""}${pt?"fréquent dans les petites copropriétés gérées entre voisins":"rare pour une copropriété de cette taille, ou registre pas à jour"} ; sans syndic, ni assemblée générale ni fonds de travaux : à demander au vendeur`];}
 return [x[8]===1?`professionnel${nom?" : "+esc(nom):""}`:x[8]===2?"bénévole (un copropriétaire)":"non précisé",x[8]===2?"frais de gestion faibles ; assemblées et travaux reposent sur les copropriétaires":x[9]===3?"changement de syndic déclaré":CPMAN[0]];}
/* rubrique « Copropriété » de la fiche : [résumé, html] */
function coproSec(b){const R=coproOf(b); if(!R) return null;
 if(R.wait) return ["chargement…",`<p class="sub" style="margin:0" data-cpw="${esc(b.ville)}">Recherche de la copropriété dans le registre…</p>`];
 const {J,m}=R, src=fNote(`Registre national d'immatriculation des copropriétés (Anah), à jour du ${frD(J.maj)}. Il ne dit rien des charges, des impayés ni des procédures : à lire dans les procès-verbaux d'assemblée générale et l'état daté.`);
 const tip=R.bien?"":`<p class="sub" style="margin:6px 0 0">Avec l'adresse exacte, saisie dans Nos biens, la copropriété est retrouvée sans doute possible, par sa parcelle.</p>`;
 if(!m||m.none){const t=!m?"":m.none==="lots"?"L'annonce ne donne pas le nombre de lots de la copropriété : sans l'adresse, impossible de la retrouver dans le registre."
   :m.none==="position"?"La position de l'annonce est trop approximative pour retrouver la copropriété."
   :m.none==="floue"?`Position de l'annonce à ${m.r} m près : trop large pour retrouver la copropriété sans l'année de construction.`
   :m.none==="plusieurs"?`${m.n} copropriétés de ${m.N} lots près de la position de l'annonce : impossible de savoir laquelle sans l'adresse.`
   :m.none==="aucune"?`Aucune copropriété de ${m.N} lots dans le registre près de la position de l'annonce : le nombre de lots annoncé diffère peut-être de celui du registre.`
   :`Aucune copropriété immatriculée${m.k?` sur la parcelle ${esc(m.k.slice(0,-4))} ${esc(m.k.slice(-4))}`:""} ni à moins de 25 m de l'adresse. Si l'immeuble est en copropriété, demandez son numéro d'immatriculation : il est obligatoire et figure sur les appels de charges.`;
  /* annonce : une ligne (le cas est fréquent et sans enjeu tant que l'adresse n'est pas connue) ; bien à son adresse : le détail */
  if(!R.bien) return ["non retrouvée",`<p class="sub" style="margin:0">${t?t+" ":""}Avec l'adresse exacte, saisie dans Nos biens, la copropriété est retrouvée par sa parcelle.</p>`];
  return ["non retrouvée",`<p style="margin:0">${t}</p>${tip}${src}`];}
 const x=m.x, per=x[7]>=0&&J.per[x[7]]?J.per[x[7]][0]:"", [sy,syn]=coproSyn(J,x), sure=m.how==="parcelle"||m.how==="meme-adresse";
 const pk=m.k?`${esc(m.k.slice(0,-4))} ${esc(m.k.slice(-4))}`:"";
 const how=m.how==="parcelle"?`copropriété de la parcelle cadastrale ${pk}, celle de l'adresse saisie${m.n?` (${m.n} copropriétés sur la parcelle : celle de la même adresse)`:""}`
  :m.how==="parcelle?"?`la plus proche des ${m.n} copropriétés de la parcelle ${pk} (aucune ou plusieurs à la même adresse) : vérifiez le numéro d'immatriculation`
  :m.how==="meme-adresse"?`copropriété à la même adresse que celle saisie (${Math.round(m.d)} m)`
  :m.how==="adresse"?`la plus proche de l'adresse saisie (${Math.round(m.d)} m) ; le registre ne donne pas sa parcelle`
  :`seule copropriété à moins de ${m.r+40} m de l'annonce dont le nombre de lots ou de logements est celui annoncé (${m.N})${m.both?", de l'époque annoncée":""}. Environ 9 sur 10 sont justes : vérifiez le numéro d'immatriculation dans les documents de vente`;
 const rows=[["Copropriété",`<b>${x[3]!=null?x[3]+" lot"+cpS(x[3]):"lots inconnus"}</b>${x[5]!=null?` dont ${x[5]} logement${cpS(x[5])}`:""}${x[6]?` · ${x[6]} parking${cpS(x[6])}`:""}`,`immatriculée n° ${esc(x[2])}${x[13]?" · "+esc(x[13]):""}`],
  per&&["Construction",per,"selon le registre"],
  ["Syndic",sy,syn],
  x[11]&1&&["Résidence-service","<b>oui</b>","services collectifs (accueil, restauration…) payés dans les charges"],
  x[11]&2&&["Aides de l'Anah","<b>reçues depuis 2014</b>","travaux de rénovation subventionnés, parfois une copropriété en difficulté : demandez lesquels"],
  x[11]&4&&["Quartier prioritaire","oui","politique de la ville (périmètres 2024)"],
  ["Rapprochement",`<b>${sure?"sûr":"probable"}</b>`,how]];
 const sum=[x[3]!=null&&`${x[3]} lots`,x[9]===1||x[9]===2?"aucun syndic":x[8]===1?"syndic pro":x[8]===2?"syndic bénévole":"",!sure&&"probable"].filter(Boolean).join(" · ");
 return [sum,fRows(rows)+tip+src];}
/* points d'attention tirés du registre (quand il est déjà chargé) */
function coproAttn(b){const R=coproOf(b); if(!R||R.wait||!R.m||!R.m.x) return []; const x=R.m.x, p=R.m.how==="parcelle"||R.m.how==="meme-adresse"?"":"Copropriété probable : ";
 return [(x[9]===1||x[9]===2)&&["warn",`${p}aucun syndic en mandat au registre des copropriétés. Sans syndic, ni assemblée générale ni fonds de travaux : à vérifier.`],
  x[11]&1&&["warn",`${p}résidence-service selon le registre des copropriétés : charges de services élevées, à vérifier.`]].filter(Boolean);}
/* le registre ou la fiche de l'annonce vient d'arriver : la fiche ouverte qui l'attendait est redessinée */
function coproFill(ck){if(typeof document==="undefined") return; if(document.querySelector(`[data-cpw="${ck}"]`)) document.dispatchEvent(new CustomEvent("v2fiche-maj",{detail:{ck}}));}
if(typeof ficheRefresh==="function"){const _fr=ficheRefresh; ficheRefresh=function(ck){_fr.apply(this,arguments); coproFill(ck);};}
