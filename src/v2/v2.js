/* ================= version 2 (v2.html) : l'interface des maquettes, sur le moteur de l'app =================
   Ajouté après tout le reste par build.py, seulement dans v2.html ; index.html reste l'app actuelle.
   Ne calcule rien lui-même : calc, calcBien, irr3, les fiches (bienFicheBody, quartierFiche, villeFiche), la liste
   partagée (BIENS, updBien, mStar) et les annonces viennent de l'app. Ce fichier ne fait que les montrer autrement :
   - un marché filtré par nos critères, vu en carte (Leaflet), en tableau ou en nuage ;
   - une fiche unique en onglets (le bien, le prix, le calcul, le quartier, l'achat) ;
   - les avis à deux (champ « votes » des biens partagés), l'offre et la visite recalculées en direct. */
(function v2(){
 document.documentElement.classList.add("v2");
 const $=id=>document.getElementById(id), cv=c=>typeof colv==="function"?colv(c):c, PH=()=>matchMedia("(max-width:860px)").matches;
 const DEF={tab:"carte",city:null,vue:"crit",aview:"tableau",cview:"tableau",sort:["irr",-1],ftab:"bien",n:60,min:false};
 let V; try{V=Object.assign({},DEF,JSON.parse(localStorage.getItem("v2s")||"{}"));}catch(_){V=Object.assign({},DEF);} V.sel=null;
 /* critères : communs à deux (13-reglages-communs.js) ; ceux d'avant, gardés dans ce navigateur, sont repris une fois */
 if(!NOSCRIT&&V.crit&&V.crit.done){NOSCRIT={budget:+V.crit.budget||CRIT0.budget,rmin:+V.crit.rmin,bank:V.crit.bank!==false}; try{localStorage.setItem("crit",JSON.stringify(NOSCRIT));}catch(_){}}
 delete V.crit; delete V.loc;
 /* scénario affiché : propre à chacun, gardé d'une ouverture à l'autre */
 try{const s=localStorage.getItem("scn"); if(s){H.pess=s==="prudent"; H.fav=s==="favorable";}}catch(_){}
 const OFFT={};   /* offre en cours d'essai (curseur), pas encore enregistrée */
 const save=()=>{try{const o=Object.assign({},V); delete o.sel; localStorage.setItem("v2s",JSON.stringify(o));}catch(_){}};
 const scn=()=>H.pess?"prudent":H.fav?"favorable":"central";
 const tyl=()=>TYPES[H.type].lab, typl=()=>TYPES[H.type].pl||tyl();
 const pctS=v=>v==null?"n.d.":pct(v);
 const cfC=v=>v>=0?"var(--ok)":"var(--bad)";
 const nf=v=>Math.round(v).toLocaleString("fr-FR");

 /* ---------- le marché : les annonces de vente, avec leur calcul ---------- */
 let FEED=null;
 function feed(){if(FEED) return FEED; FEED=feedList({}).filter(o=>o.x&&o.x.irr!=null&&!horsCalcul(o.a[3])); FEED.forEach(o=>{o.f=ficx(o.a[3])||{}; o.id=o.a[3];}); return FEED;}
 const z3=o=>o.z||(o.z=irr3(o.x)||{});
 const inShort=o=>{const b=bienOf(o.url); return !!(b&&!isOut(b));};
 const pass=o=>{const c=critV(); return o.x.cost<=c.budget&&o.x.irr>=c.rmin&&(!c.bank||bankOk(o.x.ratio));};
 const VUES=[["crit","Nos critères",o=>pass(o)],["new","Nouvelles",o=>o.nw&&pass(o)],["drop","Baisses",o=>!!(o.v&&o.v.last)],["short","Shortlist",inShort],["all","Toutes",()=>true]];
 function market(city){let L=feed(); if(city) L=L.filter(o=>o.ck===city); const f=(VUES.find(v=>v[0]===V.vue)||VUES[0])[2]; L=L.filter(f);
  const [k,d]=V.sort, g={irr:o=>o.x.irr,cf:o=>o.x.cf,p:o=>o.a[2],m2:o=>o.a[2]/o.a[0],s:o=>o.a[0],new:o=>o.nw?1:0}[k]||(o=>o.x.irr);
  return L.slice().sort((a,b)=>(g(a)-g(b))*d);}
 function vueChips(city){const L=city?feed().filter(o=>o.ck===city):feed();
  return VUES.map(([k,l,f])=>`<button type="button" class="v2chip" data-v2vue="${k}" aria-pressed="${V.vue===k}">${l}<small>${L.filter(f).length}</small></button>`).join("");}
 const rng=(o,w)=>{const z=z3(o), lo=-4, hi=12, p=v=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100)), c=cv(colIrr(o.x.irr)); if(z.prudent==null) return "";
  return `<span class="v2rng" style="width:${w||80}px" title="prudent ${pctS(z.prudent)} · favorable ${pctS(z.favorable)}" aria-label="de ${pctS(z.prudent)} à ${pctS(z.favorable)}"><i style="left:${p(z.prudent)}%;width:${p(z.favorable)-p(z.prudent)}%;background:${c}"></i><b style="left:${p(o.x.irr)}%;background:${c}"></b></span>`;};
 const titre=o=>`${tyl()} ${String(o.a[0]).replace(".",",")} m²${o.a[1]?" · "+o.a[1]:""}`;
 const where=o=>`${cityName(o.ck)}${o.t?" · "+o.t.name:""}`;
 const photo=(o,w,h)=>o.a[4]?photoUrl(o.a[3],o.a[4],w,h):"";
 const img=(src,cls)=>src?`<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">`:`<span class="${cls} v2ph"></span>`;
 const starBtn=o=>{const on=inShort(o); return `<button type="button" class="v2star" data-v2star="${o.ck}|${esc(o.id)}" aria-pressed="${on}" aria-label="${on?"Retirer de":"Ajouter à"} la shortlist">${on?"★":"☆"}</button>`;};
 const key=o=>`v|${o.ck}|${o.id}`;

 /* ---------- ce qui a bougé depuis votre dernière visite ----------
    Annonces : la date de votre visite précédente (MSEEN, au jour près) et l'historique des relevés (apparue, baisse, retirée).
    Nos biens : l'état de la liste commune à la fin de votre dernière journée de visite, gardé dans ce navigateur, comparé à l'état
    actuel. Comptent les votes des autres et ce que les autres ont changé (maj.par, posé par la liste commune). */
 const digest=b=>({st:b.statut,v:Object.assign({},b.votes||{}),o:+((b.visite||{}).offre)||0,tr:+b.travaux||0,c:((b.suivi||{}).compromis)||"",ck:Object.values((b.visite||{}).check||{}).filter(v=>v==="oui"||v==="non").length,av:Object.keys((b.visite||{}).avis||{}).length});
 const VU=(()=>{const d=jourIso(); let s=null; try{s=JSON.parse(localStorage.getItem("v2vu")||"null");}catch(_){} if(!s||typeof s!=="object") return {day:d,ref:null,rt:null,last:null,lt:null};
  return s.day===d?s:{day:d,ref:s.last||null,rt:s.lt||null,last:s.last||null,lt:s.lt||null};})();
 function vuSnap(){if(!REGREADY) return; const o={}; BIENS.forEach(b=>{o[b.id]=digest(b);}); VU.last=o; VU.lt=new Date().toISOString(); try{localStorage.setItem("v2vu",JSON.stringify(VU));}catch(_){}}
 let NEWS=null;
 function bouge(){const me=myName()||"", since=MSEEN, ref=VU.ref, F=feed(), t=jourIso(), N={nw:[],dr:[],gone:[],them:[],due:[],reg:null,since,first:!since&&!ref};
  if(since){N.nw=F.filter(o=>o.nw&&pass(o)); N.dr=F.filter(o=>o.v&&o.v.last&&o.v.last.d>since&&(pass(o)||inShort(o))).sort((a,b)=>b.v.last.amt-a.v.last.amt);}
  BIENS.forEach(b=>{if(isOut(b)) return; const suf=bienSuf(b), e=suf&&hEntry(b.ville,suf);
   if(since&&e&&e.g&&e.g>since) N.gone.push(b);
   const nx=suiviNext(b); if(nx&&nx.d>=t&&nx.d<=addD(t,7)) N.due.push([b,nx]);
   if(!ref) return; const r=ref[b.id], d=digest(b), by=(b.maj&&b.maj.par)||"";
   if(!r){if(b.par&&b.par!==me) N.them.push([b,`${b.par} l'a ajouté`]); return;}
   const vo=Object.keys(d.v).filter(k=>k&&k!==me&&(r.v||{})[k]!==d.v[k]).map(k=>`${k} vote « ${((VOT.find(x=>x[0]===d.v[k])||[])[1]||"").toLowerCase()} »`), ch=[];
   if(by&&by!==me){if(d.st!==r.st) ch.push(`statut « ${d.st} »`); if(d.o!==r.o) ch.push(d.o?`offre ${keur(d.o)}`:"offre retirée"); if(d.tr!==r.tr) ch.push(`travaux ${keur(d.tr)}`);
    if(d.c&&d.c!==r.c) ch.push(`compromis le ${dateTxt(d.c)}`); if(d.ck>r.ck) ch.push(`${d.ck-r.ck} point${d.ck-r.ck>1?"s":""} de visite`); if(d.av>r.av) ch.push("avis de visite");}
   const all=vo.concat(ch.length?[`${by} : ${ch.join(", ")}`]:[]); if(all.length) N.them.push([b,all.join(" · ")]);});
  const rd=REGL&&REGL.data; if(rd&&rd.par&&rd.par!==me&&VU.rt&&String(rd.le||"")>VU.rt) N.reg=rd.par;
  return N;}
 function newsHtml(N){const rows=[], row=(dat,ic,cls,t,s)=>`<div class="v2nrow" role="button" tabindex="0" ${dat}><i class="v2ni ${cls}" aria-hidden="true">${ic}</i><span><b>${t}</b>${s?`<small>${s}</small>`:""}</span></div>`;
  const bl=b=>`${keur(+b.prix)} · ${esc(b.titre||"Bien")} · ${esc(cityName(b.ville))}`;
  const cities=L=>{const by={}; L.forEach(o=>{by[o.ck]=(by[o.ck]||0)+1;}); const E=Object.entries(by).sort((a,b)=>b[1]-a[1]); return E.slice(0,4).map(([k,n])=>`${esc(cityName(k))} ${n}`).join(" · ")+(E.length>4?" …":"");};
  N.them.slice(0,5).forEach(([b,t])=>rows.push(row(`data-v2open="b|${esc(b.id)}"`,"●","a",esc(t),bl(b))));
  if(N.them.length>5) rows.push(row(`data-v2tab="biens"`,"+","a",`${N.them.length-5} autre${N.them.length>6?"s":""} bien${N.them.length>6?"s":""} modifié${N.them.length>6?"s":""}`,"onglet Nos biens"));
  if(N.reg) rows.push(row(`data-v2tab="budget"`,"●","a",`${esc(N.reg)} a modifié les réglages communs`,"onglet Budget"));
  N.due.slice(0,3).forEach(([b,x])=>rows.push(row(`data-v2open="b|${esc(b.id)}"`,"!","w",`${esc(x.l)} : ${esc(dateTxt(x.d))}`,bl(b))));
  N.gone.forEach(b=>rows.push(row(`data-v2open="b|${esc(b.id)}"`,"×","x","Retiré de la vente",bl(b))));
  if(N.nw.length) rows.push(row(`data-v2gonew="new"`,N.nw.length,"n",`${N.nw.length} nouvelle${N.nw.length>1?"s":""} annonce${N.nw.length>1?"s":""} pour nos critères`,cities(N.nw)));
  if(N.dr.length) rows.push(row(`data-v2gonew="drop"`,"↓","d",`${N.dr.length} baisse${N.dr.length>1?"s":""} de prix`,N.dr.slice(0,2).map(o=>`${keur(o.a[2])} (−${keur(o.v.last.amt)}) · ${esc(cityName(o.ck))}`).join(" ; ")));
  const h=N.since?`Depuis votre visite du ${dm(N.since)}`:"Ce qui a bougé";
  const empty=N.first?"Première visite : à partir de votre prochaine journée, vous verrez ici les nouvelles annonces, les baisses de prix et ce que l'autre a fait.":`Rien de neuf depuis le ${dm(N.since||jourIso())}.`;
  return `<section class="v2news" aria-label="Ce qui a bougé"><h2>${h}</h2>${rows.length?rows.join(""):`<p class="v2sub">${empty}</p>`}</section>`;}
 const cityCnt=ck=>{const A=feed().filter(o=>o.ck===ck); return [A.filter(pass).length,A.length];};

 /* ---------- squelette ---------- */
 const TABS=[["carte","Carte"],["annonces","Annonces"],["villes","Villes"],["biens","Nos biens"],["budget","Budget"]];
 const ICO={carte:'<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',annonces:'<path d="M4 6h16M4 12h16M4 18h10"/>',villes:'<path d="M4 20V9l5-3v14M9 20V4l6 3v13M15 20v-9l5 2v7M3 20h18"/>',biens:'<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',budget:'<path d="M17.5 6.5A7 7 0 1 0 17.5 17.5M4 10.5h9M4 13.5h9"/>'};
 const app=document.createElement("div"); app.id="v2app";
 app.innerHTML=`<header class="v2top"><span class="v2brand">Notre studio</span><nav class="v2tabs" aria-label="Rubriques" id="v2tabs"></nav><span class="v2sp"></span><span id="v2type"></span><span class="v2scnw" id="v2scn"></span><button type="button" class="v2btn sm" data-v2crit>Critères</button></header>
  <div class="v2main"><section class="v2page" id="v2p-carte" style="display:flex;overflow:hidden"><div class="v2mapwrap"><div id="v2map" role="region" aria-label="Carte"></div><div class="v2mlist" id="v2mlist"></div><div class="v2mleg" id="v2mleg"></div></div></section>
  <section class="v2page" id="v2p-annonces" hidden></section><section class="v2page" id="v2p-villes" hidden></section><section class="v2page" id="v2p-biens" hidden></section><section class="v2page" id="v2p-budget" hidden></section>
  <aside class="v2fiche" id="v2fiche" hidden aria-label="Fiche"></aside></div>
  <nav class="v2tabbar" id="v2tabbar" aria-label="Rubriques"></nav>`;
 document.body.appendChild(app);
 function top(){NEWS=bouge(); const [me,oth]=people(), att=new Set(BIENS.filter(b=>!isOut(b)&&etat(b,me,oth)[0]==="des").map(b=>b.id)); NEWS.them.forEach(([b])=>att.add(b.id));
  const nb=att.size, t=(k,l)=>`${l}${k==="biens"&&nb?`<small title="à trancher ou modifiés par l'autre">${nb}</small>`:""}`;
  $("v2tabs").innerHTML=TABS.map(([k,l])=>`<button type="button" data-v2tab="${k}" aria-current="${V.tab===k?"page":"false"}">${t(k,l)}</button>`).join("");
  $("v2tabbar").innerHTML=TABS.map(([k,l])=>`<button type="button" data-v2tab="${k}" aria-current="${V.tab===k?"page":"false"}"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</g></svg>${l}${k==="biens"&&nb?`<small class="v2bdg">${nb}</small>`:""}</button>`).join("");
  $("v2type").innerHTML=`<span class="v2seg" role="group" aria-label="Type de bien">${Object.entries(TYPES).map(([k,T])=>`<button type="button" data-type="${k}" aria-pressed="${H.type===k}">${T.lab}</button>`).join("")}</span>`;
  $("v2scn").innerHTML=scnSeg();}
 const scnSeg=()=>`<span class="v2seg" role="group" aria-label="Scénario">${[["prudent","Prudent"],["central","Central"],["favorable","Favorable"]].map(([k,l])=>`<button type="button" data-v2scn="${k}" aria-pressed="${scn()===k}">${l}</button>`).join("")}</span>`;

 /* ---------- carte en 3D (MapLibre, fonds vectoriels OpenFreeMap, sans clé) ----------
    Villes, quartiers et annonces sont des couches GeoJSON dessinées par la carte : les noms se rangent sans se chevaucher,
    le zoom est continu (pas de tuiles d'images agrandies), la carte s'incline et tourne, les immeubles montent en 3D de près.
    Les repères (gares, campus, centre) sont de petits marqueurs HTML. Sans WebGL, un message renvoie aux listes. */
 const MLV="4.7.1", MLJS=`https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/${MLV}/maplibre-gl.js`, MLCSS=`https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/${MLV}/maplibre-gl.css`;
 const MLSTYLE=()=>"https://tiles.openfreemap.org/styles/"+(document.documentElement.getAttribute("data-theme")==="dark"||(!document.documentElement.getAttribute("data-theme")&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"liberty");
 let ML=null, M=null, MREADY=false, LCITY=null, LTRY=false, RMK=[], POP=null, HQ=null;
 window.V2MAPN={villes:0,quartiers:0,annonces:0};   /* ce que la carte montre (tests) */
 const mapMsg=t=>{$("v2map").innerHTML=`<p class="v2empty">${t} Les annonces restent dans les onglets Annonces et Villes.</p>`;};
 function mapLib(cb){if(window.maplibregl) return cb(); if(LTRY) return; LTRY=true;
  const l=document.createElement("link"); l.rel="stylesheet"; l.href=MLCSS; document.head.appendChild(l);
  const s=document.createElement("script"); s.src=MLJS; s.onload=cb; s.onerror=()=>mapMsg("La carte n'a pas pu se charger (hors ligne ?)."); document.head.appendChild(s);}
 const webgl=()=>{try{const c=document.createElement("canvas"); return !!(c.getContext("webgl2")||c.getContext("webgl"));}catch(_){return false;}};
 const sheetH=()=>{const l=$("v2mlist"); return l?l.offsetHeight:260;};   /* téléphone : la liste couvre le bas de la carte */
 const pad=()=>PH()?{top:16,left:16,right:16,bottom:sheetH()+12}:{top:40,left:390,right:40,bottom:40};
 const EMPTY={type:"FeatureCollection",features:[]};
 function mapInit(){if(M||!window.maplibregl) return; if(!webgl()){mapMsg("Cette carte demande WebGL, indisponible dans ce navigateur."); return;}
  ML=window.maplibregl;
  try{M=new ML.Map({container:"v2map",style:MLSTYLE(),center:[-0.6,47.75],zoom:6,minZoom:4,maxZoom:18.5,maxPitch:70,attributionControl:false});}catch(e){M=null; mapMsg("La carte n'a pas pu démarrer."); return;}
  M.addControl(new ML.AttributionControl({compact:true}),PH()?"top-right":"bottom-right");
  if(!PH()) M.addControl(new ML.NavigationControl({visualizePitch:true}),"top-right");   /* boutons : zoom, boussole (inclinaison et rotation) */
  M.on("load",()=>{try{mapLayers();}catch(_){} MREADY=true; drawMap(true); const at=$("v2map").querySelector(".maplibregl-ctrl-attrib"); if(at) at.classList.remove("maplibregl-compact-show");});   /* sources de la carte repliées (bouton i) */
  M.on("click",mapClick); if(!PH()) M.on("mousemove",mapHover);
  window.V2MAP=()=>M;}
 function mapLayers(){const dk=MLSTYLE().endsWith("dark"), L=M.getStyle().layers, below=M.getLayer("building")?"building":(L.find(l=>l.type==="symbol")||{}).id;
  ["villes","quartiers","annonces"].forEach(s=>{if(!M.getSource(s)) M.addSource(s,{type:"geojson",data:EMPTY});});
  /* quartiers teintés sous les immeubles et les routes : la ville se lit à travers */
  M.addLayer({id:"q-fill",type:"fill",source:"quartiers",paint:{"fill-color":["get","c"],"fill-opacity":["case",["boolean",["feature-state","hover"],false],["+",["get","op"],.2],["get","op"]]}},below);
  M.addLayer({id:"q-line",type:"line",source:"quartiers",paint:{"line-color":dk?"#0b1020":"#ffffff","line-opacity":.85,"line-width":["interpolate",["linear"],["zoom"],10,.6,15,1.8]}},below);
  /* immeubles en 3D un peu plus tôt qu'avec le style d'origine */
  if(M.getLayer("building-3d")){M.setLayerZoomRange("building-3d",13.5,24); try{M.setPaintProperty("building-3d","fill-extrusion-opacity",.8);}catch(_){}}
  M.addLayer({id:"a-dot",type:"circle",source:"annonces",paint:{"circle-radius":["case",["get","sel"],10,["interpolate",["linear"],["zoom"],9,4.5,14,8]],"circle-color":["get","c"],
   "circle-stroke-color":["case",["get","st"],"#e08a00",["get","nw"],"#2f47b3",dk?"#0b1020":"#ffffff"],"circle-stroke-width":["case",["any",["get","st"],["get","nw"],["get","sel"]],3,1.5]}});
  M.addLayer({id:"v-dot",type:"circle",source:"villes",paint:{"circle-radius":["get","r"],"circle-color":["get","c"],"circle-opacity":["get","op"],"circle-stroke-color":"#ffffff","circle-stroke-width":2,"circle-stroke-opacity":["get","op"]}});
  M.addLayer({id:"v-lab",type:"symbol",source:"villes",layout:{"text-field":["get","lab"],"text-font":["Noto Sans Bold"],"text-size":12.5,"text-variable-anchor":["bottom","top","right","left"],"text-radial-offset":1.15,"symbol-sort-key":["get","rk"],"text-padding":2},
   paint:{"text-color":dk?"#e5e9f0":"#18202c","text-halo-color":dk?"#0b1020":"#ffffff","text-halo-width":1.7,"text-opacity":["get","op"]}});}
 /* contour d'un quartier (latitude, longitude comme Leaflet) en GeoJSON (longitude, latitude), anneaux fermés */
 function geoPoly(g){const dep=a=>Array.isArray(a)?1+dep(a[0]):0, ring=r=>{const o=r.filter(p=>isFinite(p[0])&&isFinite(p[1])).map(p=>[p[1],p[0]]); if(o.length&&(o[0][0]!==o[o.length-1][0]||o[0][1]!==o[o.length-1][1])) o.push(o[0]); return o;};
  const d=dep(g); return d===2?{type:"Polygon",coordinates:[ring(g)]}:d===3?{type:"Polygon",coordinates:g.map(ring)}:d===4?{type:"MultiPolygon",coordinates:g.map(p=>p.map(ring))}:null;}
 function bbox(P){let a=180,b=90,c=-180,d=-90; P.forEach(([x,y])=>{if(x<a)a=x; if(y<b)b=y; if(x>c)c=x; if(y>d)d=y;}); return a<=c?[[a,b],[c,d]]:null;}
 const geoPts=F=>{const P=[], w=a=>{if(typeof a[0]==="number") P.push(a); else a.forEach(w);}; F.forEach(f=>w(f.geometry.coordinates)); return P;};
 /* repères de la ville : gares, campus, centre */
 const REPL={gare:["Gare","M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 10h14M9 21l2-4M15 21l-2-4"],univ:["Campus","M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5"],centre:["Centre","M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"]};
 function reperes(ck){RMK.forEach(m=>m.remove()); RMK=[]; if(!ck||typeof REPQ==="undefined"||!REPQ[ck]) return;
  Object.entries(REPQ[ck]).forEach(([k,p])=>{const d=REPL[k.replace(/\d+$/,"")]; if(!d||!Array.isArray(p)||!isFinite(p[0])) return; const el=document.createElement("div"); el.className="v2rep"; el.title=d[0];
   el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d[1]}"/></svg><span>${d[0]}</span>`; RMK.push(new ML.Marker({element:el,anchor:"bottom"}).setLngLat([p[1],p[0]]).addTo(M));});}
 function drawMap(fit){if(!M||!MREADY) return; const set=(s,f)=>{const src=M.getSource(s); if(src) src.setData({type:"FeatureCollection",features:f}); V2MAPN[s]=f.length;};
  if(!V.city){const P=[]; set("villes",C.map((c,i)=>{const x=calc(c), [m]=cityCnt(c.k); P.push([c.lon,c.lat]);
    return {type:"Feature",id:i,properties:{k:c.k,c:cv(colIrr(x.irr)),op:m?1:.45,r:m?Math.round((PH()?6:8)+Math.sqrt(m)*1.7):5,lab:`${c.name} ${pctS(x.irr)}${m?` · ${m}`:""}`,rk:-m,t:`${c.name} · ${pctS(x.irr)} · ${m} annonce${m>1?"s":""} pour nos critères`},geometry:{type:"Point",coordinates:[c.lon,c.lat]}};}));
   set("quartiers",[]); set("annonces",[]); reperes(null);
   if(fit||LCITY!==null){const b=bbox(P); if(b) fitLater(b,{pitch:0,bearing:0,duration:fit?0:800});} LCITY=null; return;}
  const ck=V.city, ll=irisLL(ck), Q=[];
  IR[ck].list.forEach((t,i)=>{const g=ll[t.i], geo=g&&geoPoly(g); if(!geo) return; let x=null; try{x=t.type==="H"?(QX[t.ck+t.i]||calcIris(t)):null;}catch(_){}
   Q.push({type:"Feature",id:i,properties:{code:t.code,c:x&&x.irr!=null?cv(colIrr(x.irr)):"#9aa3ad",op:x?.38:.12,t:`${t.name}${x&&x.irr!=null?" · "+pctS(x.irr):""}`},geometry:geo});});
  set("villes",[]); set("quartiers",Q);
  set("annonces",market(ck).filter(o=>o.f.la).map((o,i)=>({type:"Feature",id:i,properties:{k:key(o),c:cv(colIrr(o.x.irr)),sel:V.sel===key(o),nw:!!o.nw,st:inShort(o),t:`${keur(o.a[2])} · ${String(o.a[0]).replace(".",",")} m² · ${pctS(o.x.irr)}`},geometry:{type:"Point",coordinates:[o.f.lo,o.f.la]}})));
  reperes(ck);
  if(LCITY!==ck){const b=bbox(geoPts(Q)); if(b) fitLater(b,{pitch:PH()?35:50,bearing:-12,duration:fit?0:1000}); LCITY=ck;}}
 /* cadrer après que la fiche s'est ouverte ou fermée (la carte change de largeur) */
 function fitLater(b,o){requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!M) return; M.resize(); M.fitBounds(b,Object.assign({padding:pad()},o));}));}
 /* un clic : annonce, sinon ville, sinon quartier (une petite marge autour du doigt) */
 function mapClick(e){const r=PH()?12:6, box=[[e.point.x-r,e.point.y-r],[e.point.x+r,e.point.y+r]], at=(l,b)=>M.getLayer(l)?M.queryRenderedFeatures(b||e.point,{layers:[l]}):[];
  const a=at("a-dot",box); if(a.length){openSel(a[0].properties.k); return;}
  const v=at("v-dot",box).concat(at("v-lab")); if(v.length){goCity(v[0].properties.k); return;}
  const q=at("q-fill"); if(q.length&&V.city) openSel(`q|${V.city}|${q[0].properties.code}`);}
 function mapHover(e){const L=["a-dot","v-dot","q-fill"].filter(l=>M.getLayer(l)), f=L.length?M.queryRenderedFeatures([[e.point.x-4,e.point.y-4],[e.point.x+4,e.point.y+4]],{layers:L}):[], h=f[0];
  M.getCanvas().style.cursor=h?"pointer":"";
  if(HQ!=null){try{M.setFeatureState({source:"quartiers",id:HQ},{hover:false});}catch(_){} HQ=null;}
  if(h&&h.layer.id==="q-fill"&&h.id!=null){HQ=h.id; try{M.setFeatureState({source:"quartiers",id:HQ},{hover:true});}catch(_){}}
  if(!h){if(POP) POP.remove(); return;}
  if(!POP) POP=new ML.Popup({closeButton:false,closeOnClick:false,className:"v2pop",offset:12});
  POP.setLngLat(e.lngLat).setText(h.properties.t).addTo(M);}
 /* une annonce ouverte depuis la carte : la vue s'approche et s'incline, les immeubles autour apparaissent */
 function flyAd(s){if(!M||!MREADY||V.tab!=="carte"||s[0]!=="v") return; const o=feed().find(x=>key(x)===s); if(!o||!o.f.la) return;
  M.flyTo({center:[o.f.lo,o.f.la],zoom:Math.max(M.getZoom(),16),pitch:PH()?45:58,padding:pad(),duration:1200,essential:true});}
 function mapList(){const el=$("v2mlist"); el.dataset.min=V.min?"1":"0";
  const head=(t,sub)=>`<div class="v2mhead"><div class="v2crumb">${V.city?`<button type="button" data-v2city="">L'Ouest</button><span aria-hidden="true">›</span>`:""}<span>${t}</span><span class="v2sp"></span><button type="button" class="v2btn sm" data-v2min aria-expanded="${!V.min}">${V.min?"Liste":"Réduire"}</button></div>${sub}</div>`;
  if(!V.city){const rows=C.map(c=>({c,x:calc(c),k:cityCnt(c.k)})).sort((a,b)=>b.x.irr-a.x.irr), tot=rows.reduce((s,r)=>s+r.k[0],0);
   el.innerHTML=head("L'Ouest",`<p class="v2sub">${tyl()} · ${tot} annonce${tot>1?"s":""} pour nos critères, dans ${rows.filter(r=>r.k[0]).length} villes sur ${C.length}.</p>`)+`<div class="v2mrows">${newsHtml(NEWS||bouge())}<h2 class="v2mh2">Les villes · moyenne d'${tyLow()==="studio"?"un studio":"un "+tyl()} type</h2>${rows.map(({c,x,k:[m,n]})=>`<div class="v2row${m?"":" v2dim"}" role="button" tabindex="0" data-v2city="${c.k}" style="grid-template-columns:minmax(0,1fr) auto"><b>${esc(c.name)}</b><span class="v2rv" style="color:${cv(colIrr(x.irr))}">${pctS(x.irr)}</span><span class="v2rs">${keur(x.cost)} tout compris · ${sgn(x.cf)}/mois</span><span class="v2rs" style="text-align:right">${rng({x,z:irr3(x)||{}},70)}</span><span class="v2rs v2match">${n?(m?`<b>${m}</b> annonce${m>1?"s":""} sur ${n} pour nos critères`:n>1?`aucune des ${n} annonces pour nos critères`:"son annonce ne correspond pas à nos critères"):"pas d'annonces relevées"}</span></div>`).join("")}</div>`; return;}
  const L0=market(V.city), lim=L0.slice(0,80);
  el.innerHTML=head(esc(cityName(V.city)),`<div class="v2chips v2scroll">${vueChips(V.city)}</div><p class="v2sub">${L0.length} ${typl()} · triés par rendement ${scn()}</p>`)
   +`<div class="v2mrows">${lim.length?lim.map(o=>`<div class="v2row${V.sel===key(o)?" on":""}" role="button" tabindex="0" data-v2open="${esc(key(o))}">${img(photo(o,200,150),"")}<b>${keur(o.a[2])} · ${String(o.a[0]).replace(".",",")} m²${o.nw?'<span class="v2new">nouv.</span>':""}${inShort(o)?' <span style="color:var(--warn)">★</span>':""}</b><span class="v2rv" style="color:${cv(colIrr(o.x.irr))}">${pctS(o.x.irr)}</span><span class="v2rs">${esc(o.t?o.t.name:o.a[1]||"")}${o.f.dpe?" · DPE "+o.f.dpe:""} · ${sgn(o.x.cf)}/mois</span><span style="text-align:right">${rng(o,64)}</span></div>`).join(""):`<p class="v2empty">Aucune annonce dans cette vue.</p>`}${L0.length>80?`<p class="v2sub" style="padding:10px 14px">Les 80 premières sur ${L0.length}.</p>`:""}</div>`;}
 function mapLegend(){$("v2mleg").innerHTML=`<b>Rendement ${scn()}</b><span><i style="background:${cv("var(--bad)")}"></i>&lt; 2,5 %</span><span><i style="background:${cv("var(--warn)")}"></i>2,5–5</span><span><i style="background:${cv("var(--ok)")}"></i>≥ 5 %</span><span>${V.city?"contour bleu : nouvelle · orange : shortlist":"taille : annonces pour nos critères"}</span>`;}
 function goCity(ck){V.city=ck||null; if(V.city&&!ADS[V.city]) V.vue="crit"; save(); V.tab="carte"; if(PH()) V.sel=null; show(); if(V.city&&!PH()) openSel(`c|${V.city}`,true);}

 /* ---------- nuage (même échelle partout) ---------- */
 function nuage(o){const W=o.w||900,Hh=o.h||460,l=56,r=16,t=30,b=40, X=v=>l+(v-o.x[0])/(o.x[1]-o.x[0]||1)*(W-l-r), Y=v=>t+(o.y[1]-Math.max(o.y[0],Math.min(o.y[1],v)))/(o.y[1]-o.y[0])*(Hh-t-b);
  const tk=(a,z,n)=>{const st=Math.pow(10,Math.floor(Math.log10((z-a)/n))), m=[1,2,2.5,5,10].find(m=>(z-a)/(st*m)<=n)*st, out=[]; for(let v=Math.ceil(a/m)*m; v<=z+1e-9; v+=m) out.push(+v.toFixed(6)); return out;};
  let s=`<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(o.label)}">`;
  if(o.zone) s+=`<rect x="${X(o.x[0])}" y="${Y(o.y[1])}" width="${Math.max(0,X(Math.min(o.zone.x,o.x[1]))-X(o.x[0]))}" height="${Math.max(0,Y(o.zone.y)-Y(o.y[1]))}" fill="${cv("var(--ok)")}" fill-opacity=".08"/><text x="${X(o.x[0])+6}" y="${Y(o.y[1])+14}" style="fill:var(--ok);font-weight:700">${esc(o.zone.t)}</text>`;
  tk(o.y[0],o.y[1],7).forEach(v=>{s+=`<line x1="${l}" x2="${W-r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" ${v?'stroke-dasharray="2 4"':""}/><text x="${l-6}" y="${Y(v)+4}" text-anchor="end">${o.yf(v)}</text>`;});
  (o.xt||tk(o.x[0],o.x[1],8)).forEach(v=>{s+=`<text x="${X(v)}" y="${Hh-b+16}" text-anchor="middle">${o.xf(v)}</text>`;});
  s+=`<text x="${W-r}" y="${Hh-4}" text-anchor="end">${esc(o.xl)}</text><text x="${l}" y="${t-6}">${esc(o.yl)}</text>`;
  (o.lines||[]).forEach(q=>{s+=q.x!=null?`<line x1="${X(q.x)}" x2="${X(q.x)}" y1="${t}" y2="${Hh-b}" stroke="var(--accent)" stroke-dasharray="5 4"/><text x="${X(q.x)-4}" y="${t+12}" text-anchor="end" style="fill:var(--accent)">${esc(q.t)}</text>`:`<line x1="${l}" x2="${W-r}" y1="${Y(q.y)}" y2="${Y(q.y)}" stroke="var(--accent)" stroke-dasharray="5 4"/><text x="${l+6}" y="${Y(q.y)+15}" text-anchor="start" style="fill:var(--accent)">${esc(q.t)}</text>`;});
  o.pts.forEach(p=>{const x=X(Math.max(o.x[0],Math.min(o.x[1],p.x))), y=Y(p.y), dat=p.open?` data-v2open="${esc(p.open)}"`:p.city?` data-v2city="${p.city}"`:"", tl=`<title>${esc(p.t||"")}</title>`;
   if(p.lo!=null) s+=`<line x1="${x}" x2="${x}" y1="${Y(p.hi)}" y2="${Y(p.lo)}" stroke="${p.c}" stroke-opacity=".3" stroke-width="2"/>`;
   if(p.shape==="star") s+=`<path d="M${x} ${y-9}l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="${p.c}" stroke="var(--surface)" stroke-width="1.5"${dat}>${tl}</path>`;
   else if(p.shape==="sq") s+=`<rect x="${x-5}" y="${y-5}" width="10" height="10" fill="${p.c}" stroke="var(--surface)"${dat}>${tl}</rect>`;
   else s+=`<circle cx="${x}" cy="${y}" r="${p.r||5}" fill="${p.c}" fill-opacity="${p.op||.88}" stroke="${p.on?"var(--fg)":"var(--surface)"}" stroke-width="${p.on?3:1}"${dat}>${tl}</circle>`;
   if(p.ring) s+=`<circle cx="${x}" cy="${y}" r="${(p.r||5)+4}" fill="none" stroke="var(--accent)" stroke-width="1.5" pointer-events="none"/>`;
   if(p.lab) s+=`<text x="${x+9}" y="${y-7}" style="fill:var(--fg);font-weight:700">${esc(p.lab)}</text>`;});
  return `<div class="v2chart">${s}</svg></div>`;}

 /* ---------- onglet Annonces : tableau ou nuage ---------- */
 const sortTh=(att,cur)=>(k,l,r)=>`<th class="${r?"r":""}"><button type="button" ${att}="${k}" title="Trier">${l}${cur[0]===k?(cur[1]<0?" ↓":" ↑"):'<span class="v2srt" aria-hidden="true"> ↕</span>'}</button></th>`;
 const th=(k,l,r)=>sortTh("data-v2sort",V.sort)(k,l,r);
 function pAnnonces(){const el=$("v2p-annonces"), L0=market(null), cities=Object.keys(ADS).filter(k=>ADS[k]&&ADS[k].ventes);
  let body; const ph=PH(), av=ph?"tableau":V.aview, shown=L0.slice(0,V.n), showBank=shown.some(o=>!bankOk(o.x.ratio));
  if(av==="nuage"){const pts=L0.map(o=>{const z=z3(o), c=cv(colIrr(o.x.irr)); return {x:o.x.cost/1000,y:o.x.irr,lo:z.prudent,hi:z.favorable,c,open:key(o),ring:o.nw,on:V.sel===key(o),shape:inShort(o)?"star":null,t:`${titre(o)} · ${where(o)} · ${keur(o.a[2])} · ${pctS(o.x.irr)}`};});
   const cr=critV(), xs=pts.map(p=>p.x).concat([cr.budget/1000]), yT=Math.min(30,Math.max(12,...pts.map(p=>Math.ceil(p.hi??p.y)))), yB=Math.max(-12,Math.min(-4,...pts.map(p=>Math.floor(p.lo??p.y))));
   body=pts.length?nuage({label:"Rendement selon le budget, une pastille par annonce",x:[Math.floor(Math.min(...xs)/10)*10-5,Math.ceil(Math.max(...xs)/10)*10+5],y:[yB,yT],xf:v=>v+" k€",yf:v=>fr(v,0)+" %",xl:"budget tout compris",yl:`rendement 15 ans · ${scn()}`,pts,lines:[{x:cr.budget/1000,t:"budget max"},{y:cr.rmin,t:"rendement min."}],zone:{x:cr.budget/1000,y:cr.rmin,t:"Nos critères"}})+`<div class="v2leg"><span>Trait : du scénario prudent au favorable</span><span>Anneau : nouvelle</span><span>Étoile : shortlist</span><span>Touchez une pastille pour sa fiche</span></div>`:`<p class="v2empty">Aucune annonce dans cette vue.</p>`;}
  else if(ph) body=`<div class="v2tw">${shown.map(o=>`<div class="v2row${V.sel===key(o)?" on":""}" role="button" tabindex="0" data-v2open="${esc(key(o))}">${img(photo(o,200,150),"")}<b>${keur(o.a[2])} · ${String(o.a[0]).replace(".",",")} m²${o.nw?'<span class="v2new">nouv.</span>':""}</b><span class="v2rv" style="color:${cv(colIrr(o.x.irr))}">${pctS(o.x.irr)}</span><span class="v2rs">${esc(where(o))} · ${sgn(o.x.cf)}/mois</span><span>${rng(o,64)}</span></div>`).join("")}</div>`;
  else body=`<div class="v2tw"><table class="v2t v2wide"><thead><tr><th></th><th></th>${th("p","Prix",1)}${th("s","m²",1)}<th>Ville · quartier</th>${th("irr","Rendement 15 ans",1)}<th>Fourchette</th>${th("cf","Cash-flow",1)}${th("m2","€/m²",1)}${showBank?"<th>Banque</th>":""}<th>DPE · signaux</th></tr></thead><tbody>${shown.map(o=>{const [bc,bt]=bank(o.x.ratio); return `<tr class="${V.sel===key(o)?"on":""}" data-v2open="${esc(key(o))}" tabindex="0"><td>${starBtn(o)}</td><td>${img(photo(o,160,120),"v2th")}</td><td class="r mono"><b>${keur(o.a[2])}</b>${o.nw?'<span class="v2new">nouv.</span>':""}${o.v&&o.v.last?`<span class="v2drop">↓ ${keur(o.v.last.amt)}</span>`:""}</td><td class="r mono">${String(o.a[0]).replace(".",",")}</td><td><b>${esc(cityName(o.ck))}</b><div class="v2sub" style="font-size:12px">${esc(o.t?o.t.name:o.a[1]||"")}</div></td><td class="r mono" style="color:${cv(colIrr(o.x.irr))};font-weight:700">${pctS(o.x.irr)}</td><td>${rng(o)}</td><td class="r mono" style="color:${cfC(o.x.cf)}">${sgn(o.x.cf)}</td><td class="r mono">${nf(o.a[2]/o.a[0])}</td>${showBank?`<td><span class="v2pill ${bc==="p-ok"?"ok":bc==="p-warn"?"warn":"bad"}">${bt}</span></td>`:""}<td>${o.f.dpe?`<span class="v2pill ${"FG".includes(o.f.dpe)?"bad":o.f.dpe==="E"?"warn":""}">DPE ${o.f.dpe}</span> `:""}${ficheBadges(o.a[3],true)||""}</td></tr>`;}).join("")}</tbody></table></div>`;
  const critB=`<button type="button" class="v2btn sm v2critb" data-v2crit title="Modifier nos critères">≤ ${keur(critV().budget)} · ≥ ${fr(critV().rmin)} %${critV().bank?" · banque":""}</button>`;
  el.innerHTML=`<div class="v2in"><div class="v2bar"><h1 class="v2h1">Annonces</h1><span class="v2sub">${L0.length} ${typl()}${ph?"":` · relevé du ${esc(ADSRAW.date||ADS.date||"")} · ${cities.length} villes`}</span><span class="v2sp"></span>${ph?"":`<span class="v2seg" role="group" aria-label="Affichage"><button type="button" data-v2av="tableau" aria-pressed="${V.aview!=="nuage"}">Tableau</button><button type="button" data-v2av="nuage" aria-pressed="${V.aview==="nuage"}">Nuage</button></span>`}</div>
   <div class="v2bar"><div class="v2chips v2scroll">${vueChips(null)}${ph?critB:""}</div>${ph?"":`<span class="v2sp"></span>${critB}`}</div>
   ${L0.length?body:`<p class="v2empty">Aucune annonce dans cette vue. Élargissez les critères ou choisissez « Toutes ».</p>`}
   ${av!=="nuage"&&L0.length>V.n?`<div class="v2more"><button type="button" class="v2btn" data-v2more>Afficher ${Math.min(60,L0.length-V.n)} de plus (${L0.length-V.n} restantes)</button></div>`:""}</div>`;}

 /* ---------- onglet Villes ---------- */
 function pVilles(){const ph=PH(), cs=V.csort||["irr",-1], kf={irr:r=>r.x.irr??-99,cf:r=>r.x.cf,cost:r=>r.x.cost,rent:r=>r.x.rentHC,stu:r=>r.c.students,m:r=>r.m}[cs[0]]||(r=>r.x.irr??-99);
  const el=$("v2p-villes"), R=C.map(c=>{const x=calc(c), [m,n]=cityCnt(c.k); return {c,x,z:irr3(x)||{},m,n};}).sort((a,b)=>(kf(a)-kf(b))*cs[1]), showBank=R.some(r=>!bankOk(r.x.ratio)), cth=sortTh("data-v2csort",cs);
  const body=ph?`<div class="v2tw">${R.map(r=>`<div class="v2row${r.m?"":" v2dim"}" role="button" tabindex="0" data-v2city="${r.c.k}" style="grid-template-columns:minmax(0,1fr) auto"><b>${esc(r.c.name)}</b><span class="v2rv" style="color:${cv(colIrr(r.x.irr))}">${pctS(r.x.irr)}</span><span class="v2rs">${keur(r.x.cost)} tout compris · ${sgn(r.x.cf)}/mois · loyer ${eur(r.x.rentHC)}</span><span class="v2rs" style="text-align:right">${rng(r,64)}</span><span class="v2rs v2match">${r.n?`<b>${r.m}</b> sur ${r.n} pour nos critères · ${nf(r.c.students)} étudiants`:`${nf(r.c.students)} étudiants · pas d'annonces relevées`}</span></div>`).join("")}</div>`
   :V.cview==="nuage"?nuage({label:"Rendement des villes selon le nombre d'étudiants",x:[3.2,5],xt:[3.3,3.5,3.7,4,4.3,4.6,4.9],y:[-4,9],xf:v=>nf(Math.pow(10,v)/1000)+" k",yf:v=>fr(v,0)+" %",xl:"étudiants (échelle logarithmique)",yl:`rendement 15 ans · ${scn()}`,pts:R.map(r=>({x:Math.log10(r.c.students),y:r.x.irr,lo:r.z.prudent,hi:r.z.favorable,c:cv(colIrr(r.x.irr)),r:r.m?8:6,op:r.m?.95:.55,city:r.c.k,lab:r.c.name,t:`${r.c.name} · ${pctS(r.x.irr)} · ${r.m} annonce${r.m>1?"s":""} pour nos critères`}))})+`<div class="v2leg"><span>Grandes pastilles : des annonces pour nos critères</span><span>Trait : du prudent au favorable</span></div>`
   :`<div class="v2tw"><table class="v2t v2wide"><thead><tr><th>Ville</th>${cth("irr","Rendement 15 ans",1)}<th>Fourchette</th>${cth("cf","Cash-flow",1)}${cth("cost","Budget",1)}${cth("rent","Loyer HC",1)}${cth("stu","Étudiants",1)}${cth("m","Nos critères",1)}${showBank?"<th>Banque</th>":""}</tr></thead><tbody>${R.map(r=>{const [bc,bt]=bank(r.x.ratio); return `<tr data-v2city="${r.c.k}" tabindex="0"><td><b>${esc(r.c.name)}</b></td><td class="r mono" style="color:${cv(colIrr(r.x.irr))};font-weight:700">${pctS(r.x.irr)}</td><td>${rng(r)}</td><td class="r mono" style="color:${cfC(r.x.cf)}">${sgn(r.x.cf)}</td><td class="r mono" title="prix ${keur(r.x.bien)} + notaire, meubles et travaux">${keur(r.x.cost)}</td><td class="r mono">${eur(r.x.rentHC)}</td><td class="r mono">${nf(r.c.students)}</td><td class="r mono">${r.n?`${r.m} / ${r.n}`:"—"}</td>${showBank?`<td><span class="v2pill ${bc==="p-ok"?"ok":bc==="p-warn"?"warn":"bad"}">${bt}</span></td>`:""}</tr>`;}).join("")}</tbody></table></div>`;
  el.innerHTML=`<div class="v2in"><div class="v2bar"><h1 class="v2h1">Villes</h1><span class="v2sub">${tyl()} type de ${H.surface} m² · ${eur(H.apport)} d'apport · scénario ${scn()}</span><span class="v2sp"></span>${ph?"":`<span class="v2seg" role="group" aria-label="Affichage"><button type="button" data-v2cv="tableau" aria-pressed="${V.cview!=="nuage"}">Tableau</button><button type="button" data-v2cv="nuage" aria-pressed="${V.cview==="nuage"}">Nuage</button></span>`}</div>${body}<p class="v2sub">Touchez une ville pour l'ouvrir sur la carte, avec ses quartiers et ses annonces. Une ville sans annonces relevées est calculée sur ses ventes réelles et ses loyers.</p></div>`;}

 /* ---------- onglet Nos biens : avis à deux ---------- */
 const VOT=[["o","Garder"],["m","À voir"],["n","Passer"]];
 function people(){const me=myName()||"", s=new Set(); BIENS.forEach(b=>{if(b.par) s.add(b.par); Object.keys(b.votes||{}).forEach(k=>s.add(k)); Object.keys((b.visite||{}).avis||{}).forEach(k=>s.add(k));}); s.delete(me); s.delete(""); return [me,[...s].slice(0,2)];}
 const voteBtns=(b,who,dis)=>`<span class="v2vote">${VOT.map(([c,l])=>`<button type="button" class="${c}" data-v2vote="${esc(b.id)}|${c}" aria-pressed="${(b.votes||{})[who]===c}"${dis?" disabled":""}>${l}</button>`).join("")}</span>`;
 const voteTxt=(b,who)=>{const v=(b.votes||{})[who]; return v?`<span class="v2pill ${v==="o"?"ok":v==="m"?"warn":"bad"}">${VOT.find(x=>x[0]===v)[1]}</span>`:`<span class="v2sub">pas encore d'avis</span>`;};
 function etat(b,me,oth){const a=(b.votes||{})[me], c=oth.map(n=>(b.votes||{})[n]).filter(Boolean); if(!a||!c.length) return ["att","en attente"]; return c.every(x=>x===a)?["acc","d'accord"]:["des","à trancher"];}
 function pBiens(){const el=$("v2p-biens"), [me,oth]=people(), L0=BIENS.filter(b=>!isOut(b)).map(b=>({b,r:calcBien(b),e:etat(b,me,oth)}));
  const ord={des:0,att:1,acc:2}; L0.sort((p,q)=>ord[p.e[0]]-ord[q.e[0]]||((q.r.x.irr??-99)-(p.r.x.irr??-99)));
  const n={acc:0,des:0,att:0}; L0.forEach(o=>n[o.e[0]]++);
  el.innerHTML=`<div class="v2in"><div class="v2bar"><h1 class="v2h1">Nos biens</h1><span class="v2sub">${L0.length} bien${L0.length>1?"s":""} suivi${L0.length>1?"s":""}${L0.length>1?" · les désaccords en tête":""}</span><span class="v2sp"></span><button type="button" class="v2btn sm pri" data-v2add>Ajouter un bien</button></div>
   ${cmpCard(L0)}
   ${!me||!sbCode()?ident(me,true):""}
   ${L0.length?`<div class="v2chips">${n.des?`<span class="v2pill warn">${n.des} à trancher</span>`:""}${n.att?`<span class="v2pill">${n.att} en attente d'un avis</span>`:""}${n.acc?`<span class="v2pill ok">${n.acc} d'accord</span>`:""}</div>`:""}
   ${L0.length?`<div class="v2tw"><table class="v2t v2wide"><thead><tr><th title="Cochez 2 à 4 biens pour les comparer">Comparer</th><th></th><th>Bien</th><th class="r">Rendement 15 ans</th><th>Fourchette</th><th class="r">Cash-flow</th><th>Statut</th><th>${me?esc(me)+" (vous)":"Vous"}</th>${oth.length?oth.map(o=>`<th>${esc(o)}</th>`).join(""):"<th>Binôme</th>"}<th>État</th></tr></thead><tbody>${L0.map(({b,r,e})=>{const x=r.x; return `<tr data-v2open="b|${esc(b.id)}" tabindex="0"><td><input type="checkbox" class="v2cmpck" data-v2cmp="${esc(b.id)}" aria-label="Comparer ${esc(b.titre||"ce bien")}"${CMPS.has(b.id)?" checked":""}></td><td>${img(bienPhoto(b,160,120),"v2th")}</td><td><b>${esc(b.titre||"Bien")}</b><div class="v2sub" style="font-size:12px">${esc(cityName(b.ville))}${b.quartier?" · "+esc(b.quartier):""} · ${keur(+b.prix)}</div></td><td class="r mono" style="color:${cv(colIrr(x.irr))};font-weight:700">${pctS(x.irr)}</td><td>${rng({x,z:irr3(x)||{}})}</td><td class="r mono" style="color:${cfC(x.cf)}">${sgn(x.cf)}</td><td>${stPill(b)}</td><td>${me?voteBtns(b,me):`<span class="v2sub">prénom d'abord</span>`}</td>${oth.length?oth.map(o=>`<td>${voteTxt(b,o)}</td>`).join(""):`<td><span class="v2sub">pas encore de binôme</span></td>`}<td><span class="v2pill ${e[0]==="acc"?"ok":e[0]==="des"?"warn":""}">${e[1]}</span></td></tr>`;}).join("")}</tbody></table></div>`:`<div class="v2card"><p class="v2empty">Aucun bien pour l'instant. Touchez l'étoile d'une annonce pour la suivre ici.</p></div>`}
   ${me&&sbCode()?ident(me,false):""}</div>`;}
 /* comparer 2 à 4 biens suivis, côte à côte ; la meilleure valeur de chaque ligne en gras */
 const CMPS=new Set();
 function cmpCard(L0){const R=L0.filter(o=>CMPS.has(o.b.id)).map(o=>Object.assign({},o,{x:o.r.x,V:o.r.V,z:irr3(o.r.x)||{}})); if(R.length<2) return CMPS.size===1?`<p class="v2sub">Cochez un deuxième bien pour les comparer.</p>`:"";
  const L=[["Prix",r=>+r.b.prix,v=>eur(v),-1],["Surface",r=>+r.b.surface,v=>fr(v,0)+" m²",1],["Prix au m²",r=>+r.b.prix/(+r.b.surface||1),v=>eur(v),-1],["Ville · quartier",null,r=>esc(cityName(r.b.ville))+(r.b.quartier?" · "+esc(r.b.quartier):"")],
   [`Rendement 15 ans · ${scn()}`,r=>r.x.irr,v=>pctS(v),1],["Prudent · favorable",null,r=>`${pctS(r.z.prudent)} · ${pctS(r.z.favorable)}`],["Cash-flow",r=>r.x.cf,v=>sgn(v)+"/mois",1],["Mensualité",r=>r.x.mens,v=>eur(v),-1],["Budget tout compris",r=>r.x.cost,v=>keur(v),-1],
   ["Loyer hors charges",r=>r.x.rentHC,v=>eur(v),1],["Charges de copro (votre part)",r=>r.V?r.V.copro.v:null,v=>eur(v)+"/mois",-1],["Taxe foncière",r=>r.V?(r.V.tf.v||Math.round(r.x.tf*12)):null,v=>eur(v)+"/an",-1],["Travaux",r=>r.V?r.V.travaux.v:null,v=>eur(v),-1],
   ["DPE",null,r=>esc(r.b.dpe||"?")],["Statut",null,r=>stPill(r.b)],["Avis",null,r=>Object.entries(r.b.votes||{}).map(([k,c])=>`${esc(k)} : ${((VOT.find(x=>x[0]===c)||[])[1]||"").toLowerCase()}`).join("<br>")||"—"]];
  const rows=L.map(([l,g,f,dir])=>{const vals=R.map(r=>g?g(r):null), ok=vals.filter(v=>v!=null&&isFinite(v)), best=g&&dir&&ok.length>1?(dir>0?Math.max(...ok):Math.min(...ok)):null;
   return `<tr><th scope="row">${l}</th>${R.map((r,i)=>{const v=vals[i]; return `<td class="${g?"r mono":""}">${g?(v==null||!isFinite(v)?"n.d.":(best!=null&&v===best?`<b>${f(v)}</b>`:f(v))):f(r)}</td>`;}).join("")}</tr>`;}).join("");
  return `<div class="v2card"><div class="v2bar"><h2>Comparaison</h2><span class="v2sp"></span><button type="button" class="v2btn sm" data-v2cmpx>Effacer la sélection</button></div><div class="v2tw"><table class="v2t v2cmpt"><thead><tr><th></th>${R.map(r=>`<th><button type="button" data-v2open="b|${esc(r.b.id)}">${esc(r.b.titre||"Bien")}</button></th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div><p class="v2sub">En gras : la meilleure valeur de la ligne.</p></div>`;}
 /* qui vous êtes et le code commun : une seule carte, en tête tant qu'il manque l'un des deux */
 function ident(me,first){return `<div class="v2card"><h2>${first?"Vous deux":"Liste commune"}</h2><p class="v2sub">${sbCode()?`Partagée avec le code commun, sous le prénom « ${esc(me||"?")} » : biens, avis et réglages sont communs.`:"Votre prénom distingue vos avis de ceux de l'autre. Avec le même code commun, vous partagez la liste, les avis et les réglages ; sans code, tout reste dans ce navigateur."}</p><div class="v2grid v2f"><div><label for="v2nom2">Prénom</label><input type="text" id="v2nom2" maxlength="30" value="${esc(me)}" placeholder="Prénom"></div><div><label for="v2code">Code commun (le même pour vous deux)</label><input type="text" id="v2code" maxlength="60" value="${esc(sbCode())}" autocomplete="off" spellcheck="false"></div></div><div><button type="button" class="v2btn${first?" pri":""}" data-v2share>Enregistrer</button></div></div>`;}

 /* ---------- onglet Budget : critères, scénario, hypothèses ---------- */
 function sensi(){const c=C.find(v=>v.k===(V.city||"lemans"))||C[0], base=calc(c).irr, T=[["Hausse des prix",{px:0},{px:2},"0 % / 2 % par an"],["Loyer",{loyerAdj:H.loyerAdj-7},{loyerAdj:H.loyerAdj+7},"−7 % / +7 %"],["Vacance",{vacance:H.vacance+1},{vacance:Math.max(0,H.vacance-0.5)},"+1 mois / −½ mois"],["Hausse des loyers",{ly:H.ly-1},{ly:H.ly+0.5},`${fr(H.ly-1)} % / ${fr(H.ly+0.5)} % par an`],["Taux du crédit",{taux:H.taux+0.45},{taux:H.taux-0.45},`${fr(H.taux+0.45,2)} % / ${fr(H.taux-0.45,2)} %`],["Frais à la revente",{fraisVente:H.fraisVente+2},{fraisVente:Math.max(0,H.fraisVente-1)},`${fr(H.fraisVente+2)} % / ${fr(Math.max(0,H.fraisVente-1))} %`]];
  const run=m=>{const s={}; Object.keys(m).forEach(k=>{s[k]=H[k]; H[k]=m[k];}); const v=calc(c).irr; Object.assign(H,s); return v;};
  return `<p class="v2sub">${tyl()} à ${esc(c.name)}, ${pctS(base)} en ${scn()} :</p><div class="v2tw"><table class="v2t"><thead><tr><th>Hypothèse</th><th>Variation</th><th class="r">Rendement</th></tr></thead><tbody>${T.map(([l,a,b,t])=>`<tr><td>${l}</td><td>${t}</td><td class="r mono">${pctS(run(a))} / ${pctS(run(b))}</td></tr>`).join("")}</tbody></table></div>`;}
 function defOf(k){return TYK.includes(k)?typeDefaults(H.type)[k]:HDEF[k];}
 const HOLD=document.createElement("div"); HOLD.hidden=true; HOLD.id="v2hold"; app.appendChild(HOLD);   /* range les blocs de l'app montrés dans une page avant qu'elle ne soit redessinée */
 function pBudget(){document.querySelectorAll("#v2p-budget .v2src").forEach(n=>HOLD.appendChild(n)); const el=$("v2p-budget"), cr=critV(), ri=regInfo(), nch=[...HYPK,...TYK,"tmiA","tmiB","regime"].filter(k=>defOf(k)!=null&&H[k]!==defOf(k)).length,
  f=(k,l,u,st)=>{const d=defOf(k), ch=d!=null&&H[k]!==d; return `<div class="${ch?"v2chg":""}"><label for="v2h-${k}">${l} <span class="v2sub">(${u})</span></label><input type="number" id="v2h-${k}" data-v2h="${k}" step="${st}" value="${H[k]}">${ch?`<small class="v2def">défaut : ${d>=1000?nf(d):String(d).replace(".",",")}</small>`:""}</div>`;};
  el.innerHTML=`<div class="v2in"><div class="v2bar"><h1 class="v2h1">Budget et hypothèses</h1><span class="v2sp"></span>${nch?`<button type="button" class="v2btn sm" data-v2reset>Revenir aux valeurs par défaut (${nch} changée${nch>1?"s":""})</button>`:""}</div>
   <p class="v2sub v2regnote">${ri?`Communs à vous deux : un changement ici change les chiffres de l'autre.${ri.par?` Dernière modification par ${esc(ri.par)}${ri.le?" le "+esc(dateTxt(ri.le.slice(0,10))):""}.`:""}`:"Pas encore partagés : sans code commun (onglet Nos biens), ces réglages restent dans ce navigateur."} Les valeurs différentes du défaut sont signalées.</p>
   <div class="v2card"><h2>Nos critères</h2><p class="v2sub" style="font-size:15px;color:var(--fg)">${tyl()} · budget tout compris jusqu'à <b>${keur(cr.budget)}</b> · rendement au moins <b>${fr(cr.rmin)} %</b> · ${cr.bank?"la banque doit suivre":"avec ou sans la banque"}</p><div><button type="button" class="v2btn" data-v2crit>Modifier les critères</button></div></div>
   <div class="v2card"><h2>Scénario affiché partout (le vôtre)</h2>${scnSeg()}<p class="v2sub">Ce choix ne change que votre écran. Prudent : loyer −5 %, un demi-mois vide de plus par an, prix +0,5 %/an. Favorable : l'inverse. Le central sert à comparer, le prudent à vérifier qu'on tient si ça tourne mal.</p></div>
   <div class="v2card"><h2>Le crédit et le foyer</h2><div class="v2grid v2f">${f("apport","Apport","€",500)}${f("taux","Taux du crédit","%",0.05)}${f("duree","Durée","ans",1)}${f("salaires","Revenus nets du foyer","€/mois",50)}${f("pretEtud","Autres crédits en cours","€/mois",10)}${f("notaire","Frais de notaire","%",0.5)}</div></div>
   <div class="v2card"><h2>Le bien et sa location</h2><p class="v2sub">Valeurs par défaut pour tous les ${typl()} (chaque type garde les siennes).${(()=>{const n=BIENS.filter(b=>!isOut(b)&&(+b.travaux>0||+b.meubles>0)).length; return n?` Meubles ou travaux remplacés par une valeur saisie dans ${n} bien${n>1?"s":""} suivi${n>1?"s":""}.`:"";})()}</p><div class="v2grid v2f">${f("surface","Surface type","m²",1)}${f("surcote","Prix payé vs prix moyen","%",5)}${f("loyerAdj","Loyer obtenu vs loyer médian","%",5)}${f("vacance","Vacance","mois/an",0.5)}${f("chLoc","Charges payées par le locataire","€/mois",5)}${f("copro","Charges de copro (votre part)","€/mois",1)}${f("grosTrav","Gros travaux copro (provision)","€/m²/an",1)}${f("autres","Assurance PNO, entretien","€/mois",5)}${f("meubles","Meubles","€",250)}${f("travaux","Petits travaux","€",250)}</div></div>
   <div class="v2card"><h2>Le long terme</h2><div class="v2grid v2f">${f("px","Hausse des prix","%/an",0.5)}${f("ly","Hausse des loyers","%/an",0.5)}${f("fraisVente","Frais à la revente","%",0.5)}</div></div>
   <div class="v2card"><h2>Impôts</h2><div class="v2grid v2f"><div><label for="v2-reg">Régime</label><select id="v2-reg" data-v2fin="regime">${[["auto","Le plus avantageux"],["micro","Micro-BIC"],["reel","Réel"]].map(([k,l])=>`<option value="${k}"${H.regime===k?" selected":""}>${l}</option>`).join("")}</select></div>${["tmiA","tmiB"].map((k,i)=>`<div><label for="v2-${k}">Tranche d'imposition ${i?"de votre binôme":"de l'un"}</label><select id="v2-${k}" data-v2fin="${k}">${[0,11,30,41,45].map(t=>`<option value="${t}"${H[k]===t?" selected":""}>${t} %</option>`).join("")}</select></div>`).join("")}</div></div>
   <div class="v2card"><h2>Ce qui pèse le plus</h2>${sensi()}</div>
   <div class="v2card"><h2>Méthode et sources</h2><p class="v2sub">Ce sont des estimations, pas un conseil financier, fiscal ni bancaire : vérifiez chaque chiffre (notaire, banque, comptable) avant de signer. Ventes réelles DVF, carte des loyers de l'État et annonces de location meublée, Insee, Géorisques, OpenStreetMap, ADEME (DPE), annonces Bien'ici relevées chaque soir.</p><div id="v2srcslot"></div><p class="v2sub">Code : <a href="https://github.com/LM28000/immobilier-tool" target="_blank" rel="noopener">github.com/LM28000/immobilier-tool</a></p></div></div>`;
  /* méthode, sources et fraîcheur des données (blocs de body.html), rangés dans la carte Sources */
  const slot=$("v2srcslot"); document.querySelectorAll("#appHold .v2src, #v2hold .v2src").forEach(n=>slot.appendChild(n)); HOLD.querySelectorAll(".v2src").forEach(n=>slot.appendChild(n));}

 /* ---------- fiche unique en onglets ---------- */
 const FT=[["bien","Le bien",["suivi","annonce"]],["prix","Le prix",["prix","ann"]],["calc","Le calcul",["poids","loyer","calc"]],["quartier","Le quartier",["traj","vie","bati","risq","hab","ecoles","urba"]],["achat","L'achat",["visite","src"]]];
 function secs(html){const d=document.createElement("div"); d.innerHTML=html; const S={}; d.querySelectorAll("details.fsec").forEach(s=>{s.open=true; S[s.dataset.sec]=s.outerHTML;}); const at=d.querySelector(".fattn"); return {S,attn:at?at.outerHTML:""};}
 function bienOfSel(s){const [k,...r]=s.split("|"); if(k==="b"){const b=BIENS.find(x=>x.id===r[0]); return b?{b,kind:"b"}:null;}
  if(k==="v"){const ck=r[0], suf=r.slice(1).join("|"), a=(ADS[ck]&&ADS[ck].ventes||[]).find(v=>v[3]===suf); if(!a) return null; const ex=bienOf(VTURL+suf); return {b:Object.assign(venteBien(ck,a),{kind:"v",suf}),a,ck,suf,ex:ex&&!isOut(ex)?ex:null,kind:"v"};}
  return null;}
 function prixNuage(b,t){const ty=H.type, D=typeof dvfC==="function"?dvfC(b.ville,ty):null, q=D&&t?D.q[t.code]:null, s=+b.surface||22, pm=+b.prix/s, ref=(t?studioPm2(b.ville,t,ty):studioPm2(b.ville,null,ty))*pm2Adj(ty,s);
  const pts=[]; (q&&q.last||[]).forEach(v=>pts.push({x:v[2],y:v[1]/v[2],c:cv("var(--muted)"),shape:"sq",t:`Vente ${v[0]} · ${eur(v[1])} · ${v[2]} m²`}));
  feed().filter(o=>o.ck===b.ville&&o.t&&t&&o.t.code===t.code&&o.a[3]!==b.suf).forEach(o=>pts.push({x:o.a[0],y:o.a[2]/o.a[0],c:cv(colIrr(o.x.irr)),r:4,op:.75,open:key(o),t:`Annonce ${keur(o.a[2])} · ${o.a[0]} m²`}));
  pts.push({x:s,y:pm,c:cv("var(--accent)"),r:8,on:true,t:"Ce bien"}); const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y).concat([ref]), dif=(pm/ref-1)*100;
  return `<p class="v2sub" style="color:var(--fg)">Prix au m² <b>${dif>=0?"+":"−"}${fr(Math.abs(dif),0)} %</b> par rapport aux ventes réelles ${t?"du quartier":"de la ville"} (ramenées à ${String(s).replace(".",",")} m²). Carrés : dernières ventes du quartier. Ronds : autres annonces du quartier.</p>`
   +nuage({label:"Prix au mètre carré selon la surface",w:460,h:280,x:[Math.max(0,Math.floor(Math.min(...xs)/5)*5-5),Math.ceil(Math.max(...xs)/5)*5+5],y:[Math.floor(Math.min(...ys)/500)*500-250,Math.ceil(Math.max(...ys)/500)*500+250],xf:v=>v+" m²",yf:v=>fr(v/1000,1)+" k",xl:"surface",yl:"€/m²",pts,lines:[{y:ref,t:`${t?"quartier":"ville"} à ${String(s).replace(".",",")} m²`}]});}
 /* l'offre est celle de nos biens (visite.offre, la même que dans la grille de visite) : commune à deux ; sur une annonce pas encore suivie, ce n'est qu'un essai */
 function offre(b,id,bb){const P=+b.prix, sv=bb?+((bb.visite||{}).offre)||0:0, pc=OFFT[id]!=null?OFFT[id]:sv?Math.round(sv/P*1000)/10:100, prix=OFFT[id]!=null||!sv?Math.round(P*pc/100/500)*500:sv, y=calcBien(Object.assign({},b,{prix})).x;
  const keep=OFFT[id]!=null&&prix!==sv, cpd=bb&&bb.suivi&&bb.suivi.compromis||"";
  const rows=[100,97.5,95,92.5,90,87.5,85].map(p=>{const pr=Math.round(P*p/100/500)*500, z=calcBien(Object.assign({},b,{prix:pr})).x; return `<tr${pr===prix?' class="on"':""}><td class="r mono">${eur(pr)}<small class="v2sub" style="display:block;font-size:11.5px">${p===100?"affiché":"−"+fr(100-p,1)+" %"}</small></td><td class="r mono" style="color:${cv(colIrr(z.irr))};font-weight:700">${pctS(z.irr)}</td><td class="r mono" style="color:${cfC(z.cf)}">${sgn(z.cf)}</td><td class="r mono">${eur(z.mens)}</td></tr>`;}).join("");
  return `<div class="v2sec"><h3>Faire une offre</h3><div class="v2f"><label for="v2off" class="v2offx">Prix proposé : <b class="mono" style="color:var(--fg)">${eur(prix)}</b> (${pc>=100?"prix affiché":"−"+fr(100-pc,1)+" %"})</label><input type="range" id="v2off" min="70" max="100" step="0.5" value="${Math.max(70,Math.min(100,pc))}" data-v2off="${esc(id)}"${bb?` data-v2offb="${esc(bb.id)}"`:""}></div>
   <p class="v2sub v2offx" style="margin:0">${bb?(sv&&!keep?`Offre enregistrée pour vous deux : <b class="mono">${eur(sv)}</b>.`:keep?"Lâchez le curseur : l'offre est enregistrée pour vous deux.":"Choisissez un prix : il sera enregistré pour vous deux."):`Essai seulement. <button type="button" class="v2btn sm" data-v2offkeep="${esc(id)}">Garder cette offre (suit le bien)</button>`}</p>
   <div class="v2kp v2offx"><div class="v2k"><span>Rendement 15 ans à ce prix</span><b style="color:${cv(colIrr(y.irr))}">${pctS(y.irr)}</b><small>${scn()}</small></div><div class="v2k"><span>Cash-flow · mensualité</span><b style="color:${cfC(y.cf)}">${sgn(y.cf)}</b><small>mensualité ${eur(y.mens)}</small></div></div>
   <div class="v2tw v2offx"><table class="v2t v2tight"><thead><tr><th class="r">Offre</th><th class="r">Rendement 15 ans</th><th class="r">Cash-flow</th><th class="r">Mensualité</th></tr></thead><tbody>${rows}</tbody></table></div>
   ${bb?`<div class="v2f"><label for="v2cpd">Date du compromis</label><input type="date" id="v2cpd" value="${esc(cpd)}" data-suivi="${esc(bb.id)}|compromis"></div>${cpd?`<ol style="margin:0;padding-left:20px;line-height:1.8">${suiviSteps(bb).filter(x=>x.d&&x.k!=="offre"&&x.k!=="reponse").map(x=>`<li>${esc(x.l)} : ${esc(dateTxt(x.d))}</li>`).join("")}</ol>`:`<p class="v2sub">Indiquez la date du compromis pour voir les échéances jusqu'à l'acte (communes à vous deux, comme dans le suivi de l'achat).</p>`}`:""}</div>`;}
 /* la visite : les points de la grille de visite de nos biens (visite.check), communs à deux */
 function visite(b,id,bb){const r=calcBien(b), y=r.x, tv=r.V?r.V.travaux:null, ck=bb&&(bb.visite||{}).check||{};
  const nT=CHECK.reduce((s,g)=>s+g[1].length,0), nOk=Object.values(ck).filter(v=>v==="oui").length, nKo=Object.values(ck).filter(v=>v==="non").length, nV=Object.values(ck).filter(v=>v==="oui"||v==="non").length;
  return `<div class="v2sec"><h3>Visite</h3><p style="margin:0">Travaux : <b class="mono">${tv?eur(tv.v):"n.d."}</b> <span class="v2sub">(${tv&&tv.src==="saisi"?"saisis, au lieu de "+eur(tv.est)+" estimés":"estimés avant visite"})</span> · rendement 15 ans <b class="mono" style="color:${cv(colIrr(y.irr))}">${pctS(y.irr)}</b></p>
   <p class="v2sub" style="margin:0">Après la visite, remplacez l'estimation par le devis ou votre constat : la valeur vaut pour vous deux. <button type="button" class="v2btn sm" data-v2ft="calc" data-v2focus="pw-travaux">Modifier les travaux</button></p>
   ${bb?`<p style="margin:0">Grille de visite : <b class="mono">${nV}/${nT}</b> points vérifiés${nKo?` · <span style="color:var(--bad);font-weight:700">${nKo} problème${nKo>1?"s":""}</span>`:nOk?" · rien d'inquiétant":""}.</p><div><button type="button" class="v2btn" data-visit="${esc(bb.id)}">Ouvrir la grille de visite (${nT} points, à deux)</button></div>`
    :`<p class="v2sub" style="margin:0">La grille de visite (${nT} points, documents à demander) se remplit à deux sur un bien suivi.</p><div><button type="button" class="v2btn" data-v2star="${esc(b.ville)}|${esc(b.suf||"")}">☆ Suivre ce bien</button></div>`}</div>`;}
 function ficheBien(sel){const R=bienOfSel(sel); if(!R) return null; const b=R.b, id=R.kind==="b"?"b"+b.id:sel, r=calcBien(b), x=r.x, z=irr3(x)||{}, t=r.t, fx=ficx(R.kind==="v"?R.suf:(bienSuf(b)||""))||{};
  const {S,attn}=secs(bienFicheBody(b,{noHead:true}));
  const lo=-4,hi=12,p=v=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100)), c=cv(colIrr(x.irr)), [bc,bt]=bank(x.ratio);
  const ph=R.kind==="v"?(R.a[4]?photoUrl(R.a[3],R.a[4],960,540):""):bienPhoto(b,960,540), bb=R.kind==="b"?b:R.ex, on=!!bb;
  const [me,oth]=people(), dpe=b.dpe||fx.dpe;
  const tit=String(R.kind==="b"?(b.titre||"Bien"):b.titre).split(" · ")[0], ann=R.kind==="v"?R.a[1]:b.quartier, qn=t?t.name:b.quartier||"";
  const chips=`${bc!=="p-ok"?`<span class="v2pill ${bc==="p-warn"?"warn":"bad"}" title="part des revenus prise par les crédits">Banque : ${bt.toLowerCase()} · ${Math.round(x.ratio*100)} % des revenus</span>`:""}${dpe?`<span class="v2pill ${"FG".includes(dpe)?"bad":dpe==="E"?"warn":""}">DPE ${dpe}${dpe==="G"?" · location interdite":dpe==="F"?" · interdite en 2028":dpe==="E"?" · interdite en 2034":""}</span>`:""}${R.kind==="v"?ficheBadges(R.suf,true)||"":""}`;
  const head=`<div class="v2fhd">${ph?`<img class="v2fth" src="${esc(ph)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:""}<div class="v2fhdt"><h2 class="v2ft">${keur(+b.prix)} · ${esc(tit)}</h2><p class="v2sub">${esc(cityName(b.ville))}${qn?" · quartier "+esc(qn):""}${ann&&qn&&ann!==qn?` <span title="nom du secteur dans l'annonce">(« ${esc(ann)} » dans l'annonce)</span>`:""} · ${eur(+b.prix/(+b.surface||1))}/m² ${R.kind==="v"?_vuBadgesF("v",R.ck,R.suf):""}</p></div></div>
   <div class="v2kp v2kp3"><div class="v2k"><span>Rendement 15 ans · ${scn()}</span><b style="color:${c}">${pctS(x.irr)}</b><div class="v2bigbar" aria-hidden="true">${z.prudent!=null?`<i style="left:${p(z.prudent)}%;width:${p(z.favorable)-p(z.prudent)}%;background:${c}"></i>`:""}<b style="left:${p(x.irr)}%;background:${c}"></b></div><small>prudent ${pctS(z.prudent)} · favorable ${pctS(z.favorable)}</small></div>
    <div class="v2k"><span>Cash-flow à deux</span><b style="color:${cfC(x.cf)}">${sgn(x.cf)}</b><small>par mois · loyer ${eur(x.rentHC)} HC</small></div><div class="v2k"><span>Mensualité</span><b>${eur(x.mens)}</b><small>budget ${keur(x.cost)} tout compris</small></div></div>
   ${chips?`<div class="v2chips">${chips}</div>`:""}
   <div class="v2bar">${R.kind==="v"?`<button type="button" class="v2btn${on?"":" pri"}" data-v2star="${R.ck}|${esc(R.suf)}" aria-pressed="${on}">${on?"★ Dans la shortlist":"☆ Ajouter à la shortlist"}</button>`:`${stPill(b)}<button type="button" class="v2btn sm" data-unshort="${esc(b.id)}">Retirer</button>`}${b.url?`<a class="v2btn sm" href="${esc(b.url)}" target="_blank" rel="noopener">Voir l'annonce ↗</a>`:""}${bb?`<button type="button" class="v2btn sm" data-fiche="${esc(bb.id)}">Fiche à emporter</button>`:""}</div>
   ${bb?`<div class="v2sec"><h3>À deux</h3><div class="v2vrow"><b>${esc(me||"Vous")}</b>${me?voteBtns(bb,me):`<span class="v2sub">indiquez votre prénom dans Nos biens</span>`}</div>${oth.map(o=>`<div class="v2vrow"><b>${esc(o)}</b>${voteTxt(bb,o)}</div>`).join("")}</div>`:""}`;
  const extra={prix:prixNuage(b,t),achat:offre(b,id,bb)+visite(b,id,bb),bien:attn};
  return {title:`${keur(+b.prix)} · ${cityName(b.ville)}`,head,S,extra};}
 const dl=L=>`<dl class="v2dl">${L.filter(Boolean).map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>`;
 function ficheQV(sel){const [k,ck,code]=sel.split("|");
  if(k==="q"){const t=IR[ck]&&IR[ck].list.find(v=>v.code===code); if(!t) return null; const {S,attn}=secs(quartierFiche(t)); let x=null; try{x=t.type==="H"?(QX[t.ck+t.i]||calcIris(t)):null;}catch(_){}
   const A=feed().filter(o=>o.ck===ck&&o.t&&o.t.code===code), m=A.filter(pass).length;
   const kp=x&&x.irr!=null?`<div class="v2kp v2kp3"><div class="v2k"><span>Rendement 15 ans · ${scn()}</span><b style="color:${cv(colIrr(x.irr))}">${pctS(x.irr)}</b><small>${tyl().toLowerCase()} type de ${H.surface} m²</small></div><div class="v2k"><span>Cash-flow</span><b style="color:${cfC(x.cf)}">${sgn(x.cf)}</b><small>par mois</small></div><div class="v2k"><span>Budget</span><b>${keur(x.cost)}</b><small>tout compris</small></div></div>`:"";
   const bref=`<div class="v2sec"><h3>En bref</h3>${dl([["Annonces pour nos critères",A.length?`<b>${m}</b> sur ${A.length} dans le quartier`:"aucune annonce relevée dans le quartier"],x&&x.irr!=null&&["Loyer hors charges",`${eur(x.rentHC)} par mois`]])}</div>`;
   return {title:`${t.name} · ${cityName(ck)}`,head:`<h2 class="v2ft">${esc(t.name)}</h2><p class="v2sub">Quartier de ${esc(cityName(ck))}</p>${kp}`,S,extra:{bien:bref+attn},city:ck};}
  if(k==="c"){const c=C.find(v=>v.k===ck); if(!c) return null; const {S,attn}=secs(villeFiche(c)); const x=calc(c), z=irr3(x)||{}, [m,n]=cityCnt(ck);
   const bref=`<div class="v2sec"><h3>En bref</h3>${dl([["Annonces pour nos critères",n?`<b>${m}</b> sur ${n}`:"pas d'annonces relevées"],[`Prix d'${tyLow()==="studio"?"un studio":"un "+tyl()} type`,`${keur(x.bien)} pour ${H.surface} m² (${nf(x.bien/H.surface)} €/m²)`],["Loyer hors charges",`${eur(x.rentHC)} par mois`],["Étudiants",nf(c.students)],["Paris en train",hm(c.paris)],c.note&&["À savoir",esc(c.note)]])}</div>`;
   return {title:c.name,head:`<h2 class="v2ft">${esc(c.name)}</h2><div class="v2kp v2kp3"><div class="v2k"><span>Rendement 15 ans · ${scn()}</span><b style="color:${cv(colIrr(x.irr))}">${pctS(x.irr)}</b><small>prudent ${pctS(z.prudent)} · favorable ${pctS(z.favorable)}</small></div><div class="v2k"><span>Cash-flow</span><b style="color:${cfC(x.cf)}">${sgn(x.cf)}</b><small>par mois</small></div><div class="v2k"><span>Budget</span><b>${keur(x.cost)}</b><small>tout compris</small></div></div><p class="v2sub" style="margin:0">Moyenne d'${tyLow()==="studio"?"un studio":"un "+tyl()} type dans la ville.</p>`,S,extra:{bien:bref+attn}};}
  return null;}
 function fiche(){const el=$("v2fiche"); if(!V.sel){el.hidden=true; el.innerHTML=""; return;}
  const F=V.sel[0]==="v"||V.sel[0]==="b"?ficheBien(V.sel):ficheQV(V.sel); if(!F){V.sel=null; el.hidden=true; return;}
  const tabs=FT.filter(([k,,ss])=>ss.some(s=>F.S[s])||(F.extra[k]&&F.extra[k].length)); let cur=tabs.some(t=>t[0]===V.ftab)?V.ftab:(tabs[0]||["bien"])[0];
  const g=FT.find(t=>t[0]===cur)||FT[0], zone=V.sel[0]==="c"||V.sel[0]==="q";
  el.hidden=false; el.innerHTML=`<div class="v2fh"><button type="button" class="v2btn sm" data-v2close aria-label="Fermer la fiche">${PH()?"Retour":"×"}</button><b>${esc(F.title)}</b></div>
   <div class="v2fb">${F.head}<div class="v2tabs2" role="group" aria-label="Rubriques de la fiche">${tabs.map(([k,l])=>`<button type="button" data-v2ft="${k}" aria-pressed="${k===cur}">${zone&&k==="bien"?"En bref":zone&&k==="achat"?"Sources":l}</button>`).join("")}</div>
   ${F.extra[cur]||""}${g[2].map(s=>F.S[s]||"").join("")}</div>`;
  if(M) requestAnimationFrame(()=>M.resize());}
 function openSel(s,keepTab){V.sel=s; flyAd(s); if(!keepTab&&(s[0]==="v"||s[0]==="b")&&!["bien","prix","calc","quartier","achat"].includes(V.ftab)) V.ftab="bien"; fiche(); if(V.tab==="carte"){mapList(); drawMap();} else paint(V.tab); $("v2fiche").scrollTop=0;}

 /* ---------- ajouter un bien à la main ----------
    Le formulaire de l'app (recherche d'adresse, quartier, contrôles, envoi dans la liste commune) est déplacé dans une fenêtre,
    puis remis à sa place à la fermeture. */
 let ADDHOME=null;
 function addDlg(){const f=$("biensForm"); if(!f||document.querySelector(".v2dlg")) return; if(!ADDHOME) ADDHOME=[f.parentNode,f.nextSibling];
  const d=document.createElement("div"); d.className="v2dlg"; d.innerHTML=`<div class="v2dlgb" role="dialog" aria-modal="true" aria-labelledby="v2aT"><div class="v2bar"><h2 id="v2aT" class="v2h1">Ajouter un bien</h2><span class="v2sp"></span><button type="button" class="v2btn sm" data-v2addx>Fermer</button></div><p class="v2sub">Une annonce repérée ailleurs : le calcul reprend nos réglages, le loyer et la vacance du quartier. Indiquez au moins le prix et la surface ; l'adresse permet de trouver le quartier.</p><div id="v2addslot"></div></div>`;
  document.body.appendChild(d); $("v2addslot").appendChild(f);
  const st=$("biensState"); if(st){st.textContent=""; const mo=new MutationObserver(()=>{if(/Bien ajouté/.test(st.textContent)){mo.disconnect(); setTimeout(()=>{addClose(); toast("Bien ajouté à nos biens."); V.tab="biens"; save(); show();},400);}}); mo.observe(st,{childList:true,characterData:true,subtree:true}); d._mo=mo;}
  const i=f.querySelector("input"); if(i) i.focus();}
 function addClose(){const d=document.querySelector(".v2dlg"), f=$("biensForm"); if(f&&ADDHOME&&f.closest(".v2dlg")) ADDHOME[0].insertBefore(f,ADDHOME[1]); if(d){if(d._mo) d._mo.disconnect(); d.remove();}}

 /* ---------- dialogue des critères (premier lancement) ---------- */
 function critDlg(first){if(document.querySelector(".v2dlg")) return; const d=document.createElement("div"); d.className="v2dlg"; const c=critV();
  const n=()=>feed().filter(o=>o.x.cost<=+$("v2cB").value&&o.x.irr>=+$("v2cR").value&&(!$("v2cK").checked||bankOk(o.x.ratio))).length;
  d.innerHTML=`<form aria-labelledby="v2cT"><h2 id="v2cT" class="v2h1">${first?"Que cherchez-vous ?":"Nos critères"}</h2><p class="v2sub">Ces critères filtrent la carte, le tableau et le nuage${regShared()?", pour vous deux":""}. Vous pourrez les changer à tout moment.</p>
   <div class="v2f"><label>Type de bien</label><span class="v2seg" role="group" aria-label="Type de bien">${Object.entries(TYPES).map(([k,T])=>`<button type="button" data-type="${k}" aria-pressed="${H.type===k}">${T.lab}</button>`).join("")}</span></div>
   <div class="v2f"><label for="v2cB">Budget tout compris : <b class="mono" id="v2cBv" style="color:var(--fg)"></b></label><input type="range" id="v2cB" min="40000" max="250000" step="5000" value="${c.budget}"></div>
   <div class="v2f"><label for="v2cR">Rendement 15 ans minimum : <b class="mono" id="v2cRv" style="color:var(--fg)"></b></label><input type="range" id="v2cR" min="-3" max="8" step="0.5" value="${c.rmin}"></div>
   <label style="display:flex;gap:10px;align-items:center;min-height:40px"><input type="checkbox" id="v2cK"${c.bank?" checked":""} style="width:20px;height:20px;accent-color:var(--accent)">La banque doit suivre</label>
   <p style="margin:0;font-size:16px"><b class="mono" id="v2cN"></b> annonces correspondent aujourd'hui.</p>
   <div class="v2bar"><span class="v2sp"></span>${first?"":'<button type="button" class="v2btn" data-v2cx>Annuler</button>'}<button type="submit" class="v2btn pri">Voir le marché</button></div></form>`;
  document.body.appendChild(d); const up=()=>{$("v2cBv").textContent=keur(+$("v2cB").value); $("v2cRv").textContent=fr(+$("v2cR").value)+" %"; $("v2cN").textContent=n();};
  ["v2cB","v2cR","v2cK"].forEach(i=>$(i).addEventListener("input",up)); up();
  d.addEventListener("click",e=>{if(e.target.closest("[data-type]")) setTimeout(()=>{FEED=null; d.querySelectorAll("[data-type]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.type===H.type))); up();},0); if(e.target.closest("[data-v2cx]")) d.remove();});
  d.querySelector("form").addEventListener("submit",e=>{e.preventDefault(); NOSCRIT={budget:+$("v2cB").value,rmin:+$("v2cR").value,bank:$("v2cK").checked}; saveCrit(); V.vue="crit"; save(); d.remove(); refresh();});
  $("v2cB").focus();}

 /* ---------- affichage ---------- */
 function paint(k){if(k==="annonces") pAnnonces(); else if(k==="villes") pVilles(); else if(k==="biens") pBiens(); else if(k==="budget") pBudget(); else {mapList(); mapLegend(); drawMap();}}
 function show(){TABS.forEach(([k])=>{$("v2p-"+k).hidden=k!==V.tab;}); top(); paint(V.tab); fiche(); vuSnap();
  if(V.tab==="carte") mapLib(()=>{mapInit(); requestAnimationFrame(()=>M&&M.resize());});}
 /* une relecture de la liste commune (toutes les 20 s) ne repeint pas la page pendant qu'on tape dans un champ : elle attend qu'on en sorte */
 let RQ=0, RWAIT=false; const typing=()=>{const a=document.activeElement; return !!(a&&app.contains(a)&&a.matches("input:not([type=range]):not([type=checkbox]),select,textarea"));};
 function refresh(){cancelAnimationFrame(RQ); RQ=requestAnimationFrame(()=>{FEED=null; if(typing()){RWAIT=true; top(); return;} RWAIT=false; top(); paint(V.tab); fiche(); vuSnap();});}
 app.addEventListener("focusout",()=>{if(RWAIT) setTimeout(()=>{if(!typing()) refresh();},0);});

 /* ---------- événements ---------- */
 document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-v2tab],[data-v2scn],[data-v2vue],[data-v2av],[data-v2cv],[data-v2sort],[data-v2more],[data-v2star],[data-v2vote],[data-v2ft],[data-v2close],[data-v2crit],[data-v2min],[data-v2nom],[data-v2share],[data-v2city],[data-v2open],[data-v2gonew],[data-v2reset],[data-v2offkeep],[data-v2csort],[data-v2add],[data-v2addx],[data-v2cmpx]"); if(!t||!app.contains(t)&&!t.closest(".v2dlg")) return; const d=t.dataset;
  if(d.v2tab!=null){e.preventDefault(); V.tab=d.v2tab; save(); show(); return;}
  if(d.v2gonew){V.tab="annonces"; V.vue=d.v2gonew; V.n=60; save(); show(); return;}
  if(d.v2scn){H.pess=d.v2scn==="prudent"; H.fav=d.v2scn==="favorable"; try{localStorage.setItem("scn",d.v2scn);}catch(_){} const p=$("f-pess"); if(p) p.checked=H.pess; if(typeof CALCC!=="undefined") CALCC.clear(); if(typeof VC!=="undefined") VC.clear(); render(); return;}
  if(d.v2vue){V.vue=d.v2vue; V.n=60; save(); refresh(); if(V.tab==="carte") drawMap(); return;}
  if(d.v2av){V.aview=d.v2av; save(); refresh(); return;}
  if(d.v2cv){V.cview=d.v2cv; save(); refresh(); return;}
  if(d.v2sort){V.sort=[d.v2sort,V.sort[0]===d.v2sort?-V.sort[1]:-1]; save(); refresh(); return;}
  if(d.v2csort){const cs=V.csort||["irr",-1]; V.csort=[d.v2csort,cs[0]===d.v2csort?-cs[1]:-1]; save(); refresh(); return;}
  if(d.v2more!=null){V.n+=60; refresh(); return;}
  if(d.v2star){e.stopPropagation(); const [ck,...r]=d.v2star.split("|"); Promise.resolve(mStar(ck,r.join("|"))).then(()=>setTimeout(refresh,300)); return;}
  if(d.v2vote){e.stopPropagation(); const [id,c]=d.v2vote.split("|"), b=BIENS.find(x=>x.id===id), me=myName(); if(!b||!me) return; const v=Object.assign({},b.votes||{}); if(v[me]===c) delete v[me]; else v[me]=c; updBien(id,{votes:v}); return;}
  if(d.v2ft){V.ftab=d.v2ft; save(); fiche(); const fe=$("v2fiche"), tb=fe.querySelector(".v2tabs2"), hh=(fe.querySelector(".v2fh")||{}).offsetHeight||0;
   const pv=tb&&tb.previousElementSibling, top0=pv?pv.offsetTop+pv.offsetHeight+14:0;   /* place de la barre d'onglets avant qu'elle ne colle en haut */
   if(tb&&fe.scrollTop>top0-hh) fe.scrollTop=top0-hh;   /* on arrive au début de l'onglet, pas au milieu */
   const fo=d.v2focus&&$(d.v2focus); if(fo){fo.scrollIntoView({block:"center"}); fo.focus({preventScroll:true}); return;}
   const f=document.querySelector(`.v2tabs2 [data-v2ft="${d.v2ft}"]`); if(f) f.focus({preventScroll:true}); return;}
  if(d.v2close!=null){V.sel=null; fiche(); if(V.tab==="carte"){mapList(); drawMap();} else paint(V.tab); return;}
  if(d.v2crit!=null){critDlg(false); return;}
  if(d.v2add!=null){addDlg(); return;}
  if(d.v2addx!=null){addClose(); return;}
  if(d.v2cmpx!=null){CMPS.clear(); refresh(); return;}
  if(d.v2reset!=null){if(confirm(regShared()?"Revenir aux valeurs par défaut pour vous deux ? Vos critères et vos biens ne changent pas.":"Revenir aux valeurs par défaut ? Vos critères et vos biens ne changent pas.")) regReset(); return;}
  if(d.v2offkeep){const [k,ck,...r]=d.v2offkeep.split("|"), suf=r.join("|"), P=(ADS[ck]&&ADS[ck].ventes||[]).find(v=>v[3]===suf); if(!P) return; const pr=Math.round(P[2]*(OFFT[d.v2offkeep]??100)/100/500)*500;
   Promise.resolve(mStar(ck,suf)).then(()=>setTimeout(()=>{const b=bienOf(VTURL+suf); if(b){delete OFFT[d.v2offkeep]; updBien(b.id,{visite:Object.assign(visCopy(b),{offre:pr})});}},600)); return;}
  if(d.v2min!=null){V.min=!V.min; save(); mapList(); return;}
  if(d.v2nom!=null){const n=($("v2nom").value||"").trim(); if(n){try{localStorage.setItem("biens-nom",n);}catch(_){} refresh();} return;}
  if(d.v2share!=null){const n=($("v2nom2").value||"").trim(), c=($("v2code").value||"").trim(), chg=c!==sbCode(); try{localStorage.setItem("biens-nom",n); localStorage.setItem("biens-code",c);}catch(_){} if(chg) location.reload(); else {toast("Enregistré."); refresh();} return;}
  if(d.v2city!=null&&!e.target.closest("[data-v2open]")){goCity(d.v2city); return;}
  if(d.v2open){if(e.target.closest("button,a,input,select,[data-stmenu]")&&!t.matches("button")) return; openSel(d.v2open); return;}});
 document.addEventListener("keydown",e=>{const t=e.target; if((e.key==="Enter"||e.key===" ")&&t.matches&&t.matches("[data-v2open],[data-v2city],[data-v2gonew],.v2nrow")&&!t.matches("button")){e.preventDefault(); t.click();}
  if(e.key==="Escape"){const dl=document.querySelector(".v2dlg"); if(dl&&dl.querySelector("[data-v2addx]")){addClose(); return;} if(dl&&dl.querySelector("[data-v2cx]")){dl.remove(); return;}}
  if(e.key==="Escape"&&V.sel&&!document.querySelector(".v2dlg")&&$("visitPanel").hidden&&$("fichePanel").hidden){V.sel=null; fiche(); paint(V.tab);}});
 document.addEventListener("input",e=>{const t=e.target, d=t.dataset; if(!d) return;
  /* curseur d'offre : seuls les chiffres autour changent (le curseur reste sous le doigt) */
  if(d.v2off){OFFT[d.v2off]=+t.value; const R=V.sel&&bienOfSel(V.sel); if(!R) return; const b=R.b, tmp=document.createElement("div");
   tmp.innerHTML=offre(b,R.kind==="b"?"b"+b.id:V.sel,R.kind==="b"?b:R.ex); const nw=tmp.querySelectorAll(".v2offx"), old=$("v2fiche").querySelectorAll(".v2offx");
   if(nw.length===old.length) old.forEach((o,i)=>{o.innerHTML=nw[i].innerHTML;});}});
 document.addEventListener("change",e=>{const t=e.target, d=t.dataset; if(!d) return;
  if(d.v2h){const v=+t.value; if(isFinite(v)){H[d.v2h]=v; if(TYK.includes(d.v2h)) saveTyv(d.v2h); else saveHyp(); if(typeof CALCC!=="undefined") CALCC.clear(); if(typeof VC!=="undefined") VC.clear(); render();}}
  else if(d.v2fin){H[d.v2fin]=d.v2fin==="regime"?t.value:+t.value; if(typeof saveFin==="function") saveFin(); if(typeof CALCC!=="undefined") CALCC.clear(); if(typeof VC!=="undefined") VC.clear(); render();}
  else if(d.v2cmp){if(t.checked){if(CMPS.size>=4){t.checked=false; toast("Quatre biens au plus."); return;} CMPS.add(d.v2cmp);} else CMPS.delete(d.v2cmp); refresh();}
  else if(d.v2offb){const b=BIENS.find(x=>x.id===d.v2offb); if(!b) return; const pr=Math.round(+b.prix*(+t.value)/100/500)*500; delete OFFT[d.v2off]; updBien(b.id,{visite:Object.assign(visCopy(b),{offre:pr})});}});
 /* l'app recalcule (type, scénario, hypothèses, liste partagée, annonces reçues) : la v2 suit */
 const _render=render; render=function(){_render.apply(this,arguments); refresh(); if(V.tab==="carte") drawMap();};
 document.addEventListener("biens",refresh);   /* la liste commune a changé (11-nos-biens.js) */
 /* liens des fiches : une annonce s'ouvre dans la fiche, une location sur Bien'ici, « toutes les sources » dans Budget */
 document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("#v2fiche [data-ad], #v2fiche [data-opensrc]"); if(!a) return; const inner=e.target.closest("button,a,input,select"); if(inner&&inner!==a) return; e.preventDefault();
  if(a.dataset.opensrc!=null){V.tab="budget"; save(); show(); const s=$("sources"); if(s){s.open=true; s.scrollIntoView({block:"start"});} return;}
  const [k,ck,...r]=a.dataset.ad.split("|"), id=r.join("|"); if(k==="v") openSel(`v|${ck}|${id}`); else if(k==="l") window.open(ADURL+id,"_blank","noopener");});
 addEventListener("resize",()=>{if(M) M.resize();});

 /* ---------- départ ---------- */
 show();
 let CRITASK=false; const askCrit=()=>{if(CRITASK) return; CRITASK=true; if(!NOSCRIT) critDlg(true);};
 if(REGREADY) setTimeout(askCrit,300); else {document.addEventListener("reglages",()=>setTimeout(askCrit,300),{once:true}); setTimeout(askCrit,6000);}
})();
