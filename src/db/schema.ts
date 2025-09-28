import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const frogs = sqliteTable('frogs', {
  frogId: integer('frog_id').primaryKey(),
  inscriptionId: text('inscription_id').notNull().unique(),
})

export const walletChallenges = sqliteTable('wallet_challenges', {
  id: text('id').primaryKey(), // uuid
  frogId: integer('frog_id').notNull(),
  address: text('address'), // optional until signing
  inscriptionId: text('inscription_id'),
  nonce: text('nonce').notNull().unique(),
  issuedAt: text('issued_at').notNull(), // ISO string
  expiresAt: text('expires_at').notNull(), // ISO string
  consumed: integer('consumed', { mode: 'boolean' }).notNull().default(false),
}, (table) => {
  return {
    ixConsumed: sql`CREATE INDEX IF NOT EXISTS idx_wallet_challenges_consumed ON wallet_challenges(consumed)` as any,
    ixNonce: sql`CREATE INDEX IF NOT EXISTS idx_wallet_challenges_nonce ON wallet_challenges(nonce)` as any,
  }
})

export const frogLinks = sqliteTable('frog_links', {
  frogId: integer('frog_id').primaryKey(),
  froggyId: integer('froggy_id').notNull().unique(),
  inscriptionId: text('inscription_id').notNull().unique(),
  ownerAddress: text('owner_address').notNull(),
  sig: text('sig').notNull(),
  method: text('method').notNull(), // 'message' | 'psbt'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})
