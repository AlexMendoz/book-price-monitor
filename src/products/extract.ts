import type { Page } from 'playwright';
import type { Offer, Reading, ReadStatus } from './types';

export function failedReading(status: ReadStatus, message: string): Reading {
  return { status, message, title: null, price: null, currency: null, availability: 'unknown', seller: null, variant: null, shipping: null };
}

export function parseProductPrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== 'string' || /desde|from|mes|month|cuota|\d\s*[-\u2013]\s*\d/i.test(value)) return null;
  let text = value.replace(/(?:MXN|USD|EUR|MX\$|US\$|U\$S|[$\u20ac\s])/gi, '');
  if (!/^[\d.,]+$/.test(text)) return null;
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(text)) text = text.replaceAll(',', '');
  else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(text)) text = text.replaceAll('.', '').replace(',', '.');
  else if (/^\d+,\d{1,2}$/.test(text)) text = text.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const price = Number(text);
  return Number.isFinite(price) && price > 0 ? price : null;
}

const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export function validateReading(reading: Reading, offer: Pick<Offer, 'expectedSeller' | 'expectedVariant'>): Reading {
  if (reading.status !== 'ok') return reading;
  if (offer.expectedSeller && (!reading.seller || normalized(reading.seller) !== normalized(offer.expectedSeller))) {
    return { ...reading, status: 'ambiguous', price: null, message: 'El vendedor no coincide o no se pudo identificar.' };
  }
  if (offer.expectedVariant && (!reading.variant || !normalized(reading.variant).includes(normalized(offer.expectedVariant)))) {
    return { ...reading, status: 'ambiguous', price: null, message: 'La variante no coincide o no se pudo identificar.' };
  }
  return reading;
}

export function readStructuredProduct(documents: unknown[], pageUrl: string): Reading {
  const products: any[] = [];
  function visit(value: any): void {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== 'object') return;
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (types.includes('Product')) products.push(value);
    if (value['@graph']) visit(value['@graph']);
  }
  documents.forEach(visit);
  const sameUrl = products.filter(product => {
    try { return new URL(product.url || product['@id'], pageUrl).href.split('#')[0] === pageUrl.split('#')[0]; } catch { return false; }
  });
  const candidates = sameUrl.length ? sameUrl : products;
  if (candidates.length !== 1) return failedReading(candidates.length ? 'ambiguous' : 'error', candidates.length ? 'Varios productos estructurados; no se selecciono un precio.' : 'No se encontraron datos Product en JSON-LD.');
  const product = candidates[0];
  const selectedSku = new URL(pageUrl).searchParams.get('skuid');
  if (selectedSku && String(product.sku ?? '') !== selectedSku) return failedReading('ambiguous', 'El SKU seleccionado no coincide o no se pudo verificar.');
  if (!sameUrl.length && typeof product.url === 'string') return failedReading('ambiguous', 'Los datos estructurados apuntan a otra URL de producto.');
  const offers = Array.isArray(product.offers) ? product.offers : product.offers ? [product.offers] : [];
  if (!offers.length) return failedReading('error', 'El producto estructurado no incluye ofertas.');
  if (offers.length !== 1 || !offers[0] || (Array.isArray(offers[0]['@type']) ? offers[0]['@type'].includes('AggregateOffer') : offers[0]['@type'] === 'AggregateOffer')) {
    return failedReading('ambiguous', 'No hay una oferta unica: puede haber variantes o vendedores multiples.');
  }
  const source = offers[0];
  const availability = /(?:OutOfStock|SoldOut|Discontinued)$/i.test(source.availability ?? '') ? 'out_of_stock'
    : /(?:InStock|LimitedAvailability)$/i.test(source.availability ?? '') ? 'in_stock' : 'unknown';
  const currency = typeof source.priceCurrency === 'string' ? source.priceCurrency.toUpperCase() : null;
  const price = parseProductPrice(source.price);
  const shippingDetails = Array.isArray(source.shippingDetails) ? source.shippingDetails.length === 1 ? source.shippingDetails[0] : null : source.shippingDetails;
  const shippingRate = shippingDetails?.shippingRate;
  const shipping = shippingRate?.currency === currency && typeof shippingRate?.value !== 'undefined' && Number.isFinite(Number(shippingRate.value)) && Number(shippingRate.value) >= 0 ? Number(shippingRate.value) : null;
  const seller = typeof source.seller === 'string' ? source.seller : source.seller?.name;
  const variant = [product.name, product.sku, product.color, product.size].filter(value => typeof value === 'string').join(' | ') || null;
  const result: Reading = { status: 'ok', title: typeof product.name === 'string' ? product.name : null,
    price, currency, availability, seller: typeof seller === 'string' ? seller : null, variant, shipping,
    message: 'Precio publicado; condiciones no verificadas. No se calculan cupones ni membresias.' };
  if (availability === 'out_of_stock') return { ...result, status: 'unavailable', price: null, message: 'La tienda indica que no esta disponible.' };
  if (!result.title || price === null || !/^[A-Z]{3}$/.test(currency ?? '')) return { ...result, status: 'error', price: null, message: 'Falta titulo, precio o moneda verificable.' };
  if ([product.color, product.size].some(value => Array.isArray(value) && value.length > 1)) return { ...result, status: 'ambiguous', price: null, message: 'El producto contiene multiples variantes sin seleccion verificable.' };
  return result;
}

