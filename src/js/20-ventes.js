/* ---------- ventes (studios à vendre) ---------- */
const VTURL="https://www.bienici.com/annonce/vente/";
const VC=new Map();
function venteIris(ck,sector){const A=ADS[ck], z=IR[ck]; if(!A||!z||!A.map[sector]) return null;
 const ts=z.list.filter(t=>A.map[sector].includes(t.code)&&t.price); return ts.sort((a,b)=>b.dpe.reduce((x,y)=>x+y,0)-a.dpe.reduce((x,y)=>x+y,0))[0]||null;}
function venteBien(ck,a){const t=venteIris(ck,a[1]); return {ville:ck,quartier:t?t.name:"",prix:a[2],surface:a[0],url:VTURL+a[3],titre:`Studio ${String(a[0]).replace(".",",")} m²${a[1]?" · "+a[1]:""}`,secteur:a[1]};}
function venteCalc(ck,a){const k=ck+a[3]; if(!VC.has(k)) VC.set(k,calcBien(venteBien(ck,a))); return VC.get(k);}
const allVentes=()=>Object.entries(ADS).filter(([k,v])=>v&&v.ventes).flatMap(([ck,v])=>v.ventes.map(a=>({ck,a,r:venteCalc(ck,a)})));
const isAdded=url=>BIENS.some(b=>b.url===url);
function addBtn(ck,a,big){const u=VTURL+a[3]; return isAdded(u)?`<span class="pill p-ok">✓ dans nos biens</span>`:`<button type="button" class="btn${big?"":" sm"} addv" data-addv="${ck}|${esc(a[3])}" aria-label="Ajouter à nos biens">+${big?" Ajouter à nos biens":`<span class="lbl"> Ajouter</span>`}</button>`;}
function ventesTable(ck,list,sector){const rows=list.map(a=>({a,r:venteCalc(ck,a)})).sort((x,y)=>(y.r.x.irr??-99)-(x.r.x.irr??-99));
 return `<div class="scrollbox"><table class="adt"><thead><tr><th></th>${sector?"<th>Secteur</th>":""}<th class="r">m²</th><th class="r">Prix</th><th class="r hm">€/m²</th><th class="r">Cash-flow</th><th class="r">15 ans</th><th></th></tr></thead><tbody>${rows.map(({a,r})=>{const [bc]=bank(r.x.ratio);
  const hv=vu("v",ck,a[3]); return `<tr class="clk" tabindex="0" data-ad="v|${ck}|${esc(a[3])}"${hv&&hv.last?' data-drop="1"':""}><td class="tcell">${thumbHtml(a[3],a[4])}</td>${sector?`<td>${esc(a[1]||"non précisé")}</td>`:""}<td class="r mono">${String(a[0]).replace(".",",")}</td><td class="r mono">${keur(a[2])}${vuBadges("v",ck,a[3])?`<div class="hbs">${vuBadges("v",ck,a[3])}</div>`:""}</td><td class="r mono hm">${eur(a[2]/a[0])}</td><td class="r mono ${r.x.cf>=0?"pos":"neg"}">${sgn(r.x.cf)}</td><td class="r mono" style="color:${colIrr(r.x.irr)};font-weight:700">${r.x.irr==null?"n.d.":pct(r.x.irr)}${bc==="p-bad"?' <span title="banque trop juste">⚠</span>':""}</td><td style="white-space:nowrap"><a class="hm" href="${VTURL}${esc(a[3])}" target="_blank" rel="noopener">voir</a> ${addBtn(ck,a)}</td></tr>`;}).join("")}</tbody></table></div>
 <p class="sub" style="margin:4px 0 0">Prix affichés (frais d'agence en général inclus), relevé du ${ADS.date||"5 novembre 2026"}. Calcul avec notaire, meubles, petits travaux et le loyer du quartier. ⚠ = banque trop juste.</p>`;}
function ventesLine(t){const A=ADS[t.ck]; if(!A||!A.ventes) return ""; const d=Object.keys(A.map).find(k=>A.map[k].includes(t.code)); if(!d) return "";
 const l=A.ventes.filter(a=>a[1]===d); if(!l.length) return `<p class="sub" style="margin:0 0 6px">Aucun studio à vendre en ce moment dans le secteur « ${esc(d)} » sur Bien'ici.</p>`;
 const best=l.map(a=>venteCalc(t.ck,a)).reduce((m,r)=>r.x.irr!=null&&(m==null||r.x.irr>m)?r.x.irr:m,null);
 return `<details class="ads"${OPENADS===d?" open":""}><summary>${l.length} studio${l.length>1?"s":""} à vendre dans le secteur « ${esc(d)} »${best!=null?` · jusqu'à ${pct(best)} sur 15 ans`:""}</summary>${ventesTable(t.ck,l,false)}</details>`;}
function ventesCity(ck){const A=ADS[ck]; if(!A||!A.ventes||!A.ventes.length) return ""; const c=C.find(v=>v.k===ck), pm=median(A.ventes.map(a=>a[2]/a[0]));
 return `<p class="sub" style="margin:8px 0 0">Prix demandés : ${A.ventes.length} studios à vendre à ${c.name}, <b class="mono">${eur(pm)}/m²</b> en médiane, contre <b class="mono">${eur(c.pm2*(1+H.surcote/100))}/m²</b> dans le calcul de la ville (ventes réelles DVF + surcote). Les prix affichés incluent en général les frais d'agence et une marge de négociation.</p>`;}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-addv]"); if(!b) return; e.preventDefault();
 const [ck,suf]=b.dataset.addv.split("|"), a=(ADS[ck].ventes||[]).find(v=>v[3]===suf); if(!a||!DB) return;
 const vb=venteBien(ck,a), bien={titre:vb.titre,url:vb.url,ville:ck,quartier:vb.quartier,prix:a[2],surface:a[0],copro:0,tf:0,loyer:0,dpe:"",notes:"",statut:"à voir",fav:false,par:myName(),ts:Date.now()};
 b.disabled=true; b.textContent="ajout…";
 try{await DB.collection("biens").add(bien); b.outerHTML=`<span class="pill p-ok">ajouté</span>`; toast(`« ${vb.titre} » ajouté à nos biens.`);}catch(err){b.disabled=false; b.textContent="+ Ajouter"; toast("Ajout impossible ("+(err&&err.code||"erreur")+").");}});

