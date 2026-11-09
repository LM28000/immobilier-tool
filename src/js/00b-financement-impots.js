/* ---------- financement détaillé et impôts (LMNP) ----------
   Ordres de grandeur, pas un conseil fiscal. Règles retenues (2026) :
   - micro-BIC location meublée longue durée : abattement 50 % des recettes ;
   - réel : charges, intérêts, assurance, CFE et comptable déduits ; amortissement du bâti
     (hors terrain), des meubles et des travaux, sans créer de déficit (report du surplus) ;
   - prélèvements sociaux sur les revenus LMNP : 18,6 % (LFSS 2026) ;
   - revente : plus-value des particuliers, 19 % + 17,2 %, abattements pour durée de détention ;
     depuis 2025, les amortissements du bâti déduits au réel sont réintégrés dans la plus-value. */
const FISC={abatMicro:0.5, ps:18.6, pvIR:19, pvPS:17.2, terrain:0.15, ansBati:30, ansMeubles:7, ansTravaux:10, fraisForfait:7.5};
const FIN0={garantie:1.0, assurA:0.20, quotA:100, assurB:0.20, quotB:100, tmiA:0, tmiB:0, regime:"auto", cfe:100, compta:150, partA:50, net:true, nomA:"", nomB:""};
Object.assign(H,FIN0); Object.assign(HDEF,FIN0);
/* ---------- associés : de 1 à 6 personnes qui achètent ensemble ----------
   Chacune a sa part du bien (part des loyers, des charges, de la mensualité et de l'impôt), ses revenus, ses autres crédits,
   sa tranche d'impôt et son assurance de prêt (taux et quotité). La banque regarde l'endettement de l'ensemble ; celui de chacun
   est donné aussi. Les anciens réglages à deux (salaires, pretEtud, tmiA, tmiB, partA, assurA…) en sont tirés : le serveur MCP les lit encore. */
const TMIS=[0,11,30,41,45];
const assoc0=n=>({nom:"",part:100/n,revenus:Math.round(2500/n),credits:0,tmi:0,assur:0.20,quot:100});
/* associés sous leur forme propre (1 à 6, champs bornés, parts ramenées à 100 %), sans rien changer d'autre : sert aussi à comparer */
function assocClean(L){let A=Array.isArray(L)?L.filter(a=>a&&typeof a==="object").slice(0,6):[]; if(!A.length) A=[assoc0(1)];
 A=A.map(a=>({nom:String(a.nom||"").slice(0,30),part:Math.max(0,+a.part||0),revenus:Math.max(0,+a.revenus||0),credits:Math.max(0,+a.credits||0),tmi:TMIS.includes(+a.tmi)?+a.tmi:0,assur:Math.max(0,+a.assur||0),quot:Math.min(100,Math.max(0,a.quot==null?100:+a.quot||0))}));
 const t=A.reduce((s,a)=>s+a.part,0); A.forEach(a=>{a.part=t>0?a.part/t*100:100/A.length;}); return A;}
function assocNorm(){const A=assocClean(H.assoc); H.assoc=A;
 const B=A[1]||{tmi:A[0].tmi,assur:0,quot:0,nom:""};
 Object.assign(H,{salaires:A.reduce((s,a)=>s+a.revenus,0),pretEtud:A.reduce((s,a)=>s+a.credits,0),tmiA:A[0].tmi,tmiB:B.tmi,partA:A[0].part,assurA:A[0].assur,quotA:A[0].quot,assurB:B.assur,quotB:B.quot,nomA:A[0].nom,nomB:B.nom});}
/* réglages venus d'ailleurs sous l'ancienne forme (serveur MCP) : répartis sur les associés */
function assocFromLegacy(h){if(!h||!Array.isArray(H.assoc)) return; const A=H.assoc, sc=(k,f)=>{if(typeof h[k]!=="number") return; const t=A.reduce((s,a)=>s+a[f],0); A.forEach(a=>{a[f]=t>0?a[f]/t*h[k]:h[k]/A.length;});};
 sc("salaires","revenus"); sc("pretEtud","credits"); if(h.tmiA!=null&&A[0]) A[0].tmi=+h.tmiA; if(h.tmiB!=null&&A[1]) A[1].tmi=+h.tmiB; assocNorm();}
