// A small raster for drawing the room's pixel art in code: one pixel is one
// palette colour or nothing. No anti-aliasing exists here at all, so nothing
// drawn with it can come out soft or mixed-resolution.
//
// Everything is in whole pixels. Shapes are filled by scanline, lines by
// Bresenham, and patterns (dithers) by a fixed grid, so the result is the
// same every time it is built.

import sharp from 'sharp';

import { PALETTE, rgbOf } from '../../web/src/pixel/palette.ts';

const KEYS = new Set(PALETTE.map((s) => s.key));

export class Raster {
  /** @param {number} width @param {number} height */
  constructor(width, height) {
    this.width = width;
    this.height = height;
    /** @type {(string | null)[]} */
    this.px = new Array(width * height).fill(null);
  }

  /** One pixel; keys outside the palette are refused loudly. */
  set(x, y, key) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    if (key !== null && !KEYS.has(key)) throw new Error(`"${key}" is not in the palette`);
    this.px[y * this.width + x] = key;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    return this.px[y * this.width + x];
  }

  rect(x, y, w, h, key) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, key);
  }

  /** A rectangle filled with a checker of two keys (a 50% dither). */
  dither(x, y, w, h, a, b, phase = 0) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, (x + i + y + j + phase) % 2 ? b : a);
  }

  /** A sparse dither: one pixel of `key` in every `every` along a diagonal grid. */
  sprinkle(x, y, w, h, key, every = 4, phase = 0) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) if ((x + i + (y + j) * 2 + phase) % every === 0 && (y + j) % 2 === 0) this.set(x + i, y + j, key);
  }

  hline(x0, x1, y, key) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, key);
  }

  vline(x, y0, y1, key) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, key);
  }

  /** Bresenham: a one-pixel line with no soft edges. */
  line(x0, y0, x1, y1, key) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, key);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /**
   * A filled polygon, scanline by scanline, sampled at pixel centres.
   * `fill` is a key, or a function (x, y) => key for patterned fills.
   */
  poly(points, fill) {
    const ys = points.map((p) => p[1]);
    const top = Math.floor(Math.min(...ys));
    const bottom = Math.ceil(Math.max(...ys));
    for (let y = top; y <= bottom; y++) {
      const cy = y + 0.5;
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) {
          this.set(x, y, typeof fill === 'function' ? fill(x, y) : fill);
        }
      }
    }
  }

  /** A filled ellipse inside the box (x, y, w, h). */
  ellipse(x, y, w, h, fill) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const dx = (x + i + 0.5 - cx) / (w / 2);
        const dy = (y + j + 0.5 - cy) / (h / 2);
        if (dx * dx + dy * dy <= 1) this.set(x + i, y + j, typeof fill === 'function' ? fill(x + i, y + j, dx, dy) : fill);
      }
  }

  /**
   * Hand-placed pixels: rows of palette keys, '.' or ' ' for nothing.
   * `map` swaps keys (to recolour one drawing for another use).
   */
  draw(rows, x, y, map = {}) {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        if (ch === '.' || ch === ' ') return;
        this.set(x + i, y + j, map[ch] ?? ch);
      });
    });
  }

  /** The same, mirrored left to right. */
  drawFlipped(rows, x, y, map = {}) {
    const w = Math.max(...rows.map((r) => r.length));
    this.draw(rows.map((r) => [...r.padEnd(w, '.')].reverse().join('')), x, y, map);
  }

  /** Another raster laid over this one (its empty pixels show through). */
  blit(src, x, y) {
    for (let j = 0; j < src.height; j++)
      for (let i = 0; i < src.width; i++) {
        const key = src.px[j * src.width + i];
        if (key !== null) this.set(x + i, y + j, key);
      }
  }

  /**
   * A one-pixel outline round everything drawn: each empty pixel touching a
   * filled one becomes `key`. Selective: pass `only` to outline just the sides
   * a light from the upper left would leave in shadow.
   */
  outline(key, only = 'all') {
    const marks = [];
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) !== null) continue;
        const n = {
          left: this.get(x + 1, y) !== null,
          right: this.get(x - 1, y) !== null,
          up: this.get(x, y + 1) !== null,
          down: this.get(x, y - 1) !== null,
        };
        const hit = only === 'all' ? n.left || n.right || n.up || n.down : n.right || n.down;
        if (hit) marks.push([x, y]);
      }
    for (const [x, y] of marks) this.set(x, y, key);
  }

  /** The raster as a PNG file, one image pixel per art pixel. */
  async save(file) {
    const data = Buffer.alloc(this.width * this.height * 4);
    this.px.forEach((key, i) => {
      if (key === null) return;
      const [r, g, b] = rgbOf(key);
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = 255;
    });
    await sharp(data, { raw: { width: this.width, height: this.height, channels: 4 } }).png({ compressionLevel: 9, palette: true }).toFile(file);
  }
}

/** A deterministic pseudo-random sequence, so a build always draws the same picture. */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
