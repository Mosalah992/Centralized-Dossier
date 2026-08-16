// Thalmor Chronicles — the SHAPE of the volume, without its text.
//
// The real module is `chronicle.ts`, and it is gitignored. This repository is
// public, and that volume is the one thing in the archive that is sealed under
// a word of its own: it is assembled from the Embassy's own informant reports —
// who was interrogated, who was executed, which of our own agents broke — about
// roughly a hundred real people. Committing it here would publish, to anyone
// browsing GitHub, exactly the text the second gate exists to withhold. The
// passphrase would still be asked for and would no longer be worth asking.
//
// So the machinery is committed and the prose is not. Everything that makes the
// volume work — the gate, the scoped writ, the reader, the art — is in this
// repository and reviewable. Only the words are held back.
//
// WHY THIS FILE EXISTS AT ALL: `api/chronicle/index.ts` imports MONTHS, POWERS
// and UNRESOLVED from `./chronicle`. Gitignoring that module without leaving
// anything in its place means a fresh clone fails `npm run typecheck` and
// `npm run build` on a missing import, which reads as a broken repository
// rather than a deliberate omission. Copy this file to `chronicle.ts` and both
// pass, serving the placeholder text below:
//
//     cp functions/lib/chronicle.example.ts functions/lib/chronicle.ts
//
// To restore the real volume instead, take `chronicle.ts` from the machine that
// built it. It is not recoverable from this repository, and — because it is
// ignored rather than tracked — it is not recoverable from git history either.
// The deployed Worker holds a copy; a local copy is the only backup.
//
// WHY THE TEXT LIVES IN functions/ AND NOT IN A VIEW: History of the Realm
// keeps its text in `web/src/views/History.tsx`, which is right for it — that
// chronicle is transcribed from newspapers the whole province could buy. This
// one is different in kind. Static assets are served from public URLs; only
// `/api/*` passes through `api/_middleware.ts`. Prose compiled into the browser
// bundle is prose anyone with the link can read without ever answering the
// gate, so putting this in a view would have published it. Serving it from
// `/api/chronicle` costs this volume the ability to be read while the Worker is
// down. That is the trade the gate is worth.

export interface ChronicleEntry {
  /** In-world date, as the reports themselves reckon it. */
  date: string;
  text: string;
  /** Set for the handful of days the rest of the chronicle turns on. */
  weight?: 'grave';
}

export interface ChronicleMonth {
  name: string;
  /** One line placing the month before its entries. */
  standfirst: string;
  entries: ChronicleEntry[];
}

/**
 * The real MONTHS runs to four months and 85 entries, drawn from 650 reports.
 * Two entries stand here so the reader has something to page through and so the
 * `weight: 'grave'` branch — which draws a red rule in the margin — is exercised
 * rather than merely declared.
 */
export const MONTHS: ChronicleMonth[] = [
  {
    name: 'Rain’s Hand and Second Seed',
    standfirst: 'Placeholder. The sealed volume opens on the road to Markarth.',
    entries: [
      {
        date: 'Rain’s Hand 28',
        text: 'Placeholder entry. In the sealed volume this is a report filed by an informant in the field, redacted of every handle and account id before it was ever written down.',
      },
      {
        date: 'Second Seed 4',
        weight: 'grave',
        text: 'Placeholder entry, marked grave. The days carrying this weight are the ones the rest of the chronicle turns on, and the reader rules them in red.',
      },
    ],
  },
];

/** The powers moving through the record. Eight in the sealed volume. */
export const POWERS: { name: string; note: string }[] = [
  {
    name: 'Placeholder',
    note: 'A faction, court or warband the reports keep returning to, and what the Embassy concluded about it.',
  },
];

/** What the record never resolved. Eight in the sealed volume. */
export const UNRESOLVED: { name: string; note: string }[] = [
  {
    name: 'Placeholder',
    note: 'A question the reports raise and never answer. These are kept as open questions rather than smoothed into a story, which is the same rule docs/skyrim-press-history.md follows.',
  },
];