(function(){try{const s=JSON.parse(localStorage.getItem("fin")||"null"); if(s){
  if(!s.v2){if(s.tmiB===11) delete s.tmiB; if(s.compta===300) delete s.compta; if(s.cfe===200) delete s.cfe;} // anciens réglages par défaut
  ["garantie","assurA","quotA","assurB","quotB","tmiA","tmiB","regime","cfe","compta","nomA","nomB"].forEach(k=>{if(s[k]!=null) H[k]=s[k];});
  if(Array.isArray(s.assoc)) H.assoc=s.assoc;}
 const m=localStorage.getItem("chiffres"); if(m) H.net=m!=="brut";}catch(_){}
 /* première fois : les deux personnes d'avant deviennent deux associés, mêmes chiffres (revenus du foyer partagés selon la part) */
 if(!Array.isArray(H.assoc)){const pa=Math.min(100,Math.max(0,+H.partA||50)); H.assoc=[{nom:H.nomA||"",part:pa,revenus:H.salaires*pa/100,credits:H.pretEtud/2,tmi:H.tmiA,assur:H.assurA,quot:H.quotA},{nom:H.nomB||"",part:100-pa,revenus:H.salaires*(100-pa)/100,credits:H.pretEtud/2,tmi:H.tmiB,assur:H.assurB,quot:H.quotB}];}
 assocNorm();})();
HDEF.assoc=[assoc0(2),assoc0(2)];
function saveFin(){try{localStorage.setItem("fin",JSON.stringify({garantie:H.garantie,regime:H.regime,cfe:H.cfe,compta:H.compta,assoc:H.assoc,nomA:H.nomA,nomB:H.nomB,tmiA:H.tmiA,tmiB:H.tmiB,assurA:H.assurA,quotA:H.quotA,assurB:H.assurB,quotB:H.quotB,v2:1}));}catch(_){} if(typeof regPush==="function") regPush();}
const insRate=()=>H.assoc.reduce((s,a)=>s+a.assur*a.quot,0)/100;          // % du capital par an : assurance de chaque emprunteur sur sa quotité
const taxRate=()=>H.assoc.reduce((s,a)=>s+(a.tmi+FISC.ps)*a.part,0)/1e4; // taux moyen : chacun paie l'impôt sur sa part, à sa tranche

// abattements pour durée de détention (plus-value des particuliers)
function abatPV(y){const ir=y<6?0:y>=22?1:0.06*(y-5); let ps=y<6?0:y<=21?0.0165*(y-5):y===22?0.0165*16+0.016:Math.min(1,0.0165*16+0.016+0.09*(y-22)); return [Math.min(ir,1),Math.min(ps,1)];}
function pvTax(bien,sale,y,trav,amortBati){const acq=bien*(1+Math.max(H.notaire,FISC.fraisForfait)/100), tr=y>5?Math.max(0.15*bien,trav):trav;
 const pv=Math.max(0,sale-acq-tr+amortBati); if(!pv) return 0; const [ai,ap]=abatPV(y); return pv*(1-ai)*FISC.pvIR/100+pv*(1-ap)*FISC.pvPS/100;}

// tableau d'amortissement annuel du prêt (mensualités constantes, remboursement anticipé optionnel)
function loanYears(P,taux,ans,ins,extra){const r=taux/1200, n=ans*12, M=r>0?P*r/(1-Math.pow(1+r,-n)):P/n, Y=[]; let crd=P, m=0;
 while(crd>0.01&&m<600){const y=Math.floor(m/12); Y[y]=Y[y]||{int:0,cap:0,ins:0,crd:0};
  const it=crd*r, cp=Math.min(crd,M-it); crd-=cp; Y[y].int+=it; Y[y].cap+=cp; Y[y].ins+=ins; m++;
  if(extra&&m===extra.y*12&&crd>0){const a=Math.min(crd,extra.amt); crd-=a; Y[y].cap+=a; Y[y].extra=a;}
  Y[y].crd=crd;}
 return {M,Y,months:m};}

