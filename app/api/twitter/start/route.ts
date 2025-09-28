import { NextResponse } from 'next/server'
import { buildAuthUrl, genRandomUrlSafe, getTwitterConfig, sha256Base64Url } from '../../../lib/twitter'
import { logEvent, saveTwitterOAuthState } from '../../../lib/memdb'

export async function GET(req: Request) {
  try {
    const { clientId, redirectUri } = getTwitterConfig()
    const url = new URL(req.url)
    const address = url.searchParams.get('address') || ''
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })

    const state = genRandomUrlSafe(24)
    const codeVerifier = genRandomUrlSafe(48)
    const codeChallenge = sha256Base64Url(codeVerifier)

    saveTwitterOAuthState(state, codeVerifier, address)
    logEvent('twitter_start', { address, state })

    const authUrl = buildAuthUrl(state, codeChallenge, clientId, redirectUri)
    const res = NextResponse.redirect(authUrl)
    const isSecure = new URL(req.url).protocol === 'https:'
    // Also store a short-lived cookie as a fallback across dev reloads
    const cookieValue = `${state}.${codeVerifier}.${encodeURIComponent(address)}`
    res.cookies.set('xoauth', cookieValue, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
