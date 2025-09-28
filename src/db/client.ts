import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const dataDir = path.join(process.cwd(), 'data')
const dbPath = path.join(dataDir, 'app.db')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialize SQLite DB
const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

// Minimal auto-migration for dev convenience
sqlite.exec(`
CREATE TABLE IF NOT EXISTS frogs (
  frog_id INTEGER PRIMARY KEY,
  inscription_id TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS wallet_challenges (
  id TEXT PRIMARY KEY,
  frog_id INTEGER NOT NULL,
  address TEXT,
  inscription_id TEXT,
  nonce TEXT NOT NULL UNIQUE,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_wallet_challenges_consumed ON wallet_challenges(consumed);
CREATE INDEX IF NOT EXISTS idx_wallet_challenges_nonce ON wallet_challenges(nonce);

CREATE TABLE IF NOT EXISTS frog_links (
  frog_id INTEGER PRIMARY KEY,
  froggy_id INTEGER NOT NULL UNIQUE,
  inscription_id TEXT NOT NULL UNIQUE,
  owner_address TEXT NOT NULL,
  sig TEXT NOT NULL,
  method TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`)

export const db = drizzle(sqlite, { schema })
export type DB = typeof db
