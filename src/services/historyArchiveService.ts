import { findBookByProductUrl, reconcileBookAliases } from './bookIdentity';
import fs from 'node:fs';
import path from 'node:path';
import { sqlite } from '../db/client';

export const reportsDirectory = () => path.resolve(process.env.REPORTS_DIR || './reports');
export type ArchiveRow = {
  bookId: number; title: string; author: string | null; productUrl: string | null;
  imageUrl: string | null; isActive: boolean; currency: string;
  listPrice: number | null; discountedPrice: number | null; discountPercent: number | null;
  scrapedAt: string; timePrecision: string;
};

function decodeHtml(value: string): string {
  return value.replace(/&(?:amp|quot|#039|lt|gt);/g, (entity) => ({
    '&amp;': '&', '&quot;': '"', '&#039;': "'", '&lt;': '<', '&gt;': '>',
  }[entity]!));
}

export function parseLegacyDate(label: string): { scrapedAt: string; timePrecision: string } {
  const normalized = label.replace(/\sde\s/g, ' ').toLowerCase();
  const match = normalized.match(/^(\d{1,2})\s+(\p{L}+)\.?\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?:\s*([ap])\.?\s*m\.?)?)?/u);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  if (!match || !months.includes(match[2].slice(0, 3))) throw new Error(`Fecha historica no reconocida: ${label}`);
  let hour = Number(match[4] ?? 0);
  if (match[6]) hour = hour % 12 + (match[6] === 'p' ? 12 : 0);
  const date = new Date(Date.UTC(Number(match[3]), months.indexOf(match[2].slice(0, 3)), Number(match[1]), hour + 6, Number(match[5] ?? 0)));
  return { scrapedAt: date.toISOString(), timePrecision: match[4] ? 'instant' : 'day' };
}

export function readLegacyReport(filePath: string): ArchiveRow[] {
  const html = fs.readFileSync(filePath, 'utf8');
  const embedded = html.match(/<script type="application\/json" id="price-history">([\s\S]*?)<\/script>/);
  if (embedded) return validateRows(JSON.parse(embedded[1]).rows);
  const match = html.match(/const books = (\[[\s\S]*?\]);\s*const booksGrid/);
  if (!match) return [];
  const cards = new Map<number, string>();
  for (const card of html.matchAll(/<article\b([\s\S]*?)<canvas id="chart-book-(\d+)"><\/canvas>[\s\S]*?<\/article>/g)) cards.set(Number(card[2]), card[1]);
  const rows: ArchiveRow[] = [];
  for (const book of JSON.parse(match[1])) {
    const card = cards.get(book.bookId);
    if (!card) throw new Error(`Falta tarjeta para libro ${book.bookId} en ${filePath}`);
    if ([book.listPrices, book.discountedPrices, book.discountPercents].some(values => !Array.isArray(values) || values.length !== book.labels.length)) {
      throw new Error(`Serie historica incompleta: ${book.title}`);
    }
    const author = card.match(/<div class="book-meta">\s*([^<\n]+)<br/)?.[1].trim();
    const productUrl = card.match(/<a href="([^"]+)"/)?.[1];
    const imageUrl = card.match(/<img class="cover" src="(https?:[^"]+)"/)?.[1];
    for (let i = 0; i < book.labels.length; i++) rows.push({
      bookId: book.bookId, title: book.title, author: author ? decodeHtml(author) : null,
      productUrl: productUrl ? decodeHtml(productUrl) : null, imageUrl: imageUrl ? decodeHtml(imageUrl) : null,
      isActive: !/data-active="false"/.test(card), currency: book.currency ?? 'MXN',
      listPrice: book.listPrices[i], discountedPrice: book.discountedPrices[i], discountPercent: book.discountPercents[i],
      ...parseLegacyDate(book.labels[i]),
    });
  }
  return validateRows(rows);
}

function validateRows(value: unknown): ArchiveRow[] {
  if (!Array.isArray(value)) throw new Error('Archivo de historial invalido.');
  for (const row of value) {
    if (!row || typeof row.title !== 'string' || !row.title || !Number.isFinite(Date.parse(row.scrapedAt)) ||
        typeof row.currency !== 'string' || !['day', 'instant'].includes(row.timePrecision) ||
        [row.listPrice, row.discountedPrice, row.discountPercent].some(price => price !== null && (typeof price !== 'number' || !Number.isFinite(price)))) {
      throw new Error('Registro historico invalido; se cancela la regeneracion.');
    }
  }
  return value;
}

