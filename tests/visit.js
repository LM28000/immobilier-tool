const {chromium,devices}=require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();
for(const [n,o] of [['d',{viewport:{width:1300,height:900}}],['m',{...devices['iPhone 13']}]]){
const p=await (await b.newContext(o)).newPage(); const e=[]; p.on('pageerror',x=>e.push(x.message));
await p.goto('file://'+path.resolve(__dirname,'../dist/test.html')); await p.waitForTimeout(800);
await p.evaluate(async()=>{await DB.collection('biens').add(Object.assign(venteBien('lemans',ADS.lemans.ventes[1]),{statut:'à voir',fav:false,ts:Date.now()}));}); await p.waitForTimeout(300);
await p.click('#shortList [data-visit]'); await p.waitForTimeout(300);
await p.selectOption('[data-vf="dpe"]','F'); await p.fill('[data-vf="copro"]','90'); await p.press('[data-vf="copro"]','Tab');
await p.fill('[data-vf="travaux"]','6000'); await p.press('[data-vf="travaux"]','Tab'); await p.waitForTimeout(300);
await p.click('[data-vk="cuisine"][data-vn="4"]'); await p.waitForTimeout(200); await p.click('[data-vk="bruit"][data-vn="2"]'); await p.waitForTimeout(200);
await p.fill('[data-vc]','Bien placé mais bruyant'); await p.press('[data-vc]','Tab'); await p.waitForTimeout(300);
const R=await p.evaluate(()=>{const b=BIENS[0]; return {dpe:b.dpe,copro:b.copro,trav:b.travaux,score:visitScore(b),com:Object.values(b.visite.avis)[0].com,warn:!!document.querySelector('.warnline'),ba:document.querySelector('#visitBody .scnt').innerText.split('\n').slice(0,4)};});

await p.click('#visitBody [data-fiche]'); await p.waitForTimeout(300);
R.fiche=await p.evaluate(()=>document.querySelectorAll('#ficheBody ol li').length);

await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
R.closed=await p.evaluate(()=>document.getElementById('fichePanel').hidden&&document.getElementById('visitPanel').hidden);
R.ov=await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);
console.log(n,JSON.stringify(R),e);}
await b.close();})();
