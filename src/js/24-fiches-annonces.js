/* ---------- fiche complète d'une annonce Bien'ici : description, toutes les photos, charges, DPE, étage, position ----------
   Relevée une fois par annonce (tools/fiches.py + tools/fiches-bienici.js), rangée dans data/fiches/<ville>.json.
   FICX (inliné) : les quelques champs utiles au calcul, pour toutes les annonces du relevé :
     la, lo, r (position et rayon de flou en m, 0 = exacte), dpe, cop (charges de copropriété par an), coloc.
   FICHES : les fiches complètes, inlinées dans l'artefact et la page de test ; sur GitHub, chargées ville par ville à la demande.
   Règles : position connue à 300 m près → quartier IRIS du point (sinon : secteur Bien'ici, comme avant) ;
   charges de copropriété annoncées → 35 % côté propriétaire (PART_PROPRIO, mesuré), le reste payé par le locataire ;
   DPE annoncé → même règle que le DPE saisi (F et G signalés), à jour du calcul du 1er janvier 2027 quand il donne mieux (dpe0 = classe annoncée,
   tools/fiches.py dpe_a_jour : électricité comptée 1,7 fois, seuils des petites surfaces) ; colocations (chambres) écartées des loyers de comparaison (src/ads-vue.js). */
const adId=suf=>String(suf||"").split("?")[0].split("/").pop();
const ficx=suf=>FICX[adId(suf)]||null;
const FD=FICHES||{}, FDL={};
/* undefined : en cours de chargement · null : pas encore relevée */
function ficheOf(ck,suf){const c=FD[ck]; if(c) return c[adId(suf)]||null; if(FICHES) return null; ficheLoad(ck); return undefined;}
function ficheLoad(ck){if(FICHES||FDL[ck]||!ck||ADSRAW.prive) return;   /* annonces privées : les fiches arrivent de Supabase (25-annonces-cloud.js) */ FDL[ck]=1;
 fetch("data/fiches/"+encodeURIComponent(ck)+".json").then(r=>r.ok?r.json():{}).catch(()=>({})).then(j=>{FD[ck]=j&&typeof j==="object"?j:{}; ficheRefresh(ck);});}
function ficheRefresh(ck){document.querySelectorAll("[data-fwait]").forEach(el=>{const [c,...r]=el.dataset.fwait.split("|"); if(c!==ck) return; const s=r.join("|"), f=ficheOf(c,s); const sm=el.closest("details.fsec"); if(sm&&sm.querySelector(".fss")) sm.querySelector(".fss").textContent=ficheSum(f,s); el.outerHTML=f?ficheHtml(c,s,f):ficheNone(s);});}
/* la ville affichée est chargée en avance, sans gêner le démarrage */
setTimeout(()=>{if(!FICHES&&typeof SEL!=="undefined"&&ADSRAW[SEL]) ficheLoad(SEL);},2500);

/* quartier d'une vente : la position de la fiche quand elle est assez précise, sinon le secteur Bien'ici */
const VIP=new Map();
function venteIrisA(ck,a){const k=ck+"|"+a[3]; if(VIP.has(k)) return VIP.get(k); const f=ficx(a[3]); let t=null;
 if(f&&f.la!=null&&f.lo!=null&&(f.r==null||f.r<=300)&&IR[ck]){try{const p=adrPlace(f.la,f.lo); if(p.c&&p.c.k===ck&&p.t&&p.t.price) t=p.t;}catch(_){}}
 if(!t) t=venteIris(ck,a[1]); VIP.set(k,t); return t;}
