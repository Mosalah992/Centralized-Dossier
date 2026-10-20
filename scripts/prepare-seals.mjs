// Cut the Chronicles' seal out of the volume's original cover art.
//
// This was the tail of scripts/prepare-volumes.mjs, which also sliced the nine
// painted volume covers for the shelf and the rail. Both were retired on
// 2026-10-20 (the Embassy room's bookshelf draws its own spines and the rail
// was removed), so the covers and their script went; the seal stays because
// the Chronicles' gate still wears it. Output: web/src/assets/volumes/.
//   node scripts/prepare-seals.mjs

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'web', 'src', 'assets', 'volumes');

// ── Volume seals ──────────────────────────────────────────────────────────

/*
 * A seal cut out of a cover, for volumes that need their own mark away from
 * the shelf.
 *
 * The archive has one seal everywhere else: the Dominion insignia at
 * public/seal.webp. The Chronicles keep their own door, and a door wants the
 * mark of the thing behind it — so the medallion off the volume's ORIGINAL
 * cover is kept for the inside board and the lock. It outlived that cover on
 * purpose: the shelf art changed, the door did not.
 *
 * The bounds are measured by hand against the source art rather than found:
 * the medallion sits on black leather with no alpha to trace, and one plate is
 * not worth a detector.
 */
const SEALS = [
  {
    slug: 'informants',
    file: 'retired/Top Secret Volume.png',
    // The disc, less the laurel that crowds it left and right.
    region: { left: 443, top: 588, width: 372, height: 372 },
  },
];

for (const { slug, file, region } of SEALS) {
  const size = region.width;

  // Cut to a circle: the medallion is round and its corners are leather, which
  // would otherwise sit as a dark square on the board's gradient. The inner
  // stop is just short of the rim so the edge is feathered rather than jagged.
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}">
       <defs>
         <radialGradient id="d">
           <stop offset="0.94" stop-color="#fff" stop-opacity="1"/>
           <stop offset="1" stop-color="#fff" stop-opacity="0"/>
         </radialGradient>
       </defs>
       <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#d)"/>
     </svg>`,
  );

  const out = path.join(OUT_DIR, `${slug}-seal.webp`);
  const result = await sharp(path.join(ROOT, 'Assets', file))
    .extract(region)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(out);

  console.log(
    `${slug}-seal`.padEnd(20)
    + `${result.width}x${result.height}  ${String(Math.round(result.size / 1024)).padStart(3)} kB`,
  );
}
