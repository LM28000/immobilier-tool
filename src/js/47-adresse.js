/* ---------- adresse exacte d'un bien : recherche (Base Adresse Nationale), quartier, trajets à pied et risques à l'adresse ---------- */
const ADRAPI=["https://data.geopf.fr/geocodage/search","https://api-adresse.data.gouv.fr/search/"];
const ADRRES=new Map(); let ADRFORM=null, ADRT=null;
function adrWidget(id,val){return `<div class="adrw" data-adrw="${id||""}"><input type="search" class="adrin" placeholder="Numéro et rue, ville (ex. 12 rue Nationale Le Mans)" autocomplete="off" enterkeyhint="search" value="${esc(val||"")}" aria-label="Adresse du bien"><div class="adrlist" role="listbox" hidden></div><small class="adrst"></small></div>`;}
async function adrSearch(q){for(const u of ADRAPI){try{const r=await fetch(`${u}?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`); if(!r.ok) continue; const j=await r.json(); return (j.features||[]).map(f=>({label:f.properties.label,city:f.properties.city,cp:f.properties.postcode,type:f.properties.type,lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]}));}catch(_){}} throw new Error("indisponible");}
/* point dans un quartier */
function inRing(p,r){let c=false; for(let i=0,j=r.length-1;i<r.length;j=i++){const [yi,xi]=r[i],[yj,xj]=r[j]; if(((yi>p[0])!==(yj>p[0]))&&(p[1]<(xj-xi)*(p[0]-yi)/(yj-yi)+xi)) c=!c;} return c;}
function adrPlace(lat,lon){let best=null,bd=1e9; C.forEach(c=>{const d=hav(lat,lon,c.lat,c.lon); if(d<bd){bd=d; best=c;}}); if(!best||bd>15) return {c:null};
 let t=null; if(IR[best.k]){const ll=irisLL(best.k); t=IR[best.k].list.find(q=>ll[q.i].some(r=>inRing([lat,lon],r)))||null;} return {c:best,t};}
/* trajets à pied (OSRM) et risques (Géorisques) à l'adresse */
async function adrExtras(lat,lon,ck){const out={}; const M=MARK[ck];
 if(M){try{const pts=[[lon,lat],...Object.values(M).map(p=>[p[1],p[0]])].map(p=>p.join(",")).join(";");
  const j=await (await fetch(`https://routing.openstreetmap.de/routed-foot/table/v1/foot/${pts}?sources=0&annotations=duration,distance`)).json();
  if(j.durations){out.marks=Object.keys(M); out.foot=j.durations[0].slice(1).map(s=>Math.round(s/60)); out.km=j.distances[0].slice(1).map(m=>Math.round(m/10)/100);}}catch(_){}}
 const G="https://www.georisques.gouv.fr/api/v1/", ll=`latlon=${lon},${lat}`;
 try{const a=await (await fetch(`${G}rga?${ll}`)).text(); const t=await (await fetch(`${G}tri_zonage?${ll}`)).json(); const s=await (await fetch(`${G}ssp?${ll}&rayon=300`)).json();
  let aj={}; try{aj=a.trim()?JSON.parse(a):{};}catch(_){}
  out.risq={a:+aj.codeExposition||0,t:(t.results||0)>0?1:0,s:(s.conclusions_sis&&s.conclusions_sis.results||0)+(s.instructions&&s.instructions.results||0),c:s.casias&&s.casias.results||0};}catch(_){}
 return out;}
