// Promote the supplied Ancarion performance from Assets/ into the Vite graph.
// It is already a short web-ready MP4, so recompression would only risk a
// visible mismatch with the static portrait used when playback is unavailable.

import { createHash } from 'node:crypto';
import { copyFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(ROOT, 'Assets/ancarion-living-portrait.mp4');
const output = resolve(ROOT, 'web/src/assets/ancarion-living-portrait.mp4');

await copyFile(source, output);
const digest = createHash('sha256').update(await readFile(output)).digest('hex');
console.log(`wrote ${output} (${digest})`);
