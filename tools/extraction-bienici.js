// Lit les cartes d'annonces d'une page de résultats Bien'ici déjà ouverte (à lancer dans la page), quel que soit le type (studio, T2, T3).
// Renvoie {loc, n, cartes, page, suivante, rows} : suivante = le site propose une page après celle-ci (à ouvrir, jusqu'à 5 pages) : rows = [surface, secteur, loyer, meublé, lien, photo] (location)
// ou [surface, secteur, prix, lien, photo] (vente). Les programmes neufs sont ignorés.
(()=>{const loc=location.pathname.includes('/location/');const rows=[];const seen=new Set();
for(const a of document.querySelectorAll('article')){const t=a.innerText.replace(/\s+/g,' ');
 const l=[...a.querySelectorAll('a[href]')].map(x=>x.getAttribute('href')).find(h=>h.includes('/annonce/')); if(!l||l.includes('/programme/')) continue;
 const link=l.split('?')[0]; if(seen.has(link)) continue; seen.add(link);
 const s=parseFloat(((t.match(/(\d+(?:[,.]\d+)?)\s*m²/)||[])[1]||'').replace(',','.'));
 const m=t.match(/\b\d{5}\s+[^()€]+?\s*\(([^)]+)\)/); /* « 72000 Le Mans (Gare) » : le secteur entre parenthèses, pour toutes les villes */ const sec=m?m[1].trim():'';
 const prices=[...t.matchAll(/(\d[\d\s  ]*)\s*€(\s*\/\s*m²)?/g)].filter(x=>!x[2]).map(x=>+x[1].replace(/\D/g,'')); const pr=prices[0];
 const meu=/meublé/i.test(t)?1:0; const id=link.split('/').pop();
 const img=[...a.querySelectorAll('img')].map(i=>i.getAttribute('src')||'').find(u=>u.includes('file.bienici.com/photo/')&&u.includes('width=300'));
 let ph=''; if(img){ph=img.split('file.bienici.com/photo/')[1].split('?')[0]; ph=ph.startsWith(id+'_')?ph.slice(id.length+1):'!'+ph;}
 const suf=link.replace(/^\/annonce\/(location|vente)\//,'');
 if(!s||!pr) continue; rows.push(loc?[s,sec,pr,meu,suf,ph]:[s,sec,pr,suf,ph]);}
const page=+(new URLSearchParams(location.search).get('page')||1), suivante=!!document.querySelector(`a[href*="page=${page+1}"]`);
return JSON.stringify({loc,n:rows.length,cartes:document.querySelectorAll('article').length,page,suivante,rows});})()
