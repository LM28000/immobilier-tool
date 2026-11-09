let V={k:1,x:0,y:0}, QSEL=null, QC=null;
const IR={};
const nrm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
(function decodeIris(){
 Object.entries(IRIS).forEach(([ck,d])=>{
  const QQ=Q[ck]?Q[ck].q:d.q, qn={}; Object.entries(QQ).forEach(([n,p])=>qn[nrm(n)]=[n,p]);
  /* signal de prix du quartier : RealAdvisor quand il publie le quartier ; sinon les ventes de studios du quartier, mélangées à la ville (poids de 8 ventes) */
  const noRA=!Object.keys(QQ).length, DS=noRA&&dvfC(ck,"studio"), dvfP=code=>{const q=DS&&DS.q[code]; return DS?Math.round(q&&q.n?(q.n*q.med+8*DS.med)/(q.n+8):DS.med):null;};
  const rn={}; Object.entries(d.ra.q).forEach(([n,v])=>rn[nrm(n)]=v);
  /* ville avec RealAdvisor, quartier absent de RealAdvisor : ses ventes (5 au moins), mélangées à la ville, ramenées à l'échelle RealAdvisor */
  const DV=!noRA&&dvfC(ck,"studio"), raMed=!noRA?median(Object.values(QQ)):null, dvfRA=code=>{const q=DV&&DV.q[code]; return q&&q.n>=5&&raMed?Math.round(raMed*((q.n*q.med+8*DV.med)/(q.n+8))/DV.med):null;};
  const list=d.txt.split("\n").map((line,i)=>{const [name,code,type,rings]=line.split("|");
   let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,sx=0,sy=0,n=0;
   const dd=rings.split(";").map(r=>{let X=0,Y=0;return r.split(" ").map((p,j)=>{const q=p.split(",");X+=+q[0];Y+=+q[1];
     const [x,y]=pxy(Y/1e4,X/1e4); if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; sx+=x;sy+=y;n++;
     return (j?"L":"M")+x.toFixed(3)+" "+y.toFixed(3);}).join("")+"Z";}).join("");
   const key=nrm(name.replace(/^Z\.A\./,"ZA")), qm=noRA?(type==="H"&&DS?[name,dvfP(code)]:null):qn[key]||qn[key.replace(/\d+$/,"")]||(type==="H"&&dvfRA(code)?[name,dvfRA(code)]:null);
   const ra=qm?rn[nrm(qm[0])]:undefined;
   return {i,ck,name,code,type,d:dd,bb:[x0,y0,x1,y1],cx:sx/n,cy:sy/n,price:qm?qm[1]:null,ra,dpe:d.dpe[code]||[0,0,0,0,0,0,0]};});
  const bb=list.reduce((b,t)=>[Math.min(b[0],t.bb[0]),Math.min(b[1],t.bb[1]),Math.max(b[2],t.bb[2]),Math.max(b[3],t.bb[3])],[1e9,1e9,-1e9,-1e9]);
  IR[ck]={list,bb,med:noRA?(DS?DS.med:null):median(Object.values(QQ)),raCity:d.ra.city,noRA};
 });
})();
const clampR=v=>Math.min(1.15,Math.max(0.85,v));
/* loyer du quartier : modèle, mélangé aux loyers demandés du secteur Bien'ici dès 4 annonces */
const RBL=new Map();
function rentBlend(ck,t){/* annonces du type choisi, ramenées à la surface du bien */ const k=ck+"|"+H.type+"|"+H.surface+"|"+t.code; if(RBL.has(k)) return RBL.get(k); let o=null; const A=typeof ADS!=="undefined"&&ADS[ck], c=C.find(v=>v.k===ck);
 if(A&&A.ads&&A.map){const sec=Object.keys(A.map).find(s=>A.map[s].includes(t.code)); if(sec){const v=adsDedup(A.ads.filter(a=>a[1]===sec)).map(a=>r22(a,ck)); if(v.length>=4){const med=median(v), ref=c.rent*Math.pow(TY().surf/c.rentM2,rentExp(ck))*Math.pow(H.surface/TY().surf,expT(H.type))*lrc(ck,H.type), w=v.length/(v.length+6); o={sec,n:v.length,med,w,ratio:med/ref};}}}
 RBL.set(k,o); return o;}
