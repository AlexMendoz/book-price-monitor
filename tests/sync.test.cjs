const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
process.env.DATABASE_URL=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'sync-')),'test.db');
process.env.HISTORY_AUTO_RESTORE='false';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { collectWishlists } = require('../src/services/wishlistSyncService.ts');
const lists = [{ name: 'A', url: 'a' }, { name: 'B', url: 'b' }];
const book = { title: 'Book', discountedPriceText: '$100' };
test('collection rejects partial, empty and failed runs before persistence', async () => {
  await assert.rejects(collectWishlists(lists, {}, async url => url === 'a' ? [book] : []), /incompleta/);
  await assert.rejects(collectWishlists([], {}, async () => [book]), /configuradas/);
  await assert.rejects(collectWishlists(lists, {}, async () => { throw new Error('blocked'); }), /blocked/);
  assert.equal((await collectWishlists(lists, {}, async () => [book])).length, 2);
});
const {syncWishlists}=require('../src/services/wishlistSyncService.ts');
const {sqlite}=require('../src/db/client.ts');
const raw={title:'Shared',author:null,productUrl:'https://example.com/shared',imageUrl:null,discountedPriceText:'$100',listPriceText:'$200',discountPercentText:'50%',currency:'MXN'};
test('shared ingestion commits one observation and rolls back persistence failures',async()=>{
 const result=await syncWishlists(lists,{},async()=>[raw]);
 assert.equal(result.booksProcessed,1);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM wishlist_books').get().n,2);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM price_snapshots').get().n,1);
 await assert.rejects(syncWishlists(lists,{},async url=>url==='a'?[{...raw,title:'Changed'}]:[]));
 assert.equal(sqlite.prepare('SELECT title FROM books').get().title,'Shared');
 await assert.rejects(syncWishlists(lists,{},async()=>[{...raw,title:'Changed',currency:null}]));
 assert.equal(sqlite.prepare('SELECT title FROM books').get().title,'Shared');
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM price_snapshots').get().n,1);
});
test('job lock prevents overlap and releases after failure',async()=>{
 const {withJobLock}=require('../src/services/jobLock.ts');
 await assert.rejects(withJobLock(async()=>{
  await assert.rejects(withJobLock(async()=>{}),/bloqueo/);
  throw new Error('simulated failure');
 }),/simulated failure/);
 assert.equal(await withJobLock(async()=>42),42);
});
