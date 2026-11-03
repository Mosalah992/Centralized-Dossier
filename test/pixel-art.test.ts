import { readFileSync, readdirSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { CORE, MASTER, PANELS, PLACES, PORTRAIT, ROOM } from '../web/src/pixel/layout';
import { PALETTE } from '../web/src/pixel/palette';
import { heroScale, pixelScale, stackScale } from '../web/src/pixel/scale';

const SPRITES = 'web/src/assets/pixel';
const manifest = JSON.parse(readFileSync(`${SPRITES}/manifest.json`, 'utf8')) as Record<string, { w: number; h: number; frames?: number; fw?: number }>;
const hexOf = (r: number, g: number, b: number) => `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

describe('the palette', () => {
  it('names each colour once, by one letter', () => {
    expect(new Set(PALETTE.map((s) => s.key)).size).toBe(PALETTE.length);
    expect(new Set(PALETTE.map((s) => s.hex)).size).toBe(PALETTE.length);
    for (const { key, hex } of PALETTE) {
      expect(key).toMatch(/^[A-Za-z]$/);
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('keeps to a pixel artist’s budget', () => {
    expect(PALETTE.length).toBeLessThanOrEqual(36);
  });
});

describe('the sprites, as built', () => {
  const allowed = new Set(PALETTE.map((s) => s.hex));
  const files = readdirSync(SPRITES).filter((f) => f.endsWith('.png'));

  it('are all in the manifest, at the sizes it gives', async () => {
    expect(files.map((f) => f.replace('.png', '')).sort()).toEqual(Object.keys(manifest).sort());
    for (const file of files) {
      const meta = await sharp(`${SPRITES}/${file}`).metadata();
      const entry = manifest[file.replace('.png', '')]!;
      expect([meta.width, meta.height], file).toEqual([entry.w, entry.h]);
      if (entry.frames) expect(entry.fw! * entry.frames, file).toBe(entry.w);
    }
  });

  // One pixel size, the palette's colours, and no soft edges: every pixel is
  // either a palette colour, fully opaque, or nothing at all.
  it.each(files)('%s holds only palette colours, opaque or empty', async (file) => {
    const { data, info } = await sharp(`${SPRITES}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const strays = new Set<string>();
    for (let i = 0; i < data.length; i += info.channels) {
      const alpha = data[i + 3]!;
      if (alpha === 0) continue;
      if (alpha !== 255) strays.add(`alpha ${alpha}`);
      const hex = hexOf(data[i]!, data[i + 1]!, data[i + 2]!);
      if (!allowed.has(hex)) strays.add(hex);
    }
    expect([...strays]).toEqual([]);
  });

  it('match the places they are drawn for', () => {
    expect([manifest.scene!.w, manifest.scene!.h]).toEqual([MASTER.width, MASTER.height]);
    const frameWidth = (name: string) => manifest[name]!.fw ?? manifest[name]!.w;
    for (const [name, place] of [
      ['bookshelf', PLACES.bookshelf], ['board', PLACES.board], ['scribe', PLACES.scribe],
      ['arch', PLACES.archL], ['cabinet', PLACES.cabinet], ['globe-stand', PLACES.globe],
      ['candle', PLACES.candleL], ['sconce', PLACES.sconceL], ['bough-l', PLACES.boughL],
      ['note', PANELS.note], ['clock', PANELS.clock],
    ] as const) {
      expect([frameWidth(name), manifest[name]!.h], name).toEqual([place.w, place.h]);
    }
    expect([manifest.portrait!.w, manifest.portrait!.h]).toEqual([PORTRAIT.door.w, PORTRAIT.door.h]);
    expect([manifest['portrait-plate']!.w, manifest['portrait-plate']!.h]).toEqual([PORTRAIT.plateArt.w, PORTRAIT.plateArt.h]);
    expect(PORTRAIT.plateArt.y + PORTRAIT.plateArt.h).toBe(PLACES.portrait.h);
  });
});

