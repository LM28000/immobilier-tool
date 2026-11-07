/* ---------- nuage ---------- */
function renderScatter(rows){
 const W=900, Hh=400, L=64, R=24, T=16, B=40;
 const xmin=Math.floor(Math.min(...rows.map(p=>p.x.cost))/10000)*10000-5000, xmax=Math.ceil(Math.max(...rows.map(p=>p.x.cost))/10000)*10000+5000;
 const ymin=Math.floor(Math.min(...rows.map(p=>p.x.rentHC))/50)*50-25, ymax=Math.ceil(Math.max(...rows.map(p=>p.x.rentHC))/50)*50+25;
 const X=v=>L+(W-L-R)*(v-xmin)/(xmax-xmin), Y=v=>T+(Hh-T-B)*(ymax-v)/(ymax-ymin);
 const xs=(xmax-xmin)>60000?20000:10000;
 let s="";
 for(let v=Math.ceil(xmin/xs)*xs; v<=xmax; v+=xs) s+=`<line x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${Hh-B}" stroke="var(--line)"/><text x="${X(v)}" y="${Hh-B+18}" text-anchor="middle" font-size="11" class="mono" fill="var(--muted)">${v/1000} k€</text>`;
 for(let v=Math.ceil(ymin/50)*50; v<=ymax; v+=50) s+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end" font-size="11" class="mono" fill="var(--muted)">${v} €</text>`;
 s+=`<text x="${(L+W-R)/2}" y="${Hh-4}" text-anchor="middle" font-size="11.5" fill="var(--muted)">Budget tout compris →</text>`;
 s+=`<text x="14" y="${(T+Hh-B)/2}" text-anchor="middle" font-size="11.5" fill="var(--muted)" transform="rotate(-90 14 ${(T+Hh-B)/2})">Loyer hors charges →</text>`;
 s+=`<defs><clipPath id="plot"><rect x="${L}" y="${T}" width="${W-L-R}" height="${Hh-T-B}"/></clipPath></defs><g clip-path="url(#plot)">`;
 [5,6,7,8,9].forEach(y=>{s+=`<line x1="${X(xmin)}" y1="${Y(y/100*xmin/12)}" x2="${X(xmax)}" y2="${Y(y/100*xmax/12)}" stroke="var(--muted)" stroke-dasharray="5 5" opacity=".6"/>`;});
 s+=`</g>`;
 [5,6,7,8,9].forEach(y=>{let xv=xmax, yv=y/100*xv/12; if(yv>ymax){yv=ymax; xv=yv*12/(y/100);} if(xv<xmin||yv<ymin) return;
  s+=`<text x="${X(xv)-4}" y="${Y(yv)+14}" text-anchor="end" font-size="11" class="mono" fill="var(--muted)">${y} % brut</text>`;});
 const placed=[], items=rows.map(p=>({p,cx:X(p.x.cost),cy:Y(p.x.rentHC)})).sort((a,b)=>a.cy-b.cy);
 items.forEach(it=>{const w=it.p.c.name.length*7.6+8, right=it.cx<W-170;
  let lx=right?it.cx+12:it.cx-12-w, ly=it.cy+4, tries=0;
  const hit=()=>placed.some(b=>lx<b.x+b.w&&lx+w>b.x&&ly-11<b.y+3&&ly+3>b.y-11)||items.some(o=>o!==it&&Math.abs(o.cx-(lx+w/2))<w/2+8&&o.cy>ly-14&&o.cy<ly+6);
  while(hit()&&tries<6){ly+=(tries%2?-1:1)*14*(Math.floor(tries/2)+1); tries++;}
  placed.push({x:lx,y:ly,w}); it.lx=lx; it.ly=ly; it.right=right;});
 items.forEach(it=>{const p=it.p, sel=p.c.k===SEL, moved=Math.abs(it.ly-(it.cy+4))>2;
  s+=`<g class="city" tabindex="0" role="button" aria-label="${p.c.name}" data-k="${p.c.k}">${moved?`<line x1="${it.cx}" y1="${it.cy}" x2="${it.right?it.lx-2:it.lx+ (p.c.name.length*7.6+8)}" y2="${it.ly-4}" stroke="var(--muted)" stroke-width=".8"/>`:""}<circle class="b" cx="${it.cx}" cy="${it.cy}" r="${sel?9:7}" fill="${colOf(p)}" stroke="${sel?"var(--fg)":"var(--surface)"}" stroke-width="${sel?2.5:1.5}"/>
   <text x="${it.lx}" y="${it.ly}" font-size="12.5" font-weight="${sel?800:600}" fill="var(--fg)" paint-order="stroke" stroke="var(--surface)" stroke-width="4">${p.c.name}</text></g>`;});
 const svg=document.getElementById("scatter"); svg.innerHTML=s; bindCities(svg);
}

