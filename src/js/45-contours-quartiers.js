/* ---------- couleurs de l'app et contours des quartiers (carte de src/v2) ---------- */
const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim()||"#888";
const colv=c=>c&&c.startsWith("var(")?cssv(c.slice(4,-1)):c;

/* contours des quartiers en latitude / longitude (décodés une fois) */
const IRLL={};
function irisLL(ck){if(IRLL[ck]) return IRLL[ck]; const out={};
 IRIS[ck].txt.split("\n").forEach((line,i)=>{const rings=line.split("|")[3]; out[i]=rings.split(";").map(r=>{let X=0,Y=0; return r.split(" ").map(p=>{const q=p.split(","); X+=+q[0]; Y+=+q[1]; return [Y/1e4,X/1e4];});});});
 return IRLL[ck]=out;}

