// Tests du moteur de calcul, sans navigateur : node tests/unit.js
// Charge src/js/00*.js (villes, types, financement et impôts) avec les données, et vérifie des cas calculés à la main.
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.resolve(__dirname, '..'), rd = p => fs.readFileSync(path.join(R, p), 'utf8');
const store = {};
const ctx = vm.createContext({console, Math, JSON, Object, Array, Number, String, Set, Map, isFinite, isNaN, parseFloat,
  location: {hash: ''}, localStorage: {getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }}});
const run = (code, name) => vm.runInContext(code, ctx, {filename: name});
run(`const DVFALL=${rd('data/dvf.json')}; const LOYQ=${rd('data/loyers-etat.json')};`, 'données');
for (const f of fs.readdirSync(path.join(R, 'src/js')).filter(f => /^00/.test(f)).sort()) run(rd('src/js/' + f), f);
// fonctions isolées d'autres fichiers (pas de DOM nécessaire)
const pick = (file, start) => { const s = rd(file), i = s.indexOf(start); if (i < 0) throw new Error(start + ' introuvable dans ' + file); let d = 0, j = s.indexOf('{', i);
  for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}' && !--d) break; } return s.slice(i, j + 1); };
run(pick('src/js/21-shortlist-partage.js', 'function merge3') .replace(/^/, "const jeq=(a,b)=>JSON.stringify(a)===JSON.stringify(b), isO=v=>v&&typeof v===\"object\"&&!Array.isArray(v);\n"), 'merge3');
run(pick('src/js/11-nos-biens.js', 'function normBien'), 'normBien');

