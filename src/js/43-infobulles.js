/* ---------- infobulles : explications au survol (ordinateur) ou au toucher (téléphone) ---------- */
const TIPS={
 budget:()=>`Prix affiché + notaire (${fr(H.notaire,0)} %) + meubles (${eur(H.meubles)}) + petits travaux (${eur(H.travaux)}) + garantie du prêt (${fr(H.garantie,1)} % du prêt). L'apport (${eur(H.apport)}) en couvre une partie, le reste est emprunté.`,
 loyer:()=>`Loyer hors charges que l'on peut espérer : loyer médian des studios du quartier (ou de la ville), ramené à la surface du bien, moins les ${eur(H.chLoc)} de charges payées par le locataire.`,
 cf:()=>`Ce qui reste (ou manque) chaque mois à vous deux : loyer encaissé, mois vides déduits − mensualité et assurance du prêt − charges (copro, taxe foncière, assurance PNO, entretien).${H.net?" En net : aussi les impôts sur les loyers, la CFE et le comptable.":" En brut : avant impôts et frais fiscaux."}`,
 irr:()=>`Rendement annuel de votre apport sur 15 ans, revente comprise : il compte tout ce que vous mettez et récupérez, comme un taux d'épargne. ${H.net?"Net : après impôts sur les loyers, CFE, comptable et impôt sur la plus-value.":"Brut : avant impôts et frais fiscaux."} Repères : livret A 1,7 %, LEP 2,5 %.`,
 banque:()=>`Taux d'endettement estimé : (mensualité + prêt étudiant de ${eur(H.pretEtud)}) ÷ (salaires de ${eur(H.salaires)} + 70 % du loyer). Les banques vont en général jusqu'à 35 %. Passe ≤ 33 %, Limite entre 33 et 35 %, Trop haut au-delà.`,
 vac:()=>`Mois sans locataire par an retenus dans le calcul. Avec « Vacance selon l'emplacement » : 0,5 mois à 10 min à pied ou moins de la gare, de l'université ou du centre, jusqu'à 2,5 mois à 50 min et plus.`,
 autof:()=>`Prix d'achat maximum pour que le loyer paie tout chaque mois (cash-flow ${H.net?"net":"brut"} ≥ 0 €), avec vos réglages actuels.`,
 r7:()=>`Prix d'achat maximum pour que votre apport rapporte 7 % par an sur 15 ans, revente comprise (${H.net?"après impôts":"avant impôts"}).`,
 prixmax:()=>`Les deux prix à ne pas dépasser selon votre objectif : « autofinancé » (rien à sortir chaque mois) ou « 7 % par an ». La différence avec le prix affiché, c'est la marge à négocier.`,
 brutloc:()=>`Loyers d'une année ÷ budget tout compris. C'est le chiffre des annonces et des agences : il ignore le crédit, les charges et les impôts.`,
 b2n:()=>`Le passage du chiffre brut (avant impôts) au chiffre net : impôts sur les loyers, CFE, comptable si régime réel, et impôt sur la plus-value à la revente.`,
 pm2:()=>`Prix affiché divisé par la surface. Pour un studio, le prix au m² est en général 10 à 20 % plus élevé que la moyenne des appartements du quartier.`,
 etsi:()=>`Testez une hypothèse sans toucher à vos réglages : la colonne « Et si… » se remplit dès qu'une case est cochée. La durée de revente s'applique aux deux colonnes.`,
 pess:()=>`Loyer −5 %, un demi-mois vide de plus par an, prix des biens +0,5 %/an au lieu de +${fr(H.px,1)} %. Le taux ne change pas : il est fixé à la signature.`,
 vacq:()=>`Ajuste les mois vides selon le temps de marche réel (par les rues, OpenStreetMap) jusqu'à la gare, l'université ou le centre : 1 mois à 10 min ou moins, jusqu'à 2,5 mois à 50 min et plus. Décoché : ${fr(H.vacance,1)} mois partout.`,
 dvf:()=>`Le prix d'achat vient des logements du type choisi (même nombre de pièces) réellement vendus en 2023-2025 (DVF), dans le quartier quand il en a, sinon dans la ville. Décoché : prix moyen des appartements + surcote.`,
 surcote:()=>`Écart entre le prix que vous paierez et le prix moyen des studios vendus dans la ville (DVF). Un studio bien placé et en bon état se vend souvent 10 à 20 % plus cher.`,
 loyerAdj:()=>`Ajuste le loyer médian : positif pour un studio très bien placé ou bien meublé, négatif pour un bien moins attractif.`,
 taux:()=>`Taux nominal du crédit, hors assurance. Il est fixé à la signature de l'offre de prêt.`,
 regime:()=>`Micro-BIC : 50 % des loyers sont imposés, sans comptable. Réel : on déduit charges, intérêts et amortissements, l'impôt est souvent nul pendant des années, mais il faut une déclaration comptable (service en ligne ≈ 150 €/an) et l'amortissement est réintégré dans la plus-value à la revente.`,
 tmi:()=>`Votre tranche marginale d'impôt. Si quelqu'un est rattaché au foyer fiscal de ses parents, c'est la tranche des parents qui compte. Les prélèvements sociaux (18,6 %) s'ajoutent toujours.`,
 cfe:()=>`Cotisation foncière des entreprises, due par les loueurs en meublé. Pas de cotisation minimum sous 5 000 € de recettes par an. Le montant dépend de la commune.`,
 compta:()=>`Uniquement au régime réel : la déclaration comptable (liasse 2031) passe en pratique par un service en ligne spécialisé, ≈ 100 à 250 €/an. Une seule déclaration pour vous deux (indivision).`,
 garantie:()=>`Caution du prêt (Crédit Logement ou équivalent), payée au départ, en général 1 à 1,5 % du montant emprunté.`,
 assur:()=>`Taux annuel de l'assurance emprunteur, appliqué au capital emprunté. La quotité, c'est la part du prêt couverte pour cette personne (100 % chacun = couverture totale en cas de problème).`,
 notaire:()=>`Frais d'acquisition dans l'ancien : environ 7 à 8 % du prix, surtout des taxes.`,
 apport:()=>`Ce que vous mettez de votre poche au départ (à deux). Le reste du budget tout compris est emprunté.`,
 chLoc:()=>`Charges récupérables payées par le locataire en plus du loyer (eau, entretien des parties communes, ordures ménagères).`,
 copro:()=>`Part des charges de copropriété qui reste à votre charge (non récupérable sur le locataire).`,
 dpe:()=>`Diagnostic de performance énergétique. Location interdite pour les G depuis 2025, les F en 2028 et les E en 2034, sauf travaux.`,
 statut:()=>`Où vous en êtes avec ce bien. « Écarté » le retire de la shortlist et de la carte ; il reste dans « Nos biens ».`};
