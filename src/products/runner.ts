import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { chromium, type BrowserContext } from 'playwright';
import { failedReading, extractProductPage } from './extract';
import { validateOfferUrl, productReference } from './urls';
import type { Offer, Reading } from './types';
import type { ProductStore } from './store';

async function readOffer(context: BrowserContext, offer: Offer, manual: boolean): Promise<Reading> {
  const page = await context.newPage();
  try {
    const response = await page.goto(offer.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (response && [401, 403, 429].includes(response.status())) {
      return failedReading('blocked', `La tienda devolvio HTTP ${response.status()}. No se reintentara automaticamente.`);
    }
    if (!response?.ok()) return failedReading('error', `Respuesta HTTP ${response?.status() ?? 'desconocida'}.`);
    const destination = validateOfferUrl(page.url());
    if (destination.store !== offer.store || new URL(destination.url).hostname.replace(/^(?:www|articulo)\./,'') !== new URL(offer.url).hostname.replace(/^(?:www|articulo)\./,'')) return failedReading('ambiguous', 'Redireccion a otra tienda o dominio; revisa la URL.');
    const reference = productReference(offer.url);
    if (reference && productReference(page.url()) !== reference) return failedReading('ambiguous', 'La pagina redirigio a otro producto.');
    await page.waitForTimeout(2500);
    let reading = await extractProductPage(page, offer);
    if (reading.status === 'blocked' && manual && process.stdin.isTTY) {
      const input = createInterface({ input: process.stdin, output: process.stdout });
      try { await input.question(`Oferta ${offer.id}: revisa la verificacion en el navegador y pulsa ENTER para volver a leer, o Ctrl+C para cancelar. `); }
      finally { input.close(); }
      if (validateOfferUrl(page.url()).store !== offer.store || (reference && productReference(page.url()) !== reference)) return failedReading('ambiguous', 'La pagina cambio de producto durante la verificacion.');
      reading = await extractProductPage(page, offer);
    }
    return reading;
  } catch {
    return failedReading('error', 'No se pudo cargar o interpretar la pagina. El historial anterior se conserva.');
  } finally { await page.close(); }
}

export async function collectProductReadings(store: ProductStore, read: (offer: Offer) => Promise<Reading>) {
  const runId = randomUUID();
  let successful = 0;
  for (const offer of store.offers()) {
    let reading: Reading;
    try { reading = await read(offer); } catch { reading = failedReading('error', 'Fallo de lectura; sin precio nuevo.'); }
    store.record(offer.id, runId, reading);
    if (reading.status === 'ok') successful++;
    console.log(`Oferta ${offer.id}: ${reading.status}. ${reading.message}`);
  }
  return { successful, total: store.offers().length };
}

export async function runProducts(store: ProductStore, manual = false) {
  fs.mkdirSync(store.paths.privateDir, { recursive: true, mode: 0o700 });
  const lock = path.join(store.paths.privateDir, 'run.lock');
  let descriptor: number;
  try { descriptor = fs.openSync(lock, 'wx', 0o600); } catch { throw new Error('Ya hay una ejecucion de productos o un bloqueo pendiente en private-products/run.lock.'); }
  fs.writeFileSync(descriptor, String(process.pid));
  let context: BrowserContext | undefined;
  try {
    if (!store.offers().length) throw new Error('Agrega al menos una URL con products:add.');
    context = await chromium.launchPersistentContext(store.paths.profile, { headless: !manual, viewport: { width: 1400, height: 900 } });
    return await collectProductReadings(store, async offer => {
      const result = await readOffer(context!, offer, manual);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return result;
    });
  } finally {
    try { await context?.close(); } finally { fs.closeSync(descriptor); fs.unlinkSync(lock); }
  }
}
