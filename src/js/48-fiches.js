/* ================= fiches ville, quartier et bien : même structure partout =================
   Rubriques dans le même ordre ; chaque niveau se compare au niveau du dessus au lieu de le répéter.
   Les rubriques se replient (résumé d'une ligne) et l'outil retient lesquelles vous gardez ouvertes. */
const FRUB=[["attn","Points d'attention"],["prix","Prix d'achat"],["loyer","Loyer et demande"],["calc","Le calcul"],["visite","Visite"],["traj","Trajets"],["vie","Vie de quartier"],["bati","Bâti et énergie"],["risq","Risques"],["hab","Habitants"],["ecoles","Écoles et campus"],["urba","Urbanisme et projets"],["ann","Annonces"],["src","Sources"]];
const FDEF={ville:{calc:1,prix:1},quartier:{prix:1,traj:1,vie:0},bien:{prix:1,calc:1}};
let FOPEN={}; try{FOPEN=JSON.parse(localStorage.getItem("fopen")||"{}");}catch(_){}
const fIsOpen=(lv,k)=>FOPEN[lv+k]!=null?FOPEN[lv+k]:!!(FDEF[lv]&&FDEF[lv][k]);
document.addEventListener("toggle",e=>{const d=e.target; if(!d.matches||!d.matches("details.fsec")) return; FOPEN[d.dataset.lv+d.dataset.sec]=d.open; try{localStorage.setItem("fopen",JSON.stringify(FOPEN));}catch(_){}},true);
function fSec(lv,k,sum,html){if(!html) return ""; const t=(FRUB.find(r=>r[0]===k)||[k,k])[1];
 return `<details class="fsec" data-lv="${lv}" data-sec="${k}"${fIsOpen(lv,k)?" open":""}><summary><span class="fst">${t}</span><span class="fss">${sum||""}</span></summary><div class="fsb">${html}</div></details>`;}
function fAttn(list){const L=list.filter(Boolean), W=L.filter(z=>z[0]==="bad"||z[0]==="warn"), G=L.filter(z=>z[0]==="ok"), I=L.filter(z=>z[0]==="info"), li=a=>a.map(([l,t])=>`<li class="${l}">${t}</li>`).join("");
 return `<div class="fattn">${W.length?`<div class="fa-w"><b>À vérifier</b><ul>${li(W)}</ul></div>`:`<div class="fa-g"><b>Rien de bloquant repéré</b> dans les données disponibles.</div>`}${G.length?`<div class="fa-g"><b>Bons signes</b><ul>${li(G)}</ul></div>`:""}${I.length?`<div class="fa-i"><b>À demander</b><ul>${li(I)}</ul></div>`:""}</div>`;}
const fDelta=(v,ref,unit,dec)=>v==null||ref==null?"":`<em class="fd ${v-ref>=0?"up":"down"}">${v-ref>=0?"+":"−"}${fr(Math.abs(v-ref),dec==null?1:dec)}${unit} vs ${arguments[4]||"ville"}</em>`;
function fHead(x,ref,refName){const [bc,bt]=bank(x.ratio);
 const d=(a,b,u,dc,inv)=>{if(a==null||b==null) return ""; const z=a-b; if(Math.abs(z)<(dc?0.05:0.5)) return `<em class="fd">= ${refName}</em>`; return `<em class="fd ${(z>=0)!==!!inv?"up":"down"}">${z>=0?"+":"−"}${fr(Math.abs(z),dc)}${u} vs ${refName}</em>`;};
 return `<div class="fhead"><div><span>15 ans ${mlab()}</span><b style="color:${colIrr(x.irr)}">${x.irr==null?"n.d.":pct(x.irr)}</b>${ref?d(x.irr,ref.irr," pt",1):altIrr(x)}</div>
  <div><span>Cash-flow ${mlab()}</span><b class="${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}<small>/mois</small></b>${ref?d(x.cf,ref.cf," €",0):altCf(x)}</div>
  <div><span>Banque</span><b><span class="pill ${bc}">${bt} · ${pct(x.ratio*100,0)}</span></b></div>
  <div><span>Budget tout compris</span><b>${keur(x.cost)}</b>${ref?d(x.cost/1000,ref.cost/1000," k€",0,1):""}</div></div>`;}
function fCrumb(parts){return `<nav class="fcrumb" aria-label="Niveaux">${parts.map((p,i)=>i<parts.length-1?`<button type="button" class="lnk" ${p[1]}>${esc(p[0])}</button><span aria-hidden="true">›</span>`:`<b>${esc(p[0])}</b>`).join("")}</nav>`;}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-fgo]"); if(!b) return; e.preventDefault(); const [lv,ck,code]=b.dataset.fgo.split("|");
 if(typeof MOBON!=="undefined"&&MOBON){if(lv==="c"){mPopAll(); SEL=ck; QSEL=null; AD=null; render(); if(IR[ck]) flyTo(IR[ck].bb); mShow("carte"); setSnap(1);} else {const t=IR[ck].list.find(v=>v.code===code); mPopAll(); SEL=ck; QSEL=t; AD=null; render(); flyTo(t.bb,3.2); mShow("carte"); setSnap(2);} return;}
 if(lv==="c"){AD=null; QSEL=null; SEL=ck; render(); if(IR[ck]) flyTo(IR[ck].bb);} else {const t=IR[ck].list.find(v=>v.code===code); AD=null; SEL=ck; QSEL=t; render(); flyTo(t.bb,3.2);}});

