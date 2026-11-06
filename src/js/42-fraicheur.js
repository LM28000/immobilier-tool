/* ---------- fraîcheur des données ---------- */
// relevé = date à laquelle la donnée a été récupérée ; age = âge maximal avant de la signaler (jours)
const FRESH=[
 ["Annonces de location et de vente","<a href=\"https://www.bienici.com/\" target=\"_blank\" rel=\"noopener\">Bien'ici</a>, relevé quotidien","chaque jour",()=>ADS.iso||"2026-11-05",2],
 ["Taux du crédit","Offres bancaires, profil emprunteur","novembre 2026","2026-11-05",60],
 ["Ventes réelles de studios","<a href=\"https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/\" target=\"_blank\" rel=\"noopener\">DVF</a> : appartements d'une pièce de 12 à 35 m² vendus seuls, par ville et par quartier","2023 à 2025",()=>DVFALL.date,180],
 ["Temps de trajet à pied et à vélo","<a href=\"https://routing.openstreetmap.de/\" target=\"_blank\" rel=\"noopener\">OSRM sur OpenStreetMap</a>, depuis le centre de chaque quartier","réseau actuel","2026-11-05",365],
 ["Habitants par quartier","<a href=\"https://www.insee.fr/fr/statistiques/8647014\" target=\"_blank\" rel=\"noopener\">Insee</a> : recensement 2022, revenus Filosofi 2021","2021-2022","2026-11-06",365],
 ["Écoles et campus","<a href=\"https://data.education.gouv.fr/explore/dataset/fr-en-annuaire-education/\" target=\"_blank\" rel=\"noopener\">Annuaire de l'Éducation nationale</a> et <a href=\"https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-implantations_etablissements_d_enseignement_superieur_publics/\" target=\"_blank\" rel=\"noopener\">implantations du supérieur public</a>","état actuel","2026-11-06",365],
 ["Urbanisme","<a href=\"https://www.geoportail-urbanisme.gouv.fr/\" target=\"_blank\" rel=\"noopener\">Géoportail de l'urbanisme</a> (zones du PLU, API Carto IGN) et quartiers prioritaires 2024 (ANCT)","état actuel","2026-11-06",365],
 ["Catastrophes naturelles","<a href=\"https://www.georisques.gouv.fr/\" target=\"_blank\" rel=\"noopener\">Géorisques</a> (base GASPAR, arrêtés CatNat par commune)","depuis 1982","2026-11-06",180],
 ["Commerces et services à pied","<a href=\"https://www.openstreetmap.org/\" target=\"_blank\" rel=\"noopener\">OpenStreetMap</a> (Overpass) : supermarchés, boulangeries, pharmacies, cafés et restos, laveries, salles de sport","état actuel","2026-11-06",365],
 ["Adresse exacte d'un bien","<a href=\"https://adresse.data.gouv.fr/\" target=\"_blank\" rel=\"noopener\">Base Adresse Nationale</a>, trajets OpenStreetMap et Géorisques à l'adresse","à l'ajout","2026-11-06",9999],
 ["Loyer de référence par ville","<a href=\"https://www.data.gouv.fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025/\" target=\"_blank\" rel=\"noopener\">Carte des loyers</a> du ministère du Logement et de l'ANIL, appartements de 1 ou 2 pièces","annonces 2025","2026-11-06",400],
 ["Temps en bus et tram","Horaires publics des réseaux sur <a href=\"https://transport.data.gouv.fr/\" target=\"_blank\" rel=\"noopener\">transport.data.gouv.fr</a> : Setram (Le Mans), Ycéo (Saint-Nazaire), Irigo (Angers), Twisto (Caen), TAO (Orléans)","un mardi, départ vers 8 h","2026-11-06",180],
 ["Risques (inondation, argile, sols pollués, Seveso)","<a href=\"https://www.georisques.gouv.fr/\" target=\"_blank\" rel=\"noopener\">Géorisques</a>, au centre de chaque quartier","base actuelle","2026-11-05",365],
 ["Prix des appartements par ville","<a href=\"https://immobilier.pappers.fr/prix-immobilier\" target=\"_blank\" rel=\"noopener\">Pappers Immobilier</a>, données DVF","12 derniers mois","2026-11-04",180],
 ["Loyers médians et demande","<a href=\"https://www.locservice.fr/tensiometre/tensiometre-studio-72181.html\" target=\"_blank\" rel=\"noopener\">Tensiomètre LocService</a>, studios et T1","annonces récentes","2026-11-04",180],
 ["Prix et loyers par quartier","RealAdvisor : <a href=\"https://realadvisor.fr/fr/prix-m2-immobilier/ville-le-mans\" target=\"_blank\" rel=\"noopener\">Le Mans</a>, <a href=\"https://realadvisor.fr/fr/prix-m2-immobilier/44600-saint-nazaire\" target=\"_blank\" rel=\"noopener\">Saint-Nazaire</a>, <a href=\"https://realadvisor.fr/fr/prix-m2-immobilier/ville-angers\" target=\"_blank\" rel=\"noopener\">Angers</a>, <a href=\"https://realadvisor.fr/fr/prix-m2-immobilier/ville-caen\" target=\"_blank\" rel=\"noopener\">Caen</a>, <a href=\"https://realadvisor.fr/fr/prix-m2-immobilier/ville-orleans\" target=\"_blank\" rel=\"noopener\">Orléans</a>","octobre 2026","2026-11-04",180],
 ["DPE des petits appartements","<a href=\"https://data.ademe.fr/datasets/dpe03existant\" target=\"_blank\" rel=\"noopener\">ADEME</a>, appartements de 30 m² ou moins","depuis juillet 2021","2026-11-04",180],
 ["Taxe foncière","<a href=\"https://habity.fr/ville/le-mans-72/finance\" target=\"_blank\" rel=\"noopener\">Habity</a>, d'après le ministère de l'Économie","taux 2025","2026-11-04",365],
 ["Population, logements vides, chômage","<a href=\"https://www.insee.fr/fr/statistiques/1405599?geo=COM-72181\" target=\"_blank\" rel=\"noopener\">Insee</a> (<a href=\"https://www.villesavivre.fr/tours-37261\" target=\"_blank\" rel=\"noopener\">Villes à vivre</a> pour Tours, Poitiers, Orléans)","2023","2026-11-04",365],
 ["Étudiants","<a href=\"https://www.75secondes.fr/classement/les-villes-avec-le-plus-detudiants-en-france\" target=\"_blank\" rel=\"noopener\">75 Secondes</a>","rentrée 2023","2026-11-04",365],
 ["Contours des quartiers","<a href=\"https://geoservices.ign.fr/contoursiris\" target=\"_blank\" rel=\"noopener\">IRIS de l'INSEE, IGN</a>","2025","2026-11-04",730],
 ["Fond de carte","<a href=\"https://github.com/gregoiredavid/france-geojson\" target=\"_blank\" rel=\"noopener\">france-geojson</a> (IGN simplifié)","2024","2026-11-04",730],
 ["Règles fiscales (LMNP, prélèvements sociaux)","<a href=\"https://www.hagnere-patrimoine.fr/guides-patrimoine/investissement-immobilier/lfss-2026-prelevements-sociaux-186-lmnp-impact-rendement\" target=\"_blank\" rel=\"noopener\">LFSS 2026</a>, <a href=\"https://www.investissement-locatif.com/lmnp-2026.html\" target=\"_blank\" rel=\"noopener\">LMNP 2026</a>","lois de finances 2025-2026","2026-11-05",180]];
