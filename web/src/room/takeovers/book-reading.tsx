// Guided reading and search marking for the room's book reader. The same
// helpers as web/src/reading.tsx (the Chronicles reader), kept apart because
// that module brings chronicle.css with it; the preference key is shared, so a
// reader who chose guided reading in the Chronicles has it here too.
//
// Guided reading bolds the opening of each word for the eye to fix on. It helps
// some readers and distracts others, so it is off unless chosen, and the choice
// is remembered.

import { Fragment, useEffect, useState, type ReactNode } from 'react';

const KEY = 'archive:guided';

/** Letters of a word to bold: one for short words, about two fifths for long ones. */
export function fixation(word: string): number {
  const n = word.length;
  if (n <= 1) return n;
  if (n <= 3) return 1;
  if (n <= 6) return 2;
  if (n <= 9) return 3;
  return Math.ceil(n * 0.4);
}

/**
 * Bold the fixation of every word. Apostrophes and hyphens count as inside a
 * word ("Sun's", "Fire-Eye"), and fragments are used rather than spans so a
 * long book is not wrapped in thousands of elements.
 */
export function guide(text: string): ReactNode {
  return text.split(/([^\p{L}\p{N}'’-]+)/u).map((part, i) => {
    if (!part || /^[^\p{L}\p{N}'’-]+$/u.test(part)) return part;
    const cut = fixation(part);
    return (
      <Fragment key={i}>
        <b className="rd-fix">{part.slice(0, cut)}</b>
        {part.slice(cut)}
      </Fragment>
    );
  });
}

/**
 * A run of prose, marked for a search and guided for the eye, in one pass.
 * The term is escaped: a reader searching for "1.1" means those characters.
 */
export function prose(text: string, term: string, guided: boolean): ReactNode {
  const escaped = term ? term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const parts = term ? text.split(new RegExp(`(${escaped})`, 'ig')) : [text];
  return parts.map((part, i) => {
    if (!part) return null;
    const body = guided ? guide(part) : part;
    return term && part.toLowerCase() === term.toLowerCase() ? (
      <mark className="rd-mark" key={i}>
        {body}
      </mark>
    ) : (
      <Fragment key={i}>{body}</Fragment>
    );
  });
}

/** A short window of `text` around the first hit, marked — for the search results list. */
export function snippet(text: string, term: string): ReactNode {
  const at = text.toLowerCase().indexOf(term.toLowerCase());
  if (at < 0) return text.slice(0, 140);
  const from = Math.max(0, at - 60);
  const to = Math.min(text.length, at + term.length + 80);
  return (
    <>
      {from > 0 && '…'}
      {prose(text.slice(from, to), term, false)}
      {to < text.length && '…'}
    </>
  );
}

/** The reader's guided-reading preference, remembered where storage allows. */
export function useGuidedReading(): [boolean, (on: boolean | ((was: boolean) => boolean)) => void] {
  const [guided, setGuided] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, guided ? '1' : '0');
    } catch {
      /* private browsing: the aid still works, it just isn't remembered */
    }
  }, [guided]);
  return [guided, setGuided];
}

export function GuidedToggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" className={`guide-toggle${on ? ' guide-toggle--on' : ''}`} role="switch" aria-checked={on} onClick={onChange}>
      <span className="guide-toggle__mark" aria-hidden>
        <b>Gu</b>ided
      </span>
      <span className="guide-toggle__label">reading</span>
    </button>
  );
}

/**
 * Page numbers the pager shows: first, last, and the current one with its
 * neighbours, with an ellipsis where the run breaks. All of them below eight.
 */
export function pageWindow(current: number, count: number): (number | 'gap')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const out: (number | 'gap')[] = [0];
  const lo = Math.max(1, Math.min(current - 1, count - 4));
  const hi = Math.min(count - 2, Math.max(current + 1, 3));
  if (lo > 1) out.push('gap');
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < count - 2) out.push('gap');
  out.push(count - 1);
  return out;
}
