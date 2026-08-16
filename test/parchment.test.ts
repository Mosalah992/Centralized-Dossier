import { describe, expect, it } from 'vitest';

import {
  hexToHsl, hslToHex, inkWeight, parchmentise, withParchmentPalette,
} from '../shared/parchment';
import type { CalendarYear } from '../shared/types';

/** The page the calendar is printed on. */
const PAPER = '#efe6d2';
const PAPER_L = hexToHsl(PAPER)!.l;

/** The four colours the live sheet actually supplies, in legend order. */
const SHEET = {
  audit: '#e7cb74',
  festival: '#e3ede8',
  morndas: '#faf0d6',
  ordinary: '#eae4d3',
};

const lightnessOf = (hex: string) => hexToHsl(parchmentise(hex))!.l;

/**
 * The transform clamps saturation to 30, but these assertions read it back out
 * of a hex string, and eight bits per channel cannot hold that exactly — a
 * clamped 30 comes back as 30.4. The slack is quantisation, not the ceiling
 * being exceeded.
 */
const SAT_CEILING = 30 + 1;

describe('hsl conversion', () => {
  it('round-trips the colours it is given', () => {
    for (const hex of [PAPER, ...Object.values(SHEET), '#000000', '#ffffff', '#7c1f24']) {
      expect(hslToHex(hexToHsl(hex)!)).toBe(hex);
    }
  });

  it('refuses what it cannot read', () => {
    for (const bad of ['', 'red', '#fff', 'rgb(1,2,3)', '#gggggg']) {
      expect(hexToHsl(bad)).toBeNull();
    }
  });
});

describe('bringing the sheet palette onto parchment', () => {
  it('never returns a colour lighter than the paper', () => {
    for (const hex of Object.values(SHEET)) {
      expect(lightnessOf(hex)).toBeLessThan(PAPER_L);
    }
  });

  it('fixes the two that were lighter than the page they sat on', () => {
    // Morndas was +9.9% and the festivals +3.9% against the paper.
    expect(hexToHsl(SHEET.morndas)!.l).toBeGreaterThan(PAPER_L);
    expect(hexToHsl(SHEET.festival)!.l).toBeGreaterThan(PAPER_L);
    expect(lightnessOf(SHEET.morndas)).toBeLessThan(PAPER_L);
    expect(lightnessOf(SHEET.festival)).toBeLessThan(PAPER_L);
  });

  it("recovers the calendar's own order of importance from colour alone", () => {
    // Nothing here knows these names — the ranking falls out of how far each
    // colour is from grey and from the paper's hue.
    const weights = {
      ordinary: inkWeight(hexToHsl(SHEET.ordinary)!),
      morndas: inkWeight(hexToHsl(SHEET.morndas)!),
      festival: inkWeight(hexToHsl(SHEET.festival)!),
      audit: inkWeight(hexToHsl(SHEET.audit)!),
    };
    expect(weights.ordinary).toBeLessThan(weights.morndas);
    expect(weights.morndas).toBeLessThan(weights.festival);
    expect(weights.festival).toBeLessThan(weights.audit);

    // And heavier ink sinks further into the page.
    expect(lightnessOf(SHEET.ordinary)).toBeGreaterThan(lightnessOf(SHEET.morndas));
    expect(lightnessOf(SHEET.morndas)).toBeGreaterThan(lightnessOf(SHEET.festival));
    expect(lightnessOf(SHEET.festival)).toBeGreaterThan(lightnessOf(SHEET.audit));
  });

  it('keeps the festival green a green, as a second ink', () => {
    const out = hexToHsl(parchmentise(SHEET.festival))!;
    expect(out.h).toBeGreaterThan(90);
    expect(out.h).toBeLessThan(160);
  });

  it('keeps the warm colours warm', () => {
    for (const hex of [SHEET.audit, SHEET.morndas, SHEET.ordinary]) {
      const { h } = hexToHsl(parchmentise(hex))!;
      expect(h).toBeGreaterThan(30);
      expect(h).toBeLessThan(60);
    }
  });

  it('mutes everything into one range, and leaves nothing a neutral grey', () => {
    for (const hex of Object.values(SHEET)) {
      const { s } = hexToHsl(parchmentise(hex))!;
      expect(s).toBeGreaterThanOrEqual(8);
      expect(s).toBeLessThanOrEqual(SAT_CEILING);
    }
  });

  it('lands any colour the sheet could be re-themed to on the same paper', () => {
    // The legend is read at runtime, so the transform has to hold for colours
    // no one has chosen yet — including the ones a spreadsheet offers by default.
    for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#000000', '#ffffff', '#ff00ff']) {
      const out = hexToHsl(parchmentise(hex))!;
      expect(out.l).toBeLessThan(PAPER_L);
      expect(out.s).toBeLessThanOrEqual(SAT_CEILING);
    }
  });

  it('returns anything it cannot parse untouched', () => {
    expect(parchmentise('mistake')).toBe('mistake');
    expect(parchmentise('')).toBe('');
  });
});

describe('withParchmentPalette', () => {
  const year = (legend: { color: string; label: string }[]): CalendarYear => ({
    title: 'Tamrielic Calendar 4E 226',
    weekdays: [],
    legend,
    months: [],
  });

  it('rewrites every legend colour and keeps every label', () => {
    const before = year([
      { color: SHEET.audit, label: 'Audit' },
      { color: SHEET.festival, label: 'Festival' },
    ]);
    const after = withParchmentPalette(before);

    expect(after.legend.map((l) => l.label)).toEqual(['Audit', 'Festival']);
    expect(after.legend.map((l) => l.color)).toEqual([
      parchmentise(SHEET.audit),
      parchmentise(SHEET.festival),
    ]);
  });

  it('does not mutate the year it was handed', () => {
    const before = year([{ color: SHEET.audit, label: 'Audit' }]);
    withParchmentPalette(before);
    expect(before.legend[0]!.color).toBe(SHEET.audit);
  });

  it('is a no-op on a year with no legend', () => {
    const empty = year([]);
    expect(withParchmentPalette(empty)).toBe(empty);
  });
});
