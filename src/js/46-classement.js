/* ---------- ordinateur : classement de toutes les annonces (onglet « Toutes les annonces ») ---------- */
const DF={ck:"",sec:"",sort:"irr",nw:false,drop:false,bank:false,n:30};
function renderAnn(){const box=document.getElementById("annBox"); if(!box||MOBON) return;
 const all=feedList(DF), L=feedSorted(all.slice(),DF), nNew=all.filter(o=>o.nw).length, nDrop=all.filter(o=>o.v&&o.v.last).length, cities=Object.keys(ADS).filter(k=>ADS[k]&&ADS[k].ventes);
 const row=(o,i)=>{const [bc,bt]=bank(o.x.ratio), b=bienOf(o.url), on=b&&!isOut(b);
  const badge=o.nw?`<span class="hb new">nouveau</span>`:o.v&&o.v.last?`<span class="hb drop">↓ ${keur(o.v.last.amt)}</span>`:o.v&&o.v.days>=30?`<span class="hb old">${o.v.days} j</span>`:"";
  return `<tr class="clk" tabindex="0" data-annad="${o.ck}|${esc(o.a[3])}"><td class="r mono">${i+1}</td><td class="tcell">${thumbHtml(o.a[3],o.a[4])}</td><td><b>${esc(o.a[1]||"secteur ?")}</b><div class="sub" style="margin:0">${esc(cityName(o.ck))}${o.d&&o.d.real?` · ${minTxt(o.d.min)} ${o.d.mode==="tc"?"en bus":"à pied"} (${MKSH[o.d.mk]})`:""}</div></td>
   <td class="r mono">${String(o.a[0]).replace(".",",")}</td><td class="r mono">${keur(o.a[2])} ${badge}</td><td class="r mono hm">${eur(o.a[2]/o.a[0])}</td><td class="r mono ${o.x.cf>=0?"pos":"neg"}">${sgn(o.x.cf)}</td><td class="r mono" style="color:${colIrr(o.x.irr)};font-weight:700">${irrTxt(o.x)}</td><td><span class="pill ${bc}">${pct(o.x.ratio*100,0)}</span></td>
   <td style="white-space:nowrap">${on?`<span class="pill p-ok">★ shortlist</span>`:addBtn(o.ck,o.a)}</td></tr>`;};
 box.innerHTML=`<div class="annf"><select data-dfc aria-label="Ville"><option value="">Toutes les villes (${all.length})</option>${cities.map(k=>`<option value="${k}"${DF.ck===k?" selected":""}>${esc(cityName(k))} (${ADS[k].ventes.length})</option>`).join("")}</select>
  <span class="seg2" role="group" aria-label="Tri">${SORTS.map(([k,l])=>`<button type="button" data-dfs="${k}" aria-pressed="${DF.sort===k}">${l}</button>`).join("")}</span>
  <button type="button" class="chip" data-dff="nw" aria-pressed="${DF.nw}">Nouvelles (${nNew})</button><button type="button" class="chip" data-dff="drop" aria-pressed="${DF.drop}">↓ Baisses (${nDrop})</button><button type="button" class="chip" data-dff="bank" aria-pressed="${DF.bank}">Banque OK</button>
  <span class="sub" style="margin:0">${L.length} studio${L.length>1?"s":""}${MSEEN&&nNew?` · ${nNew} nouveau${nNew>1?"x":""} depuis votre visite du ${dm(MSEEN)}`:""}</span></div>
  <div class="tablewrap"><table class="adt annt"><thead><tr><th class="r">#</th><th></th><th>Secteur</th><th class="r">m²</th><th class="r">Prix</th><th class="r hm">€/m²</th><th class="r">Cash-flow</th><th class="r">15 ans</th><th>Banque</th><th></th></tr></thead><tbody>${L.slice(0,DF.n).map(row).join("")}</tbody></table></div>
  ${L.length>DF.n?`<button type="button" class="btn ghost sm" data-dfmore style="margin-top:8px">Afficher ${Math.min(30,L.length-DF.n)} de plus</button>`:""}
  <p class="sub" style="margin:6px 0 0">Toutes les annonces de vente suivies, calculées avec vos réglages (${H.net?"chiffres nets":"chiffres bruts"}). Cliquez une ligne pour sa fiche à côté de la carte.</p>`;}
document.addEventListener("click",e=>{if(MOBON) return; const t=e.target.closest&&e.target.closest("[data-dfs],[data-dff],[data-dfmore],[data-annad],[data-annall]"); if(!t) return;
 if(t.dataset.annall!==undefined){e.preventDefault(); showTab("tab-ann"); renderAnn(); document.getElementById("tabsSec").scrollIntoView({behavior:"smooth",block:"start"}); return;}
 if(t.dataset.annad){if(e.target.closest("a,button")) return; const [ck,...r]=t.dataset.annad.split("|"); openAd("v",ck,r.join("|")); document.querySelector(".main").scrollIntoView({behavior:"smooth",block:"start"}); return;}
 if(t.dataset.dfs){DF.sort=t.dataset.dfs; DF.n=30;} else if(t.dataset.dff){DF[t.dataset.dff]=!DF[t.dataset.dff]; DF.n=30;} else if(t.dataset.dfmore!==undefined) DF.n+=30; renderAnn();});
document.addEventListener("change",e=>{const s=e.target.closest&&e.target.closest("[data-dfc]"); if(!s) return; DF.ck=s.value; DF.n=30; renderAnn();});
document.addEventListener("keydown",e=>{const r=e.target.closest&&e.target.closest("[data-annad]"); if(r&&(e.key==="Enter"||e.key===" ")){e.preventDefault(); r.click();}});
const _showTabA=showTab; showTab=function(id){_showTabA(id); if(id==="tab-ann") renderAnn();};
const _renderA=render; render=function(){_renderA.apply(this,arguments); const p=document.getElementById("p-ann"); if(p&&!p.hidden) renderAnn();};
