#!/usr/bin/env node
// Serveur MCP « Notre studio » : une IA (Claude Code, Claude Desktop…) interroge l'outil comme vous le feriez dans l'app.
// Les chiffres sont ceux de l'app : le serveur ouvre la page construite (dist/test.html) dans un navigateur invisible
// et appelle ses fonctions de calcul. Rien n'est recalculé à part, rien ne diverge.
// Lancement : node mcp/serveur.mjs (après python3 build.py). Voir mcp/README.md.
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {z} from "zod";
import {chromium} from "playwright";
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import {fileURLToPath} from "node:url";

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = path.join(R, "dist/test.html");
const CFG = path.join(os.homedir(), ".config/immobilier-tool");
const HYPF = path.join(CFG, "hypotheses.json");
const log = (...a) => console.error("[notre-studio]", ...a);   // stdout est réservé au protocole MCP

let browser = null, page = null, loadedAt = 0;
async function getPage() {
  if (!fs.existsSync(PAGE)) throw new Error("dist/test.html introuvable : lancez d'abord python3 build.py");
  const mt = fs.statSync(PAGE).mtimeMs;
  if (page && mt === loadedAt) return page;
  if (!browser) browser = await chromium.launch();
  if (page) await page.close().catch(() => {});
  const ctx = await browser.newContext({viewport: {width: 1300, height: 900}});
  page = await ctx.newPage();
  await page.route("**/*", r => r.request().url().startsWith("file:") ? r.continue() : r.abort());   // calcul seul : aucun appel réseau
  await page.goto("file://" + PAGE); await page.waitForFunction(() => typeof calcBien === "function" && typeof IR === "object", null, {timeout: 20000});
  loadedAt = mt;
  // registre des copropriétés (data/copro/<ville>.js, fichiers locaux) : toutes les villes, une fois
  await page.evaluate(async () => { const L = [typeof coproData === "function" && coproData, typeof concData === "function" && concData].filter(Boolean); Object.keys(ADS).forEach(ck => L.forEach(f => f(ck)));
    for (let i = 0; i < 200 && Object.keys(ADS).some(ck => L.some(f => f(ck) === undefined)); i++) await new Promise(r => setTimeout(r, 50)); }).catch(() => {});
  const hyp = lireHyp(); if (Object.keys(hyp).length) await page.evaluate(h => { Object.assign(H, h); if (typeof assocFromLegacy === "function") assocFromLegacy(h); if (h.type) setType(h.type, true); CALCC.clear(); VC.clear(); Object.keys(TGC).forEach(k => delete TGC[k]); }, hyp);
  log("page chargée", new Date(mt).toISOString());
  return page;
}
const lireHyp = () => { try { return JSON.parse(fs.readFileSync(HYPF, "utf8")); } catch { return {}; } };
const run = async (fn, arg) => (await getPage()).evaluate(fn, arg);
const ok = obj => ({content: [{type: "text", text: JSON.stringify(obj, null, 1)}]});
const err = e => ({isError: true, content: [{type: "text", text: "Erreur : " + (e && e.message || e)}]});
const wrap = f => async a => { try { return ok(await f(a || {})); } catch (e) { return err(e); } };

