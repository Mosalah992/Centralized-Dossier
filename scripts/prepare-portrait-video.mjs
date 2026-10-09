// Promote Ancarion's performances into the Vite graph. Each clip ships as a
// VP9 WebM with an H.264 MP4 fallback; both were encoded from the raw Kling
// downloads, which stay local (see Assets/portrait-clips/manifest.json). The
// files go in untouched: every clip starts and ends on canonreeve.webp, so the
// gate can cut between the still and any clip without a jump.

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(ROOT, 'Assets/portrait-clips');
const performances = ['idle', 'refusal', 'sigh', 'accept'];
const formats = ['webm', 'mp4'];

for (const performance of performances) {
  for (const format of formats) {
    const name = `ancarion-${performance}.${format}`;
    const output = resolve(ROOT, 'web/src/assets', name);

    await mkdir(dirname(output), { recursive: true });
    await copyFile(resolve(sourceDirectory, name), output);
    const digest = createHash('sha256').update(await readFile(output)).digest('hex');
    console.log(`wrote ${output} (${digest})`);
  }
}
