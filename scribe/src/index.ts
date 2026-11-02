// The Scribe: draws a filing's parchment. Reached only from the Pages project
// by service binding (wrangler.toml sets workers_dev = false and no route), so
// it has no gate of its own; whoever can call it is already the archive.
//
//   POST /render   body: ParchmentRequest (shared/filing.ts)  →  image/png
//
// Everything is imported statically. Workers refuse to compile WebAssembly from
// bytes at runtime, so satori's layout engine and resvg arrive as compiled
// modules, and the fonts and the sheet arrive as data, all inside the bundle.

import { init as initSatori } from 'satori/standalone';
import yoga from 'satori/yoga.wasm';
import { initWasm as initResvg } from '@resvg/resvg-wasm';
import resvg from '@resvg/resvg-wasm/index_bg.wasm';

import signature from '@fontsource/mr-de-haviland/files/mr-de-haviland-latin-400-normal.woff';
import printed from '@fontsource/im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff';
import hand from '@fontsource/caveat/files/caveat-latin-400-normal.woff';
import handBold from '@fontsource/caveat/files/caveat-latin-700-normal.woff';
import parchment1200 from '../assets/parchment-1200.jpg';
import parchment1500 from '../assets/parchment-1500.jpg';
import parchment1850 from '../assets/parchment-1850.jpg';
import parchment2200 from '../assets/parchment-2200.jpg';
import seal from '../assets/seal-aldmeri.png';

import { checkParchmentRequest } from '../../shared/filing';
import { parchmentPng, type ScribeAssets } from './render';

const ASSETS: ScribeAssets = {
  signature,
  printed,
  hand,
  handBold,
  parchment: { 1200: parchment1200, 1500: parchment1500, 1850: parchment1850, 2200: parchment2200 },
  seal,
};

let ready: Promise<void> | null = null;
function prepare(): Promise<void> {
  ready ??= Promise.all([initSatori(yoga), initResvg(resvg)]).then(() => undefined);
  // A failed start is not remembered, or one bad cold start would poison the isolate.
  ready.catch(() => {
    ready = null;
  });
  return ready;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/render') return json(404, { error: 'Nothing is drawn here.' });
    if (request.method !== 'POST') return json(405, { error: 'POST a filing to draw it.' });

    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return json(400, { error: 'Not JSON.' });
    }
    const checked = checkParchmentRequest(input);
    if (!checked.ok) return json(422, { error: checked.error });

    await prepare();
    const png = await parchmentPng(checked.value, ASSETS);
    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.byteLength),
        // The archive caches what it serves; the Scribe only draws.
        'Cache-Control': 'no-store',
      },
    });
  },
} satisfies ExportedHandler;
