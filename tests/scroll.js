// La page ne doit pas défiler toute seule après le chargement.
const {chromium,devices}=require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();
for(const [n,o] of [['ordi',{viewport:{width:1300,height:900}}],['tel',{...devices['iPhone 13']}]]) for(const h of ['','#lemans','#lemans-0202']){
 const p=await (await b.newContext(o)).newPage(); const log=[];
 await p.exposeFunction('lg',s=>log.push(s));
 await p.addInitScript(()=>{const o=Element.prototype.scrollIntoView; Element.prototype.scrollIntoView=function(...a){window.lg&&lg('scrollIntoView '+(this.id||this.className)+' '+new Error().stack.split('\n')[2]); return o.apply(this,a);}; const s=window.scrollBy; window.scrollBy=function(...a){window.lg&&lg('scrollBy '+new Error().stack.split('\n')[2]); return s.apply(this,a);};});
 await p.goto('file://'+path.resolve(__dirname,'../dist/test.html')+h); await p.waitForTimeout(1500);
 await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(6000);
 console.log(n,h||'(aucun)',await p.evaluate(()=>scrollY),log.slice(0,4));}
await b.close();})();
