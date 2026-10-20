// Ancarion's rules, apart from his media: when he is asleep, and how his
// patience wears. Shared by every host that directs him — the Reports and
// Chronicles gates and the room's Scroll Rack — so a reader meets the same
// keeper wherever they knock.

export type Refusal = 'denied' | 'rebuffed' | 'annoyed';

/** At night he is found asleep, as the portraits in the corridors are. */
export function isNight(date = new Date()) {
  const hour = date.getHours();
  return hour >= 23 || hour < 6;
}

/** His patience wears: narrowed eyes, then the head-shake, then sighs. */
export function refusalFor(denials: number): Refusal {
  return denials <= 1 ? 'denied' : denials === 2 ? 'rebuffed' : 'annoyed';
}
