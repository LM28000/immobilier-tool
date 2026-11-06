/* ---------- écoles et campus, urbanisme (PLU, quartiers prioritaires), catastrophes naturelles ----------
   Données préparées une fois (Éducation nationale, Enseignement supérieur, Géoportail de l'urbanisme, ANCT, Géorisques).
   À l'adresse d'un bien : zone du PLU et parcelle cadastrale demandées en direct (API Carto de l'IGN). */
const hasTER=()=>typeof TERQ!=="undefined"&&!!TERQ;
const mTxtD=m=>m==null||m>=99999?"—":m<1000?Math.round(m/10)*10+" m":fr(m/1000,1)+" km";
function terOf(t){if(!hasTER()||!t) return null; const E=TERQ.ecoles.q[t.ck], U=TERQ.urba[t.ck], Q=TERQ.qpv[t.ck];
 const e=E&&E[t.code]||null, ui=U&&U.q[t.code], u=ui!=null&&ui>=0?U.z[ui]:null, q=Q&&Q.q[t.code]||null;
 if(!e&&!u&&!q) return null;
 return {e,sup:e&&e[7]>=0?TERQ.ecoles.sup[t.ck][e[7]]:null,u,q:q?{d:q[0],name:Q.names[q[1]]}:null};}
const ZTYPE={U:"zone urbaine",AUc:"zone à urbaniser",AUs:"zone à urbaniser (fermée)",N:"zone naturelle",A:"zone agricole"};
const zProjet=u=>u&&/projet|renouvellement|recomposition|ZAC/i.test(u[2]+" "+u[0]);
function catOf(ck){return hasTER()&&TERQ.catnat[ck]||null;}
const RISKSH={"Inondations et/ou Coulées de Boue":"inondation ou coulée de boue","Sécheresse":"sécheresse (argile)","Mouvement de Terrain":"mouvement de terrain","Chocs Mécaniques liés à l'action des Vagues":"submersion par les vagues"};
const dFr=s=>{const [y,m,d]=s.split("-"); return `${+d} ${["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."][+m-1]} ${y}`;};

