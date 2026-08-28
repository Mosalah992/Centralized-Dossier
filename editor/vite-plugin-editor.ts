// The Archives Editor's filesystem API, as a Vite dev-server plugin.
//
// WHY A PLUGIN AND NOT A SERVER. The editor needs to read and write files on
// this machine, which is a thing the archive itself must never be able to do.
// Putting the API in `configureServer` means it exists only while `npm run dev`
// is running: there is no build output that contains it, no route that could be
// deployed, and nothing to remember to turn off. `apply: 'serve'` says the same
// thing to Vite, and the guard in the handler says it a third time.
//
// IT REFUSES ANYTHING THAT IS NOT LOCAL, and that check is the reason there is
// no warning in CLAUDE.md about this. Vite already binds to localhost alone —
// it prints "Network: use --host to expose" and means it — so by default this
// API is unreachable from anywhere else on the network. But "safe as long as
// nobody passes a flag" is a property that depends on somebody remembering,
// and the flag is one word. The handler checks the remote address instead, so
// `--host` exposes the archive for testing on a phone without exposing a
// filesystem writer along with it.
//
// EVERY WRITE IS SNAPSHOTTED FIRST. content/.history/<slug>/<stamp>.json is
// written before the volume is touched, so the previous state survives even if
// the write that follows is the bad one. That ordering is deliberate: a
// snapshot taken after a save records the mistake, not the thing before it.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Plugin, ViteDevServer } from 'vite';

/** Where each volume's data lives, and what shape it is. */
interface VolumeFile {
  slug: string;
  title: string;
  file: string;
  format: 'json' | 'jsonl';
  /** The generator that turns this file into what the app or Worker imports. */
  emitter: string;
  /** True for the volumes the public repository must never hold. */
  sealed: boolean;
}

export const VOLUME_FILES: VolumeFile[] = [
  {
    slug: 'informants',
    title: 'Thalmor Chronicles',
    file: 'content/chronicle.json',
    format: 'json',
    emitter: 'scripts/emit-chronicle.mjs',
    sealed: true,
  },
  {
    slug: 'enforcement',
    title: 'Ledger of Enforcement',
    file: 'content/enforcement.jsonl',
    format: 'jsonl',
    emitter: 'scripts/emit-enforcement.mjs',
    sealed: true,
  },
  {
    slug: 'history',
    title: 'History of the Realm',
    file: 'content/history.json',
    format: 'json',
    emitter: 'scripts/emit-history.mjs',
    sealed: false,
  },
];

const bySlug = new Map(VOLUME_FILES.map((v) => [v.slug, v]));

