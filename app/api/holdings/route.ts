import { NextResponse } from 'next/server'
import path from 'node:path'
import { promises as fs } from 'node:fs'

let FROG_ID_TO_NUM: Map<string, number> | null = null

function parseNumFromName(name?: string | null) {
  if (!name) return null
  const m = name.match(/#(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

// Normalize inscription id formats to a canonical, lowercase form.
// Examples:
//  - c173...256a:0  -> c173...256ai0
//  - c173...256ai0  -> c173...256ai0 (unchanged)
function normalizeInscriptionId(id: string | null | undefined): string | null {
  if (!id) return null
  const s = String(id).trim().toLowerCase()
  const m = s.match(/^([0-9a-f]{64}):(\d+)$/)
  if (m) return `${m[1]}i${m[2]}`
  return s
}

async function ensureIndex() {
  if (FROG_ID_TO_NUM) return
  const p = path.join(process.cwd(), 'public', 'frogs', 'inscriptions.json')
  const raw = await fs.readFile(p, 'utf8')
  const arr = JSON.parse(raw)
  const map = new Map<string, number>()
  if (Array.isArray(arr)) {
    for (const it of arr) {
      const id: string | undefined = it?.id
      const name: string | undefined = it?.meta?.name
      const num = parseNumFromName(name)
      if (id && num) {
        const nid = normalizeInscriptionId(id)
        if (nid && !map.has(nid)) map.set(nid, num)
      }
    }
  }
  FROG_ID_TO_NUM = map
}

// Select BIS base URL from environment. You can override with BIS_BASE_URL or set BIS_NETWORK=testnet|signet.
const BIS_BASE_URL = process.env.BIS_BASE_URL
  || (process.env.BIS_NETWORK === 'testnet'
      ? 'https://testnet.api.bestinslot.xyz'
      : process.env.BIS_NETWORK === 'signet'
        ? 'https://signet_api.bestinslot.xyz'
        : 'https://api.bestinslot.xyz')

async function fetchWalletInscriptionIdsBIS(address: string, collectionSlug?: string) {
  const apiKey = process.env.BIS_API_KEY
  if (!apiKey) throw new Error('Missing BIS_API_KEY')

  const collected: string[] = []
  let offset = 0
  const count = 2000 // per docs, wallet inscriptions supports up to 2000

  for (let page = 0; page < 10; page++) { // hard cap pages as a safety net
    const params = new URLSearchParams({
      address,
      sort_by: 'inscr_num',
      order: 'desc',
      offset: String(offset),
      count: String(count),
      exclude_brc20: 'true',
    })
    if (collectionSlug) params.set('collection_slug', collectionSlug)

    const url = `${BIS_BASE_URL}/v3/wallet/inscriptions?${params.toString()}`
    const r = await fetch(url, { headers: { 'x-api-key': apiKey }, cache: 'no-store' })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      throw new Error(`BIS request failed: ${r.status} ${r.statusText} ${text}`)
    }
    const j: any = await r.json()
    const list: any[] = Array.isArray(j?.data) ? j.data : []
    if (list.length === 0) break
    for (const it of list) {
      const nid = normalizeInscriptionId(it?.inscription_id)
      if (nid) collected.push(nid)
    }
    if (list.length < count) break
    offset += count
  }

  // dedupe
  return Array.from(new Set(collected))
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const address = url.searchParams.get('address')
    const debug = url.searchParams.get('debug') === '1'
    // Allow overriding collection slug via query for diagnostics, else env
    const collectionSlug = url.searchParams.get('collection_slug') || url.searchParams.get('slug') || process.env.BIS_COLLECTION_SLUG || undefined
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })

    await ensureIndex()
    const walletIds = await fetchWalletInscriptionIdsBIS(address, collectionSlug || undefined)
    const set = new Set(walletIds)
    const map = FROG_ID_TO_NUM!
    const numbers: number[] = []
    const ownedIds: string[] = []
    for (const [id, num] of map.entries()) {
      if (set.has(id)) {
        numbers.push(num)
        ownedIds.push(id)
      }
    }
    // ensure no duplicate numbers
    const uniqueNumbers = Array.from(new Set(numbers))
    uniqueNumbers.sort((a, b) => a - b)
    const body: any = { count: uniqueNumbers.length, numbers: uniqueNumbers, ids: ownedIds }
    if (debug) {
      body.debug = {
        source: 'bis',
        bis_base_url: BIS_BASE_URL,
        collection_slug_used: collectionSlug || null,
        wallet_ids_count: walletIds.length,
        wallet_ids_sample: walletIds.slice(0, 10),
        frog_index_size: map.size,
        matched_count: uniqueNumbers.length,
      }
    }
    return NextResponse.json(body)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

