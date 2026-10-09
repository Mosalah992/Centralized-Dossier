// The Penal Code's art, taken from the community's own Code document: the
// Dominion eagle that heads it and the three signatures that close it. The
// PNGs under Assets/penal-code/ are the sources; this writes the WebP the page
// imports. Alpha is kept throughout — the eagle is drawn as a CSS mask in the
// volume's own ink, and the signatures sit straight on the parchment.

import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(ROOT, 'Assets/penal-code');
const output = resolve(ROOT, 'web/src/assets/penal');

// Widths are about twice the largest size each is drawn at.
const assets = [
  ['dominion-eagle.png', 'eagle.webp', 360],
  ['signature-lourinien.png', 'signature-lourinien.webp', 480],
  ['signature-aedbinder.png', 'signature-aedbinder.webp', 480],
  ['signature-ganaril.png', 'signature-ganaril.webp', 480],
];

await mkdir(output, { recursive: true });

for (const [sourceName, outputName, width] of assets) {
  const target = resolve(output, outputName);
  await sharp(resolve(source, sourceName))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(target);
  const digest = createHash('sha256').update(await readFile(target)).digest('hex');
  console.log(`wrote ${target} (${digest})`);
}
