// Where every node of the tapestry hangs.
//
// Pure arithmetic, kept apart from the drawing so it can be tested without a
// DOM and so the view is only ever concerned with ink.
//
// WHY THIS IS NOT d3-hierarchy. The canonical answer to "lay out a tree" is
// d3's tidy-tree implementation, and it is the right answer for an arbitrary
// graph. This is not one: it is exactly four levels deep, every branch descends
// in the same direction, and the only packing decision is how wide a subtree is.
// That is about twenty lines of arithmetic against five kilobytes of dependency,
// in a project that writes its own router rather than take one.
//
// THE SHAPE IS THE BLACK TAPESTRY, not an org chart: a root at the top, houses
// fanning out beneath it on curved thread, and a line that descends vertically
// where it runs long. People hang in a column under their rank rather than
// spreading sideways, because twenty-two Recruits side by side is four thousand
// pixels of nothing and a column is how a tapestry actually handles a long line.

import type { WingBranch } from '../../../shared/types';

export type NodeKind = 'root' | 'wing' | 'rank' | 'person';

export interface TapestryNode {
  id: string;
  kind: NodeKind;
  label: string;
  /** Race for a person, a count for anything that holds others. */
  detail: string;
  x: number;
  y: number;
  /** Whether pressing it does anything, and whether it is currently open. */
  expandable: boolean;
  expanded: boolean;
}

export interface TapestryThread {
  id: string;
  /** Cubic Bézier, already in the SVG's own coordinates. */
  d: string;
  /** Depth of the node it feeds, so nearer threads can be drawn heavier. */
  depth: number;
}

export interface Tapestry {
  nodes: TapestryNode[];
  threads: TapestryThread[];
  width: number;
  height: number;
}

/** One rank's worth of horizontal room. Sized to hold a long name at label size. */
const COL = 156;
/**
 * The drop from one generation to the next.
 *
 * Deliberately close to COL: when the drop is much shorter than the spread, the
 * branches come out nearly horizontal and the thing reads as a fan rather than
 * a tree. Roughly square is what gives the diagonal a tapestry has.
 */
const ROW = 150;
/** The drop between people hanging in the same column. */
const PERSON_ROW = 44;
const PAD_X = 40;
const PAD_Y = 44;

/** Medallion radius by kind. Layout owns it because the ports depend on it. */
export const RADIUS = { root: 21, wing: 15, rank: 10, person: 5 } as const;

/**
 * How far below a medallion its thread leaves.
 *
 * A branch drawn from the node's own centre passes straight through the name
 * printed under it, which is what the first weave did — every wing had its
 * label crossed out by its own children. Threads leave beneath the lettering
 * and arrive just above the next medallion.
 */
/**
 * Roughly how wide a wing's name will print, in pixels.
 *
 * Measured rather than assumed would mean laying out in the DOM and reading it
 * back, which is a lot of machinery to avoid one collision. Uppercase Cinzel at
 * the wing's size and tracking runs a shade over eight pixels a character, and
 * the estimate only has to be good enough to decide whether a name needs one
 * column or two — "ADMINISTRATIVE WING" needs two, and everything else needs
 * one.
 */
const labelColumns = (label: string): number =>
  Math.max(1, Math.ceil((label.length * 8.6 + 18) / COL));

const exitAt = (kind: keyof typeof RADIUS): number =>
  RADIUS[kind] + (kind === 'person' ? 30 : 34);
const entryAt = (kind: keyof typeof RADIUS): number => RADIUS[kind] + 4;

/**
 * A thread from parent to child.
 *
 * Cubic with both handles pulled vertically, which is what gives the woven
 * droop — a straight line reads as a wire and an elbow reads as a flowchart.
 */
function thread(x1: number, y1: number, x2: number, y2: number): string {
  const mid = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
}

/** A short vertical drop, for people descending under their rank. */
function drop(x: number, y1: number, y2: number): string {
  return `M ${x} ${y1} L ${x} ${y2}`;
}

