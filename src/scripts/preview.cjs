const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.env.REPORTS_DIR || 'reports');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg' };
http.createServer((request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(response);
  } catch { response.writeHead(404).end('No encontrado'); }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('http://127.0.0.1:' + (process.env.PORT || 4173)));