// code exécuté dans la page : quelques aides communes, déclarées une fois
const AIDES = `
 window.__r=v=>v==null||!isFinite(v)?null:Math.round(v*10)/10;
 window.__chercher=(lien)=>{const id=String(lien||"").split("?")[0].replace(/\\/$/,"").split("/").pop();
  for(const [ck,v] of Object.entries(ADSRAW)){if(!v||typeof v!=="object"||!v.map) continue;
   for(const ty of ["studio","t2","t3"]){const L=ty==="studio"?v.ventes:((v.t||{})[ty]||{}).ventes; const a=(L||[]).find(x=>String(x[3]).split("/").pop()===id); if(a) return {ck,ty,a};}}
  return null;};
 window.__resume=(ck,a)=>{const vb=venteBien(ck,a), r=calcBien(vb), x=r.x, f=ficx(a[3])||{}, g=targetsFor(vb);
  return {lien:VTURL+a[3],ville:cityName(ck),quartier:vb.quartier||null,secteur:a[1]||null,type:vb.type,surface_m2:a[0],prix:a[2],prix_m2:Math.round(a[2]/a[0]),
   rendement_15ans_pct:__r(x.irr),cashflow_mois:Math.round(x.cf),budget_tout_compris:Math.round(x.cost),loyer_hc:Math.round(x.rentHC),endettement_pct:Math.round(x.ratio*100),
   prix_autofinance:g.cf,prix_7pct:g.r7,dpe:f.dpe||null,dpe_annonce:f.dpe0||null,charges_copro_an:f.cop||null,signaux:(f.fl||[]).map(k=>DFL[k]?DFL[k][1]:k),calcul_applicable:!horsCalcul(a[3])};};`;
async function aides() { const p = await getPage(); if (!(await p.evaluate(() => !!window.__resume))) await p.evaluate(AIDES); }

const server = new McpServer({name: "notre-studio", version: "1.0.0"}, {instructions:
  "Outil « Où acheter notre studio ? » : 22 villes de l'Ouest, quartiers IRIS, annonces Bien'ici relevées chaque soir dans chaque ville, calcul LMNP (crédit, impôts, revente, TRI sur 15 ans). " +
  "Les montants sont en euros ; « rendement_15ans_pct » est le rendement annuel de l'apport revente comprise. Les résidences gérées, viagers et biens non louables (insalubres, moins de 9 m² habitables) sont signalés : le calcul ne s'y applique pas. " +
  "Ce sont des estimations, pas un conseil financier ; citez les liens des annonces."});

server.registerTool("classement_villes", {title: "Classement des villes", description: "Les 22 villes classées par rendement sur 15 ans pour le type de bien choisi, avec cash-flow, budget, loyer, endettement et nombre d'annonces. Le chiffre d'une ville est celui de son quartier du milieu (quartiers classés par rendement, comptés selon leurs ventes).",
  inputSchema: {type: z.enum(["studio", "t2", "t3"]).optional().describe("type de bien (par défaut : celui des réglages)")}},
  wrap(async ({type}) => { await aides(); return run(ty => { const t0 = H.type; if (ty) setType(ty, true);
    const out = all().map(({c, x}) => ({ville: c.name, cle: c.k, rendement_15ans_pct: __r(x.irr), cashflow_mois: Math.round(x.cf), budget_tout_compris: Math.round(x.cost), loyer_hc: Math.round(x.rentHC), endettement_pct: Math.round(x.ratio * 100), banque: bank(x.ratio)[1], annonces_a_vendre: ADS[c.k] && ADS[c.k].ventes ? ADS[c.k].ventes.length : 0, quartier_du_milieu: x.qt ? x.qt.name : null, hausse_prix_pct_an: __r(H.px + pxDev(c.k)), mois_vides_ville: __r(vacVille(c.k)), note: c.note || null}))
      .sort((a, b) => (b.rendement_15ans_pct ?? -99) - (a.rendement_15ans_pct ?? -99));
    if (ty) setType(t0, true); return {type: ty || H.type, villes: out}; }, type); }));

