// Promote Ancarion's performances into the Vite graph. Each clip ships as a
// VP9 WebM with an H.264 MP4 fallback; both were encoded from the raw Kling
// downloads, which stay local (see Assets/portrait-clips/manifest.json). The
// files go in untouched: every clip starts and ends on canonreeve.webp, so the
// gate can cut between the still and any clip without a jump. Doze and wake
// meet instead on the asleep keyframe, which also ships as the still he is
// found in at night.

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(ROOT, 'Assets/portrait-clips');
const voiceDirectory = resolve(ROOT, 'Assets/ancarion-voice');
const performances = [
  'idle',
  'idle-breathe',
  'idle-drowse',
  'idle-appraise',
  'idle-smoke',
  'listening',
  'refusal',
  'shake',
  'sigh',
  'accept',
  'doze',
  'wake',
];
const formats = ['webm', 'mp4'];

async function report(output) {
  const digest = createHash('sha256').update(await readFile(output)).digest('hex');
  console.log(`wrote ${output} (${digest})`);
}

for (const performance of performances) {
  for (const format of formats) {
    const name = `ancarion-${performance}.${format}`;
    const output = resolve(ROOT, 'web/src/assets', name);

    await mkdir(dirname(output), { recursive: true });
    await copyFile(resolve(sourceDirectory, name), output);
    await report(output);
  }
}

// The keyframe is 760px like canonreeve.webp, so it is only re-encoded.
const asleep = resolve(ROOT, 'web/src/assets/ancarion-asleep.webp');
await sharp(resolve(sourceDirectory, 'ancarion-asleep.png')).webp({ quality: 90 }).toFile(asleep);
await report(asleep);

// The recorded lines are optional, and so is their folder: a line nobody has
// recorded yet is silence on the gate.
const lines = await readdir(voiceDirectory).catch(() => []);
for (const name of lines.filter((file) => /^ancarion-[a-z]+\.(?:ogg|mp3|m4a)$/.test(file))) {
  const output = resolve(ROOT, 'web/src/assets/voice', name);
  await mkdir(dirname(output), { recursive: true });
  await copyFile(resolve(voiceDirectory, name), output);
  await report(output);
}
