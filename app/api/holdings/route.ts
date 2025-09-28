import { NextResponse } from 'next/server'
import path from 'node:path'
import { promises as fs } from 'node:fs'

let FROG_ID_TO_NUM: Map<string, number> | null = null

function parseNumFromName(name?: string | null) {
  if (!name) return null
  const m = name.match(/#(\d+)/)
  return m ? parseInt(m[1], 10) : null
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
      if (id && num) map.set(id, num)
    }
  }
  FROG_ID_TO_NUM = map
}

async function fetchHiro(address: string): Promise<string[]> {
  const ids: string[] = []
  let offset = 0
  const limit = 200
  for (let i = 0; i < 20; i++) {
    const url = `https://ordinals.hiro.so/api/v1/inscriptions/address/${encodeURIComponent(address)}?limit=${limit}&offset=${offset}`
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) break
    const j = await r.json()
    const list: any[] = Array.isArray(j?.results) ? j.results : (Array.isArray(j?.inscriptions) ? j.inscriptions : [])
    if (list.length === 0) break
    for (const it of list) {
      const id: string | undefined = it?.id || it?.inscription_id
      if (id) ids.push(id)
    }
    if (list.length < limit) break
    offset += limit
  }
  return ids
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const address = url.searchParams.get('address')
    if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 })

    await ensureIndex()
    const ids = await fetchHiro(address)
    const set = new Set(ids)
    const map = FROG_ID_TO_NUM!
    const numbers: number[] = []
    const ownedIds: string[] = []
    for (const [id, num] of map.entries()) {
      if (set.has(id)) {
        numbers.push(num)
        ownedIds.push(id)
      }
    }
    numbers.sort((a, b) => a - b)
    return NextResponse.json({ count: numbers.length, numbers, ids: ownedIds })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
