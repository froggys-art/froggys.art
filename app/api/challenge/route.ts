import { NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'node:crypto'
import { addMinutes } from 'date-fns'
import { db } from '@/db/client'
import { walletChallenges, frogs } from '@/db/schema'
import { buildChallenge } from '@/lib/challenge'
import { ChallengeInput } from '@/lib/validation'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = ChallengeInput.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { frogId, inscriptionId } = parsed.data

    // Optional: validate frog exists and inscription matches
    const frog = db.select().from(frogs).where(eq(frogs.frogId, frogId)).all()[0]
    if (frog && frog.inscriptionId && frog.inscriptionId !== inscriptionId) {
      return NextResponse.json({ error: 'Frog inscription mismatch' }, { status: 400 })
    }

    const nonce = randomBytes(16).toString('hex')
    const issuedAt = new Date().toISOString()
    const expiresAt = addMinutes(new Date(), 10).toISOString()

    // persist challenge
    db.insert(walletChallenges).values({
      id: randomUUID(),
      frogId,
      address: null,
      inscriptionId,
      nonce,
      issuedAt,
      expiresAt,
      consumed: false,
    }).run()

    const challenge = buildChallenge({ frogId, inscriptionId, nonce, issuedAt, expiresAt })
    return NextResponse.json({ challenge, nonce })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 })
  }
}
