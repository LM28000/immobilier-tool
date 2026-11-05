/* ---------- photos des annonces (vignettes Bien'ici) ---------- */
const photoUrl=(suf,p,w,h)=>{if(!p) return ""; const id=(suf||"").split("/").pop(); return "https://file.bienici.com/photo/"+(p[0]==="!"?p.slice(1):id+"_"+p)+`?width=${w}&height=${h}&fit=cover`;};
const thumbHtml=(suf,p)=>p?`<img class="thb" src="${esc(photoUrl(suf,p,160,120))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'thb nophoto'}))">`:`<span class="thb nophoto"></span>`;

/* ---------- une seule liste d'annonces : à vendre / à louer ---------- */
let ABID=0;
function annoncesBlock(ck,sector,showSector,openLoc){const A=ADS[ck]; if(!A) return "";
 const V=(A.ventes||[]).filter(a=>sector==null||a[1]===sector), L=(A.ads||[]).filter(a=>sector==null||a[1]===sector), S=soldList(ck,sector), nd=V.filter(a=>{const v=vu("v",ck,a[3]); return v&&v.last;}).length; if(!V.length&&!L.length&&!S.length) return "";
 const first=openLoc||!V.length?"l":"v", id="ab"+(++ABID);
 return `<div class="annb" id="${id}"><div class="annh"><span class="seg2" role="group" aria-label="Type d'annonces">${V.length?`<button type="button" data-ab="v" aria-pressed="${first==="v"}">À vendre (${V.length})</button>`:""}${L.length?`<button type="button" data-ab="l" aria-pressed="${first==="l"}">À louer (${L.length})</button>`:""}${S.length?`<button type="button" data-ab="s" aria-pressed="false">Vendues (${S.length})</button>`:""}</span>${nd?`<button type="button" class="chip" data-abdrop aria-pressed="false">↓ Baisses de prix (${nd})</button>`:""}<span class="sub" style="margin:0">Touchez une annonce pour son détail</span></div>
  ${V.length?`<div data-abp="v"${first==="v"?"":" hidden"}>${ventesTable(ck,V,showSector)}</div>`:""}${L.length?`<div data-abp="l"${first==="l"?"":" hidden"}>${adsTable(L,showSector,ck)}</div>`:""}${S.length?`<div data-abp="s" hidden>${soldTable(ck,S)}</div>`:""}</div>`;}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-ab]"); if(!b) return; const box=b.closest(".annb");
 box.querySelectorAll("[data-ab]").forEach(x=>x.setAttribute("aria-pressed",x===b)); box.querySelectorAll("[data-abp]").forEach(p=>p.hidden=p.dataset.abp!==b.dataset.ab);});
const sectorOf=t=>{const A=ADS[t.ck]; return A?Object.keys(A.map).find(k=>A.map[k].includes(t.code)):null;};

/* ---------- fiche annonce ---------- */
let AD=null;
document.addEventListener("click",e=>{const tr=e.target.closest&&e.target.closest("[data-ad]"); if(!tr||e.target.closest("a,button,select,input")) return; const [kind,ck,...r]=tr.dataset.ad.split("|"); openAd(kind,ck,r.join("|"));});
document.addEventListener("keydown",e=>{if(e.key!=="Enter") return; const tr=e.target.closest&&e.target.closest("[data-ad]"); if(!tr||e.target!==tr) return; e.preventDefault(); const [kind,ck,...r]=tr.dataset.ad.split("|"); openAd(kind,ck,r.join("|"));});
function findAd(kind,ck,suf){if(kind==="b") return BIENS.find(b=>b.id===suf)||null; const A=ADS[ck]; if(!A) return null; return kind==="v"?(A.ventes||[]).find(a=>a[3]===suf):(A.ads||[]).find(a=>a[4]===suf);}
function openAd(kind,ck,suf){const a=findAd(kind,ck,suf); if(!a) return; AD={kind,ck,suf};
 if(kind==="b"){const t=a.quartier&&IR[ck]?IR[ck].list.find(v=>v.name===a.quartier):null; if(t) QSEL=t;}
 else if(!QSEL||QSEL.ck!==ck){const t=venteIris(ck,a[1]); if(t) QSEL=t;} if(SEL!==ck){SEL=ck; render();} else {draw(); renderQBox();}}
