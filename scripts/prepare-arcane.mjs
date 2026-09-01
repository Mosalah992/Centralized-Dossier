// The proving chamber's art.
//
//   node scripts/prepare-arcane.mjs
//
// Reads  Assets/Arcane mini game assets/*.png
// Writes web/src/assets/arcane/*.webp
//
// PROVENANCE, ASKED AND ANSWERED. The design notes for this game say plainly:
// "Do not extract textures, meshes, or audio from game files. Repo is public."
// The sprites read as first-person Altmer gauntlets and the question was
// therefore put to the keeper, who confirmed they are their own work and free
// to embed. That answer is why both the sources under `Assets/` and the output
// here are committed rather than held back — everything under `web/src/assets`
// is served from public URLs whatever the gate is doing, so the question had to
// be settled before any of it shipped, not after.
//
// THE HANDS ARE NOT TRIMMED. Every hand pose is delivered on the same 1672x941
// frame, and that shared frame is the only thing keeping the poses registered to
// one another: trimming each to its own content would align three sprites to
// three different origins and the hands would jump between idle and cast. Only
// the dummy is trimmed, because it is a free-standing object placed by the game
// rather than a full-screen overlay.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IN = path.join(ROOT, 'Assets/Arcane mini game assets');
const OUT = path.join(ROOT, 'web/src/assets/arcane');

/**
 * Lift a flattened transparency checkerboard back into an alpha channel.
 *
 * `casting right.png` arrived with no alpha at all: it had been saved with the
 * editor's checkerboard baked in, so the "transparent" area is a light grey and
 * white grid rather than nothing.
 *
 * A plain luminance key would take the checkerboard AND the gauntlet's gold
 * trim, which is the brightest thing on the glove. The checkerboard is
 * DESATURATED and the gold is not, so the key needs both: a pixel is background
 * only if it is bright and grey. That one extra condition is the difference
 * between clean hands and hands with the trim eaten out of them.
 */
