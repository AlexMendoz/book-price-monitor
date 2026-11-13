import http from 'node:http';
import fs from 'node:fs';
import { productPaths } from './store';

export function createProductsPreview(report = productPaths().report) {
  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method ?? '') || !['/', '/report.html'].includes(request.url ?? '')) {
      response.writeHead(404).end('No encontrado'); return;
    }
    try {
      const html = fs.readFileSync(report);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" });
      response.end(request.method === 'HEAD' ? undefined : html);
    } catch { response.writeHead(404).end('Genera el reporte con npm run products:report.'); }
  });
}
if (require.main === module) {
  const port = Number(process.env.PRODUCTS_PORT || 4174);
  const server = createProductsPreview();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Productos privados: http://127.0.0.1:${port}`));
}
