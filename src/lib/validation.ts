import { z } from 'zod'

export const bech32Address = z.string().regex(/^(bc1|tb1)[0-9a-z]+$/, 'Invalid bech32 address')
export const hex = z.string().regex(/^(0x)?[0-9a-fA-F]+$/, 'Invalid hex string')

export const ChallengeInput = z.object({
  frogId: z.number().int().positive(),
  inscriptionId: z.string().min(4),
})

export const VerifyMessageInput = z.object({
  frogId: z.number().int().positive(),
  inscriptionId: z.string().min(4),
  address: bech32Address,
  signature: z.string().min(8), // allow base64 or hex
  pubkey: hex.optional(), // required for Taproot (bc1p) wallets
  nonce: z.string().min(8),
})

export const VerifyPsbtInput = z.object({
  frogId: z.number().int().positive(),
  inscriptionId: z.string().min(4),
  address: bech32Address,
  psbtHex: hex,
  nonce: z.string().min(8),
})