const rentRatio=(ck,t)=>{const m=rentRatioM(ck,t), b=rentBlend(ck,t); return b?clampR((1-b.w)*m+b.w*b.ratio):m;};
const rentRatioM=(ck,t)=>{if(t.ra) return clampR(t.ra/IR[ck].raCity); const [a,b]=IRIS[ck].ra.fit; return clampR(Math.exp(a+b*Math.log(t.price/IR[ck].med)));};
function calcIris(t){const c=C.find(v=>v.k===t.ck), dm=H.vacQ?demandOf(t):null; return calc(Object.assign({},c,{spm2:studioPm2(t.ck,t),rent:c.rent*rentRatio(t.ck,t),vac:dm?dm.vac:undefined}));}
/* chiffre d'une ville : celui de son quartier du milieu. Les quartiers sont classés par rendement, chacun compté selon ses ventes du type (DVF) ;
   la moitié des ventes se font dans des quartiers au rendement plus haut, l'autre moitié plus bas. La couleur d'une ville est ainsi celle
   de ses quartiers. Sans quartier chiffré : la moyenne de la ville. Le résultat garde le calcul complet de ce quartier (cash-flow, budget…). */
const VILC=new Map();
function calcVille(c){if(!c) return null; const k=c.k+"|"+JSON.stringify(H); let r=VILC.get(k); if(r) return r;
 const z=typeof IR!=="undefined"&&IR[c.k], L=z?z.list.filter(t=>t.type==="H"&&t.price):[];
 if(!L.length) r=calc(c);
 else{const D=dvfC(c.k), R=L.map(t=>({t,x:calcIris(t),w:(D&&D.q&&D.q[t.code]&&D.q[t.code].n)||0})); if(!R.some(o=>o.w>0)) R.forEach(o=>{o.w=1;});
  const B=R.filter(o=>o.w>0).sort((a,b)=>(a.x.irr==null?-1e9:a.x.irr)-(b.x.irr==null?-1e9:b.x.irr)), T=B.reduce((s,o)=>s+o.w,0); let s=0, m=B[B.length-1];
  for(const o of B){s+=o.w; if(s>=T/2){m=o; break;}}
  r=Object.assign({},m.x); Object.defineProperty(r,"_c",{value:m.x._c}); Object.defineProperty(r,"_v",{value:c}); Object.defineProperty(r,"qt",{value:m.t});}
 if(VILC.size>400) VILC.clear(); VILC.set(k,r); return r;}
const QCLS=[{t:"sous 2,5 %",c:"var(--bad)",o:.55},{t:"2,5 à 5 %",c:"var(--warn)",o:.5},{t:"5 à 7 %",c:"var(--ok)",o:.2},{t:"7 à 9 %",c:"var(--ok)",o:.42},{t:"9 % et plus",c:"var(--ok)",o:.68}];
const qCls=irr=>irr==null||irr<2.5?0:irr<5?1:irr<7?2:irr<9?3:4;
const fgPct=d=>{const n=d.reduce((a,b)=>a+b,0);return n?(d[5]+d[6])/n*100:null;};

let QX={}; // résultats par quartier, recalculés à chaque render
function computeIris(){QX={};Object.values(IR).forEach(z=>z.list.forEach(t=>{if(t.type==="H"&&t.price) QX[t.ck+t.i]=calcIris(t);}));}

const r22=(a,ck)=>a[2]*Math.pow(H.surface/a[0],expT(H.type));   /* annonce du même type ramenée à la surface du bien */ /* loyer d'une annonce ramené à la surface du bien */
const ADURL="https://www.bienici.com/annonce/location/";
function adsTable(list,sector,ck){ck=ck||"";const l=[...list].sort((a,b)=>r22(a)-r22(b)), secs=[...new Set(l.map(a=>a[1]||"non précisé"))].sort((a,b)=>a.localeCompare(b,"fr"));
 const ctl=sector?`<div class="adf"><span class="seg2" role="group" aria-label="Type"><button type="button" data-f="all" aria-pressed="true">Tous</button><button type="button" data-f="1" aria-pressed="false">Meublés</button><button type="button" data-f="0" aria-pressed="false">Vides</button></span>
  <select aria-label="Secteur"><option value="">Tous les secteurs</option>${secs.map(x=>`<option>${esc(x)}</option>`).join("")}</select><span class="sub adn" style="margin:0">${l.length} annonces</span></div>`:"";
 return `<div class="adwrap">${ctl}<div class="scrollbox"><table class="adt"><thead><tr>${sector?"<th>Secteur</th>":""}<th></th><th class="r">m²</th><th class="r hm">Loyer CC</th><th class="r">À ${H.surface} m²</th><th class="hm">Type</th><th></th></tr></thead><tbody>${l.map(a=>`<tr data-s="${esc(a[1]||"non précisé")}" data-m="${a[3]}"${a[4]&&ck?` class="clk" tabindex="0" data-ad="l|${ck}|${esc(a[4])}"`:""}><td class="tcell">${thumbHtml(a[4],a[5])}</td>${sector?`<td>${esc(a[1]||"non précisé")}</td>`:""}<td class="r mono">${String(a[0]).replace(".",",")}</td><td class="r mono hm">${eur(a[2])}</td><td class="r mono"><b>${eur(r22(a))}</b></td><td class="hm">${a[3]?"meublé":"vide"}${a[1]==="Université"?" · résidence ?":""}</td><td>${a[4]?`<a href="${ADURL}${esc(a[4])}" target="_blank" rel="noopener">voir</a>`:""}</td></tr>`).join("")}</tbody></table></div>
 <p class="sub" style="margin:4px 0 0">Relevé du ${ADS.date||"5 novembre 2026"}, du moins cher au plus cher une fois ramené à ${H.surface} m². Une annonce louée depuis peut ne plus s'ouvrir.</p></div>`;}

