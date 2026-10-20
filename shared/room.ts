// The Embassy room's contract: what the bulletin board, the lectern and the
// shelf exchange with /api/room/*. Ported from the Bruma Joint Archives
// (shared/api.ts there), which built the board and its bounties first, and
// re-voiced for the Embassy.
//
// PHASE 1 HAS NO BACKEND. Every /api/room path answers a JSON 404 until the
// Librarian backend lands (openspec/changes/add-librarian-backend), and the
// room reads that as "not yet consecrated": the board hangs its six sections
// with nothing nailed to them, and the lectern waits. The shapes below are the
// ones that backend must serve, so the room does not change when it arrives.

/** The Dominion files under the gold eagle; a denial is the red cross. */
export type Stamp = 'aldmeri' | 'imperial' | 'bruma';

// ---------- Bounties ----------

export const RACES = ['altmer', 'argonian', 'bosmer', 'breton', 'dunmer', 'imperial', 'khajiit', 'nord', 'orsimer', 'redguard'] as const;
export type Race = (typeof RACES)[number];
export const GENDERS = ['male', 'female'] as const;
export type Gender = (typeof GENDERS)[number];

export const RACE_NAMES: Record<Race, string> = {
  altmer: 'Altmer', argonian: 'Argonian', bosmer: 'Bosmer', breton: 'Breton', dunmer: 'Dunmer',
  imperial: 'Imperial', khajiit: 'Khajiit', nord: 'Nord', orsimer: 'Orsimer', redguard: 'Redguard',
};

/** Wanted-poster details. The poster portrait is /art/portraits/{race}-{gender}.webp. */
export interface Bounty {
  name: string;
  aliases?: string;
  race: Race;
  gender: Gender;
  crimes: string;
  reward: string;
  lastSeen?: string;
  /**
   * Where the poster's own portrait is served, if the filer gave one: set by
   * the server, never by a client. Without it, the poster shows the race's
   * sketch, /art/portraits/{race}-{gender}.webp.
   */
  portrait?: string;
}

// ---------- Bulletin Board ----------

export const BOARD_SECTIONS = ['bounties', 'new-laws', 'figures-of-interest', 'embassy-agenda', 'bread-and-circus', 'news'] as const;
export type BoardSection = (typeof BOARD_SECTIONS)[number];

export const BOARD_INFO: Record<BoardSection, { title: string; describer: string }> = {
  bounties: { title: 'Bounties', describer: 'Wanted, by order of the Third Aldmeri Dominion.' },
  'new-laws': { title: 'New Laws', describer: 'Edicts, decrees and amendments to the Code lately proclaimed.' },
  'figures-of-interest': { title: 'Figures of Interest', describer: 'Persons the Justiciars would know more of.' },
  'embassy-agenda': { title: 'Embassy Agenda', describer: 'What the First Emissary has set before the Embassy.' },
  'bread-and-circus': { title: 'Bread & Circus', describer: 'Feasts, games, lotteries and entertainments.' },
  news: { title: 'News', describer: 'Tidings from Skyrim, from Summerset, and beyond.' },
};

export const isBoardSection = (s: string): s is BoardSection => (BOARD_SECTIONS as readonly string[]).includes(s);

export interface BoardSectionSummary {
  id: BoardSection;
  title: string;
  describer: string;
  count: number;
  /** When the newest notice in the section was posted (ISO), for "new" marks. */
  latestAt?: string;
}

export interface Notice {
  id: number;
  section: BoardSection;
  title: string;
  body: string;
  bounty?: Bounty;
  /** Who put it up, in-world: "Justiciar, Thalmor Embassy". Never a Discord name. */
  postedBy: string;
  stamp: Stamp;
  postedAt: string;
}

// ---------- What the room can do ----------

/** GET /api/room/status: which of the room's services are consecrated. */
export interface RoomStatus {
  lectern: boolean;
  clerk: boolean;
  board: boolean;
  books: boolean;
}
