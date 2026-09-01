/**
 * Slay the Heretic: the rules the Office of Thaumaturgical Licensing works by.
 *
 * Everything in this file is arithmetic and prose. It knows nothing about
 * canvases, sprites or React, which is the point — the licensing model is the
 * part worth testing, and the part three different screens would otherwise each
 * carry their own drifting copy of.
 *
 * THE TENSION IS BUREAUCRATIC, NOT MARTIAL. A working that is too strong for the
 * caster's rank is REFUSED, not quietly weakened. Nothing here nerfs a spell;
 * it either bears a seal or it does not, and casting one that does not is a
 * choice the game lets you make and then remembers.
 */

/* ── The cost of a working ───────────────────────────────────────────── */

/**
 * Oblivion's shape, and deliberately so.
 *
 *     cost = base x magnitude^1.28 x duration x (1 + area/10) x delivery
 *
 * MAGNITUDE IS SUPERLINEAR AND DURATION IS NOT, which is the whole balance of
 * the thing: doubling how hard a spell hits costs about two and a half times as
 * much, while doubling how long it lasts costs exactly twice. A caster who
 * wants a big number is pushed toward long and gentle rather than short and
 * violent — and Instability below exists to make sure they cannot simply ignore
 * that and buy the violent one anyway.
 */
export const MAGNITUDE_EXPONENT = 1.28;

export interface Delivery {
  id: string;
  name: string;
  /** What it multiplies the cost by. */
  mult: number;
  note: string;
}

export const DELIVERIES: readonly Delivery[] = [
  { id: 'self', name: 'On Self', mult: 0.8, note: 'The working takes the caster and no one else.' },
  { id: 'touch', name: 'On Touch', mult: 1, note: 'Delivered by the hand, to whatever the hand reaches.' },
  { id: 'aimed', name: 'Aimed', mult: 1.5, note: 'Thrown from the palm. The Office charges for the throw.' },
];

export interface Effect {
  id: string;
  name: string;
  school: string;
  /** Cost per point of magnitude before the exponent. */
  base: number;
  /**
   * How much this effect adds to Instability on its own.
   *
   * Shock is the worst of them: it is the effect the proving chamber was built
   * to contain, and it is the one that misfires.
   */
  volatility: number;
  /** Refused outright, whatever the caster's rank. */
  prohibited?: boolean;
  note: string;
}

export const EFFECTS: readonly Effect[] = [
  { id: 'flame', name: 'Flame Damage', school: 'Destruction', base: 0.85, volatility: 5, note: 'Burns, and goes on burning.' },
  { id: 'frost', name: 'Frost Damage', school: 'Destruction', base: 0.95, volatility: 3, note: 'Slows the blood as well as opening the skin.' },
  { id: 'shock', name: 'Shock Damage', school: 'Destruction', base: 1.1, volatility: 11, note: 'Strikes the mind through the body. The Office watches this one.' },
  { id: 'ward', name: 'Ward', school: 'Alteration', base: 0.7, volatility: 2, note: 'Holds a working off for as long as the will holds.' },
  { id: 'feather', name: 'Feather', school: 'Alteration', base: 0.4, volatility: 1, note: 'A clerk’s spell. Nobody has ever been refused one.' },
  { id: 'heal', name: 'Restore Health', school: 'Restoration', base: 0.6, volatility: 1, note: 'Closes what was opened.' },
  { id: 'fear', name: 'Fear', school: 'Illusion', base: 0.75, volatility: 6, note: 'The subject decides, quite sincerely, to be elsewhere.' },
  { id: 'calm', name: 'Calm', school: 'Illusion', base: 0.65, volatility: 4, note: 'Useful at checkpoints. Frequently misused at them.' },
  { id: 'light', name: 'Magelight', school: 'Mysticism', base: 0.35, volatility: 1, note: 'A lamp that sticks where it is thrown.' },
  { id: 'soultrap', name: 'Soul Trap', school: 'Mysticism', base: 1.0, volatility: 8, note: 'Lawful. Watched. Rarely both at once.' },

  /*
   * The two nobody gets a seal for. They are in the list rather than hidden
   * from it deliberately: the game is about a licensing office, and an office
   * you cannot submit the wrong thing to is not one.
   */
  { id: 'command', name: 'Command Mortal', school: 'Illusion', base: 1.6, volatility: 14, prohibited: true, note: 'Proscribed under the Concordat. Submitting it is itself a matter of record.' },
  { id: 'reanimate', name: 'Reanimate Corpse', school: 'Conjuration', base: 1.8, volatility: 16, prohibited: true, note: 'Necromancy. The Office does not issue for this at any rank.' },
];

/* ── Grades ──────────────────────────────────────────────────────────── */

