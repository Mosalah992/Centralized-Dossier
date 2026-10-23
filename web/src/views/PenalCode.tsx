// The Criminal Code of the Aldmeri Dominion, bound as a book like every volume
// on the shelf (2026-10-23; BoundBook): the Code's own preamble, the
// punishment guidelines, the seven parts article by article, and the three
// signatories who set their hand to it. The text is in penal-code-data.ts;
// this file only binds it. The Dominion's eagle is on the board.

import { useCallback } from 'react';

import eagleUrl from '../assets/penal/eagle.webp';
import lourinienUrl from '../assets/penal/signature-lourinien.webp';
import aedbinderUrl from '../assets/penal/signature-aedbinder.webp';
import ganarilUrl from '../assets/penal/signature-ganaril.webp';
import { bindBlocks, type BookBlock } from '../books/bind';
import { BoundBook } from '../books/BoundBook';
import { TitlePage, type Leaf } from '../books/leaves';
import { mark, prose } from '../reading';
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
  type Article,
} from './penal-code-data';

// Intrinsic sizes, so each signature reserves its own shape before it loads.
const SIGNATURES = {
  lourinien: { src: lourinienUrl, width: 480, height: 280 },
  aedbinder: { src: aedbinderUrl, width: 452, height: 308 },
  ganaril: { src: ganarilUrl, width: 480, height: 166 },
} as const;

/** Felony or misdemeanor, for the charge's styling. The words carry the meaning. */
const kindOf = (charge: string) => (/felony/i.test(charge) ? 'felony' : 'misdemeanor');

function article(a: Article): BookBlock {
  return {
    kind: 'custom',
    weight: 110 + a.title.length + a.text.reduce((sum, line) => sum + line.length + 30, 0),
    items: [{ label: `${a.code} ${a.title}`, text: `${a.charge}. ${a.text.join(' ')}` }],
    render: (term, guided) => (
      <div className="chron-article">
        <p className="chron-article__head">
          <span className="chron-article__code">{a.code}</span> {mark(a.title, term)}
        </p>
        <p className={`chron-article__charge chron-article__charge--${kindOf(a.charge)}`}>{mark(a.charge, term)}</p>
        {a.text.map((line) => (
          <p className="chron-p" key={line.slice(0, 40)}>
            {prose(line, term, guided)}
          </p>
        ))}
      </div>
    ),
  };
}

const BLOCKS: BookBlock[] = [
  { kind: 'chapter', text: 'Introduction' },
  ...PREAMBLE.map((text): BookBlock => ({ kind: 'para', text })),
  { kind: 'list', ordered: true, items: PROVISIONS },
  { kind: 'para', text: AMENDMENT },
  { kind: 'heading', text: 'Disclaimer' },
  { kind: 'para', aside: true, text: DISCLAIMER },

  { kind: 'chapter', text: 'Punishment Guidelines' },
  ...PUNISHMENTS.map((p): BookBlock => ({ kind: 'field', label: p.charge, text: p.penalties.join('; ') })),
  { kind: 'heading', text: 'Common-Law Classifications' },
  ...CLASSIFICATION.map((text): BookBlock => ({ kind: 'para', text })),
  { kind: 'heading', text: 'Additional Classifications' },
  { kind: 'para', text: 'Modifiers that can increase charges, each by one class:' },
  { kind: 'list', items: MODIFIERS.map((m) => `${m} (+1)`) },

  ...PARTS.flatMap((part): BookBlock[] => [
    { kind: 'chapter', text: `Part ${part.numeral}. ${part.title}` },
    ...part.chapters.flatMap((chapter): BookBlock[] => [
      { kind: 'heading', text: `${chapter.code} ${chapter.title}` },
      ...chapter.articles.map(article),
    ]),
  ]),

  { kind: 'chapter', text: 'Signatories' },
  {
    kind: 'custom',
    weight: 1400,
    items: SIGNATORIES.map((s) => ({ label: s.name, text: s.office })),
    render: (term) => (
      <ul className="chron-signatories">
        {SIGNATORIES.map(({ name, office, signature }) => (
          <li key={name}>
            <img {...SIGNATURES[signature]} alt={`Signature of ${name}`} loading="lazy" decoding="async" />
            <p className="chron-signatories__name">{mark(name, term)}</p>
            <p className="chron-signatories__office">Member of the Thalmor · {mark(office, term)}</p>
          </li>
        ))}
      </ul>
    ),
  },
];

function buildLeaves(term: string, guided: boolean): Leaf[] {
  return [
    {
      head: '',
      body: (
        <TitlePage
          kicker="By Decree of the Aldmeri Dominion"
          name="The Penal Code"
          by="The Criminal Code of the Aldmeri Dominion, by Order of the Thalmor."
          span="Kept by the Ministry of Justice and the Thalmor Council, who alone may amend it."
        />
      ),
    },
    ...bindBlocks(BLOCKS, term, guided),
  ];
}

export function PenalCodeView() {
  const build = useCallback(buildLeaves, []);
  return (
    <BoundBook
      build={build}
      seal={eagleUrl}
      scryLabel="Search the Code"
      placeholder="a crime, a charge, an article…"
      navLabel="Penal Code navigation"
    />
  );
}
