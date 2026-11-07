// Lit la fiche complète d'annonces Bien'ici (description, toutes les photos, charges, DPE, étage, position…), à lancer dans une page www.bienici.com déjà ouverte.
// Avant de lancer : remplacer le marqueur de la ligne « const IDS » par la liste donnée par « python3 tools/fiches.py todo » (10 annonces au plus par lancement).
// Une annonce à la fois, 1,5 s entre deux, exactement la requête que fait la page quand on ouvre l'annonce. Arrêt au premier refus (403/429) : on ne contourne pas un blocage.
// Renvoie le texte JSON {n, stop, fiches:[{id, ck, k, …}]} ; si l'outil n'attend pas la fin, relire ensuite JSON.stringify(window.__FICHES).
(async () => {
  const IDS = __IDS__;  // [[id, ville, "v" vente | "l" location], …]
  const out = window.__FICHES = {n: 0, stop: null, fiches: []};
  const txt = s => String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 6000);
  const num = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? undefined : +v;
  const day = s => s && !/^1970/.test(s) ? String(s).slice(0, 10) : undefined;
  for (const [id, ck, k] of IDS) {
    let r;
    try { r = await fetch('/realEstateAd.json?id=' + encodeURIComponent(id), {credentials: 'include'}); }
    catch (e) { out.fiches.push({id, ck, k, err: 'réseau'}); continue; }
    if (r.status === 403 || r.status === 429) { out.stop = 'refusé (' + r.status + ')'; break; }
    if (!r.ok) { out.fiches.push({id, ck, k, err: 'http ' + r.status}); continue; }
    let d; try { d = await r.json(); } catch (e) { out.fiches.push({id, ck, k, err: 'illisible'}); continue; }
    const b = d.blurInfo || {}, pos = b.position || b.centroid || null;
    const ph = (d.photos || []).map(p => String(p.photo || '')).filter(Boolean).map(p => p.startsWith(id + '_') ? p.slice(id.length + 1) : '!' + p);
    const f = {id, ck, k, titre: d.title || undefined, d: txt(d.description), ph,
      la: pos ? +(+pos.lat).toFixed(6) : undefined, lo: pos ? +(+pos.lon).toFixed(6) : undefined, r: pos ? (b.type === 'exact' ? 0 : num(b.radius)) : undefined,
      surf: num(d.surfaceArea), pcs: num(d.roomsQuantity), ch: num(d.bedroomsQuantity),
      et: num(d.floor), ets: num(d.floorQuantity), asc: typeof d.hasElevator === 'boolean' ? d.hasElevator : undefined, an: num(d.yearOfConstruction), chauf: d.heating || undefined,
      dpe: /^[A-G]$/.test(d.energyClassification || '') ? d.energyClassification : undefined, kwh: num(d.energyValue), ges: /^[A-G]$/.test(d.greenhouseGazClassification || '') ? d.greenhouseGazClassification : undefined, dpeDate: day(d.energyPerformanceDiagnosticDate),
      cop: num(d.annualCondominiumFees), lots: num(d.condominiumPartsQuantity), proc: d.isCondominiumInProcedure === true ? true : undefined,
      balc: num(d.balconyQuantity), terr: num(d.terracesQuantity), park: num(d.parkingPlacesQuantity), cave: num(d.cellarsOrUndergroundsQuantity),
      meu: typeof d.isFurnished === 'boolean' ? d.isFurnished : undefined, coloc: d.flatSharing ? true : undefined, chg: num(d.charges), dep: num(d.safetyDeposit), hono: num(d.agencyRentalFee),
      frais: d.feesChargedTo || undefined, hors: num(d.priceWithoutFees), prix: num(d.price), excl: d.isExclusiveSaleMandate === true ? true : undefined,
      pub: day(d.publicationDate), maj: day(d.modificationDate), off: d.status && d.status.onTheMarket === false ? true : undefined};
    out.fiches.push(JSON.parse(JSON.stringify(f)));  // retire les champs vides
    out.n++;
    await new Promise(s => setTimeout(s, 1500));
  }
  return JSON.stringify(out);
})()
