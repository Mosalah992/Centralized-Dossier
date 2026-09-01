// The Office's rules, tested where they live.
//
// The licensing model is the part of this game worth testing: it is pure
// arithmetic and prose, it decides everything the player sees, and it is the
// part that would otherwise be silently re-tuned by whoever last touched a
// slider. The canvas is not tested here — a particle field's correctness is
// whether it looks right, and that is a screenshot's job, not an assertion's.

import { describe, expect, it } from 'vitest';

import {
  DELIVERIES,
  EFFECTS,
  GRADES,
  GRADE_THRESHOLDS,
  INSTABILITY_CEILING,
  JUSTICIAR_AT,
  RANKS,
  type Working,
  costOf,
  gradeOf,
  instabilityOf,
  misfireChance,
  registerNotice,
  ruleOn,
} from '../shared/spellcraft';

const base: Working = {
  effectId: 'flame', magnitude: 10, duration: 2, area: 0, deliveryId: 'touch',
};
const w = (patch: Partial<Working>): Working => ({ ...base, ...patch });

const rank = (id: string) => RANKS.find((r) => r.id === id)!;

describe('the cost of a working', () => {
  it('charges more than double for double the magnitude', () => {
    // The whole balance rests on this: magnitude is superlinear and duration is
    // not, so a caster wanting a big number is pushed toward long and gentle.
    const ratio = costOf(w({ magnitude: 20 })) / costOf(w({ magnitude: 10 }));
    expect(ratio).toBeGreaterThan(2);
    expect(ratio).toBeCloseTo(Math.pow(2, 1.28), 5);
  });

  it('charges exactly double for double the duration', () => {
    expect(costOf(w({ duration: 4 })) / costOf(w({ duration: 2 }))).toBeCloseTo(2, 9);
  });

  it('charges for the throw', () => {
    const touch = costOf(w({ deliveryId: 'touch' }));
    const aimed = costOf(w({ deliveryId: 'aimed' }));
    expect(aimed / touch).toBeCloseTo(1.5, 9);
    expect(costOf(w({ deliveryId: 'self' })) / touch).toBeCloseTo(0.8, 9);
  });

  it('never returns a cost outside the grade ladder', () => {
    for (const e of EFFECTS) {
      for (const d of DELIVERIES) {
        const cost = costOf({ effectId: e.id, magnitude: 100, duration: 60, area: 40, deliveryId: d.id });
        expect(Number.isFinite(cost)).toBe(true);
        expect(GRADES as readonly string[]).toContain(gradeOf(cost));
      }
    }
  });

  it('puts a band boundary in the band below it', () => {
    // `<=` rather than `<`, so a cost sitting exactly on a threshold is the
    // cheaper grade. Off by one here and every boundary spell is misfiled.
    for (let i = 0; i < GRADE_THRESHOLDS.length; i++) {
      expect(gradeOf(GRADE_THRESHOLDS[i]!)).toBe(GRADES[i]);
      expect(gradeOf(GRADE_THRESHOLDS[i]! + 0.01)).toBe(GRADES[i + 1]);
    }
  });
});

describe('instability', () => {
  it('ignores magnitude until the Office’s tables stop', () => {
    const quiet = instabilityOf(w({ effectId: 'feather', magnitude: 25, area: 0, duration: 10 }));
    const same = instabilityOf(w({ effectId: 'feather', magnitude: 10, area: 0, duration: 10 }));
    expect(quiet).toBeCloseTo(same, 9);
  });

  it('spikes on a great deal of magnitude in almost no duration', () => {
    // The burst term is the interesting one: the same magnitude spread over
    // time is a calmer working than the same magnitude discharged at once.
    const burst = instabilityOf(w({ magnitude: 80, duration: 1 }));
    const spread = instabilityOf(w({ magnitude: 80, duration: 30 }));
    expect(burst).toBeGreaterThan(spread);
  });

  it('grows with area, because a working nobody can step outside is worse', () => {
    expect(instabilityOf(w({ area: 20 }))).toBeGreaterThan(instabilityOf(w({ area: 0 })));
  });

  it('does not misfire at all below the threshold', () => {
    expect(misfireChance(0)).toBe(0);
    expect(misfireChance(20)).toBe(0);
    expect(misfireChance(80)).toBeCloseTo(0.5, 9);
  });
});

