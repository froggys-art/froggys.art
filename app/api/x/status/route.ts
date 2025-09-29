import { NextResponse } from 'next/server'
import { getLatestTwitterVerificationDB } from '../../../db/client'
import { getLatestTwitterVerificationMem } from '../../../lib/memdb'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const address = url.searchParams.get('address') || ''
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })

    const dbRec = await getLatestTwitterVerificationDB(address)
    const memRec = getLatestTwitterVerificationMem(address)
    const rec = dbRec || memRec
    if (!rec) return NextResponse.json({ ok: true, connected: false })

    return NextResponse.json({
      ok: true,
      connected: true,
      handle: rec.handle,
      followedJoinFroggys: rec.followedJoinFroggys || false,
      ribbitTweeted: rec.ribbitTweeted || false,
      ribbitTweetId: rec.ribbitTweetId || null,
      points: rec.points || 0,
      verifiedAt: rec.verifiedAt || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
