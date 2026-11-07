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

console.log(`\n${n - bad}/${n} tests unitaires réussis`); process.exit(bad ? 1 : 0);
