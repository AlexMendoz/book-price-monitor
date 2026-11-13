const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {extractProductPage}=require('../src/products/extract.ts');
const {renderProductsReport}=require('../src/products/report.ts');
const {createProductsPreview}=require('../src/products/preview.ts');
(async()=>{
 const browser=await chromium.launch({headless:true});let server;
 try{
  const page=await browser.newPage();
  await page.route('**/*',route=>route.abort());
  const cases=[['amazon','https://www.amazon.com.mx/dp/B000000001',1299],['mercadolibre','https://articulo.mercadolibre.com.mx/MLM-123456789-example-_JM',1999.5],['department','https://www.liverpool.com.mx/tienda/p/example/123',799]];
  const products=[];
  for(const [index,[fixture,url,price]]of cases.entries()){
   const html=fs.readFileSync(path.join(__dirname,'fixtures/products',fixture+'.html'),'utf8');
   await page.route(url,route=>route.fulfill({contentType:'text/html',body:html}));await page.goto(url);
   const offer={id:index+1,productId:index+1,url,store:fixture==='department'?'structured':fixture,expectedSeller:null,expectedVariant:null};
   const reading=await extractProductPage(page,offer);
   assert.equal(reading.status,'ok');assert.equal(reading.price,price);assert.equal(reading.currency,'MXN');
   products.push({id:index+1,name:reading.title,category:index===2?'Hogar':'Tecnologia',targetPrice:900,currency:'MXN',offers:[{...offer,observations:[{...reading,id:index+1,offerId:index+1,observedAt:'2026-11-04T12:00:00Z',runId:'test'}]}]});
   if(fixture==='amazon'){
    assert.equal((await extractProductPage(page,{...offer,expectedVariant:'White'})).status,'ambiguous');
    await page.locator('#corePrice_feature_div').evaluate(e=>e.insertAdjacentHTML('beforeend','<span class="a-price"><span class="a-offscreen">MXN 500.00</span></span>'));
    assert.equal((await extractProductPage(page,offer)).status,'ambiguous');
   }
  }
  await page.setContent('<title>Robot Check</title><body>Complete the captcha</body>');
  assert.equal((await extractProductPage(page,products[0].offers[0])).status,'blocked');
  await page.close();
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'products-preview-'));const file=path.join(dir,'report.html');fs.writeFileSync(file,renderProductsReport(products));
  server=createProductsPreview(file);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  for(const width of [1280,390]){
   const view=await browser.newPage({viewport:{width,height:850}});const errors=[];view.on('pageerror',e=>errors.push(e.message));
   await view.goto(origin);assert.equal(await view.locator('article:visible').count(),3);assert.equal(await view.locator('svg').count(),3);
   await view.locator('#category').selectOption('Hogar');assert.equal(await view.locator('article:visible').count(),1);
   await view.locator('#search').fill('missing');assert.equal(await view.locator('article:visible').count(),0);
   await view.locator('#search').fill('');await view.locator('#category').selectOption('');
   assert.ok(await view.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   for(const endpoint of ['/data/products.db','/catalog.json','/browser-profile/','/../data/prices.db'])assert.equal((await view.request.get(origin+endpoint)).status(),404);
   assert.deepEqual(errors,[]);await view.screenshot({path:'/tmp/products-preview-'+width+'.png'});await view.close();
  }
  console.log('Products browser OK: fixture extraction, ambiguous/blocked cases, private HTTP routes, desktop/mobile report.');
 }finally{if(server)await new Promise(resolve=>server.close(resolve));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
