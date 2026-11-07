/* ---------- annonces, historique et fiches dans Supabase (table « annonces », supabase.sql) ----------
   tools/supabase_annonces.py y envoie chaque soir : ads (annonces du jour), hist (historique), ficx (champs de calcul) et fiches-<ville>.
   La page les lit avec le code de groupe, comme « Nos biens ». Quand publication.json retire les annonces de la page publique,
   c'est la seule source : sans code de groupe, la page publique n'affiche aucune annonce.
   Une copie est gardée dans le cache du navigateur pour l'ouverture hors ligne. */
let ADSCLOUD=null;
async function annoncesCloud(){const code=typeof sbCode==="function"?sbCode():""; if(!code||!SB.url||window.claude) return;
 const url=SB.url.replace(/\/$/,"")+"/rest/v1/annonces?select=cle,data,maj", req=new Request(url+"&g="+encodeURIComponent(code.slice(0,4))); let rows=null;
 try{const r=await fetch(url,{headers:{apikey:SB.key,"x-groupe":code}}); if(r.ok){rows=await r.json(); try{const c=await caches.open("studio-annonces"); await c.put(req,new Response(JSON.stringify(rows),{headers:{"Content-Type":"application/json"}}));}catch(_){}}}catch(_){}
 if(!rows){try{const c=await caches.open("studio-annonces"), h=await c.match(req); if(h) rows=await h.json();}catch(_){}}
 if(!Array.isArray(rows)||!rows.length) return;
 const by={}; rows.forEach(x=>{if(x&&x.cle&&x.data&&typeof x.data==="object") by[x.cle]=x.data;});
 const ads=by.ads; if(!ads||typeof ads!=="object") return;
 /* la copie la plus récente gagne (la page publique peut avoir des annonces plus fraîches que Supabase, ou l'inverse) */
 if(ADSRAW.iso&&ads.iso&&ads.iso<ADSRAW.iso&&!ADSRAW.prive) return;
 Object.keys(ADSRAW).forEach(k=>delete ADSRAW[k]); Object.assign(ADSRAW,ads);
 if(by.hist){Object.keys(HIST).forEach(k=>delete HIST[k]); Object.assign(HIST,by.hist);}
 if(by.ficx){Object.keys(FICX).forEach(k=>delete FICX[k]); Object.assign(FICX,by.ficx);}
 Object.keys(by).filter(k=>k.startsWith("fiches-")).forEach(k=>{FD[k.slice(7)]=by[k];});
 adsPrep(); ADSCLOUD=ads.iso||true;
 [typeof ADSV!=="undefined"&&ADSV].forEach(o=>o&&Object.keys(o).forEach(k=>delete o[k]));
 [typeof VC!=="undefined"&&VC,typeof VIP!=="undefined"&&VIP,typeof RBL!=="undefined"&&RBL].forEach(m=>m&&m.clear&&m.clear());
 if(typeof TGC!=="undefined") Object.keys(TGC).forEach(k=>delete TGC[k]);
 if(typeof QBOXK!=="undefined") QBOXK=null;
 try{render(); if(typeof MOBON!=="undefined"&&MOBON&&typeof mFeedRender==="function") mFeedRender();}catch(_){}
 Object.keys(FD).forEach(ck=>ficheRefresh(ck));}
setTimeout(annoncesCloud,0);
