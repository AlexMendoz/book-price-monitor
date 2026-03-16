import 'dotenv/config';
import { getDealRanking } from '../services/rankingService';

async function main() {
  const ranking = await getDealRanking();

  if (ranking.length === 0) {
    console.log('No hay datos suficientes para generar ranking.');
    return;
  }

  console.log('\n=== RANKING DE OFERTAS ===\n');

  ranking.forEach((item, index) => {
    const badges: string[] = [];

    if (item.isHistoricalLow) badges.push('🏆 mínimo histórico');
    if ((item.dropVsPrevious ?? 0) > 0) badges.push('⬇️ bajó');
    if (item.hasHighDiscount) badges.push('🔥 descuento alto');
    if (item.looksLikeInflatedBasePrice) badges.push('⚠️ sospechoso');

    console.log(`${index + 1}. ${item.title}`);
    console.log(`   Autor: ${item.author ?? 'Autor desconocido'}`);
    console.log(`   Score: ${item.dealScore}`);
    console.log(
      `   Actual: ${formatMoney(item.currentDiscountedPrice, item.currency)} | Lista: ${formatMoney(item.currentListPrice, item.currency)} | Descuento: ${formatPercent(item.currentDiscountPercent)}`
    );
    console.log(
      `   Anterior: ${formatMoney(item.previousDiscountedPrice, item.currency)} | Mínimo histórico: ${formatMoney(item.historicalMinDiscountedPrice, item.currency)}`
    );
    console.log(
      `   Cambio vs anterior: ${formatSignedMoney(item.dropVsPrevious, item.currency)} | Ahorro % vs anterior: ${formatPercent(item.savingsVsPreviousPercent)}`
    );

    if (badges.length > 0) {
      console.log(`   Indicadores: ${badges.join(' · ')}`);
    }

    if (item.productUrl) {
      console.log(`   URL: ${item.productUrl}`);
    }

    console.log('');
  });
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

main().catch((error) => {
  console.error('Error al generar ranking:', error);
  process.exit(1);
});