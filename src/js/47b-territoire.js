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
 return `${fRows([["Supérieur à 1,5 km",ns?`<b>${ns}</b> site${ns>1?"s":""} public${ns>1?"s":""}${eff?` · ~${eff.toLocaleString("fr-FR")} inscrits`:""}`:"aucun site public",r.sup&&r.sup[1]>0?`le plus proche : ${esc(r.sup[0])}, ${mTxtD(ds)}`:`le plus proche à ${mTxtD(ds)}`],pb<99999&&["BTS ou prépa",`lycée à ${mTxtD(pb)}`]])}
  <div class="poib"><span class="traj"><b>École</b> ${mTxtD(ec)}</span><span class="traj"><b>Collège</b> ${mTxtD(co)}</span><span class="traj"><b>Lycée</b> ${mTxtD(ly)}</span></div>${fNote("Depuis le centre du quartier, à vol d'oiseau. Les écoles comptent surtout à la revente.")}`;}
const ecolesSum=t=>{const r=terOf(t); if(!r||!r.e) return ""; return r.e[4]?`${r.e[4]} site${r.e[4]>1?"s":""} du supérieur à 1,5 km`:`supérieur à ${mTxtD(r.e[6])}`;};

/* urbanisme : zone du plan local d'urbanisme et quartiers prioritaires */
function qpvLine(r){if(!r||!r.q) return ["Quartier prioritaire","non"]; const {d,name}=r.q;
 if(d===0) return ["Quartier prioritaire",`<span class="pill p-warn">oui</span> « ${esc(name)} »`,"politique de la ville 2024 : rénovation urbaine fréquente, loyers plus bas, demande à vérifier"];
 if(d<400) return ["Quartier prioritaire",`en bordure de « ${esc(name)} »`,`à ${mTxtD(d)} du centre du quartier`];
 return ["Quartier prioritaire","non"];}
function urbaBlock(t){const r=terOf(t); if(!r) return ""; const u=r.u;
 return `${fRows([["Zone du PLU",u?`<b>${esc(u[0])}</b> · ${ZTYPE[u[1]]||u[1]}${zProjet(u)?` · <b>secteur de projet</b>`:""}`:"non trouvée",u?esc(u[2]):""],qpvLine(r)])}${fNote(`Au centre du quartier. Règlement et projets : <a href="https://www.geoportail-urbanisme.gouv.fr/" target="_blank" rel="noopener">Géoportail de l'urbanisme</a>.`)}`;}
const urbaSum=t=>{const r=terOf(t); if(!r) return ""; return r.q&&r.q.d===0?"quartier prioritaire":r.u?`zone ${r.u[0]}`:"";};

/* catastrophes naturelles reconnues (toute la commune) */
function catnatLine(ck){const c=catOf(ck); if(!c) return ""; const ty=Object.entries(c.ty).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${RISKSH[k]||k.toLowerCase()} ${n}`).join(" · ");
 return `${fRows([["Catastrophes naturelles",`<b>${c.n}</b> arrêtés depuis 1982 · ${c.n2000} depuis 2000`,ty],c.last[0]&&["Le dernier",dFr(c.last[0][0]),RISKSH[c.last[0][1]]||c.last[0][1]]])}${fNote("Arrêtés pris pour toute la commune : la rue n'a pas forcément été touchée.")}`;}
/* à l'adresse d'un bien : zone du PLU et parcelle (API Carto IGN) */
async function adrUrba(lat,lon){const g=encodeURIComponent(JSON.stringify({type:"Point",coordinates:[+(+lon).toFixed(6),+(+lat).toFixed(6)]})), out={};
 try{const j=await (await fetch(`https://apicarto.ign.fr/api/gpu/zone-urba?geom=${g}`)).json(); const f=(j.features||[])[0]; if(f){const p=f.properties; out.urba=[p.libelle,p.typezone,(p.libelong||"").replace(/\s+/g," ").slice(0,110)];}}catch(_){}
 try{const j=await (await fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom=${g}`)).json(); const f=(j.features||[])[0]; if(f){const p=f.properties; out.cad=[p.section,p.numero,p.contenance||null,p.code_insee||p.code_com||""];}}catch(_){}
 return out;}
const URBTRY=new Set();
function adrUrbaFill(b){if(!b||!b.id||!b.adresse||b.lat==null||URBTRY.has(b.id)) return; const g=b.geo||{}; if(g.urba||g.cad) return; URBTRY.add(b.id);
 adrUrba(b.lat,b.lon).then(o=>{if((o.urba||o.cad)&&typeof updBien==="function") updBien(b.id,{geo:Object.assign({},g,o)});}).catch(()=>{});}
function adrUrbaBlock(b){const g=b.geo||{}; if(!g.urba&&!g.cad) return "";
 return fRows([g.urba&&["Zone du PLU à l'adresse",`<b>${esc(g.urba[0])}</b> · ${ZTYPE[g.urba[1]]||g.urba[1]}${zProjet(g.urba)?" · <b>secteur de projet</b>":""}`,esc(g.urba[2])],g.cad&&["Parcelle cadastrale",`<b>${esc(g.cad[0])} ${esc(g.cad[1])}</b>`,`${g.cad[2]?(+g.cad[2]).toLocaleString("fr-FR")+" m², tout l'immeuble · ":""}à citer pour les documents d'urbanisme`]]);}

/* habitants (Insee : recensement 2022 par quartier IRIS, revenus Filosofi 2021) */
const hasHAB=ck=>typeof HABQ!=="undefined"&&!!HABQ&&!!HABQ.q[ck];
function habOf(t){if(!t||!hasHAB(t.ck)) return null; const h=HABQ.q[t.ck][t.code]; if(!h||h[0]<150) return null; const [pop,a,s,y,med,tp]=h; return {pop,p1824:a/pop*100,scol:s/pop*100,p2539:y/pop*100,med,tp};}
const habCity=ck=>{const c=hasHAB(ck)&&HABQ.city[ck]; return c?{pop:c[0],p1824:c[1],scol:c[2],p2539:c[3],med:c[4],tp:c[5]}:null;};
const pp=v=>fr(v,0)+" %";
function habBlock(t){const h=habOf(t), c=habCity(t.ck); if(!h) return "";
 return `${fRows([["Habitants",h.pop.toLocaleString("fr-FR")],["Étudiants",`<b>${pp(h.scol)}</b> des habitants`,`18-24 ans encore en études · ville : ${pp(c.scol)}`],["25-39 ans",pp(h.p2539),`jeunes actifs · ville : ${pp(c.p2539)}`],h.med&&["Revenu médian",`${eur(h.med)} par an`,`par unité de consommation · ville : environ ${eur(c.med)}`],h.tp!=null&&["Taux de pauvreté",`${pp(h.tp)}`,`ville : ${pp(c.tp)}`]])}${fNote("Insee : recensement 2022, revenus 2021. Les petits quartiers n'ont pas tous leurs revenus publiés.")}`;}
const habSum=t=>{const h=habOf(t); return h?`${pp(h.scol)} d'étudiants`:"";};
function habAttn(t){const h=habOf(t), c=h&&habCity(t.ck); if(!h) return [];
 return [h.tp!=null&&h.tp>=35&&["warn",`Taux de pauvreté élevé (${pp(h.tp)}, ville ${pp(c.tp)}) : risque d'impayés et revente plus lente.`],h.scol>=c.scol*1.5&&h.scol>=10&&["ok",`Beaucoup d'étudiants : ${pp(h.scol)} des habitants (ville ${pp(c.scol)}).`]];}
