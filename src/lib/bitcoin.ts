import { schnorr } from '@noble/curves/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { hexToBytes } from '@noble/hashes/utils'
import * as bitcoin from 'bitcoinjs-lib'
import * as bitcoinMessage from 'bitcoinjs-message'
import { BITCOIN_NETWORK } from '@/lib/env'

const network = BITCOIN_NETWORK === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin

export function isTaprootAddress(addr: string) {
  return addr.toLowerCase().startsWith('bc1p') || addr.toLowerCase().startsWith('tb1p')
}

export function isSegwitP2WPKHAddress(addr: string) {
  return addr.toLowerCase().startsWith('bc1q') || addr.toLowerCase().startsWith('tb1q')
}

export function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

export function hashMessageSimple(message: string): Uint8Array {
  return sha256(utf8ToBytes(message))
}

export function pubkeyToAddressTaproot(pubkeyHex: string): string {
  let pub = Buffer.from(pubkeyHex, 'hex')
  // If 33-byte compressed key is provided, drop the first byte to get x-only 32 bytes
  if (pub.length === 33) pub = pub.subarray(1)
  if (pub.length !== 32) throw new Error('Invalid taproot pubkey length')
  const { address } = bitcoin.payments.p2tr({ internalPubkey: pub, network })
  if (!address) throw new Error('Failed to derive taproot address')
  return address
}

export function verifyTaprootSchnorr(message: string, signatureHex: string, pubkeyHex: string): boolean {
  const msgHash = hashMessageSimple(message)
  let pub = hexToBytes(pubkeyHex)
  if (pub.length === 33) pub = pub.subarray(1)
  if (pub.length !== 32) return false
  const sig = hexToBytes(signatureHex)
  try {
    return schnorr.verify(sig, msgHash, pub)
  } catch {
    return false
  }
}

export function verifySegwitEcdsa(message: string, address: string, signature: string): boolean {
  // Try base64 first (common for bitcoinjs-message), then hex
  let ok = false
  try {
    ok = bitcoinMessage.verify(message, address, Buffer.from(signature, 'base64'), network as any)
  } catch {
    try {
      ok = bitcoinMessage.verify(message, address, Buffer.from(signature, 'hex'), network as any)
    } catch {
      ok = false
    }
  }
  return ok
}
