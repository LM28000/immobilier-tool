/* ---------- fiche complète d'une annonce Bien'ici : description, toutes les photos, charges, DPE, étage, position ----------
   Relevée une fois par annonce (tools/fiches.py + tools/fiches-bienici.js), rangée dans data/fiches/<ville>.json.
   FICX (inliné) : les quelques champs utiles au calcul, pour toutes les annonces du relevé :
     la, lo, r (position et rayon de flou en m, 0 = exacte), dpe, cop (charges de copropriété par an), coloc.
   FICHES : les fiches complètes, inlinées dans l'artefact et la page de test ; sur GitHub, chargées ville par ville à la demande.
   Règles : position connue à 300 m près → quartier IRIS du point (sinon : secteur Bien'ici, comme avant) ;
   charges de copropriété annoncées → comptées en entier côté propriétaire (prudent : une partie est récupérable sur le locataire) ;
   DPE annoncé → même règle que le DPE saisi (F et G signalés) ; colocations (chambres) écartées des loyers de comparaison (src/ads-vue.js). */
const adId=suf=>String(suf||"").split("?")[0].split("/").pop();
const ficx=suf=>FICX[adId(suf)]||null;
const FD=FICHES||{}, FDL={};
/* undefined : en cours de chargement · null : pas encore relevée */
function ficheOf(ck,suf){const c=FD[ck]; if(c) return c[adId(suf)]||null; if(FICHES) return null; ficheLoad(ck); return undefined;}
function ficheLoad(ck){if(FICHES||FDL[ck]||!ck) return; FDL[ck]=1;
 fetch("data/fiches/"+encodeURIComponent(ck)+".json").then(r=>r.ok?r.json():{}).catch(()=>({})).then(j=>{FD[ck]=j&&typeof j==="object"?j:{}; ficheRefresh(ck);});}
function ficheRefresh(ck){document.querySelectorAll("[data-fwait]").forEach(el=>{const [c,...r]=el.dataset.fwait.split("|"); if(c!==ck) return; const s=r.join("|"), f=ficheOf(c,s); const sm=el.closest("details.fsec"); if(sm&&sm.querySelector(".fss")) sm.querySelector(".fss").textContent=ficheSum(f); el.outerHTML=f?ficheHtml(c,s,f):ficheNone(s);});}
/* la ville affichée est chargée en avance, sans gêner le démarrage */
setTimeout(()=>{if(!FICHES&&typeof SEL!=="undefined"&&ADSRAW[SEL]) ficheLoad(SEL);},2500);

/* quartier d'une vente : la position de la fiche quand elle est assez précise, sinon le secteur Bien'ici */
const VIP=new Map();
function venteIrisA(ck,a){const k=ck+"|"+a[3]; if(VIP.has(k)) return VIP.get(k); const f=ficx(a[3]); let t=null;
 if(f&&f.la!=null&&f.lo!=null&&(f.r==null||f.r<=300)&&IR[ck]){try{const p=adrPlace(f.la,f.lo); if(p.c&&p.c.k===ck&&p.t&&p.t.price) t=p.t;}catch(_){}}
 if(!t) t=venteIris(ck,a[1]); VIP.set(k,t); return t;}
/* charges de copropriété annoncées, par mois (bornes larges contre les erreurs de saisie) */
const copAn=f=>f&&f.cop>=60&&f.cop<=12000?f.cop:null;

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
  f.dpe&&["DPE",`<b>${f.dpe}</b>${f.kwh?` · ${f.kwh} kWh/m²/an`:""}${f.ges?` · GES ${f.ges}`:""}`,f.dpeDate?`diagnostic du ${frD(f.dpeDate)}`:""],
  !loc&&(cop||f.lots||f.proc)&&["Copropriété",`${f.lots?`${f.lots} lots`:""}${cop?`${f.lots?" · ":""}<b class="mono">${eur(cop)}</b> de charges par an (${eur(cop/12)}/mois)`:""}`,`${cop?"comptées en entier dans le calcul":"charges non indiquées"}${f.proc?" · <b style=\"color:var(--bad)\">copropriété en procédure</b>":""}`],
  ext.length&&["Extérieurs et annexes",ext.join(" · ")],
  loc&&["Location",`${f.meu===true?"meublée":f.meu===false?"non meublée":"meublé ?"}${f.coloc?" · <b>chambre en colocation</b>":""}`,f.coloc?"écartée des loyers de comparaison":""],
  loc&&(f.chg||f.dep||f.hono)&&["Conditions",[f.chg&&`${eur(f.chg)} de charges/mois`,f.dep&&`dépôt ${eur(f.dep)}`,f.hono&&`honoraires ${eur(f.hono)}`].filter(Boolean).join(" · ")],
  !loc&&f.frais&&["Frais d'agence",f.frais==="seller"?"à la charge du vendeur":f.frais==="purchaser"?"à la charge de l'acquéreur":esc(f.frais),f.hors&&f.prix&&f.hors<f.prix?`${eur(f.hors)} hors honoraires (${fr((f.prix/f.hors-1)*100,1)} %)`:""],
  (f.pub||f.maj)&&["Annonce",[f.pub&&`publiée le ${frD(f.pub)}`,f.maj&&`modifiée le ${frD(f.maj)}`].filter(Boolean).join(" · "),f.r===0?"adresse exacte connue":f.r?`position à ${f.r} m près`:""],
  f.off&&["Statut","<b>retirée du marché</b> selon Bien'ici"]].filter(Boolean);
 const d=String(f.d||""), cut=d.length>520?d.lastIndexOf(" ",480):-1;
 const desc=d?`<div class="fdesc">${esc(cut>0?d.slice(0,cut)+"…":d)}</div>${cut>0?`<details class="fdmore"><summary>Lire toute la description</summary><div class="fdesc">${esc(d)}</div></details>`:""}`:`<p class="sub">Pas de description.</p>`;
 const ph=(f.ph||[]).map((p,i)=>`<a href="${esc(photoFull(suf,p))}" target="_blank" rel="noopener" aria-label="Photo ${i+1} sur ${f.ph.length}, en grand"><img src="${esc(photoUrl(suf,p,360,270))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>`).join("");
 return `${ph?`<div class="fgal">${ph}</div>`:""}${desc}${rows.length?fRows(rows):""}<p class="sub" style="margin:6px 0 0">Fiche relevée sur Bien'ici le ${frD(f.lu)}.</p>`;}
