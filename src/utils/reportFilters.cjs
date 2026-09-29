function filterAndSortBooks(books, options) {
  const normalize = value => value.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const query = normalize(options.query || '');
  const sort = options.sort || 'title';
  const price = options.price || 'all';
  const candidates = books.filter(book => normalize(book.title).includes(query) &&
    (sort !== 'wishlist_active' || book.isActive) && (sort !== 'wishlist_inactive' || !book.isActive));
  const prices = candidates.map(book => book.price).filter(value => value !== null && Number.isFinite(value));
  const minimum = prices.length ? Math.min(...prices) : null;
  return candidates.filter(book => {
    if (price === 'all') return true;
    if (price === 'historical_low') return book.isHistoricalLow;
    if (price === 'current_min') return minimum !== null && book.price === minimum;
    return book.price !== null && book.price < Number(price);
  }).sort((a, b) => {
    if (sort === 'discount_desc' && a.discount !== b.discount) return (b.discount ?? -Infinity) - (a.discount ?? -Infinity);
    if (sort === 'price_asc' && a.price !== b.price) return (a.price ?? Infinity) - (b.price ?? Infinity);
    return a.title.localeCompare(b.title, 'es');
  });
}
module.exports = { filterAndSortBooks };
