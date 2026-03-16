export function parseMoney(value?: string | null): number | null {
  if (!value) return null;

  const cleaned = value
    .replace(/[^\d.,]/g, '')
    .replace(/,/g, '');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDiscount(value?: string | null): number | null {
  if (!value) return null;

  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
}