/* charges de copropriété annoncées, par mois (bornes larges contre les erreurs de saisie) */
const copAn=f=>f&&f.cop>=60&&f.cop<=12000?f.cop:null;
/* DPE à jour (1er janvier 2027) : texte de la fiche, l'annonce et le calcul */
const DPEW={elec:"électricité comptée 1,7 fois au lieu de 2,3 (ou 1,9 en 2026)",petit:"seuils des logements de moins de 40 m² (juillet 2024)","elec+petit":"électricité comptée 1,7 fois au lieu de 2,3, et seuils des logements de moins de 40 m²"};
const dpeAJ=suf=>{const x=ficx(suf); return x&&x.dpe0?x:null;};
const dpeNote=x=>x?`annoncé ${x.dpe0} ; ${x.dpe} avec le calcul en vigueur au 1er janvier 2027 (${DPEW[x.dpeW]||"nouveau calcul"}). Estimation : demandez au vendeur l'étiquette à jour, gratuite sur l'Observatoire DPE de l'ADEME.`:"";

const photoFull=(suf,p)=>{const id=adId(suf); return "https://file.bienici.com/photo/"+(p[0]==="!"?p.slice(1):id+"_"+p);};
const etTxt=f=>f.et==null?"":(f.et===0?"rez-de-chaussée":`${f.et}${f.et===1?"er":"e"} étage`)+(f.ets?` sur ${f.ets}`:"")+(f.asc===true?", avec ascenseur":f.asc===false?", sans ascenseur":"");
const frD=s=>{if(!s) return ""; const [y,m,d]=s.split("-"); return `${+d} ${MOISC[+m-1]} ${y}`;};
const MOISC=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function ficheNone(suf){return `<p class="sub" style="margin:0">La fiche complète de cette annonce n'a pas encore été relevée : elle le sera lors d'un prochain relevé. <a href="${esc(VTURL+suf)}" target="_blank" rel="noopener">Voir sur Bien'ici ↗</a></p>`;}
function ficheHtml(ck,suf,f){const loc=f.k==="l", ext=[f.balc&&`${f.balc} balcon${f.balc>1?"s":""}`,f.terr&&`${f.terr} terrasse${f.terr>1?"s":""}`,f.park&&`${f.park} parking${f.park>1?"s":""}`,f.cave&&`${f.cave} cave${f.cave>1?"s":""}`].filter(Boolean);
 const cop=copAn(f), rows=[
  f.surf&&["Surface",`<b class="mono">${fr(f.surf,f.surf%1?2:0)} m²</b>${f.pcs?` · ${f.pcs} pièce${f.pcs>1?"s":""}`:""}`],
  (f.et!=null||f.asc!=null)&&["Étage",etTxt(f)||"—"],
  (f.an||f.chauf)&&["Immeuble",[f.an&&`construit en ${f.an}`,f.chauf&&esc(f.chauf)].filter(Boolean).join(" · ")],
  f.dpe&&(x=>["DPE",`<b>${x?x.dpe:f.dpe}</b>${x?` <span class="v2sub">(annoncé ${f.dpe})</span>`:""}${f.kwh?` · ${f.kwh} kWh/m²/an`:""}${f.ges?` · GES ${f.ges}`:""}`,(f.dpeDate?`diagnostic du ${frD(f.dpeDate)}`:"")+(x?(f.dpeDate?" · ":"")+dpeNote(x):"")])(dpeAJ(suf)),
  !loc&&(cop||f.lots||f.proc)&&["Copropriété",`${f.lots?`${f.lots} lots`:""}${cop?`${f.lots?" · ":""}<b class="mono">${eur(cop)}</b> de charges par an (${eur(cop/12)}/mois)`:""}`,`${cop?`${Math.round(PART_PROPRIO*100)} % à votre charge dans le calcul (${eur(cop/12*PART_PROPRIO)}/mois), le reste est payé par le locataire`:"charges non indiquées"}${f.proc?" · <b style=\"color:var(--bad)\">copropriété en procédure</b>":""}`],
  ext.length&&["Extérieurs et annexes",ext.join(" · ")],
  loc&&["Location",`${f.meu===true?"meublée":f.meu===false?"non meublée":"meublé ?"}${f.coloc?" · <b>chambre en colocation</b>":""}`,f.coloc?"écartée des loyers de comparaison":""],
  loc&&(f.chg||f.dep||f.hono)&&["Conditions",[f.chg&&`${eur(f.chg)} de charges/mois`,f.dep&&`dépôt ${eur(f.dep)}`,f.hono&&`honoraires ${eur(f.hono)}`].filter(Boolean).join(" · ")],
  !loc&&f.frais&&["Frais d'agence",f.frais==="seller"?"à la charge du vendeur":f.frais==="purchaser"?"à la charge de l'acquéreur":esc(f.frais),f.hors&&f.prix&&f.hors<f.prix?`${eur(f.hors)} hors honoraires (${fr((f.prix/f.hors-1)*100,1)} %)`:""],
  (f.pub||f.maj)&&["Annonce",[f.pub&&`publiée le ${frD(f.pub)}`,f.maj&&`modifiée le ${frD(f.maj)}`].filter(Boolean).join(" · "),f.r===0?"adresse exacte connue":f.r?`position à ${f.r} m près`:""],
  f.off&&["Statut","<b>retirée du marché</b> selon Bien'ici"]].filter(Boolean);
 const d=String(f.d||""), cut=d.length>520?d.lastIndexOf(" ",480):-1;
 const desc=d?`<div class="fdesc">${esc(cut>0?d.slice(0,cut)+"…":d)}</div>${cut>0?`<details class="fdmore"><summary>Lire toute la description</summary><div class="fdesc">${esc(d)}</div></details>`:""}`:`<p class="sub">Pas de description.</p>`;
 const ph=(f.ph||[]).map((p,i)=>`<a href="${esc(photoFull(suf,p))}" target="_blank" rel="noopener" aria-label="Photo ${i+1} sur ${f.ph.length}, en grand"><img src="${esc(photoUrl(suf,p,360,270))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>`).join("");
 return `${ph?`<div class="fgal">${ph}</div>`:""}${desc}${rows.length?fRows(rows):""}${iaHtml(f)}<p class="sub" style="margin:6px 0 0">Fiche relevée sur Bien'ici le ${frD(f.lu)}.</p>`;}
