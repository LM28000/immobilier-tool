/* ---------- carte zoomable avec quartiers IRIS ---------- */
const WW=640, KMAX=260, KQ=6; let VW=WW, VH=MAP.H;
let V={k:1,x:0,y:0}, QSEL=null, QC=null;
const IR={};
const nrm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
(function decodeIris(){
 Object.entries(IRIS).forEach(([ck,d])=>{
  const QQ=Q[ck]?Q[ck].q:d.q, qn={}; Object.entries(QQ).forEach(([n,p])=>qn[nrm(n)]=[n,p]);
  const rn={}; Object.entries(d.ra.q).forEach(([n,v])=>rn[nrm(n)]=v);
  const list=d.txt.split("\n").map((line,i)=>{const [name,code,type,rings]=line.split("|");
   let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,sx=0,sy=0,n=0;
   const dd=rings.split(";").map(r=>{let X=0,Y=0;return r.split(" ").map((p,j)=>{const q=p.split(",");X+=+q[0];Y+=+q[1];
     const [x,y]=pxy(Y/1e4,X/1e4); if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; sx+=x;sy+=y;n++;
     return (j?"L":"M")+x.toFixed(3)+" "+y.toFixed(3);}).join("")+"Z";}).join("");
   const key=nrm(name.replace(/^Z\.A\./,"ZA")), qm=qn[key]||qn[key.replace(/\d+$/,"")];
   const ra=qm?rn[nrm(qm[0])]:undefined;
   return {i,ck,name,code,type,d:dd,bb:[x0,y0,x1,y1],cx:sx/n,cy:sy/n,price:qm?qm[1]:null,ra,dpe:d.dpe[code]||[0,0,0,0,0,0,0]};});
  const bb=list.reduce((b,t)=>[Math.min(b[0],t.bb[0]),Math.min(b[1],t.bb[1]),Math.max(b[2],t.bb[2]),Math.max(b[3],t.bb[3])],[1e9,1e9,-1e9,-1e9]);
  IR[ck]={list,bb,med:median(Object.values(QQ)),raCity:d.ra.city};
 });
})();
const clampR=v=>Math.min(1.15,Math.max(0.85,v));
const rentRatio=(ck,t)=>{if(t.ra) return clampR(t.ra/IR[ck].raCity); const [a,b]=IRIS[ck].ra.fit; return clampR(Math.exp(a+b*Math.log(t.price/IR[ck].med)));};
function calcIris(t){const c=C.find(v=>v.k===t.ck), dm=H.vacQ?demandOf(t):null; return calc(Object.assign({},c,{spm2:studioPm2(t.ck,t),rent:c.rent*rentRatio(t.ck,t),vac:dm?dm.vac:undefined}));}
const QCLS=[{t:"sous 2,5 %",c:"var(--bad)",o:.55},{t:"2,5 à 5 %",c:"var(--warn)",o:.5},{t:"5 à 7 %",c:"var(--ok)",o:.2},{t:"7 à 9 %",c:"var(--ok)",o:.42},{t:"9 % et plus",c:"var(--ok)",o:.68}];
const qCls=irr=>irr==null||irr<2.5?0:irr<5?1:irr<7?2:irr<9?3:4;
const fgPct=d=>{const n=d.reduce((a,b)=>a+b,0);return n?(d[5]+d[6])/n*100:null;};

let QX={}; // résultats par quartier, recalculés à chaque render
function computeIris(){QX={};Object.values(IR).forEach(z=>z.list.forEach(t=>{if(t.type==="H"&&t.price) QX[t.ck+t.i]=calcIris(t);}));}

