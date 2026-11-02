// GET /api/room/status: which of the room's services are consecrated
// (shared/room.ts RoomStatus). The room reads a missing answer as "none",
// so each flag is true only when everything that service needs is bound.

import type { RoomStatus } from '../../../shared/room';
import type { ScribeEnv } from '../../lib/scribe-env';

interface Env extends ScribeEnv {
  SOLAR_COOKIE_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = ({ env }) => {
  const status: RoomStatus = {
    scribeTable: Boolean(env.REPORTS && env.CODE_PEPPER && env.SCRIBE),
    clerk: Boolean(env.REPORTS && env.SOLAR_COOKIE_SECRET),
    board: Boolean(env.REPORTS),
    books: false,
  };
  return Response.json(status, { headers: { 'cache-control': 'public, max-age=60' } });
};
