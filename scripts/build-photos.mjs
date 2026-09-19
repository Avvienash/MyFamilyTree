import { readdir, mkdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import sharp from 'sharp';

const SRC = 'photos-src';
const OUT = 'public/photos';
const SIZE = 256; // a 64px portrait at 3x DPR

await mkdir(OUT, { recursive: true });
const files = await readdir(SRC).catch(() => []);
const ids = new Set();

for (const file of files) {
  if (!/\.(jpe?g|png|webp|tiff?|avif)$/i.test(file)) continue;
  const id = basename(file, extname(file));
  await sharp(join(SRC, file))
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toFile(join(OUT, `${id}.webp`));
  ids.add(id);
  console.log(`${id}.webp`);
}

const family = JSON.parse(await readFile('public/data/family.json', 'utf8'));
const existing = new Set(
  (await readdir(OUT).catch(() => [])).map((f) => basename(f, extname(f))),
);
const missing = family.people.filter((p) => !p.unknown && !existing.has(p.id));
console.log(`${ids.size} written · ${missing.length} of ${family.people.length} without a photo`);
