import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { isNight, refusalFor } from '../web/src/components/ancarion-script';
import { parse } from '../web/src/router';

const read = (path: string) => readFileSync(path, 'utf8');

describe('the room routes', () => {
  it('opens the room at the front door and its surfaces over it', () => {
    expect(parse('/')).toEqual({ name: 'room' });
    expect(parse('/bookshelf')).toEqual({ name: 'room', open: 'bookshelf' });
    expect(parse('/bookshelf/white-gold-concordat')).toEqual({ name: 'room', open: 'bookshelf', sub: 'white-gold-concordat' });
    expect(parse('/board')).toEqual({ name: 'room', open: 'board' });
    expect(parse('/board/bounties')).toEqual({ name: 'room', open: 'board', sub: 'bounties' });
    expect(parse('/lectern')).toEqual({ name: 'room', open: 'lectern' });
    expect(parse('/gallery')).toEqual({ name: 'gallery' });
  });

  it('keeps every existing address', () => {
    expect(parse('/reports')).toEqual({ name: 'reports' });
    expect(parse('/reports/123')).toEqual({ name: 'reports', id: '123' });
    expect(parse('/archives/roster')).toEqual({ name: 'volume', slug: 'roster' });
    expect(parse('/penalcode')).toEqual({ name: 'penalcode' });
  });

  it('opens nothing it does not have', () => {
    // The Solar is a later page; the clerk's table comes with the Librarian.
    expect(parse('/solar')).toEqual({ name: 'missing' });
    expect(parse('/clerk')).toEqual({ name: 'missing' });
    expect(parse('/bookshelf/Not A Slug')).toEqual({ name: 'missing' });
    expect(parse('/board/a/b')).toEqual({ name: 'missing' });
  });
});

describe('the room as drawn', () => {
  const room = read('web/src/room/Room.tsx');

  it('hangs every object the drawing names, each leading where it says', () => {
    for (const href of ['/bookshelf', '/board', '/lectern', '/archives/roster', '/archives/statistics', '/gallery', '/archives/honor']) {
      expect(room, href).toMatch(new RegExp(`["']${href}["']`));
    }
    // The Calendar was retired; the orb reads the sky and leads nowhere.
    expect(read('web/src/room/RoomOrb.tsx')).not.toContain('href=');
    expect(read('web/src/room/ScrollRack.tsx')).toContain('href="/reports"');
    expect(room).toContain('<RoomClock />');
    expect(room).toContain('To file at the Lectern');
  });

  it("hangs the Solar's door sealed, without pretending the way is open", () => {
    // A button that can be found and tried, never a link, until the Solar is built.
    expect(room).toMatch(/type="button"\s+className="area-door[^"]*"/);
    expect(room).toContain('aria-disabled="true"');
    expect(room).not.toContain('href="/solar"');
  });

  it('pins the call for recruits to the board, opening the form beside the archive', () => {
    expect(read('web/src/room/takeovers/Board.tsx')).toContain('<RecruitmentNotice />');
    const notice = read('web/src/room/takeovers/Recruitment.tsx');
    expect(notice).toContain('https://docs.google.com/forms/d/e/');
    expect(notice).toContain('target="_blank"');
    expect(notice).toContain('rel="noopener noreferrer external"');
  });

  it('keeps no visitor counter', () => {
    expect(room).not.toContain('Register');
    expect(read('wrangler.toml')).not.toContain('binding = "REGISTER"');
  });

  it('stands the lectern between the torches the candles gave way to', () => {
    expect(room.match(/<Torch side="[lr]" \/>/g)).toHaveLength(2);
    expect(room).not.toContain('Candle');
  });

  it('hangs Ancarion as a performer, never as a second gate', () => {
    expect(room).toContain('<RoomPortrait');
    expect(room).not.toContain('PortraitGate');
    expect(read('web/src/room/RoomPortrait.tsx')).toContain("preload: 'deferred'");
  });

  it('opens the rack on the Reports writ and nothing else', () => {
    const rack = read('web/src/room/ScrollRack.tsx');
    expect(rack).toContain('openReports(passphrase, signal)');
    expect(rack).toContain('reportsIsOpen()');
    expect(rack).toContain('refusalFor(denials.current)');
    expect(rack).not.toMatch(/fetch\(/);
  });

  it('keeps its motion for readers who want it', () => {
    for (const sheet of ['room.css', 'takeover.css', 'board.css']) {
      expect(read(`web/src/styles/${sheet}`), sheet).toContain('prefers-reduced-motion: reduce');
    }
    expect(read('web/src/room/Takeover.tsx')).toContain('reducedMotion()');
  });

  it('finds painted art at build time instead of probing for it', () => {
    const slot = read('web/src/room/ImageSlot.tsx');
    expect(slot).toContain("import.meta.glob<string>('../assets/room/*.webp'");
    expect(slot).not.toContain('/art/room/');
  });
});

describe("Ancarion's patience", () => {
  it('wears from narrowed eyes to the head-shake to sighs, and stays there', () => {
    expect([1, 2, 3, 4, 9].map(refusalFor)).toEqual(['denied', 'rebuffed', 'annoyed', 'annoyed', 'annoyed']);
  });

  it('sleeps from eleven at night until six', () => {
    const at = (h: number) => new Date(2026, 9, 19, h, 30);
    expect([22, 23, 0, 5, 6].map((h) => isNight(at(h)))).toEqual([false, true, true, true, false]);
  });
});
