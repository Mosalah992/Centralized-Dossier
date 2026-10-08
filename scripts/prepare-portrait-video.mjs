// Promote the supplied Ancarion performances into the Vite graph. The clips go
// in untouched; the accepted still is re-encoded, since the source PNG is
// 1.8 MB for a portrait never drawn wider than about 500 CSS px. The source
// files remain the reproducible asset inputs.

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(ROOT, 'Assets/Ancarion live portrait assets');
const assets = [
  ['blink.mp4', 'ancarion-idle.mp4'],
  ['ancarion-shake.webm', 'ancarion-refusal.webm'],
  ['ancarion-sigh.webm', 'ancarion-sigh.webm'],
];
// 1000px covers the stage's cover-fit crop at 2x density.
const stills = [
  ['accept.png', 'ancarion-accept.webp'],
];

for (const [sourceName, outputName] of assets) {
  const source = resolve(sourceDirectory, sourceName);
  const output = resolve(ROOT, 'web/src/assets', outputName);

  await mkdir(dirname(output), { recursive: true });
  await copyFile(source, output);
  const digest = createHash('sha256').update(await readFile(output)).digest('hex');
  console.log(`wrote ${output} (${digest})`);
}

for (const [sourceName, outputName] of stills) {
  const source = resolve(sourceDirectory, sourceName);
  const output = resolve(ROOT, 'web/src/assets', outputName);

  await sharp(source).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(output);
  const digest = createHash('sha256').update(await readFile(output)).digest('hex');
  console.log(`wrote ${output} (${digest})`);
}
