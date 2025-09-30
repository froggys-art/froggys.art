export const dynamic = 'force-dynamic'

const BASE = process.env.BACKEND_BASE_URL || 'https://www.bitcoinfrogs.art'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ?? '100'
  const offset = searchParams.get('offset') ?? '0'
  const url = new URL('/api/leaderboard', BASE)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('offset', String(offset))

  const res = await fetch(url.toString(), { cache: 'no-store' })
  const txt = await res.text()
  return new Response(txt, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  })
}
