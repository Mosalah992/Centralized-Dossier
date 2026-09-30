// Produce a responsive derivative of the supplied Reports scene. Keeping the
// source in Assets/ and the browser-sized output in web/src/assets/ avoids
// sending the original 4 MB screenshot to every reader.

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'Assets/mainscreen.png');
const OUT = resolve(ROOT, 'web/src/assets/reports-background.webp');

const result = await sharp(SRC)
  .resize(1920, 1080, { fit: 'cover', position: 'centre' })
  .webp({ quality: 82, smartSubsample: true })
  .toFile(OUT);

console.log(`wrote ${OUT}: ${result.width}x${result.height}, ${result.size} bytes`);
