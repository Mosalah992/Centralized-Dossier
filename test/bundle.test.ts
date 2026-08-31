import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

/**
 * What a reader who has NOT signed in is made to download.
 *
 * `dist/assets/index-*.js` is the entry chunk: the only script `index.html`
 * loads, and therefore everything a sealed reader pays for before they can see
 * a seal to press. Every other chunk is fetched on demand from a `React.lazy`
 * boundary in App.tsx and costs them nothing.
 *
 * CLAUDE.md's invariant 7 has always said this, and until now it said it in
 * prose with a `grep -c griffel` beside it that nobody runs. A static import of
 * Fluent from App.tsx, Gate.tsx, Shelf.tsx or main.tsx breaks nothing, fails
 * nothing, and silently adds ~90 KB gzip to that download. So does an animation
 * plugin. These tests are that grep, run automatically.
 *
 * IF YOU ARE HERE BECAUSE ONE OF THESE FAILED you have just put something at
 * the gate. Check that you meant to. If you did, move the ceiling in the same
 * commit and say in the message what you added and why a sealed reader needs it.
 */

const DIST = new URL('../dist/assets/', import.meta.url);

const entryChunk = (): { name: string; source: string; bytes: number } | null => {
  if (!existsSync(DIST)) return null;
  const name = readdirSync(DIST).find((f) => /^index-.*\.js$/.test(f));
  if (!name) return null;
  const path = new URL(name, DIST);
  return { name, source: readFileSync(path, 'utf8'), bytes: statSync(path).size };
};

const entry = entryChunk();

/*
 * `npm test` does not build, so this file has nothing to read unless a build
 * has already happened. Skipping loudly rather than passing vacuously: a test
 * that silently does not run is worse than no test, because it reads green.
 * `npm run verify` builds and then tests, and is the command that guarantees
 * these actually run.
 */
describe.skipIf(!entry)('the gate chunk', () => {
  /*
   * Fluent styles with Griffel, which emits its own class-name prefix as a
   * literal string into the bundle — so the marker survives minification, which
   * an identifier would not. Confirmed empirically: it is present in
   * Portal-*.js, the lazy chunk that legitimately carries Fluent.
   */
  it('carries no Fluent — invariant 7', () => {
    expect(entry!.source).not.toContain('griffel');
  });

  /*
   * framer-motion was removed from this project when the animation layer moved
   * to GSAP, and its whole financial case was that it left the gate: it was
   * 39.3 KB gzip here, 41% of what a sealed reader downloaded, four times the
   * app's own code. This asserts it has not crept back.
   */
  it('carries no framer-motion', () => {
    expect(entry!.source).not.toContain('framer');
  });

  /*
   * GSAP core is here ON PURPOSE — the seal ceremony is the first thing a
   * sealed reader sees and cannot wait for a lazy chunk. Asserted positively so
   * that if someone lazily loads it and the gate silently stops animating,
   * this says so rather than the change passing unnoticed.
   */
  it('carries GSAP core, which the seal ceremony needs', () => {
    expect(entry!.source).toContain('CustomEase');
  });

  /*
   * The ceiling. Set from the measured post-refactor size with headroom, and
   * the number is meaningful rather than round: before this refactor the entry
   * chunk was 291,563 bytes raw / 95,090 gzip.
   *
   * Moving it is not forbidden — it is a decision that should appear in a diff.
   */
  it('stays under its ceiling', () => {
    const gzip = gzipSync(entry!.source, { level: 9 }).length;
    expect(entry!.bytes, `${entry!.name} raw bytes`).toBeLessThan(265_000);
    expect(gzip, `${entry!.name} gzip bytes`).toBeLessThan(92_000);
  });
});

/*
 * The Archives Editor must not be in the built site at all.
 *
 * NOT "unreachable" — ABSENT. The editor writes files through a dev-server API,
 * so shipping its code to a public origin would put the vocabulary of a
 * filesystem editor in front of a hundred readers, along with the paths it
 * calls. Nothing there is exploitable on its own — the API does not exist in
 * production — but code that has no business being served should not be served.
 *
 * THIS TEST EXISTS BECAUSE THE FIRST ATTEMPT FAILED IT. Guarding the route and
 * the render with `import.meta.env.DEV` was not enough: React.lazy holds its
 * dynamic import at module top level, so Rollup emitted an Editor chunk anyway
 * — 12 kB of it, in dist/, with "Seal the volume" and the __editor paths
 * intact. The import had to move inside the dead branch. That is exactly the
 * kind of mistake that looks fine in the source and only shows in the output.
 */
describe.skipIf(!existsSync(DIST))('the Archives Editor', () => {
  const files = existsSync(DIST)
    ? readdirSync(DIST).map((name) => ({
      name,
      source: readFileSync(new URL(name, DIST), 'utf8'),
    }))
    : [];

  it('emits no chunk of its own', () => {
    expect(files.filter((f) => /^Editor-/.test(f.name)).map((f) => f.name)).toEqual([]);
  });

  it.each([
    ['the filesystem API path', '__editor'],
    ['its masthead', 'Archives Editor'],
    ['its stylesheet', 'ed-card'],
    ['its controls', 'Seal the volume'],
  ])('leaves no trace of %s anywhere in the built assets', (_what, needle) => {
    const found = files.filter((f) => f.source.includes(needle)).map((f) => f.name);
    expect(found).toEqual([]);
  });
});

/*
 * anime.js must never reach the chunk a reader downloads at the seal.
 *
 * The archive's motion language is GSAP and stays GSAP; anime.js drives exactly
 * the calendar's instruments, and it is roughly nineteen kilobytes gzipped. The
 * entry chunk had about twenty kilobytes of headroom under its ceiling when the
 * instrument was added, so importing it plainly from Shelf — which App.tsx
 * imports statically — would have spent nearly all of it on an ornament that a
 * reader stopped at the gate cannot even see.
 *
 * It reaches readers inside the calendar's own already-lazy view. This is
 * invariant 7 again, and the Editor chunk proved that guarding a render is not
 * the same as guarding an import.
 */
describe.skipIf(!entry)('anime.js', () => {
  it.each([
    ['the library itself', 'animejs'],
    ['its timer', 'createTimer'],
    ['the instruments it drives', 'firm-star'],
    ['and the wheel', 'wheel-arm'],
  ])('is absent from the gate chunk: %s', (_what, needle) => {
    expect(entry!.source.includes(needle), `${needle} found in ${entry!.name}`).toBe(false);
  });

  /*
   * WHERE it lands is Rollup's business; that it lands SOMEWHERE ELSE is ours.
   *
   * This asserted a chunk named Astrolabe-*.js, which existed only while the
   * shelf pulled that component through React.lazy. The shelf lost its
   * instrument, then the astrolabe was withdrawn altogether, and the filename
   * stopped existing — which would have failed a test that was never really
   * about the filename. The invariant is the one above plus this: the
   * instruments ship, and they ship somewhere a reader at the seal does not
   * pay for.
   */
  it('ships in a lazy chunk rather than not at all', () => {
    const carriers = readdirSync(DIST)
      .filter((f) => f.endsWith('.js') && f !== entry!.name)
      .filter((f) => readFileSync(new URL(f, DIST), 'utf8').includes('firm-star'));
    expect(carriers, 'the Firmament is in no chunk at all').not.toHaveLength(0);
  });
});