/** ISO instant, safe for a filename on Windows. */
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    // A volume is a few hundred kB; anything past a megabyte is a mistake or a
    // client that has lost its place, and neither should be held in memory.
    const LIMIT = 4 * 1024 * 1024;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > LIMIT) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export function archivesEditor(root: string): Plugin {
  const abs = (rel: string) => path.join(root, rel);

  const json = (res: import('node:http').ServerResponse, status: number, body: unknown) => {
    const text = JSON.stringify(body);
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // The editor is a live tool over a file that changes under it.
    res.setHeader('Cache-Control', 'no-store');
    res.end(text);
  };

  return {
    name: 'archives-editor',
    // Dev only. Vite will not run this during `vite build`, so no part of the
    // API can reach dist/ even by accident.
    apply: 'serve',

    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__editor', async (req, res, next) => {
        // Belt and braces: `apply: 'serve'` already guarantees this, but the
        // cost of the second check is a comparison and the cost of being wrong
        // is a write endpoint on a public origin.
        if (process.env.NODE_ENV === 'production') return next();

        /*
         * Local callers only, whatever Vite is bound to.
         *
         * The socket's own address is used rather than the Host header or
         * X-Forwarded-For, because those are supplied by the caller and a
         * caller that wants in would simply write "localhost" in them.
         */
        const remote = req.socket.remoteAddress ?? '';
        const isLocal = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
        if (!isLocal) {
          return json(res, 403, {
            error: 'The Archives Editor answers only to this machine.',
          });
        }

        const url = new URL(req.url ?? '/', 'http://localhost');
        const parts = url.pathname.split('/').filter(Boolean);

        try {
          // GET /__editor/volumes — the shelf, with counts.
          if (req.method === 'GET' && parts.length === 1 && parts[0] === 'volumes') {
            return json(res, 200, {
              volumes: VOLUME_FILES.map((v) => {
                const file = abs(v.file);
                const exists = fs.existsSync(file);
                const raw = exists ? fs.readFileSync(file, 'utf8') : '';
                return {
                  slug: v.slug,
                  title: v.title,
                  file: v.file,
                  format: v.format,
                  sealed: v.sealed,
                  present: exists,
                  bytes: exists ? Buffer.byteLength(raw) : 0,
                  versions: countVersions(root, v.slug),
                };
              }),
            });
          }

          // GET /__editor/volume/:slug
          if (req.method === 'GET' && parts[0] === 'volume' && parts[1]) {
            const v = bySlug.get(parts[1]);
            if (!v) return json(res, 404, { error: 'no such volume' });
            const file = abs(v.file);
            if (!fs.existsSync(file)) return json(res, 404, { error: 'file missing', file: v.file });
            const raw = fs.readFileSync(file, 'utf8');
            return json(res, 200, {
              slug: v.slug,
              format: v.format,
              data: v.format === 'jsonl' ? parseJsonl(raw) : JSON.parse(raw),
              etag: hash(raw),
            });
          }

          // PUT /__editor/volume/:slug — save, snapshotting first.
          if (req.method === 'PUT' && parts[0] === 'volume' && parts[1]) {
            const v = bySlug.get(parts[1]);
            if (!v) return json(res, 404, { error: 'no such volume' });

            const payload = JSON.parse(await readBody(req)) as { data: unknown; etag?: string };
            const file = abs(v.file);
            const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

            /*
             * A CHANGE UNDER THE EDITOR'S FEET IS REFUSED, NOT OVERWRITTEN.
             * The file can move without the browser knowing — a git checkout, a
             * hand edit, a second tab. The client sends back the etag it read;
             * if the file no longer hashes to it, the save is rejected and the
             * editor reloads rather than silently discarding whatever the other
             * writer did.
             */
            if (payload.etag && before && hash(before) !== payload.etag) {
              return json(res, 409, {
                error: 'the file changed since it was opened',
                etag: hash(before),
              });
            }

            const text = v.format === 'jsonl'
              ? `${(payload.data as unknown[]).map((r) => JSON.stringify(r)).join('\n')}\n`
              : `${JSON.stringify(payload.data, null, 2)}\n`;

            // Snapshot BEFORE writing — see the note at the top of this file.
            if (before) {
              const dir = path.join(root, 'content', '.history', v.slug);
              fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(path.join(dir, `${stamp()}${path.extname(v.file)}`), before);
            }

            fs.writeFileSync(file, text);
            return json(res, 200, { ok: true, bytes: Buffer.byteLength(text), etag: hash(text) });
          }

          // GET /__editor/history/:slug            — the snapshots
          // GET /__editor/history/:slug/:name      — one of them
          if (req.method === 'GET' && parts[0] === 'history' && parts[1]) {
            const v = bySlug.get(parts[1]);
            if (!v) return json(res, 404, { error: 'no such volume' });
            const dir = path.join(root, 'content', '.history', v.slug);

            if (parts[2]) {
              // Resolved and checked rather than joined: a name carrying ".."
              // would otherwise read any file on this machine.
              const wanted = path.resolve(dir, parts[2]);
              if (!wanted.startsWith(path.resolve(dir) + path.sep)) {
                return json(res, 400, { error: 'bad name' });
              }
              if (!fs.existsSync(wanted)) return json(res, 404, { error: 'no such version' });
              const raw = fs.readFileSync(wanted, 'utf8');
              return json(res, 200, {
                name: parts[2],
                data: v.format === 'jsonl' ? parseJsonl(raw) : JSON.parse(raw),
              });
            }

            if (!fs.existsSync(dir)) return json(res, 200, { versions: [] });
            const versions = fs.readdirSync(dir)
              .filter((n) => !n.startsWith('.'))
              .sort()
              .reverse()
              .map((name) => ({
                name,
                bytes: fs.statSync(path.join(dir, name)).size,
                takenAt: name.replace(path.extname(name), '').replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z'),
              }));
            return json(res, 200, { versions });
          }

          return next();
        } catch (err) {
          return json(res, 500, { error: (err as Error).message });
        }
      });
    },
  };
}

function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function parseJsonl(raw: string): unknown[] {
  return raw.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
}

function countVersions(root: string, slug: string): number {
  const dir = path.join(root, 'content', '.history', slug);
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => !n.startsWith('.')).length : 0;
}
