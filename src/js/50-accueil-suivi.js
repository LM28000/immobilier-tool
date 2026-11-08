const MAIN_ST=["à voir","visité","offre faite","compromis","acheté"];

const dIso=d=>d.toISOString().slice(0,10), addD=(iso,n)=>{const d=new Date(iso+"T12:00:00"); d.setDate(d.getDate()+n); return dIso(d);};
const jourIso=()=>{const d=new Date(); return dIso(new Date(d.getTime()-d.getTimezoneOffset()*6e4));};
const JOURS=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."], MOISL=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function dateTxt(s,heure){if(!s) return ""; const d=new Date(s.length<=10?s+"T12:00:00":s); if(isNaN(d)) return ""; return `${JOURS[d.getDay()]} ${d.getDate()} ${MOISL[d.getMonth()]}`+(heure&&s.length>10?` · ${d.getHours()} h${d.getMinutes()?String(d.getMinutes()).padStart(2,"0"):""}`:"");}

/* étapes datées de l'achat d'un bien */
function suiviSteps(b){const s=b.suivi||{}, st=b.statut, i=MAIN_ST.indexOf(st), off=s.offre||null, comp=s.compromis||null;
 return [["offre","Offre envoyée",off,"date d'envoi de l'offre",i>=2],
  ["reponse","Réponse du vendeur",s.reponse||(off?addD(off,7):null),"date limite de l'offre (7 jours si rien n'est saisi)",i>=3],
  ["compromis","Compromis de vente",comp,"date de signature",i>=3&&!!comp],
  ["retract","Fin du délai de rétractation",comp?addD(comp,10):null,"10 jours après le compromis",i>=4||(comp&&addD(comp,10)<jourIso())],
  ["pret","Accord de prêt",s.pret||(comp?addD(comp,45):null),"date limite de la condition suspensive (45 jours si rien n'est saisi)",i>=4||!!s.pretOk],
  ["acte","Acte chez le notaire",s.acte||(comp?addD(comp,90):null),"date prévue (environ 3 mois après le compromis)",i>=4]]
  .map(([k,l,d,aide,done])=>({k,l,d,aide,done:!!done,saisie:["offre","reponse","compromis","pret","acte"].includes(k)}));}
function suiviNext(b){return suiviSteps(b).find(x=>!x.done&&x.d)||null;}
/* rubrique « Suivi de l'achat » des fiches de bien */
function suiviSec(b){if(!b.id||!["offre faite","compromis","acheté"].includes(b.statut)) return ["",""];
 const L=suiviSteps(b), nx=L.find(x=>!x.done&&x.d), off=+((b.visite||{}).offre)||0;
 const html=`<ol class="suivi">${L.map(x=>`<li class="${x.done?"done":nx&&nx.k===x.k?"next":""}"><i aria-hidden="true"></i><div><b>${x.l}</b>${x.d?` <span class="mono">${dateTxt(x.d)}</span>`:""}<small>${x.aide}</small>${x.saisie?`<label class="sdate">Date <input type="date" data-suivi="${b.id}|${x.k}" value="${esc((b.suivi||{})[x.k]||"")}"></label>`:""}${x.k==="pret"?`<label class="sdate"><input type="checkbox" data-suivi="${b.id}|pretOk"${(b.suivi||{}).pretOk?" checked":""}> prêt accordé</label>`:""}</div></li>`).join("")}</ol>
  ${off?`<p class="sub" style="margin:6px 0 0">Offre de <b class="mono">${eur(off)}</b> pour ${eur(+b.prix)} affichés.</p>`:`<p class="sub" style="margin:6px 0 0">Le montant de l'offre se saisit dans la visite.</p>`}
  <p class="sub" style="margin:4px 0 0">À réunir pour la banque : offre signée, 3 derniers bulletins de salaire, avis d'imposition, relevés de compte, plan de financement.</p>`;
 return [nx?`${nx.l} · ${dateTxt(nx.d)}`:"dates à saisir",html];}
document.addEventListener("change",e=>{const f=e.target.closest&&e.target.closest("[data-suivi]"); if(!f) return; const [id,k]=f.dataset.suivi.split("|"), b=BIENS.find(x=>x.id===id); if(!b) return;
 const s=Object.assign({},b.suivi||{}); if(f.type==="checkbox") s[k]=f.checked; else if(/^\d{4}-\d{2}-\d{2}$/.test(f.value)) s[k]=f.value; else delete s[k];
 const patch={suivi:s}; if(k==="compromis"&&s.compromis&&b.statut==="offre faite") patch.statut="compromis"; updBien(id,patch);});

/* nouveautés du dernier relevé, pour le type de bien choisi */
function nouveautes(){const iso=ADS.iso, ty=H.type, nw=[], dr=[], sold=[];
 Object.entries(HIST||{}).forEach(([ck,h])=>Object.entries((h&&h.v)||{}).forEach(([suf,e])=>{if(!e||((e.m&&e.m[3])||"studio")!==ty) return; const p=e.p||[];
  if(e.f===iso&&!e.g) nw.push({ck,suf,e}); if(p.length>1&&p[p.length-1][0]===iso&&p[p.length-1][1]<p[p.length-2][1]&&!e.g) dr.push({ck,suf,e}); if(e.g===iso) sold.push({ck,suf,e});}));
 return {nw,dr,sold};}

/* rendez-vous de visite (panneau de visite) */
document.addEventListener("change",e=>{const f=e.target.closest&&e.target.closest("[data-vrdv]"); if(!f) return; const b=BIENS.find(x=>x.id===f.dataset.vrdv); if(!b) return; const v=Object.assign({},b.visite||{}); if(f.value) v.rdv=f.value; else delete v.rdv; updBien(b.id,{visite:v});});