/* hausse des prix selon la ville (réglage pxV, oui par défaut) : le réglage « Hausse des prix » est celui d'une ville à la part médiane de logements vides
   (Insee, 22 villes) ; chaque point de logements vides en plus retire la pente mesurée entre les deux, sur les prix des appartements anciens de 2014-2015
   à 2024-2025 (PXTQ : Terralyse d'après DVF, villes à série longue, moindres carrés ; bornée entre −1 et 0, nulle sous 8 villes), un point de moins l'ajoute ;
   écart d'une ville borné à ±2 points par an. Mesuré en novembre 2026 : −0,56 point par an par point de logements vides (−0,50 sur 2014-2019, −0,59 sur
   2019-2025), alors que l'écart de hausse d'une ville sur 2014-2019 ne disait rien de celui de 2019-2025 (corrélation 0,03). */
let PXP=null;
function pxPente(){if(PXP) return PXP; let R=null; try{R=RISK;}catch(_){} const T=typeof PXTQ!=="undefined"&&PXTQ&&PXTQ.villes; if(!T||!R) return {b:0,n:0,vmed:null};
 const P=C.filter(c=>T[c.k]&&T[c.k].g!=null&&R[c.k]&&R[c.k][1]!=null).map(c=>[R[c.k][1],T[c.k].g]), V=C.map(c=>R[c.k]&&R[c.k][1]).filter(v=>v!=null).sort((a,b)=>a-b);
 const vmed=V.length?(V.length%2?V[V.length>>1]:(V[V.length/2-1]+V[V.length/2])/2):null; let b=0, r=null;
 if(P.length>=8){const mx=P.reduce((s,p)=>s+p[0],0)/P.length, my=P.reduce((s,p)=>s+p[1],0)/P.length, sxx=P.reduce((s,p)=>s+(p[0]-mx)**2,0), syy=P.reduce((s,p)=>s+(p[1]-my)**2,0), sxy=P.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0);
  if(sxx>0){b=Math.min(0,Math.max(-1,sxy/sxx)); r=syy>0?sxy/Math.sqrt(sxx*syy):null;}}
 return PXP={b,r,n:P.length,vmed};}