const svgEl=()=>document.getElementById("map");
function renderMap(rows){
 VC.clear(); computeIris(); draw.rows=rows; draw.qm=undefined;
 const svg=svgEl(); svg.setAttribute("viewBox",`0 0 ${VW} ${VH}`);
 let b=`<path d="${MAP.land}" fill="var(--land)"/>`;
 MAP.deps.forEach(d=>{b+=`<path d="${d.d}" fill="none" stroke="var(--line)" stroke-width=".8" vector-effect="non-scaling-stroke"/>`;});
 b+=`<path d="${MAP.land}" fill="none" stroke="var(--coast)" stroke-width="1.1" vector-effect="non-scaling-stroke"/>`;
 RAIL.forEach(l=>{b+=`<path d="${pline(l)}" fill="none" stroke="var(--rail)" stroke-width="1.4" stroke-dasharray="5 3" opacity=".7" vector-effect="non-scaling-stroke"/>`;});
 let q="";
 Object.entries(CITYMAP).forEach(([ck,m])=>{
  const a=MP.k*MAP.S/(m.K*m.S), e=(m.lo0-MP.lon0)*MP.k*MAP.S, d=MAP.S/m.S, f=(MP.lat1-m.la1)*MAP.S;
  q+=`<g transform="matrix(${a} 0 0 ${d} ${e} ${f})">`;
  q+=`<path d="${m.main}" fill="var(--land)" stroke="var(--coast)" stroke-width="1.6" vector-effect="non-scaling-stroke"/></g>`;});
 Object.values(IR).forEach(z=>z.list.forEach(t=>{const x=QX[t.ck+t.i];
  if(x){const k=clsFor(x), dim=bankFail(x); q+=`<path class="iris" data-iris="${t.ck}:${t.i}" d="${t.d}" fill="${dim?"var(--muted)":k.c}" fill-opacity="${dim?.1:k.o}" stroke="var(--surface)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;}
  else q+=`<path class="iris na" data-iris="${t.ck}:${t.i}" d="${t.d}" fill="var(--sunk)" fill-opacity=".85" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/>`;}));
 svg.innerHTML=`<rect width="${VW}" height="${VH}" fill="var(--sea)"/><g id="wg"><g>${b}</g><g id="qg">${q}</g><path id="hl" d="" fill="none" stroke="var(--fg)" stroke-width="2.6" vector-effect="non-scaling-stroke"/></g><g id="ov"></g>`;
 draw();
}

function cityInView(){const cx=(VW/2-V.x)/V.k, cy=(VH/2-V.y)/V.k; let best=null,bd=1e9;
 Object.entries(IR).forEach(([ck,z])=>{const [x0,y0,x1,y1]=z.bb, dx=Math.max(x0-cx,0,cx-x1), dy=Math.max(y0-cy,0,cy-y1), dd=Math.hypot(dx,dy); if(dd<bd){bd=dd;best=ck;}});
 return bd*V.k<VW*0.6?best:null;}

function draw(){
 const svg=svgEl(), wg=document.getElementById("wg"); if(!wg) return;
 wg.setAttribute("transform",`translate(${V.x} ${V.y}) scale(${V.k})`);
 const qm=V.k>=KQ; const qgE=document.getElementById("qg"), qo=Math.min(1,Math.max(0,(V.k-KQ*0.7)/(KQ*0.3))); qgE.style.display=qo>0?"":"none"; qgE.style.opacity=qo; qgE.style.pointerEvents=qm?"":"none";
 const hl=document.getElementById("hl"); hl.setAttribute("d",qm&&QSEL?QSEL.d:"");
 const P=(x,y)=>[x*V.k+V.x,y*V.k+V.y], G=(lat,lon)=>P(...pxy(lat,lon));
 const rows=draw.rows||C.map(c=>({c,x:calc(c)}));
 let s="", pills="";
 const maxS=Math.max(...C.map(c=>c.students)), radOf=c=>(6+18*Math.sqrt(c.students/maxS))*(qm?.7:1);
 if(!qm){
  const sc=C.find(c=>c.k===SEL), [sx,sy]=G(sc.lat,sc.lon), srad=radOf(sc);
  Object.entries(ORIG).forEach(([k,o])=>{if(k===SEL) return; const [ox,oy]=G(o.lat,o.lon), h=trip(sc,k), near=h<=1.5;
   s+=`<line x1="${sx}" y1="${sy}" x2="${ox}" y2="${oy}" stroke="var(--accent)" stroke-width="${near?2:1.3}" ${near?"":'stroke-dasharray="4 4"'} opacity=".8"/>`;
   const dd=Math.hypot(ox-sx,oy-sy)||1, t0=(srad+4)/dd, t1=1-10/dd, tm=t0+(t1-t0)*.35, mx=sx+(ox-sx)*tm, my=sy+(oy-sy)*tm;
   pills+=`<rect x="${mx-38}" y="${my-10}" width="76" height="19" rx="9.5" fill="var(--surface)" stroke="var(--accent)" stroke-width="1"/><text x="${mx}" y="${my+3.8}" text-anchor="middle" font-size="10.5" font-weight="600" class="mono" fill="var(--accent)">${hm(h)} ${k==="paris"?"train":"auto"}</text>`;});
 }
 Object.entries(ORIG).forEach(([k,v])=>{const [x,y]=G(v.lat,v.lon);
  s+=`<rect x="${x-7}" y="${y-7}" width="14" height="14" rx="3" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`;
  if(k==="paris") s+=`<text x="${x-10}" y="${y-10}" text-anchor="end" font-size="13" font-weight="800" fill="var(--accent)" paint-order="stroke" stroke="var(--land)" stroke-width="4">Paris</text>`;
  if(k==="nantes") s+=`<text x="${x}" y="${y-12}" text-anchor="middle" font-size="13" font-weight="800" fill="var(--accent)" paint-order="stroke" stroke="var(--land)" stroke-width="4">Nantes</text>`;
  if(k==="laval"&&qm) s+=`<text x="${x}" y="${y-12}" text-anchor="middle" font-size="13" font-weight="800" fill="var(--accent)" paint-order="stroke" stroke="var(--land)" stroke-width="4">Laval</text>`;});
 [...rows].sort((a,b)=>b.c.students-a.c.students).forEach(r=>{const c=r.c; if(qm&&IR[c.k]) return;
  const [cx,cy]=G(c.lat,c.lon), rad=radOf(c), sel=c.k===SEL; if(cx<-80||cx>VW+80||cy<-80||cy>VH+80) return;
  const L={r:{x:cx+rad+5,y:cy-1,a:"start"},l:{x:cx-rad-5,y:cy-1,a:"end"},b:{x:cx,y:cy+rad+13,a:"middle"},t:{x:cx,y:cy-rad-19,a:"middle"}}[c.lab];
  const val=r.x.irr==null?"n.d.":pct(r.x.irr);
  s+=`<g class="city" tabindex="0" role="button" aria-label="${c.name}" data-k="${c.k}">
   <circle class="b" cx="${cx}" cy="${cy}" r="${rad}" fill="${colOf(r)}" fill-opacity="${bankFail(r.x)?.18:sel?.95:.72}" stroke="${sel?"var(--fg)":"var(--surface)"}" stroke-width="${sel?3:1.5}"/>
   <text x="${L.x}" y="${L.y}" text-anchor="${L.a}" font-size="13" font-weight="800" fill="var(--fg)" paint-order="stroke" stroke="var(--land)" stroke-width="4">${c.name}</text>
   <text x="${L.x}" y="${L.y+13}" text-anchor="${L.a}" font-size="10.5" class="mono" fill="var(--fg)" paint-order="stroke" stroke="var(--land)" stroke-width="4">${val} · ${sgn(r.x.cf)}/m</text></g>`;});
 if(qm){
  // étiquettes de quartiers, les plus grands d'abord, sans chevauchement
  const boxes=[], cand=[];
  Object.values(IR).forEach(z=>z.list.forEach(t=>{const w=(t.bb[2]-t.bb[0])*V.k, h=(t.bb[3]-t.bb[1])*V.k; const [x,y]=P(t.cx,t.cy);
   if(x<0||x>VW||y<0||y>VH) return; cand.push({t,w,h,x,y});}));
  const pinB=[]; Object.values(MARK).forEach(m=>Object.entries(m).forEach(([k,p])=>{const [x,y]=G(p[0],p[1]); pinB.push([x-9,y-9,x+14+MARKTXT[k].length*6.5,y+9]);}));
  s+=ventePins(P,pinB,boxes);
  adsPins(QC||"").concat(...Object.keys(IR).filter(k=>k!==QC).map(adsPins)).forEach(p=>{const [x,y]=P(p.x,p.y); if(x<0||x>VW||y<0||y>VH) return; const t=`${p.n} annonce${p.n>1?"s":""} · ${eur(p.med)}`, w=t.length*5.9+14;
   const hit=(y0)=>pinB.some(b=>!(x+w/2<b[0]||x-w/2>b[2]||y0+18<b[1]||y0>b[3]));
   let y0=[17,40,-6,63,-29].map(d=>y+d).find(v=>!hit(v)); if(y0==null) return; pinB.push([x-w/2-2,y0-2,x+w/2+2,y0+19]); boxes.push([x-w/2,y0-1,x+w/2,y0+18]);
   s+=`<g class="adpin" data-ads="${p.ck}|${esc(p.d)}" role="button" tabindex="0" aria-label="Voir les annonces du secteur ${esc(p.d)}"><rect x="${x-w/2}" y="${y0}" width="${w}" height="17" rx="8.5" fill="var(--accent)" opacity=".92"/><text x="${x}" y="${y0+12}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--surface)">${t}</text></g>`;});
  Object.entries(MARK).forEach(([ck,m])=>Object.entries(m).forEach(([k,p])=>{const [x,y]=G(p[0],p[1]); if(x<-20||x>VW+20||y<-20||y>VH+20) return; const lab=MARKTXT[k];
   s+=`<g pointer-events="none">${k==="gare"?`<rect x="${x-6}" y="${y-6}" width="12" height="12" rx="2.5" fill="var(--fg)" stroke="var(--surface)" stroke-width="2"/>`:k==="centre"?`<path d="M${x} ${y-7}L${x+7} ${y}L${x} ${y+7}L${x-7} ${y}Z" fill="var(--fg)" stroke="var(--surface)" stroke-width="2"/>`:`<circle cx="${x}" cy="${y}" r="6.5" fill="var(--fg)" stroke="var(--surface)" stroke-width="2"/>`}<text x="${x+10}" y="${y+4}" font-size="11" font-weight="800" fill="var(--fg)" paint-order="stroke" stroke="var(--surface)" stroke-width="3.5">${lab}</text></g>`;
   boxes.push([x-8,y-8,x+12+lab.length*6.5,y+8]);}));
  const bp=bienPins(P);
  cand.sort((a,b)=>b.w*b.h-a.w*a.h).forEach(o=>{const x=QX[o.t.ck+o.t.i]; if(x&&bankFail(x)) return; const nm=o.t.name.replace(/^Z\.A\. /,"ZA "), lw=Math.max(nm.length*6.4,x?64:0)+6;
   if(o.w<lw*0.9) return; const bx=[o.x-lw/2,o.y-11,o.x+lw/2,o.y+(x?15:4)];
   if(boxes.some(b=>!(bx[2]<b[0]||bx[0]>b[2]||bx[3]<b[1]||bx[1]>b[3]))) return; boxes.push(bx);
   s+=`<text x="${o.x}" y="${o.y}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--fg)" paint-order="stroke" stroke="var(--land)" stroke-width="3.5" pointer-events="none">${nm}</text>`;
   if(x) s+=`<text x="${o.x}" y="${o.y+12}" text-anchor="middle" font-size="10" class="mono" fill="var(--fg)" paint-order="stroke" stroke="var(--land)" stroke-width="3.5" pointer-events="none">${CMODE==="cf"?sgn(x.cf)+" · "+(x.irr==null?"n.d.":pct(x.irr)):(x.irr==null?"n.d.":pct(x.irr))+" · "+sgn(x.cf)}</text>`;});
  // échelle
  const kmPx=MAP.S/111.32*V.k; let km=[0.25,0.5,1,2,5,10,20].find(v=>v*kmPx>=60)||20; const w=km*kmPx;
  s+=bp;
  s+=`<g><rect x="12" y="${VH-34}" width="${w+16}" height="24" rx="4" fill="var(--surface)" opacity=".85"/><line x1="20" x2="${20+w}" y1="${VH-16}" y2="${VH-16}" stroke="var(--fg)" stroke-width="2"/><text x="${20+w/2}" y="${VH-21}" text-anchor="middle" font-size="10.5" fill="var(--fg)">${String(km).replace(".",",")} km</text></g>`;
 } else {
  const [x,y]=G(46.45,-2.75); s+=`<text x="${x}" y="${y}" font-size="12" font-style="italic" fill="var(--coast)">Océan Atlantique</text>`;
  const [x2,y2]=G(49.35,-1.9); s+=`<text x="${x2}" y="${y2}" font-size="12" font-style="italic" fill="var(--coast)">Manche</text>`;
 }
 document.getElementById("ov").innerHTML=s+`<g pointer-events="none">${pills}</g>`; bindCities(svg);
 const nQC=qm?cityInView():(IR[SEL]?SEL:null); if(nQC!==QC||qm!==draw.qm){QC=nQC; draw.qm=qm; if(QSEL&&QSEL.ck!==QC) QSEL=null; renderQBox(); renderLegend();}
 renderWhere(qm);
 document.getElementById("zOut").disabled=V.k<=KMIN()*1.001; document.getElementById("zIn").disabled=V.k>=KMAX-0.01;
}
function renderLegend(){const qm=V.k>=KQ, sc=C.find(c=>c.k===SEL);
 document.getElementById("mapLegend").innerHTML=qm
  ?`<span>${CMODE==="cf"?"Cash-flow mensuel à deux":"Rendement 15 ans du quartier"} :</span>${CLS().map(k=>`<span><i style="background:${k.c};opacity:${Math.min(1,k.o+.25)}"></i>${k.t}</span>`).join("")}<span><i style="background:var(--sunk);border:1px dashed var(--muted)"></i>zone d'activité ou sans prix${BANKOK?", ou banque trop juste":""}</span><span><b>■</b> gare · <b>●</b> université · <b>◆</b> centre</span><span><i style="background:var(--accent)"></i>loyers des annonces Bien'ici</span><span>Prix des studios à vendre : <i style="background:var(--ok)"></i>bon prix <i style="background:var(--warn)"></i>à négocier (≤ 15 %) <i style="background:var(--bad)"></i>trop cher</span>`
  :`<span><b>Chiffres des villes = moyenne de la ville</b> (prix et loyers médians)</span>${CMODE==="cf"?`<span>Cash-flow à deux :</span><span><i style="background:var(--ok)"></i>positif</span><span><i style="background:var(--warn)"></i>0 à −50 €</span><span><i style="background:var(--bad)"></i>moins de −50 €</span>`:`<span>Rendement 15 ans :</span><span><i style="background:var(--ok)"></i>5 % et plus</span><span><i style="background:var(--warn)"></i>2,5 à 5 %</span><span><i style="background:var(--bad)"></i>sous le LEP (2,5 %)</span>`}<span>Taille = étudiants</span><span><s></s>grandes lignes de train</span><span>Traits bleus : trajets de ${sc.name} vers Laval, Nantes et Paris (plein = moins de 1 h 30)</span><span><b>Zoomez</b> (molette, pincement ou +) pour voir les quartiers du Mans, de Saint-Nazaire, d'Angers, de Caen et d'Orléans</span>`;}

function qCard(t){const x=QX[t.ck+t.i], n=t.dpe.reduce((a,b)=>a+b,0), fg=fgPct(t.dpe);
 if(!x) return `<div class="qcard"><div class="dh"><h3 style="font-size:1.15rem">${t.name}</h3><span class="pill p-n">${t.type==="H"?"pas de prix publié":"zone d'activité"}</span></div><p class="sub">Pas d'estimation de prix pour ce secteur IRIS. ${n?`${n} DPE de petits appartements.`:""}</p>${adsLine(t)}</div>`;
 const [bc,bt]=bank(x.ratio), rr=rentRatio(t.ck,t);
 return `<div class="qcard"><div class="dh"><h3 style="font-size:1.15rem">${t.name}</h3><span style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="pill" style="background:${QCLS[qCls(x.irr)].c};color:var(--surface)">${x.irr==null?"n.d.":pct(x.irr)} sur 15 ans</span>${cmpBtn({kind:"q",ck:t.ck,code:t.code})}<button type="button" class="cmpb" data-sim="${t.ck}|${t.code}">Simuler un bien ici</button></span></div>
  <div class="big4"><div><span>${hasDVF(t.ck)?"Prix d'un studio":"Prix appartements"}</span><b>${eur(hasDVF(t.ck)?studioPm2(t.ck,t):t.price)}/m²</b></div><div><span>Studio tout compris</span><b>${keur(x.cost)}</b></div><div><span>Loyer hors charges</span><b>${eur(x.rentHC)}</b></div><div><span>Cash-flow ${mlab()}</span><b class="${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}/mois</b>${altCf(x)}</div></div>
  ${(()=>{const det=`<p class="sub" style="margin:0 0 6px">Loyer : loyer médian des studios de la ville${Math.abs(rr-1)<0.005?"":` ${rr>=1?"+":"−"}${fr(Math.abs(rr-1)*100,0)} %`}, ${t.ra?`d'après l'écart RealAdvisor du quartier (${fr(t.ra/12,1)} €/m²/mois contre ${fr(IR[t.ck].raCity/12,1)} en ville)`:(IRIS[t.ck].ra.fit[1]?"estimé à partir du prix du quartier (pas de loyer publié)":"pas de loyer publié pour ce quartier")}. Banque : <span class="pill ${bc}">${bt}</span></p>
  ${demLine(t)}
  ${quartierReal(t)}
  ${x.irr!=null&&x.irr>=9?`<p class="sub" style="margin:0 0 6px;color:var(--warn)">Rendement très élevé sur le papier parce que le prix est bas. Vérifiez sur place la demande et le risque d'impayés : le calcul ne les voit qu'à travers la distance aux pôles étudiants.</p>`:""}
  <div>${n?dpeBar(t.dpe,220):""} <span class="sub">${n?`${n} DPE de petits appartements${n>=15?` · F-G ${fr(fg,0)} %`:" · trop peu pour conclure"}`:"aucun DPE de petit appartement"}</span></div>`, sec=sectorOf(t), A=sec&&ADS[t.ck], nv=A?(A.ventes||[]).filter(a=>a[1]===sec).length+A.ads.filter(a=>a[1]===sec).length:0;
   return sec?ptabs("q",[[`Annonces (${nv})`,adsLine(t)+annoncesBlock(t.ck,sec,false,OPENADS===sec)],["Détails du quartier",det]]):det;})()}</div>`;}

const r22=a=>a[2]*Math.pow(22/a[0],0.6);
const ADURL="https://www.bienici.com/annonce/location/";
function adsTable(list,sector,ck){ck=ck||"";const l=[...list].sort((a,b)=>r22(a)-r22(b)), secs=[...new Set(l.map(a=>a[1]||"non précisé"))].sort((a,b)=>a.localeCompare(b,"fr"));
 const ctl=sector?`<div class="adf"><span class="seg2" role="group" aria-label="Type"><button type="button" data-f="all" aria-pressed="true">Tous</button><button type="button" data-f="1" aria-pressed="false">Meublés</button><button type="button" data-f="0" aria-pressed="false">Vides</button></span>
  <select aria-label="Secteur"><option value="">Tous les secteurs</option>${secs.map(x=>`<option>${esc(x)}</option>`).join("")}</select><span class="sub adn" style="margin:0">${l.length} annonces</span></div>`:"";
 return `<div class="adwrap">${ctl}<div class="scrollbox"><table class="adt"><thead><tr>${sector?"<th>Secteur</th>":""}<th></th><th class="r">m²</th><th class="r hm">Loyer CC</th><th class="r">À 22 m²</th><th class="hm">Type</th><th></th></tr></thead><tbody>${l.map(a=>`<tr data-s="${esc(a[1]||"non précisé")}" data-m="${a[3]}"${a[4]&&ck?` class="clk" tabindex="0" data-ad="l|${ck}|${esc(a[4])}"`:""}><td class="tcell">${thumbHtml(a[4],a[5])}</td>${sector?`<td>${esc(a[1]||"non précisé")}</td>`:""}<td class="r mono">${String(a[0]).replace(".",",")}</td><td class="r mono hm">${eur(a[2])}</td><td class="r mono"><b>${eur(r22(a))}</b></td><td class="hm">${a[3]?"meublé":"vide"}${a[1]==="Université"?" · résidence ?":""}</td><td>${a[4]?`<a href="${ADURL}${esc(a[4])}" target="_blank" rel="noopener">voir</a>`:""}</td></tr>`).join("")}</tbody></table></div>
 <p class="sub" style="margin:4px 0 0">Relevé du ${ADS.date||"5 novembre 2026"}, du moins cher au plus cher une fois ramené à 22 m². Une annonce louée depuis peut ne plus s'ouvrir.</p></div>`;}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".adf [data-f]"); if(!b) return; b.parentElement.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b)); adFilter(b.closest(".adwrap"));});
