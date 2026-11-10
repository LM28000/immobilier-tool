/* ---------- résidences étudiantes et logements neufs autour d'un bien : la concurrence pour un studio ----------
   data/conc/<ville>.js (tools/concurrence.py), chargé à la demande, ville par ville, comme le registre des copropriétés.
   res : [lon, lat, nom, logements, source (crous, pc, osm), état (2 autorisé, 5 commencé, 6 terminé, 0 en service), année]
   pc : [lon, lat, autorisé, état, commencé, terminé, logements, studios, T2, en résidence, type de résidence, sociaux, demandeur, adresse]
   Autour d'un point : résidences étudiantes à 1 km au plus ; logements des permis (5 logements collectifs et plus) à 500 m au plus,
   autorisés depuis le 1er janvier d'il y a trois ans (CN_DEPUIS). Sources : Crous, Sitadel (SDES), OpenStreetMap. */
const CNQ=(typeof window!=="undefined"?(window.CONCQ=window.CONCQ||{}):{}), CNL={};
const CN_RES=1000, CN_PC=500, CN_AN=new Date().getFullYear()-3, CN_DEPUIS=CN_AN+"-01";
/* résidences pour un autre public (personnes âgées, tourisme, hôtelière à vocation sociale, sociale, personnes handicapées) : pas de concurrence pour un studio, hors des totaux */
const CN_HORS=new Set([1,3,4,5,6]);
const CNET={2:"autorisé",5:"en chantier",6:"terminé"}, CNTY={1:"résidence pour personnes âgées",2:"résidence étudiante",3:"résidence de tourisme",4:"résidence hôtelière à vocation sociale",5:"résidence sociale",6:"résidence pour personnes handicapées",7:"résidence",8:"résidence"};
function concData(ck){if(!ck) return null; if(CNQ[ck]) return CNQ[ck]; if(typeof CONCV==="undefined"||!CONCV) return null; if(CNL[ck]===2) return null;
 if(!CNL[ck]){CNL[ck]=1; const sc=document.createElement("script"); sc.src=(/\/dist\//.test(location.pathname)?"../":"")+"data/conc/"+encodeURIComponent(ck)+".js?v="+CONCV;
  sc.onload=()=>{if(!CNQ[ck]) CNL[ck]=2; concFill(ck);}; sc.onerror=()=>{CNL[ck]=2; setTimeout(()=>{delete CNL[ck];},60000); concFill(ck);}; document.head.appendChild(sc);}
 return undefined;}
/* ce qu'il y a autour d'un point : résidences par distance, permis récents par taille, totaux par état */
function concAround(J,lat,lon,depuis){const d0=depuis||CN_DEPUIS;
 const R=J.res.map(x=>[hav(lat,lon,x[1],x[0])*1000,x]).filter(z=>z[0]<=CN_RES).sort((a,b)=>a[0]-b[0]);
 const A=J.pc.filter(x=>x[2]>=d0).map(x=>[hav(lat,lon,x[1],x[0])*1000,x]).filter(z=>z[0]<=CN_PC).sort((a,b)=>b[1][6]-a[1][6]||a[0]-b[0]), P=A.filter(z=>!CN_HORS.has(z[1][10]));
 const s={n:0,st:0,e:{},hors:A.filter(z=>CN_HORS.has(z[1][10])).reduce((a,z)=>a+z[1][6],0)}; P.forEach(([,x])=>{s.n+=x[6]; s.st+=x[7]; const e=s.e[x[3]]||(s.e[x[3]]=[0,0]); e[0]+=x[6]; e[1]+=x[7];});
 return {R,P,s};}
/* le point d'un bien : adresse saisie, sinon position de l'annonce (300 m près au plus), sinon centre du quartier */
function concPoint(b,t){if(b&&b.id&&b.adresse&&b.lat!=null&&b.lon!=null) return {lat:+b.lat,lon:+b.lon,how:"autour de l'adresse saisie"};
 const s=b?(b.kind==="v"?b.suf:(typeof bienSuf==="function"?bienSuf(b):null)):null, fx=s?ficx(s):null;
 if(fx&&fx.la!=null&&fx.lo!=null&&(fx.r==null||fx.r<=300)) return {lat:fx.la,lon:fx.lo,how:fx.r?`autour de la position de l'annonce (à ${fx.r} m près)`:"autour de l'adresse de l'annonce"};
 if(t&&isFinite(t.cx)&&isFinite(t.cy)&&typeof unproj==="function"){const [la,lo]=unproj(t.cx,t.cy); if(isFinite(la)&&isFinite(lo)) return {lat:la,lon:lo,how:"autour du centre du quartier"};}
 return null;}
const nfC=v=>Math.round(v).toLocaleString("fr-FR");
const cnMois=s=>{if(!s) return ""; const [y,m]=s.split("-"); return `${MOISC[+m-1]} ${y}`;};
const cnM=d=>d<950?`${Math.round(d/10)*10} m`:`${fr(d/1000,1)} km`;
function cnResTxt(x,d){const src=x[4]==="crous"?"Crous":x[4]==="osm"?"résidence privée":"";
 const et=x[4]!=="pc"?"":x[5]===6?`terminée${x[6]?" en "+x[6]:""}`:x[5]===5?`<b>en chantier</b>${x[6]?" depuis "+x[6]:""}`:`<b>autorisée</b>, pas encore commencée`;
 return `<li><b>${esc(x[2])}</b> · ${cnM(d)} · ${x[3]?`${nfC(x[3])} logements`:"taille non publiée"}${src?" · "+src:""}${et?" · "+et:""}</li>`;}
function cnPcTxt(x,d){const ty=x[10]?CNTY[x[10]]:"";
 return `<li><b>${nfC(x[6])} logements</b>${x[7]?` dont ${nfC(x[7])} studio${x[7]>1?"s":""}`:""}${ty?" · "+ty:""} · ${CNET[x[3]]||""} ${x[3]===2?"en "+cnMois(x[2]):x[3]===5?"(commencé"+(x[4]?" en "+cnMois(x[4]):"")+")":x[5]?"en "+cnMois(x[5]):""} · ${cnM(d)}${x[13]?" · "+esc(x[13]):""}${x[12]?` <span class="v2sub">(${esc(x[12])})</span>`:""}</li>`;}
/* rubrique « Résidences et chantiers » : [résumé, html] ; b : bien ou annonce (ou null pour un quartier), t : quartier, ck : ville */
function concSec(b,t,ck){ck=ck||(b&&b.ville)||(t&&t.ck); const J=concData(ck); if(J===null) return null;
 if(J===undefined) return ["chargement…",`<p class="sub" style="margin:0" data-cnw="${esc(ck)}">Recherche des résidences étudiantes et des chantiers autour…</p>`];
 const pt=concPoint(b,t); if(!pt) return null; const {R,P,s}=concAround(J,pt.lat,pt.lon);
 const nC=R.filter(z=>z[1][4]==="crous").length, res=R.length?`<ul class="cnl">${R.slice(0,6).map(([d,x])=>cnResTxt(x,d)).join("")}</ul>${R.length>6?`<p class="sub" style="margin:0">et ${R.length-6} autre${R.length-6>1?"s":""}.</p>`:""}`:`<p style="margin:0">Aucune résidence étudiante connue à moins de 1 km.</p>`;
 const e=k=>s.e[k]||[0,0], parts=[[2,"autorisés, pas encore commencés"],[5,"en chantier"],[6,"terminés"]].filter(([k])=>e(k)[0]).map(([k,l])=>`${nfC(e(k)[0])} ${l}`).join(" · ");
 const pc=P.length?`<p style="margin:0"><b>${nfC(s.n)} logements</b> dans ${P.length} projet${P.length>1?"s":""}${s.st?`, dont <b>${nfC(s.st)} studios</b>`:""}.</p><p class="sub" style="margin:0">${parts}${s.hors?` · sans compter ${nfC(s.hors)} logements en résidence pour un autre public (personnes âgées, tourisme, social)`:""}</p><ul class="cnl">${P.slice(0,4).map(([d,x])=>cnPcTxt(x,d)).join("")}</ul>`
  :`<p style="margin:0">Aucun projet de 5 logements collectifs ou plus autorisé depuis ${CN_AN} à moins de 500 m.</p>`;
 const html=`<h4 class="fh4">Résidences étudiantes à moins de 1 km</h4>${res}<h4 class="fh4">Logements neufs autorisés depuis janvier ${CN_AN}, à moins de 500 m</h4>${pc}`
  +fNote(`Mesuré ${pt.how}. Résidences : Crous, permis de construire depuis 2013 et OpenStreetMap (une résidence privée plus ancienne peut manquer, ou sa taille). Logements neufs : permis et déclarations de 5 logements collectifs ou plus (Sitadel, mis à jour chaque mois) ; un projet autorisé n'est pas toujours construit. Relevé du ${frD(J.maj)}.`);
 const sum=[R.length?`${R.length} résidence${R.length>1?"s":""}${nC?` (${nC} Crous)`:""}`:"aucune résidence",s.n?`${nfC(s.n)} logements neufs`:""].filter(Boolean).join(" · ");
 return [sum,html];}
/* points d'attention : une résidence étudiante neuve tout près, ou beaucoup de studios neufs */
function concAttn(b,t){const ck=(b&&b.ville)||(t&&t.ck), J=ck?concData(ck):null; if(!J) return []; const pt=concPoint(b,t); if(!pt) return [];
 const {P,s}=concAround(J,pt.lat,pt.lon), out=[], big=P.filter(([d,x])=>d<=500&&(x[10]===2)&&x[6]>=50).sort((a,c)=>a[0]-c[0])[0];
 if(big){const x=big[1]; out.push(["warn",`Résidence étudiante de ${nfC(x[6])} logements ${x[3]===2?"autorisée en "+cnMois(x[2]):x[3]===5?"en chantier":"terminée"+(x[5]?" en "+cnMois(x[5]):"")} à ${cnM(big[0])} : concurrence directe pour un studio.`]);}
 if(s.st>=100&&!big) out.push(["warn",`${nfC(s.st)} studios neufs autorisés à moins de 500 m depuis ${CN_AN} : plus d'offre pour les mêmes locataires.`]);
 return out;}
/* repères de la ville : places en résidence pour 100 étudiants, logements et studios autorisés par an */
function concVille(c){const J=concData(c.k); if(J===null) return null; if(J===undefined) return ["chargement…",`<p class="sub" style="margin:0" data-cnw="${esc(c.k)}">Chargement des résidences et des permis…</p>`];
 const R=J.res, cap=R.reduce((a,x)=>a+(x[5]===2?0:x[3]||0),0), kn=R.filter(x=>x[3]).length, nC=R.filter(x=>x[4]==="crous").length;
 const yrs=[], y0=new Date().getFullYear(); for(let y=y0-3;y<y0;y++) yrs.push(String(y));
 const P=J.pc.filter(x=>yrs.includes(x[2].slice(0,4))&&!CN_HORS.has(x[10])), n=P.reduce((a,x)=>a+x[6],0)/yrs.length, st=P.reduce((a,x)=>a+x[7],0)/yrs.length;
 const RE=J.pc.filter(x=>x[2]>=CN_DEPUIS&&x[10]===2), nre=RE.reduce((a,x)=>a+x[6],0);
 const html=fRows([["Résidences étudiantes",`<b>${R.length}</b>${nC?`, dont ${nC} du Crous`:""}`,`${nfC(cap)} logements connus (taille connue pour ${kn} sur ${R.length})${c.students?` : <b>${fr(cap/c.students*100,1)}</b> pour 100 étudiants`:""}`],
  ["Logements neufs autorisés",`<b>${nfC(Math.round(n))}</b> par an, dont ${nfC(Math.round(st))} studios`,`moyenne ${yrs[0]}-${yrs[yrs.length-1]}, projets de 5 logements collectifs ou plus, hors résidences pour personnes âgées, de tourisme ou sociales${(()=>{const h=typeof habCity==="function"?habCity(c.k):null; return h&&h.pop?` · ${fr(n/h.pop*1000,1)} pour 1 000 habitants`:"";})()}`],
  ["Résidences étudiantes en projet",RE.length?`<b>${RE.length}</b> depuis ${CN_AN} (${nfC(nre)} logements)`:"aucune depuis "+CN_AN,RE.filter(x=>x[3]!==6).length?`${RE.filter(x=>x[3]!==6).length} pas encore terminée${RE.filter(x=>x[3]!==6).length>1?"s":""}`:""]])
  +fNote(`Résidences : Crous à 10 km du centre au plus, permis de construire depuis 2013 et OpenStreetMap. Permis : commune ${/^[aeiouyhéèâ]/i.test(c.name)?"d'":"de "}${esc(c.name)} seulement (Sitadel). Relevé du ${frD(J.maj)}.`);
 return [`${R.length} résidences · ${nfC(Math.round(st))} studios neufs par an`,html];}
/* le fichier d'une ville vient d'arriver : la fiche ouverte qui l'attendait est redessinée, la carte aussi */
function concFill(ck){if(typeof document==="undefined") return; if(document.querySelector(`[data-cnw="${ck}"]`)) document.dispatchEvent(new CustomEvent("v2fiche-maj",{detail:{ck}})); document.dispatchEvent(new CustomEvent("v2conc",{detail:{ck}}));}
