import { NextResponse } from 'next/server'
import path from 'node:path'
import { promises as fs } from 'node:fs'

type Attr = { trait_type?: string; value?: string }

type Item = {
  num: number
  id: string | undefined
  name: string | undefined
  attributes: Attr[]
}

type Index = {
  itemsByNum: Map<number, Item>
  byTrait: Map<string, Map<string, Set<number>>>
  allNums: number[]
}

let INDEX: Index | null = null

function extractNumberFromName(name?: string | null): number | null {
  if (!name) return null
  const m = name.match(/#(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

async function buildIndex(): Promise<Index> {
  if (INDEX) return INDEX
  const file = path.join(process.cwd(), 'public', 'frogs', 'inscriptions.json')
  const raw = await fs.readFile(file, 'utf8')
  const arr: any[] = JSON.parse(raw)
  const itemsByNum = new Map<number, Item>()
  const byTrait = new Map<string, Map<string, Set<number>>>()
  const allNums: number[] = []

  for (const it of arr) {
    const name: string | undefined = it?.meta?.name
    const id: string | undefined = it?.id
    const num = extractNumberFromName(name)
    const attributes: Attr[] = Array.isArray(it?.meta?.attributes) ? it.meta.attributes : []
    if (!num) continue
    const item: Item = { num, id, name, attributes }
    itemsByNum.set(num, item)
    allNums.push(num)

    for (const a of attributes) {
      const t = (a?.trait_type || '').trim()
      const v = (a?.value + '' || '').trim()
      if (!t || !v) continue
      if (!byTrait.has(t)) byTrait.set(t, new Map())
      const m = byTrait.get(t)!
      if (!m.has(v)) m.set(v, new Set())
      m.get(v)!.add(num)
    }
  }

  allNums.sort((a, b) => a - b)
  INDEX = { itemsByNum, byTrait, allNums }
  return INDEX
}

function parseSelections(searchParams: URLSearchParams): Map<string, Set<string>> {
  // supports: t=Trait:Value (repeated) or traits=<json>
  const out = new Map<string, Set<string>>()
  // JSON form
  const traitsJSON = searchParams.get('traits')
  if (traitsJSON) {
    try {
      const obj = JSON.parse(traitsJSON)
      for (const k of Object.keys(obj)) {
        const arr = Array.isArray(obj[k]) ? obj[k] : [obj[k]]
        for (const val of arr) {
          if (!out.has(k)) out.set(k, new Set())
          out.get(k)!.add(String(val))
        }
      }
    } catch {}
  }
  // key-value pairs
  const tParams = searchParams.getAll('t')
  for (const t of tParams) {
    const idx = t.indexOf(':')
    if (idx <= 0) continue
    const key = t.slice(0, idx).trim()
    const val = t.slice(idx + 1).trim()
    if (!key || !val) continue
    if (!out.has(key)) out.set(key, new Set())
    out.get(key)!.add(val)
  }
  return out
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const params = url.searchParams
    const { itemsByNum, byTrait, allNums } = await buildIndex()

    const selections = parseSelections(params)
    let resultNums: number[] = []

    if (selections.size === 0) {
      resultNums = allNums.slice()
    } else {
      // AND across different trait types, OR within the same trait type
      let first = true
      for (const [trait, values] of selections.entries()) {
        const traitMap = byTrait.get(trait)
        if (!traitMap) { resultNums = []; break }
        // union within this trait
        const union = new Set<number>()
        for (const v of values) {
          const s = traitMap.get(v)
          if (s) for (const n of s) union.add(n)
        }
        const nums = Array.from(union)
        if (first) {
          resultNums = nums
          first = false
        } else {
          // intersect
          const setPrev = new Set(resultNums)
          resultNums = nums.filter(n => setPrev.has(n))
        }
        if (resultNums.length === 0) break
      }
      resultNums.sort((a, b) => a - b)
    }

    const limit = Math.max(0, Math.min(parseInt(params.get('limit') || '0', 10) || 0, 10000))
    const offset = Math.max(0, parseInt(params.get('offset') || '0', 10) || 0)
    let sliced = resultNums
    if (offset || limit) {
      const end = limit ? offset + limit : undefined
      sliced = resultNums.slice(offset, end)
    }

    const items = sliced.map((num) => {
      const base = itemsByNum.get(num)!
      return {
        num,
        id: base?.id,
        name: base?.name,
        attributes: base?.attributes || [],
        src: `/frogs/full/${num}.webp`,
      }
    })

    return NextResponse.json({ count: resultNums.length, items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Search failed' }, { status: 500 })
  }
}
