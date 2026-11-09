/* ---------- nos biens (liste partagée) ---------- */
let BIENS=[], DB=null, USER=null, BIENSJ="";
/* chaque bien lu passe par ici : types vérifiés, listes blanches, longueurs bornées. Une ligne abîmée reste visible (« bien illisible ») pour pouvoir la supprimer. */
function normBien(id,raw){/* avis à deux (v2) : {prénom: "o" garder | "m" à voir | "n" passer} */ const votesOf=v=>{if(!v||typeof v!=="object"||Array.isArray(v)) return undefined; const o={}; Object.entries(v).slice(0,6).forEach(([k,x])=>{k=String(k).slice(0,30); if(k&&["o","m","n"].includes(x)) o[k]=x;}); return Object.keys(o).length?o:undefined;};
 const r=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{}, num=v=>{v=+v; return isFinite(v)?v:0;}, str=(v,n)=>typeof v==="string"?v.slice(0,n):"", obj=v=>v&&typeof v==="object"&&!Array.isArray(v)?v:undefined;
 const sid=String(id==null?"":id).replace(/[^A-Za-z0-9_-]/g,"").slice(0,64), okV=C.some(c=>c.k===r.ville), url=str(r.url,500);
 const b={id:sid,titre:str(r.titre,120),url:/^https?:\/\//i.test(url)?url:"",ville:okV?r.ville:C[0].k,quartier:str(r.quartier,80),secteur:str(r.secteur,80),
  prix:num(r.prix),surface:num(r.surface),copro:num(r.copro),tf:num(r.tf),loyer:num(r.loyer),travaux:num(r.travaux),meubles:num(r.meubles),dpe:/^[A-G]$/.test(r.dpe||"")?r.dpe:"",
  notes:str(r.notes,200),statut:["à voir","visité","offre faite","compromis","acheté","écarté"].includes(r.statut)?r.statut:"à voir",fav:r.fav===true,par:str(r.par,30),ts:num(r.ts),
  short:typeof r.short==="boolean"?r.short:undefined,votes:votesOf(r.votes),suivi:obj(r.suivi),adresse:str(r.adresse,200),visite:obj(r.visite),geo:obj(r.geo),by:str(r.by,80),maj:obj(r.maj)};
 Object.keys(b).forEach(k=>{if(b[k]===undefined) delete b[k];});
 if(TYPES[r.type]) b.type=r.type; if(+r.pieces>0) b.pieces=num(r.pieces); if(isFinite(+r.lat)&&r.lat!=null) b.lat=+r.lat; if(isFinite(+r.lon)&&r.lon!=null) b.lon=+r.lon;
 if(b.geo&&b.geo.foot&&!Array.isArray(b.geo.foot)) delete b.geo.foot;
 if(!okV||sid!==String(id)||!(b.prix>0)||!(b.surface>0)){b.bad=true; b.titre="⚠ Bien illisible"+(b.titre?" : "+b.titre:""); if(!(b.surface>0)) b.surface=22; if(!(b.prix>0)) b.prix=1;}
 return b;}
/* années de bail restantes : fin écrite dans l'annonce (« AAAA » = milieu d'année), sinon 3 ans (durée d'un bail vide) */
function bailAns(fb){const m=/^(\d{4})(?:-(\d{2}))?$/.exec(fb||""); if(!m) return 3; const end=new Date(+m[1],(m[2]?+m[2]:7)-1,1); return Math.max(0,(end-Date.now())/(365.25*864e5));}
function calcBien(b,scn){const c=C.find(v=>v.k===b.ville), S=+b.surface||22; let rr=1, vac=vacVille(b.ville), t=null;
 if(b.quartier&&IR[b.ville]){t=IR[b.ville].list.find(v=>v.name===b.quartier); if(t&&t.price) rr=rentRatio(b.ville,t); if(t&&H.vacQ){const d=demandOf(t); if(d) vac=d.vac;}}
 if(H.vacQ&&b.geo&&b.geo.foot&&b.geo.foot.length){const tr=t&&typeof trajOf==="function"?trajOf(t):null; const e=b.geo.foot.map((f,i)=>{const o=tr&&tr.find(z=>z.k===b.geo.marks[i]); return o&&o.tc!=null?Math.min(f,o.tc):f;}); const mn=Math.min(...e), sc=Math.min(1,Math.max(0,1-(mn-10)/40)); vac=vacAt(b.ville,sc);}
 const o=Object.assign({},c,{prixTot:+b.prix,surf:S,vac,type:b.type||typeFor(S,b.pieces)});
 /* valeurs propres au bien (12-ce-qui-pese.js) : saisies, sinon lues dans l'annonce, sinon estimées */
 const V=typeof valeursBien==="function"?valeursBien(b,o.type):null;
 if(V){if(V.loyer.v>0){o.rent=V.loyer.v; o.rentM2=S; o.rentFixed=true;
   /* loyer du bail en cours lu dans l'annonce : il vaut jusqu'au départ du locataire, voir calc */
   if(V.loyer.bail){o.bailAns=bailAns(V.raw.fin_bail); o.rentEst=c.rent*rr; o.rentM2Est=c.rentM2;}}
  else o.rent=c.rent*rr;
  o.copro=V.copro.v; if(V.tf.v>0) o.tfM=V.tf.v/12; o.trav=V.travaux.v; o.meubles=V.meubles.v;}
 else {o.rent=+b.loyer>0?+b.loyer:c.rent*rr; if(+b.loyer>0){o.rentM2=S; o.rentFixed=true;} if(+b.copro>0) o.copro=+b.copro; if(+b.tf>0) o.tfM=+b.tf/12; if(+b.travaux>0) o.trav=+b.travaux; if(+b.meubles>0) o.meubles=+b.meubles;}
 if(scn) o._s=scn;
 return {x:calc(o),vac,t,pm2:+b.prix/S,V};}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function fillQuartiers(){const v=document.getElementById("b-ville").value, sel=document.getElementById("b-quartier");
 sel.innerHTML=`<option value="">${IR[v]?"— quartier (facultatif) —":"pas de découpage pour cette ville"}</option>`+(IR[v]?IR[v].list.filter(t=>t.type==="H").map(t=>t.name).sort((a,b)=>a.localeCompare(b,"fr")).map(n=>`<option>${esc(n)}</option>`).join(""):"");
 sel.disabled=!IR[v];}