/* ---------- moyennes de ville utiles aux comparaisons ---------- */
function cityPoi(ck){const P=typeof POIQ!=="undefined"&&POIQ[ck]; if(!P) return null; const v=Object.values(P).map(p=>p[0]); return v.reduce((s,x)=>s+x,0)/v.length;}
function cityRisq(ck){const R=typeof RISQ!=="undefined"&&RISQ[ck]; if(!R) return null; const v=Object.values(R), n=v.length; return {n,t:v.filter(r=>r.t).length,a3:v.filter(r=>r.a>=3).length,s:v.filter(r=>r.s).length};}

/* ---------- VILLE ---------- */
function cityCharts(c,x){const W=460, imp=(x.imp1+x.fees1)/12, out=x.mens+x.charges+imp, maxv=Math.max(x.rentEff,out)*1.05, sc=v=>v/maxv*(W-200);
 const bar=`<svg viewBox="0 0 ${W} 108" role="img" aria-label="Le mois type"><text x="0" y="20" font-size="12" fill="var(--muted)">Ce qui rentre</text>
  <rect x="110" y="8" width="${sc(x.rentEff)}" height="18" rx="4" fill="var(--ok)" fill-opacity=".8"/><text x="${116+sc(x.rentEff)}" y="21" font-size="12" class="mono" fill="var(--fg)">${eur(x.rentEff)}</text>
  <text x="0" y="52" font-size="12" fill="var(--muted)">Ce qui sort</text>
  <rect x="110" y="40" width="${sc(x.mens)}" height="18" rx="4" fill="var(--accent)" fill-opacity=".85"/><rect x="${110+sc(x.mens)}" y="40" width="${sc(x.charges)}" height="18" rx="4" fill="var(--accent)" fill-opacity=".4"/><rect x="${110+sc(x.mens+x.charges)}" y="40" width="${sc(imp)}" height="18" rx="4" fill="var(--warn)" fill-opacity=".55"/>
  <text x="${116+sc(out)}" y="53" font-size="12" class="mono" fill="var(--fg)">${eur(out)}</text>
  <text x="110" y="78" font-size="11" fill="var(--muted)">crédit ${eur(x.mens)} · charges ${eur(x.charges)} (dont taxe foncière ${eur(x.tf)})</text><text x="110" y="96" font-size="11" fill="var(--muted)">impôts et frais ${eur(imp)} (${REG[x.regime]})</text></svg>`;
 const G=x.gains, gw=460, gh=150, L0=46, B=22, lo=Math.min(0,...G), hi=Math.max(0,...G), X=i=>L0+(gw-L0-28)*i/25, Y=v=>8+(gh-8-B)*(hi-v)/((hi-lo)||1), st=(hi-lo)>60000?20000:(hi-lo)>30000?10000:5000;
 let cv=`<svg viewBox="0 0 ${gw} ${gh}" role="img" aria-label="Gain ou perte si on revend">`;
 for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st) cv+=`<line x1="${L0}" x2="${gw-28}" y1="${Y(v)}" y2="${Y(v)}" stroke="${v===0?"var(--muted)":"var(--line)"}" ${v===0?'stroke-dasharray="4 3"':""}/><text x="${L0-6}" y="${Y(v)+4}" text-anchor="end" font-size="10.5" class="mono" fill="var(--muted)">${keur(v)}</text>`;
 [0,5,10,15,20,25].forEach(i=>{cv+=`<text x="${X(i)}" y="${gh-6}" text-anchor="middle" font-size="10.5" class="mono" fill="var(--muted)">${i} ans</text>`;});
 const dl=G.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)).join(" ");
 cv+=`<path d="${dl} L${X(25)} ${Y(0)} L${X(0)} ${Y(0)} Z" fill="var(--accent-soft)"/><path d="${dl}" fill="none" stroke="var(--accent)" stroke-width="2.2"/>`;
 const be=G.findIndex(v=>v>=0);
 if(be>0) cv+=`<circle cx="${X(be)}" cy="${Y(G[be])}" r="4" fill="var(--accent)"/><text x="${X(be)+6}" y="${Y(G[be])-6}" font-size="11" fill="var(--fg)">gagnant après ${be} ans</text>`;
 else if(be<0) cv+=`<text x="${L0+8}" y="20" font-size="11" fill="var(--bad)">jamais gagnant sur 25 ans</text>`;
 cv+=`<circle cx="${X(25)}" cy="${Y(G[25])}" r="4" fill="var(--accent)"/><text x="${X(25)-6}" y="${Y(G[25])-8}" text-anchor="end" font-size="11.5" font-weight="700" class="mono" fill="var(--fg)">${(G[25]>=0?"+":"")+keur(G[25])}</text></svg>`;
 return {bar,cv};}
