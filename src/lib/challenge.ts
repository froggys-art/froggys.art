import { SITE_DOMAIN } from '@/lib/env'

export type ChallengeParams = {
  frogId: number
  inscriptionId?: string
  nonce: string
  issuedAt: string // ISO
  expiresAt: string // ISO
}

export function buildChallenge({ frogId, inscriptionId, nonce, issuedAt, expiresAt }: ChallengeParams): string {
  return [
    'Bitcoin Frogs → Froggys Link',
    `Frog ID: ${frogId}`,
    `Inscription: ${inscriptionId ?? ''}`,
    `Nonce: ${nonce}`,
    `Domain: ${SITE_DOMAIN}`,
    `Issued At: ${issuedAt}`,
    `Expires At: ${expiresAt}`,
  ].join('\n')
}
