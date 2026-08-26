// Ledger of Enforcement — the SHAPE of the volume, without its text.
//
// The real module is `enforcement.ts`, and it is gitignored, for the same
// reason `chronicle.ts` is: this repository is public, and this volume names
// roughly two hundred real people — by name, by title, by what was done to
// them — compiled out of the Embassy's own informant reports. Those reports are
// already held back. Publishing the register distilled from them would hand
// over the substance of what was withheld, in a more readable form than the
// source.
//
// So the machinery is committed and the prose is not. The route, the type, the
// rungs and the whole reader are in this repository and reviewable. Only the
// records are missing.
//
// WHY THIS FILE EXISTS AT ALL: `api/enforcement/index.ts` imports ENFORCEMENTS
// from `./enforcement`. Gitignoring that module without leaving anything in its
// place makes a fresh clone fail `npm run typecheck` and `npm run build` on a
// missing import, which reads as a broken repository rather than a deliberate
// omission. Copy this file over it and both pass:
//
//     cp functions/lib/enforcement.example.ts functions/lib/enforcement.ts
//
// UNLIKE THE CHRONICLE, THIS ONE IS REPRODUCIBLE. It was derived, not written:
// given a fresh export of the informant channel to tmp/, the reading pass that
// produced it can be run again. The chronicle was composed and cannot.

export type Rung =
  | 'execution' | 'arrest' | 'interrogation' | 'fine'
  | 'labour' | 'release' | 'seizure' | 'lesser' | 'failed';

export interface Enforcement {
  /** In-world date, as the reports reckon it. */
  date: string;
  /** Who acted. More than one name where the taking and the killing differ. */
  agent: string;
  /** What that agent did. */
  act: string;
  /** The accused, by the name the report gives. */
  subject: string;
  /** Rank, race or standing, where the report supplies one. */
  title: string;
  /** How it was done. */
  method: string;
  /** How it ended. */
  outcome: string;
  kind: Rung;
}

// One placeholder record, so a clone's reader has something to lay out and the
// shape of a real entry is visible without any of them being here.
export const ENFORCEMENTS: Enforcement[] = [
  {
    date: 'Placeholder',
    agent: 'A justiciar of the Embassy',
    act: 'This register is not published with the source',
    subject: 'A subject of the Empire',
    title: '',
    method: 'See the note at the head of this file',
    outcome: 'Copy the real enforcement.ts into place to read the ledger',
    kind: 'lesser',
  },
];
