const { test }=require('node:test');
const assert=require('node:assert/strict');
const {calculateDealMetrics}=require('../src/services/dealMetrics.ts');
const p=price=>({listPrice:200,discountedPrice:price,discountPercent:50});
test('equal lows, new records, first observation and missing prices have distinct semantics',()=>{
  const equal=calculateDealMetrics(p(100),p(100),[100]);
  assert.equal(equal.isHistoricalLow,true); assert.equal(equal.isNewHistoricalLow,false);
  const lower=calculateDealMetrics(p(90),p(100),[100]);
  assert.equal(lower.isNewHistoricalLow,true); assert.equal(lower.dropVsPrevious,10);
  assert.equal(calculateDealMetrics(p(100),null,[]).isNewHistoricalLow,false);
  assert.equal(calculateDealMetrics(p(null),p(100),[100]).isHistoricalLow,false);
  assert.equal(calculateDealMetrics(p(120),p(100),[90,100]).isHistoricalLow,false);
});