export async function extractProductPage(page: Page, offer: Offer): Promise<Reading> {
  const body = await page.locator('body').innerText({ timeout: 10000 });
  const title = await page.title();
  if (/captcha|robot check|access denied|acceso denegado|verifica.*(?:humano|identidad)|verify.*human/i.test(title + '\n' + body.slice(0, 2500))) {
    return failedReading('blocked', 'La tienda requiere verificacion o bloqueo de acceso. No se obtuvo precio.');
  }
  const data = await page.locator('script[type="application/ld+json"]').allTextContents();
  const documents: unknown[] = [];
  for (const value of data) { try { documents.push(JSON.parse(value)); } catch { /* Ignore malformed metadata and inspect the visible product. */ } }
  const structured = readStructuredProduct(documents, page.url());
  // Department stores start with conservative structured-data support; never read recommendation prices.
  if (offer.store === 'structured' || structured.status === 'ok' || structured.status === 'unavailable' || structured.status === 'ambiguous') return validateReading(structured, offer);

  const selectors = offer.store === 'amazon'
    ? { title: '#productTitle', prices: '#corePrice_feature_div .a-price:not(.a-text-price) .a-offscreen, #corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price) .a-offscreen',
      seller: '#sellerProfileTriggerId', variant: '#twister .selection', availability: '#availability' }
    : { title: 'h1.ui-pdp-title', prices: '.ui-pdp-price__second-line .andes-money-amount',
      seller: '.ui-pdp-seller__header__title', variant: '.ui-pdp-variations__selected-label', availability: '.ui-pdp-stock-information' };
  const productTitle = await optionalText(page, selectors.title);
  if (!productTitle?.trim()) return failedReading('error', 'No se encontro el titulo principal del producto.');
  const availabilityText = (await page.locator(selectors.availability).allTextContents()).join(' ');
  if (/no disponible|agotado|sin stock|currently unavailable|out of stock/i.test(availabilityText)) {
    return { ...failedReading('unavailable', 'La pagina indica producto no disponible.'), title: productTitle.trim(), availability: 'out_of_stock' };
  }
  const rawPrices = await page.locator(selectors.prices).evaluateAll(elements => elements.filter(element => {
    const owner = element.closest('.a-price') ?? element;
    return owner.getClientRects().length > 0;
  }).map(element => {
    const fraction = element.querySelector('.andes-money-amount__fraction')?.textContent;
    const cents = element.querySelector('.andes-money-amount__cents')?.textContent;
    const symbol = element.querySelector('.andes-money-amount__currency-symbol')?.textContent ?? '';
    return fraction ? symbol + ' ' + fraction + (cents ? '.' + cents : '') : element.textContent ?? '';
  }));
  const prices = [...new Set(rawPrices.map(parseProductPrice).filter((price): price is number => price !== null))];
  // DOM fallback is limited to Mexican storefronts with a locally displayed price.
  const textPrices = rawPrices.join(' ');
  const explicitCurrency = textPrices.match(/\b(MXN|USD|EUR)\b/i)?.[1].toUpperCase()
    ?? (/US\$|U\$S/.test(textPrices) ? 'USD' : /MX\$/.test(textPrices) ? 'MXN' : undefined);
  const currency = explicitCurrency ?? (new URL(page.url()).hostname.endsWith('.com.mx') ? 'MXN' : null);
  if (prices.length !== 1 || !currency) return failedReading(prices.length > 1 ? 'ambiguous' : 'error', 'No se pudo verificar un unico precio principal y su moneda.');
  const seller = (await optionalText(page, selectors.seller))?.trim() || null;
  const variants = (await page.locator(selectors.variant).allTextContents()).map(value => value.trim()).filter(Boolean);
  return validateReading({ status: 'ok', title: productTitle.trim(), price: prices[0], currency,
    availability: /en stock|disponible|in stock/i.test(availabilityText) ? 'in_stock' : 'unknown',
    seller, variant: variants.join(' | ') || null, shipping: null,
    message: 'Precio principal publicado; envio, cupones y condiciones de pago no incluidos.' }, offer);
}

async function optionalText(page: Page, selector: string): Promise<string | null> {
  const locator = page.locator(selector).first();
  return await locator.count() ? locator.textContent({ timeout: 2000 }).catch(() => null) : null;
}