// étiquettes reconnues automatiquement → infobulle
const TIPMAP=[[/^budget( tout compris| moyen)?$/i,"budget"],[/^studio tout compris$/i,"budget"],[/^loyer (estimé |visé )?hc( moyen)?$|^loyer hors charges$/i,"loyer"],[/^cash-flow( net| brut| à deux)?$/i,"cf"],[/^15 ans( net| brut)?$/i,"irr"],
 [/^banque$/i,"banque"],[/^mois vides?$/i,"vac"],[/^autofinancé$/i,"autof"],[/^7 % par an$/i,"r7"],[/^prix maximum à payer$/i,"prixmax"],[/^du brut au net$/i,"b2n"],[/^rendement locatif brut/i,"brutloc"],[/^et si…$/i,"etsi"],[/^€\/m²$/i,"pm2"],[/^dpe$/i,"dpe"]];
const TIPID={"f-pess":"pess","f-vacq":"vacq","f-dvf":"dvf","s-surcote":"surcote","s-loyer":"loyerAdj","s-taux":"taux","fin-regime":"regime","fin-tmiA":"tmi","fin-tmiB":"tmi","fin-cfe":"cfe","fin-compta":"compta","fin-garantie":"garantie","fin-assurA":"assur","fin-assurB":"assur","fin-quotA":"assur","fin-quotB":"assur","f-notaire":"notaire","f-apport":"apport","f-chLoc":"chLoc","f-copro":"copro"};
const tipBtn=k=>`<button type="button" class="tipb" data-tip="${k}" aria-label="Explication">?</button>`;
let TIPBUSY=false;
function addTips(root){if(TIPBUSY) return; TIPBUSY=true;
 root.querySelectorAll(".big4>div>span:first-child,.bcn small,.ngl,.ngh>b,.btg>small,h2.psec,details.b2n summary>span:first-child,table:not(.adt):not(.ftab):not(.scnt) thead th,.fincard .trow>span:first-child").forEach(el=>{if(el.dataset.tipped||el.closest(".fiche")) return; const t=el.textContent.trim().replace(/\s+/g," ");
  const m=TIPMAP.find(([re])=>re.test(t)); if(!m) return; el.dataset.tipped="1"; el.insertAdjacentHTML("beforeend",tipBtn(m[1]));});
 Object.entries(TIPID).forEach(([id,k])=>{const inp=document.getElementById(id); if(!inp) return; const lab=inp.closest("label")||document.querySelector(`label[for="${id}"]`); if(!lab||lab.dataset.tipped) return; lab.dataset.tipped="1";
  const tn=[...lab.childNodes].find(n=>n.nodeType===3&&n.textContent.trim()); if(tn) tn.after(document.createRange().createContextualFragment(tipBtn(k))); else lab.insertAdjacentHTML("beforeend",tipBtn(k));});
 TIPBUSY=false;}
