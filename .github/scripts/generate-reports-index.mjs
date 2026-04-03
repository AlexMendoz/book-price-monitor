import { promises as fs } from 'node:fs';
import path from 'node:path';

const reportsDir = path.resolve(process.cwd(), 'reports');

function humanize(fileName) {
  return fileName
    .replace(/\.html$/i, '')
    .replaceAll('_', ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function main() {
  const entries = await fs.readdir(reportsDir, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map((entry) => entry.name)
    .filter((file) => file.toLowerCase() !== 'index.html')
    .sort((a, b) => a.localeCompare(b, 'es'));

  const items = htmlFiles
    .map((file) => {
      const label = escapeHtml(humanize(file));
      const href = encodeURI(file);
      return `<li><a href="${href}">${label}</a></li>`;
    })
    .join('\n      ');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Book Price Monitor - Reportes</title>
  <style>
    :root {
      color-scheme: light;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      background: #f4f6f8;
      color: #1f2937;
    }

    main {
      max-width: 900px;
      margin: 48px auto;
      padding: 0 16px;
    }

    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
      padding: 24px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }

    p {
      margin: 0 0 20px;
      color: #4b5563;
    }

    ul {
      margin: 0;
      padding-left: 20px;
      display: grid;
      gap: 10px;
    }

    a {
      color: #0f766e;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <h1>Reportes de Book Price Monitor</h1>
      <p>Selecciona un reporte para abrirlo:</p>
      <ul>
      ${items || '<li>No hay reportes HTML disponibles todavía.</li>'}
      </ul>
    </section>
  </main>
</body>
</html>
`;

  await fs.writeFile(path.join(reportsDir, 'index.html'), html, 'utf8');
  console.log(`index.html generado con ${htmlFiles.length} reportes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
