import '../config/loadEnv';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getAllBooksPriceHistory } from '../services/reportService';

type HistoryRow = Awaited<ReturnType<typeof getAllBooksPriceHistory>>[number];

type BookHistory = {
  bookId: number;
  title: string;
  author: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  reportImageSrc: string | null;
  currency: string;
  labels: string[];
  listPrices: Array<number | null>;
  discountedPrices: Array<number | null>;
  discountPercents: Array<number | null>;
  currentListPrice: number | null;
  currentDiscountedPrice: number | null;
  currentDiscountPercent: number | null;
  historicalMinDiscountedPrice: number | null;
  historicalMaxDiscountedPrice: number | null;
  lastScrapedAt: string;
};

type GenerateAllBooksChartOptions = {
  embedImages?: boolean;
  outputFileName?: string;
  selfContainedCharts?: boolean;
};

export async function generateAllBooksChartReport(
  options: GenerateAllBooksChartOptions = { embedImages: true }
): Promise<string> {
  const rows = await getAllBooksPriceHistory();

  if (rows.length === 0) {
    throw new Error('No hay historial suficiente para generar el reporte global.');
  }

  const books = groupHistoryByBook(rows);
  const preparedBooks = options.embedImages !== false ? await embedBookImages(books) : books;
  const html = buildHtml(preparedBooks, options);

  const outputDir = path.resolve('./reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(
    outputDir,
    options.outputFileName ?? 'historico_todos_los_libros.html'
  );
  fs.writeFileSync(outputPath, html, 'utf8');

  return outputPath;
}

async function main() {
  const outputPath = await generateAllBooksChartReport();

  console.log(`Reporte global generado en: ${outputPath}`);
}

