import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { EAGLE } from '../web/src/pixel/icons/emblem';
import { ICON_NAMES, ICON_SIZE, SHEET_COLUMNS } from '../web/src/pixel/icons/manifest';
import { CLEAR, PALETTE, PIXEL_KEY } from '../web/src/pixel/icons/palette';
import { PALETTE as ROOM_PALETTE } from '../web/src/pixel/palette';
import type { PixelSprite } from '../web/src/pixel/icons/sprite';

const SPRITES = import.meta.glob<PixelSprite>('../web/src/pixel/icons/sprites/*.ts', {
  eager: true,
  import: 'default',
});
function sprite(name: string): PixelSprite {
  const found = SPRITES[`../web/src/pixel/icons/sprites/${name}.ts`];
  if (!found) throw new Error(`no sprites/${name}.ts`);
  return found;
}
const BUILT = 'web/src/assets/pixel/icons';

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

async function decode(file: string) {
  const { data, info } = await sharp(readFileSync(file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

describe('the pixel palette', () => {
  it('is exactly the list the room shares', () => {
    expect(PALETTE).toEqual({
      ink: ['#0b0806', '#1a1209'],
      wood: ['#2b1b10', '#4a2c16', '#6b4020', '#8c5a2e'],
      gold: ['#5a420c', '#8a6d1c', '#c9a227', '#e8cd7a', '#fff2c2'],
      navy: ['#10152a', '#1d2742', '#2f3d63'],
      parchment: ['#e6d6b0', '#cdb88c', '#a88c5c'],
      stone: ['#3b3a38', '#5f5b55', '#8a857c'],
      foliage: ['#2e3a16', '#55662a', '#8f9a3e', '#c9b85a'],
      blueMagic: ['#0f2a4a', '#1f5e9e', '#49a8e8', '#bfe8ff'],
      crimson: ['#4a0d10', '#7c1f24', '#b83a3a'],
      flame: ['#ffb347', '#ffe08a'],
    });
  });

  // The room's palette is the list; the icons only letter it differently.
  it('is the room palette, colour for colour', () => {
    expect(Object.values(PALETTE).flat().sort()).toEqual(ROOM_PALETTE.map((s) => s.hex).sort());
  });

  it('gives every colour one letter, and no letter a colour outside it', () => {
    const colours = Object.values(PALETTE).flat();
    const lettered = Object.values(PIXEL_KEY);
    expect([...lettered].sort()).toEqual([...colours].sort());
    expect(Object.keys(PIXEL_KEY)).not.toContain(CLEAR);
  });
});

describe('the icon grids', () => {
  it('are the 35 icons of the reference sheet, one file each', () => {
    expect(ICON_NAMES).toHaveLength(35);
    expect(new Set(ICON_NAMES).size).toBe(35);
    expect(Object.keys(SPRITES).map((file) => file.replace(/^.*\/(.+)\.ts$/, '$1')).sort()).toEqual([...ICON_NAMES].sort());
  });

  it('are each 32 by 32, drawn only in palette letters', () => {
    const faults: string[] = [];
    for (const name of ICON_NAMES) {
      const { rows, name: own } = sprite(name);
      if (own !== name) faults.push(`${name}: named '${own}'`);
      if (rows.length !== ICON_SIZE) faults.push(`${name}: ${rows.length} rows`);
      rows.forEach((row, y) => {
        if (row.length !== ICON_SIZE) faults.push(`${name}: row ${y} is ${row.length} wide`);
        for (const letter of row) if (letter !== CLEAR && !(letter in PIXEL_KEY)) faults.push(`${name}: '${letter}' in row ${y}`);
      });
    }
    expect(faults).toEqual([]);
  });

  it('carry one eagle, nine to eleven pixels wide and the same on every icon', () => {
    const width = Math.max(...EAGLE.map((row) => row.length));
    expect(width).toBeGreaterThanOrEqual(9);
    expect(width).toBeLessThanOrEqual(11);
    const gold = new Set(EAGLE.join('').replaceAll(CLEAR, ''));

    const bearing = ICON_NAMES.filter((name) => sprite(name).emblem);
    expect(bearing).toEqual(['book-emblem', 'books-emblem', 'key-emblem', 'ship-emblem', 'banner-assembly', 'scroll-emblem']);
    for (const name of bearing) {
      const { emblem, rows } = sprite(name);
      const { x, y } = emblem!;
      EAGLE.forEach((row, dy) =>
        [...row].forEach((letter, dx) => {
          const drawn = rows[y + dy]?.[x + dx];
          // The eagle's own pixels match, and the ground showing through it
          // is never its gold, which would change the silhouette.
          if (letter === CLEAR) expect(gold.has(drawn!), `${name} at ${x + dx},${y + dy}`).toBe(false);
          else expect(drawn, `${name} at ${x + dx},${y + dy}`).toBe(letter);
        }),
      );
    }
  });
});

describe('the built icons', () => {
  const palette = new Set<string>(Object.values(PIXEL_KEY));

  it('are 32x32 PNGs of palette colours with no partial alpha, matching their grids', async () => {
    const faults: string[] = [];
    for (const name of ICON_NAMES) {
      const { data, width, height } = await decode(`${BUILT}/${name}.png`);
      if (width !== ICON_SIZE || height !== ICON_SIZE) {
        faults.push(`${name}: ${width}x${height}`);
        continue;
      }
      const { rows } = sprite(name);
      for (let i = 0; i < width * height; i++) {
        const [r, g, b, a] = data.subarray(i * 4, i * 4 + 4);
        const letter = rows[Math.floor(i / width)]![i % width]!;
        if (a !== 0 && a !== 255) faults.push(`${name}: alpha ${a} at pixel ${i}`);
        else if (a === 255 && !palette.has(hex(r!, g!, b!))) faults.push(`${name}: ${hex(r!, g!, b!)} at pixel ${i}`);
        else if ((a === 0) !== (letter === CLEAR) || (a === 255 && hex(r!, g!, b!) !== PIXEL_KEY[letter as keyof typeof PIXEL_KEY])) {
          faults.push(`${name}: pixel ${i} differs from its grid (rerun scripts/build-pixel-icons.mjs)`);
        }
      }
    }
    expect(faults).toEqual([]);
  });

  it('are laid out on the sheet in manifest order', async () => {
    const sheet = await decode(`${BUILT}/sheet.png`);
    expect(sheet.width).toBe(SHEET_COLUMNS * ICON_SIZE);
    expect(sheet.height).toBe(Math.ceil(ICON_NAMES.length / SHEET_COLUMNS) * ICON_SIZE);
    for (const [i, name] of ICON_NAMES.entries()) {
      const icon = await decode(`${BUILT}/${name}.png`);
      const left = (i % SHEET_COLUMNS) * ICON_SIZE;
      const top = Math.floor(i / SHEET_COLUMNS) * ICON_SIZE;
      for (let y = 0; y < ICON_SIZE; y++) {
        const from = ((top + y) * sheet.width + left) * 4;
        expect(Buffer.compare(sheet.data.subarray(from, from + ICON_SIZE * 4), icon.data.subarray(y * ICON_SIZE * 4, (y + 1) * ICON_SIZE * 4)), `${name} row ${y}`).toBe(0);
      }
    }
  });

  it('are drawn by PixelIcon at whole-number scales, unsmoothed', () => {
    const component = readFileSync('web/src/pixel/icons/PixelIcon.tsx', 'utf8');
    expect(component).toContain("imageRendering: 'pixelated'");
    expect(component).toContain('Math.max(1, Math.floor(scale))');
  });
});
