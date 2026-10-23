// The bookshelf, full screen: the Embassy's documents, bound in leather and
// standing on its shelves. Ported from the Bruma Joint Archives' bookcase.
//
// What stands here is what the room does not already show elsewhere: the
// realm's history, the Chronicles, the Arrests under the White-Gold Concordat,
// the Penal Code, and the Concordat itself. The Roster, the Chain of Command
// and the Hall of Honors are reached through the archways, so they are not
// shelved twice. Every one of them is bound as a book and read the same way
// (web/src/books/BoundBook.tsx), and none is sealed (2026-10-23). The
// Concordat opens over the shelf; the others open as pages of their own.

import { getTitle } from '../../../../shared/volumes';
import type { VolumeSlug } from '../../../../shared/types';
import { BUNDLED_BOOKS } from '../../books/registry';
import { hrefFor } from '../../router';
import { BINDINGS } from '../../theme';
import { nameForTransition } from '../../transitions';
import { Link } from '../nav';
import { ShelfBook } from './ShelfBook';
import { Takeover } from '../Takeover';
import '../../styles/bookshelf.css';

const PER_SHELF = 9;

// Unlettered volumes that fill out the shelves around the Embassy's own books.
// Decoration only: not focusable, not announced.
const FILLERS: [string, number, number][] = [
  ['#2b1d12', 0.82, 44], ['#1c1a16', 0.9, 52], ['#3a1e1a', 0.76, 38], ['#152a33', 0.88, 48],
  ['#120d08', 0.95, 56], ['#4a2c16', 0.8, 42], ['#26331b', 0.86, 50], ['#2a2a30', 0.78, 40],
  ['#4a0a33', 0.92, 46], ['#201810', 0.84, 54], ['#3b2a1a', 0.74, 36],
];

interface SpineBook {
  href: string;
  title: string;
  subtitle?: string;
  label: string;
  leather: string;
  height: number;
}

/** A volume of the archive, bound in its own leather. */
const volume = (slug: VolumeSlug, label: string, height: number): SpineBook => ({
  href: hrefFor(slug),
  title: getTitle(slug) ?? label,
  subtitle: BINDINGS[slug].subtitle,
  label,
  leather: BINDINGS[slug].cover,
  height,
});

export const SHELVED: readonly SpineBook[] = [
  volume('history', 'History', 0.96),
  volume('informants', 'Chronicles', 0.92),
  volume('enforcement', 'Arrests', 0.88),
  {
    href: '/penalcode',
    title: 'The Penal Code',
    subtitle: 'The Code of the Third Aldmeri Dominion',
    label: 'Code',
    leather: '#17110a',
    height: 1,
  },
  ...BUNDLED_BOOKS.map(({ summary }) => ({
    href: `/bookshelf/${summary.slug}`,
    title: summary.title,
    subtitle: summary.subtitle,
    label: summary.spine.label,
    leather: summary.spine.leather,
    height: summary.spine.height ?? 0.9,
  })),
];

export function Bookshelf({ book }: { book?: string }) {
  const shelves: SpineBook[][] = [];
  for (let i = 0; i < SHELVED.length; i += PER_SHELF) shelves.push(SHELVED.slice(i, i + PER_SHELF));
  // Always at least two shelves, so a short library still looks like a bookcase.
  while (shelves.length < 2) shelves.push([]);

  return (
    <div className="bookcase">
      <h2 className="takeover__heading">The Bookshelf</h2>
      <p className="takeover__sub">The realm’s history, the Chronicles, the Code and the treaties the Embassy keeps</p>

      <div className="bookcase__frame">
        {shelves.map((row, r) => (
          <div className="bookcase__shelf" key={r}>
            {row.map((b) => (
              <Link
                key={b.href}
                href={b.href}
                className="spine"
                data-book={b.href}
                // A volume opened as a page of its own: the spine opens out
                // into the book (a shelf book opens over the shelf instead).
                onClick={(event) => {
                  if (!b.href.startsWith('/bookshelf/')) nameForTransition(event.currentTarget, 'open-book');
                }}
                style={{ ['--leather' as string]: b.leather, ['--h' as string]: b.height }}
                aria-label={`${b.title}${b.subtitle ? `: ${b.subtitle}` : ''}`}
              >
                <span className="spine__art">
                  <span className="spine__band spine__band--1" />
                  <span className="spine__label">{b.label}</span>
                  <span className="spine__band spine__band--2" />
                  <span className="spine__band spine__band--3" />
                </span>
                {r === 0 && <span className="spine__chain" aria-hidden="true" />}
                <span className="spine__title" aria-hidden="true">
                  {b.title}
                </span>
              </Link>
            ))}
            {Array.from({ length: Math.max(0, PER_SHELF + 8 - row.length) }, (_, k) => {
              const f = FILLERS[(r * 7 + k) % FILLERS.length]!;
              return (
                <span
                  key={`f${k}`}
                  className="spine spine--filler"
                  aria-hidden="true"
                  style={{ ['--leather' as string]: f[0], ['--h' as string]: f[1], width: f[2] }}
                >
                  <span className="spine__art">
                    <span className="spine__band spine__band--1" />
                    <span className="spine__band spine__band--2" />
                    <span className="spine__band spine__band--3" />
                  </span>
                </span>
              );
            })}
            {r === 0 && <span className="bookcase__rod" aria-hidden="true" />}
            <span className="bookcase__board" aria-hidden="true" />
          </div>
        ))}
      </div>

      {book && (
        <Takeover
          label="Book"
          closeTo="/bookshelf"
          returnFocus={`[data-book="/bookshelf/${book}"]`}
          className="takeover--reading"
        >
          <ShelfBook slug={book} />
        </Takeover>
      )}
    </div>
  );
}
