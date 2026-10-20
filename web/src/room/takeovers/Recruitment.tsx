// The Dominion's call for recruits: a standing proclamation pinned at the head
// of the bulletin board. It hung at the foot of the old front page, then the
// Gallery; when the Gallery became only a gallery (2026-10-20) it came here,
// where a reader looks for what the Embassy is asking of them. Kept in the
// repository rather than posted through the Librarian, so it is on the board
// before any officer has nailed anything up.

import { Stamp } from './Stamp';

// The Dominion's application form. External, so it opens beside the archive
// rather than in place of it.
export const APPLICATION_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScvhD-8VfQj3tmGSQ0qB7v7z9tfr7XDILvJwl7Ex2ccrF8Cuw/viewform?usp=publish-edito';

const TERMS = [
  'We accept no AI-made applications.',
  'Joining the Thalmor demands a life oath, so prepare to give your life to the Dominion.',
  'We do not mind Bosmer or Khajiit applicants.',
  'Make sure you don’t write too much, but not too little — in between is good.',
];

export function RecruitmentNotice() {
  return (
    <article className="notice parchment recruit" aria-labelledby="recruit-title">
      <span className="pin" aria-hidden="true" />
      <p className="recruit__label">Recruitment</p>
      <h3 className="recruit__title" id="recruit-title">
        To Join the Thalmor
      </h3>
      <ul className="recruit__terms">
        {TERMS.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ul>
      <p className="recruit__blessing">May Auri-El bless you and Xarxes guide your word.</p>
      <footer className="recruit__foot">
        <Stamp mark="aldmeri" size={52} title="The seal of the Thalmor Embassy" />
        <a
          className="recruit__oath"
          href={APPLICATION_URL}
          target="_blank"
          rel="noopener noreferrer external"
          aria-label="Submit Your Oath (opens the application form in a new tab)"
        >
          Submit Your Oath
        </a>
      </footer>
    </article>
  );
}
