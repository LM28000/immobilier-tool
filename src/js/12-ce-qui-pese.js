/* ---------- ce qui pèse sur un bien : les valeurs du calcul propres à ce bien, leur provenance et leur poids ----------
   Chaque valeur vient, dans cet ordre : de ce que vous avez saisi (ce bloc, la fiche de visite), de l'annonce (description lue,
   charges annoncées, DPE), sinon d'une estimation. Estimations des travaux et des meubles — ordres de grandeur relevés en novembre 2026 :
   rafraîchissement 150 à 300 €/m², rénovation complète 650 à 1 000 €/m² (La Maison Saint-Gobain) ; rénovation énergétique performante
   200 à 350 €/m² en médiane, plus chère pour les plus mauvaises classes (EDF R&D) ; meubles neufs 3 000 à 6 000 €. Règles :
   - état lu dans la description : « neuf » ou « très bon » → un quart des petits travaux ; « bon » ou inconnu → petits travaux du réglage ;
     « à rafraîchir » → 200 €/m² ; « à rénover » → 650 €/m² (bas de fourchette : villes moyennes, hors Paris) ;
   - un montant écrit dans l'annonce remplace l'estimation par l'état ; les travaux votés en copropriété à la charge de l'acheteur s'ajoutent ;
   - DPE (location interdite : G depuis 2025, F en 2028, E en 2034, dans les 15 ans du calcul) : G 300 €/m², F 200 €/m², E 100 €/m² ;
   - meubles : réglage du type ; bien vendu meublé → un tiers (compléments).
   Une valeur du bien égale à celle de l'annonce a été recopiée à l'ajout dans la shortlist (biens ajoutés avant le 8 novembre 2026) :
   elle compte comme venant de l'annonce, pas comme saisie. */
const TRV_ETAT={"neuf":["q",0.25],"très bon":["q",0.25],"à rafraîchir":["m2",200],"à rénover":["m2",650]};
const DPE_M2={G:[300,"déjà interdite"],F:[200,"interdite en 2028"],E:[100,"interdite en 2034"]};
const PW_CHAMPS=["travaux","meubles","loyer","copro","tf"];
const r50=v=>Math.round(v/50)*50;

function valeursBien(b,ty){
 ty=ty||b.type||typeFor(+b.surface||22,b.pieces); const T=tyOf(ty), D=ty===H.type?H:Object.assign({},H,typeDefaults(ty)), S=+b.surface||T.surf;
 const suf=b.kind==="v"?b.suf:(b.url&&typeof bienSuf==="function"?bienSuf(b):null), fx=suf&&typeof ficx==="function"?ficx(suf):null;
 const ia=fx&&typeof lueIA==="function"?lueIA(fx):{loyer:0,travaux:0,tf:0}, raw=(fx&&fx.ia)||{}, fl=(fx&&fx.fl)||[], dpe=b.dpe||(fx&&fx.dpe)||"";
 const typed=(v,...annonce)=>+v>0&&!annonce.some(a=>a>0&&Math.round(+v)===Math.round(a));
 const out={fx,raw,dpe};
 {const L=[], petits=D.travaux, ecrit=raw.travaux_a_prevoir||0, votes=raw.travaux_votes||0, etat=raw.etat||(fl.includes("trav")?"à rafraîchir":""), e=TRV_ETAT[etat];
  if(ecrit>0) L.push(["Montant écrit dans l'annonce",ecrit,"annonce"]);
  else if(e&&e[0]==="m2") L.push([`${etat[0].toUpperCase()+etat.slice(1)}${raw.etat?"":" (mot repéré dans la description)"} : ${e[1]} €/m² × ${fr(S,0)} m²`,Math.max(petits,r50(e[1]*S)),"description"]);
  else if(e) L.push([`État « ${etat} » d'après la description : quelques reprises`,r50(petits*e[1]),"description"]);
  else L.push(["Petits travaux (réglage du type)",petits,"réglage"]);
  if(votes>0) L.push(["Travaux votés en copropriété",votes,"annonce"]);
  const dp=DPE_M2[dpe]; if(dp) L.push([`DPE ${dpe} : ${dp[0]} €/m² × ${fr(S,0)} m² (location ${dp[1]})`,r50(dp[0]*S),"DPE"]);
  const est=L.reduce((a,z)=>a+z[1],0);
  out.travaux=typed(b.travaux,ia.travaux)?{v:+b.travaux,src:"saisi",est,L}:{v:est,src:"estimé",est,L};}
 {const meub=fl.includes("meub"), est=meub?r50(D.meubles/3):D.meubles, L=[[meub?"Vendu meublé : compléments (un tiers des meubles du type)":"Meubles neufs (réglage du type)",est,meub?"description":"réglage"]];
  out.meubles=+b.meubles>0?{v:+b.meubles,src:"saisi",est,L}:{v:est,src:"estimé",est,L};}
 out.loyer=typed(b.loyer,ia.loyer)?{v:+b.loyer,src:"saisi"}:ia.loyer>0?{v:ia.loyer,src:"annonce",bail:true}:{v:0,src:"estimé"};
 const ca=fx&&typeof copAn==="function"?copAn(fx):null, cpA=ca?ca/12*PART_PROPRIO:0;
 out.copro=typed(b.copro,ca?ca/12:0,cpA)?{v:+b.copro,src:"saisi"}:cpA?{v:cpA,src:"annonce",tot:ca/12}:{v:D.copro,src:"estimé"};
 out.tf=typed(b.tf,ia.tf)?{v:+b.tf,src:"saisi"}:ia.tf>0?{v:ia.tf,src:"annonce"}:{v:0,src:"estimé"};
 return out;}

