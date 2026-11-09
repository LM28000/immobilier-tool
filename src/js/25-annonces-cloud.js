/* ---------- annonces, historique et fiches dans Supabase (table « annonces », supabase.sql) ----------
   tools/supabase_annonces.py y envoie chaque soir : ads (annonces du jour), hist (historique), ficx (champs de calcul) et fiches-<ville>.
   Depuis le 9 novembre 2026, tout le monde les lit, sans code, dans la vue « annonces_publiques » (supabase.sql : cle, data et maj
   seulement, jamais la colonne du code) ; le code de groupe ne sert plus qu'à « Nos biens » et aux réglages communs.
   Si la vue n'existe pas encore, la page lit la table avec le code, comme avant.
   Une copie est gardée dans le cache du navigateur pour l'ouverture hors ligne. */
let ADSCLOUD=null;
/* une lecture de la table « annonces », réessayée une fois, copiée dans le cache du navigateur (ouverture hors ligne).
   Novembre 2026 : tout lire d'un coup (34 Mo avec les fiches complètes) dépassait le temps accordé aux requêtes par Supabase
   (« statement timeout ») et plus aucune annonce n'arrivait ; la page lit d'abord annonces, historique et champs de calcul (6 Mo),
   puis les fiches complètes d'une ville quand on ouvre une de ses annonces (24-fiches-annonces.js, ficheLoad). */
async function sbAnn(q){const code=typeof sbCode==="function"?sbCode():""; if(!SB.url) return null;
 const pub=await sbLit("annonces_publiques",q,null); if(pub) return pub;   /* la vue publique, sans code */
 return code?sbLit("annonces",q,code):null;}
async function sbLit(table,q,code){
 const url=SB.url.replace(/\/$/,"")+"/rest/v1/"+table+"?"+q, req=new Request(url+(code?"&g="+encodeURIComponent(code.slice(0,4)):"&pub=1")), h={apikey:SB.key};
 if(code) h["x-groupe"]=code;
 for(let i=0;i<2;i++){try{const r=await fetch(url,{headers:h}); if(r.status===404) break; if(r.ok){const rows=await r.json(); if(!Array.isArray(rows)||!rows.length) break;
   try{const c=await caches.open("studio-annonces"); await c.put(req,new Response(JSON.stringify(rows),{headers:{"Content-Type":"application/json"}}));}catch(_){} return rows;}}catch(_){}
  if(!i) await new Promise(f=>setTimeout(f,1500));}
 try{const c=await caches.open("studio-annonces"), h=await c.match(req); if(h) return await h.json();}catch(_){}
 return null;}
async function annoncesCloud(){const code=typeof sbCode==="function"?sbCode():""; if(!SB.url||window.claude) return;
 if(code) try{const c=await caches.open("studio-annonces"); await c.delete(new Request(SB.url.replace(/\/$/,"")+"/rest/v1/annonces?select=cle,data,maj&g="+encodeURIComponent(code.slice(0,4))));}catch(_){}   /* l'ancienne copie complète (34 Mo) */
 const rows=await sbAnn("select=cle,data,maj&cle=in.(ads,hist,ficx)");
 if(!Array.isArray(rows)||!rows.length) return;
 const by={}; rows.forEach(x=>{if(x&&x.cle&&x.data&&typeof x.data==="object") by[x.cle]=x.data;});
 const ads=by.ads; if(!ads||typeof ads!=="object") return;
 /* la copie la plus récente gagne (la page publique peut avoir des annonces plus fraîches que Supabase, ou l'inverse) */
 if(ADSRAW.iso&&ads.iso&&ads.iso<ADSRAW.iso&&!ADSRAW.prive) return;
 Object.keys(ADSRAW).forEach(k=>delete ADSRAW[k]); Object.assign(ADSRAW,ads);
 if(by.hist){Object.keys(HIST).forEach(k=>delete HIST[k]); Object.assign(HIST,by.hist);}
 if(by.ficx){Object.keys(FICX).forEach(k=>delete FICX[k]); Object.assign(FICX,by.ficx);}
 Object.keys(by).filter(k=>k.startsWith("fiches-")).forEach(k=>{FD[k.slice(7)]=by[k];});
 if(typeof V2CITY==="function"&&V2CITY()) ficheLoad(V2CITY());   /* les fiches de la ville affichée, en avance */
 adsPrep(); loyerRecal(); ADSCLOUD=ads.iso||true;
 [typeof ADSV!=="undefined"&&ADSV].forEach(o=>o&&Object.keys(o).forEach(k=>delete o[k]));
 [typeof VC!=="undefined"&&VC,typeof VIP!=="undefined"&&VIP,typeof RBL!=="undefined"&&RBL].forEach(m=>m&&m.clear&&m.clear());
 if(typeof TGC!=="undefined") Object.keys(TGC).forEach(k=>delete TGC[k]);
 if(typeof QBOXK!=="undefined") QBOXK=null; if(typeof ANOM!=="undefined") ANOM=null; if(typeof VACM!=="undefined") VACM=null; if(typeof CALCC!=="undefined") CALCC.clear();   /* vacance mesurée sur l'historique arrivé */
 try{render();}catch(_){}
 Object.keys(FD).forEach(ck=>ficheRefresh(ck));}
setTimeout(annoncesCloud,0);