function villeFiche(c){const x=calc(c), [bc,bt]=bank(x.ratio), {bar,cv}=cityCharts(c,x), [pop,vac,cho]=RISK[c.k]||[0,0,null], fg=fgOf(DPECITY[c.k]), A=ADS[c.k], nv=A&&A.ventes?A.ventes.length:0, nl=A&&A.ads?A.ads.length:0;
 const L=typeof LOYQ!=="undefined"&&LOYQ.c&&LOYQ.c[c.k], le=loyEtat(c,x), poi=cityPoi(c.k), rq=cityRisq(c.k);
 const attn=fAttn([bc==="p-bad"&&["bad","La banque refuserait : endettement de "+pct(x.ratio*100,0)+"."],bc==="p-warn"&&["warn","Banque limite ("+pct(x.ratio*100,0)+")."],x.irr!=null&&x.irr<2.5&&["bad","Rendement sous le LEP (2,5 %) en moyenne."],
  fg>=12&&["warn",`${fr(fg,0)} % des petits appartements en DPE F ou G : attention à la classe énergie.`],pop<0&&["warn","La population baisse."],vac>10&&["warn",`${fr(vac,1)} % de logements vides.`],/optimiste/.test(le)&&["warn","Notre loyer est plutôt optimiste par rapport à la référence de l'État."],rq&&rq.t/rq.n>0.2&&["warn",`${rq.t} quartiers sur ${rq.n} en zone inondable.`]]);
 const prix=fRows([hasDVF(c.k)?["Studios vendus",`<b class="mono">${eur(studioPm2(c.k))}/m²</b>`,`médiane de ${dvfC(c.k).n.toLocaleString("fr-FR")} ventes, DVF 2023-2025`]:["Studio estimé",`<b class="mono">${eur(studioPm2(c.k))}/m²</b>`,"tous appartements + surcote petite surface"],["Tous appartements",`${eur(c.pm2)}/m²`,c.evol!=null?`${c.evol>0?"+":""}${fr(c.evol,1)} % sur un an`:""]])+ventesCity(c.k);
 const loyer=fRows([["Loyer HC retenu",`<b class="mono">${eur(x.rentHC)}</b>`,`${H.surface} m² meublé`],["Demande locative",c.tensionTxt.toLowerCase(),`${c.students.toLocaleString("fr-FR")} étudiants`]])+le+adsCity(c.k);
 const calcH=`${taxLine(x)}${ptabs("city",[["Le mois type",`<p class="sub" style="margin:0 0 6px">Ce qui entre et sort chaque mois, à deux.</p>${bar}`],["Sur 25 ans",`<p class="sub" style="margin:0 0 6px">Gain ou perte à deux si on revend.</p>${cv}`],["Et si…",scnBox("city",scnCity(c))]])}`;
 const traj=fRows(["laval","nantes","paris"].map(o=>[ORIG[o].name,hm(trip(c,o))]))+(IR[c.k]?fNote("À pied, à vélo et en bus : dans chaque quartier."):"");
 const vie=poi!=null?fRows([["Note moyenne des quartiers",`<b>${fr(poi,1)}/10</b>`,"détail (supermarché, boulangerie, pharmacie…) dans chaque quartier"]]):"";
 const bati=`<div>${dpeBar(DPECITY[c.k],360)}</div>${fRows([["Petits appartements en F ou G",`<b>${fr(fg,0)} %</b>`,`${DPECITY[c.k].reduce((a,b)=>a+b,0).toLocaleString("fr-FR")} DPE de 30 m² ou moins depuis 2021 (ADEME)`],["Taxe foncière",`${fr(c.tf,1)} %`]])}${fNote("F : location interdite en 2028 · G : déjà interdite.")}`;
 const risq=(rq?fRows([["Zone inondable (TRI)",`${rq.t} quartiers sur ${rq.n}`,"mesuré au centre de chaque quartier"],["Argile, aléa fort",`${rq.a3} quartiers`],["Sol pollué à 300 m",`${rq.s} quartiers`]]):"")+catnatLine(c.k), cat=catOf(c.k);
 const EN=hasTER()&&TERQ.ecoles.n[c.k], QV=hasTER()&&TERQ.qpv[c.k];
 const hc=habCity(c.k);
 const hab=(hc?fRows([["Étudiants",`<b>${pp(hc.scol)}</b> des habitants`,"18-24 ans encore en études"],["25-39 ans",pp(hc.p2539),"jeunes actifs"],["Revenu médian",`environ ${eur(hc.med)} par an`,"moyenne des quartiers, par unité de consommation"],["Taux de pauvreté",pp(hc.tp)]]):"")+`<div style="display:flex;flex-wrap:wrap;gap:6px"><span class="pill ${rPop(pop)}">Population ${pop>0?"+":""}${fr(pop)} %/an</span><span class="pill ${rVac(vac)}">${fr(vac)} % de logements vides</span><span class="pill ${rCho(cho)}">Chômage ${cho==null?"n.d.":fr(cho)+" %"}</span></div>${fNote("Population en baisse ou beaucoup de logements vides : moins de locataires demain, revente plus lente.")}`;
 const ecoles=fRows([["Étudiants",`<b>${c.students.toLocaleString("fr-FR")}</b>`,"agglomération"],EN&&["Supérieur public",`${TERQ.ecoles.sup[c.k].length} sites`,"à moins de 9 km du centre"],EN&&["Lycées avec BTS ou prépa",String(EN.postbac)],EN&&["Lycées · collèges · écoles",`${EN.lycees} · ${EN.colleges} · ${EN.ecoles}`]])+(EN?fNote("Campus le plus proche et écoles : dans chaque quartier."):"");
 const nIn=QV?Object.values(QV.q).filter(v=>v&&v[0]===0).length:0;
 const urba=QV?fRows([["Quartiers prioritaires",`<b>${QV.names.length}</b> (politique de la ville, 2024)`,QV.names.map(esc).join(" · ")],["Nos quartiers dedans",`${nIn} sur ${Object.keys(QV.q).length}`,"centre du quartier dans le périmètre"]])+fNote("Zone du PLU : dans chaque quartier, et à l'adresse d'un bien."):"";
 const ann=nv||nl?`<p class="sub" style="margin:0">${nv} studios à vendre et ${nl} à louer suivis chaque jour.</p><p style="margin:6px 0 0"><button type="button" class="btn ghost sm" data-annall>Toutes les annonces, classées</button> ${IR[c.k]?`<button type="button" class="btn ghost sm" data-zq="${c.k}">Voir les quartiers</button>`:""}</p>`:"";
 const src=`<div class="srcs" style="margin:0">Sources : <a href="${c.src[0]}" target="_blank" rel="noopener">Prix</a> · <a href="${c.src[1]}" target="_blank" rel="noopener">Loyer</a> · <a href="${c.src[2]}" target="_blank" rel="noopener">Taxe foncière</a> · <a href="#sources" data-opensrc>toutes les sources</a></div>${c.note?`<div class="note">${c.note}</div>`:""}`;
 return `<div class="dh"><h3>${c.name}</h3><span style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${cmpBtn({kind:"c",k:c.k})}${IR[c.k]?`<button type="button" class="cmpb" data-zq="${c.k}">Voir les quartiers</button>`:""}</span></div>
  <p class="avg">Moyenne de la ville · studio de ${H.surface} m²${IR[c.k]?" · les quartiers varient":""}</p>${fHead(x)}${attn}
  ${fSec("ville","prix",`${eur(studioPm2(c.k))}/m²`,prix)}${fSec("ville","loyer",`${eur(x.rentHC)} HC · demande ${c.tensionTxt.toLowerCase()}`,loyer)}${fSec("ville","calc",`${sgn(x.cf)}/mois · ${x.irr==null?"n.d.":pct(x.irr)}`,calcH)}
  ${fSec("ville","traj",`Paris ${hm(trip(c,"paris"))}`,traj)}${fSec("ville","vie",poi!=null?fr(poi,1)+"/10 en moyenne":"",vie)}${fSec("ville","bati",`${fr(fg,0)} % de F-G`,bati)}${fSec("ville","risq",rq?(rq.t?`${rq.t} quartiers inondables`:"rien de majeur"):cat?`${cat.n2000} catastrophes naturelles depuis 2000`:"",risq)}
  ${fSec("ville","hab",`population ${pop>0?"+":""}${fr(pop)} %/an`,hab)}${fSec("ville","ecoles",`${c.students.toLocaleString("fr-FR")} étudiants`,ecoles)}${fSec("ville","urba",QV?`${QV.names.length} quartiers prioritaires`:"",urba)}${fSec("ville","ann",nv?`${nv} à vendre`:"",ann)}${fSec("ville","src","",src)}`;}
