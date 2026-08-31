// The bodies of Mundus, cut out of the supplied sheet.
//
//   node scripts/prepare-orrery.mjs
//
// Reads  Assets/constellations.png   (the sheet, 1536x1024)
//        Assets/Starrybackground.png (the sky behind everything)
// Writes web/src/assets/mundus/*.webp
//
// PROVENANCE. The sheet was supplied by the archive's keeper, who confirmed it
// is theirs and free to embed. That matters here more than usual: everything
// under web/src/assets is served from a public URL, so shipping a file
// distributes it to anyone holding the link — only /api/* sits behind the gate.
//
// SEEDS ARE MEASURED, EDGES ARE FOUND. The approximate centre of each body is a
// number read off the art, the way the lettering panels in prepare-volumes.mjs
// are. Everything after that is detected: the seed is pulled onto the body's
// real centre of brightness, and the radius is grown until the sphere's own
// light gives out. Cropping to a hand-typed grid would have been quicker and
// would have shaved a limb off at least one of these, because the spheres are
// lit from one side and are not centred in their own glow.
//
// THE WHEEL AT THE FOOT OF THE SHEET IS NOT A BODY. It is a picture of this
// archive's own orrery, included as a note about arrangement, and the detector
// would happily cut it out as an eleventh planet. Nothing is seeded below
// ROW_FLOOR for that reason.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = path.join(ROOT, 'Assets/constellations.png');
const SKY = path.join(ROOT, 'Assets/Starrybackground.png');
const OUT = path.join(ROOT, 'web/src/assets/mundus');

/** Nothing below this line on the sheet is a body. See the note above. */
const ROW_FLOOR = 760;

/**
 * Seeds, measured off the sheet at its native 1536x1024.
 *
 * `name` becomes the filename. The six in the row that are neither the sun nor
 * Nirn are named by their look rather than by a Divine, because which planet is
 * which is a decision for the component that places them, not for the knife.
 */
const SEEDS = [
  { name: 'masser', x: 555, y: 275, hint: 245 },
  { name: 'secunda', x: 1105, y: 330, hint: 165 },
  { name: 'magnus', x: 145, y: 640, hint: 105 },
  { name: 'pale', x: 365, y: 640, hint: 92 },
  { name: 'rust', x: 580, y: 640, hint: 88 },
  { name: 'ash', x: 775, y: 645, hint: 72 },
  { name: 'verdant', x: 925, y: 640, hint: 78 },
  { name: 'nirn', x: 1130, y: 645, hint: 72 },
  { name: 'rose', x: 1310, y: 650, hint: 66 },
  { name: 'cinder', x: 1450, y: 655, hint: 45 },
];

const sheet = sharp(SHEET).removeAlpha();
const { data, info } = await sheet.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const lumaAt = (x, y) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return 0;
  const i = (y * W + x) * C;
  return (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
};

/**
 * Pull a seed onto the body's real centre.
 *
 * A brightness-weighted centroid over a window a little larger than the hint.
 * The spheres are lit from one side, so this drifts toward the lit limb; that
 * is corrected below by measuring the radius symmetrically rather than by
 * trusting the centroid to be the geometric middle.
 */
function refine(seed) {
  const r = seed.hint * 1.15;
  let sum = 0;
  let sx = 0;
  let sy = 0;
  for (let y = Math.round(seed.y - r); y <= seed.y + r; y++) {
    for (let x = Math.round(seed.x - r); x <= seed.x + r; x++) {
      const l = lumaAt(x, y);
      if (l < 0.12) continue;
      sum += l;
      sx += x * l;
      sy += y * l;
    }
  }
  return sum > 0 ? { x: sx / sum, y: sy / sum } : { x: seed.x, y: seed.y };
}

/**
 * Grow a radius until the body's light gives out.
 *
 * Measured as the median over many rays rather than along one line: a single
 * ray can run out through the dark limb and report a disc half the true size.
 * The median is unmoved by the handful of rays that do.
 */
function measure(cx, cy, hint) {
  /*
   * THE THRESHOLD IS RELATIVE TO THE BODY, not absolute.
   *
   * The first version walked outward until luminance fell under a fixed 0.085
   * and every single body came back at exactly the search ceiling — the sheet
   * lights each sphere with a wide glow that never gets that dark, so the rays
   * ran to the end and stopped there. The cuts were 1.6x too wide and each one
   * swallowed pieces of its neighbours.
   *
   * Measuring against the body's own centre brightness finds the sphere's edge
   * instead of the glow's, and the clamp below means that when a body is lit so
   * flatly that even this washes out, the error is bounded by the measured hint
   * rather than unbounded.
   */
  let core = 0;
  let n = 0;
  for (let y = Math.round(cy - hint * 0.3); y <= cy + hint * 0.3; y++) {
    for (let x = Math.round(cx - hint * 0.3); x <= cx + hint * 0.3; x++) {
      core += lumaAt(x, y);
      n++;
    }
  }
  core = n ? core / n : 0.5;
  const edge = Math.max(0.1, core * 0.42);

  const rays = 96;
  const found = [];
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * Math.PI * 2;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let last = hint * 0.5;
    for (let r = hint * 0.5; r < hint * 1.25; r += 0.5) {
      if (lumaAt(Math.round(cx + dx * r), Math.round(cy + dy * r)) > edge) last = r;
    }
    found.push(last);
  }
  found.sort((a, b) => a - b);
  const median = found[Math.floor(found.length * 0.55)];
  // Bounded by the seed: a detector that can be wrong should not be wrong by
  // more than the number a person read off the art.
  return Math.min(hint * 1.12, Math.max(hint * 0.88, median));
}

