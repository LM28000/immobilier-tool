// Temps de trajet en transports en commun depuis chaque quartier, à partir des horaires GTFS d'un réseau.
// Algorithme « connection scan » : un jour de semaine, départs à 7 h 45, 8 h 00 et 8 h 15, moyenne des trois.
// Utilisable dans le navigateur (fichiers lus avec JSZip) ou dans Node (node tools/gtfs_temps.js dossier_gtfs origines.json cibles.json).
function gtfsCSV(txt){const rows=[]; let i=0,f="",row=[],q=false; txt=txt.replace(/^﻿/,"");
 for(;i<txt.length;i++){const c=txt[i]; if(q){if(c==='"'){if(txt[i+1]==='"'){f+='"';i++;} else q=false;} else f+=c;}
  else if(c==='"') q=true; else if(c===','){row.push(f);f="";} else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n') i++; row.push(f); f=""; if(row.length>1||row[0]!=="") rows.push(row); row=[];} else f+=c;}
 if(f!==""||row.length){row.push(f); rows.push(row);} const h=rows.shift().map(s=>s.trim()); return rows.map(r=>{const o={}; h.forEach((k,j)=>o[k]=(r[j]||"").trim()); return o;});}
function gtfsTransit(files,origins,targets,opts){opts=opts||{};
 const R=6371000, dist=(a,b,c,d)=>{const x=(d-b)*Math.PI/180*Math.cos((a+c)/2*Math.PI/180), y=(c-a)*Math.PI/180; return R*Math.hypot(x,y);};
 const WALK=opts.walk||1.1;            // m/s en ligne droite (≈ 4,9 km/h avec les détours)
 const tsec=s=>{const p=s.split(":"); return +p[0]*3600+ +p[1]*60+ +(p[2]||0);};
 const stops=gtfsCSV(files["stops.txt"]).filter(s=>s.stop_lat&&(s.location_type===""||s.location_type==="0"||s.location_type===undefined));
 const sid=new Map(); stops.forEach((s,i)=>{s.lat=+s.stop_lat; s.lon=+s.stop_lon; sid.set(s.stop_id,i);});
 // jour de service : le mardi choisi (opts.date, AAAAMMJJ) ou le prochain mardi couvert par le calendrier
 const cal=files["calendar.txt"]?gtfsCSV(files["calendar.txt"]):[], cd=files["calendar_dates.txt"]?gtfsCSV(files["calendar_dates.txt"]):[];
 // jour de service : un mardi ; celui qui a le plus de trajets (période scolaire), en préférant les mardis à venir
 const tripsAll=gtfsCSV(files["trips.txt"]), perSvc=new Map(); tripsAll.forEach(t=>perSvc.set(t.service_id,(perSvc.get(t.service_id)||0)+1));
 const ymd=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0");
 const actOn=s=>{const dw=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8)).getDay()];
  const a=new Set(cal.filter(c=>c[dw]==="1"&&c.start_date<=s&&c.end_date>=s).map(c=>c.service_id)); cd.filter(c=>c.date===s).forEach(c=>{if(c.exception_type==="1") a.add(c.service_id); else a.delete(c.service_id);}); return a;};
 let date=opts.date; if(!date){const all=cal.flatMap(c=>[c.start_date,c.end_date]).concat(cd.map(c=>c.date)).filter(Boolean).sort(); const today=opts.today||ymd(new Date());
  let d=new Date(+all[0].slice(0,4),+all[0].slice(4,6)-1,+all[0].slice(6,8)), end=all[all.length-1], best=null, bestN=-1, bestF=null, bestFN=-1;
  for(let k=0;k<400&&ymd(d)<=end;k++,d.setDate(d.getDate()+1)){if(d.getDay()!==2) continue; const s=ymd(d); let n=0; actOn(s).forEach(v=>n+=perSvc.get(v)||0); if(n>bestN){bestN=n; best=s;} if(s>=today&&n>bestFN*1.02){bestFN=n; bestF=s;}}
  date=(bestF&&bestFN>=bestN*0.8)?bestF:best;}
 const dow=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8)).getDay()];
 const active=actOn(date);
 const tripOk=new Map(); tripsAll.forEach(t=>{if(active.has(t.service_id)) tripOk.set(t.trip_id,tripOk.size);});
 const T0=7*3600+30*60, T1=10*3600;
 // connexions entre arrêts successifs d'un même trajet
 const st=gtfsCSV(files["stop_times.txt"]).filter(r=>tripOk.has(r.trip_id)); const byTrip=new Map();
 st.forEach(r=>{let a=byTrip.get(r.trip_id); if(!a) byTrip.set(r.trip_id,a=[]); a.push(r);});
 const con=[]; byTrip.forEach((a,trip)=>{a.sort((x,y)=>+x.stop_sequence- +y.stop_sequence); let lastT=null;
  for(let k=0;k+1<a.length;k++){const d0=a[k].departure_time||a[k].arrival_time, a1=a[k+1].arrival_time||a[k+1].departure_time; if(!d0||!a1) continue; const dt=tsec(d0), at=tsec(a1);
   if(at<T0||dt>T1) continue; const s0=sid.get(a[k].stop_id), s1=sid.get(a[k+1].stop_id); if(s0==null||s1==null) continue; con.push([dt,at,s0,s1,tripOk.get(trip)]);}});
 con.sort((x,y)=>x[0]-y[0]);
 // correspondances à pied entre arrêts proches (≤ 350 m)
 const N=stops.length, foot=Array.from({length:N},()=>[]); const cell=new Map(), key=(la,lo)=>Math.floor(la*250)+":"+Math.floor(lo*170);
 stops.forEach((s,i)=>{const k=key(s.lat,s.lon); (cell.get(k)||cell.set(k,[]).get(k)).push(i);});
 stops.forEach((s,i)=>{const a=Math.floor(s.lat*250), b=Math.floor(s.lon*170); for(let x=-1;x<=1;x++) for(let y=-1;y<=1;y++){(cell.get((a+x)+":"+(b+y))||[]).forEach(j=>{if(j===i) return; const d=dist(s.lat,s.lon,stops[j].lat,stops[j].lon); if(d<=350) foot[i].push([j,d/WALK+60]);});}});
 const near=(la,lo,m)=>{const out=[]; stops.forEach((s,i)=>{const d=dist(la,lo,s.lat,s.lon); if(d<=m) out.push([i,d/WALK]);}); return out;};
 const tg=targets.map(t=>({t,near:near(t.lat,t.lon,900)}));
 const res=origins.map(o=>{const on=near(o.lat,o.lon,900); const best=tg.map(()=>[]);
  for(const dep of [7*3600+45*60,8*3600,8*3600+15*60]){const ea=new Float64Array(N).fill(Infinity), seen=new Uint8Array(tripOk.size);
   on.forEach(([i,w])=>{ea[i]=Math.min(ea[i],dep+w);}); on.forEach(([i])=>foot[i].forEach(([j,w])=>{if(ea[i]+w<ea[j]) ea[j]=ea[i]+w;}));
   for(const c of con){if(c[0]<dep) continue; if(!seen[c[4]]&&ea[c[2]]>c[0]) continue; seen[c[4]]=1; if(c[1]<ea[c[3]]){ea[c[3]]=c[1]; for(const [j,w] of foot[c[3]]) if(c[1]+w<ea[j]) ea[j]=c[1]+w;}}
   tg.forEach((g,k)=>{let a=dep+dist(o.lat,o.lon,g.t.lat,g.t.lon)/WALK; g.near.forEach(([i,w])=>{if(ea[i]+w<a) a=ea[i]+w;}); best[k].push((a-dep)/60);});}
  const nearest=on.length?Math.round(Math.min(...on.map(x=>x[1]))*WALK):null;
  return {id:o.id,min:best.map(v=>Math.round(v.reduce((s,x)=>s+x,0)/v.length)),stop:nearest};});
 return {date,stops:N,connections:con.length,res};}
if(typeof module!=="undefined"){module.exports={gtfsCSV,gtfsTransit};
 if(require.main===module){const fs=require("fs"), path=require("path"), [dir,of,tf,date]=process.argv.slice(2); const files={};
  for(const f of ["stops.txt","trips.txt","stop_times.txt","calendar.txt","calendar_dates.txt"]){const p=path.join(dir,f); if(fs.existsSync(p)) files[f]=fs.readFileSync(p,"utf8");}
  console.log(JSON.stringify(gtfsTransit(files,JSON.parse(fs.readFileSync(of,"utf8")),JSON.parse(fs.readFileSync(tf,"utf8")),{date})));}}
