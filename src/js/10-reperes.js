/* ---------- repères, demande locative, annonces ---------- */
/* repères calculés par règle (tools/collecte/reperes.js) : gare la plus fréquentée, campus du supérieur public, mairie */
const MARK=typeof REPQ!=="undefined"&&REPQ?REPQ:{};
/* repères : un type par clé (gare, univ, centre), autant de repères du même type que nécessaire (univ, univ2, univ3…) */
const mkT=k=>String(k).replace(/\d+$/,"");
const mkMap=o=>new Proxy(o,{get:(t,k)=>typeof k==="string"?t[mkT(k)]:t[k]});
const MARKTXT=mkMap({gare:"Gare",univ:"Université",centre:"Centre"});
const MKDE=mkMap({gare:"de la gare",univ:"de la fac",centre:"du centre"});

const unproj=(x,y)=>[MP.lat1-y/MAP.S, x/(MP.k*MAP.S)+MP.lon0];
/* mois vides d'un quartier : le réglage « Vacance » (Budget) est la moyenne de la ville. Un quartier proche de la gare, de la fac ou du centre
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
const vacAt=(ck,sc)=>H.vacance*vacF(sc)/vacBar(ck);
function demandOf(t){const d=demandRaw(t); if(d) d.vac=vacAt(t.ck,d.sc); return d;}

/* ---------- comparaison ---------- */
let CMP=[];

function cmpKey(it){return it.kind+":"+(it.kind==="c"?it.k:it.kind==="q"?it.ck+"-"+it.code:it.id);}

const inCmp=it=>CMP.some(v=>cmpKey(v)===cmpKey(it));
function cmpBtn(it){return `<button type="button" class="cmpb${inCmp(it)?" on":""}" data-cmp='${JSON.stringify(it)}'>${inCmp(it)?"Comparé ✓":"+ Comparer"}</button>`;}

