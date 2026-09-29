const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'report-browser-'));
process.env.DATABASE_URL=path.join(dir,'test.db');process.env.HISTORY_AUTO_RESTORE='false';
const {buildHtml}=require('../src/scripts/generateAllBooksChart.ts');
const book=(id,title,price,minimum,active)=>({bookId:id,title,author:null,productUrl:null,imageUrl:null,reportImageSrc:null,currency:'MXN',labels:['29 sept 2026'],listPrices:[400],discountedPrices:[price],discountPercents:[25],currentListPrice:400,currentDiscountedPrice:price,currentDiscountPercent:25,historicalMinDiscountedPrice:minimum,historicalMaxDiscountedPrice:400,isActive:active,lastScrapedAt:'29 sept 2026'});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const selfContainedCharts of [true,false])for(const width of [1280,390]){
   const file=path.join(dir,`report-${selfContainedCharts}-${width}.html`);
   fs.writeFileSync(file,buildHtml([book(1,'Árbol caro',300,300,true),book(2,'Arbol barato',200,100,true),book(3,'Fuera',50,50,false)],{selfContainedCharts}));
   const page=await browser.newPage({viewport:{width,height:850}});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://cdn.jsdelivr.net/**',route=>route.abort());
   await page.goto(pathToFileURL(file).href);
   await page.waitForFunction(()=>document.querySelector('canvas').width>0);
   assert.equal(await page.locator('select').count(),2);
   assert.equal(await page.locator('.book-card:visible').count(),3);
   await page.locator('#searchInput').fill('arbol');
   await page.locator('#priceFilterSelect').selectOption('current_min');
   assert.equal(await page.locator('.book-card:visible .book-title').textContent(),'Arbol barato');
   await page.locator('#priceFilterSelect').selectOption('historical_low');
   assert.equal(await page.locator('.book-card:visible .book-title').textContent(),'Árbol caro');
   await page.locator('#searchInput').fill('');
   await page.locator('#sortSelect').selectOption('wishlist_inactive');
   await page.locator('#priceFilterSelect').selectOption('current_min');
   assert.equal(await page.locator('.book-card:visible .book-title').textContent(),'Fuera');
   await page.locator('#sortSelect').selectOption('title');
   await page.locator('#priceFilterSelect').selectOption('all');
   await page.waitForFunction(()=>[...document.querySelectorAll('canvas')].every(c=>c.width>0));
   const visiblePoints=await page.locator('canvas').evaluateAll(canvases=>canvases.every(c=>{
    const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]===15&&pixels[i+1]===118&&pixels[i+2]===110&&pixels[i+3]>0)return true;
    return false;
   }));
   assert.ok(visiblePoints,'Single observation must be visible after filtering');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'No horizontal overflow');
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('Browser OK: desktop/mobile, filters, single points and offline fallback.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
