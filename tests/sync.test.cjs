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