describe('the cursor', () => {
  const allowed = new Set(PALETTE.map((s) => s.hex));
  it.each([
    ['gauntlet.png', 2],
    ['gauntlet@1.5x.png', 3],
    ['gauntlet@2x.png', 4],
    ['gauntlet@3x.png', 6],
  ])('%s is the 20-pixel gauntlet at %i screen pixels to the art pixel, in palette colours', async (file, k) => {
    const { data, info } = await sharp(`web/src/assets/cursor/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([20 * k, 20 * k]);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      expect(data[i + 3]).toBe(255);
      expect(allowed.has(hexOf(data[i]!, data[i + 1]!, data[i + 2]!))).toBe(true);
    }
  });

  it('clicks where the fingertip is', async () => {
    const css = readFileSync('web/src/styles/base.css', 'utf8');
    const spots = [...css.matchAll(/gauntlet[^;]*\) (\d+) (\d+), auto;/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(spots.length).toBeGreaterThan(0);
    const { data, info } = await sharp('web/src/assets/cursor/gauntlet.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const [x, y] of spots) expect(data[(y! * info.width + x!) * 4 + 3], `${x},${y}`).toBe(255);
  });
});

describe('the room on the grid', () => {
  it('keeps every object inside the core, which every window shows', () => {
    for (const [name, p] of Object.entries({ ...PLACES, ...PANELS })) {
      if (name.startsWith('bough')) continue; // the boughs run off the corners on purpose
      expect(p.x, name).toBeGreaterThanOrEqual(-CORE.width / 2);
      expect(p.x + p.w, name).toBeLessThanOrEqual(CORE.width / 2);
      expect(p.y, name).toBeGreaterThanOrEqual(0);
      expect(p.y + p.h, name).toBeLessThanOrEqual(CORE.height);
    }
  });

  it('stands the arches and Ancarion on the back wall, and the furniture on the floor before it', () => {
    expect(PLACES.archL.y + PLACES.archL.h).toBe(ROOM.floor);
    expect(PLACES.portrait.y + PLACES.portrait.h).toBe(ROOM.floor);
    for (const name of ['bookshelf', 'cabinet', 'scribe'] as const) {
      expect(PLACES[name].y + PLACES[name].h, name).toBeGreaterThan(ROOM.floor);
    }
  });

  it('mirrors the arches, sconces and candles about the centre', () => {
    expect(PLACES.archL.x + PLACES.archL.w).toBe(-PLACES.archR.x);
    expect(PLACES.sconceL.x + PLACES.sconceL.w).toBe(-PLACES.sconceR.x);
    expect(PLACES.candleL.x + PLACES.candleL.w).toBe(-PLACES.candleR.x);
  });
});

describe('the scale', () => {
  it.each([
    // width, height, device pixel ratio, device pixels per art pixel
    [1366, 768, 1, 3],
    [1920, 1080, 1, 4],
    [2560, 1440, 1, 6],
    [1536, 864, 1.25, 4],
    [1440, 900, 2, 6],
  ])('draws %ix%i at %s dppx with whole device pixels (%i to the art pixel)', (width, height, dpr, k) => {
    const s = pixelScale(width, height, dpr);
    expect(s.k).toBe(k);
    expect(s.px * dpr).toBe(k);
    expect(s.stage).toBe(true);
    // The whole core is in the window.
    expect(CORE.width * s.px).toBeLessThanOrEqual(width);
    expect(CORE.height * s.px).toBeLessThanOrEqual(height);
    // And the picture's corner falls on a device pixel.
    expect(Number.isInteger(Math.round(s.left * dpr * 1000) / 1000)).toBe(true);
    expect(Number.isInteger(Math.round(s.top * dpr * 1000) / 1000)).toBe(true);
  });

  it('stacks the room on a phone, and where the lettering would be too small to read', () => {
    expect(pixelScale(375, 812, 3).stage).toBe(false);
    expect(pixelScale(1024, 768, 1).stage).toBe(false);
    for (const width of [320, 343, 390, 700]) {
      for (const dpr of [1, 2, 3]) {
        expect(Number.isInteger(stackScale(width, dpr) * dpr)).toBe(true);
        expect(Number.isInteger(heroScale(width, 812, dpr) * dpr)).toBe(true);
        expect(PLACES.board.w * stackScale(width, dpr)).toBeLessThanOrEqual(width);
        expect(PLACES.portrait.w * heroScale(width, 812, dpr)).toBeLessThanOrEqual(width);
      }
    }
  });
});

