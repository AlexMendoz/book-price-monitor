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

function isPlaceholderUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes('tu_wishlist') ||
    normalized.includes('tu_wishlist_privada') ||
    normalized.includes('example.com')
  );
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

    for (const wishlist of wishlists) {
      if (wishlist.name.trim().length === 0) {
        throw new Error('Cada wishlist debe tener un nombre no vacío');
      }

      if (!/^https?:\/\//i.test(wishlist.url)) {
        throw new Error(`URL inválida en wishlist "${wishlist.name}"`);
      }

      if (isPlaceholderUrl(wishlist.url)) {
        throw new Error(
          `La wishlist "${wishlist.name}" usa un placeholder. Reemplázalo por tu URL real de Buscalibre.`
        );
      }
    }

    return wishlists;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Error desconocido';
    throw new Error(`No se pudo parsear WISHLISTS_JSON: ${reason}`);
  }
}

export const WISHLISTS: WishlistConfig[] = parseWishlistsFromEnv();