const tipPop=document.createElement("div"); tipPop.id="tipPop"; tipPop.setAttribute("role","tooltip"); tipPop.hidden=true; document.body.appendChild(tipPop);
let TIPCUR=null;
function showTip(b){const f=TIPS[b.dataset.tip]; if(!f) return; TIPCUR=b; tipPop.textContent=f(); tipPop.hidden=false; const r=b.getBoundingClientRect(), w=Math.min(300,innerWidth-24);
 tipPop.style.width=w+"px"; const left=Math.max(12,Math.min(r.left+r.width/2-w/2,innerWidth-w-12)); const h=tipPop.offsetHeight; tipPop.style.left=left+"px"; tipPop.style.top=(r.top-h-8>8?r.top-h-8:r.bottom+8)+"px";}
function hideTip(){tipPop.hidden=true; TIPCUR=null;}
document.addEventListener("mouseover",e=>{const b=e.target.closest&&e.target.closest(".tipb"); if(b&&matchMedia("(pointer:fine)").matches) showTip(b);});
document.addEventListener("mouseout",e=>{const b=e.target.closest&&e.target.closest(".tipb"); if(b&&matchMedia("(pointer:fine)").matches) hideTip();});
document.addEventListener("focusin",e=>{const b=e.target.closest&&e.target.closest(".tipb"); if(b) showTip(b);});
document.addEventListener("focusout",e=>{if(e.target.closest&&e.target.closest(".tipb")) hideTip();});
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".tipb"); if(b){e.preventDefault(); e.stopPropagation(); if(TIPCUR===b) hideTip(); else showTip(b); return;} if(TIPCUR) hideTip();},true);
addEventListener("scroll",()=>{if(TIPCUR) hideTip();},{passive:true,capture:true});
addEventListener("keydown",e=>{if(e.key==="Escape"&&TIPCUR) hideTip();});
let TIPT=null; new MutationObserver(ms=>{if(TIPBUSY||ms.every(m=>m.target.closest&&m.target.closest("svg"))) return; clearTimeout(TIPT); TIPT=setTimeout(()=>addTips(document),150);}).observe(document.body,{childList:true,subtree:true});
addTips(document);
