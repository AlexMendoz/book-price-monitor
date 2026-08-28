import '../config/loadEnv';
import fs from 'node:fs';
import path from 'node:path';
import { buildHtml, type BookHistory } from './generateAllBooksChart';
import { getAllBooksPriceHistory } from '../services/reportService';

type EmbeddedBook = {
  bookId: number;
  labels: string[];
  listPrices: Array<number | null>;
  discountedPrices: Array<number | null>;
  discountPercents: Array<number | null>;
  title: string;
  currentDiscountPercent: number | null;
  isHistoricalLow?: boolean;
};

type LocalHistoryRow = Awaited<ReturnType<typeof getAllBooksPriceHistory>>[number];

const reportPath = path.resolve('./reports/historico_todos_los_libros.html');
const sourceReportPath = path.resolve(process.argv[2] ?? reportPath);

async function main() {
  if (!fs.existsSync(sourceReportPath)) {
    throw new Error(`No existe el reporte base: ${sourceReportPath}`);
  }

  const existingHtml = fs.readFileSync(sourceReportPath, 'utf8');
  const existingBooks = readEmbeddedBooks(existingHtml);
  const cardsById = readCards(existingHtml);
  const localRows = await getAllBooksPriceHistory();
  const mergedBooks = mergeLatestLocalSnapshots(existingBooks, cardsById, localRows);
  const backupPath = createBackup(existingHtml);
  const html = buildHtml(mergedBooks, { embedImages: false });

  fs.writeFileSync(reportPath, html, 'utf8');
  console.log(`Respaldo creado en: ${backupPath}`);
  console.log(`Reporte base usado: ${sourceReportPath}`);
  console.log(`Reporte global fusionado en: ${reportPath}`);
}

function readEmbeddedBooks(html: string): EmbeddedBook[] {
  const match = html.match(/const books = (\[[\s\S]*?\]);\s*const booksGrid/);

  if (!match) {
    throw new Error('No se encontró el historial embebido en el reporte base.');
  }

  return JSON.parse(match[1]) as EmbeddedBook[];
}

function readCards(html: string): Map<number, Pick<BookHistory, 'author' | 'productUrl' | 'imageUrl' | 'reportImageSrc' | 'isActive'>> {
  const cards = new Map<number, Pick<BookHistory, 'author' | 'productUrl' | 'imageUrl' | 'reportImageSrc' | 'isActive'>>();
  const cardPattern = /<article\b([\s\S]*?)<canvas id="chart-book-(\d+)"><\/canvas>[\s\S]*?<\/article>/g;

  for (const match of html.matchAll(cardPattern)) {
    const [, cardHtml, rawBookId] = match;
    const bookId = Number(rawBookId);
    const author = cardHtml.match(/<div class="book-meta">\s*([^<\n]+)<br/)?.[1].trim() ?? null;
    const productUrl = cardHtml.match(/<a href="([^"]+)"/)?.[1] ?? null;
    const reportImageSrc = cardHtml.match(/<img class="cover" src="([^"]+)"/)?.[1] ?? null;
    const isActive = !/data-active="false"/.test(cardHtml);

    cards.set(bookId, { author, productUrl, imageUrl: null, reportImageSrc, isActive });
  }

  return cards;
}