server.registerTool("quartiers", {title: "Quartiers d'une ville", description: "Les quartiers (IRIS) d'une ville classés par rendement, avec budget, loyer, mois vides estimés et nombre d'annonces.",
  inputSchema: {ville: z.string().describe("nom ou clé de la ville, ex. « Le Mans » ou « lemans »"), n: z.number().int().min(1).max(80).optional().describe("nombre de quartiers (10 par défaut)")}},
  wrap(async ({ville, n}) => { await aides(); return run(([v, n]) => { const c = C.find(c => c.k === v || c.name.toLowerCase() === String(v).toLowerCase()); if (!c) throw new Error("ville inconnue : " + v + " (villes : " + C.map(c => c.name).join(", ") + ")");
    const z = IR[c.k]; if (!z) return {ville: c.name, quartiers: []};
    const L = z.list.filter(t => t.price && t.type === "H").map(t => { const x = calcIris(t), d = demandOf(t), sec = sectorOf(t);
      return {quartier: t.name, code_iris: t.code, rendement_15ans_pct: __r(x.irr), cashflow_mois: Math.round(x.cf), budget_tout_compris: Math.round(x.cost), loyer_hc: Math.round(x.rentHC), mois_vides_par_an: d ? __r(d.vac) : null, annonces_a_vendre: sec && ADS[c.k] ? ADS[c.k].ventes.filter(a => a[1] === sec).length : 0}; })
      .sort((a, b) => (b.rendement_15ans_pct ?? -99) - (a.rendement_15ans_pct ?? -99)).slice(0, n || 10);
    return {ville: c.name, type: H.type, quartiers: L}; }, [ville, n]); }));

server.registerTool("annonces", {title: "Annonces à vendre", description: "Annonces à vendre du type choisi, classées et filtrées, avec le calcul complet et les prix à viser. Les résidences gérées, viagers et biens non louables sont exclus par défaut.",
  inputSchema: {ville: z.string().optional(), tri: z.enum(["rendement", "cashflow", "prix", "nouveautes", "ecart_prix_vise"]).optional(), n: z.number().int().min(1).max(50).optional(),
    prix_max: z.number().optional(), dpe_max: z.enum(["A", "B", "C", "D", "E", "F", "G"]).optional(), inclure_residences_gerees: z.boolean().optional(), seulement_banque_ok: z.boolean().optional()}},
  wrap(async a => { await aides(); return run(o => { const c = o.ville ? C.find(c => c.k === o.ville || c.name.toLowerCase() === o.ville.toLowerCase()) : null; if (o.ville && !c) throw new Error("ville inconnue : " + o.ville);
    let L = allVentes().filter(v => (!c || v.ck === c.k) && (o.inclure_residences_gerees || !horsCalcul(v.a[3])) && (!o.prix_max || v.a[2] <= o.prix_max) && (!o.seulement_banque_ok || bankOk(v.r.x.ratio)));
    if (o.dpe_max) L = L.filter(v => { const f = ficx(v.a[3]); return !f || !f.dpe || f.dpe <= o.dpe_max; });
    const R = L.map(v => Object.assign(__resume(v.ck, v.a), {_f: (hEntry(v.ck, v.a[3]) || {}).f || ""}));
    const k = o.tri || "rendement", by = {rendement: (p, q) => (q.rendement_15ans_pct ?? -99) - (p.rendement_15ans_pct ?? -99), cashflow: (p, q) => q.cashflow_mois - p.cashflow_mois, prix: (p, q) => p.prix - q.prix,
      nouveautes: (p, q) => q._f.localeCompare(p._f), ecart_prix_vise: (p, q) => (p.prix - Math.max(p.prix_autofinance || 0, p.prix_7pct || 0)) - (q.prix - Math.max(q.prix_autofinance || 0, q.prix_7pct || 0))};
    R.sort(by[k]); return {type: H.type, releve: ADS.date, total: R.length, annonces: R.slice(0, o.n || 10).map(({_f, ...x}) => Object.assign(x, {vue_le: _f || null}))}; }, a); }));

