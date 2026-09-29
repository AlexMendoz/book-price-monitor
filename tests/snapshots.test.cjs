process.env.HISTORY_AUTO_RESTORE = 'false';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
process.env.DATABASE_URL = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-')), 'test.db');
const { sqlite } = require('../src/db/client.ts');
const { upsertBook } = require('../src/services/bookService.ts');
const { createPriceSnapshot } = require('../src/services/priceSnapshotService.ts');
const { getDealRanking } = require('../src/services/rankingService.ts');
test('one snapshot per book and run preserves a real drop across shared lists', async () => {
  const bookId=await upsertBook({title:'A',author:null,productUrl:'a',imageUrl:null});
  const input={bookId,listPrice:200,discountedPrice:120,discountPercent:40,currency:'MXN',runId:'first'};
  await createPriceSnapshot(input);
  await createPriceSnapshot({...input,discountedPrice:100,runId:'second'});
  await createPriceSnapshot({...input,discountedPrice:100,runId:'second'});
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM price_snapshots').get().n,2);
  assert.equal((await getDealRanking())[0].dropVsPrevious,20);
  await createPriceSnapshot({...input,discountedPrice:100,runId:'third'});
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM price_snapshots').get().n,3);
});
test('ranking fetches histories in batches rather than per book',async()=>{
  for(let i=0;i<20;i++) {
    const bookId=await upsertBook({title:'Book '+i,author:null,productUrl:'url-'+i,imageUrl:null});
    await createPriceSnapshot({bookId,listPrice:200,discountedPrice:100,discountPercent:50,currency:'MXN'});
  }
  const original=sqlite.prepare;
  let queries=0;
  sqlite.prepare=function(sql,...args){ if(/^select/i.test(sql)&&sql.includes('price_snapshots'))queries++; return original.call(this,sql,...args); };
  try { assert.equal((await getDealRanking()).length,21); assert.equal(queries,1); }
  finally { sqlite.prepare=original; }
});
