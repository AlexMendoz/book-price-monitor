import { getAllWishlists } from './reportService';
import { getDealRankingByWishlist } from './rankingService';
import {
  telegramAnswerCallbackQuery,
  telegramSendMessage,
} from './telegramBotApi';

const BOOKS_PAGE_SIZE = 8;

export async function handleTelegramMessage(message: any) {
  const chatId = message?.chat?.id;
  const text = (message?.text ?? '').trim();

  if (!chatId || !text) return;

  if (text === '/start') {
    await telegramSendMessage({
      chatId,
      text:
        '<b>Hola</b>\n\n' +
        'Usa /listas para ver tus wishlists y consultar ofertas por categoría.',
    });
    return;
  }

  if (text === '/listas' || text === '/ofertas') {
    await sendWishlistSelector(chatId);
    return;
  }
}

export async function handleTelegramCallbackQuery(callbackQuery: any) {
  const callbackQueryId = callbackQuery?.id;
  const data = callbackQuery?.data;
  const chatId = callbackQuery?.message?.chat?.id;

  if (!callbackQueryId || !data || !chatId) return;

  if (data.startsWith('wishlist:')) {
    const wishlistId = Number(data.split(':')[1]);

    await telegramAnswerCallbackQuery({
      callbackQueryId,
      text: 'Selecciona una vista...',
    });

    await sendWishlistActionSelector(chatId, wishlistId);
    return;
  }

  if (data.startsWith('wishlist_action:')) {
    const [, wishlistIdRaw, action] = data.split(':');
    const wishlistId = Number(wishlistIdRaw);

    await telegramAnswerCallbackQuery({
      callbackQueryId,
      text: 'Cargando resultados...',
    });

    if (action === 'historical_prices') {
      await sendWishlistBookSelector(chatId, wishlistId, 0);
      return;
    }

    await sendWishlistDealsByAction(chatId, wishlistId, action);
    return;
  }

  if (data.startsWith('wishlist_books_page:')) {
    const [, wishlistIdRaw, pageRaw] = data.split(':');
    const wishlistId = Number(wishlistIdRaw);
    const page = Number(pageRaw);

    await telegramAnswerCallbackQuery({
      callbackQueryId,
      text: 'Cargando libros...',
    });

    await sendWishlistBookSelector(chatId, wishlistId, Number.isFinite(page) ? page : 0);
    return;
  }

  if (data.startsWith('wishlist_book:')) {
    const [, wishlistIdRaw, bookIdRaw, pageRaw] = data.split(':');
    const wishlistId = Number(wishlistIdRaw);
    const bookId = Number(bookIdRaw);
    const page = Number(pageRaw);

    await telegramAnswerCallbackQuery({
      callbackQueryId,
      text: 'Cargando detalle...',
    });

    await sendBookHistoricalPriceSummary(
      chatId,
      wishlistId,
      bookId,
      Number.isFinite(page) ? page : 0
    );
    return;
  }

  if (data === 'go_back_wishlists') {
    await telegramAnswerCallbackQuery({
      callbackQueryId,
      text: 'Volviendo a tus listas...',
    });

    await sendWishlistSelector(chatId);
    return;
  }
}

async function sendWishlistSelector(chatId: string | number) {
  const wishlists = await getAllWishlists();

  if (wishlists.length === 0) {
    await telegramSendMessage({
      chatId,
      text: 'No encontré wishlists registradas todavía.',
    });
    return;
  }

  await telegramSendMessage({
    chatId,
    text: '<b>Selecciona una wishlist</b>',
    replyMarkup: {
      inline_keyboard: [
        ...wishlists.map((wishlist) => [
          {
            text: wishlist.name,
            callback_data: `wishlist:${wishlist.id}`,
          },
        ]),
      ],
    },
  });
}