server.registerTool("fiche_annonce", {title: "Fiche complète d'une annonce", description: "Tout sur une annonce : description, photos, étage, DPE, charges, position, copropriété retrouvée dans le registre national (lots, époque, syndic), résidences étudiantes à 1 km et logements neufs autorisés à 500 m, bruit (grands axes, voies ferrées, zones des aéroports), zone tendue, calcul, prix à proposer (ouverture, cible, maximum), points d'attention et historique du prix.",
  inputSchema: {lien: z.string().describe("lien Bien'ici de l'annonce, ou son identifiant")}},
  wrap(async ({lien}) => { await aides(); return run(l => { const t = __chercher(l); if (!t) throw new Error("annonce introuvable dans le dernier relevé : " + l); const t0 = H.type; setType(t.ty, true);
    try { const res = __resume(t.ck, t.a), vb = venteBien(t.ck, t.a), lv = priceLevels(vb), F = ficheOf(t.ck, t.a[3]) || {}, h = hEntry(t.ck, t.a[3]) || {};
      const att = [...ficheAttn(t.a[3]).map(z => z[1]), ...(typeof coproAttn === "function" ? coproAttn(vb).map(z => z[1]) : []), ...(typeof concAttn === "function" ? concAttn(vb, null).map(z => z[1]) : []), ...(typeof bruitAttn === "function" ? bruitAttn(vb, calcBien(vb).t).map(z => z[1]) : [])];
      const br = (() => { if (typeof bruitOf !== "function") return null; const B = bruitOf(vb, calcBien(vb).t), k = ["voie_rapide", "grand_axe", "voie_ferree"];
        return {mesure: B.adr ? "à l'adresse" : "au centre du quartier", ...Object.fromEntries(k.map((n, i) => [n + "_m", B.v && B.v[i] ? B.v[i][0] : null])), zone_bruit_aeroport: B.peb ? {zone: B.peb.zone, aeroport: B.peb.nom} : null}; })();
      const cn = (() => { const J = typeof concData === "function" ? concData(t.ck) : null, pt = J ? concPoint(vb, calcBien(vb).t) : null; if (!J || !pt) return null; const A = concAround(J, pt.lat, pt.lon);
        return {mesure: pt.how, residences_etudiantes_1km: A.R.slice(0, 8).map(([d, x]) => ({nom: x[2], distance_m: Math.round(d), logements: x[3], source: x[4] === "crous" ? "Crous" : x[4] === "osm" ? "privée (OpenStreetMap)" : "permis de construire", etat: x[4] === "pc" ? CNET[x[5]] : "en service"})),
          logements_neufs_500m: {autorises_depuis: CN_DEPUIS, logements: A.s.n, studios: A.s.st, autorises_pas_commences: (A.s.e[2] || [0])[0], en_chantier: (A.s.e[5] || [0])[0], termines: (A.s.e[6] || [0])[0],
            plus_grands_projets: A.P.slice(0, 4).map(([d, x]) => ({logements: x[6], studios: x[7], type: x[10] ? CNTY[x[10]] : "logements", etat: CNET[x[3]], autorise: x[2], distance_m: Math.round(d), adresse: x[13] || null, demandeur: x[12] || null}))}}; })();
      const cp = (() => { const R = typeof coproOf === "function" ? coproOf(vb) : null; if (!R || R.wait || !R.m) return null; const m = R.m, J = R.J;
        if (!m.x) return {retrouvee: false, raison: {lots: "l'annonce ne donne pas le nombre de lots", position: "position trop approximative", floue: "position trop floue sans année de construction", plusieurs: "plusieurs copropriétés possibles", aucune: "aucune copropriété du registre avec ce nombre de lots à proximité"}[m.none] || m.none};
        const x = m.x; return {retrouvee: true, fiabilite: m.how === "parcelle" || m.how === "meme-adresse" ? "sûr" : "probable (environ 9 sur 10 justes)", immatriculation: x[2], lots: x[3], logements: x[5], parkings: x[6],
          construction: x[7] >= 0 ? J.per[x[7]][0] : null, syndic: x[9] === 1 || x[9] === 2 ? "aucun syndic en mandat" : x[8] === 1 ? "professionnel" + (x[10] >= 0 ? " : " + J.noms[x[10]] : "") : x[8] === 2 ? "bénévole" : "non précisé",
          mandat: CPMAN[x[9]], residence_service: !!(x[11] & 1), aidee_par_l_anah: !!(x[11] & 2), quartier_prioritaire: !!(x[11] & 4), adresse_du_reglement: x[13] || null, registre_a_jour_du: J.maj}; })();
      const r0 = calcBien(vb), qs = (r0.t && r0.t.price ? studioPm2(t.ck, r0.t) : studioPm2(t.ck, null)) * pm2Adj(t.ty, t.a[0]), em = ecartMarche(t.ck);
      return Object.assign(res, {ecart_prix_vs_ventes_du_quartier_pct: qs ? __r((t.a[2] / t.a[0] / qs - 1) * 100) : null, ecart_habituel_dans_la_ville_pct: em ? __r((em.med - 1) * 100) : null, prix_a_proposer: lv ? {ouverture: lv.ouv, cible: lv.cible, maximum: lv.max} : null, points_d_attention: att,
        description: F.d || null, photos: (F.ph || []).map(p => photoFull(t.a[3], p)), etage: F.et ?? null, etages: F.ets ?? null, ascenseur: F.asc ?? null, annee: F.an ?? null, chauffage: F.chauf || null,
        lots_copro: F.lots ?? null, copropriete_registre: cp, residences_et_chantiers: cn, bruit: br, zone_tendue: typeof ZTEN !== "undefined" ? ZTEN.has(t.ck) : null, frais_agence: F.frais || null, position: F.la != null ? {lat: F.la, lon: F.lo, precision_m: F.r} : null, en_ligne_au_moins_depuis: F.pub || null,
        historique_prix: (h.p || []).map(([d, p]) => ({date: d, prix: p})), premiere_vue: h.f || null}); } finally { setType(t0, true); } }, lien); }));

