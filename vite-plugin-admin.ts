import { writeFile, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import type { IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';

const DATA = 'public/data/family.json';
const PHOTOS_SRC = 'photos-src';

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

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

      server.middlewares.use('/api/photo', async (req, res) => {
        const id = new URL(req.url ?? '', 'http://x').searchParams.get('id');
        const name = req.headers['x-filename'];
        if (!id || !/^[a-z0-9-]+$/i.test(id) || typeof name !== 'string') {
          res.statusCode = 400;
          return res.end('{"ok":false}');
        }
        await mkdir(PHOTOS_SRC, { recursive: true });
        await writeFile(join(PHOTOS_SRC, id + (extname(name) || '.jpg')), await readBody(req));
        res.end('{"ok":true}');
      });
    },
  };
}
