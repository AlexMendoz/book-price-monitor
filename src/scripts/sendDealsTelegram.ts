import { formatMoney, formatSignedMoney, formatPercent, escapeHtml } from '../utils/format.cjs';
import { formatDealLines } from '../services/dealPresentation';
import '../config/loadEnv';
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
    lines.push(...formatDealLines(item), '');
  }

  await sendTelegramMessage({
    text: lines.join('\n').trim(),
  });

  console.log('Mensaje enviado a Telegram.');
}

main().catch((error) => {
  console.error('Error al enviar ranking a Telegram:', error);
  process.exit(1);
});