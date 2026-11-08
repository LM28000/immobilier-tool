const HASH0=location.hash; /* lien #ville-quartier, lu avant que le premier rendu ne le remplace */
const P="https://immobilier.pappers.fr/prix-immobilier/", T="https://www.locservice.fr/tensiometre/tensiometre-studio-", HB="https://habity.fr/ville/";
const C=[
 {k:"lemans",name:"Le Mans",lat:48.00,lon:0.20,pm2:1959,evol:1.9,rent:450,rentM2:21,tf:47.80,students:15690,paris:.92,lab:"r",src:[P+"pays-de-la-loire/sarthe/le-mans",T+"72181.html",HB+"le-mans-72/finance"]},
 {k:"angers",name:"Angers",lat:47.47,lon:-0.55,pm2:3009,evol:1.6,rent:510,rentM2:21,tf:56.65,students:49747,paris:1.5,lab:"r",src:[P+"pays-de-la-loire/maine-et-loire/angers",T+"49007.html",HB+"angers-49/finance"]},
 {k:"tours",name:"Tours",lat:47.39,lon:0.69,pm2:2833,evol:2.3,rent:485,rentM2:21,tf:44.11,students:36458,paris:1,lab:"b",src:[P+"centre-val-de-loire/indre-et-loire/tours",T+"37261.html",HB+"tours-37/finance"]},
 {k:"poitiers",name:"Poitiers",lat:46.58,lon:0.34,pm2:2117,evol:-1.5,rent:420,rentM2:23,tf:54.91,students:29852,paris:1.33,lab:"r",src:[P+"nouvelle-aquitaine/vienne/poitiers",T+"86194.html",HB+"poitiers-86/finance"]},
 {k:"laval",name:"Laval",lat:48.07,lon:-0.77,pm2:2022,evol:3.9,rent:364,rentM2:20,tf:46.30,students:5119,paris:1.17,lab:"t",
  note:"Petit marché : un autre bilan LocService donne 295 € en moyenne pour un studio, et beaucoup de candidats n'ont pas les revenus demandés.",src:[P+"pays-de-la-loire/mayenne/laval",T+"53130.html",HB+"laval-53/finance"]},
 {k:"orleans",name:"Orléans",lat:47.90,lon:1.91,pm2:2462,evol:1.0,rent:490,rentM2:22,tf:54.70,students:21243,paris:1,lab:"t",src:[P+"centre-val-de-loire/loiret/orleans",T+"45234.html",HB+"orleans-45/finance"]},
 {k:"chartres",name:"Chartres",lat:48.45,lon:1.49,pm2:2376,evol:4.4,rent:505,rentM2:24,tf:56.10,students:2166,paris:1,lab:"r",
  note:"Peu d'étudiants : la demande vient surtout d'actifs. La dette de la ville est élevée, la taxe foncière pourrait monter.",src:[P+"centre-val-de-loire/eure-et-loir/chartres",T+"28085.html",HB+"chartres-28/finance"]},
 {k:"stnazaire",name:"Saint-Nazaire",lat:47.27,lon:-2.21,pm2:2796,evol:-1.5,rent:500,rentM2:20,tf:39.08,students:3556,paris:2.75,lab:"b",
  note:"Demande portée par les chantiers navals et les intérimaires ; les prix ont baissé de 1,5 % en un an.",src:[P+"pays-de-la-loire/loire-atlantique/st-nazaire",T+"44184.html",HB+"saint-nazaire-44/finance"]},
 {k:"rennes",name:"Rennes",lat:48.11,lon:-1.68,pm2:3662,evol:2.6,rent:537,rentM2:21,tf:47.70,students:78193,paris:1.5,lab:"t",
  note:"Très forte demande, mais prix au-dessus du budget visé : le crédit dépasse vite ce que la banque accepte.",src:[P+"bretagne/ille-et-vilaine/rennes",T+"35238.html",HB+"rennes-35/finance"]},
 {k:"blois",name:"Blois",lat:47.59,lon:1.335,pm2:1842,evol:-0.5,rent:450,rentM2:23,tf:57.70,students:2980,paris:1.5,lab:"r",
  note:"Taxe foncière parmi les plus élevées de la liste, et peu d'étudiants.",src:[P+"centre-val-de-loire/loir-et-cher/blois",T+"41018.html",HB+"blois-41/finance"]},
 {k:"caen",name:"Caen",lat:49.18,lon:-0.37,pm2:2861,evol:6.1,rent:480,rentM2:20,tf:52.64,students:40458,paris:2,lab:"r",src:[P+"normandie/calvados/caen",T+"14118.html",HB+"caen-14/finance"]},
 {k:"cholet",name:"Cholet",lat:47.06,lon:-0.88,pm2:2016,evol:8.8,rent:460,rentM2:25,tf:51.04,students:2523,paris:2.67,lab:"b",
  note:"Petit marché (793 ventes d'appartements) : la hausse de 8,8 % sur un an repose sur peu de ventes.",src:[P+"pays-de-la-loire/maine-et-loire/cholet",T+"49099.html",HB+"cholet-49/finance"]},
 {k:"laroche",name:"La Roche-sur-Yon",lat:46.67,lon:-1.43,pm2:2388,evol:2.3,rent:468,rentM2:25,tf:51.05,students:6673,paris:3,lab:"r",src:[P+"pays-de-la-loire/vendee/la-roche-sur-yon",T+"85191.html",HB+"la-roche-sur-yon-85/finance"]},
 /* ajoutées en novembre 2026 (classement des villes de l'Ouest, REGLES.md « Villes ajoutées ») : prix et évolution = ventes réelles DVF (médiane des appartements 2023-2025, 2025 vs 2024),
    loyer = 1,207 × loyer de la carte de l'État (1-2 pièces) ramené à 22 m² avec l'exposant de la ville, taxe foncière 2025, étudiants de l'unité urbaine 2023-2024 (ESR), train le plus rapide vers Paris (SNCF Connect) */
 {k:"evreux",name:"Évreux",lat:49.02,lon:1.141,pm2:1780,evol:-0.2,rent:568,rentM2:22,tf:59.68,students:3711,paris:0.93,lab:"r",src:["https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous&level=commune&code=27229","https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025","https://data.economie.gouv.fr/explore/dataset/fiscalite-locale-des-particuliers/"]},
 {k:"bourges",name:"Bourges",lat:47.08,lon:2.398,pm2:1585,evol:6.2,rent:513,rentM2:22,tf:45.92,students:3913,paris:1.93,lab:"r",src:["https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous&level=commune&code=18033","https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025","https://data.economie.gouv.fr/explore/dataset/fiscalite-locale-des-particuliers/"]},
 {k:"niort",name:"Niort",lat:46.33,lon:-0.461,pm2:1964,evol:-4.3,rent:502,rentM2:22,tf:49.39,students:3053,paris:1.88,lab:"r",src:["https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous&level=commune&code=79191","https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025","https://data.economie.gouv.fr/explore/dataset/fiscalite-locale-des-particuliers/"]},
 {k:"limoges",name:"Limoges",lat:45.86,lon:1.226,pm2:1559,evol:0.5,rent:448,rentM2:22,tf:44.62,students:20404,paris:3.45,lab:"r",src:["https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous&level=commune&code=87085","https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025","https://data.economie.gouv.fr/explore/dataset/fiscalite-locale-des-particuliers/"]},
 {k:"brest",name:"Brest",lat:48.41,lon:-4.5,pm2:2118,evol:2.9,rent:537,rentM2:22,tf:43.83,students:29601,paris:3.57,lab:"r",src:["https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous&level=commune&code=29019","https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025","https://data.economie.gouv.fr/explore/dataset/fiscalite-locale-des-particuliers/"]},
 {k:"alencon",name:"Alençon",lat:48.43,lon:0.092,pm2:1182,evol:-1.4,rent:416,rentM2:22,tf:55.69,students:2054,paris:2.03,lab:"r",src:["https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous&level=commune&code=61001","https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025","https://data.economie.gouv.fr/explore/dataset/fiscalite-locale-des-particuliers/"]},
 {k:"cherbourg",name:"Cherbourg-en-Cotentin",lat:49.63,lon:-1.636,pm2:2246,evol:8.9,rent:492,rentM2:22,tf:52.57,students:2015,paris:3.12,lab:"r",src:["https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous&level=commune&code=50129","https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025","https://data.economie.gouv.fr/explore/dataset/fiscalite-locale-des-particuliers/"]}
];
const ORIG={laval:{name:"Laval",lat:48.07,lon:-0.77,mode:"en voiture"},nantes:{name:"Nantes",lat:47.22,lon:-1.55,mode:"en voiture"},paris:{name:"Paris",lat:48.86,lon:2.35,mode:"en train"}};
const RAIL=[[[48.86,2.35],[48.45,1.49],[48.00,0.20],[48.07,-0.77],[48.11,-1.68]],[[48.00,0.20],[47.47,-0.55],[47.22,-1.55],[47.27,-2.21]],
 [[48.86,2.35],[47.90,1.91],[47.59,1.335],[47.39,0.69],[47.26,-0.08],[47.47,-0.55]],[[48.86,2.35],[47.79,1.07],[47.39,0.69],[46.58,0.34]],
 [[48.86,2.35],[49.02,1.15],[49.15,0.23],[49.18,-0.37]],[[49.18,-0.37],[48.43,0.09],[48.00,0.20]],[[47.22,-1.55],[46.67,-1.43]],
 [[47.47,-0.55],[47.06,-0.88],[47.22,-1.55]],[[48.11,-1.68],[47.65,-2.08],[47.22,-1.55]]];
