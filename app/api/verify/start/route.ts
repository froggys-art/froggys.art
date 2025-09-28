import { NextResponse } from 'next/server'
import { createVerifySession, logEvent, upsertWallet } from '../../../lib/memdb'
import { randomBytes } from 'node:crypto'
import { createVerifySessionDB, logEventDB, upsertWalletDB } from '../../../db/client'

function randomNonce(len = 16) {
  const bytes = randomBytes(len)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: Request) {
  try {
    const { address, provider } = await req.json()
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'address required' }, { status: 400 })
    }
    const prov = (provider || 'unisat') as 'unisat' | 'okx' | 'xverse'

    const wallet = upsertWallet(address, prov)
    await upsertWalletDB(address, prov)

    const nonce = randomNonce(16)
    const ts = new Date().toISOString()
    const message = `Bitcoin Frogs Verification\nAddress: ${address}\nNonce: ${nonce}\nTime: ${ts}`
    // 10 minute TTL
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await createVerifySessionDB(address, nonce, expiresAt)
    createVerifySession(address, nonce, expiresAt.getTime())

    logEvent('verify_start', { address, provider: prov, nonce, ts })
    await logEventDB('verify_start', { address, provider: prov, nonce, ts }, address)
    return NextResponse.json({ nonce, message })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
