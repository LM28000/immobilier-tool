// Tests de bout en bout de la nouvelle interface (Insula, src/v3, page d'essai essai.html) : node tests/run-v3.js (après python3 build.py)
// Mêmes scénarios que tests/run.js (src/v2), passés à la nouvelle structure : Explorer (carte, liste, graphique), Nos biens, Projet, Réglages.
const {chromium, devices} = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../dist/essai-test.html');
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
  // __tab(k) : les anciens onglets dans la nouvelle structure (carte, annonces, villes : Explorer ; budget : Projet)
  const MISS = []; { const nc = b.newContext.bind(b); b.newContext = async o => { const c = await nc(o); c.on('console', m => { const t = m.text(); if (t.startsWith('__miss ')) MISS.push(t.slice(7)); }); await c.addInitScript(() => { window.__cl = s => { const e = document.querySelector(s); if (e) e.click(); else console.warn('__miss ' + s); return !!e; }; window.__tab = k => {
      const q = s => document.querySelector(s), cl = s => { const e = q(s); if (e) e.click(); return !!e; };
      if (k === 'carte') { cl('[data-v2tab="explorer"]'); cl('[data-v3view="carte"]'); if (!q('#v3scope [data-v2city=""]')) cl('[data-v3obj="villes"]'); return; }
      if (k === 'annonces' || k === 'villes') { cl('[data-v2tab="explorer"]'); cl('[data-v3view="liste"]'); if (q('#v3scope [data-v2city=""]')) cl('#v3scope [data-v2city=""]'); cl(`[data-v3obj="${k}"]`); return; }
      cl(`[data-v2tab="${k === 'budget' ? 'projet' : k}"]`); }; }); return c; }; }
  // adresse exacte dans « Ajouter un bien » (services simulés)
  { const c = await b.newContext({viewport: {width: 1300, height: 900}}); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
    await p.route('**/data.geopf.fr/geocodage/**', r => r.fulfill({contentType: 'application/json', body: JSON.stringify({features: [{properties: {label: '10 Rue Gougeard 72000 Le Mans', city: 'Le Mans', postcode: '72000', type: 'housenumber'}, geometry: {coordinates: [0.1915, 47.9975]}}]})}));
    await p.route('**/routing.openstreetmap.de/**', r => r.fulfill({contentType: 'application/json', body: JSON.stringify({durations: [[0, 300, 2400, 900]], distances: [[0, 400, 3000, 1100]]})}));
    await p.route(/overpass/, r => r.fulfill({contentType: 'application/json', body: JSON.stringify({elements: [{type: 'way', tags: {highway: 'trunk', ref: 'N 138'}, geometry: [{lat: 47.9995, lon: 0.1980}, {lat: 48.0005, lon: 0.2000}]}]})}));
    await p.route('**/www.georisques.gouv.fr/**', r => { const u = r.request().url(); r.fulfill({contentType: 'application/json', body: u.includes('rga') ? '{"codeExposition":"1"}' : u.includes('ssp') ? '{"casias":{"results":2},"conclusions_sis":{"results":0},"instructions":{"results":0}}' : '{"results":0}'}); });
    await mlRoutes(p);
    await p.goto(URL); await p.waitForTimeout(2000); await p.click('.v2dlg button[type=submit]'); await p.waitForTimeout(500);
    await p.evaluate(() => __tab('biens')); await p.waitForTimeout(300);
    await p.evaluate(() => __cl('[data-v2add]')); await p.waitForTimeout(300);
    await p.fill('.v2dlg #biensForm .adrin', '10 rue Gougeard Le Mans'); await p.waitForSelector('.v2dlg #biensForm [data-adrpick]', {timeout: 8000}).catch(() => {});
    await p.click('.v2dlg #biensForm [data-adrpick]'); await p.waitForFunction(() => document.getElementById('b-ville').value === 'lemans' && !!document.getElementById('b-quartier').value, null, {timeout: 8000}).catch(() => {});
    ok('ajout d\'un bien · adresse : ville et quartier trouvés', await p.evaluate(() => document.getElementById('b-ville').value === 'lemans' && !!document.getElementById('b-quartier').value));
    await p.fill('.v2dlg #biensForm [name=prix]', '60000'); await p.fill('.v2dlg #biensForm [name=surface]', '22'); await p.click('.v2dlg #biensForm [type=submit]'); await p.waitForFunction(() => BIENS.length === 1 && BIENS[0].geo && BIENS[0].geo.risq, null, {timeout: 8000}).catch(() => {});
    ok('ajout d\'un bien · adresse enregistrée avec trajets et risques', await p.evaluate(() => BIENS.length === 1 && BIENS[0].lat > 47 && BIENS[0].geo && BIENS[0].geo.foot.length === 3 && !!BIENS[0].geo.risq));
    await p.evaluate(() => __tab('carte')); await p.waitForTimeout(1500);
    ok('ajout d\'un bien · placé sur la carte à son adresse', await p.evaluate(() => { const f = V2MAP().getSource('annonces')._data.features.find(f => f.properties.k === 'b|' + BIENS[0].id); return !!f && Math.abs(f.geometry.coordinates[1] - BIENS[0].lat) < 1e-6 && !f.properties.ap; }));
    await p.evaluate(() => { __tab('biens'); __cl(`[data-v2open="b|${BIENS[0].id}"]`); }); await p.waitForTimeout(600);
    ok('ajout d\'un bien · la fiche dit qu\'il est à l\'adresse saisie', await p.evaluate(() => /Sur la carte : à l'adresse saisie/.test((document.querySelector('#v2fiche .v2pos') || {}).textContent || '')));
    ok('ajout d\'un bien · bruit mesuré à l\'adresse (voies de la ville : grands axes et voies ferrées, avec leur nom)', await p.evaluate(() => Array.isArray(BIENS[0].geo.bruit) && BIENS[0].geo.bruit.length === 3 && BIENS[0].geo.bruit.some(x => x && x[0] >= 0 && typeof x[1] === 'string')), await p.evaluate(() => JSON.stringify(BIENS[0].geo.bruit)));
    ok('ajout d\'un bien · adresse sans erreur', errs.length === 0, errs.join(' | '));
    await c.close(); }
  // thème : clair par défaut même si l'appareil est en sombre ; clair, sombre ou comme l'appareil, dans Réglages ; la carte change de fond et garde ses couches
  { const c = await b.newContext({viewport: {width: 1300, height: 850}, colorScheme: 'dark'}); const p = await c.newPage(); const errs = [], styles = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/cdnjs.cloudflare.com/**', r => r.abort()); await mlRoutes(p);
    p.on('request', r => { const u = r.url(); if (u.includes('openfreemap.org/styles/')) styles.push(u.split('/').pop()); });
    await p.goto(URL); await p.waitForTimeout(2000); await p.click('.v2dlg button[type=submit]'); await p.waitForTimeout(1200);
    const fond = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    ok('thème · clair par défaut, même avec un appareil en sombre', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light') && await fond() === 'rgb(238, 241, 245)' && styles[0] === 'positron', (await fond()) + ' ' + styles.join(','));
    await p.evaluate(() => __tab('reglages')); await p.waitForTimeout(300); await p.evaluate(() => __cl('#v2p-reglages [data-v2theme="dark"]')); await p.evaluate(() => __tab('carte')); await p.waitForTimeout(1500);
    ok('thème · Réglages : sombre, la carte aussi (couches gardées)', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark' && localStorage.getItem('theme-v2') === 'dark' && !!V2MAP().getLayer('a-dot') && !!V2MAP().getLayer('q-fill') && V2MAPN.err.length === 0) && await fond() === 'rgb(16, 22, 30)' && styles.includes('dark'), styles.join(','));
    await p.reload(); await p.waitForTimeout(2000);
    ok('thème · le choix est gardé', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark'));
    await p.evaluate(() => __tab('reglages')); await p.waitForTimeout(300);
    await p.evaluate(() => __cl('#v2p-reglages [data-v2theme="light"]')); await p.waitForTimeout(600);
    ok('thème · retour au clair depuis Réglages', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'light' && document.querySelector('#v2p-reglages [data-v2theme="light"]').getAttribute('aria-pressed') === 'true') && await fond() === 'rgb(238, 241, 245)');
    await p.evaluate(() => __cl('#v2p-reglages [data-v2theme="auto"]')); await p.waitForTimeout(600);
    ok('thème · « Comme l\'appareil » : sombre sur un appareil en sombre, gardé au rechargement', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark' && localStorage.getItem('theme-v2') === 'auto'));
    await p.reload(); await p.waitForTimeout(1500);
    ok('thème · « Comme l\'appareil » appliqué dès l\'ouverture', await p.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark'));
    ok('thème · sans erreur', errs.length === 0, errs.join(' | '));
    await c.close(); }
  // un groupe par foyer (famille, amis) : créer, inviter par un lien, rejoindre ; ce que couvre le relevé ; mode d'emploi ; remarques (Supabase simulé)
  { const c = await b.newContext({viewport: {width: 1300, height: 850}}); const p = await c.newPage(); const errs = [], posts = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    const sb = async q => { await q.route('**/cdnjs.cloudflare.com/**', r => r.abort()); await mlRoutes(q); await q.route(/supabase\.co\/rest\/v1\//, r => { const u = r.request().url(), m = r.request().method(), H = {'access-control-allow-origin': '*'};
      if (/retours_lecture/.test(u)) return r.fulfill({headers: H, contentType: 'application/json', body: JSON.stringify([{id: 1, cree: '2026-11-11T09:00:00Z', texte: 'Le loyer de Caen me semble haut', prenom: 'Claire', contexte: 'onglet carte', nous: false}])});
      if (/\/retours/.test(u) && m === 'POST') { posts.push({g: r.request().headers()['x-groupe'], b: JSON.parse(r.request().postData() || '{}')}); return r.fulfill({status: 201, headers: H, body: ''}); }
      if (/\/biens/.test(u)) return m === 'GET' ? r.fulfill({headers: H, contentType: 'application/json', body: '[]'}) : r.fulfill({status: 201, headers: H, body: ''});
      return r.abort(); }); };
    await sb(p); await p.addInitScript(() => { Object.defineProperty(navigator, 'share', {configurable: true, value: d => { window.__sh = d; return Promise.resolve(); }}); });
    await p.goto(URL); await p.waitForTimeout(2000);
    const cr = await p.evaluate(() => { const c = document.querySelector('.v2dlg .v2couv'), B = document.getElementById('v2cB'); B.value = 200000; B.dispatchEvent(new Event('input')); const w = document.getElementById('v2cW'); return {c: c && c.innerText, w: !!w && !w.hidden}; });
    ok('critères : ce que couvre le relevé (villes, types, plafond de prix) ; budget au-delà du plafond signalé', /22 villes de l'Ouest, studios, T2 et T3, jusqu'à 120 k€/.test(cr.c) && cr.w, JSON.stringify(cr));
    await p.click('.v2dlg button[type=submit]'); await p.waitForTimeout(800);
    const t0 = await p.evaluate(() => !!document.querySelector('#v2mlist .v2tip [data-v2guide]')); await p.evaluate(() => __cl('#v2mlist .v2tip [data-v2guide]')); await p.waitForTimeout(300);
    const g = await p.evaluate(() => [...document.querySelectorAll('.v2guide h3')].map(h => h.textContent)); await p.evaluate(() => __cl('.v2guide [data-v2cx]')); await p.waitForTimeout(300);
    const t1 = await p.evaluate(() => !!document.querySelector('#v2mlist .v2tip'));
    ok('première visite : « Comment lire l\'app » en tête de la liste, cinq rubriques, ne revient plus une fois lu', t0 && g.length === 5 && /Explorer/.test(g[0]) && /couvre/.test(g[4]) && !t1, JSON.stringify({t0, g, t1}));
    await p.evaluate(() => __tab('reglages')); await p.waitForTimeout(500); await p.fill('#v2nom2', 'Louis');
    await Promise.all([p.waitForNavigation({timeout: 15000}).catch(() => {}), p.evaluate(() => __cl('[data-v2grp]'))]); await p.waitForTimeout(2500);
    const code = await p.evaluate(() => localStorage.getItem('biens-code'));
    ok('créer notre groupe : code tiré au hasard (15 caractères), prénom gardé', /^[a-z2-9]{5}-[a-z2-9]{5}-[a-z2-9]{5}$/.test(code || '') && await p.evaluate(() => localStorage.getItem('biens-nom')) === 'Louis', code ? code.replace(/./g, '•') : 'aucun');
    await p.evaluate(() => __tab('reglages')); await p.waitForTimeout(500); await p.evaluate(() => __cl('[data-v2inv]')); await p.waitForTimeout(300);
    const inv = await p.evaluate(() => window.__sh || null);
    ok('inviter : feuille de partage avec un lien qui contient le groupe', !!inv && inv.url.endsWith('#g=' + encodeURIComponent(code)) && /Louis vous invite/.test(inv.text), inv && inv.text);
    const c2 = await b.newContext({viewport: {width: 1300, height: 850}}), q = await c2.newPage(); q.on('pageerror', e => errs.push('invité : ' + e.message)); await sb(q);
    await q.goto(URL + '#g=' + encodeURIComponent(code)); await q.waitForTimeout(2500); const jd = await q.evaluate(() => (document.querySelector('.v2dlg form h2') || {}).textContent || null);
    await q.fill('#v2jN', 'Claire'); await Promise.all([q.waitForNavigation({timeout: 15000}).catch(() => {}), q.evaluate(() => __cl('.v2dlg form [type=submit]'))]); await q.waitForTimeout(2000);
    const jo = await q.evaluate(() => ({c: localStorage.getItem('biens-code'), n: localStorage.getItem('biens-nom'), h: location.hash}));
    ok('lien d\'invitation : « Rejoindre un groupe », prénom, puis même groupe ; l\'adresse ne garde pas le code', jd === 'Rejoindre un groupe' && jo.c === code && jo.n === 'Claire' && jo.h === '', JSON.stringify({jd, n: jo.n, meme: jo.c === code, h: jo.h})); await c2.close();
    await p.evaluate(() => __tab('reglages')); await p.waitForTimeout(1200);
    const rc = await p.evaluate(() => { const h = [...document.querySelectorAll('#v2p-reglages h2')].find(h => /Remarques reçues/i.test(h.textContent)); return h ? h.parentNode.textContent : null; });
    await p.evaluate(() => __cl('#v2p-reglages [data-v2ret]')); await p.waitForTimeout(300); await p.fill('#v2rX', 'Essai de remarque'); await p.evaluate(() => __cl('.v2dlg form [type=submit]')); await p.waitForTimeout(800);
    ok('remarques : envoyées avec le prénom et l\'endroit de l\'app ; celles reçues s\'affichent dans Réglages', posts.length === 1 && posts[0].b.texte === 'Essai de remarque' && posts[0].b.prenom === 'Louis' && /onglet reglages/.test(posts[0].b.contexte) && posts[0].g === code && /Le loyer de Caen me semble haut/.test(rc || ''), JSON.stringify({posts: posts.map(x => x.b), rc: rc && rc.slice(0, 80)}));
    ok('groupe, invitation, mode d\'emploi, remarques · sans erreur', errs.length === 0, errs.join(' | '));
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
    ok('copropriété · quand le registre de la ville arrive, la rubrique se remplit (ou disparaît : annonce sans copropriété retrouvée)', !/Recherche de la copropriété/.test(r0.t) && (r0.t === '' || (/^Copropriété/.test(r0.t) && /Registre national d'immatriculation des copropriétés/.test(r0.t))), r0.t.slice(0, 200));
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
    await open(s2.sel); await p.waitForTimeout(800); await p.evaluate(() => __cl('#v2fiche [data-v2ft="quartier"]')); await p.waitForTimeout(400);
    const o1 = await p.evaluate(() => { const d = document.querySelector('#v2fiche details[data-sec="offre"]'); return d ? d.innerText : ''; });
    ok('résidences et chantiers · fiche d\'une annonce : résidences à 1 km et logements neufs à 500 m, avec la position utilisée', s2.n > 0 && /Résidences étudiantes à moins de 1 km/i.test(o1) && /Logements neufs autorisés depuis janvier \d{4}, à moins de 500 m/i.test(o1) && /Mesuré autour/.test(o1), o1.slice(0, 300));
    await open('c|' + s2.ck); await p.waitForTimeout(800); await p.evaluate(() => { const b = document.querySelector('#v2fiche [data-v2ft="quartier"]'); if (b) b.click(); }); await p.waitForTimeout(400);
    const o2 = await p.evaluate(() => { const d = document.querySelector('#v2fiche details[data-sec="offre"]'); return d ? d.innerText : ''; });
    ok('résidences et chantiers · fiche de la ville : places pour 100 étudiants, logements et studios autorisés par an', /pour 100 étudiants/.test(o2) && /par an, dont \d[\d  ]* studios/.test(o2), o2.slice(0, 300));
    const at2 = await p.evaluate(() => { CONCQ.zz = {maj: '2026-11-10', res: [], pc: [[0.2, 48, '2026-06', 2, '', '', 180, 150, 10, 180, 2, 0, 'SCCV T', '1 rue T']]}; return concAttn({ville: 'zz', id: 'x', adresse: '1 rue T', lat: 48.001, lon: 0.2}, null).map(z => z[1]).join(' | '); });
    ok('résidences et chantiers · point d\'attention : résidence étudiante neuve à moins de 500 m', /Résidence étudiante de 180 logements autorisée en juin 2026 à 110 m/.test(at2), at2);
    await p.evaluate(() => { __tab('carte'); }); await p.waitForTimeout(600);
    await p.evaluate(ck => { const c = C.find(v => v.k === ck), x = CONCQ[ck].res[0]; V2MAP().jumpTo({center: x ? [x[0], x[1]] : [c.lon, c.lat], zoom: 13.2}); }, s2.ck); await p.waitForTimeout(2500);
    const mp = await p.evaluate(() => ({n: V2MAPN.conc, d: V2MAP().getLayer('p-conc') ? V2MAP().queryRenderedFeatures({layers: ['p-conc']}).length : -1, leg: /résidence étudiante/.test(document.getElementById('v2mleg').textContent)}));
    ok('résidences et chantiers · carte : résidences et projets dessinés de près, avec leur légende', mp.n > 0 && mp.d > 0 && mp.leg, JSON.stringify(mp));
    ok('résidences et chantiers · sans erreur', errs.length === 0, errs.join(' | '));
    await c.close(); }
  // zone tendue, étudiants, revente, bruit : fiche de ville, fiche d'une annonce de Rennes, bien à son adresse près d'une voie rapide
  { const c = await b.newContext({viewport: {width: 1300, height: 850}}); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/cdnjs.cloudflare.com/**', r => r.abort()); await p.route(/apicarto/, r => r.abort()); await mlRoutes(p);
    await p.route(/overpass/, r => r.fulfill({contentType: 'application/json', body: JSON.stringify({elements: [{type: 'way', tags: {railway: 'rail', name: 'Ligne de Paris à Brest'}, geometry: [{lat: 48.1, lon: -1.7}, {lat: 48.2, lon: -1.6}]}]})}));
    await p.goto(URL); await p.waitForTimeout(2000); await p.click('.v2dlg button[type=submit]'); await p.waitForTimeout(500);
    const open = s => p.evaluate(s => { const bt = document.createElement('button'); bt.dataset.v2open = s; document.getElementById('v2mlist').appendChild(bt); bt.click(); bt.remove(); }, s);
    const txt = sel => p.evaluate(sel => [...document.querySelectorAll(sel)].map(d => d.innerText).join(' | '), sel);
    const tab = k => p.evaluate(k => { const b = document.querySelector(`#v2fiche [data-v2ft="${k}"]`); if (b) b.click(); }, k);
    await open('c|rennes'); await p.waitForTimeout(800);
    const all = async () => { let t = ''; for (const k of ['bien', 'prix', 'calc', 'quartier', 'achat']) { await tab(k); await p.waitForTimeout(150); t += await txt('#v2fiche .v2fb'); } return t; };
    const v1 = await all();
    ok('ville · zone tendue indiquée (Rennes), loyer plafonné à la relocation', /Zone tendue\s*oui/.test(v1) && /ne peut pas dépasser celui du précédent locataire/.test(v1), v1.match(/Zone tendue.{0,120}/s));
    await tab('quartier'); await p.waitForTimeout(200);
    ok('fiches allégées · rubrique ouverte : son résumé ne répète pas la première ligne', await p.evaluate(() => { const d = [...document.querySelectorAll('#v2fiche details.fsec[open]')]; return d.length > 3 && d.every(x => { const s = x.querySelector('summary .fss'); return !s || getComputedStyle(s).display === 'none'; }); }));
    ok('fiches allégées · ville : pas de « Quartier prioritaire non », une seule ligne de comparaison par référence de loyer, taux de taxe foncière expliqué', !/Quartier prioritaire\s*non/.test(v1) && !/Notre calcul/.test(v1) && /Notre loyer face à l'État/.test(v1) && /Notre loyer face aux annonces/.test(v1) && /Taux de taxe foncière/.test(v1) && !/Pourquoi ces chiffres/.test(v1), (v1.match(/Notre loyer.{0,120}/s) || [''])[0]);
    ok('ville · étudiants de la dernière rentrée et tendance depuis 2015', /80\s244/.test(v1) && /\+1,8 % par an/.test(v1) && /depuis 2015/.test(v1), v1.match(/Étudiants.{0,160}/s));
    const rv = await p.evaluate(() => { const k = C.map(c => c.k).find(k => { const s = liqStock(k); return s && s.ok; }), j = C.map(c => c.k).find(k => { const s = liqStock(k); return s && !s.ok; }); return {k, r: k ? liqRows(k).map(r => r.join(' ')).join(' | ') : '', nm: j ? liqRows(j).length : -1}; });
    ok('revente : stock d\'annonces en mois de ventes et rang ; pas de ligne « non mesuré » ni « durée » avant 20 annonces parties', /^Revente : stock d'annonces <b>[\d,]+ mois<\/b> de ventes/.test(rv.r) && /rang \d+ sur \d+ villes mesurées/.test(rv.r) && !/Durée de vente mesurée/.test(rv.r) && rv.nm === 0 && !/Revente : stock d'annonces\s*non mesuré/.test(v1), JSON.stringify(rv));
    ok('revente : non mesuré quand le plafond du relevé coupe le marché (studios de Nantes, plafond 120 000 €)', await p.evaluate(() => { const s = liqStock('nantes'), r = liqStock('rouen'); return !!(s && s.plaf && !s.ok && r && r.plaf && r.ok); }));
    const s3 = await p.evaluate(() => { const a = ADS.rennes.ventes.find(a => { const r = calcBien(Object.assign(venteBien('rennes', a), {kind: 'v', suf: a[3]})); return r.x.plaf === 'zt' && !horsCalcul(a[3]); }) || ADS.rennes.ventes[0]; return 'v|rennes|' + a[3]; });
    await open(s3); await p.waitForTimeout(800); const v2 = await all();
    ok('annonce en zone tendue · loyer gardé au départ du locataire (dit une fois), ou dernier loyer dans les documents à demander', (/Zone tendue : au départ du locataire/.test(v2) !== /zone tendue, le loyer ne peut pas augmenter/.test(v2)) || /Le dernier loyer, si le logement a été loué ces 18 derniers mois/.test(v2), v2.match(/(Zone tendue|zone tendue).{0,100}/s));
    ok('annonce · offre au prix affiché : mêmes chiffres que l\'en-tête (prix exact, pas arrondi à 500 €)', (() => { const h = v2.match(/Mensualité\s*([\d\u202f\u00a0 ]+) €/i), o = v2.match(/affiché\s+[−\d,]+\s*%\s+[−+]?[\d\u202f\u00a0 ]+ €\s+([\d\u202f\u00a0 ]+) €/); return !!h && !!o && h[1].replace(/\D/g, '') === o[1].replace(/\D/g, ''); })(), (v2.match(/Prix proposé.{0,200}/s) || [''])[0]);
    // annonce placée à 100 m près : bruit mesuré autour de sa position (Overpass simulé) ; annonce floue : aéroports seulement
    const s4 = await p.evaluate(() => { const a = ADS.rennes.ventes.find(a => { const f = ficx(a[3]); return f && f.r != null && f.r <= 100 && f.la != null; }); return a ? 'v|rennes|' + a[3] : null; });
    await open(s4); await p.waitForTimeout(1500); const v4 = await all();
    ok('annonce placée à 100 m près · bruit mesuré autour de sa position (voies de la ville, sans OpenStreetMap en direct), zones des aéroports', /Bruit/i.test(v4) && /autour de la position de l'annonce/.test(v4) && /Grand axe\s*à [\d ,]+ (m|km)/.test(v4) && /Voie ferrée/.test(v4) && /aéroport/i.test(v4) && !/mesure en cours/.test(v4), (v4.match(/Bruit.{0,300}/is) || [v4.slice(0, 200)])[0]);
    const s5 = await p.evaluate(() => { const a = ADS.rennes.ventes.find(a => { const f = ficx(a[3]); return f && (f.r == null || f.r > 100); }); return 'v|rennes|' + a[3]; });
    await open(s5); await p.waitForTimeout(800); const v5 = await all();
    const qk = await p.evaluate(() => { const t = IR.rennes.list.find(t => t.type === 'H' && t.price && bruitExpo(t) != null); return 'q|rennes|' + t.code; });
    await open(qk); await p.waitForTimeout(800); const vq = await all();
    ok('fiches allégées · quartier : campus nommés quand la ville en a plusieurs, rubrique « Le calcul » sans répéter l\'en-tête', /Université · \S/.test(vq) && !/BUDGET TOUT COMPRIS/i.test(vq.replace(/^[\s\S]*?Le calcul/, '')) && /Avant impôts : /.test(vq), (vq.match(/Université.{0,80}/s) || [''])[0]);
    ok('quartier · part de sa surface exposée au bruit, comparée à la ville', /Quartier exposé\s*\d+ % de sa surface exposée \(ville : \d+ %\)/.test(vq), (vq.match(/Quartier exposé.{0,120}/s) || [''])[0]);
    ok('annonce à position approchée · pas de distances au centre du quartier, aéroports seulement', /Bruit/i.test(v5) && !/Voie rapide/.test(v5) && /position de l'annonce est trop approximative/.test(v5) && /aéroport/i.test(v5), (v5.match(/Bruit.{0,300}/is) || [v5.slice(0, 200)])[0]);
    await p.evaluate(() => { BIENS.push({id: 'brA', ville: 'lemans', quartier: '', prix: 70000, surface: 22, pieces: 1, type: 'studio', titre: 'Essai bruit', adresse: '1 rue Essai Le Mans', lat: 48.0, lon: 0.2, geo: {bruit: [[90, 'N 138'], [400, 'Avenue X'], null]}}); });
    await open('b|brA'); await p.waitForTimeout(800); const v3 = await all();
    ok('bien à son adresse · bruit mesuré à l\'adresse et point d\'attention près d\'une voie rapide', /Distances mesurées à l'adresse/.test(v3) && /À 90 m d'une voie rapide \(N 138\)/.test(v3) && /plus de 1,5 km/.test(v3), v3.match(/(Bruit|voie rapide).{0,200}/s));
    const dz = await p.evaluate(() => { const mk = o => Object.assign({id: 'dz' + Math.random(), prix: 70000, surface: 22, pieces: 1, type: 'studio', titre: 'Essai documents'}, o);
      const K = b => docsList(b).flatMap(g => g[1].map(x => x[0])), z = K(mk({ville: 'rennes', dpe: 'F'})), l = K(mk({ville: 'lemans', dpe: 'C'})), g = checkFor(mk({ville: 'rennes', dpe: 'F'}));
      return {z, l, grille: g[g.length - 1][1].map(x => x[0]), titre: g[g.length - 1][0]}; });
    ok('documents à demander : copropriété (pièces de la loi ALUR, plan de travaux, DPE collectif), diagnostics, taxe foncière ; DPE F → audit ; zone tendue → dernier loyer ; mêmes cases que la grille de visite', ['copro', 'pv', 'charges', 'preetat', 'fonds', 'pppt', 'dpecol', 'diag', 'tfavis'].every(k => dz.z.includes(k) && dz.l.includes(k)) && dz.z.includes('dpefg') && !dz.l.includes('dpefg') && dz.z.includes('dernierloyer') && !dz.l.includes('dernierloyer') && dz.titre === 'Documents à obtenir' && JSON.stringify(dz.grille) === JSON.stringify(dz.z), JSON.stringify(dz));
    ok('fiche d\'une annonce · onglet L\'achat : documents à demander, et lien depuis « Le bien »', /Documents à demander/.test(v2) && /Pré-état daté/.test(v2) && /Documents à demander avant une offre \(\d+\)/.test(v2), (v2.match(/Documents à demander.{0,120}/s) || [''])[0]);
    ok('zone tendue, étudiants, revente, bruit · sans erreur', errs.length === 0, errs.join(' | '));
    await c.close(); }
  // l'interface : carte, fiche, annonces, villes, budget (ordinateur et téléphone)
  { const fs = require('fs'), URL2 = URL;
    for (const [dev, opt] of [['ordi', {viewport: {width: 1440, height: 900}}], ['tel', {...devices['iPhone 13']}]]) {
      const c = await b.newContext(opt); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());   // les routes ajoutées ensuite passent avant
      await mlRoutes(p);
      await p.goto(URL2); await p.waitForTimeout(2000);
      ok(`insula ${dev} · critères au premier lancement`, await p.evaluate(() => !!document.querySelector('.v2dlg') && +document.getElementById('v2cN').textContent > 0));
      await p.click('.v2dlg button[type=submit]'); await p.waitForTimeout(1200);
      ok(`insula ${dev} · carte de l'Ouest et ses 22 villes`, await p.evaluate(() => !!(window.V2MAP && V2MAP()) && V2MAPN.villes === C.length && document.querySelectorAll('#v2mlist [data-v2city]').length === C.length && C.length === 22));
      ok(`insula ${dev} · carte : toutes les couches acceptées (quartiers, annonces, villes, immeubles 3D)`, await p.evaluate(() => { const M = V2MAP(); return ['q-fill', 'q-line', 'q-lab', 'a-dot', 'a-hole', 'a-zone', 'a-clu', 'a-clu-n', 'a-sdot', 'a-shole', 'v-dot', 'v-lab', 'b3d', 'p-rail', 'p-rail2', 'p-rfn', 'p-rfn2', 'p-lig', 'p-dot'].every(l => M.getLayer(l)) && V2MAPN.err.length === 0; }), await p.evaluate(() => V2MAPN.err.join(' | ')));
      ok(`insula ${dev} · carte de l'Ouest : les grandes lignes de train sont dessinées (grande vitesse et 140 km/h et plus)`, await p.evaluate(() => { const M = V2MAP(); return M.getZoom() < 8 && M.queryRenderedFeatures({layers: ['p-rfn2']}).length > 0 && M.queryRenderedFeatures({layers: ['p-rfn']}).length > 0; }));
      ok(`insula ${dev} · liste de l'Ouest : le temps de train vers Paris de chaque ville`, await p.evaluate(() => { const R = [...document.querySelectorAll('#v2mlist [data-v2city]')].slice(0, 5).map(r => r.querySelector('.v2rs')); return R.length === 5 && R.every(e => e && /Paris (\d+ h|\d+ min)/.test(e.textContent)); }), await p.evaluate(() => [...document.querySelectorAll('#v2mlist [data-v2city]')].slice(0, 3).map(r => (r.querySelector('.v2rs') || {}).textContent).join(' | ')));
      ok(`insula ${dev} · carte de l'Ouest à plat, sans quartiers ni annonces de loin`, await p.evaluate(() => { const M = V2MAP(); return M.getPitch() === 0 && M.queryRenderedFeatures({layers: ['v-dot']}).length > 10 && !M.queryRenderedFeatures({layers: ['a-dot']}).length; }));
      // zoomer suffit : quartiers et annonces apparaissent, la carte s'incline, la liste passe à la ville au centre
      const rendu = () => p.evaluate(() => { const M = V2MAP(); return {q: M.queryRenderedFeatures({layers: ['q-fill']}).length, a: M.queryRenderedFeatures({layers: ['a-dot']}).length, v: M.queryRenderedFeatures({layers: ['v-dot']}).length, pitch: Math.round(M.getPitch()), liste: document.querySelector('#v2mlist .v2mhead').innerText}; });
      await p.evaluate(() => V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 11.2})); await p.waitForTimeout(1800);
      const zin = await rendu();
      ok(`insula ${dev} · zoom sur Le Mans : quartiers et annonces dessinés sans clic`, zin.q > 10 && zin.a > 0 && zin.v === 0, JSON.stringify(zin));
      ok(`insula ${dev} · zoom sur Le Mans : la carte s'incline et la liste suit la ville`, zin.pitch >= 30 && /Le Mans/.test(zin.liste), JSON.stringify(zin));
      await p.evaluate(() => V2MAP().jumpTo({zoom: 14.2})); await p.waitForTimeout(1500);
      ok(`insula ${dev} · de près : plus inclinée (immeubles en 3D)`, await p.evaluate(() => V2MAP().getPitch() > 40 && V2MAP().getLayer('b3d').minzoom === 13));
      await p.evaluate(() => V2MAP().jumpTo({zoom: 7})); await p.waitForTimeout(1500);
      const zout = await rendu();
      ok(`insula ${dev} · dézoom : l'Ouest revient à plat, avec ses villes`, zout.pitch === 0 && zout.a === 0 && zout.v > (dev === 'tel' ? 4 : 10) && /L'Ouest/.test(zout.liste) && !/Le Mans/.test(zout.liste), JSON.stringify(zout));
      await p.evaluate(() => __cl('#v2mlist [data-v2city="lemans"]')); await p.waitForTimeout(1800);
      ok(`insula ${dev} · Le Mans : quartiers et annonces`, await p.evaluate(() => V2MAPN.quartiers > 20 && V2MAPN.annonces > 0 && document.querySelectorAll('#v2mlist [data-v2open]').length > 0));
      if (dev === 'tel') {   // la liste s'ouvre basse, sa poignée l'agrandit puis la réduit ; la fiche de la ville s'ouvre depuis l'en-tête
        const hs = () => p.evaluate(() => Math.round(document.getElementById('v2mlist').offsetHeight / document.getElementById('v2map').offsetHeight * 100));
        const h0 = await hs(); await p.tap('#v2mlist [data-v2grip]'); await p.waitForTimeout(500); const h1 = await hs(); await p.tap('#v2mlist [data-v2grip]'); await p.waitForTimeout(500); const h2 = await hs();
        ok('insula tel · liste à mi-hauteur à l\'ouverture (52 %), poignée pour l\'agrandir et la réduire', h0 >= 48 && h0 <= 56 && h1 >= 75 && h2 === h0, JSON.stringify({h0, h1, h2}));
        ok('insula tel · liste basse d\'une ville : deux annonces entières, cash-flow compris', await p.evaluate(() => { const L = document.getElementById('v2mlist').getBoundingClientRect(), R = document.querySelectorAll('#v2mlist .v2row'), r = R[0], c = r && r.querySelector('.v2cfl');
          return !!c && R.length >= 2 && R[1].getBoundingClientRect().bottom <= L.bottom + 1 && c.scrollWidth <= c.clientWidth + 1; }), await p.evaluate(() => { const L = document.getElementById('v2mlist').getBoundingClientRect(), r = document.querySelector('#v2mlist .v2row'), c = r && r.querySelector('.v2cfl');
          return JSON.stringify({liste: [Math.round(L.top), Math.round(L.bottom)], ligne: r && [Math.round(r.getBoundingClientRect().top), Math.round(r.getBoundingClientRect().bottom)], cf: c && [c.scrollWidth, c.clientWidth], vue: [innerWidth, innerHeight], tete: Math.round(document.querySelector('#v2mlist .v2mhead').getBoundingClientRect().height)}); }));
        { // fiche en demi-écran : chiffres sur une ligne, onglets visibles ; annonce suivante (glisser, bouton), partager, lien direct
          await p.evaluate(() => __cl('#v2mlist [data-v2open^="v|"]')); await p.waitForTimeout(900);
          const hf = await p.evaluate(() => { const f = document.getElementById('v2fiche'), t = f.querySelector('.v2tabs2'), k = f.querySelector('.v2kl'); return {half: f.dataset.half, onglets: Math.round(t.getBoundingClientRect().top), vue: innerHeight, kl: !!k && getComputedStyle(k).display !== 'none' && k.getBoundingClientRect().height < 50, cases: getComputedStyle(f.querySelector('.v2kp')).display}; });
          ok('insula tel · fiche en demi-écran : chiffres sur une ligne, onglets visibles sans faire défiler', hf.half === '1' && hf.kl && hf.cases === 'none' && hf.onglets < hf.vue - 100, JSON.stringify(hf));
          const tit = () => p.evaluate(() => document.querySelector('#v2fiche .v2fh b').innerText);
          const t0 = await tit(), cdp = await c.newCDPSession(p), y = await p.evaluate(() => Math.round(Math.min(document.querySelector('#v2fiche .v2tabs2').getBoundingClientRect().bottom + 40, innerHeight - 20)));
          const sw = async (x0, x1) => { await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x0, y}]}); for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x0 + (x1 - x0) * i / 6, y}]}); await p.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []}); await p.waitForTimeout(700); };
          await sw(300, 110); const t1 = await tit(), half1 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half); await sw(90, 300); const t2 = await tit();
          ok('insula tel · glisser vers la gauche : annonce suivante de la liste, sans fermer la fiche ; vers la droite : retour', t1 !== t0 && t2 === t0 && half1 === '1', JSON.stringify([t0, t1, t2, half1]));
          await p.tap('#v2fiche [data-v2nav="1"]'); await p.waitForTimeout(700); const t3 = await tit();
          await p.evaluate(() => { Object.defineProperty(navigator, 'share', {configurable: true, value: d => { window.__sh = d; return Promise.resolve(); }}); }); await p.tap('#v2fiche [data-v2lien]'); await p.waitForTimeout(300);
          const sh = await p.evaluate(() => window.__sh || null);
          ok('insula tel · bouton suivant, puis partager : feuille de partage du téléphone, texte et lien de la fiche', t3 === t1 && !!sh && /#f=v%7C/.test(sh.url) && /sur 15 ans/.test(sh.text), JSON.stringify(sh));
          const p2 = await c.newPage(); await p2.route('**/cdnjs.cloudflare.com/**', r => r.abort()); await mlRoutes(p2); await p2.goto(URL + sh.url.slice(sh.url.indexOf('#'))); await p2.waitForTimeout(3500);
          const o2 = await p2.evaluate(() => ({t: (document.querySelector('#v2fiche:not([hidden]) .v2fh b') || {}).innerText || null, h: location.hash}));
          ok('insula · lien partagé : la fiche s\'ouvre directement, l\'adresse redevient celle de l\'app', o2.t === t3 && o2.h === '', JSON.stringify(o2)); await p2.close();
          await p.evaluate(() => __cl('#v2fiche [data-v2close]')); await p.waitForTimeout(500);
          const lg = await p.evaluate(() => { const r = document.getElementById('v2mleg').getBoundingClientRect(), q = document.querySelector('#v2mleg .v2mlq>span'); return {w: Math.round(r.width), h: Math.round(r.height), mot: q ? getComputedStyle(q).display : null, icone: !!document.querySelector('#v2mleg .v2mlqi')}; });
          ok('insula tel · légende de la carte : une pastille (icône et menu), sans le mot « Quartiers »', lg.mot === 'none' && lg.icone && lg.w <= 200 && lg.h <= 48, JSON.stringify(lg)); }
        { // bouton ou geste « retour » : visionneuse, puis fiche, puis onglet ; fermer par l'app retire l'étape
          const back = async () => { await p.evaluate(() => { if (history.state && history.state.v2bk) history.back(); }); await p.waitForTimeout(600); };
          const st = () => p.evaluate(() => ({lb: !!document.querySelector('.v2lb'), fiche: !document.getElementById('v2fiche').hidden, tab: document.querySelector('#v2tabbar [aria-current="page"]').dataset.v2tab, view: document.getElementById('v2app').dataset.view, h: history.state && history.state.v2bk || 0}));
          await p.evaluate(() => __cl('#v2mlist [data-v2open^="v|"]')); await p.waitForTimeout(800);
          const s0 = await st(); await p.evaluate(() => { const b = document.querySelector('#v2fiche .v2fthb'); if (b) b.click(); }); await p.waitForTimeout(600); const s1 = await st();
          await back(); const s2 = await st(); await back(); const s3 = await st();
          await p.evaluate(() => __tab('annonces')); await p.waitForTimeout(600); await back(); const s4 = await st();
          ok('insula tel · retour : ferme la visionneuse, puis la fiche, puis revient à la carte', s0.fiche && (!s1.lb || (!s2.lb && s2.fiche)) && !s3.fiche && s4.tab === 'explorer' && s4.view === 'carte', JSON.stringify({s0, s1, s2, s3, s4}));
          await p.evaluate(() => __cl('#v2mlist [data-v2open^="v|"]')); await p.waitForTimeout(800); const h1 = (await st()).h;
          await p.evaluate(() => (document.querySelector('[data-v2close]') || {click() {}}).click()); await p.waitForTimeout(600); const s5 = await st();
          ok('insula tel · retour : une fiche fermée par son bouton ne laisse pas d\'étape en trop', h1 > 0 && !s5.fiche && s5.h < h1, JSON.stringify({h1, s5}));
          await p.evaluate(() => { __cl('#v3scope [data-v2city=""]'); __cl('[data-v3obj="villes"]'); }); await p.waitForTimeout(1200);   // la carte revient sur Le Mans pour la suite
          await p.evaluate(() => __cl('#v2mlist [data-v2city="lemans"]')); await p.waitForTimeout(1800); }
        { // fiche en demi-écran sur la carte : l'annonce reste visible au-dessus ; la poignée l'agrandit puis la réduit
          await p.evaluate(() => __cl('#v2mlist [data-v2open^="v|"]')); await p.waitForTimeout(1600);
          const f1 = await p.evaluate(() => { const F = document.getElementById('v2fiche'), M = V2MAP(), t = F.getBoundingClientRect().top, y = M.project(M.getCenter()).y + M.getContainer().getBoundingClientRect().top; return {half: F.dataset.half, t: Math.round(t / innerHeight * 100), y: Math.round(y), top: Math.round(t)}; });
          await p.tap('#v2fiche [data-v2fgrip]'); await p.waitForTimeout(500); const f2 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half);
          await p.tap('#v2fiche [data-v2fgrip]'); await p.waitForTimeout(500); const f3 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half);
          ok('insula tel · fiche en demi-écran sur la carte, annonce visible au-dessus, poignée pour l\'agrandir et la réduire', f1.half === '1' && f1.t >= 35 && f1.t <= 55 && f1.y < f1.top && f2 === '0' && f3 === '1', JSON.stringify({f1, f2, f3}));
          ok('insula tel · fiche ouverte : un seul panneau en bas (la liste est masquée), bouton « Fermer »', await p.evaluate(() => getComputedStyle(document.getElementById('v2mlist')).display === 'none' && document.querySelector('#v2fiche [data-v2close]').textContent.trim() === 'Fermer'));
          const tire = dy => p.evaluate(dy => { const h = document.querySelector('#v2fiche .v2fhg'), r = h.getBoundingClientRect(), o = {bubbles: true, clientX: r.left + 160, clientY: r.top + 10, pointerId: 1};
            h.dispatchEvent(new PointerEvent('pointerdown', o)); document.dispatchEvent(new PointerEvent('pointermove', Object.assign({}, o, {clientY: r.top + 10 + dy}))); document.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, {clientY: r.top + 10 + dy}))); }, dy);
          await tire(-120); await p.waitForTimeout(400); const g1 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half);
          await tire(120); await p.waitForTimeout(400); const g2 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half);
          await tire(120); await p.waitForTimeout(600); const g3 = await p.evaluate(() => ({fiche: !document.getElementById('v2fiche').hidden, liste: getComputedStyle(document.getElementById('v2mlist')).display}));
          ok('insula tel · fiche : tirée vers le haut elle s\'agrandit, vers le bas elle se réduit puis se ferme, et la liste revient', g1 === '0' && g2 === '1' && !g3.fiche && g3.liste !== 'none', JSON.stringify({g1, g2, g3}));
          if (await p.evaluate(() => !document.getElementById('v2fiche').hidden)) await p.evaluate(() => (document.querySelector('[data-v2close]') || {click() {}}).click()); await p.waitForTimeout(400);
          await p.evaluate(() => __cl('#v3scope [data-v2city=""]')); await p.waitForTimeout(1200);
          await p.evaluate(() => __cl('#v2mlist [data-v2city="lemans"]')); await p.waitForTimeout(1800); }
        await p.tap('#v3scope [data-v2cfiche="lemans"]'); await p.waitForTimeout(800);
        ok('insula tel · fiche de la ville depuis la barre du périmètre', await p.evaluate(() => !document.getElementById('v2fiche').hidden && /Le Mans/.test(document.querySelector('#v2fiche .v2ft').textContent)));
        await p.evaluate(() => (document.querySelector('[data-v2close]') || {click() {}}).click()); await p.waitForTimeout(400);
      }
      ok(`insula ${dev} · Le Mans : les points des annonces sont dessinés`, await p.evaluate(() => V2MAP().queryRenderedFeatures({layers: ['a-dot']}).length > 0 && V2MAP().getZoom() >= 10));
      ok(`insula ${dev} · carte : positions exactes en points pleins, approchées en points creux`, await p.evaluate(() => { const M = V2MAP(), F = M.getSource('annonces')._data.features; return F.some(f => f.properties.ap) && F.some(f => !f.properties.ap) && M.queryRenderedFeatures({layers: ['a-hole']}).length > 0 && M.queryRenderedFeatures({layers: ['a-hole']}).length < M.queryRenderedFeatures({layers: ['a-dot']}).length; }));
      ok(`insula ${dev} · carte : noms des quartiers prêts`, await p.evaluate(() => V2MAPN.qnoms > 500));
      if (dev === 'ordi') {   // la bulle du survol ne bloque pas la carte : survoler un quartier puis zoomer à la molette sans bouger la souris
        const pt = await p.evaluate(() => { const M = V2MAP(), cv = M.getCanvas().getBoundingClientRect(); for (let y = 200; y < cv.height - 100; y += 25) for (let x = 450; x < cv.width - 80; x += 25) { if (M.queryRenderedFeatures([x, y], {layers: ['q-fill']}).length && !M.queryRenderedFeatures([[x - 8, y - 8], [x + 8, y + 8]], {layers: ['a-dot']}).length) return {x: cv.left + x, y: cv.top + y}; } return null; });
        await p.mouse.move(pt.x - 3, pt.y - 3); await p.mouse.move(pt.x, pt.y); await p.waitForTimeout(300);
        const bulle = await p.evaluate(() => { const b = document.querySelector('.v2pop'); return b ? getComputedStyle(b.querySelector('.maplibregl-popup-content')).pointerEvents : null; });
        const z0 = await p.evaluate(() => V2MAP().getZoom());
        for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(60); } await p.waitForTimeout(1500);
        for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(60); } await p.waitForTimeout(1500);
        const z1 = await p.evaluate(() => V2MAP().getZoom());
        ok(`insula ${dev} · carte : la bulle du survol ne bloque ni la molette ni les clics`, bulle === 'none' && z1 > z0 + 1, JSON.stringify({bulle, z0, z1}));
        // glisser la carte pendant l'inclinaison automatique : le point saisi reste sous le curseur (avant : le geste était annulé, la carte semblait bloquée)
        await p.evaluate(() => V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 9.2, pitch: 0, bearing: 0})); await p.waitForTimeout(1500);
        await p.mouse.move(900, 450); for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, -120); await p.waitForTimeout(40); }
        await p.evaluate(() => new Promise(r => { const t = setTimeout(r, 2500); V2MAP().once('moveend', () => { clearTimeout(t); r(); }); })); await p.waitForTimeout(450);
        const pi0 = await p.evaluate(() => V2MAP().getPitch()), ll = await p.evaluate(() => { const q = V2MAP().unproject([900, 450]); return [q.lng, q.lat]; });
        await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(900 - 25 * i, 450 + 8 * i); await p.waitForTimeout(25); } await p.waitForTimeout(40);
        const sous = await p.evaluate(ll => { const q = V2MAP().project(ll); return [q.x, q.y]; }, ll); await p.mouse.up(); await p.waitForTimeout(1600);
        const pi1 = await p.evaluate(() => V2MAP().getPitch());
        ok('insula ordi · carte : glisser pendant l\'inclinaison automatique suit la souris', pi0 > 2 && pi0 < 40 && Math.hypot(sous[0] - 600, sous[1] - 546) < 30 && pi1 > 40, JSON.stringify({pi0, sous, pi1}));
        await p.evaluate(() => document.querySelector('#v2mlist [data-v2city="lemans"]') || V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 11.3}));
        // zoom au bouton : il pivote autour du centre de la partie visible (pas sous la liste) ; avant, la ville glissait vers la droite
        await p.evaluate(() => V2MAP().jumpTo({center: [-1.6795, 48.111], zoom: 11.5, pitch: 0, bearing: 0})); await p.waitForTimeout(600);
        for (let i = 0; i < 2; i++) { await p.click('.maplibregl-ctrl-zoom-in'); await p.waitForTimeout(900); } await p.waitForTimeout(900);
        ok('insula ordi · carte : le zoom au bouton reste centré sur la partie visible', await p.evaluate(() => { const M = V2MAP(), q = M.project([-1.6795, 48.111]), cv = M.getCanvas().getBoundingClientRect(), L = document.getElementById('v2mlist').getBoundingClientRect(); return M.getZoom() > 12.8 && Math.abs(q.x - ((L.right - cv.left) + cv.width) / 2) < 4; }), await p.evaluate(() => JSON.stringify({z: V2MAP().getZoom(), pad: V2MAP().getPadding()})));
        // plusieurs annonces au même endroit : une pastille avec leur nombre, et la liste au clic
        const grp = await p.evaluate(() => { const F = V2MAP().getSource('annonces')._data.features, G = {}; F.forEach(f => { const k = f.geometry.coordinates.map(v => v.toFixed(5)).join(','); (G[k] = G[k] || []).push(f); }); const g = Object.values(G).sort((a, b) => b.length - a.length)[0]; return {n: g.length, ll: g[0].geometry.coordinates}; });
        await p.evaluate(ll => V2MAP().jumpTo({center: ll, zoom: 16.5, pitch: 0}), grp.ll); await p.waitForTimeout(1800);
        const gpt = await p.evaluate(ll => { const M = V2MAP(), q = M.project(ll), r = M.getCanvas().getBoundingClientRect(); return [q.x + r.left, q.y + r.top]; }, grp.ll);
        ok('insula ordi · carte : annonces au même endroit regroupées, avec leur nombre', grp.n >= 2 && await p.evaluate(n => V2MAP().queryRenderedFeatures({layers: ['a-clu']}).some(f => f.properties.point_count === n), grp.n), JSON.stringify(grp));
        await p.mouse.click(gpt[0], gpt[1]); await p.waitForTimeout(900);
        ok('insula ordi · carte : clic sur le groupe, la liste de ses annonces', await p.evaluate(n => document.querySelectorAll('.v2gpop [data-v2open]').length === Math.min(n, 12), grp.n));
        await p.click('.v2gpop [data-v2open]'); await p.waitForTimeout(1800);
        ok('insula ordi · carte : une annonce du groupe s\'ouvre, et reste visible hors du groupe', await p.evaluate(() => !document.getElementById('v2fiche').hidden && !document.querySelector('.v2gpop') && V2MAP().queryRenderedFeatures({layers: ['a-sdot']}).length === 1));
        await p.evaluate(() => { const b = document.querySelector('[data-v2close]'); if (b) b.click(); }); await p.waitForTimeout(400);
        // la fiche d'une ville suit la ville au centre
        await p.evaluate(() => { const r = document.querySelector('#v3scope [data-v2city=""]'); if (r) r.click(); }); await p.waitForTimeout(1500);
        await p.evaluate(() => __cl('#v2mlist [data-v2city="angers"]')); await p.waitForTimeout(2500);
        await p.evaluate(() => __cl('#v3scope [data-v2cfiche="angers"]')); await p.waitForTimeout(800);
        await p.evaluate(() => V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 12})); await p.waitForTimeout(2000);
        ok('insula ordi · carte : la fiche d\'une ville suit la ville au centre', await p.evaluate(() => /Le Mans/.test((document.querySelector('#v2fiche .v2ft') || {}).textContent || '')));
        await p.evaluate(() => { const b = document.querySelector('[data-v2close]'); if (b) b.click(); }); await p.waitForTimeout(400);
        await p.evaluate(() => V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 11.3})); await p.waitForTimeout(1200);
        // couleur des quartiers au choix : prix au m² en bleu, avec son échelle ; retour au rendement
        await p.evaluate(() => V2MAP().jumpTo({center: [0.1966, 48.0061], zoom: 11.3})); await p.waitForTimeout(1200);
        ok('insula ordi · carte : lignes de bus et tram des réseaux (fichier à part), dessinées en ville', await p.evaluate(() => V2MAPN.lignes > 500 && V2MAP().queryRenderedFeatures({layers: ['p-lig']}).length > 5 && /Tram|Bus/.test(V2MAP().queryRenderedFeatures({layers: ['p-lig']})[0].properties.t)), await p.evaluate(() => V2MAPN.lignes));
        await p.selectOption('[data-v2qm]', 'prix'); await p.waitForTimeout(800);
        ok('insula ordi · carte : quartiers colorés par le prix au m², échelle dans la légende', await p.evaluate(() => { const F = V2MAP().getSource('quartiers')._data.features, blues = ['#e3e9f1', '#bccbdd', '#8ea6c3', '#5c7ea6', '#2c4766']; return document.querySelector('[data-v2qm]').value === 'prix' && JSON.parse(localStorage.getItem('v3s')).qm === 'prix' && F.filter(f => blues.includes(f.properties.c)).length > 500 && new Set(F.map(f => f.properties.c)).size >= 5 && /€\/m²/.test(document.getElementById('v2mleg').textContent) && F.some(f => /\d €\/m²/.test(f.properties.t)); }), await p.evaluate(() => document.getElementById('v2mleg').textContent));
        await p.selectOption('[data-v2qm]', 'bruit'); await p.waitForTimeout(800);
        ok('insula ordi · carte : vue « Bruit », quartiers colorés par leur part exposée', await p.evaluate(() => { const F = V2MAP().getSource('quartiers')._data.features, blues = ['#e3e9f1', '#bccbdd', '#8ea6c3', '#5c7ea6', '#2c4766']; return F.filter(f => blues.includes(f.properties.c)).length > 500 && new Set(F.map(f => f.properties.c)).size >= 4 && /exposé au bruit/.test(document.getElementById('v2mleg').textContent) && F.some(f => /\d+ % exposé au bruit/.test(f.properties.t)); }), await p.evaluate(() => document.getElementById('v2mleg').textContent));
        await p.selectOption('[data-v2qm]', 'irr'); await p.waitForTimeout(800);
        ok('insula ordi · carte : retour au rendement', await p.evaluate(() => JSON.parse(localStorage.getItem('v3s')).qm === 'irr' && !V2MAP().getSource('quartiers')._data.features.some(f => f.properties.c === '#8ea6c3')));
      }
      await p.evaluate(() => __cl('#v2mlist [data-v2open]')); await p.waitForTimeout(800);
      ok(`insula ${dev} · fiche : où le bien est placé sur la carte`, await p.evaluate(() => /^Sur la carte : /.test(((document.querySelector('#v2fiche .v2pos') || {}).textContent || '').trim())));
      if (dev === 'ordi') {
        const ka = await p.evaluate(() => { const A = new Set(V2MAP().getSource('annonces')._data.features.filter(f => f.properties.ap).map(f => f.properties.k)); const r = [...document.querySelectorAll('#v2mlist [data-v2open]')].find(e => A.has(e.dataset.v2open)); if (r) r.click(); return r ? r.dataset.v2open : null; });
        await p.waitForTimeout(2600);
        ok('insula ordi · annonce à position approchée : zone dessinée, fiche qui le dit', !!ka && await p.evaluate(() => V2MAP().queryRenderedFeatures({layers: ['a-zone']}).length === 1 && /position approchée/.test(document.querySelector('#v2fiche .v2pos').textContent)), String(ka));
        await p.evaluate(() => __cl('#v2mlist [data-v2open]')); await p.waitForTimeout(800);
      }
      ok(`insula ${dev} · fiche en onglets avec la fourchette`, await p.evaluate(() => !document.getElementById('v2fiche').hidden && document.querySelectorAll('#v2fiche .v2tabs2 [data-v2ft]').length === 5 && /prudent .* favorable/.test(document.getElementById('v2fiche').textContent)));
      // photos en grand : la photo de la fiche ouvre toutes les photos (pas de seconde bande de photos dans la fiche)
      if (await p.$('#v2fiche .v2fthb')) {
        await p.click('#v2fiche .v2fthb'); await p.waitForTimeout(500);
        const lb = () => p.evaluate(() => { const e = document.querySelector('.v2lb'); return e ? e.querySelector('.v2lbc').textContent : null; });
        const c0 = await lb(); const n = c0 ? +c0.split('/')[1] : 0;
        if (dev === 'ordi') { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300); }
        const c1 = await lb();
        ok(`insula ${dev} · photos : la photo de la fiche ouvre la visionneuse, toutes les photos`, !!c0 && /^1 \//.test(c0) && n >= 1 && (dev !== 'ordi' || n < 2 || /^2 \//.test(c1)) && await p.evaluate(() => { const g = document.querySelector('#v2fiche .fgal'); return !g || getComputedStyle(g).display === 'none'; }), JSON.stringify({c0, c1}));
        if (dev === 'ordi') await p.keyboard.press('Escape'); else await p.tap('.v2lb .v2lbx');
        await p.waitForTimeout(300);
        ok(`insula ${dev} · photos : fermer la visionneuse laisse la fiche ouverte`, await p.evaluate(() => !document.querySelector('.v2lb') && !document.getElementById('v2fiche').hidden));
      }
      // ordinateur (et fiche plein écran) : les onglets visibles dès l'ouverture ; téléphone sur la carte (fiche en demi-écran) : le résumé d'abord, les onglets collés en haut dès qu'on fait défiler
      ok(`insula ${dev} · fiche : les onglets visibles dès l'ouverture, ou collés en haut de la fiche en demi-écran`, await p.evaluate(async () => { const f = document.getElementById('v2fiche'), t = () => f.querySelector('.v2tabs2').getBoundingClientRect(), B = f.getBoundingClientRect();
        if (f.dataset.half !== '1') return t().bottom < B.bottom - 40;
        f.scrollTop = 600; await new Promise(r => setTimeout(r, 150)); const T = t(); f.scrollTop = 0; return T.top >= B.top - 1 && T.bottom < B.top + 140; }));
      ok(`insula ${dev} · fiche : le DPE une seule fois dans l'en-tête`, await p.evaluate(() => { const h = document.querySelector('#v2fiche .v2fb'), t = h.querySelector('.v2tabs2'); let n = 0, e = h.firstElementChild; while (e && e !== t) { n += (e.innerText.match(/DPE [A-G]/g) || []).length; e = e.nextElementSibling; } return n <= 1; }));
      await p.evaluate(() => { __cl('#v2fiche [data-v2ft="quartier"]'); }); await p.waitForTimeout(300);
      await p.evaluate(() => { document.getElementById('v2fiche').scrollTop = 1500; });
      await p.evaluate(() => __cl('#v2fiche [data-v2ft="achat"]')); await p.waitForTimeout(300);
      ok(`insula ${dev} · fiche : changer d'onglet ramène au début`, await p.evaluate(() => { const f = document.getElementById('v2fiche'), t = f.querySelector('.v2tabs2'), c = t.nextElementSibling; return Math.abs(c.getBoundingClientRect().top - t.getBoundingClientRect().bottom) < 30; }));
      ok(`insula ${dev} · fiche : le tableau des offres tient dans le panneau`, await p.evaluate(() => { const t = document.querySelector('#v2fiche .v2offx.v2tw'); return t && t.scrollWidth <= t.clientWidth + 1; }));
      const r0 = await p.evaluate(() => document.querySelector('#v2fiche .v2sec .v2k b').textContent);
      await p.evaluate(() => { const s = document.getElementById('v2off'); s.value = '88'; s.dispatchEvent(new Event('input', {bubbles: true})); }); await p.waitForTimeout(300);
      ok(`insula ${dev} · offre plus basse : rendement recalculé`, await p.evaluate(r0 => { const b = document.querySelector('#v2fiche .v2sec .v2k b').textContent; return b !== r0 && parseFloat(b.replace(',', '.').replace('−', '-')) > parseFloat(r0.replace(',', '.').replace('−', '-')); }, r0));
      await p.evaluate(() => (document.querySelector('[data-v2close]') || {click() {}}).click());
      await p.evaluate(() => __tab('annonces')); await p.waitForTimeout(500);
      const n0 = await p.evaluate(() => document.querySelectorAll('#v3liste [data-v2open]').length);
      await p.evaluate(() => document.querySelectorAll('#v3liste [data-v2open]')[2].click()); await p.waitForTimeout(500);
      ok(`insula ${dev} · ouvrir une annonce ne filtre pas le tableau`, n0 > 2 && await p.evaluate(n0 => document.querySelectorAll('#v3liste [data-v2open]').length === n0 && !document.getElementById('v2fiche').hidden, n0));
      // une annonce ouverte depuis l'onglet Annonces : en revenant sur la carte, celle-ci s'ouvre sur l'annonce
      { const tgt = await p.evaluate(() => { for (const e of document.querySelectorAll('#v3liste [data-v2open]')) { const s = e.getAttribute('data-v2open'); if (!s.startsWith('v|')) continue;
          const f = FICX[adId(s.split('|').slice(2).join('|'))]; if (f && f.la != null && f.lo != null && f.r != null && f.r <= 300) { e.click(); return {la: +f.la, lo: +f.lo, r: f.r}; } } return null; });
        await p.waitForTimeout(500); await p.evaluate(() => __tab('carte')); await p.waitForTimeout(1500);
        const at = tgt && await p.evaluate(t => { const M = V2MAP(), c = M.getCenter(); return {d: Math.round(Math.hypot((c.lat - t.la) * 111000, (c.lng - t.lo) * 111000 * Math.cos(t.la * Math.PI / 180))), z: +M.getZoom().toFixed(2), fiche: !document.getElementById('v2fiche').hidden}; }, tgt);
        ok(`insula ${dev} · annonce ouverte depuis l'onglet Annonces : la carte s'ouvre sur elle, fiche ouverte`, !!at && at.d < 60 && at.z >= 13.8 && at.fiche, JSON.stringify({tgt, at}));
        await p.evaluate(() => __tab('annonces')); await p.waitForTimeout(500); }
      if (dev === 'tel') {   // fiche : les cinq onglets visibles ; Annonces : cash-flow sur sa ligne, tri ; Nos biens en lignes
        if (await p.evaluate(() => document.getElementById('v2fiche').hidden)) { await p.evaluate(() => __cl('#v3liste [data-v2open^="v|"]')); await p.waitForTimeout(600); }   // revenir à l'Ouest ferme la fiche
        ok('insula tel · fiche : les cinq onglets tiennent sur l\'écran, libellés courts', await p.evaluate(() => { const B = [...document.querySelectorAll('#v2fiche .v2tabs2 [data-v2ft]')], W = document.getElementById('v2fiche').clientWidth;
          return B.length === 5 && B.every(b => b.getBoundingClientRect().right <= W + 1 && b.scrollWidth <= b.clientWidth + 1) && B.map(b => b.textContent).join() === 'Essentiel,Prix,Calcul,Quartier,Achat'; }), await p.evaluate(() => [...document.querySelectorAll('#v2fiche .v2tabs2 [data-v2ft]')].map(b => b.textContent + ':' + Math.round(b.getBoundingClientRect().right)).join(' ')));
        ok('insula tel · Annonces : le cash-flow a sa ligne, entière', await p.evaluate(() => { const C = [...document.querySelectorAll('#v3liste .v2row .v2cfl')]; return C.length > 2 && C.every(c => c.scrollWidth <= c.clientWidth + 1); }));
        const prix = () => p.evaluate(() => [...document.querySelectorAll('#v3liste .v2row > b')].slice(0, 6).map(b => parseFloat(b.textContent.replace(',', '.'))));
        await p.evaluate(() => { const s = document.querySelector('#v3liste [data-v2sortm]'); s.value = 'p|1'; s.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(500);
        const pr = await prix(); ok('insula tel · Annonces : tri par prix, le moins cher d\'abord', pr.length > 3 && pr.every((v, i) => !i || v >= pr[i - 1]), pr.join());
        await p.evaluate(() => { const s = document.querySelector('#v3liste [data-v2sortm]'); s.value = 'irr|-1'; s.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(400);
        await p.evaluate(() => __tab('biens')); await p.waitForTimeout(500);
        ok('insula tel · Nos biens : des lignes, pas un tableau', await p.evaluate(() => !document.querySelector('#v2p-biens table') && document.querySelectorAll('#v2p-biens .v2brow').length === BIENS.filter(b => !isOut(b)).length), await p.evaluate(() => BIENS.length + ' biens, ' + document.querySelectorAll('#v2p-biens .v2brow').length + ' lignes'));
        await p.evaluate(() => __tab('annonces')); await p.waitForTimeout(400);
      }
      if (dev === 'ordi') {
        await p.evaluate(() => { (document.querySelector('[data-v2close]') || {click() {}}).click(); __cl('[data-v3view="graph"]'); }); await p.waitForTimeout(400);
        ok(`insula ${dev} · nuage des annonces`, await p.evaluate(() => document.querySelectorAll('#v3liste svg [data-v2open]').length > 2));
        ok(`insula ${dev} · nuage : aucune annonce collée en haut de l'échelle`, await p.evaluate(() => [...document.querySelectorAll('#v3liste svg circle[data-v2open]')].every(c => +c.getAttribute('cy') > 30.5)));
        await p.evaluate(() => __cl('[data-v3view="liste"]')); await p.waitForTimeout(300);
      } else {
        await p.evaluate(() => (document.querySelector('[data-v2close]') || {click() {}}).click()); await p.waitForTimeout(300);
        await p.evaluate(() => __tab('carte')); await p.waitForTimeout(600);
        const lh = await p.evaluate(() => document.getElementById('v2mleg').getBoundingClientRect().height);
        ok('insula tel · carte : légende sur une ligne (menu des quartiers et échelle seulement)', lh > 20 && lh < 60, String(lh));
        await p.evaluate(() => __tab('annonces')); await p.waitForTimeout(600);
        ok(`insula ${dev} · téléphone : filtres sur une ligne`, await p.evaluate(() => getComputedStyle(document.querySelector('#v3liste .v2chips')).flexWrap === 'nowrap'));
      }
      await p.evaluate(() => __tab('villes')); await p.waitForTimeout(400);
      ok(`insula ${dev} · villes`, await p.evaluate(() => document.querySelectorAll('#v3liste [data-v2city]').length === C.length));
      ok(`insula ${dev} · villes : rien ne déborde en largeur`, await p.evaluate(() => { const t = document.querySelector('#v3liste .v2tw'); return t && t.scrollWidth <= t.clientWidth + 1; }));
      await p.evaluate(() => __tab('budget')); await p.waitForTimeout(300);
      await p.evaluate(() => { const i = document.getElementById('v2h-apport'); i.value = '20000'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(400);
      ok(`insula ${dev} · hypothèse modifiée et appliquée`, await p.evaluate(() => H.apport === 20000));
      await p.evaluate(() => { const i = document.getElementById('v2h-apport'); i.value = '15000'; i.dispatchEvent(new Event('change', {bubbles: true})); });
      // mêmes chiffres pour villes et quartiers : le réglage Vacance est la moyenne des quartiers (comptés selon leurs ventes),
      // et le chiffre d'une ville est celui de son quartier du milieu
      if (dev === 'ordi') {
        const vq = () => p.evaluate(() => C.map(c => { const D = dvfC(c.k), L = IR[c.k].list.filter(t => t.type === 'H' && t.price), W = L.map(t => (D && D.q[t.code] && D.q[t.code].n) || 0), any = W.some(v => v > 0);
          let s = 0, w = 0; L.forEach((t, i) => { const d = demandOf(t), wi = any ? W[i] : 1; if (d && wi) { s += d.vac * wi; w += wi; } }); return Math.abs((w ? s / w : vacVille(c.k)) - vacVille(c.k)) < 1e-9; }).every(Boolean));
        ok('insula · mois vides : la moyenne des quartiers de chaque ville est la vacance de la ville', await vq());
        ok('insula · mois vides de la ville : le réglage tant que le délai de location n\'est pas mesuré, sinon borné entre la moitié et le double', await p.evaluate(() => { const m = vacMes(); return C.every(c => { const v = vacVille(c.k) / H.vacance; return m.ref ? v >= 0.5 - 1e-9 && v <= 2 + 1e-9 : Math.abs(v - 1) < 1e-9; }); }));
        await p.evaluate(() => { const i = document.getElementById('v2h-vacance'); i.value = '2'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(500);
        ok('insula · mois vides : changer le réglage déplace aussi les quartiers', await p.evaluate(() => H.vacance === 2) && await vq());
        await p.evaluate(() => { const i = document.getElementById('v2h-vacance'); i.value = '1'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(500);
        ok('insula · chiffre d\'une ville = son quartier du milieu (ventes du type)', await p.evaluate(() => C.every(c => { const D = dvfC(c.k), L = IR[c.k].list.filter(t => t.type === 'H' && t.price);
          if (!L.length) return true; let R = L.map(t => ({v: QX[t.ck + t.i].irr, w: (D && D.q[t.code] && D.q[t.code].n) || 0})); if (!R.some(o => o.w > 0)) R.forEach(o => { o.w = 1; });
          R = R.filter(o => o.w > 0).sort((a, b) => (a.v ?? -1e9) - (b.v ?? -1e9)); const T = R.reduce((s, o) => s + o.w, 0); let s = 0, m = R[R.length - 1];
          for (const o of R) { s += o.w; if (s >= T / 2) { m = o; break; } } return calcVille(c).irr === m.v; })));
        await p.evaluate(() => __tab('villes')); await p.waitForTimeout(300);
        await p.evaluate(() => __cl('#v3liste [data-v2city="lemans"]')); await p.waitForTimeout(800);
        await p.evaluate(() => __cl('#v3scope [data-v2cfiche="lemans"]')); await p.waitForTimeout(800);
        { const tx = async tab => { await p.evaluate(t => { const b = document.querySelector('#v2fiche [data-v2ft="' + t + '"]'); if (b) b.click(); }, tab); await p.waitForTimeout(300); return p.evaluate(() => (document.getElementById('v2fiche') || {}).textContent || ''); };
          const tp = await tx('prix'), tc = await tx('calc'); await tx('bien');
          ok('insula · fiche d\'une ville : hausse des prix retenue, prix depuis 2014 et mois vides de la ville', /Hausse des prix retenue/.test(tp) && /Appartements anciens/.test(tp) && /Mois vides retenus/.test(tc), tp.slice(0, 120) + ' | ' + tc.slice(0, 120)); }
        ok('insula · fiche d\'une ville : nomme son quartier du milieu', await p.evaluate(() => /Quartier du milieu : /.test((document.getElementById('v2fiche') || {}).innerText || '')), await p.evaluate(() => ((document.getElementById('v2fiche') || {}).innerText || '').slice(0, 300)));
        await p.evaluate(() => { const b = document.querySelector('[data-v2close]'); if (b) b.click(); }); await p.waitForTimeout(300);
      }
      // mode « Tous » : studios, T2 et T3 ensemble, chaque annonce avec son type ; une annonce T2 s'ouvre avec les réglages T2
      if (dev === 'ordi') {
        await p.evaluate(() => __cl('[data-v2tous]')); await p.waitForTimeout(2500);
        await p.evaluate(() => __tab('annonces')); await p.waitForTimeout(600);
        ok('insula · mode Tous : les trois types ensemble', await p.evaluate(() => { const t = new Set([...document.querySelectorAll('#v3liste .v2sub')].map(e => e.textContent.trim()).filter(x => /^(Studio|T2|T3)$/.test(x))); return t.size >= 2 && /annonces/.test(document.querySelector('#v3liste .v2sub').textContent); }));
        await p.evaluate(() => { const r = [...document.querySelectorAll('#v3liste [data-v2open]')].find(e => /\bT2\b/.test(e.innerText)); if (r) r.click(); }); await p.waitForTimeout(800);
        ok('insula · mode Tous : une annonce T2 s\'ouvre en T2', await p.evaluate(() => H.type === 't2' && /T2/.test(document.querySelector('#v2fiche .v2ft').textContent)));
        await p.evaluate(() => { (document.querySelector('[data-v2close]') || {click() {}}).click(); __cl('#v2type [data-type="studio"]'); }); await p.waitForTimeout(1200);
        ok('insula · retour à un type', await p.evaluate(() => H.type === 'studio' && document.querySelector('[data-v2tous]').getAttribute('aria-pressed') === 'false'));
      }
      ok(`insula ${dev} · sans erreur`, errs.length === 0, errs.slice(0, 3).join(' | '));
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
    ok('insula commun · premier lancement : critères demandés', await A.p.evaluate(() => !!document.querySelector('.v2dlg')));
    await A.p.evaluate(() => { const i = document.getElementById('v2cB'); i.value = '80000'; i.dispatchEvent(new Event('input', {bubbles: true})); __cl('.v2dlg button[type=submit]'); });
    await A.p.waitForTimeout(500);
    await A.p.evaluate(() => { __tab('budget'); }); await A.p.waitForTimeout(300);
    await A.p.evaluate(() => { const i = document.getElementById('v2h-apport'); i.value = '21000'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await A.p.waitForTimeout(1800);
    ok('insula commun · une seule ligne de réglages, avec apport et critères', rows.filter(x => x.data.kind === 'reglages').length === 1 && reg() && reg().hyp.apport === 21000 && reg().crit && reg().crit.budget === 80000, JSON.stringify(reg() && {hyp: reg().hyp.apport, crit: reg().crit}));
    const B = await open('Camille');
    ok('insula commun · l\'autre reçoit les réglages', await B.p.evaluate(() => H.apport === 21000 && critV().budget === 80000));
    ok('insula commun · pas de critères redemandés à l\'autre', await B.p.evaluate(() => !document.querySelector('.v2dlg')));
    ok('insula commun · la ligne des réglages n\'est pas un bien', await B.p.evaluate(() => BIENS.length === 0));
    await B.p.evaluate(() => { __tab('budget'); }); await B.p.waitForTimeout(300);
    await B.p.evaluate(() => { const i = document.getElementById('v2h-taux'); i.value = '3.5'; i.dispatchEvent(new Event('change', {bubbles: true})); const m = document.getElementById('v2h-meubles'); m.value = '4000'; m.dispatchEvent(new Event('change', {bubbles: true})); }); await B.p.waitForTimeout(1800);
    await tick(A.p); await A.p.waitForTimeout(1200);
    ok('insula commun · un changement de l\'autre arrive (taux, meubles du type)', await A.p.evaluate(() => H.taux === 3.5 && H.meubles === 4000), await A.p.evaluate(() => H.taux + ' / ' + H.meubles));
    ok('insula commun · message nommant qui a modifié', await A.p.evaluate(() => /Camille a modifié les réglages communs/.test((document.getElementById('toast') || {}).textContent || '')));
    // associés : Camille passe à trois associés et nomme le troisième, Louis le reçoit
    await B.p.evaluate(() => __cl('[data-v2nas="3"]')); await B.p.waitForTimeout(500);
    await B.p.evaluate(() => { const i = document.getElementById('v2a-2-nom'); i.value = 'Sam'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await B.p.waitForTimeout(1800);
    await tick(A.p); await A.p.waitForTimeout(1200);
    ok('insula commun · associés : trois, partagés, parts à 100 %', await A.p.evaluate(() => H.assoc.length === 3 && H.assoc[2].nom === 'Sam' && Math.abs(H.assoc.reduce((s, a) => s + a.part, 0) - 100) < 1e-6), await A.p.evaluate(() => JSON.stringify(H.assoc.map(a => [a.nom, a.part]))));
    // relecture sans changement (toutes les 20 s en vrai) : rien n'est réappliqué, ni message ni recalcul
    await A.p.evaluate(() => { window.__r = 0; const r0 = window.render; window.render = function () { window.__r++; return r0.apply(this, arguments); }; const t = document.getElementById('toast'); if (t) t.textContent = ''; });
    await tick(A.p); await A.p.waitForTimeout(1200); await tick(A.p); await A.p.waitForTimeout(1200);
    ok('insula commun · relecture sans changement : ni message ni recalcul', await A.p.evaluate(() => window.__r === 0 && !/réglages communs/.test((document.getElementById('toast') || {}).textContent || '')), await A.p.evaluate(() => window.__r + ' recalculs / ' + ((document.getElementById('toast') || {}).textContent || '')));
    await A.p.reload(); await A.p.waitForTimeout(2500);
    ok('insula commun · meubles du type gardés après rechargement', await A.p.evaluate(() => H.meubles === 4000));
    // offre : suivre une annonce puis choisir un prix, l'autre le voit
    await A.p.evaluate(() => __tab('annonces')); await A.p.waitForTimeout(500);
    await A.p.evaluate(() => __cl('#v3liste [data-v2star]')); await A.p.waitForTimeout(1500);
    await A.p.evaluate(() => __cl('#v3liste [data-v2open]')); await A.p.waitForTimeout(600);
    await A.p.evaluate(() => __cl('#v2fiche [data-v2ft="achat"]')); await A.p.waitForTimeout(300);
    await A.p.evaluate(() => { const s = document.getElementById('v2off'); s.value = '90'; s.dispatchEvent(new Event('input', {bubbles: true})); s.dispatchEvent(new Event('change', {bubbles: true})); }); await A.p.waitForTimeout(1500);
    const off = (rows.find(x => x.data && x.data.kind !== 'reglages' && x.data.visite) || {data: {visite: {}}}).data.visite.offre;
    await tick(B.p); await B.p.waitForTimeout(1200);
    ok('insula commun · offre enregistrée pour les deux', off > 0 && await B.p.evaluate(o => BIENS.length === 1 && +BIENS[0].visite.offre === o, off), String(off));
    // ce qui a bougé : Camille revient « un autre jour » (état de la liste d'avant l'ajout) et voit ce que Louis a fait
    await B.p.evaluate(() => { localStorage.setItem('v2vu', JSON.stringify({day: '2000-01-01', ref: null, rt: null, last: {}, lt: '2000-01-01T00:00:00.000Z'})); localStorage.setItem('mvisit', JSON.stringify({last: '2000-01-01', prev: null}));
      const s = JSON.parse(localStorage.getItem('v3s') || '{}'); s.tab = 'explorer'; s.view = 'carte'; s.city = null; localStorage.setItem('v3s', JSON.stringify(s)); });
    await B.p.reload(); await B.p.waitForTimeout(3000);
    const nws = await B.p.evaluate(() => (document.querySelector('#v2mlist .v2news') || {}).innerText || '');
    await B.p.evaluate(() => __tab('biens')); await B.p.waitForTimeout(500); const nwb = await B.p.evaluate(() => (document.querySelector('#v2p-biens .v2news') || {}).innerText || ''); await B.p.evaluate(() => __tab('carte')); await B.p.waitForTimeout(800);
    ok('insula commun · ce qui a bougé : le bien ajouté par l\'autre, dans Nos biens', /Louis l'a ajouté/.test(nwb) && !/Louis l'a ajouté/.test(nws), nwb.slice(0, 200));
    ok('insula commun · ce qui a bougé : nouvelles annonces depuis la visite', /nouvelles? annonces? pour nos critères/.test(nws), nws.slice(0, 200));
    ok('insula commun · Nos biens signale le bien à regarder', await B.p.evaluate(() => ((document.querySelector('#v2tabs [data-v2tab="biens"] small') || {}).textContent || '') === '1'));
    ok('insula · le premier relevé d\'une ville ne compte pas comme nouveau', await B.p.evaluate(() => { const L = []; Object.keys(ADS).filter(k => ADS[k] && ADS[k].ventes && hStart(k, 'v')).forEach(k => ADS[k].ventes.forEach(a => { const e = hEntry(k, a[3]); if (e && e.f === hStart(k, 'v')) L.push([k, a[3]]); })); return L.length > 0 && L.every(([k, s]) => !isNewAd(k, s)); }));
    ok('insula · L\'Ouest compte les annonces pour nos critères', await B.p.evaluate(() => { const R = [...document.querySelectorAll('#v2mlist [data-v2city]:not(.v2dim)')]; return R.length > 0 && R.every(e => /pour nos critères/.test(e.innerText)); }), await B.p.evaluate(() => { const e = document.querySelector('#v2mlist [data-v2city]:not(.v2dim)'); return e ? e.outerHTML.slice(0, 300) : 'aucune ville avec des annonces'; }));
    // grille de visite et fiche à emporter, ouvertes depuis la fiche du bien suivi
    await A.p.evaluate(() => __cl('#v2fiche [data-v2ft="achat"]')); await A.p.waitForTimeout(300);
    await A.p.evaluate(() => __cl('#v2fiche [data-visit]')); await A.p.waitForTimeout(500);
    ok('insula · grille de visite ouverte depuis la fiche', await A.p.evaluate(() => !document.getElementById('visitPanel').hidden && document.querySelectorAll('#visitPanel [data-vck]').length > 10));
    await A.p.evaluate(() => __cl('#visitPanel .vclose')); await A.p.waitForTimeout(300);
    await A.p.evaluate(() => __cl('#v2fiche [data-fiche]')); await A.p.waitForTimeout(500);
    ok('insula · fiche à emporter ouverte depuis la fiche', await A.p.evaluate(() => !document.getElementById('fichePanel').hidden && document.getElementById('ficheBody').innerText.length > 200));
    await A.p.evaluate(() => __cl('#fichePanel .fclose')); await A.p.waitForTimeout(300);
    // nos biens : ajouter un bien à la main dans une fenêtre (formulaire de l'app), puis comparer deux biens
    await A.p.evaluate(() => __tab('biens')); await A.p.waitForTimeout(400);
    await A.p.evaluate(() => __cl('[data-v2add]')); await A.p.waitForTimeout(300);
    ok('insula · ajouter un bien : le formulaire dans une fenêtre', await A.p.evaluate(() => !!document.querySelector('.v2dlg #biensForm')));
    await A.p.fill('.v2dlg #biensForm [name=prix]', '52000'); await A.p.fill('.v2dlg #biensForm [name=surface]', '21'); await A.p.click('.v2dlg #biensForm [type=submit]'); await A.p.waitForTimeout(2000);
    ok('insula · bien ajouté, fenêtre fermée, formulaire rangé', await A.p.evaluate(() => BIENS.length === 2 && !document.querySelector('.v2dlg') && !!document.querySelector('#p-biens #biensForm')), await A.p.evaluate(() => BIENS.length + ' ' + !!document.querySelector('.v2dlg')));
    await A.p.evaluate(() => document.querySelectorAll('#v2p-biens [data-v2cmp]').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change', {bubbles: true})); })); await A.p.waitForTimeout(500);
    ok('insula · comparer deux biens côte à côte', await A.p.evaluate(() => document.querySelectorAll('#v2p-biens .v2cmpt thead th').length === 3));
    await A.p.evaluate(() => updBien(BIENS[0].id, {statut: 'visité'})); await A.p.waitForTimeout(1500);
    ok('insula · Nos biens : une colonne par étape, le bien passé à « Visité » y est', await A.p.evaluate(() => { const C = [...document.querySelectorAll('#v2p-biens .v3col')]; return C.length === 5 && C[1].querySelectorAll('[data-v2open]').length === 1 && /Visité\s*1/.test(C[1].querySelector('.v3colh').textContent) && C[0].querySelectorAll('[data-v2open]').length === BIENS.filter(b => !isOut(b) && (b.statut || 'à voir') === 'à voir').length; }), await A.p.evaluate(() => [...document.querySelectorAll('#v2p-biens .v3colh')].map(h => h.textContent).join(' | ')));
    await A.p.evaluate(() => __tab('reglages')); await A.p.waitForTimeout(400);
    ok('insula · sources et fraîcheur des données dans Réglages (Méthode et sources)', await A.p.evaluate(() => !!document.querySelector('#v2p-reglages #sources')));
    await A.p.evaluate(() => __tab('projet')); await A.p.waitForTimeout(400);
    ok('insula · Projet : gestion par agence à 0, hausse des prix selon la ville cochée, et leur poids dans « Ce qui pèse »', await A.p.evaluate(() => { const g = document.getElementById('v2h-gestion'), x = document.querySelector('#v2p-projet [data-v2hb="pxV"]'), t = document.getElementById('v2p-projet').textContent;
      return g && g.value === '0' && x && x.checked && /Gestion par agence/.test(t) && /Prix selon la ville/.test(t) && /logements vides/.test(t); }));
    ok('insula · DPE à jour : badge et travaux d\'après la classe de 2027, classe annoncée rappelée', await A.p.evaluate(() => { const K = Object.keys(FICX).filter(k => FICX[k].dpe0); if (!K.length) return false;
      const k = K.find(k => /[EFG]/.test(FICX[k].dpe0)) || K[0], b = ficheBadges(k); let a = null; for (const ck in ADS) { const v = ADS[ck]; if (!v || !v.ventes) continue; a = v.ventes.find(x => adId(x[3]) === k); if (a) { a = [ck, a]; break; } }
      const L = a ? valeursBien(venteBien(a[0], a[1])).travaux.L.map(z => z[0]).join(' ') : ''; return b.includes('DPE ' + FICX[k].dpe + '*') && /1er janvier 2027/.test(b) && (!a || !/[EFG]/.test(FICX[k].dpe) || /annoncé/.test(L)); }));
    { const rd = n => fs.readFileSync(path.resolve(__dirname, '..', n), 'utf8');
      ok('page d\'essai : essai.html porte la nouvelle interface (Insula), index.html garde la v2', rd('essai.html').includes('(function v3(){') && rd('essai.html').includes('<title>Insula</title>') && !rd('index.html').includes('(function v3(){') && rd('index.html').includes('(function v2(){')); }
    ok('insula commun · sans erreur', !A.errs.length && !B.errs.length, A.errs.concat(B.errs).slice(0, 3).join(' | '));
    await A.c.close(); await B.c.close(); }
  // la nouvelle structure : quatre espaces ; Explorer en carte, liste ou graphique ; la fiche à la place de la liste (ordinateur) ; L'essentiel d'abord ; Projet ; Réglages
  for (const [dev, opt] of [['ordi', {viewport: {width: 1440, height: 900}}], ['tel', {...devices['iPhone 13']}]]) {
    const c = await b.newContext(opt), p = await c.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/cdnjs.cloudflare.com/**', r => r.abort()); await mlRoutes(p);
    await p.goto(URL); await p.waitForTimeout(2000); await p.click('.v2dlg button[type=submit]'); await p.waitForTimeout(1200);
    const vis = s => `(e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0)(document.querySelector('${s}'))`;
    const s0 = await p.evaluate(v => ({nav: [...document.querySelectorAll('#v2tabs [data-v2tab]')].map(b => b.textContent.replace(/\d+$/, '').trim()), bar: [...document.querySelectorAll('#v2tabbar [data-v2tab]')].map(b => b.dataset.v2tab), av: eval(v[0]), barre: eval(v[1]), titre: document.title, scope: !document.getElementById('v3scope').hidden, vue: document.getElementById('v2app').dataset.view}), [vis('#v3av'), vis('#v2tabbar')]);
    ok(`insula ${dev} · quatre espaces : Explorer, Nos biens et Projet en haut avec le rond de Réglages (ordinateur), quatre entrées en bas (téléphone)`, s0.titre === 'Insula' && s0.scope && s0.vue === 'carte' && (dev === 'ordi' ? s0.nav.join() === 'Explorer,Nos biens,Projet' && s0.av && !s0.barre : s0.bar.join() === 'explorer,biens,projet,reglages' && !s0.av && s0.barre), JSON.stringify(s0));
    // Explorer : villes ou annonces, en liste ou en graphique, avec la même barre du périmètre
    await p.evaluate(() => { __cl('[data-v3view="liste"]'); }); await p.waitForTimeout(400);
    const l1 = await p.evaluate(() => ({carte: !document.getElementById('v2map').parentNode.hidden, liste: !document.getElementById('v3liste').hidden, villes: document.querySelectorAll('#v3liste [data-v2city]').length}));
    await p.evaluate(() => __cl('[data-v3obj="annonces"]')); await p.waitForTimeout(400);
    const l2 = await p.evaluate(() => ({n: document.querySelectorAll('#v3liste [data-v2open^="v|"]').length, chips: [...document.querySelectorAll('#v3liste [data-v2vue]')].map(b => b.dataset.v2vue).join()}));
    await p.evaluate(() => __cl('[data-v3view="graph"]')); await p.waitForTimeout(400);
    const l3 = await p.evaluate(() => document.querySelectorAll('#v3liste svg [data-v2open]').length);
    ok(`insula ${dev} · Explorer : la vue Liste montre les villes puis les annonces (mêmes filtres, sans « Shortlist »), la vue Graphique leur nuage`, !l1.carte && l1.liste && l1.villes === 22 && l2.n > 10 && l2.chips === 'crit,new,drop,long,all' && l3 > 10, JSON.stringify({l1, l2, l3}));
    await p.evaluate(() => { __cl('[data-v3view="carte"]'); __cl('[data-v3obj="villes"]'); }); await p.waitForTimeout(800);
    await p.evaluate(() => __cl('#v2mlist [data-v2city="lemans"]')); await p.waitForTimeout(1500);
    const sc = await p.evaluate(() => ({crumb: document.querySelector('#v3scope .v3crumb').innerText.replace(/\s+/g, ' '), fiche: !!document.querySelector('#v3scope [data-v2cfiche="lemans"]')}));
    await p.evaluate(() => __cl('[data-v3view="liste"]')); await p.waitForTimeout(400);
    const lm = await p.evaluate(() => { const K = [...document.querySelectorAll('#v3liste [data-v2open]')].map(e => e.dataset.v2open); return {n: K.length, ok: K.every(k => k.startsWith('v|lemans|'))}; });
    ok(`insula ${dev} · périmètre : L'Ouest › Le Mans, la fiche de la ville en bouton, la liste ne montre que Le Mans`, /L'Ouest › Le Mans/.test(sc.crumb) && sc.fiche && lm.n > 0 && lm.ok, JSON.stringify({sc, lm}));
    await p.evaluate(() => __cl('[data-v3view="carte"]')); await p.waitForTimeout(800);
    // la fiche : ouverte depuis une liste, sur « L'essentiel » ; ‹ › gardent l'onglet ; « En bref » mène à la rubrique ; scénario affiché dans la fiche
    await p.evaluate(() => __cl('#v2mlist [data-v2open^="v|"]')); await p.waitForTimeout(1200);
    const f1 = await p.evaluate(() => { const F = document.getElementById('v2fiche'), r = F.getBoundingClientRect(), L = document.getElementById('v2mlist'); return {essentiel: (F.querySelector('.v2tabs2 [aria-pressed="true"]') || {}).textContent, bref: F.querySelectorAll('.v3bref [data-v3sec]').length, left: Math.round(r.left), w: Math.round(r.width), liste: getComputedStyle(L).display, fermer: F.querySelector('[data-v2close]').textContent.trim(), mot: /shortlist/i.test(document.getElementById('v2app').innerText), suivre: /Suivre ce bien|☆ Suivre/.test(F.innerText)}; });
    ok(`insula ${dev} · fiche : ouverte sur « Essentiel », avec « En bref » et « Suivre ce bien » (plus de « shortlist »)`, f1.essentiel === 'Essentiel' && f1.bref >= 2 && f1.suivre && !f1.mot, JSON.stringify(f1));
    if (dev === 'ordi') {
      ok('insula ordi · sur la carte, la fiche prend la place de la liste (à gauche), « ‹ Liste » la referme', f1.left < 40 && f1.w >= 400 && f1.w <= 460 && f1.liste === 'none' && f1.fermer === '‹ Liste', JSON.stringify(f1));
      const pad = await p.evaluate(() => V2MAP().getPadding().left);
      ok('insula ordi · la carte se centre à droite de la fiche', pad > 400, String(pad));
    }
    await p.evaluate(() => __cl('#v2fiche .v3bref [data-v3sec="prix"]')); await p.waitForTimeout(400);
    const f2 = await p.evaluate(() => ({tab: (document.querySelector('#v2fiche .v2tabs2 [aria-pressed="true"]') || {}).textContent, open: !!document.querySelector('#v2fiche details.fsec[data-sec="prix"][open]')}));
    await p.evaluate(() => __cl('#v2fiche [data-v2nav="1"]')); await p.waitForTimeout(700);
    const f3 = await p.evaluate(() => (document.querySelector('#v2fiche .v2tabs2 [aria-pressed="true"]') || {}).textContent);
    await p.evaluate(() => __cl('#v2fiche [data-v2close]')); await p.waitForTimeout(400);
    await p.evaluate(() => __cl('#v2mlist [data-v2open^="v|"]')); await p.waitForTimeout(900);
    const f4 = await p.evaluate(() => (document.querySelector('#v2fiche .v2tabs2 [aria-pressed="true"]') || {}).textContent);
    ok(`insula ${dev} · fiche : « En bref » mène à la rubrique ; l'annonce suivante garde l'onglet ; rouverte depuis la liste, retour sur « Essentiel »`, f2.tab === 'Prix' && f2.open && f3 === 'Prix' && f4 === 'Essentiel', JSON.stringify({f2, f3, f4}));
    if (dev === 'tel') await p.evaluate(() => __cl('#v2fiche [data-v2fgrip]'));
    await p.waitForTimeout(300);
    await p.evaluate(() => __cl('#v2fiche .v3scnrow [data-v2scn="prudent"]')); await p.waitForTimeout(800);
    const sn = await p.evaluate(() => ({pess: H.pess, ls: localStorage.getItem('scn'), lab: /Rendement 15 ans · prudent/i.test(document.getElementById('v2fiche').innerText)}));
    await p.evaluate(() => __cl('#v2fiche .v3scnrow [data-v2scn="central"]')); await p.waitForTimeout(600);
    ok(`insula ${dev} · fiche : le scénario se change depuis la fiche (le réglage est aussi dans Réglages)`, sn.pess && sn.ls === 'prudent' && sn.lab && await p.evaluate(() => !H.pess && !H.fav), JSON.stringify(sn));
    await p.evaluate(() => __cl('#v2fiche [data-v2close]')); await p.waitForTimeout(400);
    // Projet : commun au groupe, des cartes avec leur résumé ; ouvertes ou fermées, retenu
    await p.evaluate(() => __tab('projet')); await p.waitForTimeout(500);
    const pj = await p.evaluate(() => ({cartes: [...document.querySelectorAll('#v2p-projet [data-v3pc]')].map(d => d.dataset.v3pc).join(), credit: document.querySelector('[data-v3pc="credit"] summary small').textContent, crit: document.querySelector('#v2p-projet .v3sum').textContent, haut: getComputedStyle(document.querySelector('.v2top')).display}));
    await p.evaluate(() => { const d = document.querySelector('[data-v3pc="hyp"]'); d.open = true; }); await p.waitForTimeout(300);
    ok(`insula ${dev} · Projet : critères, budget et crédit, associés et impôts, hypothèses, ce qui pèse le plus, avec leur résumé ; carte ouverte retenue`, pj.cartes === 'credit,assoc,hyp,poids' && /Apport 15 000 € · crédit à 4,07 % sur 25 ans/.test(pj.credit.replace(/ /g, ' ')) && /jusqu'à \d+ k€ tout compris/.test(pj.crit) && await p.evaluate(() => JSON.parse(localStorage.getItem('v3s')).popen.hyp === true) && (dev === 'ordi' || pj.haut === 'none'), JSON.stringify(pj));
    // Réglages : prénom et code (masqué, « Afficher »), thème en trois choix, scénario, aide
    await p.evaluate(() => __tab('reglages')); await p.waitForTimeout(400);
    const rg0 = await p.evaluate(() => ({type: document.getElementById('v2code').type, th: [...document.querySelectorAll('#v2p-reglages [data-v2theme]')].map(b => b.dataset.v2theme).join(), scn: document.querySelectorAll('#v2p-reglages [data-v2scn]').length, aide: !!document.querySelector('#v2p-reglages [data-v2guide]') && !!document.querySelector('#v2p-reglages [data-v2ret]'), meth: !!document.querySelector('#v2p-reglages [data-v3pc="meth"] #sources')}));
    await p.evaluate(() => __cl('[data-v3showcode]')); const rg1 = await p.evaluate(() => document.getElementById('v2code').type);
    ok(`insula ${dev} · Réglages : code du groupe masqué (« Afficher »), thème clair, sombre ou comme l'appareil, scénario, aide, méthode et sources`, rg0.type === 'password' && rg1 === 'text' && rg0.th === 'light,dark,auto' && rg0.scn === 3 && rg0.aide && rg0.meth, JSON.stringify({rg0, rg1}));
    // Nos biens vide, sans groupe : comment commencer, et où régler le groupe
    await p.evaluate(() => __tab('biens')); await p.waitForTimeout(400);
    ok(`insula ${dev} · Nos biens vide : comment suivre une annonce, et le groupe dans Réglages`, await p.evaluate(() => /Touchez « Suivre »/.test(document.getElementById('v2p-biens').innerText) && !!document.querySelector('#v2p-biens [data-v2tab="reglages"]')));
    // démarrage : l'écran d'attente est retiré ; flèches de la fiche : des icônes
    ok(`insula ${dev} · démarrage : l'écran d'attente disparaît quand l'app est prête`, await p.evaluate(() => !document.getElementById('v3boot')));
    // fermer une fiche : retour à l'écran d'avant (ici toutes les annonces de l'Ouest, carte dézoomée), pas aux annonces de la ville de l'annonce
    await p.evaluate(() => __tab('carte')); await p.waitForTimeout(300); await p.evaluate(() => { __cl('#v3scope [data-v2city=""]'); __cl('[data-v3obj="annonces"]'); }); await p.waitForTimeout(800);
    await p.evaluate(() => V2MAP().jumpTo({center: [-0.6, 47.75], zoom: 6.5, pitch: 0, bearing: 0})); await p.waitForTimeout(1200);
    const av = await p.evaluate(() => ({head: document.querySelector('#v2mlist .v2mhead').innerText, z: V2MAP().getZoom()}));
    await p.evaluate(() => __cl('#v2mlist [data-v2open^="v|"]')); await p.waitForTimeout(2500);
    const pend = await p.evaluate(() => ({z: V2MAP().getZoom(), fl: !!document.querySelector('#v2fiche .v2nav svg')}));
    await p.evaluate(() => __cl('#v2fiche [data-v2close]')); await p.waitForTimeout(1800);
    const ap = await p.evaluate(() => ({head: document.querySelector('#v2mlist .v2mhead').innerText, crumb: document.querySelector('#v3scope .v3crumb').innerText.trim(), z: V2MAP().getZoom()}));
    ok(`insula ${dev} · fermer une fiche ramène à l'écran d'avant (même liste, même cadrage de la carte)`, /^L'Ouest/.test(av.head) && pend.z > 12 && /^L'Ouest/.test(ap.head) && ap.crumb === "L'Ouest" && Math.abs(ap.z - av.z) < 0.6 && pend.fl, JSON.stringify({av, pend, ap}));
    if (dev === 'tel') {   // la liste et la fiche se tirent au doigt par leur en-tête ; plus de bouton « Réduire »
      const tire = (sel, dy) => p.evaluate(([sel, dy]) => { const h = document.querySelector(sel), r = h.getBoundingClientRect(), o = {bubbles: true, clientX: r.left + 120, clientY: r.top + 12, pointerId: 3};
        h.dispatchEvent(new PointerEvent('pointerdown', o)); document.dispatchEvent(new PointerEvent('pointermove', Object.assign({}, o, {clientY: r.top + 12 + dy / 2}))); document.dispatchEvent(new PointerEvent('pointermove', Object.assign({}, o, {clientY: r.top + 12 + dy}))); document.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, o, {clientY: r.top + 12 + dy}))); }, [sel, dy]);
      const rb = await p.evaluate(() => !!document.querySelector('#v2mlist [data-v2min]'));
      await tire('#v2mlist .v2mhead .v2crumb', 330); await p.waitForTimeout(500); const m1 = await p.evaluate(() => document.getElementById('v2mlist').dataset.min);
      await tire('#v2mlist .v2mhead .v2crumb', -330); await p.waitForTimeout(500); const m2 = await p.evaluate(() => document.getElementById('v2mlist').dataset.min);
      ok('insula tel · la liste se réduit et revient en tirant son en-tête, sans bouton « Réduire »', !rb && m1 === '1' && m2 === '0', JSON.stringify({rb, m1, m2}));
      await p.evaluate(() => __cl('#v2mlist [data-v2open^="v|"]')); await p.waitForTimeout(1200);
      await tire('#v2fiche .v2fhd', -150); await p.waitForTimeout(500); const g1 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half);
      await tire('#v2fiche .v2fhd', 150); await p.waitForTimeout(500); const g2 = await p.evaluate(() => document.getElementById('v2fiche').dataset.half);
      ok('insula tel · fiche : tout le bandeau (photo, titre) la tire vers le haut ou vers le bas', g1 === '0' && g2 === '1', JSON.stringify({g1, g2}));
      await p.evaluate(() => __cl('#v2fiche [data-v2close]')); await p.waitForTimeout(500);
    }
    ok(`insula ${dev} · nouvelle structure · sans erreur`, errs.length === 0, errs.slice(0, 3).join(' | '));
    await c.close(); }
  ok('insula · tous les clics des scénarios ont trouvé leur élément', MISS.length === 0, [...new Set(MISS)].join(' | '));
  await b.close();
  let bad = 0; for (const [name, pass, info] of res) { if (!pass) bad++; console.log((pass ? '✓ ' : '✗ ') + name + (pass || !info ? '' : '  → ' + info)); }
  console.log(`\n${res.length - bad}/${res.length} tests réussis`); process.exit(bad ? 1 : 0);
})();
