import '../config/loadEnv';
import path from 'node:path';
import { importHistoryRows, readLegacyReport, reportsDirectory } from '../services/historyArchiveService';
import { generateAllBooksChartReport } from './generateAllBooksChart';

async function main() {
  const source = path.resolve(process.argv[2] ?? path.join(reportsDirectory(), 'historico_todos_los_libros.html'));
  const rows = readLegacyReport(source);
  if (!rows.length) throw new Error('No hay historial global recuperable en el reporte.');
  const imported = await importHistoryRows(rows);
  const output = await generateAllBooksChartReport();
  console.log(`Observaciones recuperadas: ${imported}. Reporte: ${output}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
