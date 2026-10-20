// The Bulletin Board, the Bruma Joint Archives' board brought whole: six
// parchments nailed to planking, each a section with a symbol and a describer;
// opening one shows its notices, bounties as wanted posters, each under the
// stamp that put it up. No code is needed to read it.
//
// Until the Librarian backend lands there is nothing to read: /api/room/board
// answers a JSON 404, and the board hangs its six sections empty and says the
// Embassy has nailed nothing up yet. Sections with something newer than this
// reader has seen are marked (board-seen.ts).

import { useEffect, useMemo, useState } from 'react';

import {
  BOARD_INFO,
  BOARD_SECTIONS,
  isBoardSection,
  type BoardSection,
  type BoardSectionSummary,
  type Notice,
} from '../../../../shared/room';
import { isUnseen, markSeen, readSeen } from '../board-seen';
import { Link } from '../nav';
import { useRoomData } from '../room-api';
import { Poster } from './Poster';
import { Stamp } from './Stamp';
import '../../styles/board.css';

const SYMBOL: Record<BoardSection, string[]> = {
  bounties: ['M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M5 21c0-5 3-8 7-8s7 3 7 8', 'M3 3l18 18'],
  'new-laws': ['M12 3v17', 'M7 21h10', 'M4 7h16', 'M6 7 3 14h6Z', 'M18 7l-3 7h6Z'],
  'figures-of-interest': ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
  // The Dominion's triangle, for the First Emissary's agenda.
  'embassy-agenda': ['M12 3 21 20H3Z', 'M7 13c2-2 3.5-1 5 1 1.5-2 3-3 5-1'],
  'bread-and-circus': ['M4 20c0-6 3-11 8-11s8 5 8 11', 'M8 9V5M12 9V3M16 9V5', 'M4 20h16'],
  news: ['M4 4h16v16H4Z', 'M8 8h8M8 12h8M8 16h5'],
};

// Hand-placed: every parchment hangs a little differently.
const HANG = [-3, 2, -1.5, 3, -2.5, 1.5];

/** The board as it hangs with nothing on it: every section, none posted. */
export const EMPTY_BOARD: BoardSectionSummary[] = BOARD_SECTIONS.map((id) => ({ id, ...BOARD_INFO[id], count: 0 }));

function Symbol({ id }: { id: BoardSection }) {
  return (
    <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {SYMBOL[id].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });

export function NoticeCard({ notice, index = 0 }: { notice: Notice; index?: number }) {
  return (
    <article className={`notice parchment${notice.bounty ? ' notice--wanted' : ''}`} style={{ ['--hang' as string]: `${HANG[index % HANG.length]}deg` }}>
      <span className="pin" aria-hidden="true" />
      {notice.bounty ? <Poster bounty={notice.bounty} /> : <h3 className="notice__title">{notice.title}</h3>}
      {notice.bounty && <h3 className="notice__title notice__title--small">{notice.title}</h3>}
      <p className="notice__body">{notice.body}</p>
      <footer className="notice__foot">
        <Stamp mark={notice.stamp} size={46} />
        <span>
          By the hand of {notice.postedBy}
          <br />
          {when(notice.postedAt)}
        </span>
      </footer>
    </article>
  );
}

export function Board({ section }: { section?: string }) {
  if (section) return <BoardSectionView id={section} />;
  return <BoardSections />;
}

function BoardSections() {
  const board = useRoomData<{ sections: BoardSectionSummary[] }>('/api/room/board');
  const seen = useMemo(() => readSeen(), []);
  const sections = board.state === 'ok' ? board.data.sections : EMPTY_BOARD;

  return (
    <div className="board-view">
      <h2 className="takeover__heading">The Bulletin Board</h2>
      <p className="takeover__sub">Nailed up by order of the Thalmor Embassy, for all to read</p>
      <div className="planks">
        {board.state === 'loading' && <p className="loading">Reading the board…</p>}
        {board.state === 'error' && <p className="loading">The board could not be read. Try again shortly.</p>}
        {board.state === 'absent' && (
          <p className="board-unconsecrated">The Embassy has nailed nothing up yet. Notices will be posted here by its officers.</p>
        )}
        {board.state !== 'loading' && (
          <ul className="board-sections">
            {sections.map((s, i) => {
              const fresh = isUnseen(s, seen);
              return (
                <li key={s.id} style={{ ['--hang' as string]: `${HANG[i % HANG.length]}deg` }}>
                  <Link
                    href={`/board/${s.id}`}
                    className="board-section parchment"
                    data-section={s.id}
                    aria-label={`${s.title}: ${s.describer} ${s.count} notice${s.count === 1 ? '' : 's'}${fresh ? ', new since you last looked' : ''}.`}
                  >
                    <span className="pin" aria-hidden="true" />
                    {fresh && <span className="board-section__new" aria-hidden="true">New</span>}
                    <Symbol id={s.id} />
                    <span className="board-section__title">{s.title}</span>
                    <span className="board-section__count">{s.count === 0 ? 'nothing posted' : `${s.count} notice${s.count === 1 ? '' : 's'}`}</span>
                    <span className="describer describer--board" aria-hidden="true">
                      {s.describer}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function BoardSectionView({ id }: { id: string }) {
  const known = isBoardSection(id);
  const res = useRoomData<{ section: BoardSectionSummary; notices: Notice[] }>(known ? `/api/room/board/${id}` : null);
  const [, setSeen] = useState(readSeen);

  // Reading a section marks what is in it as seen.
  useEffect(() => {
    if (res.state !== 'ok' || !known) return;
    setSeen(markSeen(id, res.data.section.latestAt ?? res.data.notices[0]?.postedAt));
  }, [res, id, known]);

  if (!known) {
    return (
      <div className="board-view">
        <p className="crumb">
          <Link href="/board">← The Bulletin Board</Link>
        </p>
        <p className="empty-board parchment">No such part of the board.</p>
      </div>
    );
  }

  const info = BOARD_INFO[id];
  const notices = res.state === 'ok' ? res.data.notices : [];
  return (
    <div className="board-view">
      <p className="crumb">
        <Link href="/board">← The Bulletin Board</Link>
      </p>
      <h2 className="takeover__heading">{info.title}</h2>
      <p className="takeover__sub">{info.describer}</p>
      <div className="planks">
        {res.state === 'loading' ? (
          <p className="loading">Reading the board…</p>
        ) : res.state === 'error' ? (
          <p className="loading">That part of the board could not be read.</p>
        ) : notices.length === 0 ? (
          <p className="empty-board parchment">Nothing has been nailed here yet.</p>
        ) : (
          <div className="notices">
            {notices.map((n, i) => (
              <NoticeCard key={n.id} notice={n} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
