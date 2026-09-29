export type FilterBook = { id: string; title: string; price: number | null; discount: number | null; isActive: boolean; isHistoricalLow: boolean };
export function filterAndSortBooks(books: FilterBook[], options: { query?: string; sort?: string; price?: string }): FilterBook[];
