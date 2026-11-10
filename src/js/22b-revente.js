/* ---------- facilité à revendre ----------
   1. Stock d'annonces, en mois de ventes : annonces de vente du type en ligne (doublons entre agences écartés) ÷ ventes réelles par mois
      (DVF 2023-2025, même type). Mesuré quand il y a 15 annonces au moins et que le plafond de prix du relevé (120 000 €) ne coupe
      qu'une petite part du marché : prix médian des ventes du type, à sa surface type, au plus les deux tiers du plafond (sinon une partie
      des biens n'est pas relevée et le stock paraît court à tort ; en novembre 2026 : studios de Nantes). Plus le stock est court, plus un bien
      se revend vite ; repère relatif entre les villes (Bien'ici ne publie pas toutes les annonces).
   2. Durée de vente : médiane de Kaplan-Meier (kmMed) des annonces apparues après le premier relevé de la ville (la date de publication
      de Bien'ici repart à chaque mise à jour de l'annonce : inutilisable), « partie » = retirée de Bien'ici, ce qui ne veut pas toujours dire vendue ;
      montrée dès que LIQMIN annonces de la ville et du type sont parties (avant : pas de ligne). */
const LIQMIN=20, LIQC=new Map();
const tyOfSuf=s=>/\/1piece\//.test(s)?"studio":/\/2pieces\//.test(s)?"t2":/\/3pieces\//.test(s)?"t3":null;
function liqStock(ck,ty){ty=ty||H.type; const A=typeof ADS!=="undefined"&&ADS[ck], D=typeof DVFALL!=="undefined"&&DVFALL.t&&DVFALL.t[ty]&&DVFALL.t[ty][ck]; if(!A||!D||!D.n||ty!==H.type) return null;
 const n=(A.ventes||[]).filter(a=>{const f=ficx(a[3]); return !(f&&f.dup);}).length, pm=D.n/36;
 return {n,pm,m:n/pm,ok:n>=15&&(!A.plafond||D.med*tyOf(ty).surf<=A.plafond*2/3),plaf:A.plafond||null};}
function liqVille(ck,ty){ty=ty||H.type; const E=typeof HIST!=="undefined"&&HIST[ck]&&HIST[ck].v; if(!E) return null;
 const key=ck+"|"+ty+"|"+todayIso()+"|"+Object.keys(E).length; if(LIQC.has(key)) return LIQC.get(key);
 const s0=hStart(ck,"v"), D=[];
 for(const [suf,e] of Object.entries(E)){if(!e||!e.f||!s0||e.f<=s0||tyOfSuf(suf)!==ty) continue;
  D.push([Math.max(0,Math.round((isoD(e.g||todayIso())-isoD(e.f))/DAY)),e.g?1:0]);}
 const ev=D.filter(d=>d[1]).length, o={n:D.length,ev,s0,km:ev>=LIQMIN&&typeof kmMed==="function"?kmMed(D):null}; LIQC.set(key,o); return o;}
/* lignes « Revente » de la fiche de ville et d'un bien */
function liqRows(ck){const S=liqStock(ck), L=liqVille(ck), R=[];
 if(S&&S.ok){const all=C.map(c=>liqStock(c.k)).filter(z=>z&&z.ok).sort((a,b)=>a.m-b.m), rk=all.findIndex(z=>z===S||z.m===S.m)+1;
  R.push(["Revente : stock d'annonces",`<b>${fr(S.m,1)} mois</b> de ventes`,`${S.n} ${tyPl().toLowerCase()} en vente pour ${fr(S.pm,0)} vendus par mois (DVF 2023-2025) · rang ${rk} sur ${all.length} villes mesurées (1 = le stock le plus court : c'est là qu'un bien se revend le plus vite)`]);}
 /* non mesuré (trop peu d'annonces, ou plafond du relevé sous le marché) : pas de ligne */
 if(L&&L.km!=null) R.push(["Durée de vente mesurée",`<b>${L.km} jours</b> en médiane`,`annonces apparues depuis le ${frD(L.s0)} ; retirée ne veut pas toujours dire vendue`]);   /* rien tant que trop peu d'annonces sont parties */
 return R;}