fs.mkdirSync(OUT, { recursive: true });

const manifest = [];

for (const seed of SEEDS) {
  if (seed.y > ROW_FLOOR) throw new Error(`${seed.name} is seeded in the reference wheel`);

  const c = refine(seed);
  const r = measure(c.x, c.y, seed.hint);
  // A hair of margin, so the mask's soft edge has something to fade through
  // rather than biting into the sphere.
  const R = Math.ceil(r * 1.03);
  const size = R * 2;

  /*
   * The cut is a circle, not a rectangle.
   *
   * These go on a starfield. A square crop would carry the sheet's own black
   * ground with it and read as a dark tile sliding over the stars — the exact
   * failure the book covers avoid by being found from their alpha rather than
   * cropped to a grid. The mask is drawn with a slightly soft edge because a
   * hard one aliases badly once the body is scaled down to twenty pixels.
   */
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}">
       <defs>
         <radialGradient id="m">
           <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
           <stop offset="93%" stop-color="#fff" stop-opacity="1"/>
           <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
         </radialGradient>
       </defs>
       <circle cx="${R}" cy="${R}" r="${R}" fill="url(#m)"/>
     </svg>`,
  );

  const left = Math.max(0, Math.round(c.x - R));
  const top = Math.max(0, Math.round(c.y - R));
  const w = Math.min(size, W - left);
  const h = Math.min(size, H - top);

  /*
   * Three passes, and they have to be three.
   *
   * sharp honours ONE resize per pipeline — a second call replaces the first
   * rather than chaining. Cutting, masking and scaling down in one chain
   * silently dropped the crop's resize, so the image arrived at 256 while the
   * mask was still full size and the composite refused it. Each stage gets its
   * own pipeline.
   */
  const cut = await sharp(SHEET)
    .extract({ left, top, width: w, height: h })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const masked = await sharp(cut).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();

  const file = path.join(OUT, `${seed.name}.webp`);
  await sharp(masked)
    // 256 is more than any of these is ever drawn at; the largest lands on the
    // wheel at well under a hundred CSS pixels.
    .resize(Math.min(256, size))
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(file);

  manifest.push({ name: seed.name, r: Math.round(r), bytes: fs.statSync(file).size });
}

/*
 * TWO MORE, MADE FROM TWO OF THESE.
 *
 * The sheet carries ten bodies. The wheel needs twelve — Magnus, the two moons,
 * Nirn, and the eight planets of the Divines — so two of the six spare spheres
 * are turned and rescaled to stand in. This is recorded here rather than done
 * quietly in the component, because a reader comparing Kynareth to Mara on the
 * wheel is looking at the same photograph twice and the archive should be the
 * kind of place that says so.
 *
 * A hue rotation rather than a tint: tinting a lit sphere flattens its
 * shadowed limb toward the tint colour and it stops reading as a sphere.
 */
const DERIVED = [
  { from: 'pale', name: 'azure', hue: 186, scale: 0.92 },
  { from: 'rust', name: 'amber', hue: 44, scale: 1.06 },
];

for (const d of DERIVED) {
  const src = path.join(OUT, `${d.from}.webp`);
  const meta = await sharp(src).metadata();
  const file = path.join(OUT, `${d.name}.webp`);
  await sharp(src)
    .modulate({ hue: d.hue })
    .resize(Math.max(24, Math.round((meta.width ?? 128) * d.scale)))
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(file);
  manifest.push({ name: `${d.name} (from ${d.from})`, r: 0, bytes: fs.statSync(file).size });
}

/*
 * The sky behind it all.
 *
 * Held at 1600 wide and 62% quality because it is a background at low
 * brightness behind a chart — detail spent here is detail nobody sees, and it
 * would be the single heaviest file on a page that already paints a year.
 */
const skyFile = path.join(OUT, 'starfield.webp');
await sharp(SKY).resize(1600).webp({ quality: 62 }).toFile(skyFile);

for (const m of manifest) {
  console.log(`  ${m.name.padEnd(9)} r=${String(m.r).padStart(3)}px  ${(m.bytes / 1024).toFixed(1)} kB`);
}
console.log(`  ${'starfield'.padEnd(9)} ${'      '} ${(fs.statSync(skyFile).size / 1024).toFixed(1)} kB`);

const total = manifest.reduce((n, m) => n + m.bytes, 0) + fs.statSync(skyFile).size;
console.log(`\n${manifest.length} bodies + sky, ${(total / 1024).toFixed(1)} kB total`);

/*
 * A contact sheet, so the cut can be looked at rather than trusted.
 *
 * The detector can fail quietly in exactly one way that matters — a radius
 * measured short, which shaves a crescent off a sphere and looks like a phase.
 * On a wheel that draws real phases, that would be a lie rather than a blemish.
 */
const CELL = 150;
const strip = await sharp({
  create: { width: CELL * manifest.length, height: CELL, channels: 4, background: { r: 20, g: 22, b: 34, alpha: 1 } },
})
  .composite(
    await Promise.all(
      manifest.map(async (m, i) => ({
        input: await sharp(path.join(OUT, `${m.name.split(' ')[0]}.webp`)).resize(CELL - 16, CELL - 16, { fit: 'inside' }).toBuffer(),
        left: i * CELL + 8,
        top: 8,
      })),
    ),
  )
  .png()
  .toBuffer();
fs.writeFileSync(path.join(ROOT, 'tmp/orrery-contact.png'), strip);
console.log('contact sheet: tmp/orrery-contact.png');