server.registerTool("simuler_bien", {title: "Simuler un bien", description: "Calcule un bien quelconque (une annonce d'un autre site, une contre-offre…) avec les réglages en cours : budget, loyer, cash-flow, rendement 15 ans, impôts, prix à viser.",
  inputSchema: {ville: z.string(), prix: z.number().positive(), surface: z.number().positive(), quartier: z.string().optional(), pieces: z.number().int().min(1).max(5).optional(),
    loyer_cc: z.number().optional().describe("loyer visé charges comprises, sinon estimé"), copro_mois: z.number().optional(), taxe_fonciere_an: z.number().optional(), travaux: z.number().optional()}},
  wrap(async o => { await aides(); return run(o => { const c = C.find(c => c.k === o.ville || c.name.toLowerCase() === o.ville.toLowerCase()); if (!c) throw new Error("ville inconnue : " + o.ville);
    let q = ""; if (o.quartier && IR[c.k]) { const t = IR[c.k].list.find(t => t.name.toLowerCase() === o.quartier.toLowerCase() || t.code === o.quartier); if (!t) throw new Error("quartier inconnu : " + o.quartier); q = t.name; }
    const b = {ville: c.k, quartier: q, prix: o.prix, surface: o.surface, pieces: o.pieces, loyer: o.loyer_cc || 0, copro: o.copro_mois || 0, tf: o.taxe_fonciere_an || 0, travaux: o.travaux || 0};
    const r = calcBien(b), x = r.x, lv = priceLevels(b);
    return {ville: c.name, quartier: q || null, type: b.pieces ? typeFor(o.surface, o.pieces) : typeFor(o.surface), rendement_15ans_pct: __r(x.irr), rendement_brut_pct: __r(x.brut), cashflow_mois: Math.round(x.cf), budget_tout_compris: Math.round(x.cost),
      emprunt: Math.round(x.P), mensualite: Math.round(x.mens), loyer_hc: Math.round(x.rentHC), mois_vides_par_an: __r(r.vac), impots_an1: Math.round(x.imp1), regime: x.regime, endettement_pct: Math.round(x.ratio * 100), banque: bank(x.ratio)[1],
      prix_a_proposer: lv ? {ouverture: lv.ouv, cible: lv.cible, maximum: lv.max} : null}; }, o); }));

