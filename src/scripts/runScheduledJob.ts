import { WISHLISTS } from '../config/wishlists';
import { scraperOptionsFromEnv } from '../config/scraperOptions';
import { syncWishlists } from '../services/wishlistSyncService';
import { buildReports } from '../services/buildReportsService';
import { withJobLock } from '../services/jobLock';
import { getAllWishlists } from '../services/reportService';
import { getDealRankingByWishlist } from '../services/rankingService';
import { splitTelegramMessage } from '../services/telegramBotApi';
import { flush, notify } from '../services/notificationOutbox.cjs';
import { formatDealLines } from '../services/dealPresentation';
import { escapeHtml } from '../utils/format.cjs';

async function runJob() {
  try { await flush(process.env); }
  catch { console.warn('No se pudo procesar la cola de avisos; se continuara con los precios.'); }
  const result = await syncWishlists(WISHLISTS, scraperOptionsFromEnv());
  console.log(result);
  await buildReports();
  const lines: string[] = [];
  for (const wishlist of await getAllWishlists()) {
    const deals = (await getDealRankingByWishlist(wishlist.id)).filter(item => item.isNewHistoricalLow || (item.dropVsPrevious ?? 0) > 0 || item.hasHighDiscount).slice(0, 5);
    if (!deals.length) continue;
    lines.push(`<b>Wishlist: ${escapeHtml(wishlist.name)}</b>`, '');
    for (const item of deals) lines.push(...formatDealLines(item), '');
  }
  if (lines.length) {
    for (const text of splitTelegramMessage(lines.join('\n').trim())) await notify(process.env, text, true);
  }
  console.log('Job completado: precios, reportes y menu actualizados.');
}
withJobLock(runJob).catch(error => { console.error('Error en job:', error); process.exitCode = 1; });