function ficheSum(f){if(f===undefined) return "chargement…"; if(!f) return "pas encore relevée"; const n=(f.ph||[]).length;
 return [f.d&&"description",n&&`${n} photo${n>1?"s":""}`,f.dpe&&`DPE ${f.dpe}`,copAn(f)&&`${eur(copAn(f)/12)}/mois de copro`,f.coloc&&"colocation"].filter(Boolean).join(" · ");}
/* rubrique « L'annonce » des fiches (ordinateur et téléphone) */
function ficheSec(b){const s=b.kind==="v"?b.suf:(typeof bienSuf==="function"?bienSuf(b):null); if(!s) return ["",""]; const f=ficheOf(b.ville,s);
 return [ficheSum(f),f===undefined?`<div data-fwait="${esc(b.ville)}|${esc(s)}"><p class="sub" style="margin:0">Chargement de la description et des photos…</p></div>`:f?ficheHtml(b.ville,s,f):ficheNone(s)];}

/* ce que dit la description (signaux calculés par tools/fiches.py) */
const DFL={loue:["warn","loué","Vendu loué : un bail est en cours. Demandez le loyer, la date de fin du bail et le dépôt de garantie : on ne choisit ni le locataire ni le loyer."],
 serv:["bad","rés. gérée","Résidence gérée (services, étudiante, seniors) : bail commercial, loyer fixé par le gestionnaire et revente plus difficile. Le calcul de l'outil ne s'applique pas tel quel."],
 viager:["bad","viager","Viager ou nue-propriété : le calcul de l'outil ne s'applique pas."],
 trav:["warn","travaux","La description annonce des travaux : chiffrez-les à la visite (champ « Travaux » de la visite)."],
 vote:["warn","copro : travaux","Travaux de copropriété mentionnés (ravalement, travaux votés) : demandez qui les paie et le montant."],
 meub:["ok","vendu meublé","Vendu meublé : moins de meubles à acheter."]};
function ficheAttn(suf){const f=ficx(suf); return f&&f.fl?f.fl.filter(k=>DFL[k]).map(k=>[DFL[k][0]==="ok"?"ok":DFL[k][0],DFL[k][2]]):[];}
function ficheBadges(suf){const f=ficx(suf); if(!f) return ""; const b=[];
 if(f.dpe) b.push(`<span class="hb ${/[FG]/.test(f.dpe)?"fbad":"old"}" title="DPE annoncé">DPE ${f.dpe}</span>`);
 (f.fl||[]).forEach(k=>{const d=DFL[k]; if(d) b.push(`<span class="hb ${d[0]==="bad"?"fbad":d[0]==="warn"?"fwarn":"drop"}" title="${esc(d[2])}">${d[1]}</span>`);});
 if(f.proc) b.push(`<span class="hb fbad" title="Copropriété en procédure selon l'annonce">copro en procédure</span>`);
 return b.join("");}
/* les badges de la fiche s'ajoutent à ceux de l'historique (nouveau, baisse, jours en ligne) partout où ils s'affichent */
const _vuBadgesF=vuBadges; vuBadges=function(kind,ck,suf){return _vuBadgesF(kind,ck,suf)+(kind==="v"?ficheBadges(suf):"");};
