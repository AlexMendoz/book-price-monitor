import type { Store } from './types';

const hosts: Array<[Store, string[]]> = [
  ['amazon', ['amazon.com.mx', 'www.amazon.com.mx', 'amazon.com', 'www.amazon.com']],
  ['mercadolibre', ['mercadolibre.com.mx', 'www.mercadolibre.com.mx', 'articulo.mercadolibre.com.mx']],
  ['structured', ['liverpool.com.mx', 'www.liverpool.com.mx', 'elpalaciodehierro.com', 'www.elpalaciodehierro.com',
    'sears.com.mx', 'www.sears.com.mx', 'walmart.com.mx', 'www.walmart.com.mx', 'sanborns.com.mx', 'www.sanborns.com.mx', 'coppel.com', 'www.coppel.com', 'homedepot.com.mx', 'www.homedepot.com.mx']],
];

export function validateOfferUrl(value: string): { url: string; store: Store } {
  const url = new URL(value);
  const store = hosts.find(([, names]) => names.includes(url.hostname.toLowerCase()))?.[0];
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !store) {
    throw new Error('Usa una URL HTTPS directa de una tienda admitida, sin credenciales. No se admiten enlaces cortos.');
  }
  if (/\/(?:cart|checkout|gp\/buy|ap\/signin|login|pago)(?:\/|$)/i.test(url.pathname)) throw new Error('Usa la pagina del producto, no una pagina de pago o cuenta.');
  url.hash = '';
  // Keep query parameters: they can select a specific variant or seller.
  return { url: url.href, store };
}

export function productReference(value: string): string | null {
  const url = new URL(value);
  if (/amazon\./.test(url.hostname)) return url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1].toUpperCase() ?? null;
  if (/mercadolibre\./.test(url.hostname)) return url.pathname.match(/MLM-?(\d+)/i)?.[1] ?? null;
  return null;
}
