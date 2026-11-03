#!/usr/bin/env node
// Builds the pixel icons from the grids drawn in web/src/pixel/icons/sprites/.
//
// Each sprite is 32 rows of 32 palette letters (palette.ts); this turns every
// letter into exactly one pixel of its colour and '.' into a fully clear one.
// Nothing is resampled, blended or quantised on the way, so what lands in the
// PNG is the grid and nothing else. It writes, into web/src/assets/pixel/icons/:
//
//   <name>.png   each icon on its own, 32x32
//   sheet.png    all of them, 7 across in manifest order: what PixelIcon draws
//
// and a contact sheet at 4x, each icon on a dark and a parchment ground with
// its name, for reviewing the set by eye. That one is not part of the site, so
// it goes to the path given (default: the system temp folder).
//
//   node scripts/build-pixel-icons.mjs [contact-sheet.png]
//
// Run it after changing a sprite; test/pixel-icons.test.ts fails while the
// committed PNGs and the grids disagree.

import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'web/src/pixel/icons');
const OUT = path.join(ROOT, 'web/src/assets/pixel/icons');
const CONTACT = path.resolve(process.argv[2] ?? path.join(os.tmpdir(), 'pixel-icons-contact.png'));
const CONTACT_SCALE = 4;

// The sprites are TypeScript, loaded as Node strips their types.
const load = (file) => import(pathToFileURL(path.join(SOURCE, file)).href);
const { CLEAR, PIXEL_KEY } = await load('palette.ts');
const { EAGLE } = await load('emblem.ts');
const { ICON_NAMES, ICON_SIZE, SHEET_COLUMNS } = await load('manifest.ts');

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The sprite as raw RGBA, after checking it is drawable at all. */
function rasterise(sprite, name) {
  if (sprite.name !== name) throw new Error(`sprites/${name}.ts is named '${sprite.name}'`);
  if (sprite.rows.length !== ICON_SIZE) throw new Error(`${name}: ${sprite.rows.length} rows, not ${ICON_SIZE}`);
  const pixels = Buffer.alloc(ICON_SIZE * ICON_SIZE * 4);
  sprite.rows.forEach((row, y) => {
    if (row.length !== ICON_SIZE) throw new Error(`${name}: row ${y} is ${row.length} wide, not ${ICON_SIZE}`);
    [...row].forEach((letter, x) => {
      if (letter === CLEAR) return;
      const hex = PIXEL_KEY[letter];
      if (!hex) throw new Error(`${name}: '${letter}' at ${x},${y} is not in the palette`);
      pixels.set([...rgb(hex), 255], (y * ICON_SIZE + x) * 4);
    });
  });
  if (sprite.emblem) {
    const { x, y } = sprite.emblem;
    EAGLE.forEach((row, dy) => [...row].forEach((letter, dx) => {
      if (letter !== CLEAR && sprite.rows[y + dy]?.[x + dx] !== letter) {
        throw new Error(`${name}: the eagle at ${x},${y} differs from emblem.ts at ${x + dx},${y + dy}`);
      }
    }));
  }
  return pixels;
}

const png = (pixels, width, height) =>
  sharp(pixels, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 });

mkdirSync(OUT, { recursive: true });
const icons = [];
for (const name of ICON_NAMES) {
  const { default: sprite } = await load(`sprites/${name}.ts`);
  const pixels = rasterise(sprite, name);
  await png(pixels, ICON_SIZE, ICON_SIZE).toFile(path.join(OUT, `${name}.png`));
  icons.push({ name, pixels });
}

// The sheet: the same pixels, butted together with no gutter.
const rows = Math.ceil(icons.length / SHEET_COLUMNS);
const sheetWidth = SHEET_COLUMNS * ICON_SIZE;
const sheet = Buffer.alloc(sheetWidth * rows * ICON_SIZE * 4);
icons.forEach(({ pixels }, i) => {
  const left = (i % SHEET_COLUMNS) * ICON_SIZE;
  const top = Math.floor(i / SHEET_COLUMNS) * ICON_SIZE;
  for (let y = 0; y < ICON_SIZE; y++) {
    pixels.copy(sheet, ((top + y) * sheetWidth + left) * 4, y * ICON_SIZE * 4, (y + 1) * ICON_SIZE * 4);
  }
});
await png(sheet, sheetWidth, rows * ICON_SIZE).toFile(path.join(OUT, 'sheet.png'));

// The contact sheet: every icon at 4x, by nearest neighbour, on two grounds.
const GROUNDS = [rgb('#1a1209'), rgb('#e6d6b0')];
const cell = ICON_SIZE * CONTACT_SCALE;
const gap = 16;
const label = 18;
const pitchX = cell * GROUNDS.length + gap;
const pitchY = cell + label + gap;
const W = SHEET_COLUMNS * pitchX + gap;
const H = rows * pitchY + gap;
const contact = Buffer.alloc(W * H * 3, 0x2b);
icons.forEach(({ pixels }, i) => {
  GROUNDS.forEach((ground, g) => {
    const left = gap + (i % SHEET_COLUMNS) * pitchX + g * cell;
    const top = gap + Math.floor(i / SHEET_COLUMNS) * pitchY;
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        const p = ((Math.floor(y / CONTACT_SCALE) * ICON_SIZE) + Math.floor(x / CONTACT_SCALE)) * 4;
        const colour = pixels[p + 3] ? pixels.subarray(p, p + 3) : ground;
        contact.set(colour, ((top + y) * W + left + x) * 3);
      }
    }
  });
});
const labels = icons
  .map(({ name }, i) => {
    const x = gap + (i % SHEET_COLUMNS) * pitchX;
    const y = gap + Math.floor(i / SHEET_COLUMNS) * pitchY + cell + 13;
    return `<text x="${x}" y="${y}">${i + 1}. ${name}</text>`;
  })
  .join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="sans-serif" font-size="12" fill="#e8cd7a">${labels}</svg>`;
await sharp(contact, { raw: { width: W, height: H, channels: 3 } })
  .composite([{ input: Buffer.from(svg) }])
  .png()
  .toFile(CONTACT);

console.log(`${icons.length} icons and sheet.png -> ${path.relative(ROOT, OUT)}`);
console.log(`contact sheet -> ${CONTACT}`);
