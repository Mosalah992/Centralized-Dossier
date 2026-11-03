// A drawn ornament for title pages and notes, shared by the Scribe Table and
// the Solar. The room's furniture was drawn here as SVG until the pixel room
// (2026-11-02); its sprites are drawn in code now (scripts/build-pixels.mjs).

/** A fleuron. Drawn, so it never falls back to an emoji. */
export function Fleuron({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 24" width={size * 1.6} height={size} aria-hidden="true" className="fleuron">
      <path d="M20 4c-4 6-10 8-16 6 4 3 10 4 14 1-2 4-1 8 2 11 3-3 4-7 2-11 4 3 10 2 14-1-6 2-12 0-16-6z" fill="currentColor" />
    </svg>
  );
}