server.registerTool("nouveautes", {title: "Nouveautés du dernier relevé", description: "Annonces apparues, baisses de prix et annonces disparues (vendues ou retirées) au dernier relevé, pour le type de bien choisi.", inputSchema: {}},
  wrap(async () => { await aides(); return run(() => { const N = nouveautes(); const f = o => ({lien: VTURL + o.suf, ville: cityName(o.ck), secteur: o.e.m && o.e.m[1] || null, surface_m2: o.e.m && o.e.m[0], prix: o.e.p[o.e.p.length - 1][1]});
    return {releve: ADS.date, type: H.type, nouvelles: N.nw.map(o => Object.assign(f(o), {calcul_applicable: !horsCalcul(o.suf)})), baisses: N.dr.map(o => Object.assign(f(o), {avant: o.e.p[o.e.p.length - 2][1]})), disparues: N.sold.map(f)}; }); }));

const HYPK = ["type", "surface", "apport", "taux", "duree", "notaire", "salaires", "pretEtud", "fraisVente", "vacance", "px", "pxV", "ly", "gestion", "pess", "net", "regime", "tmiA", "tmiB"];
server.registerTool("reglages", {title: "Réglages du calcul", description: "Lit ou change les hypothèses (apport, taux, durée, revenus, autres crédits, type de bien, tranches d'imposition…). Les changements sont gardés sur cet ordinateur (~/.config/immobilier-tool/hypotheses.json), jamais dans le dépôt.",
  inputSchema: {changer: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional().describe("ex. {\"taux\": 3.8, \"apport\": 20000, \"type\": \"t2\", \"salaires\": 3200}")}},
  wrap(async ({changer}) => { if (changer) { const bad = Object.keys(changer).filter(k => !HYPK.includes(k)); if (bad.length) throw new Error("réglages inconnus : " + bad.join(", ") + " (possibles : " + HYPK.join(", ") + ")");
      const h = Object.assign(lireHyp(), changer); fs.mkdirSync(CFG, {recursive: true}); fs.writeFileSync(HYPF, JSON.stringify(h, null, 1)); loadedAt = 0; }
    await aides(); return run(K => Object.fromEntries(K.map(k => [k, H[k]])), HYPK); }));

// liste « Nos biens » partagée (Supabase, code de groupe du Mac)
function sb() { const s = fs.readFileSync(path.join(R, "src/js/21-shortlist-partage.js"), "utf8"), m = s.match(/const SB=\{url:"([^"]+)",key:"([^"]+)"\}/);
  let code = process.env.SB_GROUPE || ""; try { code = code || fs.readFileSync(path.join(CFG, "groupe"), "utf8").trim(); } catch {}
  if (!m || code.length < 12) throw new Error("liste commune indisponible : code de groupe absent (~/.config/immobilier-tool/groupe)");
  return {base: m[1].replace(/\/$/, "") + "/rest/v1/biens", h: {apikey: m[2], "x-groupe": code, "Content-Type": "application/json"}, code}; }
