/* ---------- repères, demande locative, annonces ---------- */
/* repères calculés par règle (tools/collecte/reperes.js) : gare la plus fréquentée, campus du supérieur (public et privé), mairie */
const MARK=typeof REPQ!=="undefined"&&REPQ?REPQ:{};
/* repères : un type par clé (gare, univ, centre), autant de repères du même type que nécessaire (univ, univ2, univ3…) */
const mkT=k=>String(k).replace(/\d+$/,"");
const mkMap=o=>new Proxy(o,{get:(t,k)=>typeof k==="string"?t[mkT(k)]:t[k]});
const MARKTXT=mkMap({gare:"Gare",univ:"Université",centre:"Centre"});
const MKDE=mkMap({gare:"de la gare",univ:"de la fac",centre:"du centre"});

const unproj=(x,y)=>[MP.lat1-y/MAP.S, x/(MP.k*MAP.S)+MP.lon0];
/* mois vides d'un quartier : la vacance de la ville (vacVille, ci-dessous) est leur moyenne. Un quartier proche de la gare, de la fac ou du centre
   est en dessous, un quartier loin au-dessus : facteur 1 à 10 min ou moins, jusqu'à 2,5 à 50 min, divisé par le facteur moyen de la ville
   (quartiers comptés selon leurs ventes du type, DVF). Ville, quartiers, annonces et biens partent ainsi du même réglage. */
const vacF=sc=>1+1.5*(1-sc);
function demandRaw(t){const m=MARK[t.ck]; if(!m) return null;
 const T=typeof TTQ!=="undefined"&&TTQ[t.ck], f=T&&T.foot[t.code];
 if(f){const tr=typeof trajOf==="function"?trajOf(t):null, e=tr?tr.map(o=>o.best):f, i=e.indexOf(Math.min(...e)), mn=e[i], sc=Math.min(1,Math.max(0,1-(mn-10)/40)); return {d:T.dist[t.code][i],min:mn,foot:f[i],bike:T.bike[t.code][i],mk:T.marks[i],mode:tr?tr[i].mode:"foot",real:true,sc,f:vacF(sc)};}
 const [la,lo]=unproj(t.cx,t.cy);
 const d=Math.min(...Object.values(m).map(p=>hav(la,lo,p[0],p[1]))); const sc=Math.min(1,Math.max(0,1-(d-0.6)/2.4));
 return {d,sc,f:vacF(sc)};}
const FBAR={};
function vacBar(ck){const k=ck+"|"+H.type; if(FBAR[k]!=null) return FBAR[k]; const z=typeof IR!=="undefined"&&IR[ck]; let s=0, w=0;
 if(z){const D=dvfC(ck), L=z.list.filter(t=>t.type==="H"&&t.price), W=L.map(t=>(D&&D.q&&D.q[t.code]&&D.q[t.code].n)||0), any=W.some(v=>v>0);
  L.forEach((t,i)=>{const d=demandRaw(t), wi=any?W[i]:1; if(d&&wi){s+=d.f*wi; w+=wi;}});}
 return FBAR[k]=w>0?s/w:1;}
/* mois vides d'une ville, mesurés sur le relevé quotidien : combien de temps une location du type reste en ligne, de sa première vue à sa dernière
   (annonces apparues après le premier relevé de la ville ; celles encore en ligne comptent pour « au moins » leur durée : médiane de Kaplan-Meier).
   Le réglage « Vacance » est celui d'une ville où les locations restent en ligne la durée médiane des villes mesurées ; une ville où elles restent
   deux fois plus longtemps compte deux fois plus de mois vides. Retenue dès 10 locations parties dans la ville et 8 villes mesurées, rapprochée
   de 1 tant qu'elle repose sur peu d'annonces (poids n ÷ (n + 20), n = locations parties), bornée entre la moitié et le double. Avant : le réglage partout. */
function kmMed(D){const T=[...new Set(D.filter(d=>d[1]).map(d=>d[0]))].sort((a,b)=>a-b); let S=1;   /* D : [[jours, 1 partie | 0 encore en ligne]] */
 for(const t of T){const at=D.filter(d=>d[0]>=t).length, ev=D.filter(d=>d[0]===t&&d[1]).length; if(at) S*=1-ev/at; if(S<=0.5+1e-9) return t;} return null;}
let VACM=null;
function vacMes(){const ty=H.type||"studio", k=ty; if(VACM&&VACM.k===k) return VACM;   /* remis à zéro quand l'historique arrive (25-annonces-cloud.js) */
 const hz=HIST||{}; const day=s=>Date.parse(String(s).slice(0,10)+"T12:00:00Z")/864e5; let last=null;
 C.forEach(c=>Object.values((hz[c.k]&&hz[c.k].l)||{}).forEach(e=>{if(e&&e.s&&(!last||e.s>last)) last=e.s;}));
 const V={}; C.forEach(c=>{const E=hz[c.k]&&hz[c.k].l; if(!E||!last) return; let s0=null; Object.values(E).forEach(e=>{if(e&&e.f&&(!s0||e.f<s0)) s0=e.f;});
  const D=[]; let n=0, gone=0; Object.values(E).forEach(e=>{if(!e||!e.f||e.f<=s0||((e.m&&e.m[3])||"studio")!==ty) return; n++;
   if(e.g){gone++; D.push([Math.max(1,Math.round(day(e.s)-day(e.f))+1),1]);} else D.push([Math.max(1,Math.round(day(last)-day(e.f))+1),0]);});
  V[c.k]={n,gone,med:gone>=10?kmMed(D):null,s0};});
 const M=Object.values(V).map(v=>v.med).filter(v=>v!=null).sort((a,b)=>a-b), ref=M.length>=8?(M.length%2?M[M.length>>1]:(M[M.length/2-1]+M[M.length/2])/2):null;
 Object.values(V).forEach(v=>{v.f=ref&&v.med?Math.min(2,Math.max(0.5,Math.exp(v.gone/(v.gone+20)*Math.log(v.med/ref)))):1;});
 return VACM={k,ref,nv:M.length,last,V};}
function vacVille(ck){try{const v=vacMes().V[ck]; return H.vacance*(v?v.f:1);}catch(_){return H.vacance;}}
const vacAt=(ck,sc)=>vacVille(ck)*vacF(sc)/vacBar(ck);
function demandOf(t){const d=demandRaw(t); if(d) d.vac=vacAt(t.ck,d.sc); return d;}

/* ---------- comparaison ---------- */
let CMP=[];

function cmpKey(it){return it.kind+":"+(it.kind==="c"?it.k:it.kind==="q"?it.ck+"-"+it.code:it.id);}

const inCmp=it=>CMP.some(v=>cmpKey(v)===cmpKey(it));
function cmpBtn(it){return `<button type="button" class="cmpb${inCmp(it)?" on":""}" data-cmp='${JSON.stringify(it)}'>${inCmp(it)?"Comparé ✓":"+ Comparer"}</button>`;}

