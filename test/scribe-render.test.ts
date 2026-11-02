// The Scribe's renderer, run in Node on the same module the Worker bundles.
// Layout is checked on satori's own measurements; only a few cases are drawn
// to PNG, since resvg takes about half a second a page.

import fs from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';
import { init as initSatori, type SatoriNode } from 'satori/standalone';
import { initWasm as initResvg } from '@resvg/resvg-wasm';

import { FILING_LIMITS, IMPORTANCE_LEVELS, type ParchmentRequest } from '../shared/filing';
import { PAGE_HEIGHTS, WIDTH, deckle, parchmentPng, parchmentSvg, type ScribeAssets } from '../scribe/src/render';
import { SAMPLES } from '../scribe/samples';

const ROOT = path.resolve(__dirname, '..');
const read = (file: string): ArrayBuffer => {
  const bytes = fs.readFileSync(path.join(ROOT, file));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

let assets: ScribeAssets;

beforeAll(async () => {
  await initSatori(read('node_modules/satori/yoga.wasm'));
  await initResvg(read('node_modules/@resvg/resvg-wasm/index_bg.wasm'));
  assets = {
    signature: read('node_modules/@fontsource/mr-de-haviland/files/mr-de-haviland-latin-400-normal.woff'),
    printed: read('node_modules/@fontsource/im-fell-english-sc/files/im-fell-english-sc-latin-400-normal.woff'),
    hand: read('node_modules/@fontsource/caveat/files/caveat-latin-400-normal.woff'),
    handBold: read('node_modules/@fontsource/caveat/files/caveat-latin-700-normal.woff'),
    parchment: Object.fromEntries(PAGE_HEIGHTS.map((h) => [h, read(`scribe/assets/parchment-${h}.jpg`)])) as ScribeAssets['parchment'],
    seal: read('scribe/assets/seal-aldmeri.png'),
  };
});

const sample = (index: number) => SAMPLES[index]!.request;
const withFiling = (request: ParchmentRequest, change: Partial<ParchmentRequest['filing']>): ParchmentRequest => ({
  ...request,
  filing: { ...request.filing, ...change },
});

/** Ordinary prose, as long as a filing may run. */
function longest(): string {
  const words = 'the patrol held the bridge at dawn while scouts from the Markarth detachment searched the ruins below for any sign of the cult'.split(' ');
  let text = '';
  for (let i = 0; text.length < FILING_LIMITS.body; i++) text += words[i % words.length] + ((i + 1) % 60 === 0 ? '\n\n' : ' ');
  return text.slice(0, FILING_LIMITS.body).trim();
}

/** Where the body's text ends, and where the foot (signature and seal) begins. */
async function measure(request: ParchmentRequest) {
  const nodes: SatoriNode[] = [];
  const drawn = await parchmentSvg(request, assets, (node) => nodes.push(node));
  const body = nodes.find((node) => node.key === 'body')!;
  return { ...drawn, bodyEnd: body.top + body.height };
}

describe('the parchment', () => {
  it('lays every sample out with the body clear of the foot', async () => {
    for (const { request } of SAMPLES) {
      const { overrun, width, height } = await measure(request);
      expect(width).toBe(WIDTH);
      expect(PAGE_HEIGHTS).toContain(height);
      expect(overrun).toBe(0);
    }
  });

  it('wraps a body as long as a filing may be, under a three-line title, on the tallest page', async () => {
    const request = withFiling(sample(4), {
      title: 'Talos shrine found beneath the Silver-Blood Inn and the keeper, his visitors, the words',
      body: longest(),
    });
    const { height, size, overrun } = await measure(request);
    expect(height).toBe(2200);
    expect(size).toBeGreaterThanOrEqual(24);
    expect(overrun).toBe(0);
  });

  it('gives a short filing a short page in a large hand', async () => {
    const { height, size } = await measure(sample(1));
    expect(height).toBe(1200);
    expect(size).toBe(36);
  });

  it('writes a longer body on a longer page before it writes smaller', async () => {
    const short = await measure(sample(0));
    const long = await measure(sample(2));
    expect(long.height).toBeGreaterThan(short.height);
  });

  it('draws the Cataclysm’s red border and banner, and only for a Cataclysm', async () => {
    for (const importance of IMPORTANCE_LEVELS) {
      const { svg } = await parchmentSvg(withFiling(sample(0), { importance }), assets);
      expect(svg.includes('#8b1a1a'), importance).toBe(importance === 'cataclysm');
    }
  });

  it('tears the same edge every time, stamped or not', async () => {
    const plain = await parchmentSvg(sample(0), assets);
    const again = await parchmentSvg(sample(0), assets);
    const stamped = await parchmentSvg({ ...sample(0), stamp: { mark: 'approved', at: sample(0).filing.time } }, assets);
    const edge = (svg: string) => /<clipPath id="deckle"><path d="([^"]+)"/.exec(svg)?.[1];
    expect(again.svg).toBe(plain.svg);
    expect(edge(stamped.svg)).toBe(edge(plain.svg));
    // Each filing tears its own way.
    expect(deckle(WIDTH, 1500, 1)).toBe(deckle(WIDTH, 1500, 1));
    expect(deckle(WIDTH, 1500, 1)).not.toBe(deckle(WIDTH, 1500, 2));
  });

  it('re-draws with the Clerk’s stamp in the marked space, and nothing else moves', async () => {
    const at = sample(0).filing.time;
    const plain = await measure(sample(0));
    const approved = await measure({ ...sample(0), stamp: { mark: 'approved', at } });
    const denied = await measure({ ...sample(0), stamp: { mark: 'denied', at } });
    // The seal is the gold PNG; a denial is the red wax.
    expect(plain.svg).not.toContain('data:image/png');
    expect(approved.svg).toContain('data:image/png');
    expect(denied.svg).toContain('a01c1c');
    for (const stamped of [approved, denied]) {
      expect(stamped.height).toBe(plain.height);
      expect(stamped.bodyEnd).toBe(plain.bodyEnd);
    }
  });

  it('draws a PNG small enough to post, for every level', { timeout: 30_000 }, async () => {
    for (const importance of IMPORTANCE_LEVELS) {
      const png = await parchmentPng(withFiling(sample(3), { importance }), assets);
      expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      // Width is the first field of the IHDR chunk.
      expect(new DataView(png.buffer, png.byteOffset).getUint32(16)).toBe(WIDTH);
      expect(png.byteLength).toBeLessThan(2 * 1024 * 1024);
    }
  });
});
