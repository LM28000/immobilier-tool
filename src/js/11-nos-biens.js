/* ---------- nos biens (liste partagée) ---------- */
let BIENS=[], DB=null, USER=null;
function calcBien(b){const c=C.find(v=>v.k===b.ville), S=+b.surface||22; let rr=1, vac=H.vacance, t=null;
 if(b.quartier&&IR[b.ville]){t=IR[b.ville].list.find(v=>v.name===b.quartier); if(t&&t.price) rr=rentRatio(b.ville,t); if(t&&H.vacQ){const d=demandOf(t); if(d) vac=d.vac;}}
 const o=Object.assign({},c,{prixTot:+b.prix,surf:S,vac});
 if(+b.loyer>0){o.rent=+b.loyer; o.rentM2=S;} else o.rent=c.rent*rr;
 if(+b.copro>0) o.copro=+b.copro; if(+b.tf>0) o.tfM=+b.tf/12;
 return {x:calc(o),vac,t,pm2:+b.prix/S};}
function renderBiens(){const box=document.getElementById("biensList"), st=document.getElementById("biensState");
 if(!DB){return;}
 if(!BIENS.length){box.innerHTML=`<p class="sub">Aucun bien pour l'instant. Ajoutez une annonce de vente repérée : le calcul reprend vos réglages et le loyer du quartier.</p>`; return;}
 const rows=BIENS.map(b=>({b,r:calcBien(b)})).sort((a,b)=>(b.r.x.irr??-99)-(a.r.x.irr??-99));
 box.innerHTML=`<div class="tablewrap"><table><thead><tr><th>Bien</th><th class="r">Prix</th><th class="r">€/m²</th><th class="r">Loyer HC</th><th class="r">Cash-flow</th><th class="r">15 ans</th><th>Banque</th><th>DPE</th><th></th></tr></thead><tbody>${rows.map(({b,r})=>{const [bc,bt]=bank(r.x.ratio), qp=r.t&&r.t.price, dif=qp?(r.pm2/(qp*(1+0))-1)*100:null, bad=/[FG]/.test(b.dpe||"");
  return `<tr data-id="${esc(b.id)}" class="${b.statut==="écarté"?"off":""}"><td><button type="button" class="star${b.fav?" on":""}" data-fav="${b.id}" aria-label="Favori">${b.fav?"★":"☆"}</button> <b>${esc(b.titre||"Bien sans nom")}</b>${b.url?` · <a href="${esc(b.url)}" target="_blank" rel="noopener">annonce</a>`:""}<div class="sub" style="margin:0">${C.find(v=>v.k===b.ville).name}${b.quartier?" · "+esc(b.quartier):""} · ${b.surface} m²${b.par?" · par "+esc(b.par):""}${b.notes?" · "+esc(b.notes):""}</div>${stPill(b)}</td>
   <td class="r mono">${eur(+b.prix)}</td><td class="r mono">${eur(r.pm2)}${dif!=null?`<div class="sub" style="margin:0">${dif>=0?"+":"−"}${fr(Math.abs(dif),0)} % vs quartier</div>`:""}</td><td class="r mono">${eur(r.x.rentHC)}${+b.loyer>0?"":"<sup>*</sup>"}</td>
   <td class="r mono ${r.x.cf>=0?"pos":"neg"}">${sgn(r.x.cf)}</td><td class="r mono" style="color:${colIrr(r.x.irr)};font-weight:700">${r.x.irr==null?"n.d.":pct(r.x.irr)}</td><td><span class="pill ${bc}">${bt}</span></td>
   <td>${b.dpe?`<span class="pill ${bad?"p-bad":"p-n"}">${b.dpe}${bad?" · interdit bientôt":""}</span>`:"—"}</td>
   <td style="white-space:nowrap">${cmpBtn({kind:"b",id:b.id})} <button type="button" class="lnk" data-del="${b.id}">supprimer</button></td></tr>`;}).join("")}</tbody></table></div>
  <p class="sub"><sup>*</sup> loyer estimé (médiane du quartier ou de la ville). Les prix d'annonce incluent en général les frais d'agence ; le notaire, les meubles et les petits travaux sont ajoutés comme pour la ville.</p>`;
 box.querySelectorAll("[data-del]").forEach(btn=>btn.addEventListener("click",async()=>{const old=BIENS.find(x=>x.id===btn.dataset.del); if(!old) return; const {id,by,...keep}=old;
  try{await DB.collection("biens").doc(btn.dataset.del).delete(); toast(`« ${old.titre||"Bien"} » supprimé.`,{label:"Annuler",fn:async()=>{try{await DB.collection("biens").add(keep); toast("Bien restauré.");}catch(_){toast("Restauration impossible.");}}});}catch(e){st.textContent="Suppression refusée : il faut un accès en modification à la page.";}}));}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function fillQuartiers(){const v=document.getElementById("b-ville").value, sel=document.getElementById("b-quartier");
 sel.innerHTML=`<option value="">${IR[v]?"— quartier (facultatif) —":"pas de découpage pour cette ville"}</option>`+(IR[v]?IR[v].list.filter(t=>t.type==="H").map(t=>t.name).sort((a,b)=>a.localeCompare(b,"fr")).map(n=>`<option>${esc(n)}</option>`).join(""):"");
 sel.disabled=!IR[v];}
