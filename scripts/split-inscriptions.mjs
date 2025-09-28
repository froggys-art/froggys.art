#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const projectRoot = process.cwd();
  const inputPath = path.join(projectRoot, 'inscriptions.json');
  const outputDir = path.join(projectRoot, 'public', 'frogs', 'json');

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Read and parse inscriptions
  const raw = await fs.readFile(inputPath, 'utf8');
  let items;
  try {
    items = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse inscriptions.json as JSON:', err);
    process.exit(1);
  }

  if (!Array.isArray(items)) {
    console.error('Expected inscriptions.json to be a JSON array.');
    process.exit(1);
  }

  let written = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i] ?? {};

    // Derive file number from meta.name (e.g., "Bitcoin Frog #123"), otherwise fallback to index+1
    const name = item?.meta?.name;
    let numFromName = null;
    if (typeof name === 'string') {
      const match = name.match(/#(\d+)/);
      if (match) {
        numFromName = parseInt(match[1], 10);
      }
    }
    const fileNumber = Number.isInteger(numFromName) && numFromName > 0 ? numFromName : i + 1;

    // Normalize output shape and key order to match the example
    const meta = item?.meta ?? {};
    const metaNormalized = {};
    if (Object.prototype.hasOwnProperty.call(meta, 'name')) metaNormalized.name = meta.name;
    if (Object.prototype.hasOwnProperty.call(meta, 'attributes')) metaNormalized.attributes = meta.attributes ?? [];
    // Preserve any additional meta fields after name/attributes if present
    for (const [k, v] of Object.entries(meta)) {
      if (k !== 'name' && k !== 'attributes') metaNormalized[k] = v;
    }

    const outObject = {
      id: item?.id,
      meta: metaNormalized,
    };

    const outPath = path.join(outputDir, `${fileNumber}.json`);
    await fs.writeFile(outPath, JSON.stringify(outObject, null, 2) + '\n', 'utf8');
    written++;

    if (written % 100 === 0) {
      console.log(`Wrote ${written} files...`);
    }
  }

  console.log(`Done. Wrote ${written} files to ${outputDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
