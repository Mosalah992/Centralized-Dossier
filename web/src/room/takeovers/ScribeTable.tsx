// The Scribe Table, where filings are made under a code the Librarian issues.
//
// PHASE 1: the Scribe Table stands but is not yet consecrated. Filing needs the
// Librarian backend (codes, seals, the clerk's table: add-librarian-backend);
// until GET /api/room/status says the Scribe Table is open, this says so in-world and
// tells the reader how filing will work, rather than offering a form that
// cannot be sent.

import type { RoomStatus } from '../../../../shared/room';
import { useRoomData } from '../room-api';
import { Fleuron } from '../art';
import '../../styles/board.css';

export function ScribeTable() {
  const status = useRoomData<RoomStatus>('/api/room/status');
  const open = status.state === 'ok' && status.data.scribeTable;

  return (
    <div className="scribe-view">
      <h2 className="takeover__heading">The Scribe Table</h2>
      <p className="takeover__sub">Reports, bounties and more, filed under the Embassy’s seal</p>
      <div className="scribe-wait parchment">
        <Fleuron />
        {status.state === 'loading' ? (
          <p>Trimming the candle…</p>
        ) : open ? (
          <p>The Scribe Table is consecrated. Filing opens here shortly.</p>
        ) : (
          <>
            <h3>The Scribe Table awaits its consecration</h3>
            <p>
              When it is consecrated, ask the Librarian for your code in the Embassy’s Discord with{' '}
              <code>/archives code</code>. The code names your rank and the office you file from.
            </p>
            <p>
              You will choose what you are filing — a report, a bounty, or more — and what it concerns. A clerk of the
              Embassy stamps each filing before it is entered in the Scroll Rack or nailed to the board.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
