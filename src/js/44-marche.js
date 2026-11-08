/* ---------- le marché : les annonces du relevé, leur calcul, les nouvelles depuis la visite précédente, la shortlist ---------- */
const MF={ck:"",sort:"irr",bank:false,nw:false,drop:false,sec:"",n:20};
const I=(d,f)=>`<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${f?`<g fill="currentColor">${d}</g>`:`<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</g>`}</svg>`;

const cityName=k=>(C.find(c=>c.k===k)||{}).name||k;

let MSEEN=null;           // date de la visite précédente (pour « nouveau »)
(function(){try{const today=new Date().toISOString().slice(0,10), s=JSON.parse(localStorage.getItem("mvisit")||"null");
 if(!s){MSEEN=null; localStorage.setItem("mvisit",JSON.stringify({last:today,prev:null}));}
 else if(s.last!==today){MSEEN=s.last; localStorage.setItem("mvisit",JSON.stringify({last:today,prev:s.last}));}
 else MSEEN=s.prev;}catch(_){}})();
function hEntry(ck,suf){return HIST[ck]&&HIST[ck].v&&HIST[ck].v[suf];}
function isNewAd(ck,suf){const e=hEntry(ck,suf); if(!e) return false; if(MSEEN) return e.f>MSEEN&&e.f>(hStart(ck,"v")||""); const v=vu("v",ck,suf); return !!(v&&v.isNew);}
function adInfo(ck,a){const r=venteCalc(ck,a), v=vu("v",ck,a[3]), t=venteIrisA(ck,a), d=t?demandOf(t):null; return {ck,a,r,x:r.x,v,t,d,nw:isNewAd(ck,a[3]),url:VTURL+a[3]};}
function bienOf(url){return BIENS.find(b=>b.url===url)||null;}

function kp(label,val,cls,sub){return `<div class="mk"><small>${label}</small><b class="${cls||""}">${val}</b>${sub?`<em>${sub}</em>`:""}</div>`;}

/* ---------- fil d'annonces ---------- */
function feedList(F){F=F||MF; const out=[]; Object.entries(ADS).forEach(([ck,A])=>{if(!A||!A.ventes) return; if(F.ck&&F.ck!==ck) return; A.ventes.forEach(a=>{if(F.sec&&a[1]!==F.sec) return; if(estDoublon(a[3])) return; out.push(adInfo(ck,a));});});
 return out;}

/* ajouter / retirer de la shortlist */
async function mStar(ck,suf){const a=(ADS[ck].ventes||[]).find(v=>v[3]===suf); if(!a||!DB) return; const url=VTURL+suf, b=bienOf(url);
 if(b&&!isOut(b)){await retirer(b); return;}
 if(b){await updBien(b.id,{statut:"à voir",short:true}); toast("Remis dans la shortlist."); return;}
 const vb=venteBien(ck,a), bien={titre:vb.titre,url:vb.url,ville:ck,quartier:vb.quartier,type:vb.type,prix:a[2],surface:a[0],copro:0,tf:0,loyer:0,travaux:0,dpe:vb.dpe||"",notes:"",statut:"à voir",fav:false,par:myName(),ts:Date.now()};
 try{await DB.collection("biens").add(bien); toast("Ajouté à la shortlist ★");}catch(err){toast("Ajout impossible ("+(err&&err.code||"erreur")+").");}}

