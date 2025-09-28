import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { walletChallenges, frogLinks } from '@/db/schema'
import { VerifyMessageInput } from '@/lib/validation'
import { buildChallenge } from '@/lib/challenge'
import { getCurrentOwner } from '@/lib/owner'
import { isTaprootAddress, isSegwitP2WPKHAddress, verifySegwitEcdsa, verifyTaprootSchnorr, pubkeyToAddressTaproot } from '@/lib/bitcoin'
import { mapFroggyId } from '@/lib/map'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = VerifyMessageInput.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { frogId, inscriptionId, address, signature, pubkey, nonce } = parsed.data

    // 1) Load challenge; check nonce, expiry, and not consumed
    const ch = db.select().from(walletChallenges).where(eq(walletChallenges.nonce, nonce)).all()[0]
    if (!ch || ch.consumed) {
      return NextResponse.json({ error: 'Invalid or consumed challenge' }, { status: 400 })
    }
    if (new Date(ch.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Challenge expired' }, { status: 400 })
    }

    // 2) Rebuild exact challenge string
    const challenge = buildChallenge({
      frogId,
      inscriptionId,
      nonce,
      issuedAt: ch.issuedAt,
      expiresAt: ch.expiresAt,
    })

    // 3) Verify signature depending on address type
    if (isSegwitP2WPKHAddress(address)) {
      const ok = verifySegwitEcdsa(challenge, address, signature)
      if (!ok) return NextResponse.json({ error: 'Invalid P2WPKH message signature' }, { status: 400 })
    } else if (isTaprootAddress(address)) {
      if (!pubkey) {
        return NextResponse.json({ error: 'Taproot verification requires pubkey; or use PSBT flow' }, { status: 400 })
      }
      const derived = pubkeyToAddressTaproot(pubkey)
      if (derived !== address) {
        return NextResponse.json({ error: 'Address/pubkey mismatch' }, { status: 400 })
      }
      const ok = verifyTaprootSchnorr(challenge, signature, pubkey)
      if (!ok) return NextResponse.json({ error: 'Invalid Taproot Schnorr signature' }, { status: 400 })
    } else {
      return NextResponse.json({ error: 'Unsupported address type' }, { status: 400 })
    }

    // 4) Check current owner of inscription
    const currentOwner = await getCurrentOwner(inscriptionId, address)
    if (currentOwner !== address) {
      return NextResponse.json({ error: 'You are not the current owner' }, { status: 403 })
    }

    // 5) Compute mapping, then insert link and consume nonce in a single transaction
    const froggyId = await mapFroggyId(frogId)

    try {
      db.transaction((tx) => {
        // prevent double-link
        const existing = tx.select().from(frogLinks).where(eq(frogLinks.frogId, frogId)).all()[0]
        if (existing) {
          throw new Error('Frog already linked')
        }
        tx.insert(frogLinks).values({
          frogId,
          froggyId,
          inscriptionId,
          ownerAddress: address,
          sig: signature,
          method: 'message',
        }).run()
        tx.update(walletChallenges).set({ consumed: true, address }).where(eq(walletChallenges.nonce, nonce)).run()
      })
    } catch (e: any) {
      const msg = e?.message || 'Link failed'
      if (msg.includes('already linked')) {
        return NextResponse.json({ error: 'Frog already linked' }, { status: 409 })
      }
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ ok: true, froggyId })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 })
  }
}
