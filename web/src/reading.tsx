// Guided reading — bionic reading, shared by the two volumes that are read
// rather than tabulated.
//
// It began in the Thalmor Chronicles, whose text arrives as data and could
// simply be run through a function on the way to the page. History of the Realm
// is not shaped that way: its account is mostly written straight into the view
// as prose, with emphasis and citations inline. Rewriting every paragraph of it
// into function calls would have meant retyping the historical record to add a
// display option, which is a poor trade and a good way to introduce a typo into
// something that is supposed to be a record.
//
// So there are two ways in. `prose()` guides a string, and is what a volume
// holding its text as data should use. `<Guided>` walks a rendered tree and
// guides the strings inside it, leaving the elements alone — which is what a
// volume holding its text as markup needs.

import { Fragment, cloneElement, isValidElement, useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

/** Where the preference is kept. One key: a reader who wants this wants it everywhere. */
const KEY = 'archive:guided';
/** Where it used to be kept, when only the Chronicles had it. */
const KEY_WAS = 'chronicle:guided';

/**
 * How many letters of a word the eye is given to fix on.
 *
 * Bionic reading bolds the opening of each word and lets the eye fill in the
 * rest. The share is not constant: a fixed two letters leaves a fourteen-letter
 * word with almost no anchor and bolds most of a three-letter one, so short
 * words take a single letter and long ones about two fifths.
 */
export function fixation(word: string): number {
  const n = word.length;
  if (n <= 1) return n;
  if (n <= 3) return 1;
  if (n <= 6) return 2;
  if (n <= 9) return 3;
  return Math.ceil(n * 0.4);
}

/**
 * Bold the fixation of every word in a run of plain text.
 *
 * Split on non-letters while KEEPING them, so spacing, punctuation and the
 * archive's curly apostrophes survive — and apostrophes and hyphens count as
 * inside a word, because "Kyne’s" and "Silver-Leaf" are each one word to a
 * reader and bolding after the mark reads as a stutter.
 *
 * Emits fragments rather than spans: across both volumes this runs to many
 * thousands of words, and a wrapper element around each is DOM for nothing.
 */
export function guide(text: string): ReactNode {
  const parts = text.split(/([^\p{L}\p{N}'’-]+)/u);
  return parts.map((part, i) => {
    if (!part || /^[^\p{L}\p{N}'’-]+$/u.test(part)) return part;
    const cut = fixation(part);
    return (
      <Fragment key={i}>
        <b className="chron-fix">{part.slice(0, cut)}</b>
        {part.slice(cut)}
      </Fragment>
    );
  });
}

/**
 * A run of prose, marked for a search and guided for the eye.
 *
 * Both transforms want the same string, so they are done in one pass rather
 * than one over the other's output. The search term is escaped before it becomes
 * a pattern: a reader searching for `O` — the letter left on the High King's
 * body — or for a full stop is searching for that character, not writing a
 * regular expression.
 *
 * Where a hit falls inside a word the two do interfere: the match splits the
 * word and each half is guided as though it were a word of its own. Left that
 * way deliberately — reuniting them means teaching the guide about the mark, for
 * one bolded letter mid-word on a term the reader typed and is looking straight
 * at.
 */
export function prose(text: string, term: string, guided: boolean): ReactNode {
  const escaped = term ? term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const parts = term ? text.split(new RegExp(`(${escaped})`, 'ig')) : [text];

  return parts.map((part, i) => {
    if (!part) return null;
    const body = guided ? guide(part) : part;
    return term && part.toLowerCase() === term.toLowerCase()
      ? <mark className="chron-mark" key={i}>{body}</mark>
      : <Fragment key={i}>{body}</Fragment>;
  });
}

/** Marking alone — for search results, which are the instrument and not the book. */
export const mark = (text: string, term: string): ReactNode => prose(text, term, false);

/**
 * Elements the guide steps over rather than into.
 *
 * Dates and running heads are display type, set in tracked capitals; bolding
 * their openings makes them look broken rather than easier. This is matched on
 * the class the view already gives them, so a view opts a run out by naming it
 * rather than by being restructured around the guide.
 */
const SKIP = /\b(?:chronicle__date|chron-entry__date|chronicle__month|page__heading|press__name|press__span)\b/;

function skipped(element: ReactElement): boolean {
  const className = (element.props as { className?: unknown }).className;
  return typeof className === 'string' && SKIP.test(className);
}

/** Recursively guide the strings in a tree, leaving its elements as they are. */
function guideTree(node: ReactNode): ReactNode {
  if (typeof node === 'string') return guide(node);
  if (Array.isArray(node)) {
    return node.map((child, i) => <Fragment key={i}>{guideTree(child)}</Fragment>);
  }
  if (isValidElement(node)) {
    if (skipped(node)) return node;
    const { children } = node.props as { children?: ReactNode };
    if (children === undefined) return node;
    return cloneElement(node, undefined, guideTree(children));
  }
  // Numbers, booleans, null, undefined: nothing to guide.
  return node;
}

/**
 * Guide a subtree of already-written markup.
 *
 * For volumes whose prose lives in the view rather than in data. Wrap the part
 * that is read; headings and dates inside it are stepped over by class.
 */
export function Guided({ on, children }: { on: boolean; children: ReactNode }) {
  return <>{on ? guideTree(children) : children}</>;
}

/**
 * The reader's preference, remembered.
 *
 * The aid genuinely helps some readers and genuinely distracts others, so it
 * cannot be the default — and a reader who needs it having to set it again on
 * every visit would have been given nothing.
 */
export function useGuidedReading(): [boolean, (on: boolean | ((was: boolean) => boolean)) => void] {
  const [guided, setGuided] = useState(() => {
    try {
      // The older key is honoured once so a reader who turned this on when only
      // the Chronicles had it does not find it off again.
      return localStorage.getItem(KEY) === '1'
        || (localStorage.getItem(KEY) === null && localStorage.getItem(KEY_WAS) === '1');
    } catch {
      // Private browsing can refuse storage outright. The aid still works; it
      // just will not be remembered.
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, guided ? '1' : '0');
    } catch { /* nothing to do, and nothing worth telling the reader */ }
  }, [guided]);

  return [guided, setGuided];
}

/** The switch itself, so both volumes offer the same control in the same words. */
export function GuidedToggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    // A switch, not a checkbox dressed as one: it turns something on now rather
    // than recording a choice to be submitted.
    <button
      type="button"
      className={`guide-toggle${on ? ' guide-toggle--on' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={onChange}
    >
      <span className="guide-toggle__mark" aria-hidden>
        <b>Th</b>al
      </span>
      <span className="guide-toggle__label">Guided reading</span>
    </button>
  );
}
