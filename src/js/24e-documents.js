/* ================= documents à demander avant une offre =================
   Liste adaptée au bien : la copropriété (registre national : syndic, taille, époque, aides de l'Anah, résidence-service),
   l'annonce (bail en cours, vendu meublé, travaux votés, procédure, DPE, année de construction) et la loi :
   - documents de la copropriété à remettre au plus tard à la signature du compromis (loi ALUR, art. L721-2 du code de la construction) ;
   - diagnostics selon l'âge de l'immeuble : amiante si le permis de construire date d'avant le 1er juillet 1997, plomb si l'immeuble
     date d'avant 1949, électricité et gaz si l'installation a plus de 15 ans ; état des risques (moins de 6 mois), surface Carrez, DPE ;
     un DPE d'avant juillet 2021 n'est plus valable ;
   - projet de plan pluriannuel de travaux : copropriétés de plus de 15 ans, de toutes tailles depuis le 1er janvier 2025 ;
   - DPE collectif : immeubles dont le permis date d'avant 2013 (plus de 200 lots depuis 2024, 51 à 200 depuis 2025, 50 ou moins depuis 2026).
   Les clés pv, charges, fonds, diag et tfavis sont celles de la grille de visite (visite.check, communes à deux) : cocher ici ou là revient au même. */
function docsCtx(b){const s=b.kind==="v"?b.suf:(typeof bienSuf==="function"?bienSuf(b):null), f=s?ficheOf(b.ville,s):null, fx=(s&&ficx(s))||{}, ia=(f&&f.ia)||{}, fl=fx.fl||(f&&f.fl)||[];
 const R=typeof coproOf==="function"?coproOf(b):null, m=R&&R.m&&R.m.x?R.m:null, x=m?m.x:null, J=R&&R.J, per=x&&x[7]>=0&&J&&J.per[x[7]]?J.per[x[7]]:null;
 const an=(f&&+f.an)||null, Y=new Date().getFullYear(), y0=an||(per?per[1]:null), y1=an||(per?Math.min(per[2],Y):null);   /* années de construction possibles */
 return {f,fx,ia,fl,x,sure:!!m&&(m.how==="parcelle"||m.how==="meme-adresse"),Y,y0,y1,lots:x&&x[3]!=null?x[3]:(f&&f.lots)||null,
  loue:ia.loue===true||fl.includes("loue"),serv:fl.includes("serv")||!!ia.residence_geree,meub:fl.includes("meub"),vote:fl.includes("vote")||!!ia.travaux_votes,
  proc:!!(fx.proc||(f&&f.proc)),dpe:b.dpe||fx.dpe||(f&&f.dpe)||"",dpeDate:(f&&f.dpeDate)||"",dpe0:!!fx.dpe0,cop:(f&&typeof copAn==="function"&&(copAn(f)||copAn(fx)))||+b.copro*12||0,tf:ia.taxe_fonciere||+b.tf||0};}
/* l'immeuble est-il d'avant l'année a ? "oui" (construit avant a), "non" (construit en a2 ou après), "?" sinon (année inconnue, période du registre
   à cheval, ou entre les deux : le permis précède la construction de un à deux ans) */