async function sendWishlistActionSelector(chatId: string | number, wishlistId: number) {
  await telegramSendMessage({
    chatId,
    text: '<b>¿Qué quieres ver de esta wishlist?</b>',
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '🏆 Top ofertas', callback_data: `wishlist_action:${wishlistId}:top` },
          { text: '📉 Mínimos históricos', callback_data: `wishlist_action:${wishlistId}:historical_low` },
        ],
        [
          { text: '⚠️ Sospechosos', callback_data: `wishlist_action:${wishlistId}:suspicious` },
          { text: '🔥 Descuento alto', callback_data: `wishlist_action:${wishlistId}:high_discount` },
        ],
        [
          { text: '📚 Precios históricos', callback_data: `wishlist_action:${wishlistId}:historical_prices` },
        ],
        [
          { text: '⬅️ Volver a listas', callback_data: 'go_back_wishlists' },
        ],
      ],
    },
  });
}

async function sendWishlistDealsByAction(
  chatId: string | number,
  wishlistId: number,
  action: string
) {
  const wishlists = await getAllWishlists();
  const wishlist = wishlists.find((w) => w.id === wishlistId);

  if (!wishlist) {
    await telegramSendMessage({
      chatId,
      text: 'No encontré esa wishlist.',
    });
    return;
  }

  const ranking = await getDealRankingByWishlist(wishlistId);

  let filtered = ranking;

  switch (action) {
    case 'top':
      filtered = ranking.filter(
        (item) =>
          item.isHistoricalLow ||
          (item.dropVsPrevious ?? 0) > 0 ||
          item.hasHighDiscount
      );
      filtered = filtered.slice(0, 10);
      break;

    case 'historical_low':
      filtered = ranking.filter((item) => item.isHistoricalLow).slice(0, 10);
      break;

    case 'suspicious':
      filtered = ranking.filter((item) => item.looksLikeInflatedBasePrice).slice(0, 10);
      break;

    case 'high_discount':
      filtered = ranking.filter((item) => item.hasHighDiscount).slice(0, 10);
      break;

    default:
      filtered = ranking.slice(0, 10);
      break;
  }

  if (filtered.length === 0) {
    await telegramSendMessage({
      chatId,
      text:
        `<b>${escapeHtml(wishlist.name)}</b>\n\n` +
        'No encontré resultados para esa categoría.',
      replyMarkup: {
        inline_keyboard: [
          [
            { text: '⬅️ Volver a listas', callback_data: 'go_back_wishlists' },
          ],
          [
            { text: '📂 Ver categorías otra vez', callback_data: `wishlist:${wishlistId}` },
          ],
        ],
      },
    });
    return;
  }

  const titleMap: Record<string, string> = {
    top: '🏆 Top ofertas',
    historical_low: '📉 Mínimos históricos',
    suspicious: '⚠️ Sospechosos',
    high_discount: '🔥 Descuento alto',
  };

  const lines: string[] = [];
  lines.push(`<b>${titleMap[action] ?? 'Resultados'}</b>`);
  lines.push(`<b>Wishlist:</b> ${escapeHtml(wishlist.name)}`);
  lines.push('');

  for (const item of filtered) {
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
      lines.push(escapeHtml(item.productUrl));
    }

    lines.push('');
  }

  await telegramSendMessage({
    chatId,
    text: lines.join('\n').trim(),
    replyMarkup: {
      inline_keyboard: [
        [
          { text: '📂 Ver categorías', callback_data: `wishlist:${wishlistId}` },
          { text: '⬅️ Volver a listas', callback_data: 'go_back_wishlists' },
        ],
      ],
    },
  });
}

