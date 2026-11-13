import fs from 'node:fs';
import path from 'node:path';
import { escapeHtml, formatMoney, formatCdmxDateTime } from '../utils/format.cjs';
import type { Observation, TrackedProduct } from './types';
import type { ProductStore } from './store';

function chart(history: Observation[]): string {
  const width = 640, height = 140, pad = 18;
  const min = Math.min(...history.map(row => row.price!));
  const max = Math.max(...history.map(row => row.price!));
  const range = Math.max(max - min, 1);
  const points = history.map((row, index) => ({
    x: history.length === 1 ? width / 2 : pad + index / (history.length - 1) * (width - 2 * pad),
    y: height - pad - (row.price! - min) / range * (height - 2 * pad), row,
  }));
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Historial de ${history.length} observaciones"><polyline points="${points.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#0f766e" stroke-width="3"/>${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#0f766e"><title>${escapeHtml(formatCdmxDateTime(p.row.observedAt))}: ${escapeHtml(formatMoney(p.row.price, p.row.currency!))}</title></circle>`).join('')}</svg>`;
}

export function renderProductsReport(products: TrackedProduct[]): string {
  const statuses = { ok: 'Lectura correcta', unavailable: 'Sin disponibilidad', blocked: 'Acceso bloqueado', ambiguous: 'Lectura ambigua', error: 'Error de lectura' };
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Productos privados</title>
<style>
:root{--ink:#173d36;--muted:#53675f;--line:#d6e2d8;--paper:#fffcf5;--accent:#0f766e}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:radial-gradient(ellipse at 0 0,#dcebdc,transparent 65%),#f2eee4;font-family:Georgia,'Times New Roman',serif}main{max-width:1120px;margin:auto;padding:36px 20px}header{border-bottom:2px solid var(--ink);padding:16px 0 28px}h1{font-size:clamp(32px,6vw,56px);margin:12px 0}p,small,label,button,input,select,.meta{font-family:'Trebuchet MS',sans-serif;line-height:1.6}.eyebrow{text-transform:uppercase;letter-spacing:.18em;font-size:12px;color:var(--accent)}.controls{display:flex;gap:16px;flex-wrap:wrap;margin:24px 0}label{flex:1;min-width:180px}input,select{display:block;width:100%;padding:12px;border:1px solid var(--line);border-radius:6px;background:var(--paper);font-size:16px}article{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:22px;margin:20px 0;overflow-wrap:anywhere}h2{font-size:27px;margin:0 0 8px}.offer{border-top:1px solid var(--line);padding-top:18px;margin-top:18px}.meta{color:var(--muted);font-size:14px}.badge{display:inline-block;border-radius:4px;padding:4px 10px;background:#e3eee4}.price{font-size:30px;margin:12px 0}a{color:var(--accent)}svg{display:block;width:100%;max-height:180px;background:linear-gradient(180deg,#f5f4e9,#fffdf7);border-radius:8px}details{margin-top:15px}summary{cursor:pointer}table{border-collapse:collapse;width:100%;font-family:'Trebuchet MS',sans-serif;font-size:13px}td,th{padding:8px;border-bottom:1px solid var(--line);text-align:left}.table-wrap{overflow:auto}footer{padding:22px 0;color:var(--muted)}[hidden]{display:none!important}
</style></head><body><main><header><div class="eyebrow">Lista personal / acceso local</div><h1>Productos privados</h1><p>Precios publicados e historial por tienda. No se calculan cupones ni descuentos condicionados; confirma las condiciones en la tienda. El envio se muestra por separado cuando puede verificarse.</p><small>Generado: ${escapeHtml(formatCdmxDateTime(new Date().toISOString()))}</small></header>
<div class="controls"><label>Buscar<input id="search" type="search" placeholder="Producto o categoria"></label><label>Categoria<select id="category"><option value="">Todas</option>${[...new Set(products.map(p => p.category))].sort().map(category => `<option>${escapeHtml(category)}</option>`).join('')}</select></label></div><p id="count"></p>
${products.length ? products.map(product => `<article data-name="${escapeHtml(product.name.toLowerCase())}" data-category="${escapeHtml(product.category)}"><h2>${escapeHtml(product.name)}</h2><div class="meta">${escapeHtml(product.category)} | Objetivo por producto, sin envio: ${product.targetPrice === null ? 'Sin definir' : escapeHtml(formatMoney(product.targetPrice, product.currency))}</div>${product.offers.map(offer => {
    const latest = offer.observations.at(-1);
    const successes = offer.observations.filter(row => row.status === 'ok');
    const lastGood = successes.at(-1);
    const groups = new Map<string, Observation[]>();
    for (const row of successes) { const key = JSON.stringify([row.currency, row.seller, row.variant]); groups.set(key, [...(groups.get(key) ?? []), row]); }
    const targetMet = latest?.status === 'ok' && latest.currency === product.currency && product.targetPrice !== null && latest.price! <= product.targetPrice;
    return `<section class="offer"><a href="${escapeHtml(offer.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(new URL(offer.url).hostname)} / abrir oferta ${offer.id}</a><p><span class="badge">${latest ? statuses[latest.status] : 'Sin consultar'}</span>${targetMet ? ' <span class="badge">En precio objetivo (sin envio)</span>' : ''}</p>
${lastGood ? `<div class="price">${escapeHtml(formatMoney(lastGood.price, lastGood.currency!))}</div><div class="meta">Ultimo precio observado: ${escapeHtml(formatCdmxDateTime(lastGood.observedAt))}${latest?.status !== 'ok' ? '. No es una lectura actual.' : ''}<br>Vendedor: ${escapeHtml(lastGood.seller ?? 'No identificado')} | Variante: ${escapeHtml(lastGood.variant ?? 'No identificada')}<br>Envio: ${lastGood.shipping === null ? 'No verificado; no incluido' : escapeHtml(formatMoney(lastGood.shipping, lastGood.currency!))}</div>` : '<p>Aun no hay un precio verificable.</p>'}
${latest ? `<p class="meta">Ultimo intento: ${escapeHtml(formatCdmxDateTime(latest.observedAt))}. ${escapeHtml(latest.message)}</p>` : ''}
${[...groups.values()].map(history => `<details open><summary>Historico: ${escapeHtml(history[0].currency!)} / ${escapeHtml(history[0].seller ?? 'vendedor no identificado')} / ${escapeHtml(history[0].variant ?? 'variante no identificada')}</summary><p class="meta">${history.length} observaciones. Minimo de este contexto: ${escapeHtml(formatMoney(Math.min(...history.map(row => row.price!)), history[0].currency!))}</p>${chart(history)}<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Precio</th><th>Envio</th></tr></thead><tbody>${history.map(row => `<tr><td>${escapeHtml(formatCdmxDateTime(row.observedAt))}</td><td>${escapeHtml(formatMoney(row.price, row.currency!))}</td><td>${row.shipping === null ? 'No verificado' : escapeHtml(formatMoney(row.shipping, row.currency!))}</td></tr>`).join('')}</tbody></table></div></details>`).join('')}
<details><summary>Intentos de lectura (${offer.observations.length})</summary><div class="table-wrap"><table><tbody>${offer.observations.map(row => `<tr><td>${escapeHtml(formatCdmxDateTime(row.observedAt))}</td><td>${statuses[row.status]}</td><td>${escapeHtml(row.message)}</td></tr>`).join('')}</tbody></table></div></details></section>`;
  }).join('')}</article>`).join('') : '<p>La lista esta vacia. Agrega productos desde products:add.</p>'}
<footer>Lista privada separada del monitor de libros. No se publica en GitHub Pages.</footer></main><script>
const search=document.getElementById('search'),category=document.getElementById('category');
function filter(){let count=0;for(const card of document.querySelectorAll('article')){card.hidden=!(card.dataset.name+' '+card.dataset.category.toLowerCase()).includes(search.value.toLowerCase())||(category.value!==''&&card.dataset.category!==category.value);if(!card.hidden)count++;}document.getElementById('count').textContent=count+' productos';}
search.addEventListener('input',filter);category.addEventListener('change',filter);filter();
</script></body></html>`;
}

export function writeProductsReport(store: ProductStore): string {
  fs.mkdirSync(store.paths.privateDir, { recursive: true, mode: 0o700 });
  const temporary = path.join(store.paths.privateDir, 'report.html.tmp');
  fs.writeFileSync(temporary, renderProductsReport(store.catalog()), { mode: 0o600 });
  fs.renameSync(temporary, store.paths.report);
  return store.paths.report;
}