const _rdNew=function(rows){const d=document.getElementById("detail"); const c=C.find(v=>v.k===SEL); if(!d||!c) return; d.innerHTML=villeFiche(c);};
if(renderDetail.orig) renderDetail.orig=_rdNew; else renderDetail=_rdNew;

/* ---------- QUARTIER ---------- */
function quartierFiche(t,compact){const c=C.find(v=>v.k===t.ck), xc=calc(c), x=QX[t.ck+t.i], n=t.dpe.reduce((a,b)=>a+b,0), fg=fgPct(t.dpe), sec=sectorOf(t), A=ADS[t.ck];
 const nv=A&&sec?(A.ventes||[]).filter(a=>a[1]===sec).length:0, nl=A&&sec?(A.ads||[]).filter(a=>a[1]===sec).length:0, q=dvfOf(t), tr=trajOf(t), dm=demandOf(t), r=risqOf(t), p=poiOf(t), pc=cityPoi(t.ck), ter=terOf(t);
 if(!x) return `<div class="dh"><h3 style="font-size:1.15rem">${t.name}</h3><span class="pill p-n">${t.type==="H"?"pas de prix publié":"zone d'activité"}</span></div>${fRows([["Prix",`pas d'estimation pour ce secteur IRIS`],n&&["DPE",`${n} petits appartements`]])}${adsLine(t)}`;
 const rr=rentRatio(t.ck,t);
 const attn=fAttn([bank(x.ratio)[0]==="p-bad"&&["bad","La banque refuserait ici."],x.irr!=null&&x.irr<2.5&&["bad","Rendement sous le LEP."],x.irr!=null&&x.irr>=9&&["warn","Rendement très élevé sur le papier parce que le prix est bas : vérifiez la demande et le risque d'impayés sur place."],
  n>=15&&fg>=20&&["warn",`${fr(fg,0)} % des petits appartements en DPE F ou G.`],r&&r.t&&["bad","Le centre du quartier est en zone inondable (TRI)."],r&&r.s&&["warn","Sol pollué connu à moins de 300 m."],q&&q.n<5&&["warn",`Peu de ventes réelles (${q.n}) : prix du quartier incertain.`],p&&p[0]<4&&["warn",`Peu de commerces à pied (${fr(p[0],1)}/10).`],ter&&ter.q&&ter.q.d===0&&["warn",`Quartier prioritaire de la politique de la ville (« ${esc(ter.q.name)} ») : demande, impayés et revente à regarder de près.`],ter&&ter.u&&/^[NA]$/.test(ter.u[1])&&["warn","Le centre du quartier est en zone naturelle ou agricole du PLU : peu de logements autour."],ter&&ter.e&&ter.e[4]>=3&&["ok",`${ter.e[4]} sites d'enseignement supérieur à moins de 1,5 km.`],...habAttn(t)]);
 const prix=dvfBlock(t);
 const loyer=fRows([["Loyer HC retenu",`<b class="mono">${eur(x.rentHC)}</b>`,Math.abs(rr-1)<0.005?"= ville":`${rr>=1?"+":"−"}${fr(Math.abs(rr-1)*100,0)} % vs ville`],["D'après",t.ra?`RealAdvisor : ${fr(t.ra/12,1)} €/m²/mois`:(IRIS[t.ck].ra.fit[1]?"estimé depuis le prix du quartier":"loyer médian de la ville"),t.ra?`ville : ${fr(IR[t.ck].raCity/12,1)} €/m²/mois`:"pas de loyer publié ici"],rentBlend(t.ck,t)&&["Mélangé avec",`${rentBlend(t.ck,t).n} annonces du secteur`,`poids ${fr(rentBlend(t.ck,t).w*100,0)} % · ${eur(rentBlend(t.ck,t).med)} CC à 22 m²`],dm&&["Mois vides retenus",`${fr(dm.vac,1)} par an`,"selon l'emplacement (voir Trajets)"]])+adsLine(t);
 const calcH=`<div class="big4"><div><span>Studio tout compris</span><b>${keur(x.cost)}</b></div><div><span>Loyer hors charges</span><b>${eur(x.rentHC)}</b></div><div><span>Cash-flow ${mlab()}</span><b class="${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}/mois</b>${altCf(x)}</div><div><span>15 ans ${mlab()}</span><b style="color:${colIrr(x.irr)}">${x.irr==null?"n.d.":pct(x.irr)}</b>${altIrr(x)}</div></div><p style="margin:8px 0 0"><button type="button" class="cmpb" data-sim="${t.ck}|${t.code}">Simuler un bien ici</button> ${cmpBtn({kind:"q",ck:t.ck,code:t.code})}</p>`;
 const traj=tr?`${demLine(t)}${trajBlock(t)}`:demLine(t);
 const vie=p?`${poiBlock(t)}${pc!=null?fNote(`Moyenne de ${c.name} : ${fr(pc,1)}/10.`):""}`:"";
 const bati=n?`<div>${dpeBar(t.dpe,220)}</div>${fRows([["Petits appartements en F ou G",n>=15?`<b>${fr(fg,0)} %</b>`:"trop peu pour conclure",`${n} DPE · ville : ${fr(fgOf(DPECITY[t.ck]),0)} %`]])}`:fRows([["DPE","aucun petit appartement diagnostiqué"]]);
 const risq=r?`${risqPills(t)}${fNote("Au centre du quartier (Géorisques). Ajoutez l'adresse d'un bien pour le mesurer chez lui.")}${catnatLine(t.ck)}`:catnatLine(t.ck);
 const ecoles=ecolesBlock(t), urba=urbaBlock(t);
 const ann="";
 const tags=Q[t.ck]&&Q[t.ck].tags&&Q[t.ck].tags[t.name], tg=tags&&TAG[tags]?`<span class="pill" style="background:${TAG[tags][1]};color:var(--surface)">${TAG[tags][0]}</span>`:"";
 return `${compact?"":`<div class="dh"><h3 style="font-size:1.15rem">${t.name}</h3><span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${tg}<span class="pill" style="background:${QCLS[qCls(x.irr)].c};color:var(--surface)">${x.irr==null?"n.d.":pct(x.irr)} sur 15 ans</span></span></div>
  ${fHead(x,xc,"ville")}`}${attn}
  ${fSec("quartier","prix",q&&q.n?`${q.n} ventes · ${eur(q.med)}/m²`:`${eur(studioPm2(t.ck,t))}/m²`,prix)}${fSec("quartier","loyer",`${eur(x.rentHC)} HC${nl?` · ${nl} locations`:""}`,loyer)}${fSec("quartier","calc",`${sgn(x.cf)}/mois`,calcH)}
  ${fSec("quartier","traj",dm&&dm.real?`${minTxt(dm.min)} ${dm.mode==="tc"?"en bus":"à pied"} ${({gare:"de la gare",univ:"de la fac",univ2:"de la fac",centre:"du centre"})[dm.mk]}`:"",traj)}${fSec("quartier","vie",p?`${fr(p[0],1)}/10`:"",vie)}${fSec("quartier","bati",n>=15?`F-G ${fr(fg,0)} %`:"",bati)}
  ${fSec("quartier","risq",r?(r.t||r.s?"à regarder":"rien de majeur"):"",risq)}${fSec("quartier","hab",habSum(t),habBlock(t))}${fSec("quartier","ecoles",ecolesSum(t),ecoles)}${fSec("quartier","urba",urbaSum(t),urba)}`;}
