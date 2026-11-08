// Tests de bout en bout : node tests/run.js  (après python3 build.py) — l'interface de src/v2 sur le moteur de src/js
const {chromium, devices} = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../dist/test.html');
const res = []; const ok = (n, c, info = '') => { res.push([n, !!c, info]); };
// carte 3D hors réseau : MapLibre servi depuis tests/vendor, style minimal à la place d'OpenFreeMap (les routes ajoutées ensuite passent avant)
const ML = (n) => require('path').join(__dirname, 'vendor', 'maplibre-gl-4.7.1.' + n);
async function mlRoutes(p) {
  const fs = require('fs');
  await p.route('**/tiles.openfreemap.org/**', r => r.request().url().includes('/styles/') ? r.fulfill({contentType: 'application/json', body: JSON.stringify({version: 8, glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf', sources: {}, layers: [{id: 'fond', type: 'background', paint: {'background-color': '#dfe7ef'}}]})}) : r.fulfill({status: 404, body: ''}));
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
    ok('ajout d\'un bien · adresse sans erreur', errs.length === 0, errs.join(' | '));
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
      ok(`v2 ${dev} · carte de l'Ouest et ses 20 villes`, await p.evaluate(() => !!(window.V2MAP && V2MAP()) && V2MAPN.villes === C.length && document.querySelectorAll('#v2mlist [data-v2city]').length === C.length && C.length === 20));
      await p.evaluate(() => document.querySelector('#v2mlist [data-v2city="lemans"]').click()); await p.waitForTimeout(1500);
      ok(`v2 ${dev} · Le Mans : quartiers et annonces`, await p.evaluate(() => V2MAPN.quartiers > 20 && V2MAPN.annonces > 0 && document.querySelectorAll('#v2mlist [data-v2open]').length > 0));
      await p.evaluate(() => document.querySelector('#v2mlist [data-v2open]').click()); await p.waitForTimeout(800);
      ok(`v2 ${dev} · fiche en onglets avec la fourchette`, await p.evaluate(() => !document.getElementById('v2fiche').hidden && document.querySelectorAll('#v2fiche [data-v2ft]').length === 5 && /prudent .* favorable/.test(document.getElementById('v2fiche').textContent)));
      ok(`v2 ${dev} · fiche : les onglets visibles dès l'ouverture`, await p.evaluate(() => { const f = document.getElementById('v2fiche'), t = f.querySelector('.v2tabs2'); return t.getBoundingClientRect().bottom < f.getBoundingClientRect().bottom - 40; }));
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
      if (dev === 'ordi') {
        await p.evaluate(() => { document.querySelector('[data-v2close]').click(); document.querySelector('[data-v2av="nuage"]').click(); }); await p.waitForTimeout(400);
        ok(`v2 ${dev} · nuage des annonces`, await p.evaluate(() => document.querySelectorAll('#v2p-annonces svg [data-v2open]').length > 2));
        ok(`v2 ${dev} · nuage : aucune annonce collée en haut de l'échelle`, await p.evaluate(() => [...document.querySelectorAll('#v2p-annonces svg circle[data-v2open]')].every(c => +c.getAttribute('cy') > 30.5)));
        await p.evaluate(() => document.querySelector('[data-v2av="tableau"]').click()); await p.waitForTimeout(300);
      } else {
        await p.evaluate(() => document.querySelector('[data-v2close]').click()); await p.waitForTimeout(300);
        ok(`v2 ${dev} · téléphone : pas de nuage, filtres sur une ligne`, await p.evaluate(() => !document.querySelector('[data-v2av]') && getComputedStyle(document.querySelector('#v2p-annonces .v2chips')).flexWrap === 'nowrap'));
      }
      await p.evaluate(() => document.querySelector('[data-v2tab="villes"]').click()); await p.waitForTimeout(400);
      ok(`v2 ${dev} · villes`, await p.evaluate(() => document.querySelectorAll('#v2p-villes [data-v2city]').length === C.length));
      ok(`v2 ${dev} · villes : rien ne déborde en largeur`, await p.evaluate(() => { const t = document.querySelector('#v2p-villes .v2tw'); return t && t.scrollWidth <= t.clientWidth + 1; }));
      await p.evaluate(() => document.querySelector('[data-v2tab="budget"]').click()); await p.waitForTimeout(300);
      await p.evaluate(() => { const i = document.getElementById('v2h-apport'); i.value = '20000'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(400);
      ok(`v2 ${dev} · hypothèse modifiée et appliquée`, await p.evaluate(() => H.apport === 20000));
      await p.evaluate(() => { const i = document.getElementById('v2h-apport'); i.value = '15000'; i.dispatchEvent(new Event('change', {bubbles: true})); });
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
    const rows = []; let n = 0; const CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'};
    const sb = async r => { const q = r.request(), u = new U(q.url()), m = q.method(), id = (u.searchParams.get('id') || '').replace(/^eq\./, ''), js = (s, b) => r.fulfill({status: s, headers: CORS, contentType: 'application/json', body: b});
      if (m === 'OPTIONS') return r.fulfill({status: 204, headers: CORS, body: ''});
      if (u.pathname.endsWith('/annonces')) return js(200, '[]');
      if (m === 'GET') return js(200, JSON.stringify(id ? rows.filter(x => x.id === id) : rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))));
      if (m === 'POST') { rows.push({id: 'r' + (++n), data: JSON.parse(q.postData()).data, created_at: new Date(Date.now() + n).toISOString()}); return js(201, ''); }
      if (m === 'PATCH') { const x = rows.find(x => x.id === id); if (x) x.data = JSON.parse(q.postData()).data; return js(204, ''); }
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
    ok('v2 · L\'Ouest compte les annonces pour nos critères', await B.p.evaluate(() => /pour nos critères/.test(document.querySelector('#v2mlist [data-v2city]').innerText)));
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
    { const rd = n => fs.readFileSync(path.resolve(__dirname, '..', n), 'utf8');
      ok('une seule interface : index.html est la v2, plus d\'ancienne page, v2.html y renvoie', rd('index.html').includes('app.id="v2app"') && !fs.existsSync(path.resolve(__dirname, '..', 'ancienne.html')) && !rd('index.html').includes('id="mApp"') && rd('v2.html').includes('location.replace')); }
    ok('v2 commun · sans erreur', !A.errs.length && !B.errs.length, A.errs.concat(B.errs).slice(0, 3).join(' | '));
    await A.c.close(); await B.c.close(); }
  await b.close();
  let bad = 0; for (const [name, pass, info] of res) { if (!pass) bad++; console.log((pass ? '✓ ' : '✗ ') + name + (pass || !info ? '' : '  → ' + info)); }
  console.log(`\n${res.length - bad}/${res.length} tests réussis`); process.exit(bad ? 1 : 0);
})();
