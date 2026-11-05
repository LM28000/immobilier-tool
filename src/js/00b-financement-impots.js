/* ---------- financement détaillé et impôts (LMNP) ----------
   Ordres de grandeur, pas un conseil fiscal. Règles retenues (2026) :
   - micro-BIC location meublée longue durée : abattement 50 % des recettes ;
   - réel : charges, intérêts, assurance, CFE et comptable déduits ; amortissement du bâti
     (hors terrain), des meubles et des travaux, sans créer de déficit (report du surplus) ;
   - prélèvements sociaux sur les revenus LMNP : 18,6 % (LFSS 2026) ;
   - revente : plus-value des particuliers, 19 % + 17,2 %, abattements pour durée de détention ;
     depuis 2025, les amortissements du bâti déduits au réel sont réintégrés dans la plus-value. */
const FISC={abatMicro:0.5, ps:18.6, pvIR:19, pvPS:17.2, terrain:0.15, ansBati:30, ansMeubles:7, ansTravaux:10, fraisForfait:7.5};
Object.assign(H,{garantie:1.0, assurA:0.20, quotA:100, assurB:0.20, quotB:100, tmiA:0, tmiB:11, regime:"auto", cfe:200, compta:300, partA:50});
(function(){try{const s=JSON.parse(localStorage.getItem("fin")||"null"); if(s) ["garantie","assurA","quotA","assurB","quotB","tmiA","tmiB","regime","cfe","compta"].forEach(k=>{if(s[k]!=null) H[k]=s[k];});}catch(_){}})();
function saveFin(){try{localStorage.setItem("fin",JSON.stringify({garantie:H.garantie,assurA:H.assurA,quotA:H.quotA,assurB:H.assurB,quotB:H.quotB,tmiA:H.tmiA,tmiB:H.tmiB,regime:H.regime,cfe:H.cfe,compta:H.compta}));}catch(_){}}
const insRate=()=>(H.assurA*H.quotA+H.assurB*H.quotB)/100;          // % du capital par an
const taxRate=()=>((H.tmiA+FISC.ps)*H.partA+(H.tmiB+FISC.ps)*(100-H.partA))/1e4; // taux moyen du foyer « à deux »

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

function calc(c){
 const S=c._s||{}, pe=H.pess;
 const taux=H.taux+(pe?0.5:0)+(S.taux?0.5:0), vac=S.vac3?3:(c.vac!=null?c.vac:H.vacance)+(pe?1:0), px=pe?0:H.px, la=H.loyerAdj+(pe?-10:0)+(S.loyer?-5:0), HZ=S.hz||15;
 const SU=c.surf||H.surface, bien=c.prixTot!=null?c.prixTot:c.pm2*(1+H.surcote/100)*SU, trav=(c.trav!=null?c.trav:H.travaux)+(S.trav?5000:0);
 const base=bien*(1+H.notaire/100)+H.meubles+trav, gar=Math.max(base-H.apport,0)*H.garantie/100, cost=base+gar, P=Math.max(cost-H.apport,0);
 const L=loanYears(P,taux,H.duree,P*insRate()/1200), ins=P*insRate()/1200, M0=L.M, mens=M0+ins, n=H.duree*12;
 const rentHC=Math.max(c.rent*Math.pow(SU/c.rentM2,0.6)*(1+la/100)-H.chLoc,0);
 const tf=c.tfM!=null?c.tfM:H.tfMans*c.tf/47.80*(SU/22), charges=(c.copro!=null?c.copro:H.copro)+H.autres+tf;
 const rentEff=rentHC*(12-vac)/12, brut=rentHC*12/cost*100;
 const ratio=(mens+H.pretEtud)/(H.salaires+rentHC*0.7);
 const amBati=bien*(1-FISC.terrain)/FISC.ansBati;
 // impôt année par année pour un régime
 function sim(reg){const T=[], F=[], AB=[]; let stock=0, def=0, cumAB=0;
  for(let y=0;y<25;y++){const rent=rentEff*12*Math.pow(1+H.ly/100,y), ch=charges*12*Math.pow(1+H.cg/100,y), ly=L.Y[y]||{int:0,ins:0};
   let fees=(rent+H.chLoc*12)>5000?H.cfe:0, taxable; // CFE : pas de cotisation minimum sous 5 000 € de recettes
   if(reg==="micro") taxable=rent*(1-FISC.abatMicro);
   else {fees+=H.compta; let res=rent-ch-ly.int-ly.ins-fees-(y===0?bien*H.notaire/100+gar:0);
    if(res<0){def+=-res; res=0;} const d=Math.min(res,def); res-=d; def-=d;
    stock+=amBati+(y<FISC.ansMeubles?H.meubles/FISC.ansMeubles:0)+(y<FISC.ansTravaux?trav/FISC.ansTravaux:0);
    const u=Math.min(res,stock); stock-=u; res-=u; cumAB+=Math.min(u,amBati*(y+1)-cumAB); taxable=res;}
   T.push(taxable*taxRate()); F.push(fees); AB.push(reg==="reel"?cumAB:0);}
  const f=[-H.apport], gains=[bien-P-H.apport]; let crd=P, cum=0, r=taux/1200;
  for(let m=1;m<=300;m++){const y=Math.floor((m-1)/12);
   const v=rentEff*Math.pow(1+H.ly/100,y)-charges*Math.pow(1+H.cg/100,y)-(m<=n?mens:0)-(T[y]+F[y])/12;
   if(m<=n) crd=crd*(1+r)-M0; cum+=v; if(m<=HZ*12) f.push(v);
   const sale=k=>bien*Math.pow(1+px/100,k);
   if(m===HZ*12) f[f.length-1]+=sale(HZ)-Math.max(crd,0)-pvTax(bien,sale(HZ),HZ,trav,AB[HZ-1]);
   if(m%12===0){const k=m/12; gains.push(sale(k)-Math.max(crd,0)-(H.apport-cum)-pvTax(bien,sale(k),k,trav,AB[k-1]));}}
  return {reg,T,F,AB,f,gains,irr:irrMonthly(f)};}
 let R; if(H.regime==="auto"){const a=sim("micro"), b=sim("reel"); R=(b.irr??-99)>(a.irr??-99)?b:a;} else R=sim(H.regime);
 const imp1=R.T[0], fees1=R.F[0], cfBrut=rentEff-mens-charges, cf=cfBrut-(imp1+fees1)/12;
 const wA=(H.tmiA+FISC.ps)*H.partA, wB=(H.tmiB+FISC.ps)*(100-H.partA), impA=imp1*wA/(wA+wB||1);
 return {bien,cost,gar,P,M0,ins,mens,rentHC,rentEff,tf,charges,cf,cfBrut,imp1,fees1,impA,impB:imp1-impA,regime:R.reg,imp10:R.T.slice(0,10).reduce((a,b)=>a+b,0)/10,
  brut,ratio,irr:R.irr,gains:R.gains,hz:HZ,loan:L,taux};
}