/*
 * THE ORDER OF THE RULING IS THE RULING. First match wins, and each of these
 * pins one step of it against the step that would otherwise swallow it.
 */
describe('the ruling', () => {
  it('refuses a proscribed effect before it considers rank', () => {
    // An Emissary has Master clearance and would pass every other gate. Telling
    // them their clearance was insufficient for necromancy would be the wrong
    // refusal, so prohibited has to be checked first.
    const r = ruleOn(w({ effectId: 'reanimate', magnitude: 1, duration: 1 }), rank('emissary'));
    expect(r.seal).toBe('refused');
    expect(r.title).toMatch(/proscribed/i);
  });

  it('refuses beyond clearance before it complains about instability', () => {
    // A huge, calm working: over an Initiate's grade, but nowhere near the
    // ceiling. The caster should be told the thing they can act on.
    const r = ruleOn(w({ effectId: 'feather', magnitude: 20, duration: 60 }), rank('initiate'));
    expect(r.seal).toBe('refused');
    expect(r.title).toMatch(/clearance/i);
  });

  it('refuses a working that will not hold', () => {
    const spell = w({ effectId: 'shock', magnitude: 100, duration: 1, area: 40 });
    expect(instabilityOf(spell)).toBeGreaterThan(INSTABILITY_CEILING);
    const r = ruleOn(spell, rank('emissary'));
    expect(r.seal).toBe('refused');
    expect(r.title).toMatch(/will not hold/i);
  });

  it('issues restricted at the very top of a clearance', () => {
    // Find a working whose grade lands exactly on the Adjunct's ceiling.
    const spell = w({ effectId: 'flame', magnitude: 30, duration: 6, deliveryId: 'aimed' });
    const r = ruleOn(spell, rank('adjunct'));
    if (r.grade === rank('adjunct').clearance && r.instability <= 35) {
      expect(r.seal).toBe('restricted');
    }
    // Whatever it lands on, it must never be a bare approval at the ceiling.
    if (r.grade === rank('adjunct').clearance) expect(r.seal).not.toBe('approved');
  });

  it('licenses a modest working outright', () => {
    const r = ruleOn(w({ effectId: 'light', magnitude: 5, duration: 2 }), rank('adjunct'));
    expect(r.seal).toBe('approved');
  });

  it('carries the reading on every ruling, refusal included', () => {
    // The chamber reads cost off the ruling to price the cast, so a refusal
    // that omitted it would make an unlicensed working free to throw.
    for (const rk of RANKS) {
      for (const e of EFFECTS) {
        const r = ruleOn(w({ effectId: e.id, magnitude: 40, duration: 5 }), rk);
        expect(r.cost).toBeGreaterThan(0);
        expect(r.instability).toBeGreaterThanOrEqual(0);
        expect(r.misfire).toBeGreaterThanOrEqual(0);
        expect(r.body.length).toBeGreaterThan(20);
      }
    }
  });

  it('never approves what it also calls unstable', () => {
    for (let m = 1; m <= 100; m += 7) {
      for (let a = 0; a <= 40; a += 8) {
        const spell = w({ effectId: 'shock', magnitude: m, area: a, duration: 3 });
        const r = ruleOn(spell, rank('emissary'));
        if (r.instability > 35) expect(r.seal).not.toBe('approved');
      }
    }
  });
});

describe('the Register of Interest', () => {
  it('says nothing until something is entered', () => {
    expect(registerNotice(0)).toBeNull();
  });

  it('counts down to the Justiciar, then announces them', () => {
    const first = registerNotice(1)!;
    expect(first).toMatch(/1 entry/);
    expect(first).toMatch(new RegExp(`${JUSTICIAR_AT - 1} more`));
    expect(registerNotice(JUSTICIAR_AT)).toMatch(/dispatched/i);
    expect(registerNotice(JUSTICIAR_AT + 5)).toMatch(/dispatched/i);
  });
});
