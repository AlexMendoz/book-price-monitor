import fs from 'node:fs';
import path from 'node:path';
import { generateAllBooksChartReport } from '../scripts/generateAllBooksChart';
import { generateDealsRankingReport } from '../scripts/generateDealsRankingHtml';
import { generateBookChartReport, sanitizeFileName } from '../scripts/generateBookChart';
import { getAllBooks, getAllBooksPriceHistory } from './reportService';
import { reportsDirectory } from './historyArchiveService';

export async function buildReports(): Promise<void> {
  const output = reportsDirectory();
  await getAllBooksPriceHistory();
  fs.mkdirSync(output, { recursive: true });
  const staging = fs.mkdtempSync(path.join(path.dirname(output), '.reports-build-'));
  fs.cpSync(output, staging, { recursive: true });
  const previous = process.env.REPORTS_DIR;
  process.env.REPORTS_DIR = staging;
  try {
    await generateAllBooksChartReport();
    await generateAllBooksChartReport({ embedImages: true, selfContainedCharts: true, outputFileName: 'historico_todos_los_libros_compartible.html' });
    await generateDealsRankingReport();
    for (const book of await getAllBooks()) {
      if (fs.existsSync(path.join(staging, sanitizeFileName(book.title) + '.html'))) await generateBookChartReport(book.id);
    }
    const { prepareReportSite } = await import('./reportSite.mjs');
    const rootIndex = path.join(staging, 'root-index.tmp');
    await prepareReportSite({ reportsDir: staging, rootIndexPath: rootIndex });
    for (const file of fs.readdirSync(staging)) {
      if (file === 'root-index.tmp') continue;
      const source = path.join(staging, file), target = path.join(output, file);
      if (fs.statSync(source).isDirectory()) fs.cpSync(source, target, { recursive: true });
      else { fs.copyFileSync(source, target + '.tmp'); fs.renameSync(target + '.tmp', target); }
    }
    if (!previous) fs.copyFileSync(rootIndex, path.resolve('index.html'));
  } finally {
    if (previous === undefined) delete process.env.REPORTS_DIR; else process.env.REPORTS_DIR = previous;
    fs.rmSync(staging, { recursive: true, force: true });
  }
}