/*
 * WIDENED FROM 25/75/150/300 AFTER PLAYING IT, and the design notes invited
 * exactly that — they called the thresholds a guess awaiting playtesting.
 *
 * The original bands came from Oblivion, whose effect base costs are a good
 * deal smaller than the ones above. Against these, a thoroughly ordinary
 * working — twenty magnitude of Shock, four seconds, aimed — priced at 306 and
 * came out MASTER, which meant the game's own opening spell was refused to its
 * own default rank before the player had touched a slider. Every band above
 * Novice was unreachable and the sliders had nowhere to travel.
 *
 * These give the three sliders room: a modest working sits in Apprentice, a
 * serious one in Adept, and Master is reserved for the sort of thing the
 * Office was invented to say no to.
 */
export const GRADE_THRESHOLDS = [60, 180, 420, 900] as const;

export const GRADES = ['Novice', 'Apprentice', 'Adept', 'Expert', 'Master'] as const;
export type Grade = (typeof GRADES)[number];

/** Which band a cost falls in. */
export function gradeOf(cost: number): Grade {
  for (let i = 0; i < GRADE_THRESHOLDS.length; i++) {
    if (cost <= GRADE_THRESHOLDS[i]!) return GRADES[i]!;
  }
  return GRADES[GRADES.length - 1]!;
}

/* ── Rank ────────────────────────────────────────────────────────────── */

export interface Rank {
  id: string;
  name: string;
  /** The highest grade this rank may be licensed for. */
  clearance: Grade;
}

export const RANKS: readonly Rank[] = [
  { id: 'initiate', name: 'Initiate', clearance: 'Novice' },
  { id: 'adept', name: 'Adept of the Second Circle', clearance: 'Apprentice' },
  { id: 'adjunct', name: 'Justiciar-Adjunct', clearance: 'Adept' },
  { id: 'justiciar', name: 'Justiciar', clearance: 'Expert' },
  { id: 'emissary', name: 'Emissary', clearance: 'Master' },
];

const gradeRank = (g: Grade) => GRADES.indexOf(g);

/* ── The working itself ──────────────────────────────────────────────── */

export interface Working {
  effectId: string;
  magnitude: number;
  duration: number;
  area: number;
  deliveryId: string;
}

export const LIMITS = {
  magnitude: { min: 1, max: 100 },
  duration: { min: 1, max: 60 },
  area: { min: 0, max: 40 },
} as const;

export function effectOf(w: Working): Effect {
  return EFFECTS.find((e) => e.id === w.effectId) ?? EFFECTS[0]!;
}

export function deliveryOf(w: Working): Delivery {
  return DELIVERIES.find((d) => d.id === w.deliveryId) ?? DELIVERIES[1]!;
}

export function costOf(w: Working): number {
  const e = effectOf(w);
  const d = deliveryOf(w);
  return e.base
    * Math.pow(Math.max(1, w.magnitude), MAGNITUDE_EXPONENT)
    * Math.max(1, w.duration)
    * (1 + Math.max(0, w.area) / 10)
    * d.mult;
}

/**
 * Instability — the archive's own invention, and the reason "everything to
 * maximum" is not the answer.
 *
 * Cost alone does not punish a bad working, it only prices it; a caster with
 * the rank for it could push every slider to the top and be waved through. So
 * a second number tracks how badly the working WANTS to go wrong, and it is
 * driven by the shapes that are actually dangerous rather than by the total:
 *
 *   - Magnitude past 25, which is where the Office's own tables stop.
 *   - Area, because a working nobody can stand outside of is worse than a
 *     strong one aimed at a single subject.
 *   - THE BURST TERM, which is the interesting one: a great deal of magnitude
 *     crammed into almost no duration. That is the shape of a working that
 *     discharges all at once, and it is what the ceiling is really for.
 *   - The effect's own temperament.
 */
export function instabilityOf(w: Working): number {
  const e = effectOf(w);
  const over = Math.max(0, w.magnitude - 25);
  const burst = w.duration <= 2 && w.magnitude > 40 ? (w.magnitude - 40) * 0.85 : 0;
  return Math.max(0, over * 0.9 + Math.max(0, w.area) * 1.1 + burst + e.volatility);
}

/** How likely a cast is to go wrong in the hand. */
export function misfireChance(instability: number): number {
  return Math.max(0, instability - 20) / 120;
}

/* ── The ruling ──────────────────────────────────────────────────────── */

export const INSTABILITY_CEILING = 60;

export type Seal = 'approved' | 'restricted' | 'refused';

export interface Ruling {
  seal: Seal;
  /** The stamp itself. */
  title: string;
  /** The clerk's reason, in the Office's voice. */
  body: string;
  cost: number;
  grade: Grade;
  instability: number;
  misfire: number;
}

/**
 * FIRST MATCH WINS, and the order is the ruling.
 *
 * Prohibited before rank, because an effect nobody may hold a licence for is
 * refused whatever the caster's standing — telling an Emissary their clearance
 * is insufficient for necromancy would be the wrong refusal. Rank before the
 * ceiling, because "you may not, at your grade" is a clearer thing to be told
 * than "this is unstable", and it is the one the caster can actually fix.
 */
