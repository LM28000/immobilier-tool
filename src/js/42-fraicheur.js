/* ---------- fraîcheur des données ---------- */
// relevé = date à laquelle la donnée a été récupérée ; age = âge maximal avant de la signaler (jours)
const FRESH=[
 ["Annonces Bien'ici (loyers et ventes)","chaque jour",()=>ADS.iso||"2026-11-05",2],
 ["Taux du crédit","novembre 2026","2026-11-05",60],
 ["Prix des studios vendus (DVF, Pappers)","12 derniers mois","2026-11-04",180],
 ["Loyers médians (LocService)","annonces récentes","2026-11-04",180],
 ["Prix et loyers par quartier (RealAdvisor)","octobre 2026","2026-11-04",180],
 ["DPE des petits appartements (ADEME)","depuis juillet 2021","2026-11-04",180],
 ["Taxe foncière","taux 2025","2026-11-04",365],
 ["Population, logements vides, chômage (Insee)","2023","2026-11-04",365],
 ["Étudiants","rentrée 2023","2026-11-04",365],
 ["Contours des quartiers (IRIS)","2025","2026-11-04",730],
 ["Règles fiscales (LMNP, prélèvements sociaux)","lois de finances 2025-2026","2026-11-05",180]];
function renderFresh(){const box=document.getElementById("freshBox"), pill=document.getElementById("freshPill"); if(!box) return; const now=new Date(); let stale=0;
 const rows=FRESH.map(([l,per,d,max])=>{const iso=typeof d==="function"?d():d, age=Math.round((now-new Date(iso+"T12:00:00"))/864e5), old=age>max; if(old) stale++;
  return `<tr><td>${l}</td><td>${per}</td><td class="mono">${new Date(iso+"T12:00:00").toLocaleDateString("fr-FR")}</td><td><span class="pill ${old?"p-warn":"p-ok"}">${old?`à rafraîchir (${age} j)`:"à jour"}</span></td></tr>`;}).join("");
 box.innerHTML=`<p><b>Fraîcheur des données.</b></p><div class="tablewrap"><table class="fresh"><thead><tr><th>Donnée</th><th>Période</th><th>Relevée le</th><th>État</th></tr></thead><tbody>${rows}</tbody></table></div>`;
 pill.hidden=!stale; pill.textContent=`${stale} donnée${stale>1?"s":""} à rafraîchir`;}
renderFresh();

/* ---------- appli sur téléphone (version GitHub) ---------- */
(function(){let ev=null; const b=document.getElementById("installBtn"); if(!b) return;
 addEventListener("beforeinstallprompt",e=>{e.preventDefault(); ev=e; b.hidden=false;});
 b.addEventListener("click",async()=>{if(!ev) return; ev.prompt(); try{await ev.userChoice;}catch(_){} ev=null; b.hidden=true;});
 addEventListener("appinstalled",()=>{b.hidden=true; toast("Appli installée sur l'écran d'accueil.");});})();