function ficheSum(f,suf){if(f===undefined) return "chargement…"; if(!f) return "pas encore relevée"; const n=(f.ph||[]).length, x=suf?dpeAJ(suf):null;
 return [f.d&&"description",n&&`${n} photo${n>1?"s":""}`,f.dpe&&`DPE ${x?x.dpe+" (annoncé "+f.dpe+")":f.dpe}`,copAn(f)&&`${eur(copAn(f)/12)}/mois de copro`,f.coloc&&"colocation"].filter(Boolean).join(" · ");}
/* rubrique « L'annonce » des fiches (ordinateur et téléphone) */
function ficheSec(b){const s=b.kind==="v"?b.suf:(typeof bienSuf==="function"?bienSuf(b):null); if(!s) return ["",""]; const f=ficheOf(b.ville,s);
 return [ficheSum(f,s),f===undefined?`<div data-fwait="${esc(b.ville)}|${esc(s)}"><p class="sub" style="margin:0">Chargement de la description et des photos…</p></div>`:f?ficheHtml(b.ville,s,f):ficheNone(s)];}

/* ce que dit la description (signaux calculés par tools/fiches.py) */
const DFL={loue:["warn","loué","Vendu loué : un bail est en cours. Demandez le loyer, la date de fin du bail et le dépôt de garantie : on ne choisit ni le locataire ni le loyer."],
 serv:["bad","rés. gérée","Résidence gérée (services, étudiante, seniors) : bail commercial, loyer fixé par le gestionnaire et revente plus difficile. Le calcul de l'outil ne s'applique pas tel quel."],
 viager:["bad","viager","Viager ou nue-propriété : le calcul de l'outil ne s'applique pas."],
 trav:["warn","travaux","La description annonce des travaux : chiffrez-les à la visite (champ « Travaux » de la visite)."],
 vote:["warn","copro : travaux","Travaux de copropriété mentionnés (ravalement, travaux votés) : demandez qui les paie et le montant."],
 meub:["ok","vendu meublé","Vendu meublé : moins de meubles à acheter."],
 nonloc:["bad","non louable","La description dit que ce bien ne peut pas être loué en l'état (insalubre, non habitable, interdit à la location ou moins de 9 m² habitables). Le calcul de l'outil ne s'applique pas."]};
