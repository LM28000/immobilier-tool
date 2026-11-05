/* ---------- fiche complète d'un de nos biens (panneau de droite / feuille du bas) ---------- */
function bienSuf(b){return (b.url||"").startsWith(VTURL)?b.url.slice(VTURL.length).split("?")[0]:null;}
function bienPhoto(b,w,h){const s=bienSuf(b); if(!s) return ""; const a=findAd("v",b.ville,s); const p=a?a[4]:(HIST[b.ville]&&HIST[b.ville].v&&HIST[b.ville].v[s]?HIST[b.ville].v[s].m[2]:""); return p?photoUrl(s,p,w,h):"";}
function bienFiche(id){const b=BIENS.find(x=>x.id===id); if(!b) return `<p class="sub">Ce bien n'est plus dans la liste.</p>`;
 const c=C.find(v=>v.k===b.ville), r=calcBien(b), x=r.x, [bc,bt]=bank(x.ratio), s=bienSuf(b), v=s?vu("v",b.ville,s):null, sc=visitScore(b), ph=bienPhoto(b,720,420);
 const V=b.visite||{}, av=V.avis||{}, coms=Object.entries(av).filter(([,a])=>a.com), out=isOut(b)?"écarté":null;
 const real=[b.dpe?`DPE ${esc(b.dpe)}`:"", +b.copro?`copro ${eur(+b.copro)}/mois`:"", +b.tf?`taxe foncière ${eur(+b.tf)}/an`:"", +b.travaux?`travaux ${eur(+b.travaux)}`:"", V.votes?`votés : ${esc(V.votes)}`:""].filter(Boolean);
 return `${ph?`<img class="adph" src="${esc(ph)}" alt="Photo de l'annonce" referrerpolicy="no-referrer" onerror="this.remove()">`:""}
 <div class="dh"><h3 style="font-size:1.15rem;margin:0;display:flex;gap:6px;align-items:center"><button type="button" class="star${b.fav?" on":""}" data-fav="${b.id}" aria-label="${b.fav?"Retirer des favoris":"Mettre en favori"}">${b.fav?"★":"☆"}</button>${esc(b.titre||"Bien sans nom")}</h3>${stPill(b)}</div>
 <p class="sub" style="margin:2px 0 10px">${c.name}${b.quartier?" · quartier "+esc(b.quartier):""} · ${b.surface} m² · ${keur(+b.prix)} affiché · ${eur(r.pm2)}/m²${b.par?` · ajouté par ${esc(b.par)}`:""} ${s?vuBadges("v",b.ville,s):""}${v&&v.gone?` <span class="hb old">annonce retirée le ${dm(v.gone)}</span>`:""}</p>
 ${out?`<p class="outline">Bien écarté : hors shortlist et hors carte, gardé dans « Nos biens ». <button type="button" class="lnk" data-reshort="${b.id}">Le remettre dans la shortlist</button></p>`:""}
 <div class="big4"><div><span>Budget tout compris</span><b>${keur(x.cost)}</b></div><div><span>Loyer ${+b.loyer>0?"visé":"estimé"} HC</span><b>${eur(x.rentHC)}</b></div>
  <div><span>Cash-flow ${mlab()}</span><b class="${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}/mois</b>${altCf(x)}</div><div><span>15 ans ${mlab()}</span><b style="color:${colIrr(x.irr)}">${x.irr==null?"n.d.":pct(x.irr)}</b>${altIrr(x)}</div></div>
 <p style="margin:8px 0"><span class="pill ${bc}">Banque : ${bt} · ${pct(x.ratio*100,0)}</span> <span class="sub">${fr(r.vac,1)} mois vide${r.vac>=2?"s":""} par an retenu${r.vac>=2?"s":""}</span></p>
 ${taxLine(x)}
 ${negoBlock(b)}
 ${priceCurve(v)}
 <h2 class="psec">Visite</h2>
 ${sc!=null||real.length||coms.length?`<div class="vsum">${sc!=null?`<span class="pill p-n">note ${fr(sc,1)}/5</span>`:""}${real.length?`<span class="sub" style="margin:0">${real.join(" · ")}</span>`:""}</div>${coms.map(([n,a])=>`<p class="vcom"><b>${esc(n)} :</b> ${esc(a.com)}</p>`).join("")}`:`<p class="sub" style="margin:0">Pas encore visité. Le bouton « Visite » permet de saisir les chiffres réels et vos notes.</p>`}
 ${b.notes?`<p class="vcom"><b>Notes :</b> ${esc(b.notes)}</p>`:""}
 <h2 class="psec">Et si…</h2>${scnBox("bien",scnBien(b))}
 <div class="adact many">${adNav({kind:"b",ck:b.ville,suf:b.id})}<button type="button" class="btn addv" data-visit="${b.id}">Visite${sc!=null?" · "+fr(sc,1)+"/5":""}</button><button type="button" class="btn ghost sm" data-fiche="${b.id}">Fiche à emporter</button>${cmpBtn({kind:"b",id:b.id})}${b.url?`<a class="btn ghost sm" href="${esc(b.url)}" target="_blank" rel="noopener">Annonce ↗</a>`:""}${out?"":`<button type="button" class="btn ghost sm" data-unshort="${b.id}">Écarter</button>`}</div>`;}

/* retirer / remettre dans la shortlist (sans changer le statut) */
document.addEventListener("click",e=>{const u=e.target.closest&&e.target.closest("[data-unshort],[data-reshort],[data-gotab]"); if(!u) return; e.preventDefault();
 if(u.dataset.gotab){showTab(u.dataset.gotab); document.getElementById("p-biens").scrollIntoView({behavior:"smooth",block:"start"}); return;}
 const id=u.dataset.unshort||u.dataset.reshort, b=BIENS.find(x=>x.id===id); if(!b) return;
 const prev=b.statut||"à voir";
 if(u.dataset.unshort){updBien(id,{statut:"écarté",short:true}); toast(`« ${b.titre||"Bien"} » écarté : retiré de la shortlist, gardé dans « Nos biens ».`,{label:"Annuler",fn:()=>updBien(id,{statut:prev})});}
 else {updBien(id,{statut:prev==="écarté"?"à voir":prev,short:true}); toast("Remis dans la shortlist.");}});
const isOut=b=>b.statut==="écarté"||b.short===false;
let SHOWOUT=false;
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-showout]"); if(!t) return; e.preventDefault(); SHOWOUT=!SHOWOUT; renderBiens();});
