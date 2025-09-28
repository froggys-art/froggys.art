import { UNISAT_API_KEY, MOCK_OWNER } from '@/lib/env'

export async function getCurrentOwner(inscriptionId: string, claimedAddress?: string): Promise<string> {
  if (MOCK_OWNER && claimedAddress) return claimedAddress

  const endpoint = `https://open-api.unisat.io/v1/indexer/inscription/info/${encodeURIComponent(inscriptionId)}`
  const headers: Record<string, string> = { 'accept': 'application/json' }
  if (UNISAT_API_KEY) {
    headers['Authorization'] = `Bearer ${UNISAT_API_KEY}`
  }
  const res = await fetch(endpoint, { headers })
  if (!res.ok) {
    throw new Error(`Indexer error ${res.status}`)
  }
  const json = await res.json().catch(() => ({}))
  // Try common fields
  const owner = json?.data?.owner || json?.data?.address || json?.owner || json?.address
  if (!owner || typeof owner !== 'string') {
    throw new Error('Owner not found in indexer response')
  }
  return owner as string
}
