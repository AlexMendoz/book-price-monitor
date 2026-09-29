const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
process.env.COVER_CACHE_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'covers-'));
const {getCachedCover,mapWithConcurrency}=require('../src/services/coverCacheService.ts');
test('cover downloads are bounded, shared and reused from disk',async()=>{
 const original=global.fetch;let calls=0,active=0,maximum=0;
 global.fetch=async()=>{calls++;active++;maximum=Math.max(active,maximum);await new Promise(r=>setTimeout(r,5));active--;return new Response('image',{headers:{'content-type':'image/png'}});};
 try{
  const urls=Array.from({length:12},(_,i)=>'https://example.com/'+i);
  const first=await mapWithConcurrency(urls,getCachedCover,3);
  assert.ok(maximum<=3);assert.equal(calls,12);
  const second=await mapWithConcurrency(urls,getCachedCover,3);
  assert.deepEqual(first,second);assert.equal(calls,12);
  await Promise.all([getCachedCover('https://example.com/shared'),getCachedCover('https://example.com/shared')]);
  assert.equal(calls,13);
 }finally{global.fetch=original;}
});
