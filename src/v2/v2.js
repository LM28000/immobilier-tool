/* ================= version 2 (v2.html) : même app, même calcul, autre organisation =================
   Ajouté après tout le reste par build.py, seulement dans v2.html. Ne modifie aucune règle de calcul.
   - ordinateur : onglets en haut, la carte en plein écran à l'ouverture, la fiche dans un panneau à droite,
     découpée en onglets ; les annonces en tableau ou en nuage ; scénario prudent / central / favorable.
   - téléphone : l'interface mobile existante, ouverte sur la carte. */
(function v2(){
 document.documentElement.classList.add("v2");
 document.body.classList.remove("simple");                       /* tout est visible : plus de « vue simple » */
 const V2={tab:"carte",ftab:{}};
 try{Object.assign(V2,JSON.parse(localStorage.getItem("v2")||"{}"));}catch(_){}
 const saveV2=()=>{try{localStorage.setItem("v2",JSON.stringify(V2));}catch(_){}};
 const TABS=[["carte","Carte"],["annonces","Annonces"],["villes","Villes"],["biens","Nos biens"],["comparer","Comparer"],["budget","Budget"]];
 const SCN=[["prudent","Prudent"],["central","Central"],["favorable","Favorable"]];
 const scnNow=()=>H.pess?"prudent":H.fav?"favorable":"central";

 /* ---------- barre du haut ---------- */
 const bar=document.createElement("div"); bar.id="v2bar"; document.body.prepend(bar);
 function barHtml(){const nb=BIENS.filter(b=>!isOut(b)).length;
  bar.innerHTML=`<span class="v2b">Notre studio</span><nav class="v2tabs" aria-label="Rubriques">${TABS.map(([k,l])=>`<button type="button" data-v2tab="${k}" aria-current="${V2.tab===k?"page":"false"}">${l}${k==="biens"&&nb?`<small>${nb}</small>`:k==="comparer"&&typeof CMP!=="undefined"&&CMP.length?`<small>${CMP.length}</small>`:""}</button>`).join("")}</nav>
  <span class="v2r">${typeSeg()}<span class="seg2 typeseg" role="group" aria-label="Scénario">${SCN.map(([k,l])=>`<button type="button" data-v2scn="${k}" aria-pressed="${scnNow()===k}">${l}</button>`).join("")}</span><button type="button" class="btn sm" data-v2theme aria-label="Changer de thème">${document.documentElement.getAttribute("data-theme")==="dark"?"Clair":"Sombre"}</button></span>`;}

 /* ---------- onglets ---------- */
 const PANE={annonces:"tab-ann",biens:"tab-biens",comparer:"tab-cmp"};
 function go(k,quiet){if(!TABS.some(t=>t[0]===k)) k="carte"; V2.tab=k; saveV2(); document.body.dataset.v2=k;
  if(PANE[k]) showTab(PANE[k]); else if(k==="villes"){const s=document.querySelector('[role="tab"][aria-selected="true"]'); if(!s||!["tab-rank","tab-sc"].includes(s.id)) showTab("tab-rank");}
  const m=document.getElementById("mapSec"); if(m&&!MOBON){m.classList.toggle("mapfull",k==="carte"); document.body.classList.toggle("noscroll",k==="carte");}
  barHtml(); fiche();
  if(!quiet){window.scrollTo(0,0); requestAnimationFrame(()=>{try{fitVH();}catch(_){} if(typeof LEAF!=="undefined"&&LEAF.map) LEAF.map.invalidateSize();});}
  if(k==="annonces") nuage();}
 /* la carte reste en plein écran dans l'onglet Carte : Échap ou « F » ne la sortent plus de là */
 const _setFull=setFull; setFull=function(on){if(!MOBON&&V2.tab==="carte") on=true; _setFull(on);};

 /* ---------- panneau de fiche ---------- */
 function fiche(){const open=!MOBON&&(!!AD||!!QSEL)&&V2.tab!=="carte"; document.body.classList.toggle("v2open",open); ftabs();}
 const GROUPS=[["bien","Le bien",["attn","annonce","prix","loyer"]],["calc","Le calcul",["calc"]],["quartier","Le quartier",["traj","vie","bati","risq","hab","ecoles","urba"]],["achat","L'achat",["suivi","visite"]],["plus","Annonces et sources",["ann","src"]]];
 function ftabs(){["qDetailBody","detail"].forEach(id=>{const box=document.getElementById(id); if(!box||MOBON) return;
  const secs=[...box.querySelectorAll("details.fsec")]; if(!secs.length) return; const old=box.querySelector(".v2ft"); if(old) old.remove();
  const lv=secs[0].dataset.lv||"x", have=GROUPS.filter(g=>secs.some(s=>g[2].includes(s.dataset.sec))); if(!have.length) return;
  let cur=V2.ftab[lv]; if(!have.some(g=>g[0]===cur)) cur=have[0][0];
  const tb=document.createElement("div"); tb.className="v2ft"; tb.setAttribute("role","group"); tb.setAttribute("aria-label","Rubriques de la fiche");
  tb.innerHTML=have.map(([k,l])=>`<button type="button" data-v2ft="${lv}|${k}" aria-pressed="${k===cur}">${l}</button>`).join("");
  secs[0].before(tb); const g=GROUPS.find(x=>x[0]===cur)[2];
  secs.forEach(s=>{const on=g.includes(s.dataset.sec); s.hidden=!on; if(on&&!s.open) s.open=true;});});}
 let busy=false; const mo=new MutationObserver(()=>{if(busy) return; busy=true; requestAnimationFrame(()=>{fiche(); busy=false;});});
 ["qDetailBody","detail"].forEach(id=>{const el=document.getElementById(id); if(el) mo.observe(el,{childList:true});});
 const qd=document.getElementById("qDetail"); if(qd) new MutationObserver(()=>fiche()).observe(qd,{attributes:true,attributeFilter:["hidden"]});

 /* ---------- annonces : nuage (mêmes filtres que le tableau) ---------- */
 function nuage(){const box=document.getElementById("annBox"); if(!box||MOBON) return;
  let sw=document.getElementById("v2annv"); if(!sw){box.insertAdjacentHTML("beforebegin",`<div class="v2annv" id="v2annv"><span class="seg2 typeseg" role="group" aria-label="Affichage des annonces"><button type="button" data-v2nu="0">Tableau</button><button type="button" data-v2nu="1">Nuage</button></span><span class="sub" style="margin:0">Le nuage montre les mêmes annonces que le tableau, avec les mêmes filtres.</span></div>`); box.insertAdjacentHTML("afterend",`<div id="v2nuage" hidden></div>`); sw=document.getElementById("v2annv");}
  const on=!!V2.nu; sw.querySelectorAll("[data-v2nu]").forEach(b=>b.setAttribute("aria-pressed",String((b.dataset.v2nu==="1")===on)));
  document.body.classList.toggle("v2nu",on); const nb=document.getElementById("v2nuage"); nb.hidden=!on; if(!on) return;
  const L=feedSorted(feedList(DF).slice(),DF).filter(o=>o.x&&o.x.irr!=null&&!horsCalcul(o.a[3]));
  if(!L.length){nb.innerHTML=`<p class="sub">Aucune annonce avec ces filtres.</p>`; return;}
  const W=900,Hh=460,l=56,r=16,t=18,b=40, xs=L.map(o=>o.x.cost/1000), x0=Math.floor(Math.min(...xs)/10)*10, x1=Math.ceil(Math.max(...xs)/10)*10, y0=-4, y1=12;
  const X=v=>l+(v-x0)/(x1-x0||1)*(W-l-r), Y=v=>t+(y1-Math.max(y0,Math.min(y1,v)))/(y1-y0)*(Hh-t-b);
  const tk=(a,z,n)=>{const st=Math.pow(10,Math.floor(Math.log10((z-a)/n))), m=[1,2,2.5,5,10].find(m=>(z-a)/(st*m)<=n)*st, o=[]; for(let v=Math.ceil(a/m)*m; v<=z+1e-9; v+=m) o.push(+v.toFixed(6)); return o;};
  let s=`<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Rendement sur 15 ans selon le budget tout compris, une pastille par annonce">`;
  tk(y0,y1,8).forEach(v=>{s+=`<line x1="${l}" x2="${W-r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" ${v?'stroke-dasharray="2 4"':""}/><text x="${l-6}" y="${Y(v)+4}" text-anchor="end">${fr(v,0)} %</text>`;});
  tk(x0,x1,8).forEach(v=>{s+=`<text x="${X(v)}" y="${Hh-b+16}" text-anchor="middle">${v} k€</text>`;});
  s+=`<text x="${W-r}" y="${Hh-4}" text-anchor="end">budget tout compris</text><text x="${l}" y="${t-4}">rendement sur 15 ans · ${scnNow()}</text>`;
  L.forEach(o=>{const x=X(o.x.cost/1000), y=Y(o.x.irr), z=irr3(o.x)||{}, c=colIrr(o.x.irr), b=bienOf(o.url), sh=b&&!isOut(b), sel=AD&&AD.kind==="v"&&AD.suf===o.a[3], tl=`${cityName(o.ck)} · ${o.a[1]||""} · ${keur(o.a[2])} · ${String(o.a[0]).replace(".",",")} m² · ${irrTxt(o.x)}`;
   if(z.prudent!=null&&z.favorable!=null) s+=`<line x1="${x}" x2="${x}" y1="${Y(z.favorable)}" y2="${Y(z.prudent)}" stroke="${c}" stroke-opacity=".3" stroke-width="2"/>`;
   s+=sh?`<path d="M${x} ${y-9}l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="${c}" stroke="var(--surface)" stroke-width="1.5" data-v2ad="${o.ck}|${esc(o.a[3])}"><title>${esc(tl)}</title></path>`
    :`<circle cx="${x}" cy="${y}" r="${sel?8:5}" fill="${c}" fill-opacity=".85" stroke="${sel?"var(--fg)":"var(--surface)"}" stroke-width="${sel?3:1}" data-v2ad="${o.ck}|${esc(o.a[3])}"><title>${esc(tl)}</title></circle>${o.nw?`<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="var(--accent)" stroke-width="1.5" pointer-events="none"/>`:""}`;});
  nb.innerHTML=s+`</svg><div class="v2leg"><span>Trait : du scénario prudent au favorable</span><span>Anneau : nouvelle</span><span>Étoile : dans la shortlist</span><span>${L.length} annonces</span></div>`;}
 const _renderAnn=renderAnn; renderAnn=function(){_renderAnn.apply(this,arguments); if(V2.tab==="annonces") nuage();};

 /* ---------- événements ---------- */
 document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-v2tab],[data-v2scn],[data-v2ft],[data-v2nu],[data-v2ad],[data-v2theme]"); if(!t) return; e.preventDefault(); const d=t.dataset;
  if(d.v2tab){go(d.v2tab); return;}
  if(d.v2scn){H.pess=d.v2scn==="prudent"; H.fav=d.v2scn==="favorable"; const p=document.getElementById("f-pess"); if(p) p.checked=H.pess; if(typeof CALCC!=="undefined") CALCC.clear(); if(typeof VC!=="undefined") VC.clear(); render(); barHtml(); if(V2.tab==="annonces") renderAnn(); return;}
  if(d.v2ft){const [lv,k]=d.v2ft.split("|"); V2.ftab[lv]=k; saveV2(); ftabs(); const f=document.querySelector(`[data-v2ft="${lv}|${k}"]`); if(f) f.focus(); return;}
  if(d.v2nu!=null){V2.nu=d.v2nu==="1"; saveV2(); nuage(); return;}
  if(d.v2ad){const [ck,...r]=d.v2ad.split("|"); openAd("v",ck,r.join("|")); fiche(); nuage(); return;}
  if(d.v2theme){const b=document.getElementById("themeBtn"); if(b) b.click(); barHtml(); return;}});
 /* une annonce ouverte depuis un tableau s'affiche dans le panneau, sans changer d'onglet ni de filtre */
 document.addEventListener("click",e=>{if(MOBON) return; if(e.target.closest&&e.target.closest("[data-annad],[data-openad],[data-fgo],[data-crumb]")) requestAnimationFrame(fiche);},true);
 const _render=render; render=function(){_render.apply(this,arguments); if(!MOBON){barHtml(); fiche();}};
 addEventListener("resize",()=>{if(!MOBON) fiche();});

 /* ---------- départ ---------- */
 if(MOBON){if(typeof mShowNow==="function"&&MS==="accueil") mShowNow("carte");}
 go(V2.tab||"carte",true);
 requestAnimationFrame(()=>{try{fitVH();}catch(_){}});
})();
