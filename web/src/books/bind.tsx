// Binding a volume: its text as a run of simple blocks (chapters, headings,
// paragraphs, dated entries, fields, lists, and anything a volume draws for
// itself), packed into leaves for BoundBook the way the Chronicles' entries
// are packed: greedily, to a character budget, a chapter always starting a
// fresh leaf and naming the running head.
//
// Every block is set through `prose`, so a search marks it and guided reading
// reaches it; and every block says what it holds in plain text, so the scrying
// can say which leaf a passage landed on.

import type { ReactNode } from 'react';

import { mark, prose } from '../reading';
import { PAGE_BUDGET, type Leaf } from './leaves';

export type BookBlock =
  /** Starts a fresh leaf, names the running head, and is set as its heading. */
  | { kind: 'chapter'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string; aside?: boolean }
  /** A dated entry, as the Chronicles set one. */
  | { kind: 'entry'; label: string; text: string; grave?: boolean }
  /** A term and its sense; consecutive fields share one list. */
  | { kind: 'field'; label: string; text: string }
  | { kind: 'list'; items: string[]; ordered?: boolean }
  /** Anything a volume draws itself (an article of law, a record, a document). */
  | { kind: 'custom'; weight: number; render: (term: string, guided: boolean) => ReactNode; items?: { label: string; text: string }[] };

/** About how much of a leaf's budget a block spends. */
function weightOf(block: BookBlock): number {
  switch (block.kind) {
    case 'chapter': return 160;
    case 'heading': return 110;
    case 'para': return block.text.length + 40;
    case 'entry': return block.text.length + block.label.length + 60;
    case 'field': return block.text.length + block.label.length + 50;
    case 'list': return block.items.reduce((sum, item) => sum + item.length + 30, 40);
    case 'custom': return block.weight;
  }
}

function itemsOf(block: BookBlock, head: string): { label: string; text: string }[] {
  switch (block.kind) {
    case 'chapter':
    case 'heading': return [];
    case 'para': return [{ label: head, text: block.text }];
    case 'entry': return [{ label: block.label, text: block.text }];
    case 'field': return [{ label: block.label, text: block.text }];
    case 'list': return block.items.map((text) => ({ label: head, text }));
    case 'custom': return block.items ?? [];
  }
}

function render(blocks: BookBlock[], term: string, guided: boolean): ReactNode {
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!;
    switch (block.kind) {
      case 'chapter':
        out.push(<h2 className="chron-h" key={i}>{mark(block.text, term)}</h2>);
        break;
      case 'heading':
        out.push(<h3 className="chron-h3" key={i}>{mark(block.text, term)}</h3>);
        break;
      case 'para':
        out.push(
          <p className={block.aside ? 'chron-p chron-p--aside' : 'chron-p'} key={i}>
            {prose(block.text, term, guided)}
          </p>,
        );
        break;
      case 'entry':
        out.push(
          <div className={`chron-entry${block.grave ? ' chron-entry--grave' : ''}`} key={i}>
            <p className="chron-entry__date">{mark(block.label, term)}</p>
            <p className="chron-entry__text">{prose(block.text, term, guided)}</p>
          </div>,
        );
        break;
      case 'field': {
        // A run of fields is one list.
        const run: Extract<BookBlock, { kind: 'field' }>[] = [];
        while (i < blocks.length && blocks[i]!.kind === 'field') run.push(blocks[i++] as Extract<BookBlock, { kind: 'field' }>);
        i--;
        out.push(
          <dl className="chron-list" key={i}>
            {run.map((field, k) => (
              <div className="chron-list__row" key={k}>
                <dt>{mark(field.label, term)}</dt>
                <dd>{prose(field.text, term, guided)}</dd>
              </div>
            ))}
          </dl>,
        );
        break;
      }
      case 'list': {
        const List = block.ordered ? 'ol' : 'ul';
        out.push(
          <List className="chron-steps" key={i}>
            {block.items.map((item, k) => (
              <li key={k}>{prose(item, term, guided)}</li>
            ))}
          </List>,
        );
        break;
      }
      case 'custom':
        out.push(<div key={i}>{block.render(term, guided)}</div>);
        break;
    }
  }
  return <>{out}</>;
}

/**
 * The blocks, packed into leaves. A block larger than the budget by itself
 * still gets a leaf of its own, which scrolls, rather than being cut.
 */
export function bindBlocks(blocks: BookBlock[], term: string, guided: boolean, budget = PAGE_BUDGET): Leaf[] {
  const leaves: Leaf[] = [];
  let head = '';
  let batch: BookBlock[] = [];
  let spent = 0;

  const flush = () => {
    if (!batch.length) return;
    const mine = batch;
    const items = mine.flatMap((block) => itemsOf(block, head));
    leaves.push({ head, body: render(mine, term, guided), items: items.length ? items : undefined });
    batch = [];
    spent = 0;
  };

  for (const block of blocks) {
    if (block.kind === 'chapter') {
      flush();
      head = block.text;
    }
    const weight = weightOf(block);
    if (batch.length && spent + weight > budget) {
      // A heading is never left at the foot of a leaf: headings at the end of
      // this one go over with the block they head. A chapter heading stays,
      // since it opened this leaf.
      const carry: BookBlock[] = [];
      while (batch.length > 1 && batch[batch.length - 1]!.kind === 'heading') carry.unshift(batch.pop()!);
      if (batch.length && batch[batch.length - 1]!.kind !== 'chapter') {
        flush();
        batch = carry;
        spent = carry.reduce((sum, b) => sum + weightOf(b), 0);
      } else {
        batch.push(...carry);
      }
    }
    batch.push(block);
    spent += weight;
  }
  flush();
  return leaves;
}
