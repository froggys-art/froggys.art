import { randomBytes, createHash } from 'node:crypto'

export function getTwitterConfig() {
  const clientId = process.env.TWITTER_CLIENT_ID || ''
  const clientSecret = process.env.TWITTER_CLIENT_SECRET || ''
  const redirectUri = process.env.TWITTER_REDIRECT_URI || ''
  const appHandle = process.env.FROGGYS_TWITTER_HANDLE || 'joinfroggys'
  const requiredPhrase = process.env.TWITTER_REQUIRED_TWEET_PHRASE || 'RIBBIT'
  if (!clientId || !redirectUri) {
    throw new Error('Missing TWITTER_CLIENT_ID or TWITTER_REDIRECT_URI')
  }
  return { clientId, clientSecret, redirectUri, appHandle, requiredPhrase }
}

export async function refreshAccessToken(opts: { clientId: string; refreshToken: string }) {
  const body = new URLSearchParams()
  body.set('client_id', opts.clientId)
  body.set('grant_type', 'refresh_token')
  body.set('refresh_token', opts.refreshToken)

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`token_refresh_failed: ${res.status} ${t}`)
  }
  return (await res.json()) as {
    access_token: string
    token_type: string
    expires_in: number
    scope: string
    refresh_token?: string
  }
}

export function genRandomUrlSafe(size = 32) {
  return randomBytes(size).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function sha256Base64Url(input: string) {
  const hash = createHash('sha256').update(input).digest('base64')
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function buildAuthUrl(state: string, codeChallenge: string, clientId: string, redirectUri: string) {
  const base = 'https://x.com/i/oauth2/authorize'
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read users.read follows.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${base}?${params.toString()}`
}

export async function exchangeCodeForToken(opts: {
  clientId: string
  code: string
  codeVerifier: string
  redirectUri: string
}) {
  const body = new URLSearchParams()
  body.set('client_id', opts.clientId)
  body.set('grant_type', 'authorization_code')
  body.set('code', opts.code)
  body.set('redirect_uri', opts.redirectUri)
  body.set('code_verifier', opts.codeVerifier)

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`token_exchange_failed: ${res.status} ${t}`)
  }
  return (await res.json()) as {
    access_token: string
    token_type: string
    expires_in: number
    scope: string
    refresh_token?: string
  }
}

export async function getCurrentUser(accessToken: string) {
  const res = await fetch('https://api.twitter.com/2/users/me?user.fields=username,name', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('get_current_user_failed')
  return (await res.json()) as { data: { id: string; username: string; name: string } }
}

export async function getUserByUsername(accessToken: string, username: string) {
  const res = await fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=username`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('get_user_by_username_failed')
  return (await res.json()) as { data: { id: string; username: string } }
}

export async function isFollowing(accessToken: string, sourceUserId: string, targetUserId: string, maxPages = 5) {
  // Paginate following list up to maxPages
  let nextToken: string | undefined = undefined
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`https://api.twitter.com/2/users/${sourceUserId}/following`)
    url.searchParams.set('max_results', '1000')
    url.searchParams.set('user.fields', 'username')
    if (nextToken) url.searchParams.set('pagination_token', nextToken)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) throw new Error('get_following_failed')
    const j = (await res.json()) as { data?: Array<{ id: string; username: string }>; meta?: { next_token?: string } }
    if (j.data?.some((u) => u.id === targetUserId)) return true
    nextToken = j.meta?.next_token
    if (!nextToken) break
  }
  return false
}

export async function findRecentTweetContaining(accessToken: string, userId: string, term: string, maxPages = 2) {
  let nextToken: string | undefined = undefined
  const t = term.toLowerCase()
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`)
    url.searchParams.set('max_results', '100')
    url.searchParams.set('tweet.fields', 'created_at')
    if (nextToken) url.searchParams.set('pagination_token', nextToken)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) throw new Error('get_user_tweets_failed')
    const j = (await res.json()) as { data?: Array<{ id: string; text: string }>; meta?: { next_token?: string } }
    const found = j.data?.find((tw) => (tw.text || '').toLowerCase().includes(t))
    if (found) return found.id
    nextToken = j.meta?.next_token
    if (!nextToken) break
  }
  return null
}
