const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {openProductStore}=require('../src/products/store.ts');
const {readStructuredProduct,parseProductPrice,validateReading,failedReading}=require('../src/products/extract.ts');
const {collectProductReadings}=require('../src/products/runner.ts');
const {renderProductsReport,writeProductsReport}=require('../src/products/report.ts');
const {validateOfferUrl,productReference}=require('../src/products/urls.ts');
const amazon='https://www.amazon.com.mx/dp/B000000001';
const ml='https://articulo.mercadolibre.com.mx/MLM-123456789-test-_JM';
const document={ '@type':'Product',name:'Headphones',color:'Black',sku:'v1',offers:{'@type':'Offer',price:'1299.00',priceCurrency:'MXN',availability:'https://schema.org/InStock',seller:{name:'Store'}} };
const read=()=>readStructuredProduct([document],amazon);
test('product store and reports are private and isolated from book files',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'products-'));
 fs.mkdirSync(path.join(root,'data'));fs.mkdirSync(path.join(root,'reports'));
 fs.writeFileSync(path.join(root,'data/prices.db'),'books sentinel');fs.writeFileSync(path.join(root,'reports/index.html'),'book menu');
 const store=openProductStore(root);
 try{
  const added=store.add({url:amazon,name:'Headphones',category:'Audio',targetPrice:1500});
  store.add({url:ml,productId:added.productId});
  assert.equal(store.catalog().length,1);assert.equal(store.offers().length,2);
  assert.throws(()=>store.add({url:amazon,name:'Duplicate'}),/registrada/);
  assert.throws(()=>store.add({url:'https://www.amazon.com.mx/dp/B000000002',name:'Bad',targetPrice:NaN}),/objetivo/);
  assert.equal(store.catalog().length,1);
  store.record(added.offerId,'first',read(),'2026-11-01T12:00:00Z');
  store.record(added.offerId,'first',read(),'2026-11-01T12:00:00Z');
  store.record(added.offerId,'second',failedReading('blocked','Verification required'),'2026-11-02T12:00:00Z');
  assert.equal(store.catalog()[0].offers[0].observations.length,2);
  const report=writeProductsReport(store);
  assert.equal(report,path.join(root,'private-products/report.html'));
  const html=fs.readFileSync(report,'utf8');assert.match(html,/No es una lectura actual/);assert.match(html,/Acceso bloqueado/);
  assert.doesNotMatch(html,/<span class="badge">En precio objetivo/);
  assert.equal(fs.readFileSync(path.join(root,'data/prices.db'),'utf8'),'books sentinel');
  assert.equal(fs.readFileSync(path.join(root,'reports/index.html'),'utf8'),'book menu');
  assert.throws(()=>store.record(added.offerId,'bad',{...read(),price:0}),/precio/);
 }finally{store.close();}
 const again=openProductStore(root);assert.equal(again.catalog()[0].offers[0].observations.length,2);again.close();
});
test('structured extraction rejects aggregate offers, unrelated products and variant or seller mismatch',()=>{
 assert.equal(read().price,1299);
 assert.equal(readStructuredProduct([document],amazon+'?skuid=other').status,'ambiguous');
 assert.equal(readStructuredProduct([document],amazon+'?skuid=v1').status,'ok');
 assert.equal(readStructuredProduct([{...document,offers:{...document.offers,availability:'https://schema.org/OutOfStock'}}],amazon).status,'unavailable');
 assert.equal(readStructuredProduct([{...document,offers:{'@type':'AggregateOffer',lowPrice:100,highPrice:200}}],amazon).status,'ambiguous');
 assert.equal(readStructuredProduct([document,{...document,name:'Other'}],amazon).status,'ambiguous');
 assert.equal(readStructuredProduct([{...document,url:'https://www.amazon.com.mx/dp/B000000099'}],amazon).status,'ambiguous');
 assert.equal(validateReading(read(),{expectedSeller:'Other',expectedVariant:null}).price,null);
 assert.equal(validateReading(read(),{expectedSeller:null,expectedVariant:'White'}).status,'ambiguous');
 assert.equal(validateReading(read(),{expectedSeller:'Store',expectedVariant:'Black'}).status,'ok');
 assert.equal(readStructuredProduct([{...document,offers:{...document.offers,priceCurrency:undefined}}],amazon).price,null);
 for(const bad of ['Sin stock','Desde $100','$10 por mes','100-200',null,'',0,-10])assert.equal(parseProductPrice(bad),null);
 assert.equal(parseProductPrice('$1,299.90'),1299.9);assert.equal(parseProductPrice('1.299,90 EUR'),1299.9);
 assert.equal(parseProductPrice('U$S 120'),120);
});
test('errors are recorded independently and previous successful history remains',async()=>{
 const store=openProductStore(fs.mkdtempSync(path.join(os.tmpdir(),'products-run-')));
 try{
  store.add({url:amazon,name:'One'});store.add({url:ml,name:'Two'});
  const result=await collectProductReadings(store,async offer=>{if(offer.store==='amazon')throw new Error('network');return read();});
  assert.deepEqual(result,{successful:1,total:2});
  assert.equal(store.catalog()[0].offers[0].observations[0].status,'error');
  await collectProductReadings(store,async()=>failedReading('unavailable','No stock'));
  assert.equal(store.catalog()[1].offers[0].observations.filter(r=>r.status==='ok').length,1);
 }finally{store.close();}
});
test('private report escapes content and separates currency, seller and variant histories',()=>{
 const history=[{...read(),id:1,offerId:1,runId:'one',observedAt:'2026-11-01T12:00:00Z'},
  {...read(),price:10,currency:'USD',id:2,offerId:1,runId:'two',observedAt:'2026-11-02T12:00:00Z'}];
 const html=renderProductsReport([{id:1,name:'<script>bad()</script>',category:'Audio',currency:'MXN',targetPrice:1500,offers:[{id:1,productId:1,url:amazon,store:'amazon',expectedSeller:null,expectedVariant:null,observations:history}]}]);
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>bad/);assert.equal((html.match(/<svg /g)||[]).length,2);
 assert.doesNotMatch(html,/<span class="badge">En precio objetivo/);
});
test('URLs require supported HTTPS storefronts and keep variant selection',()=>{
 for(const url of ['http://www.amazon.com.mx/dp/B000000001','https://www.amazon.com.mx.evil.example/product','https://user:pass@www.amazon.com.mx/dp/B000000001','https://localhost/product','https://www.amazon.com.mx/checkout','https://amzn.to/test'])assert.throws(()=>validateOfferUrl(url));
 assert.equal(validateOfferUrl(amazon+'?variant=red').url,amazon+'?variant=red');
 assert.equal(productReference('https://www.amazon.com.mx/gp/aw/d/B000000001?th=1'),'B000000001');
 assert.equal(validateOfferUrl('https://www.homedepot.com.mx/p/example-123').store,'structured');
});
