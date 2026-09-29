import type { RankedBookDeal } from './rankingService';
import { escapeHtml, formatMoney, formatPercent, formatSignedMoney } from '../utils/format.cjs';

export function formatDealLines(item: RankedBookDeal): string[] {
  const badges = [item.isNewHistoricalLow ? 'Nuevo minimo historico' : item.isHistoricalLow ? 'En minimo historico' : '',
    (item.dropVsPrevious ?? 0) > 0 ? 'Bajo de precio' : '', item.hasHighDiscount ? 'Descuento alto' : '',
    item.looksLikeInflatedBasePrice ? 'Descuento sospechoso' : ''].filter(Boolean);
  const lines = [`<b>${escapeHtml(item.title)}</b>`, `Autor: ${escapeHtml(item.author ?? 'Autor desconocido')}`,
    `Actual: ${formatMoney(item.currentDiscountedPrice, item.currency)} | Lista: ${formatMoney(item.currentListPrice, item.currency)}`,
    `Descuento: ${formatPercent(item.currentDiscountPercent)} | Score: ${item.dealScore.toFixed(2)}`];
  if (item.previousDiscountedPrice !== null) lines.push(`Anterior: ${formatMoney(item.previousDiscountedPrice, item.currency)} | Cambio: ${formatSignedMoney(item.dropVsPrevious, item.currency)}`);
  if (badges.length) lines.push(`Indicadores: ${badges.join(' · ')}`);
  if (item.productUrl) lines.push(escapeHtml(item.productUrl));
  return lines;
}
