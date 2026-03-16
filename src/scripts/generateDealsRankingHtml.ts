import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { getDealRanking } from '../services/rankingService';

async function main() {
  const ranking = await getDealRanking();

  if (ranking.length === 0) {
    console.log('No hay datos suficientes para generar el ranking HTML.');
    return;
  }

  const html = buildHtml(ranking);

  const outputDir = path.resolve('./reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'ranking_ofertas.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log(`Ranking HTML generado en: ${outputPath}`);
}

function buildHtml(
  ranking: Awaited<ReturnType<typeof getDealRanking>>
): string {
  const generatedAt = new Date().toLocaleString('es-MX');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ranking de ofertas</title>
  <style>
    :root {
      --bg: #f5f7fb;
      --card: #ffffff;
      --text: #1f2937;
      --muted: #6b7280;
      --border: #e5e7eb;
      --good: #166534;
      --warn: #92400e;
      --bad: #991b1b;
      --chip: #eef2ff;
      --shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    .header {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: var(--shadow);
      margin-bottom: 24px;
    }

    .title {
      margin: 0 0 8px;
      font-size: 32px;
    }

    .subtitle {
      margin: 0;
      color: var(--muted);
      font-size: 15px;
    }

    .summary {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .summary-chip {
      background: var(--chip);
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 14px;
    }

    .table-wrapper {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: var(--shadow);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead th {
      text-align: left;
      font-size: 13px;
      color: var(--muted);
      background: #f9fafb;
      padding: 14px;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
    }

    tbody td {
      padding: 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      font-size: 14px;
    }

    tbody tr:hover {
      background: #fafafa;
    }

    .rank {
      font-weight: bold;
      font-size: 18px;
      min-width: 40px;
    }

    .book-cell {
      display: flex;
      gap: 14px;
      min-width: 280px;
    }

    .cover {
      width: 70px;
      min-width: 70px;
      height: 100px;
      border-radius: 10px;
      object-fit: cover;
      border: 1px solid var(--border);
      background: #f3f4f6;
    }

    .book-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .book-title {
      font-weight: bold;
      font-size: 15px;
      line-height: 1.3;
    }

    .book-author {
      color: var(--muted);
      font-size: 13px;
    }

    .book-link a {
      color: #2563eb;
      text-decoration: none;
      font-size: 13px;
    }

    .score {
      font-weight: bold;
      font-size: 18px;
    }

    .money {
      white-space: nowrap;
    }

    .badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-block;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: bold;
      white-space: nowrap;
    }

    .badge.good {
      background: #dcfce7;
      color: var(--good);
    }

    .badge.warn {
      background: #fef3c7;
      color: var(--warn);
    }

    .badge.bad {
      background: #fee2e2;
      color: var(--bad);
    }

    .muted {
      color: var(--muted);
    }

    .positive {
      color: var(--good);
      font-weight: bold;
    }

    .negative {
      color: var(--bad);
      font-weight: bold;
    }

    .neutral {
      color: var(--muted);
    }

    @media (max-width: 1100px) {
      .table-wrapper {
        overflow-x: auto;
      }

      table {
        min-width: 1200px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <section class="header">
      <h1 class="title">Ranking de ofertas</h1>
      <p class="subtitle">Generado el ${escapeHtml(generatedAt)}</p>

      <div class="summary">
        <div class="summary-chip">Libros evaluados: ${ranking.length}</div>
        <div class="summary-chip">Mínimos históricos: ${ranking.filter(x => x.isHistoricalLow).length}</div>
        <div class="summary-chip">Descuento alto: ${ranking.filter(x => x.hasHighDiscount).length}</div>
        <div class="summary-chip">Sospechosos: ${ranking.filter(x => x.looksLikeInflatedBasePrice).length}</div>
      </div>
    </section>

    <section class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Libro</th>
            <th>Score</th>
            <th>Precio actual</th>
            <th>Precio lista</th>
            <th>Precio anterior</th>
            <th>Mín. histórico</th>
            <th>Descuento</th>
            <th>Cambio vs anterior</th>
            <th>Indicadores</th>
          </tr>
        </thead>
        <tbody>
          ${ranking.map((item, index) => {
            const badges = [];

            if (item.isHistoricalLow) {
              badges.push(`<span class="badge good">🏆 Mínimo histórico</span>`);
            }

            if ((item.dropVsPrevious ?? 0) > 0) {
              badges.push(`<span class="badge good">⬇️ Bajó</span>`);
            }

            if (item.hasHighDiscount) {
              badges.push(`<span class="badge warn">🔥 Descuento alto</span>`);
            }

            if (item.looksLikeInflatedBasePrice) {
              badges.push(`<span class="badge bad">⚠️ Sospechoso</span>`);
            }

            return `
              <tr>
                <td class="rank">${index + 1}</td>
                <td>
                  <div class="book-cell">
                    ${
                      item.imageUrl
                        ? `<img class="cover" src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" />`
                        : `<div class="cover"></div>`
                    }
                    <div class="book-meta">
                      <div class="book-title">${escapeHtml(item.title)}</div>
                      <div class="book-author">${escapeHtml(item.author ?? 'Autor desconocido')}</div>
                      ${
                        item.productUrl
                          ? `<div class="book-link"><a href="${escapeHtml(item.productUrl)}" target="_blank" rel="noopener noreferrer">Abrir libro</a></div>`
                          : ''
                      }
                    </div>
                  </div>
                </td>
                <td class="score">${item.dealScore.toFixed(2)}</td>
                <td class="money">${formatMoney(item.currentDiscountedPrice, item.currency)}</td>
                <td class="money">${formatMoney(item.currentListPrice, item.currency)}</td>
                <td class="money">${formatMoney(item.previousDiscountedPrice, item.currency)}</td>
                <td class="money">${formatMoney(item.historicalMinDiscountedPrice, item.currency)}</td>
                <td>${formatPercent(item.currentDiscountPercent)}</td>
                <td class="${getChangeClass(item.dropVsPrevious)}">${formatSignedMoney(item.dropVsPrevious, item.currency)}</td>
                <td>
                  <div class="badges">
                    ${badges.length > 0 ? badges.join('') : '<span class="muted">Sin indicadores</span>'}
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </section>
  </div>
</body>
</html>
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

function formatSignedMoney(value: number | null, currency: string): string {
  if (value === null) return 'N/D';

  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  return value > 0 ? `-${formatted}` : value < 0 ? `+${formatted}` : formatted;
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/D';
  return `${value.toFixed(2)}%`;
}

function getChangeClass(value: number | null): string {
  if (value === null) return 'neutral';
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

main().catch((error) => {
  console.error('Error al generar el ranking HTML:', error);
  process.exit(1);
});