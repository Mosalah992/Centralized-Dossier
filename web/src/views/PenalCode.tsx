// The Criminal Code of the Aldmeri Dominion, bound as a decree: the eagle and
// the Code's own preamble, a table of contents, the punishment guidelines, the
// seven parts article by article, and the three signatories who set their hand
// to it. The text is in penal-code-data.ts; this file only lays it out.

import type { MouseEvent } from 'react';

import { Page } from '../components/Page';
import eagleUrl from '../assets/penal/eagle.webp';
import lourinienUrl from '../assets/penal/signature-lourinien.webp';
import aedbinderUrl from '../assets/penal/signature-aedbinder.webp';
import ganarilUrl from '../assets/penal/signature-ganaril.webp';
import {
  AMENDMENT,
  CLASSIFICATION,
  DISCLAIMER,
  MODIFIERS,
  PARTS,
  PREAMBLE,
  PROVISIONS,
  PUNISHMENTS,
  SIGNATORIES,
} from './penal-code-data';
import '../styles/penal-code.css';

// Intrinsic sizes, so each signature reserves its own shape before it loads.
const SIGNATURES = {
  lourinien: { src: lourinienUrl, width: 480, height: 280 },
  aedbinder: { src: aedbinderUrl, width: 452, height: 308 },
  ganaril: { src: ganarilUrl, width: 480, height: 166 },
} as const;

/** Felony or misdemeanor, for the badge's styling. The words carry the meaning. */
const kindOf = (charge: string) => (/felony/i.test(charge) ? 'felony' : 'misdemeanor');

const CONTENTS = [
  { id: 'penal-punishments', label: 'Punishment Guidelines' },
  ...PARTS.map((part) => ({ id: `penal-${part.id}`, label: `${part.numeral}. ${part.title}` })),
  { id: 'penal-signatories', label: 'Signatories' },
];

// Contents entries are real links, followed by script so the router keeps the
// path; focus moves with the reader so the next Tab continues from the part.
function follow(event: MouseEvent<HTMLAnchorElement>, id: string) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
}

export function PenalCodeView() {
  return (
    <Page
      title="Criminal Code of the Aldmeri Dominion"
      subtitle="By Decree of the Aldmeri Dominion and by Order of the Thalmor"
      source={
        <p className="page__source">
          Kept by the Ministry of Justice and the Thalmor Council, who alone may amend it.
        </p>
      }
    >
      <div className="penal__eagle" role="img" aria-label="The eagle of the Aldmeri Dominion"
        style={{ '--eagle': `url(${eagleUrl})` } as React.CSSProperties} />

      <section className="penal__preamble" aria-labelledby="penal-intro">
        <h2 className="page__heading" id="penal-intro">Introduction</h2>
        {PREAMBLE.map((line) => <p key={line}>{line}</p>)}
        <ol className="penal__provisions">
          {PROVISIONS.map((line) => <li key={line}>{line}</li>)}
        </ol>
        <p>{AMENDMENT}</p>
        <div className="penal__disclaimer" role="note" aria-label="Disclaimer">
          <p className="penal__disclaimer-label">Disclaimer</p>
          <p>{DISCLAIMER}</p>
        </div>
      </section>

      <nav className="penal__contents" aria-labelledby="penal-contents-title">
        <h2 className="page__heading" id="penal-contents-title">Table of Contents</h2>
        <ol>
          {CONTENTS.map(({ id, label }) => (
            <li key={id}>
              <a href={`#${id}`} onClick={(event) => follow(event, id)}>{label}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="penal-punishments" tabIndex={-1} aria-labelledby="penal-punishments-title">
        <h2 className="page__heading" id="penal-punishments-title">Punishment Guidelines</h2>
        <ul className="penal__classes">
          {PUNISHMENTS.map(({ charge, penalties }) => (
            <li key={charge} className="penal__class">
              <h3 className={`penal__charge penal__charge--${kindOf(charge)}`}>{charge}</h3>
              <ul>
                {penalties.map((penalty) => <li key={penalty}>{penalty}</li>)}
              </ul>
            </li>
          ))}
        </ul>

        <div className="penal__classification">
          <h3>Common-Law Classifications</h3>
          {CLASSIFICATION.map((line) => <p key={line}>{line}</p>)}
          <h3>Additional Classifications</h3>
          <p>Modifiers that can increase charges, each by one class:</p>
          <ul className="penal__modifiers">
            {MODIFIERS.map((modifier) => <li key={modifier}>{modifier} <span>+1</span></li>)}
          </ul>
        </div>
      </section>

      {PARTS.map((part) => (
        <section
          key={part.id}
          id={`penal-${part.id}`}
          className="penal__part"
          tabIndex={-1}
          aria-labelledby={`penal-${part.id}-title`}
        >
          <h2 className="penal__part-title" id={`penal-${part.id}-title`}>
            <span className="penal__numeral">Part {part.numeral}</span>
            {part.title}
          </h2>
          {part.chapters.map((chapter) => (
            <div key={chapter.code} className="penal__chapter">
              <h3 className="penal__chapter-title">
                <span>{chapter.code}</span> {chapter.title}
              </h3>
              <ol className="penal__articles">
                {chapter.articles.map((article) => (
                  <li key={article.code} className="penal__article">
                    <h4 className="penal__article-head">
                      <span className="penal__article-code">{article.code}</span>
                      <span className="penal__article-title">{article.title}</span>
                    </h4>
                    <p className={`penal__charge penal__charge--${kindOf(article.charge)}`}>
                      {article.charge}
                    </p>
                    {article.text.map((line) => <p key={line}>{line}</p>)}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      ))}

      <section id="penal-signatories" className="penal__seal" tabIndex={-1} aria-labelledby="penal-signatories-title">
        <h2 className="page__heading" id="penal-signatories-title">Signatories</h2>
        <ul className="penal__signatories">
          {SIGNATORIES.map(({ name, office, signature }) => (
            <li key={name}>
              <img
                {...SIGNATURES[signature]}
                alt={`Signature of ${name}`}
                loading="lazy"
                decoding="async"
              />
              <p className="penal__signatory-name">{name}</p>
              <p className="penal__signatory-office">Member of the Thalmor · {office}</p>
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
