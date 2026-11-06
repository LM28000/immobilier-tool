/* ---------- type de bien : les mêmes règles pour tous les types ----------
   Le type se définit par le nombre de pièces (comme les ventes DVF, la carte des loyers de l'État et les annonces).
   smin-smax : bornes larges qui écartent seulement les erreurs de saisie · surf : surface de départ */
const TYPES={
 studio:{lab:"Studio",pl:"studios",un:"un studio",p:1,smin:9,smax:45,surf:22},
 t2:{lab:"T2",pl:"T2",un:"un T2",p:2,smin:25,smax:75,surf:42},
 t3:{lab:"T3",pl:"T3",un:"un T3",p:3,smin:40,smax:110,surf:62}};
const tyOf=k=>TYPES[k]||TYPES.studio, TY=()=>tyOf(H.type), tyKey=k=>TYPES[k]?k:"studio";
/* règles de départ selon le type (modifiables ensuite dans les hypothèses) :
   meubles 1 500 € + 1 500 € par pièce · petits travaux 105 €/m² · copropriété, part propriétaire, 2,3 €/m²/mois */
function typeDefaults(k){const T=tyOf(k); return {surface:T.surf,meubles:1500+1500*T.p,travaux:Math.round(105*T.surf/50)*50,copro:Math.round(2.3*T.surf/5)*5};}
/* type d'un bien : ses pièces ; à défaut, sa surface */
function typeFor(surface,pieces){pieces=+pieces||0; if(pieces) return pieces>=3?"t3":pieces===2?"t2":"studio"; const s=+surface||22; return s<=30?"studio":s<=50?"t2":"t3";}
/* libellés : « studio », « T2 »… et le pluriel avec majuscule */
const tyLow=k=>{const T=tyOf(k||H.type); return T.p===1?"studio":T.lab;};
const tyPl=k=>{const s=tyOf(k||H.type).pl; return s.charAt(0).toUpperCase()+s.slice(1);};