function groupHistoryByBook(rows: HistoryRow[]): BookHistory[] {
  const booksMap = new Map<number, BookHistory>();

  for (const row of rows) {
    const existing = booksMap.get(row.bookId);
    const formattedScrapedAt = formatCdmxDateTime(row.scrapedAt);

    if (!existing) {
      booksMap.set(row.bookId, {
        bookId: row.bookId,
        title: row.title,
        author: row.author,
        productUrl: row.productUrl,
        imageUrl: row.imageUrl,
        reportImageSrc: createCoverPlaceholderDataUrl(row.title),
        currency: row.currency ?? 'MXN',
        labels: [formattedScrapedAt],
        listPrices: [row.listPrice],
        discountedPrices: [row.discountedPrice],
        discountPercents: [row.discountPercent],
        currentListPrice: row.listPrice,
        currentDiscountedPrice: row.discountedPrice,
        currentDiscountPercent: row.discountPercent,
        historicalMinDiscountedPrice: row.discountedPrice,
        historicalMaxDiscountedPrice: row.discountedPrice,
        lastScrapedAt: formattedScrapedAt,
      });
      continue;
    }

    existing.labels.push(formattedScrapedAt);
    existing.listPrices.push(row.listPrice);
    existing.discountedPrices.push(row.discountedPrice);
    existing.discountPercents.push(row.discountPercent);
    existing.currency = row.currency ?? existing.currency;
    existing.currentListPrice = row.listPrice;
    existing.currentDiscountedPrice = row.discountedPrice;
    existing.currentDiscountPercent = row.discountPercent;
    existing.lastScrapedAt = formattedScrapedAt;

    if (row.discountedPrice !== null) {
      existing.historicalMinDiscountedPrice =
        existing.historicalMinDiscountedPrice === null
          ? row.discountedPrice
          : Math.min(existing.historicalMinDiscountedPrice, row.discountedPrice);

      existing.historicalMaxDiscountedPrice =
        existing.historicalMaxDiscountedPrice === null
          ? row.discountedPrice
          : Math.max(existing.historicalMaxDiscountedPrice, row.discountedPrice);
    }
  }

  return [...booksMap.values()].sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

async function embedBookImages(books: BookHistory[]): Promise<BookHistory[]> {
  return Promise.all(
    books.map(async (book) => {
      if (!book.imageUrl) {
        return book;
      }

      const embeddedImage = await fetchImageAsDataUrl(book.imageUrl);

      return {
        ...book,
        reportImageSrc: embeddedImage ?? book.reportImageSrc,
      };
    })
  );
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: 'https://www.buscalibre.com.mx/',
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

function createCoverPlaceholderDataUrl(title: string): string {
  const safeTitle = escapeHtml(title).slice(0, 28);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="184" height="256" viewBox="0 0 184 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8ead1"/>
      <stop offset="100%" stop-color="#ead7b8"/>
    </linearGradient>
  </defs>
  <rect width="184" height="256" rx="18" fill="url(#bg)"/>
  <rect x="18" y="18" width="148" height="220" rx="12" fill="#fffaf1" stroke="#d9c5a2"/>
  <rect x="34" y="40" width="116" height="12" rx="6" fill="#d6b98a"/>
  <rect x="34" y="64" width="92" height="8" rx="4" fill="#ead7b8"/>
  <rect x="34" y="130" width="116" height="64" rx="10" fill="#f2e5cf"/>
  <text x="92" y="222" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#7b5d32">${safeTitle}</text>
</svg>`.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildHtml(books: BookHistory[], options: GenerateAllBooksChartOptions): string {
  const generatedAt = new Date().toLocaleString('es-MX');
  const useSelfContainedCharts = options.selfContainedCharts === true;
  const chartData = books.map((book) => ({
    bookId: book.bookId,
    labels: book.labels.map((label) => shortenDateForAxis(label)),
    mobileLabels: book.labels.map((label) => shortenDateForAxis(label)),
    listPrices: book.listPrices,
    discountedPrices: book.discountedPrices,
    discountPercents: book.discountPercents,
    title: book.title,
    currentDiscountPercent: book.currentDiscountPercent,
  }));
  const chartScriptTag = useSelfContainedCharts
    ? ''
    : '<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>';
  const chartRendererScript = useSelfContainedCharts
    ? getSelfContainedChartRendererScript()
    : getChartJsRendererScript();

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Histórico global de libros</title>
  ${chartScriptTag}
  <style>
    :root {
      --bg: #f4f1ea;
      --card: #fffdf8;
      --text: #2d241f;
      --muted: #76675d;
      --border: #e7ddd1;
      --accent: #b45309;
      --accent-soft: #f59e0b;
      --line: #0f766e;
      --line-soft: #5eead4;
      --shadow: 0 14px 40px rgba(45, 36, 31, 0.08);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(245, 158, 11, 0.12), transparent 28%),
        radial-gradient(circle at top right, rgba(15, 118, 110, 0.12), transparent 24%),
        var(--bg);
      color: var(--text);
    }

    .container {
      max-width: 1500px;
      margin: 0 auto;
      padding: 24px;
    }

    .hero {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 28px;
      box-shadow: var(--shadow);
      margin-bottom: 24px;
    }

    .hero h1 {
      margin: 0 0 8px;
      font-size: 34px;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
    }

    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 18px;
    }

    .summary-chip {
      background: #fff5df;
      color: #8a4b08;
      border: 1px solid #f3d7a4;
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 14px;
    }

    .filters {
      display: grid;
      grid-template-columns: minmax(220px, 1.6fr) minmax(220px, 1fr) minmax(220px, 1fr);
      gap: 12px;
      margin-top: 18px;
      padding: 16px;
      background: linear-gradient(180deg, #fffaf1 0%, #fffdf8 100%);
      border: 1px solid var(--border);
      border-radius: 20px;
    }

    .control {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .control label {
      font-size: 13px;
      color: var(--muted);
      font-weight: bold;
    }

    .control input,
    .control select {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px 14px;
      font: inherit;
      color: var(--text);
      background: #fffdf9;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }

    .control input::placeholder {
      color: #a08f82;
    }

    .control input:focus,
    .control select:focus {
      outline: none;
      border-color: rgba(180, 83, 9, 0.45);
      box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.14);
      background: #ffffff;
    }

    .control select {
      appearance: none;
      cursor: pointer;
      padding-right: 44px;
      background-image:
        linear-gradient(45deg, transparent 50%, #8a4b08 50%),
        linear-gradient(135deg, #8a4b08 50%, transparent 50%),
        linear-gradient(180deg, #fffdf9 0%, #fff7eb 100%);
      background-position:
        calc(100% - 22px) calc(50% - 3px),
        calc(100% - 16px) calc(50% - 3px),
        0 0;
      background-size:
        6px 6px,
        6px 6px,
        100% 100%;
      background-repeat: no-repeat;
    }

    .results-count {
      margin-top: 14px;
      color: var(--muted);
      font-size: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px 16px;
      align-items: center;
      justify-content: space-between;
    }

    .footer-note {
      color: var(--accent);
      font-weight: bold;
    }

    .books-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 20px;
    }

    .book-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 22px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .book-top {
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 16px;
      padding: 20px 20px 0;
    }

    .cover {
      width: 92px;
      height: 128px;
      object-fit: cover;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: #efe7dc;
    }

    .cover.placeholder {
      display: block;
    }

    .book-title {
      margin: 0 0 8px;
      font-size: 20px;
      line-height: 1.2;
    }

    .book-meta {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }

    .last-seen-mobile {
      display: none;
    }

    .book-meta a {
      color: var(--accent);
      text-decoration: none;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      padding: 18px 20px;
    }

    .stat {
      background: #fffaf1;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 12px;
    }

    .stat-label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stat-value {
      font-size: 18px;
      font-weight: bold;
    }

    .chart-wrap {
      padding: 0 20px 20px;
    }

    .chart-block {
      background: #fff;
      border-top: 1px solid var(--border);
      padding-top: 18px;
      position: relative;
    }

    .chart-tooltip {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translate(-50%, -4px);
      max-width: min(220px, calc(100% - 24px));
      background: rgba(45, 36, 31, 0.92);
      color: #fffdf8;
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      line-height: 1.35;
      box-shadow: 0 10px 24px rgba(45, 36, 31, 0.2);
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
      pointer-events: none;
      z-index: 2;
      text-align: center;
    }

    .chart-tooltip.visible {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    canvas {
      width: 100% !important;
      height: 260px !important;
    }

    @media (max-width: 720px) {
      .container {
        padding: 16px;
      }

      .hero h1 {
        font-size: 28px;
      }

      .filters {
        grid-template-columns: 1fr;
      }

      .books-grid {
        grid-template-columns: 1fr;
      }

      .last-seen-desktop {
        display: none;
      }

      .last-seen-mobile {
        display: inline;
      }

      .stats {
        gap: 8px;
        padding: 12px 14px;
      }

      .stat {
        padding: 10px;
      }

      .stat-label {
        font-size: 11px;
      }

      .stat-value {
        font-size: 16px;
      }

      .chart-wrap {
        padding: 0 10px 14px;
      }

    .chart-block {
      padding-top: 10px;
    }

    .chart-legend {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      padding: 0 0 10px;
      color: var(--muted);
      font-size: 12px;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      display: inline-block;
    }

      canvas {
        height: 320px !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <section class="hero">
      <h1>Histórico global de libros</h1>
      <p>Reporte generado el ${escapeHtml(generatedAt)}. Cada tarjeta muestra el precio actual y su evolución histórica.</p>
      <div class="summary">
        <div class="summary-chip">Libros con historial: ${books.length}</div>
        <div class="summary-chip">Total de snapshots: ${books.reduce((acc, book) => acc + book.labels.length, 0)}</div>
      </div>
      <div class="filters">
        <div class="control">
          <label for="searchInput">Buscar por nombre</label>
          <input id="searchInput" type="search" placeholder="Escribe el título del libro" />
        </div>
        <div class="control">
          <label for="sortSelect">Ordenar por</label>
          <select id="sortSelect">
            <option value="title">Nombre</option>
            <option value="discount_desc">Mayor descuento actual</option>
          </select>
        </div>
        <div class="control">
          <label for="priceFilterSelect">Filtrar por precio actual</label>
          <select id="priceFilterSelect">
            <option value="all">Todos</option>
            <option value="500">Menor de $500</option>
            <option value="600">Menor de $600</option>
            <option value="700">Menor de $700</option>
          </select>
        </div>
      </div>
      <div class="results-count">
        <span id="resultsCount">Mostrando ${books.length} libros</span>
        <span class="footer-note">Made with love for Alicia ❤️</span>
      </div>
    </section>

    <section id="booksGrid" class="books-grid">
      ${books.map((book) => `
        <article
          class="book-card"
          data-title="${escapeHtml(book.title.toLocaleLowerCase('es-MX'))}"
          data-discount="${book.currentDiscountPercent ?? Number.NEGATIVE_INFINITY}"
          data-price="${book.currentDiscountedPrice ?? Number.POSITIVE_INFINITY}"
        >
          <div class="book-top">
            ${
              book.reportImageSrc
                ? `<img class="cover" src="${escapeHtml(book.reportImageSrc)}" alt="${escapeHtml(book.title)}" />`
                : `<div class="cover placeholder"></div>`
            }
            <div>
              <h2 class="book-title">${escapeHtml(book.title)}</h2>
              <div class="book-meta">
                ${escapeHtml(book.author ?? 'Autor desconocido')}<br />
                <span class="last-seen-desktop">Último registro: ${escapeHtml(book.lastScrapedAt)}</span>
                <span class="last-seen-mobile">Último: ${escapeHtml(shortenDateToDay(book.lastScrapedAt))}</span><br />
                ${
                  book.productUrl
                    ? `<a href="${escapeHtml(book.productUrl)}" target="_blank" rel="noopener noreferrer">Abrir libro</a>`
                    : ''
                }
              </div>
            </div>
          </div>

          <div class="stats">
            <div class="stat">
              <span class="stat-label">Precio actual</span>
              <span class="stat-value">${formatMoney(book.currentDiscountedPrice, book.currency)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Precio lista actual</span>
              <span class="stat-value">${formatMoney(book.currentListPrice, book.currency)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Mínimo histórico</span>
              <span class="stat-value">${formatMoney(book.historicalMinDiscountedPrice, book.currency)}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Descuento actual</span>
              <span class="stat-value">${formatPercent(book.currentDiscountPercent)}</span>
            </div>
          </div>

          <div class="chart-wrap">
            <div class="chart-block">
              <div class="chart-legend">
                <span class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span>Precio lista</span>
                <span class="legend-item"><span class="legend-dot" style="background:#0f766e"></span>Precio con descuento</span>
              </div>
              <div class="chart-tooltip" id="tooltip-book-${book.bookId}"></div>
              <canvas id="chart-book-${book.bookId}"></canvas>
            </div>
          </div>
        </article>
      `).join('')}
    </section>
  </div>

  <script>
    const books = ${JSON.stringify(chartData)};
    const booksGrid = document.getElementById('booksGrid');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const priceFilterSelect = document.getElementById('priceFilterSelect');
    const resultsCount = document.getElementById('resultsCount');

    function normalizeText(value) {
      return value
        .toLocaleLowerCase('es-MX')
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '');
    }

    function updateResultsCount() {
      const visibleCards = booksGrid
        ? [...booksGrid.querySelectorAll('.book-card')].filter((card) => card.style.display !== 'none').length
        : 0;

      if (resultsCount) {
        resultsCount.textContent = 'Mostrando ' + visibleCards + ' libros';
      }
    }

    function applyFilters() {
      if (!booksGrid) return;

      const query = normalizeText(searchInput?.value ?? '');
      const priceLimit = priceFilterSelect?.value ?? 'all';
      const cards = [...booksGrid.querySelectorAll('.book-card')];

      for (const card of cards) {
        const title = normalizeText(card.dataset.title ?? '');
        const price = Number(card.dataset.price ?? 'Infinity');
        const matchesSearch = title.includes(query);
        const matchesPrice = priceLimit === 'all' ? true : price < Number(priceLimit);
        const matches = matchesSearch && matchesPrice;
        card.style.display = matches ? '' : 'none';
      }

      const visibleCards = cards.filter((card) => card.style.display !== 'none');
      const sortMode = sortSelect?.value ?? 'title';

      visibleCards.sort((a, b) => {
        if (sortMode === 'discount_desc') {
          return Number(b.dataset.discount ?? '-Infinity') - Number(a.dataset.discount ?? '-Infinity');
        }

        return (a.dataset.title ?? '').localeCompare(b.dataset.title ?? '', 'es');
      });

      for (const card of visibleCards) {
        booksGrid.appendChild(card);
      }

      updateResultsCount();
    }

    searchInput?.addEventListener('input', applyFilters);
    sortSelect?.addEventListener('change', applyFilters);
    priceFilterSelect?.addEventListener('change', applyFilters);
    applyFilters();

    ${chartRendererScript}
  </script>
</body>
</html>
  `.trim();
}

function getChartJsRendererScript(): string {
  return `
    for (const book of books) {
      const ctx = document.getElementById(\`chart-book-\${book.bookId}\`);
      if (!ctx) continue;

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: window.innerWidth <= 720 ? book.mobileLabels : book.labels,
          datasets: [
            {
              label: 'Precio lista',
              data: book.listPrices,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.18)',
              tension: 0.25,
              spanGaps: true
            },
            {
              label: 'Precio actual / descuento',
              data: book.discountedPrices,
              borderColor: '#0f766e',
              backgroundColor: 'rgba(15, 118, 110, 0.2)',
              tension: 0.25,
              spanGaps: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          elements: {
            point: {
              radius: window.innerWidth <= 720 ? 0 : 2,
              hoverRadius: window.innerWidth <= 720 ? 4 : 5
            }
          },
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              ticks: {
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: window.innerWidth <= 720 ? 4 : 8,
                color: '#76675d',
                padding: 8,
                font: {
                  size: window.innerWidth <= 720 ? 11 : 12
                },
                callback: function(value, index, ticks) {
                  const label = this.getLabelForValue(value);

                  if (window.innerWidth > 720) {
                    return label;
                  }

                  if (ticks.length <= 4) {
                    return label;
                  }

                  const step = Math.max(1, Math.ceil((ticks.length - 1) / 3));
                  const isFirst = index === 0;
                  const isLast = index === ticks.length - 1;
                  const isStep = index % step === 0;

                  return isFirst || isLast || isStep ? label : '';
                }
              },
              grid: {
                display: window.innerWidth > 720
              }
            },
            y: {
              grid: {
                color: 'rgba(118, 103, 93, 0.14)'
              }
            }
          }
        }
      });
    }
  `.trim();
}

function getSelfContainedChartRendererScript(): string {
  return `
    function compactCurrency(value) {
      return new Intl.NumberFormat('es-MX', {
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(value);
    }

    function getVisibleXTickIndexes(total) {
      if (total <= 1) return [0];
      if (window.innerWidth <= 720) {
        return Array.from(new Set([0, Math.floor((total - 1) / 2), total - 1]));
      }

      const maxTicks = Math.min(6, total);
      const step = Math.max(1, Math.ceil((total - 1) / (maxTicks - 1)));
      const indexes = [];
      for (let i = 0; i < total; i += step) indexes.push(i);
      if (indexes[indexes.length - 1] !== total - 1) indexes.push(total - 1);
      return indexes;
    }

    function drawDataset(ctx, points, color, activePointIndex) {
      const visible = points.filter((point) => point !== null);
      if (visible.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;

      let started = false;
      for (const point of points) {
        if (!point) {
          started = false;
          continue;
        }

        if (!started) {
          ctx.moveTo(point.x, point.y);
          started = true;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }

      ctx.stroke();

      for (const [index, point] of points.entries()) {
        if (!point) continue;

        ctx.beginPath();
        ctx.fillStyle = color;
        const radius = activePointIndex === index
          ? (window.innerWidth <= 720 ? 5 : 5.5)
          : (window.innerWidth <= 720 ? 3.5 : 4);
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = '#fffdf8';
        ctx.lineWidth = 1.5;
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function renderChart(canvas, labels, datasets, activeSelection) {
      const parentWidth = canvas.parentElement?.clientWidth ?? 320;
      const cssHeight = window.innerWidth <= 720 ? 320 : 260;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(parentWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, parentWidth, cssHeight);

      const padding = { top: 16, right: 12, bottom: 34, left: 42 };
      const chartWidth = parentWidth - padding.left - padding.right;
      const chartHeight = cssHeight - padding.top - padding.bottom;

      const allValues = datasets.flatMap((dataset) => dataset.data).filter((value) => typeof value === 'number');
      if (allValues.length === 0 || chartWidth <= 0 || chartHeight <= 0) return;

      const minValue = Math.min(...allValues);
      const maxValue = Math.max(...allValues);
      const range = Math.max(maxValue - minValue, 1);
      const yMin = Math.max(0, minValue - range * 0.12);
      const yMax = maxValue + range * 0.12;

      ctx.font = window.innerWidth <= 720 ? '11px Arial' : '12px Arial';
      ctx.fillStyle = '#76675d';
      ctx.strokeStyle = 'rgba(118, 103, 93, 0.14)';

      for (let i = 0; i <= 4; i += 1) {
        const y = padding.top + (chartHeight / 4) * i;
        const value = yMax - ((y - padding.top) / chartHeight) * (yMax - yMin);

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(compactCurrency(value), padding.left - 8, y);
      }

      const tickIndexes = getVisibleXTickIndexes(labels.length);
      for (const index of tickIndexes) {
        const x =
          labels.length === 1
            ? padding.left + chartWidth / 2
            : padding.left + (chartWidth * index) / (labels.length - 1);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(labels[index] ?? '', x, padding.top + chartHeight + 10);
      }

      const datasetPoints = datasets.map((dataset, datasetIndex) =>
        dataset.data.map((value, index) => {
          if (typeof value !== 'number') return null;

          const x =
            labels.length === 1
              ? padding.left + chartWidth / 2
              : padding.left + (chartWidth * index) / (labels.length - 1);
          const y = padding.top + ((yMax - value) / (yMax - yMin)) * chartHeight;
          return { x, y, value, label: labels[index], datasetIndex, index };
        })
      );

      drawDataset(ctx, datasetPoints[0], '#f59e0b', activeSelection?.datasetIndex === 0 ? activeSelection.index : -1);
      drawDataset(ctx, datasetPoints[1], '#0f766e', activeSelection?.datasetIndex === 1 ? activeSelection.index : -1);

      return datasetPoints;
    }

    function formatTooltipMoney(value) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 2
      }).format(value);
    }

    function updateTooltip(bookId, point) {
      const tooltip = document.getElementById(\`tooltip-book-\${bookId}\`);
      if (!tooltip) return;

      if (!point) {
        tooltip.classList.remove('visible');
        tooltip.textContent = '';
        return;
      }

      const label = point.datasetIndex === 0 ? 'Precio lista' : 'Precio con descuento';
      tooltip.innerHTML = '<strong>' + label + '</strong><br />' + point.label + '<br />' + formatTooltipMoney(point.value);
      tooltip.classList.add('visible');
    }

    function findNearestPoint(datasetPoints, x, y) {
      let bestPoint = null;
      let bestDistance = Infinity;

      for (const dataset of datasetPoints) {
        for (const point of dataset) {
          if (!point) continue;
          const distance = Math.hypot(point.x - x, point.y - y);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPoint = point;
          }
        }
      }

      return bestDistance <= 28 ? bestPoint : null;
    }

    function renderAllCharts() {
      for (const book of books) {
        const canvas = document.getElementById(\`chart-book-\${book.bookId}\`);
        if (!canvas) continue;

        const activeSelection = canvas._activeSelection ?? null;
        const datasetPoints = renderChart(
          canvas,
          window.innerWidth <= 720 ? book.mobileLabels : book.labels,
          [
            { data: book.listPrices },
            { data: book.discountedPrices }
          ],
          activeSelection
        );

        if (!canvas.dataset.boundTooltip) {
          const handlePointer = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            const nearest = findNearestPoint(datasetPoints, x, y);
            const currentSelection = canvas._activeSelection ?? null;
            const isSamePoint =
              nearest &&
              currentSelection &&
              nearest.datasetIndex === currentSelection.datasetIndex &&
              nearest.index === currentSelection.index;

            canvas._activeSelection = nearest && !isSamePoint
              ? { datasetIndex: nearest.datasetIndex, index: nearest.index }
              : null;

            updateTooltip(book.bookId, nearest && !isSamePoint ? nearest : null);
            renderAllCharts();
          };

          canvas.addEventListener('click', (event) => {
            handlePointer(event.clientX, event.clientY);
          });

          canvas.addEventListener('touchstart', (event) => {
            const touch = event.touches[0];
            if (!touch) return;
            handlePointer(touch.clientX, touch.clientY);
          }, { passive: true });

          canvas.dataset.boundTooltip = 'true';
        }
      }
    }

    renderAllCharts();
    window.addEventListener('resize', renderAllCharts);
  `.trim();
}

function formatMoney(value: number | null, currency: string): string {
  if (value === null) return 'N/D';

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/D';
  return `${value.toFixed(2)}%`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatCdmxDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function shortenDateToDay(value: string): string {
  const [datePart] = value.split(', ');

  if (!datePart) {
    return value;
  }

  const compactDate = datePart.replace(/\sde\s/gi, ' ').replace(/\s+/g, ' ').trim();
  const dayMatch = compactDate.match(/^\d{1,2}/);
  return dayMatch ? dayMatch[0] : compactDate;
}

function shortenDateForAxis(value: string): string {
  const [datePart] = value.split(', ');

  if (!datePart) {
    return value;
  }

  return datePart.replace(/\sde\s/gi, ' ').replace(/\s+/g, ' ').trim();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Error al generar el reporte global:', error);
    process.exit(1);
  });
}
