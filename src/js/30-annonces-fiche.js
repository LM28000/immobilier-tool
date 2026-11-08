/* ---------- photos des annonces (vignettes Bien'ici) ---------- */
const photoUrl=(suf,p,w,h)=>{if(!p) return ""; const id=(suf||"").split("/").pop(); return "https://file.bienici.com/photo/"+(p[0]==="!"?p.slice(1):id+"_"+p)+`?width=${w}&height=${h}&fit=cover`;};
const thumbHtml=(suf,p)=>p?`<img class="thb" src="${esc(photoUrl(suf,p,160,120))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'thb nophoto'}))">`:`<span class="thb nophoto"></span>`;

const sectorOf=t=>{const A=ADS[t.ck]; return A?Object.keys(A.map).find(k=>A.map[k].includes(t.code)):null;};

function findAd(kind,ck,suf){if(kind==="b") return BIENS.find(b=>b.id===suf)||null; const A=ADS[ck]; if(!A) return null; return kind==="v"?(A.ventes||[]).find(a=>a[3]===suf):(A.ads||[]).find(a=>a[4]===suf);}

function priceFor(ck,a,test){let lo=5000, hi=Math.max(a[2]*1.8,30000); if(!test(lo)) return null; if(test(hi)) return hi;
 while(hi-lo>250){const m=(lo+hi)/2; if(test(m)) lo=m; else hi=m;} return Math.floor(lo/500)*500;}   /* précision 250 € : le résultat est arrondi à 500 € (9 calculs au lieu de 26) */
const TGC={}; let TGN=0;
const TGSKIP=new Set(["id","titre","notes","statut","fav","par","ts","url","visite","by","secteur","adresse"]);
/* clé = toutes les entrées de calcBien (travaux, type, pièces, adresse… compris) et tous les réglages */
const tgKey=b=>JSON.stringify([H,Object.keys(b).filter(k=>!TGSKIP.has(k)).sort().map(k=>[k,b[k]])]);
function targetsFor(b){const ref=+b.prix||60000, key=tgKey(b); if(TGC[key]) return TGC[key]; if(++TGN>4000){for(const k in TGC) delete TGC[k]; TGN=0;}
 const T=p=>calcBien(Object.assign({},b,{prix:p})).x, f=t=>priceFor(null,[0,0,ref],t);
 return TGC[key]={ref,cf:f(p=>T(p).cf>=0),r7:f(p=>{const x=T(p); return x.irr!=null&&x.irr>=7;})};}
function tgtChip(p,ref,short){if(p==null) return `<span class="tchip bad">${short?"hors d'atteinte":"hors d'atteinte même très bas"}</span>`; const d=p-ref;
 return d>=0?`<span class="tchip ok">${short?"OK":"OK · marge "+keur(d)}</span>`:`<span class="tchip warn">${short?"−"+fr(-d/ref*100,0)+" %":"−"+keur(-d)+" à négocier (−"+fr(-d/ref*100,0)+" %)"}</span>`;}
function negoBlock(b){const g=targetsFor(b), ref=g.ref, pts=[ref,g.cf,g.r7].filter(v=>v!=null), lo=Math.min(...pts)*0.92, hi=Math.max(...pts)*1.06, X=v=>((v-lo)/(hi-lo)*100).toFixed(1);
 const card=(cls,lbl,p,txt)=>`<div class="ngc"><span class="ngl"><i class="dot ${cls}"></i>${lbl}</span><b class="mono">${p==null?"—":"≤ "+keur(p)}</b>${tgtChip(p,ref)}<small>${txt}</small></div>`;
 const mk=(v,cls,t)=>v==null?"":`<i class="ngm ${cls}" style="left:${X(v)}%" title="${t}"></i>`;
 return `<div class="nego"><div class="ngh"><b>Prix maximum à payer</b><span class="sub">affiché ${keur(ref)}</span></div>
  <div class="ngg">${card("d1","Autofinancé",g.cf,"Le loyer couvre tout : rien à sortir chaque mois.")}${card("d2","7 % par an",g.r7,"Rendement moyen sur 15 ans, revente comprise.")}</div>
  <div class="ngr" aria-hidden="true"><div class="ngbar">${mk(g.cf,"d1","Autofinancé")}${mk(g.r7,"d2","7 %/an")}<i class="ngm ref" style="left:${X(ref)}%"></i></div><div class="ngax"><span class="ngref" style="left:${Math.min(85,Math.max(15,X(ref)))}%">prix affiché</span></div></div></div>`;}