document.addEventListener("change",e=>{const sel=e.target.closest&&e.target.closest(".adf select"); if(sel) adFilter(sel.closest(".adwrap"));});
function adFilter(w){const f=w.querySelector('.adf [aria-pressed="true"]').dataset.f, sec=w.querySelector(".adf select").value; let n=0;
 w.querySelectorAll("tbody tr").forEach(tr=>{const ok=(f==="all"||tr.dataset.m===f)&&(!sec||tr.dataset.s===sec); tr.hidden=!ok; if(ok) n++;});
 w.querySelector(".adn").textContent=`${n} annonce${n>1?"s":""}`;}
function adsStats(list){const v=list.map(r22); return v.length?{n:v.length,med:median(v)}:null;}
function adsLine(t){const A=ADS[t.ck]; if(!A) return ""; const d=Object.keys(A.map).find(k=>A.map[k].includes(t.code)); if(!d) return "";
 const st=adsStats(A.ads.filter(a=>a[1]===d)), x=QX[t.ck+t.i]; if(!st) return "";
 const model=x?x.rentHC+H.chLoc:null;
 return `<p class="sub" style="margin:0 0 6px">Annonces Bien'ici du secteur « ${d} » : ${st.n} studio${st.n>1?"s":""} de 16 à 32 m², loyer médian ramené à 22 m² <b class="mono">${eur(st.med)}</b> charges comprises${model?` (calcul : ${eur(model)})`:""}${st.n<3?" · trop peu pour conclure":""}.</p>`;}