const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
const dayCache = new Map<string, string>();
function dayKey(value: string): string {
  if (!dayCache.has(value)) dayCache.set(value, dayFormatter.format(new Date(value)));
  return dayCache.get(value)!;
}

export async function importHistoryRows(rows: ArchiveRow[]): Promise<number> {
  validateRows(rows);
  if (!rows.length) return 0;
  const backupDir = path.resolve(process.env.HISTORY_BACKUP_DIR || './data/backups');
  fs.mkdirSync(backupDir, { recursive: true });
  await sqlite.backup(path.join(backupDir, `before-import-${Date.now()}-${Math.random().toString(16).slice(2)}.db`));
  return sqlite.transaction(() => {
    reconcileBookAliases();
    let inserted = 0;
    const seen = new Map<string, number>();
    const createdBooks = new Set<number>();
    const histories = new Map<number, any[]>();
    for (const row of rows) {
      let book = row.productUrl
        ? findBookByProductUrl(row.productUrl)
        : sqlite.prepare('SELECT id FROM books WHERE product_url IS NULL AND title = ? AND author IS ?').get(row.title, row.author);
      if (!book) {
        const result = sqlite.prepare('INSERT INTO books(title, author, product_url, image_url, is_active, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(row.title, row.author, row.productUrl, row.imageUrl, Number(row.isActive), row.scrapedAt);
        book = { id: Number(result.lastInsertRowid) };
        createdBooks.add(book.id);
      }
      const bookId = book.id as number;
      if (createdBooks.has(bookId)) sqlite.prepare('UPDATE books SET last_seen_at = MAX(last_seen_at, ?) WHERE id = ?').run(row.scrapedAt, bookId);
      if (!histories.has(bookId)) histories.set(bookId, sqlite.prepare('SELECT * FROM price_snapshots WHERE book_id = ?').all(bookId));
      const history = histories.get(bookId)!;
      const date = row.timePrecision === 'day' ? dayKey(row.scrapedAt) : row.scrapedAt;
      const key = JSON.stringify([bookId, date, row.timePrecision, row.listPrice, row.discountedPrice, row.discountPercent, row.currency]);
      const occurrence = (seen.get(key) ?? 0) + 1;
      seen.set(key, occurrence);
      const matches = history.filter(snapshot =>
        snapshot.list_price === row.listPrice && snapshot.discounted_price === row.discountedPrice &&
        snapshot.discount_percent === row.discountPercent && snapshot.currency === row.currency &&
        (row.timePrecision === 'day' ? dayKey(snapshot.scraped_at) === date : new Date(snapshot.scraped_at).toISOString() === new Date(row.scrapedAt).toISOString())
      ).length;
      if (matches >= occurrence) continue;
      sqlite.prepare('INSERT INTO price_snapshots(book_id, list_price, discounted_price, discount_percent, currency, scraped_at, time_precision) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(bookId, row.listPrice, row.discountedPrice, row.discountPercent, row.currency, row.scrapedAt, row.timePrecision);
      history.push({ list_price: row.listPrice, discounted_price: row.discountedPrice, discount_percent: row.discountPercent, currency: row.currency, scraped_at: row.scrapedAt });
      inserted++;
    }
    return inserted;
  })();
}

let restored: Promise<void> | undefined;
export function restorePublishedHistory(): Promise<void> {
  if (process.env.HISTORY_AUTO_RESTORE === 'false') return Promise.resolve();
  return restored ??= (async () => {
    const dir = reportsDirectory();
    if (!fs.existsSync(dir)) return;
    const archive = path.join(dir, 'history.json');
    if (fs.existsSync(archive)) {
      const value = JSON.parse(fs.readFileSync(archive, 'utf8'));
      if (value.version !== 1) throw new Error('Version de historial no soportada.');
      await importHistoryRows(validateRows(value.rows));
    }
    // Read every global report, including older shareable versions, before overwriting any.
    for (const file of fs.readdirSync(dir).filter(name => /^historico_todos_los_libros.*\.html$/.test(name))) {
      await importHistoryRows(readLegacyReport(path.join(dir, file)));
    }
  })();
}

export function writeHistoryArchive(rows: ArchiveRow[]): void {
  const dir = reportsDirectory();
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, 'history.json');
  fs.writeFileSync(`${target}.tmp`, JSON.stringify({ version: 1, rows }), 'utf8');
  fs.renameSync(`${target}.tmp`, target);
}