function priceFor(ck,a,test){let lo=5000, hi=Math.max(a[2]*1.8,30000); if(!test(lo)) return null; if(test(hi)) return hi;
 for(let i=0;i<26;i++){const m=(lo+hi)/2; if(test(m)) lo=m; else hi=m;} return Math.floor(lo/500)*500;}
const TGC={};
function targetsFor(b){const ref=+b.prix||60000, key=JSON.stringify([b.ville,b.quartier,b.surface,b.prix,b.loyer,b.copro,b.tf,H]); if(TGC[key]) return TGC[key];
 const T=p=>calcBien(Object.assign({},b,{prix:p})).x, f=t=>priceFor(null,[0,0,ref],t);
 return TGC[key]={ref,cf:f(p=>T(p).cf>=0),r7:f(p=>{const x=T(p); return x.irr!=null&&x.irr>=7;})};}
function tgtChip(p,ref,short){if(p==null) return `<span class="tchip bad">${short?"hors d'atteinte":"hors d'atteinte même très bas"}</span>`; const d=p-ref;
 return d>=0?`<span class="tchip ok">${short?"OK":"OK · marge "+keur(d)}</span>`:`<span class="tchip warn">${short?"−"+fr(-d/ref*100,0)+" %":"−"+keur(-d)+" à négocier (−"+fr(-d/ref*100,0)+" %)"}</span>`;}
function negoBlock(b){const g=targetsFor(b), ref=g.ref, pts=[ref,g.cf,g.r7].filter(v=>v!=null), lo=Math.min(...pts)*0.92, hi=Math.max(...pts)*1.06, X=v=>((v-lo)/(hi-lo)*100).toFixed(1);
 const card=(cls,lbl,p,txt)=>`<div class="ngc"><span class="ngl"><i class="dot ${cls}"></i>${lbl}</span><b class="mono">${p==null?"—":"≤ "+keur(p)}</b>${tgtChip(p,ref)}<small>${txt}</small></div>`;
 const mk=(v,cls,t)=>v==null?"":`<i class="ngm ${cls}" style="left:${X(v)}%" title="${t}"></i>`;
 return `<div class="nego"><div class="ngh"><b>Prix maximum à payer</b><span class="sub">affiché ${keur(ref)}</span></div>
  <div class="ngg">${card("d1","Autofinancé",g.cf,"Le loyer couvre tout : rien à sortir chaque mois.")}${card("d2","7 % par an",g.r7,"Rendement moyen sur 15 ans, revente comprise.")}</div>
  <div class="ngr" aria-hidden="true"><div class="ngbar">${mk(g.cf,"d1","Autofinancé")}${mk(g.r7,"d2","7 %/an")}<i class="ngm ref" style="left:${X(ref)}%"></i></div><div class="ngax"><span class="ngref" style="left:${Math.min(85,Math.max(15,X(ref)))}%">prix affiché</span></div></div></div>`;}