function renderFresh(){const box=document.getElementById("freshBox"); if(!box) return; const now=new Date(); let stale=0;
 const rows=FRESH.map(([l,src,per,d,max])=>{const iso=typeof d==="function"?d():d, age=Math.round((now-new Date(iso+"T12:00:00"))/864e5), old=age>max; if(old) stale++;
  return `<tr><td><b>${l}</b><div class="sub" style="margin:0">${src}</div></td><td>${per}</td><td class="mono">${new Date(iso+"T12:00:00").toLocaleDateString("fr-FR")}</td><td><span class="pill ${old?"p-warn":"p-ok"}">${old?`à rafraîchir (${age} j)`:"à jour"}</span></td></tr>`;}).join("");
 box.innerHTML=`<div class="tablewrap"><table class="fresh"><thead><tr><th>Donnée et source</th><th>Période</th><th>Relevée le</th><th>État</th></tr></thead><tbody>${rows}</tbody></table></div>`;
 ["freshPill","freshPill2"].forEach(id=>{const p=document.getElementById(id); if(!p) return; p.hidden=!stale; p.textContent=`${stale} donnée${stale>1?"s":""} à rafraîchir`;});}
renderFresh();
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("[data-opensrc],[data-top],#freshPill"); if(!a) return; e.preventDefault();
 if(a.dataset.top!==undefined){scrollTo({top:0,behavior:"smooth"}); return;} const d=document.getElementById("sources"); d.open=true; d.scrollIntoView({behavior:"smooth",block:"start"});});

/* ---------- appli sur téléphone (version GitHub) ---------- */
(function(){let ev=null; const b=document.getElementById("installBtn"); if(!b) return;
 addEventListener("beforeinstallprompt",e=>{e.preventDefault(); ev=e; b.hidden=false;});
 b.addEventListener("click",async()=>{if(!ev) return; ev.prompt(); try{await ev.userChoice;}catch(_){} ev=null; b.hidden=true;});
 addEventListener("appinstalled",()=>{b.hidden=true; toast("Appli installée sur l'écran d'accueil.");});})();