async function adrPick(w,f){const st=w.querySelector(".adrst"), inp=w.querySelector(".adrin"); inp.value=f.label; w.querySelector(".adrlist").hidden=true;
 const {c,t}=adrPlace(f.lat,f.lon); if(!c){st.textContent="Adresse hors des villes suivies."; return;}
 st.textContent=`${c.name}${t?" · quartier "+t.name:""} · calcul des trajets et des risques…`;
 const geo=Object.assign(await adrExtras(f.lat,f.lon,c.k),typeof adrUrba==="function"?await adrUrba(f.lat,f.lon).catch(()=>({})):{}); const patch={adresse:f.label,lat:+f.lat.toFixed(6),lon:+f.lon.toFixed(6),ville:c.k,quartier:t?t.name:"",geo};
 const ok=geo.foot?`${minTxt(Math.min(...geo.foot))} à pied de ${MKFULL[geo.marks[geo.foot.indexOf(Math.min(...geo.foot))]]}`:"";
 st.textContent=`${c.name}${t?" · quartier "+t.name:""}${ok?" · "+ok:""}`;
 const id=w.dataset.adrw;
 if(id){await updBien(id,patch); toast("Adresse enregistrée : quartier, trajets et risques mis à jour.");}
 else {ADRFORM=patch; const vs=document.getElementById("b-ville"); vs.value=c.k; fillQuartiers(); if(t){const qs=document.getElementById("b-quartier"); if(![...qs.options].some(o=>o.value===t.name)) qs.insertAdjacentHTML("beforeend",`<option>${esc(t.name)}</option>`); qs.value=t.name;}}}
document.addEventListener("input",e=>{const inp=e.target.closest&&e.target.closest(".adrin"); if(!inp) return; const w=inp.closest(".adrw"), q=inp.value.trim(), list=w.querySelector(".adrlist"), st=w.querySelector(".adrst");
 if(!w.dataset.adrw) ADRFORM=null; clearTimeout(ADRT); if(q.length<4){list.hidden=true; return;}
 ADRT=setTimeout(async()=>{try{const L=await adrSearch(q); list.innerHTML=L.map((f,i)=>{const k=Math.random().toString(36).slice(2); ADRRES.set(k,f); return `<button type="button" role="option" data-adrpick="${k}"><b>${esc(f.label)}</b></button>`;}).join("")||`<span class="sub" style="padding:8px">Aucune adresse trouvée.</span>`; list.hidden=false; st.textContent="";}
  catch(_){list.hidden=true; st.textContent="Recherche d'adresse indisponible ici (elle marche sur la page GitHub). Choisissez la ville et le quartier à la main.";}},250);});
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-adrpick]"); if(b){e.preventDefault(); const f=ADRRES.get(b.dataset.adrpick); if(f) adrPick(b.closest(".adrw"),f); return;}
 const ed=e.target.closest&&e.target.closest("[data-adredit]"); if(ed){e.preventDefault(); const box=ed.closest(".adrbox"); box.innerHTML=adrWidget(ed.dataset.adredit,""); box.querySelector(".adrin").focus();}});
/* le formulaire d'ajout reprend l'adresse choisie */
(function(){const form=document.getElementById("biensForm"); if(!form) return; const first=form.querySelector("label.f"); if(first) first.insertAdjacentHTML("beforebegin",`<div class="f wide adrf"><span>Adresse (facultatif : place le bien exactement, avec trajets et risques à l'adresse)</span>${adrWidget("","")}</div>`);
 form.addEventListener("submit",()=>{if(ADRFORM) form.dataset.adr=JSON.stringify(ADRFORM);},true);
 form.addEventListener("reset",()=>{ADRFORM=null; setTimeout(()=>{const w=form.querySelector(".adrw .adrst"); if(w) w.textContent="";},0);});})();
/* bloc « À cette adresse » dans les fiches */
function adrBlock(b){if(!b.adresse) return `<div class="adrbox"><button type="button" class="lnk" data-adredit="${b.id}">📍 Ajouter l'adresse exacte</button></div>`;
 const g=b.geo||{}, R=g.risq;
 return `<div class="adrbox"><p class="sub" style="margin:0 0 4px">📍 <b>${esc(b.adresse)}</b> <button type="button" class="lnk" data-adredit="${b.id}">modifier</button></p>
  ${g.foot?`<div class="trajb">${g.marks.map((k,i)=>`<span class="traj"><b>${MARKTXT[k]}</b> ${minTxt(g.foot[i])} à pied (${fr(g.km[i],1)} km)</span>`).join("")}</div>`:""}
  ${R?`<div class="risqb" style="margin-top:6px">${risqPillsR(R)}</div><p class="sub" style="margin:4px 0 0">Trajets et risques calculés à l'adresse (OpenStreetMap, Géorisques). Vérifiez l'état des risques du vendeur.</p>`:""}</div>`;}
