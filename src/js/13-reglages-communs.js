/* ---------- réglages communs à deux ----------
   Hypothèses, financement, valeurs par type de bien et critères de recherche : une seule version pour le groupe, gardée dans une
   ligne spéciale de la liste commune (data.kind = "reglages", même table que les biens). Elle profite de ce que la liste fait déjà :
   relecture toutes les 20 secondes, fusion des modifications faites en même temps (merge3), copie hors ligne.
   Sans liste commune, rien ne change : les réglages restent dans ce navigateur.
   Restent à chacun : le scénario affiché (prudent, central, favorable) et le type de bien regardé, qui sont des façons de regarder.
   Au premier passage, la ligne est créée avec les réglages de la personne qui ouvre ; l'autre reçoit ensuite ces valeurs et un message
   dit lesquelles ont remplacé les siennes. Une ligne créée avec les valeurs d'exemple (exemple: true) ne remplace pas de vraies
   valeurs : la personne qui en a les envoie à la place. */
const FINK=["garantie","regime","cfe","compta"];   /* et les associés (H.assoc), à part */
const CRIT0={budget:90000,rmin:3,bank:true};
let NOSCRIT=null; try{const c=JSON.parse(localStorage.getItem("crit")||"null"); if(c&&typeof c==="object"&&!Array.isArray(c)) NOSCRIT=c;}catch(_){}
let REGL=null, REGREADY=false, REGNEW=false, REGT=0, REGIN=false;
const critV=()=>Object.assign({},CRIT0,NOSCRIT||{});
const regShared=()=>!!(typeof DB!=="undefined"&&DB&&!DB.local);
function regLab(k){const L={surcote:"prix payé vs prix moyen",loyerAdj:"loyer obtenu",taux:"taux du crédit",tmiA:"tranche d'impôt 1",tmiB:"tranche d'impôt 2",regime:"régime fiscal",
  assurA:"assurance du prêt 1",assurB:"assurance du prêt 2",quotA:"quotité 1",quotB:"quotité 2",garantie:"garantie du prêt",cfe:"CFE",compta:"comptable",nomA:"prénom 1",nomB:"prénom 2",
  budget:"budget",rmin:"rendement minimum",bank:"banque",assoc:"associés"};
 return L[k]||((hypDefs.find(d=>d[0]===k)||[])[1]||k).toLowerCase();}
function saveCrit(){try{localStorage.setItem("crit",JSON.stringify(NOSCRIT));}catch(_){} regPush();}
function regVals(){const hyp={}, fin={}; HYPK.forEach(k=>{hyp[k]=H[k];}); FINK.forEach(k=>{if(H[k]!=null&&H[k]!=="") fin[k]=H[k];}); fin.assoc=JSON.parse(JSON.stringify(H.assoc));
 return {hyp,fin,tyv:JSON.parse(JSON.stringify(TYV)),crit:NOSCRIT?Object.assign({},NOSCRIT):null};}
/* qui a modifié les réglages communs, et quand (onglet Budget) */
function regInfo(){if(!regShared()) return null; const d=REGL&&REGL.data||{}; return {par:d.par||"",le:d.le||"",pret:REGREADY};}

/* appelé par la liste commune (11-nos-biens.js) à chaque lecture : retire la ligne des réglages et l'applique */
function regTake(docs){const out=[], R=[];
 docs.forEach(d=>{let x=null; try{x=d.data();}catch(_){} if(x&&x.kind==="reglages") R.push({id:d.id,data:x}); else out.push(d);});
 if(!regShared()){if(!REGREADY){REGREADY=true; document.dispatchEvent(new Event("reglages"));} return out;}
 R.sort((a,b)=>String(a.data.cree||"").localeCompare(String(b.data.cree||"")));
 /* deux lignes créées en même temps : la plus ancienne fait foi, l'autre est retirée */
 R.slice(1).forEach(r=>{try{DB.collection("biens").doc(r.id).delete();}catch(_){}});
 const first=!REGREADY; REGREADY=true;
 if(R[0]&&first&&R[0].data.exemple===true&&HYPOK){REGL=R[0]; REGNEW=false; regPush();}
 else if(R[0]){REGL=R[0]; REGNEW=false; regApply(R[0].data,first);
  if((!R[0].data.crit&&NOSCRIT)||(!R[0].data.tyv&&Object.keys(TYV).length)||!(R[0].data.fin&&R[0].data.fin.assoc)) regPush();}
 else if(!REGNEW){REGNEW=true; setTimeout(regSend,0);}
 if(first) document.dispatchEvent(new Event("reglages"));
 return out;}

