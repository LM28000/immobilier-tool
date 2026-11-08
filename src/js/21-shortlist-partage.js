/* ---------- liste commune (Supabase) ---------- */
const SB={url:"https://rgemkhdnvxxhcmvevxmj.supabase.co",key:"sb_publishable_NMyyc7oEJkn9jajEtmfHMg_0bHLOgYS"};
function sbCode(){try{return localStorage.getItem("biens-code")||"";}catch(_){return "";}}
/* fusion à trois : base = ce qu'on avait lu, mine = notre version, theirs = la ligne relue à l'instant. Une clé que l'on n'a pas changée garde la valeur de l'autre personne. */
const jeq=(a,b)=>JSON.stringify(a)===JSON.stringify(b), isO=v=>v&&typeof v==="object"&&!Array.isArray(v);
function merge3(base,mine,theirs){if(!isO(mine)||!isO(theirs)) return jeq(mine,base)?theirs:mine; const out={}, B=isO(base)?base:{};
 new Set([...Object.keys(mine),...Object.keys(theirs)]).forEach(k=>{const b=B[k], m=mine[k], t=theirs[k];
  if(jeq(m,b)){if(t!==undefined) out[k]=t;} else if(isO(m)&&isO(t)) out[k]=merge3(b,m,t); else if(m!==undefined) out[k]=m;}); return out;}
function sbDB(code){const HD={apikey:SB.key,"x-groupe":code,"Content-Type":"application/json"};
 const base=SB.url.replace(/\/$/,"")+"/rest/v1/biens", base0=base, subs=[]; let last=[];
 const chk=async r=>{if(!r.ok){let m=""; try{m=(await r.json()).message||"";}catch(_){} throw {code:"http_"+r.status,message:m};} return r;};
 async function load(){const r=await chk(await fetch(base+"?select=id,data,created_at&order=created_at.desc&limit=500",{headers:HD})); last=await r.json(); try{localStorage.setItem("biens-cache-"+code,JSON.stringify(last));}catch(_){}
  subs.forEach(s=>s.next({docs:last.map(x=>({id:x.id,data:()=>x.data}))}));}
 const tick=()=>load().catch(e=>{let c=null; try{c=JSON.parse(localStorage.getItem("biens-cache-"+code)||"null");}catch(_){} if(c&&!last.length){last=c; subs.forEach(s=>s.next({docs:last.map(x=>({id:x.id,data:()=>x.data}))})); toast("Hors ligne : liste commune affichée telle qu'au dernier chargement.");} else subs.forEach(s=>s.err&&s.err(e));});
 setInterval(()=>{if(!document.hidden) tick();},20000); document.addEventListener("visibilitychange",()=>{if(!document.hidden) tick();});
 const col={orderBy(){return col;},limit(){return col;},onSnapshot(next,err){subs.push({next,err}); tick(); return ()=>{};},
  add:async b=>{await chk(await fetch(base,{method:"POST",headers:Object.assign({},HD,{Prefer:"return=minimal"}),body:JSON.stringify({groupe:code,data:b})})); tick(); return {};},
  doc:id=>({delete:async()=>{await chk(await fetch(base+"?id=eq."+encodeURIComponent(id),{method:"DELETE",headers:HD})); tick();},
   update:async p=>{const cur=last.find(x=>x.id===id), b0=cur?cur.data:{}, mine=Object.assign({},b0,p); let theirs=b0;
    try{const r=await chk(await fetch(base0+"?select=data&id=eq."+encodeURIComponent(id),{headers:HD})); const j=await r.json(); if(j[0]&&j[0].data) theirs=j[0].data;}catch(_){}
    const data=merge3(b0,mine,theirs); data.maj={par:myName()||"",le:new Date().toISOString()};   /* qui a modifié en dernier (« ce qui a bougé ») */
    await chk(await fetch(base+"?id=eq."+encodeURIComponent(id),{method:"PATCH",headers:Object.assign({},HD,{Prefer:"return=minimal"}),body:JSON.stringify({data,updated_at:new Date().toISOString()})})); tick();}})};
 return {collection:()=>col,shared:true};}