function pxDev(ck){if(!H.pxV) return 0; let R=null; try{R=RISK;}catch(_){} const P=pxPente(), v=R&&R[ck]&&R[ck][1]; if(!P.b||v==null||P.vmed==null) return 0; return Math.min(2,Math.max(-2,P.b*(v-P.vmed)));}
function calc(c){
 const S=c._s||{}, pe=H.pess, fa=H.fav&&!pe; /* fa : scénario favorable, miroir du prudent (loyer +5 %, ½ mois vide de moins, prix +0,5 point par an) */
 const vac0=c.vac!=null?c.vac:typeof vacVille==="function"?vacVille(c.k):H.vacance, pxB=H.px+pxDev(c.k), gst=Math.max(0,+H.gestion||0)/100; /* gestion par agence : part du loyer encaissé */
 const taux=H.taux+(S.taux?0.5:0), vac=S.vac3?3:Math.max(0,vac0+(pe?0.5:fa?-0.5:0)), px=pe?pxB-0.5:fa?pxB+0.5:pxB, la=H.loyerAdj+(pe?-5:fa?5:0)+(S.loyer?-5:0), HZ=S.hz||15;
 const tk=c.type||H.type, T=tyOf(tk), D=tk===H.type?H:Object.assign({},H,typeVals(tk));
 const SU=c.surf||D.surface, bien=c.prixTot!=null?c.prixTot:(c.spm2!=null?c.spm2:studioPm2(c.k,null,tk))*SU*pm2Adj(tk,SU), trav=(c.trav!=null?c.trav:D.travaux)+(S.trav?5000:0);
 const meu=c.meubles!=null?c.meubles:D.meubles, base=bien*(1+H.notaire/100)+meu+trav, gar=Math.max(base-H.apport,0)*H.garantie/100, cost=base+gar, P=Math.max(cost-H.apport,0);
 const L=loanYears(P,taux,H.duree,P*insRate()/1200), ins=P*insRate()/1200, M0=L.M, mens=M0+ins, n=H.duree*12;
 /* loyer : loyer de référence de la ville (charges comprises) ramené à la surface  */
 const rentCC=c.rentFixed?c.rent:c.rent*Math.pow(T.surf/c.rentM2,rentExp(c.k))*Math.pow(SU/T.surf,expT(tk))*lrc(c.k,tk);
 const rentHC=Math.max(rentCC*(1+la/100)-D.chLoc,0);
 const tf=c.tfM!=null?c.tfM:TFREF.mois*(c.tf/TFREF.taux)*(SU/TFREF.m2), charges=(c.copro!=null?c.copro:D.copro)+H.autres+(H.grosTrav||0)*SU/12+tf; /* gros travaux de copropriété : provision visible, non récupérable */
 const rentEff=rentHC*(12-vac)/12, brut=rentHC*12/cost*100;
 /* bien vendu loué : loyer du bail pendant c.bailAns années (départ du locataire), puis le loyer actuel relevé de la prime meublé mesurée,
    sans dépasser le loyer estimé (gardé tel quel s'il est déjà au-dessus) */
 let rentEff2=rentEff;
 if(c.bailAns!=null&&c.rentEst>0){const est=c.rentEst*Math.pow(T.surf/c.rentM2Est,rentExp(c.k))*Math.pow(SU/T.surf,expT(tk))*lrc(c.k,tk), pr=(typeof LRC!=="undefined"&&LRC[tk]&&LRC[tk].prime)||1.1;
  const cc2=rentCC>=est?rentCC:Math.min(est,rentCC*pr); rentEff2=Math.max(cc2*(1+la/100)-D.chLoc,0)*(12-vac)/12;}
 const rentAt=y=>{if(rentEff2===rentEff) return rentEff; const w=Math.min(1,Math.max(0,c.bailAns-y)); return w*rentEff+(1-w)*rentEff2;};
 const ratio=(mens+H.pretEtud)/(H.salaires+rentHC*0.7);   /* endettement de l'ensemble des associés (ce que la banque regarde) */
 const ratios=H.assoc.map(a=>{const w=a.part/100, d=a.revenus+rentHC*0.7*w; return d>0?(mens*w+a.credits)/d:null;});   /* et celui de chacun, sur sa part */
 const amBati=bien*(1-FISC.terrain)/FISC.ansBati;
 // impôt année par année pour un régime
 function sim(reg,gross){const T=[], F=[], AB=[]; let stock=0, def=0, cumAB=0;
  for(let y=0;y<25;y++){const rent=rentAt(y)*12*Math.pow(1+H.ly/100,y), ch=charges*12*Math.pow(1+H.cg/100,y)+gst*rent, ly=L.Y[y]||{int:0,ins:0};   /* gestion : déduite au réel */
   let fees=(rent+D.chLoc*12)>5000?H.cfe:0, taxable; // CFE : pas de cotisation minimum sous 5 000 € de recettes
   if(reg==="micro") taxable=rent*(1-FISC.abatMicro);
   else {fees+=H.compta; let res=rent-ch-ly.int-ly.ins-fees-(y===0?bien*H.notaire/100+gar:0);
    if(res<0){def+=-res; res=0;} const d=Math.min(res,def); res-=d; def-=d;
    stock+=amBati+(y<FISC.ansMeubles?meu/FISC.ansMeubles:0)+(y<FISC.ansTravaux?trav/FISC.ansTravaux:0);
    const u=Math.min(res,stock); stock-=u; res-=u; cumAB+=Math.min(u,amBati*(y+1)-cumAB); taxable=res;}
   T.push(gross?0:taxable*taxRate()); F.push(gross?0:fees); AB.push(reg==="reel"?cumAB:0);}
  const pvT=(b,sa,k,t,a)=>gross?0:pvTax(b,sa,k,t,a);
  const f=[-H.apport], gains=[bien-P-H.apport]; let crd=P, cum=0, r=taux/1200;
  for(let m=1;m<=300;m++){const y=Math.floor((m-1)/12);
   const v=rentAt(y)*Math.pow(1+H.ly/100,y)*(1-gst)-charges*Math.pow(1+H.cg/100,y)-(m<=n?mens:0)-(T[y]+F[y])/12;
   if(m<=n) crd=crd*(1+r)-M0; cum+=v; if(m<=HZ*12) f.push(v);
   const sale=k=>bien*Math.pow(1+px/100,k)*(1-(H.fraisVente||0)/100); /* prix de revente net des frais (agence, diagnostics) */
   if(m===HZ*12) f[f.length-1]+=sale(HZ)-Math.max(crd,0)-pvT(bien,sale(HZ),HZ,trav,AB[HZ-1]);
   if(m%12===0){const k=m/12; gains.push(sale(k)-Math.max(crd,0)-(H.apport-cum)-pvT(bien,sale(k),k,trav,AB[k-1]));}}
  return {reg,T,F,AB,f,gains,irr:irrMonthly(f)};}
 let R; if(H.regime==="auto"){const a=sim("micro"), b=sim("reel"); R=(b.irr??-99)>(a.irr??-99)?b:a;} else R=sim(H.regime);
 const G=sim("micro",true), imp1=R.T[0], fees1=R.F[0], gest=rentEff*gst, cfBrut=rentEff-gest-mens-charges, cfNet=cfBrut-(imp1+fees1)/12, N=H.net;
 const pv15=pvTax(bien,bien*Math.pow(1+px/100,HZ)*(1-(H.fraisVente||0)/100),HZ,trav,R.AB[HZ-1]);
 const W=H.assoc.map(a=>(a.tmi+FISC.ps)*a.part), Ws=W.reduce((s,w)=>s+w,0)||1, imps=W.map(w=>imp1*w/Ws), impA=imps[0];
 return {bien,cost,gar,P,M0,ins,mens,rentHC,rentEff,tf,charges,gest,vac,px,cf:N?cfNet:cfBrut,cfNet,cfBrut,irrNet:R.irr,irrBrut:G.irr,gainsNet:R.gains,gainsBrut:G.gains,net:N,pv15,imp1,fees1,impA,impB:imp1-impA,imps,ratios,regime:R.reg,imp10:R.T.slice(0,10).reduce((a,b)=>a+b,0)/10,
  brut,ratio,irr:N?R.irr:G.irr,gains:N?R.gains:G.gains,hz:HZ,loan:L,taux};
}

