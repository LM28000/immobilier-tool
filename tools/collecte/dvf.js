/* Ventes réelles (DVF), même règle pour toutes les villes et tous les types de bien.
   À exécuter dans la page publique de l'app (elle fournit IR et irisLL pour rattacher chaque vente à son quartier).
   Règle : ventes 2023-2025, un seul logement dans la vente, appartement de p pièces (le type), surface entre des bornes larges qui écartent les erreurs de saisie, entre 500 et 12 000 €/m².
   TYPES = {type:[pièces, m² min, m² max]}, par défaut ceux de l'app.
   Ajustement à la surface : dans un même type, le prix au m² baisse quand la surface monte. Chaque vente est ramenée à la surface type
   du bien (SREF : 22, 42, 62 m²) avec la pente log(prix/m²) ~ log(surface) mesurée sur toutes les villes (chaque ville centrée sur sa moyenne).
   med et q.med sont donc des prix au m² « à surface type » ; medBrut garde la médiane brute.
   Sortie : {crit, date, types, sref, pente, t:{type:{ville:{n, med, medBrut, miss, q:{code:{n, med, last:[[mois, prix, m²]…]}}}}}} */
async function collecteDVF(VILLES,TYPES,SREF){TYPES=TYPES||{studio:[1,9,45],t2:[2,25,75],t3:[3,40,110]}; SREF=SREF||{studio:22,t2:42,t3:62};
 const parse=t=>{const rows=[];let row=[],f="",q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=ch;}else if(ch==='"')q=true;else if(ch===','){row.push(f);f="";}else if(ch==='\n'){row.push(f);rows.push(row);row=[];f="";}else if(ch!=='\r')f+=ch;}if(f||row.length){row.push(f);rows.push(row);}return rows;};
 const inRing=(p,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [yi,xi]=r[i],[yj,xj]=r[j];if(((yi>p[0])!==(yj>p[0]))&&(p[1]<(xj-xi)*(p[0]-yi)/(yj-yi)+xi))c=!c;}return c;};
 const med=a=>{const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length?Math.round(b.length%2?b[m]:(b[m-1]+b[m])/2):null;};
 const out={crit:"appartements vendus seuls, 2023-2025, 500 à 12 000 €/m², type = nombre de pièces, bornes de surface larges contre les erreurs de saisie, prix ramenés à la surface type",date:new Date().toISOString().slice(0,10),types:TYPES,sref:SREF,pente:{},t:{}}; for(const ty in TYPES) out.t[ty]={};
 const ALL={}, WH={};
 for(const [ck,ins] of Object.entries(VILLES)){
  const R=parse(await (await fetch("https://dvf-api.data.gouv.fr/dvf/csv/?com="+ins)).text()), h=R[0], I=k=>h.indexOf(k), g={};
  R.slice(1).forEach(r=>{if(r.length<h.length) return; const y=r[I("date_mutation")].slice(0,4); if(y<"2023"||y>"2025"||r[I("nature_mutation")]!=="Vente") return; (g[r[I("id_mutation")]]=g[r[I("id_mutation")]]||[]).push(r);});
  const S={}; for(const ty in TYPES) S[ty]=[];
  Object.values(g).forEach(rs=>{const L=rs.filter(r=>r[I("type_local")]==="Appartement"||r[I("type_local")]==="Maison"); const ids=new Set(L.map(r=>r[I("id_parcelle")]+"|"+r[I("lot1_numero")]+"|"+r[I("surface_reelle_bati")])); if(ids.size!==1||L[0][I("type_local")]!=="Appartement") return;
   const s=+L[0][I("surface_reelle_bati")], v=+rs[0][I("valeur_fonciere")], np=+L[0][I("nombre_pieces_principales")]; if(!v||!s) return; const p=v/s; if(p<500||p>12000) return;
   for(const [ty,[pc,a,b]] of Object.entries(TYPES)) if(np===pc&&s>=a&&s<=b) S[ty].push({p,v,s,d:rs[0][I("date_mutation")],lat:+L[0][I("latitude")],lon:+L[0][I("longitude")]});});
  const ll=typeof IR!=="undefined"&&IR[ck]?irisLL(ck):null; WH[ck]=x=>ll&&x.lat?IR[ck].list.find(t=>ll[t.i].some(r=>inRing([x.lat,x.lon],r))):null; ALL[ck]=S;}
 /* pente prix au m² / surface dans chaque type, toutes villes, chaque ville centrée */
 for(const ty in TYPES){let sxy=0,sxx=0,n=0; for(const ck in ALL){const L=ALL[ck][ty].map(x=>[Math.log(x.s),Math.log(x.p)]); if(L.length<8) continue; const mx=L.reduce((a,b)=>a+b[0],0)/L.length, my=L.reduce((a,b)=>a+b[1],0)/L.length; L.forEach(([x,y])=>{sxy+=(x-mx)*(y-my); sxx+=(x-mx)**2;}); n+=L.length;}
  out.pente[ty]=n>=50&&sxx>0?Math.round(Math.min(0.2,Math.max(-0.8,sxy/sxx))*1000)/1000:0;}
 for(const ck in ALL){const S=ALL[ck], ll=!!(typeof IR!=="undefined"&&IR[ck]), where=WH[ck];
  for(const ty in TYPES){const b=out.pente[ty], adj=x=>x.p*Math.pow(SREF[ty]/x.s,b);const o={n:S[ty].length,med:med(S[ty].map(adj)),medBrut:med(S[ty].map(x=>x.p)),miss:0,q:{}};
   if(ll){const by={}; S[ty].forEach(x=>{const t=where(x); if(!t){o.miss++; return;} (by[t.code]=by[t.code]||[]).push(x);});
    for(const [code,L] of Object.entries(by)){L.sort((a,b)=>b.d.localeCompare(a.d)); o.q[code]={n:L.length,med:med(L.map(adj)),last:L.slice(0,4).map(x=>[x.d.slice(0,7),Math.round(x.v),Math.round(x.s)])};}}
   out.t[ty][ck]=o;}}
 return out;}
