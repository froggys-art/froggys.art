#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const FULL_DIR = path.join(ROOT, 'public', 'frogs', 'full')
const THUMBS_DIR = path.join(ROOT, 'public', 'frogs', 'thumbs')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const DATA_JSON = path.join(DATA_DIR, 'frogs.json')

function getArg(name, def) {
  const idx = process.argv.indexOf(name)
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]
  return def
}

const WIDTH = Number(getArg('--width', '300'))
const QUALITY = Number(getArg('--quality', '70'))
const FORCE = process.argv.includes('--force')

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await exists(FULL_DIR))) {
    console.error(`Source directory not found: ${FULL_DIR}`)
    process.exit(1)
  }
  await fs.mkdir(THUMBS_DIR, { recursive: true })
  await fs.mkdir(DATA_DIR, { recursive: true })

  const entries = await fs.readdir(FULL_DIR)
  const files = entries.filter((n) => /\.(webp|png|jpe?g)$/i.test(n))
  let generated = 0
  const items = []

  for (const name of files) {
    const inPath = path.join(FULL_DIR, name)
    const id = path.basename(name, path.extname(name))
    const outName = `${id}.webp`
    const outPath = path.join(THUMBS_DIR, outName)

    if (!FORCE) {
      try {
        const [srcStat, outStat] = await Promise.all([fs.stat(inPath), fs.stat(outPath)])
        if (outStat.mtimeMs >= srcStat.mtimeMs) {
          // up to date
        } else {
          await sharp(inPath)
            .resize({ width: WIDTH, height: WIDTH, fit: 'cover' })
            .webp({ quality: QUALITY })
            .toFile(outPath)
          generated++
        }
      } catch {
        // Out file missing or error; generate
        await sharp(inPath)
          .resize({ width: WIDTH, height: WIDTH, fit: 'cover' })
          .webp({ quality: QUALITY })
          .toFile(outPath)
        generated++
      }
    } else {
      await sharp(inPath)
        .resize({ width: WIDTH, height: WIDTH, fit: 'cover' })
        .webp({ quality: QUALITY })
        .toFile(outPath)
      generated++
    }

    items.push({
      frog_id: Number(id),
      thumb: `/frogs/thumbs/${outName}`,
      full: `/frogs/full/${name}`,
    })
  }

  // Sort by frog_id
  items.sort((a, b) => a.frog_id - b.frog_id)

  await fs.writeFile(DATA_JSON, JSON.stringify(items, null, 2), 'utf8')

  console.log(`Thumbs: generated ${generated} file(s) to ${THUMBS_DIR}`)
  console.log(`Wrote metadata: ${DATA_JSON}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