/* ---------- prix au m² du type de bien choisi : ventes réelles (DVF) ----------
   Ville : médiane des ventes du type (nombre de pièces, voir TYPES). Quartier : ses ventes, mélangées à la ville (poids de 8 ventes),
   la ville étant ajustée par l'écart RealAdvisor du quartier à la puissance β (β mesuré sur les ventes réelles de la ville, pour ce type). */
/* taxe foncière : un avis réel de référence (40 €/mois pour 22 m² à un taux de 47,8 %), proportionnel au taux de la commune et à la surface */
const TFREF={mois:H.tfMans,taux:47.80,m2:22};
/* loyer selon la surface : loyer ∝ surface^e, e mesuré pour chaque ville sur la carte des loyers de l'État
   (1-2 pièces autour de 37 m², 3 pièces et plus autour de 72 m²) ; 0,6 si la ville n'y est pas */
/* à nombre de pièces égal, le loyer monte moins vite avec la surface : exposant mesuré sur les annonces de location du type (EXPT, build.py), 0,6 à défaut */
/* loyer de la ville recalé sur les annonces de location du type (LRC, src/ads-vue.js) : 1 tant qu'il n'est pas calculé */
const lrc=(ck,tk)=>{const L=typeof LRC!=="undefined"&&LRC[tyKey(tk)]; if(!L) return 1; return L.v[ck]!=null?L.v[ck]:(L.tous||1);};
const expT=tk=>{const e=typeof EXPT!=="undefined"&&EXPT&&EXPT[tyKey(tk)]; return e>0?e:0.6;};
const rentExp=ck=>{const L=typeof LOYQ!=="undefined"&&LOYQ&&LOYQ.c3&&LOYQ.c[ck]&&LOYQ.c3[ck]; if(!L) return 0.6; const s=LOYQ.sref||[37,72]; return Math.min(0.9,Math.max(0.4,1+Math.log(LOYQ.c3[ck]/LOYQ.c[ck][0])/Math.log(s[1]/s[0])));};
/* ventes réelles : un seul fichier, même règle pour toutes les villes et tous les types (tools/collecte/dvf.js) */
const DVFT=typeof DVFALL!=="undefined"&&DVFALL?(DVFALL.t||{studio:DVFALL.c}):{};
/* prix au m² DVF donnés à la surface type (22, 42, 62 m²) : pour une autre surface, pente mesurée sur les ventes du type (data/dvf.json « pente ») */
const pm2Adj=(tk,SU)=>{const b=typeof DVFALL!=="undefined"&&DVFALL&&DVFALL.pente?DVFALL.pente[tyKey(tk)]:0; return b&&SU>0?Math.pow(SU/tyOf(tk).surf,b):1;};
const dvfC=(ck,tk)=>{const d=(DVFT[tyKey(tk||H.type)]||{})[ck]; return d&&d.med?d:null;};
const hasDVF=(ck,tk)=>!!(H.dvf&&dvfC(ck,tk));
const RABETA={};
function raBeta(ck,tk){const key=ck+"|"+tyKey(tk||H.type); if(RABETA[key]!=null) return RABETA[key]; const D=dvfC(ck,tk), ir=typeof IR!=="undefined"&&IR[ck]; let b=1;
 if(D&&ir){let sxy=0,sxx=0,m=0; ir.list.forEach(t=>{const q=D.q[t.code]; if(!q||q.n<5||!t.price) return; const x=Math.log(t.price/ir.med), y=Math.log(q.med/D.med); sxy+=q.n*x*y; sxx+=q.n*x*x; m++;});
  b=m>=5&&sxx>0?Math.min(1,Math.max(0,sxy/sxx)):0.5;}
 return RABETA[key]=b;}
