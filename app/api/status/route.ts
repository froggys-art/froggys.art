import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { frogLinks } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const frogIdStr = searchParams.get('frogId')
  const frogId = frogIdStr ? Number(frogIdStr) : NaN
  if (!Number.isInteger(frogId) || frogId <= 0) {
    return NextResponse.json({ error: 'Invalid frogId' }, { status: 400 })
  }

  const link = db.select().from(frogLinks).where(eq(frogLinks.frogId, frogId)).all()[0]
  if (!link) {
    return NextResponse.json({ linked: false })
  }
  return NextResponse.json({ linked: true, froggyId: link.froggyId, ownerAddress: link.ownerAddress })
}