/* une annonce déjà dans nos biens : ce qu'on a saisi sur le bien s'applique aussi à l'annonce (classements, fiches) */
function avecSaisies(vb){const ex=typeof bienOf==="function"?bienOf(vb.url):null; if(!ex||(typeof isOut==="function"&&isOut(ex))) return vb;
 const o=Object.assign({},vb,{bid:ex.id}); PW_CHAMPS.forEach(k=>{if(+ex[k]>0) o[k]=+ex[k];}); if(ex.dpe) o.dpe=ex.dpe; return o;}

/* le bloc : une ligne par valeur, avec sa provenance et son poids (écart de rendement pour un pas donné) */
function pwKey(b){const ex=b.id?null:(b.bid||null); return b.id?"b|"+b.id:ex?"b|"+ex:"v|"+b.ville+"|"+(b.kind==="v"?b.suf:bienSuf(b)||"");}
function poidsHtml(b){const r=calcBien(b), V=r.V, x=r.x; if(!V||x.irr==null) return "";
 const ty=b.type||typeFor(+b.surface||22,b.pieces), D=ty===H.type?H:Object.assign({},H,typeDefaults(ty));
 const d=patch=>{const y=calcBien(Object.assign({},b,patch)).x; return y.irr==null?null:y.irr-x.irr;};
 const loyCC=V.loyer.v||Math.round(x.rentHC+D.chLoc), tfAn=V.tf.v||Math.round(x.tf*12);
 const pt=v=>v==null?"":`${v>0?"+":"−"}${fr(Math.abs(v),1)} pt`;
 const src=(o,est)=>o.src==="saisi"?`saisi · ${est}`:est;
 const det=L=>L.map(z=>`${esc(z[0])} : ${eur(z[1])}`).join(" + ");
 const rows=[
  ["travaux","Travaux","€",500,V.travaux.v,src(V.travaux,`estimé : ${det(V.travaux.L)}`),[1000,"1 000 €",d({travaux:V.travaux.v+1000})]],
  ["meubles","Meubles","€",250,V.meubles.v,src(V.meubles,`estimé : ${det(V.meubles.L)}`),[1000,"1 000 €",d({meubles:V.meubles.v+1000})]],
  ["loyer","Loyer charges comprises","€/mois",5,loyCC,src(V.loyer,V.loyer.src==="annonce"?`bail en cours lu dans l'annonce (${V.raw.fin_bail?"fin "+esc(V.raw.fin_bail):"départ supposé dans 3 ans"}, puis relevé)`:`estimé : loyer du ${r.t?"quartier":"secteur"} pour ${fr(+b.surface||22,0)} m², ${eur(D.chLoc)} de charges`),[25,"25 €/mois",d({loyer:loyCC+25})]],
  ["copro","Charges copro (votre part)","€/mois",1,Math.round(V.copro.v),src(V.copro,V.copro.src==="annonce"?`annonce : ${eur(V.copro.tot)}/mois de charges, ${Math.round(PART_PROPRIO*100)} % pour vous`:`estimé (réglage du type)`),[20,"20 €/mois",d({copro:V.copro.v+20})]],
  ["tf","Taxe foncière","€/an",10,tfAn,src(V.tf,V.tf.src==="annonce"?"lue dans l'annonce":`estimée : taux de ${esc(cityName(b.ville))} × surface`),[200,"200 €/an",d({tf:tfAn+200})]]];
 const key=pwKey(b);
 return `<div class="pwbox" data-pwbox="${esc(key)}">
  <p class="sub" style="margin:0 0 6px">Les valeurs qui changent le plus le résultat. Modifiez-en une : le rendement se recalcule, et c'est enregistré dans nos biens (pour vous deux). Videz le champ pour revenir à l'estimation.</p>
  <div class="pwrows">${rows.map(([k,lab,u,st,v,s,[,pl,dv]])=>{const o=V[k];
   return `<div class="pwr"><label class="pwl" for="pw-${k}">${lab}</label><span class="inp pwi"><input id="pw-${k}" data-pw="${k}" type="number" min="0" step="${st}" value="${o.src==="saisi"?Math.round(o.v):""}" placeholder="${Math.round(v)}"><span>${u}</span></span>
    <span class="pws"><span class="pill ${o.src==="saisi"?"p-ok":o.src==="annonce"?"p-n":"p-warn"}">${o.src}</span> ${s}</span><span class="pwp mono" title="Effet sur le rendement sur 15 ans">${pl} de plus : ${pt(dv)}</span></div>`;}).join("")}</div>
  <p class="pwres" data-pwres>Rendement ${mlab()} : <b class="mono" style="color:${colIrr(x.irr)}">${pct(x.irr)}</b> · cash-flow ${sgn(x.cf)}/mois</p></div>`;}

