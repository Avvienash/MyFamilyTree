import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { derivePhoto, OUT, SRC } from './photo.mjs';

// Bulk re-import. The editor derives each photo on upload, so this is only
// needed when dropping a batch of files into photos-src by hand.
const files = await readdir(SRC).catch(() => []);
let written = 0;

for (const file of files) {
  if (!/\.(jpe?g|png|webp|tiff?|avif)$/i.test(file)) continue;
  const id = basename(file, extname(file));
  console.log(await derivePhoto(join(SRC, file), id));
  written++;
}

const family = JSON.parse(await readFile('public/data/family.json', 'utf8'));
const have = new Set((await readdir(OUT).catch(() => [])).map((f) => basename(f, extname(f))));
const missing = family.people.filter((p) => !p.unknown && !have.has(p.id));
console.log(`${written} written · ${missing.length} of ${family.people.length} without a photo`);
