import { describe, expect, it } from 'vitest';
import { layout } from '../web/src/views/precedence-layout';
import type { WingBranch } from '../shared/types';

const person = (n: string) => ({ name: n, race: 'Altmer' });

const TREE: WingBranch[] = [
  { wing: 'Command', total: 2, ranks: [
    { rank: 'First Emissary', members: [person('Lakkon')] },
    { rank: 'Justiciar', members: [person('Iwelien')] },
  ] },
  { wing: 'Militant Wing', total: 3, ranks: [
    { rank: 'Recruit', members: [person('A'), person('B'), person('C')] },
  ] },
];

const ids = (t: ReturnType<typeof layout>) => t.nodes.map((n) => n.id);
const kinds = (t: ReturnType<typeof layout>, k: string) =>
  t.nodes.filter((n) => n.kind === k);

describe('the cloth, unrolled', () => {
  it('shows the root and the houses, and nothing beneath them', () => {
    const t = layout(TREE, new Set());
    expect(kinds(t, 'root')).toHaveLength(1);
    expect(kinds(t, 'wing')).toHaveLength(2);
    expect(kinds(t, 'rank')).toHaveLength(0);
    expect(kinds(t, 'person')).toHaveLength(0);
  });

  it('hangs a thread from the root to every house', () => {
    const t = layout(TREE, new Set());
    expect(t.threads.filter((x) => x.depth === 1)).toHaveLength(2);
  });

  it('brings down the ranks when a house is opened, and only that house', () => {
    const t = layout(TREE, new Set(['wing:Command']));
    expect(kinds(t, 'rank').map((n) => n.label)).toEqual(['First Emissary', 'Justiciar']);
    expect(kinds(t, 'person')).toHaveLength(0);
  });

  it('brings down the names when a rank is opened', () => {
    const t = layout(TREE, new Set(['wing:Militant Wing', 'rank:Militant Wing:Recruit']));
    expect(kinds(t, 'person').map((n) => n.label)).toEqual(['A', 'B', 'C']);
    // They descend in a column rather than spreading sideways.
    const xs = new Set(kinds(t, 'person').map((n) => n.x));
    expect(xs.size).toBe(1);
    const ys = kinds(t, 'person').map((n) => n.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

  it('widens only for the house that is open', () => {
    const shut = layout(TREE, new Set());
    const open = layout(TREE, new Set(['wing:Command']));
    expect(open.width).toBeGreaterThan(shut.width);
    // Two wings shut is two columns; Command open adds its second rank.
    expect(open.width).toBe(shut.width + (open.width - shut.width));
    expect(kinds(open, 'rank')).toHaveLength(2);
  });

  it('grows taller only when names come down', () => {
    const ranks = layout(TREE, new Set(['wing:Militant Wing']));
    const names = layout(TREE, new Set(['wing:Militant Wing', 'rank:Militant Wing:Recruit']));
    expect(names.height).toBeGreaterThan(ranks.height);
  });

  it('centres a parent over what hangs from it', () => {
    const t = layout(TREE, new Set(['wing:Command']));
    const wing = t.nodes.find((n) => n.id === 'wing:Command')!;
    const under = kinds(t, 'rank');
    const mid = (Math.min(...under.map((n) => n.x)) + Math.max(...under.map((n) => n.x))) / 2;
    expect(wing.x).toBeCloseTo(mid, 5);
  });

  it('gives the trunk no count of its own', () => {
    // The registers at the head of the page already state the strength; a
    // number on the trunk only crowds the point where every thread leaves.
    expect(layout(TREE, new Set()).nodes[0]!.detail).toBe('');
  });

  it('gives every node and thread an id of its own', () => {
    const t = layout(TREE, new Set(['wing:Command', 'wing:Militant Wing', 'rank:Militant Wing:Recruit']));
    expect(new Set(ids(t)).size).toBe(t.nodes.length);
    expect(new Set(t.threads.map((x) => x.id)).size).toBe(t.threads.length);
  });

  it('marks what can be opened, and what cannot', () => {
    const t = layout(TREE, new Set(['wing:Command']));
    expect(kinds(t, 'wing').every((n) => n.expandable)).toBe(true);
    expect(t.nodes.find((n) => n.id === 'wing:Command')!.expanded).toBe(true);
    expect(t.nodes.find((n) => n.id === 'wing:Militant Wing')!.expanded).toBe(false);
    expect(kinds(t, 'root')[0]!.expandable).toBe(false);
  });

  it('survives a wing with no ranks at all', () => {
    const empty: WingBranch[] = [{ wing: 'Ghost Wing', total: 0, ranks: [] }];
    const t = layout(empty, new Set(['wing:Ghost Wing']));
    expect(t.width).toBeGreaterThan(0);
    expect(t.nodes.find((n) => n.kind === 'wing')!.expandable).toBe(false);
  });
});
