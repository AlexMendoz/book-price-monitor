const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {extractWishlistBooks}=require('../src/scraper/wishlistScraper.ts');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();
  const cards=Array.from({length:20},(_,i)=>`<div class="producto"><div class="infoProducto"><div class="titulo">Book ${i}</div></div><div class="portadaProducto"><a href="https://example.com/${i}"></a></div>${i<19?'<div class="marcoPrecios"><span class="precioAhora">$100</span></div>':''}</div>`).join('');
  await page.setContent(cards);
  const books=await extractWishlistBooks(page);
  assert.equal(books.length,20);
  assert.equal(books[19].discountedPriceText,null);
  await page.setContent('<div class="producto"><div class="portadaProducto"><a title="Fallback title" href="https://example.com/fallback"></a></div></div>');
  assert.equal((await extractWishlistBooks(page))[0].title,'Fallback title');
  await page.setContent(cards+'<div class="producto"><div class="marcoPrecios">$90</div></div>');
  await assert.rejects(extractWishlistBooks(page),/Tarjetas sin titulo: 21/);
  console.log('Scraper OK: 19 priced + 1 unavailable, fallback title, unidentified card remains blocked.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