function localDB(){const K="biens-local"; let mem=[]; const load=()=>{try{return JSON.parse(localStorage.getItem(K)||"[]");}catch(_){return mem;}};
 const subs=[]; const emit=()=>{const l=load().slice().sort((a,b)=>(b.ts||0)-(a.ts||0)); subs.forEach(f=>f({docs:l.map(x=>({id:x.id,data:()=>x}))}));};
 const save=l=>{mem=l; try{localStorage.setItem(K,JSON.stringify(l));}catch(_){} emit();};
 const col={orderBy(){return col;},limit(){return col;},onSnapshot(f){subs.push(f); setTimeout(emit,0); return ()=>{};},
  add:async b=>{const id=b.id||("l"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)); save(load().filter(x=>x.id!==id).concat([Object.assign({},b,{id})])); return {id};},
  doc:id=>({delete:async()=>save(load().filter(x=>x.id!==id)),update:async p=>save(load().map(x=>x.id===id?Object.assign({},x,p):x)),set:async b=>save(load().filter(x=>x.id!==id).concat([Object.assign({},b,{id})]))})};
 return {collection:()=>col,local:true};}

(function initBiens(){
 const vs=document.getElementById("b-ville"); vs.innerHTML=C.map(c=>`<option value="${c.k}">${c.name}</option>`).join(""); vs.value="lemans"; fillQuartiers(); vs.addEventListener("change",fillQuartiers);
 const st=document.getElementById("biensState"), form=document.getElementById("biensForm");
 st.textContent="Connexion à la liste partagée…";
 const timer=setTimeout(()=>{if(!DB){DB=localDB(); hook(DB);}},10000);
 (window.claude?window.claude.use("db"):Promise.resolve(null)).then(async db=>{
  if(!db){db=(SB.url&&sbCode())?sbDB(sbCode()):localDB();}
  DB=db; try{USER=await window.claude.use("user");}catch(_){}
  hook(db);
 }).catch(()=>{clearTimeout(timer); if(!DB){DB=localDB(); hook(DB);}});
 function hook(db){
  db.collection("biens").orderBy("ts","desc").limit(200).onSnapshot(snap=>{clearTimeout(timer); BIENS=(typeof regTake==="function"?regTake(snap.docs):snap.docs).map(d=>{try{return normBien(d.id,d.data());}catch(_){return null;}}).filter(Boolean); st.textContent=db.local?`${BIENS.length} bien${BIENS.length>1?"s":""}, gardé${BIENS.length>1?"s":""} dans ce navigateur (version hors Claude : échangez la liste avec le bloc ci-dessous)`:db.shared?`${BIENS.length} bien${BIENS.length>1?"s":""} dans la liste commune`:`${BIENS.length} bien${BIENS.length>1?"s":""} dans la liste partagée`; const bj=JSON.stringify(BIENS); if(bj===BIENSJ) return; BIENSJ=bj;   /* relecture sans changement : rien à refaire */
   if(typeof VC!=="undefined") VC.clear(); if(VISIT) renderVisit(); document.dispatchEvent(new Event("biens"));},
   e=>{clearTimeout(timer); st.textContent="Lecture de la liste impossible ("+(e&&e.code||"erreur")+").";});
 }
 form.addEventListener("submit",async e=>{e.preventDefault(); if(!DB) return; const f=new FormData(form), g=k=>(f.get(k)||"").toString().trim();
  const b={titre:g("titre").slice(0,120),url:/^https?:\/\//.test(g("url"))?g("url").slice(0,500):"",ville:g("ville"),quartier:g("quartier"),prix:+g("prix"),surface:+g("surface"),copro:+g("copro")||0,tf:+g("tf")||0,loyer:+g("loyer")||0,dpe:g("dpe"),notes:g("notes").slice(0,200),statut:"à voir",fav:false,par:myName(),ts:Date.now()};
  if(form.dataset.adr){try{Object.assign(b,JSON.parse(form.dataset.adr));}catch(_){} delete form.dataset.adr;}
  if(!(b.prix>5000)||!(b.surface>=8)){st.textContent="Indiquez au moins le prix et la surface."; return;}
  try{if(USER&&USER.id){try{b.by=await USER.id();}catch(_){}} await DB.collection("biens").add(b); form.reset(); document.getElementById("b-ville").value=b.ville; fillQuartiers(); st.textContent="Bien ajouté.";}
  catch(err){st.textContent=err&&err.code==="permission_denied"?"Ajout refusé : il faut un accès en modification à la page.":"Ajout impossible ("+(err&&err.code||"erreur")+").";}});
})();