function mergeLatestLocalSnapshots(
  embeddedBooks: EmbeddedBook[],
  cardsById: ReturnType<typeof readCards>,
  localRows: LocalHistoryRow[]
): BookHistory[] {
  const localLatestByUrl = new Map<string, LocalHistoryRow>();

  for (const row of localRows) {
    if (!row.productUrl) continue;
    const current = localLatestByUrl.get(row.productUrl);

    if (!current || new Date(row.scrapedAt).getTime() > new Date(current.scrapedAt).getTime()) {
      localLatestByUrl.set(row.productUrl, row);
    }
  }

  const mergedByUrl = new Map<string, BookHistory>();
  const mergedWithoutUrl: BookHistory[] = [];
  const usedReportBookIds = new Set<number>();
  let nextReportBookId = Math.max(0, ...embeddedBooks.map((book) => book.bookId)) + 1;

  for (const embedded of embeddedBooks) {
    const card = cardsById.get(embedded.bookId);
    const history = toBookHistory(embedded, card);
    usedReportBookIds.add(history.bookId);

    if (history.productUrl) {
      mergedByUrl.set(history.productUrl, history);
    } else {
      mergedWithoutUrl.push(history);
    }
  }

  for (const [productUrl, row] of localLatestByUrl) {
    const existing = mergedByUrl.get(productUrl);

    if (existing) {
      appendSnapshot(existing, row);
      existing.author = row.author;
      existing.imageUrl = row.imageUrl;
      existing.isActive = row.isActive;
      continue;
    }

    const label = formatCdmxDateTime(row.scrapedAt);
    const reportBookId = usedReportBookIds.has(row.bookId)
      ? nextAvailableReportBookId()
      : row.bookId;

    usedReportBookIds.add(reportBookId);
    mergedByUrl.set(productUrl, {
      bookId: reportBookId,
      title: row.title,
      author: row.author,
      productUrl,
      imageUrl: row.imageUrl,
      reportImageSrc: null,
      currency: row.currency ?? 'MXN',
      labels: [label],
      listPrices: [row.listPrice],
      discountedPrices: [row.discountedPrice],
      discountPercents: [row.discountPercent],
      currentListPrice: row.listPrice,
      currentDiscountedPrice: row.discountedPrice,
      currentDiscountPercent: row.discountPercent,
      historicalMinDiscountedPrice: row.discountedPrice,
      historicalMaxDiscountedPrice: row.discountedPrice,
      isActive: row.isActive,
      lastScrapedAt: label,
    });
  }

  return [...mergedByUrl.values(), ...mergedWithoutUrl].sort((a, b) =>
    a.title.localeCompare(b.title, 'es')
  );

  function nextAvailableReportBookId(): number {
    while (usedReportBookIds.has(nextReportBookId)) {
      nextReportBookId += 1;
    }

    return nextReportBookId++;
  }
}

function toBookHistory(
  embedded: EmbeddedBook,
  card: ReturnType<typeof readCards> extends Map<number, infer Value> ? Value | undefined : never
): BookHistory {
  const currentIndex = embedded.labels.length - 1;
  const discountedValues = embedded.discountedPrices.filter((value): value is number => value !== null);
  const metadata = card ?? {
    author: null,
    productUrl: null,
    imageUrl: null,
    reportImageSrc: null,
    isActive: true,
  };

  return {
    bookId: embedded.bookId,
    title: embedded.title,
    ...metadata,
    currency: 'MXN',
    labels: [...embedded.labels],
    listPrices: [...embedded.listPrices],
    discountedPrices: [...embedded.discountedPrices],
    discountPercents: [...embedded.discountPercents],
    currentListPrice: embedded.listPrices[currentIndex] ?? null,
    currentDiscountedPrice: embedded.discountedPrices[currentIndex] ?? null,
    currentDiscountPercent: embedded.discountPercents[currentIndex] ?? null,
    historicalMinDiscountedPrice: discountedValues.length ? Math.min(...discountedValues) : null,
    historicalMaxDiscountedPrice: discountedValues.length ? Math.max(...discountedValues) : null,
    lastScrapedAt: embedded.labels[currentIndex] ?? 'Sin registros',
  };
}

function appendSnapshot(book: BookHistory, row: LocalHistoryRow): void {
  const label = formatCdmxDateTime(row.scrapedAt);
  const lastIndex = book.labels.length - 1;

  // Makes repeated executions safe when the latest local snapshot is already present.
  if (
    book.labels[lastIndex] === label &&
    book.listPrices[lastIndex] === row.listPrice &&
    book.discountedPrices[lastIndex] === row.discountedPrice &&
    book.discountPercents[lastIndex] === row.discountPercent
  ) {
    return;
  }

  book.labels.push(label);
  book.listPrices.push(row.listPrice);
  book.discountedPrices.push(row.discountedPrice);
  book.discountPercents.push(row.discountPercent);
  book.currency = row.currency ?? book.currency;
  book.currentListPrice = row.listPrice;
  book.currentDiscountedPrice = row.discountedPrice;
  book.currentDiscountPercent = row.discountPercent;
  book.lastScrapedAt = label;

  if (row.discountedPrice !== null) {
    book.historicalMinDiscountedPrice = book.historicalMinDiscountedPrice === null
      ? row.discountedPrice
      : Math.min(book.historicalMinDiscountedPrice, row.discountedPrice);
    book.historicalMaxDiscountedPrice = book.historicalMaxDiscountedPrice === null
      ? row.discountedPrice
      : Math.max(book.historicalMaxDiscountedPrice, row.discountedPrice);
  }
}

function createBackup(html: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.resolve(`./reports/historico_todos_los_libros.backup-${timestamp}.html`);
  fs.writeFileSync(backupPath, html, 'utf8');
  return backupPath;
}

function formatCdmxDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

main().catch((error) => {
  console.error('Error al fusionar el reporte global:', error);
  process.exit(1);
});
