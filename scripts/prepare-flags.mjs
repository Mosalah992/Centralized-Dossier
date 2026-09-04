/**
 * The flags on the Register of Consultation, cut down from the supplied set.
 *
 * Source: `Assets/w2560/<iso2>.png`, 254 flags at 2560px wide, as delivered.
 * Output (both committed, per this repo's asset convention — a committed script
 * plus committed output):
 *
 *   web/src/assets/flags/flags.png    one vertical strip, every flag in a cell
 *   web/src/assets/flags/flags.json   country code -> row, in strip order
 *
 * WHY A STRIP AND NOT 254 FILES. The register draws a handful of rows and the
 * set of countries is not known until the tally comes back, so per-file images
 * would be a burst of requests decided at runtime — on the shelf, which is the
 * first screen. One sprite is one request, cached once, and the CSS moves a
 * background-position. That is also exactly how the 1999 counters did it.
 *
 * SIXTEEN BY ELEVEN IS THE PERIOD SIZE and it is the whole brief: these are
 * meant to read as the flag counters of 1999, not as crisp modern icons.
 *
 * A PALETTE PNG RATHER THAN THE WEBP USED EVERYWHERE ELSE HERE. Flags are flat
 * colour, so 256 indexed colours cost nothing visually and come out smaller
 * than lossless WebP (13 kB against 80) without the artefacts lossy WebP puts
 * on a one-pixel stripe.
 *
 * EACH FLAG KEEPS ITS OWN PROPORTIONS. The supplied set runs from 0.82:1
 * (Nepal) to 2.55:1 (Qatar), so squashing everything into a 16x11 box would
 * visibly distort a third of them — Switzerland is square and would come out an
 * oblong. Each is fitted INSIDE the cell instead and centred, which leaves
 * transparent margins on the extremes and is why the strip carries an alpha
 * channel. The cell stays a uniform 16x11 so the CSS can index it by row.
 *
 * THE SOURCE ART IS THE KEEPER'S TO SUPPLY. Everything under web/src/assets is
 * served from public URLs, so committing these publishes them — the same test
 * the game's sprites and the orrery's bodies had to pass before they were
 * pushed. See the note in CLAUDE.md.
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '../Assets/w2560');
const OUT = resolve(HERE, '../web/src/assets/flags');

// The 1999 size, and cut at 1x on purpose. A 2x strip was 29 kB against this
// one's 13, and the CSS renders it with `image-rendering: pixelated` — so on a
// hi-dpi screen each pixel doubles into a hard block instead of being smoothed,
// which is what an old counter GIF actually looked like. Paying twice the bytes
// to have the browser blur away the effect we want would be the wrong trade.
const PW = 16;
const PH = 11;

if (!existsSync(SRC)) {
  console.error(`No flags at ${SRC}. This script reads the supplied set and writes nothing without it.`);
  process.exit(1);
}

/**
 * Every flag the set actually holds, by ISO-3166 alpha-2, uppercased to match
 * what `request.cf.country` gives us and what the tally stores.
 *
 * Sorted, so the strip's row order is stable across runs: an unsorted readdir
 * would reshuffle rows on another filesystem and silently point every country
 * at the wrong flag, with a committed sprite that still looked plausible.
 */
const codes = readdirSync(SRC)
  .filter((f) => /^[a-z]{2}\.png$/.test(f))
  .map((f) => f.slice(0, 2).toUpperCase())
  .sort();

const cells = await Promise.all(codes.map(async (code) => sharp(resolve(SRC, `${code.toLowerCase()}.png`))
  .resize(PW, PH, {
    // `contain`, not `fill`: see the note on proportions above.
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    // Lanczos on a 2560px flag going to 16px turns a thin stripe into mud;
    // this keeps the edges of a tricolour where they belong.
    kernel: 'mitchell',
  })
  .ensureAlpha()
  .raw()
  .toBuffer()));

const strip = Buffer.concat(cells);

mkdirSync(OUT, { recursive: true });

const png = await sharp(strip, {
  raw: { width: PW, height: PH * codes.length, channels: 4 },
}).png({ palette: true, colours: 256, compressionLevel: 9, effort: 10 }).toBuffer();

writeFileSync(resolve(OUT, 'flags.png'), png);

/*
 * ONE CONCATENATED STRING, NOT A MAP.
 *
 * The codes are sorted, so a flag's row IS its position in this list and the
 * map was storing something already implied — `{"AD":0,"AE":1,...}` cost 2.1 kB
 * raw against 500 bytes here, and this file is imported by Register.tsx, which
 * Shelf.tsx reaches statically and so lands in the entry chunk that invariant 7
 * and test/bundle.test.ts exist to protect. It was 2.4 kB gzip of that budget
 * for an index that can be derived.
 *
 * The component divides by two to get the row, and has to SEARCH for an even
 * offset rather than test the first one it finds: two codes can spell a third
 * across their boundary — BG followed by BH spells "GB" — so a lookup that
 * stopped at the first match would hand Denmark Andorra's flag, and did in fact
 * leave the United Kingdom with none.
 */
writeFileSync(resolve(OUT, 'flags.json'), `${JSON.stringify(codes.join(''))}\n`);

console.log(
  `${codes.length} flags -> flags.png (${PW}x${PH * codes.length}, `
  + `${(png.length / 1024).toFixed(1)} kB) + flags.json`,
);
