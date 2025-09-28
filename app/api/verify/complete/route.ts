import { NextResponse } from 'next/server'
import { addVerification, getVerifySession, logEvent, markVerifySessionUsed, upsertWallet } from '../../../lib/memdb'
import { addVerificationDB, getVerifySessionDB, logEventDB, markVerifySessionUsedDB, upsertWalletDB } from '../../../db/client'
import * as bitcoinMessage from 'bitcoinjs-message'
import { Verifier } from 'bip322-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const address: string = body?.address
    const provider = (body?.provider || 'unisat') as 'unisat' | 'okx' | 'xverse'
    const message: string = body?.message
    const signatureInput = body?.signature
    if (!address || typeof address !== 'string') return NextResponse.json({ error: 'address required' }, { status: 400 })
    const prov = provider

    // Extract nonce from message
    const nonceMatch = /Nonce:\s*([0-9a-fA-F]+)/.exec(message || '')
    const nonce = nonceMatch?.[1]
    if (!nonce) return NextResponse.json({ error: 'nonce_missing' }, { status: 400 })

    // Validate session (DB first, then in-memory fallback)
    const sessDB = await getVerifySessionDB(address, nonce)
    const sessMem = getVerifySession(address, nonce)
    const sess = sessDB || sessMem
    if (!sess) return NextResponse.json({ error: 'session_not_found' }, { status: 400 })
    if (sess.status === 'used') return NextResponse.json({ error: 'session_used' }, { status: 400 })
    const now = Date.now()
    const expMs = (sess.expiresAt instanceof Date ? sess.expiresAt.getTime() : sess.expiresAt) || now + 1
    if (expMs < now) return NextResponse.json({ error: 'session_expired' }, { status: 400 })

    // Coalesce and normalize signature
    function coalesceSignature(input: any): string | null {
      let sig: any = input
      if (sig && typeof sig === 'object') {
        if (typeof sig.signature === 'string') sig = sig.signature
        else if (typeof sig.messageSignature === 'string') sig = sig.messageSignature
        else if (typeof sig.result === 'string') sig = sig.result
        else if (typeof sig.base64 === 'string') sig = sig.base64
        else if (typeof sig.hex === 'string') sig = sig.hex
        else return null
      }
      if (typeof sig !== 'string') return null
      return sig
    }

    function normalizeForVerify(sig: string): string {
      let s = (sig || '').trim()
      if (s.startsWith('0x') || s.startsWith('0X')) s = s.slice(2)
      // Remove whitespace/newlines sometimes present in signatures
      s = s.replace(/\s+/g, '')
      // If looks like base64url, convert to base64 and add padding
      if (/-|_/.test(s)) {
        s = s.replace(/-/g, '+').replace(/_/g, '/')
        const pad = s.length % 4
        if (pad) s = s + '='.repeat(4 - pad)
      }
      return s
    }

    const sigCoalesced = coalesceSignature(signatureInput)
    if (!sigCoalesced) {
      return NextResponse.json({ error: 'signature_invalid', hint: 'Unrecognized signature payload' }, { status: 422 })
    }

    // Verify signature: try legacy first, then BIP-322
    let verified = false
    try {
      verified = bitcoinMessage.verify(message, address, sigCoalesced)
    } catch {
      verified = false
    }

    if (!verified) {
      // BIP-322 fallback
      let sigForBip322 = normalizeForVerify(sigCoalesced)
      try {
        // If looks like hex, convert to base64 for bip322-js
        if (/^[0-9a-fA-F]+$/.test(sigForBip322) && sigForBip322.length % 2 === 0) {
          sigForBip322 = Buffer.from(sigForBip322, 'hex').toString('base64')
        }
        verified = Verifier.verifySignature(address, message, sigForBip322)
      } catch {
        verified = false
      }
    }

    if (!verified) {
      // Do not consume session; provide guidance
      return NextResponse.json({ error: 'signature_invalid', hint: 'Signature could not be verified (legacy or BIP-322).' }, { status: 422 })
    }

    // Mark session used
    await markVerifySessionUsedDB(address, nonce)
    markVerifySessionUsed(address, nonce)

    // Record as connected (verified signature)
    upsertWallet(address, prov)
    await upsertWalletDB(address, prov)
    logEvent('verify_complete', { address, provider: prov, message, signature: sigCoalesced, nonce })
    await logEventDB('verify_complete', { address, provider: prov, message, signature: sigCoalesced, nonce }, address)
    const v = addVerification({ walletId: address, status: 'connected' })
    const id = await addVerificationDB({ walletId: address, status: 'connected' })
    return NextResponse.json({ ok: true, verificationId: id || v.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
