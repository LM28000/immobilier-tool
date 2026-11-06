/* ---------- type de bien : les mêmes règles pour tous les types ----------
   p : pièces (critère des ventes réelles DVF), smin-smax : surfaces retenues, surf : surface de départ, rooms : chambres louées */
const TYPES={
 studio:{lab:"Studio",pl:"studios",un:"un studio",p:1,smin:12,smax:35,surf:22,rooms:1},
 t2:{lab:"T2",pl:"T2",un:"un T2",p:2,smin:30,smax:55,surf:42,rooms:1},
 t3:{lab:"T3",pl:"T3",un:"un T3",p:3,smin:50,smax:80,surf:62,rooms:1},
 coloc:{lab:"Colocation",pl:"T4",un:"un T4 en colocation (3 chambres)",p:4,dvf:"t4",smin:65,smax:100,surf:80,rooms:3,coloc:true}};
const tyOf=k=>TYPES[k]||TYPES.studio, TY=()=>tyOf(H.type), tyKey=k=>tyOf(k).dvf||(TYPES[k]?k:"studio");
/* règles de départ selon le type (modifiables ensuite dans les hypothèses) :
   meubles 1 500 € + 1 500 € par pièce (+ 1 500 € par chambre en colocation) · petits travaux 105 €/m² · copropriété, part propriétaire, 2,3 €/m²/mois */
function typeDefaults(k){const T=tyOf(k); return {surface:T.surf,meubles:1500+1500*T.p+(T.coloc?1500*T.rooms:0),travaux:Math.round(105*T.surf/50)*50,copro:Math.round(2.3*T.surf/5)*5};}
/* type d'un bien dont on connaît la surface (et éventuellement les pièces) */
function typeFor(surface,pieces){if(pieces) return pieces>=4?"coloc":pieces===3?"t3":pieces===2?"t2":"studio"; const s=+surface||22; return s<=35?"studio":s<=55?"t2":s<=80?"t3":"coloc";}
/* libellés : « studio », « T2 »… et le pluriel avec majuscule */
const tyLow=k=>{const T=tyOf(k||H.type); return T.p===1?"studio":T.coloc?"T4 en colocation":T.lab;};
const tyPl=k=>{const s=tyOf(k||H.type).pl; return s.charAt(0).toUpperCase()+s.slice(1);};
