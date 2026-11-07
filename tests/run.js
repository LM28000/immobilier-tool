// Tests de bout en bout : node tests/run.js  (après python3 build.py)
const {chromium, devices} = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../dist/test.html');
const res = []; const ok = (n, c, info = '') => { res.push([n, !!c, info]); };
const VIEWS = [['ordi', {viewport: {width: 1300, height: 900}}], ['tel', {...devices['iPhone 13']}]];

async function page(b, o) {
  const c = await b.newContext(o); const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());   // suite principale : carte dessinée (SVG), sans dépendre du réseau ; la vraie carte a ses tests plus bas
  await p.goto(URL); await p.waitForTimeout(900);
  return {c, p, errs};
}
const tap = async (p, n, x, y) => n === 'tel' ? p.touchscreen.tap(x, y) : p.mouse.click(x, y);

(async () => {
  const b = await chromium.launch();
  for (const [n, o] of VIEWS) {
    const {c, p, errs} = await page(b, o);
    const T = s => `${n} · ${s}`;
    const scr = async k => { if (n === 'tel') { await p.evaluate(k => mShow(k), k); await p.waitForTimeout(300); } };
    await scr('carte');
    if (n === 'ordi') {
    // pas de défilement horizontal
    ok(T('pas de débordement horizontal'), await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    // clic sur une ville : sélection sans zoom, annonces en dessous
    await p.evaluate(() => document.getElementById('zHome').click()); await p.waitForTimeout(800);
    const mb = await p.$('.mapbox'); await mb.scrollIntoViewIfNeeded();
    const pos = await p.evaluate(() => { const r = document.querySelector('.city[data-k="stnazaire"] circle').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await tap(p, n, ...pos); await p.waitForTimeout(700);
    const s1 = await p.evaluate(() => [SEL, V.k, document.getElementById('qBox').hidden]);
    ok(T('ville sélectionnée sans zoom'), s1[0] === 'stnazaire' && s1[1] < 1.2, JSON.stringify(s1));
    ok(T('annonces de la ville affichées'), s1[2] === false);
    // quartier : panneau
    await p.evaluate(() => { SEL = 'lemans'; render(); flyTo(IR.lemans.bb); }); await p.waitForTimeout(900);
    await mb.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    const ip = await p.evaluate(() => { const t = IR.lemans.list.find(x => x.code === '0202'); const r = document.querySelector(`[data-iris="lemans:${t.i}"]`).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await tap(p, n, ...ip); await p.waitForTimeout(700);
    ok(T('tap quartier ouvre la fiche'), await p.evaluate(() => !!QSEL && !document.getElementById('qDetail').hidden));
    ok(T('données réelles du quartier (DVF, trajets)'), await p.evaluate(() => { const a = document.querySelector('.qcard .fsec[data-sec=prix]'), b = document.querySelector('.qcard .fsec[data-sec=traj]'); return !!a && !!b && /studios? vendus?/i.test(a.textContent) && /à pied/.test(b.textContent); }));
    ok(T('rubriques écoles et urbanisme du quartier'), await p.evaluate(() => { const e = document.querySelector('.qcard .fsec[data-sec=ecoles]'), u = document.querySelector('.qcard .fsec[data-sec=urba]'); return !!e && !!u && /supérieur/.test(e.textContent) && /PLU/.test(u.textContent); }));
    ok(T('un seul fil d\'Ariane'), await p.evaluate(() => document.querySelectorAll('.fcrumb').length === 0 && !!document.querySelector('#crumbs [data-crumb=city]')));
    ok(T('sous la carte : annonces du quartier seulement'), await p.evaluate(() => document.getElementById('qAll').hidden && /Annonces · /.test(document.getElementById('qCard').textContent)));
    ok(T('rubrique habitants du quartier (Insee)'), await p.evaluate(() => { const h = document.querySelector('.qcard .fsec[data-sec=hab]'); return !!h && /Étudiants/.test(h.textContent) && /Revenu médian/.test(h.textContent); }));
    ok(T('annonces du type choisi (studio, T2, T3)'), await p.evaluate(() => { const raw = ADSRAW.lemans.t; ADSRAW.lemans.t = {t2: {ads: [[55, 'Gare', 640, 1, 'a1', ''], [44, 'Gare', 650, 1, 'a2', ''], [40, 'Gare', 600, 0, 'a3', ''], [50, 'Gare', 620, 1, 'a4', '']], ventes: [[45, 'Gare', 60000, 'v1', '']]}}; Object.keys(ADSV).forEach(k => delete ADSV[k]); const s = ADS.lemans.ads.length; setType('t2'); const t2 = ADS.lemans.ads.length === 4 && ADS.lemans.ventes.length === 1 && venteBien('lemans', ADS.lemans.ventes[0]).type === 't2'; setType('t3'); const t3 = ADS.lemans.ads.length === 0 && ADS.lemans.ventes.length === 0; setType('studio'); ADSRAW.lemans.t = raw; Object.keys(ADSV).forEach(k => delete ADSV[k]); return s > 10 && t2 && t3 && ADS.lemans.ads.length === s; }));
    ok(T('mêmes règles partout : ventes réelles pour toutes les villes, écart de quartier calé'), await p.evaluate(() => hasDVF('tours') && Math.abs(studioPm2('tours') - dvfC('tours').med) < 1 && Object.keys(IR).every(k => raBeta(k) >= 0 && raBeta(k) <= 1) && C.every(c => hasDVF(c.k))));
    ok(T('repères, marché locatif et quartiers par règle, pour toutes les villes'), await p.evaluate(() => C.every(c => MARK[c.k] && MARK[c.k].gare && MARK[c.k].univ && MARK[c.k].centre && demCity(c.k)) && Object.keys(TTQ).every(k => (!TCQ[k] || TTQ[k].marks.join() === TCQ[k].marks.join()) && TTQ[k].marks.every(m => m in MARK[k])) && C.every(c => IR[c.k] && IR[c.k].list.some(t => QX[t.ck + t.i]) && TTQ[c.k] && RISQ[c.k] && POIQ[c.k] && TERQ.urba[c.k]) && IR.rennes.noRA && !IR.lemans.noRA && C.every(c => TCQ[c.k] && TCQ[c.k].marks.join() === TTQ[c.k].marks.join()) && C.every(c => !('tension' in c))));
    ok(T('type de bien : mêmes règles, données du type'), await p.evaluate(() => { const st = JSON.stringify(typeDefaults('studio')); const a = studioPm2('lemans'); setType('t2'); const ok2 = H.surface === 42 && Math.abs(studioPm2('lemans') - dvfC('lemans', 't2').med) < 1 && dvfC('lemans', 't2').med !== dvfC('lemans', 'studio').med && document.querySelector('[data-type=t2][aria-pressed=true]'); const xb = calcBien({ville: 'lemans', prix: 60000, surface: 20}).x; setType('t3'); const xc = calc(C[0]); setType('studio'); return st === JSON.stringify({surface: 22, meubles: 3000, travaux: 2300, copro: 50}) && Math.abs(studioPm2('lemans') - a) < 1 && !!ok2 && xb.rentHC > 0 && xc.rentHC > calc(C[0]).rentHC * 1.5 && !TYPES.coloc && typeFor(33, 2) === 't2' && typeFor(33) === 't2' && typeFor(28, 1) === 'studio' && typeFor(95, 4) === 't3'; }));
    ok(T('option ventes réelles DVF'), await p.evaluate(() => { const t = QSEL, a = calcIris(t).cost; H.dvf = false; const b = calcIris(t).cost; H.dvf = true; return a !== b; }));
    ok(T('pastilles de vente sur la carte'), await p.evaluate(() => document.querySelectorAll('.vpin').length > 5));
    // fiche annonce
    await p.evaluate(() => openAd('v', 'lemans', ADS.lemans.ventes[0][3])); await p.waitForTimeout(500);
    ok(T('le fil suit le quartier de l\'annonce'), await p.evaluate(() => { const t = adQuart(AD); return !t || document.getElementById('crumbs').textContent.includes(t.name); }));
    const nego = await p.evaluate(() => document.querySelector('.nego')?.innerText || '');
    ok(T('bloc prix maximum'), /Prix maximum à payer/.test(nego) && /AUTOFINANC/i.test(nego));
    const s0 = await p.evaluate(() => AD.suf);
    await p.click('[data-adstep="1"]'); await p.waitForTimeout(400);
    ok(T('annonce suivante'), await p.evaluate(s => AD && AD.suf !== s, s0));
    ok(T('pas de débordement avec la fiche ouverte'), await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    ok(T('scénarios et impôts dans la fiche'), await p.evaluate(() => !!document.querySelector('#qDetail .scnt') && !!document.querySelector('#qDetail .b2n')));
    ok(T('panneau sans défilement interne'), await p.evaluate(() => { const s = document.getElementById('side'); return s.scrollHeight <= s.clientHeight + 2; }));
    // biens : statut, annuler, suppression
    await p.evaluate(() => { AD = null; QSEL = null; draw(); renderQBox(); });
    await scr('short');
    await p.evaluate(async () => { await DB.collection('biens').add(Object.assign(venteBien('lemans', ADS.lemans.ventes[1]), {statut: 'à voir', fav: false, ts: Date.now()})); }); await p.waitForTimeout(400);
    await p.click('#shortList [data-stmenu]'); await p.click('.stmenu [data-stset$="|visité"]'); await p.waitForTimeout(300);
    ok(T('statut suivant'), await p.evaluate(() => BIENS[0].statut === 'visité'));
    await p.click('#toast button'); await p.waitForTimeout(300);
    ok(T('annuler le statut'), await p.evaluate(() => BIENS[0].statut === 'à voir'));
    await p.click('#shortList [data-stmenu]'); await p.click('.stmenu [data-stset$="|offre faite"]'); await p.waitForTimeout(300);
    await p.click('#shortList [data-stmenu]'); await p.click('.stmenu [data-stset$="|à voir"]'); await p.waitForTimeout(300);
    ok(T('statut dans les deux sens'), await p.evaluate(() => BIENS[0].statut === 'à voir'));
    await p.click('#shortList .btitle'); await p.waitForTimeout(400);
    ok(T('fiche complète du bien'), await p.evaluate(() => AD && AD.kind === 'b' && !!document.querySelector('#qDetailBody .nego') && !!document.querySelector('#qDetailBody .b2n')));
    await p.evaluate(() => { AD = null; QSEL = null; draw(); renderQBox(); });
    await p.click('#shortList [data-unshort]'); await p.waitForTimeout(300);
    ok(T('retirer de la shortlist'), await p.evaluate(() => BIENS[0].statut === 'écarté' && !document.querySelector('#shortList .bcard')));
    await p.click('#toast button'); await p.waitForTimeout(300);
    ok(T('annuler le retrait'), await p.evaluate(() => BIENS[0].statut === 'à voir' && !!document.querySelector('#shortList .bcard')));
    ok(T('prix à viser dans la shortlist'), await p.evaluate(() => !!document.querySelector('#shortList .btg')));
    await scr('plus'); await p.evaluate(() => showTab('tab-biens')); await p.waitForTimeout(200);
    await p.click('#biensList [data-del]'); await p.waitForTimeout(300);
    const d0 = await p.evaluate(() => BIENS.length); await p.click('#toast button'); await p.waitForTimeout(400);
    ok(T('supprimer puis annuler'), d0 === 0 && await p.evaluate(() => BIENS.length === 1));
    // listes repliées
    ok(T('listes repliées à 8'), await p.evaluate(() => [...document.querySelectorAll('.scrollbox')].every(s => [...s.querySelectorAll('tbody tr')].filter(t => !t.hidden && !t.classList.contains('more')).length <= 9)));
    }
    if (n === 'tel') {
      const go = async k => { await p.evaluate(k => { mPopAll(); mShow(k); }, k); await p.waitForTimeout(350); };
      ok(T('barre d\'onglets à 5 écrans'), await p.evaluate(() => document.querySelectorAll('#mTab [data-mtab]').length === 5 && document.querySelector('.wrap').offsetHeight === 0));
      const over = [];
      for (const k of ['carte', 'annonces', 'short', 'budget', 'plus']) { await go(k); if (!(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))) over.push(k); }
      ok(T('aucun écran ne déborde'), !over.length, over.join(','));
      await go('carte');
      ok(T('carte plein écran avec feuille'), await p.evaluate(() => { const r = document.querySelector('#mMap .mapbox').getBoundingClientRect(); return r.height > innerHeight * 0.7 && /Le Mans|Saint|Angers|Caen|Orléans|Laval|Rennes|Nantes|Tours/.test(document.getElementById('mSheetIn').innerText); }));
      await p.evaluate(() => { SEL = 'lemans'; const t = IR.lemans.list.find(x => x.code === '0202'); QSEL = t; render(); flyTo(t.bb, 3.2); }); await p.waitForTimeout(900);
      ok(T('quartier dans la feuille'), await p.evaluate(() => /Gare/.test(document.querySelector('#mSheetIn h2').textContent) && !!document.querySelector('#mSheetIn .fsec[data-sec=prix]')));
      await p.click('#mSheetIn .mmini'); await p.waitForTimeout(500);
      ok(T('fiche plein écran depuis la carte'), await p.evaluate(() => !!document.querySelector('.mpush.in .mdp') && !!document.querySelector('.mpush.in .mcta')));
      await p.waitForTimeout(400);
      ok(T('fiche complète dans le même écran'), await p.evaluate(() => !!document.querySelector('.mpush.in .scnbox') && !!document.querySelector('.mpush.in .nego') && !!document.querySelector('.mpush.in .b2n')));
      await p.goBack(); await p.waitForTimeout(500);
      ok(T('bouton retour du téléphone ferme la fiche'), await p.evaluate(() => STACK.length === 0));
      ok(T('dézoom plus large sur la carte'), await p.evaluate(() => KMIN() < Math.max(VW / WW, VH / MAP.H)));
      await go('annonces');
      ok(T('classement de toutes les annonces'), await p.evaluate(() => { const n = Object.values(ADS).reduce((s, A) => s + ((A && A.ventes) || []).length, 0); return document.querySelectorAll('#mFeed .mcard').length === Math.min(20, n) && /studios? à vendre/.test(document.getElementById('mACount').textContent); }));
      const irr = await p.evaluate(() => [...document.querySelectorAll('#mFeed .mci')].slice(0, 5).map(e => parseFloat(e.textContent.replace(',', '.'))));
      ok(T('trié par rendement'), irr.every((v, i) => !i || v <= irr[i - 1] + 0.01), irr.join(' '));
      await p.click('[data-mfc="stnazaire"]'); await p.waitForTimeout(300);
      ok(T('filtre par ville'), await p.evaluate(() => document.querySelectorAll('#mFeed .mcard').length > 0 && [...document.querySelectorAll('#mFeed .mcs')].every(e => /Saint-Nazaire/.test(e.textContent))));
      await p.click('[data-mfsort]'); await p.waitForTimeout(200);
      ok(T('changer le tri'), await p.evaluate(() => MF.sort === 'cf'));
      await p.click('#mFeed .mstar'); await p.waitForTimeout(500);
      ok(T('étoile ajoute à la shortlist'), await p.evaluate(() => BIENS.length === 1 && !!document.querySelector('#mFeed .mstar.on')));
      await go('short');
      ok(T('shortlist en liste'), await p.evaluate(() => document.querySelectorAll('#mShort .msw').length === 1));
      await p.click('#mShort .mswc'); await p.waitForTimeout(500);
      ok(T('fiche du bien'), await p.evaluate(() => !!document.querySelector('.mpush.in [data-visit]') && !!document.querySelector('.mpush.in .stp')));
      await p.evaluate(() => mPop()); await p.waitForTimeout(350);
      await p.evaluate(() => { const r = document.querySelector('#mShort .msw'); r.querySelector('.mswc').style.transform = 'translateX(-172px)'; r.classList.add('open'); });
      await p.click('#mShort .mswb.next'); await p.waitForTimeout(400);
      ok(T('action glissée : statut suivant'), await p.evaluate(() => BIENS[0].statut === 'visité'));
      await go('budget');
      const t0 = await p.evaluate(() => H.taux); await p.click('[data-mstep="taux|1"]'); await p.waitForTimeout(300);
      ok(T('budget : bouton + sur le taux'), await p.evaluate(t0 => Math.abs(H.taux - t0 - 0.05) < 1e-6 && /4,1/.test(document.querySelector('[data-mstep="taux|1"]').previousElementSibling.textContent), t0));
      await p.click('label.mtg:has([data-mtgl="f-pess"])'); await p.waitForTimeout(300);
      ok(T('budget : interrupteur scénario pessimiste'), await p.evaluate(() => H.pess === true));
      await p.click('label.mtg:has([data-mtgl="f-pess"])'); await p.waitForTimeout(200);
      await p.evaluate(() => { mPopAll(); mShow('annonces'); }); await p.waitForTimeout(200); await p.evaluate(() => mShow('budget')); await p.waitForTimeout(200);
      await p.goBack(); await p.waitForTimeout(400);
      ok(T('retour : onglet précédent'), await p.evaluate(() => MS === 'annonces'));
      await p.evaluate(async () => { while (NAV.length) { history.back(); await new Promise(r => setTimeout(r, 120)); } }); await p.waitForTimeout(300);
      await p.evaluate(() => history.back()); await p.waitForTimeout(500);
      ok(T('retour à la racine : demande un second retour'), await p.evaluate(() => /encore une fois/.test(document.getElementById('toast').textContent) && !!document.getElementById('mApp')));
      await go('plus'); await p.click('[data-mgo="rank"]'); await p.waitForTimeout(400);
      ok(T('plus : classement des villes'), await p.evaluate(() => document.querySelectorAll('.mpush.in #tbody tr').length >= 10));
      await p.evaluate(() => mPop()); await p.waitForTimeout(350);
      ok(T('retour : bloc rendu à la page'), await p.evaluate(() => !!document.querySelector('#tabsSec #p-rank')));
    }
    if (n === 'ordi') {
      await p.evaluate(() => { showTab('tab-ann'); }); await p.waitForTimeout(300);
      ok(T('classement de toutes les annonces'), await p.evaluate(() => document.querySelectorAll('#annBox tbody tr').length === Math.min(30, allVentes().length)));
      await p.click('#annBox [data-dfs="cf"]'); await p.waitForTimeout(200);
      const cfs = await p.evaluate(() => [...document.querySelectorAll('#annBox tbody tr')].slice(0, 6).map(r => parseFloat(r.cells[6].textContent.replace('−', '-').replace(/[^0-9,.-]/g, '').replace(',', '.'))));
      ok(T('tri par cash-flow'), cfs.every((v, i) => !i || v <= cfs[i - 1]), cfs.join(' '));
      await p.click('#annBox tbody tr td:nth-child(3)'); await p.waitForTimeout(400);
      ok(T('ligne du classement ouvre la fiche'), await p.evaluate(() => AD && AD.kind === 'v'));
      ok(T('meilleures annonces : 12 cartes'), await p.evaluate(() => document.querySelectorAll('#dealsList .bcard').length === Math.min(12, allVentes().filter(v => v.r.x.irr != null && bankOk(v.r.x.ratio) && !horsCalcul(v.a[3])).length)));
    }
    ok(T('aucune erreur JavaScript'), errs.length === 0, errs.join(' | '));
    await c.close();
  }
  // accueil « Où on en est » et suivi de l'achat
  { const c = await b.newContext({viewport: {width: 1300, height: 900}}); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
    await p.goto(URL); await p.waitForTimeout(1000);
    ok('ordi · accueil : étape 2 sur 6 sans bien suivi', await p.evaluate(() => /Étape 2 sur 6/.test(document.getElementById('homePanel').textContent) && document.querySelectorAll('#homePanel .hcity').length === 3));
    await p.evaluate(async () => { await DB.collection('biens').add(Object.assign(venteBien('lemans', ADS.lemans.ventes[2]), {statut: 'offre faite', fav: false, ts: Date.now(), suivi: {offre: '2030-01-05'}})); }); await p.waitForTimeout(500);
    ok('ordi · accueil : offre en cours, réponse attendue', await p.evaluate(() => /Étape 4 sur 6/.test(document.getElementById('homePanel').textContent) && /Réponse du vendeur/.test(document.getElementById('homePanel').textContent)));
    await p.evaluate(() => openAd('b', BIENS[0].ville, BIENS[0].id)); await p.waitForTimeout(500);
    ok('ordi · fiche : rubrique suivi de l\'achat', await p.evaluate(() => !!document.querySelector('#qDetail .fsec[data-sec=suivi] .suivi')));
    await p.evaluate(() => { const i = document.querySelector('#qDetail [data-suivi$="|compromis"]'); i.value = '2030-01-20'; i.dispatchEvent(new Event('change', {bubbles: true})); }); await p.waitForTimeout(600);
    ok('ordi · date de compromis : statut compromis, fin de rétractation au 30 janvier', await p.evaluate(() => BIENS[0].statut === 'compromis' && /30 janv\. 2030|30 janv/.test(document.querySelector('#qDetail .fsec[data-sec=suivi]').textContent)), await p.evaluate(() => BIENS[0].statut));
    ok('ordi · accueil et suivi sans erreur', errs.length === 0, errs.join(' | '));
    await c.close(); }
  { const c = await b.newContext({...devices['iPhone 13']}); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
    await p.goto(URL); await p.waitForTimeout(1000);
    ok('tel · ouverture sur l\'accueil', await p.evaluate(() => MS === 'accueil' && !!document.querySelector('#mAcc .hstep') && document.querySelector('#mTab [data-mtab]').dataset.mtab === 'accueil'));
    await p.click('#mAcc .hcity'); await p.waitForTimeout(500);
    ok('tel · accueil : une ville ouvre l\'explorateur', await p.evaluate(() => MS === 'carte'));
    ok('tel · accueil sans erreur', errs.length === 0, errs.join(' | '));
    await c.close(); }
  // lien partagé #ville-quartier : la fiche du quartier s'ouvre au chargement
  { const c = await b.newContext({viewport: {width: 1300, height: 900}}); const p = await c.newPage(); await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
    await p.goto(URL + '#lemans-0202'); await p.waitForTimeout(1200);
    ok('ordi · lien #lemans-0202 ouvre le quartier', await p.evaluate(() => SEL === 'lemans' && QSEL && QSEL.code === '0202' && location.hash === '#lemans-0202'), await p.evaluate(() => JSON.stringify([SEL, QSEL && QSEL.code, location.hash])));
    await c.close(); }
  // adresse exacte (services simulés)
  { const c = await b.newContext({viewport: {width: 1300, height: 900}}); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/cdnjs.cloudflare.com/**', r => r.abort());
    await p.route('**/data.geopf.fr/geocodage/**', r => r.fulfill({contentType: 'application/json', body: JSON.stringify({features: [{properties: {label: '10 Rue Gougeard 72000 Le Mans', city: 'Le Mans', postcode: '72000', type: 'housenumber'}, geometry: {coordinates: [0.1915, 47.9975]}}]})}));
    await p.route('**/routing.openstreetmap.de/**', r => r.fulfill({contentType: 'application/json', body: JSON.stringify({durations: [[0, 300, 2400, 900]], distances: [[0, 400, 3000, 1100]]})}));
    await p.route('**/www.georisques.gouv.fr/**', r => { const u = r.request().url(); r.fulfill({contentType: 'application/json', body: u.includes('rga') ? '{"codeExposition":"1"}' : u.includes('ssp') ? '{"casias":{"results":2},"conclusions_sis":{"results":0},"instructions":{"results":0}}' : '{"results":0}'}); });
    await p.goto(URL); await p.waitForTimeout(900);
    await p.evaluate(() => showTab('tab-biens')); await p.waitForTimeout(200);
    await p.fill('#biensForm .adrin', '10 rue Gougeard Le Mans'); await p.waitForTimeout(700);
    await p.click('#biensForm [data-adrpick]'); await p.waitForTimeout(800);
    ok('ordi · adresse : ville et quartier trouvés', await p.evaluate(() => document.getElementById('b-ville').value === 'lemans' && !!document.getElementById('b-quartier').value));
    await p.fill('#biensForm [name=prix]', '60000'); await p.fill('#biensForm [name=surface]', '22'); await p.click('#biensForm [type=submit]'); await p.waitForTimeout(600);
    ok('ordi · adresse enregistrée avec trajets et risques', await p.evaluate(() => BIENS.length === 1 && BIENS[0].lat > 47 && BIENS[0].geo && BIENS[0].geo.foot.length === 3 && !!BIENS[0].geo.risq));
    ok('ordi · adresse sans erreur', errs.length === 0, errs.join(' | '));
    await c.close(); }
  // vraie carte (fonds de carte et Leaflet simulés hors ligne)
  const LJ = process.env.LEAFLET_JS || path.join(__dirname, 'vendor/leaflet-1.9.4.js');   // Leaflet servi depuis le dépôt : tests de la vraie carte sans réseau
  if (!require('fs').existsSync(LJ)) { ok('vraie carte : Leaflet introuvable (' + LJ + ')', false); } else {
    const fs = require('fs'); const c = await b.newContext({...devices['iPhone 13']}); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    await p.route('**/tile.openstreetmap.org/**', r => r.fulfill({body: png, contentType: 'image/png'}));
    await p.route('**/cdnjs.cloudflare.com/ajax/libs/leaflet/**', r => r.fulfill({body: fs.readFileSync(LJ), contentType: 'application/javascript'}));
    await p.goto(URL); await p.waitForTimeout(2500);
    ok('tel · vraie carte chargée', await p.evaluate(() => LEAF.on && document.querySelectorAll('#mLeaf .leaflet-tile').length > 0));
    await p.evaluate(() => leafCity('lemans')); await p.waitForTimeout(1400);
    ok('tel · quartiers sur la vraie carte', await p.evaluate(() => Object.keys(LEAF.poly).length > 200 && !!document.querySelector('#mLeaf canvas')));
    await p.evaluate(() => { const t = IR.lemans.list.find(x => x.code === '0202'); LEAF.map.setView(unproj(t.cx, t.cy), 14.5, {animate: false}); }); await p.waitForTimeout(600);
    await p.evaluate(() => document.querySelector('.lpin').dispatchEvent(new MouseEvent('click', {bubbles: true}))); await p.waitForTimeout(600);
    ok('tel · pastille de prix ouvre la fiche', await p.evaluate(() => STACK.length === 1 && !!document.querySelector('.mpush.in .mdp')));
    // lien vers un quartier depuis un autre écran : la carte était cachée (taille nulle), le zoom doit attendre son affichage
    await p.evaluate(() => { mPopAll(); mShow('annonces'); }); await p.waitForTimeout(500);
    await p.evaluate(() => { const b = document.createElement('button'); b.dataset.mgoq = 'lemans|0101'; b.id = 'tq'; document.getElementById('mFeed').appendChild(b); b.click(); }); await p.waitForTimeout(1600);
    ok('tel · lien vers un quartier depuis les annonces', await p.evaluate(() => MS === 'carte' && QSEL && QSEL.code === '0101' && LEAF.map.getZoom() >= 13 && !LEAF.pending), await p.evaluate(() => JSON.stringify([MS, QSEL && QSEL.code, LEAF.map.getZoom(), !!LEAF.pending])));
    ok('tel · vraie carte sans erreur', errs.length === 0, errs.join(' | '));
    await c.close();
    // ordinateur
    { const c = await b.newContext({viewport: {width: 1300, height: 900}}); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.route('**/tile.openstreetmap.org/**', r => r.fulfill({body: png, contentType: 'image/png'}));
      await p.route('**/cdnjs.cloudflare.com/ajax/libs/leaflet/**', r => r.fulfill({body: fs.readFileSync(LJ), contentType: 'application/javascript'}));
      await p.goto(URL); await p.waitForTimeout(2500);
      ok('ordi · vraie carte chargée', await p.evaluate(() => LEAF.on && document.querySelector('#mapSec .mapbox #mLeaf') && document.querySelector('#mLeaf').offsetHeight > 300));
      await p.evaluate(() => leafCity('stnazaire')); await p.waitForTimeout(1300);
      ok('ordi · ville choisie, quartiers sous la carte', await p.evaluate(() => SEL === 'stnazaire' && !document.getElementById('qBox').hidden && !document.getElementById('qAll').hidden && document.querySelectorAll('#zBody tr').length > 5 && !document.querySelector('#qCard .annb')));
      await p.evaluate(() => { const t = IR.lemans.list.find(x => x.code === '0202'); LEAF.map.setView(unproj(t.cx, t.cy), 14.5, {animate: false}); }); await p.waitForTimeout(800);
      await p.evaluate(() => document.querySelector('.lpin').dispatchEvent(new MouseEvent('click', {bubbles: true}))); await p.waitForTimeout(600);
      ok('ordi · pastille ouvre la fiche à droite', await p.evaluate(() => AD && AD.kind === 'v' && /Prix maximum/.test(document.getElementById('qDetailBody').innerText)));
      await p.click('#zIn'); await p.waitForTimeout(400);
      ok('ordi · boutons de zoom', await p.evaluate(() => LEAF.map.getZoom() > 14.6));
      ok('ordi · vraie carte sans erreur', errs.length === 0, errs.join(' | '));
      await c.close(); }
  }
  await b.close();
  let bad = 0; for (const [name, pass, info] of res) { if (!pass) bad++; console.log((pass ? '✓ ' : '✗ ') + name + (pass || !info ? '' : '  → ' + info)); }
  console.log(`\n${res.length - bad}/${res.length} tests réussis`); process.exit(bad ? 1 : 0);
})();
