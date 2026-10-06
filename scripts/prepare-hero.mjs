// Web copies of the home page's portrait and closing film.
//
// The portrait is a 3840x2160 screenshot of the Embassy assembled. It is shown
// whole — never cropped, since every figure in it is somebody — so only its
// size changes: two widths, for the srcset in web/src/components/Shelf.tsx.
//
// The film is copied as it arrived. Re-encoding it smaller wants ffmpeg, which
// is deliberately not a dependency (see scripts/prepare-music.mjs); set FFMPEG
// to a binary and it is re-encoded to a lighter H.264 with no audio track —
// the page plays it muted, and the archive's own music is already playing.
//
//     node scripts/prepare-hero.mjs
//     FFMPEG=/path/to/ffmpeg.exe node scripts/prepare-hero.mjs

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'Assets', 'portraits');
const OUT = path.join(ROOT, 'web', 'src', 'assets', 'hero');

fs.mkdirSync(OUT, { recursive: true });

for (const width of [1280, 1920]) {
  const out = path.join(OUT, `embassy-${width}.webp`);
  const result = await sharp(path.join(SRC, 'portrait 4.JPG'))
    .resize({ width, kernel: 'lanczos3' })
    .webp({ quality: 82, effort: 6 })
    .toFile(out);
  console.log(`${path.basename(out).padEnd(22)} ${result.width}x${result.height}  ${Math.round(result.size / 1024)} kB`);
}

// The gallery beneath the portrait, in the order it is hung. Each is shown
// whole, as the portrait is. `troops 4.jpg` and `troops.png` are left out on purpose:
// they carry the game's chat log and screenshot notice, and the brief is not to
// edit the images.
// A two-column hall shows each at ~570 CSS px, so 1200 covers a 2x screen.
const GALLERY = [
  'portrait 1.JPG',
  'portrait 2.JPG',
  'portrait 3.JPG',
  'portrait 5.jpg',
  'troops main.JPG',
  'troops 2.JPG',
  'troops 3.jpg',
  'troops 5.jpg',
];

for (const [i, file] of GALLERY.entries()) {
  const out = path.join(OUT, `gallery-${i + 1}.webp`);
  const result = await sharp(path.join(SRC, file))
    .resize({ width: 1200, kernel: 'lanczos3' })
    .webp({ quality: 80, effort: 6 })
    .toFile(out);
  console.log(`${path.basename(out).padEnd(22)} ${result.width}x${result.height}  ${Math.round(result.size / 1024)} kB  (${file})`);
}

const film = path.join(SRC, 'My movie 4.mp4');
const filmOut = path.join(OUT, 'film.mp4');
if (process.env.FFMPEG) {
  execFileSync(process.env.FFMPEG, [
    '-y', '-i', film,
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26',
    '-vf', "scale='min(1920,iw)':-2", '-movflags', '+faststart',
    filmOut,
  ], { stdio: 'inherit' });
} else {
  fs.copyFileSync(film, filmOut);
}
console.log(`film.mp4               ${Math.round(fs.statSync(filmOut).size / 1024)} kB${process.env.FFMPEG ? '' : ' (copied; set FFMPEG to re-encode)'}`);
