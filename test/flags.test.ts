// The flag sprite's index.
//
// This file exists because of one bug, and the bug was invisible to reading:
// the codes are stored as one concatenated run, and a pair of them can spell a
// third across their boundary. BG followed by BH spells "GB", so `indexOf`
// finds the United Kingdom inside Bulgaria at an odd offset before it finds the
// real entry — and a lookup that rejected that first hit rather than looking
// past it left exactly one row on the register with no flag.
//
// The sweep below is the real test: every code the strip carries must resolve
// to its own row. It fails on any future pair with the same collision, which is
// the class of bug rather than the one instance.

import { describe, expect, it } from 'vitest';

import flagCodes from '../web/src/assets/flags/flags.json';
import { flagCodeList, flagRow } from '../web/src/flags';

describe('the flag strip', () => {
  it('is a whole number of two-letter codes', () => {
    expect((flagCodes as string).length % 2).toBe(0);
    expect(flagCodeList().length).toBe((flagCodes as string).length / 2);
  });

  it('carries the codes in sorted order, which is what makes position mean row', () => {
    const codes = flagCodeList();
    expect([...codes].sort()).toEqual(codes);
  });

  it('gives every code its own row', () => {
    // The sweep. One assertion per country, and the one that would have caught
    // the United Kingdom.
    flagCodeList().forEach((code, row) => {
      expect(flagRow(code), `${code} should be row ${row}`).toBe(row);
    });
  });

  it('finds a code that also appears across a boundary', () => {
    // The specific collision, pinned: BG + BH spell GB at an odd offset.
    const strip = flagCodes as string;
    expect(strip.indexOf('GB') % 2).toBe(1);
    expect(flagRow('GB')).not.toBeNull();
    expect(flagCodeList()[flagRow('GB')!]).toBe('GB');
  });

  it('has no flag for a country the set does not carry', () => {
    // XX is the register's own marker for a province it could not place, and it
    // must not accidentally match anything.
    expect(flagRow('XX')).toBeNull();
    expect(flagRow('ZZ')).toBeNull();
    expect(flagRow('')).toBeNull();
  });
});
