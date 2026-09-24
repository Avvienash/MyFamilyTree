import { writeFile, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { derivePhoto, SRC } from './scripts/photo.mjs';

const DATA = 'public/data/family.json';

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const fail = (res: ServerResponse, code: number) => {
  res.statusCode = code;
  res.end('{"ok":false}');
};

/** Admin write API. `apply: 'serve'` means it cannot be built. */
export function adminApi(): Plugin {
  return {
    name: 'admin-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/save', async (req, res) => {
        const body = await readBody(req);
        await writeFile(DATA, JSON.stringify(JSON.parse(body.toString()), null, 2));
        res.end('{"ok":true}');
      });

      // Keeps the original in photos-src (gitignored) and derives the published
      // webp immediately, so uploading is the whole workflow -- no second step.
      server.middlewares.use('/api/photo', async (req, res) => {
        const id = new URL(req.url ?? '', 'http://x').searchParams.get('id');
        const filename = req.headers['x-filename'];
        if (!id || !/^[A-Za-z0-9_-]+$/.test(id) || typeof filename !== 'string') {
          return fail(res, 400);
        }

        const original = join(SRC, id + (extname(filename).toLowerCase() || '.jpg'));
        try {
          await mkdir(SRC, { recursive: true });
          await writeFile(original, await readBody(req));
          await derivePhoto(original, id);
        } catch {
          return fail(res, 500);
        }
        res.end('{"ok":true}');
      });
    },
  };
}