function adsCity(ck){const A=ADS[ck]; if(!A) return ""; const c=C.find(v=>v.k===ck), all=adsStats(A.ads), meu=adsStats(A.ads.filter(a=>a[3]&&a[1]!=="Université"));
 const model=c.rent*Math.pow(H.surface/c.rentM2,0.6);
 return `<p class="sub" style="margin:0">Contrôle sur les annonces en ligne (Bien'ici, ${ADS.date}) : ${all.n} studios de 16 à 32 m² à ${c.name}, loyer médian ramené à 22 m² <b class="mono">${eur(all.med)}</b> charges comprises, <b class="mono">${eur(meu.med)}</b> pour les meublés${ck==="lemans"?" hors résidences étudiantes":""}. Le calcul retient <b class="mono">${eur(model)}</b> : ${meu.med>=model?"il est plutôt prudent":"il est un peu optimiste"}. Ce sont des loyers demandés, pas signés.</p>${ventesCity(ck)}`;}
function demLine(t){const d=demandOf(t); if(!d) return "";
 return `<p class="sub" style="margin:0 0 6px">Emplacement : ${d.real?`${minTxt(d.min)} à pied de ${MKFULL[d.mk]} (${fr(d.d,1)} km par les rues, ${minTxt(d.bike)} à vélo)`:`à ${fr(d.d,1)} km de la gare, de l'université ou du centre le plus proche`} → ${H.vacQ?`${fr(d.vac,1)} mois vide${d.vac>=2?"s":""} par an retenu${d.vac>=2?"s":""}`:`vacance fixe (${fr(H.vacance,1)} mois), ajustement désactivé`}.</p>`;}
function qFilter(){const q=nrm(document.getElementById("qSearch").value||""); let n=0, t=0;
 document.querySelectorAll("#zBody tr").forEach(tr=>{t++; const ok=!q||nrm(tr.cells[0].textContent).includes(q); tr.hidden=!ok; if(ok) n++;});
 document.getElementById("qCount").textContent=q?`${n} sur ${t}`:`${t} quartiers, du meilleur au moins bon rendement`;}
let QBOXK=null;
function renderQBox(){renderSide(); const box=document.getElementById("qBox"); if(!QC){box.hidden=true;return;} box.hidden=false;
 const z=IR[QC], c=C.find(v=>v.k===QC);
 document.getElementById("qBox").classList.toggle("has",!!QSEL);
 if(QBOXK!==QC){QBOXK=QC; document.getElementById("qCard").innerHTML=ADS[QC]?`<h3 class="qbh">Annonces de ${c.name}</h3>`+adsCity(QC)+annoncesBlock(QC,null,true,false):`<h3 class="qbh">${c.name}</h3><p class="empty" style="margin:0">Pas encore d'annonces relevées ici : le relevé quotidien couvre Le Mans et Saint-Nazaire. Le détail des quartiers est juste en dessous.</p>`;}
 document.getElementById("qTitle").textContent=`Tous les quartiers de ${c.name}`;
 const tb=document.getElementById("zBody"); tb.innerHTML="";
 z.list.filter(t=>QX[t.ck+t.i]).sort((a,b)=>(QX[b.ck+b.i].irr??-9)-(QX[a.ck+a.i].irr??-9)).forEach(t=>{const x=QX[t.ck+t.i], n=t.dpe.reduce((a,b)=>a+b,0), fg=fgPct(t.dpe), tr=document.createElement("tr");
  tr.tabIndex=0; tr.className=QSEL===t?"sel":"";
  tr.innerHTML=`<td><b>${t.name}</b></td><td class="r mono hm">${eur(t.price)}/m²</td><td class="r mono hm">${eur(x.rentHC)}${t.ra?"":"<sup>*</sup>"}</td><td class="r mono ${x.cf>=0?"pos":"neg"}">${sgn(x.cf)}</td>
   <td class="r mono" style="color:${colIrr(x.irr)};font-weight:700">${x.irr==null?"n.d.":pct(x.irr)}</td><td class="r mono hm">${n>=15?fr(fg,0)+" %":"—"}<span class="sub" style="margin:0"> (${n})</span></td>`;
  const go=()=>{QSEL=t; AD=null; flyTo(t.bb,3.2); renderQBox();};
  tr.addEventListener("click",go); tr.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go();}});
  tb.appendChild(tr);});
 qFilter();
 
 setHash();
}