/**
 * Lay the Embassy out.
 *
 * `open` holds the ids of every branch the reader has opened. Wings start shut:
 * with all of them fanned out the tapestry is twenty-four columns wide before a
 * single name is shown, which is a scroll rather than a shape.
 */
export function layout(hierarchy: WingBranch[], open: ReadonlySet<string>): Tapestry {
  const nodes: TapestryNode[] = [];
  const threads: TapestryThread[] = [];

  // First pass: how many columns does each wing occupy?
  const spans = hierarchy.map((wing) => {
    const isOpen = open.has(`wing:${wing.wing}`);
    // A shut wing still has to be wide enough for its own name, or a long one
    // prints straight over its neighbour.
    return Math.max(
      labelColumns(wing.wing),
      isOpen ? wing.ranks.length : 1,
    );
  });
  const columns = spans.reduce((a, b) => a + b, 0);

  const rootY = PAD_Y;
  const wingY = rootY + ROW;
  const rankY = wingY + ROW;

  let cursor = 0;
  // Grows to whatever is actually drawn. Starting it at the rank row left a
  // third of the cloth empty whenever every house was rolled shut.
  let deepest = wingY + exitAt('wing');

  hierarchy.forEach((wing, w) => {
    const span = spans[w]!;
    const left = PAD_X + cursor * COL;
    const wingX = left + (span * COL) / 2;
    const wingId = `wing:${wing.wing}`;
    const wingOpen = open.has(wingId);

    nodes.push({
      id: wingId,
      kind: 'wing',
      label: wing.wing,
      detail: String(wing.total),
      x: wingX,
      y: wingY,
      expandable: wing.ranks.length > 0,
      expanded: wingOpen,
    });

    if (wingOpen) {
      wing.ranks.forEach((group, r) => {
        const rankX = left + r * COL + COL / 2;
        const rankId = `rank:${wing.wing}:${group.rank}`;
        const rankOpen = open.has(rankId);

        nodes.push({
          id: rankId,
          kind: 'rank',
          label: group.rank,
          detail: String(group.members.length),
          x: rankX,
          y: rankY,
          expandable: group.members.length > 0,
          expanded: rankOpen,
        });
        deepest = Math.max(deepest, rankY + exitAt('rank'));
        threads.push({
          id: `t:${rankId}`,
          d: thread(wingX, wingY + exitAt('wing'), rankX, rankY - entryAt('rank')),
          depth: 2,
        });

        if (rankOpen) {
          group.members.forEach((person, i) => {
            const y = rankY + PERSON_ROW * (i + 1);
            nodes.push({
              id: `person:${rankId}:${person.name}:${i}`,
              kind: 'person',
              label: person.name,
              detail: person.race,
              x: rankX,
              y,
              expandable: false,
              expanded: false,
            });
            threads.push({
              id: `t:person:${rankId}:${i}`,
              d: drop(
                rankX,
                y - PERSON_ROW + exitAt(i === 0 ? 'rank' : 'person'),
                y - entryAt('person'),
              ),
              depth: 3,
            });
            deepest = Math.max(deepest, y + exitAt('person'));
          });
        }
      });
    }

    cursor += span;
  });

  const rootX = PAD_X + (columns * COL) / 2;
  nodes.unshift({
    id: 'root',
    kind: 'root',
    label: 'Thalmor Embassy',
    // No count: the registers at the head of the page already say how many
    // members there are, and a number here only crowds the trunk.
    detail: '',
    x: rootX,
    y: rootY,
    expandable: false,
    expanded: true,
  });

  // Root threads last so they are known after the wings have been placed.
  for (const node of nodes) {
    if (node.kind !== 'wing') continue;
    threads.unshift({
      id: `t:${node.id}`,
      d: thread(rootX, rootY + exitAt('root'), node.x, node.y - entryAt('wing')),
      depth: 1,
    });
  }

  return {
    nodes,
    threads,
    width: PAD_X * 2 + columns * COL,
    height: deepest + PAD_Y,
  };
}
