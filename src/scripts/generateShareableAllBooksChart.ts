import '../config/loadEnv';
import { generateAllBooksChartReport } from './generateAllBooksChart';

async function main() {
  const outputPath = await generateAllBooksChartReport({
    embedImages: true,
    selfContainedCharts: true,
    outputFileName: 'historico_todos_los_libros_compartible.html',
  });

  console.log(`Reporte global compartible generado en: ${outputPath}`);
}

main().catch((error) => {
  console.error('Error al generar el reporte global compartible:', error);
  process.exit(1);
});
