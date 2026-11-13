import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Offer, Product, Reading, TrackedProduct } from './types';
import { validateOfferUrl } from './urls';

export function productPaths(root = process.cwd()) {
  return { database: path.resolve(root, 'data/products.db'), privateDir: path.resolve(root, 'private-products'),
    report: path.resolve(root, 'private-products/report.html'), profile: path.resolve(root, 'private-products/browser-profile') };
}

export function openProductStore(root = process.cwd()) {
  const paths = productPaths(root);
  fs.mkdirSync(path.dirname(paths.database), { recursive: true });
  const bookDatabase = path.resolve(root, process.env.DATABASE_URL || 'data/prices.db');
  if (paths.database === bookDatabase || (fs.existsSync(paths.database) && fs.existsSync(bookDatabase) &&
      fs.statSync(paths.database).ino === fs.statSync(bookDatabase).ino && fs.statSync(paths.database).dev === fs.statSync(bookDatabase).dev)) {
    throw new Error('La base de productos debe ser distinta de la base de libros.');
  }
  const db = new Database(paths.database);
  fs.chmodSync(paths.database, 0o600);
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  const version = db.pragma('user_version', { simple: true });
  if (version > 1) { db.close(); throw new Error('Version de base de productos no soportada.'); }
  try {
  if (version === 0) db.transaction(() => {
    const existing = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    if (existing.length) throw new Error('La base seleccionada no es una base vacia de productos.');
    db.exec(`
      CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
        targetPrice REAL CHECK(targetPrice IS NULL OR targetPrice > 0), currency TEXT NOT NULL);
      CREATE TABLE offers(id INTEGER PRIMARY KEY, productId INTEGER NOT NULL REFERENCES products(id),
        url TEXT NOT NULL UNIQUE, store TEXT NOT NULL, expectedSeller TEXT, expectedVariant TEXT);
      CREATE TABLE observations(id INTEGER PRIMARY KEY, offerId INTEGER NOT NULL REFERENCES offers(id),
        runId TEXT NOT NULL, observedAt TEXT NOT NULL, status TEXT NOT NULL, title TEXT,
        price REAL CHECK(price IS NULL OR price > 0), currency TEXT, availability TEXT NOT NULL,
        seller TEXT, variant TEXT, shipping REAL, message TEXT NOT NULL,
        UNIQUE(offerId, runId));
      CREATE INDEX observations_offer_date ON observations(offerId, observedAt, id);
      PRAGMA user_version = 1;
    `);
  })();
  } catch (error) { db.close(); throw error; }

  return {
    paths,
    close: () => db.close(),
    add(input: { url: string; productId?: number; name?: string; category?: string; targetPrice?: number; currency?: string; seller?: string; variant?: string }) {
      const { url, store } = validateOfferUrl(input.url);
      return db.transaction(() => {
        const existing = db.prepare('SELECT * FROM offers WHERE url = ?').get(url) as Offer | undefined;
        if (existing) throw new Error(`La URL ya esta registrada como oferta ${existing.id}.`);
        let productId = input.productId;
        if (productId !== undefined) {
          if (!Number.isInteger(productId) || !db.prepare('SELECT id FROM products WHERE id = ?').get(productId)) throw new Error('Producto no encontrado.');
          if (input.name || input.category || input.targetPrice !== undefined || input.currency) throw new Error('Al vincular una oferta usa solo --product, --url, --seller y --variant.');
        } else {
          if (!input.name?.trim()) throw new Error('Indica --name para crear un producto.');
          const currency = input.currency ?? 'MXN';
          if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Indica moneda ISO de tres letras, por ejemplo MXN.');
          if (input.targetPrice !== undefined && (!Number.isFinite(input.targetPrice) || input.targetPrice <= 0)) throw new Error('El precio objetivo debe ser mayor que cero.');
          productId = Number(db.prepare('INSERT INTO products(name,category,targetPrice,currency) VALUES (?,?,?,?)')
            .run(input.name.trim(), input.category?.trim() || 'Sin categoria', input.targetPrice ?? null, currency).lastInsertRowid);
        }
        const offerId = Number(db.prepare('INSERT INTO offers(productId,url,store,expectedSeller,expectedVariant) VALUES (?,?,?,?,?)')
          .run(productId, url, store, input.seller?.trim() || null, input.variant?.trim() || null).lastInsertRowid);
        return { productId, offerId };
      })();
    },
    offers: () => db.prepare('SELECT * FROM offers ORDER BY id').all() as Offer[],
    record(offerId: number, runId: string, reading: Reading, observedAt = new Date().toISOString()) {
      if (reading.status === 'ok' && (!(reading.price! > 0) || !Number.isFinite(reading.price) || !/^[A-Z]{3}$/.test(reading.currency ?? ''))) throw new Error('Una lectura correcta requiere precio y moneda validos.');
      if (reading.status !== 'ok' && reading.price !== null) throw new Error('Un intento fallido no debe guardar precio.');
      db.prepare(`INSERT INTO observations(offerId,runId,observedAt,status,title,price,currency,availability,seller,variant,shipping,message)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(offerId,runId) DO NOTHING`)
        .run(offerId, runId, observedAt, reading.status, reading.title, reading.price, reading.currency, reading.availability,
          reading.seller, reading.variant, reading.shipping, reading.message);
    },
    catalog(): TrackedProduct[] {
      return (db.prepare('SELECT * FROM products ORDER BY name').all() as Product[]).map(product => ({ ...product,
        offers: (db.prepare('SELECT * FROM offers WHERE productId=? ORDER BY id').all(product.id) as Offer[]).map(offer => ({...offer,
          observations: db.prepare('SELECT * FROM observations WHERE offerId=? ORDER BY observedAt,id').all(offer.id),
        })),
      }));
    },
  };
}
export type ProductStore = ReturnType<typeof openProductStore>;
