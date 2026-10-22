// The Embassy room's contract: what the bulletin board, the Scribe Table and the
// shelf exchange with /api/room/*. Ported from the Bruma Joint Archives
// (shared/api.ts there), which built the board and its bounties first, and
// re-voiced for the Embassy.
//
// PHASE 1 HAS NO BACKEND. Every /api/room path answers a JSON 404 until the
// Librarian backend lands (openspec/changes/add-librarian-backend), and the
// room reads that as "not yet consecrated": the board hangs its six sections
// with nothing nailed to them, and the Scribe Table waits. The shapes below are the
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

// The First Emissary's six sections (2026-10-22). Bounties kept its wanted
// posters; the five before it replaced New Laws, Figures of Interest, Embassy
// Agenda, Bread & Circus and News.
export const BOARD_SECTIONS = ['propaganda', 'recruitment', 'festivities', 'standing-orders', 'spiritual-guidance', 'bounties'] as const;
export type BoardSection = (typeof BOARD_SECTIONS)[number];

export const BOARD_INFO: Record<BoardSection, { title: string; describer: string }> = {
  propaganda: { title: 'Propaganda', describer: 'The Dominion’s word, proclaimed for every reader in Skyrim.' },
  recruitment: { title: 'Recruitment Posters', describer: 'The Embassy calls for those worthy of the oath.' },
  festivities: { title: 'Festivities', describer: 'Feasts, rites of the season and gatherings of the Embassy.' },
  'standing-orders': { title: 'Standing Orders', describer: 'Orders in force until the First Emissary rescinds them.' },
  'spiritual-guidance': { title: 'Spiritual Guidance', describer: 'Counsel in the faith of Auri-El and the Aldmeri gods.' },
  bounties: { title: 'Bounties', describer: 'Wanted, by order of the Third Aldmeri Dominion.' },
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
  scribeTable: boolean;
  clerk: boolean;
  board: boolean;
  books: boolean;
}
