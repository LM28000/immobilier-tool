/* ================= vraie carte (rues OpenStreetMap), sur ordinateur et téléphone =================
   Chargée seulement si les fonds de carte s'affichent (page GitHub) ; sinon la carte dessinée reste (artifact Claude, hors ligne). */
const LEAF={on:false,map:null,tiles:null,city:null,iris:null,pins:null,marks:null,poly:{},dark:null};
const TILEURL=()=>"https://tile.openstreetmap.org/{z}/{x}/{y}.png";   // fonds OpenStreetMap, sans clé
const LEAFJS="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||"#888";
const colv=c=>c&&c.startsWith("var(")?cssv(c.slice(4,-1)):c;
const isDark=()=>document.documentElement.getAttribute("data-theme")==="dark";
/* contours des quartiers en latitude / longitude (décodés une fois) */
const IRLL={};
function irisLL(ck){if(IRLL[ck]) return IRLL[ck]; const out={};
 IRIS[ck].txt.split("\n").forEach((line,i)=>{const rings=line.split("|")[3]; out[i]=rings.split(";").map(r=>{let X=0,Y=0; return r.split(" ").map(p=>{const q=p.split(","); X+=+q[0]; Y+=+q[1]; return [Y/1e4,X/1e4];});});});
 return IRLL[ck]=out;}
const bbLL=bb=>{const [la0,lo0]=unproj(bb[0],bb[3]), [la1,lo1]=unproj(bb[2],bb[1]); return [[la0,lo0],[la1,lo1]];};
const tLL=t=>unproj(t.cx,t.cy);

/* garder la carte dessinée en phase (elle sert à savoir quelle ville est à l'écran) */
function svgJump(bb,pad=1.15){const w=(bb[2]-bb[0])*pad, h=(bb[3]-bb[1])*pad, k=Math.min(KMAX,Math.max(KMIN(),Math.min(VW/w,VH/h))), cx=(bb[0]+bb[2])/2, cy=(bb[1]+bb[3])/2;
 cancelAnimationFrame(anim); V.k=k; V.x=VW/2-cx*k; V.y=VH/2-cy*k; clampV(); draw();}

function leafPad(){if(!MOBON) return {padding:[28,28]}; const sh=document.getElementById("mSheet"), top=document.querySelector(".mmtop"); const r=sh?sh.getBoundingClientRect():{top:innerHeight}, m=document.getElementById("mMap").getBoundingClientRect();
 return {paddingTopLeft:[16,(top?top.getBoundingClientRect().bottom-m.top:100)+8],paddingBottomRight:[16,Math.max(20,m.bottom-r.top+12)]};}
function leafFly(bb,opt){if(!LEAF.on) return; const b=L.latLngBounds(bbLL(bb)), o=Object.assign({duration:.6,maxZoom:15},leafPad(),opt||{}); if(matchMedia("(prefers-reduced-motion: reduce)").matches) LEAF.map.fitBounds(b,o); else LEAF.map.flyToBounds(b,o);}
function leafHome(){const bs=Object.values(IR).map(z=>z.bb), u=[Math.min(...bs.map(b=>b[0])),Math.min(...bs.map(b=>b[1])),Math.max(...bs.map(b=>b[2])),Math.max(...bs.map(b=>b[3]))]; leafFly(u,{maxZoom:9});}

/* calques */
function leafCities(){const g=LEAF.city; g.clearLayers(); const maxS=Math.max(...C.map(c=>c.students));
 C.forEach(c=>{const x=calc(c), col=colv(colCity(x)), r=7+16*Math.sqrt(c.students/maxS), on=c.k===SEL;
  const m=L.circleMarker([c.lat,c.lon],{radius:r,color:on?cssv("--fg"):"#fff",weight:on?3:2,fillColor:col,fillOpacity:.85}).addTo(g);
  m.on("click",()=>leafCity(c.k));
  const lab=L.marker([c.lat,c.lon],{icon:L.divIcon({className:"lcityw",html:`<span class="lcity${on?" on":""}" style="margin-left:${r+4}px"><b>${esc(c.name)}</b><span style="color:${col}">${CMODE==="cf"?sgn(x.cf):irrTxt(x)}</span></span>`,iconSize:[0,0],iconAnchor:[0,14]}),keyboard:false}).addTo(g);
  lab.on("click",()=>leafCity(c.k));});}
