// The Bulletin Board, the Bruma Joint Archives' board brought whole: six
// parchments nailed to planking, each a section with a symbol and a describer;
// opening one shows its notices, bounties as wanted posters, each under the
// stamp that put it up. No code is needed to read it.
//
// Until the Librarian backend lands there is nothing to read: /api/room/board
// answers a JSON 404, and the board hangs its six sections empty and says the
// officers have nailed nothing up yet. Sections with something newer than this
// reader has seen are marked (board-seen.ts). Recruitment Posters always holds
// the one standing notice the repository keeps, the call for recruits
// (Recruitment.tsx), ahead of anything posted.

import { useEffect, useMemo, useState, type ComponentType } from 'react';

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
import { RecruitmentNotice } from './Recruitment';
import { Stamp } from './Stamp';
import '../../styles/board.css';

const SYMBOL: Record<BoardSection, string[]> = {
  // A herald's horn.
  propaganda: ['M3 10v4h4l9 5V5l-9 5H3Z', 'M19 9a4 4 0 0 1 0 6', 'M7 14l1 5h3l-1-4'],
  // A quill over a scroll.
  recruitment: ['M6 5h10a2 2 0 0 1 2 2v13H8a2 2 0 0 1-2-2Z', 'M6 5a2 2 0 0 0-2 2v2h2', 'M9 10h6M9 13h4', 'M21 2c-4 2-7 5-9 10l1.5 1C16 9 18 6 21 2Z'],
  // A goblet under bunting.
  festivities: ['M2 4q10 5 20 0', 'M6 6l1 3M12 6.5v3M18 6l-1 3', 'M8 11h8l-1 4a3 3 0 0 1-6 0Z', 'M12 18v3', 'M9 21h6'],
  // A decree under the Embassy's seal.
  'standing-orders': ['M5 3h14v12H5Z', 'M8 7h8M8 10h6', 'M12 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z', 'M10.5 20.5 9.5 23M13.5 20.5l1 2.5'],
  // Auri-El's sun.
  'spiritual-guidance': ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M12 2v3M12 19v3M2 12h3M19 12h3', 'M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1'],
  bounties: ['M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M5 21c0-5 3-8 7-8s7 3 7 8', 'M3 3l18 18'],
};

/** Notices the repository keeps standing in a section, ahead of anything posted. */
const STANDING: Partial<Record<BoardSection, ComponentType>> = {
  recruitment: RecruitmentNotice,
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
  const sections = (board.state === 'ok' ? board.data.sections : EMPTY_BOARD).map((s) =>
    STANDING[s.id] ? { ...s, count: s.count + 1 } : s,
  );

  return (
    <div className="board-view">
      <h2 className="takeover__heading">The Bulletin Board</h2>
      <p className="takeover__sub">Nailed up by order of the Thalmor Embassy, for all to read</p>
      <div className="planks">
        {board.state === 'loading' && <p className="loading">Reading the board…</p>}
        {board.state === 'error' && <p className="loading">The board could not be read. Try again shortly.</p>}
        {board.state === 'absent' && (
          <p className="board-unconsecrated">The officers have nailed nothing else up yet. Their notices will be posted here.</p>
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
  const Standing = STANDING[id];
  return (
    <div className="board-view">
      <p className="crumb">
        <Link href="/board">← The Bulletin Board</Link>
      </p>
      <h2 className="takeover__heading">{info.title}</h2>
      <p className="takeover__sub">{info.describer}</p>
      <div className="planks">
        {Standing && <Standing />}
        {res.state === 'loading' ? (
          <p className="loading">Reading the board…</p>
        ) : res.state === 'error' ? (
          <p className="loading">That part of the board could not be read.</p>
        ) : notices.length === 0 ? (
          !Standing && <p className="empty-board parchment">Nothing has been nailed here yet.</p>
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
