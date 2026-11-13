import '../config/loadEnv';
import { parseArgs } from 'node:util';
import { openProductStore } from './store';
import { runProducts } from './runner';
import { writeProductsReport } from './report';

async function main() {
  const command = process.argv[2];
  const { values } = parseArgs({ args: process.argv.slice(3), options: {
    url: { type: 'string' }, name: { type: 'string' }, category: { type: 'string' }, target: { type: 'string' },
    currency: { type: 'string' }, product: { type: 'string' }, seller: { type: 'string' }, variant: { type: 'string' }, manual: { type: 'boolean' },
  }, strict: true });
  if (!['add', 'list', 'run', 'report'].includes(command)) throw new Error('Comandos: products:add, products:list, products:run, products:report.');
  const store = openProductStore();
  try {
    if (command === 'add') {
      if (!values.url) throw new Error('Indica --url. Para un producto nuevo indica tambien --name.');
      const result = store.add({ url: values.url, name: values.name, category: values.category,
        targetPrice: values.target === undefined ? undefined : Number(values.target), currency: values.currency,
        productId: values.product === undefined ? undefined : Number(values.product), seller: values.seller, variant: values.variant });
      console.log(`Producto ${result.productId}, oferta ${result.offerId} guardados en la lista privada.`);
    } else if (command === 'list') {
      console.table(store.catalog().map(product => ({ id: product.id, nombre: product.name, categoria: product.category,
        objetivo: product.targetPrice, moneda: product.currency, ofertas: product.offers.length })));
    } else if (command === 'run') {
      const result = await runProducts(store, values.manual === true);
      console.log(`${result.successful}/${result.total} ofertas con precio verificable.`);
      if (result.successful < result.total) process.exitCode = 1;
    }
    if (command !== 'list') console.log(`Reporte privado: ${writeProductsReport(store)}`);
  } finally { store.close(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Error en productos.'); process.exitCode = 1; });
