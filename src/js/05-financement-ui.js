/* ---------- financement : réglages, détail du prêt, part de chacun, scénarios ---------- */
Object.assign(H,{nomA:"Louis-Marie", nomB:"Associée"});
(function(){try{const s=JSON.parse(localStorage.getItem("fin")||"null"); if(s){if(s.nomA) H.nomA=s.nomA; if(s.nomB) H.nomB=s.nomB;}}catch(_){}})();
const _saveFin=saveFin; saveFin=function(){_saveFin(); try{const s=JSON.parse(localStorage.getItem("fin")||"{}"); s.nomA=H.nomA; s.nomB=H.nomB; localStorage.setItem("fin",JSON.stringify(s));}catch(_){}};
const REG={auto:"le plus avantageux",micro:"micro-BIC",reel:"réel"};
const TMIS=[0,11,30,41,45];

/* réglages */
function initFin(){const box=document.getElementById("finFields"); if(!box) return;
 const num=(k,l,u,st)=>`<label class="f" for="fin-${k}">${l}<span class="inp"><input id="fin-${k}" data-fk="${k}" type="number" inputmode="decimal" step="${st}" value="${H[k]}"><span>${u}</span></span></label>`;
 const txt=(k,l)=>`<label class="f" for="fin-${k}">${l}<span class="inp"><input id="fin-${k}" data-fk="${k}" data-txt="1" type="text" value="${esc(H[k])}"></span></label>`;
 const sel=(k,l,opts)=>`<label class="f" for="fin-${k}">${l}<span class="inp"><select id="fin-${k}" data-fk="${k}">${opts.map(([v,t])=>`<option value="${v}"${String(H[k])===String(v)?" selected":""}>${t}</option>`).join("")}</select></span></label>`;
 box.innerHTML=txt("nomA","Prénom 1")+txt("nomB","Prénom 2")
  +sel("tmiA",`Tranche d'impôt (TMI) 1`,TMIS.map(v=>[v,v+" %"]))+sel("tmiB",`Tranche d'impôt (TMI) 2`,TMIS.map(v=>[v,v+" %"]))
  +sel("regime","Régime fiscal",[["auto","Le plus avantageux"],["micro","Micro-BIC"],["reel","Réel"]])
  +num("assurA","Assurance prêt 1","%/an",0.01)+num("quotA","Quotité 1","%",10)+num("assurB","Assurance prêt 2","%/an",0.01)+num("quotB","Quotité 2","%",10)
  +num("garantie","Garantie du prêt","% du prêt",0.1)+num("cfe","CFE","€/an",50)+num("compta","Comptable (réel)","€/an",50);
 box.addEventListener("input",e=>{const el=e.target.closest("[data-fk]"); if(!el) return; const k=el.dataset.fk;
  if(el.dataset.txt) H[k]=el.value.trim()||H[k]; else if(k==="regime") H[k]=el.value; else {const v=parseFloat(el.value); if(isNaN(v)) return; H[k]=v;}
  saveFin(); render();});
 box.addEventListener("change",e=>{if(e.target.tagName==="SELECT") e.target.dispatchEvent(new Event("input",{bubbles:true}));});}

