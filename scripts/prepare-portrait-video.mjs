// Promote the supplied Ancarion performances into the Vite graph without
// transcoding them. The source files remain the reproducible asset inputs.

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(ROOT, 'Assets/Ancarion live portrait assets');
const assets = [
  ['blink.mp4', 'ancarion-idle.mp4'],
  ['ancarion-shake.webm', 'ancarion-refusal.webm'],
  ['ancarion-sigh.webm', 'ancarion-sigh.webm'],
  ['accept.png', 'ancarion-accept.png'],
];

for (const [sourceName, outputName] of assets) {
  const source = resolve(sourceDirectory, sourceName);
  const output = resolve(ROOT, 'web/src/assets', outputName);

  await mkdir(dirname(output), { recursive: true });
  await copyFile(source, output);
  const digest = createHash('sha256').update(await readFile(output)).digest('hex');
  console.log(`wrote ${output} (${digest})`);
}
