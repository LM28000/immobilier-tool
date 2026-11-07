/* ---------- carte : pastilles de prix des ventes ---------- */
const VST={k:null,m:{}};
function vState(ck,a){const hk=JSON.stringify(H); if(VST.k!==hk){VST.k=hk; VST.m={};} const id=ck+a[3]; if(VST.m[id]) return VST.m[id];
 const g=targetsFor(venteBien(ck,a)), best=Math.max(g.cf??-1e9,g.r7??-1e9), ref=g.ref;
 return VST.m[id]={g,st:best>=ref?"ok":best>0&&(ref-best)/ref<=0.15?"warn":"bad"};}
const VCOL={ok:"var(--ok)",warn:"var(--warn)",bad:"var(--bad)"};
function ventePins(P,pinB,boxes){let s=""; const sel=AD&&AD.kind==="v"?AD.ck+AD.suf:null;
 Object.keys(IR).forEach(ck=>{const A=ADS[ck]; if(!A||!A.ventes) return; const by={};
  A.ventes.forEach(a=>{const t=venteIrisA(ck,a); if(t) (by[t.code]=by[t.code]||{t,l:[]}).l.push(a);});
  Object.values(by).forEach(({t,l})=>{const [x,y]=P(t.cx,t.cy); if(x<-40||x>VW+40||y<-40||y>VH+40) return;
   l.sort((p,q)=>p[2]-q[2]).forEach(a=>{const v=vState(ck,a), hv=vu("v",ck,a[3]), lab=(hv&&hv.last?"↓":"")+keur(a[2]), w=lab.length*6.3+14, on=sel===ck+a[3];
    const hit=(x0,y0)=>pinB.some(b=>!(x0+w/2<b[0]||x0-w/2>b[2]||y0+18<b[1]||y0>b[3]));
    let pos=null; for(const dy of [-28,-50,-6,16,-72,38]){for(const dx of [0,-(w+4),w+4]){if(!hit(x+dx,y+dy)){pos=[x+dx,y+dy]; break;}} if(pos) break;}
    if(!pos) return; const [px,py]=pos; pinB.push([px-w/2-2,py-2,px+w/2+2,py+20]); boxes.push([px-w/2,py-1,px+w/2,py+19]);
    s+=`<g class="vpin" data-vpin="v|${ck}|${esc(a[3])}" role="button" tabindex="0" aria-label="Studio ${a[0]} m² à ${lab}, voir l'annonce"><rect x="${px-w/2}" y="${py}" width="${w}" height="18" rx="9" fill="${VCOL[v.st]}" stroke="${on?"var(--fg)":"var(--surface)"}" stroke-width="${on?2.5:1.5}"/><text x="${px}" y="${py+12.5}" text-anchor="middle" font-size="10.5" font-weight="800" class="mono" fill="#fff">${lab}</text></g>`;});});});
 return s;}

/* ---------- aperçu au survol ---------- */
function pinPreview(el){
 if(el.dataset.vpin){const [kind,ck,...r]=el.dataset.vpin.split("|"), a=findAd(kind,ck,r.join("|")); if(!a) return ""; const vb=venteBien(ck,a), x=venteCalc(ck,a).x, v=vState(ck,a), best=Math.max(v.g.cf??0,v.g.r7??0);
  return `${a[4]?`<img class="tph" src="${esc(photoUrl(a[3],a[4],460,220))}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:""}<div class="tbd"><b>${esc(vb.titre)}</b><div class="trow"><span>Prix affiché</span><b class="mono">${keur(a[2])}</b></div><div class="trow"><span>Cash-flow · 15 ans</span><span class="mono"><b class="${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}</b> · <b style="color:${colIrr(x.irr)}">${x.irr==null?"n.d.":pct(x.irr)}</b></span></div><div class="trow"><span>À viser</span>${best?`<span class="mono">≤ ${keur(best)}</span>`:""}</div>${tgtChip(best||null,a[2])}<span class="sub" style="margin:2px 0 0">Cliquez pour la fiche</span></div>`;}
 const b=BIENS.find(x=>x.id===el.dataset.bpin); if(!b) return ""; const x=calcBien(b).x;
 return `<div class="tbd"><b>★ ${esc(b.titre||"Notre bien")}</b><div class="trow"><span>${keur(+b.prix)} · ${b.surface} m²</span><span class="pill p-n">${esc(b.statut||"à voir")}</span></div><div class="trow"><span>Cash-flow · 15 ans</span><span class="mono"><b class="${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}</b> · <b style="color:${colIrr(x.irr)}">${x.irr==null?"n.d.":pct(x.irr)}</b></span></div></div>`;}

/* ---------- repère "où suis-je" ---------- */
function renderWhere(qm){const back=document.getElementById("zAll"), here=document.getElementById("mwHere"), go=document.getElementById("zCity"); if(!back) return;
 const sc=C.find(c=>c.k===SEL), qc=QC&&C.find(c=>c.k===QC);
 back.hidden=V.k<KMIN()*1.05; here.hidden=true;
 go.hidden=!IR[SEL]||(qm&&QC===SEL); go.innerHTML=`Quartiers de ${sc.name} <span aria-hidden="true">→</span>`;
 document.getElementById("zHome").disabled=V.k<KMIN()*1.05;}

/* ---------- navigation entre annonces (boutons, clavier, glisser) ---------- */
function adSeq(ad){if(ad.kind==="b") return BIENS.filter(b=>!isOut(b)).concat(SHOWOUT||isOut(BIENS.find(b=>b.id===ad.suf)||{})?BIENS.filter(isOut):[]).map(b=>b.id); const A=ADS[ad.ck]; if(!A) return [];
 return ad.kind==="v"?(A.ventes||[]).map(a=>({a,r:venteCalc(ad.ck,a)})).sort((x,y)=>(y.r.x.irr??-99)-(x.r.x.irr??-99)).map(o=>o.a[3]):(A.ads||[]).map(a=>a[4]);}
function adNav(ad){const q=adSeq(ad), i=q.indexOf(ad.suf); if(q.length<2||i<0) return "";
 return `<span class="adnav" role="group" aria-label="Autres annonces"><button type="button" class="btn ghost sm" data-adstep="-1" aria-label="Annonce précédente" title="Précédente (←)">‹</button><span class="mono">${i+1}/${q.length}</span><button type="button" class="btn ghost sm" data-adstep="1" aria-label="Annonce suivante" title="Suivante (→)">›</button></span>`;}
function adStep(d){if(!AD) return; const q=adSeq(AD), i=q.indexOf(AD.suf); if(i<0||q.length<2) return; const n=q[(i+d+q.length)%q.length];
 const body=document.getElementById("qDetailBody"); body.classList.remove("slide-l","slide-r"); void body.offsetWidth; openAd(AD.kind,AD.ck,n); body.classList.add(d>0?"slide-l":"slide-r");}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-adstep]"); if(!b) return; e.preventDefault(); adStep(+b.dataset.adstep);});
document.getElementById("cmpGo").addEventListener("click",()=>{showTab("tab-cmp"); document.getElementById("p-cmp").scrollIntoView({behavior:"smooth",block:"start"});});