const docsAvant=(c,a,a2)=>c.y1!=null&&c.y1<a?"oui":c.y0!=null&&c.y0>=(a2||a)?"non":"?";
function docsList(b){const c=docsCtx(b), G=[], reg=c.sure?"selon le registre des copropriétés":"selon le registre des copropriétés (copropriété probable)";
 /* la copropriété */
 const pp=docsAvant(c,c.Y-15), dc=docsAvant(c,2013,2015), dcq=c.lots==null?"depuis 2024 à 2026 selon sa taille":c.lots>200?"depuis 2024":c.lots>50?"depuis 2025":"depuis 2026";
 G.push(["La copropriété",[
  ["copro","Règlement de copropriété, état descriptif de division, fiche synthétique et carnet d'entretien","à remettre au plus tard à la signature du compromis (loi ALUR)"],
  ["pv","Procès-verbaux des 3 dernières assemblées générales","travaux votés ou envisagés, litiges, impayés : c'est là qu'ils se lisent"],
  ["charges","Charges des deux derniers exercices, courantes et hors budget",c.cop?`l'annonce dit ${eur(c.cop)} par an : à vérifier sur les appels de fonds`:"le calcul les estime : le vrai montant change le rendement"],
  ["preetat","Pré-état daté","sommes dues par le vendeur, impayés de la copropriété, dettes envers les fournisseurs"],
  ["fonds","Fonds de travaux et travaux votés",c.vote?"l'annonce parle de travaux votés : leur montant, et qui les paie (celui qui est propriétaire à la date de chaque appel de fonds, sauf accord au compromis)":"montant attaché au lot, travaux votés ou envisagés et leur calendrier"],
  pp!=="non"&&["pppt","Projet de plan pluriannuel de travaux",`obligatoire depuis 2025 ${pp==="?"?"si l'immeuble a plus de 15 ans":"(immeuble de plus de 15 ans)"} ; il chiffre les travaux des dix prochaines années`],
  dc!=="non"&&["dpecol","DPE collectif de l'immeuble",`obligatoire ${dcq} ${dc==="?"?"si le permis de construire date d'avant 2013":"(immeuble d'avant 2013)"} ; il annonce les travaux d'énergie de tout l'immeuble`],
  c.x&&(c.x[9]===1||c.x[9]===2)&&["syndic","Qui gère la copropriété, ses comptes et ses dernières décisions",`aucun syndic en mandat ${reg} : sans syndic, ni assemblée générale ni fonds de travaux ; il faudra peut-être en faire désigner un`],
  c.x&&c.x[8]===2&&!(c.x[9]===1||c.x[9]===2)&&["benevole","Comptes approuvés et budget voté",`syndic bénévole (un copropriétaire) ${reg} : vérifiez que les comptes sont tenus et approuvés chaque année`],
  c.x&&c.x[11]&2&&["anah","Travaux aidés par l'Anah",`aides reçues depuis 2014 ${reg} : quels travaux, et la copropriété suit-elle un plan de sauvegarde ou un programme pour copropriétés en difficulté ?`],
  c.x&&c.x[11]&1&&["service","Détail des charges de services",`résidence-service ${reg} : accueil, restauration ou animation payés dans les charges, en partie non récupérables sur le locataire`],
  c.proc&&["proc","Procédure en cours : jugements et état de la procédure","l'annonce signale une procédure : impayés, litige avec un copropriétaire ou une entreprise ?"]].filter(Boolean)]);
 /* le logement */
 const am=docsAvant(c,1998,2000), pb=docsAvant(c,1949), fg=/^[FG]$/.test(c.dpe);
 const dg=["DPE","surface Carrez","état des risques et pollutions (moins de 6 mois)",am==="oui"?"amiante (permis d'avant juillet 1997)":am==="?"?"amiante si le permis de construire date d'avant juillet 1997":"",pb==="oui"?"plomb (immeuble d'avant 1949)":pb==="?"?"plomb si l'immeuble date d'avant 1949":"","électricité et gaz si les installations ont plus de 15 ans","termites si la commune est en zone délimitée par arrêté"].filter(Boolean);
 const B=typeof bruitOf==="function"?(()=>{try{const r=calcBien(b); return bruitOf(b,r.t);}catch(_){return {};}})():{};
 G.push(["Le logement",[
  ["diag","Dossier de diagnostics techniques",dg.join(" · ")+(c.y0!=null?` ; immeuble ${c.an?"de "+c.an:c.y0===c.y1?"de "+c.y0:`construit de ${c.y0} à ${c.y1}`}${c.an?"":" "+reg}`:"")],
  c.dpeDate&&c.dpeDate<"2021-07"&&["dpeold","Un DPE récent","celui de l'annonce date d'avant juillet 2021 (ancienne méthode) : il n'est plus valable"],
  !fg&&c.dpe0&&["dpe27","L'étiquette DPE à jour au 1er janvier 2027","le nouveau calcul donne une meilleure classe que l'annonce : elle est gratuite sur l'Observatoire DPE de l'ADEME"],
  fg&&["dpefg","Audit ou devis de rénovation énergétique",`DPE ${c.dpe} : location ${c.dpe==="G"?"déjà interdite":"interdite en 2028"} sans travaux ; le coût réel remplace l'estimation du calcul`],
  ["tfavis","Dernier avis de taxe foncière",c.tf?"l'annonce donne un montant : à vérifier":"le calcul l'estime avec le taux de la ville"],
  c.meub&&["meubles","Liste des meubles vendus, avec leur valeur","vendu meublé : listés et chiffrés au compromis, les meubles ne paient pas les droits de mutation (frais de notaire)"],
  B&&B.peb&&["peb",`Exposition au bruit de l'aéroport (${esc(B.peb.nom)})`,`zone ${(typeof BRZ!=="undefined"&&BRZ[B.peb.zone])||B.peb.zone} du plan d'exposition au bruit : à mentionner par le vendeur ; écoutez les survols à la visite`]].filter(Boolean)]);
 /* le bail */
 const zt=typeof ZTEN!=="undefined"&&ZTEN.has(b.ville);
 const bl=c.serv?[["bailcom","Bail commercial, avenants et loyers versés par l'exploitant sur 3 ans","résidence gérée : durée restante du bail, indexation, travaux à la charge du propriétaire, santé du gestionnaire"]]
  :c.loue?[["bail","Bail en cours et ses avenants",`${c.ia.fin_bail?"fin annoncée : "+esc(c.ia.fin_bail)+" ; ":""}type de bail (vide ou meublé), loyer et révisions : le bail continue avec vous`],
   ["edl",`État des lieux d'entrée${c.meub?" et inventaire du mobilier":""}`,"la référence au départ du locataire"],
   ["depot","Montant du dépôt de garantie","le nouveau propriétaire devra le rendre au locataire : à transférer à la vente ou à déduire du prix"],
   ["quittances","Relevé des loyers payés sur un an","le locataire paie-t-il à l'heure ?"]]
  :zt?[["dernierloyer","Le dernier loyer, si le logement a été loué ces 18 derniers mois","zone tendue : il plafonne le loyer du prochain locataire (revalorisé de l'indice des loyers)"]]:[];
 if(bl.length) G.push([c.serv?"Le bail commercial":c.loue?"Le bail en cours":"Le loyer",bl]);
 return G;}
const docsN=b=>docsList(b).reduce((s,g)=>s+g[1].length,0);
/* cocher un document reçu (bien suivi) : la même case que dans la grille de visite */
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-v2doc]"); if(!t) return; e.preventDefault();
 const [id,k]=t.dataset.v2doc.split("|"), b=(typeof BIENS!=="undefined"?BIENS:[]).find(x=>x.id===id); if(!b||typeof updBien!=="function") return;
 const v=JSON.parse(JSON.stringify(b.visite||{})); v.check=v.check||{}; v.check[k]=v.check[k]==="oui"?null:"oui"; t.setAttribute("aria-pressed",String(v.check[k]==="oui")); updBien(id,{visite:v});});