export function ruleOn(w: Working, rank: Rank): Ruling {
  const cost = costOf(w);
  const grade = gradeOf(cost);
  const instability = instabilityOf(w);
  const misfire = misfireChance(instability);
  const e = effectOf(w);
  const base = { cost, grade, instability, misfire };

  if (e.prohibited) {
    return {
      ...base,
      seal: 'refused',
      title: 'Refused — proscribed effect',
      body: `${e.name} is proscribed. No licence is issued for it at any rank, and this `
        + 'submission has been entered in the Register of Interest.',
    };
  }

  if (gradeRank(grade) > gradeRank(rank.clearance)) {
    return {
      ...base,
      seal: 'refused',
      title: 'Refused — beyond your clearance',
      body: `This is a working of the ${grade} grade. A ${rank.name} is licensed to `
        + `${rank.clearance} and no further. Reduce the working, or apply for advancement.`,
    };
  }

  if (instability > INSTABILITY_CEILING) {
    return {
      ...base,
      seal: 'refused',
      title: 'Refused — will not hold',
      body: `Instability is reckoned at ${instability.toFixed(0)}, past the ceiling of `
        + `${INSTABILITY_CEILING}. The Office does not license a working that discharges `
        + 'in the caster’s hand. Lengthen the duration or narrow the area.',
    };
  }

  if (instability > 35 || grade === rank.clearance) {
    return {
      ...base,
      seal: 'restricted',
      title: 'Licensed — restricted',
      body: instability > 35
        ? `Issued, with caution. Instability stands at ${instability.toFixed(0)}; the `
          + 'working may turn in the hand. Cast it in a proving chamber and nowhere else.'
        : `Issued at the very top of a ${rank.name}’s clearance. Any further and the `
          + 'seal lapses.',
    };
  }

  return {
    ...base,
    seal: 'approved',
    title: 'Licensed',
    body: `A ${grade} working of ${e.school}, well within a ${rank.name}’s clearance. `
      + 'Cast it as you please.',
  };
}

/* ── The Register of Interest ────────────────────────────────────────── */

/**
 * How many unlicensed casts before somebody is sent.
 *
 * The flavour payoff of the whole game, and the reason refused workings can
 * still be carried: being told no has to be a decision rather than a wall, and
 * a decision needs a consequence that arrives on its own schedule.
 */
export const JUSTICIAR_AT = 3;

export function registerNotice(entries: number): string | null {
  if (entries <= 0) return null;
  if (entries < JUSTICIAR_AT) {
    const left = JUSTICIAR_AT - entries;
    return `Register of Interest: ${entries} ${entries === 1 ? 'entry' : 'entries'}. `
      + `${left} more and a Justiciar is dispatched.`;
  }
  return 'Register of Interest: a Justiciar has been dispatched. The Office thanks you '
    + 'for your cooperation.';
}

/* ── Palettes ────────────────────────────────────────────────────────── */

/**
 * What each effect looks like when it goes off.
 *
 * `core` is near-white for every one of them, and that is not laziness: light
 * reads as light because its centre is blown out, and putting the palette's hue
 * in the core is what makes a bolt look like a coloured squiggle instead.
 */
export const PALETTES: Record<string, { haze: string; body: string; core: string; kind: 'bolt' | 'frost' | 'flame' | 'soft' }> = {
  shock: { haze: 'rgba(96,54,214,0.35)', body: '#b58cff', core: '#f6f2ff', kind: 'bolt' },
  frost: { haze: 'rgba(46,120,168,0.35)', body: '#bfe9ff', core: '#ffffff', kind: 'frost' },
  flame: { haze: 'rgba(190,64,18,0.38)', body: '#ff9a3c', core: '#fff3d0', kind: 'flame' },
  ward: { haze: 'rgba(120,150,190,0.30)', body: '#cfe0f4', core: '#ffffff', kind: 'soft' },
  feather: { haze: 'rgba(150,160,120,0.25)', body: '#dbe4c4', core: '#ffffff', kind: 'soft' },
  heal: { haze: 'rgba(212,170,60,0.32)', body: '#f0d894', core: '#fffaf0', kind: 'soft' },
  fear: { haze: 'rgba(70,30,90,0.38)', body: '#b07fd0', core: '#f6eaff', kind: 'soft' },
  calm: { haze: 'rgba(60,110,120,0.30)', body: '#a8d8dc', core: '#ffffff', kind: 'soft' },
  light: { haze: 'rgba(200,180,90,0.30)', body: '#f2e3a8', core: '#ffffff', kind: 'soft' },
  soultrap: { haze: 'rgba(30,90,90,0.38)', body: '#7fd6c4', core: '#eafff8', kind: 'soft' },
  command: { haze: 'rgba(120,20,40,0.38)', body: '#e06a80', core: '#fff0f2', kind: 'soft' },
  reanimate: { haze: 'rgba(50,80,40,0.38)', body: '#9ec98a', core: '#f2ffe8', kind: 'soft' },
};

export const paletteFor = (effectId: string) => PALETTES[effectId] ?? PALETTES.shock!;
