import '../config/loadEnv';
import fs from 'node:fs';
import path from 'node:path';
import { getBookPriceHistory } from '../services/reportService';

async function main() {
  const bookIdArg = process.argv[2];

  if (!bookIdArg) {
    throw new Error('Debes pasar el bookId. Ejemplo: npm run chart -- 1');
  }

  const bookId = Number(bookIdArg);

  if (!Number.isFinite(bookId)) {
    throw new Error('El bookId debe ser numérico.');
  }

  const history = await getBookPriceHistory(bookId);

  if (history.length === 0) {
    console.log('No se encontró historial para ese libro.');
    return;
  }

  const title = history[0].title;
  const author = history[0].author ?? 'Autor desconocido';
  const currency = history[0].currency ?? 'MXN';

  const labels = history.map((row) => formatCdmxDateTime(row.scrapedAt));
  const listPrices = history.map((row) => row.listPrice);
  const discountedPrices = history.map((row) => row.discountedPrice);
  const discountPercents = history.map((row) => row.discountPercent);
  const minDiscountedPrice = discountedPrices.reduce<number | null>(
    (min, current) => {
      if (current === null) return min;
      return min === null ? current : Math.min(min, current);
    },
    null
  );
  const minDiscountedLine = discountedPrices.map((value) =>
    value === null ? null : minDiscountedPrice
  );

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Historial de precios - ${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 24px;
      background: #f7f7f7;
      color: #222;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    h1 {
      margin-bottom: 8px;
    }

    .meta {
      margin-bottom: 24px;
      color: #555;
    }

    .chart-block {
      margin-bottom: 36px;
    }

    canvas {
      width: 100% !important;
      max-width: 100%;
      height: 420px !important;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      font-size: 14px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }

    th {
      background: #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      Autor: ${escapeHtml(author)}<br />
      Moneda: ${escapeHtml(currency)}
    </div>

    <div class="chart-block">
      <h2>Precios</h2>
      <canvas id="priceChart"></canvas>
    </div>

    <div class="chart-block">
      <h2>Descuento (%)</h2>
      <canvas id="discountChart"></canvas>
    </div>

    <h2>Historial tabular</h2>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Precio lista</th>
          <th>Precio descuento</th>
          <th>Descuento %</th>
        </tr>
      </thead>
      <tbody>
        ${history.map(row => `
          <tr>
            <td>${escapeHtml(formatCdmxDateTime(row.scrapedAt ?? ''))}</td>
            <td>${row.listPrice ?? ''}</td>
            <td>${row.discountedPrice ?? ''}</td>
            <td>${row.discountPercent ?? ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <script>
    const labels = ${JSON.stringify(labels)};
    const listPrices = ${JSON.stringify(listPrices)};
    const discountedPrices = ${JSON.stringify(discountedPrices)};
    const minDiscountedLine = ${JSON.stringify(minDiscountedLine)};
    const discountPercents = ${JSON.stringify(discountPercents)};

    new Chart(document.getElementById('priceChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Precio lista',
            data: listPrices
          },
          {
            label: 'Precio con descuento',
            data: discountedPrices
          },
          {
            label: 'Precio mínimo histórico',
            data: minDiscountedLine,
            borderColor: '#dc2626',
            borderDash: [6, 6],
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

    new Chart(document.getElementById('discountChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Descuento %',
            data: discountPercents
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  </script>
</body>
</html>
  `.trim();

  const outputDir = path.resolve('./reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const safeFileName = sanitizeFileName(title);
  const outputPath = path.join(outputDir, `${safeFileName}.html`);

  fs.writeFileSync(outputPath, html, 'utf8');

  console.log(`Reporte generado en: ${outputPath}`);
}

function sanitizeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80);
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

main().catch((error) => {
  console.error('Error al generar la gráfica:', error);
  process.exit(1);
});
