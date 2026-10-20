import { describe, expect, it } from 'vitest';

import { reckon } from '../shared/reckoning';
import { ordinal, plateReading } from '../web/src/room/clock-format';

describe("the room's clock plate", () => {
  it('writes ordinals as the Embassy does', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31, 111].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st', '111th',
    ]);
  });

  it('reads the reckoned moment: the anchor is the 4th of Heartfire, 4E 226, 6:04 PM', () => {
    const reading = plateReading(reckon(Date.UTC(2026, 7, 16, 20, 5)));
    expect(reading.date).toBe('4th of Heartfire');
    expect(reading.era).toBe('4E 226');
    expect(`${reading.clock} ${reading.meridiem}`).toBe('6:04 PM');
    expect(reading.label).toBe('4th of Heartfire, 4E 226, 6:04 PM');
  });
});