const H={type:"studio",surface:22,surcote:15,loyerAdj:0,apport:15000,taux:4.07,duree:25,assur:0.40,notaire:8,meubles:3000,travaux:2300,chLoc:45,vacance:1,copro:21,autres:48,grosTrav:6,tfMans:40,px:1,ly:1.5,cg:2,salaires:2500,pretEtud:0,fraisVente:3,pess:false,vacQ:true,dvf:true};
const HDEF=Object.assign({},H);   /* valeurs de départ (bouton « valeurs par défaut ») */
const hypDefs=[["surface","Surface","m²",1],["apport","Apport","€",500],["duree","Durée","ans",1],["notaire","Notaire","%",0.5],
 ["meubles","Meubles","€",250],["travaux","Petits travaux","€",250],["chLoc","Charges payées par le locataire","€/mois",5],["vacance","Vacance","mois/an",0.5],
 ["copro","Charges de copro (votre part)","€/mois",1],["grosTrav","Gros travaux copro (provision)","€/m²/an",1],["autres","Assurance PNO, entretien","€/mois",5],["px","Hausse des prix","%/an",0.5],["ly","Hausse des loyers","%/an",0.5],
 ["salaires","Revenus nets du foyer","€/mois",50],["pretEtud","Autres crédits en cours","€/mois",10],["fraisVente","Frais à la revente","%",0.5]];
