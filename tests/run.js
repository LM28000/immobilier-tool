// Tests de bout en bout : node tests/run.js  (après python3 build.py) — l'interface de src/v2 sur le moteur de src/js
const {chromium, devices} = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../dist/test.html');
const res = []; const ok = (n, c, info = '') => { res.push([n, !!c, info]); };
// carte 3D hors réseau : MapLibre servi depuis tests/vendor, style minimal à la place d'OpenFreeMap (les routes ajoutées ensuite passent avant)
const ML = (n) => require('path').join(__dirname, 'vendor', 'maplibre-gl-4.7.1.' + n);
async function mlRoutes(p) {
  const fs = require('fs');
  await p.route('**/tiles.openfreemap.org/**', r => r.request().url().includes('/styles/') ? r.fulfill({contentType: 'application/json', body: JSON.stringify({version: 8, glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf', sources: {openmaptiles: {type: 'vector', tiles: ['https://tiles.openfreemap.org/planet/x/{z}/{x}/{y}.pbf'], maxzoom: 14}}, layers: [{id: 'fond', type: 'background', paint: {'background-color': '#dfe7ef'}}]})}) : r.fulfill({status: 404, body: ''}));
  await p.route('**/cdnjs.cloudflare.com/ajax/libs/maplibre-gl/**', r => r.fulfill({body: fs.readFileSync(ML(r.request().url().endsWith('.css') ? 'css' : 'js')), contentType: r.request().url().endsWith('.css') ? 'text/css' : 'application/javascript'}));
}

(async () => {
  const b = await chromium.launch();
  // adresse exacte dans « Ajouter un bien » (services simulés)
  { const c = await b.newContext({viewport: {width: 1300, height: 900}}); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
    await p.route('**/data.geopf.fr/geocodage/**', r => r.fulfill({contentType: 'application/json', body: JSON.stringify({features: [{properties: {label: '10 Rue Gougeard 72000 Le Mans', city: 'Le Mans', postcode: '72000', type: 'housenumber'}, geometry: {coordinates: [0.1915, 47.9975]}}]})}));
    await p.route('**/routing.openstreetmap.de/**', r => r.fulfill({contentType: 'application/json', body: JSON.stringify({durations: [[0, 300, 2400, 900]], distances: [[0, 400, 3000, 1100]]})}));
    await p.route('**/www.georisques.gouv.fr/**', r => { const u = r.request().url(); r.fulfill({contentType: 'application/json', body: u.includes('rga') ? '{"codeExposition":"1"}' : u.includes('ssp') ? '{"casias":{"results":2},"conclusions_sis":{"results":0},"instructions":{"results":0}}' : '{"results":0}'}); });
    await mlRoutes(p);
    await p.goto(URL); await p.waitForTimeout(2000); await p.click('.v2dlg button[type=submit]'); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('[data-v2tab="biens"]').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('[data-v2add]').click()); await p.waitForTimeout(300);
    await p.fill('.v2dlg #biensForm .adrin', '10 rue Gougeard Le Mans'); await p.waitForSelector('.v2dlg #biensForm [data-adrpick]', {timeout: 8000}).catch(() => {});
    await p.click('.v2dlg #biensForm [data-adrpick]'); await p.waitForFunction(() => document.getElementById('b-ville').value === 'lemans' && !!document.getElementById('b-quartier').value, null, {timeout: 8000}).catch(() => {});
    ok('ajout d\'un bien · adresse : ville et quartier trouvés', await p.evaluate(() => document.getElementById('b-ville').value === 'lemans' && !!document.getElementById('b-quartier').value));
    await p.fill('.v2dlg #biensForm [name=prix]', '60000'); await p.fill('.v2dlg #biensForm [name=surface]', '22'); await p.click('.v2dlg #biensForm [type=submit]'); await p.waitForFunction(() => BIENS.length === 1 && BIENS[0].geo && BIENS[0].geo.risq, null, {timeout: 8000}).catch(() => {});
    ok('ajout d\'un bien · adresse enregistrée avec trajets et risques', await p.evaluate(() => BIENS.length === 1 && BIENS[0].lat > 47 && BIENS[0].geo && BIENS[0].geo.foot.length === 3 && !!BIENS[0].geo.risq));
    await p.evaluate(() => document.querySelector('[data-v2tab="carte"]').click()); await p.waitForTimeout(1500);
    ok('ajout d\'un bien · placé sur la carte à son adresse', await p.evaluate(() => { const f = V2MAP().getSource('annonces')._data.features.find(f => f.properties.k === 'b|' + BIENS[0].id); return !!f && Math.abs(f.geometry.coordinates[1] - BIENS[0].lat) < 1e-6 && !f.properties.ap; }));
    await p.evaluate(() => { document.querySelector('[data-v2tab="biens"]').click(); document.querySelector(`[data-v2open="b|${BIENS[0].id}"]`).click(); }); await p.waitForTimeout(600);
    ok('ajout d\'un bien · la fiche dit qu\'il est à l\'adresse saisie', await p.evaluate(() => /Sur la carte : à l'adresse saisie/.test((document.querySelector('#v2fiche .v2pos') || {}).textContent || '')));
    ok('ajout d\'un bien · adresse sans erreur', errs.length === 0, errs.join(' | '));
    await c.close(); }
  // thème : clair par défaut même si l'appareil est en sombre ; bouton en haut et choix dans Budget ; la carte change de fond et garde ses couches
  { const c = await b.newContext({viewport: {width: 1300, height: 850}, colorScheme: 'dark'}); const p = await c.newPage(); const errs = [], styles = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/cdnjs.cloudflare.com/**', r => r.abort()); await mlRoutes(p);
    p.on('request', r => { const u = r.url(); if (u.includes('openfreemap.org/styles/')) styles.push(u.split('/').pop()); });
    await p.goto(URL); await p.waitForTimeout(2000); await p.click('.v2dlg button[type=submit]'); await p.waitForTimeout(1200);
    const fond = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok('thème · clair par défaut, même avec un appareil en sombre', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light') && await fond() === 'rgb(243, 245, 247)' && styles[0] === 'positron', (await fond()) + ' ' + styles.join(','));
    await p.click('#v2thm'); await p.waitForTimeout(1500);
    ok('thème · le bouton passe en sombre, la carte aussi (couches gardées)', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark' && localStorage.getItem('theme-v2') === 'dark' && !!V2MAP().getLayer('a-dot') && !!V2MAP().getLayer('q-fill') && V2MAPN.err.length === 0) && await fond() === 'rgb(17, 21, 28)' && styles.includes('dark'), styles.join(','));
    await p.reload(); await p.waitForTimeout(2000);
    ok('thème · le choix est gardé', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark'));
    await p.evaluate(() => document.querySelector('[data-v2tab="budget"]').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('#v2p-budget [data-v2theme="light"]').click()); await p.waitForTimeout(600);
    ok('thème · retour au clair depuis Budget', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light' && document.querySelector('#v2p-budget [data-v2theme="light"]').getAttribute('aria-pressed') === 'true') && await fond() === 'rgb(243, 245, 247)');
    ok('thème · sans erreur', errs.length === 0, errs.join(' | '));
    await c.close(); }
  // copropriété (registre national, data/copro/<ville>.js chargé avec la fiche) : annonce rapprochée « probable », bien à son adresse « sûr » par sa parcelle
  { const c = await b.newContext({viewport: {width: 1300, height: 850}}); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/cdnjs.cloudflare.com/**', r => r.abort()); await p.route('**/apicarto.ign.fr/**', r => r.abort()); await mlRoutes(p);
    await p.goto(URL); await p.waitForTimeout(2000); await p.click('.v2dlg button[type=submit]'); await p.waitForTimeout(500);
    const open = s => p.evaluate(s => { const bt = document.createElement('button'); bt.dataset.v2open = s; document.getElementById('v2mlist').appendChild(bt); bt.click(); bt.remove(); }, s);
    const sec = () => p.evaluate(() => { const d = document.querySelector('#v2fiche details[data-sec="copro"]'), a = document.querySelector('#v2fiche .fattn'); return {t: d ? d.innerText : '', a: a ? a.innerText : ''}; });
    // une ville pas encore chargée : la fiche s'ouvre, puis la rubrique se remplit quand le registre arrive
    const s0 = await p.evaluate(() => { const ck = Object.keys(ADS).find(k => !COPROQ[k] && (ADS[k].ventes || []).some(a => { const f = FICHES[k] && FICHES[k][adId(a[3])]; return f && f.lots; })); const a = ADS[ck].ventes.find(a => { const f = FICHES[ck][adId(a[3])]; return f && f.lots; }); return 'v|' + ck + '|' + a[3]; });
    await open(s0); await p.waitForTimeout(1500); const r0 = await sec();
    ok('copropriété · la rubrique se remplit quand le registre de la ville arrive', /^Copropriété/.test(r0.t) && !/Recherche de la copropriété/.test(r0.t) && /Registre national d'immatriculation des copropriétés/.test(r0.t), r0.t.slice(0, 200));
    const s1 = await p.evaluate(async () => { for (const ck of Object.keys(ADS)) coproData(ck); await new Promise(r => setTimeout(r, 1500));
      for (const ck of Object.keys(ADS)) for (const a of ADS[ck].ventes || []) { const R = coproOf(Object.assign(venteBien(ck, a), {kind: 'v', suf: a[3]})); if (R && R.m && R.m.x) return 'v|' + ck + '|' + a[3]; } return null; });
    await open(s1); await p.waitForTimeout(800); const r1 = await sec();
    ok('copropriété · annonce : copropriété probable, avec son numéro d\'immatriculation et son syndic', !!s1 && /probable/.test(r1.t) && /immatriculée n° [A-Z]{2}\d{7}/.test(r1.t) && /Syndic/.test(r1.t), r1.t.slice(0, 300));
    await p.evaluate(() => { const J = COPROQ.lemans, x = J.c.find(x => /^[A-Z]{2}\d{4}$/.test(x[12]) && x[9] === 1 && J.c.filter(y => (y[12] || '').split(' ').includes(x[12])).length === 1);
      BIENS.push({id: 'cpA', ville: 'lemans', quartier: '', prix: 70000, surface: 22, pieces: 1, type: 'studio', titre: 'Essai', adresse: x[13] + ' Le Mans', lat: x[1] + 0.0002, lon: x[0] + 0.0002, geo: {cad: [x[12].slice(0, 2), x[12].slice(2)]}}); });
    await open('b|cpA'); await p.waitForTimeout(800); const r2 = await sec();
    ok('copropriété · bien à son adresse : sûr, par la parcelle ; sans syndic → point d\'attention', /sûr/.test(r2.t) && /parcelle cadastrale/.test(r2.t) && /aucun syndic déclaré/.test(r2.t) && /aucun syndic en mandat au registre/.test(r2.a) && !/Copropriété probable/.test(r2.a), r2.t.slice(0, 300) + ' | ' + r2.a.slice(0, 300));
    ok('copropriété · sans erreur', errs.length === 0, errs.join(' | '));
    // résidences étudiantes et logements neufs autour (data/conc/<ville>.js) : fiche d'une annonce, fiche de la ville, points sur la carte
    const s2 = await p.evaluate(async () => { const ck = Object.keys(ADS).find(k => (ADS[k].ventes || []).length > 20 && !CONCQ[k]); concData(ck); for (let i = 0; i < 40 && !CONCQ[ck]; i++) await new Promise(r => setTimeout(r, 100));
      let best = null, bn = -1; for (const a of ADS[ck].ventes) { const pt = concPoint(Object.assign(venteBien(ck, a), {kind: 'v', suf: a[3]}), null); if (!pt) continue; const A = concAround(CONCQ[ck], pt.lat, pt.lon); if (A.R.length + A.P.length > bn) { bn = A.R.length + A.P.length; best = a[3]; } }
      return {ck, sel: 'v|' + ck + '|' + best, n: bn}; });
    await open(s2.sel); await p.waitForTimeout(800); await p.evaluate(() => document.querySelector('#v2fiche [data-v2ft="quartier"]').click()); await p.waitForTimeout(400);
    const o1 = await p.evaluate(() => { const d = document.querySelector('#v2fiche details[data-sec="offre"]'); return d ? d.innerText : ''; });
    ok('résidences et chantiers · fiche d\'une annonce : résidences à 1 km et logements neufs à 500 m, avec la position utilisée', s2.n > 0 && /Résidences étudiantes à moins de 1 km/i.test(o1) && /Logements neufs autorisés depuis janvier \d{4}, à moins de 500 m/i.test(o1) && /Mesuré autour/.test(o1), o1.slice(0, 300));
    await open('c|' + s2.ck); await p.waitForTimeout(800); await p.evaluate(() => { const b = document.querySelector('#v2fiche [data-v2ft="quartier"]'); if (b) b.click(); }); await p.waitForTimeout(400);
    const o2 = await p.evaluate(() => { const d = document.querySelector('#v2fiche details[data-sec="offre"]'); return d ? d.innerText : ''; });
    ok('résidences et chantiers · fiche de la ville : places pour 100 étudiants, logements et studios autorisés par an', /pour 100 étudiants/.test(o2) && /par an, dont \d[\d  ]* studios/.test(o2), o2.slice(0, 300));
    const at2 = await p.evaluate(() => { CONCQ.zz = {maj: '2026-11-10', res: [], pc: [[0.2, 48, '2026-06', 2, '', '', 180, 150, 10, 180, 2, 0, 'SCCV T', '1 rue T']]}; return concAttn({ville: 'zz', id: 'x', adresse: '1 rue T', lat: 48.001, lon: 0.2}, null).map(z => z[1]).join(' | '); });
    ok('résidences et chantiers · point d\'attention : résidence étudiante neuve à moins de 500 m', /Résidence étudiante de 180 logements autorisée en juin 2026 à 110 m/.test(at2), at2);
    await p.evaluate(() => { document.querySelector('[data-v2tab="carte"]').click(); }); await p.waitForTimeout(600);
    await p.evaluate(ck => { const c = C.find(v => v.k === ck), x = CONCQ[ck].res[0]; V2MAP().jumpTo({center: x ? [x[0], x[1]] : [c.lon, c.lat], zoom: 13.2}); }, s2.ck); await p.waitForTimeout(2500);
    const mp = await p.evaluate(() => ({n: V2MAPN.conc, d: V2MAP().getLayer('p-conc') ? V2MAP().queryRenderedFeatures({layers: ['p-conc']}).length : -1, leg: /résidence étudiante/.test(document.getElementById('v2mleg').textContent)}));
    ok('résidences et chantiers · carte : résidences et projets dessinés de près, avec leur légende', mp.n > 0 && mp.d > 0 && mp.leg, JSON.stringify(mp));
    ok('résidences et chantiers · sans erreur', errs.length === 0, errs.join(' | '));
    await c.close(); }
  // l'interface : carte, fiche, annonces, villes, budget (ordinateur et téléphone)
  { const fs = require('fs'), URL2 = URL;
    for (const [dev, opt] of [['ordi', {viewport: {width: 1440, height: 900}}], ['tel', {...devices['iPhone 13']}]]) {
      const c = await b.newContext(opt); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());   // les routes ajoutées ensuite passent avant
      await mlRoutes(p);
      await p.goto(URL2); await p.waitForTimeout(2000);
      ok(`v2 ${dev} · critères au premier lancement`, await p.evaluate(() => !!document.querySelector('.v2dlg') && +document.getElementById('v2cN').textContent > 0));
      await p.click('.v2dlg button[type=submit]'); await p.waitForTimeout(1200);
      ok(`v2 ${dev} · carte de l'Ouest et ses 22 villes`, await p.evaluate(() => !!(window.V2MAP && V2MAP()) && V2MAPN.villes === C.length && document.querySelectorAll('#v2mlist [data-v2city]').length === C.length && C.length === 22));
      ok(`v2 ${dev} · carte : toutes les couches acceptées (quartiers, annonces, villes, immeubles 3D)`, await p.evaluate(() => { const M = V2MAP(); return ['q-fill', 'q-line', 'q-lab', 'a-dot', 'a-hole', 'a-zone', 'a-clu', 'a-clu-n', 'a-sdot', 'a-shole', 'v-dot', 'v-lab', 'b3d', 'p-rail', 'p-rail2', 'p-rfn', 'p-rfn2', 'p-lig', 'p-dot'].every(l => M.getLayer(l)) && V2MAPN.err.length === 0; }), await p.evaluate(() => V2MAPN.err.join(' | ')));
      ok(`v2 ${dev} · carte de l'Ouest : les grandes lignes de train sont dessinées (grande vitesse et 140 km/h et plus)`, await p.evaluate(() => { const M = V2MAP(); return M.getZoom() < 8 && M.queryRenderedFeatures({layers: ['p-rfn2']}).length > 0 && M.queryRenderedFeatures({layers: ['p-rfn']}).length > 0; }));
      ok(`v2 ${dev} · liste de l'Ouest : le temps de train vers Paris de chaque ville`, await p.evaluate(() => { const R = [...document.querySelectorAll('#v2mlist [data-v2city]')].slice(0, 5).map(r => r.querySelector('.v2rs')); return R.length === 5 && R.every(e => e && /Paris (\d+ h|\d+ min)/.test(e.textContent)); }), await p.evaluate(() => [...document.querySelectorAll('#v2mlist [data-v2city]')].slice(0, 3).map(r => (r.querySelector('.v2rs') || {}).textContent).join(' | ')));
      ok(`v2 ${dev} · carte de l'Ouest à plat, sans quartiers ni annonces de loin`, await p.evaluate(() => { const M = V2MAP(); return M.getPitch() === 0 && M.queryRenderedFeatures({layers: ['v-dot']}).length > 10 && !M.queryRenderedFeatures({layers: ['a-dot']}).length; }));
      // zoomer suffit : quartiers et annonces apparaissent, la carte s'incline, la liste passe à la ville au centre
      const rendu = () => p.evaluate(() => { const M = V2MAP(); return {q: M.queryRenderedFeatures({layers: ['q-fill']}).length, a: M.queryRenderedFeatures({layers: ['a-dot']}).length, v: M.queryRenderedFeatures({layers: ['v-dot']}).length, pitch: Math.round(M.getPitch()), liste: document.querySelector('#v2mlist .v2mhead').innerText}; });
      await p.evaluate(() => V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 11.2})); await p.waitForTimeout(1800);
      const zin = await rendu();
      ok(`v2 ${dev} · zoom sur Le Mans : quartiers et annonces dessinés sans clic`, zin.q > 10 && zin.a > 0 && zin.v === 0, JSON.stringify(zin));
      ok(`v2 ${dev} · zoom sur Le Mans : la carte s'incline et la liste suit la ville`, zin.pitch >= 30 && /Le Mans/.test(zin.liste), JSON.stringify(zin));
      await p.evaluate(() => V2MAP().jumpTo({zoom: 14.2})); await p.waitForTimeout(1500);
      ok(`v2 ${dev} · de près : plus inclinée (immeubles en 3D)`, await p.evaluate(() => V2MAP().getPitch() > 40 && V2MAP().getLayer('b3d').minzoom === 13));
      await p.evaluate(() => V2MAP().jumpTo({zoom: 7})); await p.waitForTimeout(1500);
      const zout = await rendu();
      ok(`v2 ${dev} · dézoom : l'Ouest revient à plat, avec ses villes`, zout.pitch === 0 && zout.a === 0 && zout.v > (dev === 'tel' ? 4 : 10) && /L'Ouest/.test(zout.liste) && !/Le Mans/.test(zout.liste), JSON.stringify(zout));
      await p.evaluate(() => document.querySelector('#v2mlist [data-v2city="lemans"]').click()); await p.waitForTimeout(1800);
      ok(`v2 ${dev} · Le Mans : quartiers et annonces`, await p.evaluate(() => V2MAPN.quartiers > 20 && V2MAPN.annonces > 0 && document.querySelectorAll('#v2mlist [data-v2open]').length > 0));
      if (dev === 'tel') {   // la liste s'ouvre basse, sa poignée l'agrandit puis la réduit ; la fiche de la ville s'ouvre depuis l'en-tête
        const hs = () => p.evaluate(() => Math.round(document.getElementById('v2mlist').offsetHeight / document.getElementById('v2map').offsetHeight * 100));
        const h0 = await hs(); await p.tap('#v2mlist [data-v2grip]'); await p.waitForTimeout(500); const h1 = await hs(); await p.tap('#v2mlist [data-v2grip]'); await p.waitForTimeout(500); const h2 = await hs();
        ok('v2 tel · liste basse à l\'ouverture, poignée pour l\'agrandir et la réduire', h0 <= 40 && h1 >= 75 && h2 === h0, JSON.stringify({h0, h1, h2}));
        ok('v2 tel · liste basse d\'une ville : au moins une annonce entière, cash-flow compris', await p.evaluate(() => { const L = document.getElementById('v2mlist').getBoundingClientRect(), r = document.querySelector('#v2mlist .v2row'), c = r && r.querySelector('.v2cfl');
          return !!c && r.getBoundingClientRect().bottom <= L.bottom + 1 && c.scrollWidth <= c.clientWidth + 1; }), await p.evaluate(() => { const L = document.getElementById('v2mlist').getBoundingClientRect(), r = document.querySelector('#v2mlist .v2row'), c = r && r.querySelector('.v2cfl');
          return JSON.stringify({liste: [Math.round(L.top), Math.round(L.bottom)], ligne: r && [Math.round(r.getBoundingClientRect().top), Math.round(r.getBoundingClientRect().bottom)], cf: c && [c.scrollWidth, c.clientWidth], vue: [innerWidth, innerHeight], tete: Math.round(document.querySelector('#v2mlist .v2mhead').getBoundingClientRect().height)}); }));
        { // bouton ou geste « retour » : visionneuse, puis fiche, puis onglet ; fermer par l'app retire l'étape
          const back = async () => { await p.evaluate(() => { if (history.state && history.state.v2bk) history.back(); }); await p.waitForTimeout(600); };
          const st = () => p.evaluate(() => ({lb: !!document.querySelector('.v2lb'), fiche: !document.getElementById('v2fiche').hidden, tab: document.querySelector('#v2tabbar [aria-current="page"]').dataset.v2tab, h: history.state && history.state.v2bk || 0}));
          await p.evaluate(() => document.querySelector('#v2mlist [data-v2open^="v|"]').click()); await p.waitForTimeout(800);
          const s0 = await st(); await p.evaluate(() => { const b = document.querySelector('#v2fiche .v2fthb'); if (b) b.click(); }); await p.waitForTimeout(600); const s1 = await st();
          await back(); const s2 = await st(); await back(); const s3 = await st();
          await p.evaluate(() => document.querySelector('#v2tabbar [data-v2tab="annonces"]').click()); await p.waitForTimeout(600); await back(); const s4 = await st();
          ok('v2 tel · retour : ferme la visionneuse, puis la fiche, puis revient à la carte', s0.fiche && (!s1.lb || (!s2.lb && s2.fiche)) && !s3.fiche && s4.tab === 'carte', JSON.stringify({s0, s1, s2, s3, s4}));
          await p.evaluate(() => document.querySelector('#v2mlist [data-v2open^="v|"]').click()); await p.waitForTimeout(800); const h1 = (await st()).h;
          await p.evaluate(() => document.querySelector('[data-v2close]').click()); await p.waitForTimeout(600); const s5 = await st();
          ok('v2 tel · retour : une fiche fermée par son bouton ne laisse pas d\'étape en trop', h1 > 0 && !s5.fiche && s5.h < h1, JSON.stringify({h1, s5}));
          await p.evaluate(() => document.querySelector('#v2mlist [data-v2city=""]').click()); await p.waitForTimeout(1200);   // la carte revient sur Le Mans pour la suite
          await p.evaluate(() => document.querySelector('#v2mlist [data-v2city="lemans"]').click()); await p.waitForTimeout(1800); }
        { // fiche en demi-écran sur la carte : l'annonce reste visible au-dessus ; la poignée l'agrandit puis la réduit
          await p.evaluate(() => document.querySelector('#v2mlist [data-v2open^="v|"]').click()); await p.waitForTimeout(1600);
          const f1 = await p.evaluate(() => { const F = document.getElementById('v2fiche'), M = V2MAP(), t = F.getBoundingClientRect().top, y = M.project(M.getCenter()).y + M.getContainer().getBoundingClientRect().top; return {half: F.dataset.half, t: Math.round(t / innerHeight * 100), y: Math.round(y), top: Math.round(t)}; });
          await p.tap('#v2fiche [data-v2fgrip]'); await p.waitForTimeout(500); const f2 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half);
          await p.tap('#v2fiche [data-v2fgrip]'); await p.waitForTimeout(500); const f3 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half);
          ok('v2 tel · fiche en demi-écran sur la carte, annonce visible au-dessus, poignée pour l\'agrandir et la réduire', f1.half === '1' && f1.t >= 35 && f1.t <= 55 && f1.y < f1.top && f2 === '0' && f3 === '1', JSON.stringify({f1, f2, f3}));
          ok('v2 tel · fiche ouverte : un seul panneau en bas (la liste est masquée), bouton « Fermer »', await p.evaluate(() => getComputedStyle(document.getElementById('v2mlist')).display === 'none' && document.querySelector('#v2fiche [data-v2close]').textContent.trim() === 'Fermer'));
          const tire = dy => p.evaluate(dy => { const h = document.querySelector('#v2fiche .v2fhg'), r = h.getBoundingClientRect(), o = {bubbles: true, clientX: r.left + 160, clientY: r.top + 10, pointerId: 1};
            h.dispatchEvent(new PointerEvent('pointerdown', o)); document.dispatchEvent(new PointerEvent('pointermove', Object.assign({}, o, {clientY: r.top + 10 + dy}))); document.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, {clientY: r.top + 10 + dy}))); }, dy);
          await tire(-120); await p.waitForTimeout(400); const g1 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half);
          await tire(120); await p.waitForTimeout(400); const g2 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half);
          await tire(120); await p.waitForTimeout(600); const g3 = await p.evaluate(() => ({fiche: !document.getElementById('v2fiche').hidden, liste: getComputedStyle(document.getElementById('v2mlist')).display}));
          ok('v2 tel · fiche : tirée vers le haut elle s\'agrandit, vers le bas elle se réduit puis se ferme, et la liste revient', g1 === '0' && g2 === '1' && !g3.fiche && g3.liste !== 'none', JSON.stringify({g1, g2, g3}));
          if (await p.evaluate(() => !document.getElementById('v2fiche').hidden)) await p.evaluate(() => document.querySelector('[data-v2close]').click()); await p.waitForTimeout(400);
          await p.evaluate(() => document.querySelector('#v2mlist [data-v2city=""]').click()); await p.waitForTimeout(1200);
          await p.evaluate(() => document.querySelector('#v2mlist [data-v2city="lemans"]').click()); await p.waitForTimeout(1800); }
        await p.tap('#v2mlist [data-v2cfiche="lemans"]'); await p.waitForTimeout(800);
        ok('v2 tel · fiche de la ville depuis l\'en-tête de la liste', await p.evaluate(() => !document.getElementById('v2fiche').hidden && /Le Mans/.test(document.querySelector('#v2fiche .v2ft').textContent)));
        await p.evaluate(() => document.querySelector('[data-v2close]').click()); await p.waitForTimeout(400);
      }
      ok(`v2 ${dev} · Le Mans : les points des annonces sont dessinés`, await p.evaluate(() => V2MAP().queryRenderedFeatures({layers: ['a-dot']}).length > 0 && V2MAP().getZoom() >= 10));
      ok(`v2 ${dev} · carte : positions exactes en points pleins, approchées en points creux`, await p.evaluate(() => { const M = V2MAP(), F = M.getSource('annonces')._data.features; return F.some(f => f.properties.ap) && F.some(f => !f.properties.ap) && M.queryRenderedFeatures({layers: ['a-hole']}).length > 0 && M.queryRenderedFeatures({layers: ['a-hole']}).length < M.queryRenderedFeatures({layers: ['a-dot']}).length; }));
      ok(`v2 ${dev} · carte : noms des quartiers prêts`, await p.evaluate(() => V2MAPN.qnoms > 500));
      if (dev === 'ordi') {   // la bulle du survol ne bloque pas la carte : survoler un quartier puis zoomer à la molette sans bouger la souris
        const pt = await p.evaluate(() => { const M = V2MAP(), cv = M.getCanvas().getBoundingClientRect(); for (let y = 200; y < cv.height - 100; y += 25) for (let x = 450; x < cv.width - 80; x += 25) { if (M.queryRenderedFeatures([x, y], {layers: ['q-fill']}).length && !M.queryRenderedFeatures([[x - 8, y - 8], [x + 8, y + 8]], {layers: ['a-dot']}).length) return {x: cv.left + x, y: cv.top + y}; } return null; });
        await p.mouse.move(pt.x - 3, pt.y - 3); await p.mouse.move(pt.x, pt.y); await p.waitForTimeout(300);
        const bulle = await p.evaluate(() => { const b = document.querySelector('.v2pop'); return b ? getComputedStyle(b.querySelector('.maplibregl-popup-content')).pointerEvents : null; });
        const z0 = await p.evaluate(() => V2MAP().getZoom());
        for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(60); } await p.waitForTimeout(1500);
        for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(60); } await p.waitForTimeout(1500);
        const z1 = await p.evaluate(() => V2MAP().getZoom());
        ok(`v2 ${dev} · carte : la bulle du survol ne bloque ni la molette ni les clics`, bulle === 'none' && z1 > z0 + 1, JSON.stringify({bulle, z0, z1}));
        // glisser la carte pendant l'inclinaison automatique : le point saisi reste sous le curseur (avant : le geste était annulé, la carte semblait bloquée)
        await p.evaluate(() => V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 9.2, pitch: 0, bearing: 0})); await p.waitForTimeout(1500);
        await p.mouse.move(900, 450); for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(40); }
        await p.evaluate(() => new Promise(r => { const t = setTimeout(r, 2500); V2MAP().once('moveend', () => { clearTimeout(t); r(); }); })); await p.waitForTimeout(450);
        const pi0 = await p.evaluate(() => V2MAP().getPitch()), ll = await p.evaluate(() => { const q = V2MAP().unproject([900, 450]); return [q.lng, q.lat]; });
        await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(900 - 25 * i, 450 + 8 * i); await p.waitForTimeout(25); } await p.waitForTimeout(40);
        const sous = await p.evaluate(ll => { const q = V2MAP().project(ll); return [q.x, q.y]; }, ll); await p.mouse.up(); await p.waitForTimeout(1600);
        const pi1 = await p.evaluate(() => V2MAP().getPitch());
        ok('v2 ordi · carte : glisser pendant l\'inclinaison automatique suit la souris', pi0 > 2 && pi0 < 40 && Math.hypot(sous[0] - 600, sous[1] - 546) < 30 && pi1 > 40, JSON.stringify({pi0, sous, pi1}));
        await p.evaluate(() => document.querySelector('#v2mlist [data-v2city="lemans"]') || V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 11.3}));
        // zoom au bouton : il pivote autour du centre de la partie visible (pas sous la liste) ; avant, la ville glissait vers la droite
        await p.evaluate(() => V2MAP().jumpTo({center: [-1.6795, 48.111], zoom: 11.5, pitch: 0, bearing: 0})); await p.waitForTimeout(600);
        for (let i = 0; i < 2; i++) { await p.click('.maplibregl-ctrl-zoom-in'); await p.waitForTimeout(900); } await p.waitForTimeout(900);
        ok('v2 ordi · carte : le zoom au bouton reste centré sur la partie visible', await p.evaluate(() => { const M = V2MAP(), q = M.project([-1.6795, 48.111]), cv = M.getCanvas().getBoundingClientRect(), L = document.getElementById('v2mlist').getBoundingClientRect(); return M.getZoom() > 12.8 && Math.abs(q.x - ((L.right - cv.left) + cv.width) / 2) < 4; }), await p.evaluate(() => JSON.stringify({z: V2MAP().getZoom(), pad: V2MAP().getPadding()})));
        // plusieurs annonces au même endroit : une pastille avec leur nombre, et la liste au clic
        const grp = await p.evaluate(() => { const F = V2MAP().getSource('annonces')._data.features, G = {}; F.forEach(f => { const k = f.geometry.coordinates.map(v => v.toFixed(5)).join(','); (G[k] = G[k] || []).push(f); }); const g = Object.values(G).sort((a, b) => b.length - a.length)[0]; return {n: g.length, ll: g[0].geometry.coordinates}; });
        await p.evaluate(ll => V2MAP().jumpTo({center: ll, zoom: 16.5, pitch: 0}), grp.ll); await p.waitForTimeout(1800);
        const gpt = await p.evaluate(ll => { const M = V2MAP(), q = M.project(ll), r = M.getCanvas().getBoundingClientRect(); return [q.x + r.left, q.y + r.top]; }, grp.ll);
        ok('v2 ordi · carte : annonces au même endroit regroupées, avec leur nombre', grp.n >= 2 && await p.evaluate(n => V2MAP().queryRenderedFeatures({layers: ['a-clu']}).some(f => f.properties.point_count === n), grp.n), JSON.stringify(grp));
        await p.mouse.click(gpt[0], gpt[1]); await p.waitForTimeout(900);
        ok('v2 ordi · carte : clic sur le groupe, la liste de ses annonces', await p.evaluate(n => document.querySelectorAll('.v2gpop [data-v2open]').length === Math.min(n, 12), grp.n));
        await p.click('.v2gpop [data-v2open]'); await p.waitForTimeout(1800);
        ok('v2 ordi · carte : une annonce du groupe s\'ouvre, et reste visible hors du groupe', await p.evaluate(() => !document.getElementById('v2fiche').hidden && !document.querySelector('.v2gpop') && V2MAP().queryRenderedFeatures({layers: ['a-sdot']}).length === 1));
        await p.evaluate(() => { const b = document.querySelector('[data-v2close]'); if (b) b.click(); }); await p.waitForTimeout(400);
        // la fiche d'une ville suit la ville au centre
        await p.evaluate(() => { const r = document.querySelector('#v2mlist [data-v2city=""]'); if (r) r.click(); }); await p.waitForTimeout(1500);
        await p.evaluate(() => document.querySelector('#v2mlist [data-v2city="angers"]').click()); await p.waitForTimeout(2500);
        await p.evaluate(() => V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 12})); await p.waitForTimeout(2000);
        ok('v2 ordi · carte : la fiche d\'une ville suit la ville au centre', await p.evaluate(() => /Le Mans/.test((document.querySelector('#v2fiche .v2ft') || {}).textContent || '')));
        await p.evaluate(() => { const b = document.querySelector('[data-v2close]'); if (b) b.click(); }); await p.waitForTimeout(400);
        await p.evaluate(() => V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 11.3})); await p.waitForTimeout(1200);
        // couleur des quartiers au choix : prix au m² en bleu, avec son échelle ; retour au rendement
        await p.evaluate(() => V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 11.3})); await p.waitForTimeout(1200);
        ok('v2 ordi · carte : lignes de bus et tram des réseaux (fichier à part), dessinées en ville', await p.evaluate(() => V2MAPN.lignes > 500 && V2MAP().queryRenderedFeatures({layers: ['p-lig']}).length > 5 && /Tram|Bus/.test(V2MAP().queryRenderedFeatures({layers: ['p-lig']})[0].properties.t)), await p.evaluate(() => V2MAPN.lignes));
        await p.selectOption('[data-v2qm]', 'prix'); await p.waitForTimeout(800);
        ok('v2 ordi · carte : quartiers colorés par le prix au m², échelle dans la légende', await p.evaluate(() => { const F = V2MAP().getSource('quartiers')._data.features, blues = ['#b7d3f6', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b']; return document.querySelector('[data-v2qm]').value === 'prix' && JSON.parse(localStorage.getItem('v2s')).qm === 'prix' && F.filter(f => blues.includes(f.properties.c)).length > 500 && new Set(F.map(f => f.properties.c)).size >= 5 && /€\/m²/.test(document.getElementById('v2mleg').textContent) && F.some(f => /\d €\/m²/.test(f.properties.t)); }), await p.evaluate(() => document.getElementById('v2mleg').textContent));
        await p.selectOption('[data-v2qm]', 'irr'); await p.waitForTimeout(800);
        ok('v2 ordi · carte : retour au rendement', await p.evaluate(() => JSON.parse(localStorage.getItem('v2s')).qm === 'irr' && !V2MAP().getSource('quartiers')._data.features.some(f => f.properties.c === '#3987e5')));
      }
      await p.evaluate(() => document.querySelector('#v2mlist [data-v2open]').click()); await p.waitForTimeout(800);
      ok(`v2 ${dev} · fiche : où le bien est placé sur la carte`, await p.evaluate(() => /^Sur la carte : /.test(((document.querySelector('#v2fiche .v2pos') || {}).textContent || '').trim())));
      if (dev === 'ordi') {
        const ka = await p.evaluate(() => { const A = new Set(V2MAP().getSource('annonces')._data.features.filter(f => f.properties.ap).map(f => f.properties.k)); const r = [...document.querySelectorAll('#v2mlist [data-v2open]')].find(e => A.has(e.dataset.v2open)); if (r) r.click(); return r ? r.dataset.v2open : null; });
        await p.waitForTimeout(2600);
        ok('v2 ordi · annonce à position approchée : zone dessinée, fiche qui le dit', !!ka && await p.evaluate(() => V2MAP().queryRenderedFeatures({layers: ['a-zone']}).length === 1 && /position approchée/.test(document.querySelector('#v2fiche .v2pos').textContent)), String(ka));
        await p.evaluate(() => document.querySelector('#v2mlist [data-v2open]').click()); await p.waitForTimeout(800);
      }
      ok(`v2 ${dev} · fiche en onglets avec la fourchette`, await p.evaluate(() => !document.getElementById('v2fiche').hidden && document.querySelectorAll('#v2fiche [data-v2ft]').length === 5 && /prudent .* favorable/.test(document.getElementById('v2fiche').textContent)));
      // photos en grand : la photo de la fiche ouvre toutes les photos (pas de seconde bande de photos dans la fiche)
      if (await p.$('#v2fiche .v2fthb')) {
        await p.click('#v2fiche .v2fthb'); await p.waitForTimeout(500);
        const lb = () => p.evaluate(() => { const e = document.querySelector('.v2lb'); return e ? e.querySelector('.v2lbc').textContent : null; });
        const c0 = await lb(); const n = c0 ? +c0.split('/')[1] : 0;
        if (dev === 'ordi') { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300); }
        const c1 = await lb();
        ok(`v2 ${dev} · photos : la photo de la fiche ouvre la visionneuse, toutes les photos`, !!c0 && /^1 \//.test(c0) && n >= 1 && (dev !== 'ordi' || n < 2 || /^2 \//.test(c1)) && await p.evaluate(() => { const g = document.querySelector('#v2fiche .fgal'); return !g || getComputedStyle(g).display === 'none'; }), JSON.stringify({c0, c1}));
        if (dev === 'ordi') await p.keyboard.press('Escape'); else await p.tap('.v2lb .v2lbx');
        await p.waitForTimeout(300);
        ok(`v2 ${dev} · photos : fermer la visionneuse laisse la fiche ouverte`, await p.evaluate(() => !document.querySelector('.v2lb') && !document.getElementById('v2fiche').hidden));
      }
      // ordinateur (et fiche plein écran) : les onglets visibles dès l'ouverture ; téléphone sur la carte (fiche en demi-écran) : le résumé d'abord, les onglets collés en haut dès qu'on fait défiler
      ok(`v2 ${dev} · fiche : les onglets visibles dès l'ouverture, ou collés en haut de la fiche en demi-écran`, await p.evaluate(async () => { const f = document.getElementById('v2fiche'), t = () => f.querySelector('.v2tabs2').getBoundingClientRect(), B = f.getBoundingClientRect();
        if (f.dataset.half !== '1') return t().bottom < B.bottom - 40;
        f.scrollTop = 600; await new Promise(r => setTimeout(r, 150)); const T = t(); f.scrollTop = 0; return T.top >= B.top - 1 && T.bottom < B.top + 140; }));
      ok(`v2 ${dev} · fiche : le DPE une seule fois dans l'en-tête`, await p.evaluate(() => { const h = document.querySelector('#v2fiche .v2fb'), t = h.querySelector('.v2tabs2'); let n = 0, e = h.firstElementChild; while (e && e !== t) { n += (e.innerText.match(/DPE [A-G]/g) || []).length; e = e.nextElementSibling; } return n <= 1; }));
      await p.evaluate(() => { document.querySelector('#v2fiche [data-v2ft="quartier"]').click(); }); await p.waitForTimeout(300);
      await p.evaluate(() => { document.getElementById('v2fiche').scrollTop = 1500; });
      await p.evaluate(() => document.querySelector('#v2fiche [data-v2ft="achat"]').click()); await p.waitForTimeout(300);
      ok(`v2 ${dev} · fiche : changer d'onglet ramène au début`, await p.evaluate(() => { const f = document.getElementById('v2fiche'), t = f.querySelector('.v2tabs2'), c = t.nextElementSibling; return Math.abs(c.getBoundingClientRect().top - t.getBoundingClientRect().bottom) < 30; }));
      ok(`v2 ${dev} · fiche : le tableau des offres tient dans le panneau`, await p.evaluate(() => { const t = document.querySelector('#v2fiche .v2offx.v2tw'); return t && t.scrollWidth <= t.clientWidth + 1; }));
      const r0 = await p.evaluate(() => document.querySelector('#v2fiche .v2sec .v2k b').textContent);
      await p.evaluate(() => { const s = document.getElementById('v2off'); s.value = '88'; s.dispatchEvent(new Event('input', {bubbles: true})); }); await p.waitForTimeout(300);
      ok(`v2 ${dev} · offre plus basse : rendement recalculé`, await p.evaluate(r0 => { const b = document.querySelector('#v2fiche .v2sec .v2k b').textContent; return b !== r0 && parseFloat(b.replace(',', '.').replace('−', '-')) > parseFloat(r0.replace(',', '.').replace('−', '-')); }, r0));
      await p.evaluate(() => document.querySelector('[data-v2close]').click());
      await p.evaluate(() => document.querySelector('[data-v2tab="annonces"]').click()); await p.waitForTimeout(500);
      const n0 = await p.evaluate(() => document.querySelectorAll('#v2p-annonces [data-v2open]').length);
      await p.evaluate(() => document.querySelectorAll('#v2p-annonces [data-v2open]')[2].click()); await p.waitForTimeout(500);
      ok(`v2 ${dev} · ouvrir une annonce ne filtre pas le tableau`, n0 > 2 && await p.evaluate(n0 => document.querySelectorAll('#v2p-annonces [data-v2open]').length === n0 && !document.getElementById('v2fiche').hidden, n0));
      // une annonce ouverte depuis l'onglet Annonces : en revenant sur la carte, celle-ci s'ouvre sur l'annonce
      { const tgt = await p.evaluate(() => { for (const e of document.querySelectorAll('#v2p-annonces [data-v2open]')) { const s = e.getAttribute('data-v2open'); if (!s.startsWith('v|')) continue;
          const f = FICX[adId(s.split('|').slice(2).join('|'))]; if (f && f.la != null && f.lo != null && f.r != null && f.r <= 300) { e.click(); return {la: +f.la, lo: +f.lo, r: f.r}; } } return null; });
        await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('[data-v2tab="carte"]').click()); await p.waitForTimeout(1500);
        const at = tgt && await p.evaluate(t => { const M = V2MAP(), c = M.getCenter(); return {d: Math.round(Math.hypot((c.lat - t.la) * 111000, (c.lng - t.lo) * 111000 * Math.cos(t.la * Math.PI / 180))), z: +M.getZoom().toFixed(2), fiche: !document.getElementById('v2fiche').hidden}; }, tgt);
        ok(`v2 ${dev} · annonce ouverte depuis l'onglet Annonces : la carte s'ouvre sur elle, fiche ouverte`, !!at && at.d < 60 && at.z >= 13.8 && at.fiche, JSON.stringify({tgt, at}));
        await p.evaluate(() => document.querySelector('[data-v2tab="annonces"]').click()); await p.waitForTimeout(500); }
      if (dev === 'tel') {   // fiche : les cinq onglets visibles ; Annonces : cash-flow sur sa ligne, tri ; Nos biens en lignes
        ok('v2 tel · fiche : les cinq onglets tiennent sur l\'écran, libellés courts', await p.evaluate(() => { const B = [...document.querySelectorAll('#v2fiche .v2tabs2 [data-v2ft]')], W = document.getElementById('v2fiche').clientWidth;
          return B.length === 5 && B.every(b => b.getBoundingClientRect().right <= W + 1 && b.scrollWidth <= b.clientWidth + 1) && B.map(b => b.textContent).join() === 'Bien,Prix,Calcul,Quartier,Achat'; }), await p.evaluate(() => [...document.querySelectorAll('#v2fiche .v2tabs2 [data-v2ft]')].map(b => b.textContent + ':' + Math.round(b.getBoundingClientRect().right)).join(' ')));
        ok('v2 tel · Annonces : le cash-flow a sa ligne, entière', await p.evaluate(() => { const C = [...document.querySelectorAll('#v2p-annonces .v2row .v2cfl')]; return C.length > 2 && C.every(c => c.scrollWidth <= c.clientWidth + 1); }));
        const prix = () => p.evaluate(() => [...document.querySelectorAll('#v2p-annonces .v2row > b')].slice(0, 6).map(b => parseFloat(b.textContent.replace(',', '.'))));
        await p.evaluate(() => { const s = document.querySelector('#v2p-annonces [data-v2sortm]'); s.value = 'p|1'; s.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(500);
        const pr = await prix(); ok('v2 tel · Annonces : tri par prix, le moins cher d\'abord', pr.length > 3 && pr.every((v, i) => !i || v >= pr[i - 1]), pr.join());
        await p.evaluate(() => { const s = document.querySelector('#v2p-annonces [data-v2sortm]'); s.value = 'irr|-1'; s.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(400);
        await p.evaluate(() => document.querySelector('#v2tabbar [data-v2tab="biens"]').click()); await p.waitForTimeout(500);
        ok('v2 tel · Nos biens : des lignes, pas un tableau', await p.evaluate(() => !document.querySelector('#v2p-biens table') && document.querySelectorAll('#v2p-biens .v2brow').length === BIENS.filter(b => !isOut(b)).length), await p.evaluate(() => BIENS.length + ' biens, ' + document.querySelectorAll('#v2p-biens .v2brow').length + ' lignes'));
        await p.evaluate(() => document.querySelector('#v2tabbar [data-v2tab="annonces"]').click()); await p.waitForTimeout(400);
      }
      if (dev === 'ordi') {
        await p.evaluate(() => { document.querySelector('[data-v2close]').click(); document.querySelector('[data-v2av="nuage"]').click(); }); await p.waitForTimeout(400);
        ok(`v2 ${dev} · nuage des annonces`, await p.evaluate(() => document.querySelectorAll('#v2p-annonces svg [data-v2open]').length > 2));
        ok(`v2 ${dev} · nuage : aucune annonce collée en haut de l'échelle`, await p.evaluate(() => [...document.querySelectorAll('#v2p-annonces svg circle[data-v2open]')].every(c => +c.getAttribute('cy') > 30.5)));
        await p.evaluate(() => document.querySelector('[data-v2av="tableau"]').click()); await p.waitForTimeout(300);
      } else {
        await p.evaluate(() => document.querySelector('[data-v2close]').click()); await p.waitForTimeout(300);
        await p.evaluate(() => document.querySelector('[data-v2tab="carte"]').click()); await p.waitForTimeout(600);
        const lh = await p.evaluate(() => document.getElementById('v2mleg').getBoundingClientRect().height);
        ok('v2 tel · carte : légende sur une ligne (menu des quartiers et échelle seulement)', lh > 20 && lh < 60, String(lh));
        await p.evaluate(() => document.querySelector('[data-v2tab="annonces"]').click()); await p.waitForTimeout(600);
        ok(`v2 ${dev} · téléphone : pas de nuage, filtres sur une ligne`, await p.evaluate(() => !document.querySelector('[data-v2av]') && getComputedStyle(document.querySelector('#v2p-annonces .v2chips')).flexWrap === 'nowrap'));
      }
      await p.evaluate(() => document.querySelector('[data-v2tab="villes"]').click()); await p.waitForTimeout(400);
      ok(`v2 ${dev} · villes`, await p.evaluate(() => document.querySelectorAll('#v2p-villes [data-v2city]').length === C.length));
      ok(`v2 ${dev} · villes : rien ne déborde en largeur`, await p.evaluate(() => { const t = document.querySelector('#v2p-villes .v2tw'); return t && t.scrollWidth <= t.clientWidth + 1; }));
      await p.evaluate(() => document.querySelector('[data-v2tab="budget"]').click()); await p.waitForTimeout(300);
      await p.evaluate(() => { const i = document.getElementById('v2h-apport'); i.value = '20000'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(400);
      ok(`v2 ${dev} · hypothèse modifiée et appliquée`, await p.evaluate(() => H.apport === 20000));
      await p.evaluate(() => { const i = document.getElementById('v2h-apport'); i.value = '15000'; i.dispatchEvent(new Event('change', {bubbles: true})); });
      // mêmes chiffres pour villes et quartiers : le réglage Vacance est la moyenne des quartiers (comptés selon leurs ventes),
      // et le chiffre d'une ville est celui de son quartier du milieu
      if (dev === 'ordi') {
        const vq = () => p.evaluate(() => C.map(c => { const D = dvfC(c.k), L = IR[c.k].list.filter(t => t.type === 'H' && t.price), W = L.map(t => (D && D.q[t.code] && D.q[t.code].n) || 0), any = W.some(v => v > 0);
          let s = 0, w = 0; L.forEach((t, i) => { const d = demandOf(t), wi = any ? W[i] : 1; if (d && wi) { s += d.vac * wi; w += wi; } }); return Math.abs((w ? s / w : vacVille(c.k)) - vacVille(c.k)) < 1e-9; }).every(Boolean));
        ok('v2 · mois vides : la moyenne des quartiers de chaque ville est la vacance de la ville', await vq());
        ok('v2 · mois vides de la ville : le réglage tant que le délai de location n\'est pas mesuré, sinon borné entre la moitié et le double', await p.evaluate(() => { const m = vacMes(); return C.every(c => { const v = vacVille(c.k) / H.vacance; return m.ref ? v >= 0.5 - 1e-9 && v <= 2 + 1e-9 : Math.abs(v - 1) < 1e-9; }); }));
        await p.evaluate(() => { const i = document.getElementById('v2h-vacance'); i.value = '2'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(500);
        ok('v2 · mois vides : changer le réglage déplace aussi les quartiers', await p.evaluate(() => H.vacance === 2) && await vq());
        await p.evaluate(() => { const i = document.getElementById('v2h-vacance'); i.value = '1'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(500);
        ok('v2 · chiffre d\'une ville = son quartier du milieu (ventes du type)', await p.evaluate(() => C.every(c => { const D = dvfC(c.k), L = IR[c.k].list.filter(t => t.type === 'H' && t.price);
          if (!L.length) return true; let R = L.map(t => ({v: QX[t.ck + t.i].irr, w: (D && D.q[t.code] && D.q[t.code].n) || 0})); if (!R.some(o => o.w > 0)) R.forEach(o => { o.w = 1; });
          R = R.filter(o => o.w > 0).sort((a, b) => (a.v ?? -1e9) - (b.v ?? -1e9)); const T = R.reduce((s, o) => s + o.w, 0); let s = 0, m = R[R.length - 1];
          for (const o of R) { s += o.w; if (s >= T / 2) { m = o; break; } } return calcVille(c).irr === m.v; })));
        await p.evaluate(() => document.querySelector('[data-v2tab="villes"]').click()); await p.waitForTimeout(300);
        await p.evaluate(() => document.querySelector('#v2p-villes [data-v2city="lemans"]').click()); await p.waitForTimeout(800);
        { const tx = async tab => { await p.evaluate(t => { const b = document.querySelector('#v2fiche [data-v2ft="' + t + '"]'); if (b) b.click(); }, tab); await p.waitForTimeout(300); return p.evaluate(() => (document.getElementById('v2fiche') || {}).textContent || ''); };
          const tp = await tx('prix'), tc = await tx('calc'); await tx('bien');
          ok('v2 · fiche d\'une ville : hausse des prix retenue, prix depuis 2014 et mois vides de la ville', /Hausse des prix retenue/.test(tp) && /Appartements anciens/.test(tp) && /Mois vides retenus/.test(tc), tp.slice(0, 120) + ' | ' + tc.slice(0, 120)); }
        ok('v2 · fiche d\'une ville : nomme son quartier du milieu', await p.evaluate(() => /Quartier du milieu : /.test((document.getElementById('v2fiche') || {}).innerText || '')), await p.evaluate(() => ((document.getElementById('v2fiche') || {}).innerText || '').slice(0, 300)));
        await p.evaluate(() => { const b = document.querySelector('[data-v2close]'); if (b) b.click(); }); await p.waitForTimeout(300);
      }
      // mode « Tous » : studios, T2 et T3 ensemble, chaque annonce avec son type ; une annonce T2 s'ouvre avec les réglages T2
      if (dev === 'ordi') {
        await p.evaluate(() => document.querySelector('[data-v2tous]').click()); await p.waitForTimeout(2500);
        await p.evaluate(() => document.querySelector('[data-v2tab="annonces"]').click()); await p.waitForTimeout(600);
        ok('v2 · mode Tous : les trois types ensemble', await p.evaluate(() => { const t = new Set([...document.querySelectorAll('#v2p-annonces .v2sub')].map(e => e.textContent.trim()).filter(x => /^(Studio|T2|T3)$/.test(x))); return t.size >= 2 && /annonces/.test(document.querySelector('#v2p-annonces .v2sub').textContent); }));
        await p.evaluate(() => { const r = [...document.querySelectorAll('#v2p-annonces [data-v2open]')].find(e => /\bT2\b/.test(e.innerText)); if (r) r.click(); }); await p.waitForTimeout(800);
        ok('v2 · mode Tous : une annonce T2 s\'ouvre en T2', await p.evaluate(() => H.type === 't2' && /T2/.test(document.querySelector('#v2fiche .v2ft').textContent)));
        await p.evaluate(() => { document.querySelector('[data-v2close]').click(); document.querySelector('#v2type [data-type="studio"]').click(); }); await p.waitForTimeout(1200);
        ok('v2 · retour à un type', await p.evaluate(() => H.type === 'studio' && document.querySelector('[data-v2tous]').getAttribute('aria-pressed') === 'false'));
      }
      ok(`v2 ${dev} · sans erreur`, errs.length === 0, errs.slice(0, 3).join(' | '));
      await c.close(); } }
  // v2 · réglages communs à deux : deux navigateurs (deux personnes), une liste commune simulée (Supabase en mémoire)
  { const fs = require('fs'), {URL: U} = require('url'), URL2 = URL;
    // la base range les clés des objets JSON à sa façon (jsonb : par longueur, puis par ordre alphabétique) : la liste simulée fait de même
    const jb = v => Array.isArray(v) ? v.map(jb) : v && typeof v === 'object' ? Object.keys(v).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)).reduce((o, k) => (o[k] = jb(v[k]), o), {}) : v;
    const rows = []; let n = 0; const CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'};
    const sb = async r => { const q = r.request(), u = new U(q.url()), m = q.method(), id = (u.searchParams.get('id') || '').replace(/^eq\./, ''), js = (s, b) => r.fulfill({status: s, headers: CORS, contentType: 'application/json', body: b});
      if (m === 'OPTIONS') return r.fulfill({status: 204, headers: CORS, body: ''});
      if (u.pathname.endsWith('/annonces')) return js(200, '[]');
      if (m === 'GET') return js(200, JSON.stringify(id ? rows.filter(x => x.id === id) : rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))));
      if (m === 'POST') { rows.push({id: 'r' + (++n), data: jb(JSON.parse(q.postData()).data), created_at: new Date(Date.now() + n).toISOString()}); return js(201, ''); }
      if (m === 'PATCH') { const x = rows.find(x => x.id === id); if (x) x.data = jb(JSON.parse(q.postData()).data); return js(204, ''); }
      if (m === 'DELETE') { const i = rows.findIndex(x => x.id === id); if (i >= 0) rows.splice(i, 1); return js(204, ''); }
      return js(405, ''); };
    const open = async nom => { const c = await b.newContext({viewport: {width: 1440, height: 900}});
      await c.addInitScript(nom => { try { localStorage.setItem('biens-code', 'groupe-de-test-commun'); localStorage.setItem('biens-nom', nom); } catch (_) {} }, nom);
      const p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
      await mlRoutes(p);
      await p.route('**/rest/v1/**', sb);
      await p.goto(URL2); await p.waitForTimeout(2500); return {c, p, errs}; };
    const tick = p => p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    const reg = () => (rows.find(x => x.data && x.data.kind === 'reglages') || {}).data || null;
    const A = await open('Louis');
    ok('v2 commun · premier lancement : critères demandés', await A.p.evaluate(() => !!document.querySelector('.v2dlg')));
    await A.p.evaluate(() => { const i = document.getElementById('v2cB'); i.value = '80000'; i.dispatchEvent(new Event('input', {bubbles: true})); document.querySelector('.v2dlg button[type=submit]').click(); });
    await A.p.waitForTimeout(500);
    await A.p.evaluate(() => { document.querySelector('[data-v2tab="budget"]').click(); }); await A.p.waitForTimeout(300);
    await A.p.evaluate(() => { const i = document.getElementById('v2h-apport'); i.value = '21000'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await A.p.waitForTimeout(1800);
    ok('v2 commun · une seule ligne de réglages, avec apport et critères', rows.filter(x => x.data.kind === 'reglages').length === 1 && reg() && reg().hyp.apport === 21000 && reg().crit && reg().crit.budget === 80000, JSON.stringify(reg() && {hyp: reg().hyp.apport, crit: reg().crit}));
    const B = await open('Camille');
    ok('v2 commun · l\'autre reçoit les réglages', await B.p.evaluate(() => H.apport === 21000 && critV().budget === 80000));
    ok('v2 commun · pas de critères redemandés à l\'autre', await B.p.evaluate(() => !document.querySelector('.v2dlg')));
    ok('v2 commun · la ligne des réglages n\'est pas un bien', await B.p.evaluate(() => BIENS.length === 0));
    await B.p.evaluate(() => { document.querySelector('[data-v2tab="budget"]').click(); }); await B.p.waitForTimeout(300);
    await B.p.evaluate(() => { const i = document.getElementById('v2h-taux'); i.value = '3.5'; i.dispatchEvent(new Event('change', {bubbles: true})); const m = document.getElementById('v2h-meubles'); m.value = '4000'; m.dispatchEvent(new Event('change', {bubbles: true})); }); await B.p.waitForTimeout(1800);
    await tick(A.p); await A.p.waitForTimeout(1200);
    ok('v2 commun · un changement de l\'autre arrive (taux, meubles du type)', await A.p.evaluate(() => H.taux === 3.5 && H.meubles === 4000), await A.p.evaluate(() => H.taux + ' / ' + H.meubles));
    ok('v2 commun · message nommant qui a modifié', await A.p.evaluate(() => /Camille a modifié les réglages communs/.test((document.getElementById('toast') || {}).textContent || '')));
    // associés : Camille passe à trois associés et nomme le troisième, Louis le reçoit
    await B.p.evaluate(() => document.querySelector('[data-v2nas="3"]').click()); await B.p.waitForTimeout(500);
    await B.p.evaluate(() => { const i = document.getElementById('v2a-2-nom'); i.value = 'Sam'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await B.p.waitForTimeout(1800);
    await tick(A.p); await A.p.waitForTimeout(1200);
    ok('v2 commun · associés : trois, partagés, parts à 100 %', await A.p.evaluate(() => H.assoc.length === 3 && H.assoc[2].nom === 'Sam' && Math.abs(H.assoc.reduce((s, a) => s + a.part, 0) - 100) < 1e-6), await A.p.evaluate(() => JSON.stringify(H.assoc.map(a => [a.nom, a.part]))));
    // relecture sans changement (toutes les 20 s en vrai) : rien n'est réappliqué, ni message ni recalcul
    await A.p.evaluate(() => { window.__r = 0; const r0 = window.render; window.render = function () { window.__r++; return r0.apply(this, arguments); }; const t = document.getElementById('toast'); if (t) t.textContent = ''; });
    await tick(A.p); await A.p.waitForTimeout(1200); await tick(A.p); await A.p.waitForTimeout(1200);
    ok('v2 commun · relecture sans changement : ni message ni recalcul', await A.p.evaluate(() => window.__r === 0 && !/réglages communs/.test((document.getElementById('toast') || {}).textContent || '')), await A.p.evaluate(() => window.__r + ' recalculs / ' + ((document.getElementById('toast') || {}).textContent || '')));
    await A.p.reload(); await A.p.waitForTimeout(2500);
    ok('v2 commun · meubles du type gardés après rechargement', await A.p.evaluate(() => H.meubles === 4000));
    // offre : suivre une annonce puis choisir un prix, l'autre le voit
    await A.p.evaluate(() => document.querySelector('[data-v2tab="annonces"]').click()); await A.p.waitForTimeout(500);
    await A.p.evaluate(() => document.querySelector('#v2p-annonces [data-v2star]').click()); await A.p.waitForTimeout(1500);
    await A.p.evaluate(() => document.querySelector('#v2p-annonces [data-v2open]').click()); await A.p.waitForTimeout(600);
    await A.p.evaluate(() => document.querySelector('#v2fiche [data-v2ft="achat"]').click()); await A.p.waitForTimeout(300);
    await A.p.evaluate(() => { const s = document.getElementById('v2off'); s.value = '90'; s.dispatchEvent(new Event('input', {bubbles: true})); s.dispatchEvent(new Event('change', {bubbles: true})); }); await A.p.waitForTimeout(1500);
    const off = (rows.find(x => x.data && x.data.kind !== 'reglages' && x.data.visite) || {data: {visite: {}}}).data.visite.offre;
    await tick(B.p); await B.p.waitForTimeout(1200);
    ok('v2 commun · offre enregistrée pour les deux', off > 0 && await B.p.evaluate(o => BIENS.length === 1 && +BIENS[0].visite.offre === o, off), String(off));
    // ce qui a bougé : Camille revient « un autre jour » (état de la liste d'avant l'ajout) et voit ce que Louis a fait
    await B.p.evaluate(() => { localStorage.setItem('v2vu', JSON.stringify({day: '2000-01-01', ref: null, rt: null, last: {}, lt: '2000-01-01T00:00:00.000Z'})); localStorage.setItem('mvisit', JSON.stringify({last: '2000-01-01', prev: null}));
      const s = JSON.parse(localStorage.getItem('v2s') || '{}'); s.tab = 'carte'; s.city = null; localStorage.setItem('v2s', JSON.stringify(s)); });
    await B.p.reload(); await B.p.waitForTimeout(3000);
    const nws = await B.p.evaluate(() => (document.querySelector('#v2mlist .v2news') || {}).innerText || '');
    ok('v2 commun · ce qui a bougé : le bien ajouté par l\'autre', /Louis l'a ajouté/.test(nws), nws.slice(0, 200));
    ok('v2 commun · ce qui a bougé : nouvelles annonces depuis la visite', /nouvelles? annonces? pour nos critères/.test(nws), nws.slice(0, 200));
    ok('v2 commun · Nos biens signale le bien à regarder', await B.p.evaluate(() => ((document.querySelector('#v2tabs [data-v2tab="biens"] small') || {}).textContent || '') === '1'));
    ok('v2 · le premier relevé d\'une ville ne compte pas comme nouveau', await B.p.evaluate(() => { const K = Object.keys(ADS).filter(k => ADS[k] && ADS[k].ventes && hStart(k, 'v') === ADS.iso); return K.length > 0 && K.every(k => ADS[k].ventes.every(a => !isNewAd(k, a[3]))); }));
    ok('v2 · L\'Ouest compte les annonces pour nos critères', await B.p.evaluate(() => { const R = [...document.querySelectorAll('#v2mlist [data-v2city]:not(.v2dim)')]; return R.length > 0 && R.every(e => /pour nos critères/.test(e.innerText)); }), await B.p.evaluate(() => { const e = document.querySelector('#v2mlist [data-v2city]:not(.v2dim)'); return e ? e.outerHTML.slice(0, 300) : 'aucune ville avec des annonces'; }));
    // grille de visite et fiche à emporter, ouvertes depuis la fiche du bien suivi
    await A.p.evaluate(() => document.querySelector('#v2fiche [data-v2ft="achat"]').click()); await A.p.waitForTimeout(300);
    await A.p.evaluate(() => document.querySelector('#v2fiche [data-visit]').click()); await A.p.waitForTimeout(500);
    ok('v2 · grille de visite ouverte depuis la fiche', await A.p.evaluate(() => !document.getElementById('visitPanel').hidden && document.querySelectorAll('#visitPanel [data-vck]').length > 10));
    await A.p.evaluate(() => document.querySelector('#visitPanel .vclose').click()); await A.p.waitForTimeout(300);
    await A.p.evaluate(() => document.querySelector('#v2fiche [data-fiche]').click()); await A.p.waitForTimeout(500);
    ok('v2 · fiche à emporter ouverte depuis la fiche', await A.p.evaluate(() => !document.getElementById('fichePanel').hidden && document.getElementById('ficheBody').innerText.length > 200));
    await A.p.evaluate(() => document.querySelector('#fichePanel .fclose').click()); await A.p.waitForTimeout(300);
    // nos biens : ajouter un bien à la main dans une fenêtre (formulaire de l'app), puis comparer deux biens
    await A.p.evaluate(() => document.querySelector('[data-v2tab="biens"]').click()); await A.p.waitForTimeout(400);
    await A.p.evaluate(() => document.querySelector('[data-v2add]').click()); await A.p.waitForTimeout(300);
    ok('v2 · ajouter un bien : le formulaire dans une fenêtre', await A.p.evaluate(() => !!document.querySelector('.v2dlg #biensForm')));
    await A.p.fill('.v2dlg #biensForm [name=prix]', '52000'); await A.p.fill('.v2dlg #biensForm [name=surface]', '21'); await A.p.click('.v2dlg #biensForm [type=submit]'); await A.p.waitForTimeout(2000);
    ok('v2 · bien ajouté, fenêtre fermée, formulaire rangé', await A.p.evaluate(() => BIENS.length === 2 && !document.querySelector('.v2dlg') && !!document.querySelector('#p-biens #biensForm')), await A.p.evaluate(() => BIENS.length + ' ' + !!document.querySelector('.v2dlg')));
    await A.p.evaluate(() => document.querySelectorAll('#v2p-biens [data-v2cmp]').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', {bubbles: true})); })); await A.p.waitForTimeout(500);
    ok('v2 · comparer deux biens côte à côte', await A.p.evaluate(() => document.querySelectorAll('#v2p-biens .v2cmpt thead th').length === 3));
    await A.p.evaluate(() => document.querySelector('[data-v2tab="budget"]').click()); await A.p.waitForTimeout(400);
    ok('v2 · sources et fraîcheur des données dans Budget', await A.p.evaluate(() => !!document.querySelector('#v2p-budget #sources')));
    ok('v2 · Budget : gestion par agence à 0, hausse des prix selon la ville cochée, et leur poids dans « Ce qui pèse »', await A.p.evaluate(() => { const g = document.getElementById('v2h-gestion'), x = document.querySelector('#v2p-budget [data-v2hb="pxV"]'), t = document.getElementById('v2p-budget').textContent;
      return g && g.value === '0' && x && x.checked && /Gestion par agence/.test(t) && /Prix selon la ville/.test(t) && /logements vides/.test(t); }));
    ok('v2 · DPE à jour : badge et travaux d\'après la classe de 2027, classe annoncée rappelée', await A.p.evaluate(() => { const K = Object.keys(FICX).filter(k => FICX[k].dpe0); if (!K.length) return false;
      const k = K.find(k => /[EFG]/.test(FICX[k].dpe0)) || K[0], b = ficheBadges(k); let a = null; for (const ck in ADS) { const v = ADS[ck]; if (!v || !v.ventes) continue; a = v.ventes.find(x => adId(x[3]) === k); if (a) { a = [ck, a]; break; } }
      const L = a ? valeursBien(venteBien(a[0], a[1])).travaux.L.map(z => z[0]).join(' ') : ''; return b.includes('DPE ' + FICX[k].dpe + '*') && /1er janvier 2027/.test(b) && (!a || !/[EFG]/.test(FICX[k].dpe) || /annoncé/.test(L)); }));
    { const rd = n => fs.readFileSync(path.resolve(__dirname, '..', n), 'utf8');
      ok('une seule interface : index.html est la v2, plus d\'ancienne page, v2.html y renvoie', rd('index.html').includes('app.id="v2app"') && !fs.existsSync(path.resolve(__dirname, '..', 'ancienne.html')) && !rd('index.html').includes('id="mApp"') && rd('v2.html').includes('location.replace')); }
    ok('v2 commun · sans erreur', !A.errs.length && !B.errs.length, A.errs.concat(B.errs).slice(0, 3).join(' | '));
    await A.c.close(); await B.c.close(); }
  await b.close();
  let bad = 0; for (const [name, pass, info] of res) { if (!pass) bad++; console.log((pass ? '✓ ' : '✗ ') + name + (pass || !info ? '' : '  → ' + info)); }
  console.log(`\n${res.length - bad}/${res.length} tests réussis`); process.exit(bad ? 1 : 0);
})();