function adFiche(ad){if(ad.kind==="b") return bienFiche(ad.suf); const a=findAd(ad.kind,ad.ck,ad.suf); if(!a) return `<p class="sub">Cette annonce n'est plus dans le relevé.</p>`; const c=C.find(v=>v.k===ad.ck);
 if(ad.kind==="v"){const r=venteCalc(ad.ck,a), vb=venteBien(ad.ck,a), [bc,bt]=bank(r.x.ratio), url=VTURL+a[3];
  return `${a[4]?`<img class="adph" src="${esc(photoUrl(a[3],a[4],720,420))}" alt="Photo principale de l'annonce" referrerpolicy="no-referrer" onerror="this.remove()">`:""}
  <div class="dh"><h3 style="font-size:1.15rem;margin:0">${esc(vb.titre)}</h3><span class="pill p-n">à vendre</span></div>
  <p class="sub" style="margin:2px 0 10px">${c.name}${vb.quartier?" · quartier "+esc(vb.quartier):""} · ${keur(a[2])} affiché · ${eur(a[2]/a[0])}/m² ${vuBadges("v",ad.ck,ad.suf)}</p>
  <div class="big4"><div><span>Budget tout compris</span><b>${keur(r.x.cost)}</b></div><div><span>Loyer estimé HC</span><b>${eur(r.x.rentHC)}</b></div><div><span>Cash-flow ${mlab()}</span><b class="${r.x.cf>=0?"pos":"neg"}">${sgn(r.x.cf)}/mois</b>${altCf(r.x)}</div><div><span>15 ans ${mlab()}</span><b style="color:${colIrr(r.x.irr)}">${r.x.irr==null?"n.d.":pct(r.x.irr)}</b>${altIrr(r.x)}</div></div>
  <p style="margin:8px 0"><span class="pill ${bc}">Banque : ${bt} · ${pct(r.x.ratio*100,0)}</span> <span class="sub">${fr(r.vac,1)} mois vide${r.vac>=2?"s":""} par an retenu${r.vac>=2?"s":""}</span></p>
  ${taxLine(r.x)}
  ${negoBlock(vb)}
  ${priceCurve(vu("v",ad.ck,ad.suf))}
  <h2 class="psec">Et si…</h2>${scnBox("ad",scnBien(vb))}
  <p class="sub" style="margin:8px 0 0">Calcul avec notaire, meubles, petits travaux, le loyer et la vacance du quartier, et vos réglages. Charges de copropriété et taxe foncière estimées : corrigez-les après la visite dans « Nos biens ».</p>
  <div class="adact">${adNav(ad)}${addBtn(ad.ck,a,1)}${cmpBtn({kind:"v",id:ad.ck+"|"+ad.suf})}<a class="btn ghost sm" href="${esc(url)}" target="_blank" rel="noopener" title="Photos et description complète">Bien'ici ↗</a></div>`;}
 const url=ADURL+a[4], t=venteIris(ad.ck,a[1]), x=t&&QX[t.ck+t.i], model=x?x.rentHC+H.chLoc:c.rent*Math.pow(H.surface/c.rentM2,0.6);
 return `${a[5]?`<img class="adph" src="${esc(photoUrl(a[4],a[5],720,420))}" alt="Photo principale de l'annonce" referrerpolicy="no-referrer" onerror="this.remove()">`:""}
  <div class="dh"><h3 style="font-size:1.15rem;margin:0">Studio ${String(a[0]).replace(".",",")} m²${a[3]?" meublé":""}</h3><span class="pill p-n">à louer</span></div>
  <p class="sub" style="margin:2px 0 10px">${c.name}${a[1]?" · secteur "+esc(a[1]):""}${a[1]==="Université"?" · probablement une résidence étudiante avec services":""}</p>
  <div class="big4"><div><span>Loyer charges comprises</span><b>${eur(a[2])}</b></div><div><span>Ramené à 22 m²</span><b>${eur(r22(a))}</b></div><div><span>Notre calcul (22 m²)</span><b>${eur(model)}</b></div><div><span>Écart</span><b class="${r22(a)>=model?"pos":"neg"}">${r22(a)>=model?"+":"−"}${fr(Math.abs(r22(a)/model-1)*100,0)} %</b></div></div>
  <p class="sub" style="margin:8px 0">Une location concurrente : elle montre ce qu'un locataire paie aujourd'hui pour un studio comparable dans ce secteur. Loyer demandé, pas forcément signé.</p>
  <div class="adact">${adNav(ad)}<a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener">Photos et description sur Bien'ici ↗</a></div>`;}

