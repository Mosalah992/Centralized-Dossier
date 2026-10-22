// The Embassy's six wings, after the First Emissary's table (2026-10-22). A
// report's wing seals its letter in the Cabinet: the wax in the wing's colour,
// struck with the wing's emblem. Reports still arrive under the Discord
// collector's categories (REPORT_CATEGORY_NAMES); `wingOf` reads one into the
// other, and the collector, the API and the Scribe Table are unchanged.

import type { REPORT_CATEGORY_NAMES } from './reports';

export const WINGS = ['intelligence', 'military', 'logistics', 'diplomatic', 'legal', 'scholarship'] as const;
export type Wing = (typeof WINGS)[number];

export type Emblem = 'eye' | 'blades' | 'key' | 'laurel' | 'scales' | 'star';

export interface WingInfo {
  name: string;
  /** The wax: a deep tone for the seal, a light one for its emblem and lettering. */
  wax: string;
  ink: string;
  emblem: Emblem;
  covers: string;
}

export const WING_INFO: Record<Wing, WingInfo> = {
  intelligence: {
    name: 'Intelligence Wing',
    wax: '#24466e',
    ink: '#9cc0ea',
    emblem: 'eye',
    covers: 'Investigations, informants, threat assessments, suspected cult activity, espionage, missing persons, and intelligence gathered from other factions.',
  },
  military: {
    name: 'Military Wing',
    wax: '#7a2219',
    ink: '#f0a48f',
    emblem: 'blades',
    covers: 'Patrols, operations, mission debriefs, combat incidents, personnel readiness, military discipline, and deployment requests.',
  },
  logistics: {
    name: 'Logistics Wing',
    wax: '#2a5a2f',
    ink: '#a9d99a',
    emblem: 'key',
    covers: 'Inventory, procurement, expenditures, requisitions, stores, equipment, transport, and supply requests.',
  },
  diplomatic: {
    name: 'Diplomatic and Chancery Affairs',
    wax: '#7a5a10',
    ink: '#f2d27a',
    emblem: 'laurel',
    covers: 'Treaty matters, Imperial coordination, official correspondence, diplomatic incidents, embassy appointments, and negotiations.',
  },
  legal: {
    name: 'Legal and Doctrinal Affairs',
    wax: '#4e2f6e',
    ink: '#cdb0ef',
    emblem: 'scales',
    covers: 'Legal opinions, alleged violations, disciplinary proceedings, treaty interpretation, and records of official rulings.',
  },
  scholarship: {
    name: 'Scholarship and Arcane Affairs',
    wax: '#175f63',
    ink: '#93dcdc',
    emblem: 'star',
    covers: 'Magical research, lessons, examinations, scholarly discoveries, and authorised studies of artefacts.',
  },
};

type CollectorCategory = (typeof REPORT_CATEGORY_NAMES)[number];

/** Where each of the collector's categories files. Legal and Scholarship hold none yet. */
const BY_CATEGORY: Record<CollectorCategory, Wing> = {
  Informants: 'intelligence',
  Military: 'military',
  Logistics: 'logistics',
  Supply: 'logistics',
  Mining: 'logistics',
  Administration: 'diplomatic',
};

/**
 * The wing a report's category files under. A category the table does not
 * know (a channel added to the collector later) is read as correspondence,
 * which is what an unsorted letter is.
 */
export function wingOf(category: string): Wing {
  if ((WINGS as readonly string[]).includes(category.toLowerCase())) return category.toLowerCase() as Wing;
  return BY_CATEGORY[category as CollectorCategory] ?? 'diplomatic';
}
