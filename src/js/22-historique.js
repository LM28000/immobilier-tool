/* ---------- historique des annonces : baisses de prix, ancienneté, vendues ---------- */
const HSTART=(()=>{let m=null; Object.values(HIST).forEach(c=>["v","l"].forEach(k=>Object.values(c[k]||{}).forEach(e=>{if(!m||e.f<m) m=e.f;}))); return m;})();
const DAY=864e5, isoD=s=>new Date(s+"T12:00:00"), todayIso=()=>ADS.iso||new Date().toISOString().slice(0,10);
const dm=s=>{const d=isoD(s); return `${d.getDate()}/${String(d.getMonth()+1).padStart(2,"0")}`;};
/* premier relevé de chaque ville : une annonce déjà là ce jour-là n'est pas « nouvelle » (sinon l'arrivée d'une ville marque tout) */
const HSC={};
function hStart(ck,kind){const E=HIST[ck]&&HIST[ck][kind]; if(!E) return null; const n=Object.keys(E).length, k=ck+"|"+kind, c=HSC[k]; if(c&&c.n===n) return c.m;
 let m=null; Object.values(E).forEach(e=>{if(e&&e.f&&(!m||e.f<m)) m=e.f;}); HSC[k]={n,m}; return m;}
function vu(kind,ck,suf){const e=HIST[ck]&&HIST[ck][kind]&&HIST[ck][kind][suf]; if(!e) return null; const s0=hStart(ck,kind);
 const days=Math.round((isoD(e.g||todayIso())-isoD(e.f))/DAY), P=e.p, drops=P.filter((x,i)=>i&&x[1]<P[i-1][1]).length;
 let last=null; for(let i=P.length-1;i>0;i--) if(P[i][1]<P[i-1][1]){last={d:P[i][0],amt:P[i-1][1]-P[i][1]}; break;}
 return {days,drops,last,first:P[0][1],p:P,gone:e.g||null,isNew:!!(s0&&e.f>s0&&days<=2),m:e.m};}
function vuBadges(kind,ck,suf){const v=vu(kind,ck,suf); if(!v) return ""; const b=[];
 if(v.last) b.push(`<span class="hb drop" title="Prix initial ${keur(v.first)}">↓ ${keur(v.last.amt)} le ${dm(v.last.d)}</span>`);
 if(v.isNew) b.push(`<span class="hb new">nouveau</span>`);
 else if(v.days>=14) b.push(`<span class="hb old" title="Vue pour la première fois le ${dm(HIST[ck][kind][suf].f)}">${v.days} j en ligne</span>`);
 return b.join("");}
function priceCurve(v){if(!v||v.p.length<2) return ""; const P=v.p.concat([[todayIso(),v.p[v.p.length-1][1]]]), W=420, H=80, t0=isoD(P[0][0]), t1=isoD(P[P.length-1][0]), lo=Math.min(...P.map(x=>x[1]))*0.98, hi=Math.max(...P.map(x=>x[1]))*1.02;
 const X=d=>30+(W-60)*((isoD(d)-t0)/((t1-t0)||1)), Y=p=>8+(H-26)*(hi-p)/((hi-lo)||1); let d="", px=null;
 P.forEach(([dd,p],i)=>{const x=X(dd), y=Y(p); d+=i?`H${x.toFixed(1)}V${y.toFixed(1)}`:`M${x.toFixed(1)} ${y.toFixed(1)}`;});
 return `<div class="pcurve"><h2 class="psec" style="margin:10px 0 4px">Évolution du prix</h2><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution du prix"><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2"/>
  ${v.p.map(([dd,p])=>`<circle cx="${X(dd)}" cy="${Y(p)}" r="3.5" fill="var(--accent)"/><text x="${X(dd)}" y="${Y(p)-7}" text-anchor="middle" font-size="10.5" class="mono" fill="var(--fg)">${keur(p)}</text><text x="${X(dd)}" y="${H-4}" text-anchor="middle" font-size="10" fill="var(--muted)">${dm(dd)}</text>`).join("")}</svg></div>`;}
function soldList(ck,sector){const HV=HIST[ck], ty=H.type||"studio"; if(!HV) return []; return Object.entries(HV.v||{}).filter(([,e])=>e.g&&(e.m[3]||"studio")===ty&&(sector==null||e.m[1]===sector)).map(([k,e])=>({k,e})).sort((a,b)=>b.e.g.localeCompare(a.e.g));}
function soldTable(ck,list){return `<div class="scrollbox"><table class="adt"><thead><tr><th>Secteur</th><th class="r">m²</th><th class="r">Dernier prix</th><th class="r hm">€/m²</th><th class="r">En ligne</th><th class="r">Partie le</th></tr></thead><tbody>
 ${list.map(({k,e})=>{const last=e.p[e.p.length-1][1], first=e.p[0][1], days=Math.round((isoD(e.g)-isoD(e.f))/DAY);
  return `<tr><td>${esc(e.m[1]||"non précisé")}</td><td class="r mono">${String(e.m[0]).replace(".",",")}</td><td class="r mono">${keur(last)}${last<first?` <span class="hb drop">−${fr((1-last/first)*100,0)} %</span>`:""}</td><td class="r mono hm">${eur(last/e.m[0])}</td><td class="r mono">${days} j</td><td class="r mono">${dm(e.g)}</td></tr>`;}).join("")}
 </tbody></table></div><p class="sub" style="margin:4px 0 0">Annonces disparues de Bien'ici deux jours de suite : probablement vendues (ou retirées). Le dernier prix affiché n'est pas forcément le prix de vente.</p>`;}
// filtre « baisses de prix » dans la liste des ventes
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-abdrop]"); if(!b) return; const on=b.getAttribute("aria-pressed")!=="true"; b.setAttribute("aria-pressed",on);
 const box=b.closest(".annb"); box.querySelectorAll('[data-abp="v"] tbody tr').forEach(tr=>{tr.hidden=on&&tr.dataset.drop!=="1";});
 const p=box.querySelector('[data-ab="v"]'); if(p&&p.getAttribute("aria-pressed")!=="true") p.click();});
