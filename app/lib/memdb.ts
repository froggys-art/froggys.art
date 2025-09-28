// Simple in-memory store to keep the app runnable without a DB.
// We'll swap this to Prisma + Postgres later.

export type WalletProvider = 'unisat' | 'okx' | 'xverse'

export type Wallet = {
  id: string // address
  provider: WalletProvider
  createdAt: number
  updatedAt: number
}

// --- Twitter OAuth ephemeral state storage ---
type TwitterOAuthState = { state: string; codeVerifier: string; walletId: string; createdAt: number }
const twitterStates = new Map<string, TwitterOAuthState>()

export function saveTwitterOAuthState(state: string, codeVerifier: string, walletId: string) {
  twitterStates.set(state, { state, codeVerifier, walletId, createdAt: Date.now() })
}

export function popTwitterOAuthState(state: string): TwitterOAuthState | undefined {
  const v = twitterStates.get(state)
  if (v) twitterStates.delete(state)
  return v
}

// --- Twitter verification helpers ---
export function upsertTwitterVerificationMem(v: Omit<TwitterVerification, 'id' | 'createdAt'>): TwitterVerification {
  const item: TwitterVerification = {
    id: `${v.walletId}:${Date.now()}`,
    createdAt: Date.now(),
    ...v,
  }
  db.twitters.push(item)
  return item
}

export function getLatestTwitterVerificationMem(walletId: string): TwitterVerification | undefined {
  const items = db.twitters.filter((t) => t.walletId === walletId).sort((a, b) => b.createdAt - a.createdAt)
  return items[0]
}

// --- Twitter user tokens (in-memory only; for dev convenience) ---
export type TwitterTokens = { accessToken: string; refreshToken?: string; expiresAt?: number }
const twitterTokens = new Map<string, TwitterTokens>()

export function saveTwitterTokens(walletId: string, tokens: TwitterTokens) {
  twitterTokens.set(walletId, tokens)
}

export function getTwitterTokens(walletId: string): TwitterTokens | undefined {
  return twitterTokens.get(walletId)
}

export type Verification = {
  id: string // `${address}:${Date.now()}` or uuid
  walletId: string // address
  status: 'connected' | 'verified'
  holdCount?: number
  frogNumbers?: number[]
  reservedText?: string
  verifiedAt?: number
  createdAt: number
}

export type TwitterVerification = {
  id: string
  walletId: string
  twitterUserId?: string
  handle?: string
  followedJoinFroggys?: boolean
  ribbitTweeted?: boolean
  ribbitTweetId?: string
  points?: number
  verifiedAt?: number
  createdAt: number
}

export type AuditLog = {
  id: string
  walletId?: string
  type: string
  payload?: any
  createdAt: number
}

type DB = {
  wallets: Wallet[]
  verifications: Verification[]
  twitters: TwitterVerification[]
  logs: AuditLog[]
  sessions: VerifySession[]
  claims: Array<{ frogNum: number; walletId: string; createdAt: number }>
}

const db: DB = {
  wallets: [],
  verifications: [],
  twitters: [],
  logs: [],
  sessions: [],
  claims: [],
}

export function upsertWallet(address: string, provider: WalletProvider): Wallet {
  const now = Date.now()
  const id = address
  let w = db.wallets.find((x) => x.id === id)
  if (!w) {
    w = { id, provider, createdAt: now, updatedAt: now }
    db.wallets.push(w)
  } else {
    w.provider = provider
    w.updatedAt = now
  }
  return w
}

export function addVerification(v: Omit<Verification, 'id' | 'createdAt'>): Verification {
  const item: Verification = {
    id: `${v.walletId}:${Date.now()}`,
    createdAt: Date.now(),
    ...v,
  }
  db.verifications.push(item)
  return item
}

export function logEvent(type: string, payload?: any, walletId?: string) {
  db.logs.push({ id: `${type}:${Date.now()}`, type, payload, walletId, createdAt: Date.now() })
}

export function getDBSnapshot() {
  return db
}

export type VerifySession = {
  id: string // `${walletId}:${nonce}`
  walletId: string
  nonce: string
  status: 'pending' | 'used'
  createdAt: number
  expiresAt?: number
  usedAt?: number
}

export function createVerifySession(walletId: string, nonce: string, expiresAt?: number): VerifySession {
  const id = `${walletId}:${nonce}`
  const s: VerifySession = {
    id,
    walletId,
    nonce,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt,
  }
  db.sessions.push(s)
  return s
}

export function getVerifySession(walletId: string, nonce: string): VerifySession | undefined {
  const id = `${walletId}:${nonce}`
  return db.sessions.find((x) => x.id === id)
}

export function markVerifySessionUsed(walletId: string, nonce: string) {
  const s = getVerifySession(walletId, nonce)
  if (s) {
    s.status = 'used'
    s.usedAt = Date.now()
  }
}

export function claimFrogsForWalletMem(walletId: string, frogNums: number[]): { conflicts: number[] } {
  const now = Date.now()
  const conflicts: number[] = []
  for (const n of frogNums) {
    const existing = db.claims.find((c) => c.frogNum === n)
    if (existing && existing.walletId !== walletId) conflicts.push(n)
  }
  if (conflicts.length) return { conflicts }
  // Insert missing claims
  for (const n of frogNums) {
    const existing = db.claims.find((c) => c.frogNum === n)
    if (!existing) db.claims.push({ frogNum: n, walletId, createdAt: now })
  }
  return { conflicts: [] }
}
