import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

export const OUT = 'public/photos';
export const SRC = 'photos-src';

/** 256px covers the 64px portrait at 3x DPR. EXIF is dropped on the way out. */
const SIZE = 256;

/** Derive the published portrait for one person. Returns the output path. */
export async function derivePhoto(input, id) {
  const out = join(OUT, `${id}.webp`);
  await mkdir(dirname(out), { recursive: true });
  await sharp(input)
    .resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: 80 })
    .toFile(out);
  return out;
}
