export type Store = 'amazon' | 'mercadolibre' | 'structured';
export type ReadStatus = 'ok' | 'unavailable' | 'blocked' | 'ambiguous' | 'error';
export type Offer = {
  id: number; productId: number; url: string; store: Store;
  expectedSeller: string | null; expectedVariant: string | null;
};
export type Product = { id: number; name: string; category: string; targetPrice: number | null; currency: string };
export type Reading = {
  status: ReadStatus; title: string | null; price: number | null; currency: string | null;
  availability: 'in_stock' | 'out_of_stock' | 'unknown'; seller: string | null;
  variant: string | null; shipping: number | null; message: string;
};
export type Observation = Reading & { id: number; offerId: number; observedAt: string; runId: string };
export type TrackedProduct = Product & { offers: Array<Offer & { observations: Observation[] }> };