let n = 0, bad = 0; const ok = (name, cond, info = '') => { n++; if (!cond) bad++; console.log((cond ? '✓ ' : '✗ ') + name + (cond || !info ? '' : '  → ' + info)); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const E = s => vm.runInContext(s, ctx);

// prêt : 100 000 € à 4 % sur 25 ans → 527,84 €/mois, capital entièrement remboursé
const L = E('loanYears(100000,4,25,0)');
ok('mensualité 100 000 € à 4 % sur 25 ans = 527,84 €', near(L.M, 527.84, 0.01), L.M);
ok('prêt remboursé en 300 mois', L.months === 300 && L.Y[24].crd < 0.02, L.months);
ok('intérêts + capital = mensualités', near(L.Y.reduce((s, y) => s + y.int + y.cap, 0), L.M * 300, 0.5));
// TRI : 1 000 € placés, 1 100 € rendus 12 mois plus tard → 10 %/an
ok('TRI d\'un flux simple = 10 %', near(E('irrMonthly([-1000,0,0,0,0,0,0,0,0,0,0,0,1100])'), 10, 0.01), E('irrMonthly([-1000,0,0,0,0,0,0,0,0,0,0,0,1100])'));
ok('TRI introuvable → null', E('irrMonthly([100,100])') === null);
// abattements de la plus-value des particuliers (IR, prélèvements sociaux)
const ab = y => E(`abatPV(${y})`);
ok('abattements à 5 ans : aucun', ab(5)[0] === 0 && ab(5)[1] === 0);
ok('abattements à 6 ans : 6 % et 1,65 %', near(ab(6)[0], 0.06, 1e-9) && near(ab(6)[1], 0.0165, 1e-9));
ok('abattements à 22 ans : IR exonéré, PS 28 %', ab(22)[0] === 1 && near(ab(22)[1], 0.28, 1e-9));
ok('abattements à 30 ans : tout exonéré', ab(30)[0] === 1 && near(ab(30)[1], 1, 1e-9));
// calcul d'une ville
const lm = E('calc(C.find(c=>c.k==="lemans"))');
ok('Le Mans : rendement brut positif et budget cohérent', lm.brut > 0 && lm.cost > lm.bien && lm.P >= 0);
ok('cash-flow net ≤ cash-flow brut', lm.cfNet <= lm.cfBrut + 1e-9);
ok('TRI net ≤ TRI brut', lm.irrNet == null || lm.irrBrut == null || lm.irrNet <= lm.irrBrut + 1e-9);
const irrFv = fv => { E(`H.fraisVente=${fv}; CALCC.clear();`); return E('calc(C.find(c=>c.k==="lemans")).irr'); };
const i0 = irrFv(0), i5 = irrFv(5); E('H.fraisVente=5; CALCC.clear();');
ok('frais de revente : le rendement baisse', i5 < i0, `${i0} → ${i5}`);
E('H.pess=true; CALCC.clear();'); const pe = E('calc(C.find(c=>c.k==="lemans"))'); E('H.pess=false; CALCC.clear();');
ok('scénario pessimiste : cash-flow plus bas', pe.cfBrut < lm.cfBrut);
// types et loyers
ok('type d\'un bien : pièces d\'abord, sinon surface', E('typeFor(33,2)') === 't2' && E('typeFor(33)') === 't2' && E('typeFor(28,1)') === 'studio' && E('typeFor(95,4)') === 't3');
ok('exposant loyer/surface borné entre 0,4 et 0,9', E('C.every(c=>{const e=rentExp(c.k); return e>=0.4&&e<=0.9;})'));
// fusion à trois de la liste partagée : chacun garde ce qu'il a changé
const m = E(`merge3({a:1,v:{avis:{A:{n:3},B:{n:2}}}}, {a:1,v:{avis:{A:{n:5},B:{n:2}}}}, {a:2,v:{avis:{A:{n:3},B:{n:4}}}})`);
ok('fusion : ma note, sa note et son autre changement sont gardés', m.a === 2 && m.v.avis.A.n === 5 && m.v.avis.B.n === 4, JSON.stringify(m));
// nettoyage des biens lus dans la liste partagée
const b1 = E(`normBien("abc-1",{ville:"lemans",prix:60000,surface:22,dpe:"<img src=x onerror=alert(1)>",statut:"<b>",url:"javascript:alert(1)",id:"pirate\\"><svg>"})`);
ok('bien hostile : DPE, statut, lien et id neutralisés', b1.id === 'abc-1' && b1.dpe === '' && b1.statut === 'à voir' && b1.url === '' && !b1.bad);
const b2 = E(`normBien("x1",{ville:"atlantis",prix:"abc"})`);
ok('bien illisible : gardé et signalé', b2.bad === true && /illisible/.test(b2.titre) && b2.ville === 'lemans');
ok('shortlist : retrait conservé, absent laissé absent', E(`normBien("a",{ville:"lemans",prix:1e4,surface:20,short:false}).short`) === false && E(`"short" in normBien("a",{ville:"lemans",prix:1e4,surface:20})`) === false);

// associés : deux personnes d'avant → deux associés, mêmes chiffres ; trois associés, chacun à sa tranche
ok('associés : deux par défaut, assurance et impôt inchangés', E('H.assoc.length') === 2 && near(E('insRate()'), 0.4, 1e-9) && near(E('taxRate()'), 0.186, 1e-9));
const as3 = E(`(()=>{const s=JSON.stringify(H.assoc); H.assoc=[{nom:"A",part:50,revenus:2000,credits:100,tmi:30,assur:0.3,quot:100},{nom:"B",part:30,revenus:1500,credits:0,tmi:11,assur:0.2,quot:50},{nom:"C",part:20,revenus:1000,credits:0,tmi:0,assur:0.1,quot:50}]; assocNorm(); CALCC.clear();
 const x=calc(C[0]), r={n:H.assoc.length,sal:H.salaires,cred:H.pretEtud,tr:taxRate(),ir:insRate(),imp:x.imp1,imps:x.imps,ratios:x.ratios,ratio:x.ratio}; H.assoc=JSON.parse(s); assocNorm(); CALCC.clear(); return r;})()`);
ok('associés : trois, revenus et crédits additionnés', as3.n === 3 && as3.sal === 4500 && as3.cred === 100, JSON.stringify(as3));
ok('associés : impôt au taux moyen des parts', near(as3.tr, ((30 + 18.6) * 50 + (11 + 18.6) * 30 + (0 + 18.6) * 20) / 1e4, 1e-9) && near(as3.ir, (0.3 * 100 + 0.2 * 50 + 0.1 * 50) / 100, 1e-9));
ok('associés : l\'impôt de chacun fait le total, un endettement par personne', as3.imps.length === 3 && near(as3.imps.reduce((a, b) => a + b, 0), as3.imp, 1e-6) && as3.ratios.length === 3 && as3.ratios.every(r => r > 0));
ok('associés : réglage du serveur MCP réparti', E(`(()=>{const s=JSON.stringify(H.assoc); assocFromLegacy({salaires:4000,tmiB:41}); const r=[H.salaires,H.assoc[1].tmi]; H.assoc=JSON.parse(s); assocNorm(); return r;})()`).join() === '4000,41');

// gestion par agence : une part du loyer encaissé, en moins chaque mois et déduite au réel
const g0 = E('CALCC.clear(); calc(C.find(c=>c.k==="lemans"))'), g1 = E('H.gestion=9.5; CALCC.clear(); const r_=calc(C.find(c=>c.k==="lemans")); H.gestion=0; CALCC.clear(); r_');
ok('gestion par agence : 0 par défaut, rien ne change', E('H.gestion') === 0 && g0.gest === 0);
ok('gestion par agence 9,5 % : cash-flow brut plus bas de 9,5 % du loyer encaissé, rendement plus bas', near(g0.cfBrut - g1.cfBrut, g1.rentEff * 0.095, 1e-6) && g1.irr < g0.irr, `${g0.cfBrut} ${g1.cfBrut} ${g1.rentEff}`);
// scénarios : prix 0,5 point plus bas (prudent) ou plus haut (favorable)
const sx = E('(()=>{const c=C.find(c=>c.k==="lemans"); CALCC.clear(); const m=calc(c).px; H.pess=true; CALCC.clear(); const p=calc(c).px; H.pess=false; H.fav=true; CALCC.clear(); const f=calc(c).px; H.fav=false; CALCC.clear(); return [m,p,f];})()');
ok('scénarios : prix 0,5 point par an plus bas ou plus haut', near(sx[1], sx[0] - 0.5, 1e-9) && near(sx[2], sx[0] + 0.5, 1e-9), sx.join());
// mois vides mesurés : médiane de Kaplan-Meier (annonces encore en ligne comptées « au moins »)
run(pick('src/js/10-reperes.js', 'function kmMed'), 'kmMed');
ok('délai de location : médiane de Kaplan-Meier', E('kmMed([[5,1],[10,1],[20,0],[30,1]])') === 10 && E('kmMed([[5,1],[40,0],[40,0]])') === null && E('kmMed([[3,1],[3,1],[8,0],[9,1]])') === 3);
// hausse des prix selon la ville : pente mesurée entre hausse et logements vides, la ville médiane prend le réglage
run(`var PXTQ=${rd('data/prix-tendance.json')}; var RISK=(${rd('src/js/01-fiche-ville.js').match(/const RISK=(\{[\s\S]*?\});/)[1]});`, 'prix-tendance');
const px = E('(()=>{PXP=null; const P=pxPente(), d=C.map(c=>[c.k,pxDev(c.k)]); H.pxV=0; const off=C.every(c=>pxDev(c.k)===0); H.pxV=1; PXP=null; return {P,d:Object.fromEntries(d),off};})()');
ok('hausse des prix selon la ville : pente négative mesurée sur 15 villes au moins', px.P.b < 0 && px.P.b >= -1 && px.P.n >= 15, JSON.stringify(px.P));
ok('hausse des prix selon la ville : moins de logements vides, plus de hausse ; écart borné à 2 points', px.d.angers > 0 && px.d.bourges < 0 && Object.values(px.d).every(v => Math.abs(v) <= 2), JSON.stringify(px.d));
ok('hausse des prix selon la ville : décochée, la même partout', px.off);
E('var RISK=undefined; PXP=null; CALCC.clear();');
// zone tendue : un bien vendu loué garde son loyer au départ du locataire (Rennes) ; ailleurs, prime meublé, DPE F ou G compris (sa rénovation est comptée dans les travaux)
const zt = E(`(()=>{const mk=(k,dpe)=>{const c=C.find(v=>v.k===k); return Object.assign({},c,{prixTot:60000,surf:20,type:"studio",rent:380,rentM2:20,rentFixed:true,bailAns:1,rentEst:c.rent*1.3,rentM2Est:c.rentM2,dpe:dpe||""});};
  CALCC.clear(); const r=calc(mk("rennes")), m=calc(mk("lemans")), f=calc(mk("lemans","F"));
  ZTEN.delete("rennes"); CALCC.clear(); const r0=calc(mk("rennes")); ZTEN.add("rennes"); CALCC.clear();
  const lg=v=>calc(Object.assign(mk("lemans"),{bailAns:30,vac:v})).irr;   /* bail plus long que le calcul : logement occupé, aucun mois vide */
  return {r:[r.plaf,r.irr],r0:[r0.plaf,r0.irr],m:[m.plaf,m.irr],f:[f.plaf,f.irr],zt:r.zt,ztm:m.zt,occ:[lg(0),lg(3)],libre:[calc(Object.assign(mk("lemans"),{bailAns:null,vac:0})).irr,calc(Object.assign(mk("lemans"),{bailAns:null,vac:3})).irr]};})()`);
ok('zone tendue : Rennes, Nantes, Caen, Orléans, Saint-Nazaire', E('["rennes","nantes","caen","orleans","stnazaire"].every(k=>ZTEN.has(k)) && ZTEN.size===5 && !ZTEN.has("lemans")'));
ok('zone tendue : bien vendu loué, loyer gardé au départ du locataire (rendement plus bas que sans la règle)', zt.r[0] === 'zt' && zt.r0[0] === null && zt.r[1] < zt.r0[1] && zt.zt === true && zt.ztm === false, JSON.stringify(zt));
ok('DPE F ou G hors zone tendue : loyer relevé au départ du locataire comme ailleurs (rénovation comptée dans les travaux)', zt.f[0] === null && zt.m[0] === null && zt.f[1] === zt.m[1], JSON.stringify(zt));
const fon = E(`(()=>{const c=C.find(v=>v.k==="lemans"), mk=o=>Object.assign({},c,{prixTot:60000,surf:20,type:"studio",rent:380,rentM2:20,rentFixed:true,bailAns:3,rentEst:c.rent*1.3,rentM2Est:c.rentM2},o);
  const a0=H.assoc.map(a=>a.tmi); H.assoc.forEach(a=>{a.tmi=30;}); CALCC.clear(); const v=calc(mk({bailVide:true})), m=calc(mk({bailVide:false})); H.assoc.forEach((a,i)=>{a.tmi=a0[i];}); CALCC.clear();
  return {v:[v.imp1,v.irr],m:[m.imp1,m.irr],loyer:v.rentHC};})()`);
ok('bien vendu loué avec un bail vide : revenus fonciers (micro-foncier, 30 % d\'abattement, 17,2 % de prélèvements) jusqu\'au départ du locataire', Math.abs(fon.v[0] - fon.loyer*12*0.7*0.472) < 1 && fon.v[0] > fon.m[0] && fon.v[1] < fon.m[1], JSON.stringify(fon));
const cpt = E(`(()=>{const c=C.find(v=>v.k==="lemans"), mk=o=>Object.assign({},c,{prixTot:60000,surf:20,type:"studio",rent:380,rentM2:20,rentFixed:true,bailAns:3,rentEst:c.rent*1.3,rentM2Est:c.rentM2},o), r0=H.regime;
  H.regime="reel"; CALCC.clear(); const v=calc(mk({bailVide:true})), m=calc(mk({bailVide:false})); H.regime=r0; CALCC.clear(); return {v:[v.compta1,v.fees1],m:[m.compta1,m.fees1],compta:H.compta};})()`);
ok('régime réel : comptable compté à part la première année (aucun pendant un bail vide en cours) : la CFE affichée n\'est jamais négative', cpt.v[0] === 0 && cpt.m[0] === cpt.compta && cpt.v[1] - cpt.v[0] >= 0 && cpt.m[1] - cpt.m[0] >= 0, JSON.stringify(cpt));
run('const ficx=s=>s==="m"?{fl:["meub"]}:{}; const copAn=f=>f.cop||0;\n' + pick('src/js/24-fiches-annonces.js', 'function iaPoints'), 'iaPoints');
const ip = E(`iaPoints({cop:650,et:2,dpe:"F",lots:12,ia:{loue:true,loyer_mensuel:417,points:["Dernier étage, DPE excessif","Loyer annuel 5 000 € HC","Copropriété de 12 lots, charges 650 €/an","Ravalement voté en 2025, 1,5 km de la gare","Vendu meublé"]}},"m")`);
ok('description lue : les points ne répètent pas les lignes de la fiche (étage, DPE, loyer, lots, charges, vendu meublé), le reste est gardé', JSON.stringify(ip) === JSON.stringify(["Ravalement voté en 2025, 1,5 km de la gare"]), JSON.stringify(ip));
ok('bien vendu loué : pas de mois vides pendant le bail en cours', Math.abs(zt.occ[0] - zt.occ[1]) < 1e-9 && zt.libre[0] > zt.libre[1] + 0.3, JSON.stringify([zt.occ, zt.libre]));
// bruit des aéroports : zone la plus forte qui contient le point (plan d'exposition au bruit)
run(`var PEBB=null; var PEBQ={aero:[{oaci:"LFXX",nom:"Essai",date:"2004-09-17"}],z:[{oaci:"LFXX",zone:"D",g:[[[0,0],[4,0],[4,4],[0,4],[0,0]]]},{oaci:"LFXX",zone:"C",g:[[[1,1],[3,1],[3,3],[1,3],[1,1]]]}]};` + pick('src/js/47c-bruit.js', 'function pebAt'), 'pebAt');
ok('bruit des aéroports : zone la plus forte au point, rien hors des zones', E('pebAt(2,2).zone') === 'C' && E('pebAt(0.5,0.5).zone') === 'D' && E('pebAt(5,5)') === null && E('pebAt(2,2).nom') === 'Essai');
// copropriété : rapprochement avec le registre (parcelle de l'adresse, sinon nombre de lots et époque près de la position de l'annonce)
run(pick('src/js/24c-coproprietes.js', 'function cpAdr('), 'cpAdr'); run(pick('src/js/24c-coproprietes.js', 'function cpAdrEq'), 'cpAdrEq'); run(pick('src/js/24c-coproprietes.js', 'function coproMatch'), 'coproMatch');
E(`var CPJ={per:[["avant 1949",0,1948],["de 1961 à 1974",1961,1974]],noms:["SYNDIC X"],c:[
  [0.2,48,"AA1",24,18,16,4,1,1,0,0,0,"AB0123","1 r a"],[0.2003,48,"AA2",24,20,18,2,0,2,0,-1,0,"","3 r a"],[0.2006,48,"AA3",10,8,8,0,0,0,1,-1,1,"","5 r a"],[0.204,48,"AA4",5,5,5,0,0,0,0,-1,0,"0A0007","9 r b"],[0.2,48.002,"AB1",30,20,20,0,1,1,0,0,0,"AC0001","2 r du port"],[0.2001,48.002,"AB2",12,10,10,0,0,0,1,-1,0,"AC0001","4 r du port"]]};`);
const cm = o => E(`coproMatch(CPJ,${JSON.stringify(o)})`);
// résidences étudiantes et logements neufs autour d'un point : 1 km pour les résidences, 500 m pour les permis récents
run(`var CN_RES=1000, CN_PC=500, CN_DEPUIS="2023-01", CN_HORS=new Set([1,3,4,5,6]);` + pick('src/js/24d-concurrence.js', 'function concAround'), 'concAround');
E(`var CNJ={res:[[0.2,48,"Crous A",300,"crous",0,null],[0.2,48.008,"Privée B",null,"osm",0,null],[0.2,48.02,"Loin",100,"crous",0,null]],
  pc:[[0.201,48,"2024-05",2,"","",120,90,10,120,2,0,"SCCV X","1 rue A"],[0.2,48.003,"2023-02",5,"2024-01","",40,10,20,0,0,8,"","3 rue B"],[0.2,48.001,"2021-06",6,"2022-01","2023-09",60,20,20,0,0,0,"",""],[0.21,48,"2025-01",2,"","",500,200,100,0,0,0,"",""],[0.2,48.002,"2024-03",2,"","",105,89,10,105,1,0,"","Seniors"]]};`);
const ca = E('concAround(CNJ,48,0.2)');
ok('autour d\'un point : résidences à 1 km au plus, par distance', ca.R.length === 2 && ca.R[0][1][2] === 'Crous A' && ca.R[1][1][2] === 'Privée B', JSON.stringify(ca.R));
ok('autour d\'un point : permis à 500 m au plus et autorisés depuis 2023, du plus grand au plus petit ; totaux par état ; résidence seniors à part', ca.P.length === 2 && ca.P[0][1][6] === 120 && ca.s.n === 160 && ca.s.st === 100 && ca.s.e[2][0] === 120 && ca.s.e[5][1] === 10 && ca.s.hors === 105, JSON.stringify(ca.s));
const c0 = cm({exact: true, lat: 48, lon: 0.2004, cad: ['A', '7']}), c1 = cm({exact: true, lat: 48, lon: 0.2004, cad: ['ab', '123']}), c2 = cm({exact: true, lat: 48, lon: 0.2007, cad: ['ZZ', '9']}), c3 = cm({exact: true, lat: 48.01, lon: 0.2, cad: null});
ok('copropriété d\'une adresse : celle de la parcelle, même plus loin qu\'une autre', c1.how === 'parcelle' && c1.x[2] === 'AA1' && c1.k === 'AB0123', JSON.stringify(c1));
const eq = (x, y) => E(`cpAdrEq(cpAdr(${JSON.stringify(x)}),cpAdr(${JSON.stringify(y)}))`);
ok('copropriété : même adresse malgré les abréviations du registre, les accents et les plages de numéros', eq('10 Rue Gougeard 72000 Le Mans', '10 r gougeard') && eq('5 Rue du Maréchal de Lattre de Tassigny 61000 Alençon', '5 r marechal jean-marie de lattre de tassigny')
  && eq('7 Rue Cardinal Paul Gouyon 35000 Rennes', '1-3-5-7-9 Rue Cardinal Paul Gouyon') && eq('12 B avenue Jean Jaurès', '12 av jean jaures'));
ok('copropriété : autre numéro ou autre voie → pas la même adresse', !eq('12 Rue Gougeard 72000 Le Mans', '10 r gougeard') && !eq('10 Rue Nationale 72000 Le Mans', '10 r gougeard') && !eq('', '10 r gougeard'));
const p1 = cm({exact: true, lat: 48.002, lon: 0.2, cad: ['AC', '1'], adr: '4 Rue du Port 72000 Le Mans'}), p2 = cm({exact: true, lat: 48.002, lon: 0.2, cad: ['AC', '1'], adr: '8 Rue du Port 72000 Le Mans'});
ok('copropriété : plusieurs copropriétés sur la parcelle → celle de la même adresse (sûr), sinon la plus proche (probable)', p1.how === 'parcelle' && p1.x[2] === 'AB2' && p1.n === 2 && p2.how === 'parcelle?' && p2.x[2] === 'AB1', JSON.stringify([p1, p2]));
ok('copropriété d\'une adresse : section d\'une lettre lue « 0A » comme au cadastre', c0.how === 'parcelle' && c0.x[2] === 'AA4' && c0.k === '0A0007', JSON.stringify(c0));
ok('copropriété d\'une adresse : sans parcelle au registre, la plus proche à 25 m (jamais une copropriété d\'une autre parcelle)', c2.how === 'adresse' && c2.x[2] === 'AA3' && c3.none === 'adresse', JSON.stringify([c2, c3]));
const a1 = cm({lat: 48, lon: 0.2001, r: 50, lots: 24, an: 1965}), a2 = cm({lat: 48, lon: 0.2001, r: 50, lots: 24}), a3 = cm({lat: 48, lon: 0.2006, r: 50, lots: 8}), a4 = cm({lat: 48, lon: 0.2006, r: 250, lots: 8}), a5 = cm({lat: 48, lon: 0.2, r: 50});
ok('copropriété d\'une annonce : nombre de lots et époque de construction départagent', a1.how === 'lots' && a1.x[2] === 'AA1' && a1.both === true, JSON.stringify(a1));
ok('copropriété d\'une annonce : deux copropriétés possibles → aucune', a2.none === 'plusieurs' && a2.n === 2, JSON.stringify(a2));
ok('copropriété d\'une annonce : lots principaux reconnus ; position à 250 m sans année → aucune', a3.how === 'lots' && a3.x[2] === 'AA3' && a4.none === 'floue', JSON.stringify([a3, a4]));
ok('copropriété d\'une annonce : sans nombre de lots → aucune', a5.none === 'lots', JSON.stringify(a5));

console.log(`\n${n - bad}/${n} tests unitaires réussis`); process.exit(bad ? 1 : 0);