/* détail du prêt pour la ville sélectionnée */
let EXTRA={amt:0,y:5};
function renderFin(){const box=document.getElementById("finDetail"); if(!box) return; const c=C.find(v=>v.k===SEL), x=calc(c);
 const L=x.loan, tot=L.Y.reduce((s,y)=>s+y.int,0), totIns=L.Y.reduce((s,y)=>s+y.ins,0);
 const A=micro=>{const s=H.regime; H.regime=micro; const r=calc(c); H.regime=s; return r;}, xm=A("micro"), xr=A("reel");
 let ex=""; if(EXTRA.amt>0){const L2=loanYears(x.P,x.taux,H.duree,x.ins,EXTRA), t2=L2.Y.reduce((s,y)=>s+y.int,0), gain=L.months-L2.months;
  ex=`<p class="finres">Prêt fini <b>${Math.floor(gain/12)} an${gain>=24?"s":""}${gain%12?` et ${gain%12} mois`:""} plus tôt</b>, <b>${eur(tot-t2)}</b> d'intérêts en moins (mensualité inchangée).</p>`;}
 const half=v=>v*H.partA/100, other=v=>v*(100-H.partA)/100;
 box.innerHTML=`<p class="sub" style="margin:8px 0">Pour un studio moyen à <b>${c.name}</b> (${keur(x.bien)}), avec vos réglages. Ordres de grandeur : ce n'est pas un conseil fiscal ni bancaire.</p>
 <div class="fingrid">
  <div class="fincard"><h3>Le prêt</h3>
   <div class="trow"><span>Emprunté</span><b class="mono">${eur(x.P)}</b></div>
   <div class="trow"><span>Mensualité crédit</span><b class="mono">${eur(x.M0)}</b></div>
   <div class="trow"><span>Assurance (vous deux)</span><b class="mono">${eur(x.ins)}/mois</b></div>
   <div class="trow"><span>Garantie (payée au départ)</span><b class="mono">${eur(x.gar)}</b></div>
   <div class="trow"><span>Coût total du crédit</span><b class="mono">${eur(tot+totIns+x.gar)}</b></div></div>
  <div class="fincard"><h3>Pour chacun (${H.partA}/${100-H.partA})</h3>
   <div class="trow"><span></span><b>${esc(H.nomA)}</b><b>${esc(H.nomB)}</b></div>
   <div class="trow"><span>Apport</span><b class="mono">${eur(half(H.apport))}</b><b class="mono">${eur(other(H.apport))}</b></div>
   <div class="trow"><span>Mensualité</span><b class="mono">${eur(half(x.mens))}</b><b class="mono">${eur(other(x.mens))}</b></div>
   <div class="trow"><span>Cash-flow / mois</span><b class="mono ${x.cf>=0?"pos":"neg"}">${sgn(half(x.cf))}</b><b class="mono ${x.cf>=0?"pos":"neg"}">${sgn(other(x.cf))}</b></div>
   <div class="trow"><span>Impôts année 1</span><b class="mono">${eur(x.impA)}</b><b class="mono">${eur(x.impB)}</b></div>
   <p class="sub" style="margin:4px 0 0">Les impôts diffèrent selon la tranche de chacun (${H.tmiA} % et ${H.tmiB} %) ; les prélèvements sociaux (${fr(FISC.ps)} %) s'appliquent à tous les deux.</p></div>
  <div class="fincard"><h3>Impôts : micro-BIC ou réel ?</h3>
   <div class="trow"><span></span><b>Micro-BIC</b><b>Réel</b></div>
   <div class="trow"><span>Impôts à deux, année 1</span><b class="mono">${eur(xm.imp1)}</b><b class="mono">${eur(xr.imp1)}</b></div>
   <div class="trow"><span>Moyenne sur 10 ans</span><b class="mono">${eur(xm.imp10)}/an</b><b class="mono">${eur(xr.imp10)}/an</b></div>
   <div class="trow"><span>Frais (CFE, comptable)</span><b class="mono">${eur(xm.fees1)}/an</b><b class="mono">${eur(xr.fees1)}/an</b></div>
   <div class="trow"><span>Rendement 15 ans, revente comprise</span><b class="mono">${xm.irr==null?"n.d.":pct(xm.irr)}</b><b class="mono">${xr.irr==null?"n.d.":pct(xr.irr)}</b></div>
   <p class="sub" style="margin:4px 0 0">Régime retenu : <b>${REG[x.regime]}</b>${H.regime==="auto"?" (choisi automatiquement)":""}. Au réel, l'amortissement efface l'impôt pendant des années, mais depuis 2025 il est réintégré dans la plus-value à la revente, et il faut un comptable.</p></div>
 </div>
 <h3 class="psec">Remboursement anticipé</h3>
 <div class="fields" style="margin-top:4px"><label class="f" for="ex-amt">Montant<span class="inp"><input id="ex-amt" type="number" step="1000" value="${EXTRA.amt||""}" placeholder="ex. 10000"><span>€</span></span></label>
  <label class="f" for="ex-y">Au bout de<span class="inp"><input id="ex-y" type="number" step="1" min="1" max="${H.duree-1}" value="${EXTRA.y}"><span>ans</span></span></label></div>${ex}
 <h3 class="psec">Tableau d'amortissement</h3>
 <div class="scrollbox"><table class="adt"><thead><tr><th class="r">Année</th><th class="r">Intérêts</th><th class="r">Capital</th><th class="r hm">Assurance</th><th class="r">Reste dû</th></tr></thead><tbody>
 ${(EXTRA.amt>0?loanYears(x.P,x.taux,H.duree,x.ins,EXTRA):L).Y.map((y,i)=>`<tr><td class="r mono">${i+1}</td><td class="r mono">${eur(y.int)}</td><td class="r mono">${eur(y.cap)}${y.extra?" *":""}</td><td class="r mono hm">${eur(y.ins)}</td><td class="r mono">${eur(y.crd)}</td></tr>`).join("")}
 </tbody></table></div>`;
 const bind=(id,k)=>{const el=document.getElementById(id); el.addEventListener("change",()=>{const v=parseFloat(el.value); EXTRA[k]=isNaN(v)?0:v; renderFin();});};
 bind("ex-amt","amt"); bind("ex-y","y");}

