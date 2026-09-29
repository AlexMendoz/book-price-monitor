const {test}=require('node:test'),assert=require('node:assert/strict');
const {filterAndSortBooks}=require('../src/utils/reportFilters.cjs');
const books=[
 {id:'1',title:'Árbol caro',price:300,discount:40,isActive:true,isHistoricalLow:true},
 {id:'2',title:'Arbol barato',price:200,discount:20,isActive:true,isHistoricalLow:false},
 {id:'3',title:'Fuera',price:50,discount:50,isActive:false,isHistoricalLow:true},
 {id:'4',title:'Arbol empate',price:200,discount:null,isActive:true,isHistoricalLow:false},
 {id:'5',title:'Sin precio',price:null,discount:null,isActive:true,isHistoricalLow:false}
];
test('cheapest is scoped to search and wishlist, preserves ties and differs from historical lows',()=>{
 assert.deepEqual(filterAndSortBooks(books,{query:'arbol',price:'current_min'}).map(x=>x.id),['2','4']);
 assert.deepEqual(filterAndSortBooks(books,{sort:'wishlist_inactive',price:'current_min'}).map(x=>x.id),['3']);
 assert.deepEqual(filterAndSortBooks(books,{query:'arbol',price:'historical_low'}).map(x=>x.id),['1']);
 assert.equal(filterAndSortBooks(books,{query:'Sin precio',price:'current_min'}).length,0);
 assert.equal(filterAndSortBooks(books,{price:'200'}).length,1);
 assert.equal(filterAndSortBooks(books,{sort:'price_asc'}).at(-1).id,'5');
 assert.equal(filterAndSortBooks(books,{query:'no matches'}).length,0);
 assert.equal(books[0].id,'1');
});