/* écoles et campus */
function ecolesBlock(t){const r=terOf(t); if(!r||!r.e) return ""; const [ec,co,ly,pb,ns,eff,ds]=r.e;
 const sup=ns?`<b>${ns} site${ns>1?"s":""} d'enseignement supérieur public</b> à moins de 1,5 km${eff?`, environ ${eff.toLocaleString("fr-FR")} étudiants inscrits`:""}.`:`Aucun site d'enseignement supérieur public à moins de 1,5 km.`;
 return `<p class="sub" style="margin:0 0 6px">${sup}${r.sup&&r.sup[1]>0?` Le plus proche : ${esc(r.sup[0])}, à ${mTxtD(ds)} à vol d'oiseau.`:""}${pb<99999?` Lycée avec BTS ou prépa à ${mTxtD(pb)}.`:""}</p>
  <div class="poib"><span class="traj"><b>École</b> ${mTxtD(ec)}</span><span class="traj"><b>Collège</b> ${mTxtD(co)}</span><span class="traj"><b>Lycée</b> ${mTxtD(ly)}</span></div>
  <p class="sub" style="margin:6px 0 0">Distances depuis le centre du quartier. Pour un studio, ce sont les campus et les BTS qui comptent ; les écoles jouent surtout à la revente.</p>`;}
const ecolesSum=t=>{const r=terOf(t); if(!r||!r.e) return ""; return r.e[4]?`${r.e[4]} site${r.e[4]>1?"s":""} du supérieur à 1,5 km`:`supérieur à ${mTxtD(r.e[6])}`;};

/* urbanisme : zone du plan local d'urbanisme et quartiers prioritaires */
function qpvLine(r){if(!r||!r.q) return ""; const {d,name}=r.q;
 if(d===0) return `<p class="sub" style="margin:6px 0 0"><span class="pill p-warn">Quartier prioritaire</span> Le centre du quartier est dans le quartier prioritaire « ${esc(name)} » (politique de la ville, 2024). Souvent des programmes de rénovation urbaine ; loyers plus bas et demande étudiante à vérifier sur place.</p>`;
 if(d<400) return `<p class="sub" style="margin:6px 0 0">En bordure du quartier prioritaire « ${esc(name)} » (à ${mTxtD(d)}).</p>`;
 return "";}
function urbaBlock(t){const r=terOf(t); if(!r) return ""; const u=r.u;
 const z=u?`<p class="sub" style="margin:0">Zone du PLU au centre du quartier : <b>${esc(u[0])}</b> (${ZTYPE[u[1]]||u[1]}) · ${esc(u[2])}${zProjet(u)?". <b>Secteur de projet</b> : chantiers et transformations prévus":""}.</p>`:`<p class="sub" style="margin:0">Zone du PLU non trouvée au centre du quartier.</p>`;
 return `${z}${qpvLine(r)}<p class="sub" style="margin:6px 0 0">Le règlement complet et les projets se consultent sur le <a href="https://www.geoportail-urbanisme.gouv.fr/" target="_blank" rel="noopener">Géoportail de l'urbanisme</a>. Pour un bien, ajoutez son adresse : la zone et la parcelle s'affichent à l'adresse.</p>`;}
const urbaSum=t=>{const r=terOf(t); if(!r) return ""; return r.q&&r.q.d===0?"quartier prioritaire":r.u?`zone ${r.u[0]}`:"";};

/* catastrophes naturelles reconnues (toute la commune) */
function catnatLine(ck){const c=catOf(ck); if(!c) return ""; const ty=Object.entries(c.ty).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${RISKSH[k]||k.toLowerCase()} ${n}`).join(", ");
 return `<p class="sub" style="margin:6px 0 0">Catastrophes naturelles reconnues dans la commune : <b>${c.n}</b> arrêtés depuis 1982, dont ${c.n2000} depuis 2000 (${ty}).${c.last[0]?` Le dernier : ${dFr(c.last[0][0])}, ${RISKSH[c.last[0][1]]||c.last[0][1]}.`:""} Ces arrêtés couvrent toute la ville : ils ne disent pas que la rue a été touchée.</p>`;}

/* à l'adresse d'un bien : zone du PLU et parcelle (API Carto IGN) */
async function adrUrba(lat,lon){const g=encodeURIComponent(JSON.stringify({type:"Point",coordinates:[+(+lon).toFixed(6),+(+lat).toFixed(6)]})), out={};
 try{const j=await (await fetch(`https://apicarto.ign.fr/api/gpu/zone-urba?geom=${g}`)).json(); const f=(j.features||[])[0]; if(f){const p=f.properties; out.urba=[p.libelle,p.typezone,(p.libelong||"").replace(/\s+/g," ").slice(0,110)];}}catch(_){}
 try{const j=await (await fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom=${g}`)).json(); const f=(j.features||[])[0]; if(f){const p=f.properties; out.cad=[p.section,p.numero,p.contenance||null,p.code_insee||p.code_com||""];}}catch(_){}
 return out;}
const URBTRY=new Set();
function adrUrbaFill(b){if(!b||!b.id||!b.adresse||b.lat==null||URBTRY.has(b.id)) return; const g=b.geo||{}; if(g.urba||g.cad) return; URBTRY.add(b.id);
 adrUrba(b.lat,b.lon).then(o=>{if((o.urba||o.cad)&&typeof updBien==="function") updBien(b.id,{geo:Object.assign({},g,o)});}).catch(()=>{});}
function adrUrbaBlock(b){const g=b.geo||{}; if(!g.urba&&!g.cad) return "";
 return `<p class="sub" style="margin:0 0 6px">À l'adresse : ${g.urba?`zone <b>${esc(g.urba[0])}</b> du PLU (${ZTYPE[g.urba[1]]||g.urba[1]}) · ${esc(g.urba[2])}${zProjet(g.urba)?". <b>Secteur de projet</b>":""}.`:""}${g.cad?` Parcelle cadastrale <b>${esc(g.cad[0])} ${esc(g.cad[1])}</b>${g.cad[2]?` (${(+g.cad[2]).toLocaleString("fr-FR")} m², tout l'immeuble)`:""} : utile pour demander les documents d'urbanisme à la mairie.`:""}</p>`;}