async function keyCheckerboard(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

  for (let i = 0; i < width * height; i++) {
    const p = i * channels;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    // 0 for a pure grey, 1 for a fully saturated colour.
    const sat = max === 0 ? 0 : (max - min) / max;

    if (sat < 0.14 && luma > 0.70) {
      // A ramp rather than a hard cut, so the edge of the glove keeps a pixel
      // of softness instead of aliasing into a staircase.
      const t = Math.min(1, (luma - 0.70) / 0.12);
      out[p + 3] = Math.round(data[p + 3] * (1 - t));
    }
  }

  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

const JOBS = [
  {
    src: 'background.png',
    name: 'chamber',
    width: 1600,
    quality: 68,
    note: 'the chamber itself, behind everything',
  },
  {
    src: 'firstperson idle.png',
    name: 'hands-idle',
    width: 1400,
    quality: 82,
    alpha: true,
    note: 'hands at rest',
  },
  {
    src: 'casting left.png',
    name: 'hands-left',
    width: 1400,
    quality: 82,
    alpha: true,
    note: 'the left hand raised',
  },
  {
    src: 'casting right.png',
    name: 'hands-right',
    width: 1400,
    quality: 82,
    alpha: true,
    key: true,
    note: 'the right hand raised — arrived flattened, keyed here',
  },
  {
    src: 'training dummy.png',
    name: 'dummy',
    width: 620,
    quality: 84,
    alpha: true,
    trim: true,
    note: 'the target, placed by the game',
  },
];

fs.mkdirSync(OUT, { recursive: true });

const written = [];

for (const job of JOBS) {
  const file = path.join(IN, job.src);
  if (!fs.existsSync(file)) throw new Error(`missing source: ${job.src}`);

  const input = job.key ? await keyCheckerboard(file) : file;
  let pipe = sharp(input);
  if (job.trim) pipe = pipe.trim({ threshold: 2 });
  pipe = pipe.resize({ width: job.width, withoutEnlargement: true });

  const dest = path.join(OUT, `${job.name}.webp`);
  await pipe
    .webp({ quality: job.quality, alphaQuality: job.alpha ? 92 : 100 })
    .toFile(dest);

  const meta = await sharp(dest).metadata();
  written.push({ name: job.name, w: meta.width, h: meta.height, bytes: fs.statSync(dest).size, note: job.note });
}

/*
 * WHERE THE FINGERTIPS ARE, measured rather than guessed.
 *
 * The charge light and the arcs have to leave the HAND. The first version
 * anchored them at fixed fractions of the canvas and put the light on the
 * wrist — which reads as a bracelet, not as a spell, and is wrong differently
 * in each of the three poses because each raises a different hand to a
 * different height.
 *
 * So the anchors come out of the art. For each half of each sprite, walk down
 * the alpha channel to the first row carrying a real run of opaque pixels —
 * that row is the tip of the highest finger — and take the centroid of the few
 * rows under it. Emitted as fractions so the game can place them at any size,
 * and written to disk beside the sprites the way the volume covers' lettering
 * panels are, because a number measured off art belongs next to the art.
 */
async function fingertips(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const alphaAt = (x, y) => data[(y * width + x) * channels + 3];

  const anchor = (from, to) => {
    // A run rather than a single pixel: one stray antialiased dot above the
    // hand would otherwise become the fingertip.
    const MIN_RUN = Math.max(4, Math.round(width * 0.004));
    for (let y = 0; y < height; y++) {
      let run = 0;
      for (let x = from; x < to; x++) if (alphaAt(x, y) > 40) run++;
      if (run < MIN_RUN) continue;
      // Found the top of the hand. Average x over the next few rows, which is
      // the finger rather than whichever pixel happened to be highest.
      let sx = 0;
      let n = 0;
      for (let yy = y; yy < Math.min(height, y + Math.round(height * 0.04)); yy++) {
        for (let x = from; x < to; x++) if (alphaAt(x, yy) > 40) { sx += x; n++; }
      }
      return n ? { x: (sx / n) / width, y: y / height } : null;
    }
    return null;
  };

  const half = Math.floor(width / 2);
  return { left: anchor(0, half), right: anchor(half, width) };
}

/*
 * The one sound, copied rather than re-encoded.
 *
 * prepare-music.mjs re-encodes the ambience tracks to 96 kbps mono because they
 * are minutes long and the saving is megabytes. This is twenty-one kilobytes of
 * crackle: re-encoding it would save a few hundred bytes and would put ffmpeg —
 * deliberately not a dependency of this project — between anyone and a working
 * build. Copied, so the output still comes from a committed script.
 */
const SOUNDS = [{ src: '-sparks-.mp3', name: 'sparks.mp3' }];
for (const snd of SOUNDS) {
  const from = path.join(IN, snd.src);
  if (!fs.existsSync(from)) throw new Error(`missing sound: ${snd.src}`);
  const to = path.join(OUT, snd.name);
  fs.copyFileSync(from, to);
  console.log(`  ${snd.name.padEnd(12)} ${' '.repeat(11)} ${(fs.statSync(to).size / 1024).toFixed(1).padStart(7)} kB  the shock discharge`);
}

const anchors = {};
for (const job of JOBS) {
  if (!job.alpha || job.trim) continue;
  const tips = await fingertips(path.join(OUT, `${job.name}.webp`));
  anchors[job.name] = tips;
}
fs.writeFileSync(path.join(OUT, 'anchors.json'), `${JSON.stringify(anchors, null, 2)}
`);

for (const [name, t] of Object.entries(anchors)) {
  const fmt = (a) => (a ? `${a.x.toFixed(3)}, ${a.y.toFixed(3)}` : 'none');
  console.log(`  ${name.padEnd(12)} fingertips  left(${fmt(t.left)})  right(${fmt(t.right)})`);
}
console.log('');

for (const w of written) {
  console.log(`  ${w.name.padEnd(12)} ${String(w.w).padStart(5)}x${String(w.h).padEnd(5)} ${(w.bytes / 1024).toFixed(1).padStart(7)} kB  ${w.note}`);
}
console.log(`\n${written.length} sprites, ${(written.reduce((n, w) => n + w.bytes, 0) / 1024).toFixed(1)} kB total`);

/*
 * THE DUAL-CAST POSE IS THE IDLE POSE, and that is the source's doing rather
 * than a choice made here: `casting 2 hand.png` and `firstperson idle.png` are
 * byte-identical in the delivered set. The game therefore shows the same sprite
 * for resting and for two-handed casting, and leans on the charge light between
 * the palms to tell them apart. Drop a genuinely distinct two-handed painting
 * in as `casting 2 hand.png` and add a job above; nothing else has to change.
 */
const dual = path.join(IN, 'casting 2 hand.png');
const idle = path.join(IN, 'firstperson idle.png');
if (fs.existsSync(dual) && fs.existsSync(idle)) {
  const same = fs.readFileSync(dual).equals(fs.readFileSync(idle));
  console.log(same
    ? 'note: the two-handed pose is byte-identical to the idle pose; one sprite serves both'
    : 'note: the two-handed pose now differs from idle — give it a job of its own');
}