async function sbGet() { const {base, h} = sb(); const r = await fetch(base + "?select=id,data,created_at&order=created_at.desc&limit=500", {headers: h}); if (!r.ok) throw new Error("Supabase : HTTP " + r.status); return (await r.json()).filter(x => !(x.data && x.data.kind === "reglages")); }   // la ligne des réglages communs n'est pas un bien
server.registerTool("nos_biens", {title: "Nos biens", description: "La liste partagée « Nos biens » : statut (à voir, visité, offre faite, compromis, acheté, écarté), calcul, prix à viser, visite et suivi de l'achat.", inputSchema: {inclure_ecartes: z.boolean().optional()}},
  wrap(async ({inclure_ecartes}) => { const rows = await sbGet(); await aides();
    return run(([rows, all]) => rows.map(x => normBien(x.id, x.data)).filter(b => all || !isOut(b)).map(b => { const r = calcBien(b), x = r.x, lv = (() => { try { return priceLevels(b); } catch { return null; } })(), nx = ["offre faite", "compromis", "acheté"].includes(b.statut) ? suiviNext(b) : null;
      return {id: b.id, titre: b.titre, statut: b.statut, ville: cityName(b.ville), quartier: b.quartier || null, prix: b.prix, surface_m2: b.surface, lien: b.url || null, rendement_15ans_pct: __r(x.irr), cashflow_mois: Math.round(x.cf),
        prix_a_proposer: lv ? {ouverture: lv.ouv, cible: lv.cible, maximum: lv.max} : null, note_visite: visitScore(b), rendez_vous: (b.visite || {}).rdv || null, offre: (b.visite || {}).offre || null, prochaine_etape: nx ? {etape: nx.l, date: nx.d} : null, notes: b.notes || null}; }), [rows, !!inclure_ecartes]); }));
server.registerTool("ajouter_bien", {title: "Ajouter une annonce à nos biens", description: "Ajoute une annonce du relevé à la liste partagée « Nos biens » (statut « à voir »). Visible aussitôt par les deux personnes.",
  inputSchema: {lien: z.string(), notes: z.string().max(200).optional()}, annotations: {destructiveHint: false}},
  wrap(async ({lien, notes}) => { await aides(); const {base, h, code} = sb();
    const bien = await run(([l, n]) => { const t = __chercher(l); if (!t) throw new Error("annonce introuvable dans le dernier relevé : " + l); const t0 = H.type; setType(t.ty, true);
      try { const vb = venteBien(t.ck, t.a); return {titre: vb.titre, url: vb.url, ville: t.ck, quartier: vb.quartier, type: vb.type, prix: t.a[2], surface: t.a[0], copro: vb.copro || 0, tf: vb.tf || 0, loyer: vb.loyer || 0, travaux: vb.travaux || 0, dpe: vb.dpe || "", notes: n || "", statut: "à voir", fav: false, par: "IA", ts: Date.now()}; } finally { setType(t0, true); } }, [lien, notes]);
    const deja = (await sbGet()).find(x => x.data && x.data.url === bien.url); if (deja) return {deja_dans_la_liste: true, id: deja.id, statut: deja.data.statut};
    const r = await fetch(base, {method: "POST", headers: Object.assign({}, h, {Prefer: "return=representation"}), body: JSON.stringify({groupe: code, data: bien})}); if (!r.ok) throw new Error("Supabase : HTTP " + r.status + " " + (await r.text()).slice(0, 200));
    const [row] = await r.json(); return {ajoute: true, id: row.id, titre: bien.titre}; }));
server.registerTool("changer_statut", {title: "Changer le statut d'un bien", description: "Change le statut d'un bien de « Nos biens » : à voir, visité, offre faite, compromis, acheté, écarté.",
  inputSchema: {id: z.string(), statut: z.enum(["à voir", "visité", "offre faite", "compromis", "acheté", "écarté"])}},
  wrap(async ({id, statut}) => { const {base, h} = sb(); const r0 = await fetch(base + "?select=data&id=eq." + encodeURIComponent(id), {headers: h}); const [row] = await r0.json(); if (!row) throw new Error("bien introuvable : " + id);
    const data = Object.assign({}, row.data, {statut}); const r = await fetch(base + "?id=eq." + encodeURIComponent(id), {method: "PATCH", headers: Object.assign({}, h, {Prefer: "return=minimal"}), body: JSON.stringify({data})});
    if (!r.ok) throw new Error("Supabase : HTTP " + r.status); return {id, statut, avant: row.data.statut}; }));

process.on("SIGINT", async () => { if (browser) await browser.close(); process.exit(0); });
await server.connect(new StdioServerTransport());
log("prêt");