function leafCity(k){SEL=k; QSEL=null; AD=null; render(); if(IR[k]){svgJump(IR[k].bb); leafFly(IR[k].bb);} else {const c=C.find(v=>v.k===k); LEAF.map.flyTo([c.lat,c.lon],11,{duration:.6});} if(MOBON&&SNAP===0) setSnap(1);}
function leafIris(){const g=LEAF.iris; g.clearLayers(); LEAF.poly={};
 Object.keys(IR).forEach(ck=>{const ll=irisLL(ck); IR[ck].list.forEach(t=>{const x=QX[t.ck+t.i], on=QSEL===t;
  let st; if(x){const k=clsFor(x), dim=bankFail(x); st={fillColor:dim?cssv("--muted"):colv(k.c),fillOpacity:dim?.06:Math.min(.55,k.o+.1),color:on?cssv("--fg"):"#fff",weight:on?3:1,opacity:on?1:.8};}
  else st={fillColor:cssv("--sunk"),fillOpacity:.35,color:cssv("--line"),weight:1,dashArray:"3 3"};
  const p=L.polygon(ll[t.i],st).addTo(g); LEAF.poly[t.ck+t.i]=p;
  p.on("click",e=>{L.DomEvent.stopPropagation(e); SEL=t.ck; QSEL=t; AD=null; svgJump(IR[t.ck].bb); render(); if(MOBON&&SNAP===0) setSnap(1);});});});}
function leafPins(){const g=LEAF.pins; g.clearLayers(); const sel=AD&&AD.kind==="v"?AD.ck+AD.suf:null;
 Object.keys(IR).forEach(ck=>{const A=ADS[ck]; if(!A||!A.ventes) return; const by={};
  A.ventes.forEach(a=>{const t=venteIris(ck,a[1]); if(t) (by[t.code]=by[t.code]||{t,l:[]}).l.push(a);});
  Object.values(by).forEach(({t,l})=>{const ll=tLL(t); l.sort((p,q)=>p[2]-q[2]).forEach((a,i)=>{const v=vState(ck,a), hv=vu("v",ck,a[3]), lab=(hv&&hv.last?"↓":"")+keur(a[2]), on=sel===ck+a[3];
   const col=i%2?1:-1, row=Math.floor(i/2), ax=col>0?-4:0;
   const m=L.marker(ll,{icon:L.divIcon({className:"lpinw",html:`<span class="lpin ${v.st}${on?" on":""}${isNewAd(ck,a[3])?" nw":""}${col<0?" lft":""}">${lab}</span>`,iconSize:[0,0],iconAnchor:[0,10+row*24]}),keyboard:false,riseOnHover:true,zIndexOffset:on?1000:0}).addTo(g);
   m.on("click",e=>{L.DomEvent.stopPropagation(e); openAd("v",ck,a[3]);});});});});
 BIENS.filter(b=>!isOut(b)&&b.quartier&&IR[b.ville]).forEach(b=>{const t=IR[b.ville].list.find(v=>v.name===b.quartier); if(!t) return;
  const m=L.marker(tLL(t),{icon:L.divIcon({className:"lstar",html:"★",iconSize:[26,26],iconAnchor:[13,32]}),zIndexOffset:500}).addTo(g); m.on("click",e=>{L.DomEvent.stopPropagation(e); openAd("b",b.ville,b.id);});});}
function leafMarks(){const g=LEAF.marks; g.clearLayers(); const ic={gare:"■",univ:"●",univ2:"●",centre:"◆"};
 Object.entries(MARK).forEach(([ck,m])=>Object.entries(m).forEach(([k,p])=>L.marker(p,{icon:L.divIcon({className:"lmarkw",html:`<span class="lmark"><i>${ic[k]}</i>${MARKTXT[k]}</span>`,iconSize:[0,0],iconAnchor:[7,9]}),interactive:false,keyboard:false}).addTo(g)));}
function leafZoomLayers(){if(!LEAF.on) return; const z=LEAF.map.getZoom(), M=LEAF.map;
 const want=(g,on)=>{if(on&&!M.hasLayer(g)) g.addTo(M); if(!on&&M.hasLayer(g)) M.removeLayer(g);};
 want(LEAF.city,z<11); want(LEAF.iris,z>=10); want(LEAF.marks,z>=12); want(LEAF.pins,z>=12);
 LEAF.host.classList.toggle("lq",z>=10);}
function leafSig(){return JSON.stringify(H)+CMODE+BANKOK+SEL+(QSEL?QSEL.ck+QSEL.i:"")+(AD?AD.ck+AD.suf:"")+BIENS.map(b=>b.id+b.statut+b.quartier).join()+(ADS.iso||"");}
function leafRefresh(force){if(!LEAF.on) return; const sg=leafSig(); if(!force&&sg===LEAF.sig){leafZoomLayers(); return;} LEAF.sig=sg; LEAF.dark=isDark(); LEAF.host.classList.toggle("ldark",LEAF.dark);
 leafCities(); leafIris(); leafPins(); leafZoomLayers();}
