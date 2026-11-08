/* ---------- type de bien : les mêmes règles pour tous les types ----------
   Le type se définit par le nombre de pièces (comme les ventes DVF, la carte des loyers de l'État et les annonces).
   smin-smax : bornes larges qui écartent seulement les erreurs de saisie · surf : surface de départ */
const TYPES={
 studio:{lab:"Studio",pl:"studios",un:"un studio",p:1,smin:9,smax:45,surf:22},
 t2:{lab:"T2",pl:"T2",un:"un T2",p:2,smin:25,smax:75,surf:42},
 t3:{lab:"T3",pl:"T3",un:"un T3",p:3,smin:40,smax:110,surf:62}};
const tyOf=k=>TYPES[k]||TYPES.studio, TY=()=>tyOf(H.type), tyKey=k=>TYPES[k]?k:"studio";
/* charges, mesurées le 8 novembre 2026 sur les fiches des annonces des 20 villes : charges de copropriété annoncées dans les ventes,
   médiane 62 / 89 / 125 €/mois (studio / T2 / T3, soit environ 25 € + 1,6 €/m²) ; charges payées par le locataire dans les locations,
   médiane 47 / 50 / 75 €/mois. Le locataire rembourse donc environ 65 % des charges : il reste au propriétaire 35 % des charges annoncées. */
const PART_PROPRIO=0.35, CH_LOC={studio:45,t2:50,t3:75};
/* règles de départ selon le type (modifiables ensuite dans les hypothèses) :
   meubles 1 500 € + 1 500 € par pièce · petits travaux 105 €/m² · copropriété, part propriétaire = 35 % des charges médianes · charges du locataire mesurées */
function typeDefaults(k){const T=tyOf(k); return {surface:T.surf,meubles:1500+1500*T.p,travaux:Math.round(105*T.surf/50)*50,copro:Math.round(PART_PROPRIO*(25+1.6*T.surf)),chLoc:CH_LOC[tyKey(k)]};}
/* valeurs du type changées à la main (surface, meubles, travaux, copro, charges du locataire) : elles remplacent les règles de départ
   pour ce type, sont gardées dans ce navigateur et communes à deux avec la liste commune (13-reglages-communs.js) */
const TYK=["surface","meubles","travaux","copro","chLoc"];
let TYV={}; try{const t=JSON.parse(localStorage.getItem("tyv")||"null"); if(t&&typeof t==="object"&&!Array.isArray(t)) TYV=t;}catch(_){}
function typeVals(k){const d=typeDefaults(k), o=TYV[tyKey(k)]||{}; TYK.forEach(f=>{if(typeof o[f]==="number"&&isFinite(o[f])) d[f]=o[f];}); return d;}
function saveTyvLocal(){try{localStorage.setItem("tyv",JSON.stringify(TYV));}catch(_){}}
function saveTyv(k){const t=tyKey(H.type), d=typeDefaults(t), o=Object.assign({},TYV[t]||{}); if(H[k]===d[k]) delete o[k]; else o[k]=H[k];
 if(Object.keys(o).length) TYV[t]=o; else delete TYV[t]; saveTyvLocal(); if(typeof regPush==="function") regPush();}
/* type d'un bien : ses pièces ; à défaut, sa surface */
function typeFor(surface,pieces){pieces=+pieces||0; if(pieces) return pieces>=3?"t3":pieces===2?"t2":"studio"; const s=+surface||22; return s<=30?"studio":s<=50?"t2":"t3";}
/* libellés : « studio », « T2 »… et le pluriel avec majuscule */
const tyLow=k=>{const T=tyOf(k||H.type); return T.p===1?"studio":T.lab;};
/* « 3 studios », « 1 T2 » */
const tyN=n=>n+" "+(n>1?(TY().p===1?"studios":TY().pl):tyLow());
const tyPl=k=>{const s=tyOf(k||H.type).pl; return s.charAt(0).toUpperCase()+s.slice(1);};
