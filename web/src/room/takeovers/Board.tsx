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
import { PixelIcon } from '../../pixel/icons/PixelIcon';
import type { IconName } from '../../pixel/icons/manifest';
import { isUnseen, markSeen, readSeen } from '../board-seen';
import { Link } from '../nav';
import { useRoomData } from '../room-api';
import { Poster } from './Poster';
import { RecruitmentNotice } from './Recruitment';
import { Stamp } from './Stamp';
import '../../styles/board.css';

/** Each section's mark, from the pixel icon set (web/src/pixel/icons/). */
const SYMBOL: Record<BoardSection, IconName> = {
  propaganda: 'scroll-emblem',
  recruitment: 'banner-assembly',
  festivities: 'goblet',
  'standing-orders': 'wax-stamp',
  'spiritual-guidance': 'candle-books',
  bounties: 'coin-pouch',
};

/** Notices the repository keeps standing in a section, ahead of anything posted. */
const STANDING: Partial<Record<BoardSection, ComponentType>> = {
  recruitment: RecruitmentNotice,
};

// Hand-placed: every parchment hangs a little differently, lower or higher by
// whole art pixels (a tilt would smear the pixel art).
const HANG = [0, 3, 1, 4, 2, 0];

/** The board as it hangs with nothing on it: every section, none posted. */
export const EMPTY_BOARD: BoardSectionSummary[] = BOARD_SECTIONS.map((id) => ({ id, ...BOARD_INFO[id], count: 0 }));

function Symbol({ id }: { id: BoardSection }) {
  return <PixelIcon name={SYMBOL[id]} scale="px" />;
}

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });

export function NoticeCard({ notice, index = 0 }: { notice: Notice; index?: number }) {
  return (
    <article className={`notice parchment${notice.bounty ? ' notice--wanted' : ''}`} style={{ ['--hang' as string]: HANG[index % HANG.length] }}>
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
                <li key={s.id} style={{ ['--hang' as string]: HANG[i % HANG.length] }}>
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