function localDB(){const K="biens-local"; let mem=[]; const load=()=>{try{return JSON.parse(localStorage.getItem(K)||"[]");}catch(_){return mem;}};
 const subs=[]; const emit=()=>{const l=load().slice().sort((a,b)=>(b.ts||0)-(a.ts||0)); subs.forEach(f=>f({docs:l.map(x=>({id:x.id,data:()=>x}))}));};
 const save=l=>{mem=l; try{localStorage.setItem(K,JSON.stringify(l));}catch(_){} emit();};
 const col={orderBy(){return col;},limit(){return col;},onSnapshot(f){subs.push(f); setTimeout(emit,0); return ()=>{};},
  add:async b=>{const id=b.id||("l"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)); save(load().filter(x=>x.id!==id).concat([Object.assign({},b,{id})])); return {id};},
  doc:id=>({delete:async()=>save(load().filter(x=>x.id!==id)),update:async p=>save(load().map(x=>x.id===id?Object.assign({},x,p):x)),set:async b=>save(load().filter(x=>x.id!==id).concat([Object.assign({},b,{id})]))})};
 return {collection:()=>col,local:true};}
const bienKey=b=>[b.ville,b.prix,b.surface,(b.titre||"").toLowerCase().trim(),b.url||""].join("|");
(function initXfer(){const st=document.getElementById("xferState");
 document.getElementById("bCopy").addEventListener("click",()=>{const txt=JSON.stringify({outil:"studio",biens:BIENS.map(({id,by,...b})=>b)});
  const ta=document.getElementById("bPaste");
  const fallback=()=>{ta.value=txt; ta.focus(); ta.select(); st.textContent="Le texte est sélectionné : copiez-le (Ctrl+C ou Cmd+C).";};
  try{navigator.clipboard.writeText(txt).then(()=>{st.textContent=`${BIENS.length} bien${BIENS.length>1?"s":""} copié${BIENS.length>1?"s":""} : collez le texte dans un message.`;},fallback);}catch(_){fallback();}});
 document.getElementById("bImport").addEventListener("click",async()=>{if(!DB){st.textContent="La liste n'est pas encore prête.";return;}
  let data; try{data=JSON.parse(document.getElementById("bPaste").value.trim());}catch(_){st.textContent="Texte non reconnu : collez exactement ce que « Copier la liste » a produit."; return;}
  const list=Array.isArray(data)?data:data&&data.biens; if(!Array.isArray(list)){st.textContent="Texte non reconnu."; return;}
  const have=new Set(BIENS.map(bienKey)); let n=0;
  for(const r of list.slice(0,200)){const b={titre:String(r.titre||"").slice(0,120),url:/^https?:\/\//.test(r.url||"")?String(r.url).slice(0,500):"",ville:C.find(c=>c.k===r.ville)?r.ville:"lemans",quartier:String(r.quartier||"").slice(0,80),
   prix:+r.prix||0,surface:+r.surface||0,copro:+r.copro||0,tf:+r.tf||0,loyer:+r.loyer||0,dpe:/^[A-G]$/.test(r.dpe||"")?r.dpe:"",notes:String(r.notes||"").slice(0,200),ts:+r.ts||Date.now()};
   if(!(b.prix>5000)||!(b.surface>=8)||have.has(bienKey(b))) continue;
   try{await DB.collection("biens").add(b); have.add(bienKey(b)); n++;}catch(err){st.textContent="Import interrompu : "+(err&&err.code||"erreur")+"."; return;}}
  document.getElementById("bPaste").value=""; st.textContent=n?`${n} bien${n>1?"s":""} ajouté${n>1?"s":""}.`:"Rien de nouveau à ajouter.";});})();
