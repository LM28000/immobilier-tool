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
 const DEF={tab:"carte",city:null,vue:"crit",aview:"tableau",cview:"tableau",sort:["irr",-1],ftab:"bien",n:60,min:false,tous:false};
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
 /* mode « Tous » : studios, T2 et T3 ensemble, chaque annonce calculée avec son type (le type courant revient ensuite) ;
    la liste est gardée jusqu'au prochain recalcul (réglages, liste commune, annonces reçues) */
 const TYS=["studio","t2","t3"];
 function feedType(){return feedList({}).filter(o=>o.x&&o.x.irr!=null&&!horsCalcul(o.a[3]));}
 function feed(){if(FEED) return FEED; STATS={};
  if(V.tous){const t0=H.type; FEED=[]; try{TYS.forEach(t=>{setType(t,true); feedType().forEach(o=>{o.ty=t; FEED.push(o);});});}finally{setType(t0,true);}}
  else FEED=feedType();
  FEED.forEach(o=>{o.ty=o.ty||H.type; o.f=ficx(o.a[3])||{}; o.id=o.a[3];}); return FEED;}
 /* villes et quartiers en mode « Tous » : médiane des vraies annonces (au moins 3), sinon rien */
 let STATS={};
 const med=a=>{const b=a.filter(v=>v!=null&&isFinite(v)).sort((x,y)=>x-y), m=b.length>>1; return b.length?(b.length%2?b[m]:(b[m-1]+b[m])/2):null;};
 function stats(ck,code){const k=ck+"|"+(code||""); if(STATS[k]) return STATS[k]; const A=feed().filter(o=>o.ck===ck&&(!code||o.t&&o.t.code===code)), ok=A.length>=3;
  return STATS[k]={n:A.length,irr:ok?med(A.map(o=>o.x.irr)):null,cf:ok?med(A.map(o=>o.x.cf)):null,cost:ok?med(A.map(o=>o.x.cost)):null,rentHC:ok?med(A.map(o=>o.x.rentHC)):null,tous:true};}
 /* chiffres d'une ville : le type courant (son quartier du milieu, voir calcVille), ou la médiane des annonces en mode « Tous » */
 const cx=c=>V.tous?stats(c.k):calcVille(c);
 const cz=x=>V.tous?{}:(irr3(x)||{});
 const colX=x=>x&&x.irr!=null?cv(colIrr(x.irr)):"#9aa3ad";
 const tyLabel=()=>V.tous?"Tous types":tyl(), typlL=()=>V.tous?"annonces":typl();
 const tyOfO=o=>TYPES[o.ty||H.type].lab;
 const z3=o=>o.z||(o.z=irr3(o.x)||{});
 const inShort=o=>{const b=bienOf(o.url); return !!(b&&!isOut(b));};
 const pass=o=>{const c=critV(); return o.x.cost<=c.budget&&o.x.irr>=c.rmin&&(!c.bank||bankOk(o.x.ratio));};
 const VUES=[["crit","Nos critères",o=>pass(o)],["new","Nouvelles",o=>o.nw&&pass(o)],["drop","Baisses",o=>!!(o.v&&o.v.last)],["long","60 j et +",o=>!!(o.v&&o.v.days>=60)],["short","Shortlist",inShort],["all","Toutes",()=>true]];
 function market(city){let L=feed(); if(city) L=L.filter(o=>o.ck===city); const f=(VUES.find(v=>v[0]===V.vue)||VUES[0])[2]; L=L.filter(f);
  const [k,d]=V.sort, g={irr:o=>o.x.irr,cf:o=>o.x.cf,p:o=>o.a[2],m2:o=>o.a[2]/o.a[0],s:o=>o.a[0],new:o=>o.nw?1:0,age:o=>o.v?o.v.days:0}[k]||(o=>o.x.irr);
  return L.slice().sort((a,b)=>(g(a)-g(b))*d);}
 function vueChips(city){const L=city?feed().filter(o=>o.ck===city):feed();
  return VUES.map(([k,l,f])=>`<button type="button" class="v2chip" data-v2vue="${k}" aria-pressed="${V.vue===k}">${l}<small>${L.filter(f).length}</small></button>`).join("");}
 const rng=(o,w)=>{const z=z3(o), lo=-4, hi=12, p=v=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100)), c=cv(colIrr(o.x.irr)); if(z.prudent==null) return "";
  return `<span class="v2rng" style="width:${w||80}px" title="prudent ${pctS(z.prudent)} · favorable ${pctS(z.favorable)}" aria-label="de ${pctS(z.prudent)} à ${pctS(z.favorable)}"><i style="left:${p(z.prudent)}%;width:${p(z.favorable)-p(z.prudent)}%;background:${c}"></i><b style="left:${p(o.x.irr)}%;background:${c}"></b></span>`;};
 const titre=o=>`${tyOfO(o)} ${String(o.a[0]).replace(".",",")} m²${o.a[1]?" · "+o.a[1]:""}`;
 const where=o=>`${cityName(o.ck)}${o.t?" · "+o.t.name:""}`;
 const photo=(o,w,h)=>o.a[4]?photoUrl(o.a[3],o.a[4],w,h):"";
 /* marge de négociation : ancienneté (publication ou première vue) et baisses de prix */
 const dropPct=o=>o.v&&o.v.drops&&o.v.first>o.a[2]?(1-o.a[2]/o.v.first)*100:0;
 const ageTxt=o=>o.v?`en ligne depuis ${o.v.days} jour${o.v.days>1?"s":""}${o.v.drops?` · ${o.v.drops} baisse${o.v.drops>1?"s":""}, −${fr(dropPct(o),0)} %`:""}`:"";
 const ageChip=o=>o.v&&(o.v.days>=30||o.v.drops)?`<span class="v2age${o.v.days>=60?" long":""}" title="${esc(ageTxt(o))}">${o.v.days} j${o.v.drops?` · ↓${fr(dropPct(o),0)} %`:""}</span>`:"";
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
  if(!rows.length&&PH()) return N.first?"":`<p class="v2sub v2news0">Rien de neuf depuis le ${dm(N.since||jourIso())}.</p>`;
  return `<section class="v2news" aria-label="Ce qui a bougé"><h2>${h}</h2>${rows.length?rows.join(""):`<p class="v2sub">${empty}</p>`}</section>`;}
 const cityCnt=ck=>{const A=feed().filter(o=>o.ck===ck); return [A.filter(pass).length,A.length];};

 /* ---------- squelette ---------- */
 const TABS=[["carte","Carte"],["annonces","Annonces"],["villes","Villes"],["biens","Nos biens"],["budget","Budget"]];
 const ICO={carte:'<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',annonces:'<path d="M4 6h16M4 12h16M4 18h10"/>',villes:'<path d="M4 20V9l5-3v14M9 20V4l6 3v13M15 20v-9l5 2v7M3 20h18"/>',biens:'<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',budget:'<path d="M17.5 6.5A7 7 0 1 0 17.5 17.5M4 10.5h9M4 13.5h9"/>'};
 const app=document.createElement("div"); app.id="v2app";
 app.innerHTML=`<header class="v2top"><span class="v2brand">Notre studio</span><nav class="v2tabs" aria-label="Rubriques" id="v2tabs"></nav><span class="v2sp"></span><span id="v2type"></span><span class="v2scnw" id="v2scn"></span><button type="button" class="v2btn sm" data-v2crit>Critères</button><button type="button" class="v2btn sm v2thm" id="v2thm" data-v2theme=""></button></header>
  <div class="v2main"><section class="v2page" id="v2p-carte" style="display:flex;overflow:hidden"><div class="v2mapwrap"><div id="v2map" role="region" aria-label="Carte"></div><div class="v2mlist" id="v2mlist"></div><div class="v2mleg" id="v2mleg"></div></div></section>
  <section class="v2page" id="v2p-annonces" hidden></section><section class="v2page" id="v2p-villes" hidden></section><section class="v2page" id="v2p-biens" hidden></section><section class="v2page" id="v2p-budget" hidden></section>
  <aside class="v2fiche" id="v2fiche" hidden aria-label="Fiche"></aside></div>
  <nav class="v2tabbar" id="v2tabbar" aria-label="Rubriques"></nav>`;
 document.body.appendChild(app);
 function top(){NEWS=bouge(); const [me,oth]=people(), att=new Set(BIENS.filter(b=>!isOut(b)&&etat(b,me,oth)[0]==="des").map(b=>b.id)); NEWS.them.forEach(([b])=>att.add(b.id));
  const nb=att.size, t=(k,l)=>`${l}${k==="biens"&&nb?`<small title="à trancher ou modifiés par l'autre">${nb}</small>`:""}`;
  $("v2tabs").innerHTML=TABS.map(([k,l])=>`<button type="button" data-v2tab="${k}" aria-current="${V.tab===k?"page":"false"}">${t(k,l)}</button>`).join("");
  $("v2tabbar").innerHTML=TABS.map(([k,l])=>`<button type="button" data-v2tab="${k}" aria-current="${V.tab===k?"page":"false"}"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[k]}</g></svg>${l}${k==="biens"&&nb?`<small class="v2bdg">${nb}</small>`:""}</button>`).join("");
  $("v2type").innerHTML=`<span class="v2seg" role="group" aria-label="Type de bien">${Object.entries(TYPES).map(([k,T])=>`<button type="button" data-type="${k}" aria-pressed="${!V.tous&&H.type===k}">${T.lab}</button>`).join("")}<button type="button" data-v2tous aria-pressed="${!!V.tous}" title="Studios, T2 et T3 ensemble">Tous</button></span>`;
  $("v2scn").innerHTML=scnSeg();
  const th=$("v2thm"), dk=DARK(); th.setAttribute("aria-label",dk?"Passer au thème clair":"Passer au thème sombre"); th.title=th.getAttribute("aria-label");
  th.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${dk?'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>':'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'}</g></svg>`;}
 const scnSeg=()=>`<span class="v2seg" role="group" aria-label="Scénario">${[["prudent","Prudent"],["central","Central"],["favorable","Favorable"]].map(([k,l])=>`<button type="button" data-v2scn="${k}" aria-pressed="${scn()===k}">${l}</button>`).join("")}</span>`;

 /* ---------- carte (MapLibre, fonds vectoriels OpenFreeMap, sans clé) ----------
    Tout est sur la carte en même temps et le zoom décide de ce qu'on voit, sans bouton :
    - de loin, l'Ouest à plat : les 21 villes, colorées par leur rendement ;
    - en approchant d'une ville (zoom 9 à 10) : ses quartiers colorés, puis ses annonces ; la carte s'incline et la liste suit
      la ville la plus proche du centre ;
    - de près (zoom 13 et plus, là où les tuiles ont les immeubles) : les immeubles montent en 3D, la carte s'incline davantage.
    L'inclinaison suit le zoom tant qu'on ne l'a pas réglée soi-même (jusqu'au retour sur l'Ouest).
    Fond clair (positron) ou sombre (dark) selon le thème, mêmes couches par-dessus. Repères (gares, campus, centre) : petits
    marqueurs HTML de la ville suivie. Sans WebGL, un message renvoie aux listes. */
 const MLV="4.7.1", MLJS=`https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/${MLV}/maplibre-gl.js`, MLCSS=`https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/${MLV}/maplibre-gl.css`;
 const DARK=()=>document.documentElement.getAttribute("data-theme")==="dark";
 const MLSTYLE=()=>"https://tiles.openfreemap.org/styles/"+(DARK()?"dark":"positron");
 const ZQ=9, ZA=9.5, ZV=10, Z3=13.2;   /* paliers : quartiers, annonces, ville (inclinée, liste de la ville), immeubles */
 const P1=()=>PH()?35:45, P2=()=>PH()?45:58;   /* inclinaison en ville, puis de près */
 let ML=null, M=null, MREADY=false, LCITY=null, LTRY=false, RMK=[], RCK=null, POP=null, HQ=null, PB=0, MANP=false, QSIG=null, QSK="", QNSET=false, QBR=null, PT=0, DOWN=false, WHL=0;
 window.V2MAPN={villes:0,quartiers:0,annonces:0,qnoms:0,lignes:0,err:[]};
 /* lignes de bus, tram et métro des 21 réseaux (data/lignes.js, tools/gtfs_lignes.py) : chargées à part, une fois, quand la carte s'ouvre */
 let LIGF=null, LIGT=false;
 function polyDec(s){const P=[]; let i=0, la=0, lo=0; while(i<s.length){for(const k of [0,1]){let r=0, sh=0, b; do{b=s.charCodeAt(i++)-63; r|=(b&31)<<sh; sh+=5;}while(b>=32&&i<=s.length); const d=r&1?~(r>>1):r>>1; if(k) lo+=d; else la+=d;} P.push([lo/1e5,la/1e5]);} return P;}
 const TTYP={0:"Tram",1:"Métro",3:"Bus",11:"Trolleybus"};
 function lignesLoad(){if(LIGF||LIGT) return; LIGT=true; const go=()=>{if(typeof LIGNES==="undefined"||!LIGNES.villes) return; const F=[];
   Object.entries(LIGNES.villes).forEach(([ck,v])=>(v.l||[]).forEach(l=>(l.g||[]).forEach(g=>{const P=polyDec(g); if(P.length>1) F.push({type:"Feature",properties:{c:l.c,tr:l.t===0||l.t===1,f:l.f||0,t:`${TTYP[l.t]||"Ligne"} ${l.n}${l.nm?" · "+l.nm:""} (${v.reseau})`},geometry:{type:"LineString",coordinates:P}});})));
   LIGF=F; if(M&&MREADY){const s=M.getSource("lignes"); if(s) s.setData({type:"FeatureCollection",features:F}); V2MAPN.lignes=F.length;}};
  if(typeof LIGNES!=="undefined") return go();
  const sc=document.createElement("script"); sc.src=(/\/dist\//.test(location.pathname)?"../":"")+"data/lignes.js"+(typeof LIGNESV!=="undefined"?"?v="+LIGNESV:""); sc.onload=go; sc.onerror=()=>{LIGT=false;}; document.head.appendChild(sc);}
 /* quartiers colorés par le rendement (par défaut) ou une autre mesure : une seule teinte, du clair au foncé (inversée en sombre),
    5 classes dont les bornes sont les quintiles des quartiers des 21 villes ; le rouge, l'orange et le vert restent au rendement */
 const RAMP=()=>DARK()?["#104281","#1c5cab","#2a78d6","#6da7ec","#b7d3f6"]:["#b7d3f6","#86b6ef","#3987e5","#1c5cab","#0d366b"];
 const POIC=()=>DARK()?["#9085e9","#d55181"]:["#6250d6","#e87ba4"];   /* autour d'un bien : arrêts et gares (violet), commerces du quotidien (rose) */
 const nb=v=>{if(!isFinite(v)||!v) return v; const e=Math.pow(10,Math.floor(Math.log10(Math.abs(v)))-1); return Math.round(v/e)*e;};   /* deux chiffres significatifs */
 const typeDe=()=>tyLow()==="studio"?"d'un studio":"d'un "+tyl();
 const QM={irr:{l:"Rendement"},
  prix:{l:"Prix au m²",f:t=>studioPm2(t.ck,t),u:v=>`${nf(v)} €/m²`,d:()=>`prix d'achat ${typeDe()}, d'après les ventes`},
  loyer:{l:"Loyer",f:t=>{const x=QX[t.ck+t.i]; return x?x.rentHC:null;},u:v=>`${eur(v)} HC`,d:()=>`loyer hors charges ${typeDe()} de ${H.surface} m²`},
  traj:{l:"Trajet",f:t=>{const r=trajOf(t); return r&&r.length?Math.min(...r.map(o=>o.best)):null;},u:v=>`${Math.round(v)} min`,d:()=>"jusqu'à la gare, la fac ou le centre, à pied ou en bus"},
  poi:{l:"Commerces",f:t=>{const p=poiOf(t); return p?p[0]:null;},u:v=>`${fr(v,1)}/10`,d:()=>"commerces et services à pied (note sur 10)"},
  etu:{l:"Étudiants",f:t=>{const h=habOf(t); return h?h.scol:null;},u:v=>`${fr(v,0)} % d'étudiants`,d:()=>"part des habitants en études (18-24 ans)"},
  rev:{l:"Revenus",f:t=>{const h=habOf(t); return h&&h.med?h.med:null;},u:v=>`${nf(v)} €/an`,d:()=>"revenu médian des habitants"},
  dpe:{l:"DPE F ou G",f:t=>t.dpe&&t.dpe.reduce((a,b)=>a+b,0)>=5?fgPct(t.dpe):null,u:v=>`${fr(v,0)} % en F-G`,d:()=>"petits appartements classés F ou G"},
  inond:{l:"Zone inondable",f:t=>{const r=risqOf(t); return r&&r.t?1:0;},u:v=>v?"zone inondable":"hors zone inondable",d:()=>"centre du quartier en zone inondable (TRI)",bin:true}};
 const qmK=()=>QM[V.qm]?V.qm:"irr";
 function qBreaks(k){const m=QM[k]; if(m.bin) return [.5]; const A=[];
  C.forEach(c=>{if(!IR[c.k]) return; IR[c.k].list.forEach(t=>{if(t.type!=="H"||!t.price) return; let v=null; try{v=m.f(t);}catch(_){} if(v!=null&&isFinite(v)) A.push(v);});});
  A.sort((a,b)=>a-b); if(!A.length) return [0]; const B=[.2,.4,.6,.8].map(p=>nb(A[Math.min(A.length-1,Math.floor(p*A.length))])); return B.filter((v,i)=>!i||v>B[i-1]);}
 const qCol=(v,B)=>{let i=0; while(i<B.length&&v>=B[i]) i++; return RAMP()[Math.round(i*4/B.length)];};
 /* précision de la position d'une annonce : Bien'ici floute souvent l'adresse (0 exacte, 1 à 100 m près, 2 approchée, 3 secteur seulement) */
 const posQ=f=>!f||f.la==null?null:f.r===0?0:f.r!=null&&f.r<=100?1:f.r!=null&&f.r<=400?2:3;
 const mpp0=la=>40075016.686*Math.cos(la*Math.PI/180)/512;   /* mètres par pixel au zoom 0 (tuiles de 512 px) */
 const hasLL=b=>!!(b&&isFinite(+b.lat)&&isFinite(+b.lon)&&+b.lat&&+b.lon);
 function posTxt(f,own,bien){const q=own?0:posQ(f);
  return own?"à l'adresse saisie":q==null?(bien?"pas encore sur la carte : saisissez son adresse pour l'y placer":"pas sur la carte : l'annonce ne donne pas de position"):q===0?"à l'adresse exacte, donnée par l'annonce":q===1?`à ${f.r} m près (l'annonce ne donne pas l'adresse exacte)`:f.r!=null?`position approchée, à ${f.r} m près : l'annonce ne donne pas l'adresse ; la zone possible est dessinée sur la carte`:"position approchée, sans précision donnée : l'annonce ne donne pas l'adresse ; un cercle de 400 m est dessiné autour";}
 const POIK={bus_stop:"Arrêt de bus",bus_station:"Gare routière",tram_stop:"Arrêt de tram",station:"Gare",halt:"Halte ferroviaire",subway_entrance:"Métro",supermarket:"Supermarché",convenience:"Supérette",bakery:"Boulangerie",pharmacy:"Pharmacie",greengrocer:"Primeur",butcher:"Boucherie",deli:"Épicerie fine"};
 const poiTxt=p=>`${POIK[p.subclass]||(p.class==="bus"?"Arrêt de bus":p.class==="rail"?"Gare ou arrêt":"Commerce")}${p["name:latin"]||p.name?" · "+(p["name:latin"]||p.name):""}`;   /* ce que la carte montre, et les couches refusées (tests) */
 const mapMsg=t=>{$("v2map").innerHTML=`<p class="v2empty">${t} Les annonces restent dans les onglets Annonces et Villes.</p>`;};
 function mapLib(cb){if(window.maplibregl) return cb(); if(LTRY) return; LTRY=true;
  const l=document.createElement("link"); l.rel="stylesheet"; l.href=MLCSS; document.head.appendChild(l);
  const s=document.createElement("script"); s.src=MLJS; s.onload=cb; s.onerror=()=>mapMsg("La carte n'a pas pu se charger (hors ligne ?)."); document.head.appendChild(s);}
 const webgl=()=>{try{const c=document.createElement("canvas"); return !!(c.getContext("webgl2")||c.getContext("webgl"));}catch(_){return false;}};
 const sheetH=()=>{const l=$("v2mlist"); return l?l.offsetHeight:260;};   /* téléphone : la liste couvre le bas de la carte */
 /* la carte pivote autour du centre de la partie visible : la liste (à gauche, ou en bas sur téléphone) est une marge permanente
    de la carte ; sans elle, les boutons + et −, l'inclinaison et la rotation tournaient autour d'un point caché sous la liste
    et la ville glissait vers la droite à chaque zoom */
 const padP=()=>{const l=$("v2mlist"), m=$("v2map"); if(!l||!m) return {top:0,left:0,right:0,bottom:0}; const L=l.getBoundingClientRect(), R=m.getBoundingClientRect();
  return PH()?{top:0,left:0,right:0,bottom:Math.max(0,Math.round(R.bottom-L.top))}:{top:0,left:L.height>R.height*.5?Math.max(0,Math.round(L.right-R.left)):0,right:0,bottom:0};};
 function padSync(){if(!M||DOWN||M.isMoving()) return; const p=padP(), c=M.getPadding(); if(["top","left","right","bottom"].some(k=>Math.abs((c[k]||0)-p[k])>2)) M.setPadding(p);}
 const pad=()=>PH()?{top:60,left:56,right:56,bottom:12}:{top:40,left:24,right:40,bottom:40};   /* marges du cadrage, en plus de la marge permanente */
 const EMPTY={type:"FeatureCollection",features:[]};
 const km=(la1,lo1,la2,lo2)=>Math.hypot((lo2-lo1)*Math.cos(la1*Math.PI/180)*111.32,(la2-la1)*110.57);
 function mapInit(){if(M||!window.maplibregl) return; if(!webgl()){mapMsg("Cette carte demande WebGL, indisponible dans ce navigateur."); return;}
  ML=window.maplibregl;
  try{M=new ML.Map({container:"v2map",style:MLSTYLE(),center:[-0.6,47.75],zoom:6,minZoom:4,maxZoom:18.5,maxPitch:70,attributionControl:false});}catch(e){M=null; mapMsg("La carte n'a pas pu démarrer."); return;}
  M.addControl(new ML.AttributionControl({compact:true}),PH()?"top-right":"bottom-right");
  if(!PH()) M.addControl(new ML.NavigationControl({visualizePitch:true}),"top-right");   /* boutons : zoom, boussole (inclinaison et rotation) */
  /* une couche refusée par MapLibre ne lève pas d'erreur : elle est notée (les tuiles et polices manquantes, elles, sont ignorées) */
  M.on("error",e=>{const er=e&&e.error, m=String(er&&er.message||er||""); if(!(er&&er.status)&&!/fetch|network|load|glyph|tile|abort/i.test(m)&&V2MAPN.err.length<10) V2MAPN.err.push(m);});
  M.on("load",()=>{padSync(); mapLayers(); MREADY=true; if(FLYP&&FLYP===V.sel&&selPos(FLYP).f){LCITY=V.city; drawMap(); flyAd(FLYP,true); FLYP=null;} else drawMap(true); lignesLoad(); M.on("resize",()=>setTimeout(padSync,0)); const at=$("v2map").querySelector(".maplibregl-ctrl-attrib"); if(at) at.classList.remove("maplibregl-compact-show");});   /* sources de la carte repliées (bouton i) */
  $("v2map").parentNode.classList.add("v2zw");   /* départ sur l'Ouest : pas de légende des quartiers */
  M.on("click",mapClick);
  /* survol (souris seulement) : une fois par image au plus, rien pendant que la carte bouge ; la bulle disparaît dès que la carte bouge ou que la souris sort */
  if(!PH()){let HR=0, HE=null; M.on("mousemove",e=>{HE=e; if(!HR) HR=requestAnimationFrame(()=>{HR=0; mapHover(HE);});}); M.on("mouseout",hoverOff); M.on("movestart",hoverOff);}
  /* gestes en cours (doigt ou bouton appuyé, molette récente) : l'inclinaison automatique attend qu'ils soient finis */
  const cont=M.getCanvasContainer(); cont.addEventListener("pointerdown",()=>{DOWN=true;},true); ["pointerup","pointercancel"].forEach(ev=>addEventListener(ev,()=>{DOWN=false;},true));
  cont.addEventListener("wheel",()=>{WHL=Date.now();},{capture:true,passive:true});
  M.on("movestart",e=>{if(!(e&&e.v2auto)) clearTimeout(PT); if(TPOP) TPOP.remove();});
  M.on("moveend",mapMoved);
  M.on("pitchstart",e=>{if(e&&e.originalEvent) MANP=true;});   /* inclinaison réglée à la main : on n'y touche plus */
  window.V2MAP=()=>M;}
 function mapLayers(){const dk=DARK(), L=M.getStyle().layers, lab=(L.find(l=>l.type==="symbol")||{}).id, below=M.getLayer("building")?"building":lab;
  /* les noms des villes ont leur propre source : sans police (hors ligne), seuls les noms manquent, pas les cercles */
  ["villes","vnoms","quartiers","qnoms","asel"].forEach(s=>{if(!M.getSource(s)) M.addSource(s,{type:"geojson",data:EMPTY});});
  /* annonces regroupées quand elles se recouvrent (même immeuble, ou même position approchée) ; les nombres ont leur propre source
     (mêmes données, mêmes regroupements) : sans police, seuls les nombres manquent */
  const CLU={type:"geojson",data:EMPTY,cluster:true,clusterRadius:9,clusterMaxZoom:19,maxzoom:20,clusterProperties:{irr:["max",["get","irr"]],st:[["any",["accumulated"],["get","st"]],["get","st"]],nw:[["any",["accumulated"],["get","nw"]],["get","nw"]]}};
  ["annonces","anombres"].forEach(s=>{if(!M.getSource(s)) M.addSource(s,Object.assign({},CLU));});
  if(!M.getSource("lignes")) M.addSource("lignes",{type:"geojson",data:LIGF?{type:"FeatureCollection",features:LIGF}:EMPTY}); V2MAPN.lignes=LIGF?LIGF.length:0;
  const zf=(a,b,v0,v1)=>["interpolate",["linear"],["zoom"],a,v0,b,v1], hov=["boolean",["feature-state","hover"],false];
  /* quartiers : apparaissent en approchant d'une ville, sous les immeubles et les rues (la ville se lit à travers) ;
     de près, la teinte s'éclaircit pour laisser voir les immeubles */
  const qo=k=>["case",hov,["+",["*",["get","op"],k],.2],["*",["get","op"],k]];
  M.addLayer({id:"q-fill",type:"fill",source:"quartiers",minzoom:ZQ-.6,paint:{"fill-color":["get","c"],"fill-opacity":["interpolate",["linear"],["zoom"],ZQ-.6,0,ZQ+.3,qo(1),12.5,qo(1),15,qo(dk?.5:.6)]}},below);
  M.addLayer({id:"q-line",type:"line",source:"quartiers",minzoom:ZQ-.6,paint:{"line-color":dk?"#0b1020":"#ffffff","line-opacity":zf(ZQ-.6,ZQ+.3,0,.85),"line-width":zf(10,15,.6,1.8)}},below);
  /* immeubles en 3D, sur les deux fonds : ils montent entre les zooms 13 et 14 */
  if(M.getSource("openmaptiles")){
   if(M.getLayer("building-3d")) M.setLayoutProperty("building-3d","visibility","none");
   if(M.getLayer("building")) M.setLayerZoomRange("building",M.getLayer("building").minzoom||0,13);   /* les immeubles à plat laissent la place aux immeubles en relief */
   M.addLayer({id:"b3d",type:"fill-extrusion",source:"openmaptiles","source-layer":"building",minzoom:13,filter:["!",["has","hide_3d"]],
    paint:{"fill-extrusion-color":dk?"#46536b":"#d9d6cf","fill-extrusion-opacity":.9,
     "fill-extrusion-height":zf(13,14,0,["coalesce",["get","render_height"],8]),"fill-extrusion-base":zf(13,14,0,["coalesce",["get","render_min_height"],0])}},lab);
   /* autour : lignes de tram et de métro en ville ; de près, arrêts, gares et commerces du quotidien (données du fond de carte) */
   const PC=POIC();
   /* trains : voies principales du fond de carte, en traits de chemin de fer, dès que l'on voit la région */
   const rail=["all",["==",["get","class"],"rail"],["!",["has","service"]],["match",["get","brunnel"],["tunnel"],false,true]];
   M.addLayer({id:"p-rail",type:"line",source:"openmaptiles","source-layer":"transportation",minzoom:8,filter:rail,layout:{"line-join":"round"},
    paint:{"line-color":dk?"#8b96a6":"#5b6472","line-width":zf(8,15,1,3),"line-opacity":zf(8,8.6,0,.85)}},lab);
   M.addLayer({id:"p-rail2",type:"line",source:"openmaptiles","source-layer":"transportation",minzoom:11,filter:rail,
    paint:{"line-color":dk?"#0b1020":"#ffffff","line-width":zf(11,15,.6,1.6),"line-dasharray":[2,3],"line-opacity":zf(11,11.6,0,1)}},lab);
   M.addLayer({id:"p-dot",type:"circle",source:"openmaptiles","source-layer":"poi",minzoom:14,
    filter:["any",["match",["get","class"],["bus","rail"],true,false],["match",["get","subclass"],["supermarket","convenience","bakery","pharmacy","greengrocer","butcher","deli"],true,false]],
    paint:{"circle-color":["case",["match",["get","class"],["bus","rail"],true,false],PC[0],PC[1]],"circle-radius":zf(14,18,2.6,5.5),
     "circle-opacity":zf(14,14.4,0,1),"circle-stroke-color":dk?"#0b1020":"#ffffff","circle-stroke-width":1,"circle-stroke-opacity":zf(14,14.4,0,1)}});}
  /* lignes de bus, tram et métro, aux couleurs du réseau ; les plus fréquentées un peu plus épaisses, tram et métro par-dessus */
  const tr=["boolean",["get","tr"],false], fq=["min",1,["/",["get","f"],150]];
  M.addLayer({id:"p-lig",type:"line",source:"lignes",minzoom:10.5,layout:{"line-join":"round","line-cap":"round","line-sort-key":["case",tr,2,1]},
   paint:{"line-color":["get","c"],"line-width":["interpolate",["linear"],["zoom"],10.5,["case",tr,1.8,["+",.5,fq]],16,["case",tr,5.5,["+",1.6,["*",2,fq]]]],
    "line-opacity":["interpolate",["linear"],["zoom"],10.5,0,11.2,["case",tr,.9,.55]]}},M.getLayer("p-dot")?"p-dot":undefined);   /* sous les arrêts, les annonces et les noms */
  /* noms des quartiers, en approchant (source à part : sans police, seuls les noms manquent) */
  M.addLayer({id:"q-lab",type:"symbol",source:"qnoms",minzoom:12.3,layout:{"text-field":["get","lab"],"text-font":["Noto Sans Regular"],"text-size":zf(12.3,16,11,13.5),"text-max-width":8,"symbol-sort-key":["get","rk"],"text-padding":4},
   paint:{"text-color":dk?"#c9d1dc":"#3b4656","text-halo-color":dk?"#0b1020":"#ffffff","text-halo-width":1.5,"text-opacity":zf(12.3,12.9,0,1)}});
  /* annonces : de plus en plus grosses en approchant ; anneau orange : shortlist, bleu : nouvelle ;
     point plein : adresse exacte ou à 100 m près, point creux : position approchée (la zone possible est dessinée quand l'annonce est ouverte) */
  const sel=["boolean",["get","sel"],false], st=["boolean",["get","st"],false], nw=["boolean",["get","nw"],false], ap=["boolean",["get","ap"],false], seul=["!",["has","point_count"]];
  const irrC=["step",["coalesce",["get","irr"],-99],cv("var(--bad)"),2.5,cv("var(--warn)"),5,cv("var(--ok)")];
  M.addLayer({id:"a-zone",type:"circle",source:"asel",minzoom:ZA,filter:ap,paint:{
   "circle-radius":["interpolate",["exponential",2],["zoom"],0,["get","rz"],22,["*",["get","rz"],4194304]],"circle-pitch-alignment":"map","circle-pitch-scale":"map",
   "circle-color":["get","c"],"circle-opacity":.13,"circle-stroke-color":["get","c"],"circle-stroke-width":1.6,"circle-stroke-opacity":.85}});
  const dot=(id,src,f)=>{M.addLayer({id,type:"circle",source:src,minzoom:ZA-.5,filter:f,paint:{
   "circle-radius":["interpolate",["linear"],["zoom"],ZA-.5,["case",sel,7,3.5],12,["case",sel,11,7],16,["case",sel,14,10]],
   "circle-color":["get","c"],"circle-opacity":zf(ZA-.5,ZA,0,1),"circle-stroke-opacity":zf(ZA-.5,ZA,0,1),
   "circle-stroke-color":["case",st,"#e08a00",nw,"#2f47b3",dk?"#0b1020":"#ffffff"],"circle-stroke-width":["case",["any",st,nw,sel],2.5,1.2]}});
   M.addLayer({id:id.replace("dot","hole"),type:"circle",source:src,minzoom:ZA-.5,filter:["all",f,ap],paint:{
   "circle-radius":["interpolate",["linear"],["zoom"],ZA-.5,["case",sel,3,1.3],12,["case",sel,5,3],16,["case",sel,6.5,4.6]],
   "circle-color":dk?"#0b1020":"#ffffff","circle-opacity":zf(ZA-.5,ZA,0,1)}});};
  dot("a-dot","annonces",seul);
  /* pastille d'un groupe : couleur du meilleur rendement du groupe, son nombre d'annonces au milieu */
  M.addLayer({id:"a-clu",type:"circle",source:"annonces",minzoom:ZA-.5,filter:["has","point_count"],paint:{
   "circle-radius":["interpolate",["linear"],["zoom"],ZA-.5,["+",6,["*",1.2,["sqrt",["get","point_count"]]]],16,["+",12,["*",2,["sqrt",["get","point_count"]]]]],
   "circle-color":irrC,"circle-opacity":zf(ZA-.5,ZA,0,1),"circle-stroke-opacity":zf(ZA-.5,ZA,0,1),
   "circle-stroke-color":["case",["boolean",["get","st"],false],"#e08a00",["boolean",["get","nw"],false],"#2f47b3",dk?"#0b1020":"#ffffff"],"circle-stroke-width":2.5}});
  M.addLayer({id:"a-clu-n",type:"symbol",source:"anombres",minzoom:ZA,filter:["has","point_count"],layout:{"text-field":["to-string",["get","point_count"]],"text-font":["Noto Sans Bold"],"text-size":zf(ZA,16,10,13),"text-allow-overlap":true,"text-ignore-placement":true},
   paint:{"text-color":"#ffffff","text-halo-color":"rgba(0,0,0,.35)","text-halo-width":.8}});
  dot("a-sdot","asel",["boolean",true]);   /* l'annonce ouverte, au-dessus des groupes */
  /* villes : de loin seulement, elles s'effacent quand les quartiers arrivent */
  const vo=zf(ZQ-.4,ZQ+.5,["get","op"],0);
  M.addLayer({id:"v-dot",type:"circle",source:"villes",maxzoom:ZV,paint:{"circle-radius":["get","r"],"circle-color":["get","c"],"circle-opacity":vo,"circle-stroke-color":"#ffffff","circle-stroke-width":2,"circle-stroke-opacity":vo}});
  M.addLayer({id:"v-lab",type:"symbol",source:"vnoms",maxzoom:ZV,layout:{"text-field":["get","lab"],"text-font":["Noto Sans Bold"],"text-size":12.5,"text-variable-anchor":["bottom","top","right","left"],"text-radial-offset":1.15,"symbol-sort-key":["get","rk"],"text-padding":2},
   paint:{"text-color":dk?"#e5e9f0":"#18202c","text-halo-color":dk?"#0b1020":"#ffffff","text-halo-width":1.7,"text-opacity":vo}});}
 /* contour d'un quartier (latitude, longitude comme Leaflet) en GeoJSON (longitude, latitude), anneaux fermés */
 function geoPoly(g){const dep=a=>Array.isArray(a)?1+dep(a[0]):0, ring=r=>{const o=r.filter(p=>isFinite(p[0])&&isFinite(p[1])).map(p=>[p[1],p[0]]); if(o.length&&(o[0][0]!==o[o.length-1][0]||o[0][1]!==o[o.length-1][1])) o.push(o[0]); return o;};
  const d=dep(g); return d===2?{type:"Polygon",coordinates:[ring(g)]}:d===3?{type:"Polygon",coordinates:g.map(ring)}:d===4?{type:"MultiPolygon",coordinates:g.map(p=>p.map(ring))}:null;}
 function bbox(P){let a=180,b=90,c=-180,d=-90; P.forEach(([x,y])=>{if(x<a)a=x; if(y<b)b=y; if(x>c)c=x; if(y>d)d=y;}); return a<=c?[[a,b],[c,d]]:null;}
 const geoPts=F=>{const P=[], w=a=>{if(typeof a[0]==="number") P.push(a); else a.forEach(w);}; F.forEach(f=>w(f.geometry.coordinates)); return P;};
 /* repères de la ville : gares, campus, centre */
 const REPL={gare:["Gare","M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 10h14M9 21l2-4M15 21l-2-4"],univ:["Campus","M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5"],centre:["Centre","M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"]};
 function reperes(ck){RCK=ck||null; RMK.forEach(m=>m.remove()); RMK=[]; if(!ck||typeof REPQ==="undefined"||!REPQ[ck]) return;
  Object.entries(REPQ[ck]).forEach(([k,p])=>{const d=REPL[k.replace(/\d+$/,"")]; if(!d||!Array.isArray(p)||!isFinite(p[0])) return; const el=document.createElement("div"); el.className="v2rep"; el.title=d[0];
   el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d[1]}"/></svg><span>${d[0]}</span>`; RMK.push(new ML.Marker({element:el,anchor:"bottom"}).setLngLat([p[1],p[0]]).addTo(M));});}
 /* les quartiers des 21 villes (≈ 900 contours, quelques millisecondes) : refaits seulement quand le calcul a changé */
 function quartiersGeo(){const Q=[]; let id=0; const k=qmK(), m=QM[k]; QBR=k==="irr"?null:qBreaks(k);
  C.forEach(c=>{const ck=c.k; if(!IR[ck]||typeof IRIS==="undefined"||!IRIS[ck]) return; const ll=irisLL(ck);
   IR[ck].list.forEach(t=>{const g=ll[t.i], geo=g&&geoPoly(g); if(!geo) return; let x=null;
    if(V.tous){const q=stats(ck,t.code); if(q.irr!=null) x=q;} else try{x=t.type==="H"?(QX[t.ck+t.i]||calcIris(t)):null;}catch(_){}
    const nom=`${t.name} (${cityName(ck)})`, rd=x&&x.irr!=null?(V.tous?`médiane ${pctS(x.irr)} (${x.n} annonces)`:pctS(x.irr)):"";
    let c=colX(x), op=x?.38:.12, tt=nom+(rd?" · "+rd:"");
    if(k!=="irr"){let v=null; try{v=t.type==="H"&&t.price?m.f(t):null;}catch(_){}
     if(v==null||!isFinite(v)){c="#9aa3ad"; op=.08; tt=`${nom} · ${m.l.toLowerCase()} : pas de donnée`;}
     else{c=qCol(v,QBR); op=m.bin&&!v?.06:.55; tt=`${nom} · ${m.u(v)}${rd?" · rendement "+rd:""}`;}}
    Q.push({type:"Feature",id:id++,properties:{ck,code:t.code,c,op,t:tt},geometry:geo});});});
  return Q;}
 /* noms des quartiers : au centre de leur plus grande partie, les quartiers où il se vend le plus passent devant */
 function quartiersNoms(){const N=[]; C.forEach(c=>{const ck=c.k; if(!IR[ck]) return; const D=dvfC(ck);
   IR[ck].list.forEach(t=>{if(t.type!=="H"||!isFinite(t.cx)||!isFinite(t.cy)) return; const [la,lo]=unproj(t.cx,t.cy); if(!isFinite(la)||!isFinite(lo)) return;
    N.push({type:"Feature",properties:{lab:t.name,rk:-((D&&D.q[t.code]&&D.q[t.code].n)||0)},geometry:{type:"Point",coordinates:[lo,la]}});});});
  return N;}
 function drawMap(fit){if(!M||!MREADY) return; const set=(s,f)=>{const src=M.getSource(s); if(src) src.setData({type:"FeatureCollection",features:f}); V2MAPN[s]=f.length;};
  const VF=C.map((c,i)=>{const x=cx(c), [m]=cityCnt(c.k);
   return {type:"Feature",id:i,properties:{k:c.k,c:colX(x),op:m?1:.45,r:m?Math.round((PH()?6:8)+Math.sqrt(m)*1.7):5,lab:`${c.name} ${pctS(x.irr)}${m?` · ${m}`:""}`,rk:-m,t:`${c.name} · ${pctS(x.irr)} · ${m} annonce${m>1?"s":""} pour nos critères`},geometry:{type:"Point",coordinates:[c.lon,c.lat]}};});
  set("villes",VF); set("vnoms",VF);
  const f0=feed(), qk=qmK()+(DARK()?"d":"c"); if(QSIG!==f0||QSK!==qk){QSIG=f0; QSK=qk; set("quartiers",quartiersGeo());}
  if(!QNSET){QNSET=true; set("qnoms",quartiersNoms());}
  /* les annonces de toutes les villes, dans la vue choisie (nos critères, nouvelles, baisses…) ; un bien de la shortlist dont l'adresse
     a été saisie est placé à cette adresse ; une position approchée est dessinée en point creux */
  const AF=[], urls=new Set(f0.map(o=>o.url));
  market(null).forEach(o=>{const bb=bienOf(o.url), own=hasLL(bb), f=own?{la:+bb.lat,lo:+bb.lon,r:0}:o.f; if(!f||f.la==null) return; const q=own?0:posQ(f), r=f.r!=null?+f.r:400;
   AF.push({type:"Feature",id:AF.length,properties:{k:key(o),c:cv(colIrr(o.x.irr)),irr:o.x.irr,sel:V.sel===key(o),nw:!!o.nw,st:inShort(o),ap:q>=2,rz:r/mpp0(f.la),
    t:`${keur(o.a[2])} · ${String(o.a[0]).replace(".",",")} m² · ${pctS(o.x.irr)}${V.tous?" · "+tyOfO(o):""}${own?" · adresse saisie":q>=2?` · position approchée${f.r!=null?` (à ${f.r} m près)`:""}`:""}`},geometry:{type:"Point",coordinates:[f.lo,f.la]}});});
  /* nos biens saisis à la main (ou dont l'annonce n'est plus relevée), à leur adresse */
  BIENS.filter(b=>!isOut(b)&&hasLL(b)&&!(b.url&&urls.has(b.url))).forEach(b=>{let x=null; try{x=calcBien(b).x;}catch(_){} const k=`b|${b.id}`;
   AF.push({type:"Feature",id:AF.length,properties:{k,c:cv(colIrr(x&&x.irr)),irr:x&&x.irr,sel:V.sel===k,nw:false,st:true,ap:false,rz:0,t:`${keur(+b.prix)} · ${String(b.surface||"?").replace(".",",")} m² · ${pctS(x&&x.irr)} · nos biens, adresse saisie`},geometry:{type:"Point",coordinates:[+b.lon,+b.lat]}});});
  const AS=AF.filter(f=>f.properties.sel), AO=AF.filter(f=>!f.properties.sel); set("annonces",AO); set("anombres",AO); set("asel",AS); V2MAPN.annonces=AF.length; V2MAPN.groupes=null;
  if(RCK!==(V.city||null)) reperes(V.city);
  if(fit||LCITY!==V.city){LCITY=V.city; MANP=false;
   if(V.city) fitCity(V.city,fit); else {const b=bbox(C.map(c=>[c.lon,c.lat])); if(b) fitLater(b,{pitch:0,bearing:0,duration:fit?0:800,pad:PH()?{top:60,left:56,right:100,bottom:12}:null});}}   /* téléphone : place des noms des villes à droite des points */
  mapLegend();}
 /* une ville : tous ses quartiers dans le cadre, assez près pour être « en ville » (inclinée) */
 function fitCity(ck,now){const P=[]; if(typeof IRIS!=="undefined"&&IRIS[ck]) Object.values(irisLL(ck)).forEach(g=>{const w=a=>{if(typeof a[0]==="number") P.push([a[1],a[0]]); else a.forEach(w);}; w(g);});
  const c=C.find(v=>v.k===ck); if(!P.length&&c) P.push([c.lon-.05,c.lat-.03],[c.lon+.05,c.lat+.03]); const b=bbox(P); if(b) fitLater(b,{pitch:P1(),bearing:-12,duration:now?0:1000},ZV+.3);}
 /* cadrer après que la fiche s'est ouverte ou fermée (la carte change de largeur) */
 function fitLater(b,o,zmin){requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!M) return; M.resize(); padSync(); const cam=M.cameraForBounds(b,{padding:o.pad||pad(),bearing:o.bearing||0}); if(!cam) return;
  if(zmin&&cam.zoom<zmin) cam.zoom=zmin; const opt=Object.assign({},cam,o); camAuto(opt,o.duration?"easeTo":"jumpTo");}));}
 /* nos animations de caméra sont marquées : leur fin, ou leur interruption par un geste, ne relance rien (avant : chaque fin relançait
    l'inclinaison, qui annulait le geste en cours — la carte se bloquait quand on la bougeait pendant l'animation) */
 const camAuto=(o,how)=>M[how||"easeTo"](o,{v2auto:true});
 const band=z=>PB=z<ZV-.5?0:z<ZV?(PB===0?0:1):z<Z3?1:z<Z3+.4?(PB===2?2:1):2;
 /* l'inclinaison suit le zoom, une fois le geste fini (doigt levé, molette arrêtée) */
 function tilt(){if(!M||!MREADY||DOWN||M.isMoving()||Date.now()-WHL<200) return; const b=band(M.getZoom());
  if(!b){MANP=false; if(M.getPitch()>.5||Math.abs(M.getBearing())>.5) camAuto({pitch:0,bearing:0,duration:600});}
  else if(!MANP){const p=b===2?P2():P1(); if(Math.abs(M.getPitch()-p)>3) camAuto({pitch:p,duration:700});}
  mapLegend();}
 /* après chaque mouvement : la liste suit la ville au centre ; l'inclinaison suit, sauf après une de nos animations */
 function mapMoved(e){if(!M||!MREADY) return; const z=M.getZoom(); band(z);
  if(!(e&&e.v2auto)){clearTimeout(PT); PT=setTimeout(tilt,250);}
  let ck=V.city;
  if(z>=ZV){const c=M.getCenter(); let best=null, bd=1e9; C.forEach(v=>{const d=km(c.lat,c.lng,v.lat,v.lon); if(d<bd){bd=d; best=v.k;}}); ck=bd<=25?best:null;}
  else if(z<ZQ) ck=null;
  if(ck!==V.city){V.city=ck; LCITY=ck; save(); if(V.tab==="carte") mapList(); reperes(ck);
   if(ck&&V.sel&&V.sel.startsWith("c|")&&V.sel!==`c|${ck}`){V.sel=`c|${ck}`; fiche();}}   /* la fiche d'une ville suit la ville au centre */
  const zl=$("v2map"); if(zl){zl.classList.toggle("v2zlo",z<12.5); zl.parentNode.classList.toggle("v2zw",z<ZQ);}   /* repères : icône seule de loin, nom en approchant */
  mapLegend();}
 /* un clic : annonce, sinon ville (de loin), sinon quartier (une petite marge autour du doigt) */
 function mapClick(e){const r=PH()?12:6, box=[[e.point.x-r,e.point.y-r],[e.point.x+r,e.point.y+r]], at=(l,b)=>M.getLayer(l)?M.queryRenderedFeatures(b||e.point,{layers:[l]}):[];
  const a=at("a-sdot",box).concat(at("a-dot",box)); if(a.length){openSel(a[0].properties.k); return;}
  const g=at("a-clu",box); if(g.length){grpPop(g[0],e.lngLat); return;}
  const pr=PH()?10:5, po=at("p-dot",[[e.point.x-pr,e.point.y-pr],[e.point.x+pr,e.point.y+pr]]); if(po.length){tapPop(poiTxt(po[0].properties),e.lngLat); return;}
  const v=M.getZoom()<ZQ+.3?at("v-dot",box).concat(at("v-lab")):[]; if(v.length){goCity(v[0].properties.k); return;}
  const q=at("q-fill"); if(q.length) openSel(`q|${q[0].properties.ck}|${q[0].properties.code}`);}
 /* les annonces d'un groupe, dans une bulle où l'on peut cliquer (la bulle du survol, elle, ne capte jamais la souris) */
 let GPOP=null, TPOP=null, TPT=0;
 /* bulle d'un arrêt ou d'un commerce touché : son nom, quelques secondes */
 function tapPop(t,ll){if(!TPOP) TPOP=new ML.Popup({closeButton:false,closeOnClick:true,className:"v2pop",offset:10}); if(POP) POP.remove();
  TPOP.setLngLat(ll).setText(t); if(!TPOP.isOpen()) TPOP.addTo(M); clearTimeout(TPT); TPT=setTimeout(()=>{if(TPOP) TPOP.remove();},4000);}
 function grpPop(f,ll){const src=M.getSource("annonces"), id=f.properties.cluster_id, n=f.properties.point_count; if(!src||id==null) return;
  Promise.resolve(src.getClusterLeaves(id,60,0)).then(L=>{if(!L||!L.length) return; if(POP) POP.remove(); if(GPOP) GPOP.remove();
   const F=L.map(x=>x.properties).sort((a,b)=>(b.irr??-99)-(a.irr??-99)), ap=F.every(x=>x.ap);
   const html=`<div class="v2gph"><b>${n} annonces ${ap?"dans la même zone":"au même endroit"}</b>${ap?`<small>positions approchées : l'adresse exacte n'est pas donnée</small>`:""}</div><div class="v2gpl">${F.slice(0,12).map(x=>`<button type="button" data-v2open="${esc(x.k)}"><i style="background:${esc(x.c)}"></i>${esc(x.t)}</button>`).join("")}${F.length>12?`<small>et ${F.length-12} autres</small>`:""}</div>`;
   GPOP=new ML.Popup({closeButton:true,closeOnClick:true,className:"v2gpop",maxWidth:"320px",offset:14}).setLngLat(f.geometry.coordinates||ll).setHTML(html).addTo(M);}).catch(()=>{});}
 function hoverQ(id){if(id===HQ) return; if(HQ!=null){try{M.setFeatureState({source:"quartiers",id:HQ},{hover:false});}catch(_){}} HQ=id; if(id!=null){try{M.setFeatureState({source:"quartiers",id},{hover:true});}catch(_){}}}
 function hoverOff(){if(!M) return; if(POP) POP.remove(); hoverQ(null); M.getCanvas().style.cursor="";}
 function mapHover(e){if(!MREADY||!e||M.isMoving()) return; const L=["a-sdot","a-dot","a-clu","p-dot","p-lig","v-dot","q-fill"].filter(l=>M.getLayer(l)), f=L.length?M.queryRenderedFeatures([[e.point.x-4,e.point.y-4],[e.point.x+4,e.point.y+4]],{layers:L}):[], h=f.find(x=>x.layer.id!=="v-dot"||M.getZoom()<ZQ+.3);
  M.getCanvas().style.cursor=h&&h.layer.id!=="p-lig"?"pointer":"";
  hoverQ(h&&h.layer.id==="q-fill"&&h.id!=null?h.id:null);
  if(!h){if(POP) POP.remove(); return;}
  if(!POP) POP=new ML.Popup({closeButton:false,closeOnClick:false,className:"v2pop",offset:12});
  POP.setLngLat(e.lngLat).setText(h.layer.id==="p-dot"?poiTxt(h.properties):h.layer.id==="a-clu"?`${h.properties.point_count} annonces ici · jusqu'à ${pctS(h.properties.irr)} · cliquez pour la liste`:h.properties.t); if(!POP.isOpen()) POP.addTo(M);}
 /* une annonce ouverte : la vue s'approche et s'incline, les immeubles autour apparaissent */
 /* position d'une annonce ou d'un bien ouvert ({la, lo, r} ; r = flou en mètres) et sa ville */
 function selPos(s){let f=null, ck=null;
  if(s.startsWith("b|")){const b=BIENS.find(x=>x.id===s.slice(2)); if(b){ck=b.ville; if(hasLL(b)) f={la:+b.lat,lo:+b.lon,r:0};}}
  else if(s[0]==="v"){const o=feed().find(x=>key(x)===s); if(o){ck=o.ck; const bb=bienOf(o.url); f=hasLL(bb)?{la:+bb.lat,lo:+bb.lon,r:0}:o.f;}}
  return {f:f&&f.la!=null&&f.lo!=null?f:null,ck};}
 /* now : la carte s'y place d'un coup (retour sur la carte après avoir ouvert l'annonce dans un autre onglet) */
 function flyAd(s,now){if(!M||!MREADY||V.tab!=="carte") return; const f=selPos(s).f;
  if(!f) return; MANP=false; const r=f.r==null?400:+f.r, zt=r<=100?16:r<=300?15.2:r<=600?14.5:13.8, o={center:[f.lo,f.la],zoom:r<=100&&!now?Math.max(M.getZoom(),zt):zt,pitch:P2()};
  if(now) camAuto(o,"jumpTo"); else camAuto(Object.assign(o,{duration:1200,essential:true}),"flyTo");}
 /* annonce ou bien ouvert depuis un autre onglet (Annonces, Nos biens…) : la carte s'y placera quand on y reviendra */
 let FLYP=null;
 function flyPending(){if(!FLYP||FLYP!==V.sel){FLYP=null; return false;} const p=selPos(FLYP);
  if(!p.f){FLYP=null; if(p.ck&&p.ck!==V.city){V.city=p.ck; save();} return false;}   /* sans position : la carte montre sa ville */
  if(p.ck){V.city=p.ck; LCITY=p.ck; save();} return true;}   /* la liste montre sa ville, sans recadrer la carte sur la ville entière */
 /* thème clair (par défaut) ou sombre : propre à chacun ; la carte change de fond et garde ses couches */
 function setTheme(t){document.documentElement.setAttribute("data-theme",t); try{localStorage.setItem("theme-v2",t);}catch(_){}
  if(M&&MREADY){MREADY=false; QSIG=null; QNSET=false; hoverOff(); HQ=null; M.once("style.load",()=>{mapLayers(); MREADY=true; drawMap();}); M.setStyle(MLSTYLE(),{diff:false});}
  render();}
 const themeSeg=()=>`<span class="v2seg" role="group" aria-label="Thème">${[["light","Clair"],["dark","Sombre"]].map(([k,l])=>`<button type="button" data-v2theme="${k}" aria-pressed="${(DARK()?"dark":"light")===k}">${l}</button>`).join("")}</span>`;
 function mapList(){const el=$("v2mlist"); el.dataset.min=V.min?"1":"0"; el.dataset.big=V.big&&!V.min?"1":"0"; setTimeout(()=>{if(el.firstElementChild&&!el.querySelector(".v2grip")) el.insertAdjacentHTML("afterbegin",GRIP);},0);
  const head=(t,sub)=>`<div class="v2mhead"><div class="v2crumb">${V.city?`<button type="button" data-v2city="">L'Ouest</button><span aria-hidden="true">›</span>`:""}<span>${t}</span><span class="v2sp"></span>${V.city&&(PH()||V.sel!==`c|${V.city}`)?`<button type="button" class="v2btn sm" data-v2cfiche="${V.city}" title="Prix, loyer, calcul, quartiers, habitants…">Fiche</button>`:""}<button type="button" class="v2btn sm" data-v2min aria-expanded="${!V.min}">${V.min?"Liste":"Réduire"}</button></div>${sub}</div>`;
  if(!V.city){const rows=C.map(c=>({c,x:cx(c),k:cityCnt(c.k)})).sort((a,b)=>(b.x.irr??-99)-(a.x.irr??-99)), tot=rows.reduce((s,r)=>s+r.k[0],0);
   el.innerHTML=head("L'Ouest",`<p class="v2sub">${tyLabel()} · ${tot} annonce${tot>1?"s":""} pour nos critères, dans ${rows.filter(r=>r.k[0]).length} villes sur ${C.length}.</p>`)+`<div class="v2mrows">${newsHtml(NEWS||bouge())}<h2 class="v2mh2">Les villes · ${V.tous?"médiane de leurs annonces, tous types":`moyenne d'${tyLow()==="studio"?"un studio":"un "+tyl()} type`}</h2>${rows.map(({c,x,k:[m,n]})=>`<div class="v2row${m?"":" v2dim"}" role="button" tabindex="0" data-v2city="${c.k}" style="grid-template-columns:minmax(0,1fr) auto"><b>${esc(c.name)}</b><span class="v2rv" style="color:${colX(x)}">${pctS(x.irr)}</span><span class="v2rs">${x.cost!=null?`${keur(x.cost)} tout compris · ${sgn(x.cf)}/mois`:"trop peu d'annonces pour une médiane"}</span><span class="v2rs" style="text-align:right">${rng({x,z:cz(x)},70)}</span><span class="v2rs v2match">${n?(m?`<b>${m}</b> annonce${m>1?"s":""} sur ${n} pour nos critères`:n>1?`aucune des ${n} annonces pour nos critères`:"son annonce ne correspond pas à nos critères"):"pas d'annonces relevées"}</span></div>`).join("")}</div>`; return;}
  const L0=market(V.city), lim=L0.slice(0,80);
  el.innerHTML=head(esc(cityName(V.city)),`<div class="v2chips v2scroll">${vueChips(V.city)}</div><p class="v2sub">${L0.length} ${typlL()} · triés par rendement ${scn()}</p>`)
   +`<div class="v2mrows">${lim.length?lim.map(o=>`<div class="v2row v2r3${V.sel===key(o)?" on":""}" role="button" tabindex="0" data-v2open="${esc(key(o))}">${img(photo(o,200,150),"")}<b>${keur(o.a[2])} · ${String(o.a[0]).replace(".",",")} m²${V.tous?` <span class="v2ty">${tyOfO(o)}</span>`:""}${o.nw?'<span class="v2new">nouv.</span>':""}${inShort(o)?' <span style="color:var(--warn)">★</span>':""}${ageChip(o)}</b><span class="v2rv" style="color:${cv(colIrr(o.x.irr))}">${pctS(o.x.irr)}</span><span class="v2rs">${esc(o.t?o.t.name:o.a[1]||"")}${o.f.dpe?" · DPE "+o.f.dpe:""}</span><span style="text-align:right">${rng(o,64)}</span>${cfLine(o)}</div>`).join(""):`<p class="v2empty">Aucune annonce dans cette vue.</p>`}${L0.length>80?`<p class="v2sub" style="padding:10px 14px">Les 80 premières sur ${L0.length}.</p>`:""}</div>`;}
 /* téléphone : la liste s'ouvre basse (la carte d'abord) ; sa poignée l'agrandit ou la réduit, au toucher ou en la tirant */
 const GRIP=`<div class="v2grip" role="button" tabindex="0" aria-label="Agrandir ou réduire la liste" data-v2grip><i></i></div>`;
 function sheetSet(big,min){V.big=!!big; V.min=!!min; save(); const el=$("v2mlist"); if(el) el.style.height=""; mapList(); setTimeout(padSync,280);}
 (()=>{let y0=0, h0=0, el=null, moved=false;
  document.addEventListener("pointerdown",e=>{const g=e.target.closest&&e.target.closest("[data-v2grip]"); if(!g||!PH()) return; el=$("v2mlist"); y0=e.clientY; h0=el.offsetHeight; moved=false; try{g.setPointerCapture(e.pointerId);}catch(_){} e.preventDefault();});
  document.addEventListener("pointermove",e=>{if(!el) return; const dy=e.clientY-y0; if(Math.abs(dy)>6) moved=true; if(moved){const H=$("v2map").offsetHeight; el.style.transition="none"; el.style.height=Math.max(56,Math.min(H*.9,h0-dy))+"px";}});
  document.addEventListener("pointerup",()=>{if(!el) return; const H=$("v2map").offsetHeight, h=el.offsetHeight; el.style.transition=""; const e0=el; el=null;
   if(!moved){e0.style.height=""; return V.min?sheetSet(false,false):sheetSet(!V.big,false);}
   sheetSet(h>H*.55,h<H*.2);});
  document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches("[data-v2grip]")){e.preventDefault(); if(V.min) sheetSet(false,false); else sheetSet(!V.big,false);}});})();
 function mapLegend(){const el=$("v2mleg"); if(!el) return; const z=M&&MREADY?M.getZoom():0, k=qmK(), m=QM[k], R=RAMP(), PC=POIC(), B=QBR;
  if(document.activeElement&&document.activeElement.matches&&document.activeElement.matches("[data-v2qm]")) return;
  const sw=c=>`<i style="background:${c}"></i>`, rdt=`<span>${sw(cv("var(--bad)"))}&lt; 2,5 %</span><span>${sw(cv("var(--warn)"))}2,5–5</span><span>${sw(cv("var(--ok)"))}≥ 5 %</span>`;
  const selq=`<label class="v2mlq"><span>Quartiers</span><select data-v2qm aria-label="Couleur des quartiers">${Object.entries(QM).map(([kk,o])=>`<option value="${kk}"${kk===k?" selected":""}>${o.l}</option>`).join("")}</select></label>`;
  const qleg=k==="irr"?`<span class="v2mlr">${rdt}</span>`:!B?"":m.bin?`<span title="${esc(m.d())}">${sw(R[4])}zone inondable</span>`:`<span class="v2ramp" title="${esc(m.d())}">&lt; ${esc(m.u(B[0]))} ${R.map(sw).join("")} ≥ ${esc(m.u(B[B.length-1]))}</span>`;
  const near=z>=ZQ||PB, ann=near?`<span class="v2mlx">${k==="irr"?"":`<b>Annonces</b> <span>${rdt}</span> · `}<span><i class="v2pl"></i>adresse ou à 100 m près</span><span><i class="v2pl v2ph"></i>position approchée</span><span><i class="v2pl v2pn">2</i>plusieurs au même endroit</span> · contour bleu : nouvelle · orange : shortlist</span>`:"";
  const aut=z>=8?`<span class="v2mlx"><b>Autour</b> <span><i class="v2ln v2rl"></i>train</span>${z>=10.5?`<span><i class="v2ln v2lg"></i>bus et tram (couleurs du réseau)</span>`:""}${z<10.5?"":z>=14.2?`<span><i class="v2pl" style="background:${PC[0]}"></i>arrêts, gares</span><span><i class="v2pl" style="background:${PC[1]}"></i>commerces</span>`:" · approchez : arrêts et commerces"}</span>`:"";
  const html=`${selq}${qleg}${near?"":`<span class="v2mlx">villes : ${k==="irr"?"même couleur":`rendement ${rdt}`} · taille : annonces pour nos critères · approchez : quartiers et annonces</span>`}${ann}${aut}${PB===1?`<span class="v2mlx">approchez : immeubles en 3D</span>`:""}`;
  if(el._h!==html){el._h=html; el.innerHTML=html;}}
 function goCity(ck){V.city=ck||null; LCITY=undefined; if(V.city&&!ADS[V.city]) V.vue="crit"; save(); V.tab="carte"; if(PH()) V.sel=null; show(); if(V.city&&!PH()) openSel(`c|${V.city}`,true);}

 /* ---------- photos en grand : la photo de la fiche ouvre toutes les photos de l'annonce (flèches, clavier, glisser au doigt) ---------- */
 let LB=null;
 function lbList(ck,suf,p0){const f=suf?ficheOf(ck,suf):null, P=f&&f.ph&&f.ph.length?f.ph:[];
  return {L:P.length?P.map(p=>photoFull(suf,p)):(p0?[p0]:[]), T:P.length?P.map(p=>photoUrl(suf,p,160,120)):(p0?[p0]:[]), wait:f===undefined};}
 function lbOpen(ck,suf,p0){const x=lbList(ck,suf,p0); if(!x.L.length) return; LB=Object.assign({ck,suf,p0,i:0,back:document.activeElement},x); lbDraw(true);}
 function lbClose(){const b=LB&&LB.back; LB=null; const el=document.querySelector(".v2lb"); if(el) el.remove(); if(b&&b.focus) try{b.focus();}catch(_){}}
 function lbGo(i){if(!LB) return; const n=LB.L.length; LB.i=(i+n)%n; lbDraw();}
 function lbDraw(first){let el=document.querySelector(".v2lb"); if(!LB){if(el) el.remove(); return;}
  if(!el){el=document.createElement("div"); el.className="v2lb"; el.setAttribute("role","dialog"); el.setAttribute("aria-modal","true"); el.setAttribute("aria-label","Photos de l'annonce"); document.body.appendChild(el);
   el.addEventListener("click",e=>{const t=e.target.closest("[data-lb]"); if(t){const v=t.dataset.lb; if(v==="x") lbClose(); else if(v.startsWith("go")) lbGo(+v.slice(2)); else lbGo(LB.i+(+v)); return;} if(e.target.classList.contains("v2lbm")) lbClose();});
   let x0=null; el.addEventListener("pointerdown",e=>{if(e.target.closest(".v2lbm")) x0=e.clientX;}); el.addEventListener("pointerup",e=>{if(x0==null) return; const dx=e.clientX-x0; x0=null; if(Math.abs(dx)>50) lbGo(LB.i+(dx<0?1:-1));});}
  const n=LB.L.length, i=LB.i;
  el.innerHTML=`<div class="v2lbbar"><span class="v2lbc">${i+1} / ${n}${LB.wait?" · chargement des autres photos…":""}</span><span class="v2sp"></span><button type="button" class="v2lbx" data-lb="x" aria-label="Fermer les photos">×</button></div>
   <div class="v2lbm"><button type="button" class="v2lbnav" data-lb="-1" aria-label="Photo précédente"${n<2?" hidden":""}>‹</button><img src="${esc(LB.L[i])}" alt="Photo ${i+1} sur ${n}" referrerpolicy="no-referrer" draggable="false"><button type="button" class="v2lbnav" data-lb="1" aria-label="Photo suivante"${n<2?" hidden":""}>›</button></div>
   ${n>1?`<div class="v2lbt">${LB.T.map((u,k)=>`<button type="button" data-lb="go${k}" aria-label="Photo ${k+1}" aria-current="${k===i}"><img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join("")}</div>`:""}`;
  const cur=el.querySelector('.v2lbt [aria-current="true"]'); if(cur&&cur.scrollIntoView) cur.scrollIntoView({block:"nearest",inline:"center"});
  if(n>1){const im=new Image(); im.referrerPolicy="no-referrer"; im.src=LB.L[(i+1)%n];}   /* la suivante est prête */
  if(first){const x=el.querySelector(".v2lbx"); if(x) x.focus();}}
 /* clavier : Échap ferme la visionneuse (pas la fiche), flèches pour naviguer */
 document.addEventListener("keydown",e=>{if(!LB) return; if(e.key==="Escape"){e.stopImmediatePropagation(); e.preventDefault(); lbClose();} else if(e.key==="ArrowRight"){e.preventDefault(); lbGo(LB.i+1);} else if(e.key==="ArrowLeft"){e.preventDefault(); lbGo(LB.i-1);}},true);
 /* les photos d'une fiche arrivent après coup (liste commune) : la visionneuse et le compte de la photo se mettent à jour */
 if(typeof ficheRefresh==="function"){const _fr=ficheRefresh; ficheRefresh=function(ck){_fr.apply(this,arguments);
  document.querySelectorAll("[data-v2photos]").forEach(bt=>{const [c,...r]=bt.dataset.v2photos.split("|"); if(c!==ck) return; const f=ficheOf(c,r.join("|")), n=f&&f.ph?f.ph.length:0, z=bt.querySelector(".v2fthn"); if(z) z.textContent=n>1?`${n} photos`:"agrandir";});
  if(LB&&LB.ck===ck&&LB.wait){const x=lbList(ck,LB.suf,LB.p0); if(x.L.length){Object.assign(LB,x); LB.i=Math.min(LB.i,LB.L.length-1); lbDraw();}}};}

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
 /* ligne du cash-flow d'une annonce (listes du téléphone et de la carte) ; tri des annonces sur téléphone */
 const cfLine=o=>`<span class="v2rs v2cfl">cash-flow <b style="color:${cfC(o.x.cf)}">${sgn(o.x.cf)}</b> par mois</span>`;
 const SORTM=[["irr|-1","Rendement, le plus haut"],["cf|-1","Cash-flow, le plus haut"],["p|1","Prix, le plus bas"],["m2|1","Prix au m², le plus bas"],["s|-1","Surface, la plus grande"],["age|-1","En ligne depuis le plus longtemps"]];
 function pAnnonces(){const el=$("v2p-annonces"), L0=market(null), cities=Object.keys(ADS).filter(k=>ADS[k]&&ADS[k].ventes);
  let body; const ph=PH(), av=ph?"tableau":V.aview, shown=L0.slice(0,V.n), showBank=shown.some(o=>!bankOk(o.x.ratio));
  if(av==="nuage"){const pts=L0.map(o=>{const z=z3(o), c=cv(colIrr(o.x.irr)); return {x:o.x.cost/1000,y:o.x.irr,lo:z.prudent,hi:z.favorable,c,open:key(o),ring:o.nw,on:V.sel===key(o),shape:inShort(o)?"star":null,t:`${titre(o)} · ${where(o)} · ${keur(o.a[2])} · ${pctS(o.x.irr)}`};});
   const cr=critV(), xs=pts.map(p=>p.x).concat([cr.budget/1000]), yT=Math.min(30,Math.max(12,...pts.map(p=>Math.ceil(p.hi??p.y)))), yB=Math.max(-12,Math.min(-4,...pts.map(p=>Math.floor(p.lo??p.y))));
   body=pts.length?nuage({label:"Rendement selon le budget, une pastille par annonce",x:[Math.floor(Math.min(...xs)/10)*10-5,Math.ceil(Math.max(...xs)/10)*10+5],y:[yB,yT],xf:v=>v+" k€",yf:v=>fr(v,0)+" %",xl:"budget tout compris",yl:`rendement 15 ans · ${scn()}`,pts,lines:[{x:cr.budget/1000,t:"budget max"},{y:cr.rmin,t:"rendement min."}],zone:{x:cr.budget/1000,y:cr.rmin,t:"Nos critères"}})+`<div class="v2leg"><span>Trait : du scénario prudent au favorable</span><span>Anneau : nouvelle</span><span>Étoile : shortlist</span><span>Touchez une pastille pour sa fiche</span></div>`:`<p class="v2empty">Aucune annonce dans cette vue.</p>`;}
  else if(ph) body=`<div class="v2tw">${shown.map(o=>`<div class="v2row v2r3${V.sel===key(o)?" on":""}" role="button" tabindex="0" data-v2open="${esc(key(o))}">${img(photo(o,200,150),"")}<b>${keur(o.a[2])} · ${String(o.a[0]).replace(".",",")} m²${V.tous?` <span class="v2ty">${tyOfO(o)}</span>`:""}${o.nw?'<span class="v2new">nouv.</span>':""}${ageChip(o)}</b><span class="v2rv" style="color:${cv(colIrr(o.x.irr))}">${pctS(o.x.irr)}</span><span class="v2rs">${esc(where(o))}</span><span>${rng(o,64)}</span>${cfLine(o)}</div>`).join("")}</div>`;
  else body=`<div class="v2tw"><table class="v2t v2wide"><thead><tr><th></th><th></th>${th("p","Prix",1)}${th("s","m²",1)}<th>Ville · quartier</th>${th("irr","Rendement 15 ans",1)}<th>Fourchette</th>${th("cf","Cash-flow",1)}${th("m2","€/m²",1)}${th("age","En ligne",1)}${showBank?"<th>Banque</th>":""}<th>DPE · signaux</th></tr></thead><tbody>${shown.map(o=>{const [bc,bt]=bank(o.x.ratio); return `<tr class="${V.sel===key(o)?"on":""}" data-v2open="${esc(key(o))}" tabindex="0"><td>${starBtn(o)}</td><td>${img(photo(o,160,120),"v2th")}</td><td class="r mono"><b>${keur(o.a[2])}</b>${o.nw?'<span class="v2new">nouv.</span>':""}${o.v&&o.v.last?`<span class="v2drop">↓ ${keur(o.v.last.amt)}</span>`:""}</td><td class="r mono">${String(o.a[0]).replace(".",",")}${V.tous?`<div class="v2sub" style="font-size:11.5px">${tyOfO(o)}</div>`:""}</td><td><b>${esc(cityName(o.ck))}</b><div class="v2sub" style="font-size:12px">${esc(o.t?o.t.name:o.a[1]||"")}</div></td><td class="r mono" style="color:${cv(colIrr(o.x.irr))};font-weight:700">${pctS(o.x.irr)}</td><td>${rng(o)}</td><td class="r mono" style="color:${cfC(o.x.cf)}">${sgn(o.x.cf)}</td><td class="r mono">${nf(o.a[2]/o.a[0])}</td><td class="r mono" title="${esc(ageTxt(o))}">${o.v?`${o.v.days} j`:"—"}${o.v&&o.v.drops?`<div class="v2sub" style="font-size:11.5px;color:var(--ok)">↓ ${fr(dropPct(o),0)} % (${o.v.drops})</div>`:""}</td>${showBank?`<td><span class="v2pill ${bc==="p-ok"?"ok":bc==="p-warn"?"warn":"bad"}">${bt}</span></td>`:""}<td>${o.f.dpe?`<span class="v2pill ${"FG".includes(o.f.dpe)?"bad":o.f.dpe==="E"?"warn":""}">DPE ${o.f.dpe}</span> `:""}${ficheBadges(o.a[3],true)||""}</td></tr>`;}).join("")}</tbody></table></div>`;
  const critB=`<button type="button" class="v2btn sm v2critb" data-v2crit title="Modifier nos critères">≤ ${keur(critV().budget)} · ≥ ${fr(critV().rmin)} %${critV().bank?" · banque":""}</button>`;
  el.innerHTML=`<div class="v2in"><div class="v2bar"><h1 class="v2h1">Annonces</h1><span class="v2sub">${L0.length} ${typlL()}${ph?"":` · relevé du ${esc(ADSRAW.date||ADS.date||"")} · ${cities.length} villes`}</span><span class="v2sp"></span>${ph?"":`<span class="v2seg" role="group" aria-label="Affichage"><button type="button" data-v2av="tableau" aria-pressed="${V.aview!=="nuage"}">Tableau</button><button type="button" data-v2av="nuage" aria-pressed="${V.aview==="nuage"}">Nuage</button></span>`}</div>
   <div class="v2bar"><div class="v2chips v2scroll">${vueChips(null)}${ph?critB:""}</div>${ph?"":`<span class="v2sp"></span>${critB}`}</div>
   ${ph&&L0.length>1?`<label class="v2sortm"><span>Trier</span><select data-v2sortm aria-label="Trier les annonces">${SORTM.map(([v,l])=>`<option value="${v}"${V.sort.join("|")===v?" selected":""}>${l}</option>`).join("")}${SORTM.some(([v])=>v===V.sort.join("|"))?"":`<option selected>${esc(V.sort[0])}</option>`}</select></label>`:""}
   ${L0.length?body:`<p class="v2empty">Aucune annonce dans cette vue. Élargissez les critères ou choisissez « Toutes ».</p>`}
   ${av!=="nuage"&&L0.length>V.n?`<div class="v2more"><button type="button" class="v2btn" data-v2more>Afficher ${Math.min(60,L0.length-V.n)} de plus (${L0.length-V.n} restantes)</button></div>`:""}</div>`;}

 /* ---------- onglet Villes ---------- */
 function pVilles(){const ph=PH(), cs=V.csort||["irr",-1], kf={irr:r=>r.x.irr??-99,cf:r=>r.x.cf,cost:r=>r.x.cost,rent:r=>r.x.rentHC,stu:r=>r.c.students,m:r=>r.m}[cs[0]]||(r=>r.x.irr??-99);
  const el=$("v2p-villes"), R=C.map(c=>{const x=cx(c), [m,n]=cityCnt(c.k); return {c,x,z:cz(x),m,n};}).sort((a,b)=>(kf(a)-kf(b))*cs[1]), showBank=!V.tous&&R.some(r=>!bankOk(r.x.ratio)), cth=sortTh("data-v2csort",cs);
  const body=ph?`<div class="v2tw">${R.map(r=>`<div class="v2row${r.m?"":" v2dim"}" role="button" tabindex="0" data-v2city="${r.c.k}" style="grid-template-columns:minmax(0,1fr) auto"><b>${esc(r.c.name)}</b><span class="v2rv" style="color:${cv(colIrr(r.x.irr))}">${pctS(r.x.irr)}</span><span class="v2rs">${keur(r.x.cost)} tout compris · ${sgn(r.x.cf)}/mois · loyer ${eur(r.x.rentHC)}</span><span class="v2rs" style="text-align:right">${rng(r,64)}</span><span class="v2rs v2match">${r.n?`<b>${r.m}</b> sur ${r.n} pour nos critères · ${nf(r.c.students)} étudiants`:`${nf(r.c.students)} étudiants · pas d'annonces relevées`}</span></div>`).join("")}</div>`
   :V.cview==="nuage"?nuage({label:"Rendement des villes selon le nombre d'étudiants",x:[3.2,5],xt:[3.3,3.5,3.7,4,4.3,4.6,4.9],y:[-4,9],xf:v=>nf(Math.pow(10,v)/1000)+" k",yf:v=>fr(v,0)+" %",xl:"étudiants (échelle logarithmique)",yl:`rendement 15 ans · ${scn()}`,pts:R.map(r=>({x:Math.log10(r.c.students),y:r.x.irr,lo:r.z.prudent,hi:r.z.favorable,c:cv(colIrr(r.x.irr)),r:r.m?8:6,op:r.m?.95:.55,city:r.c.k,lab:r.c.name,t:`${r.c.name} · ${pctS(r.x.irr)} · ${r.m} annonce${r.m>1?"s":""} pour nos critères`}))})+`<div class="v2leg"><span>Grandes pastilles : des annonces pour nos critères</span><span>Trait : du prudent au favorable</span></div>`
   :`<div class="v2tw"><table class="v2t v2wide"><thead><tr><th>Ville</th>${cth("irr","Rendement 15 ans",1)}<th>Fourchette</th>${cth("cf","Cash-flow",1)}${cth("cost","Budget",1)}${cth("rent","Loyer HC",1)}${cth("stu","Étudiants",1)}${cth("m","Nos critères",1)}${showBank?"<th>Banque</th>":""}</tr></thead><tbody>${R.map(r=>{const [bc,bt]=bank(r.x.ratio); return `<tr data-v2city="${r.c.k}" tabindex="0"><td><b>${esc(r.c.name)}</b></td><td class="r mono" style="color:${cv(colIrr(r.x.irr))};font-weight:700">${pctS(r.x.irr)}</td><td>${rng(r)}</td><td class="r mono" style="color:${cfC(r.x.cf)}">${sgn(r.x.cf)}</td><td class="r mono" title="prix ${keur(r.x.bien)} + notaire, meubles et travaux">${keur(r.x.cost)}</td><td class="r mono">${eur(r.x.rentHC)}</td><td class="r mono">${nf(r.c.students)}</td><td class="r mono">${r.n?`${r.m} / ${r.n}`:"—"}</td>${showBank?`<td><span class="v2pill ${bc==="p-ok"?"ok":bc==="p-warn"?"warn":"bad"}">${bt}</span></td>`:""}</tr>`;}).join("")}</tbody></table></div>`;
  el.innerHTML=`<div class="v2in"><div class="v2bar"><h1 class="v2h1">Villes</h1><span class="v2sub">${V.tous?"Tous types · médiane des annonces de chaque ville":`${tyl()} type de ${H.surface} m²`} · ${eur(H.apport)} d'apport · scénario ${scn()}</span><span class="v2sp"></span>${ph?"":`<span class="v2seg" role="group" aria-label="Affichage"><button type="button" data-v2cv="tableau" aria-pressed="${V.cview!=="nuage"}">Tableau</button><button type="button" data-v2cv="nuage" aria-pressed="${V.cview==="nuage"}">Nuage</button></span>`}</div>${body}<p class="v2sub">Touchez une ville pour l'ouvrir sur la carte, avec ses quartiers et ses annonces. Une ville sans annonces relevées est calculée sur ses ventes réelles et ses loyers.</p></div>`;}

 /* ---------- onglet Nos biens : avis à deux ---------- */
 const VOT=[["o","Garder"],["m","À voir"],["n","Passer"]];
 function people(){const me=myName()||"", s=new Set(H.assoc.map(a=>a.nom).filter(Boolean)); BIENS.forEach(b=>{if(b.par) s.add(b.par); Object.keys(b.votes||{}).forEach(k=>s.add(k)); Object.keys((b.visite||{}).avis||{}).forEach(k=>s.add(k));}); s.delete(me); s.delete(""); return [me,[...s].slice(0,5)];}
 const voteBtns=(b,who,dis)=>`<span class="v2vote">${VOT.map(([c,l])=>`<button type="button" class="${c}" data-v2vote="${esc(b.id)}|${c}" aria-pressed="${(b.votes||{})[who]===c}"${dis?" disabled":""}>${l}</button>`).join("")}</span>`;
 const voteTxt=(b,who)=>{const v=(b.votes||{})[who]; return v?`<span class="v2pill ${v==="o"?"ok":v==="m"?"warn":"bad"}">${VOT.find(x=>x[0]===v)[1]}</span>`:`<span class="v2sub">pas encore d'avis</span>`;};
 /* d'accord : tout le monde a voté pareil ; à trancher : un avis diffère ; sinon on attend des avis */
 function etat(b,me,oth){const v=b.votes||{}, a=v[me], c=oth.map(n=>v[n]).filter(Boolean); if(!a||!c.length) return ["att","en attente"]; if(c.some(x=>x!==a)) return ["des","à trancher"]; return c.length===oth.length?["acc","d'accord"]:["att","en attente"];}
 function pBiens(){const el=$("v2p-biens"), [me,oth]=people(), L0=BIENS.filter(b=>!isOut(b)).map(b=>({b,r:calcBien(b),e:etat(b,me,oth)}));
  const ord={des:0,att:1,acc:2}; L0.sort((p,q)=>ord[p.e[0]]-ord[q.e[0]]||((q.r.x.irr??-99)-(p.r.x.irr??-99)));
  const n={acc:0,des:0,att:0}; L0.forEach(o=>n[o.e[0]]++);
  el.innerHTML=`<div class="v2in"><div class="v2bar"><h1 class="v2h1">Nos biens</h1><span class="v2sub">${L0.length} bien${L0.length>1?"s":""} suivi${L0.length>1?"s":""}${L0.length>1?" · les désaccords en tête":""}</span><span class="v2sp"></span><button type="button" class="v2btn sm pri" data-v2add>Ajouter un bien</button></div>
   ${cmpCard(L0)}
   ${!me||!sbCode()?ident(me,true):""}
   ${L0.length?`<div class="v2chips">${n.des?`<span class="v2pill warn">${n.des} à trancher</span>`:""}${n.att?`<span class="v2pill">${n.att} en attente d'un avis</span>`:""}${n.acc?`<span class="v2pill ok">${n.acc} d'accord</span>`:""}</div>`:""}
   ${L0.length&&PH()?`<div class="v2tw">${L0.map(({b,r,e})=>{const x=r.x; return `<div class="v2row v2r3 v2brow" role="button" tabindex="0" data-v2open="b|${esc(b.id)}">${img(bienPhoto(b,200,150),"")}<b>${esc(b.titre||"Bien")}</b><span class="v2rv" style="color:${cv(colIrr(x.irr))}">${pctS(x.irr)}</span><span class="v2rs">${esc(cityName(b.ville))}${b.quartier?" · "+esc(b.quartier):""} · ${keur(+b.prix)}</span><span style="text-align:right">${rng({x,z:irr3(x)||{}},64)}</span><span class="v2rs v2cfl">cash-flow <b style="color:${cfC(x.cf)}">${sgn(x.cf)}</b> par mois</span>
     <div class="v2bmeta">${stPill(b)}<span class="v2pill ${e[0]==="acc"?"ok":e[0]==="des"?"warn":""}">${e[1]}</span>${oth.filter(o=>(b.votes||{})[o]).map(o=>`<span class="v2bvo">${esc(o)} : ${voteTxt(b,o)}</span>`).join("")}</div>
     <div class="v2bact">${me?voteBtns(b,me):`<span class="v2sub">prénom d'abord</span>`}<label class="v2cmpl"><input type="checkbox" class="v2cmpck" data-v2cmp="${esc(b.id)}" aria-label="Comparer ${esc(b.titre||"ce bien")}"${CMPS.has(b.id)?" checked":""}>Comparer</label></div></div>`;}).join("")}</div>`
   :L0.length?`<div class="v2tw"><table class="v2t v2wide"><thead><tr><th title="Cochez 2 à 4 biens pour les comparer">Comparer</th><th></th><th>Bien</th><th class="r">Rendement 15 ans</th><th>Fourchette</th><th class="r">Cash-flow</th><th>Statut</th><th>${me?esc(me)+" (vous)":"Vous"}</th>${oth.length?oth.map(o=>`<th>${esc(o)}</th>`).join(""):"<th>Binôme</th>"}<th>État</th></tr></thead><tbody>${L0.map(({b,r,e})=>{const x=r.x; return `<tr data-v2open="b|${esc(b.id)}" tabindex="0"><td><input type="checkbox" class="v2cmpck" data-v2cmp="${esc(b.id)}" aria-label="Comparer ${esc(b.titre||"ce bien")}"${CMPS.has(b.id)?" checked":""}></td><td>${img(bienPhoto(b,160,120),"v2th")}</td><td><b>${esc(b.titre||"Bien")}</b><div class="v2sub" style="font-size:12px">${esc(cityName(b.ville))}${b.quartier?" · "+esc(b.quartier):""} · ${keur(+b.prix)}</div></td><td class="r mono" style="color:${cv(colIrr(x.irr))};font-weight:700">${pctS(x.irr)}</td><td>${rng({x,z:irr3(x)||{}})}</td><td class="r mono" style="color:${cfC(x.cf)}">${sgn(x.cf)}</td><td>${stPill(b)}</td><td>${me?voteBtns(b,me):`<span class="v2sub">prénom d'abord</span>`}</td>${oth.length?oth.map(o=>`<td>${voteTxt(b,o)}</td>`).join(""):`<td><span class="v2sub">pas encore de binôme</span></td>`}<td><span class="v2pill ${e[0]==="acc"?"ok":e[0]==="des"?"warn":""}">${e[1]}</span></td></tr>`;}).join("")}</tbody></table></div>`:`<div class="v2card"><p class="v2empty">Aucun bien pour l'instant. Touchez l'étoile d'une annonce pour la suivre ici.</p></div>`}
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
 function ident(me,first){return `<div class="v2card"><h2>${first?(H.assoc.length>2?"Vous "+H.assoc.length:"Vous deux"):"Liste commune"}</h2><p class="v2sub">${sbCode()?`Partagée avec le code commun, sous le prénom « ${esc(me||"?")} » : biens, avis et réglages sont communs.`:"Votre prénom distingue vos avis de ceux de l'autre. Avec le même code commun, vous partagez la liste, les avis et les réglages ; sans code, tout reste dans ce navigateur."}</p><div class="v2grid v2f"><div><label for="v2nom2">Prénom</label><input type="text" id="v2nom2" maxlength="30" value="${esc(me)}" placeholder="Prénom"></div><div><label for="v2code">Code commun (le même pour ${nous()})</label><input type="text" id="v2code" maxlength="60" value="${esc(sbCode())}" autocomplete="off" spellcheck="false"></div></div><div><button type="button" class="v2btn${first?" pri":""}" data-v2share>Enregistrer</button></div></div>`;}

 /* ---------- onglet Budget : critères, scénario, hypothèses ---------- */
 function sensi(){const c=C.find(v=>v.k===(V.city||"lemans"))||C[0], base=calcVille(c).irr, T=[["Hausse des prix",{px:0},{px:2},"réglage 0 % / 2 % par an"],["Prix selon la ville",{pxV:0},{pxV:1},"non / oui"],["Gestion par agence",{gestion:9.5},{gestion:0},"9,5 % du loyer / aucune"],["Loyer",{loyerAdj:H.loyerAdj-7},{loyerAdj:H.loyerAdj+7},"−7 % / +7 %"],["Vacance",{vacance:H.vacance+1},{vacance:Math.max(0,H.vacance-0.5)},"+1 mois / −½ mois"],["Hausse des loyers",{ly:H.ly-1},{ly:H.ly+0.5},`${fr(H.ly-1)} % / ${fr(H.ly+0.5)} % par an`],["Taux du crédit",{taux:H.taux+0.45},{taux:H.taux-0.45},`${fr(H.taux+0.45,2)} % / ${fr(H.taux-0.45,2)} %`],["Frais à la revente",{fraisVente:H.fraisVente+2},{fraisVente:Math.max(0,H.fraisVente-1)},`${fr(H.fraisVente+2)} % / ${fr(Math.max(0,H.fraisVente-1))} %`]];
  const run=m=>{const s={}; Object.keys(m).forEach(k=>{s[k]=H[k]; H[k]=m[k];}); const v=calcVille(c).irr; Object.assign(H,s); return v;};
  return `<p class="v2sub">${tyl()} à ${esc(c.name)}, ${pctS(base)} en ${scn()} :</p><div class="v2tw"><table class="v2t"><thead><tr><th>Hypothèse</th><th>Variation</th><th class="r">Rendement</th></tr></thead><tbody>${T.map(([l,a,b,t])=>`<tr><td>${l}</td><td>${t}</td><td class="r mono">${pctS(run(a))} / ${pctS(run(b))}</td></tr>`).join("")}</tbody></table></div>`;}
 /* ---------- associés (1 à 6) : réglage dans Budget, détail dans « Le calcul » ---------- */
 const nous=()=>H.assoc.length>2?`vous ${H.assoc.length}`:"vous deux";
 const anom=(a,i)=>esc(a.nom||`Associé ${i+1}`);
 /* cash-flow d'un associé : sa part du cash-flow avant impôt, moins son impôt (à sa tranche) et sa part des frais */
 const cfOf=(x,i)=>{const w=H.assoc[i].part/100; return x.net?x.cfBrut*w-(((x.imps||[])[i]||0)+x.fees1*w)/12:x.cfBrut*w;};
 function assocCard(){const A=H.assoc, n=A.length, c=C.find(v=>v.k===(V.city||"lemans"))||C[0], x=calcVille(c);
  const fld=(i,k,l,u,st,v)=>`<div><label for="v2a-${i}-${k}">${l}${u?` <span class="v2sub">(${u})</span>`:""}</label><input type="${k==="nom"?"text":"number"}" id="v2a-${i}-${k}" data-v2as="${i}|${k}"${k==="nom"?' maxlength="30" placeholder="Prénom"':` step="${st}" min="0"`} value="${esc(String(v))}"></div>`;
  return `<div class="v2card"><div class="v2bar"><h2>Associés</h2><span class="v2sp"></span><span class="v2sub">Nombre</span><span class="v2seg" role="group" aria-label="Nombre d'associés">${[1,2,3,4,5,6].map(k=>`<button type="button" data-v2nas="${k}" aria-pressed="${n===k}">${k}</button>`).join("")}</span></div>
   <p class="v2sub">Chacun reçoit sa part des loyers, paie sa part de la mensualité et des charges, et l'impôt sur sa part à sa propre tranche. Les parts sont ramenées à 100 %.</p>
   <div class="v2assoc">${A.map((a,i)=>`<div class="v2as"><b>${anom(a,i)} · ${fr(a.part,0)} %</b><div class="v2grid v2f">${fld(i,"nom","Prénom","","",a.nom)}${fld(i,"part","Part du bien","%",5,Math.round(a.part*10)/10)}${fld(i,"revenus","Revenus nets","€/mois",50,Math.round(a.revenus))}${fld(i,"credits","Autres crédits","€/mois",10,Math.round(a.credits))}<div><label for="v2a-${i}-tmi">Tranche d'impôt</label><select id="v2a-${i}-tmi" data-v2as="${i}|tmi">${TMIS.map(t=>`<option value="${t}"${a.tmi===t?" selected":""}>${t} %</option>`).join("")}</select></div>${fld(i,"assur","Assurance de prêt","%/an",0.01,a.assur)}${fld(i,"quot","Quotité assurée","%",10,a.quot)}</div><p class="v2sub">Endettement sur sa part : <b>${x.ratios&&x.ratios[i]!=null?pct(x.ratios[i]*100,0):"n.d."}</b> · cash-flow ${sgn(cfOf(x,i))}/mois (${tyl().toLowerCase()} type à ${esc(c.name)})</p></div>`).join("")}</div>
   <p class="v2sub">Pour la banque, endettement de l'ensemble : <b>${pct(x.ratio*100,0)}</b> (revenus ${eur(H.salaires)}/mois, autres crédits ${eur(H.pretEtud)}/mois).</p></div>`;}
 function assocDetail(x){const A=H.assoc; if(A.length<2) return "";
  return `<div class="v2sec"><h3>Par associé</h3><div class="v2tw"><table class="v2t v2tight"><thead><tr><th>Associé</th><th class="r">Part</th><th class="r">Mensualité</th><th class="r">Impôt an 1</th><th class="r">Cash-flow</th><th class="r">Endettement</th></tr></thead><tbody>${A.map((a,i)=>`<tr><td>${anom(a,i)}</td><td class="r mono">${fr(a.part,0)} %</td><td class="r mono">${eur(x.mens*a.part/100)}</td><td class="r mono">${eur((x.imps||[])[i]||0)}</td><td class="r mono" style="color:${cfC(cfOf(x,i))}">${sgn(cfOf(x,i))}</td><td class="r mono">${x.ratios&&x.ratios[i]!=null?pct(x.ratios[i]*100,0):"n.d."}</td></tr>`).join("")}</tbody></table></div><p class="v2sub">Par mois, sauf l'impôt (par an). La banque regarde l'endettement de l'ensemble : ${pct(x.ratio*100,0)}.</p></div>`;}
 function defOf(k){return TYK.includes(k)?typeDefaults(H.type)[k]:HDEF[k];}
 const HOLD=document.createElement("div"); HOLD.hidden=true; HOLD.id="v2hold"; app.appendChild(HOLD);   /* range les blocs de l'app montrés dans une page avant qu'elle ne soit redessinée */
 function pBudget(){document.querySelectorAll("#v2p-budget .v2src").forEach(n=>HOLD.appendChild(n)); const el=$("v2p-budget"), cr=critV(), ri=regInfo(), nch=[...HYPK.filter(k=>k!=="salaires"&&k!=="pretEtud"),...TYK,"regime"].filter(k=>defOf(k)!=null&&H[k]!==defOf(k)).length,
  f=(k,l,u,st)=>{const d=defOf(k), ch=d!=null&&H[k]!==d; return `<div class="${ch?"v2chg":""}"><label for="v2h-${k}">${l} <span class="v2sub">(${u})</span></label><input type="number" id="v2h-${k}" data-v2h="${k}" step="${st}" value="${H[k]}">${ch?`<small class="v2def">défaut : ${d>=1000?nf(d):String(d).replace(".",",")}</small>`:""}</div>`;};
  el.innerHTML=`<div class="v2in"><div class="v2bar"><h1 class="v2h1">Budget et hypothèses</h1><span class="v2sp"></span>${nch?`<button type="button" class="v2btn sm" data-v2reset>Revenir aux valeurs par défaut (${nch} changée${nch>1?"s":""})</button>`:""}</div>
   <p class="v2sub v2regnote">${ri?`Communs à ${nous()} : un changement ici change les chiffres des autres.${ri.par?` Dernière modification par ${esc(ri.par)}${ri.le?" le "+esc(dateTxt(ri.le.slice(0,10)).replace(/\.$/,"")):""}.`:""}`:"Pas encore partagés : sans code commun (onglet Nos biens), ces réglages restent dans ce navigateur."} Les valeurs différentes du défaut sont signalées.</p>
   <div class="v2card"><h2>Nos critères</h2><p class="v2sub" style="font-size:15px;color:var(--fg)">${tyl()} · budget tout compris jusqu'à <b>${keur(cr.budget)}</b> · rendement au moins <b>${fr(cr.rmin)} %</b> · ${cr.bank?"la banque doit suivre":"avec ou sans la banque"}</p><div><button type="button" class="v2btn" data-v2crit>Modifier les critères</button></div></div>
   <div class="v2card"><h2>Scénario affiché partout (le vôtre)</h2>${scnSeg()}<p class="v2sub">Ce choix ne change que votre écran. Prudent : loyer −5 %, un demi-mois vide de plus par an, prix 0,5 point par an plus bas. Favorable : l'inverse. Le central sert à comparer, le prudent à vérifier qu'on tient si ça tourne mal.</p></div>
   <div class="v2card"><h2>Thème (le vôtre)</h2>${themeSeg()}<p class="v2sub">Clair par défaut. Ce choix ne change que votre écran, carte comprise.</p></div>
   <div class="v2card"><h2>Le crédit</h2><div class="v2grid v2f">${f("apport","Apport (ensemble)","€",500)}${f("taux","Taux du crédit","%",0.05)}${f("duree","Durée","ans",1)}${f("notaire","Frais de notaire","%",0.5)}</div></div>
   ${assocCard()}
   <div class="v2card"><h2>Le bien et sa location</h2><p class="v2sub">Valeurs par défaut pour tous les ${typl()} (chaque type garde les siennes).${(()=>{const n=BIENS.filter(b=>!isOut(b)&&(+b.travaux>0||+b.meubles>0)).length; return n?` Meubles ou travaux remplacés par une valeur saisie dans ${n} bien${n>1?"s":""} suivi${n>1?"s":""}.`:"";})()}</p><div class="v2grid v2f">${f("surface","Surface type","m²",1)}${f("surcote","Prix payé vs prix moyen","%",5)}${f("loyerAdj","Loyer obtenu vs loyer médian","%",5)}${f("vacance","Vacance, ville moyenne","mois/an",0.5)}${f("chLoc","Charges payées par le locataire","€/mois",5)}${f("copro","Charges de copro (votre part)","€/mois",1)}${f("grosTrav","Gros travaux copro (provision)","€/m²/an",1)}${f("autres","Assurance PNO, entretien","€/mois",5)}${f("gestion","Gestion par agence","% du loyer",0.5)}${f("meubles","Meubles","€",250)}${f("travaux","Petits travaux","€",250)}</div>
   <p class="v2sub">Vacance : celle d'une ville où les studios se louent dans le délai médian des villes ; chaque ville s'en écarte selon le délai mesuré sur ses annonces (fiche de la ville), puis chaque quartier selon son emplacement. Gestion par agence : 0 si vous gérez vous-mêmes ; avec une agence, comptez 6 à 10 % TTC du loyer, plus 2 à 3,5 % pour une garantie des loyers impayés (barèmes relevés en novembre 2026), soit 9 à 10 % en tout.</p></div>
   <div class="v2card"><h2>Le long terme</h2><div class="v2grid v2f">${f("px","Hausse des prix, ville moyenne","%/an",0.5)}${f("ly","Hausse des loyers","%/an",0.5)}${f("fraisVente","Frais à la revente","%",0.5)}</div>
   <label style="display:flex;gap:10px;align-items:center;min-height:40px"><input type="checkbox" data-v2hb="pxV"${H.pxV?" checked":""} style="width:20px;height:20px;accent-color:var(--accent)">Hausse des prix selon la ville</label>
   <p class="v2sub">${(()=>{const P=typeof pxPente==="function"?pxPente():null; return P&&P.b?`Sur 2014-2025, les prix des appartements ont monté ${fr(Math.abs(P.b),2)} point par an de moins pour chaque point de logements vides en plus (${P.n} villes, Terralyse d'après DVF) : une ville à ${fr(P.vmed,1)} % de logements vides (la médiane) prend le réglage, les autres s'en écartent d'au plus 2 points. Les écarts d'une ville d'une période à l'autre, eux, ne se prolongent pas : c'est la part de logements vides qui compte. Valeur de chaque ville dans sa fiche.`:"Même hausse des prix pour toutes les villes.";})()}</p></div>
   <div class="v2card"><h2>Impôts</h2><div class="v2grid v2f"><div><label for="v2-reg">Régime</label><select id="v2-reg" data-v2fin="regime">${[["auto","Le plus avantageux"],["micro","Micro-BIC"],["reel","Réel"]].map(([k,l])=>`<option value="${k}"${H.regime===k?" selected":""}>${l}</option>`).join("")}</select></div></div><p class="v2sub">La tranche d'impôt de chacun se règle dans Associés.</p></div>
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
   <p class="v2sub v2offx" style="margin:0">${bb?(sv&&!keep?`Offre enregistrée pour ${nous()} : <b class="mono">${eur(sv)}</b>.`:keep?`Lâchez le curseur : l'offre est enregistrée pour ${nous()}.`:`Choisissez un prix : il sera enregistré pour ${nous()}.`):`Essai seulement. <button type="button" class="v2btn sm" data-v2offkeep="${esc(id)}">Garder cette offre (suit le bien)</button>`}</p>
   <div class="v2kp v2offx"><div class="v2k"><span>Rendement 15 ans à ce prix</span><b style="color:${cv(colIrr(y.irr))}">${pctS(y.irr)}</b><small>${scn()}</small></div><div class="v2k"><span>Cash-flow · mensualité</span><b style="color:${cfC(y.cf)}">${sgn(y.cf)}</b><small>mensualité ${eur(y.mens)}</small></div></div>
   <div class="v2tw v2offx"><table class="v2t v2tight"><thead><tr><th class="r">Offre</th><th class="r">Rendement 15 ans</th><th class="r">Cash-flow</th><th class="r">Mensualité</th></tr></thead><tbody>${rows}</tbody></table></div>
   ${bb?`<div class="v2f"><label for="v2cpd">Date du compromis</label><input type="date" id="v2cpd" value="${esc(cpd)}" data-suivi="${esc(bb.id)}|compromis"></div>${cpd?`<ol style="margin:0;padding-left:20px;line-height:1.8">${suiviSteps(bb).filter(x=>x.d&&x.k!=="offre"&&x.k!=="reponse").map(x=>`<li>${esc(x.l)} : ${esc(dateTxt(x.d))}</li>`).join("")}</ol>`:`<p class="v2sub">Indiquez la date du compromis pour voir les échéances jusqu'à l'acte (communes à ${nous()}, comme dans le suivi de l'achat).</p>`}`:""}</div>`;}
 /* la visite : les points de la grille de visite de nos biens (visite.check), communs à deux */
 function visite(b,id,bb){const r=calcBien(b), y=r.x, tv=r.V?r.V.travaux:null, ck=bb&&(bb.visite||{}).check||{};
  const nT=CHECK.reduce((s,g)=>s+g[1].length,0), nOk=Object.values(ck).filter(v=>v==="oui").length, nKo=Object.values(ck).filter(v=>v==="non").length, nV=Object.values(ck).filter(v=>v==="oui"||v==="non").length;
  return `<div class="v2sec"><h3>Visite</h3><p style="margin:0">Travaux : <b class="mono">${tv?eur(tv.v):"n.d."}</b> <span class="v2sub">(${tv&&tv.src==="saisi"?"saisis, au lieu de "+eur(tv.est)+" estimés":"estimés avant visite"})</span> · rendement 15 ans <b class="mono" style="color:${cv(colIrr(y.irr))}">${pctS(y.irr)}</b></p>
   <p class="v2sub" style="margin:0">Après la visite, remplacez l'estimation par le devis ou votre constat : la valeur vaut pour ${nous()}. <button type="button" class="v2btn sm" data-v2ft="calc" data-v2focus="pw-travaux">Modifier les travaux</button></p>
   ${bb?`<p style="margin:0">Grille de visite : <b class="mono">${nV}/${nT}</b> points vérifiés${nKo?` · <span style="color:var(--bad);font-weight:700">${nKo} problème${nKo>1?"s":""}</span>`:nOk?" · rien d'inquiétant":""}.</p><div><button type="button" class="v2btn" data-visit="${esc(bb.id)}">Ouvrir la grille de visite (${nT} points, à deux)</button></div>`
    :`<p class="v2sub" style="margin:0">La grille de visite (${nT} points, documents à demander) se remplit à deux sur un bien suivi.</p><div><button type="button" class="v2btn" data-v2star="${esc(b.ville)}|${esc(b.suf||"")}">☆ Suivre ce bien</button></div>`}</div>`;}
 function ficheBien(sel){const R=bienOfSel(sel); if(!R) return null; const b=R.b, id=R.kind==="b"?"b"+b.id:sel, r=calcBien(b), x=r.x, z=irr3(x)||{}, t=r.t, fx=ficx(R.kind==="v"?R.suf:(bienSuf(b)||""))||{};
  const {S,attn}=secs(bienFicheBody(b,{noHead:true}));
  const lo=-4,hi=12,p=v=>Math.max(0,Math.min(100,(v-lo)/(hi-lo)*100)), c=cv(colIrr(x.irr)), [bc,bt]=bank(x.ratio);
  const ph=R.kind==="v"?(R.a[4]?photoUrl(R.a[3],R.a[4],960,540):""):bienPhoto(b,960,540), bb=R.kind==="b"?b:R.ex, on=!!bb;
  const [me,oth]=people(), dpe=b.dpe||fx.dpe;
  const tit=String(R.kind==="b"?(b.titre||"Bien"):b.titre).split(" · ")[0], ann=R.kind==="v"?R.a[1]:b.quartier, qn=t?t.name:b.quartier||"";
  const chips=`${bc!=="p-ok"?`<span class="v2pill ${bc==="p-warn"?"warn":"bad"}" title="part des revenus prise par les crédits">Banque : ${bt.toLowerCase()} · ${Math.round(x.ratio*100)} % des revenus</span>`:""}${dpe?`<span class="v2pill ${"FG".includes(dpe)?"bad":dpe==="E"?"warn":""}">DPE ${dpe}${dpe==="G"?" · location interdite":dpe==="F"?" · interdite en 2028":dpe==="E"?" · interdite en 2034":""}</span>`:""}${R.kind==="v"?ficheBadges(R.suf,true)||"":""}`;
  const psuf=R.kind==="v"?R.suf:(typeof bienSuf==="function"?bienSuf(b)||"":""), pf=psuf?ficheOf(b.ville,psuf):null, pn=pf&&pf.ph?pf.ph.length:0;
  const head=`<div class="v2fhd">${ph?`<button type="button" class="v2fthb" data-v2photos="${esc(b.ville)}|${esc(psuf)}" aria-label="Voir les photos en grand"><img class="v2fth" src="${esc(ph)}" alt="" referrerpolicy="no-referrer" onerror="this.closest('.v2fthb').remove()"><span class="v2fthn">${pn>1?`${pn} photos`:"agrandir"}</span></button>`:""}<div class="v2fhdt"><h2 class="v2ft">${keur(+b.prix)} · ${esc(tit)}</h2><p class="v2sub">${esc(cityName(b.ville))}${qn?" · quartier "+esc(qn):""}${ann&&qn&&ann!==qn?` <span title="nom du secteur dans l'annonce">(« ${esc(ann)} » dans l'annonce)</span>`:""} · ${eur(+b.prix/(+b.surface||1))}/m² ${R.kind==="v"?_vuBadgesF("v",R.ck,R.suf):""}</p></div></div>
   <div class="v2kp v2kp3"><div class="v2k"><span>Rendement 15 ans · ${scn()}</span><b style="color:${c}">${pctS(x.irr)}</b><div class="v2bigbar" aria-hidden="true">${z.prudent!=null?`<i style="left:${p(z.prudent)}%;width:${p(z.favorable)-p(z.prudent)}%;background:${c}"></i>`:""}<b style="left:${p(x.irr)}%;background:${c}"></b></div><small>prudent ${pctS(z.prudent)} · favorable ${pctS(z.favorable)}</small></div>
    <div class="v2k"><span>Cash-flow${H.assoc.length>1?" à "+H.assoc.length:""}</span><b style="color:${cfC(x.cf)}">${sgn(x.cf)}</b><small>par mois · loyer ${eur(x.rentHC)} HC</small></div><div class="v2k"><span>Mensualité</span><b>${eur(x.mens)}</b><small>budget ${keur(x.cost)} tout compris</small></div></div>
   <p class="v2sub v2pos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/>${hasLL(bb)||posQ(fx)===0?'<circle cx="12" cy="10" r="2.6"/>':""}</svg>Sur la carte : ${esc(posTxt(R.kind==="v"||(b.url&&feed().some(o=>o.url===b.url))?fx:null,hasLL(bb),R.kind==="b"))}</p>
   ${chips?`<div class="v2chips">${chips}</div>`:""}
   <div class="v2bar">${R.kind==="v"?`<button type="button" class="v2btn${on?"":" pri"}" data-v2star="${R.ck}|${esc(R.suf)}" aria-pressed="${on}">${on?"★ Dans la shortlist":"☆ Ajouter à la shortlist"}</button>`:`${stPill(b)}<button type="button" class="v2btn sm" data-unshort="${esc(b.id)}">Retirer</button>`}${b.url?`<a class="v2btn sm" href="${esc(b.url)}" target="_blank" rel="noopener">Voir l'annonce ↗</a>`:""}${bb?`<button type="button" class="v2btn sm" data-fiche="${esc(bb.id)}">Fiche à emporter</button>`:""}</div>
   ${bb?`<div class="v2sec"><h3>À deux</h3><div class="v2vrow"><b>${esc(me||"Vous")}</b>${me?voteBtns(bb,me):`<span class="v2sub">indiquez votre prénom dans Nos biens</span>`}</div>${oth.map(o=>`<div class="v2vrow"><b>${esc(o)}</b>${voteTxt(bb,o)}</div>`).join("")}</div>`:""}`;
  const extra={prix:prixNuage(b,t),achat:offre(b,id,bb)+visite(b,id,bb),bien:attn,calc:assocDetail(x)};
  return {title:`${keur(+b.prix)} · ${cityName(b.ville)}`,head,S,extra};}
 const dl=L=>`<dl class="v2dl">${L.filter(Boolean).map(([a,b])=>`<dt>${a}</dt><dd>${b}</dd>`).join("")}</dl>`;
 function ficheQV(sel){const [k,ck,code]=sel.split("|");
  if(k==="q"){const t=IR[ck]&&IR[ck].list.find(v=>v.code===code); if(!t) return null; const {S,attn}=secs(quartierFiche(t)); let x=null; try{x=t.type==="H"?(QX[t.ck+t.i]||calcIris(t)):null;}catch(_){}
   const A=feed().filter(o=>o.ck===ck&&o.t&&o.t.code===code), m=A.filter(pass).length;
   const kp=x&&x.irr!=null?`<div class="v2kp v2kp3"><div class="v2k"><span>Rendement 15 ans · ${scn()}</span><b style="color:${cv(colIrr(x.irr))}">${pctS(x.irr)}</b><small>${tyl().toLowerCase()} type de ${H.surface} m²</small></div><div class="v2k"><span>Cash-flow</span><b style="color:${cfC(x.cf)}">${sgn(x.cf)}</b><small>par mois</small></div><div class="v2k"><span>Budget</span><b>${keur(x.cost)}</b><small>tout compris</small></div></div>`:"";
   const bref=`<div class="v2sec"><h3>En bref</h3>${dl([["Annonces pour nos critères",A.length?`<b>${m}</b> sur ${A.length} dans le quartier`:"aucune annonce relevée dans le quartier"],x&&x.irr!=null&&["Loyer hors charges",`${eur(x.rentHC)} par mois`]])}</div>`;
   return {title:`${t.name} · ${cityName(ck)}`,head:`<h2 class="v2ft">${esc(t.name)}</h2><p class="v2sub">Quartier de ${esc(cityName(ck))}</p>${kp}`,S,extra:{bien:bref+attn},city:ck};}
  if(k==="c"){const c=C.find(v=>v.k===ck); if(!c) return null; const {S,attn}=secs(villeFiche(c)); const x=V.tous?Object.assign({},calcVille(c),stats(ck)):calcVille(c), z=cz(x), [m,n]=cityCnt(ck);
   const bref=`<div class="v2sec"><h3>En bref</h3>${dl([["Annonces pour nos critères",n?`<b>${m}</b> sur ${n}`:"pas d'annonces relevées"],[`Prix d'${tyLow()==="studio"?"un studio":"un "+tyl()} type${x.qt&&!V.tous?" (quartier du milieu)":""}`,`${keur(x.bien)} pour ${H.surface} m² (${nf(x.bien/H.surface)} €/m²)`],["Loyer hors charges",`${eur(x.rentHC)} par mois`],["Étudiants",nf(c.students)],["Paris en train",hm(c.paris)],c.note&&["À savoir",esc(c.note)]])}</div>`;
   return {title:c.name,head:`<h2 class="v2ft">${esc(c.name)}</h2><div class="v2kp v2kp3"><div class="v2k"><span>Rendement 15 ans · ${scn()}</span><b style="color:${cv(colIrr(x.irr))}">${pctS(x.irr)}</b><small>${V.tous?`médiane de ${x.n} annonces`:`prudent ${pctS(z.prudent)} · favorable ${pctS(z.favorable)}`}</small></div><div class="v2k"><span>Cash-flow</span><b style="color:${cfC(x.cf)}">${sgn(x.cf)}</b><small>par mois</small></div><div class="v2k"><span>Budget</span><b>${keur(x.cost)}</b><small>tout compris</small></div></div><p class="v2sub" style="margin:0">${V.tous?`Médiane des ${x.n} annonces de la ville, tous types ; les rubriques ci-dessous sont pour ${tyLow()==="studio"?"un studio":"un "+tyl()} type.`:x.qt?`Quartier du milieu : ${esc(x.qt.name)}. La moitié des ${typl()} vendus le sont dans des quartiers au rendement plus haut, l'autre moitié plus bas ; la couleur de la ville est celle de ce quartier.`:`Moyenne d'${tyLow()==="studio"?"un studio":"un "+tyl()} type dans la ville.`}</p>`,S,extra:{bien:bref+attn}};}
  return null;}
 function fiche(){const el=$("v2fiche"); if(!V.sel){el.hidden=true; el.innerHTML=""; return;}
  const F=V.sel[0]==="v"||V.sel[0]==="b"?ficheBien(V.sel):ficheQV(V.sel); if(!F){V.sel=null; el.hidden=true; return;}
  const tabs=FT.filter(([k,,ss])=>ss.some(s=>F.S[s])||(F.extra[k]&&F.extra[k].length)); let cur=tabs.some(t=>t[0]===V.ftab)?V.ftab:(tabs[0]||["bien"])[0];
  const g=FT.find(t=>t[0]===cur)||FT[0], zone=V.sel[0]==="c"||V.sel[0]==="q";
  el.hidden=false; el.innerHTML=`<div class="v2fh"><button type="button" class="v2btn sm" data-v2close aria-label="Fermer la fiche">${PH()?"Retour":"×"}</button><b>${esc(F.title)}</b></div>
   <div class="v2fb">${F.head}<div class="v2tabs2" role="group" aria-label="Rubriques de la fiche">${tabs.map(([k,l])=>{const t=zone&&k==="bien"?"En bref":zone&&k==="achat"?"Sources":l, c=PH()?t.replace(/^L(e |')/,""):t; return `<button type="button" data-v2ft="${k}" aria-pressed="${k===cur}">${c[0].toUpperCase()+c.slice(1)}</button>`;}).join("")}</div>
   ${F.extra[cur]||""}${g[2].map(s=>F.S[s]||"").join("")}</div>`;
  if(M) requestAnimationFrame(()=>M.resize());}
 function openSel(s,keepTab){if(GPOP){GPOP.remove(); GPOP=null;}if(V.tous&&s[0]==="v"){const o=feed().find(x=>key(x)===s); if(o&&o.ty!==H.type) setType(o.ty,true);} V.sel=s; FLYP=V.tab!=="carte"&&(s[0]==="v"||s[0]==="b")?s:null; flyAd(s); if(!keepTab&&(s[0]==="v"||s[0]==="b")&&!["bien","prix","calc","quartier","achat"].includes(V.ftab)) V.ftab="bien"; fiche(); if(V.tab==="carte"){mapList(); drawMap();} else paint(V.tab); $("v2fiche").scrollTop=0;}

 /* ---------- ajouter un bien à la main ----------
    Le formulaire de l'app (recherche d'adresse, quartier, contrôles, envoi dans la liste commune) est déplacé dans une fenêtre,
    puis remis à sa place à la fermeture. */
 let ADDHOME=null;
 function addDlg(){const f=$("biensForm"); if(!f||document.querySelector(".v2dlg")) return; if(!ADDHOME) ADDHOME=[f.parentNode,f.nextSibling];
  const d=document.createElement("div"); d.className="v2dlg"; d.innerHTML=`<div class="v2dlgb" role="dialog" aria-modal="true" aria-labelledby="v2aT"><div class="v2bar"><h2 id="v2aT" class="v2h1">Ajouter un bien</h2><span class="v2sp"></span><button type="button" class="v2btn sm" data-v2addx>Fermer</button></div><p class="v2sub">Une annonce repérée ailleurs : le calcul reprend nos réglages, le loyer et la vacance du quartier. Indiquez au moins le prix et la surface ; l'adresse permet de trouver le quartier.</p><div id="v2addslot"></div></div>`;
  document.body.appendChild(d); $("v2addslot").appendChild(f);
  const st=$("biensState"); if(st){st.textContent=""; const mo=new MutationObserver(()=>{if(/Bien ajouté/.test(st.textContent)){mo.disconnect(); setTimeout(()=>{addClose(); toast("Bien ajouté à nos biens."); V.tab="biens"; save(); show();},400);}}); mo.observe(st,{childList:true,characterData:true,subtree:true}); d._mo=mo;}
  const i=f.querySelector("input"); if(i&&!PH()) i.focus();}
 function addClose(){const d=document.querySelector(".v2dlg"), f=$("biensForm"); if(f&&ADDHOME&&f.closest(".v2dlg")) ADDHOME[0].insertBefore(f,ADDHOME[1]); if(d){if(d._mo) d._mo.disconnect(); d.remove();}}

 /* ---------- dialogue des critères (premier lancement) ---------- */
 function critDlg(first){if(document.querySelector(".v2dlg")) return; const d=document.createElement("div"); d.className="v2dlg"; const c=critV();
  const n=()=>feed().filter(o=>o.x.cost<=+$("v2cB").value&&o.x.irr>=+$("v2cR").value&&(!$("v2cK").checked||bankOk(o.x.ratio))).length;
  d.innerHTML=`<form aria-labelledby="v2cT"><h2 id="v2cT" class="v2h1">${first?"Que cherchez-vous ?":"Nos critères"}</h2><p class="v2sub">Ces critères filtrent la carte, le tableau et le nuage${regShared()?", pour "+nous():""}. Vous pourrez les changer à tout moment.</p>
   <div class="v2f"><label>Type de bien</label><span class="v2seg" role="group" aria-label="Type de bien">${Object.entries(TYPES).map(([k,T])=>`<button type="button" data-type="${k}" aria-pressed="${!V.tous&&H.type===k}">${T.lab}</button>`).join("")}<button type="button" data-v2tous aria-pressed="${!!V.tous}">Tous</button></span></div>
   <div class="v2f"><label for="v2cB">Budget tout compris : <b class="mono" id="v2cBv" style="color:var(--fg)"></b></label><input type="range" id="v2cB" min="40000" max="250000" step="5000" value="${c.budget}"></div>
   <div class="v2f"><label for="v2cR">Rendement 15 ans minimum : <b class="mono" id="v2cRv" style="color:var(--fg)"></b></label><input type="range" id="v2cR" min="-3" max="8" step="0.5" value="${c.rmin}"></div>
   <label style="display:flex;gap:10px;align-items:center;min-height:40px"><input type="checkbox" id="v2cK"${c.bank?" checked":""} style="width:20px;height:20px;accent-color:var(--accent)">La banque doit suivre</label>
   <p style="margin:0;font-size:16px"><b class="mono" id="v2cN"></b> annonces correspondent aujourd'hui.</p>
   <div class="v2bar"><span class="v2sp"></span>${first?"":'<button type="button" class="v2btn" data-v2cx>Annuler</button>'}<button type="submit" class="v2btn pri">Voir le marché</button></div></form>`;
  document.body.appendChild(d); const up=()=>{$("v2cBv").textContent=keur(+$("v2cB").value); $("v2cRv").textContent=fr(+$("v2cR").value)+" %"; $("v2cN").textContent=n();};
  ["v2cB","v2cR","v2cK"].forEach(i=>$(i).addEventListener("input",up)); up();
  d.addEventListener("click",e=>{if(e.target.closest("[data-type],[data-v2tous]")) setTimeout(()=>{FEED=null; d.querySelectorAll("[data-type]").forEach(b=>b.setAttribute("aria-pressed",String(!V.tous&&b.dataset.type===H.type))); d.querySelectorAll("[data-v2tous]").forEach(b=>b.setAttribute("aria-pressed",String(!!V.tous))); up();},0); if(e.target.closest("[data-v2cx]")) d.remove();});
  d.querySelector("form").addEventListener("submit",e=>{e.preventDefault(); NOSCRIT={budget:+$("v2cB").value,rmin:+$("v2cR").value,bank:$("v2cK").checked}; saveCrit(); V.vue="crit"; save(); d.remove(); refresh();});
  $("v2cB").focus();}

 /* ---------- affichage ---------- */
 function paint(k){if(k==="annonces") pAnnonces(); else if(k==="villes") pVilles(); else if(k==="biens") pBiens(); else if(k==="budget") pBudget(); else {mapList(); mapLegend(); drawMap();}}
 function show(){TABS.forEach(([k])=>{$("v2p-"+k).hidden=k!==V.tab;}); const fp=V.tab==="carte"&&flyPending(); top(); paint(V.tab); fiche(); vuSnap();
  if(V.tab==="carte") mapLib(()=>{mapInit(); requestAnimationFrame(()=>{if(!M) return; M.resize(); if(fp&&MREADY&&FLYP===V.sel){padSync(); flyAd(FLYP,true); FLYP=null;}});});}
 /* une relecture de la liste commune (toutes les 20 s) ne repeint pas la page pendant qu'on tape dans un champ : elle attend qu'on en sorte */
 let RQ=0, RWAIT=false; const typing=()=>{const a=document.activeElement; return !!(a&&app.contains(a)&&a.matches("input:not([type=range]):not([type=checkbox]),select,textarea"));};
 function refresh(){cancelAnimationFrame(RQ); RQ=requestAnimationFrame(()=>{if(typing()){RWAIT=true; top(); return;} RWAIT=false; top(); paint(V.tab); fiche(); vuSnap();});}
 app.addEventListener("focusout",()=>{if(RWAIT) setTimeout(()=>{if(!typing()) refresh();},0);});

 /* ---------- bouton ou geste « retour » (téléphone, appli installée, navigateur) ----------
    Chaque couche ouverte — un onglet autre que la carte, une fiche, une fenêtre, la visionneuse — ajoute une entrée à l'historique
    du navigateur ; « retour » referme la plus récente au lieu de quitter l'app. Fermée par l'app (×, Retour, Échap, un autre choix),
    la couche retire son entrée (BKSKIP : le retour qu'on provoque alors ne referme rien). Entrée devenue inutile au milieu : « x »,
    sautée au retour suivant. */
 const BK=[]; let BKSKIP=0, BKQ=0;
 const BKON={tab:()=>V.tab!=="carte",sel:()=>!!V.sel,dlg:()=>!!document.querySelector(".v2dlg"),lb:()=>!!document.querySelector(".v2lb")};
 function bkSync(){for(const k of ["tab","sel","dlg","lb"]){const on=BKON[k](), i=BK.lastIndexOf(k);
   if(on&&i<0){BK.push(k); try{history.pushState({v2bk:BK.length},"");}catch(_){}}
   else if(!on&&i>=0){if(i===BK.length-1){BK.pop(); BKSKIP++; try{history.back();}catch(_){BKSKIP--;}} else BK[i]="x";}}}
 const bkLater=()=>{cancelAnimationFrame(BKQ); BKQ=requestAnimationFrame(bkSync);};
 function bkClose(k){
  if(k==="lb") lbClose();
  else if(k==="dlg"){const d=document.querySelector(".v2dlg"); if(d){if(d.querySelector("#biensForm")) addClose(); else d.remove();}}
  else if(k==="sel"){V.sel=null; fiche(); if(V.tab==="carte"){mapList(); drawMap();} else paint(V.tab);}
  else if(k==="tab"){V.tab="carte"; save(); show();}}
 addEventListener("popstate",()=>{if(BKSKIP){BKSKIP--; return;} const k=BK.pop(); if(!k) return; if(k==="x"){try{history.back();}catch(_){} return;} bkClose(k);});
 new MutationObserver(bkLater).observe(document.body,{childList:true});
 {const f0=fiche, s0=show; fiche=function(){const r=f0.apply(this,arguments); bkLater(); return r;}; show=function(){const r=s0.apply(this,arguments); bkLater(); return r;};}
 window.V2CITY=()=>V.city||null;   /* ville affichée : ses fiches complètes sont lues en avance (25-annonces-cloud.js) */

 /* ---------- événements ---------- */
 document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-v2tab],[data-v2scn],[data-v2vue],[data-v2av],[data-v2cv],[data-v2sort],[data-v2more],[data-v2star],[data-v2vote],[data-v2ft],[data-v2close],[data-v2crit],[data-v2min],[data-v2nom],[data-v2share],[data-v2city],[data-v2open],[data-v2cfiche],[data-v2photos],[data-v2gonew],[data-v2reset],[data-v2offkeep],[data-v2csort],[data-v2add],[data-v2addx],[data-v2cmpx],[data-v2nas],[data-v2tous],[data-v2theme],[data-type]"); if(!t||!app.contains(t)&&!t.closest(".v2dlg")) return; const d=t.dataset;
  if(d.v2tab!=null){e.preventDefault(); V.tab=d.v2tab; save(); show(); return;}
  if(d.type){if(V.tous){V.tous=false; save(); FEED=null;} return;}   /* Studio, T2, T3 : le type est changé par 49-type-ui.js */
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
  if(d.v2theme!=null){setTheme(d.v2theme||(DARK()?"light":"dark")); return;}
  if(d.v2add!=null){addDlg(); return;}
  if(d.v2addx!=null){addClose(); return;}
  if(d.v2cmpx!=null){CMPS.clear(); refresh(); return;}
  if(d.v2tous!=null){if(!V.tous){V.tous=true; save(); FEED=null; toast("Calcul des annonces des trois types…"); const dl=t.closest(".v2dlg"); if(dl) dl.querySelectorAll("[data-type],[data-v2tous]").forEach(b=>b.setAttribute("aria-pressed",String(b.hasAttribute("data-v2tous")))); refresh(); if(V.tab==="carte") drawMap();} return;}
  if(d.v2nas){const k=+d.v2nas, A=H.assoc.slice(0,k); while(A.length<k) A.push(assoc0(k)); A.forEach(a=>{a.part=100/k;}); H.assoc=A; assocNorm(); saveFin(); CALCC.clear(); VC.clear(); render(); return;}
  if(d.v2reset!=null){if(confirm(regShared()?`Revenir aux valeurs par défaut pour ${nous()} ? Vos critères et vos biens ne changent pas.`:"Revenir aux valeurs par défaut ? Vos critères et vos biens ne changent pas.")) regReset(); return;}
  if(d.v2offkeep){const [k,ck,...r]=d.v2offkeep.split("|"), suf=r.join("|"), P=(ADS[ck]&&ADS[ck].ventes||[]).find(v=>v[3]===suf); if(!P) return; const pr=Math.round(P[2]*(OFFT[d.v2offkeep]??100)/100/500)*500;
   Promise.resolve(mStar(ck,suf)).then(()=>setTimeout(()=>{const b=bienOf(VTURL+suf); if(b){delete OFFT[d.v2offkeep]; updBien(b.id,{visite:Object.assign(visCopy(b),{offre:pr})});}},600)); return;}
  if(d.v2min!=null){V.min=!V.min; save(); mapList(); return;}
  if(d.v2cfiche){openSel(`c|${d.v2cfiche}`,true); return;}
  if(d.v2photos!=null){const [c,...r]=d.v2photos.split("|"), im=t.querySelector("img"); lbOpen(c,r.join("|"),im&&im.src); return;}   /* photos en grand */   /* fiche de la ville, depuis l'en-tête de la liste */
  if(d.v2nom!=null){const n=($("v2nom").value||"").trim(); if(n){try{localStorage.setItem("biens-nom",n);}catch(_){} refresh();} return;}
  if(d.v2share!=null){const n=($("v2nom2").value||"").trim(), c=($("v2code").value||"").trim(), chg=c!==sbCode(); try{localStorage.setItem("biens-nom",n); localStorage.setItem("biens-code",c);}catch(_){} if(chg) location.reload(); else {toast("Enregistré."); refresh();} return;}
  if(d.v2city!=null&&!e.target.closest("[data-v2open]")){goCity(d.v2city); return;}
  if(d.v2open){if(e.target.closest("button,a,input,select,label,[data-stmenu]")&&!t.matches("button")) return; openSel(d.v2open); return;}});
 document.addEventListener("keydown",e=>{const t=e.target; if((e.key==="Enter"||e.key===" ")&&t.matches&&t.matches("[data-v2open],[data-v2city],[data-v2gonew],.v2nrow")&&!t.matches("button")){e.preventDefault(); t.click();}
  if(e.key==="Escape"){const dl=document.querySelector(".v2dlg"); if(dl&&dl.querySelector("[data-v2addx]")){addClose(); return;} if(dl&&dl.querySelector("[data-v2cx]")){dl.remove(); return;}}
  if(e.key==="Escape"&&V.sel&&!document.querySelector(".v2dlg")&&$("visitPanel").hidden&&$("fichePanel").hidden){V.sel=null; fiche(); paint(V.tab);}});
 document.addEventListener("input",e=>{const t=e.target, d=t.dataset; if(!d) return;
  /* curseur d'offre : seuls les chiffres autour changent (le curseur reste sous le doigt) */
  if(d.v2off){OFFT[d.v2off]=+t.value; const R=V.sel&&bienOfSel(V.sel); if(!R) return; const b=R.b, tmp=document.createElement("div");
   tmp.innerHTML=offre(b,R.kind==="b"?"b"+b.id:V.sel,R.kind==="b"?b:R.ex); const nw=tmp.querySelectorAll(".v2offx"), old=$("v2fiche").querySelectorAll(".v2offx");
   if(nw.length===old.length) old.forEach((o,i)=>{o.innerHTML=nw[i].innerHTML;});}});
 document.addEventListener("change",e=>{const t=e.target, d=t.dataset; if(!d) return;
  if(t.matches("[data-v2sortm]")){const [k,dd]=t.value.split("|"); if(dd){V.sort=[k,+dd]; save(); refresh();} return;}
  if(t.matches("[data-v2qm]")){V.qm=QM[t.value]?t.value:"irr"; save(); t.blur(); drawMap(); return;}   /* couleur des quartiers sur la carte */
  if(d.v2h){const v=+t.value; if(isFinite(v)){H[d.v2h]=v; if(TYK.includes(d.v2h)) saveTyv(d.v2h); else saveHyp(); if(typeof CALCC!=="undefined") CALCC.clear(); if(typeof VC!=="undefined") VC.clear(); render();}}
  else if(d.v2hb){H[d.v2hb]=t.checked?1:0; saveHyp(); if(typeof CALCC!=="undefined") CALCC.clear(); if(typeof VC!=="undefined") VC.clear(); render();}
  else if(d.v2as){const [i,k]=d.v2as.split("|"), a=H.assoc[+i]; if(!a) return; a[k]=k==="nom"?t.value.trim():+t.value; assocNorm(); saveFin(); CALCC.clear(); VC.clear(); render();}
  else if(d.v2fin){H[d.v2fin]=d.v2fin==="regime"?t.value:+t.value; if(typeof saveFin==="function") saveFin(); if(typeof CALCC!=="undefined") CALCC.clear(); if(typeof VC!=="undefined") VC.clear(); render();}
  else if(d.v2cmp){if(t.checked){if(CMPS.size>=4){t.checked=false; toast("Quatre biens au plus."); return;} CMPS.add(d.v2cmp);} else CMPS.delete(d.v2cmp); refresh();}
  else if(d.v2offb){const b=BIENS.find(x=>x.id===d.v2offb); if(!b) return; const pr=Math.round(+b.prix*(+t.value)/100/500)*500; delete OFFT[d.v2off]; updBien(b.id,{visite:Object.assign(visCopy(b),{offre:pr})});}});
 /* l'app recalcule (type, scénario, hypothèses, liste partagée, annonces reçues) : la v2 suit */
 const _render=render; render=function(){_render.apply(this,arguments); FEED=null; refresh(); if(V.tab==="carte") drawMap();};
 document.addEventListener("biens",()=>{FEED=null; refresh();});   /* la liste commune a changé (11-nos-biens.js) */
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