/* ---------- petit message ---------- */
function toast(t,act){let el=document.getElementById("toast"); if(!el){el=document.createElement("div"); el.id="toast"; el.setAttribute("role","status"); document.body.appendChild(el);}
 el.innerHTML=""; const sp=document.createElement("span"); sp.textContent=t; el.appendChild(sp); el.classList.toggle("act",!!act);
 if(act){const b=document.createElement("button"); b.type="button"; b.textContent=act.label; b.addEventListener("click",()=>{el.classList.remove("on"); clearTimeout(toast.t); act.fn();},{once:true}); el.appendChild(b);}
 el.classList.add("on"); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove("on"),act?6500:3200);}

/* ---------- simuler un bien dans un quartier ---------- */
function simHere(ck,code){const t=IR[ck].list.find(v=>v.code===code); if(!t) return; showTab("tab-biens");
 const f=document.getElementById("biensForm"); f.reset(); document.getElementById("b-ville").value=ck; fillQuartiers(); document.getElementById("b-quartier").value=t.name;
 const c=C.find(v=>v.k===ck), p=Math.round(c.pm2*(1+H.surcote/100)*t.price/IR[ck].med*22/500)*500;
 f.elements.titre.value=`Studio type · ${t.name}`; f.elements.surface.value=22; f.elements.prix.value=p;
 document.getElementById("p-biens").scrollIntoView({behavior:"smooth",block:"start"}); setTimeout(()=>f.elements.prix.focus({preventScroll:true}),400);
 toast("Formulaire prérempli : corrigez le prix et la surface puis ajoutez.");}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-sim]"); if(!b) return; e.preventDefault(); const [ck,code]=b.dataset.sim.split("|"); simHere(ck,code);});

/* ---------- statuts, favoris, auteur ---------- */
const STATUTS=["à voir","visité","offre faite","écarté"];
function myName(){try{return localStorage.getItem("biens-nom")||"";}catch(_){return "";}}
async function updBien(id,patch){try{await DB.collection("biens").doc(id).update(patch);}catch(err){toast("Modification refusée ("+(err&&err.code||"erreur")+").");}}
const STC={"à voir":"st0","visité":"st1","offre faite":"st2","écarté":"st3"};
function stPill(b){const s=b.statut||"à voir"; return `<span class="stwrap"><button type="button" class="stp ${STC[s]||"st0"}" data-stmenu="${b.id}" aria-haspopup="true" aria-expanded="false" title="Changer le statut"><i></i>${s} <span aria-hidden="true">▾</span></button></span>`;}
function closeStMenus(){document.querySelectorAll(".stmenu").forEach(m=>{m.previousElementSibling&&m.previousElementSibling.setAttribute("aria-expanded","false"); m.remove();});}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-stmenu],[data-stset]");
 if(!t){closeStMenus(); return;} e.preventDefault();
 if(t.dataset.stmenu){const open=t.nextElementSibling&&t.nextElementSibling.classList.contains("stmenu"); closeStMenus(); if(open) return; const b=BIENS.find(x=>x.id===t.dataset.stmenu); if(!b) return;
  const m=document.createElement("span"); m.className="stmenu"; m.setAttribute("role","menu");
  m.innerHTML=STATUTS.map(s=>`<button type="button" role="menuitemradio" aria-checked="${(b.statut||"à voir")===s}" class="stp ${STC[s]}" data-stset="${b.id}|${s}"><i></i>${s}</button>`).join("");
  t.after(m); t.setAttribute("aria-expanded","true"); return;}
 const [id,nx]=t.dataset.stset.split("|"), b=BIENS.find(x=>x.id===id); closeStMenus(); if(!b) return; const prev=b.statut||"à voir"; if(prev===nx) return;
 updBien(id,{statut:nx}); toast(nx==="écarté"?"Bien écarté : il quitte la shortlist et la carte, et reste dans « Nos biens ».":`Statut : ${nx}`,{label:"Annuler",fn:()=>updBien(id,{statut:prev})});});
addEventListener("keydown",e=>{if(e.key==="Escape") closeStMenus();});
document.addEventListener("click",e=>{const f=e.target.closest&&e.target.closest("[data-fav]"); if(!f) return; e.preventDefault(); const b=BIENS.find(x=>x.id===f.dataset.fav); if(b) updBien(b.id,{fav:!b.fav});});

