/* ---------- shortlist et bonnes affaires ---------- */
function bienCard(b){const r=calcBien(b), [bc,bt]=bank(r.x.ratio), c=C.find(v=>v.k===b.ville);
 const ph=bienPhoto(b,480,240); return `<div class="bcard${b.statut==="écarté"?" off":""}">${ph?`<button type="button" class="bph" data-openad="b|${b.ville}|${b.id}" aria-label="Ouvrir la fiche"><img src="${esc(ph)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.remove()"></button>`:""}<div class="bch"><button type="button" class="star${b.fav?" on":""}" data-fav="${b.id}" aria-label="${b.fav?"Retirer des favoris":"Mettre en favori"}">${b.fav?"★":"☆"}</button><button type="button" class="btitle" data-openad="b|${b.ville}|${b.id}" title="Ouvrir la fiche complète">${esc(b.titre||"Bien sans nom")}</button><button type="button" class="unshort" data-unshort="${b.id}" aria-label="Retirer de la shortlist" title="Retirer de la shortlist">×</button></div>
  <div class="sub" style="margin:0">${c?c.name:""}${b.quartier?" · "+esc(b.quartier):""} · ${b.surface} m² · ${keur(+b.prix)}${b.par?` · ajouté par ${esc(b.par)}`:""}</div>
  <div class="bcn"><span><small>Cash-flow ${mlab()}</small><b class="mono ${r.x.cf>=0?"pos":"neg"}">${sgn(r.x.cf)}</b>${altCf(r.x,1)}</span><span><small>15 ans ${mlab()}</small><b class="mono" style="color:${colIrr(r.x.irr)}">${r.x.irr==null?"n.d.":pct(r.x.irr)}</b>${altIrr(r.x,1)}</span></div>
  <div class="bcf"><button type="button" class="btn sm" data-openad="b|${b.ville}|${b.id}">Détail</button>${stPill(b)}<span class="pill ${bc}" title="Avis probable de la banque">${bt}</span>${visitFlags(b)?`<span class="pill p-bad" title="Points négatifs relevés en visite">${visitFlags(b)} ✗</span>`:""}</div>
  <details class="bmore"><summary>Prix à viser et actions</summary>${(()=>{const g=targetsFor(b); return `<div class="btg"><span><i class="dot d1"></i>Autofinancé<b class="mono">${g.cf==null?"—":"≤ "+keur(g.cf)}</b>${tgtChip(g.cf,g.ref,1)}</span><span><i class="dot d2"></i>7 %/an<b class="mono">${g.r7==null?"—":"≤ "+keur(g.r7)}</b>${tgtChip(g.r7,g.ref,1)}</span></div>`;})()}
  <div class="bcf">${b.url?`<a href="${esc(b.url)}" target="_blank" rel="noopener">annonce</a>`:""}<button type="button" class="lnk" data-visit="${b.id}">visite${visitScore(b)!=null?" "+fr(visitScore(b),1)+"/5":""}</button>${cmpBtn({kind:"b",id:b.id})}</div></details></div>`;}