/* quelle ville est au centre de l'écran (pour la feuille du bas quand on se promène) */
function leafCenterCity(){if(!LEAF.on||LEAF.map.getZoom()<10) return; const c=LEAF.map.getCenter(); let best=null,bd=1e9;
 Object.keys(IR).forEach(ck=>{const cc=C.find(v=>v.k===ck), d=Math.hypot(cc.lat-c.lat,(cc.lon-c.lng)*0.7); if(d<bd){bd=d; best=ck;}});
 if(best&&best!==SEL&&bd<0.25){SEL=best; if(QSEL&&QSEL.ck!==best) QSEL=null; svgJump(IR[best].bb); render();}}

function leafInit(){if(LEAF.on||!window.L) return; const host=document.querySelector(".mapbox"); if(!host) return; LEAF.host=host;
 const el=document.createElement("div"); el.id="mLeaf"; host.appendChild(el);
 const M=L.map(el,{zoomControl:false,attributionControl:false,minZoom:5,maxZoom:19,zoomSnap:.5,zoomDelta:1,worldCopyJump:false,scrollWheelZoom:true,wheelPxPerZoomLevel:50,wheelDebounceTime:30,preferCanvas:true,renderer:L.canvas({padding:.5,tolerance:4})});
 M.setView([47.7,0],7); LEAF.map=M; LEAF.tiles=L.tileLayer(TILEURL(),{maxZoom:19,crossOrigin:true}).addTo(M);
 L.control.attribution({position:"bottomleft",prefix:false}).addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">les contributeurs OpenStreetMap</a>').addTo(M);
 LEAF.city=L.layerGroup(); LEAF.iris=L.layerGroup(); LEAF.pins=L.layerGroup(); LEAF.marks=L.layerGroup();
 LEAF.on=true; host.classList.add("leaf");
 M.on("zoomend",leafZoomLayers); M.on("moveend",leafCenterCity);
 M.on("click",()=>{if(QSEL){QSEL=null; AD=null; render();}});
 if(window.ResizeObserver) new ResizeObserver(()=>M.invalidateSize()).observe(host);
 const sel=SEL&&IR[SEL]&&QSEL?QSEL.bb:null; leafRefresh();
 if(sel) leafFly(sel); else if(IR[SEL]&&!MOBON) leafFly(IR[SEL].bb,{maxZoom:12}); else leafHome();
 setTimeout(()=>M.invalidateSize(),50);}

/* ---------- branchements ---------- */
const _flyToL=flyTo; flyTo=function(bb,pad){if(LEAF.on){svgJump(bb,pad||1.15); leafFly(bb); return;} return _flyToL(bb,pad);};
const _mHome=mHome; mHome=function(){if(LEAF.on) leafHome(); else _mHome();};
const _renderL=render; render=function(){_renderL.apply(this,arguments); if(LEAF.on) leafRefresh();};
const _renderSideL=renderSide; renderSide=function(){_renderSideL.apply(this,arguments); if(LEAF.on) leafRefresh();};
const _mShowL=mShowNow; mShowNow=function(k,o){_mShowL(k,o); if(LEAF.on&&k==="carte") setTimeout(()=>LEAF.map.invalidateSize(),60);};
function leafSetFull(){if(LEAF.on) setTimeout(()=>LEAF.map.invalidateSize(),80);}
document.addEventListener("click",e=>{if(!LEAF.on) return; const h=e.target.closest&&e.target.closest("#zHome,#zAll,#zIn,#zOut,#zFull"); if(!h) return;
 if(h.id==="zFull"){leafSetFull(); return;} e.preventDefault(); e.stopImmediatePropagation();
 if(h.id==="zIn") LEAF.map.zoomIn(); else if(h.id==="zOut") LEAF.map.zoomOut(); else leafHome();},true);
addEventListener("keydown",e=>{if(LEAF.on&&(e.key==="Escape"||e.key==="f"||e.key==="F")) leafSetFull();});
new MutationObserver(()=>{if(LEAF.on&&LEAF.dark!==isDark()) leafRefresh(true);}).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});

/* on n'essaie la vraie carte que si un fond de carte se charge (refusé dans l'artifact Claude et hors ligne) */
function leafTry(){if(LEAF.on||LEAF.trying) return; LEAF.trying=true;
 const img=new Image(); let done=false; const fail=()=>{if(done) return; done=true; LEAF.trying=false;};
 const t=setTimeout(fail,4000);
 img.onload=()=>{if(done) return; done=true; clearTimeout(t);
  if(window.L){leafInit(); return;} const s=document.createElement("script"); s.src=LEAFJS; s.crossOrigin="anonymous"; s.onload=leafInit; s.onerror=()=>{LEAF.trying=false;}; document.head.appendChild(s);};
 img.onerror=()=>{clearTimeout(t); fail();};
 img.src="https://tile.openstreetmap.org/6/31/22.png";}
leafTry(); MOBQ.addEventListener&&MOBQ.addEventListener("change",()=>{if(LEAF.on){LEAF.map.invalidateSize(); leafRefresh();}});
