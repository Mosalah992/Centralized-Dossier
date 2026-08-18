import { describe, expect, it } from 'vitest';

import {
  CONSTELLATIONS,
  SERPENT,
  constellationOf,
  standing,
} from '../shared/constellations';
import { MONTHS } from '../shared/parsers/calendar';

/** The Firmament's own mapping, written out here so the table is checked
    against the source rather than against itself. */
const SEASONS: Record<string, string> = {
  'Morning Star': 'The Ritual',
  "Sun's Dawn": 'The Lover',
  'First Seed': 'The Lord',
  "Rain's Hand": 'The Mage',
  'Second Seed': 'The Shadow',
  'Mid Year': 'The Steed',
  "Sun's Height": 'The Apprentice',
  'Last Seed': 'The Warrior',
  Heartfire: 'The Lady',
  Frostfall: 'The Tower',
  "Sun's Dusk": 'The Atronach',
  'Evening Star': 'The Thief',
};

describe('the thirteen constellations', () => {
  it('holds thirteen signs', () => {
    expect(CONSTELLATIONS).toHaveLength(13);
  });

  it('seats each sign in the month the Firmament gives it', () => {
    for (const [month, sign] of Object.entries(SEASONS)) {
      const index = MONTHS.indexOf(month);
      expect(index, `${month} is not a month this archive knows`).toBeGreaterThanOrEqual(0);
      expect(constellationOf(index + 1)?.name).toBe(sign);
    }
  });

  it('gives every month exactly one sign, and no month two', () => {
    const seasonal = CONSTELLATIONS.filter((c) => c.monthIndex !== 0);
    const months = seasonal.map((c) => c.monthIndex).sort((a, b) => a - b);
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('leaves the Serpent without a season', () => {
    expect(SERPENT.name).toBe('The Serpent');
    expect(SERPENT.monthIndex).toBe(0);
    expect(constellationOf(0)).toBeNull();
    expect(constellationOf(13)).toBeNull();
  });

  it('names three Guardians, each holding three Charges', () => {
    const guardians = CONSTELLATIONS.filter((c) => c.isGuardian).map((c) => c.name);
    expect(guardians.sort()).toEqual(['The Mage', 'The Thief', 'The Warrior']);

    for (const guardian of ['Warrior', 'Mage', 'Thief'] as const) {
      const charges = CONSTELLATIONS.filter(
        (c) => c.guardian === guardian && !c.isGuardian,
      );
      expect(charges, `${guardian} should hold three charges`).toHaveLength(3);
    }
  });

  it('reads a sign’s standing from its guardian', () => {
    expect(standing(constellationOf(8)!)).toBe('Guardian of the Warrior');
    expect(standing(constellationOf(9)!)).toBe('Charge of the Warrior');
    expect(standing(SERPENT)).toBe('Of no season, and no guardian');
  });

  it('says something of those born under every sign', () => {
    for (const sign of CONSTELLATIONS) {
      expect(sign.born.length, sign.name).toBeGreaterThan(20);
    }
  });
});

/* The asterisms are hand-set numbers, and the two ways hand-set numbers go
   wrong here are both silent: a line pointing past the end of the star list
   renders as NaN coordinates and simply does not draw, and a star outside the
   field is clipped away without complaint. Neither throws, so neither would be
   noticed by looking at the page. */
describe('the drawn asterisms', () => {
  it('joins only stars that exist', () => {
    for (const sign of CONSTELLATIONS) {
      for (const [a, b] of sign.lines) {
        expect(sign.stars[a], `${sign.name}: line to star ${a}`).toBeDefined();
        expect(sign.stars[b], `${sign.name}: line to star ${b}`).toBeDefined();
        expect(a, `${sign.name}: a line joins a star to itself`).not.toBe(b);
      }
    }
  });

  it('keeps every star inside the field it is drawn in', () => {
    for (const sign of CONSTELLATIONS) {
      for (const [x, y] of sign.stars) {
        expect(x, `${sign.name}`).toBeGreaterThanOrEqual(0);
        expect(x, `${sign.name}`).toBeLessThanOrEqual(100);
        expect(y, `${sign.name}`).toBeGreaterThanOrEqual(0);
        expect(y, `${sign.name}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('draws no star twice in one figure', () => {
    for (const sign of CONSTELLATIONS) {
      const seen = new Set(sign.stars.map(([x, y]) => `${x},${y}`));
      expect(seen.size, sign.name).toBe(sign.stars.length);
    }
  });

  it('gives every figure enough stars to read as one', () => {
    for (const sign of CONSTELLATIONS) {
      expect(sign.stars.length, sign.name).toBeGreaterThanOrEqual(6);
      expect(sign.lines.length, sign.name).toBeGreaterThanOrEqual(5);
    }
  });

  /* Only the Ritual's centre stands alone, and it is drawn larger because of
     it. If another figure ever gains a loose star, that rule starts applying
     somewhere it was not meant to. */
  it('leaves no star unjoined but the Ritual’s centre', () => {
    for (const sign of CONSTELLATIONS) {
      const loose = sign.stars.filter(
        (_, i) => !sign.lines.some(([a, b]) => a === i || b === i),
      );
      expect(loose.length, sign.name).toBe(sign.name === 'The Ritual' ? 1 : 0);
    }
  });
});
