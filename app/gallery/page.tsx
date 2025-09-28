import fs from 'node:fs/promises'
import path from 'node:path'
import Image from 'next/image'

export const dynamic = 'force-static'

type FrogItem = { frog_id: number; thumb: string; full: string }

async function loadItems(): Promise<FrogItem[]> {
  const root = process.cwd()
  const dataPath = path.join(root, 'public', 'data', 'frogs.json')
  try {
    const buf = await fs.readFile(dataPath, 'utf8')
    const items = JSON.parse(buf) as FrogItem[]
    return items
  } catch {
    // Fallback: scan public/frogs/full and infer items
    const fullDir = path.join(root, 'public', 'frogs', 'full')
    const entries = await fs.readdir(fullDir)
    const files = entries.filter((n) => /\.(webp|png|jpe?g)$/i.test(n))
    const items = files.map((name) => {
      const id = Number(path.basename(name, path.extname(name)))
      return {
        frog_id: id,
        thumb: `/frogs/full/${name}`,
        full: `/frogs/full/${name}`,
      }
    })
    items.sort((a, b) => a.frog_id - b.frog_id)
    return items
  }
}

export default async function GalleryPage() {
  const items = await loadItems()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Gallery</h1>
      <p className="text-slate-300">Powered by local images in <code>public/frogs/</code>. Thumbs generated into <code>public/frogs/thumbs</code>.</p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((it) => (
          <li key={it.frog_id} className="group relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
            <a href={it.full} target="_blank" rel="noreferrer">
              <Image
                src={it.thumb}
                alt={`Frog ${it.frog_id}`}
                width={300}
                height={300}
                className="w-full h-auto object-cover group-hover:opacity-90 transition"
                placeholder="empty"
                loading="lazy"
              />
            </a>
            <div className="absolute bottom-0 left-0 right-0 p-2 text-xs text-slate-200 bg-gradient-to-t from-black/60 to-transparent">#{it.frog_id}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