/* réglages gardés dans ce navigateur (le code ne contient que des valeurs d'exemple) ; communs à deux avec la liste commune (13-reglages-communs.js) */
const HYPK=["apport","duree","notaire","grosTrav","vacance","autres","px","ly","salaires","pretEtud","fraisVente","surcote","loyerAdj","taux"];
let HYPOK=false; try{const s=JSON.parse(localStorage.getItem("hyp")||"null"); if(s&&typeof s==="object"){if(!s.v2&&s.fraisVente===5) delete s.fraisVente; /* ancienne valeur par défaut (5 %, novembre 2026), trop prudente */ HYPK.forEach(k=>{if(typeof s[k]==="number"&&isFinite(s[k])) H[k]=s[k];}); HYPOK=s.salaires!=null;}}catch(_){}
function saveHyp(){try{const s={v2:1}; HYPK.forEach(k=>s[k]=H[k]); localStorage.setItem("hyp",JSON.stringify(s)); HYPOK=true;}catch(_){} const n=document.getElementById("hypNote"); if(n) n.hidden=true; if(typeof regPush==="function") regPush();}
let SEL="lemans";

const eur=v=>Math.round(v).toLocaleString("fr-FR")+" €";
const keur=v=>Math.abs(v)<1?"0":(v<0?"−":"")+(Math.abs(v)/1000).toFixed(Math.abs(v)<10000?1:0).replace(".",",")+" k€";
const sgn=v=>(v>=0?"+":"−")+Math.abs(Math.round(v)).toLocaleString("fr-FR")+" €";
const pct=(v,d=1)=>v.toFixed(d).replace(".",",")+" %";
const hm=h=>{if(h<0.05)return"sur place";const t=Math.round(h*12)*5,a=Math.floor(t/60),m=t%60;return a?(m?`${a} h ${String(m).padStart(2,"0")}`:`${a} h`):`${m} min`;};
const hav=(a,b,c,d)=>{const R=6371,r=Math.PI/180,dl=(c-a)*r,dg=(d-b)*r,x=Math.sin(dl/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
function trip(c,o){if(o==="paris") return c.paris; const g=ORIG[o]; if(c.k===o) return 0; return hav(g.lat,g.lon,c.lat,c.lon)*1.2/105+0.1;}

function irrMonthly(f){let lo=-0.05,hi=0.1;const npv=r=>f.reduce((s,v,i)=>s+v/Math.pow(1+r,i),0);
 if(npv(lo)*npv(hi)>0) return null; for(let i=0;i<90;i++){const m=(lo+hi)/2; if(npv(m)>0) lo=m; else hi=m;} return (Math.pow(1+(lo+hi)/2,12)-1)*100;}
// calc(c) : voir 00b-financement-impots.js
function all(){
 const rows=C.map(c=>({c,x:calc(c)}));
 return rows;
}
const bankOk=x=>Math.round(x*100)<=35;   // même arrondi que l'affichage (35 % = limite, pas refusé)
const bank=x=>Math.round(x*100)<=33?["p-ok","Passe"]:bankOk(x)?["p-warn","Limite"]:["p-bad","Trop haut"];
const colIrr=irr=>irr==null||irr<2.5?"var(--bad)":irr<5?"var(--warn)":"var(--ok)";
const colOf=r=>colCity(r.x);