function pwBase(key){const [k,...r]=key.split("|");
 if(k==="b") return BIENS.find(x=>x.id===r[0])||null;
 const ck=r[0], suf=r.slice(1).join("|"), a=(ADS[ck]&&ADS[ck].ventes||[]).find(v=>v[3]===suf); return a?Object.assign(avecSaisies(venteBien(ck,a)),{kind:"v",suf}):null;}
function pwPatch(box){const p={}; box.querySelectorAll("[data-pw]").forEach(i=>{if(i.value!=="") p[i.dataset.pw]=Math.max(0,+i.value||0);}); return p;}
document.addEventListener("input",e=>{const i=e.target.closest&&e.target.closest("[data-pw]"); if(!i) return; const box=i.closest("[data-pwbox]"), b=box&&pwBase(box.dataset.pwbox); if(!b) return;
 const clean=Object.assign({},b); PW_CHAMPS.forEach(k=>{if(box.querySelector(`[data-pw="${k}"]`)) clean[k]=0;});
 const x=calcBien(Object.assign(clean,pwPatch(box))).x, res=box.querySelector("[data-pwres]");
 if(res) res.innerHTML=`Rendement ${mlab()} : <b class="mono" style="color:${colIrr(x.irr)}">${x.irr==null?"n.d.":pct(x.irr)}</b> · cash-flow ${sgn(x.cf)}/mois <span class="sub">(non enregistré)</span>`;});
document.addEventListener("change",async e=>{const i=e.target.closest&&e.target.closest("[data-pw]"); if(!i) return; const box=i.closest("[data-pwbox]"); if(!box) return;
 const f=i.dataset.pw, v=i.value===""?0:Math.max(0,Math.round(+i.value||0)), key=box.dataset.pwbox, [k,...r]=key.split("|");
 if(!DB){toast("Pour enregistrer, ouvrez « Nos biens » et indiquez le code de votre groupe."); return;}
 if(k==="b"){await updBien(r[0],{[f]:v}); return;}
 const ck=r[0], suf=r.slice(1).join("|"), a=(ADS[ck]&&ADS[ck].ventes||[]).find(z=>z[3]===suf); if(!a) return;
 const old=BIENS.find(x=>x.url===VTURL+suf); if(old){await updBien(old.id,Object.assign({[f]:v},isOut(old)?{statut:"à voir",short:true}:{})); return;}
 const vb=venteBien(ck,a), bien={titre:vb.titre,url:vb.url,ville:ck,quartier:vb.quartier,type:vb.type,prix:a[2],surface:a[0],copro:0,tf:0,loyer:0,travaux:0,dpe:vb.dpe||"",notes:"",statut:"à voir",fav:false,par:myName(),ts:Date.now()};
 bien[f]=v; try{await DB.collection("biens").add(bien); toast(`« ${vb.titre} » ajouté à nos biens avec cette valeur.`);}catch(err){toast("Enregistrement impossible ("+(err&&err.code||"erreur")+").");}});
