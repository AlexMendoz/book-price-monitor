import '../config/loadEnv';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const dbPath = process.env.DATABASE_URL || './data/prices.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
export const sqlite = new Database(dbPath);
sqlite.pragma('foreign_keys = ON');
export const db = drizzle(sqlite);
migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') });