/* ---------- classement ---------- */
function renderTable(rows){
 const rs=[...rows].sort((a,b)=>(b.x.irr??-99)-(a.x.irr??-99)), tb=document.getElementById("tbody"); tb.innerHTML="";
 rs.forEach((r,i)=>{const [bc,bt]=bank(r.x.ratio), tr=document.createElement("tr"); tr.tabIndex=0; if(r.c.k===SEL) tr.className="sel";
  tr.innerHTML=`<td class="mono">${i+1}</td><td><b>${r.c.name}</b></td>
   <td class="r mono">${eur(r.x.cost)}</td><td class="r mono">${eur(r.x.rentHC)}</td><td class="r mono">${pct(r.x.brut)}</td>
   <td class="r mono ${r.x.cf>=0?"pos":"neg"}">${sgn(r.x.cf)}</td><td class="r mono" style="color:${colIrr(r.x.irr)};font-weight:700">${r.x.irr==null?"n.d.":pct(r.x.irr)}</td>
   <td><span class="pill ${bc}">${bt} · ${pct(r.x.ratio*100,0)}</span></td><td>${(d=>d?`<span class="pill ${d.cls}">${d.txt}</span>`:"n.d.")(demCity(r.c.k))}</td>
   <td class="r mono">${r.c.students.toLocaleString("fr-FR")}</td><td class="r mono">${hm(trip(r.c,"laval"))} · ${hm(trip(r.c,"nantes"))} · ${hm(trip(r.c,"paris"))}</td><td class="r"><span class="pill ${rFG(fgOf(dpeCity(r.c.k)))}">${fr(fgOf(dpeCity(r.c.k)))} %</span></td>${(()=>{const [p,v,ch]=RISK[r.c.k];return `<td class="r"><span class="pill ${rPop(p)}">${p>0?"+":""}${fr(p)} %/an</span></td><td class="r"><span class="pill ${rVac(v)}">${fr(v)} %</span></td><td class="r"><span class="pill ${rCho(ch)}">${ch==null?"n.d.":fr(ch)+" %"}</span></td>`;})()}`;
  const go=()=>{SEL=r.c.k;render();}; tr.addEventListener("click",go); tr.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}});
  tb.appendChild(tr);});
}

function render(){
 document.getElementById("v-surcote").textContent=(H.surcote>0?"+":"")+H.surcote+" %";
 document.getElementById("v-loyer").textContent=(H.loyerAdj>0?"+":"")+H.loyerAdj+" %";
 document.getElementById("v-taux").textContent=pct(H.taux,2);
 document.getElementById("pessTxt").hidden=!H.pess; document.getElementById("pessWrap").classList.toggle("on",H.pess);
 document.getElementById("vacWrap").classList.toggle("on",H.vacQ); QBOXK=null;
 document.getElementById("dvfWrap").classList.toggle("on",H.dvf); const sd=hasDVF(SEL);
 document.getElementById("n-surcote").textContent=sd?`${C.find(c=>c.k===SEL).name} : prix des ${TY().pl} réellement vendus (DVF), la surcote ne s'applique pas. Elle sert pour les autres villes.`:"Surcote pour un studio bien placé et en bon état";
 document.getElementById("s-surcote").closest(".sl").classList.toggle("dim",sd);
 const rows=all(); renderMap(rows); renderDetail(rows); renderScatter(rows); renderTable(rows); renderCompare(); renderBiens(); renderShort(); updateCmpButtons(); renderChip(); renderFin(); setHash();
}
[["s-surcote","surcote"],["s-loyer","loyerAdj"],["s-taux","taux"]].forEach(([id,k])=>{const el=document.getElementById(id); el.value=H[k];
 el.addEventListener("input",()=>{H[k]=parseFloat(el.value);saveHyp();renderSoon();});});
const hf=document.getElementById("hypFields");
hypDefs.forEach(([k,l,u,st])=>{const id="f-"+k, lab=document.createElement("label"); lab.className="f"; lab.htmlFor=id;
 lab.innerHTML=`${l}<span class="inp"><input id="${id}" type="number" inputmode="decimal" step="${st}" value="${H[k]}"><span>${u}</span></span>`;
 lab.querySelector("input").addEventListener("input",e=>{const v=parseFloat(e.target.value); if(!isNaN(v)&&isFinite(v)){H[k]=k==="duree"?Math.min(30,Math.max(5,v)):Math.max(0,v); if(HYPK.includes(k)) saveHyp(); render();}}); hf.appendChild(lab);});
if(!HYPOK){const sl=document.querySelector("#setPanel .sliders"); if(sl) sl.insertAdjacentHTML("afterend",`<p class="warnline" id="hypNote">Revenus, apport et crédits en cours sont des valeurs d'exemple : entrez les vôtres dans « Plus d'hypothèses ». Ils restent dans ce navigateur, pas dans le code publié.</p>`);}
document.getElementById("f-pess").addEventListener("change",e=>{H.pess=e.target.checked;render();});

/* curseurs : un seul recalcul quand on fait glisser (au lieu d'un par cran) */
let RSOON=null; function renderSoon(){clearTimeout(RSOON); RSOON=setTimeout(render,120);}