/* scénarios « et si » */
const SCN={taux:false,vac3:false,trav:false,loyer:false,hz:15}, SCNR={};
const SCNL=[["taux","Taux +0,5 pt"],["vac3","3 mois vides/an"],["trav","5 k€ de travaux"],["loyer","Loyer −5 %"]];
function scnActive(){return SCN.taux||SCN.vac3||SCN.trav||SCN.loyer;}
function scnInner(key){const R=SCNR[key]; if(!R) return ""; const b=R(null), s=R({...SCN});
 const [bb]=bank(b.ratio), [sb]=bank(s.ratio), row=(l,f)=>`<tr><td>${l}</td><td class="r mono">${f(b)}</td><td class="r mono">${scnActive()?f(s):"—"}</td></tr>`;
 return `<div class="scnchips">${SCNL.map(([k,l])=>`<button type="button" class="chip${SCN[k]?" on":""}" data-scnk="${k}" aria-pressed="${SCN[k]}">${l}</button>`).join("")}
  <span class="seg2 hz" role="group" aria-label="Revente">${[7,10,15,25].map(v=>`<button type="button" data-scnhz="${v}" aria-pressed="${SCN.hz===v}">${v} ans</button>`).join("")}</span></div>
  ${scnActive()?"":`<p class="sub" style="margin:0 0 6px">Cochez une ou plusieurs hypothèses pour les comparer à la base. La durée de revente s'applique aux deux colonnes.</p>`}<table class="scnt"><thead><tr><th></th><th class="r">Base</th><th class="r">Et si…</th></tr></thead><tbody>
  ${row("Cash-flow / mois",x=>`<span class="${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}</span>`)}
  ${row("Rendement, revente à "+SCN.hz+" ans",x=>x.irr==null?"n.d.":`<b style="color:${colIrr(x.irr)}">${pct(x.irr)}</b>`)}
  ${row("Banque",x=>{const [c,t]=bank(x.ratio); return `<span class="pill ${c}">${t}</span>`;})}
  ${R.price?row("Prix max. autofinancé",x=>x.pmax==null?"—":"≤ "+keur(x.pmax)):""}
  </tbody></table>`;}
function scnBox(key,fn){SCNR[key]=fn; return `<div class="scnbox" data-scnbox="${key}">${scnInner(key)}</div>`;}
function scnRefresh(){document.querySelectorAll("[data-scnbox]").forEach(el=>{const k=el.dataset.scnbox; el.innerHTML=scnInner(k);});}
document.addEventListener("click",e=>{const k=e.target.closest&&e.target.closest("[data-scnk]"), h=e.target.closest&&e.target.closest("[data-scnhz]"); if(!k&&!h) return; e.preventDefault();
 if(k) SCN[k.dataset.scnk]=!SCN[k.dataset.scnk]; else SCN.hz=+h.dataset.scnhz; scnRefresh();});
// ville : calcul « base » avec la même revente que le scénario pour comparer à durée égale
function scnCity(c){return s=>calc(Object.assign({},c,{_s:s||{hz:SCN.hz}}));}
function scnBien(b){const f=s=>{const sc=s||{hz:SCN.hz}, x=calcBien(b,sc).x, pr=+b.prix||60000;
  const pmax=priceFor(null,[0,0,pr],p=>calcBien(Object.assign({},b,{prix:p}),sc).x.cf>=0); return Object.assign({},x,{pmax});}; f.price=true; return f;}

/* ligne « après impôts » des fiches */
const mlab=()=>H.net?"net":"brut";
function altCf(x,short){const o=x.net?x.cfBrut:x.cfNet; return `<small class="alt">${short?"":x.net?"avant impôts ":"après impôts "}${short?(x.net?"brut ":"net "):""}${sgn(o)}</small>`;}
function altIrr(x,short){const o=x.net?x.irrBrut:x.irrNet; return `<small class="alt">${short?"":x.net?"avant impôts ":"après impôts "}${short?(x.net?"brut ":"net "):""}${o==null?"n.d.":pct(o)}</small>`;}
function taxLine(x){const cfe=x.fees1-(x.regime==="reel"?H.compta:0), comp=x.regime==="reel"?H.compta:0, m=v=>eur(v/12);
 return `<details class="b2n"><summary><span>Du brut au net</span><span class="mono"><span class="${x.cfBrut>=0?"pos":"neg"}">${sgn(x.cfBrut)}</span> → <span class="${x.cfNet>=0?"pos":"neg"}">${sgn(x.cfNet)}</span>/mois</span></summary>
  <div class="trow"><span>Cash-flow avant impôts</span><b class="mono">${sgn(x.cfBrut)}/mois</b></div>
  <div class="trow"><span>Impôts sur les loyers (${REG[x.regime]}, TMI ${H.tmiA} % et ${H.tmiB} % + prélèvements sociaux)</span><b class="mono">−${m(x.imp1)}</b></div>
  <div class="trow"><span>CFE${cfe?"":" (exonérée sous 5 000 € de recettes)"}</span><b class="mono">−${m(cfe)}</b></div>
  ${comp?`<div class="trow"><span>Comptable (régime réel)</span><b class="mono">−${m(comp)}</b></div>`:""}
  <div class="trow tot"><span>Cash-flow net</span><b class="mono ${x.cfNet>=0?"pos":"neg"}">${sgn(x.cfNet)}/mois</b></div>
  <div class="trow"><span>Impôt sur la plus-value si revente à ${x.hz} ans</span><b class="mono">−${eur(x.pv15)}</b></div>
  <div class="trow"><span>Rendement de la mise sur ${x.hz} ans</span><b class="mono">${x.irrBrut==null?"n.d.":pct(x.irrBrut)} brut → ${x.irrNet==null?"n.d.":pct(x.irrNet)} net</b></div>
  <div class="trow"><span>Rendement locatif brut (loyers ÷ prix tout compris)</span><b class="mono">${pct(x.brut)}</b></div></details>`;}

/* sélecteur chiffres nets / bruts */
function syncNet(){document.querySelectorAll("#netSeg [data-net]").forEach(b=>b.setAttribute("aria-pressed",String((b.dataset.net==="1")===H.net)));}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("#netSeg [data-net]"); if(!b) return; H.net=b.dataset.net==="1"; try{localStorage.setItem("chiffres",H.net?"net":"brut");}catch(_){} syncNet(); render(); toast(H.net?"Chiffres nets : après impôts, CFE, comptable et impôt sur la plus-value.":"Chiffres bruts : avant impôts et frais fiscaux.");});
syncNet();