function studioPm2(ck,t,tk){const c=C.find(v=>v.k===ck); if(!c) return 0; tk=tk||H.type;
 const ir=typeof IR!=="undefined"&&IR[ck], raw=t&&t.price&&ir&&ir.med&&!ir.noRA?t.price/ir.med:1; /* sans RealAdvisor, le quartier ne vient que de ses ventes (ci-dessous) */
 if(!hasDVF(ck,tk)) return c.pm2*(1+(tyOf(tk).p===1?H.surcote:0)/100)*raw;
 const D=dvfC(ck,tk), prior=D.med*Math.pow(raw,raBeta(ck,tk)), q=t&&D.q[t.code]; if(!q||!q.n) return prior;
 return (q.n*q.med+8*prior)/(q.n+8);}

/* ---------- mémoire des calculs : même ville, même bien, mêmes réglages → même résultat ---------- */
const CALCC=new Map();
const _calcRaw=calc; calc=function(c){const k=JSON.stringify(H)+"|"+JSON.stringify(c,(key,v)=>key==="src"?undefined:v); let r=CALCC.get(k); if(!r){r=_calcRaw(c); Object.defineProperty(r,"_c",{value:c}); if(CALCC.size>30000) CALCC.clear(); CALCC.set(k,r);} return r;};
/* les trois scénarios d'un même calcul : prudent (H.pess), central, favorable (H.fav) */
function irr3(x){const c=x&&x._c; if(!c) return null; const p0=H.pess, f0=H.fav, o={}, v=x._v, f=()=>(v&&typeof calcVille==="function"?calcVille(v):calc(c)).irr;   /* ville : son quartier du milieu dans chaque scénario */
 try{H.fav=false; H.pess=true; o.prudent=f(); H.pess=false; o.central=f(); H.fav=true; o.favorable=f();}finally{H.pess=p0; H.fav=f0;} return o;}
