export const dynamic = 'force-dynamic'

const BASE = process.env.BACKEND_BASE_URL || 'https://www.bitcoinfrogs.art'

export async function GET(req: Request) {
  const src = new URL(req.url)
  const url = new URL('/api/leaderboard/me', BASE)
  for (const [k, v] of src.searchParams.entries()) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  const txt = await res.text()
  return new Response(txt, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  })
}
