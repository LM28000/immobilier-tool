/* ---------- financement : réglages, détail du prêt, part de chacun, scénarios ---------- */
Object.assign(H,{nomA:"", nomB:""});
(function(){try{const s=JSON.parse(localStorage.getItem("fin")||"null"); if(s){if(s.nomA) H.nomA=s.nomA; if(s.nomB) H.nomB=s.nomB;}}catch(_){}})();
const _saveFin=saveFin; saveFin=function(){_saveFin(); try{const s=JSON.parse(localStorage.getItem("fin")||"{}"); s.nomA=H.nomA; s.nomB=H.nomB; localStorage.setItem("fin",JSON.stringify(s));}catch(_){}};
const REG={auto:"le plus avantageux",micro:"micro-BIC",reel:"réel"};

/* scénarios « et si » */
const SCN={taux:false,vac3:false,trav:false,loyer:false,hz:15}, SCNR={};
const SCNL=[["taux","Taux +0,5 pt"],["vac3","3 mois vides/an"],["trav","5 k€ de travaux"],["loyer","Loyer −5 %"]];
function scnActive(){return SCN.taux||SCN.vac3||SCN.trav||SCN.loyer;}
function scnInner(key){const R=SCNR[key]; if(!R) return ""; const b=R(null), s=R({...SCN});
 const [bb]=bank(b.ratio), [sb]=bank(s.ratio), row=(l,f)=>`<tr><td>${l}</td><td class="r mono">${f(b)}</td><td class="r mono">${scnActive()?f(s):"—"}</td></tr>`;
 return `<div class="scnchips">${SCNL.map(([k,l])=>`<button type="button" class="chip${SCN[k]?" on":""}" data-scnk="${k}" aria-pressed="${SCN[k]}">${l}</button>`).join("")}
  <span class="seg2 hz" role="group" aria-label="Revente">${[7,10,15,25].map(v=>`<button type="button" data-scnhz="${v}" aria-pressed="${SCN.hz===v}">${v} ans</button>`).join("")}</span></div>
  ${scnActive()?"":`<p class="sub" style="margin:0 0 6px">Cochez une ou plusieurs hypothèses pour les comparer à la base : c'est une comparaison, rien n'est enregistré. La durée de revente s'applique aux deux colonnes.</p>`}<table class="scnt"><thead><tr><th></th><th class="r">Base</th><th class="r">Et si…</th></tr></thead><tbody>
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
function altIrr(x,short){const o=x.net?x.irrBrut:x.irrNet; return `<small class="alt">${short?"":x.net?"avant impôts ":"après impôts "}${short?(x.net?"brut ":"net "):""}${o==null?"n.d.":pct(o)}</small>${short?"":irrSpan(x)}`;}
/* fourchette : les deux autres scénarios que celui affiché */
function irrSpan(x){const o=irr3(x); if(!o) return ""; const f=v=>v==null?"n.d.":pct(v), cur=H.pess?"prudent":"central";
 const l=[["prudent","prudent"],["central","central"],["favorable","favorable"]].filter(([k])=>k!==cur).map(([k,t])=>`${t} ${f(o[k])}`).join(" · ");
 return `<small class="alt irr3">${l}${typeof tipBtn==="function"?" "+tipBtn("scn3"):""}</small>`;}
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