function regApply(d,first){const ch=[];
 const setK=(k,v)=>{if(v==null||(typeof v==="number"&&!isFinite(v))) return; if(H[k]!==v){ch.push(k); H[k]=v;}};
 REGIN=true;
 try{
  if(d.hyp&&typeof d.hyp==="object") HYPK.forEach(k=>{if(typeof d.hyp[k]==="number") setK(k,d.hyp[k]);});
  if(d.fin&&typeof d.fin==="object") FINK.forEach(k=>{const v=d.fin[k]; if(typeof v==="number"||(typeof v==="string"&&v.length<=40)) setK(k,v);});
  if(d.fin&&Array.isArray(d.fin.assoc)&&d.fin.assoc.length){if(JSON.stringify(d.fin.assoc)!==JSON.stringify(H.assoc)){H.assoc=JSON.parse(JSON.stringify(d.fin.assoc)); assocNorm(); ch.push("assoc");}}
  else if(d.hyp) assocFromLegacy({salaires:d.hyp.salaires,pretEtud:d.hyp.pretEtud});   /* réglages communs d'avant les associés : revenus et crédits répartis */
  if(d.tyv&&typeof d.tyv==="object"&&!Array.isArray(d.tyv)&&JSON.stringify(d.tyv)!==JSON.stringify(TYV)){
   TYV=JSON.parse(JSON.stringify(d.tyv)); saveTyvLocal(); const v=typeVals(H.type); TYK.forEach(k=>setK(k,v[k]));}
  if(d.crit&&typeof d.crit==="object"&&!Array.isArray(d.crit)&&JSON.stringify(d.crit)!==JSON.stringify(NOSCRIT)){
   if(NOSCRIT) ["budget","rmin","bank"].forEach(k=>{if(NOSCRIT[k]!==d.crit[k]) ch.push(k);});
   NOSCRIT={budget:+d.crit.budget||CRIT0.budget,rmin:isFinite(+d.crit.rmin)?+d.crit.rmin:CRIT0.rmin,bank:d.crit.bank!==false};
   try{localStorage.setItem("crit",JSON.stringify(NOSCRIT));}catch(_){} if(!ch.length) ch.push("");}
  if(ch.length){saveHyp(); saveFin();}   /* copie locale (REGIN empêche le renvoi) */
 }finally{REGIN=false;}
 if(!ch.length) return;
 [typeof CALCC!=="undefined"&&CALCC,typeof VC!=="undefined"&&VC,typeof RBL!=="undefined"&&RBL].forEach(m=>m&&m.clear&&m.clear());
 if(typeof QBOXK!=="undefined") QBOXK=null;
 /* champs de l'ancienne interface, remplis une seule fois au départ */
 ch.forEach(k=>["f-","s-","fin-"].forEach(p=>{const el=k&&document.getElementById(p+k); if(el&&document.activeElement!==el) el.value=H[k];}));
 const lab=[...new Set(ch.filter(Boolean).map(regLab))], me=myName(), who=d.par&&d.par!==me?d.par:"";
 if(lab.length) toast(first?`Réglages communs appliqués : ${lab.join(", ")} (vos valeurs étaient différentes).`:`${who?who+" a modifié":"Modifiés"} les réglages communs : ${lab.join(", ")}.`);
 render();}

/* envoi des réglages (après chaque changement, groupé) */
function regPush(){if(REGIN||!regShared()) return; clearTimeout(REGT); REGT=setTimeout(regSend,700);}
async function regSend(){if(!regShared()) return; if(!REGREADY){REGT=setTimeout(regSend,1500); return;}
 const le=new Date().toISOString(), v=Object.assign({par:myName()||"",le,exemple:REGL?false:!HYPOK},regVals());
 try{if(REGL) await DB.collection("biens").doc(REGL.id).update(v);
  else {REGNEW=true; await DB.collection("biens").add(Object.assign({kind:"reglages",cree:le},v));}}
 catch(e){toast("Réglages non partagés ("+(e&&e.code||"erreur")+") : ils restent dans ce navigateur.");}}

/* revenir aux valeurs de départ (pour vous deux) */
function regReset(){HYPK.forEach(k=>{if(HDEF[k]!=null) H[k]=HDEF[k];}); FINK.forEach(k=>{if(HDEF[k]!=null) H[k]=HDEF[k];});
 /* associés : mêmes prénoms et même nombre, revenus du défaut partagés, tranches et assurances par défaut */
 const n=H.assoc.length; H.assoc=H.assoc.map(a=>Object.assign(assoc0(n),{nom:a.nom})); assocNorm();
 TYV={}; saveTyvLocal(); Object.assign(H,typeVals(H.type));
 REGIN=true; try{saveHyp(); saveFin();}finally{REGIN=false;} regPush();
 [typeof CALCC!=="undefined"&&CALCC,typeof VC!=="undefined"&&VC,typeof RBL!=="undefined"&&RBL].forEach(m=>m&&m.clear&&m.clear()); render();}
