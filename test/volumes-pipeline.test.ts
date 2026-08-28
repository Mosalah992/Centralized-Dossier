// The three written volumes are generated now. This proves the generators.
//
// WHY THIS SUITE EXISTS. Chronicles, the Ledger and History used to be
// hand-written TypeScript. They are emitted from content/*.json so the Archives
// Editor can own them, and the whole migration rests on one claim: that the
// generated modules serve exactly what the hand-written ones did. That claim
// was checked once by hand at migration time, which is worth nothing a month
// from now — a generator that quietly drops a field, reorders a register or
// mangles an apostrophe would look like a working build.
//
// So the check runs on every `npm test`: the JSON on disk and the modules the
// Worker imports must agree, entry for entry, in order, character for
// character. If someone edits a module directly instead of the JSON, this
// fails — which is the point. The module is a build artefact and the JSON is
// the volume.

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { FUNERAL, MONTHS, POWERS, UNRESOLVED } from '../functions/lib/chronicle';
import { ENFORCEMENTS } from '../functions/lib/enforcement';
import {
  MIDYEAR,
  PAPERS,
  RECALL,
  RECALL_NOTICE,
  SECOND_SEED,
} from '../web/src/views/history-data';

const read = (name: string) =>
  JSON.parse(fs.readFileSync(path.join('content', name), 'utf8'));

const readJsonl = (name: string) =>
  fs.readFileSync(path.join('content', name), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

describe('the Thalmor Chronicles', () => {
  const data = read('chronicle.json');

  it('serves exactly what the JSON holds', () => {
    expect(MONTHS).toEqual(data.months);
    expect(POWERS).toEqual(data.powers);
    expect(UNRESOLVED).toEqual(data.unresolved);
    expect(FUNERAL).toEqual(data.funeral);
  });

  it('keeps every entry in order, character for character', () => {
    const flat = (ms: typeof MONTHS) =>
      ms.flatMap((m) => m.entries.map((e) => `${m.name}|${e.date}|${e.weight ?? ''}|${e.text}`));
    expect(flat(MONTHS)).toEqual(flat(data.months));
  });

  it('carries no markup the volume renders as plain text', () => {
    // The same rule the filings are held to: an asterisk or a bracket in this
    // prose would show as itself on the page.
    const prose = [
      ...MONTHS.flatMap((m) => [m.standfirst, ...m.entries.map((e) => e.text)]),
      ...POWERS.map((p) => p.note),
    ].join('\n');
    expect(prose).not.toMatch(/[[\]*]|```/);
  });
});

describe('the Ledger of Enforcement', () => {
  const records = readJsonl('enforcement.jsonl');

  it('serves one entry per record, less exact duplicates', () => {
    const signatures = new Set(records.map((r) => `${r.date}|${r.subject}|${r.kind}`));
    expect(ENFORCEMENTS.length).toBe(signatures.size);
  });

  it('holds every record the JSONL does', () => {
    const served = new Set(ENFORCEMENTS.map((e) => `${e.date}|${e.subject}|${e.kind}`));
    for (const r of records) {
      expect(served.has(`${r.date}|${r.subject}|${r.kind}`)).toBe(true);
    }
  });

  it('reads as a register — sorted by the in-world date', () => {
    const MONTH_ORDER = [
      'Morning Star', "Sun's Dawn", 'First Seed', "Rain's Hand", 'Second Seed',
      'Mid Year', "Sun's Height", 'Last Seed', 'Hearthfire', 'Frostfall',
      "Sun's Dusk", 'Evening Star',
    ];
    const key = (d: string): number => {
      const m = /^(.+?)\s+(\d+)$/.exec(d);
      if (!m) return 9999;
      const i = MONTH_ORDER.indexOf(m[1]!.trim());
      return (i >= 0 ? i : 98) * 100 + Number(m[2]);
    };
    const keys = ENFORCEMENTS.map((e) => key(e.date));
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
  });

  it('uses only rungs the type allows', () => {
    const RUNGS = new Set([
      'execution', 'affray', 'arrest', 'interrogation', 'fine',
      'labour', 'release', 'seizure', 'lesser', 'failed',
    ]);
    for (const e of ENFORCEMENTS) expect(RUNGS.has(e.kind)).toBe(true);
  });
});

describe('History of the Realm', () => {
  const data = read('history.json');

  it('serves exactly what the JSON holds', () => {
    expect(SECOND_SEED).toEqual(data.secondSeed);
    expect(MIDYEAR).toEqual(data.midyear);
    expect(RECALL).toEqual(data.recall);
    expect(RECALL_NOTICE).toEqual(data.recallNotice);
    expect(PAPERS).toEqual(data.papers);
  });

  it('keeps the Notice of Recall’s own spelling', () => {
    // The document's errors are evidence of it — see the aside in the view.
    // A generator that "tidied" these would be quietly correcting a source.
    const notice = RECALL_NOTICE.join(' ');
    expect(notice).toContain('antithecal');
    expect(notice).toContain('Condordat');
    expect(notice).toContain('before .');
  });
});