function ficheAttn(suf){const f=ficx(suf); if(!f) return []; const L=(f.fl||[]).filter(k=>DFL[k]).map(k=>[DFL[k][0]==="ok"?"ok":DFL[k][0],DFL[k][2]]); if(f.dup) L.push(["warn","Le même bien semble publié moins cher par une autre agence : comparez les deux annonces avant de contacter."]); return L;}
function ficheBadges(suf,sansDpe){const f=ficx(suf); if(!f&&!prixAnormal(suf)) return ""; const b=[];
 if(prixAnormal(suf)) b.push(`<span class="hb fbad" title="Prix au m² sous le quart de celui des ventes réelles de la ville : sans doute pas un logement ordinaire (cave, viager, enchères, part de bien). Hors calcul.">prix anormal</span>`);
 if(!f) return b.join("");
 if(f.dpe&&!sansDpe) b.push(`<span class="hb ${/[FG]/.test(f.dpe)?"fbad":"old"}" title="${f.dpe0?esc("DPE "+dpeNote(f)):"DPE annoncé"}">DPE ${f.dpe}${f.dpe0?"*":""}</span>`);
 (f.fl||[]).forEach(k=>{const d=DFL[k]; if(d) b.push(`<span class="hb ${d[0]==="bad"?"fbad":d[0]==="warn"?"fwarn":"drop"}" title="${esc(d[2])}">${d[1]}</span>`);});
 if(f.proc) b.push(`<span class="hb fbad" title="Copropriété en procédure selon l'annonce">copro en procédure</span>`);
 if(f.dup) b.push(`<span class="hb old" title="Le même bien est publié moins cher par une autre agence">doublon</span>`);
 return b.join("");}
/* les badges de la fiche s'ajoutent à ceux de l'historique (nouveau, baisse, jours en ligne) partout où ils s'affichent */
const _vuBadgesF=vuBadges; vuBadges=function(kind,ck,suf){return _vuBadgesF(kind,ck,suf)+(kind==="v"?ficheBadges(suf):"");};

/* annonces où le calcul de l'outil ne s'applique pas (résidence gérée, viager, non louable) : signalées partout, retirées des « Meilleures annonces » */
/* prix au m² sous le quart de celui des ventes réelles de la ville pour ce type : pas un logement ordinaire (cave, viager,
   enchères, part de bien, résidence gérée non signalée…), le calcul n'a pas de sens ; la liste est refaite quand les annonces changent */
let ANOM=null;
function prixAnormal(suf){if(!ANOM){ANOM=new Set(); if(typeof ADS!=="undefined") Object.entries(ADS).forEach(([ck,A])=>{if(!A||typeof A!=="object") return;
   [["studio",A.ventes],["t2",A.t&&A.t.t2&&A.t.t2.ventes],["t3",A.t&&A.t.t3&&A.t.t3.ventes]].forEach(([ty,L])=>{const D=dvfC(ck,ty); if(!D||!L) return; L.forEach(a=>{if(a&&a[0]>0&&a[2]>0&&a[2]/a[0]<0.25*D.med) ANOM.add(a[3]);});});});}
 return ANOM.has(suf);}
const horsCalcul=suf=>{const f=ficx(suf); return !!(f&&f.fl&&f.fl.some(k=>k==="serv"||k==="viager"||k==="nonloc"))||prixAnormal(suf);};

/* ce que Claude a lu dans la description (tools/fiches.py lu) : loyer d'un bien vendu loué, travaux, taxe foncière.
   Règles : loyer actuel du bail en cours à la place de l'estimation (charges ajoutées s'il est hors charges) ; travaux à prévoir et travaux votés
   ajoutés au budget ; taxe foncière annoncée à la place de l'estimation. */
