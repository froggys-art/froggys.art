#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function extractNumberFromName(name) {
  if (typeof name !== 'string') return null;
  const m = name.match(/#(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const [, , backgroundValueArg, outputFolderArg] = process.argv;
  if (!backgroundValueArg) {
    console.error('Usage: node scripts/copy-by-background.mjs "<Background Value>" [output-folder-name]');
    console.error('Example: node scripts/copy-by-background.mjs "Bitcoin Orange"');
    process.exit(1);
  }

  const projectRoot = process.cwd();
  const inscriptionsPath = path.join(projectRoot, 'inscriptions.json');
  const imagesDir = path.join(projectRoot, 'public', 'frogs', 'full');
  const defaultFolder = `background-${slugify(backgroundValueArg)}`;
  const targetFolderName = outputFolderArg || defaultFolder;
  const targetDir = path.join(projectRoot, 'public', 'frogs', targetFolderName);

  // Read and parse inscriptions
  const raw = await fs.readFile(inscriptionsPath, 'utf8');
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

  const backgroundValue = String(backgroundValueArg);

  // Filter by background
  const matches = [];
  for (const item of items) {
    const attrs = item?.meta?.attributes;
    if (!Array.isArray(attrs)) continue;
    const hasBg = attrs.some(a => a && a.trait_type === 'Background' && a.value === backgroundValue);
    if (hasBg) matches.push(item);
  }

  console.log(`Found ${matches.length} frogs with Background = "${backgroundValue}".`);

  await fs.mkdir(targetDir, { recursive: true });

  let copied = 0;
  let missing = 0;
  const missingFiles = [];

  for (const m of matches) {
    const num = extractNumberFromName(m?.meta?.name);
    if (!Number.isInteger(num) || num <= 0) {
      // Fallback: attempt to use array index + 1 by locating item position
      const idx = items.indexOf(m);
      const fallbackNum = idx >= 0 ? idx + 1 : null;
      if (!fallbackNum) {
        continue;
      }
      const src = path.join(imagesDir, `${fallbackNum}.webp`);
      const dst = path.join(targetDir, `${fallbackNum}.webp`);
      if (await pathExists(src)) {
        await fs.copyFile(src, dst);
        copied++;
      } else {
        missing++;
        missingFiles.push(src);
      }
      continue;
    }

    const src = path.join(imagesDir, `${num}.webp`);
    const dst = path.join(targetDir, `${num}.webp`);

    if (await pathExists(src)) {
      await fs.copyFile(src, dst);
      copied++;
    } else {
      missing++;
      missingFiles.push(src);
    }
  }

  console.log(`Copied ${copied} images to ${targetDir}.`);
  if (missing > 0) {
    console.warn(`Warning: ${missing} images were missing in ${imagesDir}. Example missing:`, missingFiles.slice(0, 5));
  }

  // Also write an index.json with the selected frog numbers and ids for convenience
  try {
    const index = matches.map(m => ({
      number: extractNumberFromName(m?.meta?.name),
      id: m?.id,
      name: m?.meta?.name,
    })).filter(x => Number.isInteger(x.number));
    await fs.writeFile(path.join(targetDir, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
  } catch (e) {
    console.warn('Could not write index.json:', e?.message || e);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
