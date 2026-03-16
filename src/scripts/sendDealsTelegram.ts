import 'dotenv/config';
import { getDealRanking } from '../services/rankingService';
import { sendTelegramMessage } from '../services/telegramService';

async function main() {
  const ranking = await getDealRanking();

  if (ranking.length === 0) {
    console.log('No hay datos para enviar.');
    return;
  }

  const interestingDeals = ranking.filter((item) =>
    item.isHistoricalLow ||
    (item.dropVsPrevious ?? 0) > 0 ||
    item.hasHighDiscount
  );

  if (interestingDeals.length === 0) {
    console.log('No se detectaron ofertas relevantes.');
    return;
  }

  const topDeals = interestingDeals.slice(0, 5);

  const lines: string[] = [];
  lines.push('<b>📚 Ofertas detectadas en tu wishlist</b>');
  lines.push('');

  for (const item of topDeals) {
    const badges: string[] = [];

    if (item.isHistoricalLow) badges.push('🏆 mínimo histórico');
    if ((item.dropVsPrevious ?? 0) > 0) badges.push('⬇️ bajó');
    if (item.hasHighDiscount) badges.push('🔥 descuento alto');
    if (item.looksLikeInflatedBasePrice) badges.push('⚠️ sospechoso');

    lines.push(`<b>${escapeHtml(item.title)}</b>`);
    lines.push(`Autor: ${escapeHtml(item.author ?? 'Autor desconocido')}`);
    lines.push(
      `Actual: ${formatMoney(item.currentDiscountedPrice, item.currency)} | Lista: ${formatMoney(item.currentListPrice, item.currency)}`
    );
    lines.push(
      `Descuento: ${formatPercent(item.currentDiscountPercent)} | Score: ${item.dealScore.toFixed(2)}`
    );

    if (item.previousDiscountedPrice !== null) {
      lines.push(
        `Anterior: ${formatMoney(item.previousDiscountedPrice, item.currency)} | Cambio: ${formatSignedMoney(item.dropVsPrevious, item.currency)}`
      );
    }

    if (badges.length > 0) {
      lines.push(`Indicadores: ${badges.join(' · ')}`);
    }

    if (item.productUrl) {
      lines.push(`${escapeHtml(item.productUrl)}`);
    }

    lines.push('');
  }

  await sendTelegramMessage({
    text: lines.join('\n').trim(),
  });

  console.log('Mensaje enviado a Telegram.');
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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

main().catch((error) => {
  console.error('Error al enviar ranking a Telegram:', error);
  process.exit(1);
});