/* annonces : les lots identiques (même secteur, surface et loyer) d'une même résidence comptent une fois */
const adKey=a=>a[1]+"|"+a[0]+"|"+a[2];
function adsDedup(list){const s=new Set(); return list.filter(a=>{const k=adKey(a); if(s.has(k)) return false; s.add(k); return true;});}

function adsStats(list){const v=adsDedup(list).map(r22); return v.length?{n:v.length,med:median(v)}:null;}
function adsLine(t){const A=ADS[t.ck]; if(!A) return ""; const d=Object.keys(A.map).find(k=>A.map[k].includes(t.code)); if(!d) return "";
 const st=adsStats(A.ads.filter(a=>a[1]===d)), x=QX[t.ck+t.i]; if(!st) return "";
 return fRows([["Annonces de location",`${tyN(st.n)} · <b class="mono">${eur(st.med)}</b> CC à ${H.surface} m²`,`secteur Bien'ici « ${esc(d)} »${x?` · calcul : ${eur(x.rentHC+H.chLoc)} CC`:""}${st.n<3?" · trop peu pour conclure":""}`]]);}
function adsCity(ck){const A=ADS[ck]; if(!A) return ""; const c=C.find(v=>v.k===ck), all=adsStats(A.ads), meu=adsStats(A.ads.filter(a=>a[3])); if(!all) return "";
 const model=c.rent*Math.pow(H.surface/c.rentM2,0.6);
 return fRows([["Annonces de location",`${tyN(all.n)} · <b class="mono">${eur(all.med)}</b> CC à ${H.surface} m²`,`Bien'ici, ${ADS.date} · loyers demandés, pas signés`],meu&&["Dont meublés",`<b class="mono">${eur(meu.med)}</b>`,"lots identiques d'une résidence comptés une fois"],["Notre calcul",`<b class="mono">${eur(model)}</b> CC`,meu&&meu.med>=model?"plutôt prudent":"un peu optimiste"]]);}
function demLine(t){const d=demandOf(t); if(!d) return "";
 return fRows([["Emplacement",d.real?`<b>${minTxt(d.min)}</b> ${d.mode==="tc"?"en bus ou tram":"à pied"} ${MKDE[d.mk]}`:`à ${fr(d.d,1)} km du repère le plus proche`,d.real?`${minTxt(d.foot)} à pied (${fr(d.d,1)} km) · ${minTxt(d.bike)} à vélo`:""]]);}

let QBOXK=null;

const DPECITY={lemans:[5,28,2367,1630,761,236,140],angers:[425,100,4894,3163,1950,750,595],tours:[36,365,5394,3306,1727,835,574],poitiers:[4,36,3108,2550,947,384,192],
 laval:[6,31,924,834,715,127,82],orleans:[23,40,4911,2094,1728,591,372],chartres:[0,3,546,684,342,132,73],stnazaire:[8,33,743,540,228,81,58],rennes:[7,610,8505,4759,2432,803,609],
 blois:[7,10,723,612,319,135,75],caen:[135,226,3060,3086,1767,685,456],cholet:[0,1,555,367,135,37,20],laroche:[7,65,1070,1051,252,70,23],
 evreux:[0,11,578,620,337,126,66],bourges:[115,42,483,543,428,122,62],niort:[2,9,678,506,293,54,27],limoges:[3,228,3188,3160,1056,362,201],brest:[186,137,2905,2079,826,254,122],alencon:[1,19,187,292,154,66,40],cherbourg:[0,6,701,479,313,95,51],nantes:[31,774,12080,6080,2640,1145,916]};
const DPE0=[0,0,0,0,0,0,0], dpeCity=k=>DPECITY[k]||DPE0, fgOf=d=>{d=d||DPE0; const s=d.reduce((a,b)=>a+b,0); return s?(d[5]+d[6])/s*100:0;}, rFG=v=>v<8?"p-ok":v<=11?"p-n":"p-warn";