(function initBiens(){
 const vs=document.getElementById("b-ville"); vs.innerHTML=C.map(c=>`<option value="${c.k}">${c.name}</option>`).join(""); vs.value="lemans"; fillQuartiers(); vs.addEventListener("change",fillQuartiers);
 const st=document.getElementById("biensState"), form=document.getElementById("biensForm");
 st.textContent="Connexion à la liste partagée…";
 const timer=setTimeout(()=>{if(!DB){DB=localDB(); hook(DB);}},10000);
 (window.claude?window.claude.use("db"):Promise.resolve(null)).then(async db=>{
  if(!db){db=(SB.url&&sbCode())?sbDB(sbCode()):localDB();}
  DB=db; try{USER=await window.claude.use("user");}catch(_){}
  hook(db);
 }).catch(()=>{clearTimeout(timer); if(!DB){DB=localDB(); hook(DB);}});
 function hook(db){
  db.collection("biens").orderBy("ts","desc").limit(200).onSnapshot(snap=>{clearTimeout(timer); BIENS=snap.docs.map(d=>Object.assign({id:d.id},d.data())); st.textContent=db.local?`${BIENS.length} bien${BIENS.length>1?"s":""}, gardé${BIENS.length>1?"s":""} dans ce navigateur (version hors Claude : échangez la liste avec le bloc ci-dessous)`:db.shared?`${BIENS.length} bien${BIENS.length>1?"s":""} dans la liste commune`:`${BIENS.length} bien${BIENS.length>1?"s":""} dans la liste partagée`; renderBiens(); renderCompare(); renderShort(); if(typeof draw==="function"&&draw.rows) draw();},
   e=>{clearTimeout(timer); st.textContent="Lecture de la liste impossible ("+(e&&e.code||"erreur")+").";});
 }
 form.addEventListener("submit",async e=>{e.preventDefault(); if(!DB) return; const f=new FormData(form), g=k=>(f.get(k)||"").toString().trim();
  const b={titre:g("titre").slice(0,120),url:/^https?:\/\//.test(g("url"))?g("url").slice(0,500):"",ville:g("ville"),quartier:g("quartier"),prix:+g("prix"),surface:+g("surface"),copro:+g("copro")||0,tf:+g("tf")||0,loyer:+g("loyer")||0,dpe:g("dpe"),notes:g("notes").slice(0,200),statut:"à voir",fav:false,par:myName(),ts:Date.now()};
  if(!(b.prix>5000)||!(b.surface>=8)){st.textContent="Indiquez au moins le prix et la surface."; return;}
  try{if(USER&&USER.id){try{b.by=await USER.id();}catch(_){}} await DB.collection("biens").add(b); form.reset(); document.getElementById("b-ville").value=b.ville; fillQuartiers(); st.textContent="Bien ajouté.";}
  catch(err){st.textContent=err&&err.code==="permission_denied"?"Ajout refusé : il faut un accès en modification à la page.":"Ajout impossible ("+(err&&err.code||"erreur")+").";}});
})();

