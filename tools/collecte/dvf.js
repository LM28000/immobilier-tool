/* Ventes réelles de studios (DVF), même règle pour toutes les villes.
   À exécuter dans la page publique de l'app (elle fournit IR et irisLL pour rattacher chaque vente à son quartier).
   Règle : ventes 2023-2025, un seul logement dans la vente, appartement d'une pièce de 12 à 35 m², entre 500 et 12 000 €/m².
   Sortie : {crit, date, c:{ville:{n, med, miss, q:{code:{n, med, last:[[mois, prix, m²]…]}}}}} */
async function collecteDVF(VILLES){
 const parse=t=>{const rows=[];let row=[],f="",q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){f+='"';i++;}else q=false;}else f+=ch;}else if(ch==='"')q=true;else if(ch===','){row.push(f);f="";}else if(ch==='\n'){row.push(f);rows.push(row);row=[];f="";}else if(ch!=='\r')f+=ch;}if(f||row.length){row.push(f);rows.push(row);}return rows;};
 const inRing=(p,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [yi,xi]=r[i],[yj,xj]=r[j];if(((yi>p[0])!==(yj>p[0]))&&(p[1]<(xj-xi)*(p[0]-yi)/(yj-yi)+xi))c=!c;}return c;};
 const med=a=>{const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length?Math.round(b.length%2?b[m]:(b[m-1]+b[m])/2):null;};
 const out={crit:"appartements d'une pièce de 12 à 35 m², vendus seuls, 2023-2025, 500 à 12 000 €/m²",date:new Date().toISOString().slice(0,10),c:{}};
 for(const [ck,ins] of Object.entries(VILLES)){
  const R=parse(await (await fetch("https://dvf-api.data.gouv.fr/dvf/csv/?com="+ins)).text()), h=R[0], I=k=>h.indexOf(k), g={};
  R.slice(1).forEach(r=>{if(r.length<h.length) return; const y=r[I("date_mutation")].slice(0,4); if(y<"2023"||y>"2025"||r[I("nature_mutation")]!=="Vente") return; (g[r[I("id_mutation")]]=g[r[I("id_mutation")]]||[]).push(r);});
  const S=[];
  Object.values(g).forEach(rs=>{const L=rs.filter(r=>r[I("type_local")]==="Appartement"||r[I("type_local")]==="Maison"); const ids=new Set(L.map(r=>r[I("id_parcelle")]+"|"+r[I("lot1_numero")]+"|"+r[I("surface_reelle_bati")])); if(ids.size!==1||L[0][I("type_local")]!=="Appartement") return;
   const s=+L[0][I("surface_reelle_bati")], v=+rs[0][I("valeur_fonciere")], np=+L[0][I("nombre_pieces_principales")]; if(s<12||s>35||np!==1||!v) return; const p=v/s; if(p<500||p>12000) return;
   S.push({p,v,s,d:rs[0][I("date_mutation")],lat:+L[0][I("latitude")],lon:+L[0][I("longitude")]});});
  const o={n:S.length,med:med(S.map(x=>x.p)),miss:0,q:{}};
  if(typeof IR!=="undefined"&&IR[ck]){const ll=irisLL(ck), by={};
   S.forEach(x=>{if(!x.lat){o.miss++; return;} const t=IR[ck].list.find(t=>ll[t.i].some(r=>inRing([x.lat,x.lon],r))); if(!t){o.miss++; return;} (by[t.code]=by[t.code]||[]).push(x);});
   for(const [code,L] of Object.entries(by)){L.sort((a,b)=>b.d.localeCompare(a.d)); o.q[code]={n:L.length,med:med(L.map(x=>x.p)),last:L.slice(0,4).map(x=>[x.d.slice(0,7),Math.round(x.v),Math.round(x.s)])};}}
  out.c[ck]=o;}
 return out;}