qCard=function(t){return `<div class="qcard">${quartierFiche(t)}</div>`;};

/* ---------- BIEN (annonce suivie ou bien de notre liste) ---------- */
function bienFicheBody(b,opt){opt=opt||{}; const r=calcBien(b), x=r.x, c=C.find(v=>v.k===b.ville), t=r.t, xq=t?QX[t.ck+t.i]:null, s=b.kind==="v"?b.suf:bienSuf(b), v=s?vu("v",b.ville,s):null;
 const qs=t&&t.price?studioPm2(b.ville,t):studioPm2(b.ville), pm2=+b.prix/(+b.surface||22), dif=(pm2/qs-1)*100, sec=t?sectorOf(t):b.secteur, A=ADS[b.ville];
 const g=b.geo||{}, risqR=g.risq||(t?risqOf(t):null), p=t?poiOf(t):null, isB=!!b.id, ter=t?terOf(t):null; if(isB) adrUrbaFill(b);
 const attn=fAttn([/[FG]/.test(b.dpe||"")&&["bad",`DPE ${esc(b.dpe)} : location ${b.dpe==="G"?"déjà interdite":"interdite en 2028"} sans travaux.`],bank(x.ratio)[0]==="p-bad"&&["bad","La banque refuserait ce prix."],bank(x.ratio)[0]==="p-warn"&&["warn",`Banque à la limite : ${pct(x.ratio*100,0)} d'endettement pour 35 % maximum.`],
  dif>15&&["warn",`Prix au m² ${fr(dif,0)} % au-dessus d'un studio du quartier : de la marge à négocier.`],dif<-20&&["warn",`Prix au m² ${fr(-dif,0)} % sous le quartier : vérifiez l'état et la copropriété.`],v&&v.days>=60&&["ok",`En ligne depuis ${v.days} jours : le vendeur peut être pressé.`],v&&v.last&&["ok",`Le prix a déjà baissé de ${keur(v.last.amt)}.`],
  risqR&&risqR.t&&["bad",g.risq?"L'adresse est en zone inondable (TRI).":"Le quartier est en zone inondable : vérifiez l'adresse."],isB&&visitFlags(b)&&["warn",`${visitFlags(b)} point${visitFlags(b)>1?"s":""} à problème relevé${visitFlags(b)>1?"s":""} à la visite.`],...(t?habAttn(t):[]),ter&&ter.q&&ter.q.d===0&&["warn",`Dans le quartier prioritaire « ${esc(ter.q.name)} » : demande et revente à regarder de près.`],g.urba&&/^[NA]/.test(g.urba[1])&&["warn","L'adresse est en zone naturelle ou agricole du PLU : vérifiez auprès de la mairie."],!(+b.copro)&&["info","Le vrai montant des charges de copropriété (estimées ici)."],!(+b.tf)&&isB&&["info","La dernière taxe foncière."]]);
 const prix=fRows([["Prix affiché",`<b class="mono">${eur(+b.prix)}</b> · ${eur(pm2)}/m²`],[`Studio du ${t?"quartier":"secteur"}`,`${eur(qs)}/m²`,`${dif>=0?"+":"−"}${fr(Math.abs(dif),0)} % pour ce bien`]])+(v?priceCurve(v):"")+negoBlock(b);
 const loyer=fRows([["Loyer HC",`<b class="mono">${eur(x.rentHC)}</b>`,+b.loyer>0?"visé":"estimé"],xq&&["Quartier",`${eur(xq.rentHC)}`,`pour ${H.surface} m²`],["Mois vides retenus",`${fr(r.vac,1)} par an`,g.foot?"d'après l'adresse":"d'après le quartier"]])+(A&&sec?(()=>{const L=(A.ads||[]).filter(a=>a[1]===sec); return L.length?adsTable(L,false,b.ville):"";})():"");
 const calcH=`${taxLine(x)}<h4 class="fh4">Et si…</h4>${scnBox(isB?"bien":"ad",scnBien(b))}`;
 const visite=isB?(()=>{const V=b.visite||{}, av=V.avis||{}, coms=Object.entries(av).filter(([,a])=>a.com), sc=visitScore(b);
  return `${sc!=null||coms.length||Object.values(av).some(z=>z.verdict)?`<div class="vsum">${sc!=null?`<span class="pill p-n">note ${fr(sc,1)}/5</span>`:""}${Object.entries(av).filter(([,z])=>z.verdict).map(([n,z])=>`<span class="pill ${VERD[z.verdict][1]}">${esc(n)} : ${VERD[z.verdict][0]}${z.verdict==="prix"&&z.vprix?" "+keur(+z.vprix):""}</span>`).join("")}</div>${coms.map(([n,a])=>`<p class="vcom"><b>${esc(n)} :</b> ${esc(a.com)}</p>`).join("")}`:`<p class="sub" style="margin:0">Pas encore visité. Le bouton « Visite » permet de saisir les chiffres réels et vos notes.</p>`}${b.notes?`<p class="vcom"><b>Notes :</b> ${esc(b.notes)}</p>`:""}`;})():"";
 const traj=`${isB?adrBlock(b):""}${!g.foot&&t?trajBlock(t):""}`;
 const vie=p?poiBlock(t):"";
 const bati=fRows([["DPE",b.dpe?`<b>${esc(b.dpe)}</b>`:"inconnu",t&&t.dpe.reduce((a,z)=>a+z,0)>=15?`quartier : ${fr(fgPct(t.dpe),0)} % de F-G`:""],["Copropriété",+b.copro?`${eur(+b.copro)}/mois`:`${eur(H.copro)}/mois`,+b.copro?"":"estimée"],["Taxe foncière",+b.tf?`${eur(+b.tf)}/an`:"estimée"],+b.travaux&&["Travaux",eur(+b.travaux)]]);
 const risq=(risqR?`${risqPillsR(risqR)}${fNote(`${g.risq?"Mesuré à l'adresse":"Mesuré au centre du quartier"} (Géorisques). L'état des risques du vendeur fait foi.`)}`:"")+catnatLine(b.ville);
 const ecoles=t?ecolesBlock(t):"", urba=`${adrUrbaBlock(b)}${t?urbaBlock(t):""}`;
 const comps=A&&sec?(A.ventes||[]).filter(a=>a[1]===sec&&a[3]!==s):[], sold=sec?soldList(b.ville,sec).slice(0,5):[];
 const ann=comps.length||sold.length?`${comps.length?ventesTable(b.ville,comps,false):""}${sold.length?`<h4 class="fh4">Parties récemment</h4>${soldTable(b.ville,sold)}`:""}`:"";
 const qname=t?t.name:(b.quartier||"");
 return `${opt.noHead?"":fHead(x,xq,t?"quartier":"ville")}${attn}
  ${fSec("bien","prix",`${keur(+b.prix)} · ${dif>=0?"+":"−"}${fr(Math.abs(dif),0)} % vs ${t?"quartier":"ville"}`,prix)}${fSec("bien","loyer",`${eur(x.rentHC)} HC`,loyer)}${fSec("bien","calc",`${sgn(x.cf)}/mois · ${x.irr==null?"n.d.":pct(x.irr)}`,calcH)}
  ${isB?fSec("bien","visite",visitScore(b)!=null?`note ${fr(visitScore(b),1)}/5`:"pas encore visité",visite):""}${fSec("bien","traj",b.adresse?"à l'adresse":qname?"au centre du quartier":"",traj)}${fSec("bien","vie",p?`${fr(p[0],1)}/10 (quartier)`:"",vie)}
  ${fSec("bien","bati",b.dpe?`DPE ${esc(b.dpe)}`:"DPE inconnu",bati)}${fSec("bien","risq",risqR?(risqR.t||risqR.s?"à regarder":"rien de majeur"):"",risq)}${fSec("bien","hab",t?habSum(t):"",t?habBlock(t):"")}${fSec("bien","ecoles",t?ecolesSum(t):"",ecoles)}${fSec("bien","urba",g.urba?`zone ${esc(g.urba[0])} à l'adresse`:t?urbaSum(t):"",urba)}${fSec("bien","ann",comps.length?`${comps.length} comparables`:"",ann)}`;}
function adQuart(ad){try{if(ad.kind==="v"){const a=findAd("v",ad.ck,ad.suf); return a?calcBien(venteBien(ad.ck,a)).t:null;} if(ad.kind==="b"){const b=BIENS.find(x=>x.id===ad.suf); return b?calcBien(b).t:null;}}catch(_){} return null;}
const _adFicheOld=adFiche;
adFiche=function(ad){if(ad.kind==="b") return bienFiche(ad.suf); if(ad.kind!=="v") return _adFicheOld(ad);
 const a=findAd("v",ad.ck,ad.suf); if(!a) return `<p class="sub">Cette annonce n'est plus dans le relevé.</p>`; const vb=Object.assign(venteBien(ad.ck,a),{kind:"v",suf:ad.suf}), url=VTURL+a[3];
 return `${a[4]?`<img class="adph" src="${esc(photoUrl(a[3],a[4],720,420))}" alt="Photo principale de l'annonce" referrerpolicy="no-referrer" onerror="this.remove()">`:""}
  <div class="dh"><h3 style="font-size:1.15rem;margin:0">${esc(vb.titre)}</h3><span class="pill p-n">à vendre</span></div>
  <p class="sub" style="margin:2px 0 8px">${keur(a[2])} affiché · ${eur(a[2]/a[0])}/m² ${vuBadges("v",ad.ck,ad.suf)}</p>
  ${bienFicheBody(vb,{title:"Cette annonce"})}
  <div class="adact">${adNav(ad)}${addBtn(ad.ck,a,1)}${cmpBtn({kind:"v",id:ad.ck+"|"+ad.suf})}<a class="btn ghost sm" href="${esc(url)}" target="_blank" rel="noopener" title="Photos et description complète">Bien'ici ↗</a></div>`;};
bienFiche=function(id){const b=BIENS.find(x=>x.id===id); if(!b) return `<p class="sub">Ce bien n'est plus dans la liste.</p>`;
 const s=bienSuf(b), sc=visitScore(b), ph=bienPhoto(b,720,420), out=isOut(b)?"écarté":null;
 return `${ph?`<img class="adph" src="${esc(ph)}" alt="Photo de l'annonce" referrerpolicy="no-referrer" onerror="this.remove()">`:""}
 <div class="dh"><h3 style="font-size:1.15rem;margin:0;display:flex;gap:6px;align-items:center"><button type="button" class="star${b.fav?" on":""}" data-fav="${b.id}" aria-label="${b.fav?"Retirer des favoris":"Mettre en favori"}">${b.fav?"★":"☆"}</button>${esc(b.titre||"Bien sans nom")}</h3>${stPill(b)}</div>
 <p class="sub" style="margin:2px 0 8px">${b.surface} m² · ${keur(+b.prix)} affiché${b.par?` · ajouté par ${esc(b.par)}`:""} ${s?vuBadges("v",b.ville,s):""}</p>
 ${out?`<p class="outline">Bien écarté : hors shortlist et hors carte, gardé dans « Nos biens ». <button type="button" class="lnk" data-reshort="${b.id}">Le remettre dans la shortlist</button></p>`:""}
 ${bienFicheBody(b,{title:b.titre||"Ce bien"})}
 <div class="adact many">${adNav({kind:"b",ck:b.ville,suf:b.id})}<button type="button" class="btn addv" data-visit="${b.id}">Visite${sc!=null?" · "+fr(sc,1)+"/5":""}</button><button type="button" class="btn ghost sm" data-fiche="${b.id}">Fiche à emporter</button>${cmpBtn({kind:"b",id:b.id})}${b.url?`<a class="btn ghost sm" href="${esc(b.url)}" target="_blank" rel="noopener">Annonce ↗</a>`:""}${out?"":`<button type="button" class="btn ghost sm" data-unshort="${b.id}">Écarter</button>`}</div>`;};

/* ---------- téléphone : mêmes rubriques sous la photo et les deux gros chiffres ---------- */
if(typeof mAdHeavy==="function"){
 const mQRow=t=>t?`<div class="mgroup"><button type="button" class="mrow" data-mgoq="${t.ck}|${t.code}">Le quartier ${esc(t.name)} : fiche et carte<span class="mchev">›</span></button></div>`:"";
 mAdHeavy=function(o){const vb=Object.assign(venteBien(o.ck,o.a),{kind:"v",suf:o.a[3]}); return `<div class="mfs">${bienFicheBody(vb,{noHead:true,title:"Cette annonce"})}</div>${mQRow(calcBien(vb).t)}<div class="mgroup">${cmpBtn({kind:"v",id:o.ck+"|"+o.a[3]}).replace('class="cmpb','class="mrow cmprow cmpb')}<a class="mrow" href="${esc(o.url)}" target="_blank" rel="noopener">Voir l'annonce sur Bien'ici<span class="mchev">↗</span></a></div>`;};
 mBienHeavy=function(b){return `<div class="mfs">${bienFicheBody(b,{noHead:true,title:b.titre||"Ce bien"})}</div>${mQRow(calcBien(b).t)}`;};}

