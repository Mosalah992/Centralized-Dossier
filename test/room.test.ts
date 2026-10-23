import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { REPORT_CATEGORY_NAMES } from '../shared/reports';
import { WINGS, WING_INFO, wingOf } from '../shared/wings';
import { isNight, refusalFor } from '../web/src/components/ancarion-script';
import { DRAWERS, drawerOf, drawerRange } from '../web/src/room/cabinet-drawers';
import { parse } from '../web/src/router';

const read = (path: string) => readFileSync(path, 'utf8');

describe('the room routes', () => {
  it('opens the room at the front door and its surfaces over it', () => {
    expect(parse('/')).toEqual({ name: 'room' });
    expect(parse('/bookshelf')).toEqual({ name: 'room', open: 'bookshelf' });
    expect(parse('/bookshelf/white-gold-concordat')).toEqual({ name: 'room', open: 'bookshelf', sub: 'white-gold-concordat' });
    expect(parse('/board')).toEqual({ name: 'room', open: 'board' });
    expect(parse('/board/bounties')).toEqual({ name: 'room', open: 'board', sub: 'bounties' });
    expect(parse('/scribe-table')).toEqual({ name: 'room', open: 'scribe' });
    // The Scribe Table was the Lectern; its old address still opens it.
    expect(parse('/lectern')).toEqual({ name: 'room', open: 'scribe' });
    expect(parse('/gallery')).toEqual({ name: 'gallery' });
  });

  it('keeps every existing address', () => {
    // The Cabinet keeps the reports' addresses: the register, and one letter in it.
    expect(parse('/reports')).toEqual({ name: 'room', open: 'cabinet' });
    expect(parse('/reports/123')).toEqual({ name: 'room', open: 'cabinet', sub: '123' });
    expect(parse('/reports/abc')).toEqual({ name: 'missing' });
    expect(parse('/archives/roster')).toEqual({ name: 'volume', slug: 'roster' });
    expect(parse('/penalcode')).toEqual({ name: 'penalcode' });
  });

  it('opens the Solar as a page of its own, behind Ancarion', () => {
    expect(parse('/solar')).toEqual({ name: 'solar' });
  });

  it('opens nothing it does not have', () => {
    // The clerk's table is furnished in the Solar; its work comes with the Librarian.
    expect(parse('/clerk')).toEqual({ name: 'missing' });
    expect(parse('/bookshelf/Not A Slug')).toEqual({ name: 'missing' });
    expect(parse('/board/a/b')).toEqual({ name: 'missing' });
  });
});