function renderShort(){const sl=document.getElementById("shortList"), dl=document.getElementById("dealsList"); if(!sl) return;
 const inShort=b=>!isOut(b), out=BIENS.filter(b=>!inShort(b)).length, mine=BIENS.filter(inShort).map(b=>({b,r:calcBien(b)})).sort((x,y)=>(y.b.fav-x.b.fav)||((y.r.x.irr??-99)-(x.r.x.irr??-99))).slice(0,12);
 sl.innerHTML=(mine.length?mine.map(o=>bienCard(o.b)).join(""):`<p class="sub" style="margin:0">Aucun bien dans la shortlist.</p>`); document.getElementById("shortOut").innerHTML=""; if(!BIENS.length) sl.innerHTML=`<p class="sub" style="margin:0">Aucun bien pour l'instant. Ajoutez-en un depuis les ventes ci-dessous, depuis la fiche d'un quartier ou depuis l'onglet « Nos biens ».</p>`;
 const deals=allVentes().filter(v=>v.r.x.irr!=null&&bankOk(v.r.x.ratio)&&!isAdded(VTURL+v.a[3])&&!horsCalcul(v.a[3])).sort((x,y)=>y.r.x.irr-x.r.x.irr).slice(0,12);
 dl.innerHTML=deals.length?deals.map(({ck,a,r})=>`<div class="bcard deal">${a[4]?`<img class="dealph" src="${esc(photoUrl(a[3],a[4],480,260))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:""}<div class="bch"><b>Studio ${String(a[0]).replace(".",",")} m²</b><span class="pill p-n">${C.find(c=>c.k===ck).name}</span></div>
  <div class="sub" style="margin:0">${esc(a[1]||"secteur non précisé")} · ${keur(a[2])} · ${eur(a[2]/a[0])}/m²</div>
  <div class="bcn"><span><small>Cash-flow ${mlab()}</small><b class="mono ${r.x.cf>=0?"pos":"neg"}">${sgn(r.x.cf)}</b></span><span><small>15 ans ${mlab()}</small><b class="mono" style="color:${colIrr(r.x.irr)}">${pct(r.x.irr)}</b></span></div>
  <div class="bcf"><button type="button" class="lnk" data-openad="v|${ck}|${esc(a[3])}">voir le détail</button>${addBtn(ck,a)}</div></div>`).join(""):`<p class="sub" style="margin:0">Aucune vente du jour ne passe la banque avec vos réglages.</p>`;}
document.addEventListener("click",e=>{const g=e.target.closest&&e.target.closest("[data-gomap]"); if(!g) return; e.preventDefault(); const b=BIENS.find(x=>x.id===g.dataset.gomap); if(!b||!IR[b.ville]) return;
 const t=IR[b.ville].list.find(v=>v.name===b.quartier); if(!t) return; SEL=b.ville; QSEL=t; render(); document.querySelector(".main").scrollIntoView({behavior:"smooth"}); flyTo(t.bb,3.2);});

/* ---------- épingles des biens sur la carte ---------- */
function bienPins(P){let s=""; const by={};
 BIENS.filter(b=>b.quartier&&IR[b.ville]&&b.statut!=="écarté").forEach(b=>{const t=IR[b.ville].list.find(v=>v.name===b.quartier); if(!t) return; (by[b.ville+t.code]=by[b.ville+t.code]||{t,l:[]}).l.push(b);});
 Object.values(by).forEach(({t,l})=>{const [x,y]=P(t.cx,t.cy); if(x<-20||x>VW+20||y<-20||y>VH+20) return; const best=l.map(b=>calcBien(b).x.irr).reduce((m,v)=>v!=null&&(m==null||v>m)?v:m,null);
  s+=`<g class="bpin" data-bpin="${l[0].id}" role="button" tabindex="0" aria-label="${l.length} bien${l.length>1?"s":""} dans ${esc(t.name)}"><path d="M${x} ${y-4}l-9 -12a11 11 0 1 1 18 0z" fill="${colIrr(best)}" stroke="var(--surface)" stroke-width="2"/><text x="${x}" y="${y-19}" text-anchor="middle" font-size="10" font-weight="800" fill="var(--surface)">${l.length>1?l.length:"★"}</text></g>`;});
 return s;}
function openBien(id){const b=BIENS.find(x=>x.id===id); if(b){openAd("b",b.ville,id); const t=wide()?document.getElementById("side"):null; if(t) t.scrollIntoView({behavior:"smooth",block:"start"}); return;} showTab("tab-biens"); const tr=document.querySelector(`#biensList tr[data-id="${CSS.escape(id)}"]`); if(tr){tr.scrollIntoView({behavior:"smooth",block:"center"}); tr.classList.add("flash"); setTimeout(()=>tr.classList.remove("flash"),1800);}}

/* ---------- vue simple / complète ---------- */
function setMode(m){document.body.classList.toggle("simple",m==="simple"); document.querySelectorAll("#modeSeg button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.mode===m));
 try{localStorage.setItem("vue-mode",m);}catch(_){}
 const cur=document.querySelector('[role="tab"][aria-selected="true"]'); if(m==="simple"&&cur&&(cur.id==="tab-rank"||cur.id==="tab-sc")) showTab("tab-biens");}
document.querySelectorAll("#modeSeg button").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));
(function(){let m="simple"; try{m=localStorage.getItem("vue-mode")||"simple";}catch(_){} setMode(m);})();

/* ---------- liste commune (Supabase) ---------- */
const SB={url:"https://rgemkhdnvxxhcmvevxmj.supabase.co",key:"sb_publishable_NMyyc7oEJkn9jajEtmfHMg_0bHLOgYS"};
function sbCode(){try{return localStorage.getItem("biens-code")||"";}catch(_){return "";}}
/* fusion à trois : base = ce qu'on avait lu, mine = notre version, theirs = la ligne relue à l'instant. Une clé que l'on n'a pas changée garde la valeur de l'autre personne. */
const jeq=(a,b)=>JSON.stringify(a)===JSON.stringify(b), isO=v=>v&&typeof v==="object"&&!Array.isArray(v);
function merge3(base,mine,theirs){if(!isO(mine)||!isO(theirs)) return jeq(mine,base)?theirs:mine; const out={}, B=isO(base)?base:{};
 new Set([...Object.keys(mine),...Object.keys(theirs)]).forEach(k=>{const b=B[k], m=mine[k], t=theirs[k];
  if(jeq(m,b)){if(t!==undefined) out[k]=t;} else if(isO(m)&&isO(t)) out[k]=merge3(b,m,t); else if(m!==undefined) out[k]=m;}); return out;}
function sbDB(code){const HD={apikey:SB.key,"x-groupe":code,"Content-Type":"application/json"};
 const base=SB.url.replace(/\/$/,"")+"/rest/v1/biens", base0=base, subs=[]; let last=[];
 const chk=async r=>{if(!r.ok){let m=""; try{m=(await r.json()).message||"";}catch(_){} throw {code:"http_"+r.status,message:m};} return r;};
 async function load(){const r=await chk(await fetch(base+"?select=id,data,created_at&order=created_at.desc&limit=500",{headers:HD})); last=await r.json(); try{localStorage.setItem("biens-cache-"+code,JSON.stringify(last));}catch(_){}
  subs.forEach(s=>s.next({docs:last.map(x=>({id:x.id,data:()=>x.data}))}));}
 const tick=()=>load().catch(e=>{let c=null; try{c=JSON.parse(localStorage.getItem("biens-cache-"+code)||"null");}catch(_){} if(c&&!last.length){last=c; subs.forEach(s=>s.next({docs:last.map(x=>({id:x.id,data:()=>x.data}))})); toast("Hors ligne : liste commune affichée telle qu'au dernier chargement.");} else subs.forEach(s=>s.err&&s.err(e));});
 setInterval(()=>{if(!document.hidden) tick();},20000); document.addEventListener("visibilitychange",()=>{if(!document.hidden) tick();});
 const col={orderBy(){return col;},limit(){return col;},onSnapshot(next,err){subs.push({next,err}); tick(); return ()=>{};},
  add:async b=>{await chk(await fetch(base,{method:"POST",headers:Object.assign({},HD,{Prefer:"return=minimal"}),body:JSON.stringify({groupe:code,data:b})})); tick(); return {};},
  doc:id=>({delete:async()=>{await chk(await fetch(base+"?id=eq."+encodeURIComponent(id),{method:"DELETE",headers:HD})); tick();},
   update:async p=>{const cur=last.find(x=>x.id===id), b0=cur?cur.data:{}, mine=Object.assign({},b0,p); let theirs=b0;
    try{const r=await chk(await fetch(base0+"?select=data&id=eq."+encodeURIComponent(id),{headers:HD})); const j=await r.json(); if(j[0]&&j[0].data) theirs=j[0].data;}catch(_){}
    const data=merge3(b0,mine,theirs);
    await chk(await fetch(base+"?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:Object.assign({},HD,{Prefer:"return=minimal"}),body:JSON.stringify({data,updated_at:new Date().toISOString()})})); tick();}})};
 return {collection:()=>col,shared:true};}
(function initShare(){const box=document.getElementById("shareBox"); if(!box) return;
 const code=sbCode(), nom=myName(), inClaude=!!window.claude;
 box.querySelector("#sh-nom").value=nom; box.querySelector("#sh-code").value=code;
 box.querySelector("#sh-gen").addEventListener("click",()=>{const a=new Uint8Array(12); crypto.getRandomValues(a); box.querySelector("#sh-code").value=[...a].map(x=>"abcdefghjkmnpqrstuvwxyz23456789"[x%31]).join("").replace(/(.{4})(?!$)/g,"$1-");});
 box.querySelector("#sh-save").addEventListener("click",()=>{const c=box.querySelector("#sh-code").value.trim(), n=box.querySelector("#sh-nom").value.trim().slice(0,30);
  if(c&&c.length<12){box.querySelector("#sh-state").textContent="Le code doit faire au moins 12 caractères."; return;}
  try{localStorage.setItem("biens-code",c); localStorage.setItem("biens-nom",n);}catch(_){} location.reload();});
 box.querySelector("#sh-state").textContent=inClaude?"Dans Claude, la liste est celle de Claude. La liste commune à deux est sur la page GitHub (même code)."
  :!SB.url?"Liste commune pas encore configurée : en attendant, les biens restent dans ce navigateur."
  :code?"Liste commune active : vous voyez tous les deux les mêmes biens (mise à jour toutes les 20 secondes).":"Entrez le code commun (le même pour vous deux) pour partager la liste.";})();

