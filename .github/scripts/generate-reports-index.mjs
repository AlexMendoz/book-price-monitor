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
      const isGlobal =
        file === 'historico_todos_los_libros_compartible.html' ||
        file === 'historico_todos_los_libros.html';
      const badge = isGlobal ? '<span class="report-badge">Global</span>' : '';
      return `<li class="report-item">
        <a class="report-link" href="${href}">
          <span class="report-title">${label}</span>
          <span class="report-meta">
            ${badge}
            <span class="report-open">Abrir</span>
          </span>
        </a>
      </li>`;
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
      --bg: #f5f8f6;
      --surface: #ffffff;
      --surface-2: #f7fbf9;
      --text: #132822;
      --muted: #4f6b62;
      --brand: #0f766e;
      --brand-soft: #d6f1ec;
      --border: #dbe8e3;
      --shadow: 0 16px 42px rgba(9, 48, 41, 0.12);
    }

    body {
      font-family: 'Avenir Next', 'Montserrat', 'Segoe UI', sans-serif;
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(900px 360px at 0% -10%, #dbf4ec 0%, transparent 60%),
        radial-gradient(900px 360px at 100% -10%, #e4f5ef 0%, transparent 60%),
        var(--bg);
      color: var(--text);
    }

    main {
      max-width: 900px;
      margin: 48px auto;
      padding: 0 16px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      box-shadow: var(--shadow);
      padding: 28px;
    }

    h1 {
      margin: 0 0 10px;
      font-size: clamp(24px, 3vw, 34px);
      letter-spacing: 0.2px;
    }

    p {
      margin: 0 0 22px;
      color: var(--muted);
      font-size: 15px;
    }

    .reports-count {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--muted);
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px 12px;
      margin-bottom: 16px;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 12px;
    }

    .report-link {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      border-radius: 14px;
      color: var(--text);
      text-decoration: none;
      transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background 140ms ease;
    }

    .report-link:hover {
      transform: translateY(-1px);
      border-color: #c5dbd3;
      box-shadow: 0 8px 18px rgba(13, 84, 73, 0.12);
      background: #f1faf7;
    }

    .report-title {
      font-weight: 600;
      line-height: 1.35;
    }

    .report-meta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .report-badge {
      background: var(--brand-soft);
      color: #0c5e57;
      border: 1px solid #bde3da;
      padding: 4px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }

    .report-open {
      color: var(--brand);
      font-weight: 700;
      font-size: 13px;
    }

    @media (max-width: 640px) {
      main {
        margin: 22px auto;
      }

      .card {
        padding: 18px;
      }

      .report-link {
        flex-direction: column;
        align-items: flex-start;
      }

      .report-meta {
        width: 100%;
        justify-content: space-between;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <h1>Reportes de Book Price Monitor</h1>
      <p>Selecciona un reporte para abrirlo:</p>
      <div class="reports-count">${htmlFiles.length} reportes disponibles</div>
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
