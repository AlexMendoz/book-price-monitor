import { WISHLISTS } from '../config/wishlists';
import { scraperOptionsFromEnv } from '../config/scraperOptions';
import { syncWishlists } from '../services/wishlistSyncService';
import { buildReports } from '../services/buildReportsService';
import { withJobLock } from '../services/jobLock';
import { getAllWishlists } from '../services/reportService';
import { getDealRankingByWishlist } from '../services/rankingService';
import { sendTelegramMessage } from '../services/telegramService';
import { formatDealLines } from '../services/dealPresentation';
import { escapeHtml } from '../utils/format.cjs';

async function runJob() {
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
  if (lines.length) await sendTelegramMessage({ text: lines.join('\n').trim() });
  console.log('Job completado: precios, reportes y menu actualizados.');
}
withJobLock(runJob).catch(error => { console.error('Error en job:', error); process.exitCode = 1; });
