import './loadEnv';

export type WishlistConfig = {
  name: string;
  url: string;
};

function isWishlistConfig(value: unknown): value is WishlistConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return typeof entry.name === 'string' && typeof entry.url === 'string';
}

function parseWishlistsFromEnv(): WishlistConfig[] {
  const raw = process.env.WISHLISTS_JSON?.trim();

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('WISHLISTS_JSON debe ser un arreglo JSON');
    }

    const wishlists = parsed.filter(isWishlistConfig);

    if (wishlists.length !== parsed.length) {
      throw new Error('Cada wishlist debe tener { name: string, url: string }');
    }

    return wishlists;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`No se pudo parsear WISHLISTS_JSON: ${reason}`);
  }
}

export const WISHLISTS: WishlistConfig[] = parseWishlistsFromEnv();
