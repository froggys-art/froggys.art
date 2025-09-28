import { NextResponse } from 'next/server'
import path from 'node:path'
import { promises as fs } from 'node:fs'

type Attr = { trait_type?: string; value?: string }

type InscriptionItem = {
  id?: string
  meta?: {
    name?: string
    attributes?: Attr[]
  }
}

let TRAITS_CACHE: null | {
  types: { trait_type: string; values: { value: string; count: number }[] }[]
} = null

async function loadInscriptions(): Promise<InscriptionItem[]> {
  const p = path.join(process.cwd(), 'public', 'frogs', 'inscriptions.json')
  const raw = await fs.readFile(p, 'utf8')
  const data = JSON.parse(raw)
  if (!Array.isArray(data)) return []
  return data
}

export async function GET() {
  try {
    if (!TRAITS_CACHE) {
      const items = await loadInscriptions()
      const map = new Map<string, Map<string, number>>()
      for (const it of items) {
        const attrs = it?.meta?.attributes
        if (!Array.isArray(attrs)) continue
        for (const a of attrs) {
          const t = (a?.trait_type || '').trim()
          const v = (a?.value || '').toString().trim()
          if (!t || !v) continue
          if (!map.has(t)) map.set(t, new Map())
          const sub = map.get(t)!
          sub.set(v, (sub.get(v) || 0) + 1)
        }
      }
      const types = Array.from(map.entries()).map(([trait_type, vals]) => ({
        trait_type,
        values: Array.from(vals.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([value, count]) => ({ value, count })),
      }))
      TRAITS_CACHE = { types }
    }
    return NextResponse.json(TRAITS_CACHE)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to build traits index' }, { status: 500 })
  }
}