describe('the room as drawn', () => {
  const room = read('web/src/room/Room.tsx');

  it('hangs every object the drawing names, each leading where it says', () => {
    for (const href of ['/bookshelf', '/board', '/scribe-table', '/archives/roster', '/archives/statistics', '/gallery', '/archives/honor']) {
      expect(room, href).toMatch(new RegExp(`["']${href}["']`));
    }
    // The Calendar was retired; the orb reads the sky and leads nowhere.
    expect(read('web/src/room/RoomOrb.tsx')).not.toContain('href=');
    expect(read('web/src/room/Cabinet.tsx')).toContain('href="/reports"');
    expect(room).toContain('<RoomClock />');
    expect(room).toContain('To file at the Scribe Table');
    expect(room).not.toMatch(/Lectern|Scroll Rack/);
  });

  it('opens the Solar from Ancarion, not from a door', () => {
    // The door came down on 2026-10-23: the portrait and its plate are the way in.
    expect(room).not.toMatch(/SolarDoor|area-door/);
    expect(room).toContain('<SolarPlate');
    expect(room).toContain('onSummon={() => plate.current?.knock()}');
    const portrait = read('web/src/room/RoomPortrait.tsx');
    expect(portrait).toContain('className="room-portrait__stage"');
    expect(portrait).not.toContain('<span className="plaque">Ancarion</span>');
    expect(read('web/src/styles/room.css')).not.toContain('.object--door');
  });

  it("takes the Solar's own word at the plate, and nothing of the Cabinet's", () => {
    const plate = read('web/src/room/SolarPlate.tsx');
    expect(plate).toContain('openSolar(passphrase, controller.signal)');
    expect(plate).toContain('solarIsOpen()');
    expect(plate).toContain('refusalFor(denials.current)');
    expect(plate).toContain("navigate('/solar')");
    expect(plate).not.toMatch(/openReports|reportsIsOpen|fetch\(/);
  });

  it('stands the call for recruits in Recruitment Posters, opening the form beside the archive', () => {
    const board = read('web/src/room/takeovers/Board.tsx');
    expect(board).toContain('recruitment: RecruitmentNotice,');
    expect(board).not.toContain('<RecruitmentNotice />');
    const notice = read('web/src/room/takeovers/Recruitment.tsx');
    expect(notice).toContain('https://docs.google.com/forms/d/e/');
    expect(notice).toContain('target="_blank"');
    expect(notice).toContain('rel="noopener noreferrer external"');
  });

  it('keeps no visitor counter', () => {
    expect(room).not.toContain('Register');
    expect(read('wrangler.toml')).not.toContain('binding = "REGISTER"');
  });

  it('stands a candle at either hand of the Scribe Table, where the torches were', () => {
    expect(room).not.toMatch(/Torch|torch--/);
    expect(room.match(/<Candle side="[lr]" \/>/g)).toHaveLength(2);
    const candle = read('web/src/room/Candle.tsx');
    // The flame is drawn live only for a reader who has not asked for stillness,
    // and the painted one stands in otherwise.
    expect(candle).toContain("prefers-reduced-motion: reduce");
    expect(candle).toContain('className="candle__still"');
    expect(candle).toContain("import('./candle-flame')");
    expect(read('web/src/styles/room.css')).not.toContain('torch-left.webp');
  });

  it('turns the orb as a glass globe in a cradle, without its brass rings', () => {
    expect(read('web/src/room/RoomOrb.tsx')).not.toContain('orb__band');
    const css = read('web/src/styles/orb.css');
    expect(css).not.toMatch(/inset 0 0 0 \dpx #(8a6d1c|e8cd7a)/);
    expect(css).toContain('@keyframes orb-spin');
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s+\.orb__sky,/);
  });

  it('pins the note in the corner the Solar door left, and lets the Cabinet fill the other', () => {
    const css = read('web/src/styles/room.css');
    expect(css).toContain("'note  . scribe scribe scribe   scribe scribe . cabinet'");
    expect(css).toContain("'shelf . archL  .      portrait .      archR  . cabinet'");
  });

  it('hangs Ancarion as a performer, never as a second gate', () => {
    expect(room).toContain('<RoomPortrait');
    expect(room).not.toContain('PortraitGate');
    expect(read('web/src/room/RoomPortrait.tsx')).toContain("preload: 'deferred'");
  });

  it('opens the Cabinet on the Reports writ and nothing else, without Ancarion', () => {
    const cabinet = read('web/src/room/Cabinet.tsx');
    expect(cabinet).toContain('openReports(passphrase, signal)');
    expect(cabinet).toContain('reportsIsOpen()');
    expect(cabinet).not.toMatch(/fetch\(/);
    // Ancarion keeps the Solar now; the Cabinet answers to its lock alone.
    expect(cabinet).not.toMatch(/ancarion\.current|refusalFor/);
    expect(room).toContain('<Cabinet sealed={sealed} />');
    // A reader who reached it without the writ is turned back to its slip.
    expect(read('web/src/room/takeovers/Cabinet.tsx')).toContain('else onSealed();');
  });

  it('hangs the Summerset boughs as decoration only, still for readers who ask', () => {
    const boughs = read('web/src/room/Boughs.tsx');
    expect(boughs).toContain('<div className="boughs" aria-hidden="true">');
    expect(room).toContain('<Boughs />');
    const css = read('web/src/styles/room.css');
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\r?\n  \.bough__sway,/);
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

describe('the drawers of the Cabinet', () => {
  const now = Date.parse('2026-10-22T12:00:00Z');
  const ago = (hours: number) => new Date(now - hours * 3_600_000).toISOString();

  it('files every letter by its age: under a day, a week, a month, and older', () => {
    expect(DRAWERS).toEqual(['fresh', 'new', 'old', 'archive']);
    expect([0, 23.9, 24, 167.9, 168, 719.9, 720, 9000].map((h) => drawerOf(ago(h), now))).toEqual([
      'fresh', 'fresh', 'new', 'new', 'old', 'old', 'archive', 'archive',
    ]);
  });

  it('asks the register for a range a day wider than each drawer', () => {
    expect(drawerRange('fresh', now)).toEqual({ from: '2026-10-20', to: null });
    expect(drawerRange('new', now)).toEqual({ from: '2026-10-14', to: '2026-10-22' });
    expect(drawerRange('old', now)).toEqual({ from: '2026-09-21', to: '2026-10-16' });
    expect(drawerRange('archive', now)).toEqual({ from: null, to: '2026-09-23' });
  });
});

describe('the six wings', () => {
  it('reads every collector category into a wing', () => {
    expect(REPORT_CATEGORY_NAMES.map(wingOf)).toEqual([
      'logistics', 'diplomatic', 'logistics', 'logistics', 'military', 'intelligence',
    ]);
  });

  it('gives every wing its own name, wax and emblem', () => {
    const info = WINGS.map((w) => WING_INFO[w]);
    for (const key of ['name', 'wax', 'emblem'] as const) {
      expect(new Set(info.map((i) => i[key])).size, key).toBe(WINGS.length);
    }
  });
});
