import { NextResponse } from 'next/server'
import path from 'node:path'
import { promises as fs } from 'node:fs'

function sanitizeFolder(input: string | null): string | null {
  if (!input) return null;
  const safe = input.replace(/[^a-zA-Z0-9_-]/g, '');
  return safe || null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const folderParam = sanitizeFolder(searchParams.get('folder')) || 'background-olive'

    const publicDir = path.join(process.cwd(), 'public')
    const folderPath = path.join(publicDir, 'frogs', folderParam)

    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    const images = entries
      .filter((e) => e.isFile() && /\.(png|jpg|jpeg|webp|gif)$/i.test(e.name))
      .map((e) => `/frogs/${folderParam}/${e.name}`)

    return NextResponse.json({ folder: folderParam, images })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list images' }, { status: 500 })
  }
}