/* --- navigation : molette, glisser, pincer, boutons --- */
function clampV(){V.k=Math.min(KMAX,Math.max(Math.max(VW/WW,VH/MAP.H),V.k)); V.x=Math.min(0,Math.max(VW-WW*V.k,V.x)); V.y=Math.min(0,Math.max(VH-MAP.H*V.k,V.y));}
const KMIN=()=>document.body.classList.contains("mob")?Math.min(VW/WW,VH/MAP.H)*0.7:Math.max(VW/WW,VH/MAP.H);
function zoomAt(px,py,f){const k2=Math.min(KMAX,Math.max(KMIN(),V.k*f)); V.x=px-(px-V.x)*k2/V.k; V.y=py-(py-V.y)*k2/V.k; V.k=k2; clampV(); draw();}
let anim=null;
function flyZoom(px,py,f){const k=Math.min(KMAX,V.k*f), wx=(px-V.x)/V.k, wy=(py-V.y)/V.k, w=VW/k, h=VH/k; flyTo([wx-w/2,wy-h/2,wx+w/2,wy+h/2],1);}
function flyTo(bb,pad=1.15){const w=(bb[2]-bb[0])*pad, h=(bb[3]-bb[1])*pad, k=Math.min(KMAX,Math.max(KMIN(),Math.min(VW/w,VH/h))), cx=(bb[0]+bb[2])/2, cy=(bb[1]+bb[3])/2;
 const T={k,x:VW/2-cx*k,y:VH/2-cy*k}, S0={...V}, t0=performance.now(), D=matchMedia("(prefers-reduced-motion: reduce)").matches?0:550;
 cancelAnimationFrame(anim);
 const step=now=>{const u=D?1:Math.min(1,(now-t0)/D), e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
  const lk=Math.exp(Math.log(S0.k)+(Math.log(T.k)-Math.log(S0.k))*e);
  const c0x=(VW/2-S0.x)/S0.k, c0y=(VH/2-S0.y)/S0.k, ccx=c0x+(cx-c0x)*e, ccy=c0y+(cy-c0y)*e;
  V={k:lk,x:VW/2-ccx*lk,y:VH/2-ccy*lk}; clampV(); draw(); if(u<1) anim=requestAnimationFrame(step);};
 anim=requestAnimationFrame(step);}