function lueIA(f){const ia=f&&f.ia||{}, o={loyer:0,travaux:0,tf:0};
 if(ia.loue&&ia.loyer_mensuel) o.loyer=Math.round(ia.loyer_mensuel+(ia.loyer_charges_comprises===false?H.chLoc:0));
 const tr=(ia.travaux_a_prevoir||0)+(ia.travaux_votes||0); if(tr>0) o.travaux=Math.round(tr);
 if(ia.taxe_fonciere) o.tf=Math.round(ia.taxe_fonciere); return o;}
function iaHtml(f){const ia=f&&f.ia; if(!ia) return ""; const rows=[
  ia.loue===true&&["Vendu loué",ia.loyer_mensuel?`<b class="mono">${eur(ia.loyer_mensuel)}</b> ${ia.loyer_charges_comprises===false?"hors charges":ia.loyer_charges_comprises?"charges comprises":""}`:"loyer non indiqué",`utilisé jusqu'au départ du locataire (${ia.fin_bail?"fin du bail : "+esc(ia.fin_bail):"supposé dans 3 ans"}), puis relevé de la prime meublé sans dépasser le loyer estimé`],
  ia.loue===false&&["Location","libre (pas de bail en cours)"],
  (ia.travaux_a_prevoir||ia.travaux_votes)&&["Travaux",[ia.travaux_a_prevoir&&`${eur(ia.travaux_a_prevoir)} à prévoir`,ia.travaux_votes&&`${eur(ia.travaux_votes)} votés en copropriété`].filter(Boolean).join(" · "),"ajoutés au budget"],
  ia.taxe_fonciere&&["Taxe foncière",`<b class="mono">${eur(ia.taxe_fonciere)}</b> par an`,"à la place de l'estimation"],
  ia.surface_carrez&&["Surface Carrez",`${fr(ia.surface_carrez,ia.surface_carrez%1?2:0)} m²`],
  ia.etat&&["État",esc(ia.etat)],ia.exposition&&["Exposition",esc(ia.exposition)],
  ia.residence_geree&&["Résidence gérée","<b>oui</b>","le calcul ne s'applique pas tel quel"]].filter(Boolean);
 const pts=(ia.points||[]).map(p=>`<li>${esc(p)}</li>`).join("");
 return rows.length||pts?`<h4 class="fh4">Lu dans la description</h4>${rows.length?fRows(rows):""}${pts?`<ul class="iapts">${pts}</ul>`:""}`:"";}

/* même bien publié par une autre agence (tools/fiches.py doublons) : retiré des classements, signalé sur sa fiche */
const estDoublon=suf=>{const f=ficx(suf); return !!(f&&f.dup);};

/* écart habituel entre prix affichés et ventes réelles : médiane, sur les annonces du type dans la ville (hors résidences gérées et doublons),
   de (prix au m² affiché ÷ prix au m² des ventes du quartier à la même surface). Situe un bien : « +35 % quand l'habitude est +12 % ». */
const EMC=new Map();
function ecartMarche(ck){const key=ck+"|"+H.type+"|"+H.dvf+"|"+H.surcote; if(EMC.has(key)) return EMC.get(key); const A=ADS[ck]; let o=null;
 if(A&&A.ventes){const r=A.ventes.filter(a=>!horsCalcul(a[3])&&!estDoublon(a[3])).map(a=>{const t=venteIrisA(ck,a), qs=(t&&t.price?studioPm2(ck,t):studioPm2(ck,null))*pm2Adj(H.type,a[0]); return qs?a[2]/a[0]/qs:null;}).filter(v=>v&&isFinite(v)).sort((x,y)=>x-y);
  if(r.length>=10) o={med:r[r.length>>1],n:r.length};}
 EMC.set(key,o); return o;}
