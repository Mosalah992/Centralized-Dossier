// Re-encode the ambience tracks for the web, from Assets/ into public/music/.
//
// The archive plays a track under each volume, and they shipped at roughly
// 200 kbps stereo — which is a correct choice for something you sit down and
// listen to, and the wrong one for a loop playing quietly under a page of
// parchment while somebody reads a roster. Three files came to 12.5 MB, and the
// largest of them was 8.2 MB for one volume.
//
// 96 kbps MONO is the target, and mono is the substantive part of it. These are
// ambient beds: the reader is not listening for a stereo image, the roundel that
// starts them is a single toggle in the corner, and halving the channel count
// halves the data before the bitrate does any work. What it costs is width; what
// it buys is a track that has arrived by the time the volume has.
//
// FFMPEG IS NOT A DEPENDENCY OF THIS PROJECT and this script is not run by the
// build. It is run by hand when a track changes, and its output is committed
// beside the covers — the same arrangement as scripts/prepare-volumes.mjs. Point
// FFMPEG at a binary if it is not on PATH:
//
//     FFMPEG=/d/ffmpeg/bin/ffmpeg.exe node scripts/prepare-music.mjs
//
// BUMP THE CACHE BUSTER IN App.tsx after running this. The tracks are served
// from public/ with their own filenames, so a re-encode at the same name is
// invisible to anyone holding the old one — see the `?v=` on each url.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'music');

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';

/** Source in Assets/, name it is served under. */
const TRACKS = [
  { src: 'Golden Herald.mp3', out: 'golden-herald.mp3' },
  { src: 'Summerset Glooms.mp3', out: 'summerset-glooms.mp3' },
  { src: 'Whispering of the Elder.mp3', out: 'whispering-of-the-elder.mp3' },
];

const BITRATE = '96k';
/** 48k buys nothing at this bitrate, and two of the three are 44.1k already. */
const RATE = '44100';

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} kB`;

try {
  execFileSync(FFMPEG, ['-version'], { stdio: 'ignore' });
} catch {
  console.error(
    `Could not run "${FFMPEG}".\n`
    + 'ffmpeg is deliberately not a dependency of this project — install it, or\n'
    + 'set FFMPEG to the binary:  FFMPEG=/path/to/ffmpeg.exe node scripts/prepare-music.mjs',
  );
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

let before = 0;
let after = 0;

for (const { src, out } of TRACKS) {
  const from = path.join(ROOT, 'Assets', src);
  const to = path.join(OUT_DIR, out);

  if (!fs.existsSync(from)) {
    console.error(`missing source: Assets/${src}`);
    process.exit(1);
  }

  const was = fs.existsSync(to) ? fs.statSync(to).size : 0;

  execFileSync(FFMPEG, [
    '-y', '-v', 'error',
    '-i', from,
    '-ac', '1',
    '-ar', RATE,
    '-b:a', BITRATE,
    // Drop cover art and tags: an embedded image can be a third of the file at
    // this bitrate, and nothing in the archive reads either.
    '-vn', '-map_metadata', '-1',
    '-codec:a', 'libmp3lame',
    to,
  ]);

  const now = fs.statSync(to).size;
  before += was;
  after += now;
  console.log(
    `${out.padEnd(30)} ${kb(was).padStart(9)} -> ${kb(now).padStart(9)}`
    + `  (${was ? `-${Math.round((1 - now / was) * 100)}%` : 'new'})`,
  );
}

console.log(`\ntotal ${kb(before)} -> ${kb(after)} (-${Math.round((1 - after / before) * 100)}%)`);
console.log('Remember to bump the ?v= cache buster on each url in web/src/App.tsx.');
