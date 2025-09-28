import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { wallets, verifications, auditLogs, verifySessions, claims, twitterVerifications, twitterTokens } from './schema'
import { and, eq } from 'drizzle-orm'

const DATABASE_URL = process.env.DATABASE_URL

let pool: any = null
let dbInstance: any = null

if (DATABASE_URL) {
  const useSSL = /sslmode=require/i.test(DATABASE_URL) || /neon\.tech/i.test(DATABASE_URL)
  pool = new Pool({ connectionString: DATABASE_URL, ssl: useSSL ? { rejectUnauthorized: false } : undefined })
  dbInstance = drizzle(pool)
}

export async function saveTwitterTokensDB(params: {
  walletId: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}) {
  if (!db) return
  const now = new Date()
  await db
    .insert(twitterTokens)
    .values({
      walletId: params.walletId,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: twitterTokens.walletId,
      set: {
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
        expiresAt: params.expiresAt,
        updatedAt: now,
      },
    })
}

export async function getTwitterTokensDB(walletId: string) {
  if (!db) return null
  const rows = await db.select().from(twitterTokens).where(eq(twitterTokens.walletId, walletId)).limit(1)
  return rows[0] || null
}

export async function addTwitterVerificationDB(params: {
  walletId: string
  twitterUserId?: string
  handle?: string
  followedJoinFroggys?: boolean
  ribbitTweeted?: boolean
  ribbitTweetId?: string
  points?: number
  verifiedAt?: Date
}) {
  if (!db) return
  const id = `${params.walletId}:${Date.now()}`
  await db.insert(twitterVerifications).values({
    id,
    walletId: params.walletId,
    twitterUserId: params.twitterUserId,
    handle: params.handle,
    followedJoinFroggys: params.followedJoinFroggys,
    ribbitTweeted: params.ribbitTweeted,
    ribbitTweetId: params.ribbitTweetId,
    points: params.points,
    verifiedAt: params.verifiedAt,
  })
  return id
}

export async function getLatestTwitterVerificationDB(walletId: string) {
  if (!db) return null
  const rows = await db
    .select()
    .from(twitterVerifications)
    .where(eq(twitterVerifications.walletId, walletId))
    .orderBy(twitterVerifications.createdAt as any)
  return rows[rows.length - 1] || null
}

export const db = dbInstance

export async function upsertWalletDB(address: string, provider: 'unisat' | 'okx' | 'xverse') {
  if (!db) return
  const now = new Date()
  // Upsert by id
  await db
    .insert(wallets)
    .values({ id: address, provider, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: wallets.id,
      set: { provider, updatedAt: now },
    })
}

export async function addVerificationDB(params: {
  walletId: string
  status: 'connected' | 'verified'
  holdCount?: number
  frogNumbers?: number[]
  reservedText?: string
  verifiedAt?: Date
}) {
  if (!db) return
  const id = `${params.walletId}:${Date.now()}`
  await db.insert(verifications).values({
    id,
    walletId: params.walletId,
    status: params.status,
    holdCount: params.holdCount,
    frogNumbers: params.frogNumbers as any,
    reservedText: params.reservedText,
    verifiedAt: params.verifiedAt,
  })
  return id
}

export async function logEventDB(type: string, payload?: any, walletId?: string) {
  if (!db) return
  const id = `${type}:${Date.now()}`
  await db.insert(auditLogs).values({ id, type, walletId, payload })
}

export async function createVerifySessionDB(walletId: string, nonce: string, expiresAt?: Date) {
  if (!db) return
  const id = `${walletId}:${nonce}`
  await db
    .insert(verifySessions)
    .values({ id, walletId, nonce, status: 'pending', expiresAt })
    .onConflictDoNothing()
}

export async function getVerifySessionDB(walletId: string, nonce: string) {
  if (!db) return null
  const id = `${walletId}:${nonce}`
  const rows = await db.select().from(verifySessions).where(eq(verifySessions.id, id)).limit(1)
  return rows[0] || null
}

export async function markVerifySessionUsedDB(walletId: string, nonce: string) {
  if (!db) return
  const id = `${walletId}:${nonce}`
  await db.update(verifySessions).set({ status: 'used', usedAt: new Date() }).where(eq(verifySessions.id, id))
}

export async function claimFrogsForWalletDB(walletId: string, frogNums: number[]): Promise<{ conflicts: number[] }> {
  if (!db) return { conflicts: [] }
  const conflicts: number[] = []
  for (const n of frogNums) {
    await db.insert(claims).values({ frogNum: n, walletId }).onConflictDoNothing()
    const row = await db.select().from(claims).where(eq(claims.frogNum, n)).limit(1)
    const owner = row[0]?.walletId
    if (owner && owner !== walletId) conflicts.push(n)
  }
  return { conflicts }
}