function toVB(e){const svg=svgEl(), m=svg.getScreenCTM(); if(!m){const r=svg.getBoundingClientRect(); return [(e.clientX-r.left)*VW/r.width,(e.clientY-r.top)*VH/r.height];} const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(m.inverse()); return [p.x,p.y];}
(function bindNav(){
 const svg=svgEl(), tip=document.getElementById("tip"), pts=new Map(); let drag=null, pinch=null, moved=false;
 let wheelOn=false; svg.addEventListener("pointerdown",()=>{wheelOn=true;}); svg.parentElement.addEventListener("pointerleave",()=>{wheelOn=false;});
 svg.addEventListener("wheel",e=>{if(!(wheelOn||e.ctrlKey||e.metaKey||document.getElementById("mapSec").classList.contains("mapfull"))){wheelHint(); return;} e.preventDefault(); cancelAnimationFrame(anim); const [x,y]=toVB(e); zoomAt(x,y,Math.exp(-e.deltaY*(e.deltaMode?0.05:0.0016)));},{passive:false});
 const isFull=()=>document.getElementById("mapSec").classList.contains("mapfull");
 let start=null, lastTap=null, hinted=false;
 const hint=()=>{if(hinted) return; hinted=true; const h=document.getElementById("mapHint"); if(!h) return; h.classList.add("flash"); setTimeout(()=>h.classList.remove("flash"),1600);};
 svg.addEventListener("touchmove",e=>{if(e.touches.length>=2) e.preventDefault();},{passive:false});
 svg.addEventListener("pointerdown",e=>{if(e.button>0) return; cancelAnimationFrame(anim); try{svg.setPointerCapture(e.pointerId);}catch(_){}
  pts.set(e.pointerId,toVB(e)); tip.hidden=true;
  if(pts.size===1){moved=false; start={x:e.clientX,y:e.clientY,t:e.pointerType}; drag=(e.pointerType==="touch"&&!isFull())?null:{p:toVB(e),v:{...V}};}
  else if(pts.size===2){const [a,b]=[...pts.values()]; pinch={d:Math.max(1,Math.hypot(a[0]-b[0],a[1]-b[1])),m:[(a[0]+b[0])/2,(a[1]+b[1])/2],v:{...V}}; drag=null; moved=true;}});
 svg.addEventListener("pointermove",e=>{
  if(pts.has(e.pointerId)){const p=toVB(e); pts.set(e.pointerId,p);
   if(pinch&&pts.size===2){const [a,b]=[...pts.values()], d=Math.hypot(a[0]-b[0],a[1]-b[1]), m=[(a[0]+b[0])/2,(a[1]+b[1])/2], k2=Math.min(KMAX,Math.max(Math.max(VW/WW,VH/MAP.H),pinch.v.k*d/pinch.d));
    const wx=(pinch.m[0]-pinch.v.x)/pinch.v.k, wy=(pinch.m[1]-pinch.v.y)/pinch.v.k; V={k:k2,x:m[0]-wx*k2,y:m[1]-wy*k2}; clampV(); draw(); return;}
   if(start&&!moved&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8){moved=true; if(!drag&&start.t==="touch") hint();}
   if(drag&&moved){svg.classList.add("grabbing"); V.x=drag.v.x+(p[0]-drag.p[0]); V.y=drag.v.y+(p[1]-drag.p[1]); clampV(); draw(); return;}
   if(pts.size>0&&e.pointerType!=="mouse") return;}
  if(e.pointerType!=="mouse") return;
  const el=document.elementFromPoint(e.clientX,e.clientY), ip=el&&el.closest&&el.closest("[data-iris]"), vp=el&&el.closest&&el.closest("[data-vpin],[data-bpin]");
  if(vp){const box=svg.parentElement.getBoundingClientRect(); tip.innerHTML=pinPreview(vp); tip.classList.add("rich"); tip.hidden=false;
   const tx=e.clientX-box.left+16, ty=e.clientY-box.top+16; tip.style.left=Math.min(tx,box.width-tip.offsetWidth-6)+"px"; tip.style.top=Math.min(ty,box.height-tip.offsetHeight-6)+"px"; return;}
  tip.classList.remove("rich");
  if(ip&&V.k>=KQ){const [ck,i]=ip.dataset.iris.split(":"), t=IR[ck].list[+i], x=QX[ck+i], box=svg.parentElement.getBoundingClientRect();
   tip.innerHTML=`<b>${t.name}</b><br>${x?`${x.irr==null?"n.d.":pct(x.irr)} sur 15 ans · ${sgn(x.cf)}/mois<br>${eur(t.price)}/m² · loyer ${eur(x.rentHC)}`:(t.type==="H"?"pas de prix publié":"zone d'activité")}`;
   tip.hidden=false; const tx=e.clientX-box.left+14, ty=e.clientY-box.top+14; tip.style.left=Math.min(tx,box.width-tip.offsetWidth-4)+"px"; tip.style.top=ty+"px";
   document.getElementById("hl").setAttribute("d",t.d);}
  else {tip.hidden=true; document.getElementById("hl").setAttribute("d",V.k>=KQ&&QSEL?QSEL.d:"");}});
 const end=e=>{const wasDrag=moved; pts.delete(e.pointerId); if(pts.size<2){if(pinch&&pts.size===1){const [q]=[...pts.values()]; drag=isFull()?{p:q,v:{...V}}:null;} pinch=null;} if(pts.size===0){drag=null; start=null; svg.classList.remove("grabbing");}
  if(e.type==="pointercancel"){moved=true; return;}
  if(e.type==="pointerup"&&!wasDrag&&pts.size===0){
   if(e.pointerType!=="mouse"){const now=e.timeStamp; if(lastTap&&now-lastTap.t<320&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<30){lastTap=null; const [x,y]=toVB(e); flyZoom(x,y,2); return;} lastTap={t:now,x:e.clientX,y:e.clientY};}
   const el=document.elementFromPoint(e.clientX,e.clientY); if(!el) return;
   const cg=el.closest(".city"); if(cg){if(SEL!==cg.dataset.k){SEL=cg.dataset.k; QSEL=null; AD=null; render();} return;}
   const ap=el.closest("[data-ads]"); if(ap){openAds(ap.dataset.ads); return;}
   const vpn=el.closest("[data-vpin]"); if(vpn){const [kind,ck,...r]=vpn.dataset.vpin.split("|"); openAd(kind,ck,r.join("|")); return;}
   const bpn=el.closest("[data-bpin]"); if(bpn){openBien(bpn.dataset.bpin); return;}
   const ip=el.closest("[data-iris]"); if(ip&&V.k>=KQ){const [ck,i]=ip.dataset.iris.split(":"); QSEL=IR[ck].list[+i]; AD=null; if(QC!==ck) QC=ck; if(SEL!==ck){SEL=ck; render();} else {draw(); renderQBox();}}}};
 svg.addEventListener("pointerup",end); svg.addEventListener("pointercancel",end);
 svg.addEventListener("pointerleave",()=>{tip.hidden=true;});
 const mid=()=>[VW/2,VH/2];
 svg.addEventListener("dblclick",e=>{const [x,y]=toVB(e); flyZoom(x,y,2);});
 document.getElementById("zIn").addEventListener("click",()=>flyZoom(...mid(),2));
 document.getElementById("zOut").addEventListener("click",()=>flyZoom(...mid(),.5)); document.getElementById("zHome").addEventListener("click",()=>{QSEL=null; AD=null; flyTo([0,0,WW,MAP.H],1);});
 document.getElementById("zAll").addEventListener("click",()=>flyTo([0,0,WW,MAP.H],1));
 document.getElementById("zCity").addEventListener("click",()=>{if(IR[SEL]) flyTo(IR[SEL].bb);});
})();

const DPECITY={lemans:[5,28,2367,1630,761,236,140],angers:[425,100,4894,3163,1950,750,595],tours:[36,365,5394,3306,1727,835,574],poitiers:[4,36,3108,2550,947,384,192],
 laval:[6,31,924,834,715,127,82],orleans:[23,40,4911,2094,1728,591,372],chartres:[0,3,546,684,342,132,73],stnazaire:[8,33,743,540,228,81,58],rennes:[7,610,8505,4759,2432,803,609],
 blois:[7,10,723,612,319,135,75],caen:[135,226,3060,3086,1767,685,456],cholet:[0,1,555,367,135,37,20],laroche:[7,65,1070,1051,252,70,23]};
const fgOf=d=>(d[5]+d[6])/d.reduce((a,b)=>a+b,0)*100, rFG=v=>v<8?"p-ok":v<=11?"p-n":"p-warn";

