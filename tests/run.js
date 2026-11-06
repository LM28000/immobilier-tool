// Tests de bout en bout : node tests/run.js  (après python3 build.py)
const {chromium, devices} = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../dist/test.html');
const res = []; const ok = (n, c, info = '') => { res.push([n, !!c, info]); };
const VIEWS = [['ordi', {viewport: {width: 1300, height: 900}}], ['tel', {...devices['iPhone 13']}]];

async function page(b, o) {
  const c = await b.newContext(o); const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
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
    ok(T('données réelles du quartier (DVF, trajets)'), await p.evaluate(() => { const q = document.querySelector('.qreal'); return !!q && /studios? vendus?/.test(q.innerText) && /à pied/.test(q.innerText); }));
    ok(T('option ventes réelles DVF'), await p.evaluate(() => { const t = QSEL, a = calcIris(t).cost; H.dvf = false; const b = calcIris(t).cost; H.dvf = true; return a !== b; }));
    ok(T('pastilles de vente sur la carte'), await p.evaluate(() => document.querySelectorAll('.vpin').length > 5));
    // fiche annonce
    await p.evaluate(() => openAd('v', 'lemans', ADS.lemans.ventes[0][3])); await p.waitForTimeout(500);
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
    if (n === 'tel') {
      ok(T('barre d\'onglets à 5 écrans'), await p.evaluate(() => document.querySelectorAll('.mnav [data-ms]').length === 5 && getComputedStyle(document.querySelector('.mnav')).display !== 'none'));
      let over = [];
      for (const k of ['carte', 'annonces', 'short', 'fin', 'plus']) { await scr(k); if (!(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))) over.push(k); }
      ok(T('aucun écran ne déborde'), !over.length, over.join(','));
      await scr('carte');
      ok(T('carte plein écran'), await p.evaluate(() => { const r = document.querySelector('.mapbox').getBoundingClientRect(), nav = document.querySelector('.mnav').getBoundingClientRect(); return r.height > innerHeight * 0.55 && r.bottom <= nav.top + 1; }));
      await p.click('#mapChip'); await p.waitForTimeout(300);
      ok(T('fiche de la ville en plein écran'), await p.evaluate(() => !document.getElementById('mDet').hidden && document.getElementById('detail').offsetHeight > 200));
      await p.click('[data-mdetclose]');
      await scr('annonces');
      ok(T('annonces en cartes'), await p.evaluate(() => { const tr = document.querySelector('#mAnn table.vt tbody tr'); return !!tr && getComputedStyle(tr).display === 'grid'; }));
      await p.click('#mCities [data-mcity="stnazaire"]'); await p.waitForTimeout(400);
      ok(T('choix de la ville dans Annonces'), await p.evaluate(() => SEL === 'stnazaire' && /Saint-Nazaire/.test(document.getElementById('qBox').innerText)));
      await scr('fin');
      ok(T('écran financement visible'), await p.evaluate(() => document.getElementById('setPanel').offsetHeight > 300));
    }
    ok(T('aucune erreur JavaScript'), errs.length === 0, errs.join(' | '));
    await c.close();
  }
  await b.close();
  let bad = 0; for (const [name, pass, info] of res) { if (!pass) bad++; console.log((pass ? '✓ ' : '✗ ') + name + (pass || !info ? '' : '  → ' + info)); }
  console.log(`\n${res.length - bad}/${res.length} tests réussis`); process.exit(bad ? 1 : 0);
})();