async function sendWishlistBookSelector(
  chatId: string | number,
  wishlistId: number,
  page: number
) {
  const wishlists = await getAllWishlists();
  const wishlist = wishlists.find((w) => w.id === wishlistId);

  if (!wishlist) {
    await telegramSendMessage({
      chatId,
      text: 'No encontré esa wishlist.',
    });
    return;
  }

  const ranking = await getDealRankingByWishlist(wishlistId);

  if (ranking.length === 0) {
    await telegramSendMessage({
      chatId,
      text:
        `<b>${escapeHtml(wishlist.name)}</b>\n\n` +
        'No hay historial disponible para esta wishlist todavía.',
      replyMarkup: {
        inline_keyboard: [
          [{ text: '📂 Ver categorías', callback_data: `wishlist:${wishlistId}` }],
          [{ text: '⬅️ Volver a listas', callback_data: 'go_back_wishlists' }],
        ],
      },
    });
    return;
  }

  const books = [...ranking].sort((a, b) => a.title.localeCompare(b.title, 'es'));
  const totalPages = Math.max(1, Math.ceil(books.length / BOOKS_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * BOOKS_PAGE_SIZE;
  const items = books.slice(start, start + BOOKS_PAGE_SIZE);

  const keyboard: Array<Array<{ text: string; callback_data: string }>> = items.map((item) => [
    {
      text: item.title.length > 55 ? `${item.title.slice(0, 52)}...` : item.title,
      callback_data: `wishlist_book:${wishlistId}:${item.bookId}:${safePage}`,
    },
  ]);

  const paginationRow: Array<{ text: string; callback_data: string }> = [];
  if (safePage > 0) {
    paginationRow.push({
      text: '⬅️ Anterior',
      callback_data: `wishlist_books_page:${wishlistId}:${safePage - 1}`,
    });
  }
  if (safePage < totalPages - 1) {
    paginationRow.push({
      text: 'Siguiente ➡️',
      callback_data: `wishlist_books_page:${wishlistId}:${safePage + 1}`,
    });
  }
  if (paginationRow.length > 0) {
    keyboard.push(paginationRow);
  }

  keyboard.push([{ text: '📂 Ver categorías', callback_data: `wishlist:${wishlistId}` }]);
  keyboard.push([{ text: '⬅️ Volver a listas', callback_data: 'go_back_wishlists' }]);

  await telegramSendMessage({
    chatId,
    text:
      '<b>📚 Selecciona un libro</b>\n' +
      `<b>Wishlist:</b> ${escapeHtml(wishlist.name)}\n` +
      `<b>Página:</b> ${safePage + 1}/${totalPages}`,
    replyMarkup: {
      inline_keyboard: keyboard,
    },
  });
}

async function sendBookHistoricalPriceSummary(
  chatId: string | number,
  wishlistId: number,
  bookId: number,
  page: number
) {
  const wishlists = await getAllWishlists();
  const wishlist = wishlists.find((w) => w.id === wishlistId);

  if (!wishlist) {
    await telegramSendMessage({
      chatId,
      text: 'No encontré esa wishlist.',
    });
    return;
  }

  const ranking = await getDealRankingByWishlist(wishlistId);
  const item = ranking.find((row) => row.bookId === bookId);

  if (!item) {
    await telegramSendMessage({
      chatId,
      text:
        `<b>${escapeHtml(wishlist.name)}</b>\n\n` +
        'No encontré historial para ese libro.',
      replyMarkup: {
        inline_keyboard: [
          [{ text: '📚 Volver al listado', callback_data: `wishlist_books_page:${wishlistId}:${page}` }],
          [{ text: '📂 Ver categorías', callback_data: `wishlist:${wishlistId}` }],
          [{ text: '⬅️ Volver a listas', callback_data: 'go_back_wishlists' }],
        ],
      },
    });
    return;
  }

  const lines: string[] = [];
  lines.push('<b>📖 Precio histórico del libro</b>');
  lines.push(`<b>Wishlist:</b> ${escapeHtml(wishlist.name)}`);
  lines.push('');
  lines.push(`<b>${escapeHtml(item.title)}</b>`);
  lines.push(`Autor: ${escapeHtml(item.author ?? 'Autor desconocido')}`);
  lines.push(`Precio actual (lista): ${formatMoney(item.currentListPrice, item.currency)}`);
  lines.push(`Precio actual (descuento): ${formatMoney(item.currentDiscountedPrice, item.currency)}`);
  lines.push(`Precio histórico más bajo: ${formatMoney(item.historicalMinDiscountedPrice, item.currency)}`);

  if (item.productUrl) {
    lines.push('');
    lines.push(escapeHtml(item.productUrl));
  }

  await telegramSendMessage({
    chatId,
    text: lines.join('\n'),
    replyMarkup: {
      inline_keyboard: [
        [{ text: '📚 Volver al listado', callback_data: `wishlist_books_page:${wishlistId}:${page}` }],
        [{ text: '📂 Ver categorías', callback_data: `wishlist:${wishlistId}` }],
        [{ text: '⬅️ Volver a listas', callback_data: 'go_back_wishlists' }],
      ],
    },
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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
