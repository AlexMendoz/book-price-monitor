import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const pending = new Map<string, Promise<string | null>>();
const cacheDirectory = () => path.resolve(process.env.COVER_CACHE_DIR || './data/cover-cache');
const cachePath = (url: string) => path.join(cacheDirectory(), createHash('sha256').update(url).digest('hex') + '.txt');
const maxAgeMs = 30 * 24 * 60 * 60 * 1000;

export function seedCoverCache(url: string, dataUrl: string): void {
  if (!dataUrl.startsWith('data:image/') || fs.existsSync(cachePath(url))) return;
  saveCover(url, dataUrl);
}

function saveCover(url: string, dataUrl: string): void {
  fs.mkdirSync(cacheDirectory(), { recursive: true });
  const target = cachePath(url), temporary = target + '.' + randomUUID() + '.tmp';
  fs.writeFileSync(temporary, dataUrl);
  fs.renameSync(temporary, target);
}

export async function getCachedCover(url: string): Promise<string | null> {
  if (pending.has(url)) return pending.get(url)!;
  const request = loadCover(url).finally(() => pending.delete(url));
  pending.set(url, request);
  return request;
}

async function loadCover(url: string): Promise<string | null> {
  const file = cachePath(url);
  let cached: string | null = null;
  if (fs.existsSync(file)) {
    cached = fs.readFileSync(file, 'utf8');
    if (Date.now() - fs.statSync(file).mtimeMs < maxAgeMs) return cached;
  }
  if (process.env.REPORTS_OFFLINE === 'true') return cached;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: {
      'User-Agent': 'Mozilla/5.0', Accept: 'image/*', Referer: 'https://www.buscalibre.com.mx/',
    } });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.startsWith('image/') || Number(response.headers.get('content-length')) > 5_000_000) return cached;
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 5_000_000) return cached;
    const result = `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
    saveCover(url, result);
    return result;
  } catch { return cached; }
}

export async function mapWithConcurrency<T, R>(items: T[], map: (item: T) => Promise<R>, concurrency = 4): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Concurrencia invalida.');
  const result = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor++; result[index] = await map(items[index]); }
  }));
  return result;
}
